/**
 * pitchEngine.ts — v3
 * 파트별 최적 피치 분석 엔진
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 저음 (keyIndex  0~26, A0~D3)                                    │
 * │  - 버퍼 8192 필수 (27Hz = 주기 1633샘플, 최소 2주기 필요)        │
 * │  - YIN: fMin=20, fMax=200, threshold 적응형                     │
 * │  - 동적 배음 선택 (6/4/2 중 Goertzel magnitude 최강)            │
 * │  - Coarse(1¢) → Fine(0.2¢) 2단계 Goertzel 스캔                 │
 * │  - 옥타브 폴딩 마진 넓게 (×2 이내)                              │
 * │  - 안정화: RMS decay + 센트 표준편차 < 1.5¢ 동시 충족           │
 * │                                                                 │
 * │ 중음 (keyIndex 27~51, D#3~B4)                                   │
 * │  - 버퍼 4096                                                    │
 * │  - YIN: fMin=140, fMax=600, threshold 0.10                     │
 * │  - Goertzel: 2배음 기준, Coarse(2¢) → Fine(0.5¢)              │
 * │  - YIN + Goertzel 교차검증 ±6¢ 이내 → 가중평균                 │
 * │  - 안정화: RMS decay + 표준편차 < 1.0¢                         │
 * │                                                                 │
 * │ 고음 (keyIndex 52~87, C5~C8)                                    │
 * │  - 버퍼 4096 (고음은 주기 짧아서 충분)                          │
 * │  - YIN: fMin=500, fMax=5000, threshold 적응형(0.08~0.13)        │
 * │  - Goertzel: 기본음 기준, Coarse(2¢) → Fine(0.5¢)             │
 * │  - HPS 보정 비활성화 (배음 희박 → 오탐 위험)                    │
 * │  - 안정화: 표준편차 < 1.5¢, 짧은 decay(500ms)                  │
 * └─────────────────────────────────────────────────────────────────┘
 */

export const A0_FREQ = 27.5;
export const A4_FREQ = 440;
export const C8_FREQ = 4186.01;

// ─── 음역대 판별 ────────────────────────────────────────────────────
export type Zone = "low" | "mid" | "high";

export function getZone(keyIndex: number): Zone {
  if (keyIndex <= 26) return "low";
  if (keyIndex <= 51) return "mid";
  return "high";
}

// 음역대별 권장 FFT 버퍼 사이즈
export function getBufferSize(zone: Zone): 4096 | 8192 {
  return zone === "low" ? 8192 : 4096;
}

// ─── 기본 유틸 ──────────────────────────────────────────────────────
export function applyHannWindow(buf: Float32Array): Float32Array {
  const N = buf.length;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    out[i] = buf[i] * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
  return out;
}

export function getRMS(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

export function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

// ─── YIN (파트별 파라미터) ───────────────────────────────────────────
export interface YINParams {
  fMin: number;
  fMax: number;
  threshold: number;
}

export function getYINParams(zone: Zone, rms: number): YINParams {
  // threshold를 RMS 기반으로 적응형으로 조절
  // 신호가 약할수록 threshold 낮춰서 민감도 높임 (단, 최솟값 제한)
  switch (zone) {
    case "low":
      return {
        fMin: 20,
        fMax: 200,
        // 저음: 배음이 강해 기본음 감지 어려움 → threshold 낮게
        threshold: Math.max(0.08, Math.min(0.12, 0.15 - rms * 0.5)),
      };
    case "mid":
      return {
        fMin: 140,
        fMax: 600,
        threshold: 0.10,
      };
    case "high":
      return {
        fMin: 450,
        fMax: 6000,
        // 고음: 배음 희박하고 decay 빠름 → 약한 신호도 잡아야 함
        threshold: Math.max(0.07, Math.min(0.12, 0.16 - rms * 0.8)),
      };
  }
}

export function detectPitchYIN(
  buf: Float32Array,
  sr: number,
  params: YINParams
): number {
  const { fMin, fMax, threshold } = params;
  const half = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sr / fMax));
  const tauMax = Math.min(half - 1, Math.ceil(sr / fMin));
  const yin = new Float32Array(half);

  for (let tau = tauMin; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < half; i++) {
      const d = buf[i] - buf[i + tau];
      s += d * d;
    }
    yin[tau] = s;
  }

  // cumulative mean normalized difference
  yin[0] = 1;
  let rs = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    rs += yin[tau];
    if (rs > 0) yin[tau] *= tau / rs;
  }

  // 최소값 탐색
  let tau = tauMin;
  while (tau <= tauMax) {
    if (yin[tau] < threshold) {
      while (tau + 1 <= tauMax && yin[tau + 1] < yin[tau]) tau++;
      break;
    }
    tau++;
  }
  if (tau > tauMax || yin[tau] >= threshold) return -1;

  // parabolic interpolation
  let bt = tau;
  if (tau > tauMin && tau < tauMax) {
    const s0 = yin[tau - 1], s1 = yin[tau], s2 = yin[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) bt = tau + (s2 - s0) / denom;
  }
  return sr / bt;
}

