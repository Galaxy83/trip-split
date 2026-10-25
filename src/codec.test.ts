import { describe, expect, it } from "vitest";
import { decodeTrip, encodeTrip, tripFromHash } from "./codec";
import type { TripState } from "./model";

const trip: TripState = {
  currency: "ILS",
  minimize: false,
  focusId: "a",
  players: [
    { id: "a", name: "אנדריי" },
    { id: "b", name: "Sasha 🚌" },
  ],
  expenses: [{ id: "e", description: "קפה", paidBy: "a", amount: "18.50" }],
};

describe("share codec", () => {
  it("round-trips unicode through ASCII base64", () => {
    const encoded = encodeTrip(trip);
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(decodeTrip(encoded)).toEqual(trip);
    expect(tripFromHash(`#${encodeURIComponent(encoded)}`)).toEqual(trip);
  });

  it("keeps the players key so older share links still load", () => {
    const encoded = encodeTrip(trip);
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    expect(json).toContain('"players"');
    expect(json).not.toContain('"members"');
    const saved = JSON.parse(json) as Record<string, unknown>;
    // Language is the ?lang= query on the share URL, not a field in this payload.
    expect(saved).not.toHaveProperty("lang");
    expect(saved).not.toHaveProperty("language");
    expect(saved).not.toHaveProperty("theme");

    const legacy = decodeTrip(encoded);
    expect(legacy?.players.map((person) => person.name)).toEqual(["אנדריי", "Sasha 🚌"]);

    const withMembersKey = json.replace('"players"', '"members"');
    let renamed = "";
    const renamedBytes = new TextEncoder().encode(withMembersKey);
    for (const byte of renamedBytes) renamed += String.fromCharCode(byte);
    expect(decodeTrip(btoa(renamed))?.players[0].name).toBe("אנדריי");
  });

  it("opens an older payload with minimize on unless that payload saved it off", () => {
    const saved = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(encodeTrip(trip)), (char) => char.charCodeAt(0)),
      ),
    ) as Record<string, unknown>;
    delete saved.minimize;
    const bytes = new TextEncoder().encode(JSON.stringify(saved));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    expect(decodeTrip(btoa(binary))?.minimize).toBe(true);
    expect(decodeTrip(encodeTrip({ ...trip, minimize: false }))?.minimize).toBe(false);
  });

  it("rejects a broken hash", () => {
    expect(tripFromHash("")).toBeNull();
    expect(tripFromHash("#")).toBeNull();
    expect(decodeTrip("not base64")).toBeNull();
    expect(decodeTrip(btoa("{"))).toBeNull();
  });
});
