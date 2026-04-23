import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Scissors, UtensilsCrossed, Home } from "lucide-react";
import { login, DEMO_ACCOUNTS } from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  // Autofill with the salon demo account by default.
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      login(email.trim(), password);
      navigate({ to: "/pos" });
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (idx: number) => {
    setEmail(DEMO_ACCOUNTS[idx].email);
    setPassword(DEMO_ACCOUNTS[idx].password);
    setErr(null);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-base font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Home className="h-3.5 w-3.5" />
          </span>
          Archy POS
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a demo account or your own.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => useDemo(0)}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs hover:border-primary">
              <Scissors className="h-3.5 w-3.5 text-primary" /> Salon demo
            </button>
            <button type="button" onClick={() => useDemo(1)}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs hover:border-primary">
              <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> Restaurant demo
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            {err && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-[11px] text-muted-foreground">
          <div className="font-semibold text-foreground">Demo credentials</div>
          {DEMO_ACCOUNTS.map((d) => (
            <div key={d.email} className="mt-1 font-mono">
              <span className="capitalize">{d.role}</span> · {d.email} / {d.password}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
