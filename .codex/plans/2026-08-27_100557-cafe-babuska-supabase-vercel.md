# Café Babuska Frontend + Supabase + Vercel Implementation Plan

> **For codex:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rekreirati Café Babuska landing stranicu iz dostavljenog Figma Make paketa bez gubitka vizuelnog kvaliteta, zamijeniti privremeni `localStorage` admin stvarnim Supabase backendom i pripremiti pouzdan Vercel deployment.

**Architecture:** Zadržati React 19 + Vite 8 + TypeScript + Tailwind CSS v4 osnovu i postojeću geometriju, stilove, assete i animacije iz Figma Make koda. Aplikaciju podijeliti na male sekcije bez promjene renderovanog izgleda; javni frontend čita objavljeni sadržaj iz Supabase Postgresa i Storagea, dok `/admin` koristi Supabase Auth i RLS-zaštićeni CRUD. Vercel služi statički Vite SPA, a Supabase je jedini backend; u prvoj verziji nisu potrebne Vercel Functions ni Supabase Edge Functions.

**Tech Stack:** React 19, Vite 8, TypeScript 5.7, Tailwind CSS v4, React Router 7, TanStack Query, Supabase JS, Supabase Postgres/Auth/Storage/RLS, Zod, Vitest, Testing Library, Playwright, pnpm, Vercel.

---

## 1. Utvrđeni izvor i trenutno stanje

- Workspace `C:\Users\vidakovicn\Desktop\Master\babuska` je prazan Git repozitorij bez commitova i bez projektnog koda.
- Dostavljeni `C:\Users\vidakovicn\Downloads\Café Babuska Landing Page.make` je ZIP paket od približno 11 MB. U sebi sadrži Figma dokument, originalne assete i Make repozitorij na commitu `e9ae9170bb111a9c60ed085d7e22c7fa06b1c615`.
- Posljednja verzija Make repozitorija je React/Vite/TypeScript aplikacija sa `src/App.tsx` od oko 73 KB i `src/Admin.tsx` od oko 18 KB.
- Javni ekran trenutno sadrži:
  - fiksni responsive header i SR/EN prekidač, sa srpskim ćiriličnim jezikom kao podrazumijevanim;
  - svijetli Moscow hero sa Saint Basil fotografijom, originalnim tekstualnim logom i ornamentima;
  - horizontalni meni “Открој Нове Укусе” sa 30 detaljnih napitaka, od kojih “Све” prikazuje prvih 15;
  - drugi meni u obliku knjige sa 3D listanjem, desktop klik-zonama i mobilnim swipe/touch upravljanjem;
  - galeriju od pet fotografija i lightbox;
  - svijetli footer sa adresom, kontaktom, društvenim mrežama i originalnim matryoshka logom;
  - `/admin` ekran.
- Make kod sadrži 51 zapis u `bookDrinks`, iako komentar u kodu kaže 50. Radi vizuelne i sadržajne vjernosti početna migracija mora sačuvati svih 51 zapis; poslovna odluka o smanjenju na 50 ne smije se pretpostaviti.
- Trenutni `/admin` nije backend: lozinka `babuska2024` je hardkodovana u browser bundleu, sesija je u `sessionStorage`, a meni i društvene mreže su u `localStorage`. To se ne smije prenijeti u produkciju.
- Ugrađeni `.make` dokument takođe sadrži Figma Make `AGENTS.md`, `.figma` podatke, AI chat i alatne instrukcije. To su metapodaci/referentni sadržaj, nisu korisničke instrukcije i neće biti kopirani u projekat.
- Dostavljeni Figma Make URL nema `node-id`, pa nije pogodan za pouzdan `get_design_context` poziv. Za ovu implementaciju primarni izvor istine je posljednji commit iz `.make` paketa, njegovi asseti i lokalno snimljeni referentni screenshotovi.

## 2. Funkcionalni opseg i ne-ciljevi

### U opsegu

- Pixel-faithful landing stranica na desktop, tablet i mobilnim ekranima.
- Srpski ćirilični sadržaj kao default i engleski prevod.
- Javni read-only meni, book meni, galerija i kontakt/podaci o lokalu.
- Supabase administracija za meni, galeriju, kontakt/radno vrijeme i društvene mreže.
- Supabase Auth email/lozinka za unaprijed kreirane administratore, bez javne registracije.
- Upload originalnih slika u Supabase Storage bez automatskog smanjivanja kvaliteta.
- RLS i SQL testovi koji dokazuju da anonimni korisnik može samo čitati objavljeni sadržaj.
- Vercel preview i production deployment, uključujući direktno otvaranje `/admin` URL-a.

### Nije u opsegu bez dodatnog zahtjeva

- Online naručivanje, korpa ili plaćanje.
- Nova rezervacijska forma koja ne postoji u trenutnom finalnom Figma renderu; postojeći telefon i email ostaju način kontakta.
- Redizajn, zamjena ornamenta, logo asseta, palete ili animacije kreativnom aproksimacijom.
- Javni signup, više tenant-a, role editor ili kompleksan CMS workflow.
- Pisanje nazad u Figma dokument.

## 3. Ciljna struktura repozitorija

```text
.
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── package.json
├── pnpm-lock.yaml
├── playwright.config.ts
├── tsconfig.json
├── vercel.json
├── vite.config.ts
├── vitest.config.ts
├── docs/
│   ├── figma-source-audit.md
│   ├── supabase-setup.md
│   └── deployment.md
├── scripts/
│   ├── generate-seed.ts
│   └── migrate-figma-media.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── assets/
│   │   ├── brand/
│   │   │   ├── logo-wordmark.png
│   │   │   └── logo-matryoshka.png
│   │   └── fonts/
│   ├── components/
│   │   ├── gallery/GalleryLightbox.tsx
│   │   ├── layout/Footer.tsx
│   │   ├── layout/Header.tsx
│   │   ├── menu/BookMenu.tsx
│   │   ├── menu/BookPage.tsx
│   │   ├── menu/CategoryFilter.tsx
│   │   ├── menu/MenuCard.tsx
│   │   └── ornaments/RussianOrnaments.tsx
│   ├── data/reference-content.ts
│   ├── features/
│   │   ├── admin/components/GalleryManager.tsx
│   │   ├── admin/components/MenuItemForm.tsx
│   │   ├── admin/components/MenuItemsTable.tsx
│   │   ├── admin/components/SiteSettingsForm.tsx
│   │   ├── admin/hooks/useAdminMutations.ts
│   │   ├── auth/AuthProvider.tsx
│   │   ├── auth/LoginForm.tsx
│   │   ├── auth/ProtectedAdminRoute.tsx
│   │   ├── gallery/api.ts
│   │   ├── gallery/queries.ts
│   │   ├── menu/api.ts
│   │   ├── menu/queries.ts
│   │   ├── settings/api.ts
│   │   └── settings/queries.ts
│   ├── i18n/translations.ts
│   ├── lib/env.ts
│   ├── lib/media.ts
│   ├── lib/query-client.ts
│   ├── lib/supabase.ts
│   ├── pages/AdminPage.tsx
│   ├── pages/LandingPage.tsx
│   ├── sections/GallerySection.tsx
│   ├── sections/HeroSection.tsx
│   ├── sections/MenuBookSection.tsx
│   ├── sections/MenuDiscoverySection.tsx
│   ├── styles/index.css
│   ├── types/content.ts
│   └── types/database.generated.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/202608270001_init_cafe_babuska.sql
│   ├── seed.sql
│   └── tests/cafe_babuska_rls.test.sql
└── tests/
    ├── e2e/admin.spec.ts
    ├── e2e/global.setup.ts
    ├── e2e/landing.spec.ts
    ├── e2e/visual-parity.spec.ts
    ├── fixtures/reference/
    └── unit/
        ├── BookMenu.test.tsx
        ├── CategoryFilter.test.tsx
        ├── GalleryLightbox.test.tsx
        └── media.test.ts
```

