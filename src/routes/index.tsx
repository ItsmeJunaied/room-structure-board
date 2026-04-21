import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Home, Sparkles, Monitor, Tablet, Smartphone, Eye, Moon, Sun, Download,
  Plus, Trash2, Copy, MousePointer2, Search, Settings, ChevronDown,
  Square, DoorOpen, Sofa, Bed, Armchair, Lamp, Flower2, Tv, Bath, Wind, Layers,
  Circle, Minus, Shapes,
} from "lucide-react";
import { FloorCanvas } from "@/components/FloorCanvas";
import {
  DEFAULTS, ROOM_PRESETS, ROOM_SHAPES,
  type Furniture, type FurnitureType, type Room, type Door, type Partition, type Selection, type Tool, type RoomShape,
} from "@/lib/floorplan-types";

export const Route = createFileRoute("/")({ component: Index });

const uid = () => crypto.randomUUID();

const PALETTE: { type: FurnitureType; icon: typeof Square; group: string }[] = [
  { type: "bed", icon: Bed, group: "Bedroom" },
  { type: "wardrobe", icon: Square, group: "Bedroom" },
  { type: "pillow", icon: Square, group: "Bedroom" },
  { type: "sofa", icon: Sofa, group: "Living" },
  { type: "chair", icon: Armchair, group: "Living" },
  { type: "table", icon: Square, group: "Living" },
  { type: "tv", icon: Tv, group: "Living" },
  { type: "rug", icon: Square, group: "Living" },
  { type: "cupboard", icon: Square, group: "Kitchen" },
  { type: "sink", icon: Square, group: "Kitchen" },
  { type: "toilet", icon: Square, group: "Bath" },
  { type: "bathtub", icon: Bath, group: "Bath" },
  { type: "mirror", icon: Square, group: "Decor" },
  { type: "lamp", icon: Lamp, group: "Decor" },
  { type: "plant", icon: Flower2, group: "Decor" },
];

