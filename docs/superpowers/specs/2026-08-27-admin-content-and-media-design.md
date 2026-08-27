# Café Babuska Admin Content and Media Design

## Goal

Extend the existing Café Babuska administration so an administrator can maintain the bilingual homepage introduction, all footer content, social and contact data, gallery images, and menu-product images. Uploaded images must come from the administrator's computer and be stored in Supabase Storage. The marked horizontal ornament above each menu-book page must be removed on all screen sizes.

## Confirmed Requirements

- Homepage and footer text is edited separately for Serbian and English.
- When a localized value is empty, the frontend uses the current hardcoded translation as a safe fallback.
- The administrator uploads product and gallery images from a local machine; the admin UI does not ask for an image URL.
- Gallery records can be added, edited, ordered, published, unpublished, and deleted.
- Footer address, contact details, social links, visible social handle, headings, and copyright text are editable.
- The menu book continues to show live menu items in category order.
- Only the two top horizontal line-and-diamond ornaments marked in the supplied screenshot are removed. Item separators, page corners, spine, pagination, and page-flip animation remain.

## Current Context

The application is React 19 with Vite and uses Supabase for authentication, Postgres data, row-level security, and media storage. `site_settings` currently contains only Instagram, Facebook, and TikTok links. Homepage and footer translations remain in the static `T` object in `src/App.tsx`. A `gallery_items` table and public `cafe-media` bucket already exist, but neither the admin nor the public gallery uses them. Menu items currently accept an external image URL.

The existing `cafe-media` bucket allows JPEG, PNG, WebP, and AVIF files up to 10 MB. Storage write policies already restrict insert, update, and delete operations to users for whom `public.is_admin()` returns true.

## Data Model

### Site settings

Extend the singleton `site_settings` row with explicit typed columns:

- `hero_title_sr`, `hero_title_en`
- `hero_description_sr`, `hero_description_en`
- `hero_cta_sr`, `hero_cta_en`
- `footer_address_heading_sr`, `footer_address_heading_en`
- `footer_address_line_1_sr`, `footer_address_line_1_en`
- `footer_address_line_2_sr`, `footer_address_line_2_en`
- `footer_address_line_3_sr`, `footer_address_line_3_en`
- `footer_contact_heading_sr`, `footer_contact_heading_en`
- `footer_copyright_sr`, `footer_copyright_en`
- shared `phone`, `email`, and `social_handle`
- existing `instagram`, `facebook`, and `tiktok`

Columns may be nullable. The public adapter merges database values with the existing translations so partial content never produces a blank section. The migration initializes fields with the current production copy where practical, preserving the current page immediately after deployment.

### Media ownership

Add nullable `storage_path` columns to `menu_items` and `gallery_items`. Existing external image URLs remain valid. New uploads save both the public URL and the object path. The path enables reliable cleanup when an image is replaced or its record is deleted without attempting to delete unrelated external URLs.

### Gallery

Use the existing `gallery_items` table with `image_url`, `storage_path`, `alt_sr`, `alt_en`, `is_published`, and `sort_order`. Public reads remain limited to published records; administrators can read all records through the existing policy.

## Admin Information Architecture

The admin navigation becomes:

1. `Sadržaj` — homepage introduction and footer copy, with a compact SR/EN language switch.
2. `Kategorije` — existing category management.
3. `Pića` — existing menu management with file upload replacing the URL field.
4. `Galerija` — image upload, localized alternative text, order, publication status, edit, and delete controls.
5. `Kontakt` — telephone, email, visible handle, and social profile URLs.

The seamless admin visual system remains: text tabs, no tab pills, borderless panels, quiet filled inputs, soft surfaces, and restrained status messages.

The content form is divided into `Homepage` and `Footer` sections. Changing the SR/EN switch updates only localized fields; shared contact fields are maintained in `Kontakt`. Save actions write complete, trimmed payloads to the singleton settings row and provide clear success or error feedback.

## Reusable Image Upload

A reusable `MediaUpload` component serves both menu and gallery forms. It provides:

- file picker and drag/drop target;
- local preview before upload;
- current saved-image preview while editing;
- JPEG, PNG, WebP, and AVIF validation;
- 10 MB client-side size validation matching the bucket;
- uploading, success, and error states;
- replace and remove actions;
- accessible labels and keyboard operation.

Storage object names use randomized UUIDs and preserve a validated extension. Product images use `menu/<uuid>.<ext>` and gallery images use `gallery/<uuid>.<ext>`. Database mutation happens only after a successful upload. If the database mutation fails, the newly uploaded object is removed. When replacing an image, the old owned object is removed only after the new database value is safely stored.

Deleting a menu or gallery record also deletes its owned Storage object. A failed object deletion does not hide a successful database result; it produces an explicit cleanup warning so the administrator knows that an orphan may remain.

## Public Data Flow

On homepage load, the application fetches site settings, menu categories, menu items, and published gallery items in parallel. Database settings are mapped into a localized content object and merged over the current `T` defaults. Switching languages changes text only and never changes the hero image source, dimensions, `object-fit`, or `object-position`.

The public gallery uses database rows ordered by `sort_order`, including localized alt text and the existing lightbox. When Supabase is not configured, the existing static gallery remains a development fallback. When Supabase is configured, the database is authoritative; current static images are seeded into `gallery_items` during setup so the gallery is not empty after migration.

The footer reads headings, address, contact details, handle, and social links from the merged settings model. Empty optional social URLs hide only the corresponding icon.

## Menu Book Ornament

Remove the `BookPageDivider` calls above the running head in both desktop and mobile page renderers, then remove the now-unused component. Do not alter item dotted leaders/separators, page numbers, corner ornaments, book spine, navigation controls, responsive sizing, or flip animation.

## Security and Validation

- Keep the bucket public for published image delivery.
- Keep upload/update/delete policies restricted to authenticated administrators.
- Do not expose a service-role key in frontend code or Vercel variables.
- Reject unsupported MIME types and files larger than 10 MB before upload.
- Sanitize file names by generating object names rather than trusting the local filename.
- Validate social/contact URL formats in the admin form and preserve blank optional values as `null`.
- Escape all text through React's normal rendering; do not render administrator content as HTML.

## Failure Handling

- Settings and gallery loading failures preserve current fallback text and show no broken image elements.
- Upload failures keep the form data intact and identify the failed file.
- Save actions are disabled while an upload or database write is in progress.
- A gallery with no published rows renders a clean empty state rather than a broken lightbox.
- The lightbox index resets safely when gallery records change or the selected image is deleted.

## Testing and Acceptance Criteria

Extend the existing content smoke test or add a focused media smoke script that:

1. signs in as the local administrator and verifies `is_admin()`;
2. updates SR and EN homepage/footer settings and verifies anonymous reads;
3. uploads a small generated test image to `menu/` and `gallery/`;
4. creates a temporary menu item and gallery item using the uploaded URLs and paths;
5. verifies anonymous users can read published records but cannot write;
6. verifies the public image URLs respond successfully;
7. updates and deletes the records and restores all original settings;
8. removes all temporary Storage objects.

Run `npm run typecheck`, `npm run build`, existing CRUD/RLS smoke tests, and the new media/content smoke test. Browser verification covers desktop and mobile layouts, both languages, unchanged hero crop after language switching, gallery order and lightbox navigation, footer links, product thumbnails, and the absence of the marked menu-book ornament.

The feature is accepted when every editable value is reflected on the public site without a redeploy, product/gallery images are uploaded from a computer and survive reload, unauthorized writes fail, replacement/deletion does not leave known owned objects behind, and the book retains its layout without the marked top lines.
