import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home, Scissors, UtensilsCrossed, LogOut, Search, Plus, Minus, Trash2, Receipt, Clock,
  Pencil, User as UserIcon, Wallet, BadgeCheck, CircleDot, BarChart3, CalendarDays, Users,
} from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  loadBoards, boardHasContent, loadOrders, saveOrders, loadBarbers, loadReservations,
  type BoardState, type Order, type OrderLine, type Reservation,
} from "@/lib/storage";
import { menuFor, type MenuItem } from "@/lib/menu-data";
import { FloorCanvas } from "@/components/FloorCanvas";
import type { Furniture } from "@/lib/floorplan-types";

export const Route = createFileRoute("/pos")({ component: POSPage });

const BDT = (n: number) => `${n.toLocaleString("en-IN")} ৳`;

function POSPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;
  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);

  const role = user?.role ?? "salon";
  const boardKind = role === "salon" ? "salon" : "restaurant";
  const spotLabelSingular = role === "salon" ? "Chair" : "Table";

  const [board, setBoard] = useState<BoardState | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeSpot, setActiveSpot] = useState<Furniture | null>(null);
  const [hoverSpot, setHoverSpot] = useState<Furniture | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    if (!user) return;
    const all = loadBoards(user.email);
    setBoard(all ? all[boardKind] : null);
    setOrders(loadOrders(user.email));
    setReservations(loadReservations(user.email));
  }, [user, boardKind]);

  const barbers = useMemo(() => user ? loadBarbers(user.email, role) : [], [user, role]);

  const menu = useMemo(() => menuFor(role), [role]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(menu.map(m => m.category)))], [menu]);
  const filteredMenu = useMemo(
    () => menu.filter(m =>
      (activeCategory === "All" || m.category === activeCategory) &&
      (search === "" || m.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [menu, activeCategory, search]
  );

  // A spot is orderable if explicitly marked, or by sensible type defaults
  const isSpot = (f: Furniture) => {
    if (f.orderable === false) return false;
    if (f.orderable === true) return true;
    return role === "salon"
      ? (f.type === "salon-chair" || f.type === "massage-bed" || f.type === "shampoo-chair")
      : (f.type === "dining-rect" || f.type === "dining-round" || f.type === "dining-square" || f.type === "booth");
  };

  const spots = useMemo(() => (board?.furniture ?? []).filter(isSpot), [board, role]);

  const spotLabel = (f: Furniture): string => {
    if (f.tableNo) return `${spotLabelSingular} ${f.tableNo}`;
    const idx = spots.findIndex(s => s.id === f.id) + 1;
    return `${spotLabelSingular} ${idx}`;
  };

  const openOrderFor = (id: string) => orders.find(o => o.spotId === id && o.status === "open");

  const activeOrder = useMemo(() => activeSpot ? openOrderFor(activeSpot.id) ?? null : null, [orders, activeSpot]);

  const updateActiveOrder = (mut: (o: Order) => Order | null) => {
    if (!user || !activeSpot) return;
    setOrders(prev => {
      const existing = prev.find(o => o.spotId === activeSpot.id && o.status === "open");
      let next: Order[];
      if (existing) {
        const updated = mut(existing);
        if (!updated || updated.lines.length === 0) next = prev.filter(o => o.id !== existing.id);
        else next = prev.map(o => o.id === existing.id ? updated : o);
      } else {
        const blank: Order = {
          id: crypto.randomUUID(), email: user.email, spotId: activeSpot.id,
          spotLabel: spotLabel(activeSpot), lines: [], status: "open",
          createdAt: Date.now(), discount: 0, taxRate: 8.5,
        };
        const updated = mut(blank);
        if (!updated || updated.lines.length === 0) return prev;
        next = [...prev, updated];
      }
      saveOrders(user.email, next);
      return next;
    });
  };

  const mutLines = (fn: (lines: OrderLine[]) => OrderLine[]) =>
    updateActiveOrder(o => ({ ...o, lines: fn(o.lines) }));

  const addItem = (m: MenuItem) =>
    mutLines(lines => {
      const ex = lines.find(l => l.itemId === m.id);
      if (ex) return lines.map(l => l.itemId === m.id ? { ...l, qty: l.qty + 1 } : l);
      return [...lines, { itemId: m.id, name: m.name, price: m.price, qty: 1 }];
    });
  const incItem = (id: string) => mutLines(lines => lines.map(l => l.itemId === id ? { ...l, qty: l.qty + 1 } : l));
  const decItem = (id: string) => mutLines(lines => lines.flatMap(l => l.itemId === id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l]));
  const removeItem = (id: string) => mutLines(lines => lines.filter(l => l.itemId !== id));
  const setDiscount = (n: number) => updateActiveOrder(o => ({ ...o, discount: Math.max(0, n) }));
  const setTaxRate = (n: number) => updateActiveOrder(o => ({ ...o, taxRate: Math.max(0, Math.min(100, n)) }));
  const assignBarber = (id: string) => {
    const b = barbers.find(x => x.id === id);
    updateActiveOrder(o => ({ ...o, barberId: id || undefined, barberName: b?.name }));
  };

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
  const discount = activeOrder?.discount ?? 0;
  const taxRate = activeOrder?.taxRate ?? 8.5;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round((taxable * taxRate) / 100);
  const total = taxable + tax;

  if (!user) return null;

  // Empty floor plan prompt
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
            <Link to="/editor" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              + Add floor plan
            </Link>
            <button onClick={() => { logout(); navigate({ to: "/login" }); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // A spot is reserved if explicitly flagged OR has an active confirmed/pending reservation
  const reservedSpotIds = (() => {
    const ids = new Set<string>();
    for (const r of reservations) {
      if ((r.status === "pending" || r.status === "confirmed") && r.spotId) ids.add(r.spotId);
    }
    return ids;
  })();

  // Status helper for canvas badges
  const getStatus = (f: Furniture): "idle" | "active" | "reserved" | null => {
    if (!isSpot(f)) return null;
    if (openOrderFor(f.id)) return "active";
    if (f.reserved || reservedSpotIds.has(f.id)) return "reserved";
    return "idle";
  };

  // Live counts for header
  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    inProgress: orders.filter(o => o.status === "open").length,
    reservedCount: spots.filter(s => s.reserved || reservedSpotIds.has(s.id)).length,
    waiting: reservations.filter(r =>
      (r.status === "pending" || r.status === "confirmed") &&
      r.when.slice(0, 10) === today
    ).length,
  };

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1700px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header / nav */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy POS
            </div>
            <span className="rounded-full bg-accent/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
              {role === "salon" ? "Salon" : "Restaurant"}
            </span>
            <nav className="ml-3 hidden items-center gap-1 md:flex">
              <NavTab to="/pos"          icon={Receipt}      label="POS" active />
              <NavTab to="/reservations" icon={CalendarDays} label="Reservations" />
              <NavTab to="/sales"        icon={BarChart3}    label="Sales" />
              <NavTab to="/user"         icon={UserIcon}     label="Staff" />
              <NavTab to="/expense"      icon={Wallet}       label="Expense" />
            </nav>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Live status counters */}
            <div className="hidden items-center gap-1.5 md:flex">
              <CountChip Icon={Clock}        label="In progress" value={counts.inProgress} tone="primary" />
              <CountChip Icon={BadgeCheck}   label="Reserved"    value={counts.reservedCount} tone="amber" />
              <CountChip Icon={Users}        label="Waiting"     value={counts.waiting} tone="muted" />
            </div>
            <Link to="/editor" className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-foreground hover:bg-secondary">
              <Pencil className="h-3.5 w-3.5" /> Edit floor plan
            </Link>
            <span className="hidden lg:inline">{user.email}</span>
            <button onClick={() => { logout(); navigate({ to: "/login" }); }} title="Logout" className="rounded-md p-2 hover:bg-secondary">
              <LogOut className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Menu */}
          <aside className="flex w-[360px] flex-col border-r border-border">
            <div className="border-b border-border p-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${role === "salon" ? "service" : "menu"}…`}
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
              </div>
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {categories.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)}
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${activeCategory === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {filteredMenu.map(m => (
                  <button key={m.id} onClick={() => addItem(m)} disabled={!activeSpot}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60">
                    {m.image ? (
                      <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                        <img src={m.image} alt={m.name} loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-accent/40 to-secondary text-primary">
                        <Scissors className="h-8 w-8" />
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
          </aside>

          {/* CENTER: Floor plan + spot grid */}
          <main className="flex flex-1 flex-col overflow-hidden bg-canvas">
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
              <div className="text-sm font-semibold">Floor plan</div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <Legend color="oklch(0.85 0.005 240)" label="Idle" />
                <Legend color="oklch(0.62 0.16 152)" label="In progress" />
                <Legend color="oklch(0.7 0.18 60)" label="Reserved" />
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <FloorCanvas
                rooms={board.rooms} doors={board.doors} partitions={board.partitions} furniture={board.furniture}
                selection={activeSpot ? { kind: "furniture", id: activeSpot.id } : null}
                tool="select"
                roomFill="#F1EDE4"
                roomShape="rect"
                readOnly
                furnitureLabel={(f) => isSpot(f) ? spotLabel(f) : null}
                furnitureStatus={getStatus}
                onPickFurniture={(f) => { if (isSpot(f)) setActiveSpot(f); }}
                onHoverFurniture={setHoverSpot}
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

              {/* Hover tooltip */}
              {hoverSpot && isSpot(hoverSpot) && (() => {
                const order = openOrderFor(hoverSpot.id);
                const status = getStatus(hoverSpot);
                return (
                  <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[260px] rounded-xl border border-border bg-card/95 p-3 text-xs shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{spotLabel(hoverSpot)}</div>
                      <StatusPill status={status} />
                    </div>
                    {!order && status !== "reserved" && (
                      <p className="mt-1 text-muted-foreground">Idle — click to take an order.</p>
                    )}
                    {order && (
                      <div className="mt-2 space-y-1">
                        <div className="text-muted-foreground">{order.lines.length} item{order.lines.length === 1 ? "" : "s"} · {BDT(order.lines.reduce((s, l) => s + l.price * l.qty, 0))}</div>
                        {order.barberName && <div className="text-muted-foreground">Assigned: <span className="text-foreground">{order.barberName}</span></div>}
                        <ul className="mt-1 space-y-0.5 text-foreground">
                          {order.lines.slice(0, 4).map(l => (
                            <li key={l.itemId} className="flex justify-between gap-2">
                              <span className="truncate">{l.qty}× {l.name}</span>
                              <span className="font-mono text-muted-foreground">{BDT(l.price * l.qty)}</span>
                            </li>
                          ))}
                          {order.lines.length > 4 && <li className="text-muted-foreground">+{order.lines.length - 4} more…</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Spot quick-pick row */}
            <div className="border-t border-border bg-card p-2">
              <div className="flex gap-1.5 overflow-x-auto">
                {spots.map((f, i) => {
                  const order = openOrderFor(f.id);
                  const active = activeSpot?.id === f.id;
                  const status = getStatus(f);
                  return (
                    <button key={f.id} onClick={() => setActiveSpot(f)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${active ? "border-primary bg-accent/40" : "border-border hover:border-primary/50"}`}>
                      <StatusPill status={status} compact />
                      <span className="font-medium">{f.tableNo ? `${spotLabelSingular} ${f.tableNo}` : `${spotLabelSingular} ${i + 1}`}</span>
                      {order && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                          <Clock className="h-2.5 w-2.5" /> {order.lines.reduce((s, l) => s + l.qty, 0)}
                        </span>
                      )}
                    </button>
                  );
                })}
                {spots.length === 0 && (
                  <span className="px-2 py-2 text-xs text-muted-foreground">
                    No orderable spots. <Link to="/editor" className="font-medium text-primary">Edit plan</Link>
                  </span>
                )}
              </div>
            </div>
          </main>

          {/* RIGHT: Order panel */}
          <aside className="flex w-[380px] flex-col border-l border-border">
            <div className="border-b border-border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Order</span>
                {activeOrder && <span className="font-mono">#{activeOrder.id.slice(0, 6).toUpperCase()}</span>}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-base font-semibold">{activeSpot ? spotLabel(activeSpot) : "Select a spot"}</div>
                {activeSpot && <StatusPill status={getStatus(activeSpot)} />}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {activeSpot
                  ? "Tap menu items to add. Quantities update live."
                  : `Pick a ${spotLabelSingular.toLowerCase()} from the floor plan.`}
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

            {/* Footer: assign + discount + tax + totals */}
            {activeSpot && (
              <div className="border-t border-border p-3">
                <div className="mb-2">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Assign {role === "salon" ? "barber" : "waiter"}
                  </label>
                  <select value={activeOrder?.barberId ?? ""} onChange={(e) => assignBarber(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm">
                    <option value="">— None —</option>
                    {barbers.map(b => (
                      <option key={b.id} value={b.id}>{b.name} · {b.role}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Discount (৳)</label>
                    <input type="number" min={0} value={activeOrder?.discount ?? 0}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Tax (%)</label>
                    <input type="number" min={0} max={100} step={0.5} value={activeOrder?.taxRate ?? 8.5}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm" />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{BDT(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>−{BDT(discount)}</span></div>}
                  <div className="flex justify-between text-muted-foreground"><span>Tax ({taxRate}%)</span><span>{BDT(tax)}</span></div>
                  <div className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span>{BDT(total)}</span></div>
                </div>
                <button onClick={checkout} disabled={!activeOrder || activeOrder.lines.length === 0}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  <Receipt className="h-4 w-4" /> Charge {BDT(total)}
                </button>
              </div>
            )}
          </aside>
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

function StatusPill({ status, compact }: { status: "idle" | "active" | "reserved" | null; compact?: boolean }) {
  if (!status) return null;
  const map = {
    idle:     { label: "Idle",        cls: "bg-secondary text-muted-foreground", Icon: CircleDot },
    active:   { label: "In progress", cls: "bg-primary/15 text-primary",         Icon: Clock },
    reserved: { label: "Reserved",    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", Icon: BadgeCheck },
  } as const;
  const { label, cls, Icon } = map[status];
  if (compact) return <Icon className={`h-3 w-3 ${status === "active" ? "text-primary" : status === "reserved" ? "text-amber-600" : "text-muted-foreground"}`} />;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}
