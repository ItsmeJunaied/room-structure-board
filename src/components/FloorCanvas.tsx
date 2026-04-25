import { useEffect, useRef, useState } from "react";
import { roomPath } from "@/lib/floorplan-types";
import type { Furniture, Room, Door, Partition, Selection, Tool, RoomShape } from "@/lib/floorplan-types";

export interface ContextMenuEvent {
  x: number; y: number;
  target: Selection;
}

interface Props {
  rooms: Room[];
  doors: Door[];
  partitions: Partition[];
  furniture: Furniture[];
  selection: Selection;
  multiSelection?: string[];
  lockedIds?: Set<string>;
  tool: Tool;
  roomFill: string;
  roomShape: RoomShape;
  /** When true, all editing/dragging is disabled. Furniture click fires onPickFurniture. */
  readOnly?: boolean;
  /** Always show furniture name labels above each item. */
  showLabels?: boolean;
  /** POS-style label override per furniture id (e.g. "Chair 1"). */
  furnitureLabel?: (f: Furniture) => string | null;
  /** POS status badge per furniture id. */
  furnitureStatus?: (f: Furniture) => "idle" | "active" | "reserved" | null;
  onPickFurniture?: (f: Furniture) => void;
  onHoverFurniture?: (f: Furniture | null) => void;
  onSelect: (s: Selection, additive?: boolean) => void;
  onUpdateFurniture: (id: string, patch: Partial<Furniture>) => void;
  onUpdateRoom: (id: string, patch: Partial<Room>) => void;
  onUpdateDoor: (id: string, patch: Partial<Door>) => void;
  onUpdatePartition: (id: string, patch: Partial<Partition>) => void;
  onAddRoom: (r: Room) => void;
  onAddDoor: (d: Door) => void;
  onAddPartition: (p: Partition) => void;
  onSetTool: (t: Tool) => void;
  /** Called once at the start of a user-driven edit (drag move/resize/rotate) so the parent can checkpoint history. */
  onBeginEdit?: () => void;
  onContextMenu?: (e: ContextMenuEvent) => void;
  /** Called when user drags a marquee on empty canvas. Box is in SVG coords. */
  onMarquee?: (box: { x: number; y: number; w: number; h: number }, additive: boolean) => void;
}

type Drag =
  | { kind: "moveF"; id: string; offX: number; offY: number }
  | { kind: "moveR"; id: string; offX: number; offY: number }
  | { kind: "moveD"; id: string; offX: number; offY: number }
  | { kind: "moveP"; id: string; offX: number; offY: number; orig: Partition }
  | { kind: "endP"; id: string; which: 1 | 2 }
  | { kind: "resizeF"; id: string; handle: string; sx: number; sy: number; orig: Furniture }
  | { kind: "resizeR"; id: string; handle: string; sx: number; sy: number; orig: Room }
  | { kind: "rotateF"; id: string; cx: number; cy: number }
  | { kind: "rotateD"; id: string; cx: number; cy: number }
  | { kind: "drawRoom"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "drawPart"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "marquee"; x1: number; y1: number; x2: number; y2: number; additive: boolean; moved: boolean }
  | { kind: "pan"; sx: number; sy: number; ovx: number; ovy: number }
  | null;

const uid = () => crypto.randomUUID();

const W = 4000, H = 3000;

