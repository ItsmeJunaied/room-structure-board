import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Home, Layers, Image as ImageIcon, Square, Sofa, Sparkles,
  Monitor, Tablet, Smartphone, Eye, Moon, Sun, Download,
  AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Pencil, Minus, Plus, Type, Search, Settings, ChevronDown, Trash2, Copy, MousePointer2, Lamp, Flower2,
} from "lucide-react";
import { FloorCanvas } from "@/components/FloorCanvas";
import { DEFAULTS, type Furniture, type FurnitureType, type Wall } from "@/lib/floorplan-types";

export const Route = createFileRoute("/")({
  component: Index,
});

const PALETTE: { type: FurnitureType; icon: typeof Square }[] = [
  { type: "sofa", icon: Sofa },
  { type: "cupboard", icon: Square },
  { type: "bed", icon: Square },
  { type: "mirror", icon: Square },
  { type: "chair", icon: Square },
  { type: "plant", icon: Flower2 },
  { type: "pillow", icon: Square },
  { type: "lamp", icon: Lamp },
  { type: "wardrobe", icon: Square },
  { type: "table", icon: Square },
  { type: "rug", icon: Square },
];

const uid = () => crypto.randomUUID();

const initialWalls: Wall[] = [
  { id: uid(), x1: 80, y1: 80, x2: 820, y2: 80 },
  { id: uid(), x1: 820, y1: 80, x2: 820, y2: 420 },
  { id: uid(), x1: 820, y1: 420, x2: 680, y2: 420 },
  { id: uid(), x1: 680, y1: 420, x2: 680, y2: 580 },
  { id: uid(), x1: 680, y1: 580, x2: 220, y2: 580 },
  { id: uid(), x1: 220, y1: 580, x2: 220, y2: 480 },
  { id: uid(), x1: 220, y1: 480, x2: 80, y2: 480 },
  { id: uid(), x1: 80, y1: 480, x2: 80, y2: 80 },
  // interior
  { id: uid(), x1: 420, y1: 80, x2: 420, y2: 360 },
  { id: uid(), x1: 80, y1: 320, x2: 320, y2: 320 },
];

const initialFurniture: Furniture[] = [
  { ...DEFAULTS.bed, id: uid(), x: 520, y: 130 },
  { ...DEFAULTS.sofa, id: uid(), x: 110, y: 360 },
  { ...DEFAULTS.table, id: uid(), x: 540, y: 460 },
  { ...DEFAULTS.chair, id: uid(), x: 470, y: 100 },
  { ...DEFAULTS.cupboard, id: uid(), x: 100, y: 100 },
  { ...DEFAULTS.wardrobe, id: uid(), x: 760, y: 120 },
  { ...DEFAULTS.lamp, id: uid(), x: 720, y: 380 },
  { ...DEFAULTS.plant, id: uid(), x: 270, y: 360 },
];

