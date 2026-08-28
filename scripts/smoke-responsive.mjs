import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.SITE_URL ?? "http://127.0.0.1:4300";
const evidenceDir = resolve(".codex/qa/plan-implementation/screenshots");
const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 700 },
  { width: 1024, height: 600 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir(evidenceDir, { recursive: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const result = await page.evaluate(() => {
      const logo = document
        .querySelector(".site-header__brand")
        ?.getBoundingClientRect();
      const actions = [...document.querySelectorAll(".site-header__actions")]
        .map((node) => node.getBoundingClientRect())
        .find((rect) => rect.width > 0 && rect.height > 0);
      const nav = document
        .querySelector(".site-header__nav")
        ?.getBoundingClientRect();
      const cta = document
        .querySelector(".site-hero__cta")
        ?.getBoundingClientRect();
      const hero = document.querySelector(".site-hero")?.getBoundingClientRect();
      const heroOrnaments = [
        ...document.querySelectorAll(".site-hero__ornament"),
      ].map((node) => node.getBoundingClientRect());
      const containers = [...document.querySelectorAll(".site-container")].map(
        (node) => node.getBoundingClientRect(),
      );
      const headings = [
        ...document.querySelectorAll(".site-section-heading h2"),
      ].map((node) => {
        const style = getComputedStyle(node);
        return `${style.fontFamily}|${style.fontSize}|${style.lineHeight}`;
      });
      const contentImages = [
        ...document.querySelectorAll(
          "#menu img, #gallery img, .site-hero__image",
        ),
      ];
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        logoLeft: logo?.left ?? 999,
        actionsRight: actions ? window.innerWidth - actions.right : 999,
        navOffset:
          nav && nav.width
            ? Math.abs((nav.left + nav.right) / 2 - window.innerWidth / 2)
            : 0,
        ctaVisible: Boolean(
          cta && cta.top >= 0 && cta.bottom <= window.innerHeight,
        ),
        ornamentsFitHero: Boolean(
          hero &&
            heroOrnaments.length === 4 &&
            heroOrnaments.every(
              (rect) =>
                rect.left >= hero.left - 1 &&
                rect.right <= hero.right + 1 &&
                rect.top >= hero.top - 1 &&
                rect.bottom <= hero.bottom + 1,
            ),
        ),
        centered: containers.every(
          (rect) =>
            Math.abs((rect.left + rect.right) / 2 - window.innerWidth / 2) <= 1,
        ),
        consistentHeadings: new Set(headings).size === 1,
        categoryCount: document.querySelectorAll("#menu button").length,
        contentMediaInStorage:
          contentImages.length > 0 &&
          contentImages.every((image) =>
            image.src.includes("/storage/v1/object/public/cafe-media/"),
          ),
        documentLanguage: document.documentElement.lang,
      };
    });
    if (result.overflow > 1)
      throw new Error(
        `${viewport.width}x${viewport.height}: horizontal overflow ${result.overflow}px`,
      );
    if (result.logoLeft > 40 || result.actionsRight > 40)
      throw new Error(
        `${viewport.width}x${viewport.height}: header edges are not aligned (${JSON.stringify(result)})`,
      );
    if (viewport.width >= 768 && result.navOffset > 2)
      throw new Error(
        `${viewport.width}x${viewport.height}: navigation is ${result.navOffset}px off center`,
      );
    if (!result.ctaVisible)
      throw new Error(
        `${viewport.width}x${viewport.height}: hero CTA is outside the initial viewport`,
      );
    if (!result.ornamentsFitHero)
      throw new Error(
        `${viewport.width}x${viewport.height}: hero ornaments overflow or are incomplete`,
      );
    if (!result.centered)
      throw new Error(
        `${viewport.width}x${viewport.height}: a section container is not centered`,
      );
    if (!result.consistentHeadings)
      throw new Error(
        `${viewport.width}x${viewport.height}: section headings use inconsistent typography`,
      );
    if (result.categoryCount !== 5)
      throw new Error(
        `${viewport.width}x${viewport.height}: expected 5 dynamic category filters, got ${result.categoryCount}`,
      );
    if (!result.contentMediaInStorage)
      throw new Error(
        `${viewport.width}x${viewport.height}: content media is not fully served from Supabase Storage`,
      );
    if (result.documentLanguage !== "sr-Cyrl")
      throw new Error(
        `${viewport.width}x${viewport.height}: Serbian Cyrillic is not the document default`,
      );

    await page.locator(".site-section--book").scrollIntoViewIfNeeded();
    const bookFrame = page.locator("[data-book-frame]");
    await bookFrame.waitFor({ state: "visible", timeout: 5_000 });
    const bookHeightBefore = (await bookFrame.boundingBox())?.height ?? 0;
    const nextBookButton = page
      .locator('[data-testid="dynamic-book-menu"] button:not([disabled])')
      .last();
    if ((await nextBookButton.count()) > 0) {
      await nextBookButton.click();
      await page.waitForTimeout(1_000);
    }
    const bookHeightAfter = (await bookFrame.boundingBox())?.height ?? 0;
    if (
      bookHeightBefore <= 0 ||
      Math.abs(bookHeightBefore - bookHeightAfter) > 1
    )
      throw new Error(
        `${viewport.width}x${viewport.height}: menu book height changed after turning a page (${bookHeightBefore}px -> ${bookHeightAfter}px)`,
      );

    await page.screenshot({
      path: resolve(
        evidenceDir,
        `public-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: false,
    });
    await page.close();
  }

  const languagePage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await languagePage.goto(baseUrl, { waitUntil: "networkidle" });
  const heroBefore = await languagePage
    .locator(".site-hero__image")
    .evaluate((image) => image.currentSrc);
  await languagePage
    .getByRole("button", { name: "EN", exact: true })
    .filter({ visible: true })
    .click();
  const heroAfter = await languagePage
    .locator(".site-hero__image")
    .evaluate((image) => image.currentSrc);
  const languageState = await languagePage.evaluate(() => ({
    lang: document.documentElement.lang,
    heading: document.querySelector("h1")?.textContent?.trim(),
  }));
  if (heroBefore !== heroAfter)
    throw new Error("Switching language changed the homepage image.");
  if (
    languageState.lang !== "en" ||
    languageState.heading !== "A Taste of Moscow in Banja Luka"
  )
    throw new Error("English translation did not activate completely.");
  await languagePage.close();

  const admin = await browser.newPage({
    viewport: { width: 360, height: 640 },
  });
  await admin.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  const adminOverflow = await admin.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (adminOverflow > 1)
    throw new Error(
      `Admin has ${adminOverflow}px horizontal overflow at 360px.`,
    );
  await admin.screenshot({
    path: resolve(evidenceDir, "admin-login-360x640.png"),
    fullPage: false,
  });
  console.log(
    `Responsive smoke passed for ${viewports.length} public viewports and the mobile admin route.`,
  );
} finally {
  await browser.close();
}
