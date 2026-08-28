# Café Babuska

Responsive React/Vite landing page with a Supabase backend for bilingual menu content, homepage text, gallery media, footer details, social links, and administrator access. Serbian Cyrillic is the default public and admin language; English is available as a complete alternative.

## Local development

Local endpoints:

- Frontend: `http://localhost:4300`
- Supabase API: `http://localhost:54321`
- Supabase Studio: `http://localhost:54323`
- Local Postgres: `54332`

Install dependencies and start the services:

```powershell
npm install
npx supabase start
npx supabase migration up --local
npm run dev
```

Copy `.env.example` to `.env.local` and replace placeholders with values from `npx supabase status`. Browser code receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never expose a secret/service-role key through a `VITE_` variable.

## Local administrator and demo content

The administrator helper creates or updates the configured Auth user and adds it to `public.admin_users`:

```powershell
npm run setup:local-admin
npm run seed:demo
```

`setup:local-admin` requires `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_ADMIN_EMAIL`, and `SUPABASE_ADMIN_PASSWORD` in the local environment. The secret key is used only by that local maintenance script. Normal admin, seed, migration, and smoke flows authenticate with the configured email/password and the public browser key.

The demo seed is idempotent. It creates five bilingual categories, 30 bilingual menu items, a hero image, and five gallery images. Content images are downloaded once and then stored under `hero/`, `menu/`, or `gallery/` in the `cafe-media` Supabase Storage bucket; public database rows do not point to third-party image hosts.

Existing external content media can be moved safely with:

```powershell
npm run migrate:media
```

The migration skips rows already backed by Storage and removes a newly uploaded object if its database update fails.

After applying the responsive-media migration, generate the WebP variants and stable hero preload objects once:

```powershell
npm run backfill:media-variants
```

The backfill is authenticated and idempotent. It keeps original uploads, writes immutable menu/gallery derivatives, and refreshes only the stable `hero/current-*.webp` objects.

## Validation

```powershell
npm run check
npm run check:local
```

`check` runs TypeScript, unit tests, and the production build. `check:local` additionally verifies the single public bootstrap RPC, RLS-protected category/menu/contact writes, responsive hero/menu/gallery media, loader timing and fallback behavior, public Storage access, performance budgets, and responsive layout at 360×640, 390×844, 768×700, 1024×600, 1366×768, and 1440×900. The local frontend and Supabase services must be running and `.env.local` must contain the local admin credentials.

## Supabase security model

- Anonymous users can read active categories, published menu items, published gallery items, public settings, and public `cafe-media` objects.
- Authenticated users do not receive write access unless their user ID is present in `public.admin_users`.
- Storage writes are restricted to administrators and the `hero`, `menu`, and `gallery` folders.
- Uploads accept JPEG, PNG, WebP, and AVIF images up to 10 MB.
- Fixed brand logo and wordmark assets remain bundled with the frontend; editable content media lives in Supabase Storage.

## Vercel and production Supabase deployment

1. Create/link the production Supabase project and apply all migrations with the Supabase CLI.
2. Create the production Auth administrator and insert its user ID into `public.admin_users`.
3. Run `npm run migrate:media` with production admin credentials if legacy external media exists.
4. Run the demo seed only if demo content is wanted in production.
5. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. The official Vercel Supabase integration is also supported through its public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variables.
6. Deploy the repository as a Vite project; `vercel.json` already provides SPA routing and baseline security headers.
7. Run the public/admin smoke flows against the deployed URL before opening the site to visitors.

Do not add `SUPABASE_SECRET_KEY`, admin passwords, or service-role keys to Vercel browser environment variables or committed files.
