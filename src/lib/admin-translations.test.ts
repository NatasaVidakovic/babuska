import { describe, expect, it } from "vitest";
import { translationIssues } from "./admin-translations";

describe("administrator translation completeness", () => {
  it("identifies the exact missing language that would hide a menu item", () => {
    expect(
      translationIssues([
        {
          key: "Name",
          sr: "Руске капе",
          en: "Russian hat cakes",
          ru: "",
          required: true,
        },
      ]),
    ).toEqual([{ language: "ru", key: "Name", reason: "missing" }]);
  });
  it("ignores entirely empty optional descriptions but flags partial translations", () => {
    expect(
      translationIssues([{ key: "Description", sr: "", en: "", ru: "" }]),
    ).toEqual([]);
    expect(
      translationIssues([{ key: "Description", sr: "Десерт", en: "", ru: "" }]),
    ).toEqual([
      { language: "en", key: "Description", reason: "missing" },
      { language: "ru", key: "Description", reason: "missing" },
    ]);
  });
  it("flags Latin text in Cyrillic fields instead of reporting it as ready", () => {
    expect(
      translationIssues([
        {
          key: "Name",
          sr: "Desert",
          en: "Dessert",
          ru: "Desert",
          required: true,
        },
      ]),
    ).toEqual([
      { language: "sr", key: "Name", reason: "invalid" },
      { language: "ru", key: "Name", reason: "invalid" },
    ]);
  });
  it("accepts trilingual dessert names and trims whitespace", () => {
    expect(
      translationIssues([
        {
          key: "Name",
          sr: " Птичје млијеко ",
          en: "Bird’s milk",
          ru: "Птичье молоко",
          required: true,
        },
      ]),
    ).toEqual([]);
    expect(
      translationIssues([
        { key: "Name", sr: "Десерт", en: "  ", ru: "Десерты", required: true },
      ]),
    ).toEqual([{ language: "en", key: "Name", reason: "missing" }]);
  });
});
