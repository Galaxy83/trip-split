import { describe, expect, it } from "vitest";
import { entryType, entryWeight, normalizeTrip, playerSpends, type Expense, type Player } from "./model";

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
  it("ignores blank and invalid amounts and still counts a member who spent nothing", () => {
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
      ["Member 3", 10.5],
      ["Member 4", 0],
    ]);
    expect(playerSpends(players, [], "he").map((row) => row.name)).toEqual([
      "Igor",
      "Maxim",
      "חבר 3",
      "חבר 4",
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

  it("accepts a payload that says members instead of players", () => {
    const trip = normalizeTrip({
      members: [
        { id: "s", name: "סשה" },
        { id: "m", name: "מקסים" },
      ],
      expenses: [],
    });
    expect(trip?.players.map((person) => person.name)).toEqual(["סשה", "מקסים"]);
  });

  it("pads a single member up to the minimum of two", () => {
    const trip = normalizeTrip({
      players: [{ id: "only", name: "Igor" }],
      expenses: [],
    });
    expect(trip?.players).toHaveLength(2);
    expect(trip?.players[0].name).toBe("Igor");
    expect(trip?.currency).toBe("ILS");
    expect(entryType(trip!.players[0])).toBe("member");
    expect(entryWeight(trip!.players[0])).toBe(1);
  });

  it("keeps an old shekel symbol and treats missing types as members of weight 1", () => {
    const legacy = normalizeTrip({
      currency: "₪",
      players: [
        { id: "a", name: "Cohen family" },
        { id: "b", name: "Maxim" },
      ],
      expenses: [],
    });
    expect(legacy?.currency).toBe("ILS");
    expect(legacy?.players.every((player) => entryType(player) === "member" && entryWeight(player) === 1)).toBe(
      true,
    );

    const weighted = normalizeTrip({
      currency: "€",
      players: [
        { id: "a", name: "Cohen family", type: "family", weight: 3 },
        { id: "b", name: "Maxim" },
      ],
      expenses: [],
    });
    expect(weighted?.currency).toBe("EUR");
    expect(weighted?.players[0]).toMatchObject({ type: "group", weight: 3 });
    expect(entryWeight(weighted!.players[1])).toBe(1);
    expect(normalizeTrip({ currency: "xyz", players: [{ id: "a", name: "A" }, { id: "b", name: "B" }], expenses: [] })?.currency).toBe(
      "ILS",
    );
    expect(
      normalizeTrip({
        currency: "CA$",
        players: [
          { id: "a", name: "A", type: "group" },
          { id: "b", name: "B" },
        ],
        expenses: [],
      })?.players[0].weight,
    ).toBe(2);
  });
});