// ─── 옥타브 폴딩 (파트별 마진) ──────────────────────────────────────
export function foldToBaseOctave(
  fYin: number,
  baseFreq: number,
  zone: Zone
): number {
  let f = fYin;
  // 저음은 배음이 강해서 기본음을 2~6배음으로 잡기 쉬움 → 넓은 마진
  const upperMargin = zone === "low" ? 3.5 : 1.5;
  const lowerMargin = zone === "low" ? 0.4 : 0.67;
  while (f > baseFreq * upperMargin) f /= 2;
  while (f < baseFreq * lowerMargin) f *= 2;
  return f;
}

// ─── Goertzel ────────────────────────────────────────────────────────
export function goertzel(
  buf: Float32Array,
  sr: number,
  targetFreq: number
): { real: number; imag: number; magnitude: number; phase: number } {
  const N = buf.length;
  const k = (N * targetFreq) / sr;
  const w = (2 * Math.PI * k) / N;
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
    real, imag,
    magnitude: Math.sqrt(real * real + imag * imag) / N,
    phase: Math.atan2(imag, real),
  };
}

// ─── 2단계 Goertzel 스캔 (Coarse → Fine) ────────────────────────────
// 1단계: 넓은 범위를 굵은 스텝으로 피크 탐색
// 2단계: 피크 ±(coarseStep×2) 구간을 fineStep으로 정밀 탐색
export interface GoertzelScanResult {
  bestFreq: number;       // 측정된 실제 주파수 (배음 포함)
  bestMagnitude: number;
  centsOffset: number;    // 기본음 기준 cent 오프셋
}

export function goertzelTwoPassScan(
  buf: Float32Array,
  sr: number,
  targetFreq: number,   // 기본음 × partial (배음 주파수)
  baseFreq: number,     // 건반 기본음
  partial: number,
  zone: Zone
): GoertzelScanResult {
  // 파트별 스캔 파라미터
  const coarseStep = zone === "low" ? 1.0 : 2.0;   // ¢
  const fineStep   = zone === "low" ? 0.2 : 0.5;   // ¢
  const scanRange  = zone === "high" ? 80 : 50;     // ±¢

  // 1단계: Coarse scan
  const coarseSteps = Math.round(scanRange / coarseStep);
  let bestFreq = targetFreq;
  let bestMag  = -1;
  for (let i = -coarseSteps; i <= coarseSteps; i++) {
    const f = targetFreq * Math.pow(2, (i * coarseStep) / 1200);
    const mag = goertzel(buf, sr, f).magnitude;
    if (mag > bestMag) { bestMag = mag; bestFreq = f; }
  }

  // 2단계: Fine scan (coarse 피크 ±coarseStep×2 구간)
  const fineRange = coarseStep * 2;
  const fineSteps = Math.round(fineRange / fineStep);
  let fineBestFreq = bestFreq;
  let fineBestMag  = -1;
  for (let i = -fineSteps; i <= fineSteps; i++) {
    const f = bestFreq * Math.pow(2, (i * fineStep) / 1200);
    const mag = goertzel(buf, sr, f).magnitude;
    if (mag > fineBestMag) { fineBestMag = mag; fineBestFreq = f; }
  }

  const measuredBase = fineBestFreq / partial;
  const centsOffset  = 1200 * Math.log2(measuredBase / baseFreq);

  return {
    bestFreq: fineBestFreq,
    bestMagnitude: fineBestMag,
    centsOffset: Math.round(centsOffset * 10) / 10,
  };
}

