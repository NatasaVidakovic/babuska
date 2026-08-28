# Café Babuska Project Cleanup and Deployment Implementation Plan

> **For codex:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Očistiti i modularizovati kompletan Café Babuska projekat bez vizuelnog odstupanja od odobrenog dizajna, učvrstiti Supabase backend i Vercel konfiguraciju, dokazati funkcionalnost testovima, te sigurno commitovati i pushati završno stanje na `main`.

**Architecture:** Zadržati React/Vite SPA i Supabase kao jedini backend, ali razdvojiti rute, javne sekcije, admin funkcionalnosti, domenske tipove/mapere i Supabase pristup. Baza, RLS i Storage ostaju autoritativni za dinamički sadržaj. Refaktor mora biti ponašajno i vizuelno neutralan: isti hero crop pri SR/EN promjeni, isti brending, isti redoslijed sekcija, samo admin-kategorije u filterima, ista knjiga menija i isti responsive prikaz.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Supabase Auth/Postgres/Storage/RLS, Node smoke skripte, Vercel.

---

## 1. Zatečeno stanje i ključni rizici

- Aktivna grana je `main`, ali `origin/main` trenutno ne postoji (`git ls-remote --heads origin` ne vraća nijednu granu). Završni push će vjerovatno prvi put kreirati udaljeni `main`.
- Samo tri dizajn-specifikacije su trenutno u Git istoriji. Gotovo cijela aplikacija (`src`, `supabase`, `scripts`, konfiguracija i README) je još uvijek untracked.
- Postoji korisnička izmjena u `docs/superpowers/specs/2026-08-27-admin-and-site-visual-system-design.md`; njen validation zapis se mora sačuvati.
- `src/App.tsx` ima oko 1.250 linija, a `src/Admin.tsx` sadrži velike jednolinijske JSX blokove i previše odgovornosti.
- Potvrđen mrtvi kod: `MapPin`, `Phone`, `Mail`, `CATEGORIES`, `CATEGORY_COUNTS`, `CAT_META`, `menuItems`, `SCATTER_STARS`, više nekorištenih CSS keyframesa i `.no-scrollbar` pravilo.
- `lucide-react` je zavisnost bez stvarne upotrebe. `src/assets/brand/logo-matryoshka.png` nema nijednu referencu. `src/features/auth` i `src/pages` su prazni.
- `.env.example` dokumentuje `SUPABASE_SECRET_KEY`, iako ga nijedna skripta ne koristi. To nepotrebno sugeriše korištenje privilegovanog ključa.
- Nema `package-lock.json`; Vercel build zato nije potpuno reproduktivan.
- Postojeće RLS SELECT politike pozivaju `is_admin()` i za `anon`, dok je EXECUTE dodijeljen samo ulozi `authenticated`. Politike treba razdvojiti da anonimno čitanje objavljenog sadržaja ne zavisi od admin funkcije.
- Upload se dešava prije čuvanja forme; otkazana forma ili neuspješan DB upis mogu ostaviti orphan fajl u Storageu.
- `.codex` sadrži interne planove, a `.supabase/.temp` lokalne tajne. Oba moraju ostati izvan repozitorija i svih secret-scan rezultata.

## 2. Ciljna struktura projekta

