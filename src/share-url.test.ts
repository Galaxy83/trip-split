import { describe, expect, it } from "vitest";
import { encodeTrip, tripFromHash } from "./codec";
import type { TripState } from "./model";
import { langFromSearch, resolveLang, shareLocation } from "./share-url";

const trip: TripState = {
  currency: "ILS",
  minimize: false,
  focusId: "a",
  players: [
    { id: "a", name: "אנדריי" },
    { id: "b", name: "Sasha" },
  ],
  expenses: [{ id: "e", description: "קפה", paidBy: "a", amount: "18.50" }],
};

describe("share url language", () => {
  it("lets the link language override the saved language", () => {
    expect(langFromSearch("?lang=he")).toBe("he");
    expect(langFromSearch("?lang=ru")).toBe("ru");
    expect(langFromSearch("?lang=RU")).toBe("ru");
    expect(langFromSearch("lang=EN")).toBe("en");
    expect(resolveLang("?lang=he", "en")).toBe("he");
    expect(resolveLang("?lang=ru", "he")).toBe("ru");
    expect(resolveLang("?lang=en", "ru")).toBe("en");
    expect(resolveLang("?other=1&lang=he", "en")).toBe("he");
  });

  it("keeps an old link working and falls back when it has no language", async () => {
    const encoded = await encodeTrip(trip);
    const opened = `https://galaxy83.github.io/trip-split/#${encoded}`;
    const url = new URL(opened);

    expect(langFromSearch(url.search)).toBeNull();
    expect(langFromSearch("?lang=fr")).toBeNull();
    expect(langFromSearch("")).toBeNull();
    expect(resolveLang(url.search, "he")).toBe("he");
    expect(resolveLang("?lang=fr", "en")).toBe("en");
    expect((await tripFromHash(url.hash))?.players.map((player) => player.name)).toEqual(["אנדריי", "Sasha"]);
    expect((await tripFromHash(url.hash))?.expenses[0]).toMatchObject({ description: "קפה", amount: "18.50" });

    const shared = new URL(shareLocation(opened, encoded, "he"));
    expect(shared.searchParams.get("lang")).toBe("he");
    expect(resolveLang(shared.search, "en")).toBe("he");
    expect((await tripFromHash(shared.hash))?.minimize).toBe(false);

    const switched = new URL(shareLocation(shared.href, encoded, "en"));
    expect(switched.searchParams.get("lang")).toBe("en");
    expect((await tripFromHash(switched.hash))?.currency).toBe("ILS");
    expect(switched.hash).toBe(`#${encoded}`);

    const russian = new URL(shareLocation(switched.href, encoded, "ru"));
    expect(russian.searchParams.get("lang")).toBe("ru");
    expect(resolveLang(russian.search, "he")).toBe("ru");
    expect((await tripFromHash(russian.hash))?.players[1].name).toBe("Sasha");
    expect(russian.hash).toBe(`#${encoded}`);
  });
});
