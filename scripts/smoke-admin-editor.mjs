// Browser regression checks with an isolated API fixture. Never writes to Supabase.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const baseUrl = process.env.SITE_URL ?? "http://127.0.0.1:4300";
const evidenceDir = resolve(".codex/qa/admin-editor/screenshots");
const categoryId = randomUUID();
const user = {
  id: randomUUID(),
  email: "editor@example.test",
  aud: "authenticated",
  role: "authenticated",
};
const token = [
  "eyJhbGciOiJIUzI1NiJ9",
  Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url"),
  "test-signature",
].join(".");
const db = {
  menu_categories: [
    {
      id: categoryId,
      name: "Десерт",
      name_sr: "Десерт",
      name_en: "Dessert",
      name_ru: "Десерты",
      sort_order: 0,
      is_active: true,
    },
  ],
  menu_items: [
    ["Руске капе", "Russian hat cakes", "Русские шапочки"],
    ["Птичје млијеко", "Bird’s milk", "Птичье молоко"],
    ["Руска краљевска торта", "Russian royal cake", "Русский королевский торт"],
  ].map(([sr, en, ru], index) => ({
    id: randomUUID(),
    category_id: categoryId,
    name: sr,
    name_sr: sr,
    name_en: en,
    name_ru: ru,
    price: "0 KM",
    image_url: "",
    storage_path: null,
    image_variants: {},
    description_sr: "",
    description_en: "",
    description_ru: "",
    fact_sr: "",
    fact_en: "",
    fact_ru: "",
    sort_order: index,
    is_published: true,
  })),
  gallery_items: [],
  story_items: [],
  site_settings: [
    {
      id: 1,
      hero_title_sr: "Бабушка",
      hero_title_en: "Babuska",
      hero_title_ru: "Бабушка",
    },
  ],
};
const browser = await chromium.launch({ headless: true });
await mkdir(evidenceDir, { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
await context.route("**/auth/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  await route.fulfill({
    json: path.endsWith("/user")
      ? user
      : {
          access_token: token,
          refresh_token: "fixture-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user,
        },
  });
});
await context.route("**/functions/v1/translate-content", (route) =>
  route.fulfill({
    status: 503,
    json: { error: "Translation service unavailable for regression check" },
  }),
);
await context.route("**/rest/v1/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname.endsWith("/rpc/is_admin"))
    return route.fulfill({ json: true });
  const table = url.pathname.split("/").at(-1);
  if (!db[table])
    return route.fulfill({
      status: 404,
      json: { message: `Unknown fixture table ${table}` },
    });
  const id = url.searchParams.get("id")?.replace(/^eq\./, "");
  let rows = db[table].filter((row) => !id || String(row.id) === id);
  const payload = request.postDataJSON();
  if (request.method() === "POST") {
    const row = { id: randomUUID(), ...payload };
    const existing = db[table].find((entry) => entry.id === row.id);
    if (existing) Object.assign(existing, row);
    else db[table].push(row);
    rows = [existing ?? row];
  } else if (request.method() === "PATCH") {
    rows.forEach((row) => Object.assign(row, payload));
  } else if (request.method() === "DELETE") {
    db[table] = db[table].filter((row) => !rows.includes(row));
  }
  const single = request
    .headers()
    .accept?.includes("application/vnd.pgrst.object+json");
  await route.fulfill({ json: single ? (rows[0] ?? null) : rows });
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const field = (name) => page.getByRole("group", { name, exact: false });
const editTab = (name) =>
  page
    .locator(".admin-tabs")
    .getByRole("button", { name, exact: true })
    .click();

try {
  await page.goto(`${baseUrl}/admin`);
  await page.getByLabel("Е-пошта", { exact: true }).fill(user.email);
  await page.getByLabel("Лозинка", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Пријава", exact: true }).click();
  await page.locator(".admin-tabs").waitFor();

  await editTab("Категорије");
  const categoryName = field("Назив категорије");
  assert.equal(
    await categoryName.locator("input:visible").count(),
    3,
    "All category languages must be visible together",
  );
  await categoryName
    .getByLabel("Српски · ћирилица", { exact: true })
    .fill("Пробна категорија");
  await page
    .getByRole("button", { name: "Додај категорију", exact: true })
    .click();
  const warning = page.locator('.admin-status--floating[data-tone="warning"]');
  await warning.waitFor();
  assert.match(await warning.innerText(), /EN: Назив.*RU: Назив/s);
  assert.equal(
    await categoryName
      .getByLabel("Српски · ћирилица", { exact: true })
      .inputValue(),
    "Пробна категорија",
    "Incomplete saved record must remain open",
  );
  assert.equal(db.menu_categories.length, 2);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  assert.equal(
    await warning.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    }),
    true,
    "Feedback must remain in the viewport after scrolling",
  );

  await categoryName
    .getByLabel("Енглески", { exact: true })
    .fill("Test category");
  await categoryName
    .getByLabel("Руски · ћирилица", { exact: true })
    .fill("Тестовая категория");
  await page
    .getByRole("button", { name: "Сачувај измјене", exact: true })
    .click();
  await page.locator('.admin-status--floating[data-tone="success"]').waitFor();
  assert.equal(
    db.menu_categories.length,
    2,
    "Completing translations must update the saved record without duplicating it",
  );

  await editTab("Мени");
  const itemName = field("Назив ставке");
  assert.equal(await itemName.locator("input:visible").count(), 3);
  await page
    .getByLabel("Филтрирај по категорији", { exact: true })
    .selectOption(categoryId);
  await page.getByLabel("Претражи мени", { exact: true }).fill("Птичье");
  assert.equal(
    await page.locator(".admin-record").count(),
    1,
    "Search must find a dessert by its Russian name",
  );
  await page
    .locator(".admin-record")
    .getByRole("button", { name: "Уреди", exact: true })
    .click();
  assert.equal(
    await itemName
      .getByLabel("Српски · ћирилица", { exact: true })
      .inputValue(),
    "Птичје млијеко",
  );
  await itemName
    .getByLabel("Руски · ћирилица", { exact: true })
    .fill("Latin text");
  await page
    .getByRole("button", { name: "Сачувај измјене", exact: true })
    .click();
  await page.locator('.admin-status--floating[data-tone="error"]').waitFor();
  assert.equal(
    db.menu_items[1].name_ru,
    "Птичье молоко",
    "Invalid Cyrillic must not be persisted",
  );
  await itemName
    .getByLabel("Руски · ћирилица", { exact: true })
    .fill("Птичье молоко");
  await page
    .getByRole("button", { name: "Сачувај измјене", exact: true })
    .click();
  await page.locator('.admin-status--floating[data-tone="success"]').waitFor();
  await page.getByLabel("Претражи мени", { exact: true }).fill("");
  assert.equal(await page.locator(".admin-record").count(), 3);
  await page.screenshot({
    path: resolve(evidenceDir, "menu-desktop.png"),
    fullPage: true,
  });

  await editTab("Галерија");
  assert.equal(await field("Опис слике").locator("input:visible").count(), 3);
  await editTab("Садржај");
  assert.equal(await page.locator(".admin-translated-field").count(), 13);
  assert.equal(
    await page
      .locator(
        ".admin-translated-field input:visible, .admin-translated-field textarea:visible",
      )
      .count(),
    39,
  );
  await field("Наслов на почетној")
    .getByLabel("Енглески", { exact: true })
    .fill("");
  await page
    .getByRole("button", { name: "Сачувај садржај", exact: true })
    .click();
  await warning.waitFor();
  assert.match(await warning.innerText(), /EN: Наслов на почетној/);

  await editTab("Контакт");
  await page.getByLabel("Телефон", { exact: true }).fill("+387 65 123 456");
  await page
    .getByRole("button", { name: "Сачувај контакт", exact: true })
    .click();
  await page.locator('.admin-status--floating[data-tone="success"]').waitFor();
  assert.equal(
    db.site_settings[0].hero_title_en,
    null,
    "Contact saves must preserve other content and missing translations",
  );

  for (const viewport of [
    { width: 360, height: 640 },
    { width: 768, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    for (const tab of [
      "Категорије",
      "Мени",
      "Галерија",
      "Садржај",
      "Контакт",
    ]) {
      await editTab(tab);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `Overflow in ${tab} at ${viewport.width}px`,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await editTab("Мени");
  await page.screenshot({
    path: resolve(evidenceDir, "menu-mobile.png"),
    fullPage: true,
  });
  await page
    .locator(".admin-topbar__actions")
    .getByRole("button", { name: "EN", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "New menu item", exact: true })
    .waitFor();
  assert.equal(await field("Item name").locator("input:visible").count(), 3);
  assert.deepEqual(
    errors,
    [],
    "Administrator must not emit uncaught browser errors",
  );
  console.log(
    "PASS: trilingual inputs; persistent translation warnings; update without duplicates; Cyrillic validation; dessert search/edit; content/contact separation; gallery; 15 responsive views; English admin.",
  );
  console.log(`Screenshots: ${evidenceDir}`);
} finally {
  await browser.close();
}
