# Admin editor and dessert preview — 2026-11-03

## Implemented
- Stacked Serbian, English and Russian inputs for categories, menu item names/descriptions/facts, gallery descriptions, homepage text and footer text.
- Completeness badges on forms and saved records, including the item's category translations. Missing translations stay optional and generate persistent, dismissible warnings after a successful save.
- Incomplete saved records remain open for correction; completing their translations updates the original record.
- Cyrillic validation, saving state, native required-field feedback, menu search across all three languages, category filtering, automatic scroll to the editor and category item counts.
- Contact-only saves preserve page content. Existing brand colours and fonts retained.
- Menu terminology covers drinks and desserts; dessert categories use a cake icon.
- Idempotent dessert data migration: Dessert / Десерт / Десерты, with Руске капе, Птичје млијеко (Птичье молоко), Руска краљевска торта, all priced at 0 KM as requested.

## Validation
- npm run check: TypeScript, 54 unit tests and production build.
- Browser regression command: SITE_URL=http://127.0.0.1:4302 npm run smoke:admin-editor (set SITE_URL using the host shell).
- Browser checks use isolated API fixtures, never real Supabase writes. Checked stacked inputs; missing translation warnings when the translation service is unavailable; warning visibility while scrolling; updates without duplicates; invalid Cyrillic; dessert search/edit; content/contact separation; gallery fields; English interface; all five forms at 360, 768 and 1440 px.
- Desktop/mobile screenshots are in the ignored screenshots/ subdirectory.

## Local review
- http://127.0.0.1:4303/admin?tab=menu — signed-in local demo editor.
- http://127.0.0.1:4303/ — public menu using the same demo records.
- Start with node .tmp-admin-preview/server.mjs. Text edits persist in the ignored .tmp-admin-preview/data.json. This loopback-only Vite preview explicitly displays a demo banner; it uses simulated Auth/Data API responses. Automatic translations and photo uploads require the actual Supabase services.
- The existing Docker engine does not answer health/API requests. Actual Supabase migration, authentication, storage and RLS integration were not verified. No Docker restart was performed without permission. The migration is prepared for the real database and has not been applied to production.
- Production was not deployed or changed.

## Supplied dessert photos
- Attachment 1: Птичје млијеко → pticje-mlijeko.webp.
- Attachment 2: Руске капе → ruske-kape.webp.
- Attachment 3: Руска краљевска торта → ruska-kraljevska-torta.webp.
- Saved the provided photographs and 480/960 px WebP variants in public/images/desserts/. Updated only the corresponding local demo image fields; all three prices remain 0 KM.
- Verified all three admin images load and visually confirmed their association in the public menu using the existing in-app browser. Production build passed.
- scripts/sync-dessert-images.mjs defaults to dry-run; --preview updates only the local demo. --apply is prepared for the real Supabase Storage upload after publication approval; it was not executed.

## Publication preservation checks
- User authorized push and additive production menu changes.
- Production baseline captured before publication: 113 menu items, 22 categories, 12 gallery items, one settings record and one story. Full local snapshots are excluded from Git.
- The dessert migration is insert-only, skips existing records, and appends sort positions. It contains no UPDATE, DELETE, TRUNCATE or DROP statements.
- Production additions use fresh record IDs and immutable uploaded photo paths. The local demo dataset is excluded from Git and is never copied to production.
- Compare every original record against the captured baseline after publication; only one category and three dessert rows may be added.
