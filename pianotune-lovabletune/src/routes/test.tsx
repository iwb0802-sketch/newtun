import { createFileRoute } from "@tanstack/react-router";
import TestPage from "@/features/tuner/TestPage";

export const Route = createFileRoute("/test")({
  component: TestPage,
});
