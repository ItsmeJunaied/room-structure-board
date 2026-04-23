export type UserRole = "salon" | "restaurant";

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

const USERS_KEY = "fp_users_v1";
const SESSION_KEY = "fp_session_v1";

interface StoredUser extends User {
  password: string;
}

/** Demo accounts always available for autofill / login. */
export const DEMO_ACCOUNTS: { role: UserRole; email: string; password: string; name: string }[] = [
  { role: "salon", email: "salon@demo.bd", password: "demo1234", name: "Luxe Salon Manager" },
  { role: "restaurant", email: "restaurant@demo.bd", password: "demo1234", name: "Spice Garden Manager" },
];

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const arr = raw ? (JSON.parse(raw) as StoredUser[]) : [];
    // Always merge demo accounts in so they're guaranteed to work.
    const merged = [...arr];
    for (const d of DEMO_ACCOUNTS) {
      if (!merged.find(u => u.email.toLowerCase() === d.email.toLowerCase())) merged.push(d);
    }
    return merged;
  } catch {
    return [...DEMO_ACCOUNTS];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function login(email: string, password: string): User {
  const users = readUsers();
  const u = users.find(
    x => x.email.toLowerCase() === email.toLowerCase() && x.password === password,
  );
  if (!u) throw new Error("Invalid email or password.");
  const session: User = { email: u.email, name: u.name, role: u.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signup(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): User {
  const users = readUsers();
  if (users.find(u => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account with that email already exists.");
  }
  const stored: StoredUser = { ...input };
  writeUsers([...users.filter(u => !DEMO_ACCOUNTS.find(d => d.email === u.email)), stored]);
  const session: User = { email: input.email, name: input.name, role: input.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
