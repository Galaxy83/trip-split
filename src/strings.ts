/**
 * All user-visible copy lives here, in English, Hebrew, and Russian.
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

/**
 * Russian cardinal form.
 * one: 1, 21, 31… except 11
 * few: 2–4, 22–24… except 12–14
 * many: 0, 5–20, 11–14, 25–30…
 */
export function ruCardinal(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
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
  breakdown: string;
  chartPaid: string;
  chartEmpty: string;
  chartCompare: string;
  chartRings: string;
  chartDifference: string;
  chartUnderOne: string;
  chartSummary: (total: string) => string;
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
  langRussian: string;
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
  entryGroup: "Family",
  weight: "Weight",
  payingMembers: "People sharing the cost",
  entryShare: "Share",
  memberColumn: "Member",
  spent: "Spent",
  balance: "Balance",
  balanceCaption: "Weight, spent, share, and balance for each entry",
  settlement: "Who pays whom",
  minimize: "Minimize number of payments",
  proportionalHint: "Each payer splits what they owe in proportion to what each person is owed.",
  minimizeHint: "Match the largest debt to the largest credit, so there are fewer transfers.",
  allSettled: "Everyone is even. No payments.",
  breakdown: "Breakdown per member",
  chartPaid: "Who paid",
  chartEmpty: "No spending yet.",
  chartCompare: "Paid and fair share",
  chartRings: "Outer ring is what they paid. Inner ring is the fair share.",
  chartDifference: "Difference",
  chartUnderOne: "Under 1%",
  chartSummary: (total) => `Paid and fair share, ${total} in total`,
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
  langRussian: "Русский",
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
  entryGroup: "משפחה",
  weight: "משקל",
  payingMembers: "האנשים שמחלקים את העלות",
  entryShare: "חלק",
  memberColumn: "חבר",
  spent: "שילם",
  balance: "יתרה",
  balanceCaption: "משקל, כמה שולם, החלק, והיתרה",
  settlement: "מי משלם למי",
  minimize: "צמצום מספר ההעברות",
  proportionalHint: "כל מי שחייב מחלק את הסכום לפי מה שמגיע לכל אחד.",
  minimizeHint: "החוב הגדול ביותר מותאם לזכות הגדולה ביותר, כדי שיהיו פחות העברות.",
  allSettled: "הכול מאוזן. אין תשלומים.",
  breakdown: "פירוט לפי חבר",
  chartPaid: "מי שילם",
  chartEmpty: "עדיין אין הוצאות.",
  chartCompare: "שולם מול חלק הוגן",
  chartRings: "הטבעת החיצונית היא מה ששולם. הטבעת הפנימית היא החלק ההוגן.",
  chartDifference: "הפרש",
  chartUnderOne: "פחות מ־1%",
  chartSummary: (total) => `שולם מול חלק הוגן, סה״כ \u2066${total}\u2069`,
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
  langRussian: "Русский",
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

const russian: Copy = {
  pageTitle: "Кто кому должен",
  tagline: "Делим расходы поездки по числу людей.",
  kicker: "Общая поездка",
  members: "Участники",
  memberName: "Имя",
  memberPlaceholder: "Имя",
  addMember: "Добавить участника",
  remove: "Удалить",
  removeMemberNamed: (name) => `Удалить ${name}`,
  keepTwo: "Нужно оставить хотя бы двух участников",
  expenses: "Расходы",
  description: "Описание",
  paidBy: "Кто заплатил",
  amount: "Сумма",
  expensePlaceholder: "Ужин, такси…",
  amountPlaceholder: "0.00",
  addExpense: "Добавить расход",
  deleteExpense: "Удалить",
  deleteExpenseNamed: (description) =>
    description.trim() ? `Удалить ${description.trim()}` : "Удалить расход",
  summary: "Итог",
  totalSpent: "Всего потрачено",
  fairShare: "Справедливая доля на человека",
  each: "на человека",
  entryType: "Тип",
  entryMember: "Участник",
  entryGroup: "Семья",
  weight: "Вес",
  payingMembers: "Люди, которые делят стоимость",
  entryShare: "Доля",
  memberColumn: "Участник",
  spent: "Потрачено",
  balance: "Баланс",
  balanceCaption: "Вес, потраченная сумма, доля и баланс каждой записи",
  settlement: "Кто кому платит",
  minimize: "Сократить число переводов",
  proportionalHint: "Каждый должник делит долг пропорционально тому, сколько причитается остальным.",
  minimizeHint: "Самый большой долг гасится самым большим остатком, чтобы переводов было меньше.",
  allSettled: "Никто никому не должен. Платежей нет.",
  breakdown: "Разбивка по участникам",
  chartPaid: "Кто заплатил",
  chartEmpty: "Пока нет расходов.",
  chartCompare: "Оплачено и справедливая доля",
  chartRings: "Внешнее кольцо — сколько оплачено. Внутреннее кольцо — справедливая доля.",
  chartDifference: "Разница",
  chartUnderOne: "Менее 1%",
  chartSummary: (total) => `Оплачено и справедливая доля, всего ${total}`,
  showFor: "Показать для",
  nothingForMember: "Нечего платить или получать.",
  balanceLine: (spent, share, balance) => `Потрачено ${spent} · Доля ${share} · Баланс ${balance}`,
  share: "Поделиться",
  linkCopied: "Ссылка скопирована",
  copyFailed: "Не получилось скопировать. Выделите адрес и скопируйте его.",
  copySettlement: "Копировать в WhatsApp",
  settlementCopied: "Расчёт скопирован",
  exportCsv: "Экспорт CSV",
  reset: "Сбросить поездку",
  resetAction: "Сбросить",
  confirmReset: "Сбросить поездку на этом устройстве? Это нельзя отменить.",
  confirmRemove: (name) => `Удалить ${name}? Расходы этой записи будут удалены.`,
  cancel: "Отмена",
  negativeAmount: "Сумма не может быть отрицательной.",
  invalidAmount: "Введите число или оставьте поле пустым.",
  currency: "Валюта",
  memberFallback: (n) => `${ruCardinal(1, "Участник", "Участника", "Участников")} ${n}`,
  footer: "Поездка сохранена на этом устройстве. Ссылка откроет её на этом языке.",
  csvExpenseHeader: "Описание,Кто заплатил,Сумма",
  csvBalanceHeader: "Участник,Тип,Вес,Потрачено,Доля,Баланс",
  theme: "Тема",
  themeSystem: "Система",
  themeLight: "Светлая",
  themeDark: "Тёмная",
  language: "Язык",
  langEnglish: "English",
  langHebrew: "עברית",
  langRussian: "Русский",
  pays: (from, to, amount) => [
    { type: "name", text: from },
    { type: "text", text: " платит " },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youPay: (to, amount) => [
    { type: "text", text: "Вы платите " },
    { type: "name", text: to },
    { type: "text", text: ` ${amount}` },
  ],
  youReceive: (from, amount) => [
    { type: "name", text: from },
    { type: "text", text: ` платит вам ${amount}` },
  ],
};

const catalogs: Record<Lang, Copy> = { en: english, he: hebrew, ru: russian };

export function copyFor(lang: Lang): Copy {
  return catalogs[lang];
}