export function FloorCanvas(p: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag>(null);

  // viewport: viewBox controls infinite-ish pan/zoom
  const [view, setView] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const [spaceDown, setSpaceDown] = useState(false);

  const locked = p.lockedIds ?? new Set<string>();

  const isMulti = (id: string) =>
    p.multiSelection?.includes(id) ||
    (p.selection && "id" in p.selection && p.selection.id === id);

  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };

  // Space-to-pan
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(true); };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // Ctrl+wheel zoom
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      // Always zoom on scroll inside the canvas (Figma-like). Ctrl/meta still works.
      e.preventDefault();
      const { x: mx, y: my } = toSvg(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      setView(v => {
        const nw = Math.min(8000, Math.max(200, v.w * factor));
        const nh = Math.min(6000, Math.max(150, v.h * factor));
        // keep cursor anchor stable
        const nx = mx - (mx - v.x) * (nw / v.w);
        const ny = my - (my - v.y) * (nh / v.h);
        return { x: nx, y: ny, w: nw, h: nh };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const { x, y } = toSvg(e.clientX, e.clientY);
      switch (drag.kind) {
        case "pan": {
          // pan based on screen delta scaled into viewBox units
          const svg = svgRef.current!;
          const rect = svg.getBoundingClientRect();
          const sxRatio = view.w / rect.width;
          const syRatio = view.h / rect.height;
          const dx = (e.clientX - drag.sx) * sxRatio;
          const dy = (e.clientY - drag.sy) * syRatio;
          setView(v => ({ ...v, x: drag.ovx - dx, y: drag.ovy - dy }));
          break;
        }
        case "moveF": p.onUpdateFurniture(drag.id, { x: x - drag.offX, y: y - drag.offY }); break;
        case "moveR": p.onUpdateRoom(drag.id, { x: x - drag.offX, y: y - drag.offY }); break;
        case "moveD": p.onUpdateDoor(drag.id, { x: x - drag.offX, y: y - drag.offY }); break;
        case "moveP": {
          const dx = x - drag.offX, dy = y - drag.offY;
          const o = drag.orig;
          p.onUpdatePartition(drag.id, { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy });
          break;
        }
        case "endP":
          p.onUpdatePartition(drag.id, drag.which === 1 ? { x1: x, y1: y } : { x2: x, y2: y });
          break;
        case "resizeF": {
          const o = drag.orig; let { x: nx, y: ny, w, h } = o;
          const dx = x - drag.sx, dy = y - drag.sy;
          if (drag.handle.includes("e")) w = Math.max(20, o.w + dx);
          if (drag.handle.includes("s")) h = Math.max(20, o.h + dy);
          if (drag.handle.includes("w")) { w = Math.max(20, o.w - dx); nx = o.x + (o.w - w); }
          if (drag.handle.includes("n")) { h = Math.max(20, o.h - dy); ny = o.y + (o.h - h); }
          p.onUpdateFurniture(drag.id, { x: nx, y: ny, w, h }); break;
        }
        case "resizeR": {
          const o = drag.orig; let { x: nx, y: ny, w, h } = o;
          const dx = x - drag.sx, dy = y - drag.sy;
          if (drag.handle.includes("e")) w = Math.max(60, o.w + dx);
          if (drag.handle.includes("s")) h = Math.max(60, o.h + dy);
          if (drag.handle.includes("w")) { w = Math.max(60, o.w - dx); nx = o.x + (o.w - w); }
          if (drag.handle.includes("n")) { h = Math.max(60, o.h - dy); ny = o.y + (o.h - h); }
          p.onUpdateRoom(drag.id, { x: nx, y: ny, w, h }); break;
        }
        case "rotateF": {
          const a = (Math.atan2(y - drag.cy, x - drag.cx) * 180) / Math.PI + 90;
          p.onUpdateFurniture(drag.id, { rotation: Math.round(a) }); break;
        }
        case "rotateD": {
          const a = (Math.atan2(y - drag.cy, x - drag.cx) * 180) / Math.PI;
          p.onUpdateDoor(drag.id, { rotation: Math.round(a) }); break;
        }
        case "drawRoom": setDrag({ ...drag, x2: x, y2: y }); break;
        case "drawPart": setDrag({ ...drag, x2: x, y2: y }); break;
        case "marquee": {
          const dx = Math.abs(x - drag.x1), dy = Math.abs(y - drag.y1);
          setDrag({ ...drag, x2: x, y2: y, moved: drag.moved || dx > 4 || dy > 4 });
          break;
        }
      }
    };
    const onUp = (e: MouseEvent) => {
      if (drag.kind === "drawRoom") {
        const { x, y } = toSvg(e.clientX, e.clientY);
        const x1 = Math.min(drag.x1, x), y1 = Math.min(drag.y1, y);
        const w = Math.abs(x - drag.x1), h = Math.abs(y - drag.y1);
        if (w > 40 && h > 40) {
          const room: Room = { id: uid(), name: "Room", shape: p.roomShape, x: x1, y: y1, w, h, fill: p.roomFill, notch: 0.45, corner: "tr" };
          p.onAddRoom(room);
          p.onSelect({ kind: "room", id: room.id });
          p.onSetTool("select");
        }
      } else if (drag.kind === "drawPart") {
        const { x, y } = toSvg(e.clientX, e.clientY);
        const dx = x - drag.x1, dy = y - drag.y1;
        if (Math.hypot(dx, dy) > 16) {
          const part: Partition = { id: uid(), x1: drag.x1, y1: drag.y1, x2: x, y2: y, thickness: 6, color: "#1B1A1A" };
          p.onAddPartition(part);
          p.onSelect({ kind: "partition", id: part.id });
          p.onSetTool("select");
        }
      } else if (drag.kind === "marquee") {
        if (drag.moved) {
          const x = Math.min(drag.x1, drag.x2), y = Math.min(drag.y1, drag.y2);
          const w = Math.abs(drag.x2 - drag.x1), h = Math.abs(drag.y2 - drag.y1);
          if (w > 4 && h > 4) p.onMarquee?.({ x, y, w, h }, drag.additive);
        }
      }
      setDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, p, view]);

  const onBgDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const isBg = target === svgRef.current || target.id === "bg";
    // Pan: space + drag (anywhere) or middle mouse — allowed even in readOnly
    if ((spaceDown && e.button === 0) || e.button === 1) {
      e.preventDefault();
      setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, ovx: view.x, ovy: view.y });
      return;
    }
    if (p.readOnly) {
      if (isBg) p.onSelect(null);
      return;
    }
    if (!isBg) return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    if (p.tool === "room") {
      setDrag({ kind: "drawRoom", x1: x, y1: y, x2: x, y2: y });
    } else if (p.tool === "partition") {
      setDrag({ kind: "drawPart", x1: x, y1: y, x2: x, y2: y });
    } else if (p.tool === "door") {
      const d: Door = { id: uid(), x, y, size: 50, rotation: 0 };
      p.onAddDoor(d);
      p.onSelect({ kind: "door", id: d.id });
      p.onSetTool("select");
    } else {
      // Marquee select on empty canvas
      setDrag({ kind: "marquee", x1: x, y1: y, x2: x, y2: y, additive: e.shiftKey, moved: false });
      if (!e.shiftKey) p.onSelect(null);
    }
  };

  const onBgContext = (e: React.MouseEvent) => {
    e.preventDefault();
    p.onContextMenu?.({ x: e.clientX, y: e.clientY, target: null });
  };

  const cursor = spaceDown
    ? (drag?.kind === "pan" ? "grabbing" : "grab")
    : (p.tool === "room" || p.tool === "door" || p.tool === "partition" ? "crosshair" : "default");

  return (
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className="h-full w-full select-none"
      style={{ cursor }}
      onMouseDown={onBgDown}
      onContextMenu={onBgContext}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--canvas-grid)" strokeWidth="0.5" />
        </pattern>
        <pattern id="bigGrid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#grid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="var(--canvas-grid)" strokeWidth="1" opacity="0.6" />
        </pattern>
        <pattern id="bedTexture" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.55 0.1 152)" strokeWidth="2" opacity="0.4" />
        </pattern>
      </defs>

      <rect id="bg" x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#bigGrid)" />

      {p.rooms.length === 0 && p.furniture.length === 0 && p.tool === "select" && (
        <g pointerEvents="none">
          <text x={view.x + view.w / 2} y={view.y + view.h / 2 - 10} textAnchor="middle" fontSize="20" fill="var(--muted-foreground)" fontStyle="italic">
            Empty canvas
          </text>
          <text x={view.x + view.w / 2} y={view.y + view.h / 2 + 18} textAnchor="middle" fontSize="13" fill="var(--muted-foreground)">
            Ctrl+scroll to zoom · Space+drag to pan · Right-click for menu
          </text>
        </g>
      )}

      {/* Rooms */}
      {p.rooms.map(r => {
        const sel = isMulti(r.id);
        const isLocked = locked.has(r.id);
        return (
          <g key={r.id}>
            <path
              d={roomPath(r)}
              fill={r.fill}
              stroke={sel ? "var(--primary)" : "var(--wall)"}
              strokeWidth={sel ? 5 : 4}
              strokeLinejoin="miter"
              style={{ cursor: p.readOnly ? "default" : (isLocked ? "not-allowed" : "move") }}
              onMouseDown={(e) => {
                if (spaceDown || e.button === 1) return;
                if (p.readOnly) return;
                e.stopPropagation();
                p.onSelect({ kind: "room", id: r.id }, e.shiftKey);
                if (isLocked) return;
                const { x, y } = toSvg(e.clientX, e.clientY);
                p.onBeginEdit?.();
                setDrag({ kind: "moveR", id: r.id, offX: x - r.x, offY: y - r.y });
              }}
              onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (p.readOnly) return;
                p.onSelect({ kind: "room", id: r.id });
                p.onContextMenu?.({ x: e.clientX, y: e.clientY, target: { kind: "room", id: r.id } });
              }}
            />
            <text x={r.x + 12} y={r.y + 22} fontSize="12" fontStyle="italic" fill="var(--muted-foreground)" pointerEvents="none">
              {r.name} · {Math.round(r.w)}×{Math.round(r.h)} · {r.shape}{isLocked ? " · 🔒" : ""}
            </text>
          </g>
        );
      })}

      {/* Partitions */}
      {p.partitions.map(pt => {
        const sel = p.selection?.kind === "partition" && p.selection.id === pt.id;
        return (
          <g key={pt.id}>
            <line
              x1={pt.x1} y1={pt.y1} x2={pt.x2} y2={pt.y2}
              stroke={pt.color} strokeWidth={pt.thickness} strokeLinecap="round"
              style={{ cursor: "move" }}
              onMouseDown={(e) => {
                if (spaceDown) return;
                e.stopPropagation();
                p.onSelect({ kind: "partition", id: pt.id });
                const { x, y } = toSvg(e.clientX, e.clientY);
                p.onBeginEdit?.();
                setDrag({ kind: "moveP", id: pt.id, offX: x, offY: y, orig: pt });
              }}
              onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation();
                p.onSelect({ kind: "partition", id: pt.id });
                p.onContextMenu?.({ x: e.clientX, y: e.clientY, target: { kind: "partition", id: pt.id } });
              }}
            />
            {sel && (
              <>
                <line x1={pt.x1} y1={pt.y1} x2={pt.x2} y2={pt.y2}
                  stroke="var(--primary)" strokeWidth={pt.thickness + 2} strokeLinecap="round" opacity="0.25" pointerEvents="none" />
                {[1, 2].map(w => {
                  const ex = w === 1 ? pt.x1 : pt.x2;
                  const ey = w === 1 ? pt.y1 : pt.y2;
                  return (
                    <circle key={w} cx={ex} cy={ey} r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5"
                      style={{ cursor: "grab" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        p.onBeginEdit?.();
                        setDrag({ kind: "endP", id: pt.id, which: w as 1 | 2 });
                      }}
                    />
                  );
                })}
              </>
            )}
          </g>
        );
      })}

      {/* Doors */}
      {p.doors.map(d => {
        const sel = p.selection?.kind === "door" && p.selection.id === d.id;
        return (
          <g key={d.id} transform={`rotate(${d.rotation} ${d.x} ${d.y})`}>
            <line x1={d.x} y1={d.y} x2={d.x + d.size} y2={d.y} stroke="var(--canvas)" strokeWidth="6" />
            <line x1={d.x} y1={d.y} x2={d.x + d.size} y2={d.y} stroke="var(--wall)" strokeWidth="2" />
            <path d={`M ${d.x} ${d.y} A ${d.size} ${d.size} 0 0 1 ${d.x + d.size} ${d.y - d.size}`}
              fill="none" stroke="var(--wall)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={d.x} cy={d.y} r={sel ? 7 : 5} fill={sel ? "var(--primary)" : "white"} stroke="var(--primary)" strokeWidth="1.5"
              style={{ cursor: "move" }}
              onMouseDown={(e) => {
                if (spaceDown) return;
                e.stopPropagation();
                p.onSelect({ kind: "door", id: d.id });
                const { x, y } = toSvg(e.clientX, e.clientY);
                p.onBeginEdit?.();
                setDrag({ kind: "moveD", id: d.id, offX: x - d.x, offY: y - d.y });
              }}
              onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation();
                p.onSelect({ kind: "door", id: d.id });
                p.onContextMenu?.({ x: e.clientX, y: e.clientY, target: { kind: "door", id: d.id } });
              }}
            />
            {sel && (
              <circle cx={d.x + d.size + 12} cy={d.y} r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5"
                style={{ cursor: "grab" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  p.onBeginEdit?.();
                  setDrag({ kind: "rotateD", id: d.id, cx: d.x, cy: d.y });
                }}
              />
            )}
          </g>
        );
      })}

      {/* Drawing previews */}
      {drag?.kind === "drawRoom" && (() => {
        const x = Math.min(drag.x1, drag.x2), y = Math.min(drag.y1, drag.y2);
        const w = Math.abs(drag.x2 - drag.x1), h = Math.abs(drag.y2 - drag.y1);
        const ghost: Room = { id: "ghost", name: "", shape: p.roomShape, x, y, w, h, fill: p.roomFill, notch: 0.45, corner: "tr" };
        return (
          <path d={roomPath(ghost)} fill={p.roomFill} fillOpacity="0.5"
            stroke="var(--primary)" strokeWidth="2" strokeDasharray="6 4" />
        );
      })()}
      {drag?.kind === "drawPart" && (
        <line x1={drag.x1} y1={drag.y1} x2={drag.x2} y2={drag.y2}
          stroke="var(--primary)" strokeWidth="6" strokeDasharray="6 4" strokeLinecap="round" />
      )}
      {drag?.kind === "marquee" && drag.moved && (() => {
        const x = Math.min(drag.x1, drag.x2), y = Math.min(drag.y1, drag.y2);
        const w = Math.abs(drag.x2 - drag.x1), h = Math.abs(drag.y2 - drag.y1);
        return (
          <rect x={x} y={y} width={w} height={h}
            fill="var(--primary)" fillOpacity="0.08"
            stroke="var(--primary)" strokeWidth="1" strokeDasharray="4 3" pointerEvents="none" />
        );
      })()}

      {/* Furniture */}
      {p.furniture.map(f => {
        const sel = isMulti(f.id);
        const isLocked = locked.has(f.id);
        const cx = f.x + f.w / 2;
        const cy = f.y + f.h / 2;
        const label = p.furnitureLabel?.(f);
        const status = p.furnitureStatus?.(f);
        const showLbl = p.showLabels || !!label;
        return (
          <g key={f.id} transform={`rotate(${f.rotation} ${cx} ${cy})`}>
            <FurnitureShape f={f}
              onMouseDown={(e) => {
                if (spaceDown) return;
                e.stopPropagation();
                if (p.readOnly) {
                  p.onPickFurniture?.(f);
                  p.onSelect({ kind: "furniture", id: f.id });
                  return;
                }
                p.onSelect({ kind: "furniture", id: f.id }, e.shiftKey);
                if (isLocked) return;
                const { x, y } = toSvg(e.clientX, e.clientY);
                p.onBeginEdit?.();
                setDrag({ kind: "moveF", id: f.id, offX: x - f.x, offY: y - f.y });
              }}
              onMouseEnter={() => p.onHoverFurniture?.(f)}
              onMouseLeave={() => p.onHoverFurniture?.(null)}
              onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (p.readOnly) return;
                p.onSelect({ kind: "furniture", id: f.id });
                p.onContextMenu?.({ x: e.clientX, y: e.clientY, target: { kind: "furniture", id: f.id } });
              }}
            />
            {/* Label above the item */}
            {showLbl && (
              <g pointerEvents="none">
                <rect x={cx - 30} y={f.y - 22} width={60} height={16} rx={8}
                  fill="white" stroke="var(--border)" strokeWidth={0.8} opacity={0.95} />
                <text x={cx} y={f.y - 11} textAnchor="middle" fontSize="10" fontWeight="600"
                  fill="var(--foreground)">{label ?? f.name}</text>
              </g>
            )}
            {/* Status dot for POS */}
            {status && (
              <circle cx={f.x + f.w - 6} cy={f.y + 6} r={5}
                fill={status === "active" ? "oklch(0.62 0.16 152)" : status === "reserved" ? "oklch(0.7 0.18 60)" : "oklch(0.85 0.005 240)"}
                stroke="white" strokeWidth={1.5} pointerEvents="none" />
            )}
            {/* Multi-selection highlight (so shift+click feedback is visible) */}
            {sel && (
              <rect x={f.x - 2} y={f.y - 2} width={f.w + 4} height={f.h + 4}
                fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" pointerEvents="none" />
            )}
            {sel && !showLbl && (
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="oklch(0.3 0.05 152)" fontStyle="italic" pointerEvents="none">
                {f.name}{isLocked ? " 🔒" : ""}
              </text>
            )}
          </g>
        );
      })}

      {/* Furniture chrome (single primary selection) */}
      {!p.readOnly && p.selection?.kind === "furniture" && !locked.has(p.selection.id) && (() => {
        const sel = p.furniture.find(f => f.id === p.selection!.id);
        if (!sel) return null;
        const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
        const handles = [
          ["nw", sel.x, sel.y], ["n", cx, sel.y], ["ne", sel.x + sel.w, sel.y],
          ["e", sel.x + sel.w, cy], ["se", sel.x + sel.w, sel.y + sel.h],
          ["s", cx, sel.y + sel.h], ["sw", sel.x, sel.y + sel.h], ["w", sel.x, cy],
        ] as const;
        const cur: Record<string, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
        return (
          <g transform={`rotate(${sel.rotation} ${cx} ${cy})`}>
            <rect x={sel.x} y={sel.y} width={sel.w} height={sel.h} fill="none" stroke="var(--primary)" strokeWidth="1.5" pointerEvents="none" />
            {handles.map(([h, hx, hy]) => (
              <rect key={h as string} x={(hx as number) - 5} y={(hy as number) - 5} width="10" height="10"
                fill="white" stroke="var(--primary)" strokeWidth="1.5" style={{ cursor: cur[h as string] }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const { x, y } = toSvg(e.clientX, e.clientY);
                  p.onBeginEdit?.();
                  setDrag({ kind: "resizeF", id: sel.id, handle: h as string, sx: x, sy: y, orig: sel });
                }}
              />
            ))}
            <line x1={cx} y1={sel.y} x2={cx} y2={sel.y - 22} stroke="var(--primary)" strokeWidth="1" />
            <circle cx={cx} cy={sel.y - 28} r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5" style={{ cursor: "grab" }}
              onMouseDown={(e) => { e.stopPropagation(); p.onBeginEdit?.(); setDrag({ kind: "rotateF", id: sel.id, cx, cy }); }}
            />
          </g>
        );
      })()}

      {/* Room chrome */}
      {!p.readOnly && p.selection?.kind === "room" && !locked.has(p.selection.id) && (() => {
        const r = p.rooms.find(x => x.id === p.selection!.id);
        if (!r) return null;
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const handles = [
          ["nw", r.x, r.y], ["n", cx, r.y], ["ne", r.x + r.w, r.y],
          ["e", r.x + r.w, cy], ["se", r.x + r.w, r.y + r.h],
          ["s", cx, r.y + r.h], ["sw", r.x, r.y + r.h], ["w", r.x, cy],
        ] as const;
        const cur: Record<string, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
        return (
          <g>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 3" pointerEvents="none" />
            {handles.map(([h, hx, hy]) => (
              <rect key={h as string} x={(hx as number) - 5} y={(hy as number) - 5} width="10" height="10"
                fill="white" stroke="var(--primary)" strokeWidth="1.5" style={{ cursor: cur[h as string] }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const { x, y } = toSvg(e.clientX, e.clientY);
                  p.onBeginEdit?.();
                  setDrag({ kind: "resizeR", id: r.id, handle: h as string, sx: x, sy: y, orig: r });
                }}
              />
            ))}
          </g>
        );
      })()}
    </svg>
  );
}

