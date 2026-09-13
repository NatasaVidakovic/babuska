alter table public.menu_categories
  add column if not exists name_ru text;

alter table public.menu_items
  add column if not exists name_ru text,
  add column if not exists description_ru text,
  add column if not exists fact_ru text;

alter table public.gallery_items
  add column if not exists alt_ru text;

alter table public.site_settings
  add column if not exists hero_title_ru text,
  add column if not exists hero_description_ru text,
  add column if not exists hero_cta_ru text,
  add column if not exists footer_address_heading_ru text,
  add column if not exists footer_address_line_1_ru text,
  add column if not exists footer_address_line_2_ru text,
  add column if not exists footer_address_line_3_ru text,
  add column if not exists footer_hours_heading_ru text,
  add column if not exists footer_hours_line_1_ru text,
  add column if not exists footer_hours_line_2_ru text,
  add column if not exists footer_hours_line_3_ru text,
  add column if not exists footer_contact_heading_ru text,
  add column if not exists footer_copyright_ru text;

alter table public.menu_categories
  drop constraint if exists menu_categories_name_ru_nonempty,
  add constraint menu_categories_name_ru_nonempty
    check (name_ru is null or char_length(trim(name_ru)) > 0);

alter table public.menu_items
  drop constraint if exists menu_items_name_ru_nonempty,
  add constraint menu_items_name_ru_nonempty
    check (name_ru is null or char_length(trim(name_ru)) > 0);

update public.site_settings
set
  hero_title_ru = coalesce(nullif(trim(hero_title_ru), ''), 'Вкус Москвы в Баня-Луке'),
  hero_description_ru = coalesce(nullif(trim(hero_description_ru), ''), 'Авторские напитки, изысканные чаи и русское гостеприимство — с тихим, душевным теплом.'),
  hero_cta_ru = coalesce(nullif(trim(hero_cta_ru), ''), 'Открыть меню'),
  footer_address_heading_ru = coalesce(nullif(trim(footer_address_heading_ru), ''), 'Адрес'),
  footer_address_line_1_ru = coalesce(nullif(trim(footer_address_line_1_ru), ''), 'Господская улица, 14'),
  footer_address_line_2_ru = coalesce(nullif(trim(footer_address_line_2_ru), ''), '78000 Баня-Лука'),
  footer_address_line_3_ru = coalesce(nullif(trim(footer_address_line_3_ru), ''), 'Босния и Герцеговина'),
  footer_hours_heading_ru = coalesce(nullif(trim(footer_hours_heading_ru), ''), 'Часы работы'),
  footer_hours_line_1_ru = coalesce(nullif(trim(footer_hours_line_1_ru), ''), 'Понедельник – пятница: 08:00 – 23:00'),
  footer_hours_line_2_ru = coalesce(nullif(trim(footer_hours_line_2_ru), ''), 'Суббота: 09:00 – 00:00'),
  footer_hours_line_3_ru = coalesce(nullif(trim(footer_hours_line_3_ru), ''), 'Воскресенье: 09:00 – 22:00'),
  footer_contact_heading_ru = coalesce(nullif(trim(footer_contact_heading_ru), ''), 'Контакты'),
  footer_copyright_ru = coalesce(nullif(trim(footer_copyright_ru), ''), '© 2026 Кафе Бабушка · Баня-Лука')
where id = 1;

update public.menu_categories as category
set name_ru = translation.name_ru
from (values
  ('Топли напици', 'Горячие напитки'),
  ('Воде', 'Вода'),
  ('Сокови', 'Безалкогольные напитки'),
  ('Цијеђени сокови', 'Свежевыжатые соки'),
  ('Пиво', 'Пиво'),
  ('Сајдери', 'Сидр'),
  ('Ракије', 'Ракия'),
  ('Ликери', 'Ликёры'),
  ('Виски бурбон', 'Виски и бурбон'),
  ('Вотка', 'Водка'),
  ('Текила', 'Текила'),
  ('Џин', 'Джин'),
  ('Рум', 'Ром'),
  ('Коктел', 'Коктейли'),
  ('Вино', 'Вино'),
  ('Пјенушава вина', 'Игристые вина')
) as translation(name_sr, name_ru)
where category.name_sr = translation.name_sr
  and nullif(trim(category.name_ru), '') is null;

