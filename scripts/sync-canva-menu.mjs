import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const APPLY = process.argv.includes("--apply");
const normalize = (value) =>
  value
    .toLocaleLowerCase("sr")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const price = (value) => `${value.toFixed(2)} KM`;

const categories = [
  ["hot", "Топли напици", "Warm Drinks", "Горячие напитки", ["topli napici"]],
  ["water", "Воде", "Water", "Вода", ["vode"]],
  ["soft", "Сокови", "Soft Drinks", "Безалкогольные напитки", ["sokovi"]],
  ["fresh", "Цијеђени сокови", "Fresh Juices", "Свежевыжатые соки", ["cijedjeni sokovi"]],
  ["beer", "Пиво", "Beer", "Пиво", ["pivo"]],
  ["cider", "Сајдери", "Cider", "Сидр", ["sajderi", "цидери", "cideri"]],
  ["rakija", "Ракије", "Rakija", "Ракия", ["rakije"]],
  ["liqueur", "Ликери", "Liqueurs", "Ликёры", ["likeri"]],
  ["whisky", "Виски бурбон", "Whisky / Bourbon", "Виски и бурбон", ["viski burbon", "вискиј бурбон"]],
  ["vodka", "Вотка", "Vodka", "Водка", ["votka", "водка"]],
  ["tequila", "Текила", "Tequila", "Текила", ["tekila"]],
  ["gin", "Џин", "Gin", "Джин", ["dzin"]],
  ["rum", "Рум", "Rum", "Ром", ["rum"]],
  ["cocktail", "Коктел", "Cocktails", "Коктейли", ["koktel"]],
  ["wine", "Вино", "Wine", "Вино", ["vino"]],
  ["sparkling", "Пјенушава вина", "Sparkling Wine", "Игристые вина", ["pjenusava vina"]],
].map(([id, nameSr, nameEn, nameRu, aliases], sortOrder) => ({
  id,
  nameSr,
  nameEn,
  nameRu,
  aliases: aliases.map(normalize),
  sortOrder,
}));

const russianMenuNames = new Map([
  ["Еспресо", "Эспрессо"],
  ["Капућино", "Капучино"],
  ["Капућино са сојиним млијеком", "Капучино с соевым молоком"],
  ["Лате", "Латте"],
  ["Чај (мента, камилица, лимунска трава - ђумбир, зелени, црни индијски, јагода - ванилија, брусница, трешња, јабука - цимет, шумско воће)", "Чай (мята, ромашка, лемонграсс и имбирь, зелёный, индийский чёрный, клубника и ваниль, клюква, вишня, яблоко и корица, лесные ягоды)"],
  ["Кока-Кола Зиро", "Кока-Кола Зеро"],
  ["Швепс битер лемон", "Швепс Биттер Лемон"],
  ["Витаминка сокови (ђус, мултивитамин, бресква, јабука, боровница, јагода)", "Соки Витаминка (апельсин, мультивитамин, персик, яблоко, черника, клубника)"],
  ["Џуси вита (лимун, наранџа)", "Джуси Вита (лимон, апельсин)"],
  ["Лимунада", "Лимонад"],
  ["Цијеђена наранџа", "Свежевыжатый апельсиновый сок"],
  ["Цијеђени грејп", "Свежевыжатый грейпфрутовый сок"],
  ["Цијеђена јабука", "Свежевыжатый яблочный сок"],
  ["Цијеђени микс наранџа и лимун", "Свежевыжатый микс апельсина и лимона"],
  ["Цијеђени микс наранџа и грејп", "Свежевыжатый микс апельсина и грейпфрута"],
  ["Цијеђени микс наранџа, лимун и грејп", "Свежевыжатый микс апельсина, лимона и грейпфрута"],
  ["Зарић шљива", "Зарич Слива"],
  ["Зарић дуња", "Зарич Айва"],
  ["Зарић кајсија", "Зарич Абрикос"],
  ["Зарић крушка", "Зарич Груша"],
  ["Горда шљивовица", "Горда Сливовица"],
  ["Завет траварица", "Завет Травяная ракия"],
  ["Мараска вишњевац", "Мараска Вишнёвый ликёр"],
  ["Мараска медица", "Мараска Медовый ликёр"],
  ["Капетан Морган Вајт", "Капитан Морган Уайт"],
  ["Капетан Морган Голд", "Капитан Морган Голд"],
  ["Вотка Гимлет", "Водка Гимлет"],
  ["Тиквеш Александрија црвена", "Тиквеш Александрия красное"],
  ["Тиквеш Александрија црвена 0,1", "Тиквеш Александрия красное 0,1"],
  ["Тиквеш Александрија бијела", "Тиквеш Александрия белое"],
  ["Тиквеш Александрија бијела 0,1", "Тиквеш Александрия белое 0,1"],
  ["Луда Мара бијела", "Луда Мара белое"],
  ["Луда Мара црвена", "Луда Мара красное"],
]);