type ShapeProps = {
  f: Furniture;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function FurnitureShape({ f, onMouseDown, onContextMenu, onMouseEnter, onMouseLeave }: ShapeProps) {
  const handlers = { onMouseDown, onContextMenu, onMouseEnter, onMouseLeave };
  const common = { ...handlers, style: { cursor: "move" as const }, fill: f.fill, stroke: f.stroke, strokeWidth: 1.5, opacity: f.opacity };
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
  switch (f.type) {
    case "bed":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} fill={f.fill} opacity={f.opacity} stroke={f.stroke} strokeWidth={1.5} />
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} fill="url(#bedTexture)" opacity={0.4} pointerEvents="none" />
          <rect x={f.x + 8} y={f.y + 6} width={f.w * 0.32} height={22} rx={4} fill="white" opacity={0.7} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={f.x + f.w - 8 - f.w * 0.32} y={f.y + 6} width={f.w * 0.32} height={22} rx={4} fill="white" opacity={0.7} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
        </g>
      );
    case "sofa":
    case "waiting-sofa":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          <rect x={f.x} y={f.y} width={f.w} height={f.h * 0.35} rx={f.radius} fill={f.fill} opacity={f.opacity} stroke={f.stroke} strokeWidth={1.2} />
          <rect x={f.x + 4} y={f.y + f.h * 0.32} width={f.w - 8} height={f.h * 0.6} rx={Math.max(2, f.radius - 2)} fill={f.fill} opacity={Math.min(1, f.opacity + 0.05)} stroke={f.stroke} strokeWidth={1.2} pointerEvents="none" />
          {[0, 1, 2].map(i => {
            const cw = (f.w - 16) / 3;
            return <rect key={i} x={f.x + 6 + i * (cw + 2)} y={f.y + f.h * 0.38} width={cw} height={f.h * 0.5} rx={4} fill="white" opacity={0.18} stroke={f.stroke} strokeWidth={0.6} pointerEvents="none" />;
          })}
          <rect x={f.x - 3} y={f.y + f.h * 0.3} width={6} height={f.h * 0.65} rx={3} fill={f.stroke} opacity={0.35} pointerEvents="none" />
          <rect x={f.x + f.w - 3} y={f.y + f.h * 0.3} width={6} height={f.h * 0.65} rx={3} fill={f.stroke} opacity={0.35} pointerEvents="none" />
        </g>
      );
    case "salon-chair": {
      // Barber/salon chair (top-down): rounded backrest at top, seat, armrests, footrest
      const cxC = f.x + f.w / 2;
      const seatTop = f.y + f.h * 0.30;
      const seatBot = f.y + f.h * 0.78;
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          {/* round base shadow */}
          <ellipse cx={cxC} cy={f.y + f.h * 0.95} rx={f.w * 0.42} ry={f.h * 0.05} fill="#000" opacity={0.15} pointerEvents="none" />
          {/* circular base plate */}
          <ellipse cx={cxC} cy={f.y + f.h * 0.88} rx={f.w * 0.46} ry={f.h * 0.09} fill="#9CA3AF" stroke={f.stroke} strokeWidth={1} pointerEvents="none" />
          <ellipse cx={cxC} cy={f.y + f.h * 0.86} rx={f.w * 0.34} ry={f.h * 0.06} fill="#D1D5DB" pointerEvents="none" />
          {/* hydraulic post */}
          <rect x={cxC - 4} y={f.y + f.h * 0.72} width={8} height={f.h * 0.16} fill="#6B7280" pointerEvents="none" />
          {/* footrest */}
          <rect x={cxC - f.w * 0.18} y={f.y + f.h * 0.78} width={f.w * 0.36} height={f.h * 0.06} rx={2} fill="#9CA3AF" stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          {/* seat (rounded square) */}
          <rect x={f.x + f.w * 0.10} y={seatTop} width={f.w * 0.80} height={seatBot - seatTop} rx={Math.min(f.w, f.h) * 0.18}
            fill={f.fill} stroke={f.stroke} strokeWidth={1.4} opacity={f.opacity} pointerEvents="none" />
          {/* armrests */}
          <rect x={f.x + f.w * 0.02} y={f.y + f.h * 0.42} width={f.w * 0.12} height={f.h * 0.28} rx={4} fill={f.fill} stroke={f.stroke} strokeWidth={1.2} opacity={f.opacity} pointerEvents="none" />
          <rect x={f.x + f.w * 0.86} y={f.y + f.h * 0.42} width={f.w * 0.12} height={f.h * 0.28} rx={4} fill={f.fill} stroke={f.stroke} strokeWidth={1.2} opacity={f.opacity} pointerEvents="none" />
          {/* backrest (taller, more pronounced rounded headrest at top) */}
          <rect x={f.x + f.w * 0.16} y={f.y + f.h * 0.04} width={f.w * 0.68} height={f.h * 0.32} rx={f.w * 0.30}
            fill={f.fill} stroke={f.stroke} strokeWidth={1.4} opacity={f.opacity} pointerEvents="none" />
          {/* highlight on backrest */}
          <rect x={f.x + f.w * 0.26} y={f.y + f.h * 0.08} width={f.w * 0.48} height={f.h * 0.10} rx={f.w * 0.20} fill="white" opacity={0.22} pointerEvents="none" />
          {/* seat cushion seam */}
          <line x1={cxC} y1={seatTop + 4} x2={cxC} y2={seatBot - 4} stroke={f.stroke} strokeWidth={0.8} opacity={0.35} pointerEvents="none" />
        </g>
      );
    }
    case "shampoo-chair": {
      // Wash station: large oval basin (blue), faucet, small seat behind
      const cxC = f.x + f.w / 2;
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          {/* base plate */}
          <rect x={f.x + f.w * 0.05} y={f.y + f.h * 0.12} width={f.w * 0.90} height={f.h * 0.78} rx={Math.min(f.w, f.h) * 0.15}
            fill="#F1F5F9" stroke={f.stroke} strokeWidth={1.2} opacity={f.opacity} pointerEvents="none" />
          {/* faucet */}
          <rect x={cxC - 3} y={f.y + f.h * 0.06} width={6} height={f.h * 0.10} rx={1.5} fill="#94A3B8" stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={cxC - 8} y={f.y + f.h * 0.04} width={16} height={4} rx={1} fill="#64748B" pointerEvents="none" />
          {/* basin (blue oval) */}
          <ellipse cx={cxC} cy={f.y + f.h * 0.40} rx={f.w * 0.36} ry={f.h * 0.18}
            fill="#7DD3FC" stroke={f.stroke} strokeWidth={1.4} opacity={f.opacity} pointerEvents="none" />
          <ellipse cx={cxC} cy={f.y + f.h * 0.38} rx={f.w * 0.28} ry={f.h * 0.13}
            fill="#BAE6FD" opacity={0.85} pointerEvents="none" />
          {/* neck rest cutout */}
          <rect x={cxC - f.w * 0.12} y={f.y + f.h * 0.55} width={f.w * 0.24} height={f.h * 0.06} rx={3} fill="#94A3B8" opacity={0.5} pointerEvents="none" />
          {/* small reclined seat hint */}
          <rect x={f.x + f.w * 0.18} y={f.y + f.h * 0.65} width={f.w * 0.64} height={f.h * 0.20} rx={f.w * 0.10}
            fill={f.fill} stroke={f.stroke} strokeWidth={1.2} opacity={f.opacity * 0.9} pointerEvents="none" />
        </g>
      );
    }
    case "massage-bed": {
      // Pink massage bed: long rectangle, rounded ends, darker headrest pillow at one end
      const headH = f.h * 0.22;
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          {/* bed body */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={Math.min(f.w, f.h) * 0.18}
            fill={f.fill} stroke={f.stroke} strokeWidth={1.4} opacity={f.opacity} pointerEvents="none" />
          {/* mattress highlight */}
          <rect x={f.x + 4} y={f.y + headH + 4} width={f.w - 8} height={f.h - headH - 8} rx={Math.min(f.w, f.h) * 0.12}
            fill="white" opacity={0.18} pointerEvents="none" />
          {/* headrest pillow (darker, top) */}
          <rect x={f.x + f.w * 0.10} y={f.y + 4} width={f.w * 0.80} height={headH} rx={Math.min(f.w, f.h) * 0.10}
            fill={f.stroke} opacity={0.55} pointerEvents="none" />
          {/* face cradle hole */}
          <ellipse cx={f.x + f.w / 2} cy={f.y + headH / 2 + 4} rx={f.w * 0.14} ry={headH * 0.30} fill="#1F2937" opacity={0.5} pointerEvents="none" />
          {/* divider seam */}
          <line x1={f.x + 6} y1={f.y + headH + 4} x2={f.x + f.w - 6} y2={f.y + headH + 4} stroke={f.stroke} strokeWidth={0.8} opacity={0.4} pointerEvents="none" />
        </g>
      );
    }
    case "cash-counter":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />
          <rect x={f.x + 4} y={f.y + 4} width={f.w - 8} height={f.h * 0.35} rx={2} fill="white" opacity={0.5} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={f.x + f.w * 0.65} y={f.y + 8} width={f.w * 0.25} height={f.h * 0.35} rx={2} fill={f.stroke} opacity={0.85} pointerEvents="none" />
          <text x={cx} y={f.y + f.h * 0.78} textAnchor="middle" fontSize="9" fill={f.stroke} fontWeight="600" pointerEvents="none">CASH</text>
        </g>
      );
    case "plant": {
      const r = Math.min(f.w, f.h) / 2;
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          <path d={`M ${cx - r * 0.55} ${f.y + f.h * 0.7} L ${cx - r * 0.45} ${f.y + f.h} L ${cx + r * 0.45} ${f.y + f.h} L ${cx + r * 0.55} ${f.y + f.h * 0.7} Z`}
            fill="#A0612A" stroke={f.stroke} strokeWidth={1} opacity={f.opacity} />
          <circle cx={cx} cy={f.y + f.h * 0.35} r={r * 0.7} fill={f.fill} stroke={f.stroke} strokeWidth={1.2} opacity={f.opacity} />
          <circle cx={cx - r * 0.45} cy={f.y + f.h * 0.45} r={r * 0.5} fill={f.fill} stroke={f.stroke} strokeWidth={1} opacity={f.opacity * 0.9} pointerEvents="none" />
          <circle cx={cx + r * 0.45} cy={f.y + f.h * 0.45} r={r * 0.5} fill={f.fill} stroke={f.stroke} strokeWidth={1} opacity={f.opacity * 0.9} pointerEvents="none" />
          <circle cx={cx} cy={f.y + f.h * 0.2} r={r * 0.35} fill={f.fill} stroke={f.stroke} strokeWidth={1} opacity={f.opacity * 0.85} pointerEvents="none" />
          <ellipse cx={cx - r * 0.2} cy={f.y + f.h * 0.28} rx={r * 0.18} ry={r * 0.1} fill="white" opacity={0.3} pointerEvents="none" />
        </g>
      );
    }
    case "chair":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          {/* seat */}
          <rect x={f.x} y={f.y + f.h * 0.18} width={f.w} height={f.h * 0.82} rx={f.radius} fill={f.fill} stroke={f.stroke} strokeWidth={1.4} opacity={f.opacity} />
          {/* cushion highlight */}
          <rect x={f.x + 4} y={f.y + f.h * 0.28} width={f.w - 8} height={f.h * 0.55} rx={Math.max(2, f.radius - 2)} fill="white" opacity={0.25} pointerEvents="none" />
          {/* backrest */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h * 0.22} rx={4} fill={f.stroke} opacity={0.85} pointerEvents="none" />
          {/* arm hints */}
          <rect x={f.x - 2} y={f.y + f.h * 0.32} width={4} height={f.h * 0.45} rx={2} fill={f.stroke} opacity={0.5} pointerEvents="none" />
          <rect x={f.x + f.w - 2} y={f.y + f.h * 0.32} width={4} height={f.h * 0.45} rx={2} fill={f.stroke} opacity={0.5} pointerEvents="none" />
        </g>
      );
    case "door-decor":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          {/* door frame outer */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={3} fill={f.fill} stroke={f.stroke} strokeWidth={1.6} opacity={f.opacity} />
          {/* inner panel */}
          <rect x={f.x + 3} y={f.y + 2} width={f.w - 6} height={f.h - 4} rx={2} fill="#FFE066" stroke={f.stroke} strokeWidth={0.6} opacity={0.85} pointerEvents="none" />
          {/* panel divisions */}
          <line x1={f.x + f.w * 0.33} y1={f.y + 3} x2={f.x + f.w * 0.33} y2={f.y + f.h - 3} stroke={f.stroke} strokeWidth={0.6} opacity={0.5} pointerEvents="none" />
          <line x1={f.x + f.w * 0.66} y1={f.y + 3} x2={f.x + f.w * 0.66} y2={f.y + f.h - 3} stroke={f.stroke} strokeWidth={0.6} opacity={0.5} pointerEvents="none" />
          {/* knob */}
          <circle cx={f.x + f.w - 6} cy={f.y + f.h * 0.5} r={Math.min(f.h / 3, 3)} fill="#7A3E15" stroke={f.stroke} strokeWidth={0.6} pointerEvents="none" />
          {/* hinges */}
          <rect x={f.x + 1} y={f.y + 2} width={2} height={3} fill={f.stroke} opacity={0.7} pointerEvents="none" />
          <rect x={f.x + 1} y={f.y + f.h - 5} width={2} height={3} fill={f.stroke} opacity={0.7} pointerEvents="none" />
          {/* swing arc */}
          <path d={`M ${f.x} ${f.y + f.h} A ${f.w} ${f.w} 0 0 1 ${f.x + f.w} ${f.y + f.h}`}
            fill="none" stroke={f.stroke} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" pointerEvents="none" />
        </g>
      );
    case "table":
    case "lamp":
    case "toilet":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          <ellipse cx={cx} cy={cy} rx={f.w / 2} ry={f.h / 2} {...common} />
          {f.type === "lamp" && <circle cx={cx} cy={cy} r={Math.min(f.w, f.h) / 4} fill="white" opacity={0.6} pointerEvents="none" />}
          {f.type === "toilet" && <rect x={f.x + 4} y={f.y} width={f.w - 8} height={14} rx={4} fill={f.fill} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />}
        </g>
      );
    case "bathtub":
      return (
        <g {...handlers} style={{ cursor: "move" }}>
          {/* full-bounds hit target */}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" />
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />
          <rect x={f.x + 6} y={f.y + 6} width={f.w - 12} height={f.h - 12} rx={f.radius - 4} fill="white" opacity={0.6} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
        </g>
      );
    case "dining-rect":
    case "dining-square":
      return <DiningTable f={f} round={false} {...handlers} />;
    case "dining-round":
      return <DiningTable f={f} round={true} {...handlers} />;
    case "booth":
      return <BoothTable f={f} {...handlers} />;
    default:
      return <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />;
  }
}

