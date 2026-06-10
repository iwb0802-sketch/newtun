import { createFileRoute } from "@tanstack/react-router";
import ManualPage from "@/features/tuner/ManualPage";

export const Route = createFileRoute("/manual")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "수동 조율 — Piano Tuning Scope" },
      {
        name: "description",
        content:
          "목표 음을 하나씩 직접 조율하는 수동 모드. 중앙값/하부값/상부값 구간 별로 진행하며, 화면에 표시된 음과 일치할 때만 기록됩니다.",
      },
      { property: "og:title", content: "수동 조율 — Piano Tuning Scope" },
      {
        property: "og:description",
        content: "구간별 단계 진행 수동 조율 모드 — 잘못된 음은 경고, 일치 시 자동 기록.",
      },
    ],
  }),
  component: ManualPage,
});
