import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import StrobeManualPage from "@/features/tuner/StrobeManualPage";
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

  return <StrobeManualPage />;
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
