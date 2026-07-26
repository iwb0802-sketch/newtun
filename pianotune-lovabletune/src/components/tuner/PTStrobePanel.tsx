/**
 * PTStrobePanel.tsx — Yamaha PT-100/PT-A1 화면 참고 재현
 *
 * - 상단: 연속된 단일 LED 스트로브 바 (세그먼트 흐름/정지)
 * - 하단: 5열 LCD 리드아웃 (OCT-NOTE / KEY No. / CENT / CURVE / PITCH)
 */

import { useEffect, useRef } from "react";

interface PTStrobePanelProps {
  detectedCents: number | null;
  stableCents: number | null;
  isActive: boolean;
  noteName: string | null;   // "A"
  octave: number | null;     // 5
  keyNumber: number | null;  // 1~88
  curveLabel?: string;       // "FLAT" 등
  pitchA4?: number;          // 440
}

const LOCK_THRESHOLD = 1.5;
const SEG_W = 5;
const SEG_GAP = 2;
const PATTERN_LEN = 4;
const LIT_COUNT = 2;
const SPEED_PX_PER_CENT = 3.2;

export default function PTStrobePanel({
  detectedCents, stableCents, isActive,
  noteName, octave, keyNumber, curveLabel = "FLAT", pitchA4 = 440,
}: PTStrobePanelProps) {
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
      const speed = cents !== null && !locked ? cents * SPEED_PX_PER_CENT : 0;
      phaseRef.current += speed * dt;

      const w = canvas.width, h = canvas.height, scale = dpr;

      // 배경 (검정)
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      const segFull = (SEG_W + SEG_GAP) * scale;
      const litColor = locked ? "#22d36b" : "#ff2d2d";
      const glowColor = locked ? "rgba(34,211,107,0.6)" : "rgba(255,45,45,0.6)";
      const segCount = Math.ceil(w / segFull) + PATTERN_LEN;
      const offsetSeg = (phaseRef.current * scale) / segFull;

      for (let i = -PATTERN_LEN; i < segCount; i++) {
        const segIndex = Math.floor(i - offsetSeg);
        const mod = (((segIndex % PATTERN_LEN) + PATTERN_LEN) % PATTERN_LEN);
        const lit = mod < LIT_COUNT;
        const x = i * segFull - ((offsetSeg % 1) * segFull) - segFull;
        if (x > w || x + SEG_W * scale < 0) continue;

        if (!isActive) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,45,45,0.08)";
        } else if (lit) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 7 * scale;
          ctx.fillStyle = litColor;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,45,45,0.08)";
        }
        ctx.fillRect(x, h * 0.15, SEG_W * scale, h * 0.7);
      }
      ctx.shadowBlur = 0;

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

  const cols = [
    { label: "OCT-NOTE", value: noteName && octave !== null ? `${octave}-${noteName}` : "--" },
    { label: "KEY No.", value: keyNumber !== null ? String(keyNumber) : "--" },
    { label: "CENT", value: cents !== null ? String(Math.round(cents)).padStart(3, "0").replace("-0", "-") : "000" },
    { label: "CURVE", value: curveLabel },
    { label: "PITCH", value: String(pitchA4) },
  ];

  return (
    <div className="rounded-xl overflow-hidden border border-black/50 shadow-[0_4px_14px_rgba(0,0,0,0.4)] bg-[#111]">
      {/* 스트로브 바 */}
      <canvas ref={canvasRef} className="w-full block" style={{ height: 54 }} />
      {/* LCD 리드아웃 5열 */}
      <div className="grid grid-cols-5 divide-x divide-black/40" style={{ background: "linear-gradient(180deg,#aab8a4,#8fa189)" }}>
        {cols.map(c => (
          <div key={c.label} className="px-1.5 py-1.5 text-center">
            <div className="text-[8px] font-bold text-black/50 uppercase tracking-tight leading-tight">{c.label}</div>
            <div
              className={cn(locked && c.label === "CENT" ? "text-emerald-800" : "text-black/85")}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}
