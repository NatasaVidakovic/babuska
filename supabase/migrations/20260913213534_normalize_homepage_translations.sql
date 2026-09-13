-- Keep the current Serbian homepage message aligned in all supported languages.
-- This only fills a missing Russian value and corrects the matching English copy.
update public.site_settings
set
  hero_title_en = case
    when trim(coalesce(hero_title_sr, '')) = 'Наша прича. Од сада и ваша.'
      and trim(coalesce(hero_title_en, '')) = 'Our story, Yours, too, soon.'
      then 'Our story. Now yours too.'
    else hero_title_en
  end,
  hero_title_ru = case
    when trim(coalesce(hero_title_sr, '')) = 'Наша прича. Од сада и ваша.'
      and nullif(trim(hero_title_ru), '') is null
      then 'Наша история. Теперь и ваша.'
    else hero_title_ru
  end,
  hero_description_en = case
    when trim(coalesce(hero_description_sr, '')) = 'Добродошли у кафе Бабушка.'
      and trim(coalesce(hero_description_en, '')) = 'Welcome to caffe Babuška.'
      then 'Welcome to Caffe Babuska.'
    else hero_description_en
  end,
  hero_description_ru = case
    when trim(coalesce(hero_description_sr, '')) = 'Добродошли у кафе Бабушка.'
      and nullif(trim(hero_description_ru), '') is null
      then 'Добро пожаловать в кафе «Бабушка».'
    else hero_description_ru
  end
where id = 1;
