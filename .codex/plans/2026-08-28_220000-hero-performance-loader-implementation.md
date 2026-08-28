# Fast hero loading and Babuska loader Implementation Plan

> **For Codex:** Execute tasks sequentially in the same workspace; do not stage or alter unrelated user changes.

**Goal:** Make the Café Babuska public homepage load the responsive hero image before public content data, show a Babuska loader only after a real delay, and reduce initial public-page network and JavaScript work while preserving the Supabase-admin workflow.

**Architecture:** Add a Supabase migration for image-variant metadata and one public bootstrap RPC. Browser-side admin media code preserves originals and creates WebP variants. The public app uses an early Storage preload for stable hero variants and a lightweight REST/RPC client, while the Supabase SDK remains confined to the lazy admin path. The loader is an opacity/transform-only hero subcomponent with a 400 ms delay and a 4 s fallback timeout.

**Tech Stack:** React 19, TypeScript, Vite 8, Supabase Postgres/Storage/RLS, Vitest, Playwright, Vercel.

---

## Plan review corrections

- `HeroLoader.test.tsx` is removed from the required file list because this repository has no DOM component-test environment. Loader timing is covered by the pure `hero-loader.test.ts` state tests and visible behavior by Playwright.
- Font optimization begins by removing blocking CSS `@import` requests and adding early `preconnect`/stylesheet hints. New self-hosted font binaries are added only if the final waterfall still identifies fonts as a material LCP blocker; this avoids an unnecessary asset and licensing/distribution change.
- Menu-book code splitting is conditional on the measured public bundle after the Supabase SDK is removed from the public entry. Rendering is still deferred below the fold in all cases.

## Current baseline and invariants

- Production hero starts after the `site_settings` request, at roughly 837 ms, and is a 414 KB 1920 × 1080 JPEG.
- `src/App.tsx` currently imports `src/lib/supabase.ts`, keeping Supabase JS in the public entry chunk.
- `src/Admin.tsx` is already lazy-loaded; it may continue using the Supabase client and existing admin/RLS rules.
- The homepage default language is Serbian Cyrillic. A language switch must never change the hero media request.
- Public category filters must remain admin-derived only; do not restore static/default category filters.
- Existing menu-book page height, centered layout, public Storage policy, and bilingual validation remain unchanged.
- Preserve user-owned working-tree changes outside the files listed in each task.

## Task 1: Add pure media-variant and loader-state utilities

**Objective:** Isolate variant selection, no-upscale width selection, typed variant maps, and loader timing from React and Storage side effects.

**Files:**

- Create: `src/lib/media-variants.ts`
- Create: `src/lib/media-variants.test.ts`
- Create: `src/lib/hero-loader.ts`
- Create: `src/lib/hero-loader.test.ts`

**Step 1: Write failing unit tests**

Cover these observable rules:

```ts
expect(selectVariantWidth(420, [480, 960])).toBe(480);
expect(selectVariantWidth(2_000, [640, 1280, 1920])).toBe(1920);
expect(deriveVariantWidths(360, "hero")).toEqual([360]);
expect(nextHeroLoadState({ elapsedMs: 399, decoded: false })).toBe("pending");
expect(nextHeroLoadState({ elapsedMs: 400, decoded: false })).toBe("loading");
expect(nextHeroLoadState({ elapsedMs: 4_000, decoded: false })).toBe("fallback");
```

Define serializable types for `MediaVariants` and `UploadedMediaSet` so database rows and app view models share one shape.

**Step 2: Run the targeted tests**

Run: `npm run test -- src/lib/media-variants.test.ts src/lib/hero-loader.test.ts`

Expected: fail because the modules do not exist.

**Step 3: Implement the pure utilities**

- Define dimensions: hero `[640, 1280, 1920]`, menu `[480, 960]`, gallery `[640, 1280, 1920]`.
- Never request or generate a larger derivative than its source width.
- Select the smallest available variant that meets the rendered target; otherwise select the largest available variant.
- Define hero states `pending`, `loading`, `ready`, and `fallback` with a 400 ms display threshold and 4,000 ms timeout.

**Step 4: Re-run targeted tests**

Run: `npm run test -- src/lib/media-variants.test.ts src/lib/hero-loader.test.ts`

Expected: all new tests pass.

## Task 2: Extend the schema and public bootstrap contract

**Objective:** Store responsive media metadata and replace four public table reads with one policy-respecting RPC response.

**Files:**

