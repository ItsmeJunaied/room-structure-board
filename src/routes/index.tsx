import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: IndexRedirect });

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) navigate({ to: "/login" });
    else navigate({ to: "/pos" });
  }, [navigate]);
  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
