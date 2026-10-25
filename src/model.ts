import { DEFAULT_CURRENCY, resolveCurrency } from "./currencies";
import { parseAmount } from "./money";
import type { Lang } from "./preferences";
import type { SpendRow } from "./settlement";
import { copyFor } from "./strings";

export type EntryType = "member" | "group";

export interface Player {
  id: string;
  name: string;
  /**
   * Omitted on older share links, which means a member of weight 1.
   * `group` is a family or other group paid as one entry.
   */
  type?: EntryType;
  /** Paying members inside a group. Ignored for a plain member. */
  weight?: number;
}

export const MAX_WEIGHT = 99;

export function clampWeight(value: number, fallback = 1): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > MAX_WEIGHT) return MAX_WEIGHT;
  return rounded;
}

export function entryType(player: Pick<Player, "type">): EntryType {
  return player.type === "group" ? "group" : "member";
}

/** A member weighs 1. A group weighs its paying-member count, at least 1. */
export function entryWeight(player: Pick<Player, "type" | "weight">): number {
  if (player.type !== "group") return 1;
  return clampWeight(player.weight ?? 2, 2);
}

export interface Expense {
  id: string;
  description: string;
  paidBy: string;
  amount: string;
}

export interface TripState {
  currency: string;
  /**
   * Saved trips and older share links use the key `players`.
   * `normalizeTrip` also accepts `members`. New share links use a compact array.
   */
  players: Player[];
  expenses: Expense[];
  minimize: boolean;
  focusId: string;
}

const STORAGE_KEY = "trip-split:v1";

export function displayName(name: string, index: number, lang: Lang = "en"): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : copyFor(lang).memberFallback(index + 1);
}

export function createDefaultTrip(): TripState {
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  return {
    currency: DEFAULT_CURRENCY,
    players: [
      { id: first, name: "" },
      { id: second, name: "" },
    ],
    expenses: [
      { id: crypto.randomUUID(), description: "", paidBy: first, amount: "" },
    ],
    minimize: true,
    focusId: first,
  };
}

export function playerSpends(
  players: readonly Player[],
  expenses: readonly Expense[],
  lang: Lang = "en",
): SpendRow[] {
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
      name: displayName(player.name, index, lang),
      spent: cents / 100,
      weight: entryWeight(player),
    };
  });
}

export function normalizeTrip(data: unknown): TripState | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const rawPeople = Array.isArray(record.players)
    ? record.players
    : Array.isArray(record.members)
      ? record.members
      : null;
  if (!rawPeople) return null;

  const players: Player[] = [];
  const seen = new Set<string>();
  for (const entry of rawPeople) {
    if (players.length >= 50) break;
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    let id = typeof item.id === "string" ? item.id.slice(0, 64) : "";
    if (!id || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    const name = typeof item.name === "string" ? item.name.slice(0, 80) : "";
    const rawType = typeof item.type === "string" ? item.type : "";
    if (rawType === "group" || rawType === "family") {
      let weight = 2;
      if (typeof item.weight === "number" || (typeof item.weight === "string" && item.weight.trim() !== "")) {
        const numeric = typeof item.weight === "number" ? item.weight : Number(item.weight);
        weight = clampWeight(numeric, 2);
      }
      players.push({ id, name, type: "group", weight });
    } else {
      players.push({ id, name });
    }
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

  const currency =
    typeof record.currency === "string" ? resolveCurrency(record.currency.slice(0, 16)) : DEFAULT_CURRENCY;

  const focusId =
    typeof record.focusId === "string" && seen.has(record.focusId) ? record.focusId : players[0].id;

  return {
    currency,
    players,
    expenses,
    minimize: record.minimize !== false,
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
