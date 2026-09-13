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
      nameRu: "Кофе",
      sortOrder: 0,
    };
    expect(localizeCategory(category, "sr")?.name).toBe("Кафа");
    expect(localizeCategory(category, "en")?.name).toBe("Coffee");
    expect(localizeCategory(category, "ru")?.name).toBe("Кофе");
    expect(localizeCategory({ ...category, nameRu: "" }, "ru")?.name).toBe(
      "Кафа",
    );
    expect(localizeCategory({ ...category, nameSr: "Kafa" }, "sr")).toBeNull();
  });

  it("keeps a menu item visible when its optional description and image are empty", () => {
    const item = {
      id: "1",
      categoryId: "c1",
      price: "5.00 КМ",
      image: "",
      storagePath: "",
      imageVariants: {},
      nameSr: "Еспресо",
      nameEn: "Espresso",
      nameRu: "Эспрессо",
      descriptionSr: "",
      descriptionEn: "Single espresso.",
      descriptionRu: "",
      factSr: "",
      factEn: "",
      factRu: "",
    };
    expect(localizeMenuItem(item, "sr")).toMatchObject({
      name: "Еспресо",
      description: "",
      image: "",
    });
    expect(localizeMenuItem(item, "en")?.name).toBe("Espresso");
    expect(localizeMenuItem(item, "ru")?.name).toBe("Эспрессо");
    expect(localizeMenuItem({ ...item, nameRu: "" }, "ru")?.name).toBe(
      "Еспресо",
    );
  });

  it("allows an empty optional fact in both languages", () => {
    const item = {
      id: "1",
      categoryId: "c1",
      price: "5.00 КМ",
      image: "",
      storagePath: "",
      imageVariants: {},
      nameSr: "Еспресо",
      nameEn: "Espresso",
      nameRu: "Эспрессо",
      descriptionSr: "Кратак, снажан напитак.",
      descriptionEn: "A short, strong drink.",
      descriptionRu: "Крепкий кофе.",
      factSr: "",
      factEn: "",
      factRu: "",
    };
    expect(localizeMenuItem(item, "sr")?.fact).toBe("");
    expect(localizeMenuItem(item, "en")?.fact).toBe("");
    expect(localizeMenuItem(item, "ru")).toMatchObject({
      name: "Эспрессо",
      description: "Крепкий кофе.",
      fact: "",
    });
  });

  it("falls back from missing optional Russian copy to Serbian copy", () => {
    const item = {
      id: "1",
      categoryId: "c1",
      price: "5.00 КМ",
      image: "",
      storagePath: "",
      imageVariants: {},
      nameSr: "Еспресо",
      nameEn: "Espresso",
      nameRu: "Эспрессо",
      descriptionSr: "Кратак напитак.",
      descriptionEn: "A short drink.",
      descriptionRu: "",
      factSr: "Зрно је свјеже мљевено.",
      factEn: "Freshly ground beans.",
      factRu: "",
    };

    expect(localizeMenuItem(item, "ru")).toMatchObject({
      description: "Кратак напитак.",
      fact: "Зрно је свјеже мљевено.",
    });
  });
});
