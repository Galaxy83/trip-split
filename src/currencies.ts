import type { Lang } from "./preferences";

export interface CurrencyChoice {
  code: string;
  en: string;
  he: string;
  ru: string;
}

/** Shown first, in this order. Israeli shekel stays the default. */
export const primaryCurrencies: readonly CurrencyChoice[] = [
  { code: "EUR", en: "Euro (€)", he: "אירו (€)", ru: "Евро (€)" },
  { code: "USD", en: "US Dollar ($)", he: "דולר ארה״ב ($)", ru: "Доллар США ($)" },
  { code: "ILS", en: "Israeli Shekel (₪)", he: "שקל ישראלי (₪)", ru: "Израильский шекель (₪)" },
];

export const otherCurrencies: readonly CurrencyChoice[] = [
  { code: "GBP", en: "British Pound (£)", he: "לירה שטרלינג (£)", ru: "Фунт стерлингов (£)" },
  { code: "JPY", en: "Japanese Yen (¥)", he: "ין יפני (¥)", ru: "Японская иена (¥)" },
  { code: "CHF", en: "Swiss Franc (CHF)", he: "פרנק שווייצרי (CHF)", ru: "Швейцарский франк (CHF)" },
  { code: "CAD", en: "Canadian Dollar (CA$)", he: "דולר קנדי (CA$)", ru: "Канадский доллар (CA$)" },
  { code: "AUD", en: "Australian Dollar (A$)", he: "דולר אוסטרלי (A$)", ru: "Австралийский доллар (A$)" },
  { code: "CNY", en: "Chinese Yuan (CN¥)", he: "יואן סיני (CN¥)", ru: "Китайский юань (CN¥)" },
  { code: "SEK", en: "Swedish Krona", he: "כתר שוודי", ru: "Шведская крона" },
  { code: "NOK", en: "Norwegian Krone", he: "כתר נורווגי", ru: "Норвежская крона" },
  { code: "DKK", en: "Danish Krone", he: "כתר דני", ru: "Датская крона" },
  { code: "PLN", en: "Polish Zloty", he: "זלוטי", ru: "Польский злотый" },
  { code: "CZK", en: "Czech Koruna", he: "קורונה צ׳כית", ru: "Чешская крона" },
  { code: "HUF", en: "Hungarian Forint", he: "פורינט הונגרי", ru: "Венгерский форинт" },
  { code: "TRY", en: "Turkish Lira", he: "לירה טורקית", ru: "Турецкая лира" },
  { code: "THB", en: "Thai Baht", he: "באט תאילנדי", ru: "Тайский бат" },
  { code: "INR", en: "Indian Rupee", he: "רופי הודי", ru: "Индийская рупия" },
  { code: "SGD", en: "Singapore Dollar", he: "דולר סינגפורי", ru: "Сингапурский доллар" },
  { code: "HKD", en: "Hong Kong Dollar", he: "דולר הונג קונגי", ru: "Гонконгский доллар" },
  { code: "NZD", en: "New Zealand Dollar", he: "דולר ניו זילנדי", ru: "Новозеландский доллар" },
  { code: "ZAR", en: "South African Rand", he: "ראנד דרום אפריקאי", ru: "Южноафриканский рэнд" },
  { code: "MXN", en: "Mexican Peso", he: "פסו מקסיקני", ru: "Мексиканское песо" },
  { code: "BRL", en: "Brazilian Real", he: "ריאל ברזילאי", ru: "Бразильский реал" },
  { code: "AED", en: "UAE Dirham", he: "דירהם אמירתי", ru: "Дирхам ОАЭ" },
  { code: "GEL", en: "Georgian Lari", he: "לארי גאורגי", ru: "Грузинский лари" },
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
  if (lang === "he") return choice.he;
  if (lang === "ru") return choice.ru;
  return choice.en;
}

/** Symbol used in amounts, or the ISO code when the runtime has no distinct symbol. */
export function currencySymbol(code: string): string {
  const resolved = resolveCurrency(code);
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolved,
      currencyDisplay: "symbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? resolved;
  } catch {
    return resolved;
  }
}

/** Closed currency control: the ISO code, plus the symbol when it adds something. */
export function currencyShortLabel(code: string): string {
  const resolved = resolveCurrency(code);
  const symbol = currencySymbol(resolved);
  return symbol === resolved ? resolved : `${resolved} ${symbol}`;
}
