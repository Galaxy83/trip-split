import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY,
  currencyName,
  otherCurrencies,
  primaryCurrencies,
  resolveCurrency,
} from "./currencies";

describe("currencies", () => {
  it("lists euro, dollar, and shekel first, then the other majors", () => {
    expect(primaryCurrencies.map((choice) => choice.code)).toEqual(["EUR", "USD", "ILS"]);
    expect(otherCurrencies.map((choice) => choice.code)).toEqual([
      "GBP",
      "JPY",
      "CHF",
      "CAD",
      "AUD",
      "CNY",
      "SEK",
      "NOK",
      "DKK",
      "PLN",
      "CZK",
      "HUF",
      "TRY",
      "THB",
      "INR",
      "SGD",
      "HKD",
      "NZD",
      "ZAR",
      "MXN",
      "BRL",
      "AED",
      "GEL",
    ]);
    expect(DEFAULT_CURRENCY).toBe("ILS");
  });

  it("maps an old free-text symbol onto a currency and falls back to shekel", () => {
    expect(resolveCurrency("₪")).toBe("ILS");
    expect(resolveCurrency("NIS")).toBe("ILS");
    expect(resolveCurrency("€")).toBe("EUR");
    expect(resolveCurrency("euro")).toBe("EUR");
    expect(resolveCurrency("$")).toBe("USD");
    expect(resolveCurrency("US$")).toBe("USD");
    expect(resolveCurrency("£")).toBe("GBP");
    expect(resolveCurrency("¥")).toBe("JPY");
    expect(resolveCurrency("CA$")).toBe("CAD");
    expect(resolveCurrency("A$")).toBe("AUD");
    expect(resolveCurrency("CN¥")).toBe("CNY");
    expect(resolveCurrency("CHF")).toBe("CHF");
    expect(resolveCurrency("gel")).toBe("GEL");
    expect(resolveCurrency("₾")).toBe("GEL");
    expect(resolveCurrency("kr")).toBe("ILS");
    expect(resolveCurrency("xyz")).toBe("ILS");
    expect(resolveCurrency("")).toBe("ILS");
    expect(resolveCurrency(null)).toBe("ILS");
  });

  it("translates the currency name", () => {
    expect(currencyName("ILS", "en")).toBe("Israeli Shekel (₪)");
    expect(currencyName("ILS", "he")).toBe("שקל ישראלי (₪)");
    expect(currencyName("€", "he")).toBe("אירו (€)");
    expect(currencyName("GEL", "he")).toBe("לארי גאורגי");
    expect(currencyName("nope", "en")).toBe("Israeli Shekel (₪)");
    expect(currencyName("ILS", "ru")).toBe("Израильский шекель (₪)");
    expect(currencyName("€", "ru")).toBe("Евро (€)");
    expect(currencyName("GEL", "ru")).toBe("Грузинский лари");
    expect(currencyName("CN¥", "ru")).toBe("Китайский юань (CN¥)");
    for (const choice of [...primaryCurrencies, ...otherCurrencies]) {
      expect(choice.ru.trim().length).toBeGreaterThan(0);
      expect(currencyName(choice.code, "ru")).toBe(choice.ru);
    }
  });
});
