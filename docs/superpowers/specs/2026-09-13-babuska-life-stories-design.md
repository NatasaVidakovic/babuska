# Babuska Life Stories — Design

## Purpose

Give the administrator a simple way to publish the current atmosphere of Café
Babuska: one or more photos that appear as a small, inviting story entry point
on the home page. Each published photo remains public for exactly 24 hours.
This is a lightweight, branded story experience rather than a social network:
there are no accounts, reactions, captions, or viewing analytics.

## Chosen approach

Three options were considered:

1. A single rotating banner would be smallest to build, but would overwrite the
   previous image and would not let visitors move between photos.
2. A gallery section would support many photos, but it would not communicate
   that the content is current or temporary.
3. A story queue is the chosen approach. It supports unlimited photo uploads,
   gives every photo its own 24-hour lifetime, and opens in a familiar,
   focused viewer without changing the existing gallery.

## Public experience

- The home hero shows no story control when there are no active stories.
- When at least one story is active, a circular preview appears beneath the
  hero copy and above the `Истражи мени` call to action. The most recently
  published photo is the cover.
- Its slim burgundy-and-gold ring has a restrained continuous motion. Under
  `prefers-reduced-motion` the ring is static and stories do not auto-advance.
- Selecting it opens a full-screen viewer. Photos are displayed with
  `object-fit: contain`, so the complete image remains visible. The viewer has
  a close button, progress segments, previous/next tap zones, keyboard Left,
  Right and Escape controls, and a five-second automatic advance per image.
- Stories are ordered newest first. The viewer closes after the final image.

## Administrator experience

- `Живот Бабушке` is the first tab in the administrator panel.
- A single clearly labelled photo picker accepts multiple files. It processes
  the selected files one after another, so the browser may select any number
  of images without an application-imposed limit.
- Uploading immediately creates a published story with an expiry exactly 24
  hours later. The list shows its thumbnail, publication time, expiry time and
  remaining time.
- Each row offers `Објави поново` (which resets the 24-hour window) and
  `Избриши`. Expired stories are retained only for administrator management;
  they never appear publicly.
- Existing menu, hero, and gallery media flows remain unchanged.

## Data, storage, and access control

- Add `public.story_items` with a UUID id, original image URL and storage path,
  responsive image variants, ordering metadata, `published_at`, `expires_at`,
  publication state, and audit timestamps.
- Store originals and generated responsive derivatives in the existing private
  write / public-read `cafe-media` bucket under `stories/<story-id>/`. The
  existing image pipeline supplies appropriately sized variants.
- Row-level security permits anonymous reads only where a story is published
  and `expires_at` is in the future. Authenticated administrators are checked
  through the existing `public.is_admin()` function for all story management.
- Storage policies allow the same administrator check for the `stories/`
  prefix only. Public visitors receive URLs only through the active public
  bootstrap payload; they cannot upload, edit, or enumerate admin media.
- A selective index on publication state, expiry and ordering supports the
  home-page query.

## Application integration

- Extend `public.public_site_bootstrap()` with an active `stories` array and
  add typed parsing/normalisation to the public content cache. Increment the
  cache version so old sessions cannot retain a stale payload shape.
- Add story types beside the existing gallery and media types. Reuse the
  project’s existing image upload, derivative, URL, cleanup, translation, and
  admin UI primitives instead of introducing a second media implementation.
- Use the established brand palette: burgundy as the primary ring and control
  colour, with a muted gold accent. The component must remain compact on
  mobile and never obscure the hero heading, description, or menu button.

## Failure handling and accessibility

- A failed upload reports the individual filename and leaves successfully
  uploaded files intact. The administrator can retry only the failed file.
- If deleting storage after deleting a database row fails, show a non-blocking
  cleanup warning, matching the existing gallery behaviour.
- If the public bootstrap request cannot load stories, the homepage simply
  omits the optional entry point; the rest of the page remains usable.
- All controls have Serbian Cyrillic and English accessible labels, visible
  focus states, and keyboard operation. The modal traps neither scrolling nor
  focus permanently and always exposes an explicit close control.

## Verification

- Unit tests cover public-payload normalisation, expiry filtering, story order,
  and responsive media plans.
- Database verification confirms RLS prevents anonymous access to expired or
  unpublished stories and prevents non-admin writes.
- Smoke testing covers multi-file upload, expiry display, republishing,
  deletion, desktop and mobile hero placement, viewer navigation, and reduced
  motion behaviour.
