import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";
import { copyFor, ruCardinal, sentenceText } from "./strings";

describe("copy", () => {
  it("names the fair share per member in both languages", () => {
    expect(copyFor("en").fairShare).toBe("Fair share per member");
    expect(copyFor("he").fairShare).toBe("חלק הוגן לכל חבר");
    expect(copyFor("en").members).toBe("Members");
    expect(copyFor("he").members).toBe("חברים");
    expect(copyFor("he").addMember).toBe("הוספת חבר");
    expect(copyFor("he").memberFallback(2)).toBe("חבר 2");
    expect(copyFor("en").entryGroup).toBe("Family");
    expect(copyFor("he").entryMember).toBe("חבר");
    expect(copyFor("he").entryGroup).toBe("משפחה");
    expect(copyFor("ru").entryGroup).toBe("Семья");
    expect(copyFor("en").payingMembers).toBe("People sharing the cost");
    expect(copyFor("he").payingMembers).toBe("האנשים שמחלקים את העלות");
  });

  it("keeps the English settlement sentence and translates the Hebrew one", () => {
    const amount = formatMoney(1000.25, "₪");
    expect(sentenceText(copyFor("en").pays("Sasha", "Maxim", amount))).toBe(
      "Sasha pays Maxim ₪1,000.25",
    );
    expect(sentenceText(copyFor("he").pays("סשה", "מקסים", amount))).toBe(
      "סשה מעביר למקסים ₪1,000.25",
    );
    expect(sentenceText(copyFor("he").youPay("מקסים", amount))).toBe("עליך להעביר למקסים ₪1,000.25");
    expect(sentenceText(copyFor("he").youReceive("איגור", amount))).toBe("איגור מעביר לך ₪1,000.25");
    expect(sentenceText(copyFor("ru").pays("Саша", "Максим", amount))).toBe(
      "Саша платит Максим ₪1,000.25",
    );
    expect(sentenceText(copyFor("ru").youPay("Максим", amount))).toBe("Вы платите Максим ₪1,000.25");
    expect(sentenceText(copyFor("ru").youReceive("Игорь", amount))).toBe("Игорь платит вам ₪1,000.25");
    expect(copyFor("ru").memberFallback(1)).toBe("Участник 1");
    expect(copyFor("ru").memberFallback(2)).toBe("Участник 2");
    expect(copyFor("ru").keepTwo).toBe("Нужно оставить хотя бы двух участников");
    expect(copyFor("ru").payingMembers).toBe("Люди, которые делят стоимость");
    expect(copyFor("ru").langRussian).toBe("Русский");
    expect(copyFor("en").balanceCaption).toBe("Weight, spent, share, and balance for each entry");
    expect(copyFor("he").balanceCaption).toBe("משקל, כמה שולם, החלק, והיתרה");
    expect(copyFor("ru").balanceCaption).toBe("Вес, потраченная сумма, доля и баланс каждой записи");
    expect(copyFor("en").breakdown).toBe("Breakdown per member");
    expect(copyFor("he").breakdown).toBe("פירוט לפי חבר");
    expect(copyFor("ru").breakdown).toBe("Разбивка по участникам");
    expect(copyFor("en").chartPaid).toBe("Who paid");
    expect(copyFor("he").chartPaid).toBe("מי שילם");
    expect(copyFor("ru").chartPaid).toBe("Кто заплатил");
    expect(copyFor("en").chartEmpty).toBe("No spending yet.");
    expect(copyFor("he").chartCompare).toBe("שולם מול חלק הוגן");
    expect(copyFor("ru").chartUnderOne).toBe("Менее 1%");
    expect(copyFor("he").chartSummary("₪10.00")).toBe("מי שילם, סה״כ \u2066₪10.00\u2069");
  });

  it("uses Russian plural forms for counts", () => {
    const one = "участник";
    const few = "участника";
    const many = "участников";
    expect(ruCardinal(1, one, few, many)).toBe(one);
    expect(ruCardinal(21, one, few, many)).toBe(one);
    expect(ruCardinal(101, one, few, many)).toBe(one);
    expect(ruCardinal(2, one, few, many)).toBe(few);
    expect(ruCardinal(4, one, few, many)).toBe(few);
    expect(ruCardinal(22, one, few, many)).toBe(few);
    expect(ruCardinal(0, one, few, many)).toBe(many);
    expect(ruCardinal(5, one, few, many)).toBe(many);
    expect(ruCardinal(11, one, few, many)).toBe(many);
    expect(ruCardinal(12, one, few, many)).toBe(many);
    expect(ruCardinal(14, one, few, many)).toBe(many);
    expect(ruCardinal(25, one, few, many)).toBe(many);
    expect(ruCardinal(111, one, few, many)).toBe(many);
  });
});
