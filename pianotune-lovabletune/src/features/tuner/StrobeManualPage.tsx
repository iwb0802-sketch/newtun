/**
 * StrobeManualPage.tsx — 수동 조율 모드 (v3, PT-100/PT-A1 화면 재현)
 *
 * - 상단: PT-100 스타일 스트로브 바 + 5열 LCD (OCT-NOTE/KEY No./CENT/CURVE/PITCH)
 * - 키패드: 다이얼식 음 선택 (숫자=음이름, OCT=옥타브, AUTO=자동판별, RES=리셋)
 * - AUTO 모드는 usePitchDetector(자동탭과 동일 엔진)를 같은 마이크로 공유해서 현재 음 자동 추적
 * - 그래프/세션/내보내기는 하단으로 이동
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { PIANO_KEYS, usePitchDetector } from "@/hooks/usePitchDetector";
import { useCompositeTuner, CompositeResult } from "@/hooks/useCompositeTuner";
import { median } from "@/lib/tuner/pitchEngine";
import { useTuningSession } from "@/hooks/useTuningSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useManualSequence } from "@/features/tuner/manual/useManualSequence";
import SectionTabs from "@/features/tuner/manual/SectionTabs";
import TargetNoteBar from "@/features/tuner/manual/TargetNoteBar";
import PTKeypad from "@/features/tuner/manual/PTKeypad";
import PTStrobePanel from "@/components/tuner/PTStrobePanel";
import SpectrumGraph from "@/components/tuner/SpectrumGraph";
import TuningCurveChart from "@/components/tuner/TuningCurveChart";
import { exportToPdf, exportToImage } from "@/lib/tuner/exportPdf";

const toast = Object.assign(
  (msg: string, opts?: { duration?: number }) => sonnerToast(msg, opts),
  {
    success: (msg: string, opts?: { duration?: number }) => sonnerToast.success(msg, opts),
    error:   (msg: string) => sonnerToast.error(msg),
  }
);

// 음이름(자연음) → 반음 인덱스 (C=0 기준)
const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// letter + octave + shift(#/b) → keyIndex (0~87), 범위 밖이면 null
function noteToKeyIndex(letter: string, octave: number, shift: number): number | null {
  const base = NATURAL_SEMITONE[letter];
  if (base === undefined) return null;
  const midi = (octave + 1) * 12 + base + shift;
  const keyIndex = midi - 21;
  if (keyIndex < 0 || keyIndex > 87) return null;
  return keyIndex;
}

export default function StrobeManualPage() {
  const { user } = useAuth();
  const { isPro } = useUserRole(user?.id);

  const seq = useManualSequence();

  const {
    sessions, activeSession, activeSessionId, setActiveSessionId,
    createSession, recordMeasurement, undoLastMeasurement, undoStack,
    chartData, measuredCount,
  } = useTuningSession(null);

  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  // ── 마이크는 usePitchDetector가 소유 (자동판별용, 자동탭과 동일 엔진) ──
  const pitchDetector = usePitchDetector();

  // ── pendingCents: 엔진이 안정값(finalCents)을 내면 handleEngineConfirmed에서 직접 갱신 ──
  const [pendingCents, setPendingCents] = useState<number | null>(null);

  // ── 스트로브 정밀 엔진 — 복합엔진(YIN+Goertzel+HPS+TWM) + 같은 analyser 공유 ──
  const [lastEngineMeta, setLastEngineMeta] = useState<CompositeResult | null>(null);
  const handleEngineConfirmed = useCallback((r: CompositeResult) => {
    if (r.finalCents === null) return;
    setPendingCents(r.finalCents);
    setLastEngineMeta(r);
  }, []);

  const {
    result: engineResult,
    startListening: startStrobeLoop,
    stopListening: stopStrobeLoop,
    error: engineError,
  } = useCompositeTuner(seq.targetKeyIndex, handleEngineConfirmed, pitchDetector.analyserRef);

  // 실시간 흐름용 — 교차검증 전이라도 즉시 표시 (YIN 우선, 없으면 Goertzel)
  const liveCentsRaw   = engineResult?.yinCents ?? engineResult?.goertzelCents ?? null;
  const strobeCents    = pendingCents; // 자동 확정된 값 (하위 호환용 별칭)
  const isCapturing    = engineResult?.isCapturing ?? false;
  const captureProgress = engineResult?.captureProgress ?? 0;
  const currentNote     = engineResult ? `${engineResult.noteName}${engineResult.octave}` : null;
  const strobeKeyIndex  = engineResult?.keyIndex ?? null;
  const analysisFreq    = engineResult?.frequency ?? null;
  const partial         = engineResult?.partial ?? lastEngineMeta?.partial ?? null;

  const isListening = pitchDetector.isListening;
  useWakeLock(isListening);

  // ── 스무딩 + 유지: 복합엔진은 프레임마다 값이 흔들려서 영점(null-meter)이 절대 안 멈추고,
  // 소리가 끊기면 값이 사라져서 +/- 로 확인할 대상이 없어짐 → 200ms 스무딩 + 무음에도 마지막 값 유지
  const SMOOTH_WINDOW_MS = 200;
  const smoothWindowRef = useRef<Array<{ t: number; c: number }>>([]);
  const [liveCents, setLiveCents] = useState<number | null>(null);

  useEffect(() => {
    if (!isListening) {
      // 마이크 자체를 끈 경우에만 초기화
      smoothWindowRef.current = [];
      setLiveCents(null);
      return;
    }
    if (liveCentsRaw === null) {
      // 무음 구간 — 마지막 값을 그대로 유지 (+/- 로 계속 확인 가능하도록)
      return;
    }
    const now = Date.now();
    smoothWindowRef.current.push({ t: now, c: liveCentsRaw });
    smoothWindowRef.current = smoothWindowRef.current.filter(s => now - s.t <= SMOOTH_WINDOW_MS);
    const med = Math.round(median(smoothWindowRef.current.map(s => s.c)) * 10) / 10;
    if (isFinite(med)) setLiveCents(med);
  }, [liveCentsRaw, isListening]);

  // ── AUTO 모드: 현재 연주 중인 음을 자동 추적해서 targetKeyIndex 갱신 ──
  const [autoMode, setAutoMode] = useState(false);
  const lastAutoKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoMode) { lastAutoKeyRef.current = null; return; }
    if (!pitchDetector.currentPitch) return;
    const ki = pitchDetector.currentPitch.keyIndex;
    if (lastAutoKeyRef.current === ki) return;
    lastAutoKeyRef.current = ki;
    seq.jumpTo(ki);
  }, [autoMode, pitchDetector.currentPitch, seq]);

  // ── targetOffset: 영점(null-meter) 방식 ──────────────────────────
  // 건반 치면 화면엔 0이 뜨고, 실제로는 스트로브가 원시 오차만큼 빠르게 흐름.
  // +/-, -10/+10으로 오프셋을 눌러서 스트로브가 멈추는 지점 = 그 음의 실제 cents.
  // 저장되는 값(pendingCents)은 원음 raw 그대로 — 화면 표시만 분리.
  const [targetOffset, setTargetOffset] = useState(0);

  // 건반 바뀌면 pendingCents + targetOffset + 스무딩 윈도우 리셋
  useEffect(() => {
    setPendingCents(null);
    setTargetOffset(0);
    smoothWindowRef.current = [];
    setLiveCents(null);
  }, [seq.targetKeyIndex]);

  const handleReset = useCallback(() => {
    setPendingCents(null);
    setTargetOffset(0);
  }, []);

  const handleNudge = useCallback((delta: number) => {
    setTargetOffset(prev => Math.round((prev + delta) * 10) / 10);
  }, []);

  // 스트로브를 움직이는 값 = 원시 오차 - 오프셋 (0에 가까워질수록 스트로브 정지)
  const strobeDriverCents = liveCents !== null ? Math.round((liveCents - targetOffset) * 10) / 10 : null;
  const strobeLocked = strobeDriverCents !== null && Math.abs(strobeDriverCents) <= 0.5; // 반올림해서 0일 때만 LOCKED
  // 화면/LCD에 표시되는 숫자 = 내가 눌러서 맞춘 오프셋값 (원시값 아님)
  const displayReadout = targetOffset;

  const handleJumpToNote = useCallback((letter: string, octave: number, shift: number) => {
    const ki = noteToKeyIndex(letter, octave, shift);
    if (ki === null) { toast.error("피아노 음역을 벗어났습니다 (A0~C8)"); return; }
    setAutoMode(false);
    seq.jumpTo(ki);
  }, [seq]);

  // ── 세션 ─────────────────────────────────────────────────────────
  const [showSessionList, setShowSessionList] = useState(false);
  const [userName, setUserName] = useState("");

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    const s = await createSession();
    if (s) { activeSessionIdRef.current = s.id; return s.id; }
    return null;
  }, [createSession]);

  // ── 확정 ─────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (liveCents === null) return;
    const finalValue = displayReadout; // 내가 +/- 로 맞춘 값을 그대로 확정
    await ensureSession();
    const ki = seq.targetKeyIndex;
    recordMeasurement(ki, finalValue, PIANO_KEYS[ki].freq);
    toast.success(
      `${PIANO_KEYS[ki].noteName}${PIANO_KEYS[ki].octave} (건반 ${ki + 1}) → ${finalValue > 0 ? "+" : ""}${finalValue.toFixed(1)}¢`,
      { duration: 1800 }
    );
    setPendingCents(null);
    setTargetOffset(0);
    seq.next();
  }, [liveCents, displayReadout, seq, ensureSession, recordMeasurement]);

  // ── 마이크 토글 (usePitchDetector가 실제 마이크 소유, 스트로브는 같은 analyser 사용) ──
  const toggleListening = async () => {
    if (isListening) {
      pitchDetector.stopListening();
      stopStrobeLoop();
    } else {
      if (!activeSessionIdRef.current) {
        const s = await createSession();
        if (s) activeSessionIdRef.current = s.id;
      }
      await pitchDetector.startListening();
      startStrobeLoop();
    }
  };

  const targetKey = PIANO_KEYS[seq.targetKeyIndex];

  // cents 색상 — 남은 오차(strobeDriverCents)가 얼마나 0에 가까운지로 판단
  const absC = strobeDriverCents !== null ? Math.abs(strobeDriverCents) : null;
  const centsColor = absC === null
    ? "text-muted-foreground/30"
    : strobeLocked ? "text-in-tune"
    : absC <= 8 ? "text-warn"
    : "text-off";

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>

      {/* 헤더 */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">시험용</h1>
            <p className="text-xs text-muted-foreground/80">PT-100 스타일 · 키패드로 건반 직접 선택</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <Link to="/"       className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">자동</Link>
          <span              className="px-3 py-1 text-xs font-bold rounded-md bg-card text-primary shadow-sm">시험용</span>
          <Link to="/test"   className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">수동</Link>
          <Link to="/manual" className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">복합</Link>
        </nav>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3">

        {/* ── PT-100 스트로브 + 키패드 (하나의 기기 패널로 통합) ── */}
        <div className="rounded-2xl overflow-hidden border border-black/60 shadow-lg">
          <PTStrobePanel
            detectedCents={strobeDriverCents}
            stableCents={null}
            readoutCents={displayReadout}
            isActive={isListening}
            noteName={targetKey.noteName}
            octave={targetKey.octave}
            keyNumber={targetKey.keyNumber}
            curveLabel="FLAT"
            pitchA4={440}
          />
          <PTKeypad
            onJumpToNote={handleJumpToNote}
            onAutoToggle={setAutoMode}
            onReset={handleReset}
            onNudge={handleNudge}
            autoMode={autoMode}
          />
        </div>

        {/* ── 이전/다음(절반) + 구간 전환(절반) ── */}
        <div className="grid grid-cols-2 gap-2 items-stretch">
          <TargetNoteBar
            keyIndex={seq.targetKeyIndex}
            indexInOrder={seq.indexInOrder}
            total={seq.total}
            canPrev={seq.canPrev}
            canNext={seq.canNext}
            onPrev={() => { setAutoMode(false); seq.prev(); }}
            onNext={() => { setAutoMode(false); seq.next(); }}
            compact
          />
          <SectionTabs section={seq.section} onChange={seq.setSection} compact />
        </div>

        {/* ── 확정 패널 (큰 숫자 = 내가 맞춘 오프셋 + 상태 + 확정/리셋) ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 pt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/70">
              스트로브가 <span className="text-off font-bold">빨강(음 낮음)</span>이면 빨간 버튼(–), <span className="font-bold">회색(음 높음)</span>이면 회색 버튼(+)을 눌러 멈추는 지점을 찾으세요
            </span>
          </div>
          <div className="px-5 pt-2 pb-2 flex items-end justify-between">
            <div>
              <span
                className={cn("text-5xl font-black tabular-nums transition-colors duration-100", centsColor)}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {`${displayReadout > 0 ? "+" : ""}${displayReadout.toFixed(1)}`}
              </span>
              <span className="text-lg text-muted-foreground ml-1">¢</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                strobeLocked
                  ? "bg-in-tune/15 text-in-tune"
                  : liveCents !== null
                  ? "bg-warn/15 text-warn"
                  : "bg-muted text-muted-foreground"
              )}>
                {strobeLocked ? "● LOCKED (정지)"
                  : liveCents !== null ? "● 스트로브 흐르는 중"
                  : "대기 중"}
              </span>
              {strobeCents !== null && (
                <span className="text-[10px] text-muted-foreground/70">자동측정: {strobeCents > 0 ? "+" : ""}{strobeCents.toFixed(1)}¢</span>
              )}
              {autoMode && (
                <span className="text-[10px] font-bold text-in-tune bg-in-tune/10 px-1.5 py-0.5 rounded-full">AUTO 추적 중</span>
              )}
            </div>
          </div>

          {isCapturing && (
            <div className="px-5 pb-2">
              <div className="w-full bg-muted rounded-full h-1">
                <div className="bg-warn h-1 rounded-full transition-all duration-100" style={{ width: `${captureProgress * 100}%` }} />
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-border/60 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={liveCents === null}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]",
                liveCents !== null
                  ? "bg-in-tune text-white hover:bg-in-tune/90 shadow-sm"
                  : "bg-muted text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {liveCents !== null
                ? `✓ 확정  ${displayReadout > 0 ? "+" : ""}${displayReadout.toFixed(1)}¢`
                : "측정 후 확정"}
            </button>
          </div>
        </div>

        {/* 마이크 버튼 */}
        <button
          onClick={isPro ? toggleListening : undefined}
          disabled={!isPro}
          title={!isPro ? "Pro 이상 등급에서 사용 가능합니다" : undefined}
          className={cn(
            "w-full py-2.5 rounded-xl font-bold text-sm transition-all",
            isPro && "active:scale-[0.98]",
            !isPro
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              : isListening
              ? "bg-off text-white hover:bg-off/90"
              : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          {!isPro ? "🔒 마이크 켜기"
            : isListening ? "■ 마이크 끄기" : "● 마이크 켜기"}
        </button>

        {!isPro && (
          <p className="text-xs text-center text-muted-foreground">Pro 등급으로 변경하면 마이크를 사용할 수 있습니다.</p>
        )}

        {(engineError || pitchDetector.error) && (
          <div className="px-3 py-2 rounded-lg bg-off/10 border border-off/40 text-xs text-off">
            {engineError || pitchDetector.error}
          </div>
        )}

        {/* 되돌리기 */}
        {undoStack.length > 0 && (
          <button
            onClick={() => undoLastMeasurement()}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            ↩ 마지막 측정 취소
          </button>
        )}

        {/* 조율 커브 */}
        <div className="bg-card border border-border rounded-xl p-2 shadow-sm">
          <TuningCurveChart data={chartData} activeKeyIndex={seq.targetKeyIndex} />
        </div>

        {/* 스펙트럼 그래프 */}
        <SpectrumGraph
          analyserRef={pitchDetector.analyserRef}
          targetKeyIndex={seq.targetKeyIndex}
          isActive={isListening}
        />

        {/* 세션 + 내보내기 */}
        <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="relative flex-1 mr-2">
              <button
                onClick={() => setShowSessionList(v => !v)}
                className="flex items-center gap-1.5 text-sm text-foreground/85 hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="font-semibold truncate max-w-[180px]">{activeSession?.name || "세션 없음"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <p className="text-xs text-muted-foreground/80 mt-0.5">측정 {measuredCount} / 88</p>
              {showSessionList && sessions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setActiveSessionId(s.id); setShowSessionList(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs hover:bg-muted/50 border-b border-border/40 last:border-0",
                        s.id === activeSessionId ? "bg-primary/10 text-primary font-bold" : "text-foreground/85"
                      )}
                    >
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-muted-foreground/80 mt-0.5">
                        {Object.keys(s.measurements).length}건반 측정
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { createSession(); setShowSessionList(false); }}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg font-medium whitespace-nowrap"
            >
              + 새 세션
            </button>
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <input
              type="text"
              placeholder="성명 입력 (PDF에 표시)"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary/60"
            />
            <div className="flex gap-2">
              <button
                onClick={() => activeSession && exportToPdf(activeSession.name, userName, activeSession.measurements as any)}
                disabled={measuredCount === 0}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold",
                  measuredCount > 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                )}
              >📄 PDF</button>
              <button
                onClick={() => activeSession && exportToImage(activeSession.name, userName, activeSession.measurements as any)}
                disabled={measuredCount === 0}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold",
                  measuredCount > 0 ? "bg-in-tune text-white" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                )}
              >🖼️ 이미지</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
