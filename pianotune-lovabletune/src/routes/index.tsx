import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/features/tuner/Home";
import AuthPage from "@/features/tuner/AuthPage";

function IndexPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">🎹</span>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Home />;
}

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Piano Tuning Scope" },
      { name: "description", content: "전문가용 피아노 조율 스코프 — 실시간 피치 감지, 스트로보 튜너, 88건반 조율 곡선 시각화." },
    ],
  }),
  component: IndexPage,
});