// ─── PT-100식 타겟 배음 (고정 fallback) ─────────────────────────────
export function targetPartial(keyIndex: number): number {
  if (keyIndex < 12) return 6;   // A0–G#1
  if (keyIndex < 24) return 4;   // A1–G#2
  if (keyIndex < 36) return 2;   // A2–G#3
  return 1;
}

// ─── 동적 배음 선택 (저음 전용) ─────────────────────────────────────
// 실제 버퍼에서 후보 배음의 Goertzel magnitude를 비교해 가장 강한 배음 선택
const MIN_GAIN_RATIO = 1.25; // 후보가 25% 이상 강해야 교체

export function selectBestPartial(
  buf: Float32Array,
  sr: number,
  keyIndex: number,
  baseFreq: number
): number {
  const fallback = targetPartial(keyIndex);
  if (keyIndex > 26) return fallback; // 저음 전용

  const candidates = [2, 4, 6].filter(
    p => baseFreq * p < sr / 2 && baseFreq * p > 40
  );
  if (!candidates.length) return fallback;

  let best = fallback;
  let bestMag = goertzel(buf, sr, baseFreq * fallback).magnitude;

  for (const p of candidates) {
    if (p === fallback) continue;
    const mag = goertzel(buf, sr, baseFreq * p).magnitude;
    if (mag > bestMag * MIN_GAIN_RATIO) { bestMag = mag; best = p; }
  }
  return best;
}

// ─── HPS 옥타브 보정 (중음 이하만) ─────────────────────────────────
// 고음(keyIndex >= 52)은 HPS 비활성화
export function correctOctaveByHPS(
  fYin: number,
  spectrumDb: Float32Array,
  sr: number,
  fftSize: number,
  keyIndex: number
): number {
  if (keyIndex >= 52 || fYin <= 0) return fYin;

  const numHarmonics = keyIndex <= 26 ? 6 : 4; // 저음은 6배음까지
  const binHz = sr / fftSize;
  const N = spectrumDb.length;

  const magAt = (freq: number): number => {
    const bin = Math.round(freq / binHz);
    if (bin < 1 || bin >= N) return 0;
    let maxDb = -Infinity;
    for (let d = -1; d <= 1; d++) {
      const b = bin + d;
      if (b >= 1 && b < N && spectrumDb[b] > maxDb) maxDb = spectrumDb[b];
    }
    if (maxDb < -90) return 0;
    return Math.pow(10, maxDb / 20);
  };

  const candidates: number[] = [];
  const maxDiv = keyIndex <= 26 ? 6 : 3;
  for (let div = 1; div <= maxDiv; div++) {
    const c = fYin / div;
    if (c >= A0_FREQ * 0.97) candidates.push(c);
  }

  const score = (c: number) => {
    let s = 0;
    for (let k = 1; k <= numHarmonics; k++) {
      if (k * c > sr / 2) break;
      s += magAt(k * c);
    }
    return s;
  };

  let bestC = fYin;
  let bestS = score(fYin);
  for (const c of candidates) {
    if (c === fYin) continue;
    const s = score(c);
    // 저음은 서브하모닉 교체 마진 낮춤 (배음 오탐 빈번)
    const margin = keyIndex <= 26 ? 1.10 : 1.15;
    if (s > bestS * margin) { bestS = s; bestC = c; }
  }
  return bestC;
}

