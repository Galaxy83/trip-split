/**
 * Two-ring spending chart.
 * The outer ring is what each member paid. The inner ring is that member's fair share.
 * Both start at 12 o'clock and run clockwise in member order, in the same color.
 * Colors follow member order and repeat after the palette ends.
 */

export const MEMBER_COLORS = [
  "#0f9d8a",
  "#e25b3a",
  "#d4920a",
  "#6d5ef5",
  "#2b7de9",
  "#d63a78",
  "#3d9a3a",
  "#ef7d1a",
  "#1593b8",
  "#9b4dca",
] as const;

export const PAID_RING = { radius: 82, width: 16 } as const;
export const SHARE_RING = { radius: 64, width: 10 } as const;

const CX = 100;
const CY = 100;

export interface ChartInput {
  id: string;
  name: string;
  spent: number;
  share: number;
  /** Table balance, when the caller already has it. Otherwise spent − share. */
  balance?: number;
}

export interface ChartMember {
  id: string;
  name: string;
  spent: number;
  share: number;
  /** spent − share. Positive means this member paid more than their fair share. */
  difference: number;
  color: string;
  spentFraction: number;
  shareFraction: number;
  /** Whole percents. Each list sums to 100 when its total is positive. */
  spentPercent: number;
  sharePercent: number;
}

export interface DonutArc {
  id: string;
  color: string;
  ring: "paid" | "share";
  radius: number;
  width: number;
  /** Turns clockwise from 12 o'clock, before the visual gap. */
  start: number;
  end: number;
  /** Partial ring. Null when this slice is the whole ring. */
  d: string | null;
  full: boolean;
}

export interface SpendingChart {
  total: number;
  /** Sum of fair shares. The inner ring closes on this, which matches the total when the split is exact. */
  shareTotal: number;
  empty: boolean;
  members: ChartMember[];
  arcs: DonutArc[];
}

export function memberColor(index: number): string {
  const count = MEMBER_COLORS.length;
  const wrapped = ((Math.trunc(index) % count) + count) % count;
  return MEMBER_COLORS[wrapped];
}

export function spendingChart(rows: readonly ChartInput[]): SpendingChart {
  const cleaned = rows.map((row) => {
    const spent = clampMoney(row.spent);
    const share = clampMoney(row.share);
    const difference =
      typeof row.balance === "number" && Number.isFinite(row.balance) ? row.balance : spent - share;
    return { id: row.id, name: row.name, spent, share, difference };
  });
  const total = cleaned.reduce((sum, row) => sum + row.spent, 0);
  const shareTotal = cleaned.reduce((sum, row) => sum + row.share, 0);
  const spentPercents = wholePercents(
    cleaned.map((row) => row.spent),
    total,
  );
  const sharePercents = wholePercents(
    cleaned.map((row) => row.share),
    shareTotal,
  );
  const members: ChartMember[] = cleaned.map((row, index) => ({
    ...row,
    color: memberColor(index),
    spentFraction: total > 0 ? row.spent / total : 0,
    shareFraction: shareTotal > 0 ? row.share / shareTotal : 0,
    spentPercent: spentPercents[index] ?? 0,
    sharePercent: sharePercents[index] ?? 0,
  }));
  return {
    total,
    shareTotal,
    empty: total <= 0 && shareTotal <= 0,
    members,
    arcs: [
      ...ringArcs(members, "paid", PAID_RING.radius, PAID_RING.width, total, (member) => member.spent),
      ...ringArcs(members, "share", SHARE_RING.radius, SHARE_RING.width, shareTotal, (member) => member.share),
    ],
  };
}

/** "40%", or the under-one phrase when a real amount rounds to 0%. */
export function percentLabel(percent: number, amount: number, underOne: string): string {
  if (amount > 0 && percent <= 0) return underOne;
  return `${percent}%`;
}

/**
 * Ring path clockwise from `start` to `end` (turns, 0 at 12 o'clock).
 * A full circle returns null so the caller can draw a circle instead.
 */
export function donutPath(start: number, end: number, radius: number): string | null {
  const span = end - start;
  if (!(span > 0) || !(radius > 0)) return null;
  if (span >= 0.999) return null;
  const inset = span > 0.02 ? Math.min(0.004, span * 0.12) : 0;
  const a0 = start + inset;
  const a1 = end - inset;
  const [x0, y0] = point(a0, radius);
  const [x1, y1] = point(a1, radius);
  const large = a1 - a0 > 0.5 ? 1 : 0;
  return `M ${fmt(x0)} ${fmt(y0)} A ${fmt(radius)} ${fmt(radius)} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}`;
}

function ringArcs(
  members: readonly ChartMember[],
  ring: DonutArc["ring"],
  radius: number,
  width: number,
  total: number,
  valueOf: (member: ChartMember) => number,
): DonutArc[] {
  if (!(total > 0)) return [];
  const positive = members.filter((member) => valueOf(member) > 0);
  if (positive.length === 1) {
    const only = positive[0];
    return [{ id: only.id, color: only.color, ring, radius, width, start: 0, end: 1, d: null, full: true }];
  }
  const arcs: DonutArc[] = [];
  let cursor = 0;
  for (let index = 0; index < positive.length; index++) {
    const member = positive[index];
    const end = index === positive.length - 1 ? 1 : cursor + valueOf(member) / total;
    arcs.push({
      id: member.id,
      color: member.color,
      ring,
      radius,
      width,
      start: cursor,
      end,
      d: donutPath(cursor, end, radius),
      full: false,
    });
    cursor = end;
  }
  return arcs;
}

function wholePercents(amounts: readonly number[], total: number): number[] {
  if (!(total > 0)) return amounts.map(() => 0);
  const exact = amounts.map((value) => (value / total) * 100);
  const floors = exact.map((value) => Math.floor(value + 1e-9));
  let leftover = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value + 1e-9) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  const result = floors.slice();
  for (let index = 0; index < order.length && leftover > 0; index++) {
    result[order[index].index] += 1;
    leftover -= 1;
  }
  return result;
}

function clampMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

function point(turn: number, radius: number): [number, number] {
  const angle = turn * Math.PI * 2 - Math.PI / 2;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function fmt(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
