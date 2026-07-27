// YIN 자기상관 기반 피치 감지 (wontune의 pitchEngine.ts에서 포팅한 핵심 로직)

export function getRMS(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export interface YINParams {
  fMin: number;
  fMax: number;
  threshold: number;
}

export function detectPitchYIN(buf: Float32Array, sr: number, params: YINParams): number {
  const { fMin, fMax, threshold } = params;
  const half = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sr / fMax));
  const tauMax = Math.min(half - 1, Math.ceil(sr / fMin));
  const yinBuf = new Float32Array(half);

  for (let tau = tauMin; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < half; i++) {
      const d = buf[i] - buf[i + tau];
      s += d * d;
    }
    yinBuf[tau] = s;
  }

  yinBuf[0] = 1;
  let rs = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    rs += yinBuf[tau];
    if (rs > 0) yinBuf[tau] *= tau / rs;
  }

  let tau = tauMin;
  while (tau <= tauMax) {
    if (yinBuf[tau] < threshold) {
      while (tau + 1 <= tauMax && yinBuf[tau + 1] < yinBuf[tau]) tau++;
      break;
    }
    tau++;
  }
  if (tau > tauMax || yinBuf[tau] >= threshold) return -1;

  let bt = tau;
  if (tau > tauMin && tau < tauMax) {
    const s0 = yinBuf[tau - 1], s1 = yinBuf[tau], s2 = yinBuf[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) bt = tau + (s2 - s0) / denom;
  }
  return sr / bt;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function freqToNote(freq: number): { noteName: string; octave: number; cents: number } | null {
  if (freq <= 0) return null;
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  const midiRound = Math.round(midiFloat);
  const octave = Math.floor(midiRound / 12) - 1;
  const noteName = NOTE_NAMES[((midiRound % 12) + 12) % 12];
  const cents = (midiFloat - midiRound) * 100;
  return { noteName, octave, cents };
}

// ── 88건반(피아노) 테이블 — 타겟 건반 선택용 ─────────────────────────
export interface PianoKey {
  keyNumber: number; // 1~88
  midi: number;
  noteName: string;
  octave: number;
  freq: number;
}

export const PIANO_KEYS: PianoKey[] = Array.from({ length: 88 }, (_, i) => {
  const midi = i + 21;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = NOTE_NAMES[midi % 12];
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  return { keyNumber: i + 1, midi, noteName, octave, freq };
});

// 감지된 주파수를 타겟 건반 주파수의 옥타브로 접어서(옥타브 오인식 무시) 센트 오차만 계산
// (실제 wontune 엔진의 foldToBaseOctave와 같은 개념 — "이 건반에 집중"하는 방식)
export function foldToTargetCents(freq: number, targetFreq: number): number {
  let f = freq;
  while (f > targetFreq * Math.SQRT2) f /= 2;
  while (f < targetFreq / Math.SQRT2) f *= 2;
  return Math.round(1200 * Math.log2(f / targetFreq) * 10) / 10;
}

