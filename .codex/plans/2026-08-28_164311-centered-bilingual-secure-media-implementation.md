# Café Babuska Centered Bilingual Secure Media Implementation Plan

> **For Codex:** Implement this plan task by task, keeping each change small and verified.

**Goal:** Deliver a centered, responsive Café Babuska site with Serbian Cyrillic as the default language, complete English alternatives, admin-managed bilingual content, and securely stored Supabase media for hero, menu, and gallery content.

**Architecture:** Keep the Vite/React single-page application and Supabase backend. Introduce a shared content-localization layer rather than spreading language fallbacks through components. Store editable content and content media in Supabase; retain the supplied fixed brand logo and wordmark as bundled static assets. Use migration-safe additive database changes, then migrate existing demo/external media into Supabase Storage.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Supabase Postgres/Auth/Storage, Vitest, Node smoke scripts, Vercel.

---

## Task 1 (DONE): Establish typed bilingual content and testable locale selection

**Files:**

- Create: `src/lib/content.ts`
- Create: `src/lib/content.test.ts`
- Modify: `package.json`
- Modify: `src/App.tsx`

1. Add a pure locale helper that returns only complete Serbian Cyrillic or English records; do not render legacy Latin values as a fallback.
2. Define shared bilingual types for categories, menu items, and editable settings, including `sr` and `en` fields.
3. Add Vitest and a focused unit test matrix for Serbian defaulting, English selection, incomplete translations, and empty optional fields.
4. Replace duplicate local selection logic in public rendering with the helper.
5. Verify with `npm run test -- --run` and `npm run typecheck`.

## Task 2 (DONE): Add an additive Supabase migration for bilingual content and hero media

**Files:**

- Create: `supabase/migrations/20260828170000_centered_bilingual_secure_media.sql`
- Modify: `supabase/seed.sql`

1. Add `name_sr` and `name_en` to `menu_categories`.
2. Add `name_sr`, `name_en`, `description_sr`, `description_en`, `fact_sr`, and `fact_en` to `menu_items`.
3. Add `hero_image_url` and `hero_image_storage_path` to `site_settings`.
4. Backfill compatible rows only when the result is valid Serbian Cyrillic or English content; leave ambiguous legacy Latin rows for the data migration instead of exposing mixed script.
5. Keep existing admin write protection and split public-read policies from admin-read/write policies so public Storage URLs require no role function invocation.
6. Confirm migration applies from a clean local Supabase reset.

## Task 3 (DONE): Make media uploads support hero, menu, and gallery safely

**Files:**

- Modify: `src/lib/media.ts`
- Modify: `src/Admin.tsx`
- Modify: `src/lib/supabase.ts`

1. Extend allowed upload folders to `hero`, `menu`, and `gallery`; keep UUID-based object paths and existing image MIME/size validation.
2. Add upload lifecycle handling: delete a newly uploaded object when form submission fails or when an administrator replaces/cancels a pending image.
3. Preserve previous media until a replacement record is saved, then delete the superseded storage object when safe.
4. Display accessible upload progress/error states without requiring a pasted URL; retain an explicit URL field only when needed for a pre-existing legacy record migration.
5. Run `npm run typecheck`.

## Task 4 (DONE): Create reproducible bilingual demo content and migrate content images

**Files:**

- Create: `scripts/migrate-content-media.mjs`
- Modify: `scripts/seed-demo-content.mjs`
- Modify: `scripts/smoke-admin-content-media.mjs`
- Modify: `scripts/smoke-content.mjs`

1. Update demo seed data to create at least 30 ordered menu items using bilingual category/item fields and no visible test marker in public menu text.
2. Populate hero, gallery, and menu media through Supabase Storage paths rather than new external image URLs.
3. Build an idempotent authenticated migration script that downloads an existing external URL, validates it, uploads it to the correct Storage folder, updates the database only after upload succeeds, and removes a newly uploaded object if the database update fails.
4. Add smoke assertions for category filter labels, category-ordered menu-book pages, bilingual public values, hero image, gallery image, and storage paths.
5. Run scripts against local Supabase only; never store service-role keys in frontend code.

