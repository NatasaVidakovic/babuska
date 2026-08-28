# Café Babuska — category management update

## Scope

1. Keep the hero background's viewport dimensions and focal point fixed when switching Serbian and English, so only copy changes.
2. Replace the fixed “Discover New Tastes” filters with `menu_categories` records managed by the administrator.
3. Require every menu item to reference an administrator-created category; do not render a default “All” or hard-coded category filter.
4. Create a local-only administrator account after the migration, without storing service credentials in frontend code or Git.

## Backend change

- Add `menu_categories` with unique name, ordering, active status, timestamps and RLS.
- Backfill any existing `menu_items.category` strings, attach each item through `category_id`, then remove the legacy text column.
- Restrict deletion of a category that still contains menu items.

## Frontend/admin change

- Load categories and public items from Supabase, choose the first active category by sort order, and render its items.
- Render filters from the fetched category list only.
- Add admin category create/edit/delete controls and a category selector in the beverage form.

## Validation

- Apply the migration locally.
- Confirm public REST queries return category data and the landing page/API remain healthy.
- Build and typecheck the Vite application.