function Index() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [roomPresetIdx, setRoomPresetIdx] = useState(0);
  const [roomShape, setRoomShape] = useState<RoomShape>("rect");
  const [dark, setDark] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection) deleteSelection();
      if (e.key === "Escape") { setTool("select"); setSelection(null); }
      if (e.key.toLowerCase() === "r") setTool("room");
      if (e.key.toLowerCase() === "d") setTool("door");
      if (e.key.toLowerCase() === "p") setTool("partition");
      if (e.key.toLowerCase() === "v") setTool("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection]);

  const updateF = (id: string, patch: Partial<Furniture>) =>
    setFurniture(arr => arr.map(f => f.id === id ? { ...f, ...patch } : f));
  const updateR = (id: string, patch: Partial<Room>) =>
    setRooms(arr => arr.map(r => r.id === id ? { ...r, ...patch } : r));
  const updateD = (id: string, patch: Partial<Door>) =>
    setDoors(arr => arr.map(d => d.id === id ? { ...d, ...patch } : d));
  const updateP = (id: string, patch: Partial<Partition>) =>
    setPartitions(arr => arr.map(x => x.id === id ? { ...x, ...patch } : x));

  const addFurniture = (type: FurnitureType) => {
    // Drop into center of first room if any, else center of canvas
    const target = rooms[0];
    const def = DEFAULTS[type];
    const cx = target ? target.x + target.w / 2 : 600;
    const cy = target ? target.y + target.h / 2 : 400;
    const item: Furniture = { ...def, id: uid(), x: cx - def.w / 2, y: cy - def.h / 2 };
    setFurniture(arr => [...arr, item]);
    setSelection({ kind: "furniture", id: item.id });
    setTool("select");
  };

  const deleteSelection = () => {
    if (!selection) return;
    if (selection.kind === "furniture") setFurniture(a => a.filter(x => x.id !== selection.id));
    if (selection.kind === "room") setRooms(a => a.filter(x => x.id !== selection.id));
    if (selection.kind === "door") setDoors(a => a.filter(x => x.id !== selection.id));
    if (selection.kind === "partition") setPartitions(a => a.filter(x => x.id !== selection.id));
    setSelection(null);
  };

  const duplicateSelection = () => {
    if (!selection) return;
    if (selection.kind === "furniture") {
      const f = furniture.find(x => x.id === selection.id); if (!f) return;
      const dup = { ...f, id: uid(), x: f.x + 24, y: f.y + 24 };
      setFurniture(a => [...a, dup]); setSelection({ kind: "furniture", id: dup.id });
    } else if (selection.kind === "room") {
      const r = rooms.find(x => x.id === selection.id); if (!r) return;
      const dup = { ...r, id: uid(), x: r.x + 24, y: r.y + 24 };
      setRooms(a => [...a, dup]); setSelection({ kind: "room", id: dup.id });
    } else if (selection.kind === "partition") {
      const pt = partitions.find(x => x.id === selection.id); if (!pt) return;
      const dup = { ...pt, id: uid(), x1: pt.x1 + 20, y1: pt.y1 + 20, x2: pt.x2 + 20, y2: pt.y2 + 20 };
      setPartitions(a => [...a, dup]); setSelection({ kind: "partition", id: dup.id });
    }
  };

  const exportJSON = () => {
    const data = JSON.stringify({ rooms, doors, partitions, furniture }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "floorplan.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (!confirm("Clear the entire canvas?")) return;
    setRooms([]); setDoors([]); setPartitions([]); setFurniture([]); setSelection(null);
  };

  const groups = Array.from(new Set(PALETTE.map(p => p.group)));
  const selFurn = selection?.kind === "furniture" ? furniture.find(f => f.id === selection.id) : null;
  const selRoom = selection?.kind === "room" ? rooms.find(r => r.id === selection.id) : null;
  const selDoor = selection?.kind === "door" ? doors.find(d => d.id === selection.id) : null;
  const selPart = selection?.kind === "partition" ? partitions.find(p => p.id === selection.id) : null;

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy.
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm">
              <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="font-medium">My Floor Plan</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
            {[Monitor, Tablet, Smartphone].map((I, i) => (
              <button key={i} className="rounded-md p-1.5 hover:bg-secondary"><I className="h-4 w-4" /></button>
            ))}
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-2 font-mono text-xs text-muted-foreground">
              {rooms.length} room{rooms.length === 1 ? "" : "s"} · {furniture.length} item{furniture.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={clearAll} className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">Clear</button>
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
          {/* Left panel */}
          <aside className="flex w-72 flex-col border-r border-border">
            <div className="border-b border-border p-4">
              <div className="mb-3 text-sm font-semibold">Build</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => setTool("room")}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${tool==="room" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
                  <Square className="h-3.5 w-3.5" /> Room
                </button>
                <button onClick={() => setTool("partition")}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${tool==="partition" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
                  <Minus className="h-3.5 w-3.5" /> Wall
                </button>
                <button onClick={() => setTool("door")}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${tool==="door" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
                  <DoorOpen className="h-3.5 w-3.5" /> Door
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Room shape</div>
                <div className="grid grid-cols-3 gap-1">
                  {ROOM_SHAPES.map(s => {
                    const Icon = s.value === "circle" ? Circle : s.value === "l-shape" ? Shapes : Square;
                    return (
                      <button key={s.value} onClick={() => setRoomShape(s.value)}
                        className={`flex flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] ${roomShape===s.value ? "border-primary bg-accent/40" : "border-border hover:bg-secondary"}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Room type</div>
                <div className="flex flex-wrap gap-1">
                  {ROOM_PRESETS.map((p, i) => (
                    <button key={p.name} onClick={() => setRoomPresetIdx(i)}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${roomPresetIdx===i ? "border-primary" : "border-border hover:bg-secondary"}`}>
                      <span className="h-3 w-3 rounded-sm" style={{ background: p.fill }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {tool === "room" && (
                <div className="mt-3 rounded-md bg-accent/40 px-3 py-2 text-[11px] text-accent-foreground">
                  Drag on the canvas to draw a {roomShape} {ROOM_PRESETS[roomPresetIdx].name.toLowerCase()}.
                </div>
              )}
              {tool === "partition" && (
                <div className="mt-3 rounded-md bg-accent/40 px-3 py-2 text-[11px] text-accent-foreground">
                  Drag inside a room to draw a partition wall.
                </div>
              )}
              {tool === "door" && (
                <div className="mt-3 rounded-md bg-accent/40 px-3 py-2 text-[11px] text-accent-foreground">
                  Click a wall position to drop a door, then rotate it.
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-2 px-1 text-xs font-semibold">Furniture</div>
              {groups.map(g => (
                <div key={g} className="mb-3">
                  <div className="mb-1 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{g}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PALETTE.filter(p => p.group === g).map(el => {
                      const def = DEFAULTS[el.type];
                      return (
                        <button key={el.type} onClick={() => addFurniture(el.type)}
                          className="group flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 text-[10px] transition hover:border-primary hover:bg-accent/30">
                          <div className="grid h-8 w-8 place-items-center rounded-md" style={{ background: def.fill, opacity: def.opacity }}>
                            <el.icon className="h-3.5 w-3.5" style={{ color: def.stroke }} />
                          </div>
                          <span>{def.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {(rooms.length + furniture.length + doors.length + partitions.length) > 0 && (
                <>
                  <div className="mt-4 mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold">
                    <Layers className="h-3.5 w-3.5" /> Layers
                  </div>
                  <ul className="space-y-0.5">
                    {rooms.map(r => (
                      <LayerRow key={r.id} active={selection?.kind==="room" && selection.id===r.id}
                        color={r.fill} label={`▢ ${r.name} (${r.shape})`} onClick={() => setSelection({ kind: "room", id: r.id })} />
                    ))}
                    {partitions.map(pt => (
                      <LayerRow key={pt.id} active={selection?.kind==="partition" && selection.id===pt.id}
                        color={pt.color} label="— Partition" onClick={() => setSelection({ kind: "partition", id: pt.id })} />
                    ))}
                    {doors.map(d => (
                      <LayerRow key={d.id} active={selection?.kind==="door" && selection.id===d.id}
                        color="#1B1A1A" label="⌐ Door" onClick={() => setSelection({ kind: "door", id: d.id })} />
                    ))}
                    {furniture.map(f => (
                      <LayerRow key={f.id} active={selection?.kind==="furniture" && selection.id===f.id}
                        color={f.fill} label={f.name} onClick={() => setSelection({ kind: "furniture", id: f.id })} />
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Search..." className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
          </aside>

          {/* Canvas */}
          <main className="relative flex-1 overflow-hidden bg-canvas">
            <div className="absolute inset-0 p-4">
              <div className="h-full w-full overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
                <FloorCanvas
                  rooms={rooms} doors={doors} partitions={partitions} furniture={furniture}
                  selection={selection} tool={tool}
                  roomFill={ROOM_PRESETS[roomPresetIdx].fill}
                  roomShape={roomShape}
                  onSelect={setSelection}
                  onUpdateFurniture={updateF}
                  onUpdateRoom={updateR}
                  onUpdateDoor={updateD}
                  onUpdatePartition={updateP}
                  onAddRoom={(r) => setRooms(a => [...a, { ...r, name: ROOM_PRESETS[roomPresetIdx].name, fill: ROOM_PRESETS[roomPresetIdx].fill }])}
                  onAddDoor={(d) => setDoors(a => [...a, d])}
                  onAddPartition={(pt) => setPartitions(a => [...a, pt])}
                  onSetTool={setTool}
                />
              </div>
            </div>

            {/* Bottom toolbar */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-lg">
              <ToolBtn active={tool==="select"} onClick={() => setTool("select")} title="Select (V)"><MousePointer2 className="h-4 w-4" /></ToolBtn>
              <ToolBtn active={tool==="room"} onClick={() => setTool("room")} title="Room (R)"><Square className="h-4 w-4" /></ToolBtn>
              <ToolBtn active={tool==="partition"} onClick={() => setTool("partition")} title="Partition (P)"><Minus className="h-4 w-4" /></ToolBtn>
              <ToolBtn active={tool==="door"} onClick={() => setTool("door")} title="Door (D)"><DoorOpen className="h-4 w-4" /></ToolBtn>
              <div className="mx-1 h-5 w-px bg-border" />
              <button disabled={!selection} onClick={duplicateSelection} className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Copy className="h-4 w-4" /></button>
              <button disabled={!selection} onClick={deleteSelection} className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
              <div className="mx-1 h-5 w-px bg-border" />
              <span className="px-2 text-xs text-muted-foreground">
                {tool==="room" ? "Drag to draw room" :
                 tool==="partition" ? "Drag to draw partition" :
                 tool==="door" ? "Click to place door" :
                 selFurn ? selFurn.name : selRoom ? selRoom.name : selDoor ? "Door" : selPart ? "Partition" : "Select an item"}
              </span>
            </div>
          </main>

          {/* Right panel */}
          <aside className="flex w-72 flex-col overflow-y-auto border-l border-border">
            {!selection && (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                <div>
                  <Wind className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  Select a room, door, or furniture to edit its properties.
                </div>
              </div>
            )}

            {selFurn && <FurnitureProps f={selFurn} onChange={(p) => updateF(selFurn.id, p)} onDelete={deleteSelection} onDuplicate={duplicateSelection} />}
            {selRoom && <RoomProps r={selRoom} onChange={(p) => updateR(selRoom.id, p)} onDelete={deleteSelection} onDuplicate={duplicateSelection} />}
            {selDoor && <DoorProps d={selDoor} onChange={(p) => updateD(selDoor.id, p)} onDelete={deleteSelection} />}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
      {children}
    </button>
  );
}

function LayerRow({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${active ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}>
        <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ background: color }} />
        <span className="flex-1 text-left truncate">{label}</span>
      </button>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3">
      <div className="px-3 pb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <div className="w-16 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function NumField({ v, suffix, onChange }: { v: number; suffix?: string; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs">
      <input value={Math.round(v)} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none" />
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0" />
      <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 bg-transparent font-mono uppercase outline-none" />
    </div>
  );
}

function ActionButtons({ onDuplicate, onDelete }: { onDuplicate?: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-2 p-3">
      {onDuplicate && (
        <button onClick={onDuplicate} className="w-full rounded-lg border border-border bg-card py-2 text-sm font-medium hover:bg-secondary">
          Duplicate
        </button>
      )}
      <button onClick={onDelete} className="w-full rounded-lg border border-destructive/30 bg-destructive/10 py-2 text-sm font-medium text-destructive hover:bg-destructive/20">
        Delete
      </button>
    </div>
  );
}

function FurnitureProps({ f, onChange, onDelete, onDuplicate }: { f: Furniture; onChange: (p: Partial<Furniture>) => void; onDelete: () => void; onDuplicate: () => void }) {
  return (
    <>
      <Section title="Furniture">
        <Row label="Name"><input value={f.name} onChange={e => onChange({ name: e.target.value })} className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm" /></Row>
        <Row label="Position"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={f.x} suffix="x" onChange={n => onChange({ x: n })} /><NumField v={f.y} suffix="y" onChange={n => onChange({ y: n })} /></div></Row>
        <Row label="Size"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={f.w} suffix="w" onChange={n => onChange({ w: Math.max(20, n) })} /><NumField v={f.h} suffix="h" onChange={n => onChange({ h: Math.max(20, n) })} /></div></Row>
        <Row label="Radius"><NumField v={f.radius} onChange={n => onChange({ radius: Math.max(0, n) })} /></Row>
        <div className="px-3 pb-2 pt-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Rotation</span><span className="font-mono">{f.rotation}°</span></div>
          <input type="range" min={-180} max={180} value={f.rotation} onChange={e => onChange({ rotation: +e.target.value })} className="w-full accent-primary" />
        </div>
      </Section>
      <Section title="Style">
        <Row label="Fill"><ColorField value={f.fill} onChange={v => onChange({ fill: v })} /></Row>
        <Row label="Stroke"><ColorField value={f.stroke} onChange={v => onChange({ stroke: v })} /></Row>
        <div className="px-3 pb-2 pt-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Opacity</span><span className="font-mono">{Math.round(f.opacity * 100)}%</span></div>
          <input type="range" min={0} max={100} value={Math.round(f.opacity * 100)} onChange={e => onChange({ opacity: +e.target.value / 100 })} className="w-full accent-primary" />
        </div>
      </Section>
      <ActionButtons onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}

function RoomProps({ r, onChange, onDelete, onDuplicate }: { r: Room; onChange: (p: Partial<Room>) => void; onDelete: () => void; onDuplicate: () => void }) {
  return (
    <>
      <Section title="Room">
        <Row label="Name"><input value={r.name} onChange={e => onChange({ name: e.target.value })} className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm" /></Row>
        <Row label="Position"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={r.x} suffix="x" onChange={n => onChange({ x: n })} /><NumField v={r.y} suffix="y" onChange={n => onChange({ y: n })} /></div></Row>
        <Row label="Size"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={r.w} suffix="w" onChange={n => onChange({ w: Math.max(60, n) })} /><NumField v={r.h} suffix="h" onChange={n => onChange({ h: Math.max(60, n) })} /></div></Row>
        <Row label="Floor"><ColorField value={r.fill} onChange={v => onChange({ fill: v })} /></Row>
        <div className="px-3 pb-1 text-xs text-muted-foreground">Quick presets</div>
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {ROOM_PRESETS.map(p => (
            <button key={p.name} onClick={() => onChange({ name: p.name, fill: p.fill })} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-secondary">
              <span className="h-3 w-3 rounded-sm" style={{ background: p.fill }} />{p.name}
            </button>
          ))}
        </div>
      </Section>
      <ActionButtons onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}

function DoorProps({ d, onChange, onDelete }: { d: Door; onChange: (p: Partial<Door>) => void; onDelete: () => void }) {
  return (
    <>
      <Section title="Door">
        <Row label="Position"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={d.x} suffix="x" onChange={n => onChange({ x: n })} /><NumField v={d.y} suffix="y" onChange={n => onChange({ y: n })} /></div></Row>
        <Row label="Size"><NumField v={d.size} suffix="px" onChange={n => onChange({ size: Math.max(20, n) })} /></Row>
        <div className="px-3 pb-2 pt-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Rotation</span><span className="font-mono">{d.rotation}°</span></div>
          <input type="range" min={-180} max={180} value={d.rotation} onChange={e => onChange({ rotation: +e.target.value })} className="w-full accent-primary" />
        </div>
      </Section>
      <ActionButtons onDelete={onDelete} />
    </>
  );
}
