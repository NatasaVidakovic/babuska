# Seamless admin and dynamic book menu design

## Goal

Remove visible container, tab and logout-button borders from the administrator panel; seed 30 local-only demo menu items; and render the book menu from Supabase menu content in category/display order.

## Admin visual adjustment

- Admin tabs become text actions on the canvas. The selected tab uses Babuska red text and a subtle gold underline; there is no pill outline or enclosing tab border.
- Logout becomes a quiet text action, with red on hover and no button outline.
- Editor cards lose their visible outer border. Their separation comes from a slightly lighter surface, generous spacing and a soft ambient shadow.
- Record lists use spacing and alternating surface contrast rather than enclosing borders. Individual inputs retain a quiet fill and a gold focus ring so the form remains usable.
- No new color is introduced. The existing ivory, coffee ink, Babuska red and antique gold tokens remain the only non-semantic visual palette.

## Local demo data

- A `scripts/seed-demo-content.mjs` script authenticates as a local administrator, then upserts five named categories and six drinks per category: 30 menu items in total.
- Each demo record is identified by stable demo names, therefore repeated runs update the same records rather than duplicating them.
- The script is invoked through an npm command and uses local `.env.local` plus environment-supplied administrator credentials. It is not part of a migration or `supabase/seed.sql`, so production schema deployment never inserts demo content.

## Dynamic book menu

- `LandingPage` derives a book-item list from loaded `menuCategories` and `adminItems`.
- Category order is `menu_categories.sort_order`; item order is the existing ordered `menu_items` fetch. Each item carries the category display name.
- `BookMenu` receives this list as a prop. With Supabase configured it uses only dynamic content; without backend configuration it keeps the static Figma fallback for local design preview.
- The card filters, dynamic book and admin record list therefore share the same persisted content ordering.

## Validation

1. Run the local demo seed and assert five categories and 30 menu items are readable publicly.
2. Reload the public page and verify filters, a selected category card list, and the book menu all expose demo content in category order.
3. Confirm the admin and public production build passes TypeScript/build checks at desktop and mobile sizes.
