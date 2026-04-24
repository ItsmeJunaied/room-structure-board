import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, ArrowUpDown, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadOrders, type Order } from "@/lib/storage";
import { ManageShell } from "@/components/ManageShell";

export const Route = createFileRoute("/sales")({ component: SalesPage });

const BDT = (n: number) => `${n.toLocaleString("en-IN")} ৳`;
const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    "  " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

function SalesPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "open">("all");

  useEffect(() => { if (user) setOrders(loadOrders(user.email)); }, [user]);

  const totals = useMemo(() => {
    const sum = (o: Order) => {
      const sub = o.lines.reduce((s, l) => s + l.price * l.qty, 0);
      const taxable = Math.max(0, sub - (o.discount ?? 0));
      const tax = (taxable * (o.taxRate ?? 0)) / 100;
      return Math.round(taxable + tax);
    };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todays = orders.filter(o => o.createdAt >= today.getTime());
    return {
      sales: orders.filter(o => o.status === "paid").reduce((s, o) => s + sum(o), 0),
      todayCount: todays.length,
      unpaid: orders.filter(o => o.status === "open").reduce((s, o) => s + sum(o), 0),
      total: orders.length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    return orders
      .filter(o => filter === "all" ? true : o.status === filter)
      .filter(o =>
        search === "" ||
        o.spotLabel.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.barberName ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, search, filter]);

  const exportCSV = () => {
    const head = ["Order ID", "Date", "Spot", "Staff", "Items", "Amount", "Status"].join(",");
    const rows = filtered.map(o => {
      const sub = o.lines.reduce((s, l) => s + l.price * l.qty, 0);
      const taxable = Math.max(0, sub - (o.discount ?? 0));
      const total = Math.round(taxable + (taxable * (o.taxRate ?? 0)) / 100);
      const items = o.lines.map(l => `${l.qty}x ${l.name}`).join(" | ");
      return [`#${o.id.slice(0, 6).toUpperCase()}`, new Date(o.createdAt).toISOString(),
        o.spotLabel, o.barberName ?? "—", `"${items}"`, total, o.status].join(",");
    });
    const blob = new Blob([head + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sales-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <ManageShell
      active="sales"
      title="Sales Table"
      subtitle="All orders processed at the POS"
      stats={[
        { label: "Total sales", value: BDT(totals.sales), hint: "Paid orders" },
        { label: "Orders today", value: String(totals.todayCount) },
        { label: "Total unpaid", value: BDT(totals.unpaid), hint: "Open tickets" },
        { label: "All orders", value: String(totals.total) },
      ]}
      actions={
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary">
          <Download className="h-4 w-4" /> Export .CSV
        </button>
      }
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order, table, staff…"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {(["all", "paid", "open"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "open" ? "Unpaid" : f}
            </button>
          ))}
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
              <th className="px-4 py-3 text-left font-medium">Order ID</th>
              <th className="px-4 py-3 text-left font-medium">Date &amp; Time</th>
              <th className="px-4 py-3 text-left font-medium">Spot</th>
              <th className="px-4 py-3 text-left font-medium">Staff</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Items</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const sub = o.lines.reduce((s, l) => s + l.price * l.qty, 0);
              const taxable = Math.max(0, sub - (o.discount ?? 0));
              const total = Math.round(taxable + (taxable * (o.taxRate ?? 0)) / 100);
              return (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-mono text-xs">#{o.id.slice(0, 6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(o.createdAt)}</td>
                  <td className="px-4 py-3">{o.spotLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.barberName ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{BDT(total)}</td>
                  <td className="px-4 py-3">
                    {o.status === "paid"
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"><AlertCircle className="h-3 w-3" /> Unpaid</span>}
                  </td>
                  <td className="max-w-[300px] truncate px-4 py-3 text-muted-foreground" title={o.lines.map(l => `${l.qty}× ${l.name}`).join(", ")}>
                    {o.lines.map(l => `${l.qty}× ${l.name}`).join(", ") || "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center text-sm text-muted-foreground">
                No orders to show. Take orders at the POS to see them here.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </ManageShell>
  );
}