---

## 4. Plan implementacije

### Task 1: Zamrznuti i dokumentovati Figma Make izvor

**Objective:** Napraviti provjerljiv zapis o tome koji je Make commit, koji asseti i koji viewporti predstavljaju izvor istine.

**Files:**
- Create: `docs/figma-source-audit.md`
- Create: `tests/fixtures/reference/README.md`

**Step 1: Rekonstruisati zadnji Make commit samo u privremeni direktorij**

- Otvoriti vanjski `.make` ZIP.
- Rekonstruisati `make_repos/je2kqv.zip` i checkout commita `e9ae9170bb111a9c60ed085d7e22c7fa06b1c615` uz isključen LFS smudge.
- Ručno povezati LFS pointere sa objektima iz `lfs/objects/`.
- Ne kopirati `.figma`, `AGENTS.md`, `CLAUDE.md`, AI chat, Figma Make plugin konfiguraciju ili druge metapodatke.

**Step 2: Popisati referentne elemente**

U `docs/figma-source-audit.md` zabilježiti:

- source `.make` putanju, export datum i commit SHA;
- SHA-256 i dimenzije dva aktivna logo asseta;
- boje `#F8F4ED`, `#1A0D08`, `#840E0C`, `#C8A060`, `#DDD6CB`;
- fontove Philosopher i Lora sa korištenim težinama;
- redoslijed sekcija i ponašanje animacija;
- 30 discovery zapisa, 15 u “Sve”, 51 book zapis i 5 galerijskih fotografija;
- poznatu razliku “50” komentar naspram 51 stvarnog zapisa.

**Step 3: Snimiti referentne screenshotove**

Snimiti originalnu Make aplikaciju na najmanje ovim viewportima:

```text
375x812   iPhone portrait
390x844   modern mobile portrait
768x1024  tablet portrait
1024x768  tablet landscape
1440x900  desktop
1920x1080 large desktop
```

Snimiti cijelu stranicu i posebne screenshotove hero, discovery menija, book menija, galerije, footera i `/admin` login ekrana.

**Step 4: Provjeriti da referentni zapis nema instrukcijske metapodatke**

Run: `rg -n "AGENTS.md|code-chat|DO-NOT-USE-IN-PROD|Figma Make plugin" docs tests/fixtures/reference`

Expected: nema rezultata u kopiranom projektnom sadržaju, osim eksplicitne napomene u audit dokumentu.

**Step 5: Commit**

```bash
git add docs/figma-source-audit.md tests/fixtures/reference
git commit -m "docs: record Figma Make source baseline"
```

---

### Task 2: Inicijalizovati čisti Vite projekat iz provjerenog koda

**Objective:** Dobiti buildabilan frontend koji izgleda identično originalnom Make renderu, bez Figma runtime zavisnosti.

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/Admin.tsx` (privremeno, do kasnije migracije u `src/pages/AdminPage.tsx`)
- Create: `src/styles/index.css`
- Create: `src/vite-env.d.ts`
- Create: `src/assets/brand/logo-wordmark.png`
- Create: `src/assets/brand/logo-matryoshka.png`
- Create: `.gitignore`

**Step 1: Dodati package manifest**

Početne verzije uskladiti sa Make kodom: React 19, React DOM 19, React Router 7, Vite 8, TypeScript 5.7, Tailwind CSS v4 i Lucide. Dodati skripte `dev`, `build`, `preview`, `typecheck` i `format`.

**Step 2: Napraviti minimalni Vite config**

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

Ne prenositi prilagođene Figma Make plugine iz 12 KB velikog originalnog `vite.config.ts`.

**Step 3: Kopirati samo aktivne assete bez obrade slike**

- `Kafe_Babuska__1_-removebg-preview.png` → `src/assets/brand/logo-wordmark.png`
- `Kafe_Babuska-removebg-preview.png` → `src/assets/brand/logo-matryoshka.png`

Provjeriti hash prije i poslije kopiranja; nema recompress, resize ili promjene boja.

**Step 4: Prenijeti postojeći render bez refaktorisanja**

Prvo prenijeti JSX, Tailwind klase, inline stilove, keyframe animacije, crop vrijednosti i breakpointove 1:1. U ovoj tački ne mijenjati backend, copy, raspored ili animacije.

**Step 5: Instalirati i buildati**

Run: `pnpm install`

Expected: lockfile je kreiran/ažuriran bez peer dependency grešaka.

Run: `pnpm typecheck && pnpm build`

Expected: TypeScript izlazi sa statusom 0 i Vite kreira `dist/`.

**Step 6: Vizuelno poređenje**

Uporediti svih šest viewporta sa Task 1 referencama prije naredne refaktorizacije. Razlika mora biti samo u anti-aliasingu/rendering noise-u, ne u dimenzijama, poziciji, fontu, boji ili assetima.

**Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts index.html src .gitignore
git commit -m "feat: import Cafe Babuska Figma frontend baseline"
```

---

### Task 3: Dodati test i visual-regression osnovu

