import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadExpenses, saveExpenses, type Expense } from "@/lib/storage";

export const Route = createFileRoute("/expense")({ component: ExpensePage });

const BDT = (n: number) => `${n.toLocaleString("en-IN")} ৳`;

function ExpensePage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const [list, setList] = useState<Expense[]>([]);
  const [category, setCategory] = useState("Supplies");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => { if (user) setList(loadExpenses(user.email)); }, [user]);

  const persist = (next: Expense[]) => { setList(next); if (user) saveExpenses(user.email, next); };

  const add = () => {
    if (!description.trim() || amount <= 0) return;
    persist([{ id: crypto.randomUUID(), date: Date.now(), category, description: description.trim(), amount }, ...list]);
    setDescription(""); setAmount(0);
  };
  const remove = (id: string) => persist(list.filter(x => x.id !== id));

  const total = list.reduce((s, e) => s + e.amount, 0);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track day-to-day operating costs.</p>
          </div>
          <Link to="/pos" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to POS
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="col-span-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
            {["Supplies", "Rent", "Salary", "Utilities", "Maintenance", "Other"].map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            className="col-span-6 rounded-md border border-border bg-card px-3 py-2 text-sm" />
          <input type="number" value={amount || ""} onChange={e => setAmount(parseFloat(e.target.value) || 0)} placeholder="Amount ৳"
            className="col-span-2 rounded-md border border-border bg-card px-3 py-2 text-sm" />
          <button onClick={add} className="col-span-1 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{e.category}</span></td>
                  <td className="px-3 py-2">{e.description}</td>
                  <td className="px-3 py-2 text-right font-mono">{BDT(e.amount)}</td>
                  <td className="px-2">
                    <button onClick={() => remove(e.id)} className="grid h-7 w-7 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No expenses yet.</td></tr>
              )}
            </tbody>
            {list.length > 0 && (
              <tfoot className="bg-secondary/50">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
                  <td className="px-3 py-2 text-right font-bold">{BDT(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
