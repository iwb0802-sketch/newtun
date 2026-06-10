import { r as reactExports, c as jsxDevRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useTuningSession, a as usePitchDetector, b as useWakeLock, P as PIANO_KEYS, c as cn, T as TuningCurveChart, e as exportToPdf, d as exportToImage } from "./exportPdf-DzP4ftKK.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
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
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "grid grid-cols-3 gap-2", children: ORDER.map((s) => {
    const active = s === section;
    const order = SECTION_ORDERS[s];
    const first = order[0] + 1;
    const last = order[order.length - 1] + 1;
    return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
      "button",
      {
        onClick: () => onChange(s),
        className: cn(
          "flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all active:scale-[0.98]",
          active ? "bg-primary text-white border-primary shadow-sm" : "bg-card text-foreground/85 border-border hover:bg-muted"
        ),
        children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "text-sm font-bold", children: SECTION_LABELS[s] }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/SectionTabs.tsx",
            lineNumber: 34,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
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
            },
            void 0,
            true,
            {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/SectionTabs.tsx",
              lineNumber: 35,
              columnNumber: 13
            },
            this
          )
        ]
      },
      s,
      true,
      {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/SectionTabs.tsx",
        lineNumber: 24,
        columnNumber: 11
      },
      this
    );
  }) }, void 0, false, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/SectionTabs.tsx",
    lineNumber: 17,
    columnNumber: 5
  }, this);
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
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "bg-card border border-border rounded-xl px-3 py-3 shadow-sm", children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          onClick: onPrev,
          disabled: !canPrev,
          "aria-label": "이전 음",
          className: cn(
            "w-12 h-12 flex items-center justify-center rounded-xl border transition-all active:scale-95",
            canPrev ? "bg-muted hover:bg-muted/70 border-border text-foreground" : "bg-muted/40 border-border/60 text-muted-foreground/40 cursor-not-allowed"
          ),
          children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("polyline", { points: "15 18 9 12 15 6" }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
            lineNumber: 41,
            columnNumber: 13
          }, this) }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
            lineNumber: 40,
            columnNumber: 11
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
          lineNumber: 29,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex-1 text-center", children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          "div",
          {
            className: "text-3xl font-bold tabular-nums text-foreground leading-none",
            style: { fontFamily: "'JetBrains Mono', monospace" },
            children: [
              key.noteName,
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "text-xl text-muted-foreground ml-0.5", children: key.octave }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
                lineNumber: 52,
                columnNumber: 13
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
            lineNumber: 47,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "text-xs text-muted-foreground mt-1", children: [
          "건반 ",
          key.keyNumber,
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "mx-1.5 text-muted-foreground/40", children: "·" }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
            lineNumber: 56,
            columnNumber: 13
          }, this),
          "진행 ",
          indexInOrder + 1,
          " / ",
          total
        ] }, void 0, true, {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
          lineNumber: 54,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
        lineNumber: 46,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          onClick: onNext,
          disabled: !canNext,
          "aria-label": "다음 음",
          className: cn(
            "w-12 h-12 flex items-center justify-center rounded-xl border transition-all active:scale-95",
            canNext ? "bg-muted hover:bg-muted/70 border-border text-foreground" : "bg-muted/40 border-border/60 text-muted-foreground/40 cursor-not-allowed"
          ),
          children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("polyline", { points: "9 18 15 12 9 6" }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
            lineNumber: 74,
            columnNumber: 13
          }, this) }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
            lineNumber: 73,
            columnNumber: 11
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
          lineNumber: 62,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
      lineNumber: 27,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "mt-2 h-1.5 bg-muted rounded-full overflow-hidden", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
      "div",
      {
        className: "h-full bg-primary rounded-full transition-all duration-300",
        style: { width: `${(indexInOrder + 1) / total * 100}%` }
      },
      void 0,
      false,
      {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
        lineNumber: 81,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
      lineNumber: 80,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/TargetNoteBar.tsx",
    lineNumber: 26,
    columnNumber: 5
  }, this);
}
function MatchStatus({ state, isListening }) {
  if (!isListening) {
    return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "px-3 py-2.5 rounded-xl bg-muted/60 border border-border text-sm text-muted-foreground text-center", children: "마이크를 켜고 목표 음을 누르세요" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
      lineNumber: 17,
      columnNumber: 7
    }, this);
  }
  if (state.kind === "wrong") {
    const k = PIANO_KEYS[state.detectedKeyIndex];
    return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "px-3 py-2.5 rounded-xl border bg-off/10 border-off/40 text-off-foreground text-sm text-center", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "font-bold", children: "✕ 잘못된 음입니다" }, void 0, false, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
        lineNumber: 27,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "ml-2 text-muted-foreground", children: [
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
      ] }, void 0, true, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
        lineNumber: 28,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
      lineNumber: 26,
      columnNumber: 7
    }, this);
  }
  if (state.kind === "matched") {
    return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: cn(
      "px-3 py-2.5 rounded-xl border bg-in-tune/15 border-in-tune/50 text-sm text-center"
    ), children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "font-bold text-in-tune", children: "✓ 일치합니다" }, void 0, false, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
        lineNumber: 42,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "span",
        {
          className: "ml-2 text-foreground/85 tabular-nums",
          style: { fontFamily: "'JetBrains Mono', monospace" },
          children: [
            state.cents > 0 ? "+" : "",
            state.cents.toFixed(1),
            "¢"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
          lineNumber: 43,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
      lineNumber: 39,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "px-3 py-2.5 rounded-xl bg-muted/60 border border-border text-sm text-muted-foreground text-center", children: "건반을 누르세요…" }, void 0, false, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/manual/MatchStatus.tsx",
    lineNumber: 52,
    columnNumber: 5
  }, this);
}
const AUTO_ADVANCE_KEY = "manual_auto_advance_v1";
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
  const handlePitchDetected = reactExports.useCallback((result) => {
    if (result.confidence < 0.55) return;
    const target = targetKeyRef.current;
    if (result.keyIndex !== target) {
      pendingMatchRef.current = null;
      if (matchedDebounceRef.current) {
        clearTimeout(matchedDebounceRef.current);
        matchedDebounceRef.current = null;
      }
      setMatchState({
        kind: "wrong",
        detectedKeyIndex: result.keyIndex,
        detectedCents: result.cents
      });
      return;
    }
    pendingMatchRef.current = result;
    if (matchedDebounceRef.current) clearTimeout(matchedDebounceRef.current);
    matchedDebounceRef.current = setTimeout(() => {
      const p = pendingMatchRef.current;
      if (!p) return;
      if (p.keyIndex !== targetKeyRef.current) return;
      if (!activeSessionIdRef.current) {
        createSession().then((s) => {
          if (s) {
            activeSessionIdRef.current = s.id;
            recordMeasurement(p.keyIndex, p.cents, p.frequency);
          }
        });
      } else {
        recordMeasurement(p.keyIndex, p.cents, p.frequency);
      }
      setMatchState({ kind: "matched", cents: p.cents });
      pendingMatchRef.current = null;
      if (autoAdvanceRef.current) {
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
          seqNextRef.current();
        }, 1200);
      }
    }, 800);
  }, [recordMeasurement, createSession]);
  const { isListening, startListening, stopListening, error } = usePitchDetector(handlePitchDetected, 4096);
  useWakeLock(isListening);
  const toggleListening = async () => {
    if (!activeSessionIdRef.current) {
      const s = await createSession();
      if (s) activeSessionIdRef.current = s.id;
    }
    if (isListening) stopListening();
    else await startListening();
  };
  const targetKey = PIANO_KEYS[seq.targetKeyIndex];
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
    "div",
    {
      className: "min-h-screen bg-muted/50 flex flex-col",
      style: { fontFamily: "'Noto Sans KR', sans-serif" },
      children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("header", { className: "bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm", children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "w-8 h-8 bg-primary rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2.2", children: [
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("path", { d: "M9 18V5l12-2v13" }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 170,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("circle", { cx: "6", cy: "18", r: "3" }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 171,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("circle", { cx: "18", cy: "16", r: "3" }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 172,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 169,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 168,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h1", { className: "text-base font-bold text-foreground leading-tight", children: "수동 조율" }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 176,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "text-xs text-muted-foreground/80", children: "목표 음 → 건반 → 기록" }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 177,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 175,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 167,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("nav", { className: "flex items-center gap-1 bg-muted rounded-lg p-0.5", children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
              Link,
              {
                to: "/",
                className: "px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors",
                children: "자동"
              },
              void 0,
              false,
              {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 183,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "px-3 py-1 text-xs font-bold rounded-md bg-card text-primary shadow-sm", children: "수동" }, void 0, false, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 189,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 182,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
          lineNumber: 166,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("main", { className: "flex-1 container max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3", children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(SectionTabs, { section: seq.section, onChange: seq.setSection }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 197,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
            TargetNoteBar,
            {
              keyIndex: seq.targetKeyIndex,
              indexInOrder: seq.indexInOrder,
              total: seq.total,
              canPrev: seq.canPrev,
              canNext: seq.canNext,
              onPrev: seq.prev,
              onNext: seq.next
            },
            void 0,
            false,
            {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 200,
              columnNumber: 9
            },
            this
          ),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
              "button",
              {
                onClick: toggleListening,
                className: cn(
                  "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]",
                  isListening ? "bg-off text-white hover:bg-off/90" : "bg-primary text-white hover:bg-primary/90"
                ),
                children: isListening ? "■ 마이크 끄기" : "● 마이크 켜기"
              },
              void 0,
              false,
              {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 212,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("label", { className: "flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border cursor-pointer", children: [
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
                "input",
                {
                  type: "checkbox",
                  checked: autoAdvance,
                  onChange: (e) => setAutoAdvance(e.target.checked),
                  className: "w-4 h-4 accent-primary"
                },
                void 0,
                false,
                {
                  fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                  lineNumber: 224,
                  columnNumber: 13
                },
                this
              ),
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "text-xs text-foreground/85 whitespace-nowrap", children: "자동 진행" }, void 0, false, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 230,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 223,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 211,
            columnNumber: 9
          }, this),
          error && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "px-3 py-2 rounded-lg bg-off/10 border border-off/40 text-xs text-off-foreground", children: error }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 235,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(MatchStatus, { state: matchState, isListening }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 241,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "bg-card border border-border rounded-xl p-2 shadow-sm", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
            TuningCurveChart,
            {
              data: chartData,
              activeKeyIndex: seq.targetKeyIndex
            },
            void 0,
            false,
            {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 245,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 244,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "grid grid-cols-3 gap-2", children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
              "button",
              {
                onClick: seq.prev,
                disabled: !seq.canPrev,
                className: cn(
                  "py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                  seq.canPrev ? "bg-card text-foreground border-border hover:bg-muted" : "bg-muted/40 text-muted-foreground/40 border-border/60 cursor-not-allowed"
                ),
                children: "◀ 이전"
              },
              void 0,
              false,
              {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 253,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
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
              },
              void 0,
              false,
              {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 265,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
              "button",
              {
                onClick: seq.next,
                disabled: !seq.canNext,
                className: cn(
                  "py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                  seq.canNext ? "bg-card text-foreground border-border hover:bg-muted" : "bg-muted/40 text-muted-foreground/40 border-border/60 cursor-not-allowed"
                ),
                children: "다음 ▶"
              },
              void 0,
              false,
              {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 276,
                columnNumber: 11
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 252,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "bg-card border border-border rounded-xl px-4 py-3 shadow-sm", children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex items-center justify-between mb-2", children: [
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "relative flex-1 mr-2", children: [
                /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
                  "button",
                  {
                    onClick: () => setShowSessionList((v) => !v),
                    className: "flex items-center gap-1.5 text-sm text-foreground/85 hover:text-foreground max-w-full",
                    children: [
                      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }, void 0, false, {
                          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                          lineNumber: 299,
                          columnNumber: 19
                        }, this),
                        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("polyline", { points: "14 2 14 8 20 8" }, void 0, false, {
                          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                          lineNumber: 300,
                          columnNumber: 19
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                        lineNumber: 298,
                        columnNumber: 17
                      }, this),
                      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "font-semibold truncate max-w-[180px]", children: activeSession?.name || "세션 없음" }, void 0, false, {
                        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                        lineNumber: 302,
                        columnNumber: 17
                      }, this),
                      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("polyline", { points: "6 9 12 15 18 9" }, void 0, false, {
                        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                        lineNumber: 306,
                        columnNumber: 19
                      }, this) }, void 0, false, {
                        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                        lineNumber: 305,
                        columnNumber: 17
                      }, this)
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                    lineNumber: 294,
                    columnNumber: 15
                  },
                  this
                ),
                /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "text-xs text-muted-foreground/80 mt-0.5", children: [
                  "측정 ",
                  measuredCount,
                  " / 88 · 현재 목표 ",
                  targetKey.noteName,
                  targetKey.octave,
                  " (건반 ",
                  targetKey.keyNumber,
                  ")"
                ] }, void 0, true, {
                  fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                  lineNumber: 309,
                  columnNumber: 15
                }, this),
                showSessionList && sessions.length > 0 && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto", children: sessions.map((s) => /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
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
                      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "font-medium truncate", children: s.name }, void 0, false, {
                        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                        lineNumber: 323,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "text-muted-foreground/80 mt-0.5", children: [
                        Object.keys(s.measurements).length,
                        "건반 측정"
                      ] }, void 0, true, {
                        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                        lineNumber: 324,
                        columnNumber: 23
                      }, this)
                    ]
                  },
                  s.id,
                  true,
                  {
                    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                    lineNumber: 315,
                    columnNumber: 21
                  },
                  this
                )) }, void 0, false, {
                  fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                  lineNumber: 313,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 293,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
                "button",
                {
                  onClick: () => {
                    createSession();
                    setShowSessionList(false);
                  },
                  className: "px-3 py-1.5 text-sm bg-primary text-white rounded-lg font-medium whitespace-nowrap",
                  children: "+ 새 세션"
                },
                void 0,
                false,
                {
                  fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                  lineNumber: 332,
                  columnNumber: 13
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 292,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex flex-col gap-2 pt-2 border-t border-border/60", children: [
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
                "input",
                {
                  type: "text",
                  placeholder: "성명 입력 (PDF에 표시)",
                  value: userName,
                  onChange: (e) => setUserName(e.target.value),
                  className: "w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary/60"
                },
                void 0,
                false,
                {
                  fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                  lineNumber: 340,
                  columnNumber: 13
                },
                this
              ),
              /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
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
                  },
                  void 0,
                  false,
                  {
                    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                    lineNumber: 348,
                    columnNumber: 15
                  },
                  this
                ),
                /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
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
                  },
                  void 0,
                  false,
                  {
                    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                    lineNumber: 362,
                    columnNumber: 15
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
                lineNumber: 347,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
              lineNumber: 339,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
            lineNumber: 291,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
          lineNumber: 195,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/features/tuner/ManualPage.tsx",
      lineNumber: 161,
      columnNumber: 5
    },
    this
  );
}
const SplitComponent = ManualPage;
export {
  SplitComponent as component
};
