import { useEffect, useRef, useState } from "react";
import type { Furniture, Wall } from "@/lib/floorplan-types";

interface Props {
  furniture: Furniture[];
  walls: Wall[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Furniture>) => void;
  onAddWall: (w: Wall) => void;
  tool: "select" | "wall";
}

type DragMode =
  | { kind: "move"; id: string; offX: number; offY: number }
  | { kind: "resize"; id: string; handle: string; startX: number; startY: number; orig: Furniture }
  | { kind: "rotate"; id: string; cx: number; cy: number; startAngle: number; orig: number }
  | { kind: "wall"; x1: number; y1: number; x2: number; y2: number }
  | null;

export function FloorCanvas({ furniture, walls, selectedId, onSelect, onUpdate, onAddWall, tool }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragMode>(null);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const { x, y } = toSvg(e.clientX, e.clientY);
      if (drag.kind === "move") {
        onUpdate(drag.id, { x: x - drag.offX, y: y - drag.offY });
      } else if (drag.kind === "resize") {
        const o = drag.orig;
        let { x: nx, y: ny, w, h } = o;
        const dx = x - drag.startX;
        const dy = y - drag.startY;
        if (drag.handle.includes("e")) w = Math.max(20, o.w + dx);
        if (drag.handle.includes("s")) h = Math.max(20, o.h + dy);
        if (drag.handle.includes("w")) { w = Math.max(20, o.w - dx); nx = o.x + (o.w - w); }
        if (drag.handle.includes("n")) { h = Math.max(20, o.h - dy); ny = o.y + (o.h - h); }
        onUpdate(drag.id, { x: nx, y: ny, w, h });
      } else if (drag.kind === "rotate") {
        const angle = (Math.atan2(y - drag.cy, x - drag.cx) * 180) / Math.PI + 90;
        onUpdate(drag.id, { rotation: Math.round(angle) });
      } else if (drag.kind === "wall") {
        setDrag({ ...drag, x2: x, y2: y });
      }
    };
    const onUp = (e: MouseEvent) => {
      if (drag.kind === "wall") {
        const { x, y } = toSvg(e.clientX, e.clientY);
        const dx = x - drag.x1, dy = y - drag.y1;
        if (Math.hypot(dx, dy) > 10) {
          onAddWall({ id: crypto.randomUUID(), x1: drag.x1, y1: drag.y1, x2: x, y2: y });
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
  }, [drag, onUpdate, onAddWall]);

  const sel = furniture.find(f => f.id === selectedId) || null;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 900 640"
      className="h-full w-full"
      style={{ cursor: tool === "wall" ? "crosshair" : "default" }}
      onMouseDown={(e) => {
        if (e.target === svgRef.current || (e.target as Element).id === "bg") {
          if (tool === "wall") {
            const { x, y } = toSvg(e.clientX, e.clientY);
            setDrag({ kind: "wall", x1: x, y1: y, x2: x, y2: y });
          } else {
            onSelect(null);
          }
        }
      }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--canvas-grid)" strokeWidth="0.5" />
        </pattern>
        <pattern id="bedTexture" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.65 0.1 152)" strokeWidth="2" opacity="0.5" />
        </pattern>
      </defs>

      <rect id="bg" width="900" height="640" fill="url(#grid)" />

      {/* Walls */}
      {walls.map(w => (
        <line key={w.id} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
          stroke="var(--wall)" strokeWidth="4" strokeLinecap="round" />
      ))}

      {drag?.kind === "wall" && (
        <line x1={drag.x1} y1={drag.y1} x2={drag.x2} y2={drag.y2}
          stroke="var(--primary)" strokeWidth="4" strokeDasharray="4 4" />
      )}

      {/* Furniture */}
      {furniture.map(f => {
        const isSel = f.id === selectedId;
        const cx = f.x + f.w / 2;
        const cy = f.y + f.h / 2;
        return (
          <g key={f.id} transform={`rotate(${f.rotation} ${cx} ${cy})`}>
            <FurnitureShape f={f}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelect(f.id);
                const { x, y } = toSvg(e.clientX, e.clientY);
                setDrag({ kind: "move", id: f.id, offX: x - f.x, offY: y - f.y });
              }}
            />
            {isSel && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10"
              fill="oklch(0.3 0.05 152)" fontStyle="italic" pointerEvents="none">{f.name}</text>}
          </g>
        );
      })}

      {/* Selection chrome (drawn last, in screen space relative to rotated group) */}
      {sel && (() => {
        const cx = sel.x + sel.w / 2;
        const cy = sel.y + sel.h / 2;
        const handles = [
          ["nw", sel.x, sel.y], ["n", cx, sel.y], ["ne", sel.x + sel.w, sel.y],
          ["e", sel.x + sel.w, cy], ["se", sel.x + sel.w, sel.y + sel.h],
          ["s", cx, sel.y + sel.h], ["sw", sel.x, sel.y + sel.h], ["w", sel.x, cy],
        ] as const;
        const cursors: Record<string, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
        return (
          <g transform={`rotate(${sel.rotation} ${cx} ${cy})`}>
            <rect x={sel.x} y={sel.y} width={sel.w} height={sel.h}
              fill="none" stroke="var(--primary)" strokeWidth="1.5" pointerEvents="none" />
            {handles.map(([h, hx, hy]) => (
              <rect key={h} x={(hx as number) - 5} y={(hy as number) - 5} width="10" height="10"
                fill="white" stroke="var(--primary)" strokeWidth="1.5"
                style={{ cursor: cursors[h as string] }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const { x, y } = toSvg(e.clientX, e.clientY);
                  setDrag({ kind: "resize", id: sel.id, handle: h as string, startX: x, startY: y, orig: sel });
                }}
              />
            ))}
            {/* rotation handle */}
            <line x1={cx} y1={sel.y} x2={cx} y2={sel.y - 24} stroke="var(--primary)" strokeWidth="1" />
            <circle cx={cx} cy={sel.y - 30} r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5"
              style={{ cursor: "grab" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDrag({ kind: "rotate", id: sel.id, cx, cy, startAngle: 0, orig: sel.rotation });
              }}
            />
          </g>
        );
      })()}
    </svg>
  );
}

