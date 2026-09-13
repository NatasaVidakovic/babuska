-- The digital menu and "Discover new flavours" are driven from these same
-- category and item records. Keeping this menu data in the canonical tables
-- guarantees it is present in both views.
with inserted_category as (
  insert into public.menu_categories (
    name,
    name_sr,
    name_en,
    name_ru,
    sort_order,
    is_active
  )
  values (
    'Мила џелато',
    'Мила џелато',
    'Milla Gelato',
    'Милла Джелато',
    (select coalesce(max(sort_order), -1) + 1 from public.menu_categories),
    true
  )
  on conflict (name) do update
  set
    name_sr = excluded.name_sr,
    name_en = excluded.name_en,
    name_ru = excluded.name_ru,
    is_active = true
  returning id
), category as (
  select id from inserted_category
  union all
  select id from public.menu_categories where name = 'Мила џелато'
  limit 1
), flavours(name_sr, name_en, name_ru, sort_offset) as (
  values
    ('Ванилија', 'Vanilla', 'Ваниль', 0),
    ('Чоколада', 'Chocolate', 'Шоколад', 1),
    ('Плазма', 'Plasma', 'Плазма', 2),
    ('Љешњак', 'Hazelnut', 'Фундук', 3),
    ('Пистација', 'Pistachio', 'Фисташка', 4),
    ('Јагода — посно', 'Strawberry — vegan', 'Клубника — постное', 5),
    ('Манго — посно', 'Mango — vegan', 'Манго — постное', 6),
    ('Малина — посно', 'Raspberry — vegan', 'Малина — постное', 7)
), base_sort as (
  select coalesce(max(sort_order), -1) + 1 as value from public.menu_items
)
insert into public.menu_items (
  name,
  name_sr,
  name_en,
  name_ru,
  category_id,
  price,
  description,
  description_sr,
  description_en,
  description_ru,
  fact,
  fact_sr,
  fact_en,
  fact_ru,
  is_published,
  sort_order
)
select
  flavour.name_sr,
  flavour.name_sr,
  flavour.name_en,
  flavour.name_ru,
  category.id,
  '5.50 KM',
  '',
  '',
  '',
  '',
  null,
  null,
  null,
  null,
  true,
  base_sort.value + flavour.sort_offset
from flavours as flavour
cross join category
cross join base_sort
where not exists (
  select 1
  from public.menu_items as item
  where item.category_id = category.id
    and item.name_sr = flavour.name_sr
);
