/**
 * StrobeBar.tsx — PT-100 스타일 LED 스트로브 바
 *
 * 야마하 PT-100 튜닝스코프 참고:
 * - 어두운 패널 위 가로 LED 세그먼트 바
 * - 세그먼트 패턴이 흐르듯 좌/우로 이동 (cents 오차 ∝ 이동 속도)
 * - 편차가 0에 가까워지면 패턴이 멈춤 (정지 = 정확)
 * - 하단에 LCD 스타일 텍스트 리드아웃 (OCT-NOTE / KEY / CENT)
 */

import { useEffect, useRef } from "react";

interface StrobeBarProps {
  detectedCents: number | null;
  stableCents: number | null;
  isCapturing: boolean;
  isActive: boolean;
  currentNote?: string | null;
  currentKeyIndex?: number | null;
  partial?: number | null;
  analysisFreq?: number | null;
}

// LED 색상 (PT-100 마젠타/핑크 인광색)
const LED_ON = "#ec4899";
const LED_ON_GLOW = "rgba(236,72,153,0.55)";
const LED_DIM = "rgba(236,72,153,0.10)";
const LED_LOCK = "#34d399"; // 정확(in-tune) 시 에메랄드로 전환

const SEG_W = 6;      // 세그먼트 폭 (px)
const SEG_GAP = 3;    // 세그먼트 간격 (px)
const PATTERN_LEN = 4; // 패턴 주기 내 세그먼트 개수 (on-on-off-off 반복)
const LIT_COUNT = 2;   // 주기 내 켜지는 세그먼트 수
const SPEED_PX_PER_CENT = 3.2; // cents당 초당 이동 픽셀
const LOCK_THRESHOLD = 1.5;    // 이 이내면 정지(고정)로 간주

export default function StrobeBar({
  detectedCents, stableCents, isCapturing, isActive,
  currentNote, currentKeyIndex, partial, analysisFreq,
}: StrobeBarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const centsRef = useRef<number | null>(null);

  useEffect(() => {
    centsRef.current = stableCents ?? detectedCents;
  }, [stableCents, detectedCents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1);
      lastTsRef.current = ts;

      const cents = isActive ? centsRef.current : null;
      const locked = cents !== null && Math.abs(cents) <= LOCK_THRESHOLD;

      // 이동 속도: cents가 클수록 빠르게, lock 범위면 정지
      const speed = cents !== null && !locked ? cents * SPEED_PX_PER_CENT : 0;
      phaseRef.current += speed * dt;

      const w = canvas.width;
      const h = canvas.height;
      const scale = dpr;

      // 배경
      ctx.fillStyle = "#0a0a0d";
      ctx.fillRect(0, 0, w, h);

      // 중앙 기준선 (희미하게)
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      const segFull = (SEG_W + SEG_GAP) * scale;
      const litColor = locked && cents !== null ? LED_LOCK : LED_ON;
      const glowColor = locked && cents !== null
        ? "rgba(52,211,153,0.55)"
        : LED_ON_GLOW;

      const segCount = Math.ceil(w / segFull) + PATTERN_LEN;
      const offsetSeg = (phaseRef.current * scale) / segFull;

      const barTop = h * 0.22;
      const barH = h * 0.56;

      for (let i = -PATTERN_LEN; i < segCount; i++) {
        const segIndexFloat = i - offsetSeg;
        const segIndex = Math.floor(segIndexFloat);
        const mod = (((segIndex % PATTERN_LEN) + PATTERN_LEN) % PATTERN_LEN);
        const lit = mod < LIT_COUNT;
        const x = (i) * segFull - ((offsetSeg % 1) * segFull) - segFull;

        if (x > w || x + SEG_W * scale < 0) continue;

        if (lit || !isActive) {
          ctx.fillStyle = !isActive ? LED_DIM : lit ? litColor : LED_DIM;
          if (isActive && lit) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8 * scale;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fillRect(x, barTop, SEG_W * scale, barH);
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = LED_DIM;
          ctx.fillRect(x, barTop, SEG_W * scale, barH);
        }
      }
      ctx.shadowBlur = 0;

      // 정지(lock) 시 상/하단 얇은 강조선
      if (isActive && locked && cents !== null) {
        ctx.fillStyle = LED_LOCK;
        ctx.fillRect(0, 0, w, 2 * scale);
        ctx.fillRect(0, h - 2 * scale, w, 2 * scale);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      lastTsRef.current = null;
    };
  }, [isActive]);

  const cents = stableCents ?? detectedCents;
  const locked = isActive && cents !== null && Math.abs(cents) <= LOCK_THRESHOLD;

  return (
    <div className="px-4 py-3">
      <div className="rounded-lg overflow-hidden border border-instrument-muted/40 bg-instrument shadow-inner">
        {/* 상단 정보 바 */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[10px] font-semibold text-instrument-muted uppercase tracking-wider">
            Strobe
          </span>
          <div className="flex items-center gap-2">
            {isCapturing && (
              <span className="text-[10px] font-bold text-warn animate-pulse">COLLECTING</span>
            )}
            {locked && !isCapturing && (
              <span className="text-[10px] font-bold text-in-tune">LOCKED</span>
            )}
            {partial && partial > 1 && analysisFreq && (
              <span className="text-[10px] text-instrument-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ×{partial} {analysisFreq.toFixed(0)}Hz
              </span>
            )}
          </div>
        </div>

        {/* LED 스트로브 바 캔버스 */}
        <canvas ref={canvasRef} className="w-full block" style={{ height: 64 }} />

        {/* LCD 스타일 하단 리드아웃 */}
        <div className="grid grid-cols-3 divide-x divide-instrument-muted/30 border-t border-instrument-muted/30">
          <div className="px-3 py-1.5 text-center">
            <div className="text-[9px] text-instrument-muted uppercase tracking-wide">Note</div>
            <div className="text-sm font-bold text-instrument-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {currentNote ?? "—"}
            </div>
          </div>
          <div className="px-3 py-1.5 text-center">
            <div className="text-[9px] text-instrument-muted uppercase tracking-wide">Key</div>
            <div className="text-sm font-bold text-instrument-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {currentKeyIndex !== null && currentKeyIndex !== undefined ? currentKeyIndex + 1 : "—"}
            </div>
          </div>
          <div className="px-3 py-1.5 text-center">
            <div className="text-[9px] text-instrument-muted uppercase tracking-wide">Cent</div>
            <div className={`text-sm font-bold ${locked ? "text-in-tune" : "text-instrument-foreground"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {cents !== null ? `${cents > 0 ? "+" : ""}${cents.toFixed(1)}` : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
