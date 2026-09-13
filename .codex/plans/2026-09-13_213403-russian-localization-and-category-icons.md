# Russian Localization and Category Icons Implementation Plan

> **For Codex:** Execute this plan task-by-task in the current task. The repository does not provide the referenced `subagent-driven-development` skill, and the user did not request delegation.

**Goal:** Add optional Russian content and a complete Russian public UI (`РУ`), make vodka use the whiskey icon, and give unknown categories an ordinary-glass fallback.

**Architecture:** Extend the current column-per-language model with optional `*_ru` columns, keep the public bootstrap function `SECURITY INVOKER`, and centralize language selection/fallback in `src/lib/content.ts`. Move icon classification into a small tested module so both vodka equivalence and the future-category fallback are explicit. The admin UI remains Serbian/English while its content editor supports Serbian, English, and Russian.

**Tech Stack:** React 19, TypeScript 5.7, Vite 8, Vitest, Supabase/PostgreSQL, Playwright smoke scripts.

---

## Current context and assumptions

- The approved design is in `docs/superpowers/specs/2026-09-13-russian-localization-and-category-icons-design.md`.
- Russian input is optional. In public Russian mode, a missing Russian value falls back to Serbian.
- The language token shown to users and administrators is Cyrillic `РУ`, never Latin `RU`.
- Russian fixed UI copy is written in Russian Cyrillic. Official international brand names may keep their established spelling.
- Existing Serbian/English validation and required-field behavior must not regress.
- `public.public_site_bootstrap()` remains stable, `SECURITY INVOKER`, with explicit execute grants. No RLS or storage policy changes are needed.
- The latest bootstrap definition currently lives in `supabase/migrations/20260913180000_add_babuska_life_stories.sql`; the new migration must preserve its `stories` payload.
- Supabase's current documentation still recommends `SECURITY INVOKER` for database functions and creation of migrations through `supabase migration new`. No reviewed 2026 breaking change affects adding columns to existing exposed tables or replacing this RPC.

## Task 1: Add failing localization and icon tests

**Objective:** Lock down Russian selection, Serbian fallback, and category-icon behavior before implementation.

**Files:**

- Modify: `src/lib/content.test.ts`
- Create: `src/lib/category-icons.test.ts`

**Step 1: Extend localization fixtures with Russian fields**

Add `nameRu`, `descriptionRu`, and `factRu` to test category/menu fixtures, then add assertions equivalent to:

```ts
expect(localizeCategory(category, "ru")?.name).toBe("Кофе");
expect(localizeCategory({ ...category, nameRu: "" }, "ru")?.name).toBe("Кафа");
expect(localizeMenuItem(item, "ru")).toMatchObject({
  name: "Эспрессо",
  description: "Крепкий кофе.",
});
expect(localizeMenuItem({ ...item, nameRu: "" }, "ru")?.name).toBe("Еспресо");
```

Also verify that empty Russian optional fields fall back to the Serbian optional value when one exists, otherwise remain empty.

**Step 2: Add icon classifier tests**

Create `src/lib/category-icons.test.ts` with cases for `Виски бурбон`, `Whisky / Bourbon`, `Вотка`, `Водка`, `Vodka`, and Russian `Водка`. Assert that all whiskey/vodka variants return `"spirits"`. Assert an unknown value such as `"Будућа категорија"` returns `"glass"` and that an empty category also returns `"glass"`.

**Step 3: Run focused tests and confirm failure**

Run:

```powershell
npx vitest run src/lib/content.test.ts src/lib/category-icons.test.ts
```

Expected: failure because `Lang` has no `ru`, Russian fields are absent, and `category-icons.ts` does not exist.

**Step 4: Commit after the implementation in Tasks 2-3 turns these tests green**

Do not commit a deliberately broken tree. Include these tests in the localization/core commit after Tasks 2-3.

## Task 2: Extend the frontend content model and fallback rules

**Objective:** Represent optional Russian content and localize it consistently without hiding older records.

**Files:**

- Modify: `src/lib/content.ts`
- Modify: `src/lib/content.test.ts`

**Step 1: Add Russian fields to types**

Extend `Lang` to `"sr" | "en" | "ru"`. Add:

