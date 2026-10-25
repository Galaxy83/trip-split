export type ThemeChoice = "system" | "light" | "dark";
export type Lang = "en" | "he";

export const THEME_KEY = "trip-split:theme";
export const LANG_KEY = "trip-split:lang";

export function parseTheme(value: string | null | undefined): ThemeChoice {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function parseLang(value: string | null | undefined): Lang {
  return value === "he" ? "he" : "en";
}

export function resolvedTheme(choice: ThemeChoice, systemDark: boolean): "light" | "dark" {
  if (choice === "dark") return "dark";
  if (choice === "light") return "light";
  return systemDark ? "dark" : "light";
}

export function loadTheme(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

export function saveTheme(theme: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The page still applies the choice for this visit.
  }
}

export function loadLang(): Lang {
  try {
    return parseLang(localStorage.getItem(LANG_KEY));
  } catch {
    return "en";
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // The page still uses the choice for this visit.
  }
}
