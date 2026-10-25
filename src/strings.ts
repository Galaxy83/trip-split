/**
 * All user-visible copy lives here, in English and Hebrew.
 * Sentence parts keep word order in data so each language can arrange names
 * and amounts naturally.
 */

import type { Lang } from "./preferences";

export type SentencePart =
  | { type: "text"; text: string }
  | { type: "name"; text: string };

export function sentenceText(parts: readonly SentencePart[]): string {
  return parts.map((part) => part.text).join("");
}

export interface Copy {
  pageTitle: string;
  tagline: string;
  kicker: string;
  members: string;
  memberName: string;
  memberPlaceholder: string;
  addMember: string;
  remove: string;
  removeMemberNamed: (name: string) => string;
  keepTwo: string;
  expenses: string;
  description: string;
  paidBy: string;
  amount: string;
  expensePlaceholder: string;
  amountPlaceholder: string;
  addExpense: string;
  deleteExpense: string;
  deleteExpenseNamed: (description: string) => string;
  summary: string;
  totalSpent: string;
  fairShare: string;
  each: string;
  entryType: string;
  entryMember: string;
  entryGroup: string;
  weight: string;
  payingMembers: string;
  entryShare: string;
  memberColumn: string;
  spent: string;
  balance: string;
  balanceCaption: string;
  settlement: string;
  minimize: string;
  proportionalHint: string;
  minimizeHint: string;
  allSettled: string;
  oneMember: string;
  showFor: string;
  nothingForMember: string;
  balanceLine: (spent: string, share: string, balance: string) => string;
  share: string;
  linkCopied: string;
  copyFailed: string;
  copySettlement: string;
  settlementCopied: string;
  exportCsv: string;
  reset: string;
  resetAction: string;
  confirmReset: string;
  confirmRemove: (name: string) => string;
  cancel: string;
  negativeAmount: string;
  invalidAmount: string;
  currency: string;
  memberFallback: (n: number) => string;
  footer: string;
  csvExpenseHeader: string;
  csvBalanceHeader: string;
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  language: string;
  langEnglish: string;
  langHebrew: string;
  pays: (from: string, to: string, amount: string) => SentencePart[];
  youPay: (to: string, amount: string) => SentencePart[];
  youReceive: (from: string, amount: string) => SentencePart[];
}

