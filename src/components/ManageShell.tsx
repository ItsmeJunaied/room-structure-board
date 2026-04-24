import { Link, useNavigate } from "@tanstack/react-router";
import {
  Home, LogOut, Receipt, Users, Wallet, BarChart3, Pencil, ArrowLeft,
} from "lucide-react";
import { logout, getCurrentUser } from "@/lib/auth";

export interface StatCard {
  label: string;
  value: string;
  hint?: string;
}

interface Props {
  active: "sales" | "staff" | "expense";
  title: string;
  subtitle?: string;
  stats?: StatCard[];
  /** Right-side header actions (e.g. + Add button) */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const NAV: { id: Props["active"]; to: string; label: string; icon: typeof Receipt }[] = [
  { id: "sales",   to: "/sales",   label: "Sales Table",    icon: Receipt },
  { id: "staff",   to: "/user",    label: "Staff Schedule", icon: Users },
  { id: "expense", to: "/expense", label: "Expense List",   icon: Wallet },
];

export function ManageShell({ active, title, subtitle, stats, actions, children }: Props) {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  const role = user?.role ?? "salon";

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1700px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link to="/pos" className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy POS
            </Link>
            <span className="rounded-full bg-accent/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
              {role === "salon" ? "Salon" : "Restaurant"}
            </span>
            <nav className="ml-3 hidden items-center gap-1 md:flex">
              <NavTab to="/pos"     icon={Receipt} label="POS" />
              <NavTab to="/sales"   icon={BarChart3} label="Sales" active={active === "sales"} />
              <NavTab to="/user"    icon={Users}   label="Staff" active={active === "staff"} />
              <NavTab to="/expense" icon={Wallet}  label="Expense" active={active === "expense"} />
            </nav>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/editor" className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-foreground hover:bg-secondary">
              <Pencil className="h-3.5 w-3.5" /> Floor plan
            </Link>
            {user && <span className="hidden lg:inline">{user.email}</span>}
            <button onClick={() => { logout(); navigate({ to: "/login" }); }} title="Logout"
              className="rounded-md p-2 hover:bg-secondary">
              <LogOut className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="hidden w-[220px] flex-col border-r border-border bg-card md:flex">
            <div className="p-3">
              <Link to="/pos" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to POS
              </Link>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 p-2">
              {NAV.map(n => {
                const isActive = n.id === active;
                return (
                  <Link key={n.id} to={n.to}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Title bar */}
            <div className="flex items-start justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              {actions}
            </div>

            {/* Stats strip */}
            {stats && stats.length > 0 && (
              <div className="grid gap-3 border-b border-border bg-canvas px-5 py-4 md:grid-cols-4">
                {stats.map(s => (
                  <div key={s.label} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-xl font-bold text-foreground">{s.value}</div>
                    {s.hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{s.hint}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavTab({ to, icon: Icon, label, active }: { to: string; icon: typeof Receipt; label: string; active?: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}
