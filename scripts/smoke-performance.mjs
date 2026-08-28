import { gzipSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SITE_URL ?? "http://127.0.0.1:4300";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const fail = (message) => {
  throw new Error(message);
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".site-hero__image[data-ready='true']").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const normal = await page.evaluate(() => {
    const resources = performance
      .getEntriesByType("resource")
      .map((entry) => ({
        name: entry.name,
        start: entry.startTime,
        end: entry.responseEnd,
      }));
    const hero = document.querySelector(".site-hero__image");
    return {
      heroSrc: hero?.currentSrc ?? "",
      heroRequests: resources.filter((entry) =>
        entry.name.includes("/hero/current-"),
      ),
      bootstrap: resources.find((entry) =>
        entry.name.includes("public_site_bootstrap"),
      ),
      loaderVisible: Boolean(document.querySelector(".hero-loader")),
    };
  });
  if (normal.heroRequests.length !== 1)
    fail(`Expected one hero request, got ${normal.heroRequests.length}.`);
  if (!normal.bootstrap)
    fail("The public bootstrap request was not observed.");
  if (normal.heroRequests[0].start >= normal.bootstrap.end)
    fail("Hero request did not begin before the public bootstrap completed.");
  if (normal.loaderVisible)
    fail("Loader remained visible after a normal hero load.");

  const heroBefore = normal.heroSrc;
  await page
    .getByRole("button", { name: "EN", exact: true })
    .filter({ visible: true })
    .click();
  const heroAfter = await page.locator(".site-hero__image").evaluate(
    (image) => image.currentSrc,
  );
  if (heroBefore !== heroAfter)
    fail("Switching language changed the hero image source.");
  await page.close();

  const slow = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await slow.route("**/hero/current-*.webp", async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 6_000));
    await route.continue();
  });
  await slow.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const ctaBefore = await slow.locator(".site-hero__cta").boundingBox();
  await slow.waitForTimeout(500);
  if (!(await slow.locator(".hero-loader").isVisible()))
    fail("Babuska loader did not appear after the 400 ms threshold.");
  const ctaDuring = await slow.locator(".site-hero__cta").boundingBox();
  if (
    !ctaBefore ||
    !ctaDuring ||
    Math.abs(ctaBefore.x - ctaDuring.x) > 0.5 ||
    Math.abs(ctaBefore.y - ctaDuring.y) > 0.5
  )
    fail("Hero CTA shifted when the loader appeared.");
  await slow.waitForTimeout(3_700);
  if (await slow.locator(".hero-loader").isVisible())
    fail("Babuska loader did not clear at the 4 second fallback timeout.");
  await slow.close();

  const failed = await browser.newPage({ viewport: { width: 360, height: 800 } });
  await failed.route("**/hero/current-*.webp", (route) => route.abort());
  await failed.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await failed.waitForTimeout(500);
  const failedState = await failed.evaluate(() => ({
    loader: Boolean(document.querySelector(".hero-loader")),
    cta: Boolean(document.querySelector(".site-hero__cta")),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  if (failedState.loader || !failedState.cta || failedState.overflow > 1)
    fail(`Failed-image fallback is unstable: ${JSON.stringify(failedState)}`);
  await failed.close();

  const assets = await readdir(resolve("dist/assets"));
  const publicBundle = assets.find(
    (name) => /^index-.*\.js$/.test(name) && !name.includes("Admin"),
  );
  if (!publicBundle) fail("Could not find the built public JavaScript bundle.");
  const gzipBytes = gzipSync(
    await readFile(resolve("dist/assets", publicBundle)),
  ).byteLength;
  if (gzipBytes > 120 * 1024)
    fail(`Public JavaScript is ${gzipBytes} bytes gzip; limit is 122880.`);

  const heroBase = heroBefore.replace(/current-\d+\.webp(?:\?.*)?$/, "");
  const [mobileHero, desktopHero] = await Promise.all([
    fetch(`${heroBase}current-640.webp`).then((response) => response.arrayBuffer()),
    fetch(`${heroBase}current-1920.webp`).then((response) => response.arrayBuffer()),
  ]);
  if (mobileHero.byteLength > 100 * 1024)
    fail(`Mobile hero is ${mobileHero.byteLength} bytes; limit is 102400.`);
  if (desktopHero.byteLength > 220 * 1024)
    fail(`Desktop hero is ${desktopHero.byteLength} bytes; limit is 225280.`);

  console.log(
    `Performance smoke passed: hero starts at ${Math.round(normal.heroRequests[0].start)} ms, bootstrap ends at ${Math.round(normal.bootstrap.end)} ms, public JS ${gzipBytes} B gzip, hero 640 ${mobileHero.byteLength} B, hero 1920 ${desktopHero.byteLength} B.`,
  );
} finally {
  await browser.close();
}
