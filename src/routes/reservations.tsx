import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home, Receipt, BarChart3, User as UserIcon, Wallet, CalendarDays, LogOut,
  Plus, Trash2, Check, Clock, X, Search,
} from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  loadBoards, loadReservations, saveReservations,
  type Reservation,
} from "@/lib/storage";
import type { Furniture } from "@/lib/floorplan-types";

export const Route = createFileRoute("/reservations")({ component: ReservationsPage });

function ReservationsPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const role = user?.role ?? "salon";
  const boardKind = role === "salon" ? "salon" : "restaurant";
  const spotLabelSingular = role === "salon" ? "Chair" : "Table";

  const [items, setItems] = useState<Reservation[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Reservation["status"]>("all");
  const [showForm, setShowForm] = useState(false);

  // Load data
  const [spots, setSpots] = useState<Furniture[]>([]);
  useEffect(() => {
    if (!user) return;
    setItems(loadReservations(user.email));
    const all = loadBoards(user.email);
    const board = all ? all[boardKind] : null;
    const isSpot = (f: Furniture) => {
      if (f.orderable === false) return false;
      if (f.orderable === true) return true;
      return role === "salon"
        ? (f.type === "salon-chair" || f.type === "massage-bed" || f.type === "shampoo-chair")
        : (f.type === "dining-rect" || f.type === "dining-round" || f.type === "dining-square" || f.type === "booth");
    };
    setSpots((board?.furniture ?? []).filter(isSpot));
  }, [user, boardKind, role]);

  const persist = (next: Reservation[]) => {
    if (!user) return;
    setItems(next);
    saveReservations(user.email, next);
  };

  const spotLabelFor = (f: Furniture, idx: number) =>
    f.tableNo ? `${spotLabelSingular} ${f.tableNo}` : `${spotLabelSingular} ${idx + 1}`;

  const filtered = useMemo(() => {
    return items
      .filter(r => filter === "all" || r.status === filter)
      .filter(r => search === "" ||
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search) ||
        (r.spotLabel ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.when.localeCompare(b.when));
  }, [items, filter, search]);

  const counts = useMemo(() => ({
    pending: items.filter(r => r.status === "pending").length,
    confirmed: items.filter(r => r.status === "confirmed").length,
    seated: items.filter(r => r.status === "seated").length,
    today: items.filter(r => r.when.slice(0, 10) === new Date().toISOString().slice(0, 10) && r.status !== "cancelled").length,
  }), [items]);

  const setStatus = (id: string, status: Reservation["status"]) =>
    persist(items.map(r => r.id === id ? { ...r, status } : r));
  const remove = (id: string) => persist(items.filter(r => r.id !== id));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1700px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy POS
            </div>
            <span className="rounded-full bg-accent/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
              {role === "salon" ? "Salon" : "Restaurant"}
            </span>
            <nav className="ml-3 hidden items-center gap-1 md:flex">
              <NavTab to="/pos"          icon={Receipt}      label="POS" />
              <NavTab to="/reservations" icon={CalendarDays} label="Reservations" active />
              <NavTab to="/sales"        icon={BarChart3}    label="Sales" />
              <NavTab to="/user"         icon={UserIcon}     label="Staff" />
              <NavTab to="/expense"      icon={Wallet}       label="Expense" />
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden lg:inline">{user.email}</span>
            <button onClick={() => { logout(); navigate({ to: "/login" }); }} title="Logout" className="rounded-md p-2 hover:bg-secondary">
              <LogOut className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 border-b border-border bg-card/60 px-4 py-3 md:grid-cols-4">
          <Stat label="Today" value={counts.today} accent="text-primary" />
          <Stat label="Pending" value={counts.pending} accent="text-amber-600" />
          <Stat label="Confirmed" value={counts.confirmed} accent="text-emerald-600" />
          <Stat label="Seated" value={counts.seated} accent="text-sky-600" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, table…"
              className="w-56 bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1">
            {(["all", "pending", "confirmed", "seated", "cancelled"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New reservation
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div>
                <CalendarDays className="mx-auto mb-2 h-10 w-10 opacity-50" />
                No reservations {filter !== "all" ? `(${filter})` : "yet"}.
                <div className="mt-2">
                  <button onClick={() => setShowForm(true)} className="text-primary underline">
                    Create your first reservation
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">When</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-left">Spot</th>
                    <th className="px-3 py-2 text-center">Party</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="px-3 py-2 font-mono text-xs">{formatWhen(r.when)}</td>
                      <td className="px-3 py-2 font-medium">{r.customerName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.phone}</td>
                      <td className="px-3 py-2">{r.spotLabel ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 text-center">{r.partySize}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "pending" && (
                            <button onClick={() => setStatus(r.id, "confirmed")} title="Confirm"
                              className="grid h-7 w-7 place-items-center rounded-md text-emerald-600 hover:bg-emerald-500/10">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {r.status === "confirmed" && (
                            <button onClick={() => setStatus(r.id, "seated")} title="Mark seated"
                              className="grid h-7 w-7 place-items-center rounded-md text-sky-600 hover:bg-sky-500/10">
                              <Clock className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <button onClick={() => setStatus(r.id, "cancelled")} title="Cancel"
                              className="grid h-7 w-7 place-items-center rounded-md text-amber-600 hover:bg-amber-500/10">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => remove(r.id)} title="Delete"
                            className="grid h-7 w-7 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal form */}
        {showForm && (
          <ReservationForm
            spots={spots}
            spotLabelFor={spotLabelFor}
            onCancel={() => setShowForm(false)}
            onSave={(data) => {
              const r: Reservation = {
                ...data,
                id: crypto.randomUUID(),
                email: user.email,
                createdAt: Date.now(),
                status: "pending",
              };
              persist([r, ...items]);
              setShowForm(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ReservationForm({
  spots, spotLabelFor, onCancel, onSave,
}: {
  spots: Furniture[];
  spotLabelFor: (f: Furniture, idx: number) => string;
  onCancel: () => void;
  onSave: (data: Omit<Reservation, "id" | "email" | "createdAt" | "status">) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [partySize, setPartySize] = useState(2);
  const [spotId, setSpotId] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) return;
    const spot = spots.find(s => s.id === spotId);
    const idx = spots.findIndex(s => s.id === spotId);
    onSave({
      customerName: customerName.trim(),
      phone: phone.trim(),
      when,
      partySize,
      spotId: spot?.id,
      spotLabel: spot ? spotLabelFor(spot, idx) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">New reservation</div>
          <button type="button" onClick={onCancel} className="grid h-7 w-7 place-items-center rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Customer name *">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <Field label="Phone *">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="01XXXXXXXXX"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="When *">
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </Field>
            <Field label="Party size">
              <input type="number" min={1} max={20} value={partySize} onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </Field>
          </div>
          <Field label="Assign spot (optional)">
            <select value={spotId} onChange={(e) => setSpotId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
              <option value="">— None —</option>
              {spots.map((s, i) => (
                <option key={s.id} value={s.id}>{spotLabelFor(s, i)}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">Cancel</button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map = {
    pending:   "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    seated:    "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    cancelled: "bg-secondary text-muted-foreground line-through",
  } as const;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status]}`}>{status}</span>;
}

function NavTab({ to, icon: Icon, label, active }: { to: string; icon: typeof Receipt; label: string; active?: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
