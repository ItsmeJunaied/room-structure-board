import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Home, Sparkles, Monitor, Tablet, Smartphone, Eye, Moon, Sun, Download,
  Trash2, Copy, MousePointer2, Search, ChevronDown,
  Square, DoorOpen, Sofa, Bed, Armchair, Lamp, Flower2, Tv, Bath, Wind, Layers,
  Circle, Minus, Shapes, Lock, Unlock, Group, Ungroup, Scissors, Clipboard, ArrowUp, ArrowDown,
  Scissors as ScissorsIcon, Coins, UtensilsCrossed, CircleDot,
} from "lucide-react";
import { FloorCanvas, type ContextMenuEvent } from "@/components/FloorCanvas";
import {
  DEFAULTS, ROOM_PRESETS, ROOM_SHAPES,
  type Furniture, type FurnitureType, type Room, type Door, type Partition, type Selection, type Tool, type RoomShape, type BoardKind,
} from "@/lib/floorplan-types";

export const Route = createFileRoute("/")({ component: Index });

const uid = () => crypto.randomUUID();

const FLOOR_PALETTE: { type: FurnitureType; icon: typeof Square; group: string }[] = [
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

const SALON_PALETTE: { type: FurnitureType; icon: typeof Square; group: string }[] = [
  { type: "salon-chair", icon: ScissorsIcon, group: "Salon" },
  { type: "massage-bed", icon: Bed, group: "Salon" },
  { type: "cash-counter", icon: Coins, group: "Salon" },
  { type: "mirror", icon: Square, group: "Salon" },
  { type: "plant", icon: Flower2, group: "Decor" },
];

const RESTAURANT_PALETTE: { type: FurnitureType; icon: typeof Square; group: string }[] = [
  { type: "dining-rect", icon: UtensilsCrossed, group: "Tables" },
  { type: "dining-round", icon: CircleDot, group: "Tables" },
  { type: "dining-square", icon: Square, group: "Tables" },
  { type: "booth", icon: Sofa, group: "Tables" },
  { type: "cash-counter", icon: Coins, group: "Service" },
  { type: "plant", icon: Flower2, group: "Decor" },
  { type: "lamp", icon: Lamp, group: "Decor" },
];

const BOARDS: { id: BoardKind; name: string }[] = [
  { id: "floor", name: "My Floor Plan" },
  { id: "salon", name: "Salon Board" },
  { id: "restaurant", name: "Restaurant Board" },
];

interface BoardState {
  rooms: Room[];
  doors: Door[];
  partitions: Partition[];
  furniture: Furniture[];
  groups: Record<string, string[]>; // groupId -> member ids
  locked: string[];
}

const emptyBoard = (): BoardState => ({ rooms: [], doors: [], partitions: [], furniture: [], groups: {}, locked: [] });

function Index() {
  const [board, setBoard] = useState<BoardKind>("floor");
  const [boards, setBoards] = useState<Record<BoardKind, BoardState>>({
    floor: emptyBoard(),
    salon: emptyBoard(),
    restaurant: emptyBoard(),
  });
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);

  const [selection, setSelection] = useState<Selection>(null);
  const [multiSelection, setMultiSelection] = useState<string[]>([]); // ids
  const [tool, setTool] = useState<Tool>("select");
  const [roomPresetIdx, setRoomPresetIdx] = useState(0);
  const [roomShape, setRoomShape] = useState<RoomShape>("rect");
  const [dark, setDark] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const state = boards[board];
  const lockedSet = new Set(state.locked);

  const setState = (patch: Partial<BoardState> | ((s: BoardState) => BoardState)) => {
    setBoards(prev => {
      const next = typeof patch === "function" ? patch(prev[board]) : { ...prev[board], ...patch };
      return { ...prev, [board]: next };
    });
  };

  const PALETTE = board === "salon" ? SALON_PALETTE : FLOOR_PALETTE;

  // Reset selection when switching boards
  useEffect(() => { setSelection(null); setMultiSelection([]); setCtxMenu(null); }, [board]);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection) deleteSelection();
      if (e.key === "Escape") { setTool("select"); setSelection(null); setMultiSelection([]); setCtxMenu(null); }
      if (e.key.toLowerCase() === "r") setTool("room");
      if (e.key.toLowerCase() === "d") setTool("door");
      if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey) setTool("partition");
      if (e.key.toLowerCase() === "v") setTool("select");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection(); else groupSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, multiSelection, board]);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  const updateF = (id: string, patch: Partial<Furniture>) => {
    setState(s => {
      // If part of a group and moving (x/y delta), translate the group together
      const groupId = Object.keys(s.groups).find(gid => s.groups[gid].includes(id));
      if (groupId && (patch.x !== undefined || patch.y !== undefined)) {
        const cur = s.furniture.find(f => f.id === id);
        if (cur) {
          const dx = patch.x !== undefined ? patch.x - cur.x : 0;
          const dy = patch.y !== undefined ? patch.y - cur.y : 0;
          const ids = s.groups[groupId];
          return { ...s, furniture: s.furniture.map(f => ids.includes(f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f) };
        }
      }
      return { ...s, furniture: s.furniture.map(f => f.id === id ? { ...f, ...patch } : f) };
    });
  };
  const updateR = (id: string, patch: Partial<Room>) =>
    setState(s => ({ ...s, rooms: s.rooms.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const updateD = (id: string, patch: Partial<Door>) =>
    setState(s => ({ ...s, doors: s.doors.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const updateP = (id: string, patch: Partial<Partition>) =>
    setState(s => ({ ...s, partitions: s.partitions.map(x => x.id === id ? { ...x, ...patch } : x) }));

  const addFurniture = (type: FurnitureType) => {
    const target = state.rooms[0];
    const def = DEFAULTS[type];
    const cx = target ? target.x + target.w / 2 : 600;
    const cy = target ? target.y + target.h / 2 : 400;
    const item: Furniture = { ...def, id: uid(), x: cx - def.w / 2, y: cy - def.h / 2 };
    setState(s => ({ ...s, furniture: [...s.furniture, item] }));
    setSelection({ kind: "furniture", id: item.id });
    setTool("select");
  };

  const handleSelect = (s: Selection, additive?: boolean) => {
    if (additive && s && "id" in s) {
      setMultiSelection(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id]);
      setSelection(s);
    } else {
      setSelection(s);
      setMultiSelection(s && "id" in s ? [s.id] : []);
    }
  };

  const deleteSelection = () => {
    const ids = multiSelection.length > 0 ? multiSelection : (selection && "id" in selection ? [selection.id] : []);
    if (ids.length === 0) return;
    setState(s => ({
      ...s,
      furniture: s.furniture.filter(x => !ids.includes(x.id)),
      rooms: s.rooms.filter(x => !ids.includes(x.id)),
      doors: s.doors.filter(x => !ids.includes(x.id)),
      partitions: s.partitions.filter(x => !ids.includes(x.id)),
      locked: s.locked.filter(x => !ids.includes(x)),
      groups: Object.fromEntries(Object.entries(s.groups).map(([gid, members]) => [gid, members.filter(m => !ids.includes(m))]).filter(([, m]) => (m as string[]).length > 1)),
    }));
    setSelection(null); setMultiSelection([]); setCtxMenu(null);
  };

  const duplicateSelection = () => {
    if (!selection) return;
    if (selection.kind === "furniture") {
      const f = state.furniture.find(x => x.id === selection.id); if (!f) return;
      const dup = { ...f, id: uid(), x: f.x + 24, y: f.y + 24 };
      setState(s => ({ ...s, furniture: [...s.furniture, dup] }));
      setSelection({ kind: "furniture", id: dup.id });
    } else if (selection.kind === "room") {
      const r = state.rooms.find(x => x.id === selection.id); if (!r) return;
      const dup = { ...r, id: uid(), x: r.x + 24, y: r.y + 24 };
      setState(s => ({ ...s, rooms: [...s.rooms, dup] }));
      setSelection({ kind: "room", id: dup.id });
    } else if (selection.kind === "partition") {
      const pt = state.partitions.find(x => x.id === selection.id); if (!pt) return;
      const dup = { ...pt, id: uid(), x1: pt.x1 + 20, y1: pt.y1 + 20, x2: pt.x2 + 20, y2: pt.y2 + 20 };
      setState(s => ({ ...s, partitions: [...s.partitions, dup] }));
      setSelection({ kind: "partition", id: dup.id });
    }
    setCtxMenu(null);
  };

  const toggleLockSelection = () => {
    const ids = multiSelection.length > 0 ? multiSelection : (selection && "id" in selection ? [selection.id] : []);
    if (ids.length === 0) return;
    setState(s => {
      const allLocked = ids.every(i => s.locked.includes(i));
      return { ...s, locked: allLocked ? s.locked.filter(i => !ids.includes(i)) : Array.from(new Set([...s.locked, ...ids])) };
    });
    setCtxMenu(null);
  };

  const groupSelection = () => {
    if (multiSelection.length < 2) return;
    const gid = uid();
    setState(s => ({ ...s, groups: { ...s.groups, [gid]: [...multiSelection] } }));
    setCtxMenu(null);
  };

  const ungroupSelection = () => {
    const ids = multiSelection.length > 0 ? multiSelection : (selection && "id" in selection ? [selection.id] : []);
    setState(s => {
      const next = { ...s.groups };
      for (const gid of Object.keys(next)) {
        if (next[gid].some(m => ids.includes(m))) delete next[gid];
      }
      return { ...s, groups: next };
    });
    setCtxMenu(null);
  };

  const reorder = (dir: "front" | "back") => {
    if (!selection || selection.kind !== "furniture") return;
    setState(s => {
      const idx = s.furniture.findIndex(f => f.id === selection.id);
      if (idx < 0) return s;
      const arr = [...s.furniture];
      const [item] = arr.splice(idx, 1);
      if (dir === "front") arr.push(item); else arr.unshift(item);
      return { ...s, furniture: arr };
    });
    setCtxMenu(null);
  };

  const exportJSON = () => {
    const data = JSON.stringify({ board, ...state }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${board}-plan.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (!confirm("Clear this board?")) return;
    setState(emptyBoard());
    setSelection(null); setMultiSelection([]);
  };

  const onContextMenu = (e: ContextMenuEvent) => {
    setCtxMenu({ x: e.x, y: e.y });
  };

  const groups = Array.from(new Set(PALETTE.map(p => p.group)));
  const selFurn = selection?.kind === "furniture" ? state.furniture.find(f => f.id === selection.id) : null;
  const selRoom = selection?.kind === "room" ? state.rooms.find(r => r.id === selection.id) : null;
  const selDoor = selection?.kind === "door" ? state.doors.find(d => d.id === selection.id) : null;
  const selPart = selection?.kind === "partition" ? state.partitions.find(p => p.id === selection.id) : null;

  const totalCount = state.rooms.length + state.furniture.length + state.doors.length + state.partitions.length;
  const isSelLocked = selection && "id" in selection ? lockedSet.has(selection.id) : false;
  const currentBoardName = BOARDS.find(b => b.id === board)!.name;

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Home className="h-4 w-4" /> Archy.
            </div>
            <div className="relative">
              <button
                onClick={() => setBoardMenuOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm hover:bg-accent/40"
              >
                <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                </span>
                <span className="font-medium">{currentBoardName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {boardMenuOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-lg">
                  {BOARDS.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setBoard(b.id); setBoardMenuOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-secondary ${board === b.id ? "bg-accent/40" : ""}`}
                    >
                      <span className="grid h-5 w-5 place-items-center rounded bg-primary/15 text-primary">
                        {b.id === "salon" ? <ScissorsIcon className="h-3 w-3" /> : <Home className="h-3 w-3" />}
                      </span>
                      <span className="flex-1">{b.name}</span>
                      {board === b.id && <span className="text-xs text-primary">●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
            {[Monitor, Tablet, Smartphone].map((I, i) => (
              <button key={i} className="rounded-md p-1.5 hover:bg-secondary"><I className="h-4 w-4" /></button>
            ))}
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-2 font-mono text-xs text-muted-foreground">
              {state.rooms.length} room{state.rooms.length === 1 ? "" : "s"} · {state.furniture.length} item{state.furniture.length === 1 ? "" : "s"}
              {multiSelection.length > 1 && ` · ${multiSelection.length} selected`}
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
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Build</span>
                <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                  {board === "salon" ? "Salon" : "Floor"}
                </span>
              </div>
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

              <div className="mt-3 rounded-md bg-accent/30 px-3 py-2 text-[11px] text-accent-foreground">
                <div><b>Ctrl + Scroll</b> — zoom</div>
                <div><b>Space + Drag</b> — pan canvas</div>
                <div><b>Right-click</b> — context menu</div>
                <div><b>Shift + Click</b> — multi-select</div>
              </div>
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
                          <span className="text-center leading-tight">{def.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {totalCount > 0 && (
                <>
                  <div className="mt-4 mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold">
                    <Layers className="h-3.5 w-3.5" /> Layers
                  </div>
                  <ul className="space-y-0.5">
                    {state.rooms.map(r => (
                      <LayerRow key={r.id} active={selection?.kind==="room" && selection.id===r.id}
                        locked={lockedSet.has(r.id)}
                        color={r.fill} label={`▢ ${r.name} (${r.shape})`} onClick={() => handleSelect({ kind: "room", id: r.id })} />
                    ))}
                    {state.partitions.map(pt => (
                      <LayerRow key={pt.id} active={selection?.kind==="partition" && selection.id===pt.id}
                        color={pt.color} label="— Partition" onClick={() => handleSelect({ kind: "partition", id: pt.id })} />
                    ))}
                    {state.doors.map(d => (
                      <LayerRow key={d.id} active={selection?.kind==="door" && selection.id===d.id}
                        color="#1B1A1A" label="⌐ Door" onClick={() => handleSelect({ kind: "door", id: d.id })} />
                    ))}
                    {state.furniture.map(f => (
                      <LayerRow key={f.id} active={selection?.kind==="furniture" && selection.id===f.id}
                        locked={lockedSet.has(f.id)}
                        color={f.fill} label={f.name} onClick={() => handleSelect({ kind: "furniture", id: f.id })} />
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
                  rooms={state.rooms} doors={state.doors} partitions={state.partitions} furniture={state.furniture}
                  selection={selection}
                  multiSelection={multiSelection}
                  lockedIds={lockedSet}
                  tool={tool}
                  roomFill={ROOM_PRESETS[roomPresetIdx].fill}
                  roomShape={roomShape}
                  onSelect={handleSelect}
                  onUpdateFurniture={updateF}
                  onUpdateRoom={updateR}
                  onUpdateDoor={updateD}
                  onUpdatePartition={updateP}
                  onAddRoom={(r) => setState(s => ({ ...s, rooms: [...s.rooms, { ...r, name: ROOM_PRESETS[roomPresetIdx].name, fill: ROOM_PRESETS[roomPresetIdx].fill }] }))}
                  onAddDoor={(d) => setState(s => ({ ...s, doors: [...s.doors, d] }))}
                  onAddPartition={(pt) => setState(s => ({ ...s, partitions: [...s.partitions, pt] }))}
                  onSetTool={setTool}
                  onContextMenu={onContextMenu}
                />
              </div>
            </div>

            {/* Context Menu */}
            {ctxMenu && (
              <div
                className="fixed z-50 min-w-[200px] rounded-xl border border-border bg-card p-1 shadow-2xl"
                style={{ left: Math.min(ctxMenu.x, window.innerWidth - 220), top: Math.min(ctxMenu.y, window.innerHeight - 360) }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <CtxItem icon={Copy} label="Duplicate" shortcut="⌘D" disabled={!selection} onClick={duplicateSelection} />
                <CtxItem icon={Clipboard} label="Copy" shortcut="⌘C" disabled={!selection} onClick={duplicateSelection} />
                <CtxDivider />
                <CtxItem icon={isSelLocked ? Unlock : Lock} label={isSelLocked ? "Unlock" : "Lock"} disabled={!selection} onClick={toggleLockSelection} />
                <CtxItem icon={Group} label="Group" shortcut="⌘G" disabled={multiSelection.length < 2} onClick={groupSelection} />
                <CtxItem icon={Ungroup} label="Ungroup" shortcut="⇧⌘G" disabled={!selection} onClick={ungroupSelection} />
                <CtxDivider />
                <CtxItem icon={ArrowUp} label="Bring to Front" disabled={selection?.kind !== "furniture"} onClick={() => reorder("front")} />
                <CtxItem icon={ArrowDown} label="Send to Back" disabled={selection?.kind !== "furniture"} onClick={() => reorder("back")} />
                <CtxDivider />
                <CtxItem icon={Scissors} label="Delete" shortcut="⌫" disabled={!selection} onClick={deleteSelection} destructive />
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-lg">
              <ToolBtn active={tool==="select"} onClick={() => setTool("select")} title="Select (V)"><MousePointer2 className="h-4 w-4" /></ToolBtn>
              <ToolBtn active={tool==="room"} onClick={() => setTool("room")} title="Room (R)"><Square className="h-4 w-4" /></ToolBtn>
              <ToolBtn active={tool==="partition"} onClick={() => setTool("partition")} title="Partition (P)"><Minus className="h-4 w-4" /></ToolBtn>
              <ToolBtn active={tool==="door"} onClick={() => setTool("door")} title="Door (D)"><DoorOpen className="h-4 w-4" /></ToolBtn>
              <div className="mx-1 h-5 w-px bg-border" />
              <button disabled={!selection} onClick={duplicateSelection} title="Duplicate" className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Copy className="h-4 w-4" /></button>
              <button disabled={!selection} onClick={toggleLockSelection} title="Lock/Unlock" className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40">
                {isSelLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </button>
              <button disabled={multiSelection.length < 2} onClick={groupSelection} title="Group (⌘G)" className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Group className="h-4 w-4" /></button>
              <button disabled={!selection} onClick={deleteSelection} title="Delete" className="rounded-lg p-2 hover:bg-secondary disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
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
            {selPart && <PartitionProps p={selPart} onChange={(patch) => updateP(selPart.id, patch)} onDelete={deleteSelection} onDuplicate={duplicateSelection} />}
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

function LayerRow({ active, color, label, onClick, locked }: { active: boolean; color: string; label: string; onClick: () => void; locked?: boolean }) {
  return (
    <li>
      <button onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${active ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}>
        <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ background: color }} />
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </button>
    </li>
  );
}

function CtxItem({ icon: Icon, label, shortcut, onClick, disabled, destructive }: { icon: typeof Square; label: string; shortcut?: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition disabled:opacity-40 ${destructive ? "text-destructive hover:bg-destructive/10" : "hover:bg-secondary"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[10px] font-mono text-muted-foreground">{shortcut}</span>}
    </button>
  );
}

function CtxDivider() {
  return <div className="my-1 h-px bg-border" />;
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
        <div className="px-3 pb-1 text-xs text-muted-foreground">Shape</div>
        <div className="flex gap-1 px-3 pb-2">
          {ROOM_SHAPES.map(s => (
            <button key={s.value} onClick={() => onChange({ shape: s.value })}
              className={`flex-1 rounded-md border px-2 py-1 text-[11px] ${r.shape===s.value ? "border-primary bg-accent/40" : "border-border hover:bg-secondary"}`}>
              {s.label}
            </button>
          ))}
        </div>
        {r.shape === "l-shape" && (
          <>
            <Row label="Notch">
              <input type="range" min={20} max={75} value={Math.round((r.notch ?? 0.45) * 100)}
                onChange={e => onChange({ notch: +e.target.value / 100 })} className="w-full accent-primary" />
            </Row>
            <div className="px-3 pb-1 text-xs text-muted-foreground">Cut corner</div>
            <div className="grid grid-cols-4 gap-1 px-3 pb-2">
              {(["tl","tr","bl","br"] as const).map(c => (
                <button key={c} onClick={() => onChange({ corner: c })}
                  className={`rounded-md border px-2 py-1 text-[11px] uppercase ${r.corner===c ? "border-primary bg-accent/40" : "border-border hover:bg-secondary"}`}>
                  {c}
                </button>
              ))}
            </div>
          </>
        )}
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

function PartitionProps({ p, onChange, onDelete, onDuplicate }: { p: Partition; onChange: (patch: Partial<Partition>) => void; onDelete: () => void; onDuplicate: () => void }) {
  const len = Math.round(Math.hypot(p.x2 - p.x1, p.y2 - p.y1));
  const angle = Math.round(Math.atan2(p.y2 - p.y1, p.x2 - p.x1) * 180 / Math.PI);
  return (
    <>
      <Section title="Partition Wall">
        <Row label="Start"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={p.x1} suffix="x" onChange={n => onChange({ x1: n })} /><NumField v={p.y1} suffix="y" onChange={n => onChange({ y1: n })} /></div></Row>
        <Row label="End"><div className="grid w-full grid-cols-2 gap-1.5"><NumField v={p.x2} suffix="x" onChange={n => onChange({ x2: n })} /><NumField v={p.y2} suffix="y" onChange={n => onChange({ y2: n })} /></div></Row>
        <Row label="Length"><div className="text-xs font-mono text-muted-foreground">{len}px · {angle}°</div></Row>
        <div className="px-3 pb-2 pt-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Thickness</span><span className="font-mono">{p.thickness}px</span></div>
          <input type="range" min={2} max={20} value={p.thickness} onChange={e => onChange({ thickness: +e.target.value })} className="w-full accent-primary" />
        </div>
        <Row label="Color"><ColorField value={p.color} onChange={v => onChange({ color: v })} /></Row>
      </Section>
      <ActionButtons onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
