export type FurnitureType =
  | "bed" | "sofa" | "chair" | "table" | "cupboard"
  | "wardrobe" | "lamp" | "plant" | "mirror" | "pillow" | "rug";

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

export const DEFAULTS: Record<FurnitureType, Omit<Furniture, "id" | "x" | "y">> = {
  bed:      { type: "bed",      name: "Bed",       w: 180, h: 140, rotation: 0, fill: "#B7D9C0", stroke: "#1B1A1A", opacity: 0.8, radius: 8 },
  sofa:     { type: "sofa",     name: "Sofa",      w: 140, h: 60,  rotation: 0, fill: "#EDEDE8", stroke: "#1B1A1A", opacity: 1,   radius: 8 },
  chair:    { type: "chair",    name: "Chair",     w: 44,  h: 44,  rotation: 0, fill: "#EDEDE8", stroke: "#1B1A1A", opacity: 1,   radius: 6 },
  table:    { type: "table",    name: "Table",     w: 80,  h: 80,  rotation: 0, fill: "#F5F1EA", stroke: "#1B1A1A", opacity: 1,   radius: 40 },
  cupboard: { type: "cupboard", name: "Cupboard",  w: 160, h: 40,  rotation: 0, fill: "#F2F2EE", stroke: "#1B1A1A", opacity: 1,   radius: 2 },
  wardrobe: { type: "wardrobe", name: "Wardrobe",  w: 50,  h: 130, rotation: 0, fill: "#F2F2EE", stroke: "#1B1A1A", opacity: 1,   radius: 2 },
  lamp:     { type: "lamp",     name: "Lamp",      w: 30,  h: 30,  rotation: 0, fill: "#FAE7B5", stroke: "#1B1A1A", opacity: 1,   radius: 15 },
  plant:    { type: "plant",    name: "Flower Pot",w: 32,  h: 32,  rotation: 0, fill: "#86C29B", stroke: "#1B1A1A", opacity: 1,   radius: 16 },
  mirror:   { type: "mirror",   name: "Mirror",    w: 60,  h: 14,  rotation: 0, fill: "#D7E3EE", stroke: "#1B1A1A", opacity: 1,   radius: 2 },
  pillow:   { type: "pillow",   name: "Pillow",    w: 40,  h: 28,  rotation: 0, fill: "#F4E4D0", stroke: "#1B1A1A", opacity: 1,   radius: 8 },
  rug:      { type: "rug",      name: "Rug",       w: 200, h: 130, rotation: 0, fill: "#E8D7C2", stroke: "#1B1A1A", opacity: 0.6, radius: 12 },
};

export interface Wall {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
}
