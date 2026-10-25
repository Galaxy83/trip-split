import { resolveCurrency } from "./currencies";

/** Parse a typed amount. Empty and invalid rows are ignored. Negatives are rejected. */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.includes("-") || trimmed.includes("−")) return null;

  let token = trimmed.replace(/\s/g, "");
  if (token.startsWith("+")) token = token.slice(1);

  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(token)) {
    token = token.replace(/,/g, "");
  } else if (token.includes(",") && !token.includes(".")) {
    if (!/^\d+,\d+$/.test(token)) return null;
    token = token.replace(",", ".");
  }

  if (!/^\d+(\.\d+)?$/.test(token)) return null;
  const value = Number(token);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100 + 1e-6) / 100;
}

export function amountProblem(raw: string): "negative" | "invalid" | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.includes("-") || trimmed.includes("−")) return "negative";
  if (parseAmount(trimmed) != null) return null;
  const token = trimmed.replace(/\s/g, "");
  if (/^[+]?\d+[.,]$/.test(token)) return null;
  return "invalid";
}

export function formatMoney(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: resolveCurrency(currency),
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return amount < -1e-9 ? `−${formatted}` : formatted;
}

export function formatSignedMoney(amount: number, currency: string): string {
  const cents = Math.round(Math.abs(amount) * 100 + 1e-6);
  if (cents === 0 || Math.abs(amount) < 0.005) return formatMoney(0, currency);
  const body = formatMoney(cents / 100, currency);
  return amount > 0 ? `+${body}` : `−${body}`;
}

export function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
