/**
 * useStrobeDetector.ts (v3)
 * 자동피치(usePitchDetector)와 동일한 알고리즘 사용 — YIN + HPS 옥타브 보정.
 * 결과를 스트로브 UI용으로 가공할 뿐, 인식 방식은 자동피치와 완전히 동일.
 *
 * 흐름:
 * 1. referenceKeyIndex(타겟 건반)가 정해지면 그 건반 주변만 cents 측정
 * 2. RMS 피크 후 안정 구간 동안 cents 중앙값 → strobeCents 출력
 */

import { useEffect, useRef, useState } from "react";
import { PIANO_KEYS, freqToCentOffset } from "./usePitchDetector";
import {
  applyHannWindow, detectPitchYIN, correctOctaveByHPS,
  getRMS, median,
} from "@/lib/tuner/pitchEngine";

export interface StrobeState {
  strobeCents: number | null;      // 500ms 수집 후 확정값
  liveCents: number | null;        // 매 프레임 실시간 값 (스트로브 애니메이션용)
  isCapturing: boolean;
  captureProgress: number;
  currentNote: string | null;
  currentKeyIndex: number | null;
  analysisFreq: number | null;
  partial: number | null;
}

export function useStrobeDetector(
  stream: MediaStream | null,
  audioContext: AudioContext | null,
  stableDurationMs: number = 800,
  fftSize: 4096 | 8192 = 4096,
  referenceKeyIndex: number | null = null
): StrobeState {
  const [strobeCents, setStrobeCents] = useState<number | null>(null);
  const [liveCents, setLiveCents] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [currentKeyIndex, setCurrentKeyIndex] = useState<number | null>(null);
  const [analysisFreq, setAnalysisFreq] = useState<number | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufRef = useRef<Float32Array | null>(null);
  const specRef = useRef<Float32Array | null>(null);

  const lastKeyRef = useRef<number | null>(null);
  const peakRmsRef = useRef(0);
  const captureStartRef = useRef<number | null>(null);
  const captureBufferRef = useRef<number[]>([]);

  const refKeyRef = useRef<number | null>(referenceKeyIndex);

  // referenceKeyIndex 변경 시 즉시 전체 리셋 — detect 루프 다음 프레임까지 기다리지 않음
  useEffect(() => {
    refKeyRef.current = referenceKeyIndex;
    // 모든 캡처 상태 즉시 초기화
    peakRmsRef.current = 0;
    captureBufferRef.current = [];
    captureStartRef.current = null;
    lastKeyRef.current = referenceKeyIndex;
    setStrobeCents(null);
    setLiveCents(null);
    setIsCapturing(false);
    setCaptureProgress(0);
    if (referenceKeyIndex !== null) {
      setCurrentNote(`${PIANO_KEYS[referenceKeyIndex].noteName}${PIANO_KEYS[referenceKeyIndex].octave}`);
      setCurrentKeyIndex(referenceKeyIndex);
      setAnalysisFreq(PIANO_KEYS[referenceKeyIndex].freq);
    } else {
      setCurrentNote(null);
      setCurrentKeyIndex(null);
      setAnalysisFreq(null);
    }
  }, [referenceKeyIndex]);

  const MIN_SAMPLES = 6;

  useEffect(() => {
    if (!stream || !audioContext) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      try { sourceRef.current?.disconnect(); } catch { /* ignore */ }
      analyserRef.current = null;
      bufRef.current = null;
      specRef.current = null;
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
    specRef.current = new Float32Array(analyser.frequencyBinCount);

    const detect = () => {
      const an = analyserRef.current;
      const buf = bufRef.current;
      const spec = specRef.current;
      if (!an || !buf || !spec) { rafRef.current = requestAnimationFrame(detect); return; }

      an.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
      const rms = getRMS(buf);

      if (rms < 0.003) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const refKey = refKeyRef.current;
      if (refKey === null) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      setCurrentNote(`${PIANO_KEYS[refKey].noteName}${PIANO_KEYS[refKey].octave}`);
      setCurrentKeyIndex(refKey);

      // 최소 RMS 임계값 — 너무 약한 소리는 무시
      if (rms < 0.008) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // === YIN + HPS ===
      const winBuf = applyHannWindow(buf);
      const fYin = detectPitchYIN(winBuf, audioContext.sampleRate, 26, 5000, 0.15);
      if (fYin <= 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      an.getFloatFrequencyData(spec as Float32Array<ArrayBuffer>);
      const fCorrected = correctOctaveByHPS(fYin, spec, audioContext.sampleRate, an.fftSize, 5);

      // 타겟 건반 기준 cent 편차
      const targetFreq = PIANO_KEYS[refKey].freq;
      const rawCent = 1200 * Math.log2(fCorrected / targetFreq);

      // 옥타브 정규화 — 가장 가까운 옥타브로 맞춤 (-600 ~ +600¢ → -50 ~ +50¢ 범위)
      const octaveShift = Math.round(rawCent / 1200);
      const cent = rawCent - octaveShift * 1200;

      // ±60¢ 이상 벗어나면 다른 건반 — 무시
      if (Math.abs(cent) > 60) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // 매 프레임 실시간 값 → 스트로브 애니메이션용
      setLiveCents(Math.round(cent * 10) / 10);

      if (captureStartRef.current === null) {
        captureStartRef.current = Date.now();
        setIsCapturing(true);
      }
      captureBufferRef.current.push(cent);

      const elapsed = Date.now() - captureStartRef.current;
      setCaptureProgress(Math.min(elapsed / stableDurationMs, 1));

      if (elapsed >= stableDurationMs && captureBufferRef.current.length >= MIN_SAMPLES) {
        const medRaw = median(captureBufferRef.current);
        if (isFinite(medRaw)) {
          const med = Math.round(medRaw * 10) / 10;
          setStrobeCents(med);
        }
        setIsCapturing(false);
        setCaptureProgress(0);
        // 버퍼만 리셋 — 계속 새로 수집 (실시간 갱신)
        captureBufferRef.current = [];
        captureStartRef.current = null;
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      try { source.disconnect(); } catch { /* ignore */ }
      analyserRef.current = null;
      bufRef.current = null;
      specRef.current = null;
      peakRmsRef.current = 0;
      captureStartRef.current = null;
      captureBufferRef.current = [];
      setLiveCents(null);
    };
  }, [stream, audioContext, stableDurationMs, fftSize]);

  return {
    strobeCents, liveCents, isCapturing, captureProgress,
    currentNote, currentKeyIndex, analysisFreq,
    partial: 1,
  };
}
