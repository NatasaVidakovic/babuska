import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;
if (!url || !key || !email || !password)
  throw new Error(
    "Missing local Supabase URL, publishable key, admin email, or admin password.",
  );

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const menuSources = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&h=1000&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1000&h=1000&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=1000&h=1000&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1000&h=1000&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=1000&h=1000&fit=crop&auto=format",
];
const gallerySources = [
  "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=1400&h=1000&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&h=900&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=900&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&h=900&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=1200&h=900&fit=crop&auto=format",
];

const categories = [
  [
    "Кафа",
    "Coffee",
    "Класични напитак од пажљиво одабраних зрна.",
    "A classic drink made from carefully selected beans.",
    [
      [
        "Еспресо",
        "Espresso",
        "3.50 КМ",
        "Интензиван еспресо са богатом кремом.",
        "An intense espresso with rich crema.",
      ],
      [
        "Дупли еспресо",
        "Doppio",
        "4.50 КМ",
        "Дупла доза еспреса за снажан почетак дана.",
        "A double espresso for a strong start.",
      ],
      [
        "Американо",
        "Americano",
        "4.50 КМ",
        "Еспресо продужен топлом водом.",
        "Espresso lengthened with hot water.",
      ],
      [
        "Капућино",
        "Cappuccino",
        "5.50 КМ",
        "Баршунаста млијечна пјена и еспресо.",
        "Velvety milk foam and espresso.",
      ],
      [
        "Флет вајт",
        "Flat White",
        "6.00 КМ",
        "Богата кафа са свиленкастом микропјеном.",
        "Rich coffee with silky microfoam.",
      ],
      [
        "Кортадо",
        "Cortado",
        "5.00 КМ",
        "Једнак однос еспреса и топлог млијека.",
        "Equal parts espresso and warm milk.",
      ],
    ],
  ],
  [
    "Бабушка специјалитети",
    "Babuska Specialties",
    "Кућни рецепт инспирисан Москвом.",
    "A house recipe inspired by Moscow.",
    [
      [
        "Московски раф",
        "Moscow Raf",
        "8.50 КМ",
        "Еспресо, слатка павлака и ванилија.",
        "Espresso, sweet cream, and vanilla.",
      ],
      [
        "Лате са пињолима",
        "Pine Nut Latte",
        "9.00 КМ",
        "Кремасти лате са сирупом од пињола.",
        "A creamy latte with pine nut syrup.",
      ],
      [
        "Лате са ружом и кардамомом",
        "Rose Cardamom Latte",
        "8.50 КМ",
        "Ароматични лате са ружом и кардамомом.",
        "An aromatic latte with rose and cardamom.",
      ],
      [
        "Лате са медом и циметом",
        "Honey Cinnamon Latte",
        "7.50 КМ",
        "Топли мед, цимет и еспресо.",
        "Warm honey, cinnamon, and espresso.",
      ],
      [
        "Лавандин облак",
        "Lavender Fog",
        "8.00 КМ",
        "Еспресо, млијеко и суптилна лаванда.",
        "Espresso, milk, and subtle lavender.",
      ],
      [
        "Бечка кафа",
        "Vienna Coffee",
        "7.00 КМ",
        "Јака кафа под облаком домаћег шлага.",
        "Strong coffee under house-made cream.",
      ],
    ],
  ],
  [
    "Чајеви и инфузије",
    "Teas and Infusions",
    "Мирисна мјешавина за топле тренутке.",
    "A fragrant blend for warm moments.",
    [
      [
        "Царски црни чај",
        "Imperial Black Tea",
        "6.00 КМ",
        "Црни чај, лимун и ливадски мед.",
        "Black tea, lemon, and meadow honey.",
      ],
      [
        "Самовар чај",
        "Samovar Chai",
        "7.50 КМ",
        "Црни чај са ђумбиром и кардамомом.",
        "Black tea with ginger and cardamom.",
      ],
      [
        "Сибирски чај од бобица",
        "Siberian Berry Tea",
        "7.00 КМ",
        "Шумско воће, хибискус и шипак.",
        "Forest berries, hibiscus, and rosehip.",
      ],
      [
        "Зелени чај са јасмином",
        "Jasmine Green",
        "6.50 КМ",
        "Зелени чај са цвијетом јасмина.",
        "Green tea with jasmine blossom.",
      ],
      [
        "Камилица и мед",
        "Camomile and Honey",
        "6.00 КМ",
        "Камилица, мед и лимунова корица.",
        "Camomile, honey, and lemon peel.",
      ],
      [
        "Сенча са ментом",
        "Mint Sencha",
        "6.50 КМ",
        "Зелени чај, свјежа мента и мед.",
        "Green tea, fresh mint, and honey.",
      ],
    ],
  ],
  [
    "Хладна пића",
    "Cold Drinks",
    "Освјежавајући напитак за лагане дане.",
    "A refreshing drink for easy days.",
    [
      [
        "Хладно екстрахована кафа",
        "Cold Brew",
        "7.00 КМ",
        "Кафа хладно екстрахована осамнаест сати.",
        "Coffee cold-extracted for eighteen hours.",
      ],
      [
        "Ледени раф",
        "Iced Raf",
        "9.00 КМ",
        "Хладни раф са ванилијом и ледом.",
        "Chilled Raf with vanilla and ice.",
      ],
      [
        "Ледени лате са лавандом",
        "Iced Lavender Latte",
        "8.50 КМ",
        "Ледени лате са лавандом и зобеним млијеком.",
        "Iced latte with lavender and oat milk.",
      ],
      [
        "Мача лимунада",
        "Matcha Lemonade",
        "8.00 КМ",
        "Мача, лимун и газирана вода.",
        "Matcha, lemon, and sparkling water.",
      ],
      [
        "Газирана базга",
        "Sparkling Elderflower",
        "6.50 КМ",
        "Базга, лимун, мента и минерална вода.",
        "Elderflower, lemon, mint, and mineral water.",
      ],
      [
        "Јузу лимунада",
        "Yuzu Lemonade",
        "7.00 КМ",
        "Јузу, лимун и њежни мјехурићи.",
        "Yuzu, lemon, and delicate bubbles.",
      ],
    ],
  ],
  [
    "Какао и топли напици",
    "Cocoa and Warm Drinks",
    "Богат напитак за угодне тренутке.",
    "A rich drink for comforting moments.",
    [
      [
        "Тамна топла чоколада",
        "Dark Chocolate Pot",
        "7.50 КМ",
        "Густа тамна чоколада и млијеко.",
        "Thick dark chocolate and milk.",
      ],
      [
        "Бијела чоколада са малином",
        "White Chocolate Raspberry",
        "8.00 КМ",
        "Бијела чоколада, малина и топло млијеко.",
        "White chocolate, raspberry, and warm milk.",
      ],
      [
        "Златно млијеко",
        "Golden Milk",
        "7.50 КМ",
        "Куркума, кокосово млијеко, ђумбир и мед.",
        "Turmeric, coconut milk, ginger, and honey.",
      ],
      [
        "Астечки какао",
        "Aztec Spiced Cacao",
        "8.00 КМ",
        "Тамни какао са чилијем и циметом.",
        "Dark cocoa with chili and cinnamon.",
      ],
      [
        "Пралине баршун",
        "Praline Velvet",
        "8.50 КМ",
        "Топло млијеко, љешњак и чоколада.",
        "Warm milk, hazelnut, and chocolate.",
      ],
      [
        "Зачињена мока",
        "Spiced Mocha",
        "7.50 КМ",
        "Еспресо, какао и топли зачини.",
        "Espresso, cocoa, and warm spices.",
      ],
    ],
  ],
];