// ─── 안정화 판정 (RMS decay + 센트 표준편차) ───────────────────────
export interface StabilityConfig {
  peakRatio: number;      // rms < peak * peakRatio 이면 decay 구간
  peakThreshold: number;  // 최소 피크 RMS
  maxStddev: number;      // 센트 표준편차 한계
  durationMs: number;     // 안정 유지 시간
  minSamples: number;     // 최소 샘플 수
}

export function getStabilityConfig(zone: Zone): StabilityConfig {
  switch (zone) {
    case "low":
      return {
        peakRatio:     0.60,  // 저음: 긴 sustain, 천천히 decay
        peakThreshold: 0.012,
        maxStddev:     1.5,   // ¢
        durationMs:    1100,
        minSamples:    10,
      };
    case "mid":
      return {
        peakRatio:     0.55,
        peakThreshold: 0.015,
        maxStddev:     1.0,
        durationMs:    900,
        minSamples:    8,
      };
    case "high":
      return {
        peakRatio:     0.40,  // 고음: 빠른 decay 허용
        peakThreshold: 0.006,
        maxStddev:     2.0,
        durationMs:    450,
        minSamples:    5,
      };
  }
}

// ─── 위상차 → cent ───────────────────────────────────────────────────

// --- FFT Peak freq (rough zone detection before YIN) ---
export function getFFTPeakFreq(
  spec: Float32Array,
  sr: number,
  fftSize: number,
  fMin = 200,
  fMax = 8000
): number {
  const binHz = sr / fftSize;
  const binMin = Math.max(1, Math.floor(fMin / binHz));
  const binMax = Math.min(spec.length - 1, Math.ceil(fMax / binHz));
  let peakBin = binMin;
  let peakVal = -Infinity;
  for (let i = binMin; i <= binMax; i++) {
    if (spec[i] > peakVal) { peakVal = spec[i]; peakBin = i; }
  }
  return peakBin * binHz;
}

export function centsFromPhaseDelta(
  prevPhase: number,
  currPhase: number,
  dtSec: number,
  targetFreq: number
): number {
  let dp = currPhase - prevPhase;
  while (dp > Math.PI)  dp -= 2 * Math.PI;
  while (dp < -Math.PI) dp += 2 * Math.PI;
  const actual = targetFreq + dp / (2 * Math.PI * dtSec);
  if (actual <= 0) return 0;
  return 1200 * Math.log2(actual / targetFreq);
}

// ─────────────────────────────────────────────────────────────────────
// ─── TWM (Two-Way Mismatch) — 인하모니시티 반영 f0+B 동시 추정 ───────
// Maher & Beauchamp (1994) 방식의 단순화 구현.
// 피아노 현의 강성 때문에 배음이 fn = n·f0·√(1+B·n²) 로 늘어나는 걸
// 후보(f0, B) 그리드서치로 동시에 찾아냄 → YIN 사후보정보다 원리적으로 정확.
// ─────────────────────────────────────────────────────────────────────

interface SpectralPeak { freq: number; mag: number; }

// dB 스펙트럼에서 로컬 피크 추출 (파라볼릭 보간으로 서브빈 정밀도 확보)
function extractPeaks(
  spectrumDb: Float32Array,
  sr: number,
  fftSize: number,
  fMin: number,
  fMax: number,
  maxPeaks = 12
): SpectralPeak[] {
  const binHz = sr / fftSize;
  const binMin = Math.max(1, Math.floor(fMin / binHz));
  const binMax = Math.min(spectrumDb.length - 2, Math.ceil(fMax / binHz));
  const peaks: SpectralPeak[] = [];

  for (let i = binMin; i <= binMax; i++) {
    const c = spectrumDb[i];
    if (c < -85) continue;
    if (c > spectrumDb[i - 1] && c >= spectrumDb[i + 1]) {
      const l = spectrumDb[i - 1], r = spectrumDb[i + 1];
      const denom = l - 2 * c + r;
      const delta = denom !== 0 ? 0.5 * (l - r) / denom : 0;
      const freq = (i + delta) * binHz;
      const mag = Math.pow(10, c / 20);
      peaks.push({ freq, mag });
    }
  }
  peaks.sort((a, b) => b.mag - a.mag);
  return peaks.slice(0, maxPeaks);
}

