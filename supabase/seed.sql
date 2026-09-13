insert into public.site_settings (
  id, instagram, facebook, tiktok, phone, email, social_handle,
  hero_title_sr, hero_title_en, hero_title_ru,
  hero_description_sr, hero_description_en, hero_description_ru,
  hero_cta_sr, hero_cta_en, hero_cta_ru,
  footer_address_heading_sr, footer_address_heading_en, footer_address_heading_ru,
  footer_address_line_1_sr, footer_address_line_1_en, footer_address_line_1_ru,
  footer_address_line_2_sr, footer_address_line_2_en, footer_address_line_2_ru,
  footer_address_line_3_sr, footer_address_line_3_en, footer_address_line_3_ru,
  footer_hours_heading_sr, footer_hours_heading_en, footer_hours_heading_ru,
  footer_hours_line_1_sr, footer_hours_line_1_en, footer_hours_line_1_ru,
  footer_hours_line_2_sr, footer_hours_line_2_en, footer_hours_line_2_ru,
  footer_hours_line_3_sr, footer_hours_line_3_en, footer_hours_line_3_ru,
  footer_contact_heading_sr, footer_contact_heading_en, footer_contact_heading_ru,
  footer_copyright_sr, footer_copyright_en, footer_copyright_ru
)
values (
  1, '', '', '', '+387 65 000 000', 'hello@cafebabuska.ba', '@cafebabuska',
  'Кафе Бабушка у Бањој Луци', 'Caffe Babuska in Banja Luka', 'Кафе Бабушка в Баня-Луке',
  'Кафа, пића и пријатна атмосфера у срцу Бање Луке.',
  'Coffee, drinks and a welcoming atmosphere in the heart of Banja Luka.',
  'Кофе, напитки и приятная атмосфера в самом сердце Баня-Луки.',
  'Истражи мени', 'Explore the Menu', 'Открыть меню',
  'Адреса', 'Address', 'Адрес',
  'Господска улица 14', 'Gospodska Street 14', 'Господская улица, 14',
  '78000 Бања Лука', '78000 Banja Luka', '78000 Баня-Лука',
  'Босна и Херцеговина', 'Bosnia and Herzegovina', 'Босния и Герцеговина',
  'Радно вријеме', 'Opening Hours', 'Часы работы',
  'Понедјељак – петак: 08:00 – 23:00', 'Monday – Friday: 08:00 – 23:00', 'Понедельник – пятница: 08:00 – 23:00',
  'Субота: 09:00 – 00:00', 'Saturday: 09:00 – 00:00', 'Суббота: 09:00 – 00:00',
  'Недјеља: 09:00 – 22:00', 'Sunday: 09:00 – 22:00', 'Воскресенье: 09:00 – 22:00',
  'Контакт', 'Contact', 'Контакты',
  '© 2026 Кафе Бабушка · Бања Лука', '© 2026 Café Babuska · Banja Luka', '© 2026 Кафе Бабушка · Баня-Лука'
)
on conflict (id) do nothing;
