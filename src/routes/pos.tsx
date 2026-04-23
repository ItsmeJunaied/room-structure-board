import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home, Scissors, UtensilsCrossed, LogOut, Search, Plus, Minus, Trash2, Receipt, Clock, Pencil,
} from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  loadBoards, boardHasContent, loadOrders, saveOrders, type BoardState, type Order, type OrderLine,
} from "@/lib/storage";
import { menuFor, type MenuItem } from "@/lib/menu-data";
import { FloorCanvas } from "@/components/FloorCanvas";
import type { Furniture } from "@/lib/floorplan-types";

export const Route = createFileRoute("/pos")({ component: POSPage });

const BDT = (n: number) => `${n.toLocaleString("en-IN")} ৳`;

function POSPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const role = user?.role ?? "salon";
  const boardKind = role === "salon" ? "salon" : "restaurant";
  const spotLabelSingular = role === "salon" ? "Chair" : "Table";

  const [board, setBoard] = useState<BoardState | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeSpot, setActiveSpot] = useState<Furniture | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Load board + orders
  useEffect(() => {
    if (!user) return;
    const all = loadBoards(user.email);
    setBoard(all ? all[boardKind] : null);
    setOrders(loadOrders(user.email));
  }, [user, boardKind]);

  const menu = useMemo(() => menuFor(role), [role]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(menu.map(m => m.category)))], [menu]);
  const filteredMenu = useMemo(() => {
    return menu.filter(m =>
      (activeCategory === "All" || m.category === activeCategory) &&
      (search === "" || m.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [menu, activeCategory, search]);

  // Furniture types that count as "orderable spots"
  const isSpot = (f: Furniture) =>
    role === "salon"
      ? f.type === "salon-chair" || f.type === "massage-bed"
      : f.type === "dining-rect" || f.type === "dining-round" || f.type === "dining-square" || f.type === "booth";

  const spots = useMemo(() => (board?.furniture ?? []).filter(isSpot), [board, role]);

  // Build label map for spots: number them in order, by type
  const spotLabel = (f: Furniture): string => {
    if (f.tableNo) return `${spotLabelSingular} ${f.tableNo}`;
    const idx = spots.findIndex(s => s.id === f.id) + 1;
    return `${spotLabelSingular} ${idx}`;
  };

  const activeOrder = useMemo(() => {
    if (!activeSpot) return null;
    return orders.find(o => o.spotId === activeSpot.id && o.status === "open") ?? null;
  }, [orders, activeSpot]);

  const updateActiveOrder = (mut: (lines: OrderLine[]) => OrderLine[]) => {
    if (!user || !activeSpot) return;
    setOrders(prev => {
      const existing = prev.find(o => o.spotId === activeSpot.id && o.status === "open");
      let next: Order[];
      if (existing) {
        const lines = mut(existing.lines);
        if (lines.length === 0) {
          next = prev.filter(o => o.id !== existing.id);
        } else {
          next = prev.map(o => o.id === existing.id ? { ...o, lines } : o);
        }
      } else {
        const lines = mut([]);
        if (lines.length === 0) return prev;
        const newOrder: Order = {
          id: crypto.randomUUID(),
          email: user.email,
          spotId: activeSpot.id,
          spotLabel: spotLabel(activeSpot),
          lines,
          status: "open",
          createdAt: Date.now(),
        };
        next = [...prev, newOrder];
      }
      saveOrders(user.email, next);
      return next;
    });
  };

  const addItem = (m: MenuItem) => {
    updateActiveOrder(lines => {
      const ex = lines.find(l => l.itemId === m.id);
      if (ex) return lines.map(l => l.itemId === m.id ? { ...l, qty: l.qty + 1 } : l);
      return [...lines, { itemId: m.id, name: m.name, price: m.price, qty: 1 }];
    });
  };
  const incItem = (id: string) => updateActiveOrder(lines => lines.map(l => l.itemId === id ? { ...l, qty: l.qty + 1 } : l));
  const decItem = (id: string) => updateActiveOrder(lines => lines.flatMap(l => l.itemId === id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l]));
  const removeItem = (id: string) => updateActiveOrder(lines => lines.filter(l => l.itemId !== id));

  const checkout = () => {
    if (!user || !activeOrder) return;
    setOrders(prev => {
      const next = prev.map(o => o.id === activeOrder.id ? { ...o, status: "paid" as const } : o);
      saveOrders(user.email, next);
      return next;
    });
    setActiveSpot(null);
  };

  const subtotal = activeOrder?.lines.reduce((s, l) => s + l.price * l.qty, 0) ?? 0;
  const tax = Math.round(subtotal * 0.085);
  const total = subtotal + tax;

  // Order count for each spot (open orders)
  const openOrderFor = (id: string) => orders.find(o => o.spotId === id && o.status === "open");

  if (!user) return null;

  // No floor plan → prompt
  if (!board || !boardHasContent(board)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/40 text-primary">
            {role === "salon" ? <Scissors className="h-5 w-5" /> : <UtensilsCrossed className="h-5 w-5" />}
          </div>
          <h2 className="text-lg font-semibold">No floor plan yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Design your {role} floor plan first. Place {role === "salon" ? "salon chairs / massage beds" : "tables"} and a cash counter, then come back here to take orders.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link to="/editor"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              + Add floor plan
            </Link>
            <button onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
              Sign out
            </button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Logged in as <b>{user.email}</b> ({user.role})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy POS
            </div>
            <span className="rounded-full bg-accent/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
              {role === "salon" ? "Salon" : "Restaurant"}
            </span>
            <span className="hidden md:inline text-xs text-muted-foreground">
              {spots.length} {spotLabelSingular.toLowerCase()}{spots.length === 1 ? "" : "s"} · {orders.filter(o => o.status === "open").length} open order{orders.filter(o => o.status === "open").length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/editor" className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary">
              <Pencil className="h-3.5 w-3.5" /> Edit floor plan
            </Link>
            <button onClick={() => { logout(); navigate({ to: "/login" }); }} title="Logout"
              className="rounded-md p-2 hover:bg-secondary">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: floor plan (read-only) + spot list */}
          <aside className="flex w-[320px] flex-col border-r border-border">
            <div className="border-b border-border p-3">
              <div className="text-xs font-semibold">Floor plan</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Click a {spotLabelSingular.toLowerCase()} to take an order.
              </p>
            </div>
            <div className="relative h-[260px] overflow-hidden bg-canvas">
              <FloorCanvas
                rooms={board.rooms} doors={board.doors} partitions={board.partitions} furniture={board.furniture}
                selection={activeSpot ? { kind: "furniture", id: activeSpot.id } : null}
                tool="select"
                roomFill="#F1EDE4"
                roomShape="rect"
                readOnly
                onPickFurniture={(f) => { if (isSpot(f)) setActiveSpot(f); }}
                onSelect={() => {}}
                onUpdateFurniture={() => {}}
                onUpdateRoom={() => {}}
                onUpdateDoor={() => {}}
                onUpdatePartition={() => {}}
                onAddRoom={() => {}}
                onAddDoor={() => {}}
                onAddPartition={() => {}}
                onSetTool={() => {}}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {spotLabelSingular}s
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {spots.map((f, i) => {
                  const order = openOrderFor(f.id);
                  const active = activeSpot?.id === f.id;
                  return (
                    <button key={f.id} onClick={() => setActiveSpot(f)}
                      className={`relative flex flex-col items-start rounded-lg border p-2 text-left text-xs transition ${active ? "border-primary bg-accent/40" : "border-border bg-card hover:border-primary/50"}`}>
                      <span className="font-medium">{f.tableNo ? `${spotLabelSingular} ${f.tableNo}` : `${spotLabelSingular} ${i + 1}`}</span>
                      <span className="text-[10px] text-muted-foreground">{f.name}</span>
                      {order && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                          <Clock className="h-2.5 w-2.5" /> {order.lines.reduce((s, l) => s + l.qty, 0)} items
                        </span>
                      )}
                    </button>
                  );
                })}
                {spots.length === 0 && (
                  <div className="col-span-2 rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                    No {spotLabelSingular.toLowerCase()}s in your floor plan yet.{" "}
                    <Link to="/editor" className="font-medium text-primary">Edit plan</Link>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Middle: menu */}
          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${role === "salon" ? "service" : "menu"}…`}
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Categories */}
              <div className="w-40 shrink-0 overflow-y-auto border-r border-border p-2">
                {categories.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)}
                    className={`mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs ${activeCategory === c ? "bg-accent/50 font-semibold text-accent-foreground" : "hover:bg-secondary"}`}>
                    <span>{c}</span>
                  </button>
                ))}
              </div>

              {/* Menu grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredMenu.map(m => (
                    <button key={m.id} onClick={() => addItem(m)}
                      disabled={!activeSpot}
                      className="group flex overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60">
                      {m.image ? (
                        <div className="h-24 w-24 shrink-0 overflow-hidden bg-secondary">
                          <img src={m.image} alt={m.name} loading="lazy"
                            className="h-full w-full object-cover transition group-hover:scale-105" />
                        </div>
                      ) : (
                        <div className="grid h-24 w-24 shrink-0 place-items-center bg-accent/40 text-primary">
                          <Scissors className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col justify-between p-2.5">
                        <div>
                          <div className="text-sm font-semibold leading-tight">{m.name}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            <span className="rounded-full bg-secondary px-1.5 py-0.5">{m.category}</span>
                            {m.duration && <span className="ml-1.5">{m.duration}</span>}
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <div className="text-sm font-bold text-primary">{BDT(m.price)}</div>
                          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground opacity-0 transition group-hover:opacity-100">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {filteredMenu.length === 0 && (
                  <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                    Nothing matches "{search}".
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Right: order panel */}
          <aside className="flex w-[340px] flex-col border-l border-border">
            <div className="border-b border-border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Order</span>
                {activeOrder && <span className="font-mono">#{activeOrder.id.slice(0, 6).toUpperCase()}</span>}
              </div>
              <div className="mt-1 text-base font-semibold">
                {activeSpot ? spotLabel(activeSpot) : "Select a spot"}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {activeSpot
                  ? "Tap menu items to add. Quantities update live."
                  : `Pick a ${spotLabelSingular.toLowerCase()} from the floor plan or list.`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!activeSpot && (
                <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                  No {spotLabelSingular.toLowerCase()} selected.
                </div>
              )}
              {activeSpot && (!activeOrder || activeOrder.lines.length === 0) && (
                <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                  Cart is empty.
                </div>
              )}
              {activeOrder?.lines.map(l => (
                <div key={l.itemId} className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium leading-tight">{l.name}</div>
                    <div className="text-[11px] text-muted-foreground">{BDT(l.price)} × {l.qty}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => decItem(l.itemId)} className="grid h-6 w-6 place-items-center rounded-md border border-border hover:bg-secondary">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold">{l.qty}</span>
                    <button onClick={() => incItem(l.itemId)} className="grid h-6 w-6 place-items-center rounded-md border border-border hover:bg-secondary">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={() => removeItem(l.itemId)} className="grid h-6 w-6 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border p-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{BDT(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Tax (8.5%)</span><span>{BDT(tax)}</span></div>
                <div className="flex justify-between text-base font-bold pt-1"><span>Total</span><span>{BDT(total)}</span></div>
              </div>
              <button onClick={checkout} disabled={!activeOrder || activeOrder.lines.length === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                <Receipt className="h-4 w-4" /> Charge {BDT(total)}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
