import { useEffect, useRef, useState } from "react";
import type { Furniture, Room, Door, Selection, Tool } from "@/lib/floorplan-types";

interface Props {
  rooms: Room[];
  doors: Door[];
  furniture: Furniture[];
  selection: Selection;
  tool: Tool;
  roomFill: string;
  onSelect: (s: Selection) => void;
  onUpdateFurniture: (id: string, patch: Partial<Furniture>) => void;
  onUpdateRoom: (id: string, patch: Partial<Room>) => void;
  onUpdateDoor: (id: string, patch: Partial<Door>) => void;
  onAddRoom: (r: Room) => void;
  onAddDoor: (d: Door) => void;
  onSetTool: (t: Tool) => void;
}

type Drag =
  | { kind: "moveF"; id: string; offX: number; offY: number }
  | { kind: "moveR"; id: string; offX: number; offY: number }
  | { kind: "moveD"; id: string; offX: number; offY: number }
  | { kind: "resizeF"; id: string; handle: string; sx: number; sy: number; orig: Furniture }
  | { kind: "resizeR"; id: string; handle: string; sx: number; sy: number; orig: Room }
  | { kind: "rotateF"; id: string; cx: number; cy: number }
  | { kind: "rotateD"; id: string; cx: number; cy: number }
  | { kind: "drawRoom"; x1: number; y1: number; x2: number; y2: number }
  | null;

const uid = () => crypto.randomUUID();

