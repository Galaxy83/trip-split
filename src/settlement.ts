/**
 * Even split, then who pays whom.
 *
 * share = total / N
 * balance_i = spent_i - share
 * Payers (balance < 0) owe -balance. Receivers (balance > 0) are owed balance.
 * Proportional payment i → j = owes_i * recv_j / totalRecv, rounded to the cent.
 * The largest payment of each payer is then adjusted so that payer's transfers
 * sum to what they owe, exactly to the cent.
 *
 * Money is tracked in integer cents. Shares that are not a whole cent stay
 * exact rationals (numerator / N) until a payment is rounded.
 */

export interface SpendRow {
  id: string;
  name: string;
  spent: number;
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
  share: number;
  balances: BalanceRow[];
  transfers: Transfer[];
}

export type SettleMode = "proportional" | "minimize";

interface Person {
  id: string;
  name: string;
  spentCents: number;
  /** spent * N - total, in cents. Balance in cents is numer / N. */
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
    return { total: 0, playerCount: 0, share: 0, balances: [], transfers: [] };
  }

  const spentCents = rows.map((row) => toSpentCents(row.spent));
  const totalCents = spentCents.reduce((sum, cents) => sum + cents, 0);
  const people: Person[] = rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    spentCents: spentCents[index],
    numer: spentCents[index] * playerCount - totalCents,
  }));

  const share = totalCents / playerCount / 100;
  const balances: BalanceRow[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    spent: person.spentCents / 100,
    share,
    balance: person.numer / playerCount / 100,
  }));

  const transfers =
    totalCents === 0
      ? []
      : mode === "minimize"
        ? minimize(people, playerCount)
        : proportional(people, playerCount);

  return {
    total: totalCents / 100,
    playerCount,
    share,
    balances,
    transfers,
  };
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

function proportional(people: Person[], playerCount: number): Transfer[] {
  const receivers = people.filter((person) => person.numer > 0);
  const payers = people.filter((person) => person.numer < 0);
  const sumRecvNumer = receivers.reduce((sum, person) => sum + person.numer, 0);
  if (sumRecvNumer === 0 || payers.length === 0) return [];

  const denom = BigInt(playerCount) * BigInt(sumRecvNumer);
  const transfers: Transfer[] = [];

  for (const payer of payers) {
    const debtNumer = BigInt(-payer.numer);
    const owesCents = roundDiv(debtNumer, BigInt(playerCount));
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

function minimize(people: Person[], playerCount: number): Transfer[] {
  const debtors: Side[] = people
    .filter((person) => person.numer < 0)
    .map((person) => ({
      id: person.id,
      name: person.name,
      cents: roundDiv(BigInt(-person.numer), BigInt(playerCount)),
    }))
    .filter((side) => side.cents > 0);
  const creditors: Side[] = people
    .filter((person) => person.numer > 0)
    .map((person) => ({
      id: person.id,
      name: person.name,
      cents: roundDiv(BigInt(person.numer), BigInt(playerCount)),
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
