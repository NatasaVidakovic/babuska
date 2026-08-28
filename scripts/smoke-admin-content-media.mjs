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

const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
};
const admin = createClient(url, key, options);
const anonymous = createClient(url, key, options);
const marker = `Admin media smoke ${Date.now()}`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9ZQAAAABJRU5ErkJggg==",
  "base64",
);
const settingColumns =
  "id, instagram, facebook, tiktok, phone, email, social_handle, hero_image_url, hero_image_storage_path, hero_title_sr, hero_title_en, hero_description_sr, hero_description_en, hero_cta_sr, hero_cta_en, footer_address_heading_sr, footer_address_heading_en, footer_address_line_1_sr, footer_address_line_1_en, footer_address_line_2_sr, footer_address_line_2_en, footer_address_line_3_sr, footer_address_line_3_en, footer_hours_heading_sr, footer_hours_heading_en, footer_hours_line_1_sr, footer_hours_line_1_en, footer_hours_line_2_sr, footer_hours_line_2_en, footer_hours_line_3_sr, footer_hours_line_3_en, footer_contact_heading_sr, footer_contact_heading_en, footer_copyright_sr, footer_copyright_en";

const { error: signInError } = await admin.auth.signInWithPassword({
  email,
  password,
});
if (signInError) throw new Error(`Admin login failed: ${signInError.message}`);
const { data: isAdmin, error: roleError } = await admin.rpc("is_admin");
if (roleError || !isAdmin)
  throw new Error(
    `Admin role check failed: ${roleError?.message ?? "is_admin returned false"}`,
  );

const { data: originalSettings, error: settingsReadError } = await admin
  .from("site_settings")
  .select(settingColumns)
  .eq("id", 1)
  .maybeSingle();
if (settingsReadError || !originalSettings)
  throw new Error(
    `Settings columns are unavailable: ${settingsReadError?.message ?? "settings row missing"}`,
  );
const { data: category, error: categoryError } = await admin
  .from("menu_categories")
  .select("id")
  .order("sort_order")
  .limit(1)
  .maybeSingle();
if (categoryError || !category)
  throw new Error(
    `A category is required: ${categoryError?.message ?? "no category found"}`,
  );

const heroPath = `hero/smoke-${Date.now()}.png`;
const menuPath = `menu/smoke-${Date.now()}.png`;
const galleryPath = `gallery/smoke-${Date.now()}.png`;
let menuItemId = "";
let galleryItemId = "";