async function uploadRemote(source, path) {
  const response = await fetch(source);
  if (!response.ok)
    throw new Error(`Could not download ${source}: ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  const contentType =
    response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const { error } = await client.storage
    .from("cafe-media")
    .upload(path, body, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
  return client.storage.from("cafe-media").getPublicUrl(path).data.publicUrl;
}

const { error: signInError } = await client.auth.signInWithPassword({
  email,
  password,
});
if (signInError) throw new Error(`Admin login failed: ${signInError.message}`);
const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
if (roleError || !isAdmin)
  throw new Error(
    `Admin role check failed: ${roleError?.message ?? "is_admin returned false"}`,
  );

const menuMedia = [];
for (const [index, source] of menuSources.entries()) {
  const path = `menu/demo-${index + 1}.jpg`;
  menuMedia.push({ path, url: await uploadRemote(source, path) });
}
const heroPath = "hero/demo-home.jpg";
const heroUrl = await uploadRemote(
  "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1920&h=1080&fit=crop&auto=format",
  heroPath,
);
const { error: heroError } = await client
  .from("site_settings")
  .upsert({
    id: 1,
    hero_image_url: heroUrl,
    hero_image_storage_path: heroPath,
  });
if (heroError)
  throw new Error(`Could not save hero image: ${heroError.message}`);

const { data: existingCategories, error: categoriesError } = await client
  .from("menu_categories")
  .select("id, name_sr, name_en");
if (categoriesError)
  throw new Error(`Could not read categories: ${categoriesError.message}`);
let itemCount = 0;
for (const [
  categoryOrder,
  [nameSr, nameEn, factSr, factEn, drinks],
] of categories.entries()) {
  const existing = existingCategories?.find(
    (row) => row.name_sr === nameSr || row.name_en === nameEn,
  );
  const categoryPayload = {
    name: nameSr,
    name_sr: nameSr,
    name_en: nameEn,
    sort_order: categoryOrder,
    is_active: true,
  };
  const categoryResult = existing
    ? await client
        .from("menu_categories")
        .update(categoryPayload)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await client
        .from("menu_categories")
        .insert(categoryPayload)
        .select("id")
        .single();
  if (categoryResult.error || !categoryResult.data)
    throw new Error(
      `Could not save category ${nameEn}: ${categoryResult.error?.message ?? "no row"}`,
    );
  for (const [
    itemOrder,
    [itemSr, itemEn, price, descriptionSr, descriptionEn],
  ] of drinks.entries()) {
    const media = menuMedia[(categoryOrder + itemOrder) % menuMedia.length];
    const payload = {
      name: itemSr,
      name_sr: itemSr,
      name_en: itemEn,
      category_id: categoryResult.data.id,
      price,
      image_url: media.url,
      storage_path: media.path,
      description: descriptionSr,
      description_sr: descriptionSr,
      description_en: descriptionEn,
      fact: factSr,
      fact_sr: factSr,
      fact_en: factEn,
      is_published: true,
      sort_order: itemOrder,
    };
    const { data: current, error: lookupError } = await client
      .from("menu_items")
      .select("id")
      .eq("category_id", categoryResult.data.id)
      .eq("name_en", itemEn)
      .maybeSingle();
    if (lookupError)
      throw new Error(`Could not check ${itemEn}: ${lookupError.message}`);
    const result = current
      ? await client.from("menu_items").update(payload).eq("id", current.id)
      : await client.from("menu_items").insert(payload);
    if (result.error)
      throw new Error(`Could not save ${itemEn}: ${result.error.message}`);
    itemCount++;
  }
}

// Remove the one known incomplete row created by the previous Latin demo seed.
// The precise predicates avoid touching administrator-created content.
const { error: legacyDuplicateError } = await client
  .from("menu_items")
  .delete()
  .eq("name_en", "Camomile & Honey")
  .is("name_sr", null)
  .is("storage_path", null);
if (legacyDuplicateError)
  throw new Error(
    `Could not remove the legacy demo duplicate: ${legacyDuplicateError.message}`,
  );

const galleryAlt = [
  ["Унутрашњост кафеа", "Café interior"],
  ["Сто у кафеу", "Café table"],
  ["Детаљ кафе", "Coffee detail"],
  ["Топла атмосфера", "Warm atmosphere"],
  ["Угодан кутак", "Cosy café corner"],
];
for (const [index, source] of gallerySources.entries()) {
  const path = `gallery/demo-${index + 1}.jpg`;
  const imageUrl = await uploadRemote(source, path);
  const payload = {
    image_url: imageUrl,
    storage_path: path,
    alt_sr: galleryAlt[index][0],
    alt_en: galleryAlt[index][1],
    is_published: true,
    sort_order: index,
  };
  const { data: current, error: lookupError } = await client
    .from("gallery_items")
    .select("id")
    .eq("storage_path", path)
    .maybeSingle();
  if (lookupError)
    throw new Error(`Could not check ${path}: ${lookupError.message}`);
  const result = current
    ? await client.from("gallery_items").update(payload).eq("id", current.id)
    : await client.from("gallery_items").insert(payload);
  if (result.error)
    throw new Error(`Could not save ${path}: ${result.error.message}`);
}

console.log(
  `Demo content ready: ${categories.length} bilingual categories, ${itemCount} bilingual menu items, hero and ${gallerySources.length} gallery images in Supabase Storage.`,
);
