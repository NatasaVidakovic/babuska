export const BOOK_ITEMS_PER_PAGE = 5;

export function createBookPageSlots<T>(
  items: readonly T[],
  slotCount = BOOK_ITEMS_PER_PAGE,
): Array<T | null> {
  return Array.from({ length: slotCount }, (_, index) => items[index] ?? null);
}
