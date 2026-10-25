import { describe, expect, it } from "vitest";
import { decodeTrip, encodeTrip, tripFromHash } from "./codec";
import { entryWeight, type TripState } from "./model";

const trip: TripState = {
  currency: "ILS",
  minimize: false,
  focusId: "a",
  players: [
    { id: "a", name: "אנדריי" },
    { id: "b", name: "Саша" },
    { id: "c", name: "Cohen family", type: "group", weight: 3 },
  ],
  expenses: [{ id: "e", description: "קפה", paidBy: "b", amount: "18.50" }],
};

function legacyEncode(state: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64ToBytes(payload: string): Uint8Array {
  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.length % 4 === 0 ? normalized : normalized + "=".repeat(4 - (normalized.length % 4));
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function shape(state: TripState | null) {
  if (!state) return null;
  return {
    currency: state.currency,
    minimize: state.minimize,
    focus: state.players.findIndex((player) => player.id === state.focusId),
    players: state.players.map((player) => ({
      name: player.name,
      type: player.type ?? "member",
      weight: entryWeight(player),
    })),
    expenses: state.expenses.map((expense) => ({
      description: expense.description,
      payer: state.players.findIndex((player) => player.id === expense.paidBy),
      amount: expense.amount,
    })),
  };
}

describe("share codec", () => {
  it("round-trips Hebrew and Russian names in a base64url hash", async () => {
    const encoded = await encodeTrip(trip);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(shape(await decodeTrip(encoded))).toEqual(shape(trip));
    expect(shape(await tripFromHash(`#${encodeURIComponent(encoded)}`))).toEqual(shape(trip));
  });

  it("keeps older verbose links working, including a members key", async () => {
    const encoded = legacyEncode(trip);
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    expect(json).toContain('"players"');
    expect(json).not.toContain('"members"');
    const saved = JSON.parse(json) as Record<string, unknown>;
    expect(saved).not.toHaveProperty("lang");
    expect(saved).not.toHaveProperty("language");
    expect(saved).not.toHaveProperty("theme");

    const legacy = await decodeTrip(encoded);
    expect(legacy).toEqual(trip);

    const withMembersKey = json.replace('"players"', '"members"');
    let renamed = "";
    for (const byte of new TextEncoder().encode(withMembersKey)) renamed += String.fromCharCode(byte);
    expect((await decodeTrip(btoa(renamed)))?.players[0].name).toBe("אנדריי");

    const family = await decodeTrip(
      legacyEncode({
        currency: "₪",
        players: [
          { id: "c", name: "משפחת כהן", type: "family", weight: 3 },
          { id: "m", name: "Максим" },
        ],
        expenses: [{ id: "e", description: "ужин", paidBy: "m", amount: "80" }],
      }),
    );
    expect(family?.currency).toBe("ILS");
    expect(family?.players[0]).toMatchObject({ name: "משפחת כהן", type: "group", weight: 3 });
    expect(family?.players[1].name).toBe("Максим");
    expect(family?.expenses[0]).toMatchObject({ description: "ужин", paidBy: "m", amount: "80" });
  });

  it("opens an older payload with minimize on unless that payload saved it off", async () => {
    const saved = JSON.parse(JSON.stringify(trip)) as Record<string, unknown>;
    delete saved.minimize;
    expect((await decodeTrip(legacyEncode(saved)))?.minimize).toBe(true);
    expect((await decodeTrip(legacyEncode({ ...trip, minimize: false })))?.minimize).toBe(false);
    expect(shape(await decodeTrip(await encodeTrip({ ...trip, minimize: true })))?.minimize).toBe(true);
    expect(shape(await decodeTrip(await encodeTrip(trip)))?.minimize).toBe(false);
  });

  it("drops default currency, weight, and minimize from a new link", async () => {
    const encoded = await encodeTrip({
      ...trip,
      currency: "ILS",
      minimize: true,
      players: [
        { id: "a", name: "אנדריי" },
        { id: "b", name: "Саша", type: "group", weight: 2 },
      ],
      expenses: trip.expenses,
      focusId: "a",
    });
    const inflated = await decodeTrip(encoded);
    expect(inflated?.currency).toBe("ILS");
    expect(inflated?.minimize).toBe(true);
    expect(entryWeight(inflated!.players[0])).toBe(1);
    expect(entryWeight(inflated!.players[1])).toBe(2);
    const raw = await decodeTrip(encoded);
    expect(raw?.players[1].type).toBe("group");
  });

  it("is substantially shorter than the old JSON hash for a 4-member, 6-expense trip", async () => {
    const players: TripState["players"] = [
      { id: crypto.randomUUID(), name: "אנדריי" },
      { id: crypto.randomUUID(), name: "Саша" },
      { id: crypto.randomUUID(), name: "Maxim" },
      { id: crypto.randomUUID(), name: "Cohen family", type: "group", weight: 3 },
    ];
    const rows: Array<[string, number, string]> = [
      ["Dinner", 0, "120.50"],
      ["מונית", 1, "86"],
      ["ужин", 2, "240"],
      ["Hotel", 3, "980"],
      ["Tickets", 0, "60"],
      ["Coffee", 1, "18.50"],
    ];
    const sample: TripState = {
      currency: "ILS",
      minimize: true,
      focusId: players[0].id,
      players,
      expenses: rows.map(([description, payer, amount]) => ({
        id: crypto.randomUUID(),
        description,
        paidBy: players[payer].id,
        amount,
      })),
    };
    const before = legacyEncode(sample).length;
    const after = await encodeTrip(sample);
    expect(after.length).toBeLessThan(before / 2);
    const marker = base64ToBytes(after)[0];
    expect(marker).toBe(1);
    expect(shape(await decodeTrip(after))).toEqual(shape(sample));
  });

  it("still reads a compact link that was stored without compression", async () => {
    const compact = [0, ["אנדריי", "Саша", ["Cohen family", 4]], [[1, "18.50", "קפה"]]];
    const body = new TextEncoder().encode(JSON.stringify(compact));
    const bytes = new Uint8Array(body.length + 1);
    bytes.set(body, 1);
    expect(shape(await decodeTrip(bytesToBase64Url(bytes)))).toEqual({
      currency: "ILS",
      minimize: true,
      focus: 0,
      players: [
        { name: "אנדריי", type: "member", weight: 1 },
        { name: "Саша", type: "member", weight: 1 },
        { name: "Cohen family", type: "group", weight: 4 },
      ],
      expenses: [{ description: "קפה", payer: 1, amount: "18.50" }],
    });
  });

  it("rejects a broken hash", async () => {
    expect(await tripFromHash("")).toBeNull();
    expect(await tripFromHash("#")).toBeNull();
    expect(await decodeTrip("not base64")).toBeNull();
    expect(await decodeTrip(btoa("{"))).toBeNull();
  });
});