```text
babuska/
├─ docs/
│  ├─ architecture.md
│  ├─ deployment.md
│  └─ verification.md
├─ scripts/
│  ├─ seed-demo-content.mjs
│  ├─ smoke-admin-content-media.mjs
│  └─ smoke-content.mjs
├─ src/
│  ├─ app/
│  │  └─ App.tsx
│  ├─ assets/
│  │  └─ brand/
│  │     ├─ logo-primary.png
│  │     └─ logo-wordmark.png
│  ├─ components/
│  │  └─ site/
│  │     ├─ Gallery.tsx
│  │     ├─ Hero.tsx
│  │     ├─ Lightbox.tsx
│  │     ├─ MenuBook.tsx
│  │     ├─ MenuDiscovery.tsx
│  │     ├─ SiteFooter.tsx
│  │     ├─ SiteHeader.tsx
│  │     └─ ornaments.tsx
│  ├─ features/
│  │  ├─ admin/
│  │  │  ├─ AdminPage.tsx
│  │  │  ├─ admin-api.ts
│  │  │  ├─ admin-mappers.ts
│  │  │  ├─ admin-types.ts
│  │  │  └─ components/
│  │  │     ├─ AdminLayout.tsx
│  │  │     ├─ ContentForm.tsx
│  │  │     ├─ CategoriesPanel.tsx
│  │  │     ├─ MenuItemsPanel.tsx
│  │  │     ├─ GalleryPanel.tsx
│  │  │     ├─ ContactForm.tsx
│  │  │     ├─ Field.tsx
│  │  │     └─ MediaUpload.tsx
│  │  └─ content/
│  │     ├─ content-api.ts
│  │     ├─ content-defaults.ts
│  │     ├─ content-mappers.ts
│  │     └─ content-types.ts
│  ├─ lib/
│  │  └─ supabase/
│  │     ├─ client.ts
│  │     └─ media.ts
│  ├─ styles/
│  │  ├─ admin.css
│  │  ├─ site.css
│  │  └─ tokens.css
│  ├─ index.css
│  ├─ main.tsx
│  └─ vite-env.d.ts
├─ supabase/
│  ├─ migrations/
│  ├─ config.toml
│  └─ seed.sql
├─ .editorconfig
├─ .env.example
├─ .gitattributes
├─ .gitignore
├─ package-lock.json
├─ package.json
├─ README.md
├─ tsconfig.json
├─ vercel.json
└─ vite.config.ts
```

Pravilo: nema generičkih barrel `index.ts` fajlova i nema kružnih importa. `AdminPage` ne smije uvoziti tipove iz javne `App` komponente.

## 3. Task 1 — Sigurni Git preflight i reproduktivan baseline

**Files:** `.gitignore`, `.gitattributes`, `.editorconfig`, `.env.example`, `package.json`, `package-lock.json`

1. Ponovo provjeriti `git status --short --branch`, `git diff`, `git remote -v` i `git ls-remote --heads origin main` neposredno prije rada.
2. Ne koristiti `git add .`. Svaku grupu fajlova stageovati eksplicitno i provjeriti sa `git diff --cached --stat` i `git diff --cached`.
3. Secret scan pokrenuti nad tracked i untracked sadržajem, ali izuzeti `.git`, `node_modules`, `dist`, `.supabase` i `.codex`:

   ```powershell
   rg -n --hidden -g '!node_modules/**' -g '!dist/**' -g '!.git/**' -g '!.supabase/**' -g '!.codex/**' 'sb_secret_|service_role|SUPABASE_SECRET_KEY\s*=|SUPABASE_ADMIN_PASSWORD\s*=.+' .
   ```

4. Proširiti `.gitignore` za `.codex/`, `.vercel/`, coverage/test izlaze i privremene smoke-state fajlove. Zadržati `.env`, `.env.local`, `.supabase/`, `node_modules/` i `dist/` kao ignorisane.
5. Dodati `.gitattributes` sa LF normalizacijom i binarnim pravilima za PNG/WebP/AVIF; dodati `.editorconfig` sa UTF-8, LF, final newline i 2-space indentom. Time se uklanja trenutni CRLF warning bez funkcionalne izmjene.
6. U `.env.example` ostaviti samo stvarno korištene varijable:

   ```dotenv
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key
   SUPABASE_ADMIN_EMAIL=admin@example.com
   SUPABASE_ADMIN_PASSWORD=local-only-password
   ```

   Komentar mora jasno navesti da posljednje dvije služe samo lokalnim seed/smoke skriptama i ne idu u Vercel. Ukloniti `SUPABASE_SECRET_KEY` i `SUPABASE_URL` jer nisu korišteni.
