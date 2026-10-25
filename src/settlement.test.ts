import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";
import { settle, type SpendRow, type Transfer } from "./settlement";
import { copy, sentenceText } from "./strings";

const trip: SpendRow[] = [
  { id: "igor", name: "Igor", spent: 526 },
  { id: "maxim", name: "Maxim", spent: 3475 },
  { id: "andrei", name: "Andrei", spent: 0 },
  { id: "sasha", name: "Sasha", spent: 0 },
];

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function lines(transfers: Transfer[]): string[] {
  return transfers.map((transfer) => `${transfer.fromName}->${transfer.toName}:${transfer.amount.toFixed(2)}`);
}

describe("settle", () => {
  it("splits the Igor / Maxim / Andrei / Sasha trip", () => {
    const result = settle(trip);

    expect(cents(result.total)).toBe(400_100);
    expect(result.playerCount).toBe(4);
    expect(cents(result.share)).toBe(100_025);

    const byName = Object.fromEntries(result.balances.map((row) => [row.name, row]));
    expect(cents(byName.Igor.spent)).toBe(52_600);
    expect(cents(byName.Igor.balance)).toBe(-47_425);
    expect(cents(byName.Maxim.balance)).toBe(247_475);
    expect(cents(byName.Andrei.spent)).toBe(0);
    expect(cents(byName.Andrei.balance)).toBe(-100_025);
    expect(cents(byName.Sasha.balance)).toBe(-100_025);

    expect(lines(result.transfers)).toEqual([
      "Igor->Maxim:474.25",
      "Andrei->Maxim:1000.25",
      "Sasha->Maxim:1000.25",
    ]);

    const sentence = sentenceText(copy.pays("Sasha", "Maxim", formatMoney(1000.25, "₪")));
    expect(sentence).toBe("Sasha pays Maxim ₪1,000.25");
  });

  it("splits each payer between two people who are owed", () => {
    const withCar: SpendRow[] = trip.map((row) =>
      row.id === "andrei" ? { ...row, spent: 2000 } : row,
    );
    const result = settle(withCar);

    expect(cents(result.total)).toBe(600_100);
    expect(cents(result.share)).toBe(150_025);

    const byName = Object.fromEntries(result.balances.map((row) => [row.name, row]));
    expect(cents(byName.Igor.balance)).toBe(-97_425);
    expect(cents(byName.Maxim.balance)).toBe(197_475);
    expect(cents(byName.Andrei.balance)).toBe(49_975);
    expect(cents(byName.Sasha.balance)).toBe(-150_025);

    expect(lines(result.transfers)).toEqual([
      "Igor->Maxim:777.49",
      "Igor->Andrei:196.76",
      "Sasha->Maxim:1197.26",
      "Sasha->Andrei:302.99",
    ]);

    const paid = new Map<string, number>();
    for (const transfer of result.transfers) {
      paid.set(transfer.fromName, (paid.get(transfer.fromName) ?? 0) + cents(transfer.amount));
    }
    expect(paid.get("Igor")).toBe(97_425);
    expect(paid.get("Sasha")).toBe(150_025);
  });

  it("adjusts the largest payment so each payer matches what they owe", () => {
    // Unrounded halves are 2.375 and 0.875. Half-up rounding would pay 2.38 + 0.88 = 3.26.
    // The largest transfer is reduced by one cent so the payer still pays 3.25.
    const result = settle([
      { id: "a", name: "A", spent: 8 },
      { id: "b", name: "B", spent: 5 },
      { id: "c", name: "C", spent: 0 },
      { id: "d", name: "D", spent: 0 },
    ]);

    expect(cents(result.total)).toBe(1_300);
    expect(cents(result.share)).toBe(325);
    expect(lines(result.transfers)).toEqual([
      "C->A:2.37",
      "C->B:0.88",
      "D->A:2.37",
      "D->B:0.88",
    ]);
    for (const name of ["C", "D"]) {
      const sum = result.transfers
        .filter((transfer) => transfer.fromName === name)
        .reduce((total, transfer) => total + cents(transfer.amount), 0);
      expect(sum).toBe(325);
    }
    expect(result.transfers.every((transfer) => transfer.amount > 0)).toBe(true);
  });

  it("matches the largest debt to the largest credit when minimizing payments", () => {
    const withCar: SpendRow[] = trip.map((row) =>
      row.id === "andrei" ? { ...row, spent: 2000 } : row,
    );
    const result = settle(withCar, "minimize");

    expect(lines(result.transfers)).toEqual([
      "Sasha->Maxim:1500.25",
      "Igor->Andrei:499.75",
      "Igor->Maxim:474.50",
    ]);
    expect(result.transfers).toHaveLength(3);
    expect(settle(withCar, "proportional").transfers).toHaveLength(4);
  });

  it("returns zeros and no payments when nobody has spent", () => {
    const result = settle([
      { id: "a", name: "A", spent: 0 },
      { id: "b", name: "B", spent: 0 },
      { id: "c", name: "C", spent: 0 },
    ]);
    expect(result.total).toBe(0);
    expect(result.share).toBe(0);
    expect(result.balances.every((row) => row.balance === 0 && row.spent === 0)).toBe(true);
    expect(result.transfers).toEqual([]);
  });

  it("keeps Hebrew names on the transfers", () => {
    const result = settle([
      { id: "s", name: "סשה", spent: 0 },
      { id: "m", name: "מקסים", spent: 100 },
    ]);
    expect(result.transfers).toEqual([
      {
        fromId: "s",
        fromName: "סשה",
        toId: "m",
        toName: "מקסים",
        amount: 50,
      },
    ]);
    expect(sentenceText(copy.pays("סשה", "מקסים", formatMoney(50, "₪")))).toBe(
      "סשה pays מקסים ₪50.00",
    );
  });
});
