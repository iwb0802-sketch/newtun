import { createFileRoute } from "@tanstack/react-router";
import PitchLabPage from "@/features/tuner/PitchLabPage";

export const Route = createFileRoute("/pitch-lab")({
  component: PitchLabPage,
});
