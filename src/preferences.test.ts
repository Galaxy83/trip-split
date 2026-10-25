import { describe, expect, it } from "vitest";
import { parseLang, parseTheme, resolvedTheme } from "./preferences";

describe("preferences", () => {
  it("defaults to the system theme and English", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("nope")).toBe("system");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseLang(null)).toBe("en");
    expect(parseLang("he")).toBe("he");
    expect(parseLang("fr")).toBe("en");
  });

  it("resolves system from the device and keeps an explicit choice", () => {
    expect(resolvedTheme("system", true)).toBe("dark");
    expect(resolvedTheme("system", false)).toBe("light");
    expect(resolvedTheme("light", true)).toBe("light");
    expect(resolvedTheme("dark", false)).toBe("dark");
  });
});
