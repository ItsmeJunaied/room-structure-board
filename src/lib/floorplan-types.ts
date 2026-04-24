export type FurnitureType =
  | "bed" | "sofa" | "chair" | "table" | "cupboard"
  | "wardrobe" | "lamp" | "plant" | "mirror" | "pillow" | "rug" | "tv" | "sink" | "toilet" | "bathtub"
  | "door-decor"
  | "salon-chair" | "massage-bed" | "cash-counter" | "shampoo-chair" | "waiting-sofa"
  | "dining-rect" | "dining-round" | "dining-square" | "booth";

export type TableShape = "rect" | "round" | "square";

export interface Furniture {
  id: string;
  type: FurnitureType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  fill: string;
  stroke: string;
  opacity: number;
  radius: number;
  /** Number of chairs to auto-place around dining tables */
  chairs?: number;
  /** Optional table number / label (for restaurant) */
  tableNo?: string;
  /** If true this spot can take orders in POS. If false it's decoration only. */
  orderable?: boolean;
  /** Manually mark as reserved/booked in POS */
  reserved?: boolean;
  /** ID of the room this furniture is attached to. Moves with the room. */
  roomId?: string;
}

export type RoomShape = "rect" | "circle" | "l-shape";

export interface Room {
  id: string;
  name: string;
  shape: RoomShape;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  notch?: number;
  corner?: "tl" | "tr" | "bl" | "br";
}

