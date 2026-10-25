import { describe, expect, it } from "vitest";
import { decodeTrip, encodeTrip, tripFromHash } from "./codec";
import type { TripState } from "./model";

const trip: TripState = {
  currency: "₪",
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

  it("rejects a broken hash", () => {
    expect(tripFromHash("")).toBeNull();
    expect(tripFromHash("#")).toBeNull();
    expect(decodeTrip("not base64")).toBeNull();
    expect(decodeTrip(btoa("{"))).toBeNull();
  });
});