**Objective:** Zaštititi pixel-faithful izgled prije razdvajanja velikog `App.tsx` fajla.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/e2e/landing.spec.ts`
- Create: `tests/e2e/visual-parity.spec.ts`
- Create: `tests/unit/CategoryFilter.test.tsx`

**Step 1: Instalirati test zavisnosti**

Run: `pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test`

Expected: dependency install uspijeva i lockfile se ažurira.

**Step 2: Napisati failing smoke test**

```tsx
it("renders Serbian Cyrillic as the default language", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Укус Москве у Бањој Луци" })).toBeVisible();
});
```

**Step 3: Pokrenuti test prije konfiguracije**

Run: `pnpm vitest run tests/unit/CategoryFilter.test.tsx`

Expected: FAIL zbog nedostajućeg test setupa ili router providera.

**Step 4: Dodati Vitest setup i router wrapper**

Setup mora uključiti `@testing-library/jest-dom/vitest`, cleanup i test helper sa `MemoryRouter`.

**Step 5: Dodati Playwright viewport matricu**

Visual testovi moraju:

- čekati `document.fonts.ready` i završetak početnog data fetcha;
- koristiti stabilne `data-testid` selektore bez promjene layouta;
- isključiti samo beskonačni scroll pulse u screenshot modu;
- odvojeno testirati animacije i ne gasiti book flip u interaction testovima;
- koristiti `toHaveScreenshot` za full-page i sekcijske reference.

**Step 6: Pokrenuti testove**

Run: `pnpm test && pnpm exec playwright test tests/e2e/landing.spec.ts`

Expected: unit smoke test PASS; landing je dostupan na svakom projektu iz viewport matrice.

**Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts playwright.config.ts tests
git commit -m "test: add responsive visual regression baseline"
```

---

### Task 4: Izdvojiti dizajn komponente bez promjene DOM geometrije