export interface Door {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface Partition {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  color: string;
}

export type Tool = "select" | "room" | "door" | "partition" | "pan";

export type Selection =
  | { kind: "furniture"; id: string }
  | { kind: "room"; id: string }
  | { kind: "door"; id: string }
  | { kind: "partition"; id: string }
  | null;

/** Furniture types that can take orders in POS by default. */
export const ORDERABLE_BY_DEFAULT: FurnitureType[] = [
  "salon-chair", "massage-bed", "shampoo-chair",
  "dining-rect", "dining-round", "dining-square", "booth",
];

export const DEFAULTS: Record<FurnitureType, Omit<Furniture, "id" | "x" | "y">> = {
  bed:      { type: "bed",      name: "Bed",       w: 160, h: 120, rotation: 0, fill: "#B7D9C0", stroke: "#1B1A1A", opacity: 0.85, radius: 8 },
  sofa:     { type: "sofa",     name: "Sofa",      w: 140, h: 56,  rotation: 0, fill: "#EDEDE8", stroke: "#1B1A1A", opacity: 1,    radius: 8 },
  chair:    { type: "chair",    name: "Chair",     w: 44,  h: 44,  rotation: 0, fill: "#F59E5C", stroke: "#7A3E15", opacity: 1,    radius: 8 },
  "door-decor": { type: "door-decor", name: "Door", w: 60, h: 14, rotation: 0, fill: "#F5C518", stroke: "#8A6A00", opacity: 1, radius: 2 },
  table:    { type: "table",    name: "Table",     w: 80,  h: 80,  rotation: 0, fill: "#F5F1EA", stroke: "#1B1A1A", opacity: 1,    radius: 40 },
  cupboard: { type: "cupboard", name: "Cupboard",  w: 140, h: 36,  rotation: 0, fill: "#F2F2EE", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  wardrobe: { type: "wardrobe", name: "Wardrobe",  w: 44,  h: 120, rotation: 0, fill: "#F2F2EE", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  lamp:     { type: "lamp",     name: "Lamp",      w: 28,  h: 28,  rotation: 0, fill: "#FAE7B5", stroke: "#1B1A1A", opacity: 1,    radius: 14 },
  plant:    { type: "plant",    name: "Plant",     w: 44,  h: 44,  rotation: 0, fill: "#3F8F5E", stroke: "#1B1A1A", opacity: 1,    radius: 22 },
  mirror:   { type: "mirror",   name: "Mirror",    w: 60,  h: 12,  rotation: 0, fill: "#D7E3EE", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  pillow:   { type: "pillow",   name: "Pillow",    w: 36,  h: 26,  rotation: 0, fill: "#F4E4D0", stroke: "#1B1A1A", opacity: 1,    radius: 8 },
  rug:      { type: "rug",      name: "Rug",       w: 180, h: 120, rotation: 0, fill: "#E8D7C2", stroke: "#1B1A1A", opacity: 0.6,  radius: 12 },
  tv:       { type: "tv",       name: "TV",        w: 90,  h: 14,  rotation: 0, fill: "#1B1A1A", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  sink:     { type: "sink",     name: "Sink",      w: 60,  h: 40,  rotation: 0, fill: "#E6EEF3", stroke: "#1B1A1A", opacity: 1,    radius: 6 },
  toilet:   { type: "toilet",   name: "Toilet",    w: 38,  h: 56,  rotation: 0, fill: "#FFFFFF", stroke: "#1B1A1A", opacity: 1,    radius: 14 },
  bathtub:  { type: "bathtub",  name: "Bathtub",   w: 130, h: 70,  rotation: 0, fill: "#E6EEF3", stroke: "#1B1A1A", opacity: 1,    radius: 18 },
  "salon-chair":   { type: "salon-chair",   name: "Salon Chair",   w: 64,  h: 84,  rotation: 0, fill: "#E11D48", stroke: "#4C0519", opacity: 1, radius: 14 },
  "massage-bed":   { type: "massage-bed",   name: "Massage Bed",   w: 180, h: 70,  rotation: 0, fill: "#F5E9DC", stroke: "#1B1A1A", opacity: 1, radius: 14 },
  "cash-counter":  { type: "cash-counter",  name: "Cash Counter",  w: 140, h: 60,  rotation: 0, fill: "#C9A87C", stroke: "#1B1A1A", opacity: 1, radius: 4  },
  "shampoo-chair": { type: "shampoo-chair", name: "Shampoo Chair", w: 70,  h: 100, rotation: 0, fill: "#0EA5E9", stroke: "#0C4A6E", opacity: 1, radius: 16 },
  "waiting-sofa":  { type: "waiting-sofa",  name: "Waiting Sofa",  w: 160, h: 60,  rotation: 0, fill: "#A78BFA", stroke: "#1B1A1A", opacity: 1, radius: 14 },
  "dining-rect":   { type: "dining-rect",   name: "Rect Table",    w: 120, h: 70,  rotation: 0, fill: "#7C8CF8", stroke: "#1B1A1A", opacity: 1, radius: 8,  chairs: 4 },
  "dining-round":  { type: "dining-round",  name: "Round Table",   w: 90,  h: 90,  rotation: 0, fill: "#EDEDE8", stroke: "#1B1A1A", opacity: 1, radius: 45, chairs: 4 },
  "dining-square": { type: "dining-square", name: "Square Table",  w: 80,  h: 80,  rotation: 0, fill: "#7C8CF8", stroke: "#1B1A1A", opacity: 1, radius: 6,  chairs: 4 },
  "booth":         { type: "booth",         name: "Booth",         w: 140, h: 90,  rotation: 0, fill: "#C9A87C", stroke: "#1B1A1A", opacity: 1, radius: 8,  chairs: 4 },
};

export type BoardKind = "floor" | "salon" | "restaurant";

export interface Board {
  id: string;
  name: string;
  kind: BoardKind;
}

export const ROOM_PRESETS = [
  { name: "Living Room", fill: "#F1EDE4" },
  { name: "Bedroom",     fill: "#E8EFE9" },
  { name: "Kitchen",     fill: "#F5EFE6" },
  { name: "Bathroom",    fill: "#E7EEF2" },
  { name: "Hallway",     fill: "#EFECE6" },
  { name: "Office",      fill: "#EEEAE2" },
];

export const ROOM_SHAPES: { value: RoomShape; label: string }[] = [
  { value: "rect",    label: "Rectangle" },
  { value: "circle",  label: "Circle" },
  { value: "l-shape", label: "L-Shape" },
];

/** Build SVG path for a room based on its shape. */
export function roomPath(r: Room): string {
  if (r.shape === "circle") {
    const rx = r.w / 2, ry = r.h / 2, cx = r.x + rx, cy = r.y + ry;
    return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
  }
  if (r.shape === "l-shape") {
    const n = r.notch ?? 0.45;
    const nw = r.w * n, nh = r.h * n;
    const c = r.corner ?? "tr";
    const { x, y, w, h } = r;
    switch (c) {
      case "tr": return `M ${x} ${y} L ${x + w - nw} ${y} L ${x + w - nw} ${y + nh} L ${x + w} ${y + nh} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      case "tl": return `M ${x + nw} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} L ${x} ${y + nh} L ${x + nw} ${y + nh} Z`;
      case "br": return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - nh} L ${x + w - nw} ${y + h - nh} L ${x + w - nw} ${y + h} L ${x} ${y + h} Z`;
      case "bl": return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x + nw} ${y + h} L ${x + nw} ${y + h - nh} L ${x} ${y + h - nh} Z`;
    }
  }
  return `M ${r.x} ${r.y} h ${r.w} v ${r.h} h ${-r.w} Z`;
}
