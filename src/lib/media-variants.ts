export type MediaFolder = "hero" | "menu" | "gallery";

export type MediaVariant = {
  path: string;
  url: string;
  width: number;
};

export type MediaVariants = Record<string, MediaVariant>;

export const MEDIA_VARIANT_WIDTHS: Record<MediaFolder, readonly number[]> = {
  hero: [640, 1280, 1920],
  menu: [480, 960],
  gallery: [640, 1280, 1920],
};

export function deriveVariantWidths(
  sourceWidth: number,
  folder: MediaFolder,
): number[] {
  const width = Math.max(1, Math.round(sourceWidth));
  const configured = MEDIA_VARIANT_WIDTHS[folder].filter(
    (candidate) => candidate <= width,
  );
  if (!configured.includes(width) && width < MEDIA_VARIANT_WIDTHS[folder].at(-1)!)
    configured.push(width);
  return configured.length ? configured : [width];
}

export function selectVariant(
  variants: MediaVariants,
  renderedWidth: number,
): MediaVariant | null {
  const available = Object.values(variants)
    .filter(
      (variant) =>
        variant.width > 0 && Boolean(variant.path) && Boolean(variant.url),
    )
    .sort((left, right) => left.width - right.width);
  return (
    available.find((variant) => variant.width >= renderedWidth) ??
    available.at(-1) ??
    null
  );
}

export function parseMediaVariants(value: unknown): MediaVariants {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, MediaVariant] => {
      const candidate = entry[1];
      return Boolean(
        candidate &&
          typeof candidate === "object" &&
          "path" in candidate &&
          typeof candidate.path === "string" &&
          "url" in candidate &&
          typeof candidate.url === "string" &&
          "width" in candidate &&
          typeof candidate.width === "number" &&
          candidate.width > 0,
      );
    }),
  );
}

export function mediaVariantPaths(variants: MediaVariants): string[] {
  return [...new Set(Object.values(variants).map((variant) => variant.path))];
}

export function mediaSrcSet(variants: MediaVariants): string {
  return Object.values(variants)
    .filter((variant) => variant.url && variant.width > 0)
    .sort((left, right) => left.width - right.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
}
