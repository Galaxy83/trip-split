import { describe, expect, it } from "vitest";
import { normalizeTrip, playerSpends, type Expense, type Player } from "./model";

const players: Player[] = [
  { id: "igor", name: "Igor" },
  { id: "maxim", name: "Maxim" },
  { id: "andrei", name: "" },
  { id: "sasha", name: "  " },
];

function expense(partial: Partial<Expense> & Pick<Expense, "paidBy" | "amount">): Expense {
  return {
    id: partial.id ?? "e",
    description: partial.description ?? "",
    paidBy: partial.paidBy,
    amount: partial.amount,
  };
}

describe("playerSpends", () => {
  it("ignores blank and invalid amounts and still counts a player who spent nothing", () => {
    const spends = playerSpends(players, [
      expense({ paidBy: "igor", amount: "526" }),
      expense({ paidBy: "maxim", amount: "1,000.25" }),
      expense({ paidBy: "maxim", amount: "" }),
      expense({ paidBy: "maxim", amount: "nope" }),
      expense({ paidBy: "maxim", amount: "-20" }),
      expense({ paidBy: "andrei", amount: "10.5", description: "snacks" }),
    ]);

    expect(spends.map((row) => [row.name, row.spent])).toEqual([
      ["Igor", 526],
      ["Maxim", 1000.25],
      ["Player 3", 10.5],
      ["Player 4", 0],
    ]);
  });
});

describe("normalizeTrip", () => {
  it("keeps Hebrew names and drops garbage", () => {
    const trip = normalizeTrip({
      currency: "₪",
      minimize: true,
      focusId: "s",
      players: [
        { id: "s", name: "סשה" },
        { id: "m", name: "מקסים" },
      ],
      expenses: [{ id: "e", description: "מונית", paidBy: "m", amount: "80" }],
    });
    expect(trip?.players[0].name).toBe("סשה");
    expect(trip?.expenses[0].description).toBe("מונית");
    expect(trip?.minimize).toBe(true);
    expect(trip?.focusId).toBe("s");
    expect(normalizeTrip({ nope: true })).toBeNull();
    expect(normalizeTrip(null)).toBeNull();
  });

  it("pads a single player up to the minimum of two", () => {
    const trip = normalizeTrip({
      players: [{ id: "only", name: "Igor" }],
      expenses: [],
    });
    expect(trip?.players).toHaveLength(2);
    expect(trip?.players[0].name).toBe("Igor");
    expect(trip?.currency).toBe("₪");
  });
});
