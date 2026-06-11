import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { c as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
const A0_FREQ = 27.5;
function applyHannWindow(buf) {
  const N = buf.length;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
    out[i] = buf[i] * w;
  }
  return out;
}
function getRMS(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function detectPitchYIN(buf, sr, fMin = 26, fMax = 5e3, threshold = 0.12) {
  const half = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sr / fMax));
  const tauMax = Math.min(half - 1, Math.ceil(sr / fMin));
  const yin = new Float32Array(half);
  for (let tau2 = tauMin; tau2 <= tauMax; tau2++) {
    let s = 0;
    for (let i = 0; i < half; i++) {
      const d = buf[i] - buf[i + tau2];
      s += d * d;
    }
    yin[tau2] = s;
  }
  yin[0] = 1;
  let rs = 0;
  for (let tau2 = 1; tau2 <= tauMax; tau2++) {
    rs += yin[tau2];
    if (rs > 0) yin[tau2] *= tau2 / rs;
  }
  let tau = tauMin;
  while (tau <= tauMax) {
    if (yin[tau] < threshold) {
      while (tau + 1 <= tauMax && yin[tau + 1] < yin[tau]) tau++;
      break;
    }
    tau++;
  }
  if (tau > tauMax || yin[tau] >= threshold) return -1;
  let bt = tau;
  if (tau > tauMin && tau < tauMax) {
    const s0 = yin[tau - 1], s1 = yin[tau], s2 = yin[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) bt = tau + (s2 - s0) / denom;
  }
  return sr / bt;
}
function correctOctaveByHPS(fYin, spectrumDb, sr, fftSize, numHarmonics = 5) {
  if (fYin <= 0) return fYin;
  const binHz = sr / fftSize;
  const N = spectrumDb.length;
  const magAt = (freq) => {
    const bin = Math.round(freq / binHz);
    if (bin < 1 || bin >= N) return 0;
    let maxDb = -Infinity;
    for (let d = -1; d <= 1; d++) {
      const b = bin + d;
      if (b >= 1 && b < N && spectrumDb[b] > maxDb) maxDb = spectrumDb[b];
    }
    if (maxDb === -Infinity || maxDb < -90) return 0;
    return Math.pow(10, maxDb / 20);
  };
  const candidates = [];
  for (let div = 1; div <= 6; div++) {
    const c = fYin / div;
    if (c >= A0_FREQ * 0.97) candidates.push(c);
  }
  const score = (c) => {
    let s = 0;
    for (let k = 1; k <= numHarmonics; k++) {
      if (k * c > sr / 2) break;
      s += magAt(k * c);
    }
    return s;
  };
  const baseScore = score(fYin);
  let bestC = fYin;
  let bestS = baseScore;
  for (const c of candidates) {
    if (c === fYin) continue;
    const s = score(c);
    if (s > bestS * 1.15) {
      bestS = s;
      bestC = c;
    }
  }
  return bestC;
}
function targetPartial(keyIndex) {
  if (keyIndex < 0) return 1;
  if (keyIndex < 12) return 6;
  if (keyIndex < 24) return 4;
  if (keyIndex < 36) return 2;
  return 1;
}
function goertzel(buf, sr, targetFreq) {
  const N = buf.length;
  const k = N * targetFreq / sr;
  const w = 2 * Math.PI * k / N;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const coeff = 2 * cosW;
  let q0 = 0, q1 = 0, q2 = 0;
  for (let i = 0; i < N; i++) {
    q0 = coeff * q1 - q2 + buf[i];
    q2 = q1;
    q1 = q0;
  }
  const real = q1 - q2 * cosW;
  const imag = q2 * sinW;
  return {
    real,
    imag,
    magnitude: Math.sqrt(real * real + imag * imag) / N,
    phase: Math.atan2(imag, real)
  };
}
function centsFromPhaseDelta(prevPhase, currPhase, dtSec, targetFreq) {
  let dp = currPhase - prevPhase;
  while (dp > Math.PI) dp -= 2 * Math.PI;
  while (dp < -Math.PI) dp += 2 * Math.PI;
  const freqDelta = dp / (2 * Math.PI * dtSec);
  const actual = targetFreq + freqDelta;
  if (actual <= 0) return 0;
  return 1200 * Math.log2(actual / targetFreq);
}
const PIANO_KEYS = Array.from({ length: 88 }, (_, i) => {
  const midi = i + 21;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
  return { midi, keyNumber: i + 1, noteName, octave, freq, isBlack };
});
function freqToCentOffset(freq) {
  if (freq <= 0) return null;
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  const midiRound = Math.round(midiFloat);
  const keyIndex = midiRound - 21;
  if (keyIndex < 0 || keyIndex > 87) return null;
  return { keyIndex, cents: (midiFloat - midiRound) * 100, note: PIANO_KEYS[keyIndex] };
}
function usePitchDetector(onPitchDetected, fftSize = 4096) {
  const [isListening, setIsListening] = reactExports.useState(false);
  const [currentPitch, setCurrentPitch] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [isRecovering, setIsRecovering] = reactExports.useState(false);
  const ctxRef = reactExports.useRef(null);
  const analyserRef = reactExports.useRef(null);
  const streamRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const bufRef = reactExports.useRef(null);
  const specRef = reactExports.useRef(null);
  const isRunningRef = reactExports.useRef(false);
  const recentKeys = reactExports.useRef([]);
  const recentCents = reactExports.useRef([]);
  const WINDOW = 15;
  const MIN_MATCH = 8;
  const stopListening = reactExports.useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    bufRef.current = null;
    specRef.current = null;
    recentKeys.current = [];
    recentCents.current = [];
    setIsListening(false);
    setCurrentPitch(null);
    setIsRecovering(false);
  }, []);
  const startListening = reactExports.useCallback(async () => {
    try {
      setError(null);
      setIsRecovering(false);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, sampleRate: 44100 }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
        });
      }
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      ctxRef.current = ctx;
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
        }
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      bufRef.current = new Float32Array(analyser.fftSize);
      specRef.current = new Float32Array(analyser.frequencyBinCount);
      isRunningRef.current = true;
      setIsListening(true);
      const detect = () => {
        if (!isRunningRef.current) return;
        const ctx2 = ctxRef.current;
        const analyser2 = analyserRef.current;
        const buf = bufRef.current;
        const spec = specRef.current;
        if (!ctx2 || !analyser2 || !buf || !spec) return;
        if (ctx2.state === "suspended") {
          ctx2.resume().catch(() => {
          });
        }
        analyser2.getFloatTimeDomainData(buf);
        const rms = getRMS(buf);
        if (rms < 3e-3) {
          recentKeys.current = [];
          recentCents.current = [];
          setCurrentPitch(null);
          rafRef.current = requestAnimationFrame(detect);
          return;
        }
        const winBuf = applyHannWindow(buf);
        const fYin = detectPitchYIN(winBuf, ctx2.sampleRate, 26, 5e3, 0.12);
        if (fYin > 0) {
          analyser2.getFloatFrequencyData(spec);
          const fCorrected = correctOctaveByHPS(fYin, spec, ctx2.sampleRate, analyser2.fftSize, 5);
          const r = freqToCentOffset(fCorrected);
          if (r) {
            recentKeys.current.push(r.keyIndex);
            recentCents.current.push(r.cents);
            if (recentKeys.current.length > WINDOW) {
              recentKeys.current.shift();
              recentCents.current.shift();
            }
            const counts = {};
            recentKeys.current.forEach((k) => {
              counts[k] = (counts[k] || 0) + 1;
            });
            const [topKey, topCount] = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
            const stableKi = parseInt(topKey);
            if (Number(topCount) >= MIN_MATCH) {
              const centsArr = recentKeys.current.map((k, i) => k === stableKi ? recentCents.current[i] : null).filter((v) => v !== null);
              const stableCents = Math.round(median(centsArr) * 10) / 10;
              const result = {
                frequency: fCorrected,
                keyIndex: stableKi,
                noteName: PIANO_KEYS[stableKi].noteName,
                octave: PIANO_KEYS[stableKi].octave,
                cents: stableCents,
                confidence: Number(topCount) / WINDOW,
                rms
              };
              if (result.confidence >= 0.55) {
                setCurrentPitch(result);
                onPitchDetected?.(result);
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    } catch (err) {
      let msg = "마이크 접근 실패";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg = "마이크 권한이 거부되었습니다. 설정 > Safari > 마이크를 허용해 주세요.";
        } else if (err.name === "NotFoundError") {
          msg = "마이크를 찾을 수 없습니다.";
        } else if (err.name === "NotReadableError") {
          msg = "마이크를 사용할 수 없습니다. 다른 앱이 마이크를 사용 중일 수 있습니다.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
      setIsListening(false);
    }
  }, [onPitchDetected, fftSize]);
  reactExports.useEffect(() => {
    const handler = async () => {
      if (document.visibilityState !== "visible") return;
      if (!isRunningRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx || ctx.state === "closed") {
        isRunningRef.current = false;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        ctxRef.current = null;
        analyserRef.current = null;
        bufRef.current = null;
        specRef.current = null;
        recentKeys.current = [];
        recentCents.current = [];
        setCurrentPitch(null);
        try {
          await startListening();
        } catch {
        }
      } else if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
        }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [startListening]);
  reactExports.useEffect(() => () => {
    stopListening();
  }, [stopListening]);
  return {
    isListening,
    currentPitch,
    startListening,
    stopListening,
    error,
    isRecovering,
    stream: streamRef.current,
    audioContext: ctxRef.current
  };
}
const UPPER_ABS = [
  -9,
  -8,
  -7,
  -6,
  -6,
  -5,
  -4,
  -4,
  -3,
  -3,
  -2,
  -2,
  -1,
  -1,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  5,
  5,
  6,
  6,
  6,
  6,
  6,
  6,
  7,
  7,
  7,
  7,
  7,
  8,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  12,
  13,
  15,
  17,
  18,
  20,
  21,
  23,
  25,
  26,
  28,
  30,
  32,
  34,
  37,
  39,
  41
];
const LOWER_ABS = [
  -33,
  -32,
  -30,
  -29,
  -27,
  -25,
  -24,
  -22,
  -20,
  -19,
  -18,
  -17,
  -16,
  -15,
  -14,
  -13,
  -13,
  -12,
  -11,
  -11,
  -11,
  -10,
  -10,
  -10,
  -10,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -9,
  -8,
  -8,
  -8,
  -8,
  -8,
  -8,
  -8,
  -8,
  -8,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -7,
  -6,
  -6,
  -6,
  -6,
  -6,
  -5,
  -5,
  -5,
  -5,
  -5,
  -4,
  -4,
  -4,
  -3,
  -2,
  -2,
  -1,
  0,
  1,
  1,
  2,
  3,
  4,
  6,
  7,
  9,
  11,
  13,
  15,
  17
];
const RAILSBACK = UPPER_ABS.map(
  (u, i) => Math.round((u + LOWER_ABS[i]) / 2)
);
UPPER_ABS.map(
  (u, i) => u - RAILSBACK[i]
);
LOWER_ABS.map(
  (l, i) => RAILSBACK[i] - l
);
const A_INDICES$1 = PIANO_KEYS.map((k, i) => ({ ...k, i })).filter((k) => k.noteName === "A").map((k) => k.i);
function TuningCurveChart({ data, activeKeyIndex, showStrobeOnly = false }) {
  const SVG_W = 960;
  const SVG_H = 480;
  const PAD = { top: 30, right: 52, bottom: 110, left: 48 };
  const PW = SVG_W - PAD.left - PAD.right;
  const PH = SVG_H - PAD.top - PAD.bottom;
  const Y_MIN = -40;
  const Y_MAX = 40;
  const Y_RANGE = Y_MAX - Y_MIN;
  const [xView, setXView] = reactExports.useState({ start: 0, end: 1 });
  const [viewMode, setViewMode] = reactExports.useState("all");
  const isZoomed = xView.start > 1e-3 || xView.end < 0.999;
  const dragRef = reactExports.useRef(null);
  const pinchRef = reactExports.useRef(null);
  const svgRef = reactExports.useRef(null);
  const pxToNorm = reactExports.useCallback((clientX) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const svgX = (clientX - rect.left) / rect.width * SVG_W - PAD.left;
    return Math.max(0, Math.min(1, svgX / PW));
  }, []);
  const applyZoom = reactExports.useCallback((factor, centerNorm) => {
    setXView((prev) => {
      const span = prev.end - prev.start;
      const newSpan = Math.max(0.05, Math.min(1, span * factor));
      const centerInView = (centerNorm - prev.start) / span;
      let newStart = centerNorm - centerInView * newSpan;
      let newEnd = newStart + newSpan;
      if (newStart < 0) {
        newStart = 0;
        newEnd = newSpan;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - newSpan;
      }
      return { start: newStart, end: newEnd };
    });
  }, []);
  const handleWheel = reactExports.useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    const centerNorm = pxToNorm(e.clientX);
    applyZoom(factor, centerNorm);
  }, [pxToNorm, applyZoom]);
  const handleMouseDown = reactExports.useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: pxToNorm(e.clientX), startView: xView };
  }, [pxToNorm, xView]);
  const handleMouseMove = reactExports.useCallback((e) => {
    if (!dragRef.current) return;
    const dx = pxToNorm(e.clientX) - dragRef.current.startX;
    const span = dragRef.current.startView.end - dragRef.current.startView.start;
    let newStart = dragRef.current.startView.start - dx;
    let newEnd = newStart + span;
    if (newStart < 0) {
      newStart = 0;
      newEnd = span;
    }
    if (newEnd > 1) {
      newEnd = 1;
      newStart = 1 - span;
    }
    setXView({ start: newStart, end: newEnd });
  }, [pxToNorm]);
  const handleMouseUp = reactExports.useCallback(() => {
    dragRef.current = null;
  }, []);
  const getTouchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const getTouchMidX = (t) => (t[0].clientX + t[1].clientX) / 2;
  const handleTouchStart = reactExports.useCallback((e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        dist: getTouchDist(e.touches),
        midX: pxToNorm(getTouchMidX(e.touches)),
        startView: xView
      };
      dragRef.current = null;
    } else if (e.touches.length === 1) {
      dragRef.current = { startX: pxToNorm(e.touches[0].clientX), startView: xView };
      pinchRef.current = null;
    }
  }, [pxToNorm, xView]);
  const handleTouchMove = reactExports.useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const newDist = getTouchDist(e.touches);
      const factor = pinchRef.current.dist / newDist;
      const midNorm = pxToNorm(getTouchMidX(e.touches));
      const span = pinchRef.current.startView.end - pinchRef.current.startView.start;
      const newSpan = Math.max(0.05, Math.min(1, span * factor));
      const centerInView = (midNorm - pinchRef.current.startView.start) / span;
      let newStart = midNorm - centerInView * newSpan;
      let newEnd = newStart + newSpan;
      if (newStart < 0) {
        newStart = 0;
        newEnd = newSpan;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - newSpan;
      }
      setXView({ start: newStart, end: newEnd });
    } else if (e.touches.length === 1 && dragRef.current) {
      const dx = pxToNorm(e.touches[0].clientX) - dragRef.current.startX;
      const span = dragRef.current.startView.end - dragRef.current.startView.start;
      let newStart = dragRef.current.startView.start - dx;
      let newEnd = newStart + span;
      if (newStart < 0) {
        newStart = 0;
        newEnd = span;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - span;
      }
      setXView({ start: newStart, end: newEnd });
    }
  }, [pxToNorm]);
  const handleTouchEnd = reactExports.useCallback(() => {
    dragRef.current = null;
    pinchRef.current = null;
  }, []);
  reactExports.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  reactExports.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);
  const xOf = reactExports.useCallback((ki) => {
    return ki / 87 * PW;
  }, []);
  const yOf = (c) => PH - (c - Y_MIN) / Y_RANGE * PH;
  const visStart = 0;
  const visEnd = 87;
  const stepPath = reactExports.useMemo(() => {
    const upper = [];
    const lower = [];
    for (let i = visStart; i <= visEnd; i++) {
      const x0 = xOf(i);
      const x1 = i < 87 ? xOf(i + 1) : xOf(87);
      const yu = yOf(UPPER_ABS[i]);
      const yl = yOf(LOWER_ABS[i]);
      if (i === visStart) {
        upper.push(`M ${x0.toFixed(1)} ${yu.toFixed(1)}`);
        lower.push(`M ${x0.toFixed(1)} ${yl.toFixed(1)}`);
      } else {
        const prevYu = yOf(UPPER_ABS[i - 1]);
        const prevYl = yOf(LOWER_ABS[i - 1]);
        upper.push(`L ${x0.toFixed(1)} ${prevYu.toFixed(1)} L ${x0.toFixed(1)} ${yu.toFixed(1)}`);
        lower.push(`L ${x0.toFixed(1)} ${prevYl.toFixed(1)} L ${x0.toFixed(1)} ${yl.toFixed(1)}`);
      }
      upper.push(`L ${x1.toFixed(1)} ${yu.toFixed(1)}`);
      lower.push(`L ${x1.toFixed(1)} ${yl.toFixed(1)}`);
    }
    return { upper: upper.join(" "), lower: lower.join(" ") };
  }, [visStart, visEnd, xOf]);
  const yMajor = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const yMinor = [];
  for (let c = -40; c <= 40; c += 2) {
    if (!yMajor.includes(c)) yMinor.push(c);
  }
  const xLabels = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 88].filter((kn) => {
    const norm = (kn - 1) / 87;
    return norm >= xView.start - 0.02 && norm <= xView.end + 0.02;
  });
  const KB_H = 32;
  const KB_TOP = PH + 14;
  const WK_W = PW / (52 * (xView.end - xView.start));
  const whiteKeyPositions = [];
  let wIdx = 0;
  for (let i = 0; i < 88; i++) {
    if (!PIANO_KEYS[i].isBlack) {
      whiteKeyPositions.push({ ki: i, x: wIdx * (PW / 52) });
      wIdx++;
    }
  }
  const blackKeyPositions = [];
  for (let i = 0; i < 88; i++) {
    if (PIANO_KEYS[i].isBlack) {
      const prevWhite = [...whiteKeyPositions].reverse().find((w) => w.ki < i);
      if (prevWhite) blackKeyPositions.push({ ki: i, x: prevWhite.x + PW / 52 * 0.65 });
    }
  }
  const keyXInView = (rawX) => rawX;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full relative select-none overflow-x-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5 px-0.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-gray-300", children: isZoomed ? `${Math.round(1 / (xView.end - xView.start))}× 확대 중` : "휘/핀치로 확대" }),
      isZoomed && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setXView({ start: 0, end: 1 }),
          className: "flex items-center gap-1 px-2.5 py-1 bg-muted border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/80 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 3v5h5" })
            ] }),
            "전체 보기"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        ref: svgRef,
        viewBox: `0 0 ${SVG_W} ${SVG_H}`,
        className: "block",
        style: {
          width: `${Math.round(100 / (xView.end - xView.start))}%`,
          minWidth: 320,
          fontFamily: "'JetBrains Mono', monospace",
          // 확대 시는 스크롤 허용, 전체 보기에서는 핀치만 작동
          touchAction: isZoomed ? "pan-x" : "none",
          cursor: isZoomed ? "default" : "grab"
        },
        onMouseDown: handleMouseDown,
        onTouchStart: handleTouchStart,
        onTouchMove: (e) => {
          if (e.touches.length === 2) {
            e.preventDefault();
            handleTouchMove(e);
          } else if (!isZoomed) {
            handleTouchMove(e);
          }
        },
        onTouchEnd: handleTouchEnd,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { width: SVG_W, height: SVG_H, fill: "white" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { transform: `translate(${PAD.left},${PAD.top})`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("clipPath", { id: "plotClip", children: /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 0, y: -30, width: PW, height: SVG_H }) }) }),
            yMinor.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: 0, y1: yOf(c), x2: PW, y2: yOf(c), stroke: "#d1d5db", strokeWidth: 0.3 }, `ym${c}`)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("g", { clipPath: "url(#plotClip)", children: Array.from({ length: 88 }, (_, i) => {
              const x = xOf(i);
              if (x < -5 || x > PW + 5) return null;
              return /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: x, y1: 0, x2: x, y2: PH, stroke: "#e5e7eb", strokeWidth: 0.25 }, `xm${i}`);
            }) }),
            yMajor.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "line",
              {
                x1: 0,
                y1: yOf(c),
                x2: PW,
                y2: yOf(c),
                stroke: c === 0 ? "#374151" : "#9ca3af",
                strokeWidth: c === 0 ? 1.2 : 0.6
              },
              `yM${c}`
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 0, y: 0, width: PW, height: PH, fill: "none", stroke: "#374151", strokeWidth: 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { clipPath: "url(#plotClip)", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: stepPath.upper, fill: "none", stroke: "#1f2937", strokeWidth: 1.4 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: stepPath.lower, fill: "none", stroke: "#1f2937", strokeWidth: 1.4 })
            ] }),
            yMajor.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: -4, y1: yOf(c), x2: 0, y2: yOf(c), stroke: "#374151", strokeWidth: 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: -7, y: yOf(c) + 3.5, textAnchor: "end", fontSize: 9, fill: "#374151", children: c > 0 ? `+${c}` : c })
            ] }, `yl${c}`)),
            yMinor.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: -2, y1: yOf(c), x2: 0, y2: yOf(c), stroke: "#6b7280", strokeWidth: 0.6 }, `ylt${c}`)),
            yMajor.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: PW, y1: yOf(c), x2: PW + 4, y2: yOf(c), stroke: "#374151", strokeWidth: 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: PW + 7, y: yOf(c) + 3.5, textAnchor: "start", fontSize: 9, fill: "#374151", children: c > 0 ? `+${c}` : c })
            ] }, `yr${c}`)),
            yMinor.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: PW, y1: yOf(c), x2: PW + 2, y2: yOf(c), stroke: "#6b7280", strokeWidth: 0.6 }, `yrt${c}`)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("g", { clipPath: "url(#plotClip)", children: xLabels.map((kn) => /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: xOf(kn - 1), y: PH + 10, textAnchor: "middle", fontSize: 7.5, fill: "#6b7280", children: kn }, `xl${kn}`)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("g", { clipPath: "url(#plotClip)", children: A_INDICES$1.map((ki) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "line",
              {
                x1: xOf(ki),
                y1: 0,
                x2: xOf(ki),
                y2: PH,
                stroke: "#94a3b8",
                strokeWidth: 0.8,
                strokeDasharray: "4,3",
                opacity: 0.7
              },
              `av${ki}`
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("g", { clipPath: "url(#plotClip)", children: A_INDICES$1.map((ki) => {
              const x = xOf(ki);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: x, y1: -18, x2: x, y2: 0, stroke: "#374151", strokeWidth: 1.2 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x, y: -20, textAnchor: "middle", fontSize: 9, fill: "#374151", fontWeight: "700", children: "A" })
              ] }, `a${ki}`);
            }) }),
            activeKeyIndex != null && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "line",
              {
                x1: xOf(activeKeyIndex),
                y1: 0,
                x2: xOf(activeKeyIndex),
                y2: PH,
                stroke: "#ef4444",
                strokeWidth: 1,
                strokeDasharray: "4,3",
                opacity: 0.6
              }
            ),
            !showStrobeOnly && /* @__PURE__ */ jsxRuntimeExports.jsx("g", { clipPath: "url(#plotClip)", children: data.map((d) => {
              if (d.cents === null) return null;
              const cx = xOf(d.keyIndex);
              const cy = yOf(d.cents);
              const isActive = d.keyIndex === activeKeyIndex;
              const inRange = d.cents >= LOWER_ABS[d.keyIndex] && d.cents <= UPPER_ABS[d.keyIndex];
              const fill = isActive ? "#ef4444" : inRange ? "#1e3a5f" : "#dc2626";
              const r = isActive ? 5 : 3.5;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx,
                  cy,
                  r: Math.min(r, 6),
                  fill,
                  stroke: isActive ? "#fca5a5" : "none",
                  strokeWidth: isActive ? 2 : 0,
                  opacity: 0.92,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `[자동] 건반 ${d.keyNumber} (${d.noteName}${d.octave}): ${d.cents > 0 ? "+" : ""}${d.cents.toFixed(1)}¢` })
                },
                `auto-${d.keyIndex}`
              );
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("g", { clipPath: "url(#plotClip)", children: data.map((d) => {
              if (!d.strobeCents) return null;
              const cx = xOf(d.keyIndex);
              const cy = yOf(d.strobeCents);
              const inRange = d.strobeCents >= LOWER_ABS[d.keyIndex] && d.strobeCents <= UPPER_ABS[d.keyIndex];
              const fill = inRange ? "#d97706" : "#f97316";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "polygon",
                  {
                    points: `${cx},${cy - 5} ${cx + 4.5},${cy + 3} ${cx - 4.5},${cy + 3}`,
                    fill,
                    opacity: 0.9,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `[스트로브] 건반 ${d.keyNumber} (${d.noteName}${d.octave}): ${d.strobeCents > 0 ? "+" : ""}${d.strobeCents.toFixed(1)}¢` })
                  }
                ),
                d.cents !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "line",
                  {
                    x1: cx,
                    y1: yOf(d.cents),
                    x2: cx,
                    y2: cy,
                    stroke: "#d97706",
                    strokeWidth: 0.8,
                    strokeDasharray: "2,2",
                    opacity: 0.5
                  }
                )
              ] }, `strobe-${d.keyIndex}`);
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { transform: `translate(0, ${KB_TOP})`, clipPath: "url(#plotClip)", children: [
              whiteKeyPositions.map(({ ki, x }) => {
                const vx = keyXInView(x);
                if (vx < -WK_W || vx > PW + WK_W) return null;
                const isActive = ki === activeKeyIndex;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "rect",
                  {
                    x: vx + 0.3,
                    y: 0,
                    width: Math.max(1, WK_W - 0.6),
                    height: KB_H,
                    fill: isActive ? "#bfdbfe" : "white",
                    stroke: "#6b7280",
                    strokeWidth: 0.5
                  },
                  `wk${ki}`
                );
              }),
              blackKeyPositions.map(({ ki, x }) => {
                const vx = keyXInView(x);
                if (vx < -WK_W || vx > PW + WK_W) return null;
                const isActive = ki === activeKeyIndex;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "rect",
                  {
                    x: vx,
                    y: 0,
                    width: Math.max(0.5, WK_W * 0.55),
                    height: KB_H * 0.62,
                    fill: isActive ? "#1e40af" : "#1f2937",
                    rx: 0.8,
                    stroke: "white",
                    strokeWidth: 0.8
                  },
                  `bk${ki}`
                );
              }),
              xLabels.map((kn) => {
                const ki = kn - 1;
                const wk = whiteKeyPositions.find((w) => w.ki === ki);
                const bk = blackKeyPositions.find((b) => b.ki === ki);
                const rawX = wk ? wk.x + PW / 52 / 2 : bk ? bk.x + WK_W * 0.275 : 0;
                const vx = keyXInView(rawX);
                if (vx < 0 || vx > PW) return null;
                return /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: vx, y: KB_H + 11, textAnchor: "middle", fontSize: 7, fill: "#6b7280", children: kn }, `kn${kn}`);
              }),
              A_INDICES$1.map((ki) => {
                const wk = whiteKeyPositions.find((w) => w.ki === ki);
                if (!wk) return null;
                const vx = keyXInView(wk.x + PW / 52 / 2);
                if (vx < 0 || vx > PW) return null;
                const keyNum = ki + 1;
                const octave = PIANO_KEYS[ki].octave;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("text", { x: vx, y: KB_H + 22, textAnchor: "middle", fontSize: 7, fontWeight: "bold", fill: "#374151", children: [
                    "A",
                    octave
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: vx, y: KB_H + 31, textAnchor: "middle", fontSize: 6, fill: "#94a3b8", children: keyNum }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: vx, y1: 0, x2: vx, y2: -4, stroke: "#374151", strokeWidth: 0.8 })
                ] }, `ab${ki}`);
              })
            ] })
          ] })
        ]
      }
    )
  ] });
}
const STORAGE_KEY = "piano_tuning_sessions_v2";
const MAX_SESSIONS = 10;
function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocal(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
function useTuningSession(userId) {
  const [sessions, setSessions] = reactExports.useState(() => loadLocal());
  const [activeSessionId, setActiveSessionId] = reactExports.useState(() => {
    const s = loadLocal();
    return s[0]?.id ?? null;
  });
  const [undoStack, setUndoStack] = reactExports.useState([]);
  reactExports.useRef(null);
  const activeSessionIdRef = reactExports.useRef(activeSessionId);
  reactExports.useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  reactExports.useEffect(() => {
    saveLocal(sessions);
  }, [sessions, userId]);
  reactExports.useEffect(() => {
    {
      setSessions(loadLocal());
      setActiveSessionId(null);
      return;
    }
  }, [userId]);
  const syncToCloud = reactExports.useCallback((updatedSessions, changedId) => {
    return;
  }, [userId]);
  const createSession = reactExports.useCallback(async (name) => {
    const now = Date.now();
    const sessionName = name || `조율 ${new Date(now).toLocaleDateString("ko-KR")} ${new Date(now).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    const session = { id: now.toString(36) + Math.random().toString(36).slice(2, 6), name: sessionName, createdAt: now, measurements: {} };
    setSessions((prev) => {
      const u = [session, ...prev].slice(0, MAX_SESSIONS);
      saveLocal(u);
      return u;
    });
    activeSessionIdRef.current = session.id;
    setActiveSessionId(session.id);
    setUndoStack([]);
    return session;
  }, [userId]);
  const deleteSession = reactExports.useCallback(async (id) => {
    setSessions((prev) => {
      const u = prev.filter((s) => s.id !== id);
      saveLocal(u);
      return u;
    });
    setActiveSessionId((prev) => prev === id ? null : prev);
  }, [userId]);
  const recordMeasurement = reactExports.useCallback((keyIndex, cents, frequency) => {
    const sid = activeSessionIdRef.current;
    if (!sid) return;
    setSessions((prev) => {
      const u = prev.map((s) => {
        if (s.id !== sid) return s;
        const existing = s.measurements[keyIndex];
        const updated = existing ? { ...existing, autoCentsRef: cents } : { keyIndex, cents: 0, autoCentsRef: cents, frequency, measuredAt: Date.now() };
        return { ...s, measurements: { ...s.measurements, [keyIndex]: updated } };
      });
      saveLocal(u);
      return u;
    });
  }, [userId, syncToCloud]);
  const recordStrobeMeasurement = reactExports.useCallback((keyIndex, strobeCents) => {
    const sid = activeSessionIdRef.current;
    if (!sid) return;
    setSessions((prev) => {
      const u = prev.map((s) => {
        if (s.id !== sid) return s;
        const existing = s.measurements[keyIndex];
        let updated;
        if (!existing || existing.cents === 0 || !existing.strobe1) {
          updated = {
            ...existing || { keyIndex, frequency: 0, measuredAt: Date.now() },
            cents: strobeCents,
            strobe1: strobeCents,
            measuredAt: Date.now()
          };
        } else {
          const avg = Math.round(((existing.strobe1 ?? strobeCents) + strobeCents) / 2 * 10) / 10;
          updated = {
            ...existing,
            strobe2: strobeCents,
            strobeCents: avg,
            measuredAt: Date.now()
          };
        }
        return { ...s, measurements: { ...s.measurements, [keyIndex]: updated } };
      });
      saveLocal(u);
      return u;
    });
    setUndoStack((prev) => [...prev, keyIndex]);
  }, [userId, syncToCloud]);
  const undoLastMeasurement = reactExports.useCallback(() => {
    if (undoStack.length === 0 || !activeSessionId) return null;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setSessions((prev) => {
      const u = prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const m = { ...s.measurements };
        delete m[last];
        return { ...s, measurements: m };
      });
      saveLocal(u);
      return u;
    });
    return last;
  }, [activeSessionId, undoStack, userId, syncToCloud]);
  const clearAllMeasurements = reactExports.useCallback(() => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const u = prev.map((s) => s.id === activeSessionId ? { ...s, measurements: {} } : s);
      saveLocal(u);
      return u;
    });
    setUndoStack([]);
  }, [activeSessionId, userId, syncToCloud]);
  const renameSession = reactExports.useCallback(async (id, name) => {
    setSessions((prev) => {
      const u = prev.map((s) => s.id === id ? { ...s, name } : s);
      saveLocal(u);
      return u;
    });
  }, [userId]);
  const importSession = reactExports.useCallback((session) => {
    const newSession = { ...session, id: session.id + "_" + Date.now().toString(36) };
    setSessions((prev) => {
      const u = [newSession, ...prev];
      saveLocal(u);
      return u;
    });
    setActiveSessionId(newSession.id);
    return newSession;
  }, [userId]);
  const chartData = PIANO_KEYS.map((key, i) => {
    const m = activeSession?.measurements[i];
    const mainCents = m ? m.cents !== 0 ? m.cents : m.autoCentsRef ?? null : null;
    return { keyNumber: key.keyNumber, keyIndex: i, noteName: key.noteName, octave: key.octave, isBlack: key.isBlack, cents: mainCents, strobeCents: m?.strobeCents ?? null, measured: !!m && mainCents !== null };
  });
  const measuredCount = activeSession ? Object.keys(activeSession.measurements).length : 0;
  return { sessions, activeSession, activeSessionId, setActiveSessionId, createSession, deleteSession, recordMeasurement, recordStrobeMeasurement, undoLastMeasurement, undoStack, clearAllMeasurements, renameSession, importSession, chartData, measuredCount };
}
function useWakeLock(isActive) {
  const wakeLockRef = reactExports.useRef(null);
  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
    }
  };
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };
  reactExports.useEffect(() => {
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [isActive]);
  reactExports.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive]);
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const A_INDICES = PIANO_KEYS.map((k, i) => ({ ...k, i })).filter((k) => k.noteName === "A").map((k) => k.i);
function buildGraphCanvas(sessionName, userName, measurements) {
  const canvas = document.createElement("canvas");
  const DPR = 2;
  const W = 1100, H = 620;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);
  const PAD = { top: 40, right: 60, bottom: 100, left: 55 };
  const PW = W - PAD.left - PAD.right;
  const PH = H - PAD.top - PAD.bottom;
  const Y_MIN = -40, Y_RANGE = 80;
  const xOf = (ki) => ki / 87 * PW;
  const yOf = (c) => PH - (c - Y_MIN) / Y_RANGE * PH;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(PAD.left, PAD.top);
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 0.3;
  for (let c = -40; c <= 40; c += 2) {
    if (c % 10 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(0, yOf(c));
    ctx.lineTo(PW, yOf(c));
    ctx.stroke();
  }
  for (let i = 0; i < 88; i++) {
    ctx.beginPath();
    ctx.moveTo(xOf(i), 0);
    ctx.lineTo(xOf(i), PH);
    ctx.stroke();
  }
  for (let c = -40; c <= 40; c += 10) {
    ctx.strokeStyle = c === 0 ? "#374151" : "#9ca3af";
    ctx.lineWidth = c === 0 ? 1.2 : 0.6;
    ctx.beginPath();
    ctx.moveTo(0, yOf(c));
    ctx.lineTo(PW, yOf(c));
    ctx.stroke();
  }
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, PW, PH);
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1.4;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < 88; i++) {
      const absVal = pass === 0 ? UPPER_ABS[i] : LOWER_ABS[i];
      const prevAbsVal = i > 0 ? pass === 0 ? UPPER_ABS[i - 1] : LOWER_ABS[i - 1] : absVal;
      const x0 = xOf(i), x1 = i < 87 ? xOf(i + 1) : xOf(87);
      const y = yOf(absVal);
      if (i === 0) {
        ctx.moveTo(x0, y);
      } else {
        const prevY = yOf(prevAbsVal);
        ctx.lineTo(x0, prevY);
        ctx.lineTo(x0, y);
      }
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#374151";
  ctx.font = "10px 'JetBrains Mono', monospace";
  for (let c = -40; c <= 40; c += 10) {
    const y = yOf(c);
    const label = c > 0 ? `+${c}` : `${c}`;
    ctx.textAlign = "right";
    ctx.fillText(label, -6, y + 3.5);
    ctx.textAlign = "left";
    ctx.fillText(label, PW + 6, y + 3.5);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, y);
    ctx.lineTo(0, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PW, y);
    ctx.lineTo(PW + 4, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#374151";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  A_INDICES.forEach((ki) => {
    const x = xOf(ki);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.lineTo(x, 0);
    ctx.stroke();
    ctx.fillText("A", x, -20);
  });
  ctx.fillStyle = "#6b7280";
  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  [1, 10, 20, 30, 40, 50, 60, 70, 80, 88].forEach((kn) => {
    ctx.fillText(`${kn}`, xOf(kn - 1), PH + 12);
  });
  Object.values(measurements).forEach((m) => {
    const effective = typeof m.strobeCents === "number" ? m.strobeCents : typeof m.cents === "number" && m.cents !== 0 ? m.cents : typeof m.autoCentsRef === "number" ? m.autoCentsRef : null;
    if (effective === null) return;
    const cx = xOf(m.keyIndex);
    const cy = yOf(effective);
    const inRange = effective >= LOWER_ABS[m.keyIndex] && effective <= UPPER_ABS[m.keyIndex];
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = inRange ? "#1e3a5f" : "#dc2626";
    ctx.fill();
    if (typeof m.strobeCents === "number" && m.strobeCents !== effective) {
      const sy = yOf(m.strobeCents);
      ctx.fillStyle = "#ea7a1f";
      ctx.beginPath();
      ctx.moveTo(cx, sy - 4);
      ctx.lineTo(cx - 4, sy + 3);
      ctx.lineTo(cx + 4, sy + 3);
      ctx.closePath();
      ctx.fill();
    }
  });
  const KB_TOP = PH + 16;
  const KB_H = 28;
  const WK_W = PW / 52;
  const whiteKeys = [];
  let wi = 0;
  for (let i = 0; i < 88; i++) {
    if (!PIANO_KEYS[i].isBlack) {
      whiteKeys.push({ ki: i, x: wi * WK_W });
      wi++;
    }
  }
  const blackKeys = [];
  for (let i = 0; i < 88; i++) {
    if (PIANO_KEYS[i].isBlack) {
      const pw = [...whiteKeys].reverse().find((w) => w.ki < i);
      if (pw) blackKeys.push({ ki: i, x: pw.x + WK_W * 0.65 });
    }
  }
  whiteKeys.forEach(({ x }) => {
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 0.5;
    ctx.fillRect(x + 0.3, KB_TOP, WK_W - 0.6, KB_H);
    ctx.strokeRect(x + 0.3, KB_TOP, WK_W - 0.6, KB_H);
  });
  blackKeys.forEach(({ x }) => {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(x, KB_TOP, WK_W * 0.55, KB_H * 0.62);
  });
  ctx.restore();
  ctx.fillStyle = "#374151";
  ctx.font = "bold 13px 'Noto Sans KR', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Piano Tuning Scope", PAD.left, H - 18);
  ctx.font = "12px 'Noto Sans KR', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sessionName, W / 2, H - 18);
  ctx.textAlign = "right";
  const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR");
  ctx.fillText(`성명: ${userName || "___________"}   ${dateStr}`, W - PAD.right, H - 18);
  const count = Object.keys(measurements).length;
  ctx.font = "10px monospace";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "left";
  ctx.fillText(`측정: ${count}/88건반`, PAD.left, H - 4);
  return canvas;
}
function exportToPdf(sessionName, userName, measurements) {
  const canvas = buildGraphCanvas(sessionName, userName, measurements);
  const imgData = canvas.toDataURL("image/png", 1);
  const printWin = window.open("", "_blank");
  if (!printWin) {
    alert("팝업이 차단되었습니다. 팝업을 허용해 주세요.");
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>조율 커브 - ${sessionName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; }
        img { width: 100%; max-width: 1100px; display: block; margin: 0 auto; }
        @page { size: A4 landscape; margin: 10mm; }
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0;
          background: #1e3a5f; padding: 10px 16px;
          display: flex; gap: 10px; align-items: center;
          z-index: 999;
        }
        .btn {
          padding: 8px 20px; border: none; border-radius: 8px;
          font-size: 14px; font-weight: bold; cursor: pointer;
        }
        .btn-print { background: #3b82f6; color: white; }
        .btn-close { background: #6b7280; color: white; }
        .content { padding-top: 56px; }
        @media print {
          .toolbar { display: none; }
          .content { padding-top: 0; }
          body { margin: 0; }
          img { width: 100%; page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <button class="btn btn-print" onclick="window.print()">PDF 저장</button>
        <button class="btn btn-close" onclick="window.close()">닫기</button>
      </div>
      <div class="content">
        <img src="${imgData}" />
      </div>
    </body>
    </html>
  `);
  printWin.document.close();
}
function exportToImage(sessionName, userName, measurements) {
  const canvas = buildGraphCanvas(sessionName, userName, measurements);
  const imgData = canvas.toDataURL("image/png", 1);
  const a = document.createElement("a");
  a.href = imgData;
  a.download = `조율커브_${sessionName.replace(/\s+/g, "_")}_${(/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR").replace(/\./g, "").replace(/\s/g, "")}.png`;
  a.click();
}
export {
  LOWER_ABS as L,
  PIANO_KEYS as P,
  TuningCurveChart as T,
  UPPER_ABS as U,
  usePitchDetector as a,
  useWakeLock as b,
  cn as c,
  exportToImage as d,
  exportToPdf as e,
  centsFromPhaseDelta as f,
  goertzel as g,
  getRMS as h,
  applyHannWindow as i,
  detectPitchYIN as j,
  correctOctaveByHPS as k,
  freqToCentOffset as l,
  median as m,
  targetPartial as t,
  useTuningSession as u
};