- Create: `supabase/migrations/20260828220000_add_media_variants_and_public_bootstrap.sql`
- Modify: `src/lib/content.ts`
- Create: `scripts/smoke-public-bootstrap.mjs`

**Step 1: Write the migration and smoke assertions before frontend integration**

The migration must:

- add `image_variants jsonb not null default '{}'::jsonb` to `public.menu_items` and `public.gallery_items`;
- add `hero_image_variants jsonb not null default '{}'::jsonb` to `public.site_settings`;
- preserve existing `image_url`, `storage_path`, `hero_image_url`, and `hero_image_storage_path` as backward-compatible fallbacks;
- create `public.public_site_bootstrap()` returning only public settings, active categories, published menu items, and published gallery rows in their existing sort orders;
- use `security invoker` and explicitly grant execute to `anon` and `authenticated`;
- avoid returning admin-only or storage-write data.

`content.ts` must represent variant maps on `SiteSettings`, `AdminMenuItem`, and `AdminGalleryItem` without weakening current Cyrillic/English validation.

**Step 2: Apply locally and verify the RPC contract**

Run:

```powershell
npx supabase migration up --local
npx supabase db lint --local --level warning
node --env-file=.env.local scripts/smoke-public-bootstrap.mjs
```

Expected: no database lint findings; bootstrap contains 5 active categories and 30 published menu items in the seeded environment; unpublished/inactive fixtures do not appear.

**Step 3: Commit checkpoint**

Stage only the migration, content types, bootstrap smoke, and new pure tests. Commit message: `feat: add responsive media metadata and public bootstrap`.

## Task 3: Generate and upload responsive image derivatives in admin

**Objective:** Preserve original uploads while producing WebP variants from the browser and safely cleaning up failed uploads.

**Files:**

- Modify: `src/lib/media.ts`
- Modify: `src/Admin.tsx`
- Create: `src/lib/media-upload.test.ts`
- Modify: `scripts/smoke-admin-content-media.mjs`

**Step 1: Write failing tests for the upload planner**

Test the planner independent of canvas/Storage:

- JPEG, PNG, WebP, and AVIF input remains accepted up to 10 MB;
- hero/menu/gallery choose the agreed derivative widths;
- smaller sources are not enlarged;
- the returned variant map contains public URL/path pairs and the original remains separate;
- cleanup receives every successfully uploaded path after a later failure.

**Step 2: Implement media preparation and upload**

- Decode once with browser-supported image APIs and correct orientation.
- Produce WebP blobs with the specified dimensions and approximately 0.82 quality.
- Store originals at versioned paths such as `<folder>/<uuid>/original.<extension>`.
- Store menu/gallery derivatives at versioned sibling paths with `cacheControl: "31536000"`.
- For hero, upload versioned original plus derivatives, then replace `hero/current-640.webp`, `hero/current-1280.webp`, and `hero/current-1920.webp` using `cacheControl: "0"`/ETag revalidation.
- Return one `UploadedMediaSet` only after all required uploads complete.
- Delete newly created versioned objects if any later upload, database save, or variant operation fails; never delete the current hero until the new set is ready.

**Step 3: Integrate the admin save flow**

- Extend `Admin.tsx` mappers, drafts, settings payloads, menu payloads, and gallery payloads to save variants.
- Keep the existing upload-from-machine form control and clear Serbian/English errors.
- Display the selected optimized preview, but do not expose original-only paths on public page views.
- Keep the existing removal behavior, now removing the old original and all old versioned derivatives after successful replacement.

**Step 4: Run targeted validation**

Run:

```powershell
npm run test -- src/lib/media-upload.test.ts
node --env-file=.env.local scripts/smoke-admin-content-media.mjs
```

Expected: hero/menu/gallery upload smoke proves original plus variants exist in the permitted Storage folders, metadata saves, and failures leave no orphan test paths.

## Task 4: Backfill existing media before public preload references ship

**Objective:** Ensure stable hero variants and metadata exist for the seeded local and production content before the public app requests them.

**Files:**

- Create: `scripts/backfill-media-variants.mjs`
- Modify: `scripts/seed-demo-content.mjs`
- Modify: `README.md`

**Step 1: Implement an authenticated idempotent backfill**

- Read existing hero, menu, and gallery originals or current public media.
- Generate/upload missing derivative paths only; do not overwrite administrator-provided originals.
- Populate variant JSON maps and current hero paths.
- Emit counts only, never print API keys or object URLs containing credentials.
- On a row update failure, clean only new paths created by that run.

**Step 2: Make demo seed use the same media service contract**

