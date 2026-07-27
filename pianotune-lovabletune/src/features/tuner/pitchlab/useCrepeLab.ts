import { useCallback, useRef, useState } from "react";
import { freqToNote } from "./labUtils";

// ml5.js는 npm 번들이 아니라 실제 배포 시나리오처럼 CDN에서 동적 로드 (모델 다운로드 무게를 그대로 체감하기 위함)
const ML5_SRC = "https://unpkg.com/ml5@0.12.2/dist/ml5.min.js";
const CREPE_MODEL_URL = "https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/";

const RMS_GATE = 0.006; // YIN과 동일 기준 — CREPE는 자체 게이트가 없어서 직접 붙여줌
const SMOOTH_WINDOW_MS = 250; // CREPE는 프레임마다 더 튀는 편이라 YIN보다 창을 조금 더 넓게
const HOLD_MS = 500;

declare global {
  interface Window {
    ml5?: any;
  }
}

export interface CrepeReading {
  frequency: number | null;
  noteName: string | null;
  octave: number | null;
  cents: number | null;
  lastMs: number; // 콜백 한 번(추론 1회)에 걸린 시간(ms)
  avgMs: number;
  callIntervalMs: number; // 콜백이 다시 불릴 때까지 실제 걸린 간격(체감 반응속도)
}

export type CrepeLoadStage =
  | "idle"
  | "loading-lib"      // ml5.js 스크립트 다운로드 중
  | "loading-model"    // CREPE 가중치 다운로드 + 워밍업 중
  | "ready"
  | "error";

export interface CrepeLoadStats {
  libLoadMs: number | null;      // ml5.js 스크립트 다운로드+파싱 시간
  modelLoadMs: number | null;    // CREPE 모델 로드 시간(요청~modelLoaded 콜백)
  modelBytes: number | null;     // Resource Timing으로 추정한 다운로드 용량 합계
}

let ml5ScriptPromise: Promise<void> | null = null;

function loadMl5Script(): Promise<{ ms: number }> {
  if (window.ml5) return Promise.resolve({ ms: 0 });
  const t0 = performance.now();
  if (!ml5ScriptPromise) {
    ml5ScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ML5_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("ml5.js 로드 실패"));
      document.head.appendChild(script);
    });
  }
  return ml5ScriptPromise.then(() => ({ ms: Math.round((performance.now() - t0) * 10) / 10 }));
}

function estimateModelBytes(): number | null {
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const modelEntries = entries.filter(e => e.name.includes("ml5-data-and-models") || e.name.includes("crepe"));
    if (modelEntries.length === 0) return null;
    const total = modelEntries.reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0);
    return total;
  } catch {
    return null;
  }
}

