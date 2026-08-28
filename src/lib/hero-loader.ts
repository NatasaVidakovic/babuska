export type HeroLoadState = "pending" | "loading" | "ready" | "fallback";

export const HERO_LOADER_DELAY_MS = 400;
export const HERO_LOAD_TIMEOUT_MS = 4_000;

export function getHeroLoadState({
  elapsedMs,
  decoded = false,
  failed = false,
}: {
  elapsedMs: number;
  decoded?: boolean;
  failed?: boolean;
}): HeroLoadState {
  if (decoded) return "ready";
  if (failed || elapsedMs >= HERO_LOAD_TIMEOUT_MS) return "fallback";
  if (elapsedMs >= HERO_LOADER_DELAY_MS) return "loading";
  return "pending";
}