- `MenuCategory.nameRu`
- `AdminMenuItem.nameRu`, `descriptionRu`, `factRu`
- `AdminGalleryItem.altRu`
- all `SiteSettings` localized `Ru` counterparts

**Step 2: Generalize localized text selection**

Replace the two-value helper with an explicit three-value helper while retaining the existing call-site name:

```ts
export function localizedText(
  sr: string,
  en: string,
  ru: string,
  lang: Lang,
  optional = false,
): string | null {
  const requested = lang === "sr" ? sr : lang === "en" ? en : ru;
  if (lang === "ru" && !requested.trim()) {
    return isValidLocalizedText(sr, "sr", optional) ? sr.trim() : null;
  }
  return isValidLocalizedText(requested, lang, optional)
    ? requested.trim()
    : lang === "ru" && isValidLocalizedText(sr, "sr", optional)
      ? sr.trim()
      : null;
}
```

Update `isValidLocalizedText` so `en` accepts non-empty text, while both `sr` and `ru` require Cyrillic for non-empty localized prose. Preserve the documented allowance for official brand names by applying strict Cyrillic validation only to admin prose/category fields or, if the current validator is reused for names, allow mixed-script brand values in Russian while still requiring Cyrillic for fully translated fixed copy. Keep the behavior explicit in tests.

**Step 3: Update category and menu localization**

Pass all three values from `localizeCategory` and `localizeMenuItem`. For Russian optional description/fact fallback, prefer Russian, then Serbian, then empty.

**Step 4: Run the content tests**

Run:

```powershell
npx vitest run src/lib/content.test.ts
```

Expected: all localization tests pass.

## Task 3: Extract and correct category icon classification

**Objective:** Make vodka and whiskey share the spirits icon and unknown categories use an ordinary glass.

**Files:**

- Create: `src/lib/category-icons.ts`
- Modify: `src/App.tsx`
- Test: `src/lib/category-icons.test.ts`

**Step 1: Implement the classifier**

Move `CategoryIconKind` and `categoryIconKind` from `src/App.tsx` into `src/lib/category-icons.ts`. Add `"glass"` to the union. Normalize with a locale-independent lowercase operation and recognize common spellings including `вотка`, `водка`, `vodka`, `виски`, `whisky`, `whiskey`, and `bourbon`. Return `"glass"` instead of `"coffee"` when no category matches.

**Step 2: Render the ordinary-glass SVG**

Keep the existing `spirits` SVG unchanged so vodka is visually identical to whiskey. Add a neutral tumbler/drinking-glass SVG branch for `kind === "glass"`; do not reuse the coffee cup branch.

**Step 3: Run focused tests**

Run:

```powershell
npx vitest run src/lib/category-icons.test.ts
```

Expected: all icon cases pass.

**Step 4: Commit Tasks 1-3**

```powershell
git add src/lib/content.ts src/lib/content.test.ts src/lib/category-icons.ts src/lib/category-icons.test.ts src/App.tsx
git commit -m "feat: add Russian localization fallback and glass icons"
```

## Task 4: Create the additive Supabase migration

**Objective:** Add optional Russian columns, seed known Russian content, and expose it through the existing public RPC.

**Files:**

- Create through CLI: the exact `supabase/migrations/*_add_russian_localization.sql` path printed by `supabase migration new`
- Reference: `supabase/migrations/20260913180000_add_babuska_life_stories.sql`

**Step 1: Discover the installed CLI and migration command**

Run:

```powershell
npx supabase --version
npx supabase migration new --help
```

Expected: the CLI reports its version and documents `migration new <name>`.

**Step 2: Generate the migration file**

Run:

```powershell
npx supabase migration new add_russian_localization
```

Use the exact path printed by the CLI for all later edits.

**Step 3: Add optional Russian columns**

Use `text` columns that permit `null`/empty values:

```sql
alter table public.menu_categories add column if not exists name_ru text;
alter table public.menu_items
  add column if not exists name_ru text,
  add column if not exists description_ru text,
  add column if not exists fact_ru text;
alter table public.gallery_items add column if not exists alt_ru text;
```

Add Russian `site_settings` columns for every localized hero/footer field listed in the design. Add non-empty checks that allow `null`, matching the current Serbian/English convention.

**Step 4: Backfill current known content**

