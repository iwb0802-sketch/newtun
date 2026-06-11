import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useTuningSession, e as exportToPdf, d as exportToImage, a as usePitchDetector, b as useWakeLock, P as PIANO_KEYS, c as cn, T as TuningCurveChart, h as getRMS, i as applyHannWindow, j as detectPitchYIN, k as correctOctaveByHPS, l as freqToCentOffset, m as median, L as LOWER_ABS, U as UPPER_ABS, t as targetPartial } from "./exportPdf-Ds8AMxE0.mjs";
import { s as supabase } from "./client-hcg47f97.mjs";
import { R as Root, P as Portal, C as Content, a as Close, T as Title, D as Description, O as Overlay } from "../_libs/radix-ui__react-dialog.mjs";
import { c as cva } from "../_libs/class-variance-authority.mjs";
import { S as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { t as toast$1 } from "../_libs/sonner.mjs";
import { L as LoaderCircle, R as RefreshCw, X } from "../_libs/lucide-react.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/isbot.mjs";
const GROUP_SIZE = 3;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const GROUP_GAP = 18;
const GROUP_COUNT = 6;
const GROUP_W = GROUP_SIZE * (BAR_WIDTH + BAR_GAP) + GROUP_GAP;
function StrobeTuner({ detectedCents, stableCents, isCapturing, isActive, onSaveStrobe, stableDuration = 1200, onStableDurationChange, currentNote, currentKeyIndex, partial, analysisFreq }) {
  const canvasRef = reactExports.useRef(null);
  const offsetRef = reactExports.useRef(0);
  const rafRef = reactExports.useRef(null);
  const [targetCents, setTargetCents] = reactExports.useState(0);
  const activeStable = stableCents ?? detectedCents;
  const strobeOffset = activeStable !== null ? activeStable - targetCents : null;
  const isStopped = strobeOffset !== null && Math.abs(strobeOffset) <= 0.8;
  const adjustTarget = (delta) => {
    setTargetCents((prev) => Math.round((prev + delta) * 10) / 10);
  };
  const syncToDetected = () => {
    if (activeStable !== null) {
      setTargetCents(Math.round(activeStable * 10) / 10);
    }
  };
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const TOTAL_W = GROUP_COUNT * GROUP_W;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, W, H);
      if (!isActive || strobeOffset === null) {
        ctx.fillStyle = "rgba(160, 0, 0, 0.2)";
        for (let g = 0; g < GROUP_COUNT + 1; g++) {
          for (let b = 0; b < GROUP_SIZE; b++) {
            const x = g * GROUP_W + b * (BAR_WIDTH + BAR_GAP);
            ctx.fillRect(x, 4, BAR_WIDTH, H - 8);
          }
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      const speed = strobeOffset / 50 * 5;
      offsetRef.current = ((offsetRef.current + speed) % TOTAL_W + TOTAL_W) % TOTAL_W;
      const absOff = Math.abs(strobeOffset);
      const brightness = isStopped ? 1 : Math.min(1, 0.45 + absOff / 12 * 0.55);
      const r = Math.round(235 * brightness);
      const gv = Math.round(20 * brightness);
      const bv = Math.round(20 * brightness);
      ctx.fillStyle = `rgb(${r},${gv},${bv})`;
      for (let gi = -1; gi < GROUP_COUNT + 2; gi++) {
        const groupX = (gi * GROUP_W + offsetRef.current) % TOTAL_W;
        for (let bi = 0; bi < GROUP_SIZE; bi++) {
          const x = groupX + bi * (BAR_WIDTH + BAR_GAP);
          if (x > -BAR_WIDTH && x < W + BAR_WIDTH) {
            ctx.fillRect(x, 3, BAR_WIDTH, H - 6);
          }
        }
      }
      if (isStopped) {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "rgba(0,255,80,0)");
        grad.addColorStop(0.5, "rgba(0,255,80,0.15)");
        grad.addColorStop(1, "rgba(0,255,80,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, strobeOffset, isStopped]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-instrument rounded-xl overflow-hidden border border-instrument/60", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "canvas",
      {
        ref: canvasRef,
        width: 360,
        height: 48,
        className: "w-full block",
        style: { imageRendering: "pixelated" }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1.5 flex items-center justify-between border-b border-instrument/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        currentNote && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-bold text-white", style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
          currentNote,
          currentKeyIndex !== null && currentKeyIndex !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground ml-1", children: [
            "건반",
            currentKeyIndex + 1
          ] }),
          partial && partial > 1 && analysisFreq && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-yellow-400 ml-1.5 font-mono", children: [
            "×",
            partial,
            "배음 ",
            analysisFreq.toFixed(0),
            "Hz"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium", style: {
          fontFamily: "'JetBrains Mono', monospace",
          color: isCapturing ? "#f59e0b" : isStopped ? "#22c55e" : strobeOffset === null ? "#4b5563" : strobeOffset > 0 ? "#f97316" : "#60a5fa"
        }, children: !isActive ? "대기 중" : isCapturing ? "● 수집 중" : strobeOffset === null ? "무음" : isStopped ? "● 영점" : strobeOffset > 0 ? "▶ 높음" : "◄ 낙음" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", style: { fontFamily: "'JetBrains Mono', monospace" }, children: activeStable !== null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "안정: ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-yellow-400", children: [
          activeStable > 0 ? "+" : "",
          activeStable.toFixed(1),
          "¢"
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "대기 중" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2.5 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground mr-1", children: "기준" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => adjustTarget(-10),
          className: "px-2 py-1 bg-instrument/80 hover:bg-instrument/70 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all",
          children: "-10"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => adjustTarget(-1),
          className: "px-2.5 py-1 bg-instrument/80 hover:bg-instrument/70 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all",
          children: "-1"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-base font-bold tabular-nums", style: {
        fontFamily: "'JetBrains Mono', monospace",
        color: isStopped ? "#22c55e" : "#e5e7eb"
      }, children: [
        targetCents > 0 ? "+" : "",
        targetCents.toFixed(1),
        "¢"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => adjustTarget(1),
          className: "px-2.5 py-1 bg-instrument/80 hover:bg-instrument/70 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all",
          children: "+1"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => adjustTarget(10),
          className: "px-2 py-1 bg-instrument/80 hover:bg-instrument/70 text-muted-foreground/60 text-xs rounded-lg font-mono active:scale-95 transition-all",
          children: "+10"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: syncToDetected,
          disabled: detectedCents === null,
          className: "px-2 py-1 bg-primary hover:bg-primary/90 text-primary/60 text-xs rounded-lg active:scale-95 transition-all disabled:opacity-30",
          title: "감지값으로 기준 맞추기",
          children: "⟳"
        }
      )
    ] }),
    onStableDurationChange && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 pb-2 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground whitespace-nowrap", children: "안정 대기" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "range",
          min: 500,
          max: 3e3,
          step: 100,
          value: stableDuration,
          onChange: (e) => onStableDurationChange(Number(e.target.value)),
          className: "flex-1 accent-yellow-500 h-1"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-yellow-400 w-10 text-right", style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
        (stableDuration / 1e3).toFixed(1),
        "s"
      ] })
    ] }),
    onSaveStrobe && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 pb-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => onSaveStrobe(activeStable !== null ? activeStable : targetCents),
        disabled: activeStable === null && !isStopped,
        className: `w-full py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${activeStable !== null ? "bg-in-tune hover:bg-in-tune/90 text-white" : "bg-instrument/80 hover:bg-instrument/70 text-muted-foreground/60 opacity-50"}`,
        children: [
          activeStable !== null ? "✓ 안정값으로 저장" : "안정값 대기 중...",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-xs opacity-70", children: [
            "(",
            activeStable !== null ? (activeStable > 0 ? "+" : "") + activeStable.toFixed(1) : "--",
            "¢)"
          ] })
        ]
      }
    ) })
  ] });
}
function PitchMeter({ pitch, isListening, autoSave, onSave, onSkip, onSaveStrobe, stableCents, isCapturing, stableDuration, onStableDurationChange, strobeNote, strobeKeyIndex, strobePartial, strobeAnalysisFreq, fftSize = 4096, onFftSizeChange }) {
  const cents = pitch?.cents ?? 0;
  const BAR_MAX = 50;
  const barPercent = Math.min(Math.abs(cents) / BAR_MAX, 1) * 50;
  const barLeft = cents < 0;
  const getCentsColor = (c) => {
    const abs = Math.abs(c);
    if (abs <= 2) return "text-in-tune";
    if (abs <= 8) return "text-warn";
    return "text-off";
  };
  const getBarColor = (c) => {
    const abs = Math.abs(c);
    if (abs <= 2) return "bg-in-tune";
    if (abs <= 8) return "bg-warn/80";
    return "bg-off";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      StrobeTuner,
      {
        detectedCents: pitch?.cents ?? null,
        stableCents: stableCents ?? null,
        isCapturing: isCapturing ?? false,
        isActive: isListening,
        onSaveStrobe,
        stableDuration,
        onStableDurationChange,
        currentNote: strobeNote ?? null,
        currentKeyIndex: strobeKeyIndex ?? null,
        partial: strobePartial ?? null,
        analysisFreq: strobeAnalysisFreq ?? null
      }
    ) }),
    onFftSizeChange && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5 border border-border/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-foreground/85", children: "저음역 정확도 모드" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/80 mt-0.5", children: fftSize === 8192 ? "⚠️ 저음역 강화 — 처리 속도 느려집니다" : "⚡ 빠름 모드 (1에서 15번 건반 권장)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => onFftSizeChange(fftSize === 4096 ? 8192 : 4096),
          className: cn(
            "relative w-12 h-6 rounded-full transition-colors duration-200",
            fftSize === 8192 ? "bg-warn" : "bg-muted-foreground/30"
          ),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(
            "absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform duration-200",
            fftSize === 8192 ? "translate-x-6" : "translate-x-0.5"
          ) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-5xl font-bold tracking-tight text-foreground",
              style: { fontFamily: "'JetBrains Mono', monospace" },
              children: pitch ? `${pitch.noteName}${pitch.octave}` : "--"
            }
          ),
          pitch && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-muted-foreground/80 ml-1", children: [
            "건반 ",
            pitch.keyIndex + 1
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/80 mt-0.5", style: { fontFamily: "'JetBrains Mono', monospace" }, children: pitch ? `${pitch.frequency.toFixed(2)} Hz` : "-- Hz" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn(
              "text-4xl font-bold tabular-nums",
              pitch ? getCentsColor(pitch.cents) : "text-muted-foreground/60",
              { fontFamily: "'JetBrains Mono', monospace" }
            ),
            style: { fontFamily: "'JetBrains Mono', monospace" },
            children: pitch ? `${pitch.cents > 0 ? "+" : ""}${pitch.cents.toFixed(1)}` : "±0.0"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/80", children: "cent" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/80 w-8 text-right", children: "-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 relative h-5 bg-muted rounded-full overflow-hidden border border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/50 z-10" }),
          pitch && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: cn(
                "absolute top-1 bottom-1 rounded-full transition-all duration-100",
                getBarColor(pitch.cents)
              ),
              style: {
                width: `${barPercent}%`,
                left: barLeft ? `${50 - barPercent}%` : "50%"
              }
            }
          ),
          [-25, 0, 25].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "absolute top-0 bottom-0 w-px bg-muted-foreground/30",
              style: { left: `${50 + v}%` }
            },
            v
          ))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/80 w-8", children: "+50" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/80", children: pitch ? Math.abs(pitch.cents) <= 2 ? "✓ 정확" : Math.abs(pitch.cents) <= 8 ? "△ 약간 벗어남" : "✗ 조율 필요" : isListening ? "소리를 감지 중..." : "마이크를 시작하세요" }) })
    ] }),
    pitch && !autoSave && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onSave,
          className: "flex-1 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-all duration-150 active:scale-[0.97]",
          children: "저장 (Space)"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onSkip,
          className: "px-4 py-2 bg-muted hover:bg-muted text-muted-foreground text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.97]",
          children: "건너뛰기"
        }
      )
    ] }),
    pitch && autoSave && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-2 text-center text-xs text-in-tune bg-in-tune-soft rounded-lg border border-in-tune/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "animate-pulse", children: "● " }),
      "0.8초 후 자동 저장됩니다"
    ] })
  ] });
}
let _ctx = null;
let _unlocked = false;
function getAudioContext() {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _unlocked = false;
  }
  return _ctx;
}
async function unlockAudio() {
  const ctx = getAudioContext();
  if (!_unlocked || ctx.state === "suspended") {
    try {
      await ctx.resume();
      _unlocked = true;
    } catch {
    }
  }
  return ctx;
}
function useReferenceAudio() {
  const [isPlayingRef, setIsPlayingRef] = reactExports.useState(false);
  const [isPlayingBeat, setIsPlayingBeat] = reactExports.useState(false);
  const [currentBeatRate, setCurrentBeatRate] = reactExports.useState(1);
  const oscsRef = reactExports.useRef([]);
  const gainsRef = reactExports.useRef([]);
  const stopAll = reactExports.useCallback(() => {
    const ctx = gainsRef.current.length > 0 ? oscsRef.current[0]?.context : null;
    if (ctx) {
      const now = ctx.currentTime;
      gainsRef.current.forEach((g) => {
        try {
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.linearRampToValueAtTime(0, now + 0.04);
        } catch {
        }
      });
    }
    setTimeout(() => {
      oscsRef.current.forEach((o) => {
        try {
          o.stop();
        } catch {
        }
      });
      oscsRef.current = [];
      gainsRef.current = [];
    }, 50);
    setIsPlayingRef(false);
    setIsPlayingBeat(false);
  }, []);
  const playFreqs = reactExports.useCallback(async (freqs) => {
    oscsRef.current.forEach((o) => {
      try {
        o.stop();
      } catch {
      }
    });
    oscsRef.current = [];
    gainsRef.current = [];
    try {
      const ctx = await unlockAudio();
      const now = ctx.currentTime;
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.015);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        oscsRef.current.push(osc);
        gainsRef.current.push(gain);
      });
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }, []);
  const toggleReferenceNote = reactExports.useCallback(async () => {
    if (isPlayingRef) {
      stopAll();
      return;
    }
    if (isPlayingBeat) stopAll();
    setIsPlayingRef(true);
    setIsPlayingBeat(false);
    await playFreqs([440]);
  }, [isPlayingRef, isPlayingBeat, stopAll, playFreqs]);
  const toggleBeat = reactExports.useCallback(async (rate) => {
    if (isPlayingBeat && currentBeatRate === rate) {
      stopAll();
      return;
    }
    if (isPlayingRef) stopAll();
    setCurrentBeatRate(rate);
    setIsPlayingBeat(true);
    setIsPlayingRef(false);
    await playFreqs([440, 440 + rate]);
  }, [isPlayingBeat, isPlayingRef, currentBeatRate, stopAll, playFreqs]);
  reactExports.useEffect(() => {
    return () => {
      oscsRef.current.forEach((o) => {
        try {
          o.stop();
        } catch {
        }
      });
      oscsRef.current = [];
      gainsRef.current = [];
    };
  }, []);
  return { isPlayingRef, isPlayingBeat, currentBeatRate, toggleReferenceNote, toggleBeat, stopAll };
}
const BEAT_RATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
function ReferenceAudioBar() {
  const {
    isPlayingRef,
    isPlayingBeat,
    currentBeatRate,
    toggleReferenceNote,
    toggleBeat,
    stopAll
  } = useReferenceAudio();
  const [showBeatMenu, setShowBeatMenu] = reactExports.useState(false);
  const beatMenuRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!showBeatMenu) return;
    const handler = (e) => {
      if (beatMenuRef.current && !beatMenuRef.current.contains(e.target)) {
        setShowBeatMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBeatMenu]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border-b border-border px-4 py-2 flex items-center gap-2 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: toggleReferenceNote,
        className: cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] border",
          isPlayingRef ? "bg-warn border-warn text-white" : "bg-muted border-border text-foreground/85 hover:bg-muted"
        ),
        children: isPlayingRef ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex gap-0.5 items-end h-3.5", children: [2, 4, 3, 5, 2].map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "w-0.5 bg-card rounded-full animate-pulse inline-block",
              style: { height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }
            },
            i
          )) }),
          "기준음 재생 중"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) }),
          "기준음"
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref: beatMenuRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setShowBeatMenu((v) => !v),
          className: cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] border",
            isPlayingBeat ? "bg-primary border-primary text-white" : showBeatMenu ? "bg-primary-soft border-primary/40 text-primary" : "bg-muted border-border text-foreground/85 hover:bg-muted"
          ),
          children: [
            isPlayingBeat ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex gap-0.5 items-end h-3.5", children: [2, 4, 3, 5, 2].map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "w-0.5 bg-card rounded-full animate-pulse inline-block",
                  style: { height: `${h * 2}px`, animationDelay: `${i * 0.12}s` }
                },
                i
              )) }),
              "맥놀이 ",
              currentBeatRate,
              "회/초"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "맥놀이" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "svg",
              {
                width: "12",
                height: "12",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                className: cn("transition-transform duration-150", showBeatMenu ? "rotate-180" : ""),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "6 9 12 15 18 9" })
              }
            )
          ]
        }
      ),
      showBeatMenu && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "absolute top-full left-0 mt-1.5 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden",
          style: { minWidth: 200, animation: "dropDown 0.12s ease-out" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
              @keyframes dropDown {
                from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
            ` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 border-b border-border/60 bg-muted/50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-muted-foreground", children: "맥놀이 횟수 선택 (회/초)" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-5 gap-1 p-2", children: BEAT_RATES.map((rate) => {
              const isActive = isPlayingBeat && currentBeatRate === rate;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => {
                    toggleBeat(rate);
                    setShowBeatMenu(false);
                  },
                  className: cn(
                    "flex flex-col items-center py-2.5 rounded-xl text-sm font-bold transition-all duration-100 active:scale-[0.93]",
                    isActive ? "bg-primary text-white" : "bg-muted/50 text-foreground/85 hover:bg-primary-soft hover:text-primary"
                  ),
                  style: { fontFamily: "'JetBrains Mono', monospace" },
                  children: [
                    rate,
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-normal opacity-70 mt-0.5", children: "회/초" })
                  ]
                },
                rate
              );
            }) }),
            isPlayingBeat && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "text-xs text-primary bg-primary-soft rounded-lg py-1.5 text-center border border-primary/20",
                style: { fontFamily: "'JetBrains Mono', monospace" },
                children: [
                  "440Hz + ",
                  440 + currentBeatRate,
                  "Hz · ",
                  currentBeatRate,
                  "회/초"
                ]
              }
            ) }),
            (isPlayingRef || isPlayingBeat) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  stopAll();
                  setShowBeatMenu(false);
                },
                className: "w-full py-2 text-xs text-off bg-off-soft hover:bg-off-soft rounded-xl border border-off/30 font-semibold transition-colors",
                children: "■ 모두 정지"
              }
            ) })
          ]
        }
      )
    ] }),
    (isPlayingRef || isPlayingBeat) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: stopAll,
        className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-off bg-off-soft border border-off/30 rounded-lg hover:bg-off-soft transition-colors",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }) }),
          "정지"
        ]
      }
    )
  ] });
}
function useStrobeDetector(stream, audioContext, stableDurationMs = 800, fftSize = 4096, referenceKeyIndex = null) {
  const [strobeCents, setStrobeCents] = reactExports.useState(null);
  const [isCapturing, setIsCapturing] = reactExports.useState(false);
  const [captureProgress, setCaptureProgress] = reactExports.useState(0);
  const [currentNote, setCurrentNote] = reactExports.useState(null);
  const [currentKeyIndex, setCurrentKeyIndex] = reactExports.useState(null);
  const [analysisFreq, setAnalysisFreq] = reactExports.useState(null);
  const analyserRef = reactExports.useRef(null);
  const sourceRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const bufRef = reactExports.useRef(null);
  const specRef = reactExports.useRef(null);
  const lastKeyRef = reactExports.useRef(null);
  const peakRmsRef = reactExports.useRef(0);
  const captureStartRef = reactExports.useRef(null);
  const captureBufferRef = reactExports.useRef([]);
  const refKeyRef = reactExports.useRef(referenceKeyIndex);
  reactExports.useEffect(() => {
    refKeyRef.current = referenceKeyIndex;
    if (referenceKeyIndex !== null) {
      setAnalysisFreq(PIANO_KEYS[referenceKeyIndex].freq);
    } else {
      setAnalysisFreq(null);
    }
  }, [referenceKeyIndex]);
  const PEAK_RATIO = 0.55;
  const MIN_SAMPLES = 8;
  reactExports.useEffect(() => {
    if (!stream || !audioContext) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        sourceRef.current?.disconnect();
      } catch {
      }
      analyserRef.current = null;
      bufRef.current = null;
      specRef.current = null;
      return;
    }
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0;
    analyserRef.current = analyser;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;
    bufRef.current = new Float32Array(analyser.fftSize);
    specRef.current = new Float32Array(analyser.frequencyBinCount);
    const detect = () => {
      const an = analyserRef.current;
      const buf = bufRef.current;
      const spec = specRef.current;
      if (!an || !buf || !spec) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      an.getFloatTimeDomainData(buf);
      const rms = getRMS(buf);
      if (rms < 3e-3) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      if (rms > peakRmsRef.current * 1.5 && rms > 0.02) {
        peakRmsRef.current = rms;
        captureStartRef.current = null;
        captureBufferRef.current = [];
        setIsCapturing(false);
        setCaptureProgress(0);
        setStrobeCents(null);
      } else if (rms > peakRmsRef.current) {
        peakRmsRef.current = rms;
      }
      const refKey = refKeyRef.current;
      if (refKey === null) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      if (lastKeyRef.current !== null && lastKeyRef.current !== refKey) {
        captureBufferRef.current = [];
        captureStartRef.current = null;
        setStrobeCents(null);
      }
      lastKeyRef.current = refKey;
      setCurrentNote(`${PIANO_KEYS[refKey].noteName}${PIANO_KEYS[refKey].octave}`);
      setCurrentKeyIndex(refKey);
      const isStable = rms < peakRmsRef.current * PEAK_RATIO && peakRmsRef.current > 0.015;
      if (!isStable) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const winBuf = applyHannWindow(buf);
      const fYin = detectPitchYIN(winBuf, audioContext.sampleRate, 26, 5e3, 0.12);
      if (fYin <= 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      an.getFloatFrequencyData(spec);
      const fCorrected = correctOctaveByHPS(fYin, spec, audioContext.sampleRate, an.fftSize, 5);
      const r = freqToCentOffset(fCorrected);
      if (!r) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const targetFreq = PIANO_KEYS[refKey].freq;
      const cent = 1200 * Math.log2(fCorrected / targetFreq);
      if (Math.abs(cent) > 80) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      if (captureStartRef.current === null) {
        captureStartRef.current = Date.now();
        setIsCapturing(true);
      }
      captureBufferRef.current.push(cent);
      const elapsed = Date.now() - captureStartRef.current;
      setCaptureProgress(Math.min(elapsed / stableDurationMs, 1));
      if (elapsed >= stableDurationMs && captureBufferRef.current.length >= MIN_SAMPLES) {
        const med = Math.round(median(captureBufferRef.current) * 10) / 10;
        setStrobeCents(med);
        setIsCapturing(false);
        setCaptureProgress(0);
        captureBufferRef.current = [];
        captureStartRef.current = null;
        peakRmsRef.current = 0;
      }
      rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        source.disconnect();
      } catch {
      }
      analyserRef.current = null;
      bufRef.current = null;
      specRef.current = null;
      peakRmsRef.current = 0;
      captureStartRef.current = null;
      captureBufferRef.current = [];
    };
  }, [stream, audioContext, stableDurationMs, fftSize]);
  return {
    strobeCents,
    isCapturing,
    captureProgress,
    currentNote,
    currentKeyIndex,
    analysisFreq,
    partial: 1
  };
}
const Dialog = Root;
const DialogPortal = Portal;
const DialogOverlay = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = Overlay.displayName;
const DialogContent = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = Title.displayName;
const DialogDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = Description.displayName;
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = reactExports.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const ROLES = ["free", "pro", "admin"];
const ROLE_LABEL = { free: "무료", pro: "Pro", admin: "관리자" };
function roleBadgeVariant(role) {
  if (role === "admin") return "default";
  if (role === "pro") return "secondary";
  return "outline";
}
function AdminPage({ onClose }) {
  const [users, setUsers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [updating, setUpdating] = reactExports.useState(null);
  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_users_with_roles");
    if (data) setUsers(data);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    fetchUsers();
  }, []);
  const updateRole = async (userId, newRole) => {
    setUpdating(userId);
    await supabase.from("user_roles").upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
    setUpdating(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg max-h-[80vh] flex flex-col p-0 gap-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "px-5 pt-5 pb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "관리자 대시보드" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "사용자 권한 관리" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto px-4 pb-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-12 text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-2" }),
      "불러오는 중..."
    ] }) : users.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-12 text-muted-foreground text-sm", children: "등록된 사용자가 없습니다." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: users.map((user) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: user.email || user.user_id }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: roleBadgeVariant(user.role), children: ROLE_LABEL[user.role] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 ml-3", children: ROLES.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              variant: user.role === r ? "default" : "outline",
              onClick: () => updateRole(user.user_id, r),
              disabled: user.role === r || updating === user.user_id,
              className: "text-xs h-7 px-2.5",
              children: ROLE_LABEL[r]
            },
            r
          )) })
        ]
      },
      user.user_id
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogFooter, { className: "px-5 py-3 border-t sm:justify-start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", onClick: fetchUsers, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 mr-1.5" }),
      "새로고침"
    ] }) })
  ] }) });
}
function calcMedian(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function calcConfidence(autoCount, strobeCount, autoMedian, strobeMedian, blendStrobe) {
  let conf = Math.min(autoCount / 3, 1) * 0.6;
  if (autoMedian !== null && strobeMedian !== null && blendStrobe) {
    const diff = Math.abs(autoMedian - strobeMedian);
    if (diff <= 2) conf += 0.4;
    else if (diff <= 5) conf += 0.2;
    else conf += 0.1;
  } else if (strobeCount > 0) conf += 0.1;
  return Math.min(conf, 1);
}
function calcFinal(autoMedian, strobeMedian, autoCount, blendStrobe) {
  if (autoMedian === null) return null;
  if (strobeMedian === null || !blendStrobe) return autoCount >= 3 ? autoMedian : null;
  const autoWeight = Math.min(autoCount / 5, 0.7);
  return Math.round((autoMedian * autoWeight + strobeMedian * (1 - autoWeight)) * 10) / 10;
}
const STORAGE_KEY = "piano_precision_sessions_v1";
const MAX_AUTO = 5;
const MAX_STROBE = 2;
function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveSessions(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
function usePrecisionSession() {
  const [sessions, setSessions] = reactExports.useState(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = reactExports.useState(() => {
    const s = loadSessions();
    return s[0]?.id ?? null;
  });
  const [pendingKeyIndex, setPendingKeyIndex] = reactExports.useState(null);
  const [confirmedAuto, setConfirmedAuto] = reactExports.useState([]);
  const [confirmedStrobe, setConfirmedStrobe] = reactExports.useState([]);
  const [currentLive, setCurrentLive] = reactExports.useState(null);
  const [isRoundActive, setIsRoundActive] = reactExports.useState(false);
  const pendingKeyRef = reactExports.useRef(null);
  const confirmedAutoRef = reactExports.useRef([]);
  const confirmedStrobeRef = reactExports.useRef([]);
  const currentRoundBufferRef = reactExports.useRef([]);
  const isRoundActiveRef = reactExports.useRef(false);
  const activeSessionIdRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const resetPending = reactExports.useCallback(() => {
    pendingKeyRef.current = null;
    confirmedAutoRef.current = [];
    confirmedStrobeRef.current = [];
    currentRoundBufferRef.current = [];
    isRoundActiveRef.current = false;
    setPendingKeyIndex(null);
    setConfirmedAuto([]);
    setConfirmedStrobe([]);
    setCurrentLive(null);
    setIsRoundActive(false);
  }, []);
  const createSession = reactExports.useCallback((name) => {
    const now = Date.now();
    const n = name || `정밀 ${new Date(now).toLocaleDateString("ko-KR")} ${new Date(now).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    const session = { id: now.toString(36) + Math.random().toString(36).slice(2, 6), name: n, createdAt: now, measurements: {} };
    setSessions((prev) => {
      const u = [session, ...prev].slice(0, 10);
      saveSessions(u);
      return u;
    });
    activeSessionIdRef.current = session.id;
    setActiveSessionId(session.id);
    resetPending();
    return session;
  }, [resetPending]);
  const deleteSession = reactExports.useCallback((id) => {
    setSessions((prev) => {
      const u = prev.filter((s) => s.id !== id);
      saveSessions(u);
      return u;
    });
    setActiveSessionId((prev) => prev === id ? null : prev);
  }, []);
  const renameSession = reactExports.useCallback((id, name) => {
    setSessions((prev) => {
      const u = prev.map((s) => s.id === id ? { ...s, name } : s);
      saveSessions(u);
      return u;
    });
  }, []);
  const onPitchActive = reactExports.useCallback((keyIndex, cents) => {
    if (pendingKeyRef.current !== keyIndex) {
      pendingKeyRef.current = keyIndex;
      confirmedAutoRef.current = [];
      confirmedStrobeRef.current = [];
      currentRoundBufferRef.current = [cents];
      isRoundActiveRef.current = true;
      setPendingKeyIndex(keyIndex);
      setConfirmedAuto([]);
      setConfirmedStrobe([]);
      setCurrentLive(Math.round(cents * 10) / 10);
      setIsRoundActive(true);
      return;
    }
    currentRoundBufferRef.current.push(cents);
    isRoundActiveRef.current = true;
    const live = Math.round(calcMedian(currentRoundBufferRef.current) * 10) / 10;
    setCurrentLive(live);
    setIsRoundActive(true);
  }, []);
  const onSilenceDetected = reactExports.useCallback(() => {
    if (!isRoundActiveRef.current) return;
    if (currentRoundBufferRef.current.length === 0) return;
    if (confirmedAutoRef.current.length >= MAX_AUTO) {
      currentRoundBufferRef.current = [];
      isRoundActiveRef.current = false;
      setIsRoundActive(false);
      setCurrentLive(null);
      return;
    }
    const roundVal = Math.round(calcMedian(currentRoundBufferRef.current) * 10) / 10;
    confirmedAutoRef.current = [...confirmedAutoRef.current, roundVal];
    currentRoundBufferRef.current = [];
    isRoundActiveRef.current = false;
    setConfirmedAuto([...confirmedAutoRef.current]);
    setIsRoundActive(false);
    setCurrentLive(null);
  }, []);
  const addStrobeCents = reactExports.useCallback((keyIndex, cents) => {
    if (pendingKeyRef.current !== keyIndex) return;
    if (confirmedStrobeRef.current.length >= MAX_STROBE) return;
    const val = Math.round(cents * 10) / 10;
    confirmedStrobeRef.current = [...confirmedStrobeRef.current, val];
    setConfirmedStrobe([...confirmedStrobeRef.current]);
  }, []);
  const autoMedian = confirmedAuto.length > 0 ? Math.round(calcMedian(confirmedAuto) * 10) / 10 : null;
  const strobeMedian = confirmedStrobe.length >= 2 ? Math.round(calcMedian(confirmedStrobe) * 10) / 10 : confirmedStrobe.length === 1 ? confirmedStrobe[0] : null;
  const blendStrobe = pendingKeyIndex !== null && targetPartial(pendingKeyIndex) === 1;
  const confidence = calcConfidence(confirmedAuto.length, confirmedStrobe.length, autoMedian, strobeMedian, blendStrobe);
  const finalCents = calcFinal(autoMedian, strobeMedian, confirmedAuto.length, blendStrobe);
  const autoStrobeDiff = blendStrobe && autoMedian !== null && strobeMedian !== null ? Math.abs(autoMedian - strobeMedian) : null;
  const needsRecheck = autoStrobeDiff !== null && autoStrobeDiff > 5;
  const canAutoSave = confirmedAuto.length >= 3 && !needsRecheck;
  const canConfirm = canAutoSave;
  const confirmCurrent = reactExports.useCallback((frequency) => {
    const ki = pendingKeyRef.current;
    const sid = activeSessionIdRef.current;
    const auto = confirmedAutoRef.current;
    const strobe = confirmedStrobeRef.current;
    if (!sid || ki === null || auto.length < 3) return;
    const autoMed = auto.length > 0 ? Math.round(calcMedian(auto) * 10) / 10 : null;
    const strobeMed = strobe.length >= 2 ? Math.round(calcMedian(strobe) * 10) / 10 : strobe.length === 1 ? strobe[0] : null;
    const blend = targetPartial(ki) === 1;
    const final = calcFinal(autoMed, strobeMed, auto.length, blend);
    if (final === null) return;
    const conf = calcConfidence(auto.length, strobe.length, autoMed, strobeMed, blend);
    const measurement = {
      keyIndex: ki,
      autoCentsHistory: [...auto],
      autoMedian: autoMed,
      strobeCentsHistory: [...strobe],
      strobeMedian: strobeMed,
      finalCents: final,
      confidence: conf,
      frequency,
      measuredAt: Date.now()
    };
    setSessions((prev) => {
      const u = prev.map((s) => s.id === sid ? { ...s, measurements: { ...s.measurements, [ki]: measurement } } : s);
      saveSessions(u);
      return u;
    });
  }, []);
  const clearAllMeasurements = reactExports.useCallback(() => {
    const sid = activeSessionIdRef.current;
    if (!sid) return;
    setSessions((prev) => {
      const u = prev.map((s) => s.id === sid ? { ...s, measurements: {} } : s);
      saveSessions(u);
      return u;
    });
    resetPending();
  }, [resetPending]);
  const measuredCount = activeSession ? Object.keys(activeSession.measurements).length : 0;
  return {
    sessions,
    setSessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    renameSession,
    pendingKeyIndex,
    confirmedAuto,
    confirmedStrobe,
    currentLive,
    isRoundActive,
    autoMedian,
    strobeMedian,
    confidence,
    finalCents,
    canConfirm,
    canAutoSave,
    needsRecheck,
    autoStrobeDiff,
    MAX_AUTO,
    MAX_STROBE,
    onPitchActive,
    onSilenceDetected,
    addStrobeCents,
    resetPending,
    confirmCurrent,
    clearAllMeasurements,
    measuredCount
  };
}
function isInRange(keyIndex, cents) {
  return cents >= LOWER_ABS[keyIndex] && cents <= UPPER_ABS[keyIndex];
}
function PrecisionResultList({ measurements }) {
  const [expandedKey, setExpandedKey] = reactExports.useState(null);
  const sorted = Object.values(measurements).sort((a, b) => b.measuredAt - a.measuredAt).slice(0, 20);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "최근 확정" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 max-h-64 overflow-y-auto", children: sorted.map((m, idx) => {
      const key = PIANO_KEYS[m.keyIndex];
      const inR = m.finalCents !== null && isInRange(m.keyIndex, m.finalCents);
      const isExpanded = expandedKey === m.keyIndex;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            onClick: () => setExpandedKey(isExpanded ? null : m.keyIndex),
            className: cn(
              "flex items-center justify-between py-1.5 px-2 rounded text-xs cursor-pointer transition-colors",
              idx === 0 ? "bg-precision-soft" : "hover:bg-muted/50"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-foreground/85 font-semibold w-10", style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
                key.noteName,
                key.octave
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground/80", children: [
                "건반 ",
                m.keyIndex + 1
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground/60", children: [
                "자",
                m.autoCentsHistory.length,
                "+스",
                m.strobeCentsHistory.length
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: cn("font-bold tabular-nums", inR ? "text-precision" : "text-off"),
                    style: { fontFamily: "'JetBrains Mono', monospace" },
                    children: m.finalCents !== null ? `${m.finalCents > 0 ? "+" : ""}${m.finalCents.toFixed(1)}¢` : "--"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/60", children: isExpanded ? "▲" : "▼" })
              ] })
            ]
          }
        ),
        isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-2 mb-2 bg-muted/50 rounded-lg p-2 border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          m.autoCentsHistory.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1 text-primary", children: "자동 피치" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-center text-muted-foreground/80", children: [
              i + 1,
              "회"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-right font-mono font-semibold text-foreground/85", children: [
              c > 0 ? "+" : "",
              c.toFixed(1),
              "¢"
            ] })
          ] }, `a${i}`)),
          m.autoMedian !== null && m.autoCentsHistory.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 bg-primary-soft", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1 text-primary font-bold", children: "자동 중앙값" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-center text-primary/70", children: [
              m.autoCentsHistory.length,
              "회"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-right font-mono font-bold text-primary", children: [
              m.autoMedian > 0 ? "+" : "",
              m.autoMedian.toFixed(1),
              "¢"
            ] })
          ] }),
          m.strobeCentsHistory.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1 text-warn", children: "스트로브" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-center text-muted-foreground/80", children: [
              i + 1,
              "회"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-right font-mono font-semibold text-foreground/85", children: [
              c > 0 ? "+" : "",
              c.toFixed(1),
              "¢"
            ] })
          ] }, `s${i}`)),
          m.strobeMedian !== null && m.strobeCentsHistory.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 bg-warn-soft", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1 text-warn font-bold", children: "스트로브 중앙값" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-center text-warn/80", children: [
              m.strobeCentsHistory.length,
              "회"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1 text-right font-mono font-bold text-warn", children: [
              m.strobeMedian > 0 ? "+" : "",
              m.strobeMedian.toFixed(1),
              "¢"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-precision-soft", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 text-precision font-bold", children: "최종값" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1.5 text-center text-precision/65", children: [
              "정확도 ",
              Math.round((m.confidence ?? 0) * 100),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-1.5 text-right font-mono font-bold", style: { color: inR ? "#7c3aed" : "#dc2626" }, children: [
              m.finalCents > 0 ? "+" : "",
              m.finalCents?.toFixed(1),
              "¢"
            ] })
          ] })
        ] }) }) })
      ] }, m.keyIndex);
    }) })
  ] });
}
function PrecisionPage() {
  const session = usePrecisionSession();
  const {
    activeSession,
    activeSessionId,
    createSession,
    measuredCount,
    pendingKeyIndex,
    confirmedAuto,
    confirmedStrobe,
    currentLive,
    isRoundActive,
    autoMedian,
    strobeMedian,
    confidence,
    finalCents,
    canConfirm,
    canAutoSave,
    needsRecheck,
    autoStrobeDiff,
    MAX_AUTO: MAX_AUTO2,
    MAX_STROBE: MAX_STROBE2,
    onPitchActive,
    onSilenceDetected,
    addStrobeCents,
    confirmCurrent,
    clearAllMeasurements
  } = session;
  const [showGuide, setShowGuide] = reactExports.useState(true);
  const [userName, setUserName] = reactExports.useState("");
  const [showSessionList, setShowSessionList] = reactExports.useState(false);
  const silenceTimerRef = reactExports.useRef(null);
  useWakeLock(true);
  const handlePitch = reactExports.useCallback((result) => {
    if (result.confidence < 0.55) return;
    onPitchActive(result.keyIndex, result.cents);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      onSilenceDetected();
    }, 500);
  }, [onPitchActive, onSilenceDetected]);
  const { isListening, currentPitch, startListening, stopListening, error, stream, audioContext } = usePitchDetector(handlePitch);
  const { strobeCents } = useStrobeDetector(
    isListening ? stream : null,
    isListening ? audioContext : null,
    1200,
    4096,
    pendingKeyIndex
    // 자동 피치가 확정한 건반 기준으로 옵타브 보정
  );
  const prevStrobeRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (strobeCents === null) {
      prevStrobeRef.current = null;
      return;
    }
    if (pendingKeyIndex !== null && strobeCents !== prevStrobeRef.current) {
      prevStrobeRef.current = strobeCents;
      addStrobeCents(pendingKeyIndex, strobeCents);
    }
  }, [strobeCents, pendingKeyIndex, addStrobeCents]);
  const lastSavedKeyRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (canAutoSave && finalCents !== null && activeSessionId && pendingKeyIndex !== null && lastSavedKeyRef.current !== pendingKeyIndex) {
      lastSavedKeyRef.current = pendingKeyIndex;
      confirmCurrent(currentPitch?.frequency ?? 0);
    }
    if (pendingKeyIndex === null) lastSavedKeyRef.current = null;
  }, [canAutoSave, finalCents, activeSessionId, pendingKeyIndex]);
  const toggleListening = async () => {
    if (!activeSessionId) createSession();
    if (isListening) stopListening();
    else await startListening();
  };
  const chartData = PIANO_KEYS.map((key, i) => {
    const m = activeSession?.measurements[i];
    return {
      keyNumber: key.keyNumber,
      keyIndex: i,
      noteName: key.noteName,
      octave: key.octave,
      isBlack: key.isBlack,
      cents: m ? m.finalCents : null,
      measured: !!m
    };
  });
  const confidenceColor = confidence >= 0.8 ? "#16a34a" : confidence >= 0.5 ? "#d97706" : "#94a3b8";
  const confidenceLabel = confidence >= 0.8 ? "높음" : confidence >= 0.5 ? "보통" : "낮음";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-muted/50 flex flex-col", style: { fontFamily: "'Noto Sans KR', sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-precision rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2.2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 8v4l3 3" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-bold text-foreground leading-tight", children: "정밀 측정 모드" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground/80", children: "안정 감지 즉시 1회 확정 · 3회+스트로브1회 자동저장" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        measuredCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold text-precision bg-precision-soft px-2 py-1 rounded-lg", children: [
          measuredCount,
          "/88"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setShowGuide((v) => !v),
            className: "w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold",
            children: "?"
          }
        )
      ] })
    ] }),
    showGuide && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-4 mt-3 bg-precision-soft border border-precision/30 rounded-2xl p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-bold text-precision", children: "📌 정밀 측정이란?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowGuide(false), className: "text-precision/65 text-xs", children: "닫기" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-precision space-y-1.5 leading-relaxed", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "왜 사용하나요?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "같은 건반을 여러 번 측정한 값의 중앙값을 사용하면 더 정확한 조율값을 얻을 수 있습니다."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "사용 방법" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "list-decimal list-inside space-y-0.5 pl-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "마이크 시작 버튼을 탭합니다" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            "건반을 칩니다 → 안정 감지 즉시 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "1회 확정" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            "1.5초 후 같은 건반을 다시 칩니다 → ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "2회 확정" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "3회 반복 후 스트로브가 안정되면 자동으로 수집" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "3회 + 스트로브 1회" }),
            " 충족 시 자동 저장"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "최대 5회까지 추가 측정 후 교체 가능" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-precision/75", children: "💡 같은 건반은 1.5초 간격으로 쳐주세요" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 container py-4 max-w-6xl mx-auto px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl px-4 py-3 shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 mr-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => setShowSessionList((v) => !v),
                  className: "flex items-center gap-1.5 text-sm text-foreground/85 hover:text-foreground max-w-full",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "14 2 14 8 20 8" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold truncate max-w-[160px]", children: activeSession?.name || "세션 없음" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "6 9 12 15 18 9" }) })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground/80 mt-0.5", children: [
                measuredCount,
                " / 88건반 측정 완료"
              ] }),
              showSessionList && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto", children: session.sessions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => {
                    session.setActiveSessionId(s.id);
                    setShowSessionList(false);
                  },
                  className: cn(
                    "w-full text-left px-3 py-2.5 text-xs hover:bg-muted/50 border-b border-border/40 last:border-0",
                    s.id === activeSessionId ? "bg-precision-soft text-precision font-bold" : "text-foreground/85"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: s.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground/80 mt-0.5", children: [
                      Object.keys(s.measurements).length,
                      "건반 확정"
                    ] })
                  ]
                },
                s.id
              )) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  createSession();
                  setShowSessionList(false);
                },
                className: "px-3 py-1.5 text-sm bg-precision text-white rounded-lg font-medium whitespace-nowrap",
                children: "+ 새 세션"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 pt-2 border-t border-border/60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "성명 입력 (PDF에 표시)",
                value: userName,
                onChange: (e) => setUserName(e.target.value),
                className: "w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-precision/60"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => activeSession && exportToPdf(
                    activeSession.name,
                    userName,
                    Object.fromEntries(Object.entries(activeSession.measurements).map(([k, v]) => [k, { ...v, cents: v.finalCents ?? 0 }]))
                  ),
                  disabled: measuredCount === 0,
                  className: cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold",
                    measuredCount > 0 ? "bg-precision text-white" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                  ),
                  children: "📄 PDF"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => activeSession && exportToImage(
                    activeSession.name,
                    userName,
                    Object.fromEntries(Object.entries(activeSession.measurements).map(([k, v]) => [k, { ...v, cents: v.finalCents ?? 0 }]))
                  ),
                  disabled: measuredCount === 0,
                  className: cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold",
                    measuredCount > 0 ? "bg-in-tune text-white" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                  ),
                  children: "🖼️ 이미지"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground/85", children: "조율 커브 (정밀 측정값)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-precision inline-block" }),
                "확정값"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-off inline-block" }),
                "범위외"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TuningCurveChart, { data: chartData, activeKeyIndex: pendingKeyIndex })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: toggleListening,
              className: cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]",
                isListening ? "bg-off text-white" : "bg-precision hover:bg-precision/90 text-white"
              ),
              children: isListening ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-card animate-pulse" }),
                "감지 중지"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "🎤 마이크 시작" })
            }
          ),
          measuredCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => {
                if (confirm("초기화?")) clearAllMeasurements();
              },
              className: "text-xs text-muted-foreground/80 hover:text-off",
              children: "초기화"
            }
          ),
          error && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-off", children: error })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3", children: "현재 측정 중" }),
          pendingKeyIndex !== null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-4xl font-bold text-foreground", style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
                PIANO_KEYS[pendingKeyIndex].noteName,
                PIANO_KEYS[pendingKeyIndex].octave
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground/80 mt-0.5", children: [
                "건반 ",
                pendingKeyIndex + 1
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-border/60 rounded-xl overflow-hidden mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/50 border-b border-border/60", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 text-muted-foreground font-semibold", children: "구분" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center px-2 py-2 text-muted-foreground font-semibold", children: "회차" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-3 py-2 text-muted-foreground font-semibold", children: "값" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                confirmedAuto.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 text-primary font-medium", children: "자동 피치" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "bg-primary-soft text-primary px-1.5 py-0.5 rounded font-bold", children: [
                    i + 1,
                    "회 확정"
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-1.5 text-right font-mono font-bold text-foreground", children: [
                    c > 0 ? "+" : "",
                    c.toFixed(1),
                    "¢"
                  ] })
                ] }, `auto-${i}`)),
                isRoundActive && currentLive !== null && confirmedAuto.length < MAX_AUTO2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-yellow-50 border-b border-border/40", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 text-yellow-600 font-medium", children: "자동 피치" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded animate-pulse", children: [
                    confirmedAuto.length + 1,
                    "회 진행 중..."
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-1.5 text-right font-mono text-yellow-600", children: [
                    currentLive > 0 ? "+" : "",
                    currentLive.toFixed(1),
                    "¢"
                  ] })
                ] }),
                confirmedAuto.length >= 2 && autoMedian !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-primary-soft border-b border-border/60", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 text-primary font-bold", children: "자동 중앙값" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-1.5 text-center text-primary/80", children: [
                    confirmedAuto.length,
                    "회"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-1.5 text-right font-mono font-bold text-primary", children: [
                    autoMedian > 0 ? "+" : "",
                    autoMedian.toFixed(1),
                    "¢"
                  ] })
                ] }),
                confirmedStrobe.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 text-warn font-medium", children: "스트로브" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "bg-warn-soft text-warn px-1.5 py-0.5 rounded font-bold", children: [
                    i + 1,
                    "회 확정"
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-1.5 text-right font-mono font-bold text-foreground", children: [
                    c > 0 ? "+" : "",
                    c.toFixed(1),
                    "¢"
                  ] })
                ] }, `strobe-${i}`)),
                confirmedStrobe.length >= 2 && strobeMedian !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-warn-soft border-b border-border/60", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 text-warn font-bold", children: "스트로브 중앙값" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-1.5 text-center text-warn", children: [
                    confirmedStrobe.length,
                    "회"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-1.5 text-right font-mono font-bold text-warn", children: [
                    strobeMedian > 0 ? "+" : "",
                    strobeMedian.toFixed(1),
                    "¢"
                  ] })
                ] }),
                confirmedAuto.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "px-3 py-3 text-center text-muted-foreground/60 text-xs", children: "건반을 쳐주세요" }) })
              ] })
            ] }) }),
            finalCents !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-precision-soft border border-violet-100 rounded-xl p-3 mb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-precision", children: "종합 최종값" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold", style: { color: confidenceColor }, children: [
                  "정확도 ",
                  Math.round(confidence * 100),
                  "% (",
                  confidenceLabel,
                  ")"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-extrabold", style: {
                  color: isInRange(pendingKeyIndex, finalCents) ? "#7c3aed" : "#dc2626",
                  fontFamily: "'JetBrains Mono', monospace"
                }, children: [
                  finalCents > 0 ? "+" : "",
                  finalCents.toFixed(1),
                  "¢"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs", style: { color: isInRange(pendingKeyIndex, finalCents) ? "#7c3aed" : "#dc2626" }, children: isInRange(pendingKeyIndex, finalCents) ? "✓ 허용 범위 내" : "✗ 허용 범위 초과" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 bg-precision-soft rounded-full mt-2 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "h-full rounded-full transition-all duration-300",
                  style: { width: `${confidence * 100}%`, backgroundColor: confidenceColor }
                }
              ) })
            ] }),
            needsRecheck && autoStrobeDiff !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 text-xs text-off bg-off-soft border border-red-200 px-3 py-2 rounded-lg mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-off mt-0.5", children: "⚠️" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold", children: "재측정 필요" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-off", children: [
                  "자동(",
                  autoMedian !== null ? `${autoMedian > 0 ? "+" : ""}${autoMedian.toFixed(1)}¢` : "--",
                  ")와 스트로브(",
                  strobeMedian !== null ? `${strobeMedian > 0 ? "+" : ""}${strobeMedian.toFixed(1)}¢` : "--",
                  ") 차이: ",
                  autoStrobeDiff.toFixed(1),
                  "¢ (5¢ 초과)"
                ] })
              ] })
            ] }),
            canAutoSave && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xs text-in-tune bg-in-tune-soft px-3 py-2 rounded-lg mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-in-tune animate-pulse" }),
              "자동저장 완료 — 계속 측정하면 갱신됩니다"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => confirmCurrent(currentPitch?.frequency ?? 0),
                disabled: !canConfirm || finalCents === null,
                className: cn(
                  "w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]",
                  canConfirm && finalCents !== null ? canAutoSave ? "bg-in-tune hover:bg-in-tune/90 text-white" : "bg-precision hover:bg-precision/90 text-white" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                ),
                children: canConfirm && finalCents !== null ? canAutoSave ? `↑ 교체: ${finalCents > 0 ? "+" : ""}${finalCents.toFixed(1)}¢ (자동${confirmedAuto.length}+스${confirmedStrobe.length})` : `✓ ${finalCents > 0 ? "+" : ""}${finalCents.toFixed(1)}¢ 으로 확정` : needsRecheck ? `⚠️ 재측정 필요 (차이 ${autoStrobeDiff?.toFixed(1)}¢)` : confirmedAuto.length < 3 ? `자동 피치 ${3 - confirmedAuto.length}회 더 필요` : `스트로브 1회 더 필요`
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8 text-muted-foreground/80", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl mb-2", children: "🎹" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm", children: [
              "마이크를 켜고",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "건반을 눌러주세요"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-2 text-muted-foreground/60", children: "안정 감지 즉시 1회 확정" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl overflow-hidden shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pt-3 pb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "스트로브 튜너" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StrobeTuner,
            {
              detectedCents: currentPitch?.cents ?? null,
              stableCents: strobeCents ?? null,
              isCapturing: strobeCents === null && isListening,
              isActive: isListening
            }
          )
        ] }),
        measuredCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(PrecisionResultList, { measurements: activeSession?.measurements ?? {} })
      ] })
    ] }) })
  ] });
}
const toast = Object.assign(
  (msg, opts) => toast$1(msg, opts),
  {
    success: (msg, opts) => toast$1.success(msg, opts),
    error: (msg) => toast$1.error(msg)
  }
);
function Home() {
  const [showAdmin, setShowAdmin] = reactExports.useState(false);
  const [showPrecision, setShowPrecision] = reactExports.useState(false);
  const [
    userName,
    setUserName
  ] = reactExports.useState("");
  const [showExportModal, setShowExportModal] = reactExports.useState(false);
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    recordMeasurement,
    recordStrobeMeasurement,
    undoLastMeasurement,
    undoStack,
    clearAllMeasurements,
    renameSession,
    chartData,
    measuredCount
  } = useTuningSession(null);
  const handleExportPdf = reactExports.useCallback(() => {
    if (!activeSession) return;
    exportToPdf(activeSession.name, userName, activeSession.measurements);
  }, [activeSession, userName]);
  const handleExportImage = reactExports.useCallback(() => {
    if (!activeSession) return;
    exportToImage(activeSession.name, userName, activeSession.measurements);
  }, [activeSession, userName]);
  const [stableDuration, setStableDuration] = reactExports.useState(800);
  const [fftSize, setFftSize] = reactExports.useState(4096);
  const [pendingPitch, setPendingPitch] = reactExports.useState(null);
  const [showSessions, setShowSessions] = reactExports.useState(false);
  const [showAudio, setShowAudio] = reactExports.useState(false);
  const [renamingId, setRenamingId] = reactExports.useState(null);
  const [renameValue, setRenameValue] = reactExports.useState("");
  const [autoSave, setAutoSave] = reactExports.useState(true);
  const [showStrobeOnly, setShowStrobeOnly] = reactExports.useState(false);
  const autoSaveRef = reactExports.useRef(true);
  const pendingRef = reactExports.useRef(null);
  const autoSaveTimerRef = reactExports.useRef(null);
  const handleSetAutoSave = reactExports.useCallback((val) => {
    setAutoSave((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      autoSaveRef.current = next;
      if (!next && autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return next;
    });
  }, []);
  const activeSessionIdRef = reactExports.useRef(activeSessionId);
  reactExports.useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  const handlePitchDetected = reactExports.useCallback((result) => {
    if (result.confidence >= 0.55) {
      setPendingPitch(result);
      pendingRef.current = result;
      if (autoSaveRef.current && activeSessionIdRef.current) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          if (!autoSaveRef.current) return;
          const p = pendingRef.current;
          if (!p) return;
          recordMeasurement(p.keyIndex, p.cents, p.frequency);
          setPendingPitch(null);
          pendingRef.current = null;
        }, 800);
      }
    }
  }, [recordMeasurement]);
  const { isListening, currentPitch, startListening, stopListening, error, isRecovering, stream, audioContext } = usePitchDetector(handlePitchDetected, fftSize);
  useWakeLock(isListening);
  const { strobeCents: stableCents, isCapturing, currentNote: strobeNote, currentKeyIndex: strobeKeyIndex, analysisFreq: strobeAnalysisFreq, partial: strobePartial } = useStrobeDetector(
    isListening ? stream : null,
    isListening ? audioContext : null,
    stableDuration,
    fftSize,
    currentPitch?.keyIndex ?? null
    // 자동 피치 기준 건반으로 옵타브 보정
  );
  const lastAutoStrobeKeyRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (stableCents !== null && strobeKeyIndex !== null && activeSessionIdRef.current) {
      if (lastAutoStrobeKeyRef.current === strobeKeyIndex) return;
      lastAutoStrobeKeyRef.current = strobeKeyIndex;
      recordStrobeMeasurement(strobeKeyIndex, stableCents);
    }
    if (stableCents === null) {
      lastAutoStrobeKeyRef.current = null;
    }
  }, [stableCents, strobeKeyIndex, recordStrobeMeasurement]);
  const saveCurrent = reactExports.useCallback(() => {
    const p = pendingRef.current;
    if (!p || !activeSessionIdRef.current) return;
    recordMeasurement(p.keyIndex, p.cents, p.frequency);
    toast.success(`건반 ${p.keyIndex + 1} (${p.noteName}${p.octave}) ${p.cents > 0 ? "+" : ""}${p.cents.toFixed(1)}¢ 저장됨`);
    setPendingPitch(null);
    pendingRef.current = null;
  }, [recordMeasurement]);
  const skipCurrent = reactExports.useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setPendingPitch(null);
    pendingRef.current = null;
  }, []);
  const handleUndo = reactExports.useCallback(() => {
    const removed = undoLastMeasurement();
    if (removed !== null) {
      const key = PIANO_KEYS[removed];
      toast(`↩ 건반 ${removed + 1} (${key.noteName}${key.octave}) 삭제됨`, { duration: 2e3 });
    } else {
      toast("되돌릴 항목이 없습니다.");
    }
  }, [undoLastMeasurement]);
  reactExports.useEffect(() => {
    if (!autoSave) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    }
  }, [autoSave]);
  reactExports.useEffect(() => {
    const handler = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space" && !autoSave) {
        e.preventDefault();
        saveCurrent();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        skipCurrent();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveCurrent, skipCurrent, handleUndo, autoSave]);
  const toggleListening = async () => {
    if (!activeSessionIdRef.current) {
      const s = await createSession();
      if (s) activeSessionIdRef.current = s.id;
    }
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };
  const handleNewSession = async () => {
    const s = await createSession();
    if (s) toast.success(`새 세션 "${s.name}" 생성됨`);
    setShowSessions(false);
  };
  const handleRenameSubmit = (id) => {
    if (renameValue.trim()) {
      renameSession(id, renameValue.trim());
      toast.success("이름 변경됨");
    }
    setRenamingId(null);
    setRenameValue("");
  };
  const displayPitch = currentPitch || pendingPitch;
  const visibleSession = activeSession ?? {
    name: "새 조율 세션",
    measurements: {}
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-muted/50 flex flex-col", style: { fontFamily: "'Noto Sans KR', sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "bg-card border-b border-border px-4 py-3 flex flex-col gap-3 shadow-sm relative sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-primary rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2.2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 18V5l12-2v13" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "6", cy: "18", r: "3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "18", cy: "16", r: "3" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-bold text-foreground leading-tight", children: "Piano Tuning Scope" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground/80", children: "피아노 조율 커브 측정기" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full items-center gap-2 overflow-x-auto pb-0.5 sm:w-auto sm:overflow-visible sm:pb-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex shrink-0 items-center gap-1 bg-muted rounded-lg p-0.5 mr-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-3 py-1 text-xs font-bold rounded-md bg-card text-primary shadow-sm", children: "자동" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Link,
            {
              to: "/manual",
              className: "px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors",
              children: "수동"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setShowSessions(!showSessions),
            className: "flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-sm bg-muted hover:bg-muted rounded-lg transition-colors sm:px-3",
            "aria-label": "세션 선택",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "14 2 14 8 20 8" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden text-foreground/85 max-w-[120px] truncate md:inline", children: activeSession ? activeSession.name : "세션 없음" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "6 9 12 15 18 9" }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleNewSession,
            className: "shrink-0 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium",
            "aria-label": "새 세션",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sm:hidden", children: "+" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "+ 새 세션" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setShowPrecision(true),
            className: "flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-1.5 text-sm bg-precision hover:bg-precision/90 text-white rounded-lg transition-colors font-medium",
            title: "정밀 측정 모드",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2.2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 8v4l3 3" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "whitespace-nowrap", children: "정밀측정" })
            ]
          }
        )
      ] })
    ] }),
    showAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(AdminPage, { onClose: () => setShowAdmin(false) }),
    showPrecision && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 bg-card overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sticky top-0 z-10 bg-card border-b border-border px-4 py-2 flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setShowPrecision(false),
          className: "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "15 18 9 12 15 6" }) }),
            "돌아가기"
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PrecisionPage, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceAudioBar, {}),
    showSessions && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-16 right-4 z-50 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 border-b border-border/60 bg-muted/50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "저장된 세션" }) }),
      sessions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-6 text-center text-sm text-muted-foreground/80", children: [
        "세션이 없습니다.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "새 세션을 만들어 시작하세요."
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-64 overflow-y-auto", children: sessions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: cn(
            "flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b border-border/40",
            s.id === activeSessionId && "bg-primary-soft"
          ),
          children: [
            renamingId === s.id ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                autoFocus: true,
                value: renameValue,
                onChange: (e) => setRenameValue(e.target.value),
                onBlur: () => handleRenameSubmit(s.id),
                onKeyDown: (e) => {
                  if (e.key === "Enter") handleRenameSubmit(s.id);
                  if (e.key === "Escape") {
                    setRenamingId(null);
                    setRenameValue("");
                  }
                },
                className: "flex-1 text-sm border border-primary/40 rounded px-2 py-0.5 outline-none",
                onClick: (e) => e.stopPropagation()
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", onClick: () => {
              setActiveSessionId(s.id);
              setShowSessions(false);
            }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-sm font-medium truncate", s.id === activeSessionId ? "text-primary" : "text-foreground"), children: s.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground/80", children: [
                Object.keys(s.measurements).length,
                "건반 · ",
                new Date(s.createdAt).toLocaleDateString("ko-KR")
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  setRenamingId(s.id);
                  setRenameValue(s.name);
                },
                className: "p-1 text-muted-foreground/80 hover:text-muted-foreground rounded",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  if (confirm("삭제할까요?")) deleteSession(s.id);
                },
                className: "p-1 text-muted-foreground/80 hover:text-off rounded",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "3 6 5 6 21 6" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" })
                ] })
              }
            )
          ]
        },
        s.id
      )) })
    ] }),
    showSessions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40", onClick: () => setShowSessions(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 container py-4 max-w-6xl mx-auto px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl px-4 py-3 shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold text-foreground", children: visibleSession.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground/80", children: [
                measuredCount,
                " / 88건반 측정 완료",
                measuredCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-primary", children: [
                  "(",
                  Math.round(measuredCount / 88 * 100),
                  "%)"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 h-2 bg-muted rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "h-full bg-primary rounded-full transition-all duration-300",
                  style: { width: `${measuredCount / 88 * 100}%` }
                }
              ) }),
              measuredCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    if (confirm("모든 측정 데이터를 초기화할까요?")) {
                      clearAllMeasurements();
                      toast.success("초기화됨");
                    }
                  },
                  className: "text-xs text-muted-foreground/80 hover:text-off transition-colors",
                  children: "초기화"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 pt-2 border-t border-border/60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "성명 입력 (PDF에 표시)",
                value: userName,
                onChange: (e) => setUserName(e.target.value),
                className: "w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary/60 text-foreground/85"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: handleExportPdf,
                  disabled: measuredCount === 0,
                  className: cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]",
                    measuredCount > 0 ? "bg-primary hover:bg-primary/90 text-white shadow-sm" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "14 2 14 8 20 8" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "18", x2: "12", y2: "12" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "9 15 12 18 15 15" })
                    ] }),
                    "PDF"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: handleExportImage,
                  disabled: measuredCount === 0,
                  className: cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]",
                    measuredCount > 0 ? "bg-in-tune hover:bg-in-tune/90 text-white shadow-sm" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "21 15 16 10 5 21" })
                    ] }),
                    "이미지"
                  ]
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-foreground/85", children: "조율 커브 (Tuning Curve)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground/80 flex-wrap", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-5 h-px bg-instrument/80 inline-block", style: { borderTopStyle: "solid" } }),
                "허용 범위"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-primary inline-block" }),
                "자동"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-off inline-block" }),
                "범위외"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: "5,0 10,9 0,9", fill: "#d97706" }) }),
                "스트로브"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => setShowStrobeOnly((v) => !v),
                  className: cn(
                    "px-2 py-0.5 rounded-md text-xs font-medium border transition-all",
                    showStrobeOnly ? "bg-warn text-white border-warn" : "bg-card text-muted-foreground border-border hover:border-warn/60 hover:text-warn"
                  ),
                  children: showStrobeOnly ? "▲ 스트로브만" : "△ 스트로브만"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TuningCurveChart, { data: chartData, activeKeyIndex: displayPitch?.keyIndex ?? null, showStrobeOnly })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: toggleListening,
                className: cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.97]",
                  isListening ? "bg-off hover:bg-off/90 text-white" : "bg-primary hover:bg-primary/90 text-white"
                ),
                children: isListening ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-card animate-pulse" }),
                  "감지 중지"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "currentColor", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2", fill: "none", stroke: "currentColor", strokeWidth: "2" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "19", x2: "12", y2: "23", stroke: "currentColor", strokeWidth: "2" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "8", y1: "23", x2: "16", y2: "23", stroke: "currentColor", strokeWidth: "2" })
                  ] }),
                  "마이크 시작"
                ] })
              }
            ),
            isRecovering && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-xs text-warn bg-warn-soft px-2.5 py-1.5 rounded-lg border border-warn/40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "animate-spin", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }),
              "마이크 복구 중..."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => handleSetAutoSave((v) => !v),
                className: cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 border",
                  autoSave ? "bg-in-tune-soft border-in-tune/50 text-in-tune" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("w-2 h-2 rounded-full", autoSave ? "bg-in-tune animate-pulse" : "bg-muted-foreground/30") }),
                  autoSave ? "자동저장 ON" : "자동저장 OFF"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handleUndo,
                disabled: undoStack.length === 0,
                className: cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 border",
                  undoStack.length > 0 ? "bg-muted/50 border-border text-foreground/85 hover:bg-muted active:scale-[0.97]" : "bg-muted/50 border-border/60 text-muted-foreground/60 cursor-not-allowed"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 7v6h6" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" })
                  ] }),
                  "되돌리기",
                  undoStack.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none", children: undoStack.length })
                ]
              }
            ),
            error && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-off", children: error })
          ] }),
          !autoSave && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground/80", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground font-mono", children: "Space" }),
            " 저장  ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground font-mono", children: "Esc" }),
            " 건너뛰기  ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground font-mono", children: "Ctrl+Z" }),
            " 되돌리기"
          ] }),
          autoSave && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-in-tune", children: [
            "안정 감지 후 0.8초 뒤 자동 저장됩니다  ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "px-1.5 py-0.5 bg-in-tune-soft border border-in-tune/40 rounded text-in-tune font-mono", children: "Ctrl+Z" }),
            " 되돌리기"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PitchMeter,
          {
            pitch: displayPitch,
            isListening,
            autoSave,
            onSave: saveCurrent,
            onSkip: skipCurrent,
            stableCents,
            isCapturing,
            stableDuration,
            onStableDurationChange: setStableDuration,
            strobeNote,
            strobeKeyIndex,
            strobePartial,
            strobeAnalysisFreq,
            fftSize,
            onFftSizeChange: setFftSize,
            onSaveStrobe: (strobeCents) => {
              if (!activeSessionId) return;
              const ki = strobeKeyIndex ?? displayPitch?.keyIndex;
              if (ki === null || ki === void 0) return;
              recordStrobeMeasurement(ki, strobeCents);
              toast.success(`스트로브 저장: 건반 ${ki + 1} ${strobeCents > 0 ? "+" : ""}${strobeCents.toFixed(1)}¢`);
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3", children: "측정 현황" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-primary-soft rounded-lg p-2.5 text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-primary", style: { fontFamily: "'JetBrains Mono', monospace" }, children: measuredCount }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-primary/80", children: "측정 완료" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/50 rounded-lg p-2.5 text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-muted-foreground", style: { fontFamily: "'JetBrains Mono', monospace" }, children: 88 - measuredCount }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground/80", children: "미측정" })
            ] })
          ] }),
          measuredCount > 0 && (() => {
            const measured = chartData.filter((d) => d.cents !== null);
            const avg = measured.reduce((s, d) => s + (d.cents ?? 0), 0) / measured.length;
            const max = Math.max(...measured.map((d) => d.cents ?? 0));
            const min = Math.min(...measured.map((d) => d.cents ?? 0));
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 text-xs", style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "평균 오차" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: avg > 0 ? "text-warn" : avg < 0 ? "text-primary" : "text-in-tune", children: [
                  avg > 0 ? "+" : "",
                  avg.toFixed(1),
                  "¢"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "최대" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-off", children: [
                  "+",
                  max.toFixed(1),
                  "¢"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "최소" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-primary/80", children: [
                  min.toFixed(1),
                  "¢"
                ] })
              ] })
            ] });
          })()
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 shadow-sm flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "최근 측정" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 max-h-64 overflow-y-auto", children: [
            Object.values(visibleSession.measurements).sort((a, b) => b.measuredAt - a.measuredAt).slice(0, 20).map((m, idx) => {
              const key = PIANO_KEYS[m.keyIndex];
              const isLatest = idx === 0;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: cn(
                    "flex items-center justify-between py-1 px-2 rounded text-xs",
                    isLatest ? "bg-primary-soft" : "hover:bg-muted/50"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground font-medium w-12", style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
                      key.noteName,
                      key.octave
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground/80", children: [
                      "건반 ",
                      m.keyIndex + 1
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn(
                      "font-semibold tabular-nums",
                      Math.abs(m.cents) <= 2 ? "text-in-tune" : Math.abs(m.cents) <= 8 ? "text-warn" : "text-off"
                    ), style: { fontFamily: "'JetBrains Mono', monospace" }, children: [
                      m.cents > 0 ? "+" : "",
                      m.cents.toFixed(1),
                      "¢"
                    ] })
                  ]
                },
                m.keyIndex
              );
            }),
            measuredCount === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground/80 text-center py-4", children: "아직 측정된 건반이 없습니다." })
          ] })
        ] })
      ] })
    ] }) })
  ] });
}
const SplitComponent = Home;
export {
  SplitComponent as component
};
