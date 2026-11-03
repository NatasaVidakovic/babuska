-- Requested dessert menu. Prices intentionally start at 0 KM for later editing.
-- Existing item prices, images and descriptions are preserved on re-application.
with inserted_category as (
  insert into public.menu_categories (name, name_sr, name_en, name_ru, sort_order, is_active)
  values ('Десерт', 'Десерт', 'Dessert', 'Десерты',
    (select coalesce(max(sort_order), -1) + 1 from public.menu_categories), true)
  on conflict (name) do nothing
  returning id
), category as (
  select id from inserted_category
  union all
  select id from public.menu_categories where name = 'Десерт'
  limit 1
), desserts(name_sr, name_en, name_ru, sort_offset) as (
  values
    ('Руске капе', 'Russian hat cakes', 'Русские шапочки', 0),
    ('Птичје млијеко', 'Bird’s milk', 'Птичье молоко', 1),
    ('Руска краљевска торта', 'Russian royal cake', 'Русский королевский торт', 2)
), base_sort as (
  select coalesce(max(sort_order), -1) + 1 as value from public.menu_items
)
insert into public.menu_items (
  name, name_sr, name_en, name_ru, category_id, price,
  description, description_sr, description_en, description_ru,
  fact, fact_sr, fact_en, fact_ru, is_published, sort_order
)
select dessert.name_sr, dessert.name_sr, dessert.name_en, dessert.name_ru, category.id, '0 KM',
  '', '', '', '', null, null, null, null, true, base_sort.value + dessert.sort_offset
from desserts as dessert cross join category cross join base_sort
where not exists (
  select 1 from public.menu_items as item
  where item.category_id = category.id and item.name_sr = dessert.name_sr
);
