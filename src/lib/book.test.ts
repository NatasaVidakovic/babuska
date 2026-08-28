import { describe, expect, it } from "vitest";
import { BOOK_ITEMS_PER_PAGE, createBookPageSlots } from "./book";

describe("createBookPageSlots", () => {
  it("keeps a partially filled page at the configured capacity", () => {
    expect(createBookPageSlots(["Еспресо", "Капућино"])).toEqual([
      "Еспресо",
      "Капућино",
      null,
      null,
      null,
    ]);
  });

  it("keeps a full page unchanged", () => {
    const items = ["1", "2", "3", "4", "5"];

    expect(createBookPageSlots(items)).toEqual(items);
    expect(createBookPageSlots(items)).toHaveLength(BOOK_ITEMS_PER_PAGE);
  });

  it("creates a full set of empty slots for an empty page", () => {
    expect(createBookPageSlots([])).toEqual([null, null, null, null, null]);
  });
});
