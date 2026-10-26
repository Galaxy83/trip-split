import { describe, expect, it } from "vitest";
import {
  MEMBER_COLORS,
  barFraction,
  donutPath,
  memberColor,
  percentLabel,
  spendingChart,
} from "./chart";

describe("spending chart", () => {
  it("splits the donut by what each member paid, including Hebrew and Russian names", () => {
    const chart = spendingChart([
      { id: "a", name: "אנדריי", spent: 50, share: 40 },
      { id: "b", name: "Саша", spent: 30, share: 40 },
      { id: "c", name: "Cohen family", spent: 0, share: 20 },
    ]);

    expect(chart.empty).toBe(false);
    expect(chart.total).toBe(80);
    expect(chart.members.map((member) => member.name)).toEqual(["אנדריי", "Саша", "Cohen family"]);
    expect(chart.members.map((member) => member.fraction)).toEqual([50 / 80, 30 / 80, 0]);
    expect(chart.members.map((member) => member.percent)).toEqual([63, 37, 0]);
    expect(chart.members.reduce((sum, member) => sum + member.percent, 0)).toBe(100);
    expect(chart.arcs.map((arc) => arc.id)).toEqual(["a", "b"]);
    expect(chart.arcs[0]).toMatchObject({ start: 0, full: false });
    expect(chart.arcs[1].end).toBe(1);
    expect(chart.arcs[0].d).toBe(donutPath(0, 50 / 80));
    expect(chart.barMax).toBe(50);
    expect(chart.members.map((member) => member.color)).toEqual([
      MEMBER_COLORS[0],
      MEMBER_COLORS[1],
      MEMBER_COLORS[2],
    ]);
  });

  it("draws one full ring when a single member paid the total", () => {
    const chart = spendingChart([
      { id: "a", name: "Maxim", spent: 18.5, share: 9.25 },
      { id: "b", name: "Sasha", spent: 0, share: 9.25 },
    ]);
    expect(chart.arcs).toEqual([
      { id: "a", color: MEMBER_COLORS[0], start: 0, end: 1, d: null, full: true },
    ]);
    expect(chart.members[0].percent).toBe(100);
    expect(chart.members[1].percent).toBe(0);
  });

  it("stays empty when the total is zero or amounts are unusable", () => {
    const chart = spendingChart([
      { id: "a", name: "אנדריי", spent: 0, share: 0 },
      { id: "b", name: "Саша", spent: Number.NaN, share: -5 },
    ]);
    expect(chart.empty).toBe(true);
    expect(chart.total).toBe(0);
    expect(chart.arcs).toEqual([]);
    expect(chart.barMax).toBe(0);
    expect(chart.members.map((member) => member.percent)).toEqual([0, 0]);
    expect(chart.members.map((member) => member.fraction)).toEqual([0, 0]);
    expect(spendingChart([]).empty).toBe(true);
  });

  it("gives a real payment under one percent its own label, and keeps colors stable", () => {
    const chart = spendingChart([
      { id: "big", name: "Hotel", spent: 100, share: 50 },
      { id: "tiny", name: "קפה", spent: 0.01, share: 50.01 },
    ]);
    expect(chart.members[1].percent).toBe(0);
    expect(percentLabel(chart.members[1].percent, chart.members[1].spent, "Under 1%")).toBe("Under 1%");
    expect(percentLabel(chart.members[0].percent, chart.members[0].spent, "Under 1%")).toBe("100%");
    expect(percentLabel(0, 0, "פחות מ־1%")).toBe("0%");
    expect(barFraction(0.01, chart.barMax)).toBeGreaterThan(0);
    expect(barFraction(0, chart.barMax)).toBe(0);
    expect(barFraction(10, 0)).toBe(0);
    expect(barFraction(80, 40)).toBe(1);

    expect(memberColor(0)).toBe(MEMBER_COLORS[0]);
    expect(memberColor(1)).not.toBe(memberColor(0));
    expect(memberColor(MEMBER_COLORS.length)).toBe(MEMBER_COLORS[0]);
    expect(memberColor(-1)).toBe(MEMBER_COLORS[MEMBER_COLORS.length - 1]);
  });

  it("draws a clockwise arc from the top, and a short gap between slices", () => {
    const half = donutPath(0, 0.5);
    expect(half).toMatch(/^M [0-9.]+ [0-9.]+ A 68 68 0 0 1 /);
    const start = half!.match(/^M ([0-9.]+) ([0-9.]+)/);
    expect(Number(start?.[1])).toBeGreaterThan(100);
    expect(Number(start?.[2])).toBeLessThan(40);
    expect(donutPath(0, 0.8)).toContain(" 0 1 1 ");
    expect(donutPath(0, 1)).toBeNull();
    expect(donutPath(0.2, 0.2)).toBeNull();
  });
});
