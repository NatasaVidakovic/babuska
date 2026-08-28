# Café Babuska centered bilingual site and secure media design

## Goal

Create one centered, symmetric and responsive visual rhythm across the Café Babuska public site and administrator interface while preserving the approved Figma character and Babuska branding. Serbian is the default language and uses Cyrillic throughout. English is a complete alternative interface and content language. Product, gallery and hero images are stored in Supabase Storage with public reading and administrator-only writes; the primary logo and wordmark remain bundled frontend brand assets.

## Confirmed decisions

- Use a shared layout system rather than isolated section-specific spacing fixes.
- Keep the current React/Vite/Supabase architecture and approved visual direction.
- Serbian is the default on both `/` and `/admin`.
- Serbian interface copy and Serbian content use Cyrillic only. English uses Latin script. Language codes such as `СР` and `EN` are the only intentional mixed-script tokens.
- Categories, menu-item names, descriptions and optional facts have separately stored Serbian and English values.
- Hero, menu-product and gallery media use Supabase Storage.
- The primary Babuska logo and textual wordmark remain local build assets for reliable first paint and deployment independence.
- The `cafe-media` bucket remains publicly readable because this is a static Vercel frontend. Insert, update and delete operations remain restricted to authenticated administrators by Storage RLS.

## Visual system

The existing Babuska palette remains authoritative:

- Canvas: warm ivory `#F7F2E9`.
- Surface: `#FFFDFC`.
- Primary text: coffee ink `#251510`.
- Secondary text: muted taupe `#75665E`.
- Primary action: Babuska red `#8C1513`.
- Dark action state: `#68100F`.
- Restrained accent: antique gold/red accent already defined by the project tokens.

Philosopher remains the display face for the hero and section headings. Lora remains the body, navigation, label and control face. All public section headings use one component/class and therefore the same family, responsive size, weight, line height, letter spacing and bottom margin. Heading copy follows sentence case:

- Serbian: `Откриј нове укусе`, `Мени`, `Галерија`.
- English: `Discover new tastes`, `Menu`, `Gallery`.

The visual signature remains the cathedral hero with the textual Café Babuska wordmark. Decorative corner ornaments stay subordinate to content and never determine section alignment.

## Shared page axis and section rhythm

Every public section uses the same outer and inner primitives:

- `site-section` controls responsive vertical padding.
- `site-container` centers content, applies shared responsive gutters and limits width.
- `site-section-heading` controls heading typography and the exact heading-to-content gap.

The content axis is centered at every viewport. Section inner widths may differ only when their content requires it: the discovery list and gallery can use the wider site container, while the menu book uses a narrower reading width. Their center point must remain identical.

Recommended responsive values:

- Global gutter: `clamp(1.25rem, 3vw, 2rem)`.
- General section padding: `clamp(4.5rem, 8vw, 7rem)`.
- Heading size: `clamp(2rem, 3.2vw, 2.75rem)`.
- Heading-to-content gap: `clamp(2.25rem, 5vw, 3.5rem)`.
- Wide content maximum: `80rem` (`1280px` at the root font size).
- Reading/book maximum: `65rem` (`1040px` at the root font size).

There is no horizontal divider between `Откриј нове укусе` and the menu book. They read as one continuous menu journey separated by balanced whitespace. Other dividers are kept only where they clarify a real content boundary; redundant hairlines are removed.

## Header

The desktop header uses a full-width three-part grid with only the shared responsive edge gutter. It does not inherit the centered `80rem` content maximum. Its center column is mathematically centered in the viewport rather than centered in the leftover space:

1. Logo at the far-left responsive gutter.
2. `Мени`, `Галерија`, `Посјета` centered as one navigation group.
3. Language control at the far-right responsive gutter.

The logo and language control do not shift the central navigation. At mobile widths the logo remains far left, the language control remains far right and the menu toggle sits immediately to the left of the language control. The opened mobile navigation uses full-width, comfortable targets and preserves the same centered labels.

Header acceptance rules:

- No overlap at 360px and wider.
- No horizontal document overflow.
- Mobile header height remains compact; desktop height remains visually aligned with the current design.
- Language and menu controls have at least a 40px visible interaction area, preferably 44px where space allows.
- The fixed header must not cover anchored section headings; anchors account for header height through scroll margin.

## Hero

