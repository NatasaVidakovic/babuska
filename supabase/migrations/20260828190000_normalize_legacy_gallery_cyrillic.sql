update public.gallery_items
set alt_sr = case alt_sr
  when 'logo' then 'Лого'
  when 'Unutrašnjost kafića' then 'Унутрашњост кафеа'
  when 'Sto u kafiću' then 'Сто у кафеу'
  when 'Detalj kafe' then 'Детаљ кафе'
  when 'Topla atmosfera' then 'Топла атмосфера'
  when 'Kutak kafića' then 'Кутак у кафеу'
  else alt_sr
end
where alt_sr in ('logo', 'Unutrašnjost kafića', 'Sto u kafiću', 'Detalj kafe', 'Topla atmosfera', 'Kutak kafića');