// 후보 (f0, B)에 대한 양방향 불일치 오차 (cents 단위, 진폭 가중)
function twmError(peaks: SpectralPeak[], f0: number, B: number, numPartials: number): number {
  const maxMag = peaks.reduce((m, p) => Math.max(m, p.mag), 1e-9);
  const predicted: number[] = [];
  for (let n = 1; n <= numPartials; n++) {
    predicted.push(n * f0 * Math.sqrt(1 + B * n * n));
  }
  const pMax = predicted[predicted.length - 1] * 1.5;

  // 예측 → 최근접 측정 피크
  let err1 = 0;
  for (const pf of predicted) {
    let best = Infinity;
    for (const pk of peaks) {
      const d = Math.abs(pk.freq - pf);
      if (d < best) best = d;
    }
    err1 += Math.abs(1200 * Math.log2(Math.max(pf + best, 1) / pf));
  }
  err1 /= predicted.length;

  // 측정 → 최근접 예측 배음 (진폭 가중)
  let err2 = 0, wsum = 0;
  for (const pk of peaks) {
    if (pk.freq > pMax) continue;
    let best = Infinity, bestPf = pk.freq;
    for (const pf of predicted) {
      const d = Math.abs(pk.freq - pf);
      if (d < best) { best = d; bestPf = pf; }
    }
    const w = pk.mag / maxMag;
    err2 += Math.abs(1200 * Math.log2(Math.max(pk.freq, 1) / Math.max(bestPf, 1))) * w;
    wsum += w;
  }
  if (wsum > 0) err2 /= wsum;

  return err1 + err2;
}

export interface TWMResult { f0: number; B: number; error: number; }

/**
 * f0Guess(YIN+HPS 보정 이후 값) 근방 ±40¢, B는 구간별 범위에서
 * 그리드서치로 (f0, B) 동시 추정. 배음이 2개 미만이면 무의미하므로 null.
 */
export function refineByTWM(
  spectrumDb: Float32Array,
  sr: number,
  fftSize: number,
  f0Guess: number,
  zone: Zone
): TWMResult | null {
  if (f0Guess <= 0) return null;

  const numPartials = zone === "low" ? 8 : zone === "mid" ? 6 : 4;
  const bMax = zone === "low" ? 0.0020 : zone === "mid" ? 0.0006 : 0.0002;
  const bSteps = 6;
  const centsRange = 40;
  const f0Steps = 8;

  const peaks = extractPeaks(spectrumDb, sr, fftSize, f0Guess * 0.5, f0Guess * numPartials * 1.6);
  if (peaks.length < 2) return null;

  let bestF0 = f0Guess, bestB = 0, bestErr = Infinity;
  for (let bi = 0; bi <= bSteps; bi++) {
    const B = (bi / bSteps) * bMax;
    for (let fi = -f0Steps; fi <= f0Steps; fi++) {
      const f0 = f0Guess * Math.pow(2, (fi * (centsRange / f0Steps)) / 1200);
      const err = twmError(peaks, f0, B, numPartials);
      if (err < bestErr) { bestErr = err; bestF0 = f0; bestB = B; }
    }
  }

  return { f0: bestF0, B: bestB, error: bestErr };
}

