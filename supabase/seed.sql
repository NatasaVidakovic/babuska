insert into public.site_settings (
  id, instagram, facebook, tiktok, phone, email, social_handle,
  hero_title_sr, hero_title_en, hero_description_sr, hero_description_en, hero_cta_sr, hero_cta_en,
  footer_address_heading_sr, footer_address_heading_en,
  footer_address_line_1_sr, footer_address_line_1_en,
  footer_address_line_2_sr, footer_address_line_2_en,
  footer_address_line_3_sr, footer_address_line_3_en,
  footer_hours_heading_sr, footer_hours_heading_en,
  footer_hours_line_1_sr, footer_hours_line_1_en,
  footer_hours_line_2_sr, footer_hours_line_2_en,
  footer_hours_line_3_sr, footer_hours_line_3_en,
  footer_contact_heading_sr, footer_contact_heading_en,
  footer_copyright_sr, footer_copyright_en
)
values (
  1, '', '', '', '+387 65 000 000', 'hello@cafebabuska.ba', '@cafebabuska',
  'Укус Москве у Бањој Луци', 'A Taste of Moscow in Banja Luka',
  'Ексклузивни напици, фини чајеви и руско гостопримство — послужени с тихом, спокојном топлином.',
  'Signature beverages, fine teas, and Russian hospitality — served with quiet, unhurried warmth.',
  'Истражи мени', 'Explore the Menu',
  'Адреса', 'Address', 'Господска улица 14', 'Gospodska Street 14',
  '78000 Бања Лука', '78000 Banja Luka', 'Босна и Херцеговина', 'Bosnia and Herzegovina',
  'Радно вријеме', 'Opening Hours',
  'Понедјељак – петак: 08:00 – 23:00', 'Monday – Friday: 08:00 – 23:00',
  'Субота: 09:00 – 00:00', 'Saturday: 09:00 – 00:00',
  'Недјеља: 09:00 – 22:00', 'Sunday: 09:00 – 22:00',
  'Контакт', 'Contact', '© 2026 Кафе Бабушка · Бања Лука', '© 2026 Café Babuska · Banja Luka'
)
on conflict (id) do nothing;