try {
  const { error: anonymousWriteError } = await anonymous
    .from("gallery_items")
    .insert({
      image_url: "https://example.invalid/denied.png",
      alt_sr: "Забрањено",
      alt_en: marker,
      sort_order: 9999,
    });
  if (!anonymousWriteError)
    throw new Error("Anonymous gallery write was accepted.");

  for (const path of [heroPath, menuPath, galleryPath]) {
    const { error } = await admin.storage
      .from("cafe-media")
      .upload(path, png, { contentType: "image/png", upsert: false });
    if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
  }
  const heroUrl = admin.storage.from("cafe-media").getPublicUrl(heroPath)
    .data.publicUrl;
  const menuUrl = admin.storage.from("cafe-media").getPublicUrl(menuPath)
    .data.publicUrl;
  const galleryUrl = admin.storage.from("cafe-media").getPublicUrl(galleryPath)
    .data.publicUrl;

  const settingsPayload = {
    id: 1,
    hero_image_url: heroUrl,
    hero_image_storage_path: heroPath,
    hero_title_sr: "Провјера почетне странице",
    hero_title_en: `${marker} EN`,
    hero_description_sr: "Опис на српском за провјеру.",
    hero_description_en: "English description for the smoke check.",
    hero_cta_sr: "Отвори мени",
    hero_cta_en: "Open menu",
    footer_address_heading_sr: "Адреса провјере",
    footer_address_heading_en: "Smoke address",
    footer_address_line_1_sr: "Улица 1",
    footer_address_line_1_en: "Street 1",
    footer_address_line_2_sr: "78000 Град",
    footer_address_line_2_en: "78000 City",
    footer_address_line_3_sr: "Босна и Херцеговина",
    footer_address_line_3_en: "Bosnia and Herzegovina",
    footer_hours_heading_sr: "Радно вријеме",
    footer_hours_heading_en: "Opening Hours",
    footer_hours_line_1_sr: "Понедјељак – петак",
    footer_hours_line_1_en: "Monday – Friday",
    footer_hours_line_2_sr: "Субота",
    footer_hours_line_2_en: "Saturday",
    footer_hours_line_3_sr: "Недјеља",
    footer_hours_line_3_en: "Sunday",
    footer_contact_heading_sr: "Контакт провјере",
    footer_contact_heading_en: "Smoke contact",
    footer_copyright_sr: "Провјера ауторских права",
    footer_copyright_en: marker,
    phone: "+38765000111",
    email: "smoke@cafebabuska.local",
    social_handle: "@cafe-babuska-smoke",
  };
  const { error: contentSaveError } = await admin
    .from("site_settings")
    .upsert(settingsPayload);
  if (contentSaveError)
    throw new Error(`Could not save settings: ${contentSaveError.message}`);

  const { data: menuItem, error: menuError } = await admin
    .from("menu_items")
    .insert({
      category_id: category.id,
      name: "Привремено пиће",
      name_sr: "Привремено пиће",
      name_en: `${marker} menu`,
      price: "9.90 КМ",
      image_url: menuUrl,
      storage_path: menuPath,
      description: "Привремена слика производа.",
      description_sr: "Привремена слика производа.",
      description_en: "Temporary product image.",
      fact: "Провјера.",
      fact_sr: "Провјера.",
      fact_en: marker,
      is_published: true,
      sort_order: 9999,
    })
    .select("id")
    .single();
  if (menuError || !menuItem)
    throw new Error(
      `Could not create menu item: ${menuError?.message ?? "no row"}`,
    );
  menuItemId = menuItem.id;

  const { data: galleryItem, error: galleryError } = await admin
    .from("gallery_items")
    .insert({
      image_url: galleryUrl,
      storage_path: galleryPath,
      alt_sr: "Привремена галеријска слика",
      alt_en: `${marker} EN`,
      is_published: true,
      sort_order: 9999,
    })
    .select("id")
    .single();
  if (galleryError || !galleryItem)
    throw new Error(
      `Could not create gallery item: ${galleryError?.message ?? "no row"}`,
    );
  galleryItemId = galleryItem.id;

  const [
    { data: publicSettings, error: publicSettingsError },
    { data: publicMenu, error: publicMenuError },
    { data: publicGallery, error: publicGalleryError },
  ] = await Promise.all([
    anonymous
      .from("site_settings")
      .select(
        "hero_image_storage_path, hero_title_sr, hero_title_en, footer_hours_heading_sr",
      )
      .eq("id", 1)
      .single(),
    anonymous
      .from("menu_items")
      .select("storage_path, name_sr, name_en")
      .eq("id", menuItemId)
      .single(),
    anonymous
      .from("gallery_items")
      .select("storage_path, alt_sr, alt_en")
      .eq("id", galleryItemId)
      .single(),
  ]);
  if (
    publicSettingsError ||
    publicSettings.hero_image_storage_path !== heroPath ||
    publicSettings.hero_title_sr !== "Провјера почетне странице"
  )
    throw new Error(
      `Public settings read failed: ${publicSettingsError?.message ?? "wrong values"}`,
    );
  if (
    publicMenuError ||
    publicMenu.storage_path !== menuPath ||
    publicMenu.name_sr !== "Привремено пиће"
  )
    throw new Error(
      `Public menu read failed: ${publicMenuError?.message ?? "wrong values"}`,
    );
  if (
    publicGalleryError ||
    publicGallery.storage_path !== galleryPath ||
    publicGallery.alt_sr !== "Привремена галеријска слика"
  )
    throw new Error(
      `Public gallery read failed: ${publicGalleryError?.message ?? "wrong values"}`,
    );

  const responses = await Promise.all([
    fetch(heroUrl),
    fetch(menuUrl),
    fetch(galleryUrl),
  ]);
  if (responses.some((response) => !response.ok))
    throw new Error(
      `Public Storage fetch failed: ${responses.map((response) => response.status).join(", ")}`,
    );
  console.log(
    "Admin bilingual content and hero/menu/gallery media smoke passed.",
  );
} finally {
  if (menuItemId) await admin.from("menu_items").delete().eq("id", menuItemId);
  if (galleryItemId)
    await admin.from("gallery_items").delete().eq("id", galleryItemId);
  await admin.from("site_settings").upsert(originalSettings);
  await admin.storage
    .from("cafe-media")
    .remove([heroPath, menuPath, galleryPath]);
}
