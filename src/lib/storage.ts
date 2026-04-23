import type { Furniture, Room, Door, Partition, BoardKind } from "@/lib/floorplan-types";

export interface BoardState {
  rooms: Room[];
  doors: Door[];
  partitions: Partition[];
  furniture: Furniture[];
  groups: Record<string, string[]>;
  locked: string[];
}

export type AllBoards = Record<BoardKind, BoardState>;

const KEY = (email: string) => `fp_boards_v1:${email.toLowerCase()}`;

export function loadBoards(email: string): AllBoards | null {
  try {
    const raw = localStorage.getItem(KEY(email));
    if (!raw) return null;
    return JSON.parse(raw) as AllBoards;
  } catch {
    return null;
  }
}

export function saveBoards(email: string, boards: AllBoards) {
  try {
    localStorage.setItem(KEY(email), JSON.stringify(boards));
  } catch {
    // ignore quota errors
  }
}

/** A board is "ready" if it has at least one room or one piece of furniture. */
export function boardHasContent(b?: BoardState | null): boolean {
  if (!b) return false;
  return (
    (b.rooms?.length ?? 0) > 0 ||
    (b.furniture?.length ?? 0) > 0 ||
    (b.partitions?.length ?? 0) > 0
  );
}

// ---- Orders (POS) -------------------------------------------------------

export interface OrderLine {
  itemId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  email: string;
  spotId: string; // furniture id (chair / table)
  spotLabel: string; // "Chair 2" or "Table 5"
  lines: OrderLine[];
  status: "open" | "paid";
  createdAt: number;
}

const ORDERS_KEY = (email: string) => `fp_orders_v1:${email.toLowerCase()}`;

export function loadOrders(email: string): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY(email));
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrders(email: string, orders: Order[]) {
  localStorage.setItem(ORDERS_KEY(email), JSON.stringify(orders));
}
