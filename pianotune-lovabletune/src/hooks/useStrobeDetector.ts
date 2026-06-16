/**
 * useStrobeDetector.ts (v4 — 단순 재작성)
 *
 * - 자체 마이크/AudioContext 직접 열기 (usePitchDetector 의존 없음)
 * - 매 프레임 YIN → 타겟 건반 기준 cents 계산 → liveCents 즉시 출력
 * - 300ms 슬라이딩 윈도우 중앙값 → strobeCents (확정값)
 * - referenceKeyIndex 바뀌면 즉시 전체 리셋
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { PIANO_KEYS } from "./usePitchDetector";
import { detectPitchYIN, getRMS, median } from "@/lib/tuner/pitchEngine";

export interface StrobeState {
  liveCents: number | null;        // 매 프레임 실시간 (스트로브 움직임용)
  strobeCents: number | null;      // 300ms 중앙값 확정값 (pendingCents용)
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
}

const WINDOW_MS = 300;   // 슬라이딩 윈도우
const MIN_RMS   = 0.005; // 무음 임계값

export function useStrobeDetector(
  referenceKeyIndex: number | null = null,
  externalAnalyserRef?: { readonly current: AnalyserNode | null }
): StrobeState {
  const [liveCents,      setLiveCents]      = useState<number | null>(null);
  const [strobeCents,    setStrobeCents]    = useState<number | null>(null);
  const [isCapturing,    setIsCapturing]    = useState(false);
  const [captureProgress,setCaptureProgress]= useState(0);
  const [currentNote,    setCurrentNote]    = useState<string | null>(null);
  const [currentKeyIndex,setCurrentKeyIndex]= useState<number | null>(null);
  const [analysisFreq,   setAnalysisFreq]   = useState<number | null>(null);
  const [isListening,    setIsListening]    = useState(false);
  const [micError,       setMicError]       = useState<string | null>(null);

  // 오디오 인프라
  const ctxRef      = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef      = useRef<number | null>(null);
  const bufRef      = useRef<Float32Array | null>(null);

  // 측정 버퍼 (타임스탬프 포함)
  const windowRef   = useRef<Array<{ t: number; c: number }>>([]);

  // referenceKeyIndex ref — detect 루프가 클로저로 최신값 읽음
  const refKeyRef   = useRef<number | null>(referenceKeyIndex);

  // referenceKeyIndex 바뀌면 즉시 리셋
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
  const startLoop = useCallback(() => {
    // external analyser가 있으면 그걸 사용, 없으면 자체 analyserRef 사용
    const effectiveAnalyser = externalAnalyserRef?.current ?? analyserRef.current;
    if (!effectiveAnalyser) return;

    // external 모드면 buf를 analyser fftSize에 맞게 초기화
    if (externalAnalyserRef?.current && !bufRef.current) {
      bufRef.current = new Float32Array(externalAnalyserRef.current.fftSize);
    }
    if (!bufRef.current) return;

    const detect = () => {
      // 매 프레임마다 external ref 최신값으로 읽기
      const an  = externalAnalyserRef?.current ?? analyserRef.current;
      const buf = bufRef.current;
      if (!an || !buf) return;

      // buf 크기 불일치 시 재할당
      if (buf.length !== an.fftSize) {
        bufRef.current = new Float32Array(an.fftSize);
      }

      const activeBuf = bufRef.current!;
      an.getFloatTimeDomainData(activeBuf);
      const rms = getRMS(activeBuf);

      if (rms < MIN_RMS) {
        // 무음 — liveCents 지우고 계속 대기
        setLiveCents(null);
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const refKey = refKeyRef.current;
      if (refKey === null) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // sampleRate: external ctx 있으면 an.context, 없으면 자체 ctxRef
      const sampleRate = an.context?.sampleRate ?? ctxRef.current?.sampleRate ?? 48000;

      // ── YIN 피치 감지 ─────────────────────────────────────────
      const targetFreq = PIANO_KEYS[refKey].freq;
      // 타겟 건반 ±1옥타브 범위로만 YIN 탐색
      const fMin = targetFreq / 2.5;
      const fMax = targetFreq * 2.5;
      const fRaw = detectPitchYIN(activeBuf, sampleRate, { fMin: Math.max(20, fMin), fMax: Math.min(8000, fMax), threshold: 0.15 });

      if (fRaw <= 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // 타겟 건반 기준 cents 계산
      const rawCent = 1200 * Math.log2(fRaw / targetFreq);

      // 옥타브 정규화 → 가장 가까운 옥타브 기준 -50~+50¢
      const octShift = Math.round(rawCent / 1200);
      const cent = rawCent - octShift * 1200;

      // ±55¢ 초과 → 완전히 다른 음, 무시
      if (Math.abs(cent) > 55) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // 매 프레임 실시간 출력
      setLiveCents(Math.round(cent * 10) / 10);

      // 슬라이딩 윈도우에 추가
      const now = Date.now();
      windowRef.current.push({ t: now, c: cent });
      // 오래된 샘플 제거
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
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  // ── 마이크 시작/종료 ─────────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      setMicError(null);

      // external analyser 모드: 마이크 안 열고 바로 루프 시작
      if (externalAnalyserRef) {
        startLoop();
        setIsListening(true);
        return;
      }

      // 이미 열려 있으면 재사용
      if (ctxRef.current && streamRef.current) {
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

      setIsListening(true);
      startLoop();
    } catch (e: unknown) {
      setMicError(e instanceof Error ? e.message : "마이크 오류");
    }
  }, [startLoop]);

  const stopListening = useCallback(() => {
    stopLoop();
    // external 모드면 마이크/ctx는 닫지 않음 (usePitchDetector 소유)
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

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopLoop();
      // external 모드면 마이크/ctx 정리하지 않음
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
    partial: 1,
    isListening, startListening, stopListening, micError,
  };
}
