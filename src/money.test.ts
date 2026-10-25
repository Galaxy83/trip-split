import { describe, expect, it } from "vitest";
import { amountProblem, formatMoney, formatSignedMoney, parseAmount } from "./money";

describe("parseAmount", () => {
  it("ignores empty and invalid rows and blocks negatives", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("−2")).toBeNull();
    expect(amountProblem("-5")).toBe("negative");
    expect(amountProblem("abc")).toBe("invalid");
    expect(amountProblem("")).toBeNull();
    expect(amountProblem("12.")).toBeNull();
  });

  it("reads decimals, thousands separators, and rounds to cents", () => {
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("12.50")).toBe(12.5);
    expect(parseAmount("1,000.25")).toBe(1000.25);
    expect(parseAmount("10,5")).toBe(10.5);
    expect(parseAmount("1,000")).toBe(1000);
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount("1.005")).toBe(1.01);
  });
});

describe("formatMoney", () => {
  it("formats shekels the way the settlement sentence does", () => {
    expect(formatMoney(1000.25, "₪")).toBe("₪1,000.25");
    expect(formatMoney(474.25, "₪")).toBe("₪474.25");
    expect(formatSignedMoney(-474.25, "₪")).toBe("−₪474.25");
    expect(formatSignedMoney(2474.75, "₪")).toBe("+₪2,474.75");
    expect(formatSignedMoney(0, "₪")).toBe("₪0.00");
    expect(formatMoney(1000.25, "ILS")).toBe("₪1,000.25");
    expect(formatMoney(1000.25, "USD")).toBe("$1,000.25");
    expect(formatMoney(1000.25, "$")).toBe("$1,000.25");
    expect(formatMoney(1000.25, "CAD")).toBe("CA$1,000.25");
    expect(formatMoney(1000.25, "CNY")).toBe("CN¥1,000.25");
    expect(formatMoney(1000.25, "EUR")).toBe("€1,000.25");
    expect(formatMoney(10, "xyz")).toBe("₪10.00");
  });
});
