const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.",
  );
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, { headers, ...options });
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const bootstrap = await request("/rest/v1/rpc/public_site_bootstrap", {
  method: "POST",
  body: "{}",
});
const [categories, items, gallery] = await Promise.all([
  request("/rest/v1/menu_categories?select=id&is_active=eq.true&order=sort_order.asc,id.asc"),
  request("/rest/v1/menu_items?select=id&is_published=eq.true&order=sort_order.asc,id.asc"),
  request("/rest/v1/gallery_items?select=id&is_published=eq.true&order=sort_order.asc,id.asc"),
]);

function assertIds(label, actual, expected) {
  const actualIds = actual.map(({ id }) => id);
  const expectedIds = expected.map(({ id }) => id);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`${label} is not filtered or ordered like the public tables.`);
  }
}

if (!bootstrap || typeof bootstrap.settings !== "object") {
  throw new Error("Bootstrap settings are missing.");
}
for (const keyName of ["categories", "items", "gallery"]) {
  if (!Array.isArray(bootstrap[keyName])) {
    throw new Error(`Bootstrap ${keyName} must be an array.`);
  }
}
assertIds("Categories", bootstrap.categories, categories);
assertIds("Menu items", bootstrap.items, items);
assertIds("Gallery", bootstrap.gallery, gallery);

if (
  typeof bootstrap.settings.hero_title_ru !== "string" ||
  bootstrap.categories.some((category) => !("name_ru" in category)) ||
  bootstrap.items.some((item) => !("name_ru" in item)) ||
  bootstrap.gallery.some((item) => !("alt_ru" in item))
) {
  throw new Error("Bootstrap is missing Russian localized fields.");
}

if (
  bootstrap.stories.some(
    (story) =>
      !("description_sr" in story) ||
      !("description_en" in story) ||
      !("description_ru" in story),
  )
) {
  throw new Error("Bootstrap is missing localized story descriptions.");
}

for (const forbidden of ["is_active", "is_published", "created_at", "updated_at"]) {
  if (JSON.stringify(bootstrap).includes(`\"${forbidden}\"`)) {
    throw new Error(`Bootstrap exposes internal field ${forbidden}.`);
  }
}

console.log(
  `Public bootstrap smoke passed: ${categories.length} categories, ${items.length} items, ${gallery.length} gallery images.`,
);
