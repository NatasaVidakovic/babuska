import { supabase } from "./supabase";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type UploadedMedia = { url: string; path: string };
export type MediaFolder = "hero" | "menu" | "gallery";

export function validateImage(file: File) {
  if (!MIME_EXTENSIONS[file.type])
    throw new Error("Дозвољени су JPEG, PNG, WebP и AVIF формати.");
  if (file.size > MAX_IMAGE_SIZE)
    throw new Error("Слика може имати највише 10 MB.");
}

export async function uploadImage(
  file: File,
  folder: MediaFolder,
): Promise<UploadedMedia> {
  validateImage(file);
  const extension = MIME_EXTENSIONS[file.type];
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("cafe-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return {
    path,
    url: supabase.storage.from("cafe-media").getPublicUrl(path).data.publicUrl,
  };
}

export async function removeUploadedImage(path?: string) {
  if (!path) return;
  const { error } = await supabase.storage.from("cafe-media").remove([path]);
  if (error) throw error;
}
