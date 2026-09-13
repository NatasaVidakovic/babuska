import { describe, expect, it } from "vitest";
import {
  deriveVariantWidths,
  selectVariant,
  type MediaVariants,
} from "./media-variants";

describe("media variants", () => {
  it("does not upscale sources smaller than a configured target", () => {
    expect(deriveVariantWidths(360, "hero")).toEqual([360]);
    expect(deriveVariantWidths(700, "menu")).toEqual([480, 700]);
    expect(deriveVariantWidths(360, "stories")).toEqual([360]);
  });

  it("returns the configured widths for a sufficiently large source", () => {
    expect(deriveVariantWidths(2_000, "hero")).toEqual([640, 1280, 1920]);
    expect(deriveVariantWidths(1_200, "menu")).toEqual([480, 960]);
    expect(deriveVariantWidths(1_600, "stories")).toEqual([480, 960, 1440]);
  });

  it("selects the smallest variant that covers the rendered width", () => {
    const variants: MediaVariants = {
      "640": { path: "hero/640.webp", url: "/640.webp", width: 640 },
      "1280": { path: "hero/1280.webp", url: "/1280.webp", width: 1280 },
      "1920": { path: "hero/1920.webp", url: "/1920.webp", width: 1920 },
    };

    expect(selectVariant(variants, 420)?.width).toBe(640);
    expect(selectVariant(variants, 1_000)?.width).toBe(1280);
    expect(selectVariant(variants, 2_000)?.width).toBe(1920);
  });
});
