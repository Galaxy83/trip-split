import type { Lang } from "./preferences";

export interface CurrencyChoice {
  code: string;
  en: string;
  he: string;
}

/** Shown first, in this order. Israeli shekel stays the default. */
export const primaryCurrencies: readonly CurrencyChoice[] = [
  { code: "EUR", en: "Euro (€)", he: "אירו (€)" },
  { code: "USD", en: "US Dollar ($)", he: "דולר ארה״ב ($)" },
  { code: "ILS", en: "Israeli Shekel (₪)", he: "שקל ישראלי (₪)" },
];

export const otherCurrencies: readonly CurrencyChoice[] = [
  { code: "GBP", en: "British Pound (£)", he: "לירה שטרלינג (£)" },
  { code: "JPY", en: "Japanese Yen (¥)", he: "ין יפני (¥)" },
  { code: "CHF", en: "Swiss Franc (CHF)", he: "פרנק שווייצרי (CHF)" },
  { code: "CAD", en: "Canadian Dollar (CA$)", he: "דולר קנדי (CA$)" },
  { code: "AUD", en: "Australian Dollar (A$)", he: "דולר אוסטרלי (A$)" },
  { code: "CNY", en: "Chinese Yuan (CN¥)", he: "יואן סיני (CN¥)" },
  { code: "SEK", en: "Swedish Krona", he: "כתר שוודי" },
  { code: "NOK", en: "Norwegian Krone", he: "כתר נורווגי" },
  { code: "DKK", en: "Danish Krone", he: "כתר דני" },
  { code: "PLN", en: "Polish Zloty", he: "זלוטי" },
  { code: "CZK", en: "Czech Koruna", he: "קורונה צ׳כית" },
  { code: "HUF", en: "Hungarian Forint", he: "פורינט הונגרי" },
  { code: "TRY", en: "Turkish Lira", he: "לירה טורקית" },
  { code: "THB", en: "Thai Baht", he: "באט תאילנדי" },
  { code: "INR", en: "Indian Rupee", he: "רופי הודי" },
  { code: "SGD", en: "Singapore Dollar", he: "דולר סינגפורי" },
  { code: "HKD", en: "Hong Kong Dollar", he: "דולר הונג קונגי" },
  { code: "NZD", en: "New Zealand Dollar", he: "דולר ניו זילנדי" },
  { code: "ZAR", en: "South African Rand", he: "ראנד דרום אפריקאי" },
  { code: "MXN", en: "Mexican Peso", he: "פסו מקסיקני" },
  { code: "BRL", en: "Brazilian Real", he: "ריאל ברזילאי" },
  { code: "AED", en: "UAE Dirham", he: "דירהם אמירתי" },
  { code: "GEL", en: "Georgian Lari", he: "לארי גאורגי" },
];

export const currencyChoices: readonly CurrencyChoice[] = [...primaryCurrencies, ...otherCurrencies];

export const DEFAULT_CURRENCY = "ILS";

const BY_CODE = new Map(currencyChoices.map((choice) => [choice.code, choice]));

/** Free-text symbols and short names saved before the dropdown. */
const ALIASES: Record<string, string> = {
  ILS: "ILS",
  NIS: "ILS",
  "₪": "ILS",
  EUR: "EUR",
  EURO: "EUR",
  "€": "EUR",
  USD: "USD",
  US$: "USD",
  $: "USD",
  GBP: "GBP",
  "£": "GBP",
  JPY: "JPY",
  YEN: "JPY",
  "¥": "JPY",
  CHF: "CHF",
  CAD: "CAD",
  CA$: "CAD",
  C$: "CAD",
  AUD: "AUD",
  A$: "AUD",
  CNY: "CNY",
  "CN¥": "CNY",
  RMB: "CNY",
  SEK: "SEK",
  NOK: "NOK",
  DKK: "DKK",
  PLN: "PLN",
  CZK: "CZK",
  HUF: "HUF",
  TRY: "TRY",
  "₺": "TRY",
  THB: "THB",
  "฿": "THB",
  INR: "INR",
  "₹": "INR",
  SGD: "SGD",
  S$: "SGD",
  HKD: "HKD",
  HK$: "HKD",
  NZD: "NZD",
  NZ$: "NZD",
  ZAR: "ZAR",
  MXN: "MXN",
  BRL: "BRL",
  R$: "BRL",
  AED: "AED",
  GEL: "GEL",
  "₾": "GEL",
};

/** Map a stored symbol or code onto a dropdown option. Unknown text falls back to shekel. */
export function resolveCurrency(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return DEFAULT_CURRENCY;
  const token = trimmed.toUpperCase();
  return ALIASES[token] ?? BY_CODE.get(token)?.code ?? DEFAULT_CURRENCY;
}

export function currencyName(code: string, lang: Lang): string {
  const choice = BY_CODE.get(resolveCurrency(code));
  if (!choice) return currencyName(DEFAULT_CURRENCY, lang);
  return lang === "he" ? choice.he : choice.en;
}
