alter table public.story_items
  add column if not exists description_sr text,
  add column if not exists description_en text,
  add column if not exists description_ru text;

alter table public.story_items
  drop constraint if exists story_items_description_sr_nonempty,
  add constraint story_items_description_sr_nonempty
    check (description_sr is null or char_length(trim(description_sr)) > 0),
  drop constraint if exists story_items_description_en_nonempty,
  add constraint story_items_description_en_nonempty
    check (description_en is null or char_length(trim(description_en)) > 0),
  drop constraint if exists story_items_description_ru_nonempty,
  add constraint story_items_description_ru_nonempty
    check (description_ru is null or char_length(trim(description_ru)) > 0);

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
      select jsonb_agg(jsonb_build_object('id', story.id, 'image_url', story.image_url, 'storage_path', story.storage_path, 'image_variants', story.image_variants, 'description_sr', story.description_sr, 'description_en', story.description_en, 'description_ru', story.description_ru, 'sort_order', story.sort_order, 'published_at', story.published_at, 'expires_at', story.expires_at) order by story.published_at desc, story.id desc)
      from public.story_items as story
      where story.is_published and story.expires_at > now()
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.public_site_bootstrap() from public;
grant execute on function public.public_site_bootstrap() to anon, authenticated;
