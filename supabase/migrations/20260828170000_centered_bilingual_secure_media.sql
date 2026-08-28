alter table public.menu_categories
  add column if not exists name_sr text,
  add column if not exists name_en text;

alter table public.menu_items
  add column if not exists name_sr text,
  add column if not exists name_en text,
  add column if not exists description_sr text,
  add column if not exists description_en text,
  add column if not exists fact_sr text,
  add column if not exists fact_en text;

alter table public.site_settings
  add column if not exists hero_image_url text,
  add column if not exists hero_image_storage_path text,
  add column if not exists footer_hours_heading_sr text,
  add column if not exists footer_hours_heading_en text,
  add column if not exists footer_hours_line_1_sr text,
  add column if not exists footer_hours_line_1_en text,
  add column if not exists footer_hours_line_2_sr text,
  add column if not exists footer_hours_line_2_en text,
  add column if not exists footer_hours_line_3_sr text,
  add column if not exists footer_hours_line_3_en text;

update public.menu_categories
set
  name_sr = coalesce(name_sr, case name
    when 'Kafa' then 'Кафа'
    when 'Babuska specijali' then 'Бабушка специјалитети'
    when 'Čajevi i infuzije' then 'Чајеви и инфузије'
    when 'Hladna pića' then 'Хладна пића'
    when 'Kakao i toplo' then 'Какао и топли напици'
    else null end),
  name_en = coalesce(name_en, case name
    when 'Kafa' then 'Coffee'
    when 'Babuska specijali' then 'Babuska Specialties'
    when 'Čajevi i infuzije' then 'Teas and Infusions'
    when 'Hladna pića' then 'Cold Drinks'
    when 'Kakao i toplo' then 'Cocoa and Warm Drinks'
    else null end);

update public.menu_items
set
  name_en = coalesce(name_en, case when name ~ '[A-Za-z]' then name else null end),
  description_en = coalesce(description_en, case when description ~ '[A-Za-z]' then description else null end),
  fact_en = coalesce(fact_en, case when fact ~ '[A-Za-z]' then fact else null end);

update public.site_settings
set
  footer_hours_heading_sr = coalesce(footer_hours_heading_sr, 'Радно вријеме'),
  footer_hours_heading_en = coalesce(footer_hours_heading_en, 'Opening Hours'),
  footer_hours_line_1_sr = coalesce(footer_hours_line_1_sr, 'Понедјељак – петак: 08:00 – 23:00'),
  footer_hours_line_1_en = coalesce(footer_hours_line_1_en, 'Monday – Friday: 08:00 – 23:00'),
  footer_hours_line_2_sr = coalesce(footer_hours_line_2_sr, 'Субота: 09:00 – 00:00'),
  footer_hours_line_2_en = coalesce(footer_hours_line_2_en, 'Saturday: 09:00 – 00:00'),
  footer_hours_line_3_sr = coalesce(footer_hours_line_3_sr, 'Недјеља: 09:00 – 22:00'),
  footer_hours_line_3_en = coalesce(footer_hours_line_3_en, 'Sunday: 09:00 – 22:00')
where id = 1;

alter table public.menu_categories
  drop constraint if exists menu_categories_name_sr_nonempty,
  drop constraint if exists menu_categories_name_en_nonempty,
  add constraint menu_categories_name_sr_nonempty check (name_sr is null or char_length(trim(name_sr)) > 0),
  add constraint menu_categories_name_en_nonempty check (name_en is null or char_length(trim(name_en)) > 0);

alter table public.menu_items
  drop constraint if exists menu_items_name_sr_nonempty,
  drop constraint if exists menu_items_name_en_nonempty,
  add constraint menu_items_name_sr_nonempty check (name_sr is null or char_length(trim(name_sr)) > 0),
  add constraint menu_items_name_en_nonempty check (name_en is null or char_length(trim(name_en)) > 0);

drop policy if exists "public reads published menu" on public.menu_items;
drop policy if exists "public reads active menu categories" on public.menu_categories;

create policy "anonymous reads published menu"
on public.menu_items for select to anon
using (is_published);

create policy "authenticated reads visible menu"
on public.menu_items for select to authenticated
using (is_published or public.is_admin());

create policy "anonymous reads active menu categories"
on public.menu_categories for select to anon
using (is_active);

create policy "authenticated reads visible menu categories"
on public.menu_categories for select to authenticated
using (is_active or public.is_admin());

drop policy if exists "public reads cafe media" on storage.objects;
create policy "public reads cafe media"
on storage.objects for select to anon, authenticated
using (bucket_id = 'cafe-media');

drop policy if exists "admins upload cafe media" on storage.objects;
drop policy if exists "admins update cafe media" on storage.objects;
drop policy if exists "admins delete cafe media" on storage.objects;

create policy "admins upload cafe media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'cafe-media'
  and (storage.foldername(name))[1] in ('hero', 'menu', 'gallery')
  and public.is_admin()
);

create policy "admins update cafe media"
on storage.objects for update to authenticated
using (bucket_id = 'cafe-media' and public.is_admin())
with check (
  bucket_id = 'cafe-media'
  and (storage.foldername(name))[1] in ('hero', 'menu', 'gallery')
  and public.is_admin()
);

create policy "admins delete cafe media"
on storage.objects for delete to authenticated
using (bucket_id = 'cafe-media' and public.is_admin());

create index if not exists menu_categories_localized_sort_idx
on public.menu_categories (is_active, sort_order, name_sr, name_en);
