import type { Lang } from "./preferences";

/** Language from a share URL. Missing or unknown values do not force a language. */
export function langFromSearch(search: string): Lang | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(query).get("lang")?.toLowerCase();
  if (value === "en" || value === "he" || value === "ru") return value;
  return null;
}

/** A `lang` query value wins over the language saved on this device. */
export function resolveLang(search: string, stored: Lang): Lang {
  return langFromSearch(search) ?? stored;
}

/** Put the current language on a share URL without dropping the trip hash. */
export function shareLocation(currentHref: string, hashPayload: string, lang: Lang): string {
  const url = new URL(currentHref);
  url.searchParams.set("lang", lang);
  url.hash = hashPayload;
  return url.href;
}