function getRMS(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export function useCrepeLab(stream: MediaStream | null, audioContext: AudioContext | null) {
  const [stage, setStage] = useState<CrepeLoadStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadStats, setLoadStats] = useState<CrepeLoadStats>({ libLoadMs: null, modelLoadMs: null, modelBytes: null });
  const [reading, setReading] = useState<CrepeReading>({
    frequency: null, noteName: null, octave: null, cents: null, lastMs: 0, avgMs: 0, callIntervalMs: 0,
  });

  const pitchRef = useRef<any>(null);
  const runningRef = useRef(false);
  const msHistoryRef = useRef<number[]>([]);
  const lastCallTsRef = useRef<number | null>(null);

  // ── 자체 RMS 게이트용 analyser (ml5 내부와 별개로, 무음 판정만 하기 위함) ──
  const gateAnalyserRef = useRef<AnalyserNode | null>(null);
  const gateBufRef = useRef<Float32Array | null>(null);

  const freqWindowRef = useRef<Array<{ t: number; f: number }>>([]);
  const lastGoodAtRef = useRef<number>(0);
  const lastGoodReadingRef = useRef<Pick<CrepeReading, "frequency" | "noteName" | "octave" | "cents">>({
    frequency: null, noteName: null, octave: null, cents: null,
  });

  const stop = useCallback(() => {
    runningRef.current = false;
    pitchRef.current = null;
    gateAnalyserRef.current?.disconnect();
    gateAnalyserRef.current = null;
    freqWindowRef.current = [];
    lastGoodAtRef.current = 0;
    lastGoodReadingRef.current = { frequency: null, noteName: null, octave: null, cents: null };
  }, []);

  const start = useCallback(async () => {
    if (!stream || !audioContext) return;
    setError(null);
    try {
      setStage("loading-lib");
      const { ms: libLoadMs } = await loadMl5Script();
      setLoadStats(s => ({ ...s, libLoadMs }));

      if (!window.ml5) throw new Error("ml5 전역 객체를 찾을 수 없음");

      // 무음 게이트용 analyser — CREPE가 실제로 아무 소리에나 반응하는 걸 막기 위해 직접 붙임
      const gateAnalyser = audioContext.createAnalyser();
      gateAnalyser.fftSize = 2048;
      gateAnalyser.smoothingTimeConstant = 0;
      audioContext.createMediaStreamSource(stream).connect(gateAnalyser);
      gateAnalyserRef.current = gateAnalyser;
      gateBufRef.current = new Float32Array(gateAnalyser.fftSize);

      setStage("loading-model");
      const tModel0 = performance.now();

      await new Promise<void>((resolve, reject) => {
        try {
          pitchRef.current = window.ml5.pitchDetection(
            CREPE_MODEL_URL,
            audioContext,
            stream,
            () => resolve()
          );
        } catch (e) {
          reject(e);
        }
      });

      const modelLoadMs = Math.round((performance.now() - tModel0) * 10) / 10;
      const modelBytes = estimateModelBytes();
      setLoadStats(s => ({ ...s, modelLoadMs, modelBytes }));
      setStage("ready");

      runningRef.current = true;
      msHistoryRef.current = [];
      freqWindowRef.current = [];
      lastCallTsRef.current = performance.now();

      const poll = () => {
        if (!runningRef.current || !pitchRef.current) return;
        const t0 = performance.now();
        pitchRef.current.getPitch((err: any, frequency: number | null) => {
          const t1 = performance.now();
          const ms = t1 - t0;
          const interval = lastCallTsRef.current !== null ? t1 - lastCallTsRef.current : ms;
          lastCallTsRef.current = t1;

          msHistoryRef.current.push(ms);
          if (msHistoryRef.current.length > 60) msHistoryRef.current.shift();
          const avgMs = msHistoryRef.current.reduce((a, b) => a + b, 0) / msHistoryRef.current.length;

          // 무음 게이트: CREPE 결과가 있어도 실제 신호 레벨이 낮으면 무시(노이즈/배경음 반응 방지)
          const gAn = gateAnalyserRef.current;
          const gBuf = gateBufRef.current;
          let rms = 1;
          if (gAn && gBuf) {
            gAn.getFloatTimeDomainData(gBuf);
            rms = getRMS(gBuf);
          }
          const now = t1;

          if (!err && frequency && rms >= RMS_GATE) {
            freqWindowRef.current.push({ t: now, f: frequency });
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
              callIntervalMs: Math.round(interval * 10) / 10,
            });
          } else {
            freqWindowRef.current = [];
            if (now - lastGoodAtRef.current > HOLD_MS) {
              lastGoodReadingRef.current = { frequency: null, noteName: null, octave: null, cents: null };
            }
            setReading(r => ({
              ...r,
              ...lastGoodReadingRef.current,
              lastMs: Math.round(ms * 100) / 100,
              avgMs: Math.round(avgMs * 100) / 100,
              callIntervalMs: Math.round(interval * 10) / 10,
            }));
          }
          if (runningRef.current) poll();
        });
      };
      poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "CREPE 로드/실행 실패");
      setStage("error");
    }
  }, [stream, audioContext]);

  return { stage, error, loadStats, reading, start, stop };
}
