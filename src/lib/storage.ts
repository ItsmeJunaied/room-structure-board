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
  spotId: string;
  spotLabel: string;
  lines: OrderLine[];
  status: "open" | "paid";
  createdAt: number;
  /** Discount in BDT (flat) */
  discount?: number;
  /** Tax rate as percent (e.g. 8.5) */
  taxRate?: number;
  /** Optional barber/staff name assigned to this order */
  barberId?: string;
  barberName?: string;
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

// ---- Barbers / Staff ----------------------------------------------------

export interface Barber {
  id: string;
  name: string;
  role: string;
}

const BARBERS_KEY = (email: string) => `fp_barbers_v1:${email.toLowerCase()}`;

const DEFAULT_SALON_BARBERS: Barber[] = [
  { id: "b1", name: "Rakib Hossain",  role: "Senior Barber" },
  { id: "b2", name: "Salman Ahmed",   role: "Stylist" },
  { id: "b3", name: "Imran Khan",     role: "Junior Barber" },
  { id: "b4", name: "Tanvir Islam",   role: "Beard Specialist" },
];
const DEFAULT_REST_STAFF: Barber[] = [
  { id: "w1", name: "Mahin Rahman",  role: "Head Waiter" },
  { id: "w2", name: "Sohag Mia",     role: "Waiter" },
  { id: "w3", name: "Rumi Akter",    role: "Waitress" },
  { id: "w4", name: "Rafiq Sarder",  role: "Waiter" },
];

export function loadBarbers(email: string, role: "salon" | "restaurant"): Barber[] {
  try {
    const raw = localStorage.getItem(BARBERS_KEY(email));
    if (raw) return JSON.parse(raw) as Barber[];
  } catch {
    /* ignore */
  }
  return role === "salon" ? DEFAULT_SALON_BARBERS : DEFAULT_REST_STAFF;
}

export function saveBarbers(email: string, barbers: Barber[]) {
  localStorage.setItem(BARBERS_KEY(email), JSON.stringify(barbers));
}

// ---- Expenses (simple stub for the Expense page) ------------------------

export interface Expense {
  id: string;
  date: number;
  category: string;
  description: string;
  amount: number;
}

const EXPENSES_KEY = (email: string) => `fp_expenses_v1:${email.toLowerCase()}`;

export function loadExpenses(email: string): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY(email));
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(email: string, exp: Expense[]) {
  localStorage.setItem(EXPENSES_KEY(email), JSON.stringify(exp));
}