7. Pokrenuti `npm install` kako bi se generisao `package-lock.json`, zatim koristiti `npm ci` kao clean-install provjeru.
8. Prije refaktora pokrenuti trenutni `npm run typecheck` i `npm run build` i zabilježiti rezultat u `docs/verification.md`.
9. Napraviti lokalni baseline commit cijele funkcionalne aplikacije nakon secret/hygiene provjere: `feat: add Cafe Babuska application baseline`. Ne pushati još.

**Checkpoint:** `git status` sadrži samo planirane naredne izmjene; nijedan `.env.local`, `.supabase`, `.codex`, build artefakt ili stvarni credential nije staged.

## 4. Task 2 — TypeScript pravila i uklanjanje potvrđenog mrtvog koda

**Files:** `tsconfig.json`, `package.json`, `src/App.tsx`, `src/index.css`, `src/assets/brand/*`

1. Formatirati `tsconfig.json` i uključiti `noUnusedLocals`, `noUnusedParameters` i `noFallthroughCasesInSwitch`.
2. Promijeniti build skriptu sa neodgovarajućeg `tsc -b` na običan strict check pa Vite build:

   ```json
   {
     "typecheck": "tsc --noEmit",
     "build": "npm run typecheck && vite build",
     "verify": "npm run build"
   }
   ```

3. Ukloniti potvrđeno nekorištene importe i statičke strukture: `MapPin`, `Phone`, `Mail`, `Category`, `CATEGORIES`, `CATEGORY_COUNTS`, `CatMeta`, `CAT_META`, `menuItems` i `SCATTER_STARS`.
4. Pojednostaviti `MenuItem` tip tako da zadrži samo polja koja `MenuCard` zaista renderuje.
5. Zadržati `bookDrinks` i `galleryImages` samo kao jasno imenovane razvojne fallbacks jer su još aktivno korišteni kada Supabase nije konfigurisan; premjestiti ih kasnije u `content-defaults.ts`.
6. Ukloniti nekorištene CSS definicije `pageFlipNext`, `pageFlipPrev`, `mobileFlipNext`, `mobileFlipPrev`, `starFly` i `.no-scrollbar`; zadržati `cardIn` i `flipShadowIn` jer imaju aktivne reference.
7. Ukloniti `lucide-react` iz `package.json` i lockfilea.
8. Potvrditi da `logo-matryoshka.png` nema referenci, zatim ga izbrisati. Ne dirati originalni fajl iz korisnikovog Downloads foldera.

**Tests:** `npm run typecheck`, `npm run build`, `rg` provjera svih uklonjenih simbola.

**Commit:** `chore: remove dead code and unused assets`

## 5. Task 3 — Izdvajanje domenskih tipova, default sadržaja i Supabase adaptera

**Files:** `src/features/content/content-types.ts`, `content-defaults.ts`, `content-mappers.ts`, `content-api.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/media.ts`

1. Premjestiti `SocialLinks`, `MenuCategory`, `AdminMenuItem`, `AdminGalleryItem`, `SiteSettings`, `Lang`, `BookDrink` i javne view-modele u `content-types.ts`.
2. Premjestiti `T`, `emptySiteSettings`, fallback knjigu i fallback galeriju u `content-defaults.ts`.
3. Napraviti čiste mapere za snake_case Supabase redove u camelCase domenske objekte. Jedan settings mapper mora se koristiti i u javnom sajtu i u adminu; ne duplirati mapiranje 20+ kolona.

   ```ts
   export function mapSiteSettings(row: SiteSettingsRow | null): SiteSettings {
     return {
       phone: row?.phone ?? '',
       heroTitleSr: row?.hero_title_sr ?? '',
       // sva ostala polja na jednom mjestu
     };
   }
   ```

