/**
 * All user-visible English copy lives in this module.
 * To translate the app later, replace these strings (or key them by locale)
 * without searching the UI. Word order for sentences is data, so a translation
 * can reorder names and amounts.
 */

export type SentencePart =
  | { type: "text"; text: string }
  | { type: "name"; text: string };

export function sentenceText(parts: readonly SentencePart[]): string {
  return parts.map((part) => part.text).join("");
}

export const copy = {
  pageTitle: "Who owes whom",
  tagline: "Split a group trip evenly.",
  kicker: "Group trip",
  members: "Members",
  memberName: "Name",
  memberPlaceholder: "Name",
  addMember: "Add member",
  remove: "Remove",
  removeMemberNamed: (name: string) => `Remove ${name}`,
  keepTwo: "Keep at least two members",
  expenses: "Expenses",
  description: "Description",
  paidBy: "Paid by",
  amount: "Amount",
  expensePlaceholder: "Dinner, taxi…",
  amountPlaceholder: "0.00",
  addExpense: "Add expense",
  deleteExpense: "Delete",
  deleteExpenseNamed: (description: string) =>
    description.trim() ? `Delete ${description.trim()}` : "Delete expense",
  summary: "Summary",
  totalSpent: "Total spent",
  fairShare: "Fair share",
  each: "each",
  memberColumn: "Member",
  spent: "Spent",
  balance: "Balance",
  balanceCaption: "Spent, fair share, and balance for each member",
  settlement: "Who pays whom",
  minimize: "Minimize number of payments",
  proportionalHint: "Each payer splits what they owe in proportion to what each person is owed.",
  minimizeHint: "Match the largest debt to the largest credit, so there are fewer transfers.",
  allSettled: "Everyone is even. No payments.",
  oneMember: "One member",
  showFor: "Show for",
  nothingForMember: "Nothing to pay or receive.",
  balanceLine: (spent: string, share: string, balance: string) =>
    `Spent ${spent} · Fair share ${share} · Balance ${balance}`,
  share: "Share",
  linkCopied: "Link copied",
  copyFailed: "Could not copy. Select the address and copy it.",
  copySettlement: "Copy for WhatsApp",
  settlementCopied: "Settlement copied",
  exportCsv: "Export CSV",
  reset: "Reset trip",
  resetAction: "Reset",
  confirmReset: "Reset this trip on this device? This cannot be undone.",
  confirmRemove: (name: string) => `Remove ${name}? Expenses they paid will be deleted.`,
  cancel: "Cancel",
  negativeAmount: "Amount can't be negative.",
  invalidAmount: "Enter a number, or leave the row blank.",
  currency: "Currency",
  memberFallback: (n: number) => `Member ${n}`,
  footer: "Saved on this device. Share a link to open the same trip elsewhere.",
  csvExpenseHeader: "Description,Paid by,Amount",
  csvBalanceHeader: "Member,Spent,Fair share,Balance",
  pays: (from: string, to: string, amount: string): SentencePart[] => [
    { type: "name", text: from },
    { type: "text", text: " pays " },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youPay: (to: string, amount: string): SentencePart[] => [
    { type: "text", text: "You pay " },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youReceive: (from: string, amount: string): SentencePart[] => [
    { type: "name", text: from },
    { type: "text", text: ` pays you ${amount}` },
  ],
};
