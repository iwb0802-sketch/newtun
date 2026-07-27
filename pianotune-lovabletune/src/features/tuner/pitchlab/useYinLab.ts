import { useCallback, useRef, useState } from "react";
import { detectPitchYIN, freqToNote, getRMS } from "./labUtils";

export interface YinReading {
  frequency: number | null;
  noteName: string | null;
  octave: number | null;
  cents: number | null;
  lastMs: number; // 이번 프레임 YIN 계산에 걸린 시간(ms)
  avgMs: number; // 최근 60프레임 평균 계산 시간(ms)
}

const RMS_GATE = 0.006;
const SMOOTH_WINDOW_MS = 150; // 최근 값 중앙값으로 지터 완화
const HOLD_MS = 500; // 소리가 끊겨도 이 시간 동안은 마지막 값 유지 (차분하게)

export function useYinLab(stream: MediaStream | null, audioContext: AudioContext | null) {
  const [isRunning, setIsRunning] = useState(false);
  const [reading, setReading] = useState<YinReading>({
    frequency: null, noteName: null, octave: null, cents: null, lastMs: 0, avgMs: 0,
  });

  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const msHistoryRef = useRef<number[]>([]);
  const freqWindowRef = useRef<Array<{ t: number; f: number }>>([]);
  const lastGoodAtRef = useRef<number>(0);
  const lastGoodReadingRef = useRef<Pick<YinReading, "frequency" | "noteName" | "octave" | "cents">>({
    frequency: null, noteName: null, octave: null, cents: null,
  });

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    freqWindowRef.current = [];
    lastGoodAtRef.current = 0;
    lastGoodReadingRef.current = { frequency: null, noteName: null, octave: null, cents: null };
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (!stream || !audioContext) return;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    analyserRef.current = analyser;
    bufRef.current = new Float32Array(analyser.fftSize);
    msHistoryRef.current = [];
    freqWindowRef.current = [];
    setIsRunning(true);

    const loop = () => {
      const an = analyserRef.current;
      const buf = bufRef.current;
      if (!an || !buf) return;
      an.getFloatTimeDomainData(buf);
      const rms = getRMS(buf);
      const now = performance.now();

      if (rms < RMS_GATE) {
        freqWindowRef.current = [];
        // 신호 없음 — HOLD_MS 지나기 전까진 마지막 값 유지, 지나면 비움
        if (now - lastGoodAtRef.current > HOLD_MS) {
          lastGoodReadingRef.current = { frequency: null, noteName: null, octave: null, cents: null };
          setReading(r => ({ ...r, ...lastGoodReadingRef.current }));
        }
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const t0 = performance.now();
      const f = detectPitchYIN(buf, audioContext.sampleRate, { fMin: 27, fMax: 4200, threshold: 0.15 });
      const t1 = performance.now();
      const ms = t1 - t0;

      msHistoryRef.current.push(ms);
      if (msHistoryRef.current.length > 60) msHistoryRef.current.shift();
      const avgMs = msHistoryRef.current.reduce((a, b) => a + b, 0) / msHistoryRef.current.length;

      if (f > 0) {
        freqWindowRef.current.push({ t: now, f });
        freqWindowRef.current = freqWindowRef.current.filter(w => now - w.t <= SMOOTH_WINDOW_MS);
        const sortedF = freqWindowRef.current.map(w => w.f).sort((a, b) => a - b);
        const medF = sortedF[Math.floor(sortedF.length / 2)];

        const note = freqToNote(medF);
        lastGoodAtRef.current = now;
        lastGoodReadingRef.current = {
          frequency: medF,
          noteName: note?.noteName ?? null,
          octave: note?.octave ?? null,
          cents: note ? Math.round(note.cents * 10) / 10 : null,
        };
        setReading({
          ...lastGoodReadingRef.current,
          lastMs: Math.round(ms * 100) / 100,
          avgMs: Math.round(avgMs * 100) / 100,
        });
      } else {
        setReading(r => ({ ...r, lastMs: Math.round(ms * 100) / 100, avgMs: Math.round(avgMs * 100) / 100 }));
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stream, audioContext]);

  return { isRunning, reading, start, stop };
}