The hero remains centered horizontally and vertically, but its content may never be clipped by a fixed-height container. The current wordmark PNG contains a large transparent canvas; that intrinsic 512×768 canvas must not participate as a 320×480 layout box.

The implementation uses a fixed-ratio wordmark viewport whose image is positioned inside without changing the original brand asset. The wrapper contributes only the height of the visible lettering to normal flow. This avoids editing or degrading the wordmark while removing transparent-space layout distortion.

Hero spacing uses responsive gaps instead of unrelated margins. A short-height media query compacts the wordmark, heading, paragraph and action gaps without reducing readability. The red `Истражи мени` / `Explore the menu` button remains inside the initial hero on 360×640, 768×700, 1024×600 and 1366×768 as well as larger viewports.

Switching languages changes text only. The hero image URL, element box, `object-fit`, `object-position` and focal point remain identical between Serbian and English.

## Discovery categories and menu cards

Categories are sourced only from active Supabase records. There is no `All`, `Све` or other hardcoded default category.

The category control uses centered wrapping with equal item widths and equal row/column gaps. On wide screens all categories occupy a balanced row when space permits. On narrower screens they wrap symmetrically; an incomplete final row remains centered rather than left-aligned. Long English category names may wrap inside their own centered item without changing adjacent target sizes.

The first active category is selected after data loads. Menu cards use one column on mobile and two equal columns on large screens. Image, title, description, optional fact and price align to a consistent baseline. The local demo marker is not rendered as customer content; demo facts must be authored copy or empty.

## Menu book

The menu book follows the same page axis and section-heading component as the discovery section. It receives localized menu items grouped by localized category name and sorted by category `sort_order`, then item `sort_order`.

The existing book page corners, spine and navigation remain. Previously removed top line-and-diamond ornaments remain removed. The book has no section-top border separating it from discovery. Mobile navigation targets receive accessible names even when their visible content is only an arrow.

## Gallery and footer

The gallery uses the shared heading and container primitives. Uploaded photos continue to use a responsive editorial grid. Empty galleries render a clean empty state. The lightbox index is reset if the selected record disappears or changes order.

Because administrators may upload mixed aspect ratios, previews show the crop that will appear publicly. Product photos remain `cover`. Gallery uploads clearly communicate that images are cropped to fill grid cells; meaningful logo artwork is not inserted as a gallery photograph.

The footer follows the same horizontal center axis. It is a symmetric three-column layout on desktop and a centered vertical stack on mobile. Address, brand logo and contact columns use equal visual weight. Headings use the shared display hierarchy; body text and links use the shared body scale.

## Bilingual data model

Add bilingual columns through a new forward-only migration; do not rewrite applied migrations.

### `menu_categories`

- `name_sr` — Serbian Cyrillic display name.
- `name_en` — English display name.
- Existing `name` is retained temporarily for migration compatibility and stable lookup, then treated as a legacy/internal value rather than public display content.

### `menu_items`

- `name_sr`, `name_en`.
- `description_sr`, `description_en`.
- `fact_sr`, `fact_en` (optional).
- Existing `name`, `description` and `fact` remain temporarily for migration compatibility and are no longer used by localized public rendering after bilingual data is complete.

### `site_settings`

Existing bilingual hero/footer columns remain. Add:

- `hero_image_url`.
- `hero_image_storage_path`.

### `gallery_items`

Existing `alt_sr` and `alt_en` remain authoritative.

The current local database contains demo content. The updated demo seed supplies authored Serbian Cyrillic and English values for all 30 drinks and five categories. Arbitrary future administrator records cannot be machine-translated reliably; the admin requires both Serbian and English fields before publishing a new or edited record.

## Public localization behavior

The public site defaults to `sr`. Its localized view model is created before rendering, so components receive final strings rather than choosing database columns throughout JSX.

- `sr` reads only `*_sr` values and the Serbian translation dictionary.
- `en` reads only `*_en` values and the English translation dictionary.
- A published category or menu item missing the active language value is omitted and reported in the admin as incomplete; the public page never falls back from Serbian to a Latin legacy field or from English to Serbian.
- Currency values, URLs and brand names remain language-neutral.
- `document.documentElement.lang` becomes `sr-Cyrl` or `en` when language changes.

## Administrator localization

The admin gets a global interface language switch in its top-right header. Default is Serbian Cyrillic. The complete interface dictionary covers:

