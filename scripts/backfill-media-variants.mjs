import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import WebSocket from "ws";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;
const refreshHero = process.argv.includes("--refresh-hero");
if (!url || !key || !email || !password)
  throw new Error(
    "Missing local Supabase URL, publishable key, admin email, or admin password.",
  );

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const bucket = client.storage.from("cafe-media");
const widths = {
  hero: [640, 1280, 1920],
  menu: [480, 960],
  gallery: [640, 1280, 1920],
};
const counters = { hero: 0, menu: 0, gallery: 0 };

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

function hasVariants(value) {
  return value && typeof value === "object" && Object.keys(value).length > 0;
}

async function readSource(storagePath, publicUrl) {
  if (storagePath) {
    const { data, error } = await bucket.download(storagePath);
    if (!error && data) return Buffer.from(await data.arrayBuffer());
  }
  if (!publicUrl) throw new Error("Image source is missing.");
  const response = await fetch(publicUrl);
  if (!response.ok)
    throw new Error(`Could not download source image (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

function publicUrl(path) {
  return bucket.getPublicUrl(path).data.publicUrl;
}

async function uploadVariant(path, body, stable = false) {
  const { error } = await bucket.upload(path, body, {
    contentType: "image/webp",
    cacheControl: stable ? "0" : "31536000",
    upsert: stable,
  });
  if (!error) return true;
  if (!stable && /duplicate|already exists/i.test(error.message)) return false;
  throw new Error(`Could not upload ${path}: ${error.message}`);
}

async function createVariants(source, folder, sourceKey) {
  const metadata = await sharp(source).metadata();
  if (!metadata.width) throw new Error("Image width could not be read.");
  if (folder === "hero" && metadata.width < 1920)
    throw new Error(
      "The current hero is below 1920 px. Upload a larger hero before enabling stable preload paths.",
    );
  const selected = widths[folder].filter((width) => width <= metadata.width);
  if (!selected.includes(metadata.width) && metadata.width < widths[folder].at(-1))
    selected.push(metadata.width);
  const hash = createHash("sha256").update(sourceKey).digest("hex").slice(0, 16);
  const variants = {};
  const created = [];
  for (const width of selected) {
    const path =
      folder === "hero"
        ? `hero/current-${width}.webp`
        : `${folder}/responsive/${hash}/${width}.webp`;
    const body = await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: folder === "hero" && width >= 1280 ? 72 : 82 })
      .toBuffer();
    if (await uploadVariant(path, body, folder === "hero")) created.push(path);
    variants[String(width)] = { width, path, url: publicUrl(path) };
  }
  return { variants, created };
}

async function backfillRows({ table, folder, rows }) {
  const pending = rows.filter((row) => !hasVariants(row.image_variants));
  const groups = new Map();
  for (const row of pending) {
    const sourceKey = row.storage_path || row.image_url;
    if (!sourceKey) continue;
    groups.set(sourceKey, [...(groups.get(sourceKey) ?? []), row]);
  }
  for (const [sourceKey, group] of groups) {
    if (!sourceKey) continue;
    const existing = rows.find(
      (row) =>
        (row.storage_path || row.image_url) === sourceKey &&
        hasVariants(row.image_variants),
    );
    const result = existing
      ? { variants: existing.image_variants, created: [] }
      : await createVariants(
          await readSource(group[0].storage_path, group[0].image_url),
          folder,
          sourceKey,
        );
    const { error } = await client
      .from(table)
      .update({ image_variants: result.variants })
      .in(
        "id",
        group.map((row) => row.id),
      );
    if (error) {
      if (result.created.length) await bucket.remove(result.created);
      throw new Error(`Could not update ${table}: ${error.message}`);
    }
    counters[folder] += group.length;
  }
}

const [settingsResult, menuResult, galleryResult] = await Promise.all([
  client
    .from("site_settings")
    .select("hero_image_url, hero_image_storage_path, hero_image_variants")
    .eq("id", 1)
    .single(),
  client
    .from("menu_items")
    .select("id, image_url, storage_path, image_variants"),
  client
    .from("gallery_items")
    .select("id, image_url, storage_path, image_variants"),
]);
const readError =
  settingsResult.error ?? menuResult.error ?? galleryResult.error;
if (readError) throw new Error(`Could not read media rows: ${readError.message}`);

if (refreshHero || !hasVariants(settingsResult.data.hero_image_variants)) {
  const source = await readSource(
    settingsResult.data.hero_image_storage_path,
    settingsResult.data.hero_image_url,
  );
  const { variants } = await createVariants(
    source,
    "hero",
    settingsResult.data.hero_image_storage_path ||
      settingsResult.data.hero_image_url,
  );
  const largest = Object.values(variants).at(-1);
  const { error } = await client
    .from("site_settings")
    .update({ hero_image_variants: variants, hero_image_url: largest.url })
    .eq("id", 1);
  if (error) throw new Error(`Could not update hero metadata: ${error.message}`);
  counters.hero = 1;
}

await backfillRows({
  table: "menu_items",
  folder: "menu",
  rows: menuResult.data,
});
await backfillRows({
  table: "gallery_items",
  folder: "gallery",
  rows: galleryResult.data,
});

console.log(
  `Media variant backfill complete: hero ${counters.hero}, menu rows ${counters.menu}, gallery rows ${counters.gallery}.`,
);
