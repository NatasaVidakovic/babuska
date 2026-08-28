# Café Babuska hero performance and loader design

## Status

Approved design for implementation planning. This document covers frontend loading performance, admin-side image optimization, and a non-blocking Babuska hero loader. It does not authorize implementation by itself.

## Problem

The production homepage currently renders the header and hero copy before the hero photograph. The image URL is obtained only after the main React bundle runs and the `site_settings` Supabase request completes.

Measured production baseline on a 1440 × 900 viewport:

- DOM content loaded: approximately 444 ms.
- `site_settings` request starts: approximately 591 ms.
- hero image request starts: approximately 837 ms.
- current hero: 1920 × 1080 JPEG, approximately 414 KB.
- main JavaScript: approximately 139 KB gzip / 477 KB decoded.
- current Storage response requires revalidation rather than providing an effective long-lived browser cache.

The visible result is a cream background followed by a late photograph. The loader must only appear when an immediately prioritized image still takes noticeably long to load.

## Goals

- Start downloading the correct hero image during initial HTML parsing, before React and Supabase content requests complete.
- Keep the header, hero copy, textual wordmark, and CTA immediately usable.
- Serve a device-appropriate image rather than a 1920 px image to every viewport.
- Preserve the original administrator upload and generate visually lossless WebP derivatives automatically.
- Use a small branded loader only after a genuine delay.
- Reduce initial JavaScript, font, image, and request costs across the public site.
- Preserve Serbian Cyrillic as the default language, complete English translations, current layout, and the rule that language switching never changes the hero image.
- Preserve the existing Supabase RLS and Storage folder restrictions.

## Non-goals

- Migrating the application to Next.js, SSR, or a new hosting platform.
- Requiring a paid Supabase image transformation feature.
- Blocking the whole viewport behind a splash screen.
- Replacing the approved homepage composition or textual wordmark.
- Applying visible lossy compression or changing brand colors.

## Chosen architecture

### Image optimization pipeline

The administrator continues to select a local image. Before upload, a browser-side image service will decode the file once, preserve the original file, and generate responsive WebP derivatives.

Target derivative sets:

| Usage | Widths | Quality target |
| --- | --- | --- |
| Hero | 640, 1280, 1920 px | WebP approximately 82% |
| Menu item | 480, 960 px | WebP approximately 82% |
| Gallery | 640, 1280, 1920 px | WebP approximately 82% |
| Loader/header logo | rendered asset variants appropriate to display size | lossless or visually lossless WebP with alpha |

Images smaller than a target width are not enlarged. Aspect ratio and orientation are preserved. The original is retained in Storage for later reprocessing and is not sent to ordinary public views.

Versioned menu and gallery objects receive long-lived immutable caching. The active hero receives predictable public paths so it can be referenced from initial HTML:

- `hero/current-640.webp`
- `hero/current-1280.webp`
- `hero/current-1920.webp`

The original hero remains at a versioned administrator path. Active hero derivatives use `Cache-Control: no-cache` with ETag revalidation so an administrator update does not leave visitors with a permanently stale homepage; immutable versioned originals and menu/gallery derivatives use a one-year cache lifetime. Variant generation completes before active hero paths are replaced. Database settings are updated only after all required uploads succeed.

The database stores the original path and a typed variant map. Existing rows remain readable during migration. Failed versioned uploads are cleaned up. A failed active-path replacement is retried and reported clearly to the administrator; the settings row is not advanced until the active set is complete.

### Immediate hero request

`index.html` will include:

- `preconnect` for the configured Supabase project origin;
- a responsive image preload with `imagesrcset` and `imagesizes` for the stable hero paths;
- high fetch priority for the hero request.

The React hero uses the exact same URLs and selection rules through a `<picture>`/`srcset`, so the browser reuses the preload instead of issuing a second download. The rendered image has explicit dimensions, `fetchPriority="high"`, asynchronous decoding, and an opacity-only reveal. Hero layout dimensions exist before the image loads, preventing cumulative layout shift.

The hero image is independent of the content-language state. Changing SR/EN updates text only.

### Public content data path

The public landing page will no longer import the full Supabase JavaScript client. A small public content client will call one database RPC that returns a typed bootstrap payload containing:

- public site settings;
- active menu categories in administrator order;
- published menu items in category/item order;
- published gallery records in administrator order.

The RPC returns only public columns and respects the existing public-read rules. The publishable key remains the only browser credential. Auth, realtime, Storage mutation, and service-role functionality stay outside the public bundle.

The last valid bootstrap payload is cached locally with a schema version. A repeat visit can render cached content immediately and revalidate it in the background. Fresh data replaces cached data without resetting the selected language or hero image. Invalid, incompatible, or partially translated records are rejected by the existing localization rules.

The Supabase SDK remains available to the lazy-loaded admin route. Removing it from the public path should materially reduce the main bundle.

### Below-the-fold loading

- Menu and gallery images retain explicit aspect ratios and use native lazy loading.
- Responsive `srcset` is used for menu and gallery derivatives.
- The menu-book implementation is split from the initial bundle and loaded shortly before its section approaches the viewport.
- Gallery/lightbox code is split from the initial bundle.
- Reserved section geometry prevents layout shifts while code or images arrive.
- Existing content order, category symmetry, menu pagination, and fixed page heights remain unchanged.