-- Translate generic product names while leaving existing administrator-provided
-- Russian content untouched. International brand names receive the baseline below.
update public.menu_items as item
set name_ru = translation.name_ru
from (values
  ('Еспресо', 'Эспрессо'),
  ('Капућино', 'Капучино'),
  ('Капућино са сојиним млијеком', 'Капучино с соевым молоком'),
  ('Лате', 'Латте'),
  ('Чај (мента, камилица, лимунска трава - ђумбир, зелени, црни индијски, јагода - ванилија, брусница, трешња, јабука - цимет, шумско воће)', 'Чай (мята, ромашка, лемонграсс и имбирь, зелёный, индийский чёрный, клубника и ваниль, клюква, вишня, яблоко и корица, лесные ягоды)'),
  ('Кока-Кола Зиро', 'Кока-Кола Зеро'),
  ('Швепс битер лемон', 'Швепс Биттер Лемон'),
  ('Витаминка сокови (ђус, мултивитамин, бресква, јабука, боровница, јагода)', 'Соки Витаминка (апельсин, мультивитамин, персик, яблоко, черника, клубника)'),
  ('Џуси вита (лимун, наранџа)', 'Джуси Вита (лимон, апельсин)'),
  ('Лимунада', 'Лимонад'),
  ('Цијеђена наранџа', 'Свежевыжатый апельсиновый сок'),
  ('Цијеђени грејп', 'Свежевыжатый грейпфрутовый сок'),
  ('Цијеђена јабука', 'Свежевыжатый яблочный сок'),
  ('Цијеђени микс наранџа и лимун', 'Свежевыжатый микс апельсина и лимона'),
  ('Цијеђени микс наранџа и грејп', 'Свежевыжатый микс апельсина и грейпфрута'),
  ('Цијеђени микс наранџа, лимун и грејп', 'Свежевыжатый микс апельсина, лимона и грейпфрута'),
  ('Зарић шљива', 'Зарич Слива'),
  ('Зарић дуња', 'Зарич Айва'),
  ('Зарић кајсија', 'Зарич Абрикос'),
  ('Зарић крушка', 'Зарич Груша'),
  ('Горда шљивовица', 'Горда Сливовица'),
  ('Завет траварица', 'Завет Травяная ракия'),
  ('Мараска вишњевац', 'Мараска Вишнёвый ликёр'),
  ('Мараска медица', 'Мараска Медовый ликёр'),
  ('Капетан Морган Вајт', 'Капитан Морган Уайт'),
  ('Капетан Морган Голд', 'Капитан Морган Голд'),
  ('Вотка Гимлет', 'Водка Гимлет'),
  ('Тиквеш Александрија црвена', 'Тиквеш Александрия красное'),
  ('Тиквеш Александрија црвена 0,1', 'Тиквеш Александрия красное 0,1'),
  ('Тиквеш Александрија бијела', 'Тиквеш Александрия белое'),
  ('Тиквеш Александрија бијела 0,1', 'Тиквеш Александрия белое 0,1'),
  ('Луда Мара бијела', 'Луда Мара белое'),
  ('Луда Мара црвена', 'Луда Мара красное')
) as translation(name_sr, name_ru)
where item.name_sr = translation.name_sr
  and nullif(trim(item.name_ru), '') is null;

-- Product names are otherwise mostly international brands already written in
-- Cyrillic, so copy those as the remaining complete Russian baseline.
update public.menu_items
set
  name_ru = coalesce(nullif(trim(name_ru), ''), name_sr),
  description_ru = coalesce(nullif(trim(description_ru), ''), nullif(trim(description_sr), '')),
  fact_ru = coalesce(nullif(trim(fact_ru), ''), nullif(trim(fact_sr), ''));

update public.gallery_items
set alt_ru = coalesce(nullif(trim(alt_ru), ''), alt_sr);

