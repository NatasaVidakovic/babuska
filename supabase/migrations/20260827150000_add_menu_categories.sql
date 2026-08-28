create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger menu_categories_updated_at before update on public.menu_categories
for each row execute procedure public.set_updated_at();

insert into public.menu_categories (name, sort_order)
select category, min(sort_order)
from public.menu_items
group by category
on conflict (name) do nothing;

alter table public.menu_items add column category_id uuid references public.menu_categories(id) on delete restrict;

update public.menu_items item
set category_id = category.id
from public.menu_categories category
where category.name = item.category;

alter table public.menu_items alter column category_id set not null;
alter table public.menu_items drop column category;

alter table public.menu_categories enable row level security;
revoke all on public.menu_categories from anon, authenticated;
grant select on public.menu_categories to anon, authenticated;
grant insert, update, delete on public.menu_categories to authenticated;

create policy "public reads active menu categories"
on public.menu_categories for select to anon, authenticated
using (is_active or public.is_admin());

create policy "admins manage menu categories"
on public.menu_categories for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create index menu_items_category_public_sort_idx
on public.menu_items (category_id, is_published, sort_order);
