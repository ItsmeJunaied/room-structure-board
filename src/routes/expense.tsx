import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, ArrowUpDown, Plus, Trash2, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadExpenses, saveExpenses, loadOrders, type Expense } from "@/lib/storage";
import { ManageShell } from "@/components/ManageShell";

export const Route = createFileRoute("/expense")({ component: ExpensePage });

const BDT = (n: number) => `${n.toLocaleString("en-IN")} ৳`;

function ExpensePage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const [list, setList] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [category, setCategory] = useState("Supplies");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => { if (user) setList(loadExpenses(user.email)); }, [user]);

  const persist = (next: Expense[]) => { setList(next); if (user) saveExpenses(user.email, next); };

  const add = () => {
    if (!description.trim() || amount <= 0) return;
    persist([{ id: crypto.randomUUID(), date: Date.now(), category, description: description.trim(), amount }, ...list]);
    setDescription(""); setAmount(0); setOpenForm(false);
  };
  const remove = (id: string) => persist(list.filter(x => x.id !== id));

  const totals = useMemo(() => {
    const orders = user ? loadOrders(user.email) : [];
    const sales = orders.filter(o => o.status === "paid").reduce((s, o) => {
      const sub = o.lines.reduce((a, l) => a + l.price * l.qty, 0);
      const taxable = Math.max(0, sub - (o.discount ?? 0));
      return s + Math.round(taxable + (taxable * (o.taxRate ?? 0)) / 100);
    }, 0);
    const totalCost = list.reduce((s, e) => s + e.amount, 0);
    return { sales, totalCost, count: list.length, profit: sales - totalCost };
  }, [list, user]);

  const filtered = useMemo(() =>
    list
      .filter(e => search === "" || e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date - a.date),
    [list, search]);

  const exportCSV = () => {
    const head = ["Date", "Category", "Description", "Amount"].join(",");
    const rows = filtered.map(e => [
      new Date(e.date).toISOString().slice(0, 10), e.category, `"${e.description}"`, e.amount,
    ].join(","));
    const blob = new Blob([head + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `expenses-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <ManageShell
      active="expense"
      title="Expense List"
      subtitle="Track day-to-day operating costs"
      stats={[
        { label: "Total sales",   value: BDT(totals.sales) },
        { label: "Total expenses", value: BDT(totals.totalCost), hint: `${totals.count} entries` },
        { label: "Net profit",    value: BDT(totals.profit), hint: totals.profit >= 0 ? "In the green" : "Loss" },
        { label: "Avg. expense",  value: BDT(totals.count ? Math.round(totals.totalCost / totals.count) : 0) },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary">
            <Download className="h-4 w-4" /> Export .CSV
          </button>
          <button onClick={() => setOpenForm(v => !v)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      }
    >
      {openForm && (
        <div className="mb-4 grid grid-cols-12 gap-2 rounded-xl border border-border bg-card p-3">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="col-span-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            {["Supplies", "Rent", "Salary", "Utilities", "Maintenance", "Transport", "Other"].map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            className="col-span-5 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input type="number" value={amount || ""} onChange={e => setAmount(parseFloat(e.target.value) || 0)} placeholder="Amount ৳"
            className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={add} className="col-span-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Save
          </button>
          <button onClick={() => setOpenForm(false)} className="col-span-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            Cancel
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…"
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
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">{e.category}</span>
                </td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{BDT(e.amount)}</td>
                <td className="px-2">
                  <button onClick={() => remove(e.id)} className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-12 text-center text-sm text-muted-foreground">
                No expenses yet. Click "Add Expense" to record one.
              </td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-secondary/30">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
                <td className="px-4 py-3 text-right font-mono text-base font-bold">{BDT(filtered.reduce((s, e) => s + e.amount, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ManageShell>
  );
}
