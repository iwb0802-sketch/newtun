/**
 * PitchLabPage.tsx — 피치감지 알고리즘 비교 실험실 (신규 탭)
 *
 * 현재 튜너들이 쓰는 YIN(자기상관) 방식과 CREPE(딥러닝 CNN, ml5.js) 방식을
 * 마이크로 동시에 돌려서 정확도/반응속도/무거움을 비교하는 진단용 페이지.
 * 다른 탭(자동/시험용/수동/복합)과 달리 실험/참고용이며 세션 기록에는 관여하지 않음.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mic, Square, Loader2, Gauge, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useYinLab } from "./pitchlab/useYinLab";
import { useCrepeLab } from "./pitchlab/useCrepeLab";
import { PIANO_KEYS, foldToTargetCents } from "./pitchlab/labUtils";

function fmtHz(f: number | null) {
  return f !== null ? `${f.toFixed(1)} Hz` : "—";
}
function fmtCents(c: number | null) {
  if (c === null) return "—";
  return `${c > 0 ? "+" : ""}${c.toFixed(1)}¢`;
}
function fmtBytes(b: number | null) {
  if (b === null) return "측정 안 됨";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function EngineCard({
  title, accent, note, freq, noteName, octave, cents, lastMs, avgMs, extra, isActive,
  targetMode, targetLabel, targetCents, hasSignal,
}: {
  title: string;
  accent: string;
  note: string;
  freq: number | null;
  noteName: string | null;
  octave: number | null;
  cents: number | null;
  lastMs: number;
  avgMs: number;
  extra?: React.ReactNode;
  isActive: boolean;
  targetMode?: boolean;
  targetLabel?: string;
  targetCents?: number | null;
  hasSignal?: boolean;
}) {
  const noteLabel = noteName && octave !== null ? `${noteName}${octave}` : "—";

  const absC = targetCents !== null && targetCents !== undefined ? Math.abs(targetCents) : null;
  const targetColor = !hasSignal || absC === null
    ? "rgba(255,255,255,0.2)"
    : absC <= 2 ? "#22d36b"
    : absC <= 8 ? "#f59e0b"
    : "#ff4d4d";

  return (
    <div className="flex-1 rounded-2xl border border-[#24242a] bg-[#131316] overflow-hidden">
      <div className="h-1" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-wide text-white/90">{title}</h2>
          <span className="text-[10px] text-white/40 uppercase tracking-wider">{note}</span>
        </div>

        {targetMode ? (
          <div className="text-center py-4">
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">타겟: {targetLabel}</div>
            <div
              className="text-6xl font-black tabular-nums leading-none transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: isActive ? targetColor : "rgba(255,255,255,0.2)" }}
            >
              {hasSignal && targetCents !== null && targetCents !== undefined
                ? `${targetCents > 0 ? "+" : ""}${targetCents.toFixed(1)}`
                : "0.0"}
              <span className="text-2xl text-white/40 ml-1">¢</span>
            </div>
            <div className="mt-2 text-sm text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtHz(freq)}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div
              className="text-6xl font-black tabular-nums leading-none"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: isActive ? accent : "rgba(255,255,255,0.2)" }}
            >
              {noteLabel}
            </div>
            <div className="mt-2 text-sm text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtHz(freq)}
            </div>
            <div className="mt-1 text-lg text-white/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtCents(cents)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg bg-black/30 px-3 py-2">
            <div className="text-[10px] text-white/40 uppercase">이번 프레임</div>
            <div className="text-sm font-bold text-white/85 tabular-nums">{lastMs.toFixed(2)} ms</div>
          </div>
          <div className="rounded-lg bg-black/30 px-3 py-2">
            <div className="text-[10px] text-white/40 uppercase">평균(최근 60)</div>
            <div className="text-sm font-bold text-white/85 tabular-nums">{avgMs.toFixed(2)} ms</div>
          </div>
        </div>

        {extra}
      </div>
    </div>
  );
}

function PerfBar({ yinMs, crepeMs }: { yinMs: number; crepeMs: number }) {
  const max = Math.max(yinMs, crepeMs, 1);
  return (
    <div className="rounded-2xl border border-[#24242a] bg-[#131316] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gauge size={14} className="text-white/50" />
        <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">프레임당 처리 시간 비교</h3>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-[11px] text-white/50 mb-1">
            <span>YIN</span><span>{yinMs.toFixed(2)} ms</span>
          </div>
          <div className="h-2 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-[#6366f1] transition-all" style={{ width: `${(yinMs / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-white/50 mb-1">
            <span>CREPE</span><span>{crepeMs.toFixed(2)} ms</span>
          </div>
          <div className="h-2 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-[#10b981] transition-all" style={{ width: `${(crepeMs / max) * 100}%` }} />
          </div>
        </div>
      </div>
      {crepeMs > yinMs * 3 && yinMs > 0 && (
        <p className="mt-3 text-[11px] text-[#f59e0b]">
          CREPE가 YIN보다 약 {(crepeMs / Math.max(yinMs, 0.01)).toFixed(1)}배 느립니다 — 딥러닝 추론 비용 차이가 이렇게 나타납니다.
        </p>
      )}
    </div>
  );
}

export default function PitchLabPage() {
  const [micState, setMicState] = useState<"idle" | "starting" | "running">("idle");
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const startedRef = useRef(false);

  const yin = useYinLab(stream, audioContext);
  const crepe = useCrepeLab(stream, audioContext);

  const [targetMode, setTargetMode] = useState(true);
  const [targetKeyIdx, setTargetKeyIdx] = useState(48); // A4
  const targetKey = PIANO_KEYS[targetKeyIdx];
  const targetLabel = `${targetKey.noteName}${targetKey.octave} (${targetKey.keyNumber}/88)`;

  const startMic = useCallback(async () => {
    setMicError(null);
    setMicState("starting");
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext();
      streamRef.current = newStream;
      ctxRef.current = ctx;
      setStream(newStream);
      setAudioContext(ctx);
      setMicState("running");
    } catch (e) {
      setMicError(e instanceof Error ? e.message : "마이크 접근 실패");
      setMicState("idle");
    }
  }, []);

  useEffect(() => {
    if (stream && audioContext && !startedRef.current) {
      startedRef.current = true;
      yin.start();
      crepe.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, audioContext]);

  const stopMic = useCallback(() => {
    yin.stop();
    crepe.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close().catch(() => {});
    streamRef.current = null;
    ctxRef.current = null;
    startedRef.current = false;
    setStream(null);
    setAudioContext(null);
    setMicState("idle");
  }, [yin, crepe]);

  const isActive = micState === "running";

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 헤더 — 다른 탭과 동일한 네비게이션 */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-precision rounded-lg flex items-center justify-center">
            <Gauge size={16} color="white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">실험실</h1>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-muted rounded-lg p-0.5 overflow-x-auto">
          <Link to="/" className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">자동</Link>
          <Link to="/strobe-manual" className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">시험용</Link>
          <Link to="/strobe-manual-2" className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">시험용2</Link>
          <Link to="/manual" className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">복합</Link>
          <span className="px-3 py-1 text-xs font-bold rounded-md bg-card text-precision shadow-sm whitespace-nowrap">실험실</span>
        </nav>
      </header>

      {/* 본문 — 다크 계측 화면 (진단용이라 나머지 탭과 톤 구분) */}
      <div className="flex-1 bg-[#0a0a0c] text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-6 text-center">
            <p className="text-sm text-white/50 mt-1">
              피치감지 알고리즘 비교 실험 — <span className="text-[#6366f1] font-semibold">YIN</span> vs{" "}
              <span className="text-[#10b981] font-semibold">CREPE</span> (딥러닝)
            </p>
          </header>

          <div className="flex justify-center mb-6">
            {!isActive ? (
              <button
                onClick={startMic}
                disabled={micState === "starting"}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-50"
              >
                {micState === "starting" ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                {micState === "starting" ? "마이크 준비 중..." : "마이크 켜고 비교 시작"}
              </button>
            ) : (
              <button
                onClick={stopMic}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ef4444] text-white font-bold text-sm"
              >
                <Square size={16} /> 정지
              </button>
            )}
          </div>

          {micError && (
            <p className="text-center text-sm text-[#ef4444] mb-4">{micError}</p>
          )}

          <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#131316] border border-[#24242a] cursor-pointer">
              <input
                type="checkbox"
                checked={targetMode}
                onChange={e => setTargetMode(e.target.checked)}
                className="w-4 h-4 accent-[#6366f1]"
              />
              <span className="text-xs text-white/70 whitespace-nowrap">타겟 건반 모드 (특정 음에 집중)</span>
            </label>
            {targetMode && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#131316] border border-[#24242a]">
                <button
                  onClick={() => setTargetKeyIdx(i => Math.max(0, i - 1))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  className="text-sm font-bold tabular-nums w-28 text-center"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {targetLabel}
                </span>
                <button
                  onClick={() => setTargetKeyIdx(i => Math.min(87, i + 1))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          {targetMode && (
            <p className="text-center text-[11px] text-white/40 mb-4 -mt-2">
              건반을 선택하고 그 음을 쳐보세요 — 다른 음/노이즈는 접어서(옥타브 폴딩) 무시하고, 선택한 음 기준 센트 오차만 보여줍니다.
            </p>
          )}

          {stream && (
            <>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <EngineCard
                  title="YIN (자기상관)"
                  accent="#6366f1"
                  note="현재 튜너 방식"
                  freq={yin.reading.frequency}
                  noteName={yin.reading.noteName}
                  octave={yin.reading.octave}
                  cents={yin.reading.cents}
                  lastMs={yin.reading.lastMs}
                  avgMs={yin.reading.avgMs}
                  isActive={isActive}
                  targetMode={targetMode}
                  targetLabel={targetLabel}
                  hasSignal={yin.reading.frequency !== null}
                  targetCents={yin.reading.frequency !== null ? foldToTargetCents(yin.reading.frequency, targetKey.freq) : null}
                />
                <EngineCard
                  title="CREPE (CNN)"
                  accent="#10b981"
                  note="딥러닝 기반"
                  freq={crepe.reading.frequency}
                  noteName={crepe.reading.noteName}
                  octave={crepe.reading.octave}
                  cents={crepe.reading.cents}
                  lastMs={crepe.reading.lastMs}
                  avgMs={crepe.reading.avgMs}
                  isActive={isActive}
                  targetMode={targetMode}
                  targetLabel={targetLabel}
                  hasSignal={crepe.reading.frequency !== null}
                  targetCents={crepe.reading.frequency !== null ? foldToTargetCents(crepe.reading.frequency, targetKey.freq) : null}
                  extra={
                    <div className="mt-3 rounded-lg bg-black/30 px-3 py-2">
                      <div className="text-[10px] text-white/40 uppercase">콜백 간 실제 간격</div>
                      <div className="text-sm font-bold text-white/85 tabular-nums">
                        {crepe.reading.callIntervalMs.toFixed(1)} ms
                      </div>
                    </div>
                  }
                />
              </div>

              <div className="rounded-2xl border border-[#24242a] bg-[#131316] p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Download size={14} className="text-white/50" />
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">CREPE 모델 로딩 무게</h3>
                </div>
                {crepe.stage === "loading-lib" && (
                  <p className="text-sm text-white/60">ml5.js 라이브러리 다운로드 중...</p>
                )}
                {crepe.stage === "loading-model" && (
                  <p className="text-sm text-white/60">CREPE 모델 가중치 다운로드 + 초기화 중... (몇 초 걸릴 수 있음)</p>
                )}
                {crepe.stage === "error" && (
                  <p className="text-sm text-[#ef4444]">{crepe.error}</p>
                )}
                {crepe.stage === "ready" && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">라이브러리 로드</div>
                      <div className="text-sm font-bold tabular-nums">{crepe.loadStats.libLoadMs?.toFixed(0) ?? 0} ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">모델 로드+워밍업</div>
                      <div className="text-sm font-bold tabular-nums">{crepe.loadStats.modelLoadMs?.toFixed(0) ?? 0} ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">다운로드 용량(추정)</div>
                      <div className="text-sm font-bold tabular-nums">{fmtBytes(crepe.loadStats.modelBytes)}</div>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-white/40 mt-3">
                  참고: YIN은 별도 다운로드 없이 코드 몇 KB로 즉시 동작 — 이 카드에 나온 숫자 전부가 CREPE 쪽에만 추가로 드는 비용입니다.
                </p>
              </div>

              <PerfBar yinMs={yin.reading.avgMs} crepeMs={crepe.reading.avgMs} />
            </>
          )}

          <p className="text-center text-[11px] text-white/30 mt-8">
            실험/진단용 탭 — 조율 세션 기록에는 영향 없음.
          </p>
        </div>
      </div>
    </div>
  );
}
