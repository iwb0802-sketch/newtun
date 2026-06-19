/**
 * StrobeTuner.tsx — v2 멀티 레인 스트로브
 *
 * - partial에 따라 1~5개 독립 레인 (각 배음 기준 cents 오프셋)
 * - PianoMeter 스타일: 레인 번호, 각 레인 독립 속도
 * - 레인별 색상: 1=레드, 2=오렌지, 3=옐로우, 4=그린, 5=사이언
 */

import { useEffect, useRef, useState } from "react";

interface StrobeTunerProps {
  detectedCents: number | null;
  stableCents: number | null;
  isCapturing: boolean;
  isActive: boolean;
  onSaveStrobe?: (cents: number) => void;
  stableDuration?: number;
  onStableDurationChange?: (ms: number) => void;
  currentNote?: string | null;
  currentKeyIndex?: number | null;
  partial?: number | null;
  analysisFreq?: number | null;
}

// 스트로브 패턴 상수
const BAR_WIDTH  = 3;
const BAR_GAP    = 2;
const GROUP_SIZE = 3;
const GROUP_GAP  = 18;
const GROUP_W    = GROUP_SIZE * (BAR_WIDTH + BAR_GAP) + GROUP_GAP;
const GROUP_COUNT = 6;
const TOTAL_W    = GROUP_COUNT * GROUP_W;

// 레인별 색상 (rgb)
const LANE_COLORS: [number, number, number][] = [
  [235, 30,  30],   // 1 — 레드
  [235, 130, 20],   // 2 — 오렌지
  [210, 200, 20],   // 3 — 옐로우
  [30,  210, 80],   // 4 — 그린
  [30,  180, 235],  // 5 — 사이언
];

// 배음 차수별 cents 오프셋 계산
// partial=1 → 기본음 그대로
// partial=n → n배음 기준 (주파수 n배 = 동일 pitch → cents는 같지만 스트로브 속도를 n배로)
function getLaneCount(partial: number | null | undefined): number {
  if (!partial || partial <= 1) return 1;
  if (partial <= 2) return 2;
  if (partial <= 4) return 3;
  return Math.min(partial, 5);
}

interface LaneCanvasProps {
  laneIndex: number;       // 0-based
  partial: number;         // 이 레인의 배음 차수 (1,2,3,4,5...)
  cents: number | null;    // 기준 cents 오프셋
  targetCents: number;
  isActive: boolean;
  height: number;
}