/** Restaurant dining table: rectangle/square/round with auto-placed chairs around it. */
function DiningTable({ f, round, onMouseDown, onContextMenu, onMouseEnter, onMouseLeave }: ShapeProps & { round: boolean }) {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const n = Math.max(0, Math.min(20, f.chairs ?? 0));
  const chairSize = 18;
  const gap = 6;

  // Generate chair positions (cx, cy, angle) around the table edge
  const chairs: { cx: number; cy: number; rot: number }[] = [];

  if (round) {
    const rx = f.w / 2 + gap + chairSize / 2;
    const ry = f.h / 2 + gap + chairSize / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      chairs.push({ cx: cx + Math.cos(a) * rx, cy: cy + Math.sin(a) * ry, rot: (a * 180) / Math.PI + 90 });
    }
  } else {
    // Distribute chairs across 4 sides proportionally to side length.
    // Long sides get more chairs.
    const sides = [
      { name: "top",    len: f.w },
      { name: "right",  len: f.h },
      { name: "bottom", len: f.w },
      { name: "left",   len: f.h },
    ];
    // distribute n items proportionally
    const totalLen = sides.reduce((s, x) => s + x.len, 0);
    const counts = sides.map(s => Math.floor((s.len / totalLen) * n));
    let assigned = counts.reduce((a, b) => a + b, 0);
    // give remainder to longest sides first
    const order = sides.map((_, i) => i).sort((a, b) => sides[b].len - sides[a].len);
    let oi = 0;
    while (assigned < n) { counts[order[oi % order.length]]++; assigned++; oi++; }

    const place = (sideIdx: number, t: number) => {
      // t ∈ (0,1) along the side
      switch (sideIdx) {
        case 0: return { cx: f.x + f.w * t, cy: f.y - gap - chairSize / 2, rot: 0 };
        case 1: return { cx: f.x + f.w + gap + chairSize / 2, cy: f.y + f.h * t, rot: 90 };
        case 2: return { cx: f.x + f.w * (1 - t), cy: f.y + f.h + gap + chairSize / 2, rot: 180 };
        case 3: return { cx: f.x - gap - chairSize / 2, cy: f.y + f.h * (1 - t), rot: 270 };
      }
      return { cx: 0, cy: 0, rot: 0 };
    };

    counts.forEach((c, sideIdx) => {
      for (let i = 0; i < c; i++) {
        const t = (i + 1) / (c + 1);
        chairs.push(place(sideIdx, t));
      }
    });
  }

  return (
    <g>
      {/* chairs (rendered behind the table label but visible) */}
      {chairs.map((c, i) => (
        <g key={i} transform={`rotate(${c.rot} ${c.cx} ${c.cy})`} pointerEvents="none">
          <rect x={c.cx - chairSize / 2} y={c.cy - chairSize / 2} width={chairSize} height={chairSize} rx={3}
            fill="#EDEDE8" stroke={f.stroke} strokeWidth={1} />
          <rect x={c.cx - chairSize / 2 + 2} y={c.cy - chairSize / 2 - 2} width={chairSize - 4} height={3} rx={1.5}
            fill={f.stroke} opacity={0.7} />
        </g>
      ))}
      {/* Table */}
      <g onMouseDown={onMouseDown} onContextMenu={onContextMenu} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor: "move" }}>
        {round ? (
          <ellipse cx={cx} cy={cy} rx={f.w / 2} ry={f.h / 2}
            fill={f.fill} stroke={f.stroke} strokeWidth={1.5} opacity={f.opacity} />
        ) : (
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius}
            fill={f.fill} stroke={f.stroke} strokeWidth={1.5} opacity={f.opacity} />
        )}
        {f.tableNo && (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="700"
            fill="white" pointerEvents="none">{f.tableNo}</text>
        )}
        <text x={cx} y={cy + (f.tableNo ? 18 : 4)} textAnchor="middle" fontSize="9"
          fill="white" opacity={0.85} pointerEvents="none">{n} seats</text>
      </g>
    </g>
  );
}

