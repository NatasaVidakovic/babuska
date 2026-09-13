import { describe, expect, it } from "vitest";
import { categoryIconKind } from "./category-icons";

describe("category icon classification", () => {
  it.each([
    "Виски бурбон",
    "Whisky / Bourbon",
    "Вотка",
    "Водка",
    "Vodka",
  ])("uses the spirits icon for whiskey and vodka category %s", (category) => {
    expect(categoryIconKind(category)).toBe("spirits");
  });

  it.each(["", "Будућа категорија", "Новая категория"])(
    "uses an ordinary glass for unknown category %s",
    (category) => {
      expect(categoryIconKind(category)).toBe("glass");
    },
  );
});
