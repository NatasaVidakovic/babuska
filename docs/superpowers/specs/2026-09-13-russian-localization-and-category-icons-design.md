# Russian Localization and Category Icon Design

## Goal

Add Russian as the third public language for Café Babuska, allow administrators to enter optional Russian translations for all localized content, and make category icon selection predictable for vodka and future categories.

## User-facing behavior

- The public language switch offers `СР`, `EN`, and `РУ`.
- Selecting `РУ` changes all public navigation labels, headings, buttons, hints, status messages, accessibility labels, and other fixed interface copy to Russian written in Cyrillic.
- Menu categories, drink names, gallery alternative text, hero copy, and footer copy use their Russian database values when those values are present.
- Because Russian content is optional, a missing or invalid Russian value falls back to the corresponding Serbian value. Existing records therefore remain visible after deployment.
- International brand and product names may remain in their official spelling even when the surrounding public interface is Russian.
- The administrator interface remains available in Serbian and English only. Its content-language selector offers `СР`, `EN`, and `РУ`, and Russian fields are optional.

## Data model and content flow

The existing column-per-language model will be extended with nullable or empty-string-compatible Russian columns instead of introducing a translation table.

- `menu_categories`: `name_ru`
- `menu_items`: `name_ru`, `description_ru`, and `fact_ru`
- `gallery_items`: `alt_ru`
- `site_settings`: Russian variants for hero title, hero description, hero CTA, address heading and lines, opening-hours heading and lines, contact heading, and copyright

A forward-only Supabase migration will add these columns without changing existing Serbian or English content. It will also replace the public bootstrap function so Russian values are returned for settings, categories, menu items, and gallery entries. The frontend content normalizer, cache schema version, TypeScript types, and administrator read/write mappings will be updated together.

## Localization rules

The frontend language type becomes `sr | en | ru`. Localization helpers will select the requested value and apply these rules:

1. Serbian and English preserve their current validation behavior.
2. A non-empty Russian translation is displayed when selected.
3. An empty or invalid Russian translation falls back to the Serbian value.
4. Optional descriptions and facts remain optional and do not hide an otherwise valid item.

Russian public interface copy will use natural Russian Cyrillic, including the `РУ` language abbreviation. The HTML document language will follow the active choice (`sr`, `en`, or `ru`).

## Administrator behavior

The administrator UI language is unchanged. The content-language switch adds `РУ` and drives the existing localized inputs for:

- homepage and footer settings;
- category names;
- drink names, descriptions, and facts where present;
- gallery image descriptions.

Current save validation continues requiring Serbian and English fields where they are required today. Russian fields are never required. Existing forms, media upload behavior, publishing behavior, and permissions remain unchanged.

## Category icons

Icon classification will be isolated in an exported, testable helper.

- Vodka category names in Serbian, English, and Russian, including common spelling variants, map to the same icon kind as whiskey.
- Whiskey keeps its current icon.
- Recognized categories keep their current specialized icons.
- Any unrecognized current or future category maps to a neutral ordinary drinking-glass icon instead of a category-specific guess.

This fallback applies only when a menu item has no uploaded image and the category illustration is shown.

## Error handling and compatibility

- The migration is additive and does not remove or rewrite existing translations.
- Public Russian mode remains complete when older rows have no Russian content because Serbian is the explicit fallback.
- Cached content from the older schema will be invalidated by incrementing the cache version.
- Database and frontend changes will ship together so the public bootstrap payload and TypeScript model stay aligned.

## Verification

Focused automated tests will cover:

- Russian category and menu-item localization;
- Serbian fallback when Russian content is absent;
- optional Russian descriptions and facts;
- parsing Russian fields from the public bootstrap payload;
- vodka/whiskey icon equivalence across supported language spellings;
- the ordinary-glass fallback for unknown categories.

The complete `npm run check` command will then run TypeScript checks, unit tests, and the production build. If the local Supabase stack is available, the migration and relevant smoke flow will also be exercised.

## Out of scope

- Translating the administrator interface itself into Russian.
- Making Russian fields mandatory.
- Adding languages beyond Serbian, English, and Russian.
- Replacing the current localization model with a generic translation table.