create or replace function public.public_site_bootstrap()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce((
      select jsonb_build_object(
        'instagram', settings.instagram, 'facebook', settings.facebook,
        'tiktok', settings.tiktok, 'phone', settings.phone, 'email', settings.email,
        'social_handle', settings.social_handle, 'hero_image_url', settings.hero_image_url,
        'hero_image_storage_path', settings.hero_image_storage_path,
        'hero_image_variants', settings.hero_image_variants,
        'hero_title_sr', settings.hero_title_sr, 'hero_title_en', settings.hero_title_en, 'hero_title_ru', settings.hero_title_ru,
        'hero_description_sr', settings.hero_description_sr, 'hero_description_en', settings.hero_description_en, 'hero_description_ru', settings.hero_description_ru,
        'hero_cta_sr', settings.hero_cta_sr, 'hero_cta_en', settings.hero_cta_en, 'hero_cta_ru', settings.hero_cta_ru,
        'footer_address_heading_sr', settings.footer_address_heading_sr, 'footer_address_heading_en', settings.footer_address_heading_en, 'footer_address_heading_ru', settings.footer_address_heading_ru,
        'footer_address_line_1_sr', settings.footer_address_line_1_sr, 'footer_address_line_1_en', settings.footer_address_line_1_en, 'footer_address_line_1_ru', settings.footer_address_line_1_ru,
        'footer_address_line_2_sr', settings.footer_address_line_2_sr, 'footer_address_line_2_en', settings.footer_address_line_2_en, 'footer_address_line_2_ru', settings.footer_address_line_2_ru,
        'footer_address_line_3_sr', settings.footer_address_line_3_sr, 'footer_address_line_3_en', settings.footer_address_line_3_en, 'footer_address_line_3_ru', settings.footer_address_line_3_ru,
        'footer_hours_heading_sr', settings.footer_hours_heading_sr, 'footer_hours_heading_en', settings.footer_hours_heading_en, 'footer_hours_heading_ru', settings.footer_hours_heading_ru,
        'footer_hours_line_1_sr', settings.footer_hours_line_1_sr, 'footer_hours_line_1_en', settings.footer_hours_line_1_en, 'footer_hours_line_1_ru', settings.footer_hours_line_1_ru,
        'footer_hours_line_2_sr', settings.footer_hours_line_2_sr, 'footer_hours_line_2_en', settings.footer_hours_line_2_en, 'footer_hours_line_2_ru', settings.footer_hours_line_2_ru,
        'footer_hours_line_3_sr', settings.footer_hours_line_3_sr, 'footer_hours_line_3_en', settings.footer_hours_line_3_en, 'footer_hours_line_3_ru', settings.footer_hours_line_3_ru,
        'footer_contact_heading_sr', settings.footer_contact_heading_sr, 'footer_contact_heading_en', settings.footer_contact_heading_en, 'footer_contact_heading_ru', settings.footer_contact_heading_ru,
        'footer_copyright_sr', settings.footer_copyright_sr, 'footer_copyright_en', settings.footer_copyright_en, 'footer_copyright_ru', settings.footer_copyright_ru
      ) from public.site_settings as settings where settings.id = 1
    ), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', category.id, 'name_sr', category.name_sr, 'name_en', category.name_en, 'name_ru', category.name_ru, 'sort_order', category.sort_order) order by category.sort_order, category.id)
      from public.menu_categories as category where category.is_active
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', item.id, 'name_sr', item.name_sr, 'name_en', item.name_en, 'name_ru', item.name_ru, 'category_id', item.category_id, 'price', item.price, 'image_url', item.image_url, 'storage_path', item.storage_path, 'image_variants', item.image_variants, 'description_sr', item.description_sr, 'description_en', item.description_en, 'description_ru', item.description_ru, 'fact_sr', item.fact_sr, 'fact_en', item.fact_en, 'fact_ru', item.fact_ru, 'sort_order', item.sort_order) order by item.sort_order, item.id)
      from public.menu_items as item where item.is_published
    ), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object('id', gallery.id, 'image_url', gallery.image_url, 'storage_path', gallery.storage_path, 'image_variants', gallery.image_variants, 'alt_sr', gallery.alt_sr, 'alt_en', gallery.alt_en, 'alt_ru', gallery.alt_ru, 'sort_order', gallery.sort_order) order by gallery.sort_order, gallery.id)
      from public.gallery_items as gallery where gallery.is_published
    ), '[]'::jsonb),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object('id', story.id, 'image_url', story.image_url, 'storage_path', story.storage_path, 'image_variants', story.image_variants, 'sort_order', story.sort_order, 'published_at', story.published_at, 'expires_at', story.expires_at) order by story.published_at desc, story.id desc)
      from public.story_items as story
      where story.is_published and story.expires_at > now()
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.public_site_bootstrap() from public;
grant execute on function public.public_site_bootstrap() to anon, authenticated;