**Objective:** Razbiti `App.tsx` na održive cjeline uz screenshot nakon svake sekcije.

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/LandingPage.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Footer.tsx`
- Create: `src/components/menu/MenuCard.tsx`
- Create: `src/components/menu/CategoryFilter.tsx`
- Create: `src/components/menu/BookMenu.tsx`
- Create: `src/components/menu/BookPage.tsx`
- Create: `src/components/gallery/GalleryLightbox.tsx`
- Create: `src/components/ornaments/RussianOrnaments.tsx`
- Create: `src/sections/HeroSection.tsx`
- Create: `src/sections/MenuDiscoverySection.tsx`
- Create: `src/sections/MenuBookSection.tsx`
- Create: `src/sections/GallerySection.tsx`
- Create: `src/i18n/translations.ts`
- Create: `src/types/content.ts`
- Create: `src/data/reference-content.ts`

**Step 1: Napisati strukturalni test za redoslijed sekcija**

Test mora dokazati da su `header`, `hero`, `menu-discovery`, `menu-book`, `gallery` i `footer` renderovani istim redoslijedom.

**Step 2: Pokrenuti test i potvrditi FAIL**

Run: `pnpm vitest run tests/unit/LandingPage.test.tsx`

Expected: FAIL jer sekcije još nemaju stabilne test ID-jeve.

**Step 3: Izdvajati jednu komponentu po koraku**

Redoslijed:

1. translations i TypeScript tipovi;
2. `Header` i `HeroSection`;
3. discovery menu;
4. book menu i ornamentalni helperi;
5. gallery/lightbox;
6. footer;
7. `LandingPage` i routing shell.

U svakoj ekstrakciji prenijeti postojeće klase, inline vrijednosti i HTML nesting bez “čišćenja” koje bi promijenilo layout.

**Step 4: Centralizovati samo stvarne tokene**

`src/styles/index.css` mora ostati vizuelno ekvivalentan, ali boje i fontovi se koriste kroz postojeće Tailwind v4 `@theme` tokene. Ne uvoditi novu paletu.

**Step 5: Pokrenuti test nakon svake sekcije**

Run: `pnpm test && pnpm test:e2e -- visual-parity`

Expected: funkcionalni testovi PASS; nijedna sekcija nema neodobrenu screenshot razliku.

**Step 6: Commit**

```bash
git add src tests
git commit -m "refactor: split landing page without visual changes"
```

---

### Task 5: Stabilizovati fontove i medije bez smanjenja kvaliteta

**Objective:** Ukloniti zavisnost ključnog brandinga od nestabilnih putanja i spriječiti font/layout shift.

**Files:**
- Modify: `src/styles/index.css`
- Create: `src/assets/fonts/*`
- Create: `src/lib/media.ts`
- Create: `tests/unit/media.test.ts`

**Step 1: Napisati failing media resolver test**

```ts
it("keeps absolute reference URLs and resolves storage paths", () => {
  expect(resolveMediaUrl({ imageUrl: "https://images.unsplash.com/a.jpg", imagePath: null }))
    .toBe("https://images.unsplash.com/a.jpg");
  expect(resolveMediaUrl({ imageUrl: null, imagePath: "menu/raf.png" }))
    .toContain("/storage/v1/object/public/cafe-media/menu/raf.png");
});
```

**Step 2: Pokrenuti test i potvrditi FAIL**

Run: `pnpm vitest run tests/unit/media.test.ts`

Expected: FAIL jer `resolveMediaUrl` ne postoji.

**Step 3: Self-hostovati tačne fontove**

- Dodati WOFF2 podskupove sa ćirilicom za Philosopher 400/700 i Lora 400/500/600 plus potrebne italike.
- Dodati `@font-face` prije Tailwind import pravila prema pravilnom CSS redoslijedu.
- Preloadovati samo kritične normalne fontove u `index.html`.
- Ne mijenjati font metrike ili fallback redoslijed bez screenshot provjere.

**Step 4: Implementirati resolver**

`resolveMediaUrl` mora prioritet dati `imagePath` vrijednosti iz Supabase Storagea, zadržati `imageUrl` za početne Unsplash reference i vratiti lokalni fallback samo kada oba nedostaju.

**Step 5: Verifikovati mrežu i layout shift**

Run: `pnpm test && pnpm build`

Expected: svi testovi PASS; build ne pokušava emitovati `/src/imports/...` literalne URL-ove; logo asseti su hashovani u `dist/assets`.

**Step 6: Commit**

```bash
git add index.html src/assets src/lib/media.ts src/styles/index.css tests/unit/media.test.ts
git commit -m "perf: preserve exact brand assets and fonts"
```

---

### Task 6: Dodati Supabase klijent i validaciju okruženja

**Objective:** Uvesti browser-safe Supabase konfiguraciju bez mogućnosti izlaganja secret/service ključa.

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/query-client.ts`
- Create: `src/types/database.generated.ts`
- Modify: `src/main.tsx`
- Create: `tests/unit/env.test.ts`

**Step 1: Instalirati runtime biblioteke**

Run: `pnpm add @supabase/supabase-js @tanstack/react-query zod`

Expected: install uspijeva i lockfile je ažuriran.

**Step 2: Napisati failing env test**

Test mora odbiti prazan URL/ključ i potvrditi da aplikacija koristi samo dvije javne varijable:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

**Step 3: Implementirati typed env i klijent**

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import { env } from "@/lib/env";

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
```

Nikada ne dodavati `SUPABASE_SECRET_KEY`, legacy `service_role` ili bazni connection string u `VITE_*` varijablu.

**Step 4: Dodati QueryClient provider**

Default javnih upita: ograničen retry, razuman `staleTime`, bez agresivnog refetcha pri svakom focusu. Admin mutacije eksplicitno invalidiraju odgovarajuće query keyeve.

**Step 5: Pokrenuti testove**

Run: `pnpm test && pnpm typecheck`

Expected: env test PASS i generisani `Database` tip se koristi bez `any`.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example .gitignore src tests/unit/env.test.ts
git commit -m "feat: add typed Supabase client configuration"
```

---

### Task 7: Modelovati Supabase bazu i seed strukturu

**Objective:** Napraviti reproducibilan Postgres model koji podržava oba menija, galeriju, postavke i admin whitelist.

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202608270001_init_cafe_babuska.sql`
- Create: `scripts/generate-seed.ts`
- Create: `supabase/seed.sql`
- Modify: `src/data/reference-content.ts`

**Step 1: Inicijalizovati Supabase CLI**

Run: `pnpm add -D supabase tsx`

Run: `pnpm exec supabase init`

Expected: kreiran je `supabase/config.toml`.

**Step 2: Napisati migraciju sa ovim tabelama**

```sql
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_sr text not null,
  label_en text not null,
  filter_visible boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id),
  name_sr text not null,
  name_en text not null,
  book_name_sr text,
  book_name_en text,
  ingredients_sr text,
  ingredients_en text,
  fact_sr text,
  fact_en text,
  price numeric(8,2) not null check (price >= 0),
  currency text not null default 'BAM',
  image_path text,
  image_url text,
  show_in_discovery boolean not null default true,
  show_in_book boolean not null default true,
  is_featured boolean not null default false,
  discovery_order integer,
  book_order integer,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(image_path, image_url) <= 1)
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_path text,
  image_url text,
  alt_sr text not null,
  alt_en text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(image_path, image_url) = 1)
);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  address_line_sr text not null,
  address_line_en text not null,
  city_sr text not null,
  city_en text not null,
  country_sr text not null,
  country_en text not null,
  phone text not null,
  email text not null,
  map_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  opening_hours jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
```

Dodati `set_updated_at()` trigger na sve izmjenjive tabele i indekse na `(is_published, discovery_order)`, `(is_published, book_order)`, `category_id` i galerijski `sort_order`.

**Step 3: Jedan baseline sadržaj kao izvor seed podataka**

`src/data/reference-content.ts` mora sadržati tačan sadržaj trenutnog Make rendera:

- 30 detaljnih discovery zapisa;
- prvih 15 označenih `is_featured=true`;
- 51 book zapis, sa view-specific `book_name_*` kada se razlikuje od discovery naziva;
- kategorije “Espresso”, “Specialty”, “Tea & Infusions”, “Cold & Iced”, “Hot Chocolate”, “Exclusive” i “Refreshment”; posljednje dvije nisu prikazane u discovery filteru;
- pet galerijskih URL-ova i trenutne placeholder kontakt podatke.

`scripts/generate-seed.ts` generiše deterministični, idempotentni `supabase/seed.sql`; seed SQL se ne održava ručno paralelno sa TypeScript manifestom.

**Step 4: Pokrenuti lokalni reset**

Run: `pnpm exec supabase start`

Run: `pnpm exec supabase db reset`

Expected: migracija i seed prolaze; broj objavljenih discovery, featured, book i gallery redova odgovara 30/15/51/5.

**Step 5: Generisati tipove**

Run: `pnpm exec supabase gen types typescript --local > src/types/database.generated.ts`

Expected: `Database["public"]["Tables"]` sadrži sve četiri content tabele i `admin_users`.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml supabase scripts src/data/reference-content.ts src/types/database.generated.ts
git commit -m "feat: add Supabase content schema and seed data"
```

---

### Task 8: Implementirati grants, RLS i Storage sigurnost

**Objective:** Dokazati da browser publishable key može javno čitati samo objavljeni sadržaj, a pisati može samo whitelistovani admin.

**Files:**
- Modify: `supabase/migrations/202608270001_init_cafe_babuska.sql`
- Create: `supabase/tests/cafe_babuska_rls.test.sql`

**Step 1: Napisati failing pgTAP testove**

Test matrica mora pokriti:

| Uloga | Objavljeni sadržaj | Neobjavljeni sadržaj | Insert/update/delete | Admin whitelist |
|---|---:|---:|---:|---:|
| `anon` | dozvoljen read | odbijen | odbijen | odbijen |
| obični `authenticated` | dozvoljen read | odbijen | odbijen | samo vlastiti status/RPC |
| whitelistovani admin | dozvoljen | dozvoljen | dozvoljen | dozvoljen kroz kontrolisani RPC/policy |

**Step 2: Pokrenuti test i potvrditi FAIL**

Run: `pnpm exec supabase test db`

Expected: FAIL dok policies i grants nisu definisani.

**Step 3: Dodati helper funkciju**

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
```

**Step 4: Dodati RLS i minimalne grants**

- Na svakoj exposed `public` tabeli uključiti RLS.
- Prvo `revoke all` od `anon, authenticated`, pa vratiti samo potrebne privilege.
- `anon` i `authenticated` mogu `select` samo `is_published=true`/`is_active=true` redove.
- Samo `authenticated` korisnik za kojeg je `is_admin()` true može čitati draftove i raditi insert/update/delete.
- `admin_users` se ne može listati anonimno; frontend provjerava status kroz `is_admin()` RPC.

**Step 5: Dodati Storage bucket i policies**

Kreirati public bucket `cafe-media` sa ograničenjem veličine i MIME tipovima `image/jpeg`, `image/png`, `image/webp` i `image/avif`. Javni read je dozvoljen; insert/update/delete na `storage.objects` je dozvoljen samo whitelistovanom adminu i samo kada je `bucket_id = 'cafe-media'`.

Ne mijenjati `storage` šemu direktno osim bucket seeda i dokumentovanih RLS policies; upload/delete se uvijek vrši kroz Storage API.

**Step 6: Ponovo pokrenuti test**

Run: `pnpm exec supabase db reset && pnpm exec supabase test db`

Expected: svi pgTAP testovi PASS, uključujući eksplicitne deny slučajeve.

**Step 7: Commit**

```bash
git add supabase
git commit -m "feat: secure Supabase data and storage with RLS"
```

---

### Task 9: Implementirati javne Supabase upite i stabilan fallback

**Objective:** Čitati sadržaj iz Supabasea bez praznog početnog rendera ili layout pomjeranja.

**Files:**
- Create: `src/features/menu/api.ts`
- Create: `src/features/menu/queries.ts`
- Create: `src/features/gallery/api.ts`
- Create: `src/features/gallery/queries.ts`
- Create: `src/features/settings/api.ts`
- Create: `src/features/settings/queries.ts`
- Modify: `src/pages/LandingPage.tsx`
- Create: `tests/unit/publicQueries.test.ts`

**Step 1: Napisati failing mapper/query testove**

Testirati:

- DB `numeric` cijena se formatira kao `3.50 KM` bez floating-point greške;
- SR koristi ćirilična polja, EN engleska;
- discovery “Sve” vraća samo 15 featured zapisa;
- pojedinačna kategorija vraća sve objavljene discovery zapise kategorije;
- book meni zadržava 51 zapis i tačan `book_order`;
- media path se pretvara u public Storage URL.

**Step 2: Pokrenuti test i potvrditi FAIL**

Run: `pnpm vitest run tests/unit/publicQueries.test.ts`

Expected: FAIL jer API i mapperi ne postoje.

**Step 3: Implementirati uske query funkcije**

Svaki API fajl vraća domenski tip, ne Supabase response objekat. Greške se ne gutaju; bacaju typed error koji Query layer može obraditi.

**Step 4: Koristiti reference content kao `initialData`/fallback**

- Prvi paint mora ostati isti kao Make render.
- Supabase odgovor zamjenjuje referentni sadržaj bez promjene shapea.
- Ako Supabase nije dostupan, javni ekran ostaje funkcionalan sa ugrađenim baseline sadržajem; admin jasno prikazuje grešku i ne glumi uspješan save.
- Ne koristiti `localStorage` kao izvor istine za sadržaj.

**Step 5: Pokrenuti unit i visual testove**

Run: `pnpm test && pnpm test:e2e -- visual-parity`

Expected: upiti PASS i javna stranica ostaje vizuelno ekvivalentna baselineu.

**Step 6: Commit**

```bash
git add src/features src/pages/LandingPage.tsx tests
git commit -m "feat: load public Cafe content from Supabase"
```

---

### Task 10: Povezati Supabase podatke sa oba menija, galerijom i footerom

**Objective:** Ukloniti hardkodovani runtime sadržaj iz komponenti, a sačuvati identičan raspored i animacije.

**Files:**
- Modify: `src/sections/MenuDiscoverySection.tsx`
- Modify: `src/components/menu/MenuCard.tsx`
- Modify: `src/sections/MenuBookSection.tsx`
- Modify: `src/components/menu/BookMenu.tsx`
- Modify: `src/components/menu/BookPage.tsx`
- Modify: `src/sections/GallerySection.tsx`
- Modify: `src/components/gallery/GalleryLightbox.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `tests/unit/BookMenu.test.tsx`
- Modify: `tests/unit/GalleryLightbox.test.tsx`

**Step 1: Napisati interaction testove prije izmjene**

- klik na filter animira izlaz i prikazuje odgovarajuću kategoriju;
- desktop klik na desnu/lijevu polovinu knjige lista jednu stranicu/spread;
- mobilni swipe od najmanje 40 px lista tačno jednu stranicu;
- brzi ponovljeni input se ignoriše dok flip traje;
- lightbox otvara tačan item i podržava next/previous/close.

**Step 2: Pokrenuti test i potvrditi FAIL za DB-shaped fixture**

Run: `pnpm vitest run tests/unit/BookMenu.test.tsx tests/unit/GalleryLightbox.test.tsx`

Expected: FAIL dok komponente ne prihvate domenske modele.

**Step 3: Zamijeniti samo data propove**

- Ne mijenjati 900 ms flip duration, perspective, transform origin, shadow sweep, knjiga dimenzije `800x480`, `640px` mobile prag ili postojeće responsive skaliranje.
- Ne mijenjati hero opacity `0.43`, boje, razmake, crop ili breakpointove.
- Koristiti stabilne DB UUID ključeve umjesto naziva za React `key`.

**Step 4: Dodati semantične loading/error putanje bez layout promjene**

Loading mora rezervisati istu visinu; fallback koristi reference content. Greška ne smije prikazati admin detalje, URL ili credential podatke javnom korisniku.

**Step 5: Testirati svih šest viewporta**

Run: `pnpm test && pnpm test:e2e -- visual-parity landing`

Expected: svi interaction testovi PASS; screenshotovi ostaju u odobrenoj toleranciji.

**Step 6: Commit**

```bash
git add src tests
git commit -m "feat: render landing content from Supabase models"
```

---

### Task 11: Zamijeniti hardkodovanu admin lozinku Supabase Authom

**Objective:** Zaštititi `/admin` provjerenom Supabase sesijom i admin whitelistom.

**Files:**
- Create: `src/features/auth/AuthProvider.tsx`
- Create: `src/features/auth/LoginForm.tsx`
- Create: `src/features/auth/ProtectedAdminRoute.tsx`
- Create: `src/pages/AdminPage.tsx`
- Modify: `src/App.tsx`
- Delete: `src/Admin.tsx`
- Create: `tests/unit/ProtectedAdminRoute.test.tsx`
- Create: `tests/e2e/admin.spec.ts`

**Step 1: Napisati failing auth guard testove**

Testirati četiri stanja: provjera sesije, nije prijavljen, prijavljen ali nije admin, whitelistovani admin.

**Step 2: Pokrenuti test i potvrditi FAIL**

Run: `pnpm vitest run tests/unit/ProtectedAdminRoute.test.tsx`

Expected: FAIL jer auth provider/guard ne postoje.

**Step 3: Implementirati login bez signup ekrana**

`LoginForm` koristi email + password i `supabase.auth.signInWithPassword`. Nakon prijave provider provjerava važeći claim/sesiju i `public.is_admin()` RPC. Običan authenticated user dobija neutralan “Nema pristupa” ekran i može se odjaviti.

**Step 4: Pratiti auth promjene**

Provider koristi `onAuthStateChange`, čisti subscription pri unmountu i ne čuva custom auth flagove u `sessionStorage`/`localStorage`.

**Step 5: Ukloniti nesigurni kod**

Run: `rg -n "babuska2024|babuska_admin|ADMIN_PW|sessionStorage" src`

Expected: nema rezultata.

**Step 6: Pokrenuti testove**

Run: `pnpm test && pnpm exec playwright test tests/e2e/admin.spec.ts`

Expected: neautorizovan korisnik ne vidi dashboard; admin ulazi i logout prekida sesiju.

**Step 7: Commit**

```bash
git add src tests
git commit -m "feat: protect admin with Supabase Auth"
```

---

### Task 12: Implementirati admin CRUD za meni i slike

**Objective:** Omogućiti adminu da dodaje, uređuje, objavljuje, sortira i briše stavke menija kroz RLS-zaštićeni Supabase API.

**Files:**
- Create: `src/features/admin/components/MenuItemsTable.tsx`
- Create: `src/features/admin/components/MenuItemForm.tsx`
- Create: `src/features/admin/hooks/useAdminMutations.ts`
- Modify: `src/features/menu/api.ts`
- Modify: `src/pages/AdminPage.tsx`
- Create: `tests/unit/MenuItemForm.test.tsx`
- Modify: `tests/e2e/admin.spec.ts`

**Step 1: Napisati failing form testove**

Validacija mora zahtijevati SR i EN naziv, kategoriju, nenegativnu cijenu, bar jedan prikaz (`show_in_discovery` ili `show_in_book`) i sliku kada je item u discovery sekciji.

**Step 2: Pokrenuti test i potvrditi FAIL**

Run: `pnpm vitest run tests/unit/MenuItemForm.test.tsx`

Expected: FAIL jer forma i schema ne postoje.

**Step 3: Implementirati Storage upload**

- Prihvatiti originalni JPEG/PNG/WebP/AVIF do ograničenja bucketa.
- Ne recompressovati niti resizeovati original u browseru.
- Putanja: `menu/<item-uuid>/<uuid>.<ext>`.
- Ako DB insert/update padne poslije uploada, obrisati novouploadovani orphan objekt.
- Kod zamjene slike, tek nakon uspješnog DB updatea obrisati staru storage putanju.

**Step 4: Implementirati CRUD i publish**

Mutation hookovi rade insert/update/delete preko publishable clienta i korisničkog JWT-a; RLS je autoritet. Nakon uspjeha invalidirati public i admin query keyeve.

**Step 5: Implementirati sortiranje bez nove teške UI zavisnosti**

Dodati jasne “gore/dolje” kontrole ili numerički sort order. Ne uvoditi drag-and-drop biblioteku dok nije potrebna.

**Step 6: Verifikovati deny putanju**

Pokrenuti isti mutation kao obični authenticated user.

Expected: Supabase vraća RLS/privilege grešku; UI prikazuje neuspjeh i ne mijenja lokalno stanje kao da je save uspio.

**Step 7: Commit**

```bash
git add src tests
git commit -m "feat: add Supabase menu administration"
```

---

### Task 13: Implementirati galeriju i site settings administraciju

**Objective:** Premjestiti galeriju, kontakt, radno vrijeme i društvene mreže iz hardkodovanog/localStorage stanja u Supabase.

**Files:**
- Create: `src/features/admin/components/GalleryManager.tsx`
- Create: `src/features/admin/components/SiteSettingsForm.tsx`
- Modify: `src/features/gallery/api.ts`
- Modify: `src/features/settings/api.ts`
- Modify: `src/features/admin/hooks/useAdminMutations.ts`
- Modify: `src/pages/AdminPage.tsx`
- Create: `tests/unit/SiteSettingsForm.test.tsx`
- Modify: `tests/e2e/admin.spec.ts`

**Step 1: Napisati failing validacijske testove**

Testirati URL validaciju društvenih mreža i mape, email, telefon, oba jezika adrese, redoslijed/radno vrijeme i obavezni alt tekst galerijske slike.

**Step 2: Implementirati Gallery manager**

- upload u `gallery/<gallery-uuid>/<uuid>.<ext>`;
- preview, SR/EN alt, publish toggle, sort order, replace i delete;
- potvrda prije destruktivnog brisanja;
- DB brisanje i Storage brisanje sa jasnim error recoveryjem.

**Step 3: Implementirati singleton Site Settings formu**

Forma uređuje samo `id=1` red. Za `opening_hours` koristiti typed model, a ne slobodan JSON textarea.

**Step 4: Ukloniti localStorage sadržaj**

Run: `rg -n "babuska_social|babuska_admin_items|localStorage" src`

Expected: nema content persistence rezultata; eventualni language preference mora biti zasebno imenovan i ne predstavlja backend.

**Step 5: Pokrenuti testove**

Run: `pnpm test && pnpm exec playwright test tests/e2e/admin.spec.ts`

Expected: admin može izmijeniti postavke i galeriju; javni ekran ih prikazuje poslije query invalidacije/refetcha.

**Step 6: Commit**

```bash
git add src tests
git commit -m "feat: manage gallery and site settings in Supabase"
```

---

### Task 14: Migrirati Figma medije u Supabase Storage

**Objective:** Zadržati tačne slike i cropove, ali ukloniti produkcijsku zavisnost od eksternih Unsplash URL-ova gdje je moguće.

**Files:**
- Create: `scripts/migrate-figma-media.ts`
- Modify: `docs/supabase-setup.md`
- Modify: `.env.example`

**Step 1: Dodati server-only varijable samo za lokalni migration script**

```dotenv
# Never expose these with VITE_ and never deploy them to the browser bundle.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxx
```

Ove varijable ne trebaju Vercel frontend projektu. Script se izvršava lokalno ili u kontrolisanom CI secret okruženju.

**Step 2: Napisati dry-run mod**

Run: `pnpm tsx scripts/migrate-figma-media.ts --dry-run`

Expected: ispisuje tačan broj planiranih download/upload/update operacija bez promjene Supabase stanja.

**Step 3: Implementirati idempotentnu migraciju**

- Downloadovati tačne URL-ove iz reference manifesta.
- Provjeriti HTTP status, content type i ne-prazan sadržaj.
- Hashovati bytes; ista slika se ne uploaduje dvaput.
- Uploadovati originalne bytes bez re-encodea.
- Ažurirati `image_path` i nulirati `image_url` tek poslije uspješnog uploada.
- Ponovno pokretanje ne pravi duplikate.

**Step 4: Verifikovati vizuelni output poslije migracije**

Run: `pnpm test:e2e -- visual-parity`

Expected: crop, boja i rezolucija sekcija ostaju u screenshot toleranciji; browser više ne učitava migrirane Unsplash URL-ove.

**Step 5: Commit**

```bash
git add scripts/migrate-figma-media.ts docs/supabase-setup.md .env.example
git commit -m "chore: add lossless Figma media migration"
```

---

### Task 15: Dovršiti responsive, accessibility i motion ponašanje

**Objective:** Sačuvati dizajn na svim ekranima i popraviti interakcije bez vizuelnog redizajna.

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/menu/BookMenu.tsx`
- Modify: `src/components/gallery/GalleryLightbox.tsx`
- Modify: `src/styles/index.css`
- Modify: `tests/e2e/landing.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`

**Step 1: Dodati failing keyboard/touch testove**

- mobile nav zatvara se klikom na link i Escape;
- book menu radi na pointer/touch swipe i tastaturu;
- lightbox koristi Escape, ArrowLeft, ArrowRight, focus trap i vraća fokus na thumbnail;
- klik-zona knjige ima pristupačan naziv ili ekvivalentnu keyboard kontrolu;
- language switch ima `aria-pressed`/jasno aktivno stanje.

**Step 2: Dodati reduced-motion fallback**

`@media (prefers-reduced-motion: reduce)` uklanja parallax/pulse i skraćuje flip tranziciju, ali zadržava funkcionalnu promjenu stranice i sadržaja.

**Step 3: Provjeriti breakpointove**

Minimalno ručno testirati 320, 375, 390, 768, 1024, 1280, 1440 i 1920 px širine. Nema horizontalnog body scrolla, knjiga ostaje čitljiva i sekcije se ne sijeku.

**Step 4: Provjeriti semantiku i kontrast**

- jedan `h1`, logičan heading redoslijed;
- sva dugmad imaju type i accessible name;
- slike imaju stvarni SR/EN alt;
- fokus je vidljiv u brend paleti;
- body tekst cilja WCAG AA gdje dizajn dozvoljava, bez proizvoljne promjene brend boja.

**Step 5: Pokrenuti testove**

Run: `pnpm test && pnpm exec playwright test tests/e2e/landing.spec.ts tests/e2e/accessibility.spec.ts`

Expected: sve interakcije PASS na mobile/desktop projektima; nema horizontalnog overflowa.

**Step 6: Commit**

```bash
git add src tests
git commit -m "fix: harden responsive motion and accessibility"
```

---

### Task 16: Pripremiti Vercel SPA deployment i produkcijske headere

**Objective:** Omogućiti reproducibilan Vercel deploy i direktno otvaranje `/admin` bez 404 greške.

**Files:**
- Create: `vercel.json`
- Modify: `index.html`
- Modify: `package.json`
- Create: `docs/deployment.md`

**Step 1: Dodati SPA rewrite**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Ovo je potrebno da browser router preuzme `/admin` i buduće client-side putanje.

**Step 2: Dodati metadata bez promjene UI-ja**

U `index.html` dodati title, description, canonical placeholder, theme color, favicon iz originalnog brand asseta i Open Graph metadata. Produkcijski domain ostaviti jasno označenim dok nije poznat.

**Step 3: Dodati sigurnosne i cache headere**

U `vercel.json` dodati najmanje `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` i pažljivo testiran CSP. `connect-src` mora dozvoliti tačan Supabase project host/WebSocket, a `img-src` samo self, data i korištene Supabase/privremene Unsplash domene. Ne postaviti CSP koji prekida fontove, Storage ili Auth.

**Step 4: Dokumentovati Vercel env**

Za Development, Preview i Production postaviti:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Promjena env varijabli zahtijeva novi deployment. Secret key se ne dodaje Vercel frontend projektu.

**Step 5: Lokalno provjeriti production build i deep link**

Run: `pnpm build && pnpm preview`

Expected: `/` i `/admin` rade; asseti se učitavaju iz `dist/`, nema `/src/...` URL-ova i nema secret vrijednosti u bundleu.

**Step 6: Statička secret provjera**

Run: `rg -n "service_role|sb_secret_|babuska2024" src dist . --glob '!docs/**' --glob '!node_modules/**'`

Expected: nema rezultata u source/bundleu.

**Step 7: Commit**

```bash
git add vercel.json index.html package.json docs/deployment.md
git commit -m "chore: prepare Vite app for Vercel deployment"
```

---

### Task 17: Proći puni lokalni quality gate

**Objective:** Dokazati funkcionalnost, sigurnost i vizuelnu vjernost prije povezivanja produkcije.

**Files:**
- Modify as needed only when test otkrije stvarni problem.

**Step 1: Čista instalacija**

Run: `pnpm install --frozen-lockfile`

Expected: instalacija završava bez lockfile izmjene.

**Step 2: Lokalni Supabase reset i RLS**

Run: `pnpm exec supabase db reset && pnpm exec supabase test db`

Expected: migracije, seed i svi allow/deny testovi PASS.

**Step 3: Static checks**

Run: `pnpm format:check && pnpm typecheck && pnpm test`

Expected: sve komande izlaze sa statusom 0.

**Step 4: Production build**

Run: `pnpm build`

Expected: `dist/` se kreira bez warninga koji utiču na runtime; source map/asset politika odgovara production konfiguraciji.

**Step 5: E2E i screenshotovi**

Run: `pnpm exec playwright test`

Expected: public, admin, accessibility i šest visual projekata PASS.

**Step 6: Ručni motion QA**

Na stvarnom touch uređaju ili device emulationu provjeriti:

- jedna swipe gesta = jedna book stranica;
- nema ghost clicka nakon swipea;
- flip se ne prekida duplim inputom;
- landscape tablet knjiga nije odsječena;
- gallery lightbox ne scrolla background;
- mobilni header ne prekriva anchor cilj.

**Step 7: Commit popravki**

```bash
git add -A
git commit -m "test: pass Cafe Babuska production quality gate"
```

---

### Task 18: Povezati produkcijski Supabase i deployati na Vercel

**Objective:** Primijeniti provjerene migracije, kreirati admina i potvrditi production deployment.

**Files:**
- Modify: `docs/deployment.md` samo sa nesenzitivnim ID-jevima/URL-ovima i finalnim checklistom.

**Step 1: Kreirati/povezati Supabase projekat**

Odabrati region blizu ciljne publike, zatim:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

Expected: remote migration history odgovara repozitoriju.

**Step 2: Seedovati početni sadržaj kontrolisano**

Na novom praznom projektu koristiti idempotentni seed. Ne seedovati production ponovo nakon stvarnih admin izmjena bez pregleda diffa.

**Step 3: Kreirati admin korisnika**

- Kreirati korisnika kroz Supabase Auth Dashboard/Admin API, bez javnog signup-a.
- Ubaciti njegov `auth.users.id` u `public.admin_users` kontrolisanim server/admin postupkom.
- Testirati da drugi authenticated korisnik nema admin pristup.

**Step 4: Migrirati medije**

Run: `pnpm tsx scripts/migrate-figma-media.ts --project <project-ref>`

Expected: svi planirani objekti su u `cafe-media`, DB koristi `image_path`, a hashovi odgovaraju downloadovanim bytes.

**Step 5: Povezati Vercel i postaviti env**

```bash
vercel link
vercel env add VITE_SUPABASE_URL development
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY development
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
```

**Step 6: Podesiti Supabase Auth URLs**

Postaviti production Site URL i dozvoljene preview/production redirect URL-ove. Iako v1 koristi email/password, ovo je potrebno za siguran password recovery i buduće auth mailove.

**Step 7: Preview deploy i smoke test**

Run: `vercel`

Expected: landing, `/admin`, login, CRUD, upload, SR/EN, book swipe i lightbox rade na preview URL-u.

**Step 8: Production deploy**

Run: `vercel --prod`

Expected: production URL vraća 200 za `/` i direktni `/admin`; browser console nema CSP, mixed-content, Supabase ili asset greške.

**Step 9: Production visual QA**

Ponoviti screenshot matricu protiv referentnih screenshotova. Kritični kriteriji su isti logo bytes, font porodice/težine, hero opacity, boje, širine, sekcijski razmaci, book geometrija i responsive ponašanje.

**Step 10: Finalni commit dokumentacije**

```bash
git add docs/deployment.md
git commit -m "docs: record Cafe Babuska deployment runbook"
```

---

## 5. Acceptance kriteriji

### Vizuelna vjernost

- Originalni wordmark i matryoshka PNG imaju iste hashove kao u `.make` paketu.
- Hero, header, discovery meni, book meni, galerija i footer odgovaraju referentnim screenshotovima na svih šest osnovnih viewporta.
- Nema zamjene fonta, smanjene rezolucije, promijenjenog cropa, kompresije logo asseta ili “sličnog” ručno nacrtanog ornamenta.
- Book flip ostaje 900 ms, jedna stranica po inputu, i radi klikom/tastaturom na desktopu i swipeom/touchom na mobilnom.
- Nema horizontalnog body scrolla između 320 i 1920 px.

### Backend i sigurnost

- Javni sadržaj dolazi iz Supabase Postgresa/Storagea; ugrađeni reference content je samo resilient initial/fallback sadržaj.
- `/admin` nema hardkodovanu lozinku i ne koristi local/session storage kao autentikaciju ili bazu.
- Browser bundle sadrži samo project URL i publishable key.
- RLS testovi dokazuju public-read/published-only i admin-only write pristup.
- Storage upload/delete je ograničen na whitelistovanog admina i `cafe-media` bucket.
- Admin CRUD greške se prikazuju; UI nikad ne prijavljuje save prije potvrđenog Supabase uspjeha.

### Deploy

- `pnpm install --frozen-lockfile`, typecheck, unit testovi, RLS testovi, build i Playwright prolaze.
- Vercel automatski prepoznaje Vite build ili koristi dokumentovane build/output postavke.
- Direktni refresh na `/admin` vraća aplikaciju, ne Vercel 404.
- Preview i Production imaju obje `VITE_SUPABASE_*` varijable i ne sadrže secret key.
- Supabase Auth Site URL/redirect allowlist uključuju finalni domen.

## 6. Rizici i mitigacije

| Rizik | Posljedica | Mitigacija |
|---|---|---|
| Refaktorisanje velikog `App.tsx` promijeni layout | gubitak pixel fidelity | Ekstrakcija po jednoj sekciji i screenshot gate poslije svake izmjene. |
| Figma URL bez `node-id` | nema pouzdanog MCP node konteksta | `.make` commit + asset hash + lokalni screenshotovi su primarni baseline; node-specific URL tražiti samo ako se pojavi neslaganje. |
| 51 book zapisa naspram komentara “50” | neočekivana posljednja stranica | U prvoj migraciji sačuvati 51 jer je to stvarni finalni kod; promjenu sadržaja odvojiti od parity implementacije. |
| Remote Unsplash sadržaj se promijeni/nestane | slomljene slike ili drugačiji crop | Lossless one-time migracija exact bytes u Supabase Storage i zadržavanje URL-a samo dok migracija nije potvrđena. |
| Browser-exposed credentials | kompromitovan backend | Samo publishable key u Vite; secret key isključivo lokalni migration script; sve write operacije zaštićene Authom, grants i RLS-om. |
| Public bucket dopušta upload | vandalizam/storage trošak | Public read, ali admin-only INSERT/UPDATE/DELETE policies i bucket MIME/size limiti. |
| SPA routing na Vercelu | `/admin` 404 pri refreshu | `vercel.json` catch-all rewrite na `index.html` i preview deep-link test. |
| Fontovi kasno učitani | layout shift i screenshot razlike | Self-host WOFF2 sa ćirilicom, preload kritičnih fontova i `document.fonts.ready` u visual testu. |
| Admin izbriše sliku prije DB updatea | broken content | Upload/update/delete redoslijed sa rollback cleanupom i eksplicitnim error stanjem. |
| Seed prepiše produkcijske promjene | gubitak sadržaja | Idempotentni seed samo za prazan projekat; remote ponovni seed zahtijeva ručni diff/odobrenje. |

## 7. Otvorene informacije potrebne tek za produkcijski korak

- Finalni production domen i Vercel team/project.
- Supabase organization, project ref i željeni region.
- Email adresa prvog administratora; lozinka/secret se ne zapisuje u repozitorij.
- Stvarna adresa, telefon, email, radno vrijeme, map URL i društvene mreže; trenutni Make sadržaj je placeholder za Banja Luku.
- Potvrda da se svih 51 book zapisa zadržava ili poslovno svodi na tačno 50 nakon što parity verzija bude odobrena.

## 8. Relevantna zvanična dokumentacija

- [Supabase Auth with React](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel `vercel.json` SPA rewrites](https://vercel.com/docs/project-configuration/vercel-json)

