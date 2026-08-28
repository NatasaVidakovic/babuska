import { describe, expect, it } from "vitest";
import { getHeroLoadState } from "./hero-loader";

describe("hero loader state", () => {
  it("does not show the loader before a genuine delay", () => {
    expect(getHeroLoadState({ elapsedMs: 399 })).toBe("pending");
    expect(getHeroLoadState({ elapsedMs: 400 })).toBe("loading");
  });

  it("prioritizes decoded and failed terminal states", () => {
    expect(getHeroLoadState({ elapsedMs: 800, decoded: true })).toBe("ready");
    expect(getHeroLoadState({ elapsedMs: 800, failed: true })).toBe("fallback");
  });

  it("stops loading after four seconds", () => {
    expect(getHeroLoadState({ elapsedMs: 3_999 })).toBe("loading");
    expect(getHeroLoadState({ elapsedMs: 4_000 })).toBe("fallback");
  });
});