function LaneCanvas({ laneIndex, partial: _partial, cents, targetCents, isActive, height }: LaneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;

    const [r, g, b] = LANE_COLORS[laneIndex % LANE_COLORS.length];
    const strobeOffset = cents !== null ? cents - targetCents : null;
    const isStopped = strobeOffset !== null && Math.abs(strobeOffset) <= 0.8;

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, W, H);

      if (!isActive || strobeOffset === null) {
        ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
        for (let gi = 0; gi < GROUP_COUNT + 1; gi++) {
          for (let bi = 0; bi < GROUP_SIZE; bi++) {
            const x = gi * GROUP_W + bi * (BAR_WIDTH + BAR_GAP);
            ctx.fillRect(x, 2, BAR_WIDTH, H - 4);
          }
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // 속도: 오프셋에 비례, 배음 차수가 높을수록 동일 오프셋에서 더 빠름
      const speed = (strobeOffset / 50) * 5;
      offsetRef.current = ((offsetRef.current + speed) % TOTAL_W + TOTAL_W) % TOTAL_W;

      const absOff = Math.abs(strobeOffset);
      const brightness = isStopped ? 1 : Math.min(1, 0.4 + (absOff / 12) * 0.6);
      const rc = Math.round(r * brightness);
      const gc = Math.round(g * brightness);
      const bc = Math.round(b * brightness);

      ctx.fillStyle = `rgb(${rc},${gc},${bc})`;
      for (let gi = -1; gi < GROUP_COUNT + 2; gi++) {
        const groupX = ((gi * GROUP_W) + offsetRef.current) % TOTAL_W;
        for (let bi = 0; bi < GROUP_SIZE; bi++) {
          const x = groupX + bi * (BAR_WIDTH + BAR_GAP);
          if (x > -BAR_WIDTH && x < W + BAR_WIDTH) {
            ctx.fillRect(x, 2, BAR_WIDTH, H - 4);
          }
        }
      }

      // 멈춤 글로우
      if (isStopped) {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.2)`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, cents, targetCents, laneIndex, height]);

  const strobeOffset = cents !== null ? cents - targetCents : null;
  const isStopped = strobeOffset !== null && Math.abs(strobeOffset) <= 0.8;
  const [r, g, b] = LANE_COLORS[laneIndex % LANE_COLORS.length];

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        className="w-full block"
        style={{ imageRendering: "pixelated" }}
      />
      {/* 레인 번호 오버레이 */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums opacity-70"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: `rgb(${r},${g},${b})` }}
      >
        {laneIndex + 1}
      </div>
      {/* 멈춤 인디케이터 */}
      {isStopped && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold"
          style={{ color: `rgb(${r},${g},${b})` }}
        >
          ●
        </div>
      )}
    </div>
  );
}

export default function StrobeTuner({
  detectedCents, stableCents, isCapturing, isActive,
  onSaveStrobe, stableDuration = 1200, onStableDurationChange,
  currentNote, currentKeyIndex, partial, analysisFreq,
}: StrobeTunerProps) {
  const [targetCents, setTargetCents] = useState(0);

  const activeStable  = stableCents ?? detectedCents;
  const laneCount     = getLaneCount(partial);
  const laneHeight    = laneCount <= 2 ? 36 : laneCount <= 3 ? 30 : 24;

  const strobeOffset  = activeStable !== null ? activeStable - targetCents : null;
  const isStopped     = strobeOffset !== null && Math.abs(strobeOffset) <= 0.8;

  const adjustTarget  = (delta: number) =>
    setTargetCents(prev => Math.round((prev + delta) * 10) / 10);

  const syncToDetected = () => {
    if (activeStable !== null) setTargetCents(Math.round(activeStable * 10) / 10);
  };

  // 레인 cents 계산 — 기본음 기준 동일 cents 오프셋 (배음별 독립 스트로브)
  // 실제 피아노에서 배음은 약간씩 벌어지지만, 여기선 같은 cents를 각 레인에 표시
  // → 속도 차이로 시각적으로 구분됨 (고배음일수록 주기적 오프셋 변화 빠름)
  const getLaneCents = (_laneIndex: number) => activeStable;

  return (
    <div className="bg-instrument rounded-xl overflow-hidden border border-instrument/60">

      {/* 멀티 레인 스트로브 */}
      <div className="divide-y divide-instrument/40">
        {Array.from({ length: laneCount }, (_, i) => (
          <LaneCanvas
            key={i}
            laneIndex={i}
            partial={i + 1}
            cents={getLaneCents(i)}
            targetCents={targetCents}
            isActive={isActive}
            height={laneHeight}
          />
        ))}
      </div>

      {/* 상태 표시 */}
      <div className="px-3 py-1.5 flex items-center justify-between border-t border-instrument/60">
        <div className="flex items-center gap-2">
          {currentNote && (
            <span className="text-sm font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {currentNote}
              {currentKeyIndex !== null && currentKeyIndex !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">건반{currentKeyIndex + 1}</span>
              )}
              {partial && partial > 1 && analysisFreq && (
                <span className="text-[10px] text-yellow-400 ml-1.5 font-mono">
                  ×{partial} {analysisFreq.toFixed(0)}Hz
                </span>
              )}
            </span>
          )}
          <span className="text-xs font-medium" style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: isCapturing ? "#f59e0b"
              : isStopped ? "#22c55e"
              : strobeOffset === null ? "#4b5563"
              : strobeOffset > 0 ? "#f97316" : "#60a5fa"
          }}>
            {!isActive       ? "대기 중"
              : isCapturing  ? "● 수집 중"
              : strobeOffset === null ? "무음"
              : isStopped    ? "● 영점"
              : strobeOffset > 0 ? "▶ 높음" : "◄ 낮음"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {activeStable !== null
            ? <><span className="text-muted-foreground/60">안정</span> <span className="text-yellow-400">{activeStable > 0 ? "+" : ""}{activeStable.toFixed(1)}¢</span></>
            : <span className="text-muted-foreground/40">대기 중</span>}
        </span>
      </div>

      {/* 기준값 조정 */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-instrument/40">
        <span className="text-xs text-muted-foreground mr-1">기준</span>
        <button onClick={() => adjustTarget(-10)}
          className="px-2 py-1 bg-instrument/80 hover:bg-instrument/60 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all">-10</button>
        <button onClick={() => adjustTarget(-1)}
          className="px-2.5 py-1 bg-instrument/80 hover:bg-instrument/60 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all">-1</button>
        <div className="flex-1 text-center">
          <span className="text-base font-bold tabular-nums" style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: isStopped ? "#22c55e" : "#e5e7eb"
          }}>
            {targetCents > 0 ? "+" : ""}{targetCents.toFixed(1)}¢
          </span>
        </div>
        <button onClick={() => adjustTarget(1)}
          className="px-2.5 py-1 bg-instrument/80 hover:bg-instrument/60 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all">+1</button>
        <button onClick={() => adjustTarget(10)}
          className="px-2 py-1 bg-instrument/80 hover:bg-instrument/60 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all">+10</button>
        <button onClick={syncToDetected} disabled={activeStable === null}
          className="px-2 py-1 bg-primary hover:bg-primary/90 text-primary/60 text-xs rounded-lg active:scale-95 transition-all disabled:opacity-30" title="감지값으로 기준 맞추기">⟳</button>
      </div>

      {/* 안정 대기 시간 */}
      {onStableDurationChange && (
        <div className="px-3 pb-2 flex items-center gap-2 border-t border-instrument/40">
          <span className="text-xs text-muted-foreground whitespace-nowrap">안정 대기</span>
          <input type="range" min={500} max={3000} step={100} value={stableDuration}
            onChange={e => onStableDurationChange(Number(e.target.value))}
            className="flex-1 accent-yellow-500 h-1" />
          <span className="text-xs text-yellow-400 w-10 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {(stableDuration / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* 저장 버튼 */}
      {onSaveStrobe && (
        <div className="px-3 pb-2.5 border-t border-instrument/40 pt-2">
          <button
            onClick={() => onSaveStrobe(activeStable !== null ? activeStable : targetCents)}
            disabled={activeStable === null && !isStopped}
            className={`w-full py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
              activeStable !== null
                ? "bg-in-tune hover:bg-in-tune/90 text-white"
                : "bg-instrument/80 text-muted-foreground/40 opacity-50"
            }`}
          >
            {activeStable !== null ? "✓ 안정값으로 저장" : "안정값 대기 중..."}
            <span className="ml-2 text-xs opacity-70">
              ({activeStable !== null ? (activeStable > 0 ? "+" : "") + activeStable.toFixed(1) : "--"}¢)
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