- Populate Russian defaults for all site settings with natural Russian Cyrillic.
- Populate `name_ru` for the 16 canonical menu categories.
- Populate Russian display names for the canonical 105 Canva menu rows. Official brand names may retain their official spelling; generic terms and descriptors must be translated into Russian.
- Populate known demo gallery Russian alt text where the row can be matched safely.
- Do not overwrite a non-empty administrator-entered Russian value; use `where nullif(trim(name_ru), '') is null` or `coalesce(nullif(trim(...), ''), <default>)`.

**Step 5: Replace the bootstrap RPC safely**

Copy the latest function shape, preserve `stories`, add every `*_ru` key, use `security invoker`, and change the hardened search path to:

```sql
security invoker
set search_path = ''
```

Fully qualify every table as `public.<table>`. Retain:

```sql
revoke all on function public.public_site_bootstrap() from public;
grant execute on function public.public_site_bootstrap() to anon, authenticated;
```

**Step 6: Apply and inspect locally**

First check command syntax with `--help`, then run the appropriate local migration command (normally `npx supabase migration up --local`). Query the RPC through the existing public smoke script or REST call and verify `name_ru`, `alt_ru`, Russian settings, and `stories` are all present.

**Step 7: Commit the migration**

```powershell
git add supabase/migrations
git commit -m "feat: add optional Russian content columns"
```

## Task 5: Parse, cache, and test Russian bootstrap content

**Objective:** Keep the public API model aligned with the new database payload.

**Files:**

- Modify: `src/lib/public-content.ts`
- Modify: `src/lib/public-content.test.ts`

**Step 1: Add failing payload assertions**

Extend `rawBootstrap` with Russian values and assert normalized output such as:

```ts
expect(result.categories[0]?.nameRu).toBe("Кофе");
expect(result.items[0]?.nameRu).toBe("Эспрессо");
expect(result.settings.heroTitleRu).toContain("Москвы");
```

Keep public menu descriptions/facts blank if that remains the product's intentional privacy/content rule, but parse their Russian name fields and all Russian settings/gallery alt values.

**Step 2: Update normalization**

Add Russian defaults to `emptySiteSettings`, map all `*_ru` settings, categories, items, and gallery values, and update cache validation to require the new normalized keys.

**Step 3: Invalidate old caches**

Increment `CACHE_VERSION` from `3` to `4`. Keep the storage key stable; the version gate already invalidates older shapes.

**Step 4: Run focused tests**

Run:

```powershell
npx vitest run src/lib/public-content.test.ts
```

Expected: RPC mapping, cache rejection, and cache round-trip tests pass.

**Step 5: Commit**

```powershell
git add src/lib/public-content.ts src/lib/public-content.test.ts
git commit -m "feat: parse Russian public content"
```

## Task 6: Add Russian content editing to the existing admin

**Objective:** Let administrators enter optional Russian content while keeping the admin interface itself bilingual.

**Files:**

- Modify: `src/Admin.tsx`

**Step 1: Extend language switching and empty drafts**

- Change `ContentLanguage` to `"sr" | "en" | "ru"`.
- Add a third `РУ` button to `LanguageSwitch` with a Serbian/English accessibility label describing Russian content.
- Add Russian values to `completed`; an empty Russian marker is allowed and must not block save.
- Add all Russian fields to `emptyItem`, `emptyCategory`, `emptyGallery`, and `emptySettings` through shared types/defaults.

**Step 2: Extend reads and mappings**

Add `name_ru`, `description_ru`, `fact_ru`, and `alt_ru` to Supabase selects and map them to camel-case fields. `site_settings.select("*")` already returns new columns; extend `SETTINGS_FIELDS` so payload serialization includes them.

**Step 3: Generalize localized field keys**

Use a suffix map instead of binary ternaries:

```ts
const CONTENT_SUFFIX = { sr: "Sr", en: "En", ru: "Ru" } as const;
const suffix = CONTENT_SUFFIX[contentLanguage];
```

Use it for settings, item, category, gallery, select-option, and record-preview values.

**Step 4: Extend writes without changing required fields**

