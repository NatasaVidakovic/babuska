import { describe, expect, it } from "vitest";
import { PUBLIC_COPY } from "../App";

describe("public story fallback copy", () => {
  it("uses the approved live-atmosphere message in every language", () => {
    expect(PUBLIC_COPY.sr.stories).toBe(
      "Уживо из кафића Бабушка — погледајте тренутну атмосферу",
    );
    expect(PUBLIC_COPY.en.stories).toBe(
      "Live from Café Babuska — see the atmosphere right now",
    );
    expect(PUBLIC_COPY.ru.stories).toBe(
      "Сейчас в кафе «Бабушка» — взгляните на атмосферу",
    );
  });
});