// ─────────────────────────────────────────────────────────────────────
// ─── Partial-Fit v2 — refineByTWM의 2단계(coarse→fine) 고정밀 버전 ───
// 기존 refineByTWM은 f0×B 그리드를 한 번에(coarse만) 스캔해서 격자
// 간격 이상으로는 정밀해질 수 없음. v2는:
//   1) 기존과 동일한 넓은 coarse 그리드로 대략적인 (f0, B) 위치를 찾고
//   2) 그 주변을 훨씬 촘촘한 fine 그리드로 재탐색 (Goertzel 2단계 스캔과 동일 아이디어)
//   3) 저음은 살아있는 배음이 많으므로 numPartials를 8→최대 14까지 늘려
//      (나이퀴스트 한도 내에서) 더 많은 데이터로 f0/B를 추정 — 배음 몇 개만
//      보고 판단하는 것보다 통계적으로 안정적 (Rigaud et al. 2013 방식과 동일 원리)
// 시험용2 탭 전용 — 기존 refineByTWM/시험용 탭은 변경 없이 그대로 유지.
// ─────────────────────────────────────────────────────────────────────
export function refineByPartialFitV2(
  spectrumDb: Float32Array,
  sr: number,
  fftSize: number,
  f0Guess: number,
  zone: Zone
): TWMResult | null {
  if (f0Guess <= 0) return null;

  // 저음일수록 배음이 더 많이 살아있으므로 더 많은 배음을 활용 (나이퀴스트 한도 내)
  const maxPartials = zone === "low" ? 14 : zone === "mid" ? 8 : 5;
  const nyquistCap = Math.floor((sr / 2) / f0Guess);
  const numPartials = Math.max(2, Math.min(maxPartials, nyquistCap));

  const bMaxCoarse = zone === "low" ? 0.0035 : zone === "mid" ? 0.0010 : 0.0003;

  const peaks = extractPeaks(spectrumDb, sr, fftSize, f0Guess * 0.5, f0Guess * numPartials * 1.6, 20);
  if (peaks.length < 3) return null; // 배음 3개 미만이면 다중배음 피팅 의미 없음 → 폴백

  // ── 1단계: coarse 그리드 (기존 refineByTWM과 동일한 넓은 탐색 범위) ──
  const coarseF0Steps = 10;
  const coarseBSteps = 10;
  const centsRangeCoarse = 40;

  let bestF0 = f0Guess, bestB = 0, bestErr = Infinity;
  for (let bi = 0; bi <= coarseBSteps; bi++) {
    const B = (bi / coarseBSteps) * bMaxCoarse;
    for (let fi = -coarseF0Steps; fi <= coarseF0Steps; fi++) {
      const f0 = f0Guess * Math.pow(2, (fi * (centsRangeCoarse / coarseF0Steps)) / 1200);
      const err = twmError(peaks, f0, B, numPartials);
      if (err < bestErr) { bestErr = err; bestF0 = f0; bestB = B; }
    }
  }

  // ── 2단계: coarse 최적점 주변을 훨씬 촘촘하게 재탐색 (정밀도 향상) ──
  const fineF0Steps = 8;
  const fineBSteps = 8;
  const centsRangeFine = (centsRangeCoarse / coarseF0Steps) * 1.5; // coarse 격자 간격의 1.5배
  const bRangeFine = (bMaxCoarse / coarseBSteps) * 1.5;

  let fineBestF0 = bestF0, fineBestB = bestB, fineBestErr = bestErr;
  for (let bi = -fineBSteps; bi <= fineBSteps; bi++) {
    const B = Math.max(0, bestB + (bi / fineBSteps) * bRangeFine);
    for (let fi = -fineF0Steps; fi <= fineF0Steps; fi++) {
      const f0 = bestF0 * Math.pow(2, (fi * (centsRangeFine / fineF0Steps)) / 1200);
      const err = twmError(peaks, f0, B, numPartials);
      if (err < fineBestErr) { fineBestErr = err; fineBestF0 = f0; fineBestB = B; }
    }
  }

  return { f0: fineBestF0, B: fineBestB, error: fineBestErr };
}

