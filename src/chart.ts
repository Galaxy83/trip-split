/**
 * Spending chart data. The donut is each member's share of what was paid.
 * Colors follow member order and repeat after the palette ends.
 * Fair share is only used for the comparison bars.
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

const CX = 100;
const CY = 100;
const DONUT_R = 68;

export interface ChartInput {
  id: string;
  name: string;
  spent: number;
  share: number;
}

export interface ChartMember {
  id: string;
  name: string;
  spent: number;
  share: number;
  color: string;
  /** Share of total spending. Zero when nothing was spent. */
  fraction: number;
  /** Whole percent. Sums to 100 when the total is positive. */
  percent: number;
}

export interface DonutArc {
  id: string;
  color: string;
  /** Turns clockwise from 12 o'clock, before the visual gap. */
  start: number;
  end: number;
  /** Partial ring. Null when this member paid the whole total. */
  d: string | null;
  full: boolean;
}

export interface SpendingChart {
  total: number;
  empty: boolean;
  members: ChartMember[];
  arcs: DonutArc[];
  /** Largest spent or fair-share value. Zero when every bar is empty. */
  barMax: number;
}

export function memberColor(index: number): string {
  const count = MEMBER_COLORS.length;
  const wrapped = ((Math.trunc(index) % count) + count) % count;
  return MEMBER_COLORS[wrapped];
}

export function spendingChart(rows: readonly ChartInput[]): SpendingChart {
  const cleaned = rows.map((row) => ({
    id: row.id,
    name: row.name,
    spent: clampMoney(row.spent),
    share: clampMoney(row.share),
  }));
  const total = cleaned.reduce((sum, row) => sum + row.spent, 0);
  const percents = wholePercents(
    cleaned.map((row) => row.spent),
    total,
  );
  const members: ChartMember[] = cleaned.map((row, index) => ({
    ...row,
    color: memberColor(index),
    fraction: total > 0 ? row.spent / total : 0,
    percent: percents[index] ?? 0,
  }));
  const barMax = members.reduce((max, row) => Math.max(max, row.spent, row.share), 0);
  return {
    total,
    empty: total <= 0,
    members,
    arcs: donutArcs(members, total),
    barMax,
  };
}

/** Width of a comparison bar, from 0 to 1. */
export function barFraction(value: number, barMax: number): number {
  if (!(barMax > 0)) return 0;
  const fraction = clampMoney(value) / barMax;
  if (fraction >= 1) return 1;
  return fraction;
}

/** "40%", or the under-one phrase when a real payment rounds to 0%. */
export function percentLabel(percent: number, spent: number, underOne: string): string {
  if (spent > 0 && percent <= 0) return underOne;
  return `${percent}%`;
}

/**
 * Ring path clockwise from `start` to `end` (turns, 0 at 12 o'clock).
 * A full circle returns null so the caller can draw a circle instead.
 */
export function donutPath(start: number, end: number): string | null {
  const span = end - start;
  if (!(span > 0)) return null;
  if (span >= 0.999) return null;
  const inset = span > 0.02 ? Math.min(0.004, span * 0.12) : 0;
  const a0 = start + inset;
  const a1 = end - inset;
  const [x0, y0] = point(a0);
  const [x1, y1] = point(a1);
  const large = a1 - a0 > 0.5 ? 1 : 0;
  return `M ${fmt(x0)} ${fmt(y0)} A ${DONUT_R} ${DONUT_R} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}`;
}

function donutArcs(members: readonly ChartMember[], total: number): DonutArc[] {
  if (!(total > 0)) return [];
  const positive = members.filter((member) => member.spent > 0);
  if (positive.length === 1) {
    const only = positive[0];
    return [{ id: only.id, color: only.color, start: 0, end: 1, d: null, full: true }];
  }
  const arcs: DonutArc[] = [];
  let cursor = 0;
  for (let index = 0; index < positive.length; index++) {
    const member = positive[index];
    const end = index === positive.length - 1 ? 1 : cursor + member.spent / total;
    arcs.push({
      id: member.id,
      color: member.color,
      start: cursor,
      end,
      d: donutPath(cursor, end),
      full: false,
    });
    cursor = end;
  }
  return arcs;
}

function wholePercents(spent: readonly number[], total: number): number[] {
  if (!(total > 0)) return spent.map(() => 0);
  const exact = spent.map((value) => (value / total) * 100);
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

function point(turn: number): [number, number] {
  const angle = turn * Math.PI * 2 - Math.PI / 2;
  return [CX + DONUT_R * Math.cos(angle), CY + DONUT_R * Math.sin(angle)];
}

function fmt(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