const rows = [
  ["hot", "Еспресо", "Espresso", 2.5],
  ["hot", "Капућино", "Cappuccino", 3.5],
  ["hot", "Капућино са сојиним млијеком", "Cappuccino with soy milk", 4],
  ["hot", "Лате", "Latte", 4.5],
  ["hot", "Нес класик", "Nescafé Classic", 3],
  ["hot", "Франк капућино (ајриш, ванила, бајадера, пистација)", "Franck Cappuccino (Irish, vanilla, Bajadera, pistachio)", 4],
  ["hot", "Чај (мента, камилица, лимунска трава - ђумбир, зелени, црни индијски, јагода - ванилија, брусница, трешња, јабука - цимет, шумско воће)", "Tea (mint, chamomile, lemongrass and ginger, green, Indian black, strawberry vanilla, cranberry, cherry, apple cinnamon, forest fruit)", 3],
  ["water", "Вивиа 0,25", "Vivia 0.25", 2.5],
  ["water", "Витинка 0,25", "Vitinka 0.25", 3],
  ["water", "Егзотик (крушка, лимета - маракуја, наранџа)", "Exotic (pear, lime-passion fruit, orange)", 4],
  ["soft", "Кока-Кола", "Coca-Cola", 4],
  ["soft", "Кока-Кола Зиро", "Coca-Cola Zero", 4],
  ["soft", "Фанта", "Fanta", 4],
  ["soft", "Спрајт", "Sprite", 4],
  ["soft", "Швепс тоник", "Schweppes Tonic", 4],
  ["soft", "Швепс битер лемон", "Schweppes Bitter Lemon", 4],
  ["soft", "Витаминка сокови (ђус, мултивитамин, бресква, јабука, боровница, јагода)", "Vitaminka juices (orange, multivitamin, peach, apple, blueberry, strawberry)", 3.5],
  ["soft", "Оранжина", "Orangina", 4.5],
  ["soft", "Томас Хенри тоник", "Thomas Henry Tonic", 6.5],
  ["soft", "Ред Бул", "Red Bull", 6.5],
  ["soft", "Џуси вита (лимун, наранџа)", "Juicy Vita (lemon, orange)", 3],
  ["fresh", "Лимунада", "Lemonade", 4],
  ["fresh", "Цијеђена наранџа", "Fresh orange juice", 5],
  ["fresh", "Цијеђени грејп", "Fresh grapefruit juice", 5.5],
  ["fresh", "Цијеђена јабука", "Fresh apple juice", 5.5],
  ["fresh", "Цијеђени микс наранџа и лимун", "Fresh orange and lemon mix", 7],
  ["fresh", "Цијеђени микс наранџа и грејп", "Fresh orange and grapefruit mix", 7.5],
  ["fresh", "Цијеђени микс наранџа, лимун и грејп", "Fresh orange, lemon and grapefruit mix", 8],
  ["beer", "Нектар 0,33", "Nektar 0.33", 3.5],
  ["beer", "Зајечарско 0,33", "Zaječarsko 0.33", 3.5],
  ["beer", "Зајечарско 0,50", "Zaječarsko 0.50", 4],
  ["beer", "Лашко 0,33", "Laško 0.33", 3.5],
  ["beer", "Лашко малт 0,33", "Laško Malt 0.33", 4.5],
  ["beer", "Карлсберг 0,33", "Carlsberg 0.33", 4.5],
  ["beer", "Стела Артоа 0,33", "Stella Artois 0.33", 5.5],
  ["beer", "Пауланер Вајсбир 0,50", "Paulaner Weissbier 0.50", 7.5],
  ["beer", "Бајројтер Хел 0,50", "Bayreuther Hell 0.50", 8],
  ["beer", "Хајнекен 0,33", "Heineken 0.33", 5.5],
  ["beer", "Хајнекен 0,40", "Heineken 0.40", 6],
  ["beer", "Кромбахер точено 0,40", "Krombacher Draft 0.40", 5],
  ["cider", "Сомерсби (јабука, боровница) 0,33", "Somersby (apple, blueberry) 0.33", 6],
  ["rakija", "Зарић шљива", "Zarić Plum", 5],
  ["rakija", "Зарић дуња", "Zarić Quince", 5],
  ["rakija", "Зарић кајсија", "Zarić Apricot", 5],
  ["rakija", "Зарић крушка", "Zarić Pear", 5],
  ["rakija", "Жута оса", "Žuta Osa", 4.5],
  ["rakija", "Горда шљивовица", "Gorda Plum Brandy", 5],
  ["rakija", "Ђедова ракија", "Đedova Rakija", 5],
  ["rakija", "Крајишка љепотица", "Krajiška Ljepotica", 6],
  ["rakija", "Шљива соколова", "Šljiva Sokolova", 4.5],
  ["rakija", "Мећава шљива барик", "Mećava Plum Barrique", 4],
  ["rakija", "Завет шљива", "Zavet Plum", 7.5],
  ["rakija", "Завет траварица", "Zavet Herbal Rakija", 3],
  ["liqueur", "Мараска вишњевац", "Maraska Cherry Liqueur", 3],
  ["liqueur", "Мараска медица", "Maraska Medica", 3],
  ["liqueur", "Херитејџ пелинковац", "Heritage Pelinkovac", 3.5],
  ["liqueur", "Горки лист", "Gorki List", 3.5],
  ["liqueur", "Бејлис", "Baileys", 4.5],
  ["liqueur", "Јегермајстер", "Jägermeister", 4],
  ["liqueur", "Лимончело", "Limoncello", 4],
  ["whisky", "Џек Денијелс", "Jack Daniel's", 5.5],
  ["whisky", "Џентлмен Џек", "Gentleman Jack", 7],
  ["whisky", "Џејмсон", "Jameson", 5.5],
  ["whisky", "Фејмус Граус", "Famous Grouse", 4],
  ["whisky", "Џим Бим Блек", "Jim Beam Black", 5],
  ["whisky", "Џони Вокер Ред", "Johnnie Walker Red", 4],
  ["whisky", "Џони Вокер Блек", "Johnnie Walker Black", 8],
  ["whisky", "Фор Роузиз", "Four Roses", 4.5],
  ["vodka", "Финландија", "Finlandia", 2.5],
  ["vodka", "Смирноф", "Smirnoff", 3],
  ["vodka", "Греј Гус", "Grey Goose", 10],
  ["tequila", "Олмека Бјанко", "Olmeca Blanco", 4.5],
  ["tequila", "Олмека Голд", "Olmeca Gold", 4.5],
  ["gin", "Гордонс", "Gordon's", 4],
  ["gin", "Хендрикс", "Hendrick's", 7],
  ["gin", "Танкерај", "Tanqueray", 5],
  ["gin", "Бомбај Сафир", "Bombay Sapphire", 6],
  ["rum", "Капетан Морган Вајт", "Captain Morgan White", 3],
  ["rum", "Капетан Морган Голд", "Captain Morgan Gold", 3],
  ["cocktail", "Аперол Шприц", "Aperol Spritz", 7],
  ["cocktail", "Хуго Шприц", "Hugo Spritz", 6],
  ["cocktail", "Еспресо Мартини", "Espresso Martini", 12],
  ["cocktail", "Мохито", "Mojito", 8],
  ["cocktail", "Вотка Гимлет", "Vodka Gimlet", 8],
  ["cocktail", "Мимоза", "Mimosa", 5],
  ["cocktail", "Лимончело Шприц", "Limoncello Spritz", 10],
  ["wine", "Тиквеш Тамјаника", "Tikveš Tamjanika", 29],
  ["wine", "Тиквеш Тамјаника 0,1", "Tikveš Tamjanika 0.1", 5.5],
  ["wine", "Тиквеш Александрија црвена", "Tikveš Aleksandrija Red", 29],
  ["wine", "Тиквеш Александрија црвена 0,1", "Tikveš Aleksandrija Red 0.1", 5.5],
  ["wine", "Тиквеш Александрија бијела", "Tikveš Aleksandrija White", 29],
  ["wine", "Тиквеш Александрија бијела 0,1", "Tikveš Aleksandrija White 0.1", 5.5],
  ["wine", "Тиквеш Вранац СС", "Tikveš Vranac SS", 48],
  ["wine", "Тиквеш Шардоне", "Tikveš Chardonnay", 27],
  ["wine", "Јунгић Тамјаника премиум", "Jungić Tamjanika Premium", 53],
  ["wine", "Јунгић Шикар селекција", "Jungić Šikar Selection", 37],
  ["wine", "Јунгић Мадам розе", "Jungić Madam Rosé", 37],
  ["wine", "Јунгић Ризлинг премиум", "Jungić Riesling Premium", 63],
  ["wine", "Каза Бјанка Бароло", "Casa Bianca Barolo", 115],
  ["wine", "Ла Стела Барбера Диасти", "La Stella Barbera d'Asti", 55],
  ["wine", "Луда Мара бијела", "Luda Mara White", 53],
  ["wine", "Луда Мара црвена", "Luda Mara Red", 53],
  ["sparkling", "Цинзано", "Cinzano", 34],
  ["sparkling", "Цинзано 0,1 л", "Cinzano 0.1 l", 6],
  ["sparkling", "Мартини и Роси", "Martini & Rossi", 42],
].map(([categoryId, nameSr, nameEn, value], sortOrder) => ({
  categoryId,
  nameSr,
  nameEn,
  nameRu: russianMenuNames.get(nameSr) ?? nameSr,
  price: price(value),
  sortOrder,
}));