### Fonts and brand assets

Philosopher and Lora will be self-hosted as Cyrillic-capable WOFF2 files. Only weights and styles used by the public first viewport are preloaded. All faces use `font-display: swap`; non-critical weights load normally.

The source PNG logo and wordmark remain preserved. Public display variants are optimized for their actual rendered sizes and use explicit width/height attributes. The loader reuses an optimized transparent Babuska asset rather than creating another large request.

## Babuska hero loader

The loader is a delayed fallback, not the initial presentation.

State flow:

1. The browser starts the hero preload during HTML parsing.
2. React renders the header and complete hero copy immediately.
3. No loader is visible for the first 400 ms.
4. If the selected hero has not decoded after 400 ms, a small Babuska loader fades into the existing bottom-right ornament slot; the ornament is temporarily replaced rather than overlapped.
5. When the image decodes, it fades to its approved background opacity over approximately 350 ms and the loader fades out over approximately 180 ms.
6. If the image fails or has not decoded within four seconds, the loader stops and the branded cream fallback remains.

The Babuska mark has a subtle breathing motion. Two thin steam strokes rise from the cup in the approved burgundy and muted-gold palette. Animation uses CSS transforms and opacity only. It does not move hero copy, CTA, ornaments, or page geometry.

For `prefers-reduced-motion: reduce`, the mark is static and the hero image appears without animated transition. The loader is decorative because all page controls remain usable; it does not repeatedly announce loading to assistive technology.

## Error handling

- A failed responsive derivative generation leaves the current production image untouched and presents a Serbian/English admin error.
- A partial versioned upload is removed before retry.
- Public bootstrap failure uses the last valid cached payload; without cache, safe built-in copy is shown and no invented/default category filters are added.
- Hero failure retains the correctly sized branded fallback and removes the loader after the timeout.
- Image decode failures and HTTP failures follow the same fallback state.
- A missing responsive variant falls back to the next available larger optimized variant, then to the configured original only as a last resort.
- A stale cache schema is discarded rather than partially interpreted.

## Deployment sequence

1. Add the variant metadata and public-bootstrap RPC migration.
2. Apply and lint the migration in local Supabase.
3. Backfill responsive variants for existing production hero, menu, and gallery assets.
4. Verify the stable hero paths before deploying HTML preload references.
5. Deploy the optimized frontend to Vercel.
6. Run production responsive, language, image, admin, and performance smoke tests.

This order prevents a deployed preload from pointing to a missing Storage object.

## Performance budgets

- Hero request begins within 100–150 ms of navigation under normal uncached test conditions.
- Hero request begins before the public settings/bootstrap response finishes.
- Mobile hero derivative: at most 100 KB target.
- Desktop hero derivative: at most 220 KB target.
- Main public JavaScript: 90–110 KB gzip target, with an enforced ceiling of 120 KB gzip.
- Loader is not shown when the hero decodes within 400 ms.
- No measurable layout shift caused by hero, loader, fonts, or deferred sections.
- Target LCP below 1.5 seconds on an unthrottled desktop connection and below 2.5 seconds with 150 ms RTT, 1.6 Mbps download, 750 Kbps upload, and 4× CPU slowdown.

Budgets are regression thresholds, not permission to reduce visible quality. If a source image cannot meet the byte target without visible degradation, dimensions and encoding settings are reviewed rather than silently lowering quality.

## Validation

### Automated

- Unit tests for variant width selection, no-upscale behavior, MIME validation, and variant-map serialization.
- Unit tests for loader delay, successful decode, timeout, failure, and reduced-motion states.
- Database/RLS tests for the public bootstrap RPC and exclusion of drafts/inactive records.
- Admin smoke tests covering original plus derivative upload, database save, replacement, and cleanup on failure.
- Responsive Playwright tests on the existing six viewport sizes.
- Network assertions that the hero starts before bootstrap completion and that only the selected responsive hero is downloaded.
- Assertions that language switching preserves the hero source.
- Bundle-size and image-size budget checks in the build/CI workflow.

### Manual and production

- Empty browser cache and warm-cache visits.
- Fast desktop, representative mobile, and throttled slow connection.
- Successful hero, delayed hero, HTTP failure, and decode failure.
- SR Cyrillic and English public views.
- New hero uploaded through production admin and visible without stale mixed variants.
- Visual comparison at mobile, tablet, desktop, and ultrawide widths.
- Lighthouse/Web Vitals verification after deployment, with LCP, CLS, transferred bytes, and request order recorded.

## Acceptance criteria

- The hero photograph no longer visibly waits for the public Supabase content query before starting.
- On a normal connection the image appears without showing the loader.
- On a delayed connection the Babuska loader appears only after the delay and never blocks content.
- All administrator uploads preserve originals and create the required optimized derivatives.
- Public pages use responsive optimized media while the admin remains fully functional.
- Production passes the existing functional smoke suite plus the new performance budgets.
