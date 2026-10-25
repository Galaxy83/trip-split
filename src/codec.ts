import { DEFAULT_CURRENCY, resolveCurrency } from "./currencies";
import { entryType, entryWeight, normalizeTrip, type TripState } from "./model";

/**
 * Share-link payload.
 * New links are a compact array, deflate-raw compressed when that is smaller,
 * then base64url. Older links are standard base64 of verbose JSON and still decode.
 * `?lang=` stays a separate short query parameter.
 */

const RAW = 0;
const DEFLATE = 1;

export async function encodeTrip(state: TripState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(compactTrip(state)));
  const raw = withPrefix(RAW, bytes);
  const deflated = await deflateRaw(bytes);
  const payload = deflated && deflated.length + 1 < raw.length ? withPrefix(DEFLATE, deflated) : raw;
  return bytesToBase64Url(payload);
}

export async function decodeTrip(payload: string): Promise<TripState | null> {
  try {
    const bytes = base64ToBytes(payload);
    if (bytes.length === 0) return null;
    if (bytes[0] === 0x7b) return normalizeTrip(JSON.parse(new TextDecoder().decode(bytes)));
    if (bytes[0] === DEFLATE) {
      const inflated = await inflateRaw(bytes.subarray(1));
      if (!inflated) return null;
      return expandCompact(JSON.parse(new TextDecoder().decode(inflated)));
    }
    if (bytes[0] === RAW) return expandCompact(JSON.parse(new TextDecoder().decode(bytes.subarray(1))));
    return null;
  } catch {
    return null;
  }
}

export async function tripFromHash(hash: string): Promise<TripState | null> {
  let raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Keep the raw hash when it is not percent-encoded.
  }
  return decodeTrip(raw);
}

/** Indexes instead of ids, and no currency or minimize flag when they are the defaults. */
function compactTrip(state: TripState): unknown[] {
  const indexById = new Map(state.players.map((player, index) => [player.id, index]));
  const players = state.players.map((player) => {
    if (entryType(player) !== "group") return player.name;
    const weight = entryWeight(player);
    return weight === 2 ? [player.name] : [player.name, weight];
  });
  const expenses: unknown[] = [];
  for (const expense of state.expenses) {
    if (!expense.amount.trim() && !expense.description.trim()) continue;
    const payer = indexById.get(expense.paidBy) ?? 0;
    expenses.push(
      expense.description ? [payer, expense.amount, expense.description] : [payer, expense.amount],
    );
  }
  const focus = state.players.findIndex((player) => player.id === state.focusId);
  const packed: unknown[] = [focus < 0 ? 0 : focus, players, expenses];
  const currency = resolveCurrency(state.currency);
  const minimizeOff = state.minimize === false;
  if (currency !== DEFAULT_CURRENCY || minimizeOff) packed.push(currency === DEFAULT_CURRENCY ? null : currency);
  if (minimizeOff) packed.push(0);
  return packed;
}

function expandCompact(data: unknown): TripState | null {
  if (!Array.isArray(data) || !Array.isArray(data[1])) return null;
  const players: TripState["players"] = [];
  for (const entry of data[1]) {
    const id = `p${players.length}`;
    if (typeof entry === "string") {
      players.push({ id, name: entry });
      continue;
    }
    if (!Array.isArray(entry)) continue;
    const name = typeof entry[0] === "string" ? entry[0] : "";
    const weight = entry.length >= 2 && (typeof entry[1] === "number" || typeof entry[1] === "string") ? entry[1] : 2;
    players.push({ id, name, type: "group", weight: typeof weight === "number" ? weight : Number(weight) });
  }
  if (players.length === 0) return null;

  const expenses: TripState["expenses"] = [];
  if (Array.isArray(data[2])) {
    for (const entry of data[2]) {
      if (!Array.isArray(entry)) continue;
      const payer = typeof entry[0] === "number" ? entry[0] : 0;
      const amount = entry[1] == null ? "" : String(entry[1]);
      const description = typeof entry[2] === "string" ? entry[2] : "";
      expenses.push({
        id: `x${expenses.length}`,
        description,
        paidBy: players[payer]?.id ?? players[0].id,
        amount,
      });
    }
  }

  const focusIndex = typeof data[0] === "number" ? data[0] : 0;
  const currency = typeof data[3] === "string" ? data[3] : undefined;
  const minimizeOff = data[4] === 0 || data[4] === false || data[3] === 0;
  return normalizeTrip({
    currency,
    players,
    expenses,
    minimize: minimizeOff ? false : undefined,
    focusId: players[focusIndex]?.id ?? players[0].id,
  });
}

function blobOf(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy]);
}

function withPrefix(prefix: number, bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length + 1);
  out[0] = prefix;
  out.set(bytes, 1);
  return out;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = blobOf(bytes).stream().pipeThrough(new CompressionStream("deflate-raw"));
    if (!stream) return null;
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = blobOf(bytes).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    if (!stream) return null;
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

/** Standard base64 (older links) and base64url (new links). */
function base64ToBytes(payload: string): Uint8Array {
  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.length % 4 === 0 ? normalized : normalized + "=".repeat(4 - (normalized.length % 4));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
