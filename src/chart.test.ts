import { describe, expect, it } from "vitest";
import {
  MEMBER_COLORS,
  PAID_RING,
  SHARE_RING,
  donutPath,
  memberColor,
  percentLabel,
  spendingChart,
} from "./chart";

describe("spending chart", () => {
  it("draws a paid ring and a fair-share ring in the same member colors", () => {
    const chart = spendingChart([
      { id: "a", name: "אנדריי", spent: 50, share: 40 },
      { id: "b", name: "Саша", spent: 30, share: 40 },
      { id: "c", name: "Cohen family", spent: 0, share: 20, balance: -20 },
    ]);

    expect(chart.empty).toBe(false);
    expect(chart.total).toBe(80);
    expect(chart.shareTotal).toBe(100);
    expect(chart.members.map((member) => member.name)).toEqual(["אנדריי", "Саша", "Cohen family"]);
    expect(chart.members.map((member) => member.spentFraction)).toEqual([50 / 80, 30 / 80, 0]);
    expect(chart.members.map((member) => member.shareFraction)).toEqual([0.4, 0.4, 0.2]);
    expect(chart.members.map((member) => member.spentPercent)).toEqual([63, 37, 0]);
    expect(chart.members.map((member) => member.sharePercent)).toEqual([40, 40, 20]);
    expect(chart.members.reduce((sum, member) => sum + member.spentPercent, 0)).toBe(100);
    expect(chart.members.reduce((sum, member) => sum + member.sharePercent, 0)).toBe(100);
    expect(chart.members.map((member) => member.difference)).toEqual([10, -10, -20]);

    const paid = chart.arcs.filter((arc) => arc.ring === "paid");
    const share = chart.arcs.filter((arc) => arc.ring === "share");
    expect(paid.map((arc) => arc.id)).toEqual(["a", "b"]);
    expect(share.map((arc) => arc.id)).toEqual(["a", "b", "c"]);
    expect(paid[0]).toMatchObject({ start: 0, full: false, radius: PAID_RING.radius, width: PAID_RING.width });
    expect(paid[1].end).toBe(1);
    expect(share[2].end).toBe(1);
    expect(paid[0].d).toBe(donutPath(0, 50 / 80, PAID_RING.radius));
    expect(share[0].d).toBe(donutPath(0, 0.4, SHARE_RING.radius));
    expect(paid[0].end - paid[0].start).not.toBe(share[0].end - share[0].start);
    expect(chart.members.map((member) => member.color)).toEqual([
      MEMBER_COLORS[0],
      MEMBER_COLORS[1],
      MEMBER_COLORS[2],
    ]);
    expect(paid[0].color).toBe(share[0].color);
  });

  it("draws a full ring only for the value that one member holds entirely", () => {
    const chart = spendingChart([
      { id: "a", name: "Maxim", spent: 18.5, share: 9.25 },
      { id: "b", name: "Sasha", spent: 0, share: 9.25 },
    ]);
    expect(chart.arcs.filter((arc) => arc.ring === "paid")).toEqual([
      {
        id: "a",
        color: MEMBER_COLORS[0],
        ring: "paid",
        radius: PAID_RING.radius,
        width: PAID_RING.width,
        start: 0,
        end: 1,
        d: null,
        full: true,
      },
    ]);
    const share = chart.arcs.filter((arc) => arc.ring === "share");
    expect(share.map((arc) => arc.id)).toEqual(["a", "b"]);
    expect(share.every((arc) => arc.full === false && arc.radius === SHARE_RING.radius)).toBe(true);
    expect(chart.members[0].spentPercent).toBe(100);
    expect(chart.members[1].spentPercent).toBe(0);
    expect(chart.members.map((member) => member.sharePercent)).toEqual([50, 50]);
    expect(chart.members.map((member) => member.difference)).toEqual([9.25, -9.25]);
  });

  it("stays empty when nothing was paid and there is no fair share", () => {
    const chart = spendingChart([
      { id: "a", name: "אנדריי", spent: 0, share: 0 },
      { id: "b", name: "Саша", spent: Number.NaN, share: -5 },
    ]);
    expect(chart.empty).toBe(true);
    expect(chart.total).toBe(0);
    expect(chart.shareTotal).toBe(0);
    expect(chart.arcs).toEqual([]);
    expect(chart.members.map((member) => member.spentPercent)).toEqual([0, 0]);
    expect(chart.members.map((member) => member.sharePercent)).toEqual([0, 0]);
    expect(chart.members.map((member) => member.difference)).toEqual([0, 0]);
    expect(spendingChart([]).empty).toBe(true);
  });

  it("gives a real payment under one percent its own label, and keeps colors stable", () => {
    const chart = spendingChart([
      { id: "big", name: "Hotel", spent: 100, share: 50 },
      { id: "tiny", name: "קפה", spent: 0.01, share: 50.01 },
    ]);
    expect(chart.members[1].spentPercent).toBe(0);
    expect(percentLabel(chart.members[1].spentPercent, chart.members[1].spent, "Under 1%")).toBe("Under 1%");
    expect(percentLabel(chart.members[0].spentPercent, chart.members[0].spent, "Under 1%")).toBe("100%");
    expect(percentLabel(0, 0, "פחות מ־1%")).toBe("0%");
    expect(chart.members[1].sharePercent).toBeGreaterThan(0);

    expect(memberColor(0)).toBe(MEMBER_COLORS[0]);
    expect(memberColor(1)).not.toBe(memberColor(0));
    expect(memberColor(MEMBER_COLORS.length)).toBe(MEMBER_COLORS[0]);
    expect(memberColor(-1)).toBe(MEMBER_COLORS[MEMBER_COLORS.length - 1]);
  });

  it("draws a clockwise arc from the top, on the radius of that ring", () => {
    const half = donutPath(0, 0.5, PAID_RING.radius);
    expect(half).toMatch(/^M [0-9.]+ [0-9.]+ A 82 82 0 0 1 /);
    const start = half!.match(/^M ([0-9.]+) ([0-9.]+)/);
    expect(Number(start?.[1])).toBeGreaterThan(100);
    expect(Number(start?.[2])).toBeLessThan(30);
    expect(donutPath(0, 0.8, SHARE_RING.radius)).toContain("A 64 64 0 1 1 ");
    expect(donutPath(0, 1, PAID_RING.radius)).toBeNull();
    expect(donutPath(0.2, 0.2, SHARE_RING.radius)).toBeNull();
  });
});
