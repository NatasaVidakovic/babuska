# Canva menu synchronization and gelato fallback

## Objective

Make the public and administrative menu match the supplied Canva menu exactly. Every source drink receives a Serbian Cyrillic name, an English name, the Canva price in KM, and its source category. The three temporary drinks that do not appear in Canva are removed. Menu-item descriptions and facts remain empty.

## Source and canonical data

The editable Canva design `DAHVA0SOCD4` is the single source of truth. Its five content pages contain 105 drinks in these groups: hot drinks, water, soft drinks, fresh juices, beer, cider, rakija, liqueurs, whisky/bourbon, vodka, tequila, gin, rum, cocktails, wine, and sparkling wine.

The current public bootstrap contains 106 rows. Three rows are not in Canva and are explicitly approved for deletion:

- `Двоструки еспресо` / `Double Espresso`
- `Лате са ванилом` / `Vanilla Latte`
- `Топла чоколада са љешником` / `Hazelnut Hot Chocolate`

The canonical Serbian text is Cyrillic, including international brands where the source menu writes a transliteration (for example `Спрајт`, `Карлсберг`, and `Стела Артоа`). English uses the conventional English brand or drink name. Prices use two decimal places and the `КМ` suffix in Serbian and `KM` in English display.

## Data flow

1. A maintenance script authenticates as an administrator against the production Supabase project. It never stores credentials in source control.
2. It loads the existing categories and menu items, then creates missing source categories and updates category names/order where needed.
3. It upserts the 105 canonical rows by a stable normalized Serbian source name and category. Each upsert overwrites bilingual name, price, category, display order, description, and fact fields; image fields are preserved.
4. It deletes only the three approved temporary rows listed above.
5. It reads the public bootstrap anonymously and asserts all 105 expected `(category, Serbian name, English name, price)` tuples are present once, no approved temporary row remains, and no description/fact text is exposed.

No schema, RLS, storage policy, or Supabase secret changes are needed.

## Gelato fallback

The existing category fallback icon system gains a `gelato` type. Names containing `сладолед`, `гелато`, `gelato`, or `ice cream` map to a small brand-coloured gelato cone illustration. This is displayed only when a gelato item has no uploaded image, following the same rule as every existing beverage category. Uploaded product images always take precedence.

## Failure handling and verification

The script stops before deletion when a source category cannot be resolved or any upsert fails. After synchronization it reports exact counts per category and every price mismatch. The frontend change is verified with typecheck, unit tests, production build, and a responsive public-menu smoke check. The production data read is repeated after the write to verify the visible result.
