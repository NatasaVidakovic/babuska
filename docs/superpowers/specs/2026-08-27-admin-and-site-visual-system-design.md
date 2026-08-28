# Café Babuska admin and site visual system

## Objective

Polish the administrator panel and the full public site into one coherent Café Babuska interface without changing the approved Figma composition, brand imagery, content model, responsive behavior, or stable SR/EN hero crop. Validate the complete Supabase content flow with a repeatable smoke test.

## Visual direction

Use a restrained editorial system inspired by the existing Figma design. Decorative Russian motifs and brand imagery remain on the public site; forms and administrative controls use the same brand character with less ornament and stronger hierarchy.

### Design tokens

- Canvas: warm ivory `#F7F2E9`.
- Surface: near-white `#FFFDFC`.
- Primary text: coffee ink `#251510`.
- Secondary text: muted taupe `#75665E`.
- Brand action: Babuska red `#8C1513`.
- Accent: restrained antique gold `#B89452`, used for small dividers and focus details only.
- Border: warm neutral `#E3D7CA`.
- Success and error colors are semantic and appear only in feedback messages.
- Philosopher is limited to display and section headings. Lora is used for body copy, navigation, labels, controls and data rows.
- Typography uses a consistent responsive scale: display 48–56px, page title 32–40px, section title 28–36px, card title 17–20px, body 14–16px, label/meta 12–13px.
- Spacing follows an 8px base with 4px half-steps where needed. Main content widths, section padding, control heights, radii and shadows are reused instead of individually improvised.

## Administrator panel

The authenticated admin becomes a branded workspace rather than a series of inline-styled fragments.

- A compact 72px header contains the brand identity, public-site link and logout action.
- The content area uses a centered maximum width and responsive padding.
- Categories, drinks and social links use a quiet segmented navigation with an explicit active state.
- Each tab contains a clear page title, one-sentence instruction, a surface card for editing, and a visually separate list of existing records.
- Forms use visible labels, optional-field hints, consistent 44–48px control heights, accessible focus states and a two-column desktop grid that collapses to one column.
- Primary actions are solid red, secondary actions are neutral outlines, and destructive actions are visually quieter until hovered or focused.
- Success and error feedback uses an accessible status panel. Empty states explain the next action.
- Category and menu rows align image, main text, metadata and actions consistently. Long content truncates predictably on small screens.
- Login uses the same surface, type hierarchy and spacing, with the matryoshka mark as the visual anchor.

## Public site uniformity

The public page keeps its Figma sections, image choices, ornaments and content ordering. Styling changes are systematic rather than a redesign.

- Header, hero, menu filters, menu rows, book menu, gallery and footer share the same color and typography tokens.
- Section containers use consistent maximum widths, vertical spacing and responsive gutters.
- Headings use one hierarchy; body and metadata sizes are consistent across cards and footer content.
- Interactive controls share focus, hover and transition behavior.
- Menu rows align image, copy and price using stable spacing at all breakpoints.
- The hero remains viewport-sized with a fixed centered image focal point; switching SR/EN changes text only.
- Dynamic category filters remain sourced only from Supabase. No “All” or hard-coded fallback category is added.

## Component boundaries

- `src/styles/tokens.css` defines brand colors, typography, spacing, radii, shadows and reusable control classes.
- `src/Admin.tsx` retains data orchestration but renders small, named admin sections and shared field/button primitives.
- `src/App.tsx` consumes the same visual tokens. Refactoring is limited to sections touched by the uniformity work; business behavior remains unchanged.
- Supabase schema and RLS remain authoritative. UI feedback displays backend failures without pretending that a write succeeded.

## Smoke test

The test uses a uniquely named temporary data set so it cannot be confused with real content.

1. Authenticate with the local administrator account and verify `is_admin()` returns true.
2. Create a temporary category and confirm it appears as a public “Otkrij nove ukuse” filter.
3. Create a temporary menu item in that category and confirm its image, title, description, fact and price appear under the selected filter.
4. Update the item and confirm the public card reflects the change.
5. Update Instagram, Facebook and TikTok links and confirm the public footer uses the saved values.
6. Check the public page and admin at desktop and mobile viewport sizes, including SR/EN switching and the unchanged hero image geometry.
7. Confirm unauthenticated writes are rejected by RLS.
8. Remove only the temporary item and category created by the test. Restore the previous social-link values captured before the test.
9. Run TypeScript checks and the production build and report any remaining non-blocking warnings.

## Acceptance criteria

- Admin and public pages visibly share one typography, palette and spacing system.
- Forms and record lists align correctly on desktop and mobile without horizontal overflow.
- Every editable field has a label, clear focus state and visible result feedback.
- Category, menu-item and social-link changes persist in Supabase and appear on the public site.
- No default category filter is rendered.
- The SR/EN switch does not alter the hero image crop or geometry.
- Smoke-test records and temporary social values do not remain after verification.

## Validation record

- `npm run build` passed after the token and admin-panel changes.
- `npm run smoke:content -- setup` passed with a temporary category, a menu item, an item update, three social-link updates, public-read checks and an anonymous-write RLS rejection.
- The public browser check confirmed the temporary category filter, updated drink card and all three saved social links; `npm run smoke:content -- cleanup` then removed only the temporary category/item and restored the original social values.
- Desktop SR/EN check confirmed the same hero source and a 720px hero height before and after the language switch.
- A 390px-wide mobile check confirmed a visible mobile navigation control and no horizontal overflow.
