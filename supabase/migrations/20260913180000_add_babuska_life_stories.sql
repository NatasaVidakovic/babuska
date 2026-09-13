create table if not exists public.story_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_path text not null unique,
  image_variants jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > published_at)
);

create index if not exists story_items_active_order_idx
  on public.story_items (published_at desc, sort_order, id)
  where is_published;

alter table public.story_items enable row level security;
revoke all on table public.story_items from anon, authenticated;
grant select on table public.story_items to anon, authenticated;
grant insert, update, delete on table public.story_items to authenticated;

drop policy if exists "public reads active stories" on public.story_items;
create policy "public reads active stories"
on public.story_items for select to anon, authenticated
using (is_published and expires_at > now());

drop policy if exists "admins read all stories" on public.story_items;
create policy "admins read all stories"
on public.story_items for select to authenticated
using ((select public.is_admin()));

drop policy if exists "admins create stories" on public.story_items;
create policy "admins create stories"
on public.story_items for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists "admins update stories" on public.story_items;
create policy "admins update stories"
on public.story_items for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins delete stories" on public.story_items;
create policy "admins delete stories"
on public.story_items for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "admins upload cafe media" on storage.objects;
drop policy if exists "admins update cafe media" on storage.objects;
create policy "admins upload cafe media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'cafe-media'
  and (storage.foldername(name))[1] in ('hero', 'menu', 'gallery', 'stories')
  and (select public.is_admin())
);

create policy "admins update cafe media"
on storage.objects for update to authenticated
using (bucket_id = 'cafe-media' and (select public.is_admin()))
with check (
  bucket_id = 'cafe-media'
  and (storage.foldername(name))[1] in ('hero', 'menu', 'gallery', 'stories')
  and (select public.is_admin())
);

create or replace function public.public_site_bootstrap()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'settings', coalesce((
      select jsonb_build_object(
        'instagram', settings.instagram, 'facebook', settings.facebook,
        'tiktok', settings.tiktok, 'phone', settings.phone, 'email', settings.email,
        'social_handle', settings.social_handle, 'hero_image_url', settings.hero_image_url,
        'hero_image_storage_path', settings.hero_image_storage_path,
        'hero_image_variants', settings.hero_image_variants,
        'hero_title_sr', settings.hero_title_sr, 'hero_title_en', settings.hero_title_en,
        'hero_description_sr', settings.hero_description_sr, 'hero_description_en', settings.hero_description_en,
        'hero_cta_sr', settings.hero_cta_sr, 'hero_cta_en', settings.hero_cta_en,
        'footer_address_heading_sr', settings.footer_address_heading_sr, 'footer_address_heading_en', settings.footer_address_heading_en,
        'footer_address_line_1_sr', settings.footer_address_line_1_sr, 'footer_address_line_1_en', settings.footer_address_line_1_en,
        'footer_address_line_2_sr', settings.footer_address_line_2_sr, 'footer_address_line_2_en', settings.footer_address_line_2_en,
        'footer_address_line_3_sr', settings.footer_address_line_3_sr, 'footer_address_line_3_en', settings.footer_address_line_3_en,
        'footer_hours_heading_sr', settings.footer_hours_heading_sr, 'footer_hours_heading_en', settings.footer_hours_heading_en,
        'footer_hours_line_1_sr', settings.footer_hours_line_1_sr, 'footer_hours_line_1_en', settings.footer_hours_line_1_en,
        'footer_hours_line_2_sr', settings.footer_hours_line_2_sr, 'footer_hours_line_2_en', settings.footer_hours_line_2_en,
        'footer_hours_line_3_sr', settings.footer_hours_line_3_sr, 'footer_hours_line_3_en', settings.footer_hours_line_3_en,
        'footer_contact_heading_sr', settings.footer_contact_heading_sr, 'footer_contact_heading_en', settings.footer_contact_heading_en,
        'footer_copyright_sr', settings.footer_copyright_sr, 'footer_copyright_en', settings.footer_copyright_en
      ) from public.site_settings as settings where settings.id = 1
    ), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', category.id, 'name_sr', category.name_sr, 'name_en', category.name_en, 'sort_order', category.sort_order) order by category.sort_order, category.id)
      from public.menu_categories as category where category.is_active
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', item.id, 'name_sr', item.name_sr, 'name_en', item.name_en, 'category_id', item.category_id, 'price', item.price, 'image_url', item.image_url, 'storage_path', item.storage_path, 'image_variants', item.image_variants, 'description_sr', item.description_sr, 'description_en', item.description_en, 'fact_sr', item.fact_sr, 'fact_en', item.fact_en, 'sort_order', item.sort_order) order by item.sort_order, item.id)
      from public.menu_items as item where item.is_published
    ), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object('id', gallery.id, 'image_url', gallery.image_url, 'storage_path', gallery.storage_path, 'image_variants', gallery.image_variants, 'alt_sr', gallery.alt_sr, 'alt_en', gallery.alt_en, 'sort_order', gallery.sort_order) order by gallery.sort_order, gallery.id)
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