4. `content-api.ts` treba izložiti jednu `fetchPublicContent()` funkciju koja paralelno čita settings, aktivne kategorije, objavljene stavke i objavljenu galeriju, provjerava svaki Supabase error i vraća tipiziran rezultat.
5. Dodati deterministički sekundarni redoslijed (`sort_order`, zatim `created_at` ili `id`) kako isti podaci ne bi mijenjali raspored između učitavanja.
6. Premjestiti Supabase klijent i media helper pod `src/lib/supabase/`. Placeholder klijent ostaje samo za vizuelni development fallback i nikada ne dobija write pristup.
7. Validaciju slike zadržati centralno: JPEG/PNG/WebP/AVIF i 10 MB, random UUID object path, bez korištenja originalnog imena fajla.

**Tests:** Typecheck plus mali Node smoke nad maperima kroz postojeće backend skripte; javni query mora vratiti identičan sadržaj/redoslijed kao prije refaktora.

**Commit:** `refactor: centralize content models and Supabase access`

## 6. Task 4 — Modularizacija javnog frontenda bez vizuelnog regresa

**Files:** `src/app/App.tsx`, `src/components/site/*`, `src/features/content/*`, `src/main.tsx`, ukloniti stari `src/App.tsx`

1. `src/app/App.tsx` svesti na rute `/` i `/admin`.
2. Javni page state ostaviti u jednoj `LandingPage` komponenti ili malom hooku, a markup izdvojiti u imenovane sekcije: header, hero, discovery menu, book menu, gallery/lightbox i footer.
3. `LangContext` ne exportovati iz route fajla. `lang` proslijediti eksplicitno komponentama kojima treba ili ga smjestiti u zaseban content kontekst samo ako propovi postanu nepregledni.
4. Očuvati ključne invarijante:
   - hero uvijek koristi isti URL, `object-cover`, `object-position: center center` i istu visinu u SR i EN;
   - početni hero koristi tekstualni wordmark, dok header/footer/admin koriste primarni Babuska logo;
   - dugme „Istraži meni“ ostaje puno Babuska crveno i skroluje na `#menu`;
   - filteri dolaze isključivo iz `menu_categories`; nema `All` ili hardkodirane default kategorije;
   - knjiga koristi admin stavke grupisane redom kategorija i `sort_order`;
   - uklonjene gornje linije na stranicama knjige se ne vraćaju;
   - galerija koristi objavljene admin slike i lokalizovan alt tekst.
5. Dodati čiste empty/error slučajeve: bez kategorija nema lažnog filtera; bez galerijskih slika nema pokušaja otvaranja lightboxa; lightbox indeks se resetuje kada se lista promijeni.
6. Dodati `aria-label` na lightbox i mobilne kontrole, zatvaranje na Escape i zaštitu od pristupa `publicGallery[index]` kada indeks više nije važeći.
7. Pri promjeni jezika ažurirati `document.documentElement.lang` na `sr-Cyrl` ili `en` bez promjene layouta.

**Visual checks:** prije/poslije screenshotovi na 1920×1080, 1440×900, 768×1024 i 390×844; porediti hero crop, širinu kartica, tipografiju, knjigu, galeriju, footer i horizontalni overflow.

**Tests:** `npm run typecheck`, `npm run build`, ručni browser smoke za SR/EN i sve navigacione linkove.

**Commit:** `refactor: split public landing page into stable sections`

## 7. Task 5 — Modularizacija i funkcionalno učvršćivanje admin panela

**Files:** `src/features/admin/AdminPage.tsx`, `admin-api.ts`, `admin-mappers.ts`, `admin-types.ts`, `src/features/admin/components/*`, ukloniti stari `src/Admin.tsx`