const temporaryNames = [
  "Двоструки еспресо",
  "Лате са ванилом",
  "Топла чоколада са љешником",
].map(normalize);

const legacyNames = new Map(
  [
    ["Франк капућино (ајриш, ванила, бајадера, пистација)", ["Франк капућино (Ајриш, Ванила, Бајадера, Пистација)"]],
    ["Чај (мента, камилица, лимунска трава - ђумбир, зелени, црни индијски, јагода - ванилија, брусница, трешња, јабука - цимет, шумско воће)", ["Чај (мента, камилица, лимунска трава и ђумбир, зелени, црни индијски, јагода ванилија, брусница, трешња, јабука цимет, шумско воће)"]],
    ["Егзотик (крушка, лимета - маракуја, наранџа)", ["Егзотик (крушка, лимета маракуја, наранџа)"]],
    ["Спрајт", ["Sprite"]],
    ["Лашко малт 0,33", ["Laško Malt 0,33"]],
    ["Карлсберг 0,33", ["Carlsberg 0,33"]],
    ["Стела Артоа 0,33", ["Stella Artois 0,33"]],
    ["Танкерај", ["Танкереј"]],
    ["Тиквеш Александрија црвена", ["Тиквеш Александрија Ред"]],
    ["Тиквеш Александрија црвена 0,1", ["Тиквеш Александрија Ред 0,1"]],
    ["Тиквеш Александрија бијела", ["Тиквеш Александрија Вајт"]],
    ["Тиквеш Александрија бијела 0,1", ["Тиквеш Александрија Вајт 0,1"]],
    ["Јунгић Тамјаника премиум", ["Јунгић Тамјаника Премијум"]],
    ["Јунгић Шикар селекција", ["Јунгић Шикар Селекција"]],
    ["Јунгић Мадам розе", ["Јунгић Мадам Розе"]],
    ["Јунгић Ризлинг премиум", ["Јунгић Ризлинг"]],
    ["Мартини и Роси", ["Мартини & Роси"]],
  ].map(([canonical, aliases]) => [normalize(canonical), aliases.map(normalize)]),
);