export function FloorCanvas(p: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag>(null);

  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const { x, y } = toSvg(e.clientX, e.clientY);
      switch (drag.kind) {
        case "moveF": p.onUpdateFurniture(drag.id, { x: x - drag.offX, y: y - drag.offY }); break;
        case "moveR": p.onUpdateRoom(drag.id, { x: x - drag.offX, y: y - drag.offY }); break;
        case "moveD": p.onUpdateDoor(drag.id, { x: x - drag.offX, y: y - drag.offY }); break;
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
      }
    };
    const onUp = (e: MouseEvent) => {
      if (drag.kind === "drawRoom") {
        const { x, y } = toSvg(e.clientX, e.clientY);
        const x1 = Math.min(drag.x1, x), y1 = Math.min(drag.y1, y);
        const w = Math.abs(x - drag.x1), h = Math.abs(y - drag.y1);
        if (w > 40 && h > 40) {
          const room: Room = { id: uid(), name: "Room", x: x1, y: y1, w, h, fill: p.roomFill };
          p.onAddRoom(room);
          p.onSelect({ kind: "room", id: room.id });
          p.onSetTool("select");
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
  }, [drag, p]);

  const onBgDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target !== svgRef.current && target.id !== "bg") return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    if (p.tool === "room") {
      setDrag({ kind: "drawRoom", x1: x, y1: y, x2: x, y2: y });
    } else if (p.tool === "door") {
      const d: Door = { id: uid(), x, y, size: 50, rotation: 0 };
      p.onAddDoor(d);
      p.onSelect({ kind: "door", id: d.id });
      p.onSetTool("select");
    } else {
      p.onSelect(null);
    }
  };

  const cursor = p.tool === "room" || p.tool === "door" ? "crosshair" : "default";

  return (
    <svg ref={svgRef} viewBox="0 0 1200 800" className="h-full w-full" style={{ cursor }} onMouseDown={onBgDown}>
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

      <rect id="bg" width="1200" height="800" fill="url(#bigGrid)" />

      {/* Empty state hint */}
      {p.rooms.length === 0 && p.furniture.length === 0 && p.tool !== "room" && (
        <g pointerEvents="none">
          <text x="600" y="380" textAnchor="middle" fontSize="20" fill="var(--muted-foreground)" fontStyle="italic">
            Empty canvas
          </text>
          <text x="600" y="410" textAnchor="middle" fontSize="13" fill="var(--muted-foreground)">
            Click "Add Room" to draw your first room, then drop in furniture.
          </text>
        </g>
      )}

      {/* Rooms */}
      {p.rooms.map(r => {
        const sel = p.selection?.kind === "room" && p.selection.id === r.id;
        return (
          <g key={r.id}>
            <rect
              x={r.x} y={r.y} width={r.w} height={r.h}
              fill={r.fill}
              stroke="var(--wall)"
              strokeWidth={sel ? 5 : 4}
              strokeLinejoin="miter"
              style={{ cursor: "move" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                p.onSelect({ kind: "room", id: r.id });
                const { x, y } = toSvg(e.clientX, e.clientY);
                setDrag({ kind: "moveR", id: r.id, offX: x - r.x, offY: y - r.y });
              }}
            />
            <text x={r.x + 12} y={r.y + 22} fontSize="12" fontStyle="italic" fill="var(--muted-foreground)" pointerEvents="none">
              {r.name} · {Math.round(r.w)}×{Math.round(r.h)}
            </text>
          </g>
        );
      })}

      {/* Doors */}
      {p.doors.map(d => {
        const sel = p.selection?.kind === "door" && p.selection.id === d.id;
        return (
          <g key={d.id} transform={`rotate(${d.rotation} ${d.x} ${d.y})`}>
            {/* gap in wall */}
            <line x1={d.x} y1={d.y} x2={d.x + d.size} y2={d.y} stroke="var(--canvas)" strokeWidth="6" />
            {/* door panel */}
            <line x1={d.x} y1={d.y} x2={d.x + d.size} y2={d.y} stroke="var(--wall)" strokeWidth="2" />
            <path d={`M ${d.x} ${d.y} A ${d.size} ${d.size} 0 0 1 ${d.x + d.size} ${d.y - d.size}`}
              fill="none" stroke="var(--wall)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={d.x} cy={d.y} r={sel ? 7 : 5} fill={sel ? "var(--primary)" : "white"} stroke="var(--primary)" strokeWidth="1.5"
              style={{ cursor: "move" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                p.onSelect({ kind: "door", id: d.id });
                const { x, y } = toSvg(e.clientX, e.clientY);
                setDrag({ kind: "moveD", id: d.id, offX: x - d.x, offY: y - d.y });
              }}
            />
            {sel && (
              <circle cx={d.x + d.size + 12} cy={d.y} r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5"
                style={{ cursor: "grab" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDrag({ kind: "rotateD", id: d.id, cx: d.x, cy: d.y });
                }}
              />
            )}
          </g>
        );
      })}

      {/* Drawing preview */}
      {drag?.kind === "drawRoom" && (
        <rect
          x={Math.min(drag.x1, drag.x2)} y={Math.min(drag.y1, drag.y2)}
          width={Math.abs(drag.x2 - drag.x1)} height={Math.abs(drag.y2 - drag.y1)}
          fill={p.roomFill} fillOpacity="0.5"
          stroke="var(--primary)" strokeWidth="2" strokeDasharray="6 4"
        />
      )}

      {/* Furniture */}
      {p.furniture.map(f => {
        const isSel = p.selection?.kind === "furniture" && p.selection.id === f.id;
        const cx = f.x + f.w / 2;
        const cy = f.y + f.h / 2;
        return (
          <g key={f.id} transform={`rotate(${f.rotation} ${cx} ${cy})`}>
            <FurnitureShape f={f}
              onMouseDown={(e) => {
                e.stopPropagation();
                p.onSelect({ kind: "furniture", id: f.id });
                const { x, y } = toSvg(e.clientX, e.clientY);
                setDrag({ kind: "moveF", id: f.id, offX: x - f.x, offY: y - f.y });
              }}
            />
            {isSel && (
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="oklch(0.3 0.05 152)" fontStyle="italic" pointerEvents="none">
                {f.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Furniture selection chrome */}
      {p.selection?.kind === "furniture" && (() => {
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
                  setDrag({ kind: "resizeF", id: sel.id, handle: h as string, sx: x, sy: y, orig: sel });
                }}
              />
            ))}
            <line x1={cx} y1={sel.y} x2={cx} y2={sel.y - 22} stroke="var(--primary)" strokeWidth="1" />
            <circle cx={cx} cy={sel.y - 28} r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5" style={{ cursor: "grab" }}
              onMouseDown={(e) => { e.stopPropagation(); setDrag({ kind: "rotateF", id: sel.id, cx, cy }); }}
            />
          </g>
        );
      })()}

      {/* Room selection chrome */}
      {p.selection?.kind === "room" && (() => {
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

function FurnitureShape({ f, onMouseDown }: { f: Furniture; onMouseDown: (e: React.MouseEvent) => void }) {
  const common = { onMouseDown, style: { cursor: "move" as const }, fill: f.fill, stroke: f.stroke, strokeWidth: 1.5, opacity: f.opacity };
  switch (f.type) {
    case "bed":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} fill={f.fill} opacity={f.opacity} stroke={f.stroke} strokeWidth={1.5} />
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} fill="url(#bedTexture)" opacity={0.4} pointerEvents="none" />
          <rect x={f.x + 8} y={f.y + 6} width={f.w * 0.32} height={22} rx={4} fill="white" opacity={0.7} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={f.x + f.w - 8 - f.w * 0.32} y={f.y + 6} width={f.w * 0.32} height={22} rx={4} fill="white" opacity={0.7} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
        </g>
      );
    case "sofa":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />
          {[0, 1, 2].map(i => (
            <rect key={i} x={f.x + 6 + i * ((f.w - 18) / 3 + 3)} y={f.y + 6} width={(f.w - 18) / 3} height={f.h - 12} rx={3} fill="none" stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          ))}
        </g>
      );
    case "table":
    case "lamp":
    case "plant":
    case "toilet":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <ellipse cx={f.x + f.w / 2} cy={f.y + f.h / 2} rx={f.w / 2} ry={f.h / 2} {...common} />
          {f.type === "plant" && <circle cx={f.x + f.w / 2} cy={f.y + f.h / 2} r={Math.min(f.w, f.h) / 4} fill={f.stroke} opacity={0.4} pointerEvents="none" />}
          {f.type === "lamp" && <circle cx={f.x + f.w / 2} cy={f.y + f.h / 2} r={Math.min(f.w, f.h) / 4} fill="white" opacity={0.6} pointerEvents="none" />}
          {f.type === "toilet" && <rect x={f.x + 4} y={f.y} width={f.w - 8} height={14} rx={4} fill={f.fill} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />}
        </g>
      );
    case "bathtub":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />
          <rect x={f.x + 6} y={f.y + 6} width={f.w - 12} height={f.h - 12} rx={f.radius - 4} fill="white" opacity={0.6} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
        </g>
      );
    default:
      return <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />;
  }
}
