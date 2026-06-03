-- ============================================================================
-- Elemental — Schema inicial
-- Ejecuta este archivo en Supabase: SQL Editor → New query → pega todo → Run
-- ============================================================================

-- ============================================================================
-- 1. PROFILES (extiende auth.users con role y datos)
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  name          text,
  phone         text,
  role          text not null default 'customer' check (role in ('customer','employee','admin')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Trigger: cuando se crea un usuario en auth.users, crea su profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. PRODUCTS
-- ============================================================================
create table if not exists public.products (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  category              text not null check (category in ('men','women','kids')),
  subcategory           text not null,
  description           text default '',
  retail_price          numeric(10,2) not null,
  wholesale_price       numeric(10,2) not null,
  image                 text default '',
  images                jsonb not null default '[]'::jsonb,
  sizes                 jsonb not null default '[]'::jsonb,
  color_palette         jsonb not null default '[]'::jsonb,
  stock                 int not null default 0,
  allow_custom          boolean not null default false,
  custom_pricing        jsonb,
  customization_images  jsonb,
  featured              boolean not null default false,
  trending              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists products_category_subcategory_idx
  on public.products (category, subcategory);
create index if not exists products_featured_idx on public.products (featured);

-- ============================================================================
-- 3. ORDERS
-- ============================================================================
create table if not exists public.orders (
  id                    text primary key,
  customer_name         text not null,
  customer_email        text,
  customer_phone        text,
  customer_address      text,
  customer_city         text,
  customer_state        text,
  items                 jsonb not null default '[]'::jsonb,
  total                 numeric(10,2) not null,
  status                text not null default 'pending'
                        check (status in ('pending','approved','in_progress','completed','rejected')),
  notes                 text,
  payment_method        text,
  payment_proof         text,
  fulfillment_type      text check (fulfillment_type in ('delivery','pickup')),
  pickup_location_id    text,
  pickup_location_name  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_phone_idx on public.orders (customer_phone);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ============================================================================
-- 4. SUBCATEGORIES (admin agrega/elimina las personalizadas)
-- ============================================================================
create table if not exists public.subcategories (
  value      text primary key,
  label      text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.subcategories (value, label, is_default) values
  ('t-shirts','Camisetas', true),
  ('polos',   'Polos',     true),
  ('gorras',  'Gorras',    true),
  ('hoodies', 'Hoodies',   true),
  ('joggers', 'Joggers',   true)
on conflict (value) do nothing;

-- ============================================================================
-- 5. SIZES (admin agrega/elimina las personalizadas)
-- ============================================================================
create table if not exists public.sizes (
  value      text primary key,
  label      text not null,
  "group"    text not null check ("group" in ('unica','ninos','adultos','otras')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.sizes (value, label, "group", is_default) values
  ('Talla Única','Talla Única','unica',  true),
  ('2-4',  '2-4',  'ninos', true),
  ('4-6',  '4-6',  'ninos', true),
  ('6-8',  '6-8',  'ninos', true),
  ('8-10', '8-10', 'ninos', true),
  ('10-12','10-12','ninos', true),
  ('12-14','12-14','ninos', true),
  ('14-16','14-16','ninos', true),
  ('XS','XS','adultos', true),
  ('S','S','adultos',   true),
  ('M','M','adultos',   true),
  ('L','L','adultos',   true),
  ('XL','XL','adultos', true),
  ('2XL','2XL','adultos', true),
  ('3XL','3XL','adultos', true),
  ('4XL','4XL','adultos', true)
on conflict (value) do nothing;

-- ============================================================================
-- 6. LOCATIONS, SOCIAL MEDIA, PAYMENT INFO, SITE SETTINGS
-- ============================================================================
create table if not exists public.locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  shopping_center text not null,
  address         text,
  phone           text not null,
  hours           text,
  image           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.social_media (
  id        uuid primary key default gen_random_uuid(),
  platform  text not null,
  username  text not null,
  url       text not null,
  active    boolean not null default true
);

create table if not exists public.payment_info (
  id            uuid primary key default gen_random_uuid(),
  method        text not null,
  active        boolean not null default true,
  account_name  text,
  details       jsonb not null default '{}'::jsonb
);

-- site_settings es de una sola fila (singleton)
create table if not exists public.site_settings (
  id      int primary key default 1,
  tagline text not null default 'Redefine Tu Estilo. Atrevido. Minimalista. Sin Disculpas.',
  constraint single_row check (id = 1)
);
insert into public.site_settings (id, tagline) values (1, 'Redefine Tu Estilo. Atrevido. Minimalista. Sin Disculpas.')
on conflict (id) do nothing;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.orders         enable row level security;
alter table public.subcategories  enable row level security;
alter table public.sizes          enable row level security;
alter table public.locations      enable row level security;
alter table public.social_media   enable row level security;
alter table public.payment_info   enable row level security;
alter table public.site_settings  enable row level security;

-- Helpers
create or replace function public.is_admin() returns boolean language sql stable security definer as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function public.is_staff() returns boolean language sql stable security definer as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin','employee'), false);
$$;

-- PROFILES: cada usuario ve y edita su propio profile; admin ve todos
drop policy if exists "profiles read own"        on public.profiles;
drop policy if exists "profiles read admin"      on public.profiles;
drop policy if exists "profiles update own"      on public.profiles;
drop policy if exists "profiles update admin"    on public.profiles;
create policy "profiles read own"     on public.profiles for select using (auth.uid() = id);
create policy "profiles read admin"   on public.profiles for select using (public.is_admin());
create policy "profiles update own"   on public.profiles for update using (auth.uid() = id);
create policy "profiles update admin" on public.profiles for update using (public.is_admin());

-- PRODUCTS: cualquiera lee, solo admin modifica
drop policy if exists "products read"   on public.products;
drop policy if exists "products write"  on public.products;
create policy "products read"  on public.products for select using (true);
create policy "products write" on public.products for all    using (public.is_admin()) with check (public.is_admin());

-- ORDERS: cualquiera crea (guest checkout), staff lee y actualiza
drop policy if exists "orders insert public"    on public.orders;
drop policy if exists "orders read staff"       on public.orders;
drop policy if exists "orders read by id"       on public.orders;
drop policy if exists "orders update staff"     on public.orders;
create policy "orders insert public" on public.orders for insert with check (true);
create policy "orders read staff"    on public.orders for select using (public.is_staff());
-- Cliente puede leer su propia orden por ID exacto (sin login) — RLS no permite por columna,
-- así que el frontend usa una funcion RPC `get_order_by_id` (se crea abajo).
create policy "orders update staff"  on public.orders for update using (public.is_staff());

-- SUBCATEGORIES y SIZES: cualquiera lee, solo admin modifica
drop policy if exists "subs read"   on public.subcategories;
drop policy if exists "subs write"  on public.subcategories;
create policy "subs read"  on public.subcategories for select using (true);
create policy "subs write" on public.subcategories for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sizes read"  on public.sizes;
drop policy if exists "sizes write" on public.sizes;
create policy "sizes read"  on public.sizes for select using (true);
create policy "sizes write" on public.sizes for all    using (public.is_admin()) with check (public.is_admin());

-- LOCATIONS, SOCIAL_MEDIA, PAYMENT_INFO: público lee, admin modifica
drop policy if exists "loc read"   on public.locations;
drop policy if exists "loc write"  on public.locations;
create policy "loc read"  on public.locations for select using (true);
create policy "loc write" on public.locations for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "soc read"   on public.social_media;
drop policy if exists "soc write"  on public.social_media;
create policy "soc read"  on public.social_media for select using (true);
create policy "soc write" on public.social_media for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pay read"   on public.payment_info;
drop policy if exists "pay write"  on public.payment_info;
create policy "pay read"  on public.payment_info for select using (true);
create policy "pay write" on public.payment_info for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read"  on public.site_settings;
drop policy if exists "settings write" on public.site_settings;
create policy "settings read"  on public.site_settings for select using (true);
create policy "settings write" on public.site_settings for all    using (public.is_admin()) with check (public.is_admin());

-- RPC: permitir que el cliente lea su pedido por número exacto (tracking)
create or replace function public.get_order_by_id(order_id text)
returns setof public.orders
language sql
security definer
set search_path = public
as $$
  select * from public.orders where id = order_id;
$$;
grant execute on function public.get_order_by_id(text) to anon, authenticated;

-- ============================================================================
-- 8. STORAGE BUCKETS (para imágenes de productos y comprobantes de pago)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),       -- imágenes de productos: público
  ('proofs',   'proofs',   false),      -- comprobantes de pago: privado
  ('designs',  'designs',  false)       -- logos personalizados subidos por cliente
on conflict (id) do nothing;

-- Policies para products bucket (público lee, admin sube)
drop policy if exists "products public read"   on storage.objects;
drop policy if exists "products admin write"   on storage.objects;
create policy "products public read" on storage.objects for select using (bucket_id = 'products');
create policy "products admin write" on storage.objects for all using (bucket_id = 'products' and public.is_admin()) with check (bucket_id = 'products' and public.is_admin());

-- Policies para proofs (cualquiera sube, solo staff lee)
drop policy if exists "proofs public upload"  on storage.objects;
drop policy if exists "proofs staff read"     on storage.objects;
create policy "proofs public upload" on storage.objects for insert with check (bucket_id = 'proofs');
create policy "proofs staff read"    on storage.objects for select using (bucket_id = 'proofs' and public.is_staff());

-- ============================================================================
-- LISTO. Verifica creando algo en Table Editor → public.products.
-- ============================================================================
