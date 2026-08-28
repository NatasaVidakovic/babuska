# Dynamic categories and stable hero design

## Goal

Keep the hero image crop identical when switching Serbian and English, and let administrators fully control the categories shown as filters in “Otkrij nove ukuse”.

## Hero behaviour

The hero section has a viewport-derived fixed height rather than content-derived minimum height. Its background keeps one URL, `cover` sizing and a centered focal point. Switching language only changes text and cannot alter the section’s measured height or image crop.

## Category data model

`menu_categories` stores one admin-created category with a name, display order and active status. `menu_items.category_id` references it. Existing menu rows are migrated by deriving categories from their current category text, so existing administrator content remains usable. There are no seeded/default categories.

## Public menu

The Discover New Tastes filter reads active categories from Supabase. It renders no All/default filter. The first active category is selected after data loads; no category means no filters and no menu cards. Cards are fetched from Supabase and only display when their referenced category is selected.

## Admin

The admin area gets a Categories tab for creating, renaming and removing categories. The drink form only allows selecting a persisted category and requires one before saving. Removing a category that still has drinks is rejected by the database foreign-key constraint.

## Verification

Run TypeScript checks and a production build, apply the migration to local Supabase, and verify the REST API exposes an empty category list until an administrator creates categories.
