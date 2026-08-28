create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  category text not null,
  price text not null check (char_length(trim(price)) > 0),
  image_url text,
  description text not null default '',
  fact text,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_sr text not null,
  alt_en text not null,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  instagram text,
  facebook text,
  tiktok text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger menu_items_updated_at before update on public.menu_items for each row execute procedure public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.menu_items enable row level security;
alter table public.gallery_items enable row level security;
alter table public.site_settings enable row level security;

revoke all on public.admin_users, public.menu_items, public.gallery_items, public.site_settings from anon, authenticated;
grant select on public.menu_items, public.gallery_items, public.site_settings to anon, authenticated;
grant insert, update, delete on public.menu_items, public.gallery_items, public.site_settings to authenticated;

create policy "public reads published menu" on public.menu_items for select to anon, authenticated using (is_published or public.is_admin());
create policy "public reads published gallery" on public.gallery_items for select to anon, authenticated using (is_published or public.is_admin());
create policy "public reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admins manage menu" on public.menu_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage gallery" on public.gallery_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafe-media', 'cafe-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public;
create policy "admins upload cafe media" on storage.objects for insert to authenticated with check (bucket_id = 'cafe-media' and public.is_admin());
create policy "admins update cafe media" on storage.objects for update to authenticated using (bucket_id = 'cafe-media' and public.is_admin()) with check (bucket_id = 'cafe-media' and public.is_admin());
create policy "admins delete cafe media" on storage.objects for delete to authenticated using (bucket_id = 'cafe-media' and public.is_admin());

create index menu_items_public_sort_idx on public.menu_items (is_published, sort_order);
create index gallery_items_public_sort_idx on public.gallery_items (is_published, sort_order);