function FurnitureShape({ f, onMouseDown }: { f: Furniture; onMouseDown: (e: React.MouseEvent) => void }) {
  const common = {
    onMouseDown,
    style: { cursor: "move" as const },
    fill: f.fill,
    stroke: f.stroke,
    strokeWidth: 1.5,
    opacity: f.opacity,
  };

  switch (f.type) {
    case "bed":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} fill={f.fill} opacity={f.opacity} stroke={f.stroke} strokeWidth={1.5} />
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} fill="url(#bedTexture)" opacity={0.4} pointerEvents="none" />
          <rect x={f.x + 10} y={f.y + 8} width={f.w * 0.3} height={26} rx={4} fill="white" opacity={0.7} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={f.x + f.w - 10 - f.w * 0.3} y={f.y + 8} width={f.w * 0.3} height={26} rx={4} fill="white" opacity={0.7} stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
        </g>
      );
    case "sofa":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />
          <rect x={f.x + 6} y={f.y + 6} width={(f.w - 18) / 3} height={f.h - 12} rx={3} fill="none" stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={f.x + 6 + (f.w - 18) / 3 + 3} y={f.y + 6} width={(f.w - 18) / 3} height={f.h - 12} rx={3} fill="none" stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
          <rect x={f.x + 6 + 2 * ((f.w - 18) / 3 + 3)} y={f.y + 6} width={(f.w - 18) / 3} height={f.h - 12} rx={3} fill="none" stroke={f.stroke} strokeWidth={0.8} pointerEvents="none" />
        </g>
      );
    case "table":
    case "lamp":
    case "plant":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <ellipse cx={f.x + f.w / 2} cy={f.y + f.h / 2} rx={f.w / 2} ry={f.h / 2} {...common} />
          {f.type === "plant" && <circle cx={f.x + f.w / 2} cy={f.y + f.h / 2} r={Math.min(f.w, f.h) / 4} fill={f.stroke} opacity={0.4} pointerEvents="none" />}
          {f.type === "lamp" && <circle cx={f.x + f.w / 2} cy={f.y + f.h / 2} r={Math.min(f.w, f.h) / 4} fill="white" opacity={0.6} pointerEvents="none" />}
        </g>
      );
    default:
      return <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.radius} {...common} />;
  }
}
