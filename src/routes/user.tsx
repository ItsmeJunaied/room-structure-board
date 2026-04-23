import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadBarbers, saveBarbers, type Barber } from "@/lib/storage";

export const Route = createFileRoute("/user")({ component: UserPage });

function UserPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const role = user?.role ?? "salon";
  const [list, setList] = useState<Barber[]>([]);
  const [name, setName] = useState("");
  const [roleField, setRoleField] = useState(role === "salon" ? "Barber" : "Waiter");

  useEffect(() => { if (user) setList(loadBarbers(user.email, role)); }, [user, role]);

  const persist = (next: Barber[]) => { setList(next); if (user) saveBarbers(user.email, next); };

  const add = () => {
    if (!name.trim()) return;
    persist([...list, { id: crypto.randomUUID(), name: name.trim(), role: roleField }]);
    setName("");
  };
  const remove = (id: string) => persist(list.filter(b => b.id !== id));

  if (!user) return null;
  const title = role === "salon" ? "Barbers" : "Waiters & Staff";

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">Manage staff that can be assigned to orders.</p>
          </div>
          <Link to="/pos" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to POS
          </Link>
        </div>

        <div className="mt-5 flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Rakib Hossain)"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm" />
          <input value={roleField} onChange={e => setRoleField(e.target.value)} placeholder="Role"
            className="w-40 rounded-md border border-border bg-card px-3 py-2 text-sm" />
          <button onClick={add} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <UserPlus className="h-4 w-4" /> Add
          </button>
        </div>

        <ul className="mt-5 space-y-1.5">
          {list.map(b => (
            <li key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
              <div>
                <div className="text-sm font-medium">{b.name}</div>
                <div className="text-[11px] text-muted-foreground">{b.role}</div>
              </div>
              <button onClick={() => remove(b.id)} className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No staff yet. Add your first {role === "salon" ? "barber" : "waiter"} above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
