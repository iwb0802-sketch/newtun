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
  /** LCD의 CENT 칸에 표시할 값 (영점 방식용) — 없으면 detectedCents/stableCents 사용 */
  readoutCents?: number | null;
}

const LOCK_THRESHOLD = 0.5; // 반올림해서 0으로 보일 때만 LOCKED(초록)
const SEG_W = 3;
const SEG_GAP = 2;
const SPEED_PX_PER_CENT = 2.4;
// 오리지널 PT-100처럼 화면 전체를 채우는 줄무늬가 아니라, 폭이 넓은 덩어리 몇 개가
// 사이사이 빈 공간을 두고 늘어서 있는 형태 (각 덩어리 내부는 가는 선들이 촘촘히 흐름)
const NUM_CLUSTERS = 5;
const CLUSTER_WIDTH_FRAC = 0.15; // 바 전체 폭 대비 덩어리 하나의 폭 비율 (길게)

export default function PTStrobePanel({
  detectedCents, stableCents, isActive,
  noteName, octave, keyNumber, curveLabel = "FLAT", pitchA4 = 440,
  readoutCents,
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
      // 음이 떨어짐(flat, 음수) = 빨강 / 음이 높음(sharp, 양수) = 회색 / 정확(LOCKED) = 초록
      const isFlat = cents !== null && cents < 0;
      const litColor = locked ? "#22d36b" : isFlat ? "#ff2d2d" : "#9ca3af";
      const glowColor = locked ? "rgba(34,211,107,0.6)" : isFlat ? "rgba(255,45,45,0.6)" : "rgba(156,163,175,0.6)";

      // 오리지널 PT-100처럼: 폭이 넓은 덩어리 5개가 사이 여백을 두고 늘어서 있고,
      // 그 안에서 가는 선들이 촘촘히 좌우로 흐름 (전체를 꽉 채우는 줄무늬가 아님)
      const clusterW = w * CLUSTER_WIDTH_FRAC;
      const totalClusterW = clusterW * NUM_CLUSTERS;
      const totalGap = w - totalClusterW;
      const marginGap = totalGap / (NUM_CLUSTERS + 1);
      const clusterRanges: Array<[number, number]> = [];
      for (let c = 0; c < NUM_CLUSTERS; c++) {
        const start = marginGap * (c + 1) + clusterW * c;
        clusterRanges.push([start, start + clusterW]);
      }
      const isInsideCluster = (x: number) => clusterRanges.some(([lo, hi]) => x >= lo && x < hi);

      const segCount = Math.ceil(w / segFull) + 4;
      const offsetSeg = (phaseRef.current * scale) / segFull;

      for (let i = -4; i < segCount; i++) {
        const x = i * segFull - ((offsetSeg % 1) * segFull) - segFull;
        if (x > w || x + SEG_W * scale < 0) continue;
        if (!isInsideCluster(x)) continue; // 덩어리 사이 여백 구간은 그리지 않음

        if (!isActive || cents === null) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(140,140,140,0.20)";
        } else {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 7 * scale;
          ctx.fillStyle = litColor;
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

  // 스트로브 정지 판정용 (내부 애니메이션은 detectedCents/stableCents로 계속 구동)
  const strobeCentsForLock = stableCents ?? detectedCents;
  const locked = isActive && strobeCentsForLock !== null && Math.abs(strobeCentsForLock) <= LOCK_THRESHOLD;

  // LCD CENT 칸: readoutCents가 주어지면 그걸 우선 표시 (영점 방식용, 내가 맞춘 오프셋값)
  const centDisplay = readoutCents !== undefined ? readoutCents : strobeCentsForLock;

  const cols = [
    { label: "OCT-NOTE", value: noteName && octave !== null ? `${octave}-${noteName}` : "--" },
    { label: "KEY No.", value: keyNumber !== null ? String(keyNumber) : "--" },
    { label: "CENT", value: centDisplay !== null ? (centDisplay > 0 ? "+" : "") + String(Math.round(centDisplay)).padStart(centDisplay < 0 ? 3 : 2, "0") : "000" },
    { label: "CURVE", value: curveLabel },
    { label: "PITCH", value: String(pitchA4) },
  ];

  return (
    <div className="bg-[#111]">
      {/* 스트로브 바 */}
      <canvas ref={canvasRef} className="w-full block" style={{ height: 64 }} />
      {/* LCD 리드아웃 5열 */}
      <div className="grid grid-cols-5 divide-x divide-black/50 border-t border-black/50" style={{ background: "linear-gradient(180deg,#9aac93,#7f9279)" }}>
        {cols.map(c => (
          <div key={c.label} className="px-1 py-1.5 text-center">
            <div className="text-[8px] font-bold text-black/55 uppercase tracking-tight leading-tight">{c.label}</div>
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