- Login, loading, denied access and logout.
- Main tabs and page descriptions.
- Every label, placeholder, hint, empty state and confirmation.
- Save, cancel, edit, delete, upload and feedback messages.
- Validation and backend error framing.

Default Serbian tab labels are `Садржај`, `Категорије`, `Пића`, `Галерија`, `Контакт`. English provides complete equivalents.

A separate content-language control chooses which localized content values the administrator edits. It defaults to Serbian and is clearly labeled as content language so it is not confused with the interface-language switch. Category and menu forms require both languages before publishing. Lists display the active interface language and show an explicit incomplete-translation status when required values are absent.

## Supabase media flow and security

All runtime content media belongs to the `cafe-media` Supabase Storage bucket:

- `hero/<uuid>.<ext>`.
- `menu/<uuid>.<ext>`.
- `gallery/<uuid>.<ext>`.

JPEG, PNG, WebP and AVIF are accepted up to 10 MB. Object names use generated UUIDs; original local filenames are never trusted as object paths.

The bucket is publicly readable so a static Vercel SPA can display images without exposing a server secret. Storage policies allow insert, update and delete only when the authenticated user passes `public.is_admin()`. Policies also restrict writes to the three approved top-level folders. No service-role or secret key appears in frontend code, Vercel environment variables or browser requests.

The current hero, demo product and gallery external URLs are migrated through an authenticated maintenance script that downloads each existing source, validates it, uploads it into the appropriate folder and updates both URL and `storage_path`. The script is idempotent, skips already-owned Storage records and cleans up a new object if its database update fails.

Admin uploads use a pending-object lifecycle:

1. Validate and upload the new object.
2. Save the database record.
3. If database save fails, remove the newly uploaded object.
4. If replacement succeeds, remove the previous owned object.
5. If a form is cancelled before save, remove only the pending object.

## Error and empty-state behavior

- Public content query errors preserve the page shell and show no broken images.
- Missing categories render no fake filters or cards.
- Missing active-language values are hidden publicly and highlighted in admin.
- Upload failures retain form values and identify the failed image.
- A Storage cleanup failure does not misreport the database action; it produces a separate administrator warning.
- Hero image failure falls back to a branded canvas without changing content geometry.

## Validation strategy

### Automated data and security smoke tests

- Create and update bilingual category and menu records.
- Assert Serbian anonymous reads return Cyrillic fields and English reads return English fields.
- Assert records missing a required translation cannot be published through admin logic.
- Upload hero, menu and gallery images; verify URLs use the Supabase Storage endpoint and `storage_path` is populated.
- Verify anonymous writes fail.
- Verify non-admin writes fail.
- Verify admin writes work only in `hero`, `menu` and `gallery` folders.
- Replace and delete media, then verify no known owned object remains orphaned.
- Restore original content and settings in `finally` cleanup.

### Browser responsive checks

Test at 360×640, 390×844, 412×915, 767×700, 768×700, 768×1024, 820×1180, 1024×600, 1366×768, 1440×900 and 1920×1080.

For each relevant viewport assert:

- Header logo is left, navigation centered and language control right.
- Header controls do not overlap and the document has no horizontal overflow.
- Hero wordmark, title, description and CTA remain within the hero.
- SR/EN switch preserves hero image geometry.
- All public section headings share the same computed typography and margins.
- Discovery and book center points match within one pixel.
- Category rows are centered and evenly wrapped.
- The menu uses one or two equal columns as designed.
- The book, gallery and footer remain within the shared page axis.
- No console errors or broken images occur.

## Acceptance criteria

- Home, discovery, menu book, gallery and footer are centered on one consistent responsive axis.
- Section transitions use balanced whitespace; no redundant line exists between discovery and the book.
- Public section headings are typographically identical and symmetrically spaced.
- Header alignment remains correct from 360px through 1920px widths.
- The primary CTA is visible on every viewport in the validation matrix.
- Serbian public and admin interfaces contain Cyrillic UI/content only, except language codes and neutral brand/technical values.
- English public and admin interfaces are complete and contain no Serbian fallback copy.
- Dynamic categories and menu data switch languages with the interface.
- Hero, product and gallery content images are served from Supabase Storage.
- Logo and wordmark remain bundled assets and render without distortion.
- Storage writes are restricted to administrators and approved folders; no privileged key is exposed.
- TypeScript/build checks, bilingual CRUD/RLS/media smoke tests and responsive browser checks all pass.