/** Booth: rectangular table with bench seating on long sides. */
function BoothTable({ f, onMouseDown, onContextMenu, onMouseEnter, onMouseLeave }: ShapeProps) {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const benchH = 14;
  const n = Math.max(0, Math.min(20, f.chairs ?? 0));
  return (
    <g>
      {/* benches top/bottom */}
      <rect x={f.x} y={f.y - benchH - 2} width={f.w} height={benchH} rx={4}
        fill="#EDEDE8" stroke={f.stroke} strokeWidth={1} pointerEvents="none" />
      <rect x={f.x} y={f.y + f.h + 2} width={f.w} height={benchH} rx={4}
        fill="#EDEDE8" stroke={f.stroke} strokeWidth={1} pointerEvents="none" />
      <g onMouseDown={onMouseDown} onContextMenu={onContextMenu} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor: "move" }}>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius}
          fill={f.fill} stroke={f.stroke} strokeWidth={1.5} opacity={f.opacity} />
        {f.tableNo && (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="700"
            fill="white" pointerEvents="none">{f.tableNo}</text>
        )}
        <text x={cx} y={cy + (f.tableNo ? 18 : 4)} textAnchor="middle" fontSize="9"
          fill="white" opacity={0.85} pointerEvents="none">{n} seats</text>
      </g>
    </g>
  );
}