function validateDataset() {
  if (rows.length !== 105) throw new Error(`Expected 105 rows, found ${rows.length}.`);
  const keys = new Set();
  for (const row of rows) {
    if (!/[\p{Script=Cyrillic}]/u.test(row.nameSr) || !row.nameEn || !/[\p{Script=Cyrillic}]/u.test(row.nameRu) || !/^\d+\.\d{2} KM$/.test(row.price))
      throw new Error(`Invalid canonical row: ${row.nameSr}`);
    const key = `${row.categoryId}:${normalize(row.nameSr)}`;
    if (keys.has(key)) throw new Error(`Duplicate canonical row: ${row.nameSr}`);
    keys.add(key);
  }
}

async function main() {
  validateDataset();
  const perCategory = Object.fromEntries(categories.map((category) => [category.nameSr, rows.filter((row) => row.categoryId === category.id).length]));
  if (!APPLY) {
    console.log(JSON.stringify({ mode: "dry-run", rows: rows.length, perCategory }, null, 2));
    return;
  }
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.SUPABASE_ADMIN_EMAIL;
  const password = process.env.SUPABASE_ADMIN_PASSWORD;
  if (!url || !key || !email || !password)
    throw new Error("Missing production Supabase URL, publishable key, administrator email, or password.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !auth.session) throw new Error(`Administrator authentication failed: ${authError?.message ?? "no session"}`);
  const [{ data: existingCategories, error: categoryReadError }, { data: existingItems, error: itemReadError }] = await Promise.all([
    client.from("menu_categories").select("id, name, name_sr, name_en, name_ru, sort_order"),
    client.from("menu_items").select("id, category_id, name, name_sr, name_en, name_ru, image_url, storage_path, image_variants"),
  ]);
  if (categoryReadError || itemReadError) throw new Error(categoryReadError?.message ?? itemReadError?.message);
  const categoryIds = new Map();
  for (const category of categories) {
    const known = [category.nameSr, category.nameEn, ...category.aliases].map(normalize);
    const existing = (existingCategories ?? []).find((row) => known.includes(normalize(row.name_sr ?? row.name_en ?? row.name ?? "")) || known.includes(normalize(row.name_en ?? "")));
    const payload = { name: category.nameSr, name_sr: category.nameSr, name_en: category.nameEn, name_ru: category.nameRu, sort_order: category.sortOrder, is_active: true };
    const result = existing ? await client.from("menu_categories").update(payload).eq("id", existing.id).select("id").single() : await client.from("menu_categories").insert(payload).select("id").single();
    if (result.error || !result.data) throw new Error(`Could not save ${category.nameSr}: ${result.error?.message ?? "no row"}`);
    categoryIds.set(category.id, result.data.id);
  }
  for (const row of rows) {
    const categoryId = categoryIds.get(row.categoryId);
    const knownNames = [normalize(row.nameSr), ...(legacyNames.get(normalize(row.nameSr)) ?? [])];
    const matching = (existingItems ?? []).find((item) => item.category_id === categoryId && knownNames.includes(normalize(item.name_sr ?? item.name ?? "")));
    const payload = { name: row.nameSr, name_sr: row.nameSr, name_en: row.nameEn, name_ru: row.nameRu, category_id: categoryId, price: row.price, description: "", description_sr: "", description_en: "", description_ru: "", fact: null, fact_sr: null, fact_en: null, fact_ru: null, is_published: true, sort_order: row.sortOrder };
    const result = matching ? await client.from("menu_items").update(payload).eq("id", matching.id) : await client.from("menu_items").insert(payload);
    if (result.error) throw new Error(`Could not save ${row.nameSr}: ${result.error.message}`);
  }
  const temporaryIds = (existingItems ?? []).filter((item) => temporaryNames.includes(normalize(item.name_sr ?? item.name ?? ""))).map((item) => item.id);
  if (temporaryIds.length > 3) throw new Error(`Found ${temporaryIds.length} rows matching approved temporary names.`);
  if (temporaryIds.length) {
    const { error: deleteError } = await client.from("menu_items").delete().in("id", temporaryIds);
    if (deleteError) throw new Error(`Could not remove temporary rows: ${deleteError.message}`);
  }
  const expected = new Set(rows.map((row) => `${categoryIds.get(row.categoryId)}:${normalize(row.nameSr)}:${row.price}`));
  const sourceCategoryIds = new Set(categoryIds.values());
  const { data: candidates, error: candidateError } = await client.from("menu_items").select("id, category_id, name_sr, price").eq("is_published", true);
  if (candidateError) throw new Error(candidateError.message);
  const staleIds = (candidates ?? [])
    .filter((item) => sourceCategoryIds.has(item.category_id))
    .filter((item) => !expected.has(`${item.category_id}:${normalize(item.name_sr)}:${item.price}`))
    .map((item) => item.id);
  if (staleIds.length > 12) throw new Error(`Refusing to remove ${staleIds.length} unexpected legacy rows.`);
  if (staleIds.length) {
    const { error: staleDeleteError } = await client.from("menu_items").delete().in("id", staleIds);
    if (staleDeleteError) throw new Error(`Could not remove legacy duplicates: ${staleDeleteError.message}`);
  }
  const { data: finalItems, error: finalError } = await client.from("menu_items").select("id, category_id, name_sr, name_en, name_ru, price, description_sr, description_en, description_ru, fact_sr, fact_en, fact_ru").eq("is_published", true);
  if (finalError) throw new Error(finalError.message);
  const actual = new Set((finalItems ?? []).map((item) => `${item.category_id}:${normalize(item.name_sr)}:${item.price}`));
  if (expected.size !== actual.size || [...expected].some((key) => !actual.has(key))) throw new Error("Post-write verification failed: published menu does not exactly match Canva dataset.");
  console.log(JSON.stringify({ mode: "applied", rows: actual.size, deletedTemporaryRows: temporaryIds.length, deletedLegacyRows: staleIds.length, perCategory }, null, 2));
  await client.auth.signOut();
}

await main();