Update `seed-demo-content.mjs` so fresh local/production demo data already includes variant metadata and the three stable current hero objects.

**Step 3: Validate local backfill**

Run:

```powershell
node --env-file=.env.local scripts/backfill-media-variants.mjs
node --env-file=.env.local scripts/backfill-media-variants.mjs
```

Expected: first run reports migrated assets; second run reports zero changes; the active hero has all three `hero/current-*.webp` objects.

**Step 4: Commit checkpoint**

Stage only media upload/backfill/admin/doc/test files. Commit message: `feat: optimize admin media uploads for responsive delivery`.

## Task 5: Build the lightweight public bootstrap client and cache

**Objective:** Remove Supabase JS from the public initial route and render cached, localized public data safely.

**Files:**

- Create: `src/lib/public-content.ts`
- Create: `src/lib/public-content.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/lib/supabase.ts` only if needed to keep the SDK admin-only

**Step 1: Write failing public-content tests**

Cover:

- the client performs one `/rest/v1/rpc/public_site_bootstrap` request with the publishable key header;
- malformed/old cache entries are ignored;
- a valid versioned cache renders before a refresh;
- fresh bootstrap replaces cache without resetting the selected language;
- failed fetch uses cache, then safe static copy with no fabricated categories.

**Step 2: Implement the client**

- Use native `fetch`, not `@supabase/supabase-js`, for public bootstrap.
- Use an `AbortController` timeout and a schema-versioned localStorage record.
- Normalize RPC payloads into current `SiteSettings`, `MenuCategory`, `AdminMenuItem`, and `AdminGalleryItem` types in one mapper.
- Keep existing localized filtering and all current fallback copy.
- Import `supabase` only from `Admin.tsx` and media/admin code so Vite can keep it out of the public entry chunk.

**Step 3: Replace the four-query effect**

In `LandingPage`, replace the `Promise.all` Supabase effect with cache-then-revalidate bootstrap loading. Preserve unmount protection and do not set default filters while data is missing.

**Step 4: Validate**

Run:

```powershell
npm run test -- src/lib/public-content.test.ts src/lib/content.test.ts
npm run build
```

Expected: one public bootstrap endpoint is used; the build reports a smaller public index chunk while the admin remains a separate lazy chunk.

## Task 6: Preload the stable hero and add the delayed Babuska loader

**Objective:** Start the hero image during HTML parsing and show a non-blocking branded fallback only for slow/failing media.

**Files:**

- Modify: `index.html`
- Modify: `src/App.tsx`
- Modify: `src/styles/tokens.css`
- Create: `src/components/HeroLoader.tsx`
- Add: optimized loader asset under `src/assets/brand/`

**Step 1: Write loader tests**

Test delayed visibility, successful decode, 4 s fallback, image error, and reduced-motion behavior. Assert that the rendered loader never changes hero content dimensions.

**Step 2: Add early connection and responsive preload**

- Add `preconnect` for `%VITE_SUPABASE_URL%` and a responsive `link rel="preload" as="image"` for the stable hero variants.
- Ensure Vite HTML environment replacement leaves local and production builds valid.
- Use the same exact stable paths in the React `<picture>` `srcSet` and `sizes` attributes.

**Step 3: Implement HeroLoader and hero image state**

- Place `HeroLoader` in the bottom-right ornament slot only after 400 ms.
- Keep all hero copy and CTA visible from first paint.
- Use `onLoad` plus `HTMLImageElement.decode()` before setting `ready`.
- Fade the photo with opacity only; do not animate layout properties.
- On failure/4 s timeout retain the existing cream background and remove the loader.
- Implement burgundy/gold steam and breathing with CSS; include `prefers-reduced-motion` static rules.

**Step 4: Validate visual behavior**

Run a focused Playwright test at 360 px and 1440 px with intercepted slow hero, successful hero, and failed hero responses. Assert loader timing, no CTA shift, and identical hero source across SR/EN.

## Task 7: Defer below-the-fold work and optimize critical fonts

**Objective:** Reduce competition with first viewport assets without changing the approved visual system.

**Files:**

- Modify: `src/App.tsx`
- Create: `src/components/DeferredSection.tsx`
- Modify: `src/index.css`
- Modify: `index.html`

**Step 1: Remove blocking font imports**

- Remove CSS `@import` requests for Google Fonts.
- Add `preconnect` hints for the Google Fonts stylesheet/font origins and load the combined family stylesheet directly from `index.html`.
- If the final waterfall still shows fonts materially delaying LCP, download only the used Cyrillic WOFF2 faces from the existing Google Fonts source, add local `@font-face` declarations with `font-display: swap`, and preload only first-viewport regular faces.

