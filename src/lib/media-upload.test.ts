import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
import {
  createMediaUploadPlan,
  IMAGE_PICKER_ACCEPT,
  removableMediaPaths,
  resolveImageFileFormat,
  snapshotSelectedFiles,
  validateImage,
} from "./media";

const imageFile = (type: string, size = 1024, name = "photo.jpg") =>
  ({ name, type, size } as File);

describe("media upload planning", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/avif"])(
    "accepts %s files",
    (type) => expect(() => validateImage(imageFile(type))).not.toThrow(),
  );

  it.each([
    ["image/heic", "photo.heic"],
    ["image/heif", "photo.heif"],
    ["", "photo.heic"],
    ["application/octet-stream", "photo.heif"],
  ])("accepts mobile photo %s named %s", (type, name) => {
    expect(() => validateImage(imageFile(type, 1024, name))).not.toThrow();
  });

  it("offers the native mobile gallery and explicit Apple photo extensions", () => {
    expect(IMAGE_PICKER_ACCEPT).toContain("image/*");
    expect(IMAGE_PICKER_ACCEPT).toContain(".heic");
    expect(IMAGE_PICKER_ACCEPT).toContain(".heif");
  });

  it("infers the actual image format when a phone omits its MIME type", () => {
    expect(resolveImageFileFormat(imageFile("", 1024, "IMG_0001.HEIC"))).toEqual({
      extension: "heic",
      mimeType: "image/heic",
    });
  });

  it("snapshots story files before the mobile picker is cleared", () => {
    const first = imageFile("image/jpeg", 1024, "first.jpg");
    const second = imageFile("image/heic", 1024, "second.heic");
    const liveSelection = {
      0: first,
      1: second,
      length: 2,
      item: (index: number) => [first, second][index] ?? null,
      [Symbol.iterator]: () => [first, second][Symbol.iterator](),
    } as FileList;

    expect(snapshotSelectedFiles(liveSelection)).toEqual([first, second]);
  });

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
