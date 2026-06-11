import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useTuningSession, a as usePitchDetector, b as useWakeLock, P as PIANO_KEYS, c as cn, T as TuningCurveChart, e as exportToPdf, d as exportToImage, t as targetPartial, g as goertzel, f as centsFromPhaseDelta } from "./exportPdf-Ds8AMxE0.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
const MIN_RMS = 6e-3;
function wrapPi(p) {
  if (!Number.isFinite(p)) return 0;
  return p - 2 * Math.PI * Math.round(p / (2 * Math.PI));
}
function medianOf(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function coarseFreq(buf, sr, fTarget) {
  const STEP_CENTS = 5;
  const RANGE_CENTS = 100;
  const steps = Math.round(RANGE_CENTS / STEP_CENTS);
  let bestFreq = fTarget;
  let bestMag = -1;
  for (let i = -steps; i <= steps; i++) {
    const f = fTarget * Math.pow(2, i * STEP_CENTS / 1200);
    const mag = goertzel(buf, sr, f).magnitude;
    if (mag > bestMag) {
      bestMag = mag;
      bestFreq = f;
    }
  }
  return bestFreq;
}
function partialHzToBaseAbsoluteCents(measuredPartialHz, keyIndex, partial) {
  const equalBaseHz = PIANO_KEYS[keyIndex]?.freq;
  if (!equalBaseHz || !Number.isFinite(measuredPartialHz) || measuredPartialHz <= 0 || partial <= 0) {
    return Number.NaN;
  }
  const measuredBaseHz = measuredPartialHz / partial;
  return 1200 * Math.log2(measuredBaseHz / equalBaseHz);
}
function useTargetedStrobe(stream, audioContext, targetKeyIndex, opts = {}) {
  const {
    stableDurationMs = 800,
    fftSize = 4096,
    dominanceRatio = 1.4
  } = opts;
  const [strobeCents, setStrobeCents] = reactExports.useState(null);
  const [liveCents, setLiveCents] = reactExports.useState(null);
  const [isCapturing, setIsCapturing] = reactExports.useState(false);
  const [captureProgress, setCaptureProgress] = reactExports.useState(0);
  const [signalOk, setSignalOk] = reactExports.useState(false);
  const analyserRef = reactExports.useRef(null);
  const sourceRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const bufRef = reactExports.useRef(null);
  const targetKeyRef = reactExports.useRef(targetKeyIndex);
  const targetFreqRef = reactExports.useRef(0);
  const partialRef = reactExports.useRef(1);
  const peakRmsRef = reactExports.useRef(0);
  const captureStartRef = reactExports.useRef(null);
  const prevResidualRef = reactExports.useRef(null);
  const cumPhaseRef = reactExports.useRef(0);
  const startAudioTimeRef = reactExports.useRef(0);
  const lastAudioTimeRef = reactExports.useRef(0);
  const coarseBufRef = reactExports.useRef([]);
  const resetCapture = reactExports.useCallback(() => {
    prevResidualRef.current = null;
    cumPhaseRef.current = 0;
    captureStartRef.current = null;
    coarseBufRef.current = [];
  }, []);
  reactExports.useEffect(() => {
    targetKeyRef.current = targetKeyIndex;
    if (targetKeyIndex !== null) {
      const p = targetPartial(targetKeyIndex);
      partialRef.current = p;
      targetFreqRef.current = PIANO_KEYS[targetKeyIndex].freq * p;
    } else {
      targetFreqRef.current = 0;
      partialRef.current = 1;
    }
    resetCapture();
    peakRmsRef.current = 0;
    setStrobeCents(null);
    setLiveCents(null);
    setIsCapturing(false);
    setCaptureProgress(0);
    setSignalOk(false);
  }, [targetKeyIndex, resetCapture]);
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
    const detect = () => {
      const analyserNode = analyserRef.current;
      const buf = bufRef.current;
      const fTarget = targetFreqRef.current;
      const keyIndex2 = targetKeyRef.current;
      const partial = partialRef.current;
      if (!analyserNode || !buf || fTarget <= 0 || keyIndex2 === null || partial <= 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const tAudio = audioContext.currentTime;
      analyserNode.getFloatTimeDomainData(
        buf
      );
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        sum += buf[i] * buf[i];
      }
      const rms = Math.sqrt(sum / buf.length);
      if (rms < MIN_RMS) {
        setSignalOk(false);
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      if (rms > peakRmsRef.current * 1.5 && rms > 0.02) {
        peakRmsRef.current = rms;
        resetCapture();
        setIsCapturing(false);
        setCaptureProgress(0);
        setStrobeCents(null);
      } else if (rms > peakRmsRef.current) {
        peakRmsRef.current = rms;
      }
      const sr = audioContext.sampleRate;
      const gTarget = goertzel(buf, sr, fTarget);
      const magLo = goertzel(
        buf,
        sr,
        fTarget * Math.pow(2, -1.5 / 12)
      ).magnitude;
      const magHi = goertzel(
        buf,
        sr,
        fTarget * Math.pow(2, 1.5 / 12)
      ).magnitude;
      const dominant = gTarget.magnitude > Math.max(magLo, magHi, 1e-9) * dominanceRatio;
      setSignalOk(dominant);
      if (!dominant) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const isStable = rms < peakRmsRef.current * 0.55 && peakRmsRef.current > 0.015;
      if (!isStable) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const fc = coarseFreq(buf, sr, fTarget);
      coarseBufRef.current.push(fc);
      if (coarseBufRef.current.length > 60) {
        coarseBufRef.current.shift();
      }
      const fcMed = medianOf(coarseBufRef.current);
      const liveC = partialHzToBaseAbsoluteCents(
        fcMed,
        keyIndex2,
        partial
      );
      if (Number.isFinite(liveC) && Math.abs(liveC) < 300) {
        setLiveCents(Math.round(liveC * 10) / 10);
      }
      const residual = wrapPi(
        gTarget.phase - 2 * Math.PI * fTarget * tAudio
      );
      if (captureStartRef.current === null) {
        captureStartRef.current = performance.now();
        startAudioTimeRef.current = tAudio;
        lastAudioTimeRef.current = tAudio;
        prevResidualRef.current = residual;
        cumPhaseRef.current = 0;
        setIsCapturing(true);
      } else {
        const prev = prevResidualRef.current;
        const dt = tAudio - lastAudioTimeRef.current;
        const predicted = 2 * Math.PI * (fcMed - fTarget) * dt;
        const raw = residual - prev;
        const k = Math.round(
          (predicted - raw) / (2 * Math.PI)
        );
        cumPhaseRef.current += raw + 2 * Math.PI * k;
        prevResidualRef.current = residual;
        lastAudioTimeRef.current = tAudio;
      }
      const elapsedMs = performance.now() - captureStartRef.current;
      setCaptureProgress(
        Math.min(elapsedMs / stableDurationMs, 1)
      );
      if (elapsedMs >= stableDurationMs) {
        const totalDt = tAudio - startAudioTimeRef.current;
        if (totalDt > 1e-3) {
          const centsFromTarget = centsFromPhaseDelta(
            0,
            cumPhaseRef.current,
            totalDt,
            fTarget
          );
          let finalC = liveC;
          if (Number.isFinite(centsFromTarget)) {
            const measuredPartialHz = fTarget * Math.pow(2, centsFromTarget / 1200);
            const absoluteCents = partialHzToBaseAbsoluteCents(
              measuredPartialHz,
              keyIndex2,
              partial
            );
            finalC = Number.isFinite(absoluteCents) && Math.abs(absoluteCents - liveC) <= 10 ? absoluteCents : liveC;
          }
          if (Number.isFinite(finalC)) {
            setStrobeCents(Math.round(finalC * 10) / 10);
          }
        }
        setIsCapturing(false);
        setCaptureProgress(0);
        resetCapture();
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
      resetCapture();
      peakRmsRef.current = 0;
    };
  }, [
    stream,
    audioContext,
    stableDurationMs,
    fftSize,
    dominanceRatio,
    resetCapture
  ]);
  const keyIndex = targetKeyRef.current;
  return {
    strobeCents,
    liveCents,
    isCapturing,
    captureProgress,
    currentNote: keyIndex !== null ? `${PIANO_KEYS[keyIndex].noteName}${PIANO_KEYS[keyIndex].octave}` : null,
    currentKeyIndex: keyIndex,
    analysisFreq: targetFreqRef.current || null,
    partial: keyIndex !== null ? partialRef.current : null,
    signalOk
  };
}
function range(start, endInclusive, step) {
  const out = [];
  if (step > 0) {
    for (let v = start; v <= endInclusive; v += step) out.push(v);
  } else {
    for (let v = start; v >= endInclusive; v += step) out.push(v);
  }
  return out;
}
const SECTION_ORDERS = {
  middle: range(60, 27, -1),
  lower: range(26, 0, -1),
  upper: range(61, 87, 1)
};
const SECTION_LABELS = {
  middle: "중앙값",
  lower: "하부값",
  upper: "상부값"
};
function useManualSequence() {
  const [section, setSectionState] = reactExports.useState("middle");
  const [indices, setIndices] = reactExports.useState({
    middle: 0,
    lower: 0,
    upper: 0
  });
  const order = SECTION_ORDERS[section];
  const indexInOrder = indices[section];
  const targetKeyIndex = order[indexInOrder];
  const total = order.length;
  const setSection = reactExports.useCallback((s) => {
    setSectionState(s);
  }, []);
  const prev = reactExports.useCallback(() => {
    setIndices((prev2) => ({
      ...prev2,
      [section]: Math.max(0, prev2[section] - 1)
    }));
  }, [section]);
  const next = reactExports.useCallback(() => {
    setIndices((prev2) => ({
      ...prev2,
      [section]: Math.min(SECTION_ORDERS[section].length - 1, prev2[section] + 1)
    }));
  }, [section]);
  return reactExports.useMemo(
    () => ({
      section,
      setSection,
      indexInOrder,
      total,
      targetKeyIndex,
      canPrev: indexInOrder > 0,
      canNext: indexInOrder < total - 1,
      prev,
      next
    }),
    [section, setSection, indexInOrder, total, targetKeyIndex, prev, next]
  );
}
const ORDER = ["middle", "lower", "upper"];
function SectionTabs({ section, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: ORDER.map((s) => {
    const active = s === section;
    const order = SECTION_ORDERS[s];
    const first = order[0] + 1;
    const last = order[order.length - 1] + 1;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => onChange(s),
        className: cn(
          "flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all active:scale-[0.98]",
          active ? "bg-primary text-white border-primary shadow-sm" : "bg-card text-foreground/85 border-border hover:bg-muted"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold", children: SECTION_LABELS[s] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: cn(
                "text-[10px] mt-0.5",
                active ? "text-white/80" : "text-muted-foreground"
              ),
              style: { fontFamily: "'JetBrains Mono', monospace" },
              children: [
                first,
                "→",
                last
              ]
            }
          )
        ]
      },
      s
    );
  }) });
}
function TargetNoteBar({
  keyIndex,
  indexInOrder,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext
}) {
  const key = PIANO_KEYS[keyIndex];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl px-3 py-3 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onPrev,
          disabled: !canPrev,
          "aria-label": "이전 음",
          className: cn(
            "w-12 h-12 flex items-center justify-center rounded-xl border transition-all active:scale-95",
            canPrev ? "bg-muted hover:bg-muted/70 border-border text-foreground" : "bg-muted/40 border-border/60 text-muted-foreground/40 cursor-not-allowed"
          ),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "15 18 9 12 15 6" }) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "text-3xl font-bold tabular-nums text-foreground leading-none",
            style: { fontFamily: "'JetBrains Mono', monospace" },
            children: [
              key.noteName,
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl text-muted-foreground ml-0.5", children: key.octave })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [
          "건반 ",
          key.keyNumber,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1.5 text-muted-foreground/40", children: "·" }),
          "진행 ",
          indexInOrder + 1,
          " / ",
          total
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onNext,
          disabled: !canNext,
          "aria-label": "다음 음",
          className: cn(
            "w-12 h-12 flex items-center justify-center rounded-xl border transition-all active:scale-95",
            canNext ? "bg-muted hover:bg-muted/70 border-border text-foreground" : "bg-muted/40 border-border/60 text-muted-foreground/40 cursor-not-allowed"
          ),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "9 18 15 12 9 6" }) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-1.5 bg-muted rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "h-full bg-primary rounded-full transition-all duration-300",
        style: { width: `${(indexInOrder + 1) / total * 100}%` }
      }
    ) })
  ] });
}
function MatchStatus({ state, isListening }) {
  if (!isListening) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2.5 rounded-xl bg-muted/60 border border-border text-sm text-muted-foreground text-center", children: "마이크를 켜고 목표 음을 누르세요" });
  }
  if (state.kind === "wrong") {
    const k = PIANO_KEYS[state.detectedKeyIndex];
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2.5 rounded-xl border bg-off/10 border-off/40 text-off-foreground text-sm text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: "✕ 잘못된 음입니다" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-muted-foreground", children: [
        "감지: ",
        k.noteName,
        k.octave,
        " (",
        k.keyNumber,
        "번,",
        " ",
        state.detectedCents > 0 ? "+" : "",
        state.detectedCents.toFixed(1),
        "¢)"
      ] })
    ] });
  }
  if (state.kind === "matched") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn(
      "px-3 py-2.5 rounded-xl border bg-in-tune/15 border-in-tune/50 text-sm text-center"
    ), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-in-tune", children: "✓ 일치합니다" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          className: "ml-2 text-foreground/85 tabular-nums",
          style: { fontFamily: "'JetBrains Mono', monospace" },
          children: [
            state.cents > 0 ? "+" : "",
            state.cents.toFixed(1),
            "¢"
          ]
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2.5 rounded-xl bg-muted/60 border border-border text-sm text-muted-foreground text-center", children: "건반을 누르세요…" });
}
const AUTO_ADVANCE_KEY = "manual_auto_advance_v1";
function isLowRange(keyIndex) {
  return keyIndex <= 26;
}
function ManualPage() {
  const seq = useManualSequence();
  const [autoAdvance, setAutoAdvance] = reactExports.useState(() => {
    try {
      const v = localStorage.getItem(AUTO_ADVANCE_KEY);
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(AUTO_ADVANCE_KEY, autoAdvance ? "1" : "0");
    } catch {
    }
  }, [autoAdvance]);
  const [matchState, setMatchState] = reactExports.useState({ kind: "idle" });
  const targetKeyRef = reactExports.useRef(seq.targetKeyIndex);
  reactExports.useEffect(() => {
    targetKeyRef.current = seq.targetKeyIndex;
    setMatchState({ kind: "idle" });
  }, [seq.targetKeyIndex]);
  const autoAdvanceRef = reactExports.useRef(autoAdvance);
  reactExports.useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    recordMeasurement,
    chartData,
    measuredCount
  } = useTuningSession(null);
  const [userName, setUserName] = reactExports.useState("");
  const [showSessionList, setShowSessionList] = reactExports.useState(false);
  const activeSessionIdRef = reactExports.useRef(activeSessionId);
  reactExports.useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  const advanceTimerRef = reactExports.useRef(null);
  const matchedDebounceRef = reactExports.useRef(null);
  const pendingMatchRef = reactExports.useRef(null);
  const seqNextRef = reactExports.useRef(seq.next);
  reactExports.useEffect(() => {
    seqNextRef.current = seq.next;
  }, [seq.next]);
  const clearTimers = reactExports.useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (matchedDebounceRef.current) {
      clearTimeout(matchedDebounceRef.current);
      matchedDebounceRef.current = null;
    }
    pendingMatchRef.current = null;
  }, []);
  reactExports.useEffect(() => {
    clearTimers();
    return clearTimers;
  }, [seq.targetKeyIndex, clearTimers]);
  const ensureSession = reactExports.useCallback(async () => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    const s = await createSession();
    if (s) {
      activeSessionIdRef.current = s.id;
      return s.id;
    }
    return null;
  }, [createSession]);
  const scheduleAdvance = reactExports.useCallback(() => {
    if (!autoAdvanceRef.current) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      seqNextRef.current();
    }, 1200);
  }, []);
  const commitMeasurement = reactExports.useCallback(async (keyIndex, cents, freq) => {
    await ensureSession();
    recordMeasurement(keyIndex, cents, freq);
    setMatchState({ kind: "matched", cents });
    scheduleAdvance();
  }, [ensureSession, recordMeasurement, scheduleAdvance]);
  const handlePitchDetected = reactExports.useCallback((result) => {
    if (result.confidence < 0.55) return;
    const target = targetKeyRef.current;
    if (isLowRange(target)) return;
    if (result.keyIndex !== target) {
      pendingMatchRef.current = null;
      if (matchedDebounceRef.current) {
        clearTimeout(matchedDebounceRef.current);
        matchedDebounceRef.current = null;
      }
      setMatchState({ kind: "wrong", detectedKeyIndex: result.keyIndex, detectedCents: result.cents });
      return;
    }
    pendingMatchRef.current = result;
    if (matchedDebounceRef.current) clearTimeout(matchedDebounceRef.current);
    matchedDebounceRef.current = setTimeout(() => {
      const p = pendingMatchRef.current;
      if (!p || p.keyIndex !== targetKeyRef.current) return;
      commitMeasurement(p.keyIndex, p.cents, p.frequency);
      pendingMatchRef.current = null;
    }, 800);
  }, [commitMeasurement]);
  const { isListening, startListening, stopListening, error, stream, audioContext } = usePitchDetector(handlePitchDetected, 4096);
  useWakeLock(isListening);
  const strobeTarget = isLowRange(seq.targetKeyIndex) ? seq.targetKeyIndex : null;
  const strobe = useTargetedStrobe(
    isListening ? stream : null,
    isListening ? audioContext : null,
    strobeTarget,
    { stableDurationMs: 800, fftSize: 4096 }
  );
  const prevStrobeCentsRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const c = strobe.strobeCents;
    if (c === null || c === prevStrobeCentsRef.current) return;
    if (!isLowRange(targetKeyRef.current)) return;
    prevStrobeCentsRef.current = c;
    const keyIndex = targetKeyRef.current;
    const freq = PIANO_KEYS[keyIndex]?.freq ?? 0;
    commitMeasurement(keyIndex, c, freq);
  }, [strobe.strobeCents, commitMeasurement]);
  reactExports.useEffect(() => {
    prevStrobeCentsRef.current = null;
  }, [seq.targetKeyIndex]);
  const toggleListening = async () => {
    if (!activeSessionIdRef.current) {
      const s = await createSession();
      if (s) activeSessionIdRef.current = s.id;
    }
    if (isListening) stopListening();
    else await startListening();
  };
  const targetKey = PIANO_KEYS[seq.targetKeyIndex];
  const isLow = isLowRange(seq.targetKeyIndex);
  const strobeMatchState = (() => {
    if (!isLow) return matchState;
    if (!isListening) return { kind: "idle" };
    if (!strobe.signalOk) return { kind: "idle" };
    if (strobe.isCapturing) return { kind: "idle" };
    if (strobe.strobeCents !== null) return { kind: "matched", cents: strobe.strobeCents };
    if (strobe.liveCents !== null) return { kind: "matched", cents: strobe.liveCents };
    return { kind: "idle" };
  })();
  const displayMatchState = isLow ? strobeMatchState : matchState;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "min-h-screen bg-muted/50 flex flex-col",
      style: { fontFamily: "'Noto Sans KR', sans-serif" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-primary rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2.2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 18V5l12-2v13" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "6", cy: "18", r: "3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "18", cy: "16", r: "3" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-bold text-foreground leading-tight", children: "수동 조율" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground/80", children: isLow ? `저음 스트로브 모드 (1~27번) · 배음 ${strobe.partial ?? "?"}배` : "목표 음 → 건반 → 기록" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex items-center gap-1 bg-muted rounded-lg p-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Link,
              {
                to: "/",
                className: "px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors",
                children: "자동"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-3 py-1 text-xs font-bold rounded-md bg-card text-primary shadow-sm", children: "수동" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 container max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTabs, { section: seq.section, onChange: seq.setSection }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TargetNoteBar,
            {
              keyIndex: seq.targetKeyIndex,
              indexInOrder: seq.indexInOrder,
              total: seq.total,
              canPrev: seq.canPrev,
              canNext: seq.canNext,
              onPrev: seq.prev,
              onNext: seq.next
            }
          ),
          isLow && isListening && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl px-4 py-3 shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-medium text-muted-foreground", children: [
                "스트로브 분석 (",
                strobe.analysisFreq ? `${strobe.analysisFreq.toFixed(1)} Hz` : "—",
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                strobe.signalOk ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              ), children: strobe.signalOk ? "신호 감지" : "신호 없음" })
            ] }),
            strobe.isCapturing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-muted rounded-full h-1.5 mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "bg-primary h-1.5 rounded-full transition-all",
                style: { width: `${strobe.captureProgress * 100}%` }
              }
            ) }),
            strobe.liveCents !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-bold text-foreground mt-1", children: [
              "실시간: ",
              strobe.liveCents > 0 ? "+" : "",
              strobe.liveCents.toFixed(1),
              "¢"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: toggleListening,
                className: cn(
                  "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]",
                  isListening ? "bg-off text-white hover:bg-off/90" : "bg-primary text-white hover:bg-primary/90"
                ),
                children: isListening ? "■ 마이크 끄기" : "● 마이크 켜기"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border cursor-pointer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: autoAdvance,
                  onChange: (e) => setAutoAdvance(e.target.checked),
                  className: "w-4 h-4 accent-primary"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-foreground/85 whitespace-nowrap", children: "자동 진행" })
            ] })
          ] }),
          error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 rounded-lg bg-off/10 border border-off/40 text-xs text-off-foreground", children: error }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MatchStatus, { state: displayMatchState, isListening }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-xl p-2 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TuningCurveChart,
            {
              data: chartData,
              activeKeyIndex: seq.targetKeyIndex
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: seq.prev,
                disabled: !seq.canPrev,
                className: cn(
                  "py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                  seq.canPrev ? "bg-card text-foreground border-border hover:bg-muted" : "bg-muted/40 text-muted-foreground/40 border-border/60 cursor-not-allowed"
                ),
                children: "◀ 이전"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  clearTimers();
                  setMatchState({ kind: "idle" });
                  if (seq.canNext) seq.next();
                  else toast("이 구간의 마지막 음입니다.");
                },
                className: "py-2.5 rounded-xl text-sm font-medium border bg-card text-muted-foreground border-border hover:bg-muted transition-all active:scale-[0.98]",
                children: "건너뛰기"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: seq.next,
                disabled: !seq.canNext,
                className: cn(
                  "py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                  seq.canNext ? "bg-card text-foreground border-border hover:bg-muted" : "bg-muted/40 text-muted-foreground/40 border-border/60 cursor-not-allowed"
                ),
                children: "다음 ▶"
              }
            )
          ] }),
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
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold truncate max-w-[180px]", children: activeSession?.name || "세션 없음" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "6 9 12 15 18 9" }) })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground/80 mt-0.5", children: [
                  "측정 ",
                  measuredCount,
                  " / 88 · 현재 목표 ",
                  targetKey.noteName,
                  targetKey.octave,
                  " (건반 ",
                  targetKey.keyNumber,
                  ")"
                ] }),
                showSessionList && sessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto", children: sessions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => {
                      setActiveSessionId(s.id);
                      setShowSessionList(false);
                    },
                    className: cn(
                      "w-full text-left px-3 py-2.5 text-xs hover:bg-muted/50 border-b border-border/40 last:border-0",
                      s.id === activeSessionId ? "bg-primary/10 text-primary font-bold" : "text-foreground/85"
                    ),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: s.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground/80 mt-0.5", children: [
                        Object.keys(s.measurements).length,
                        "건반 측정"
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
                  className: "px-3 py-1.5 text-sm bg-primary text-white rounded-lg font-medium whitespace-nowrap",
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
                  className: "w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary/60"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => activeSession && exportToPdf(
                      activeSession.name,
                      userName,
                      activeSession.measurements
                    ),
                    disabled: measuredCount === 0,
                    className: cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold",
                      measuredCount > 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground/60 cursor-not-allowed"
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
                      activeSession.measurements
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
          ] })
        ] })
      ]
    }
  );
}
const SplitComponent = ManualPage;
export {
  SplitComponent as component
};
