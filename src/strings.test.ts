import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";
import { copyFor, sentenceText } from "./strings";

describe("copy", () => {
  it("names the fair share per member in both languages", () => {
    expect(copyFor("en").fairShare).toBe("Fair share per member");
    expect(copyFor("he").fairShare).toBe("חלק הוגן לכל חבר");
    expect(copyFor("en").members).toBe("Members");
    expect(copyFor("he").members).toBe("חברים");
    expect(copyFor("he").addMember).toBe("הוספת חבר");
    expect(copyFor("he").memberFallback(2)).toBe("חבר 2");
    expect(copyFor("en").entryGroup).toBe("Family/Group");
    expect(copyFor("he").entryMember).toBe("חבר");
    expect(copyFor("he").entryGroup).toBe("משפחה/קבוצה");
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
  });
});