const english: Copy = {
  pageTitle: "Who owes whom",
  tagline: "Split a group trip by head count.",
  kicker: "Group trip",
  members: "Members",
  memberName: "Name",
  memberPlaceholder: "Name",
  addMember: "Add member",
  remove: "Remove",
  removeMemberNamed: (name) => `Remove ${name}`,
  keepTwo: "Keep at least two members",
  expenses: "Expenses",
  description: "Description",
  paidBy: "Paid by",
  amount: "Amount",
  expensePlaceholder: "Dinner, taxi…",
  amountPlaceholder: "0.00",
  addExpense: "Add expense",
  deleteExpense: "Delete",
  deleteExpenseNamed: (description) =>
    description.trim() ? `Delete ${description.trim()}` : "Delete expense",
  summary: "Summary",
  totalSpent: "Total spent",
  fairShare: "Fair share per member",
  each: "each",
  entryType: "Type",
  entryMember: "Member",
  entryGroup: "Family/Group",
  weight: "Weight",
  payingMembers: "Paying members",
  entryShare: "Share",
  memberColumn: "Member",
  spent: "Spent",
  balance: "Balance",
  balanceCaption: "Type, weight, spent, share, and balance for each entry",
  settlement: "Who pays whom",
  minimize: "Minimize number of payments",
  proportionalHint: "Each payer splits what they owe in proportion to what each person is owed.",
  minimizeHint: "Match the largest debt to the largest credit, so there are fewer transfers.",
  allSettled: "Everyone is even. No payments.",
  oneMember: "One member",
  showFor: "Show for",
  nothingForMember: "Nothing to pay or receive.",
  balanceLine: (spent, share, balance) => `Spent ${spent} · Share ${share} · Balance ${balance}`,
  share: "Share",
  linkCopied: "Link copied",
  copyFailed: "Could not copy. Select the address and copy it.",
  copySettlement: "Copy for WhatsApp",
  settlementCopied: "Settlement copied",
  exportCsv: "Export CSV",
  reset: "Reset trip",
  resetAction: "Reset",
  confirmReset: "Reset this trip on this device? This cannot be undone.",
  confirmRemove: (name) => `Remove ${name}? Expenses they paid will be deleted.`,
  cancel: "Cancel",
  negativeAmount: "Amount can't be negative.",
  invalidAmount: "Enter a number, or leave the row blank.",
  currency: "Currency",
  memberFallback: (n) => `Member ${n}`,
  footer: "Saved on this device. A share link opens this trip in this language.",
  csvExpenseHeader: "Description,Paid by,Amount",
  csvBalanceHeader: "Member,Type,Weight,Spent,Share,Balance",
  theme: "Theme",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  language: "Language",
  langEnglish: "English",
  langHebrew: "עברית",
  pays: (from, to, amount) => [
    { type: "name", text: from },
    { type: "text", text: " pays " },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youPay: (to, amount) => [
    { type: "text", text: "You pay " },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youReceive: (from, amount) => [
    { type: "name", text: from },
    { type: "text", text: ` pays you ${amount}` },
  ],
};

const hebrew: Copy = {
  pageTitle: "מי חייב למי",
  tagline: "מחלקים טיול לפי מספר המשלמים.",
  kicker: "טיול משותף",
  members: "חברים",
  memberName: "שם",
  memberPlaceholder: "שם",
  addMember: "הוספת חבר",
  remove: "הסרה",
  removeMemberNamed: (name) => `הסרת ${name}`,
  keepTwo: "חייבים להישאר לפחות שני חברים",
  expenses: "הוצאות",
  description: "תיאור",
  paidBy: "מי שילם",
  amount: "סכום",
  expensePlaceholder: "ארוחה, מונית…",
  amountPlaceholder: "0.00",
  addExpense: "הוספת הוצאה",
  deleteExpense: "מחיקה",
  deleteExpenseNamed: (description) =>
    description.trim() ? `מחיקת ${description.trim()}` : "מחיקת הוצאה",
  summary: "סיכום",
  totalSpent: "סה״כ הוצאות",
  fairShare: "חלק הוגן לכל חבר",
  each: "לאדם",
  entryType: "סוג",
  entryMember: "חבר",
  entryGroup: "משפחה/קבוצה",
  weight: "משקל",
  payingMembers: "מספר משלמים",
  entryShare: "חלק",
  memberColumn: "חבר",
  spent: "שילם",
  balance: "יתרה",
  balanceCaption: "סוג, משקל, כמה שולם, החלק, והיתרה",
  settlement: "מי משלם למי",
  minimize: "צמצום מספר ההעברות",
  proportionalHint: "כל מי שחייב מחלק את הסכום לפי מה שמגיע לכל אחד.",
  minimizeHint: "החוב הגדול ביותר מותאם לזכות הגדולה ביותר, כדי שיהיו פחות העברות.",
  allSettled: "הכול מאוזן. אין תשלומים.",
  oneMember: "חבר אחד",
  showFor: "הצגה עבור",
  nothingForMember: "אין מה לשלם או לקבל.",
  balanceLine: (spent, share, balance) => `שילם ${spent} · חלק ${share} · יתרה ${balance}`,
  share: "שיתוף",
  linkCopied: "הקישור הועתק",
  copyFailed: "ההעתקה לא הצליחה. סמנו את הכתובת והעתיקו.",
  copySettlement: "העתקה לוואטסאפ",
  settlementCopied: "ההתחשבנות הועתקה",
  exportCsv: "ייצוא CSV",
  reset: "איפוס הטיול",
  resetAction: "איפוס",
  confirmReset: "לאפס את הטיול במכשיר הזה? אי אפשר לבטל את זה.",
  confirmRemove: (name) => `להסיר את ${name}? ההוצאות ששילם יימחקו.`,
  cancel: "ביטול",
  negativeAmount: "אי אפשר להזין סכום שלילי.",
  invalidAmount: "הזינו מספר, או השאירו את השורה ריקה.",
  currency: "מטבע",
  memberFallback: (n) => `חבר ${n}`,
  footer: "הטיול נשמר במכשיר הזה. קישור שיתוף פותח את הטיול בשפה הזאת.",
  csvExpenseHeader: "תיאור,מי שילם,סכום",
  csvBalanceHeader: "חבר,סוג,משקל,שילם,חלק,יתרה",
  theme: "ערכת נושא",
  themeSystem: "מערכת",
  themeLight: "בהיר",
  themeDark: "כהה",
  language: "שפה",
  langEnglish: "English",
  langHebrew: "עברית",
  pays: (from, to, amount) => [
    { type: "name", text: from },
    { type: "text", text: " מעביר ל" },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youPay: (to, amount) => [
    { type: "text", text: "עליך להעביר ל" },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youReceive: (from, amount) => [
    { type: "name", text: from },
    { type: "text", text: ` מעביר לך ${amount}` },
  ],
};

const catalogs: Record<Lang, Copy> = { en: english, he: hebrew };

export function copyFor(lang: Lang): Copy {
  return catalogs[lang];
}
