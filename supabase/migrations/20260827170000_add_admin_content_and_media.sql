alter table public.site_settings
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists social_handle text,
  add column if not exists hero_title_sr text,
  add column if not exists hero_title_en text,
  add column if not exists hero_description_sr text,
  add column if not exists hero_description_en text,
  add column if not exists hero_cta_sr text,
  add column if not exists hero_cta_en text,
  add column if not exists footer_address_heading_sr text,
  add column if not exists footer_address_heading_en text,
  add column if not exists footer_address_line_1_sr text,
  add column if not exists footer_address_line_1_en text,
  add column if not exists footer_address_line_2_sr text,
  add column if not exists footer_address_line_2_en text,
  add column if not exists footer_address_line_3_sr text,
  add column if not exists footer_address_line_3_en text,
  add column if not exists footer_contact_heading_sr text,
  add column if not exists footer_contact_heading_en text,
  add column if not exists footer_copyright_sr text,
  add column if not exists footer_copyright_en text;

alter table public.menu_items add column if not exists storage_path text;
alter table public.gallery_items add column if not exists storage_path text;

update public.site_settings
set
  phone = coalesce(phone, '+387 65 000 000'),
  email = coalesce(email, 'hello@cafebabuska.ba'),
  social_handle = coalesce(social_handle, '@cafebabuska'),
  hero_title_sr = coalesce(hero_title_sr, 'Укус Москве у Бањој Луци'),
  hero_title_en = coalesce(hero_title_en, 'A Taste of Moscow in Banja Luka'),
  hero_description_sr = coalesce(hero_description_sr, 'Ексклузивни напици, фини чајеви и руско гостопримство — послужени с тихом, спокојном топлином.'),
  hero_description_en = coalesce(hero_description_en, 'Signature beverages, fine teas, and Russian hospitality — served with quiet, unhurried warmth.'),
  hero_cta_sr = coalesce(hero_cta_sr, 'Истражи Мени'),
  hero_cta_en = coalesce(hero_cta_en, 'Explore the Menu'),
  footer_address_heading_sr = coalesce(footer_address_heading_sr, 'Адреса'),
  footer_address_heading_en = coalesce(footer_address_heading_en, 'Address'),
  footer_address_line_1_sr = coalesce(footer_address_line_1_sr, 'Господска улица 14'),
  footer_address_line_1_en = coalesce(footer_address_line_1_en, 'Gospodska Street 14'),
  footer_address_line_2_sr = coalesce(footer_address_line_2_sr, '78000 Бања Лука'),
  footer_address_line_2_en = coalesce(footer_address_line_2_en, '78000 Banja Luka'),
  footer_address_line_3_sr = coalesce(footer_address_line_3_sr, 'Босна и Херцеговина'),
  footer_address_line_3_en = coalesce(footer_address_line_3_en, 'Bosnia and Herzegovina'),
  footer_contact_heading_sr = coalesce(footer_contact_heading_sr, 'Контакт'),
  footer_contact_heading_en = coalesce(footer_contact_heading_en, 'Contact'),
  footer_copyright_sr = coalesce(footer_copyright_sr, '© 2026 Кафе Бабушка · Бања Лука'),
  footer_copyright_en = coalesce(footer_copyright_en, '© 2026 Кафе Бабушка · Banja Luka')
where id = 1;
