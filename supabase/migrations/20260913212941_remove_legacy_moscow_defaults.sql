-- Remove only the old product defaults. Administrator-entered copy is preserved.
update public.site_settings
set
  hero_title_sr = case
    when trim(coalesce(hero_title_sr, '')) = 'Укус Москве у Бањој Луци' then null
    else hero_title_sr
  end,
  hero_title_en = case
    when trim(coalesce(hero_title_en, '')) = 'A Taste of Moscow in Banja Luka' then null
    else hero_title_en
  end,
  hero_title_ru = case
    when trim(coalesce(hero_title_ru, '')) = 'Вкус Москвы в Баня-Луке' then null
    else hero_title_ru
  end,
  hero_description_sr = case
    when trim(coalesce(hero_description_sr, '')) = 'Ексклузивни напици, фини чајеви и руско гостопримство — послужени с тихом, спокојном топлином.' then null
    else hero_description_sr
  end,
  hero_description_en = case
    when trim(coalesce(hero_description_en, '')) = 'Signature beverages, fine teas, and Russian hospitality — served with quiet, unhurried warmth.' then null
    else hero_description_en
  end,
  hero_description_ru = case
    when trim(coalesce(hero_description_ru, '')) = 'Авторские напитки, изысканные чаи и русское гостеприимство — с тихим, душевным теплом.' then null
    else hero_description_ru
  end
where id = 1;
