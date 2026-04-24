import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, ArrowUpDown, UserPlus, Trash2, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadBarbers, saveBarbers, loadOrders, type Barber, type Order } from "@/lib/storage";
import { ManageShell } from "@/components/ManageShell";

export const Route = createFileRoute("/user")({ component: UserPage });

const BDT = (n: number) => `${n.toLocaleString("en-IN")} ৳`;

function UserPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const role = user?.role ?? "salon";
  const [list, setList] = useState<Barber[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState("");
  const [roleField, setRoleField] = useState(role === "salon" ? "Barber" : "Waiter");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    setList(loadBarbers(user.email, role));
    setOrders(loadOrders(user.email));
  }, [user, role]);

  const persist = (next: Barber[]) => { setList(next); if (user) saveBarbers(user.email, next); };

  const add = () => {
    if (!name.trim()) return;
    persist([...list, { id: crypto.randomUUID(), name: name.trim(), role: roleField }]);
    setName(""); setOpenForm(false);
  };
  const remove = (id: string) => persist(list.filter(b => b.id !== id));

  // Aggregate per-staff stats
  const rows = useMemo(() => {
    return list.map(b => {
      const my = orders.filter(o => o.barberId === b.id);
      const totalIncome = my
        .filter(o => o.status === "paid")
        .reduce((s, o) => {
          const sub = o.lines.reduce((a, l) => a + l.price * l.qty, 0);
          const taxable = Math.max(0, sub - (o.discount ?? 0));
          return s + Math.round(taxable + (taxable * (o.taxRate ?? 0)) / 100);
        }, 0);
      const checkIn = my.length > 0 ? Math.min(...my.map(o => o.createdAt)) : null;
      return { barber: b, orderCount: my.length, totalIncome, checkIn };
    }).filter(r =>
      search === "" ||
      r.barber.name.toLowerCase().includes(search.toLowerCase()) ||
      r.barber.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [list, orders, search]);

  const totals = useMemo(() => ({
    staff: list.length,
    totalOrders: rows.reduce((s, r) => s + r.orderCount, 0),
    income: rows.reduce((s, r) => s + r.totalIncome, 0),
    active: rows.filter(r => r.orderCount > 0).length,
  }), [list, rows]);

  if (!user) return null;

  return (
    <ManageShell
      active="staff"
      title="Staff Schedule"
      subtitle={`Manage ${role === "salon" ? "barbers" : "waiters & staff"} and review their day`}
      stats={[
        { label: "Total staff", value: String(totals.staff) },
        { label: "Active today", value: String(totals.active) },
        { label: "Total orders", value: String(totals.totalOrders) },
        { label: "Total income", value: BDT(totals.income) },
      ]}
      actions={
        <button onClick={() => setOpenForm(v => !v)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <UserPlus className="h-4 w-4" /> Add Staff
        </button>
      }
    >
      {openForm && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Rakib Hossain)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={roleField} onChange={e => setRoleField(e.target.value)} placeholder="Role"
            className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={add} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Save
          </button>
          <button onClick={() => setOpenForm(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
            Cancel
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:bg-secondary">
          <Filter className="h-3.5 w-3.5" /> Filter
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:bg-secondary">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Staff Name</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Check In</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total Orders</th>
              <th className="px-4 py-3 text-right font-medium">Total Income</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ barber, orderCount, totalIncome, checkIn }) => (
              <tr key={barber.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/40 text-xs font-semibold text-primary">
                      {barber.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium">{barber.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{barber.role}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {checkIn ? (
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
                      {new Date(checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  {orderCount > 0
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">On duty</span>
                    : <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Off</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono">{orderCount}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{BDT(totalIncome)}</td>
                <td className="px-2">
                  <button onClick={() => remove(barber.id)} className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center text-sm text-muted-foreground">
                No staff yet. Click "Add Staff" to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </ManageShell>
  );
}
