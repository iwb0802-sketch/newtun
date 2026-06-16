/**
 * StrobeManualPage.tsx — 수동 스트로브 조율 모드
 *
 * 흐름:
 * 1. 건반 선택 (SectionTabs + TargetNoteBar)
 * 2. 마이크 켜기 → useStrobeDetector가 선택 건반 기준으로 실시간 추적
 * 3. 스트로브 바 + cents 값으로 음 잔량에 따라 계속 변화
 * 4. 안정값 확인 후 "확정" 버튼 눌러서 그래프에 저장
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { usePitchDetector, PIANO_KEYS } from "@/hooks/usePitchDetector";
import { useStrobeDetector } from "@/hooks/useStrobeDetector";
import { useTuningSession } from "@/hooks/useTuningSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useManualSequence } from "@/features/tuner/manual/useManualSequence";
import SectionTabs from "@/features/tuner/manual/SectionTabs";
import TargetNoteBar from "@/features/tuner/manual/TargetNoteBar";
import StrobeTuner from "@/components/tuner/StrobeTuner";
import TuningCurveChart from "@/components/tuner/TuningCurveChart";
import { exportToPdf, exportToImage } from "@/lib/tuner/exportPdf";

const toast = Object.assign(
  (msg: string, opts?: { duration?: number }) => sonnerToast(msg, opts),
  {
    success: (msg: string, opts?: { duration?: number }) => sonnerToast.success(msg, opts),
    error:   (msg: string) => sonnerToast.error(msg),
  }
);

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

  // 마이크 — usePitchDetector에서 stream/audioContext 공유
  const { isListening, startListening, stopListening, error, stream, audioContext } =
    usePitchDetector(undefined);

  useWakeLock(isListening);

  // 스트로브 — 선택 건반 기준으로 실시간 추적
  const {
    strobeCents,
    isCapturing,
    captureProgress,
    currentNote,
    currentKeyIndex: strobeKeyIndex,
    analysisFreq,
    partial,
  } = useStrobeDetector(
    isListening ? stream : null,
    isListening ? audioContext : null,
    800,
    4096,
    seq.targetKeyIndex
  );

  // 확정 대기 cents (스트로브 값이 업데이트될 때마다 갱신, null이면 아직 측정 안 됨)
  const [pendingCents, setPendingCents] = useState<number | null>(null);

  // strobeCents가 바뀔 때마다 pendingCents 업데이트 (실시간으로 계속 갱신)
  useEffect(() => {
    if (strobeCents !== null) {
      setPendingCents(strobeCents);
    }
  }, [strobeCents]);

  // 건반 바뀌면 pendingCents 리셋
  useEffect(() => {
    setPendingCents(null);
  }, [seq.targetKeyIndex]);

  const [showSessionList, setShowSessionList] = useState(false);
  const [userName, setUserName] = useState("");

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    const s = await createSession();
    if (s) { activeSessionIdRef.current = s.id; return s.id; }
    return null;
  }, [createSession]);

  // 확정 버튼
  const handleConfirm = useCallback(async () => {
    if (pendingCents === null) return;
    await ensureSession();
    const ki = seq.targetKeyIndex;
    recordMeasurement(ki, pendingCents, PIANO_KEYS[ki].freq);
    toast.success(
      `${PIANO_KEYS[ki].noteName}${PIANO_KEYS[ki].octave} (건반 ${ki + 1}) → ${pendingCents > 0 ? "+" : ""}${pendingCents.toFixed(1)}¢`,
      { duration: 1800 }
    );
    setPendingCents(null);
    // 다음 건반으로 자동 이동
    seq.next();
  }, [pendingCents, seq, ensureSession, recordMeasurement]);

  const toggleListening = async () => {
    if (isListening) stopListening();
    else {
      if (!activeSessionIdRef.current) {
        const s = await createSession();
        if (s) activeSessionIdRef.current = s.id;
      }
      await startListening();
    }
  };

  const isMeasured = activeSession
    ? seq.targetKeyIndex in (activeSession.measurements as Record<number, unknown>)
    : false;

  const targetKey = PIANO_KEYS[seq.targetKeyIndex];

  // cents 색상
  const absC = pendingCents !== null ? Math.abs(pendingCents) : null;
  const centsColor = absC === null
    ? "text-muted-foreground/30"
    : absC <= 2 ? "text-in-tune"
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
            <h1 className="text-base font-bold text-foreground leading-tight">수동 조율</h1>
            <p className="text-xs text-muted-foreground/80">스트로브 안정 확인 후 수동 확정</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <Link to="/"       className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">자동</Link>
          <Link to="/manual" className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">복합</Link>
          <span              className="px-3 py-1 text-xs font-bold rounded-md bg-card text-primary shadow-sm">수동</span>
        </nav>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3">

        {/* 구간 탭 */}
        <SectionTabs section={seq.section} onChange={seq.setSection} />

        {/* 목표 건반 바 */}
        <TargetNoteBar
          keyIndex={seq.targetKeyIndex}
          indexInOrder={seq.indexInOrder}
          total={seq.total}
          canPrev={seq.canPrev}
          canNext={seq.canNext}
          onPrev={seq.prev}
          onNext={seq.next}
        />

        {/* ── 스트로브 메인 패널 ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">

          {/* cents 수치 — 스트로브 위 */}
          <div className="px-5 pt-4 pb-2 flex items-end justify-between">
            <div>
              <span
                className={cn("text-5xl font-black tabular-nums transition-colors duration-100", centsColor)}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {pendingCents !== null
                  ? `${pendingCents > 0 ? "+" : ""}${pendingCents.toFixed(1)}`
                  : "—"}
              </span>
              <span className="text-lg text-muted-foreground ml-1">¢</span>
            </div>
            {/* 상태 뱃지 */}
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                isCapturing
                  ? "bg-warn/15 text-warn"
                  : strobeCents !== null
                  ? absC !== null && absC <= 2 ? "bg-in-tune/15 text-in-tune" : "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                {isCapturing ? "● 수집 중" : strobeCents !== null ? "● 안정값" : "대기 중"}
              </span>
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {targetKey.noteName}{targetKey.octave} · 건반 {targetKey.keyNumber}
              </span>
            </div>
          </div>

          {/* 캡처 진행 바 */}
          {isCapturing && (
            <div className="px-5 pb-2">
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="bg-warn h-1 rounded-full transition-all duration-100"
                  style={{ width: `${captureProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 스트로브 바 */}
          <div className="px-0">
            <StrobeTuner
              detectedCents={pendingCents}
              stableCents={strobeCents}
              isCapturing={isCapturing}
              isActive={isListening}
              currentNote={currentNote}
              currentKeyIndex={strobeKeyIndex}
              analysisFreq={analysisFreq}
              partial={partial}
            />
          </div>

          {/* 확정 버튼 — 스트로브 바 바로 아래 */}
          <div className="px-4 py-3 border-t border-border/60">
            <button
              onClick={handleConfirm}
              disabled={pendingCents === null}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]",
                pendingCents !== null
                  ? "bg-in-tune text-white hover:bg-in-tune/90 shadow-sm"
                  : "bg-muted text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {pendingCents !== null
                ? `✓ 확정  ${pendingCents > 0 ? "+" : ""}${pendingCents.toFixed(1)}¢`
                : "건반을 눌러 스트로브 측정 후 확정"}
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

        {error && (
          <div className="px-3 py-2 rounded-lg bg-off/10 border border-off/40 text-xs text-off">
            {error}
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