## Task 5 (DONE): Refactor public data loading around a single localized view model

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/lib/content.ts`

1. Select bilingual columns and hero media fields from Supabase.
2. Convert database records to localized public view models before rendering filters, discovery cards, and the menu book.
3. Render only categories/items complete for the active language; maintain active-filter validity when switching language.
4. Keep menu-book entries grouped and ordered by `menu_categories.sort_order`, then item ordering.
5. Use Supabase hero media when configured, with the approved bundled fallback only for an empty/unconfigured local database.
6. Verify runtime with `npm run build` and local smoke tests.

## Task 6 (DONE): Rebuild the admin content experience in Serbian Cyrillic and English

**Files:**

- Modify: `src/Admin.tsx`
- Modify: `src/styles/tokens.css`
- Create or modify: `src/lib/admin-i18n.ts`

1. Introduce an admin-interface dictionary: Serbian Cyrillic is the default, English is the alternative, and no Serbian Latin labels remain.
2. Keep a separate content-language selector for editing Serbian Cyrillic and English values, with clear completion indicators.
3. Add editable homepage sections/text, hero image upload, footer address/contact/hours, and social links in both languages where relevant.
4. Add image upload controls and previews to hero, menu items, and gallery entries.
5. Simplify the admin visual system: no unnecessary form/table/button borders, restrained brand backgrounds, consistent typography, aligned labels/actions, and clear empty/error/saving states.
6. Verify the admin with `npm run typecheck` and the full content/media smoke test.

## Task 7 (DONE): Apply one centered responsive visual system to the public site

**Files:**

- Modify: `src/index.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/App.tsx`

1. Define shared `site-container`, `site-section`, and `site-section-heading` primitives with consistent width, gutters, title font, vertical rhythm, and responsive clamps.
2. Center hero, discovery, menu-book, gallery, visit, and footer content on the same layout axis; remove redundant divider lines between discovery and menu book.
3. Rebuild desktop header as full-width three-column layout: logo at the left viewport gutter, navigation geometrically centered, language switcher at right; provide the equivalent compact mobile layout.
4. Correct hero wordmark sizing around its transparent source canvas so its visual mark and red “Истражи мени” CTA remain visible on short desktop and mobile viewports without changing the supplied wordmark image.
5. Balance discovery cards on wide screens, maintain symmetric category/filter behavior, and keep the menu book capped at its intended readable width.
6. Use only brand colors derived from the provided logo: deep red primary, warm cream background, dark ink text, muted gold accent.
7. Build with `npm run build`.

## Task 8 (DONE): Add responsive and visual regression checks

**Files:**

- Create: `scripts/smoke-responsive.mjs`
- Modify: `README.md`
- Modify: `package.json`

1. Test public and admin routes at 360×640, 390×844, 768×700, 1024×600, 1366×768, and 1440×900.
2. Assert no horizontal overflow, visible hero CTA, header alignment, centered section bounds, working language switch, category filtering, menu-book ordering, and gallery rendering.
3. Capture local evidence under `.codex/qa/` (ignored from git) and document the commands.
4. Run `npm run check` that combines typecheck, unit tests, build, and smoke scripts.

## Task 9 (DONE): Validate Vercel and Supabase operational readiness

**Files:**

- Modify: `.env.example`
- Modify: `README.md`
- Modify: `vercel.json` only if routing/build checks require it

1. Document exactly which public Supabase Vite variables are needed in Vercel and which admin/service credentials must remain server/script-only.
2. Verify no service-role key is imported by client-side code and that Storage bucket policies permit anonymous public reads only.
3. Document deploy sequence: apply migration, run authenticated media migration and seed, create admin user, set Vercel environment variables, deploy, and smoke-test production.
4. Do not modify remote Supabase/Vercel resources without explicit authorization and credentials.

## Task 10 (DONE): Final verification and main-branch handoff

**Files:**

- Modify: relevant files only from tasks above

1. Run `npm run check`, local Supabase status, and both admin/content media smoke scripts.
2. Inspect the dirty worktree and stage only the files changed for this feature; preserve unrelated user work.
3. Create focused conventional commits on `main` only after verification.
4. Check whether `origin/main` exists with `git ls-remote --heads origin main` before pushing; if it does, use a normal non-force `git push origin main`.
5. Report the local URLs, test results, Supabase migration name, and any deploy action that still requires user authorization.

---

## Validation record

- `npm run check:local` — PASS: TypeScript, 4 unit tests, production build, bilingual/RLS/content smoke, hero-menu-gallery Storage smoke, and 6 responsive public viewports plus mobile admin.
- `npx supabase db lint --local --level warning` — PASS: no schema errors.
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` — PASS: no unused TypeScript symbols.
- Local data — PASS: 5 active bilingual categories, 30 published bilingual items, all published menu/gallery media in Supabase Storage, hero under `hero/`, and no Latin letters in Serbian category/menu/gallery fields.
- Browser inspection — PASS: no console errors; homepage image remains unchanged when switching SR/EN; admin labels are accessible; public and admin interfaces default to Serbian Cyrillic.