1. Odvojiti session/login/role provjeru od CRUD logike. `AdminPage` treba orkestrirati tabove i feedback, ne sadržavati sve forme u jednom return izrazu.
2. Izdvojiti `Field`, `MediaUpload`, layout i svaki tab u zasebnu komponentu. JSX formatirati normalno, bez stotina elemenata na jednoj liniji.
3. Sve Supabase operacije staviti u `admin-api.ts`: load, save/delete category, save/delete item, save/delete gallery i save settings. Svaka vraća jasnu grešku; UI ne smije prikazati success ako bilo koji primarni DB upis nije uspio.
4. Centralizovati settings payload mapper u `admin-mappers.ts`; ne koristiti string-cast pristup raširen kroz JSX.
5. Uvesti `saving` stanje po formi, onemogućiti dupli submit i sačuvati unesene vrijednosti nakon greške.
6. Ispraviti lifecycle uploadovanih fajlova:
   - novi upload je pending dok DB zapis ne uspije;
   - ako DB upis ne uspije, novouploadovani object se briše;
   - otkazivanje editovanja briše samo pending object, nikada prethodno sačuvanu sliku;
   - stari owned object se briše tek poslije uspješnog DB updatea;
   - brisanje zapisa prijavljuje zasebno upozorenje ako Storage cleanup ne uspije.
7. Sačuvati elegantni borderless izgled: bez bordera oko tabova, panela i odjave; jasna hijerarhija kroz pozadinu, razmak, tip i status. Ne vraćati stare dekorativne forme.
8. Provjeriti mobilni admin: tabovi horizontalno skrolabilni, forme jedna kolona, akcije dostupne bez horizontalnog overflowa.

**Tests:** login sa admin korisnikom; add/edit/delete kategorije, stavke, galerijske slike i settings; denied korisnik; logout; upload failure; DB failure nakon uploada; cleanup potvrda.

**Commit:** `refactor: modularize admin content management`

## 8. Task 6 — Jedinstveni brending, CSS i asset organizacija

**Files:** `src/styles/tokens.css`, `site.css`, `admin.css`, `src/index.css`, `src/assets/brand/*`, `index.html`

1. Preimenovati aktivni primarni logo u `logo-primary.png`; zadržati `logo-wordmark.png`. Ažurirati sve importe eksplicitno.
2. `index.css` svesti na font/Tailwind import, global reset i import tri style fajla.
3. `tokens.css` treba biti jedini izvor boja, tipografije, razmaka, sjenki i focus stanja. Ukloniti duplikate između `@theme` i `:root`; Tailwind varijable mapirati na iste vrijednosti.
4. Zadržati stvarne postojeće vizuelne vrijednosti tokom zamjene inline hex/rgba vrijednosti CSS varijablama. Ne mijenjati izgled samo zato što se token preimenuje.
5. Premjestiti javne layout/animation klase u `site.css`, a sve `admin-*` klase u `admin.css`.
6. Smanjiti inline event-style mutacije (`onMouseEnter/onMouseLeave`) i zamijeniti ih CSS hover/focus pravilima, uz isti computed izgled.
7. Dodati favicon referencu na primarni logo iz jednog izvora, bez dupliranja logo fajla u više foldera.
8. Provjeriti da se logo ne rasteže, da transparentnost ostaje očuvana i da nema accidental kompresije PNG-a.

**Tests:** vizuelni diff na četiri viewporta, tastatura/focus provjera i `npm run build` sa provjerom da build ne uključuje stari logo ili `lucide-react` chunk.

**Commit:** `style: consolidate Cafe Babuska brand system`

## 9. Task 7 — Supabase RLS, Storage i migracije spremne za produkciju

**Files:** novi `supabase/migrations/20260827234500_harden_public_content_policies.sql`, `supabase/seed.sql`, `scripts/smoke-*.mjs`