- Add `name_ru` to category payloads.
- Add `name_ru`, `description_ru`, and `fact_ru` to menu payloads.
- Add `alt_ru` to gallery payloads.
- Include all Russian site settings through `settingsPayload`.
- Keep Serbian and English required checks unchanged; never require a Russian value.
- If Russian validation is applied, run it only when the Russian field is non-empty and allow official brand names as agreed.

**Step 5: Run type checking**

Run:

```powershell
npm run typecheck
```

Expected: no missing Russian properties or unsafe dynamic keys.

**Step 6: Commit**

```powershell
git add src/Admin.tsx
git commit -m "feat: allow optional Russian content editing"
```

## Task 7: Translate the complete public interface

**Objective:** Make every user-visible homepage string and accessibility label work in Russian Cyrillic.

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/StoryViewer.tsx`

**Step 1: Add the Russian static dictionary**

Add `T.ru` with natural Russian translations for all keys present in `T.sr`/`T.en`, including navigation, hero defaults, menu/card hints, book controls, gallery, footer, filters, and fallback book categories.

**Step 2: Replace binary language branches**

Remove public `lang === "sr" ? ... : ...` branches. Use dictionary keys or a small settings selector that returns Russian, then Serbian, then the Russian static default. Cover:

- hero and footer settings;
- header/home `aria-label`;
- mobile navigation open/close label;
- hero image alt and loader label;
- Babuska Life label/open action;
- remaining menu, gallery, social, and navigation accessibility text found through a final `rg` audit.

**Step 3: Add the language option correctly**

Render `(["sr", "en", "ru"] as Lang[])`, show labels through `{ sr: "СР", en: "EN", ru: "РУ" }`, and add a Russian Cyrillic accessibility label such as `"Русский язык"`.

Set document language through a map:

```ts
const HTML_LANG = { sr: "sr-Cyrl", en: "en", ru: "ru" } as const;
document.documentElement.lang = HTML_LANG[lang];
```

**Step 4: Localize database and bundled fallback content**

- Pass `nameRu`/`altRu` to localization helpers.
- Add Russian alt text to bundled gallery fallback entries.
- Add Russian translations for the bundled 50-item fallback book (`bookNamesRu`) and use them in `BookItem` when `lang === "ru"`.
- Confirm category icon classification receives the currently localized category name and recognizes all three languages.

**Step 5: Translate StoryViewer**

Add `copy.ru` for close, previous, next, and progress labels.

**Step 6: Audit for untranslated binary branches**

Run:

```powershell
rg -n 'lang === "sr"|\["sr", "en"\]|English language|View of Moscow|Loading the hero image|Babuska Life' src/App.tsx src/components/StoryViewer.tsx
```

Expected: no public binary language logic remains except intentional name-selection logic that explicitly includes `ru`.

**Step 7: Run unit tests and build**

```powershell
npm run test
npm run build
```

Expected: all tests pass and Vite produces `dist` without TypeScript errors.

**Step 8: Commit**

```powershell
git add src/App.tsx src/components/StoryViewer.tsx
git commit -m "feat: add Russian public site translation"
```

## Task 8: Keep seed and synchronization workflows trilingual

**Objective:** Ensure future seeded/synchronized content retains Russian translations.

**Files:**

- Modify: `supabase/seed.sql`
- Modify: `scripts/seed-demo-content.mjs`
- Modify: `scripts/sync-canva-menu.mjs`

**Step 1: Extend static seed settings**

Add Russian site-setting columns and values to the seed upsert. Add Russian alt text for seeded gallery rows if present.

**Step 2: Extend demo seed tuples and payloads**

Add Russian category names, menu names, descriptions/facts where seeded, and gallery alt text. Include the matching `*_ru` payload fields and selects.

**Step 3: Extend the canonical Canva synchronizer**

- Change category tuples to include `nameRu`.
- Change all 105 row tuples to include `nameRu` before price.
- Add Russian values to write payloads and final verification selects.
- Validate that non-brand Russian text contains Cyrillic and that all rows/categories have non-empty `nameRu` in this canonical dataset, even though arbitrary admin Russian input remains optional.
- Preserve existing images, IDs, deletion guards, aliases, prices, and ordering.

**Step 4: Run the dry run**

```powershell
npm run sync:canva-menu
```

Expected: dry-run reports exactly 105 valid rows across 16 categories.

**Step 5: Commit**

```powershell
git add supabase/seed.sql scripts/seed-demo-content.mjs scripts/sync-canva-menu.mjs
git commit -m "feat: seed Russian menu translations"
```

## Task 9: Extend smoke coverage for Russian persistence and rendering

**Objective:** Verify Russian values survive admin writes, appear in the public RPC, and select correctly in the browser.

**Files:**

- Modify: `scripts/smoke-content.mjs`
- Modify: `scripts/smoke-admin-content-media.mjs`
- Modify: `scripts/smoke-public-bootstrap.mjs`
- Modify: `scripts/smoke-responsive.mjs`

**Step 1: Extend content write/read smoke assertions**

Add Russian test values for temporary categories, menu items, gallery alt text, and settings. Include their `*_ru` columns in writes/selects and assert exact round trips through RLS-authorized admin operations and the public bootstrap.

**Step 2: Exercise the Russian public switch**

In the responsive/browser smoke flow, click the visible `РУ` control and assert:

- `document.documentElement.lang === "ru"`;
- Russian navigation text is visible;
- a Russian or Serbian-fallback menu item remains visible;
- the public layout still meets existing overflow checks on mobile and desktop.

**Step 3: Run local smoke checks when Supabase is available**

```powershell
npm run smoke:public-bootstrap
npm run smoke:content
npm run smoke:admin-content-media
npm run smoke:responsive
```

Expected: all relevant smoke checks pass. If the local stack is unavailable, report that clearly and retain passing unit/build evidence.

**Step 4: Commit**

```powershell
git add scripts/smoke-content.mjs scripts/smoke-admin-content-media.mjs scripts/smoke-public-bootstrap.mjs scripts/smoke-responsive.mjs
git commit -m "test: cover Russian content flows"
```

## Task 10: Update project documentation and perform final validation

**Objective:** Document trilingual behavior and finish with a clean, evidence-backed build.

**Files:**

- Modify: `README.md`

**Step 1: Update README language and seed descriptions**

Describe Serbian Cyrillic as the default, English and Russian as public alternatives, Russian as optional admin-entered content with Serbian fallback, and canonical/demo seed data as trilingual.

**Step 2: Run the complete required check**

```powershell
npm run check
```

Expected: TypeScript, Vitest, and production build all pass.

**Step 3: Run database verification if the local stack is available**

Check CLI help before invoking version-specific commands, then verify migration history and query `public.public_site_bootstrap()` as an anonymous/public caller. Confirm Russian keys are present and no private/admin-only data was added to the payload.

**Step 4: Inspect the final diff**

```powershell
git diff --check
git status --short
git diff --stat HEAD~1
```

Review all touched files for accidental Latin `RU`, untranslated public binary branches, omitted `*_ru` mappings, or changes to unrelated code.

**Step 5: Commit documentation/final cleanup**

```powershell
git add README.md
git commit -m "docs: describe Russian localization"
```

## Risks and tradeoffs

- Adding 105 canonical Russian names is verbose and duplicates known menu data between the synchronizer and migration. It is deliberate: the migration upgrades existing deployments immediately, while the synchronizer keeps future canonical updates stable.
- Russian and Serbian are both Cyrillic. Tests must verify selected values, not only script presence.
- The current public normalizer intentionally hides menu descriptions/facts. Adding their database/admin Russian fields should not accidentally expose legacy placeholder copy.
- Replacing `public_site_bootstrap()` must preserve the newly added `stories` field and grants. This is the highest integration-risk step.
- Three language controls may be tight on the 360px header. Responsive smoke coverage is required after adding `РУ`.
- Optional fallback must be centralized; duplicating `ru || sr` ternaries across the UI would create inconsistent behavior.

## Completion criteria

- Public users can select `СР`, `EN`, or `РУ`, and Russian mode contains no untranslated fixed English/Serbian UI labels.
- Russian database content appears when present; missing Russian content falls back to Serbian without hiding records.
- Admin users can edit optional Russian content but cannot switch the admin UI itself to Russian.
- Vodka and whiskey render the same spirits icon in supported spellings.
- Unknown categories render an ordinary glass.
- The migration preserves RLS/grants and the `stories` payload.
- `npm run check` passes; applicable local Supabase smoke tests pass or their environmental blocker is reported.
