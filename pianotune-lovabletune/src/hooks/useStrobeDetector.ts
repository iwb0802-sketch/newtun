/**
 * useStrobeDetector.ts (v5)
 *
 * - 자체 마이크/AudioContext 직접 열기
 * - 매 프레임 YIN → 타겟 건반 기준 cents 계산 → liveCents 즉시 출력
 * - 300ms 슬라이딩 윈도우 중앙값 → strobeCents (확정값)
 * - referenceKeyIndex 바뀌면 즉시 전체 리셋
 * - HPS 배음 자동 감지 (partial 1~5)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { PIANO_KEYS } from "./usePitchDetector";
import { detectPitchYIN, getRMS, median } from "@/lib/tuner/pitchEngine";

export interface StrobeState {
  liveCents: number | null;
  strobeCents: number | null;
  isCapturing: boolean;
  captureProgress: number;
  currentNote: string | null;
  currentKeyIndex: number | null;
  analysisFreq: number | null;
  partial: number | null;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  micError: string | null;
  analyserRef: { readonly current: AnalyserNode | null };
}

const WINDOW_MS = 300;
const MIN_RMS   = 0.005;

export function useStrobeDetector(
  referenceKeyIndex: number | null = null,
  externalAnalyserRef?: { readonly current: AnalyserNode | null }
): StrobeState {
  const [liveCents,       setLiveCents]       = useState<number | null>(null);
  const [strobeCents,     setStrobeCents]     = useState<number | null>(null);
  const [isCapturing,     setIsCapturing]     = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [currentNote,     setCurrentNote]     = useState<string | null>(null);
  const [currentKeyIndex, setCurrentKeyIndex] = useState<number | null>(null);
  const [analysisFreq,    setAnalysisFreq]    = useState<number | null>(null);
  const [partial,         setPartial]         = useState<number>(1);
  const [isListening,     setIsListening]     = useState(false);
  const [micError,        setMicError]        = useState<string | null>(null);

  const ctxRef      = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef      = useRef<number | null>(null);
  const bufRef      = useRef<Float32Array | null>(null);
  const windowRef   = useRef<Array<{ t: number; c: number }>>([]);
  const refKeyRef   = useRef<number | null>(referenceKeyIndex);

  useEffect(() => {
    refKeyRef.current = referenceKeyIndex;
    windowRef.current = [];
    setLiveCents(null);
    setStrobeCents(null);
    setIsCapturing(false);
    setCaptureProgress(0);
    if (referenceKeyIndex !== null) {
      const k = PIANO_KEYS[referenceKeyIndex];
      setCurrentNote(`${k.noteName}${k.octave}`);
      setCurrentKeyIndex(referenceKeyIndex);
      setAnalysisFreq(k.freq);
    } else {
      setCurrentNote(null);
      setCurrentKeyIndex(null);
      setAnalysisFreq(null);
    }
  }, [referenceKeyIndex]);

  // ── 감지 루프 ────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const detect = () => {
      // 매 프레임마다 analyser 최신값으로 읽기
      const an = externalAnalyserRef?.current ?? analyserRef.current;
      if (!an) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // buf 크기 맞추기
      if (!bufRef.current || bufRef.current.length !== an.fftSize) {
        bufRef.current = new Float32Array(an.fftSize);
      }
      const buf = bufRef.current;
      an.getFloatTimeDomainData(buf);
      const rms = getRMS(buf);

      if (rms < MIN_RMS) {
        setLiveCents(null);
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const refKey = refKeyRef.current;
      if (refKey === null) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const sampleRate = an.context.sampleRate;
      const targetFreq = PIANO_KEYS[refKey].freq;

      // 자동탭과 동일: 전체 피아노 범위로 YIN 탐색
      const fRaw = detectPitchYIN(buf, sampleRate, { fMin: 27, fMax: 5000, threshold: 0.15 });

      if (fRaw <= 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // 감지 주파수 → 타겟 건반 기준 cents (옥타브 정규화)
      const rawCent = 1200 * Math.log2(fRaw / targetFreq);
      const octShift = Math.round(rawCent / 1200);
      const cent = rawCent - octShift * 1200;

      // ±55¢ 초과 → 완전히 다른 음, 무시
      if (Math.abs(cent) > 55) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // 배음 차수 역산 (n=1~5)
      let bestN = 1;
      let bestCentAbs = Infinity;
      for (let n = 1; n <= 5; n++) {
        const c = Math.abs(1200 * Math.log2(fRaw / (targetFreq * n)));
        if (c < bestCentAbs) { bestCentAbs = c; bestN = n; }
      }

      setPartial(Math.min(bestN, 5));
      setLiveCents(Math.round(cent * 10) / 10);

      const now = Date.now();
      windowRef.current.push({ t: now, c: cent });
      windowRef.current = windowRef.current.filter(s => now - s.t <= WINDOW_MS);

      const samples = windowRef.current;
      const elapsed = samples.length > 1 ? now - samples[0].t : 0;
      const progress = Math.min(elapsed / WINDOW_MS, 1);
      setCaptureProgress(progress);

      if (progress >= 1 && samples.length >= 4) {
        setIsCapturing(false);
        const med = Math.round(median(samples.map(s => s.c)) * 10) / 10;
        if (isFinite(med)) setStrobeCents(med);
      } else {
        setIsCapturing(true);
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
  }, [externalAnalyserRef]);

  // ── 마이크 시작/종료 ─────────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      setMicError(null);

      if (externalAnalyserRef) {
        // external analyser 모드: 마이크 안 열고 루프만 시작
        startLoop();
        setIsListening(true);
        return;
      }

      // 이미 열려 있으면 루프만 재시작
      if (analyserRef.current) {
        startLoop();
        setIsListening(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 48000 });
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;
      bufRef.current = new Float32Array(analyser.fftSize);

      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);

      // analyser 세팅 완료 후 루프 시작
      setIsListening(true);
      startLoop();
    } catch (e: unknown) {
      setMicError(e instanceof Error ? e.message : "마이크 오류");
    }
  }, [startLoop, externalAnalyserRef]);

  const stopListening = useCallback(() => {
    stopLoop();
    if (!externalAnalyserRef) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
    }
    bufRef.current = null;
    windowRef.current = [];
    setIsListening(false);
    setLiveCents(null);
    setStrobeCents(null);
    setIsCapturing(false);
    setCaptureProgress(0);
  }, [stopLoop, externalAnalyserRef]);

  useEffect(() => {
    return () => {
      stopLoop();
      if (!externalAnalyserRef) {
        streamRef.current?.getTracks().forEach(t => t.stop());
        ctxRef.current?.close();
      }
    };
  }, [stopLoop, externalAnalyserRef]);

  return {
    liveCents, strobeCents,
    isCapturing, captureProgress,
    currentNote, currentKeyIndex, analysisFreq,
    partial,
    isListening, startListening, stopListening, micError,
    analyserRef,
  };
}
