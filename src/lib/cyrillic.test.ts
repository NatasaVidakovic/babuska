import { describe, expect, it } from "vitest";
import { containsLatinScript, isCyrillicContent } from "./cyrillic";

describe("Cyrillic content validation", () => {
  it("accepts Serbian text written in Cyrillic", () => {
    expect(containsLatinScript("Кафе Бабушка у Бањој Луци")).toBe(false);
    expect(isCyrillicContent(["Кафа", "Топли напитак"])).toBe(true);
  });

  it("rejects Serbian text containing Latin letters", () => {
    expect(containsLatinScript("Kafa")).toBe(true);
    expect(containsLatinScript("Кафа Latte")).toBe(true);
    expect(containsLatinScript("Кафе Café")).toBe(true);
    expect(isCyrillicContent(["Кафа", "Čaj"])).toBe(false);
  });
});
