/**
 * useTargetedStrobe.ts
 * 목표 건반을 "이미 아는" 상태에서의 Goertzel 위상 스트로브 측정.
 *
 * 핵심:
 * - 저음은 targetPartial()로 6/4/2배음 분석
 * - 최종 표시값은 배음 cent가 아니라
 *   "측정 배음 Hz ÷ partial = 기본음 Hz"로 환산 후
 *   평균율 0점 기준 절대 cent로 표시
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { PIANO_KEYS } from "./usePitchDetector";
import {
  goertzel,
  centsFromPhaseDelta,
  targetPartial,
} from "@/lib/tuner/pitchEngine";

export interface TargetedStrobeState {
  strobeCents: number | null;
  liveCents: number | null;
  isCapturing: boolean;
  captureProgress: number;
  currentNote: string | null;
  currentKeyIndex: number | null;
  analysisFreq: number | null;
  partial: number | null;
  signalOk: boolean;
}

interface Options {
  stableDurationMs?: number;
  fftSize?: 4096 | 8192;
  dominanceRatio?: number;
}

const MIN_RMS = 0.006;

function wrapPi(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return p - 2 * Math.PI * Math.round(p / (2 * Math.PI));
}

function medianOf(arr: number[]): number {
  if (!arr.length) return 0;

  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);

  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function subPhase(
  buf: Float32Array,
  start: number,
  len: number,
  sr: number,
  fEval: number
): number {
  return goertzel(buf.subarray(start, start + len), sr, fEval).phase;
}

function inblockFreq(
  buf: Float32Array,
  sr: number,
  fEval: number
): number {
  const N = buf.length;
  const h = Math.max(8, Math.round(sr / fEval));
  const L = N - h;

  if (L < 64) return fEval;

  const p0 = subPhase(buf, 0, L, sr, fEval);
  const p1 = subPhase(buf, h, L, sr, fEval);

  const dphi = wrapPi(
    p1 - p0 - (2 * Math.PI * fEval * h) / sr
  );

  return fEval + (dphi * sr) / (2 * Math.PI * h);
}

function coarseFreq(
  buf: Float32Array,
  sr: number,
  fTarget: number
): number {
  const fc = inblockFreq(buf, sr, fTarget);

  if (
    !Number.isFinite(fc) ||
    fc < fTarget * 0.5 ||
    fc > fTarget * 2
  ) {
    return fTarget;
  }

  return inblockFreq(buf, sr, fc);
}

/**
 * 배음으로 측정된 Hz를 기본음 기준 절대 cent로 환산.
 *
 * 예:
 * A0를 6배음으로 분석
 * measuredPartialHz / 6 = A0 기본음 Hz
 * displayCents = 1200 * log2(A0 기본음 Hz / A0 평균율 Hz)
 */
function partialHzToBaseAbsoluteCents(
  measuredPartialHz: number,
  keyIndex: number,
  partial: number
): number {
  const equalBaseHz = PIANO_KEYS[keyIndex]?.freq;

  if (
    !equalBaseHz ||
    !Number.isFinite(measuredPartialHz) ||
    measuredPartialHz <= 0 ||
    partial <= 0
  ) {
    return Number.NaN;
  }

  const measuredBaseHz = measuredPartialHz / partial;

  return 1200 * Math.log2(measuredBaseHz / equalBaseHz);
}

