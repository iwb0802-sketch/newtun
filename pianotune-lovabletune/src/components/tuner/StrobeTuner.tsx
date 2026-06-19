/**
 * StrobeTuner.tsx — v3 멀티 원형 휠 스트로브
 *
 * PianoMeter 스타일:
 * - 배음별 독립 원형 휠 (동심원 or 나란히)
 * - 휠 안쪽 부채꼴 패턴이 cents 오차에 비례한 속도로 회전
 * - 맞으면 정지, 높으면 시계방향, 낮으면 반시계
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

// 레인별 색상 (r,g,b)
const LANE_COLORS: [number, number, number][] = [
  [220, 50,  50],   // 1 — 레드
  [230, 140, 30],   // 2 — 오렌지
  [200, 200, 30],   // 3 — 옐로우
  [40,  200, 90],   // 4 — 그린
  [40,  170, 230],  // 5 — 사이언
];

// partial → 레인 수
function getLaneCount(partial: number | null | undefined): number {
  if (!partial || partial <= 1) return 1;
  if (partial === 2) return 2;
  if (partial <= 4) return 3;
  return Math.min(partial, 5);
}

// 부채꼴 수 (휠 안 패턴 밀도)
const SECTOR_COUNT = 24;

interface WheelCanvasProps {
  laneIndex: number;    // 0-based
  cents: number | null; // 현재 cents 오프셋
  targetCents: number;
  isActive: boolean;
  size: number;         // 캔버스 크기 (정사각형)
}

function WheelCanvas({ laneIndex, cents, targetCents, isActive, size }: WheelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);
  const rafRef    = useRef<number | null>(null);

  const [r, g, b] = LANE_COLORS[laneIndex % LANE_COLORS.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const outerR = W / 2 - 4;
    const innerR = outerR * 0.28;

    const offset = cents !== null ? cents - targetCents : null;
    const isStopped = offset !== null && Math.abs(offset) <= 0.8;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // 배경 원
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0e12";
      ctx.fill();

      // 링 테두리
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = isActive && offset !== null
        ? `rgba(${r},${g},${b},0.4)`
        : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!isActive || offset === null) {
        // 비활성: 흐린 패턴
        for (let i = 0; i < SECTOR_COUNT; i++) {
          const startAngle = (i / SECTOR_COUNT) * Math.PI * 2;
          const endAngle   = ((i + 0.45) / SECTOR_COUNT) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, outerR - 2, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
          ctx.fill();
        }
      } else {
        // 속도: cents 오프셋에 비례, 배음 차수(laneIndex+1)에 비례해 빠름
        const speedMultiplier = laneIndex + 1;
        const speed = (offset / 50) * 0.04 * speedMultiplier;
        angleRef.current += speed;

        const absOff = Math.abs(offset);
        const brightness = isStopped ? 1.0 : Math.min(1, 0.45 + (absOff / 15) * 0.55);
        const alpha = isStopped ? 0.95 : Math.min(0.9, 0.35 + (absOff / 20) * 0.55);

        for (let i = 0; i < SECTOR_COUNT; i++) {
          const baseAngle = (i / SECTOR_COUNT) * Math.PI * 2 + angleRef.current;
          const endAngle  = baseAngle + (Math.PI * 2 / SECTOR_COUNT) * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, outerR - 2, baseAngle, endAngle);
          ctx.closePath();

          const rc = Math.round(r * brightness);
          const gc = Math.round(g * brightness);
          const bc = Math.round(b * brightness);
          ctx.fillStyle = `rgba(${rc},${gc},${bc},${alpha})`;
          ctx.fill();
        }

        // 멈춤 글로우 링
        if (isStopped) {
          const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
          grad.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0.35)`);
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      // 중앙 빈 원 (클리어)
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0e12";
      ctx.fill();

      // 중앙 배음 번호
      ctx.fillStyle = isStopped
        ? `rgb(${r},${g},${b})`
        : `rgba(${r},${g},${b},0.6)`;
      ctx.font = `bold ${Math.round(innerR * 0.9)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${laneIndex + 1}`, cx, cy);

      // 중앙 점 (멈춤)
      if (isStopped) {
        ctx.beginPath();
        ctx.arc(cx, cy - innerR * 0.5, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, cents, targetCents, laneIndex, size, r, g, b]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block"
      style={{ imageRendering: "auto" }}
    />
  );
}

export default function StrobeTuner({
  detectedCents, stableCents, isCapturing, isActive,
  onSaveStrobe, stableDuration = 1200, onStableDurationChange,
  currentNote, currentKeyIndex, partial, analysisFreq,
}: StrobeTunerProps) {
  const [targetCents, setTargetCents] = useState(0);

  const activeStable = stableCents ?? detectedCents;
  const laneCount    = getLaneCount(partial);
  const offset       = activeStable !== null ? activeStable - targetCents : null;
  const isStopped    = offset !== null && Math.abs(offset) <= 0.8;

  // 휠 크기: 레인 수에 따라 조정
  const wheelSize = laneCount === 1 ? 160 : laneCount === 2 ? 130 : laneCount <= 3 ? 110 : 90;

  const adjustTarget = (delta: number) =>
    setTargetCents(prev => Math.round((prev + delta) * 10) / 10);

  const syncToDetected = () => {
    if (activeStable !== null) setTargetCents(Math.round(activeStable * 10) / 10);
  };

  return (
    <div className="bg-instrument rounded-xl overflow-hidden border border-instrument/60">

      {/* 헤더 */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-instrument/40">
        <div className="flex items-center gap-2">
          {currentNote && (
            <span className="text-sm font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {currentNote}
              {currentKeyIndex !== null && currentKeyIndex !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">건반{currentKeyIndex + 1}</span>
              )}
            </span>
          )}
          {partial && partial > 1 && analysisFreq && (
            <span className="text-[10px] text-yellow-400 font-mono">
              ×{partial} {analysisFreq.toFixed(0)}Hz
            </span>
          )}
        </div>
        <span className="text-xs font-medium" style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: isCapturing ? "#f59e0b"
            : isStopped ? "#22c55e"
            : offset === null ? "#4b5563"
            : offset > 0 ? "#f97316" : "#60a5fa"
        }}>
          {!isActive        ? "대기 중"
            : isCapturing   ? "● 수집 중"
            : offset === null ? "무음"
            : isStopped     ? "● 영점"
            : offset > 0    ? "▶ 높음" : "◄ 낮음"}
        </span>
      </div>

      {/* 멀티 원형 휠 */}
      <div className="flex items-center justify-center gap-3 py-4 px-3 flex-wrap">
        {Array.from({ length: laneCount }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <WheelCanvas
              laneIndex={i}
              cents={activeStable}
              targetCents={targetCents}
              isActive={isActive}
              size={wheelSize}
            />
            <span
              className="text-[9px] opacity-50"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: `rgb(${LANE_COLORS[i][0]},${LANE_COLORS[i][1]},${LANE_COLORS[i][2]})` }}
            >
              {i + 1}f
            </span>
          </div>
        ))}
      </div>

      {/* cents 표시 */}
      <div className="px-3 pb-2 text-center">
        <span className="text-lg font-bold tabular-nums" style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: isStopped ? "#22c55e"
            : offset === null ? "#4b5563"
            : offset > 0 ? "#f97316" : "#60a5fa"
        }}>
          {activeStable !== null
            ? `${activeStable > 0 ? "+" : ""}${activeStable.toFixed(1)}¢`
            : "--"}
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
          className="px-2 py-1 bg-primary hover:bg-primary/90 text-white text-xs rounded-lg active:scale-95 transition-all disabled:opacity-30" title="감지값으로 기준 맞추기">⟳</button>
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
            disabled={activeStable === null}
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
