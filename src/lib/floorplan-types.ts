export type FurnitureType =
  | "bed" | "sofa" | "chair" | "table" | "cupboard"
  | "wardrobe" | "lamp" | "plant" | "mirror" | "pillow" | "rug" | "tv" | "sink" | "toilet" | "bathtub";

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
}

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export interface Door {
  id: string;
  x: number;        // hinge point
  y: number;
  size: number;     // door length
  rotation: number; // degrees
}

export type Tool = "select" | "room" | "door" | "pan";

export type Selection =
  | { kind: "furniture"; id: string }
  | { kind: "room"; id: string }
  | { kind: "door"; id: string }
  | null;

export const DEFAULTS: Record<FurnitureType, Omit<Furniture, "id" | "x" | "y">> = {
  bed:      { type: "bed",      name: "Bed",       w: 160, h: 120, rotation: 0, fill: "#B7D9C0", stroke: "#1B1A1A", opacity: 0.85, radius: 8 },
  sofa:     { type: "sofa",     name: "Sofa",      w: 140, h: 56,  rotation: 0, fill: "#EDEDE8", stroke: "#1B1A1A", opacity: 1,    radius: 8 },
  chair:    { type: "chair",    name: "Chair",     w: 40,  h: 40,  rotation: 0, fill: "#EDEDE8", stroke: "#1B1A1A", opacity: 1,    radius: 6 },
  table:    { type: "table",    name: "Table",     w: 80,  h: 80,  rotation: 0, fill: "#F5F1EA", stroke: "#1B1A1A", opacity: 1,    radius: 40 },
  cupboard: { type: "cupboard", name: "Cupboard",  w: 140, h: 36,  rotation: 0, fill: "#F2F2EE", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  wardrobe: { type: "wardrobe", name: "Wardrobe",  w: 44,  h: 120, rotation: 0, fill: "#F2F2EE", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  lamp:     { type: "lamp",     name: "Lamp",      w: 28,  h: 28,  rotation: 0, fill: "#FAE7B5", stroke: "#1B1A1A", opacity: 1,    radius: 14 },
  plant:    { type: "plant",    name: "Plant",     w: 30,  h: 30,  rotation: 0, fill: "#86C29B", stroke: "#1B1A1A", opacity: 1,    radius: 15 },
  mirror:   { type: "mirror",   name: "Mirror",    w: 60,  h: 12,  rotation: 0, fill: "#D7E3EE", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  pillow:   { type: "pillow",   name: "Pillow",    w: 36,  h: 26,  rotation: 0, fill: "#F4E4D0", stroke: "#1B1A1A", opacity: 1,    radius: 8 },
  rug:      { type: "rug",      name: "Rug",       w: 180, h: 120, rotation: 0, fill: "#E8D7C2", stroke: "#1B1A1A", opacity: 0.6,  radius: 12 },
  tv:       { type: "tv",       name: "TV",        w: 90,  h: 14,  rotation: 0, fill: "#1B1A1A", stroke: "#1B1A1A", opacity: 1,    radius: 2 },
  sink:     { type: "sink",     name: "Sink",      w: 60,  h: 40,  rotation: 0, fill: "#E6EEF3", stroke: "#1B1A1A", opacity: 1,    radius: 6 },
  toilet:   { type: "toilet",   name: "Toilet",    w: 38,  h: 56,  rotation: 0, fill: "#FFFFFF", stroke: "#1B1A1A", opacity: 1,    radius: 14 },
  bathtub:  { type: "bathtub",  name: "Bathtub",   w: 130, h: 70,  rotation: 0, fill: "#E6EEF3", stroke: "#1B1A1A", opacity: 1,    radius: 18 },
};

export const ROOM_PRESETS = [
  { name: "Living Room", fill: "#F1EDE4" },
  { name: "Bedroom",     fill: "#E8EFE9" },
  { name: "Kitchen",     fill: "#F5EFE6" },
  { name: "Bathroom",    fill: "#E7EEF2" },
  { name: "Hallway",     fill: "#EFECE6" },
  { name: "Office",      fill: "#EEEAE2" },
];
