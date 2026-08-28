alter table public.menu_items
  add column if not exists image_variants jsonb not null default '{}'::jsonb;

alter table public.gallery_items
  add column if not exists image_variants jsonb not null default '{}'::jsonb;

alter table public.site_settings
  add column if not exists hero_image_variants jsonb not null default '{}'::jsonb;

create or replace function public.public_site_bootstrap()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'settings', coalesce(
      (
        select jsonb_build_object(
          'instagram', settings.instagram,
          'facebook', settings.facebook,
          'tiktok', settings.tiktok,
          'phone', settings.phone,
          'email', settings.email,
          'social_handle', settings.social_handle,
          'hero_image_url', settings.hero_image_url,
          'hero_image_storage_path', settings.hero_image_storage_path,
          'hero_image_variants', settings.hero_image_variants,
          'hero_title_sr', settings.hero_title_sr,
          'hero_title_en', settings.hero_title_en,
          'hero_description_sr', settings.hero_description_sr,
          'hero_description_en', settings.hero_description_en,
          'hero_cta_sr', settings.hero_cta_sr,
          'hero_cta_en', settings.hero_cta_en,
          'footer_address_heading_sr', settings.footer_address_heading_sr,
          'footer_address_heading_en', settings.footer_address_heading_en,
          'footer_address_line_1_sr', settings.footer_address_line_1_sr,
          'footer_address_line_1_en', settings.footer_address_line_1_en,
          'footer_address_line_2_sr', settings.footer_address_line_2_sr,
          'footer_address_line_2_en', settings.footer_address_line_2_en,
          'footer_address_line_3_sr', settings.footer_address_line_3_sr,
          'footer_address_line_3_en', settings.footer_address_line_3_en,
          'footer_hours_heading_sr', settings.footer_hours_heading_sr,
          'footer_hours_heading_en', settings.footer_hours_heading_en,
          'footer_hours_line_1_sr', settings.footer_hours_line_1_sr,
          'footer_hours_line_1_en', settings.footer_hours_line_1_en,
          'footer_hours_line_2_sr', settings.footer_hours_line_2_sr,
          'footer_hours_line_2_en', settings.footer_hours_line_2_en,
          'footer_hours_line_3_sr', settings.footer_hours_line_3_sr,
          'footer_hours_line_3_en', settings.footer_hours_line_3_en,
          'footer_contact_heading_sr', settings.footer_contact_heading_sr,
          'footer_contact_heading_en', settings.footer_contact_heading_en,
          'footer_copyright_sr', settings.footer_copyright_sr,
          'footer_copyright_en', settings.footer_copyright_en
        )
        from public.site_settings as settings
        where settings.id = 1
      ),
      '{}'::jsonb
    ),
    'categories', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', category.id,
            'name_sr', category.name_sr,
            'name_en', category.name_en,
            'sort_order', category.sort_order
          )
          order by category.sort_order, category.id
        )
        from public.menu_categories as category
        where category.is_active
      ),
      '[]'::jsonb
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item.id,
            'name_sr', item.name_sr,
            'name_en', item.name_en,
            'category_id', item.category_id,
            'price', item.price,
            'image_url', item.image_url,
            'storage_path', item.storage_path,
            'image_variants', item.image_variants,
            'description_sr', item.description_sr,
            'description_en', item.description_en,
            'fact_sr', item.fact_sr,
            'fact_en', item.fact_en,
            'sort_order', item.sort_order
          )
          order by item.sort_order, item.id
        )
        from public.menu_items as item
        where item.is_published
      ),
      '[]'::jsonb
    ),
    'gallery', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', gallery.id,
            'image_url', gallery.image_url,
            'storage_path', gallery.storage_path,
            'image_variants', gallery.image_variants,
            'alt_sr', gallery.alt_sr,
            'alt_en', gallery.alt_en,
            'sort_order', gallery.sort_order
          )
          order by gallery.sort_order, gallery.id
        )
        from public.gallery_items as gallery
        where gallery.is_published
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.public_site_bootstrap() from public;
grant execute on function public.public_site_bootstrap() to anon, authenticated;
