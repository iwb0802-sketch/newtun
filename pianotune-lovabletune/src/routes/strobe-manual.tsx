import { createFileRoute } from "@tanstack/react-router";
import StrobeManualPage from "@/features/tuner/StrobeManualPage";

export const Route = createFileRoute("/strobe-manual")({
  component: StrobeManualPage,
});
