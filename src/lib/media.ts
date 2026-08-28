import { supabase } from "./supabase";
import {
  deriveVariantWidths,
  mediaVariantPaths,
  type MediaFolder,
  type MediaVariants,
} from "./media-variants";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const HERO_MINIMUM_WIDTH = 1920;
const WEBP_QUALITY = 0.82;
const HERO_WEBP_QUALITY = 0.72;
const BUCKET = "cafe-media";
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type { MediaFolder } from "./media-variants";
export type UploadedMedia = {
  url: string;
  path: string;
  variants: MediaVariants;
};
export type PlannedVariant = { width: number; path: string };
export type MediaUploadPlan = {
  originalPath: string;
  variants: PlannedVariant[];
};

export function validateImage(file: File) {
  if (!MIME_EXTENSIONS[file.type])
    throw new Error("Дозвољени су JPEG, PNG, WebP и AVIF формати.");
  if (file.size > MAX_IMAGE_SIZE)
    throw new Error("Слика може имати највише 10 MB.");
}

export function createMediaUploadPlan(
  sourceWidth: number,
  folder: MediaFolder,
  assetId: string,
  extension: string,
): MediaUploadPlan {
  return {
    originalPath: `${folder}/${assetId}/original.${extension}`,
    variants: deriveVariantWidths(sourceWidth, folder).map((width) => ({
      width,
      path:
        folder === "hero"
          ? `hero/current-${width}.webp`
          : `${folder}/${assetId}/${width}.webp`,
    })),
  };
}

export function removableMediaPaths(
  originalPath?: string,
  variants: MediaVariants = {},
): string[] {
  return [...new Set([originalPath ?? "", ...mediaVariantPaths(variants)])]
    .filter(Boolean)
    .filter((path) => !/^hero\/current-\d+\.webp$/.test(path));
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function renderWebp(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  quality: number,
): Promise<Blob> {
  const targetHeight = Math.max(
    1,
    Math.round((sourceHeight / sourceWidth) * targetWidth),
  );
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Слика се не може припремити у прегледачу.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("WebP варијанта слике није креирана.")),
      "image/webp",
      quality,
    );
  });
}

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(
  file: File,
  folder: MediaFolder,
): Promise<UploadedMedia> {
  validateImage(file);
  const extension = MIME_EXTENSIONS[file.type];
  const decoded = await decodeImage(file).catch(() => {
    throw new Error("Слика се не може прочитати. Покушајте други формат.");
  });
  if (folder === "hero" && decoded.width < HERO_MINIMUM_WIDTH) {
    decoded.close?.();
    throw new Error(
      "Почетна слика мора бити широка најмање 1920 px ради јасног приказа на великим екранима.",
    );
  }

  const plan = createMediaUploadPlan(
    decoded.width,
    folder,
    crypto.randomUUID(),
    extension,
  );
  let rendered: { variant: PlannedVariant; blob: Blob }[];
  try {
    rendered = await Promise.all(
      plan.variants.map(async (variant) => ({
        variant,
        blob: await renderWebp(
          decoded.source,
          decoded.width,
          decoded.height,
          variant.width,
          folder === "hero" && variant.width >= 1280
            ? HERO_WEBP_QUALITY
            : WEBP_QUALITY,
        ),
      })),
    );
  } finally {
    decoded.close?.();
  }

  const uploadedVersionedPaths: string[] = [];
  try {
    const { error: originalError } = await supabase.storage
      .from(BUCKET)
      .upload(plan.originalPath, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (originalError) throw originalError;
    uploadedVersionedPaths.push(plan.originalPath);

    for (const { variant, blob } of rendered) {
      const stableHero = folder === "hero";
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(variant.path, blob, {
          contentType: "image/webp",
          cacheControl: stableHero ? "0" : "31536000",
          upsert: stableHero,
        });
      if (error) throw error;
      if (!stableHero) uploadedVersionedPaths.push(variant.path);
    }

    const variants: MediaVariants = Object.fromEntries(
      plan.variants.map((variant) => [
        String(variant.width),
        {
          width: variant.width,
          path: variant.path,
          url: publicUrl(variant.path),
        },
      ]),
    );
    const largest = Object.values(variants).at(-1)!;
    return {
      path: plan.originalPath,
      url: largest.url,
      variants,
    };
  } catch (error) {
    if (uploadedVersionedPaths.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(uploadedVersionedPaths)
        .catch(() => undefined);
    }
    throw error;
  }
}

export async function removeUploadedImage(paths?: string | string[]) {
  const requested = (Array.isArray(paths) ? paths : [paths ?? ""])
    .filter(Boolean)
    .filter((path) => !/^hero\/current-\d+\.webp$/.test(path));
  if (!requested.length) return;
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([...new Set(requested)]);
  if (error) throw error;
}
