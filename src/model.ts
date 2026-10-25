import { parseAmount } from "./money";
import type { SpendRow } from "./settlement";
import { copy } from "./strings";

export interface Player {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  paidBy: string;
  amount: string;
}

export interface TripState {
  currency: string;
  players: Player[];
  expenses: Expense[];
  minimize: boolean;
  focusId: string;
}

const STORAGE_KEY = "trip-split:v1";

export function displayName(name: string, index: number): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : copy.playerFallback(index + 1);
}

export function createDefaultTrip(): TripState {
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  return {
    currency: "₪",
    players: [
      { id: first, name: "" },
      { id: second, name: "" },
    ],
    expenses: [
      { id: crypto.randomUUID(), description: "", paidBy: first, amount: "" },
    ],
    minimize: false,
    focusId: first,
  };
}

export function playerSpends(players: readonly Player[], expenses: readonly Expense[]): SpendRow[] {
  return players.map((player, index) => {
    let cents = 0;
    for (const expense of expenses) {
      if (expense.paidBy !== player.id) continue;
      const amount = parseAmount(expense.amount);
      if (amount == null) continue;
      cents += Math.round(amount * 100 + 1e-6);
    }
    return {
      id: player.id,
      name: displayName(player.name, index),
      spent: cents / 100,
    };
  });
}

export function normalizeTrip(data: unknown): TripState | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.players)) return null;

  const players: Player[] = [];
  const seen = new Set<string>();
  for (const entry of record.players) {
    if (players.length >= 50) break;
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    let id = typeof item.id === "string" ? item.id.slice(0, 64) : "";
    if (!id || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    const name = typeof item.name === "string" ? item.name.slice(0, 80) : "";
    players.push({ id, name });
  }
  if (players.length === 0) return null;
  while (players.length < 2) {
    const id = crypto.randomUUID();
    players.push({ id, name: "" });
    seen.add(id);
  }

  const expenses: Expense[] = [];
  if (Array.isArray(record.expenses)) {
    for (const entry of record.expenses) {
      if (expenses.length >= 200) break;
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      let id = typeof item.id === "string" ? item.id.slice(0, 64) : "";
      if (!id) id = crypto.randomUUID();
      const description = typeof item.description === "string" ? item.description.slice(0, 160) : "";
      let amount = "";
      if (typeof item.amount === "string") amount = item.amount.slice(0, 24);
      else if (typeof item.amount === "number" && Number.isFinite(item.amount)) {
        amount = String(item.amount).slice(0, 24);
      }
      let paidBy = typeof item.paidBy === "string" ? item.paidBy : players[0].id;
      if (!seen.has(paidBy)) paidBy = players[0].id;
      expenses.push({ id, description, paidBy, amount });
    }
  }

  let currency = "₪";
  if (typeof record.currency === "string") {
    const trimmed = record.currency.trim().slice(0, 4);
    if (trimmed) currency = trimmed;
  }

  const focusId =
    typeof record.focusId === "string" && seen.has(record.focusId) ? record.focusId : players[0].id;

  return {
    currency,
    players,
    expenses,
    minimize: record.minimize === true,
    focusId,
  };
}

export function loadStoredTrip(): TripState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeTrip(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function storeTrip(state: TripState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full disk. The hash still carries the trip.
  }
}