1. Ne mijenjati već primijenjene tri migracije; sva poboljšanja dodati u novu forward-only migraciju.
2. Razdvojiti anon i authenticated SELECT politike. Anon politika smije provjeravati samo `is_published`/`is_active`; authenticated politika može koristiti `public.is_admin()`.

   ```sql
   drop policy if exists "public reads published menu" on public.menu_items;

   create policy "anon reads published menu"
   on public.menu_items for select to anon
   using (is_published);

   create policy "authenticated reads published menu"
   on public.menu_items for select to authenticated
   using (is_published or public.is_admin());
   ```

   Isti obrazac primijeniti na `gallery_items` i `menu_categories`.
3. Storage write politike ograničiti na bucket `cafe-media`, admina i dozvoljene foldere `menu/` i `gallery/`. Smoke fajlove smjestiti unutar ta dva foldera.
4. Potvrditi da anon može čitati objavljeno, ne vidi neobjavljeno i da query ne pada kada u tabeli postoje neobjavljeni redovi.
5. `supabase/seed.sql` ostaje minimalni preview seed; 30 demo stavki ostaju isključivo u `npm run seed:demo` i ne smiju se automatski unositi u produkciju.
6. Smoke skripte učiniti crash-safe: state zapisati odmah poslije svake kreirane stavke; cleanup staviti u `finally`; vraćati originalne settings vrijednosti i uklanjati samo vlastite marker zapise/objekte.
7. Dodati provjere za: anon write rejection, neobjavljeni sadržaj, category FK restrict, settings update, media upload/read/delete i odsustvo orphan objekata.

**Local-only validation:** `supabase status`, `supabase db lint --local`, zatim smoke skripte. `supabase db reset` pokretati samo nad potvrđeno disposable lokalnom bazom ili nakon eksplicitne potvrde, jer briše lokalne podatke.

**Commit:** `fix: harden Supabase content and media policies`

## 10. Task 8 — Vercel konfiguracija i deploy dokumentacija

**Files:** `vercel.json`, `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/verification.md`, ukloniti superseded `docs/superpowers/specs/*` nakon konsolidacije

1. U `vercel.json` eksplicitno navesti `buildCommand: npm run build` i `outputDirectory: dist`; zadržati SPA rewrite i postojeće sigurnosne headere. Dodati immutable cache header samo za Vite hashed `/assets/*`.
2. Provjeriti da Vercel dobija samo:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   Admin email/password i bilo kakav secret/service-role ključ ne smiju biti Vercel varijable.
3. `docs/deployment.md` treba dokumentovati tačan redoslijed:
   - kreirati/linkovati Supabase projekat;
   - `supabase link --project-ref <project-ref>`;
   - `supabase db push --dry-run`, pregledati SQL, pa `supabase db push`;
   - kreirati Auth korisnika i upisati njegov UUID u `public.admin_users`;
   - postaviti Supabase Site URL/allowed origins na Vercel domen;
   - povezati GitHub repo s Vercelom, postaviti dvije public env varijable i deployati;
   - poslije deploya pokrenuti read-only produkcioni smoke, dok write smoke ostaje lokal/staging.
4. `docs/architecture.md` treba objasniti content flow, RLS model, Storage ownership i komponentne granice.
5. Validation zapis iz trenutno izmijenjene spec datoteke prenijeti u `docs/verification.md` zajedno s novim rezultatima.
6. Nakon potvrde da su svi jedinstveni zahtjevi preneseni, ukloniti četiri superseded datirane spec datoteke. Git istorija ostaje recovery izvor; `.codex` planovi se nikada ne stageuju.
7. README skratiti na setup, lokalne URL-ove, glavne npm komande, admin setup i linkove na architecture/deployment dokumente.

**Tests:** clean clone simulacija kroz `npm ci && npm run build`; opcionalno `vercel build` ako je Vercel CLI dostupan i projekat linkovan.

**Commit:** `docs: finalize Supabase and Vercel deployment guide`

## 11. Task 9 — Završni funkcionalni i vizuelni smoke test

