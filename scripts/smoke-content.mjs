import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const mode = process.argv[2] ?? "setup";
const statePath = resolve(".tmp-smoke-content.json");
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;

if (!url || !key || !email || !password)
  throw new Error(
    "Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ADMIN_EMAIL or SUPABASE_ADMIN_PASSWORD.",
  );

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
};
const anonymous = createClient(url, key, clientOptions);
const admin = createClient(url, key, clientOptions);
const fail = (message) => {
  throw new Error(message);
};

async function login() {
  const { error } = await admin.auth.signInWithPassword({ email, password });
  if (error) fail(`Admin login failed: ${error.message}`);
  const { data, error: roleError } = await admin.rpc("is_admin");
  if (roleError || !data)
    fail(
      `Admin role check failed: ${roleError?.message ?? "is_admin returned false"}`,
    );
}

async function cleanup(state) {
  const errors = [];
  if (state.itemId) {
    const { error } = await admin
      .from("menu_items")
      .delete()
      .eq("id", state.itemId);
    if (error) errors.push(error.message);
  }
  if (state.categoryId) {
    const { error } = await admin
      .from("menu_categories")
      .delete()
      .eq("id", state.categoryId);
    if (error) errors.push(error.message);
  }
  if (state.social) {
    const { error } = await admin
      .from("site_settings")
      .upsert({ id: 1, ...state.social });
    if (error) errors.push(error.message);
  }
  if (errors.length) fail(`Cleanup failed: ${errors.join("; ")}`);
  await unlink(statePath).catch(() => undefined);
}

if (mode === "cleanup") {
  await login();
  const state = JSON.parse(await readFile(statePath, "utf8"));
  await cleanup(state);
  console.log(
    "Smoke cleanup passed: temporary menu content and social links were restored.",
  );
  process.exit(0);
}

if (mode !== "setup") fail("Use setup or cleanup.");
await login();

const marker = `Smoke ${Date.now()}`;
const { data: currentSettings, error: settingsError } = await admin
  .from("site_settings")
  .select("instagram, facebook, tiktok")
  .eq("id", 1)
  .single();
if (settingsError)
  fail(`Could not read social links: ${settingsError.message}`);

const state = { categoryId: "", itemId: "", social: currentSettings };
try {
  const { error: anonymousWriteError } = await anonymous
    .from("menu_categories")
    .insert({
      name: `${marker} denied`,
      name_sr: "Забрањено",
      name_en: `${marker} denied`,
      sort_order: 9999,
    });
  if (!anonymousWriteError)
    fail(
      "Anonymous category write was accepted; RLS is not protecting the backend.",
    );

  const categorySr = `Провјера ${Date.now()}`;
  const categoryEn = `${marker} category`;
  const { data: category, error: categoryError } = await admin
    .from("menu_categories")
    .insert({
      name: categorySr,
      name_sr: categorySr,
      name_en: categoryEn,
      sort_order: 9999,
      is_active: true,
    })
    .select("id, name_sr, name_en")
    .single();
  if (categoryError || !category)
    fail(`Could not add smoke category: ${categoryError?.message}`);
  state.categoryId = category.id;

  const { data: publicCategory, error: publicCategoryError } = await anonymous
    .from("menu_categories")
    .select("id, name_sr, name_en")
    .eq("id", category.id)
    .single();
  if (
    publicCategoryError ||
    publicCategory?.name_sr !== categorySr ||
    publicCategory.name_en !== categoryEn
  )
    fail(
      `Public category query failed: ${publicCategoryError?.message ?? "wrong category"}`,
    );

  const itemSr = `Пиће ${Date.now()}`;
  const itemEn = `${marker} drink`;
  const { data: item, error: itemError } = await admin
    .from("menu_items")
    .insert({
      name: itemSr,
      name_sr: itemSr,
      name_en: itemEn,
      category_id: category.id,
      price: "9.90 КМ",
      description: "Привремена провјера јавне картице.",
      description_sr: "Привремена провјера јавне картице.",
      description_en: "Temporary public-card check.",
      fact: "Провјера.",
      fact_sr: "Провјера.",
      fact_en: "Smoke test fact.",
      is_published: true,
      sort_order: 9999,
    })
    .select("id")
    .single();
  if (itemError || !item)
    fail(`Could not add smoke menu item: ${itemError?.message}`);
  state.itemId = item.id;

  const { data: publicItem, error: publicItemError } = await anonymous
    .from("menu_items")
    .select(
      "id, name_sr, name_en, price, description_sr, description_en, fact_sr, fact_en",
    )
    .eq("id", item.id)
    .single();
  if (
    publicItemError ||
    publicItem?.name_sr !== itemSr ||
    publicItem.name_en !== itemEn
  )
    fail(
      `Public menu item query failed: ${publicItemError?.message ?? "wrong menu item"}`,
    );

  const updatedName = `${marker} updated`;
  const updatedNameSr = `Измијењено пиће ${Date.now()}`;
  const { error: updateError } = await admin
    .from("menu_items")
    .update({
      name: updatedNameSr,
      name_sr: updatedNameSr,
      name_en: updatedName,
      price: "10.90 КМ",
    })
    .eq("id", item.id);
  if (updateError)
    fail(`Could not update smoke menu item: ${updateError.message}`);
  const { data: updatedItem, error: updatedItemError } = await anonymous
    .from("menu_items")
    .select("name_sr, name_en, price")
    .eq("id", item.id)
    .single();
  if (
    updatedItemError ||
    updatedItem?.name_sr !== updatedNameSr ||
    updatedItem.name_en !== updatedName ||
    updatedItem.price !== "10.90 КМ"
  )
    fail(
      `Public menu update query failed: ${updatedItemError?.message ?? "updated values missing"}`,
    );

  const smokeSocial = {
    instagram: "https://instagram.com/cafe-babuska-smoke",
    facebook: "https://facebook.com/cafe-babuska-smoke",
    tiktok: "https://tiktok.com/@cafe-babuska-smoke",
  };
  const { error: socialError } = await admin
    .from("site_settings")
    .upsert({ id: 1, ...smokeSocial });
  if (socialError)
    fail(`Could not update social links: ${socialError.message}`);
  const { data: publicSocial, error: publicSocialError } = await anonymous
    .from("site_settings")
    .select("instagram, facebook, tiktok")
    .eq("id", 1)
    .single();
  if (
    publicSocialError ||
    JSON.stringify(publicSocial) !== JSON.stringify(smokeSocial)
  )
    fail(
      `Public social query failed: ${publicSocialError?.message ?? "saved values differ"}`,
    );

  await writeFile(
    statePath,
    JSON.stringify({ ...state, marker, updatedName, smokeSocial }, null, 2),
  );
  console.log(
    JSON.stringify({
      marker,
      categoryId: state.categoryId,
      itemId: state.itemId,
      updatedName,
      status: "setup passed",
    }),
  );
} catch (error) {
  await cleanup(state).catch(() => undefined);
  throw error;
}