**Step 2: Split and defer non-critical code**

- Defer menu-book and gallery/lightbox rendering with an IntersectionObserver boundary. Move them to `React.lazy` chunks only if the post-Supabase-removal public index chunk remains above the 120 KB gzip ceiling.
- Reserve the existing section dimensions and present lightweight non-animated placeholders until each chunk is ready.
- Add `loading="lazy"`, `decoding="async"`, dimensions, and responsive sources to menu/gallery images.

**Step 3: Validate bundle and layout**

Run `npm run build` and the responsive smoke. Confirm admin still loads after public SDK separation, and no horizontal overflow, heading change, or menu-book height regression occurs.

## Task 8: Add performance smoke, production migration, and release validation

**Objective:** Make the loading guarantees observable and safely deploy the schema/media/frontend sequence.

**Files:**

- Create: `scripts/smoke-performance.mjs`
- Modify: `scripts/smoke-responsive.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.codex/plans/2026-08-28_220000-hero-performance-loader-implementation.md`

**Step 1: Implement measurable browser assertions**

Use Playwright performance entries to assert:

- the hero request begins before public bootstrap completes;
- the selected responsive hero is the only hero candidate downloaded;
- loader is absent on a normal local/production connection and appears on an intentionally delayed image;
- stable dimensions prevent layout shift;
- the public index chunk stays at or below 120 KB gzip;
- returned hero byte sizes meet 100 KB mobile / 220 KB desktop targets where source permits.

**Step 2: Run local validation ladder**

Run, in order:

```powershell
npm run typecheck
npm run test
npm run build
npm run smoke:content
npm run smoke:admin-content-media
npm run smoke:responsive
npm run smoke:performance
```

**Step 3: Deploy safely**

1. Apply and lint the new Supabase migration locally with explicit `--local`; apply production only during an explicitly authorized deploy.
2. Run `backfill-media-variants.mjs` against production using non-browser credentials.
3. Verify active hero current paths before pushing/deploying preload changes.
4. Push the finished code to `main`; wait for Vercel `Ready`.
5. Run `SITE_URL=https://babuska.vercel.app npm run smoke:responsive` and `npm run smoke:performance`.
6. Log final start times, LCP, bundle size, and Storage variant checks in the implementation plan.

**Step 4: Commit checkpoints**

Create focused commits after Tasks 2, 4, 6, and 8. Before each, stage only task files, inspect `git diff --cached`, scan staged content for keys/passwords, and leave unrelated user work untouched.

## Risks and mitigations

- Browser-side WebP generation may fail for a rare source: retain the original, show a localized error, and do not alter current public media.
- The first preload could point to a missing object: production backfill runs before the frontend deployment, and the image component has a branded fallback.
- Stable hero paths are intentionally revalidated to show admin changes promptly; immutable cache applies only to versioned derivatives.
- Moving the SDK out of public code could accidentally break admin: the admin route and upload smoke are explicit release gates.
- Font substitution can cause small visual differences: use Cyrillic-capable files and compare first-viewport screenshots against the approved design before release.

## Local implementation result — 2026-08-28

- Implemented responsive media metadata, the policy-respecting `public_site_bootstrap()` RPC, browser-side WebP generation, stable hero objects, native public fetch/cache, early responsive preload, delayed Babuska loader, below-fold deferral, direct font loading, and automated performance assertions.
- Local migration and database lint passed. The bootstrap smoke currently reports 5 active categories, 30 published menu items, and 11 existing published gallery rows; no user-owned gallery records were removed to force the older demo count.
- Local backfill created the responsive variants and was idempotent on a second run. Stable hero sizes are 40,812 B at 640 px and 199,398 B at 1920 px.
- `npm run check` passed with 24 unit tests. Public JavaScript is 85,303 B gzip; Supabase JS remains isolated in the lazy admin chunk.
- Responsive smoke passed at 360, 390, 768, 1024, 1366, and 1440 px plus the mobile admin route.
- Performance smoke passed: final local run observed the hero request starting at 66 ms and bootstrap completing at 1,090 ms. Normal, delayed, timeout, failed-image, no-layout-shift, and SR/EN source invariants passed.
- Production migration, production backfill, Git push, and Vercel deployment were intentionally not run in this implementation turn; they remain the ordered release steps in Task 8 and require an explicit deploy request.