1. Pokrenuti:

   ```powershell
   npm ci
   npm run typecheck
   npm run build
   npm run smoke:content
   npm run smoke:admin-content-media
   ```

2. Lokalno pokrenuti frontend na `http://localhost:4300` i provjeriti Supabase API/Studio statuse.
3. Javni sajt:
   - SR/EN mijenja samo tekst i `html lang`, ne hero geometriju;
   - crveno dugme „Istraži meni“ je vidljivo i vodi na meni;
   - nema hardkodiranog default filtera;
   - 30 demo stavki se prikazuje u odgovarajućim kategorijama i redom u knjizi;
   - nema označenih gornjih linija knjige;
   - galerija, lightbox, footer kontakti i mreže rade;
   - nema konzolnih grešaka, broken slika ili horizontalnog overflowa.
4. Admin:
   - login/denied/logout;
   - create/edit/delete kategorije;
   - create/edit/delete menu itema sa uploadom;
   - create/edit/order/publish/delete galerijske slike;
   - izmjena SR/EN hero/footer teksta, adrese, kontakta i mreža;
   - svaka izmjena se vidi na javnom sajtu poslije reload-a;
   - UI ostaje čist, borderless i čitljiv na desktopu i telefonu.
5. Backend:
   - anon SELECT objavljenog radi;
   - anon write pada;
   - neobjavljeni redovi nisu vidljivi anonimno;
   - non-admin ne dobija admin pristup;
   - Storage dozvoljava samo admin upload u odobrene foldere;
   - smoke cleanup ne ostavlja redove ili objekte.
6. Sačuvati rezultate, viewportove i eventualne poznate neblokirajuće napomene u `docs/verification.md`.

## 12. Task 10 — Finalni Git audit, commit i siguran push na `main`

1. Provjeriti finalni tree:

   ```powershell
   git status --short
   git diff --check
   git diff --stat
   git ls-files
   ```

2. Ponoviti secret scan, potvrditi da nema `.env.local`, `.supabase`, `.codex`, `dist`, `node_modules`, mrtvog loga i starih praznih foldera.
3. Stageovati finalne fajlove eksplicitnim putanjama, pregledati `git diff --cached`, pa napraviti završni commit: `chore: prepare Cafe Babuska for production deployment`.
4. Ponovo provjeriti udaljeni repo:

   ```powershell
   git ls-remote --heads origin main
   ```

5. Ako `origin/main` i dalje ne postoji, kreirati ga bez force-a:

   ```powershell
   git push -u origin main
   ```

6. Ako se `origin/main` u međuvremenu pojavi, prvo `git fetch origin main`, pregledati `git log --left-right --graph main...origin/main`, integrisati tuđe commitove normalnim merge/rebase postupkom i ponoviti sve provjere. Nikada ne koristiti `--force` ili `--force-with-lease` bez zasebnog izričitog odobrenja.
7. Poslije push-a provjeriti remote commit SHA i da je GitHub default branch `main`.

**Definition of done:** finalni `main` je čist, nema tajni ili build artefakata, build je reproducibilan preko lockfilea, svi CRUD/RLS/Storage smoke testovi prolaze, javni i admin UI nemaju vizuelni regres, Supabase migracije i Vercel konfiguracija su dokumentovane, a GitHub `main` pokazuje provjeren završni commit.

## 13. Potrebni vanjski podaci za stvarni produkcioni deploy

Git push i priprema projekta mogu se završiti bez ovoga. Za stvarno povezivanje produkcije biće potrebni:

- Supabase project ref i publishable key;
- potvrda produkcionog admin emaila (lozinka se ne zapisuje u repo niti plan);
- Vercel project/team pristup ili već linkovan `.vercel` projekat;
- konačni produkcioni domen za Supabase Site URL/allowed origins.

Nedostatak tih podataka nije razlog da se zaustavi cleanup ili Git push, ali jeste granica za stvarni Supabase/Vercel produkcioni deploy.
