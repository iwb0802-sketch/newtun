/**
 * useManualSequence.ts
 * 수동 조율 페이지의 구간/진행 상태 훅
 *
 * 구간 (0-indexed keyIndex):
 *  - middle: A4(48) 기준 시작 → A4~A5(48→60) 위로, 그다음 A4 아래(47→27) — 총 34건반, 1-indexed 49~61, 28~48
 *  - lower:  26→0  (1-indexed: 27→1,  1번~C3)
 *  - upper:  61→87 (1-indexed: 62→88, A5~88번)
 */
import { useCallback, useMemo, useState } from "react";

export type ManualSection = "middle" | "lower" | "upper";

function range(start: number, endInclusive: number, step: number): number[] {
  const out: number[] = [];
  if (step > 0) {
    for (let v = start; v <= endInclusive; v += step) out.push(v);
  } else {
    for (let v = start; v >= endInclusive; v += step) out.push(v);
  }
  return out;
}

export const SECTION_ORDERS: Record<ManualSection, number[]> = {
  // A4(keyIndex 48, 건반49)부터 시작 — 위로 A5까지, 그다음 아래로 이어짐
  middle: [...range(48, 60, 1), ...range(47, 27, -1)],
  lower: range(26, 0, -1),
  upper: range(61, 87, +1),
};

export const SECTION_LABELS: Record<ManualSection, string> = {
  middle: "중앙값",
  lower: "하부값",
  upper: "상부값",
};

export interface UseManualSequenceReturn {
  section: ManualSection;
  setSection: (s: ManualSection) => void;
  indexInOrder: number;
  total: number;
  targetKeyIndex: number;
  canPrev: boolean;
  canNext: boolean;
  prev: () => void;
  next: () => void;
  jumpTo: (keyIndex: number) => void;
}

export function useManualSequence(): UseManualSequenceReturn {
  const [section, setSectionState] = useState<ManualSection>("middle");
  // 각 구간별 진행 인덱스 보관
  const [indices, setIndices] = useState<Record<ManualSection, number>>({
    middle: 0,
    lower: 0,
    upper: 0,
  });

  const order = SECTION_ORDERS[section];
  const indexInOrder = indices[section];
  const targetKeyIndex = order[indexInOrder];
  const total = order.length;

  const setSection = useCallback((s: ManualSection) => {
    setSectionState(s);
  }, []);

  const prev = useCallback(() => {
    setIndices((prev) => ({
      ...prev,
      [section]: Math.max(0, prev[section] - 1),
    }));
  }, [section]);

  const next = useCallback(() => {
    setIndices((prev) => ({
      ...prev,
      [section]: Math.min(SECTION_ORDERS[section].length - 1, prev[section] + 1),
    }));
  }, [section]);

  // 임의의 건반(keyIndex)으로 직접 점프 — 키패드 등에서 사용
  const jumpTo = useCallback((keyIndex: number) => {
    for (const sec of ["lower", "middle", "upper"] as ManualSection[]) {
      const idx = SECTION_ORDERS[sec].indexOf(keyIndex);
      if (idx !== -1) {
        setSectionState(sec);
        setIndices((prev) => ({ ...prev, [sec]: idx }));
        return;
      }
    }
  }, []);

  return useMemo(
    () => ({
      section,
      setSection,
      indexInOrder,
      total,
      targetKeyIndex,
      canPrev: indexInOrder > 0,
      canNext: indexInOrder < total - 1,
      prev,
      next,
      jumpTo,
    }),
    [section, setSection, indexInOrder, total, targetKeyIndex, prev, next, jumpTo]
  );
}
