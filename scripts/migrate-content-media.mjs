import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;
if (!url || !key || !email || !password)
  throw new Error(
    "Missing local Supabase URL, publishable key, admin email, or admin password.",
  );

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const { error: signInError } = await client.auth.signInWithPassword({
  email,
  password,
});
if (signInError) throw new Error(`Admin login failed: ${signInError.message}`);
const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
if (roleError || !isAdmin)
  throw new Error(
    `Admin role check failed: ${roleError?.message ?? "is_admin returned false"}`,
  );

async function migrateUrl(sourceUrl, folder) {
  const response = await fetch(sourceUrl);
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${sourceUrl}`);
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  const extension = extensions[contentType];
  if (!extension)
    throw new Error(
      `Unsupported media type ${contentType || "unknown"}: ${sourceUrl}`,
    );
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > 10 * 1024 * 1024)
    throw new Error(`Image is larger than 10 MB: ${sourceUrl}`);
  const path = `${folder}/${randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from("cafe-media")
    .upload(path, body, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
  return {
    path,
    imageUrl: client.storage.from("cafe-media").getPublicUrl(path).data
      .publicUrl,
  };
}

async function migrateTable(table, folder) {
  const { data, error } = await client
    .from(table)
    .select("id, image_url, storage_path");
  if (error) throw new Error(`Could not read ${table}: ${error.message}`);
  let migrated = 0;
  for (const row of data ?? []) {
    if (!row.image_url || row.storage_path) continue;
    const media = await migrateUrl(row.image_url, folder);
    const { error: updateError } = await client
      .from(table)
      .update({ image_url: media.imageUrl, storage_path: media.path })
      .eq("id", row.id);
    if (updateError) {
      await client.storage.from("cafe-media").remove([media.path]);
      throw new Error(
        `Database update failed for ${table}/${row.id}: ${updateError.message}`,
      );
    }
    migrated++;
  }
  return migrated;
}

const { data: settings, error: settingsError } = await client
  .from("site_settings")
  .select("id, hero_image_url, hero_image_storage_path")
  .eq("id", 1)
  .maybeSingle();
if (settingsError)
  throw new Error(`Could not read site settings: ${settingsError.message}`);
let heroMigrated = 0;
if (settings?.hero_image_url && !settings.hero_image_storage_path) {
  const media = await migrateUrl(settings.hero_image_url, "hero");
  const { error } = await client
    .from("site_settings")
    .update({
      hero_image_url: media.imageUrl,
      hero_image_storage_path: media.path,
    })
    .eq("id", 1);
  if (error) {
    await client.storage.from("cafe-media").remove([media.path]);
    throw new Error(`Hero database update failed: ${error.message}`);
  }
  heroMigrated = 1;
}

const menuMigrated = await migrateTable("menu_items", "menu");
const galleryMigrated = await migrateTable("gallery_items", "gallery");
console.log(
  `Media migration complete: hero ${heroMigrated}, menu ${menuMigrated}, gallery ${galleryMigrated}. Existing Storage records were skipped.`,
);
