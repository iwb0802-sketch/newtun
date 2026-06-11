import { createFileRoute } from "@tanstack/react-router";
import ManualPage from "@/features/tuner/ManualPage";

export const Route = createFileRoute("/manual")({
  component: ManualPage,
});