function Index() {
  const [tab, setTab] = useState<"Elements" | "Resources">("Elements");
  const [furniture, setFurniture] = useState<Furniture[]>(initialFurniture);
  const [walls, setWalls] = useState<Wall[]>(initialWalls);
  const [selectedId, setSelectedId] = useState<string | null>(initialFurniture[0].id);
  const [tool, setTool] = useState<"select" | "wall">("select");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setFurniture(f => f.filter(x => x.id !== selectedId));
        setSelectedId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedId) {
        e.preventDefault();
        const sel = furniture.find(f => f.id === selectedId);
        if (sel) {
          const dup = { ...sel, id: uid(), x: sel.x + 20, y: sel.y + 20 };
          setFurniture(f => [...f, dup]);
          setSelectedId(dup.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, furniture]);

  const selected = furniture.find(f => f.id === selectedId) || null;

  const updateSel = (patch: Partial<Furniture>) => {
    if (!selectedId) return;
    setFurniture(arr => arr.map(f => (f.id === selectedId ? { ...f, ...patch } : f)));
  };

  const updateById = (id: string, patch: Partial<Furniture>) =>
    setFurniture(arr => arr.map(f => (f.id === id ? { ...f, ...patch } : f)));

  const addItem = (type: FurnitureType) => {
    const item: Furniture = { ...DEFAULTS[type], id: uid(), x: 400, y: 280 };
    setFurniture(f => [...f, item]);
    setSelectedId(item.id);
    setTool("select");
  };

  const exportJSON = () => {
    const data = JSON.stringify({ furniture, walls }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "floorplan.json"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1520px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy.
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm">
              <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="font-medium">Cansaas Agency</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
            <button className="rounded-md p-1.5 hover:bg-secondary"><Monitor className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-secondary"><Tablet className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-secondary"><Smartphone className="h-4 w-4" /></button>
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-2 font-mono text-xs text-muted-foreground">1440×1024 px</span>
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-2 font-mono text-xs text-muted-foreground">64 %</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-md p-2 hover:bg-secondary"><Eye className="h-4 w-4" /></button>
            <button onClick={() => setDark(d => !d)} className="rounded-md p-2 hover:bg-secondary">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={exportJSON} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Icon rail */}
          <nav className="flex w-12 flex-col items-center gap-1 border-r border-border py-3">
            {[Layers, ImageIcon, Square, Sofa, Monitor, Sparkles].map((Icon, i) => (
              <button key={i} className={`rounded-md p-2 ${i===0 ? "bg-secondary" : "hover:bg-secondary"}`}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <div className="mt-auto flex flex-col items-center gap-2">
              <button className="rounded-md p-2 hover:bg-secondary"><Settings className="h-4 w-4" /></button>
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent" />
            </div>
          </nav>

          {/* Left panel */}
          <aside className="flex w-64 flex-col border-r border-border">
            <div className="border-b border-border p-4">
              <div className="text-sm font-semibold">House Plan</div>
              <div className="mt-3 flex rounded-lg bg-secondary p-1 text-sm">
                {(["Elements","Resources"] as const).map(t => (
                  <button key={t} onClick={()=>setTab(t)}
                    className={`flex-1 rounded-md py-1 ${tab===t ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-xs font-medium text-muted-foreground">All Elements</div>
                <span className="text-[10px] text-muted-foreground">click to add</span>
              </div>
              <ul className="space-y-1">
                {PALETTE.map((el) => {
                  const def = DEFAULTS[el.type];
                  return (
                    <li key={el.type}>
                      <button
                        onClick={() => addItem(el.type)}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-secondary"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card">
                          <el.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 text-left">{def.name}</span>
                        <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 mb-2 px-1 text-xs font-medium text-muted-foreground">Layers ({furniture.length})</div>
              <ul className="space-y-0.5">
                {furniture.map(f => (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelectedId(f.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${selectedId===f.id ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm border" style={{ background: f.fill }} />
                      <span className="flex-1 text-left truncate">{f.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Search..." className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘ F</kbd>
              </div>
            </div>
          </aside>

          {/* Canvas */}
          <main className="relative flex-1 overflow-hidden bg-canvas">
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="h-full w-full max-w-6xl rounded-xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
                <FloorCanvas
                  furniture={furniture}
                  walls={walls}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUpdate={updateById}
                  onAddWall={(w) => setWalls(ws => [...ws, w])}
                  tool={tool}
                />
              </div>
            </div>

            {/* Bottom toolbar */}
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-lg">
              <button onClick={() => setTool("select")}
                className={`grid h-8 w-8 place-items-center rounded-lg ${tool==="select" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <MousePointer2 className="h-4 w-4" />
              </button>
              <button onClick={() => setTool("wall")}
                className={`grid h-8 w-8 place-items-center rounded-lg ${tool==="wall" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <div className="mx-1 h-5 w-px bg-border" />
              <button onClick={() => selected && setFurniture(arr => [...arr, { ...selected, id: uid(), x: selected.x + 20, y: selected.y + 20 }])}
                disabled={!selected}
                className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Copy className="h-4 w-4" /></button>
              <button onClick={() => { if (selectedId) { setFurniture(f => f.filter(x => x.id !== selectedId)); setSelectedId(null); } }}
                disabled={!selected}
                className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
              <div className="mx-1 h-5 w-px bg-border" />
              <span className="px-2 text-xs text-muted-foreground">{tool === "wall" ? "Drag to draw wall" : selected ? selected.name : "Select an item"}</span>
            </div>
          </main>

          {/* Right panel */}
          <aside className="flex w-72 flex-col overflow-y-auto border-l border-border">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Select an item to edit its properties.
              </div>
            ) : (
              <>
                <Section title="Canvas Information">
                  <Row label="Name">
                    <input value={selected.name} onChange={e => updateSel({ name: e.target.value })}
                      className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm" />
                  </Row>
                  <Row label="Background">
                    <div className="flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-sm">
                      <input type="color" value={selected.fill} onChange={e => updateSel({ fill: e.target.value })}
                        className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="flex-1 font-mono text-xs uppercase">{selected.fill}</span>
                      <span className="text-xs text-muted-foreground">{Math.round(selected.opacity * 100)}%</span>
                    </div>
                  </Row>
                </Section>

                <Section title="Modify">
                  <Row label="Align">
                    <div className="flex w-full items-center justify-between gap-1">
                      {[
                        { I: AlignLeft, fn: () => updateSel({ x: 80 }) },
                        { I: AlignCenter, fn: () => updateSel({ x: 450 - selected.w / 2 }) },
                        { I: AlignRight, fn: () => updateSel({ x: 820 - selected.w }) },
                        { I: AlignVerticalJustifyStart, fn: () => updateSel({ y: 80 }) },
                        { I: AlignVerticalJustifyCenter, fn: () => updateSel({ y: 320 - selected.h / 2 }) },
                        { I: AlignVerticalJustifyEnd, fn: () => updateSel({ y: 560 - selected.h }) },
                      ].map(({ I, fn }, i) => (
                        <button key={i} onClick={fn} className="rounded p-1.5 hover:bg-secondary"><I className="h-3.5 w-3.5" /></button>
                      ))}
                    </div>
                  </Row>
                  <Row label="Position">
                    <div className="grid w-full grid-cols-2 gap-1.5">
                      <NumField v={Math.round(selected.x)} suffix="x" onChange={n => updateSel({ x: n })} />
                      <NumField v={Math.round(selected.y)} suffix="y" onChange={n => updateSel({ y: n })} />
                    </div>
                  </Row>
                  <Row label="Size">
                    <div className="grid w-full grid-cols-2 gap-1.5">
                      <NumField v={Math.round(selected.w)} suffix="w" onChange={n => updateSel({ w: Math.max(20, n) })} />
                      <NumField v={Math.round(selected.h)} suffix="h" onChange={n => updateSel({ h: Math.max(20, n) })} />
                    </div>
                  </Row>
                  <Row label="Radius">
                    <NumField v={selected.radius} onChange={n => updateSel({ radius: Math.max(0, n) })} />
                  </Row>
                  <div className="px-3 pb-2 pt-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Rotation</span>
                      <span className="font-mono">{selected.rotation}°</span>
                    </div>
                    <input type="range" min={-180} max={180} value={selected.rotation}
                      onChange={e => updateSel({ rotation: +e.target.value })}
                      className="w-full accent-primary" />
                  </div>
                </Section>

                <Section title="Style">
                  <Row label="Fill">
                    <div className="flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
                      <input type="color" value={selected.fill} onChange={e => updateSel({ fill: e.target.value })}
                        className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <input value={selected.fill} onChange={e => updateSel({ fill: e.target.value })}
                        className="flex-1 bg-transparent font-mono uppercase outline-none" />
                    </div>
                  </Row>
                  <Row label="Stroke">
                    <div className="flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
                      <input type="color" value={selected.stroke} onChange={e => updateSel({ stroke: e.target.value })}
                        className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <input value={selected.stroke} onChange={e => updateSel({ stroke: e.target.value })}
                        className="flex-1 bg-transparent font-mono uppercase outline-none" />
                    </div>
                  </Row>
                  <div className="px-3 pb-2 pt-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Opacity</span>
                      <span className="font-mono">{Math.round(selected.opacity * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={Math.round(selected.opacity * 100)}
                      onChange={e => updateSel({ opacity: +e.target.value / 100 })}
                      className="w-full accent-primary" />
                  </div>
                </Section>

                <div className="space-y-2 p-3">
                  <button
                    onClick={() => setFurniture(arr => [...arr, { ...selected, id: uid(), x: selected.x + 20, y: selected.y + 20 }])}
                    className="w-full rounded-lg border border-border bg-card py-2 text-sm font-medium hover:bg-secondary">
                    Duplicate
                  </button>
                  <button
                    onClick={() => { setFurniture(f => f.filter(x => x.id !== selectedId)); setSelectedId(null); }}
                    className="w-full rounded-lg border border-destructive/30 bg-destructive/10 py-2 text-sm font-medium text-destructive hover:bg-destructive/20">
                    Delete
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3">
      <div className="flex items-center justify-between px-3 pb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <div className="w-20 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function NumField({ v, suffix, onChange }: { v: number | string; suffix?: string; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs">
      <input
        value={v}
        onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
        className="w-full bg-transparent outline-none"
      />
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </div>
  );
}
