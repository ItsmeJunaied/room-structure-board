import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Scissors, UtensilsCrossed } from "lucide-react";
import { signup, type UserRole } from "@/lib/auth";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("salon");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      signup({ name: name.trim(), email: email.trim(), password, role });
      navigate({ to: "/editor" });
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
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
          <h1 className="text-xl font-semibold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your business type to load the matching POS.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Business type</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRole("salon")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${role === "salon" ? "border-primary bg-accent/40 text-foreground" : "border-border hover:bg-secondary"}`}>
                  <Scissors className="h-3.5 w-3.5" /> Salon
                </button>
                <button type="button" onClick={() => setRole("restaurant")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${role === "restaurant" ? "border-primary bg-accent/40 text-foreground" : "border-border hover:bg-secondary"}`}>
                  <UtensilsCrossed className="h-3.5 w-3.5" /> Restaurant
                </button>
              </div>
            </div>

            <label className="block text-xs font-medium text-muted-foreground">
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>

            {err && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {err}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
