/**
 * Weighted split, then who pays whom.
 *
 * A member has weight 1. A family or group has weight equal to its paying members.
 * totalWeight = sum of weights
 * fair share per member = total / totalWeight
 * share_i = total * weight_i / totalWeight
 * balance_i = spent_i - share_i
 *
 * Payers (balance < 0) owe -balance. Receivers (balance > 0) are owed balance.
 * Proportional payment i → j = owes_i * recv_j / totalRecv, rounded to the cent.
 * The largest payment of each payer is then adjusted so that payer's transfers
 * sum to what they owe, exactly to the cent. A family is one payer or receiver.
 *
 * Money is tracked in integer cents. Shares that are not a whole cent stay
 * exact rationals (numerator / totalWeight) until a payment is rounded.
 * Balances sum to zero before that rounding.
 */

export interface SpendRow {
  id: string;
  name: string;
  spent: number;
  /** Paying members represented by this entry. Omitted means 1. */
  weight?: number;
}

export interface BalanceRow {
  id: string;
  name: string;
  spent: number;
  share: number;
  balance: number;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface Settlement {
  total: number;
  playerCount: number;
  /** Fair share of one paying member: total / totalWeight. */
  share: number;
  totalWeight: number;
  balances: BalanceRow[];
  transfers: Transfer[];
}

export type SettleMode = "proportional" | "minimize";

interface Person {
  id: string;
  name: string;
  spentCents: number;
  weight: number;
  /** spent * totalWeight - total * weight, in cents. Balance in cents is numer / totalWeight. */
  numer: number;
}

interface Side {
  id: string;
  name: string;
  cents: number;
}

export function settle(rows: SpendRow[], mode: SettleMode = "proportional"): Settlement {
  const playerCount = rows.length;
  if (playerCount === 0) {
    return { total: 0, playerCount: 0, share: 0, totalWeight: 0, balances: [], transfers: [] };
  }

  const spentCents = rows.map((row) => toSpentCents(row.spent));
  const weights = rows.map((row) => weightOf(row));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const totalCents = spentCents.reduce((sum, cents) => sum + cents, 0);
  const people: Person[] = rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    spentCents: spentCents[index],
    weight: weights[index],
    numer: spentCents[index] * totalWeight - totalCents * weights[index],
  }));

  const share = totalCents / totalWeight / 100;
  const balances: BalanceRow[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    spent: person.spentCents / 100,
    share: (totalCents * person.weight) / totalWeight / 100,
    balance: person.numer / totalWeight / 100,
  }));

  const transfers =
    totalCents === 0
      ? []
      : mode === "minimize"
        ? minimize(people, totalWeight)
        : proportional(people, totalWeight);

  return {
    total: totalCents / 100,
    playerCount,
    share,
    totalWeight,
    balances,
    transfers,
  };
}

function weightOf(row: SpendRow): number {
  const weight = row.weight;
  if (weight == null || !Number.isFinite(weight)) return 1;
  const rounded = Math.round(weight);
  return rounded < 1 ? 1 : rounded;
}

function toSpentCents(spent: number): number {
  if (!Number.isFinite(spent) || spent <= 0) return 0;
  return Math.round(spent * 100 + 1e-6);
}

/** Round half away from zero for a non-negative rational numer/denom. */
function roundDiv(numer: bigint, denom: bigint): number {
  if (denom <= 0n || numer <= 0n) return 0;
  const quotient = numer / denom;
  const remainder = numer % denom;
  const rounded = remainder * 2n >= denom ? quotient + 1n : quotient;
  return Number(rounded);
}

function proportional(people: Person[], totalWeight: number): Transfer[] {
  const receivers = people.filter((person) => person.numer > 0);
  const payers = people.filter((person) => person.numer < 0);
  const sumRecvNumer = receivers.reduce((sum, person) => sum + person.numer, 0);
  if (sumRecvNumer === 0 || payers.length === 0) return [];

  const denom = BigInt(totalWeight) * BigInt(sumRecvNumer);
  const transfers: Transfer[] = [];

  for (const payer of payers) {
    const debtNumer = BigInt(-payer.numer);
    const owesCents = roundDiv(debtNumer, BigInt(totalWeight));
    if (owesCents <= 0) continue;

    const parts = receivers.map((receiver, index) => ({
      index,
      receiver,
      cents: roundDiv(debtNumer * BigInt(receiver.numer), denom),
    }));
    const paid = parts.reduce((sum, part) => sum + part.cents, 0);
    applyDrift(parts, owesCents - paid);

    for (const part of parts) {
      if (part.cents <= 0) continue;
      transfers.push({
        fromId: payer.id,
        fromName: payer.name,
        toId: part.receiver.id,
        toName: part.receiver.name,
        amount: part.cents / 100,
      });
    }
  }

  return transfers;
}

/**
 * Put the rounding drift on the largest payment. If that payment is too small
 * to absorb a negative drift, walk down so no transfer goes negative.
 */
function applyDrift(parts: { index: number; cents: number }[], drift: number): void {
  if (drift === 0 || parts.length === 0) return;
  const order = [...parts].sort((a, b) => b.cents - a.cents || a.index - b.index);
  if (drift > 0) {
    order[0].cents += drift;
    return;
  }
  let left = -drift;
  for (const part of order) {
    const take = Math.min(part.cents, left);
    part.cents -= take;
    left -= take;
    if (left === 0) return;
  }
}

function minimize(people: Person[], totalWeight: number): Transfer[] {
  const debtors: Side[] = people
    .filter((person) => person.numer < 0)
    .map((person) => ({
      id: person.id,
      name: person.name,
      cents: roundDiv(BigInt(-person.numer), BigInt(totalWeight)),
    }))
    .filter((side) => side.cents > 0);
  const creditors: Side[] = people
    .filter((person) => person.numer > 0)
    .map((person) => ({
      id: person.id,
      name: person.name,
      cents: roundDiv(BigInt(person.numer), BigInt(totalWeight)),
    }))
    .filter((side) => side.cents > 0);

  const oweSum = debtors.reduce((sum, side) => sum + side.cents, 0);
  const recvSum = creditors.reduce((sum, side) => sum + side.cents, 0);
  const diff = oweSum - recvSum;
  if (diff !== 0 && debtors.length > 0 && creditors.length > 0) {
    const side = diff > 0 ? largest(creditors) : largest(debtors);
    side.cents += Math.abs(diff);
  }

  const transfers: Transfer[] = [];
  let openDebtors = debtors;
  let openCreditors = creditors;
  while (openDebtors.length > 0 && openCreditors.length > 0) {
    openDebtors = largestFirst(openDebtors);
    openCreditors = largestFirst(openCreditors);
    if (openDebtors.length === 0 || openCreditors.length === 0) break;
    const debtor = openDebtors[0];
    const creditor = openCreditors[0];
    const cents = Math.min(debtor.cents, creditor.cents);
    if (cents > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: cents / 100,
      });
    }
    debtor.cents -= cents;
    creditor.cents -= cents;
  }
  return transfers;
}

function largest(sides: Side[]): Side {
  return largestFirst(sides)[0];
}

function largestFirst(sides: Side[]): Side[] {
  return sides
    .filter((side) => side.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
