import { createFileRoute } from "@tanstack/react-router";
import StrobeManualPage2 from "@/features/tuner/StrobeManualPage2";

export const Route = createFileRoute("/strobe-manual-2")({
  component: StrobeManualPage2,
});
