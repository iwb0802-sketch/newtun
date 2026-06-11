import { createFileRoute } from "@tanstack/react-router";
import Home from "@/features/tuner/Home";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Piano Tuning Scope" },
      { name: "description", content: "전문가용 피아노 조율 스코프 — 실시간 피치 감지, 스트로보 튜너, 88건반 조율 곡선 시각화." },
    ],
  }),
  component: Home,
});
