import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
import {
  createMediaUploadPlan,
  removableMediaPaths,
  validateImage,
} from "./media";

const imageFile = (type: string, size = 1024) =>
  ({ type, size } as File);

describe("media upload planning", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/avif"])(
    "accepts %s files",
    (type) => expect(() => validateImage(imageFile(type))).not.toThrow(),
  );

  it("rejects unsupported and oversized files", () => {
    expect(() => validateImage(imageFile("image/gif"))).toThrow();
    expect(() =>
      validateImage(imageFile("image/jpeg", 10 * 1024 * 1024 + 1)),
    ).toThrow();
  });

  it("plans immutable menu derivatives without upscaling", () => {
    const plan = createMediaUploadPlan(700, "menu", "asset-id", "jpg");
    expect(plan.originalPath).toBe("menu/asset-id/original.jpg");
    expect(plan.variants).toEqual([
      { width: 480, path: "menu/asset-id/480.webp" },
      { width: 700, path: "menu/asset-id/700.webp" },
    ]);
  });

  it("uses all three stable paths for a full-size hero", () => {
    const plan = createMediaUploadPlan(2400, "hero", "asset-id", "png");
    expect(plan.variants).toEqual([
      { width: 640, path: "hero/current-640.webp" },
      { width: 1280, path: "hero/current-1280.webp" },
      { width: 1920, path: "hero/current-1920.webp" },
    ]);
  });

  it("never removes stable hero objects during old-media cleanup", () => {
    expect(
      removableMediaPaths("hero/id/original.jpg", {
        "640": {
          width: 640,
          path: "hero/current-640.webp",
          url: "https://example.test/current-640.webp",
        },
      }),
    ).toEqual(["hero/id/original.jpg"]);
  });
});