export function useTargetedStrobe(
  stream: MediaStream | null,
  audioContext: AudioContext | null,
  targetKeyIndex: number | null,
  opts: Options = {}
): TargetedStrobeState {
  const {
    stableDurationMs = 800,
    fftSize = 4096,
    dominanceRatio = 1.4,
  } = opts;

  const [strobeCents, setStrobeCents] = useState<number | null>(null);
  const [liveCents, setLiveCents] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [signalOk, setSignalOk] = useState(false);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufRef = useRef<Float32Array | null>(null);

  const targetKeyRef = useRef<number | null>(targetKeyIndex);
  const targetFreqRef = useRef<number>(0);
  const partialRef = useRef<number>(1);

  const peakRmsRef = useRef(0);
  const captureStartRef = useRef<number | null>(null);
  const prevResidualRef = useRef<number | null>(null);
  const cumPhaseRef = useRef(0);
  const startAudioTimeRef = useRef(0);
  const lastAudioTimeRef = useRef(0);
  const coarseBufRef = useRef<number[]>([]);

  const resetCapture = useCallback(() => {
    prevResidualRef.current = null;
    cumPhaseRef.current = 0;
    captureStartRef.current = null;
    coarseBufRef.current = [];
  }, []);

  useEffect(() => {
    targetKeyRef.current = targetKeyIndex;

    if (targetKeyIndex !== null) {
      const p = targetPartial(targetKeyIndex);
      partialRef.current = p;
      targetFreqRef.current = PIANO_KEYS[targetKeyIndex].freq * p;
    } else {
      targetFreqRef.current = 0;
      partialRef.current = 1;
    }

    resetCapture();
    peakRmsRef.current = 0;

    setStrobeCents(null);
    setLiveCents(null);
    setIsCapturing(false);
    setCaptureProgress(0);
    setSignalOk(false);
  }, [targetKeyIndex, resetCapture]);

  useEffect(() => {
    if (!stream || !audioContext) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      try {
        sourceRef.current?.disconnect();
      } catch {
        /* ignore */
      }

      analyserRef.current = null;
      bufRef.current = null;
      return;
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    bufRef.current = new Float32Array(analyser.fftSize);

    const detect = () => {
      const analyserNode = analyserRef.current;
      const buf = bufRef.current;
      const fTarget = targetFreqRef.current;
      const keyIndex = targetKeyRef.current;
      const partial = partialRef.current;

      if (
        !analyserNode ||
        !buf ||
        fTarget <= 0 ||
        keyIndex === null ||
        partial <= 0
      ) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const tAudio = audioContext.currentTime;

      analyserNode.getFloatTimeDomainData(
        buf as Float32Array<ArrayBuffer>
      );

      let sum = 0;

      for (let i = 0; i < buf.length; i++) {
        sum += buf[i] * buf[i];
      }

      const rms = Math.sqrt(sum / buf.length);

      if (rms < MIN_RMS) {
        setSignalOk(false);
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      if (rms > peakRmsRef.current * 1.5 && rms > 0.02) {
        peakRmsRef.current = rms;
        resetCapture();

        setIsCapturing(false);
        setCaptureProgress(0);
        setStrobeCents(null);
      } else if (rms > peakRmsRef.current) {
        peakRmsRef.current = rms;
      }

      const sr = audioContext.sampleRate;

      const gTarget = goertzel(buf, sr, fTarget);
      const magLo = goertzel(
        buf,
        sr,
        fTarget * Math.pow(2, -1.5 / 12)
      ).magnitude;
      const magHi = goertzel(
        buf,
        sr,
        fTarget * Math.pow(2, 1.5 / 12)
      ).magnitude;

      const dominant =
        gTarget.magnitude >
        Math.max(magLo, magHi, 1e-9) * dominanceRatio;

      setSignalOk(dominant);

      if (!dominant) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const isStable =
        rms < peakRmsRef.current * 0.55 &&
        peakRmsRef.current > 0.015;

      if (!isStable) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const fc = coarseFreq(buf, sr, fTarget);

      coarseBufRef.current.push(fc);

      if (coarseBufRef.current.length > 60) {
        coarseBufRef.current.shift();
      }

      const fcMed = medianOf(coarseBufRef.current);

      const liveC = partialHzToBaseAbsoluteCents(
        fcMed,
        keyIndex,
        partial
      );

      if (Number.isFinite(liveC) && Math.abs(liveC) < 300) {
        setLiveCents(Math.round(liveC * 10) / 10);
      }

      const residual = wrapPi(
        gTarget.phase - 2 * Math.PI * fTarget * tAudio
      );

      if (captureStartRef.current === null) {
        captureStartRef.current = performance.now();
        startAudioTimeRef.current = tAudio;
        lastAudioTimeRef.current = tAudio;
        prevResidualRef.current = residual;
        cumPhaseRef.current = 0;

        setIsCapturing(true);
      } else {
        const prev = prevResidualRef.current!;
        const dt = tAudio - lastAudioTimeRef.current;

        const predicted =
          2 * Math.PI * (fcMed - fTarget) * dt;

        const raw = residual - prev;
        const k = Math.round(
          (predicted - raw) / (2 * Math.PI)
        );

        cumPhaseRef.current += raw + 2 * Math.PI * k;
        prevResidualRef.current = residual;
        lastAudioTimeRef.current = tAudio;
      }

      const elapsedMs =
        performance.now() - captureStartRef.current;

      setCaptureProgress(
        Math.min(elapsedMs / stableDurationMs, 1)
      );

      if (elapsedMs >= stableDurationMs) {
        const totalDt =
          tAudio - startAudioTimeRef.current;

        if (totalDt > 1e-3) {
          const centsFromTarget = centsFromPhaseDelta(
            0,
            cumPhaseRef.current,
            totalDt,
            fTarget
          );

          let finalC = liveC;

          if (Number.isFinite(centsFromTarget)) {
            const measuredPartialHz =
              fTarget * Math.pow(2, centsFromTarget / 1200);

            const absoluteCents =
              partialHzToBaseAbsoluteCents(
                measuredPartialHz,
                keyIndex,
                partial
              );

            finalC =
              Number.isFinite(absoluteCents) &&
              Math.abs(absoluteCents - liveC) <= 10
                ? absoluteCents
                : liveC;
          }

          if (Number.isFinite(finalC)) {
            setStrobeCents(Math.round(finalC * 10) / 10);
          }
        }

        setIsCapturing(false);
        setCaptureProgress(0);
        resetCapture();
        peakRmsRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      try {
        source.disconnect();
      } catch {
        /* ignore */
      }

      analyserRef.current = null;
      bufRef.current = null;

      resetCapture();
      peakRmsRef.current = 0;
    };
  }, [
    stream,
    audioContext,
    stableDurationMs,
    fftSize,
    dominanceRatio,
    resetCapture,
  ]);

  const keyIndex = targetKeyRef.current;

  return {
    strobeCents,
    liveCents,
    isCapturing,
    captureProgress,
    currentNote:
      keyIndex !== null
        ? `${PIANO_KEYS[keyIndex].noteName}${PIANO_KEYS[keyIndex].octave}`
        : null,
    currentKeyIndex: keyIndex,
    analysisFreq: targetFreqRef.current || null,
    partial: keyIndex !== null ? partialRef.current : null,
    signalOk,
  };
}