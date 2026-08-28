import { describe, expect, it } from "vitest";
import {
  isValidLocalizedText,
  localizeCategory,
  localizeMenuItem,
} from "./content";

describe("localized content", () => {
  it("accepts Serbian Cyrillic and rejects Serbian Latin text", () => {
    expect(isValidLocalizedText("Кафа и чај", "sr")).toBe(true);
    expect(isValidLocalizedText("Kafa i čaj", "sr")).toBe(false);
  });

  it("selects the requested category language without legacy fallback", () => {
    const category = {
      id: "1",
      nameSr: "Кафа",
      nameEn: "Coffee",
      sortOrder: 0,
    };
    expect(localizeCategory(category, "sr")?.name).toBe("Кафа");
    expect(localizeCategory(category, "en")?.name).toBe("Coffee");
    expect(localizeCategory({ ...category, nameSr: "Kafa" }, "sr")).toBeNull();
  });

  it("omits a menu item when required content is incomplete", () => {
    const item = {
      id: "1",
      categoryId: "c1",
      price: "5.00 КМ",
      image: "",
      storagePath: "",
      nameSr: "Еспресо",
      nameEn: "Espresso",
      descriptionSr: "",
      descriptionEn: "Single espresso.",
      factSr: "",
      factEn: "",
    };
    expect(localizeMenuItem(item, "sr")).toBeNull();
    expect(localizeMenuItem(item, "en")?.name).toBe("Espresso");
  });

  it("allows an empty optional fact in both languages", () => {
    const item = {
      id: "1",
      categoryId: "c1",
      price: "5.00 КМ",
      image: "",
      storagePath: "",
      nameSr: "Еспресо",
      nameEn: "Espresso",
      descriptionSr: "Кратак, снажан напитак.",
      descriptionEn: "A short, strong drink.",
      factSr: "",
      factEn: "",
    };
    expect(localizeMenuItem(item, "sr")?.fact).toBe("");
    expect(localizeMenuItem(item, "en")?.fact).toBe("");
  });
});
