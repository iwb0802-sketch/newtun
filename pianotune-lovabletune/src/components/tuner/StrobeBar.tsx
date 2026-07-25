/**
 * StrobeBar.tsx — PT-100 튜닝스코프 실물 참고 리메이크 (v2)
 *
 * 참고 사진 특징:
 * - 어두운 플라스틱 베젤 + 유리 패널 안에 2개의 독립 LED 스트로브 윈도우
 * - 각 윈도우는 연속된 LED 블록(라이트 바)이 켜져 있고, 편차에 비례해 블록이
 *   좌우로 스텝식으로 이동(칩처럼 딱딱 끊기며 흐름) — 정확하면 정지
 * - 우측 끝에 작은 상태 LED (CHARGE 자리 → 여기선 SIGNAL 표시로 재활용)
 * - 하단은 그레이-그린 LCD 패널: OCT / NOTE / KEY / CENT 4열 리드아웃
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

const LOCK_THRESHOLD = 1.5;     // 이 이내면 정지(고정)로 간주
const WINDOW_SEG_COUNT = 16;    // 윈도우 내 세그먼트 슬롯 수
const LIT_BLOCK_SIZE = 8;       // 켜지는 연속 세그먼트 수
const STEP_PER_SEC_PER_CENT = 0.9; // cents당 초당 스텝 이동량

// 노트명에서 옥타브/음이름 분리
function splitNote(note: string | null | undefined): { name: string; octave: string } {
  if (!note) return { name: "—", octave: "—" };
  const m = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return { name: note, octave: "—" };
  return { name: m[1], octave: m[2] };
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  phase: number, locked: boolean, isActive: boolean, scale: number,
) {
  const segGap = 2 * scale;
  const segW = (w - segGap * (WINDOW_SEG_COUNT - 1)) / WINDOW_SEG_COUNT;

  // 스텝 단위로 끊기게 (real LED chasing 느낌)
  const blockStart = isActive ? Math.floor(phase) % WINDOW_SEG_COUNT : 0;
  const normStart = ((blockStart % WINDOW_SEG_COUNT) + WINDOW_SEG_COUNT) % WINDOW_SEG_COUNT;

  const onColor = locked ? "#4ade80" : "#f43f8f";
  const glowColor = locked ? "rgba(74,222,128,0.75)" : "rgba(244,63,143,0.75)";

  for (let i = 0; i < WINDOW_SEG_COUNT; i++) {
    const sx = x + i * (segW + segGap);
    // 슬롯 i가 lit 블록 범위(wrap-around 포함) 안에 있는지
    let rel = i - normStart;
    if (rel < 0) rel += WINDOW_SEG_COUNT;
    const lit = isActive && rel < LIT_BLOCK_SIZE;

    ctx.save();
    if (lit) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 6 * scale;
      ctx.fillStyle = onColor;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(120,20,50,0.22)";
    }
    const r = Math.min(segW, h) * 0.18;
    roundRect(ctx, sx, y, segW, h, r);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function StrobeBar({
  detectedCents, stableCents, isCapturing, isActive,
  currentNote, currentKeyIndex, partial, analysisFreq,
}: StrobeBarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phase1Ref = useRef(0);
  const phase2Ref = useRef(0);
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

      const stepSpeed = cents !== null && !locked ? cents * STEP_PER_SEC_PER_CENT : 0;
      phase1Ref.current += stepSpeed * dt;
      // 2번째 윈도우(2배음 검증) — 편차가 2배로 반영되어 더 빠르게 흐름 (물리적으로 정확)
      phase2Ref.current += stepSpeed * 2 * dt;

      const w = canvas.width;
      const h = canvas.height;
      const scale = dpr;

      // ── 베젤 배경 (어두운 플라스틱) ──
      const bezelGrad = ctx.createLinearGradient(0, 0, 0, h);
      bezelGrad.addColorStop(0, "#2a2a30");
      bezelGrad.addColorStop(1, "#15151a");
      ctx.fillStyle = bezelGrad;
      ctx.fillRect(0, 0, w, h);

      // ── 유리 패널 (스트로브 창) ──
      const panelX = 4 * scale, panelY = 4 * scale;
      const panelW = w - panelX * 2, panelH = h - panelY * 2;
      ctx.fillStyle = "#050507";
      roundRect(ctx, panelX, panelY, panelW, panelH, 4 * scale);
      ctx.fill();

      // 윈도우 배치: 좌(45%) / 갭 / 우(35%) / 상태 LED
      const padX = 10 * scale;
      const gapBetween = 18 * scale;
      const sigW = 10 * scale;
      const availW = panelW - padX * 2 - gapBetween - sigW - 10 * scale;
      const win1W = availW * 0.56;
      const win2W = availW * 0.44;
      const winH = panelH * 0.5;
      const winY = panelY + panelH * 0.14;

      const win1X = panelX + padX;
      const win2X = win1X + win1W + gapBetween;
      const sigX = win2X + win2W + 14 * scale;

      drawWindow(ctx, win1X, winY, win1W, winH, phase1Ref.current, locked, isActive, scale);
      drawWindow(ctx, win2X, winY, win2W, winH, phase2Ref.current, locked, isActive, scale);

      // 상태 LED (신호 감지 표시)
      const sigOn = isActive && cents !== null;
      ctx.save();
      ctx.shadowColor = sigOn ? "rgba(74,222,128,0.9)" : "transparent";
      ctx.shadowBlur = sigOn ? 6 * scale : 0;
      ctx.fillStyle = sigOn ? "#4ade80" : "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(sigX + sigW / 2, winY + winH / 2, sigW / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 중앙 정렬 기준선 (희미한 세로선, 각 윈도우 중앙)
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1 * scale;
      [win1X + win1W / 2, win2X + win2W / 2].forEach(cx => {
        ctx.beginPath();
        ctx.moveTo(cx, winY - 3 * scale);
        ctx.lineTo(cx, winY + winH + 3 * scale);
        ctx.stroke();
      });

      // 락 시 좌/우 라인 강조
      if (isActive && locked && cents !== null) {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(panelX, panelY, panelW, 2 * scale);
        ctx.fillRect(panelX, panelY + panelH - 2 * scale, panelW, 2 * scale);
      }

      // 유리 반사 (대각선 하이라이트)
      const glare = ctx.createLinearGradient(panelX, panelY, panelX + panelW * 0.5, panelY + panelH);
      glare.addColorStop(0, "rgba(255,255,255,0.05)");
      glare.addColorStop(0.4, "rgba(255,255,255,0.0)");
      ctx.fillStyle = glare;
      roundRect(ctx, panelX, panelY, panelW, panelH, 4 * scale);
      ctx.fill();

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
  const { name: noteName, octave } = splitNote(currentNote);

  return (
    <div className="px-4 py-3">
      <div className="rounded-xl overflow-hidden border border-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.35)]">
        {/* 상단 라벨 바 */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1 bg-gradient-to-b from-[#2a2a30] to-[#1c1c22]">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Strobe Scope
          </span>
          <div className="flex items-center gap-2">
            {isCapturing && (
              <span className="text-[10px] font-bold text-warn animate-pulse">COLLECTING</span>
            )}
            {locked && !isCapturing && (
              <span className="text-[10px] font-bold text-in-tune">LOCKED</span>
            )}
            {partial && partial > 1 && analysisFreq && (
              <span className="text-[10px] text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ×{partial} {analysisFreq.toFixed(0)}Hz
              </span>
            )}
          </div>
        </div>

        {/* LED 스트로브 캔버스 (베젤+유리+2윈도우) */}
        <canvas ref={canvasRef} className="w-full block" style={{ height: 72 }} />

        {/* LCD 스타일 하단 리드아웃 */}
        <div
          className="grid grid-cols-4 border-t-2 border-black/50"
          style={{ background: "linear-gradient(180deg,#aab8a4,#96a591)" }}
        >
          {[
            { label: "OCT", value: octave },
            { label: "NOTE", value: noteName },
            { label: "KEY", value: currentKeyIndex !== null && currentKeyIndex !== undefined ? String(currentKeyIndex + 1) : "—" },
            { label: "CENT", value: cents !== null ? `${cents > 0 ? "+" : ""}${cents.toFixed(1)}` : "—" },
          ].map((col, i) => (
            <div key={col.label} className={cn3("px-2 py-1.5 text-center", i > 0 && "border-l border-black/15")}>
              <div className="text-[8px] font-bold text-black/45 uppercase tracking-wide">{col.label}</div>
              <div
                className={cn3("text-base font-bold leading-tight", locked && col.label === "CENT" ? "text-emerald-800" : "text-black/80")}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {col.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 로컬 최소 classnames 헬퍼 (다른 곳 cn과 충돌 방지용 별칭)
function cn3(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}
