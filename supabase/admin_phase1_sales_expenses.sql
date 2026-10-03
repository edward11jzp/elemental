-- =====================================================================
-- FASE 1 · Ventas y Facturación + Gastos (panel admin estilo Bendito)
-- Datos 100% de Elemental. Ejecutar completo en Supabase → SQL Editor.
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- =====================================================================

-- ---------- Ajustes internos del admin (tasa del día, IVA, empresa) ----------
create table if not exists public.admin_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
drop policy if exists "admin_settings read staff"  on public.admin_settings;
drop policy if exists "admin_settings write admin" on public.admin_settings;
create policy "admin_settings read staff"  on public.admin_settings for select using (public.is_staff());
create policy "admin_settings write admin" on public.admin_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.admin_settings (key, value) values
  ('rates',   '{"exchangeRate":0,"realFactor":0,"rateCurrency":"USD","rateAuto":false,"rateDate":null}'::jsonb),
  ('taxRate', '0'::jsonb),
  ('company', '{"name":"Elemental Fábrica","rif":"","email":"","phone":"","address":""}'::jsonb)
on conflict (key) do nothing;

-- ---------- Costo por producto (privado: products es de lectura pública) ----------
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost       numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.product_costs enable row level security;
drop policy if exists "product_costs admin" on public.product_costs;
create policy "product_costs admin" on public.product_costs for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Clientes ----------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  cedula       text,
  phone        text,
  email        text,
  doc_currency text not null default 'USD' check (doc_currency in ('USD','BS')),
  orders_count int not null default 0,
  spent        numeric(12,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);
alter table public.customers enable row level security;
drop policy if exists "customers staff" on public.customers;
create policy "customers staff" on public.customers for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Ventas / documentos ----------
create table if not exists public.sales (
  id            text primary key,
  doc           text not null check (doc in ('nota_entrega','factura','recibo','cotizacion','orden')),
  date          timestamptz not null default now(),
  user_id       uuid,
  user_name     text,
  customer_id   uuid references public.customers(id) on delete set null,
  customer      text not null default '',
  email         text not null default '',
  items         jsonb not null default '[]'::jsonb,
  subtotal      numeric(12,2) not null default 0,
  discount      numeric(12,2) not null default 0,
  tax_rate      numeric(5,2)  not null default 0,
  tax           numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  pay           text not null default 'pagado' check (pay in ('pagado','parcial','pendiente','cancelado','reembolsado')),
  pay_method    text,
  pay_currency  text,
  doc_currency  text not null default 'USD',
  notes         text not null default '',
  exchange_rate numeric(16,4) not null default 0,
  total_bs      numeric(18,2) not null default 0,
  real_factor   numeric(10,4) not null default 0,
  total_real    numeric(12,2) not null default 0,
  void_info     jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists sales_date_idx on public.sales (date desc);
alter table public.sales enable row level security;
-- Lectura directa sólo admin (las líneas traen costos). El personal lee con list_sales().
drop policy if exists "sales read admin" on public.sales;
create policy "sales read admin" on public.sales for select using (public.is_admin());

create table if not exists public.doc_sequences (
  prefix text primary key,
  last   int not null default 0
);
alter table public.doc_sequences enable row level security;

-- ---------- Movimientos de inventario ----------
create table if not exists public.inventory_movements (
  id           bigserial primary key,
  type         text not null check (type in ('in','out','adjust')),
  product_id   uuid,
  product_name text not null,
  qty          int not null,
  reason       text not null default '',
  user_name    text,
  created_at   timestamptz not null default now()
);
alter table public.inventory_movements enable row level security;
drop policy if exists "movements read staff"   on public.inventory_movements;
drop policy if exists "movements insert admin" on public.inventory_movements;
create policy "movements read staff"   on public.inventory_movements for select using (public.is_staff());
create policy "movements insert admin" on public.inventory_movements for insert with check (public.is_admin());

-- ---------- Gastos ----------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('materia_prima','merma','operativo')),
  category        text not null,
  description     text not null,
  supplier        text not null default '',
  amount          numeric(12,2) not null check (amount >= 0),
  date            date not null default current_date,
  account         text not null default '',
  account_amount  numeric(18,2),
  receipt_path    text,
  created_by      uuid default auth.uid(),
  created_by_name text,
  created_at      timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (date desc);
alter table public.expenses enable row level security;
drop policy if exists "expenses admin" on public.expenses;
create policy "expenses admin" on public.expenses for all using (public.is_admin()) with check (public.is_admin());

-- Comprobantes de gastos: bucket PRIVADO.
insert into storage.buckets (id, name, public) values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;
drop policy if exists "expense receipts admin read"   on storage.objects;
drop policy if exists "expense receipts admin write"  on storage.objects;
drop policy if exists "expense receipts admin delete" on storage.objects;
create policy "expense receipts admin read"   on storage.objects for select using (bucket_id = 'expense-receipts' and public.is_admin());
create policy "expense receipts admin write"  on storage.objects for insert with check (bucket_id = 'expense-receipts' and public.is_admin());
create policy "expense receipts admin delete" on storage.objects for delete using (bucket_id = 'expense-receipts' and public.is_admin());

-- =====================================================================
-- FUNCIONES
-- =====================================================================

-- Día de Venezuela (UTC-4) de un instante.
create or replace function public.ve_day(t timestamptz) returns date
language sql immutable as $$ select (t at time zone 'America/Caracas')::date $$;

-- Recargo por talla (igual que src/app/lib/pricing.ts).
create or replace function public.size_upcharge(sz text) returns numeric
language sql immutable as $$
  select case sz when '2XL' then 1 when '3XL' then 2 when '4XL' then 3 else 0 end::numeric
$$;

create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select name from public.profiles where id = auth.uid()), 'Admin')
$$;

-- Lista de ventas. Admin ve todo con costos; el personal sólo hoy y ayer, sin costos.
create or replace function public.list_sales(p_from date default null, p_to date default null)
returns setof jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  admin boolean := public.is_admin();
  min_day date := case when admin then null else public.ve_day(now()) - 1 end;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return query
    select case when admin then to_jsonb(s)
           else to_jsonb(s) || jsonb_build_object('items',
                  coalesce((select jsonb_agg(i - 'cost') from jsonb_array_elements(s.items) i), '[]'::jsonb),
                  'total_real', 0, 'real_factor', 0)
           end
    from public.sales s
    where (p_from is null or public.ve_day(s.date) >= p_from)
      and (p_to   is null or public.ve_day(s.date) <= p_to)
      and (min_day is null or public.ve_day(s.date) >= min_day)
    order by s.date desc;
end $$;

-- Registrar una venta: valida, numera, descuenta stock y deja movimientos. Todo atómico.
create or replace function public.create_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  admin     boolean := public.is_admin();
  v_doc     text := coalesce(p->>'doc', 'nota_entrega');
  v_prefix  text;
  v_seq     int;
  v_id      text;
  v_items   jsonb := '[]'::jsonb;
  it        jsonb;
  prod      record;
  v_free    boolean;
  v_qty     int;
  v_price   numeric;
  v_cost    numeric;
  v_sub     numeric := 0;
  v_disc    numeric := greatest(0, coalesce((p->>'discount')::numeric, 0));
  v_taxr    numeric := coalesce((p->>'taxRate')::numeric, 0);
  v_tax     numeric;
  v_total   numeric;
  v_rate    numeric := coalesce((p->>'exchangeRate')::numeric, 0);
  v_factor  numeric := coalesce((p->>'realFactor')::numeric, 0);
  v_date    timestamptz;
  v_cust    uuid := nullif(p->>'customerId', '')::uuid;
  v_row     public.sales;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  v_prefix := case v_doc when 'nota_entrega' then 'NE' when 'factura' then 'FAC' when 'recibo' then 'REC'
                         when 'cotizacion' then 'COT' when 'orden' then 'ORD' end;
  if v_prefix is null then raise exception 'Tipo de documento inválido'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'La venta no tiene productos'; end if;

  -- Fecha: el personal siempre vende con la fecha de hoy; admin puede usar un día anterior (nunca futuro).
  if admin and nullif(p->>'date', '') is not null then
    if (p->>'date')::date > public.ve_day(now()) then raise exception 'No se puede usar una fecha futura'; end if;
    v_date := case when (p->>'date')::date = public.ve_day(now()) then now()
                   else ((p->>'date') || ' 12:00')::timestamp at time zone 'America/Caracas' end;
  else
    if nullif(p->>'date', '') is not null and (p->>'date')::date <> public.ve_day(now()) then
      raise exception 'Sólo un administrador puede registrar ventas de días anteriores';
    end if;
    v_date := now();
  end if;

  if not admin and v_disc > 0 then raise exception 'Sólo un administrador puede aplicar descuentos'; end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_free  := coalesce((it->>'free')::boolean, false) or nullif(it->>'id', '') is null;
    v_qty   := greatest(1, coalesce((it->>'qty')::int, 1));
    v_price := round(coalesce((it->>'price')::numeric, 0), 2);
    if v_price < 0 then raise exception 'Precio inválido'; end if;

    if v_free then
      if coalesce(trim(it->>'name'), '') = '' then raise exception 'Una línea libre necesita descripción'; end if;
      v_cost := case when admin then greatest(0, coalesce((it->>'cost')::numeric, 0)) else 0 end;
      v_items := v_items || jsonb_build_object('id', null, 'free', true, 'name', it->>'name', 'qty', v_qty,
                                               'price', v_price, 'cost', v_cost);
    else
      select p2.id, p2.name, p2.stock, p2.retail_price, p2.wholesale_price into prod
        from public.products p2 where p2.id = (it->>'id')::uuid for update;
      if not found then raise exception 'Producto no encontrado: %', it->>'name'; end if;
      if v_doc <> 'cotizacion' and prod.stock < v_qty then
        raise exception 'Stock insuficiente de % (hay %, pides %)', prod.name, prod.stock, v_qty;
      end if;
      -- El personal sólo puede cobrar precios de la lista (detal o mayor + recargo de talla).
      if not admin and abs(v_price - (prod.retail_price + public.size_upcharge(it->>'size'))) > 0.005
                   and abs(v_price - (prod.wholesale_price + public.size_upcharge(it->>'size'))) > 0.005 then
        raise exception 'El precio de "%" no coincide con la lista', prod.name;
      end if;
      select coalesce(c.cost, 0) into v_cost from public.product_costs c where c.product_id = prod.id;
      v_cost := coalesce(v_cost, 0);
      v_items := v_items || jsonb_build_object('id', prod.id, 'name', prod.name, 'size', it->>'size', 'color', it->>'color',
                                               'qty', v_qty, 'price', v_price, 'cost', v_cost);
    end if;
    v_sub := v_sub + v_price * v_qty;
  end loop;

  v_tax   := round(greatest(0, v_sub - v_disc) * v_taxr) / 100;
  v_total := round(greatest(0, v_sub - v_disc) + v_tax, 2);

  insert into public.doc_sequences (prefix, last) values (v_prefix, 1)
    on conflict (prefix) do update set last = public.doc_sequences.last + 1
    returning last into v_seq;
  v_id := v_prefix || '-' || lpad(v_seq::text, 6, '0');

  insert into public.sales (id, doc, date, user_id, user_name, customer_id, customer, email, items, subtotal, discount,
                            tax_rate, tax, total, pay, pay_method, pay_currency, doc_currency, notes,
                            exchange_rate, total_bs, real_factor, total_real)
  values (v_id, v_doc, v_date, auth.uid(), public.my_name(), v_cust, coalesce(p->>'customer', ''), coalesce(p->>'email', ''),
          v_items, round(v_sub, 2), v_disc, v_taxr, v_tax, v_total,
          coalesce(nullif(p->>'pay', ''), 'pagado'), nullif(p->>'payMethod', ''), nullif(p->>'payCurrency', ''),
          case when p->>'docCurrency' = 'BS' then 'BS' else 'USD' end, coalesce(p->>'notes', ''),
          v_rate, case when v_rate > 0 then round(v_total * v_rate, 2) else 0 end,
          v_factor, case when v_factor > 0 then round(v_total * v_factor, 2) else 0 end)
  returning * into v_row;

  if v_doc <> 'cotizacion' then
    for it in select * from jsonb_array_elements(v_items) loop
      if (it->>'id') is not null then
        update public.products set stock = greatest(0, stock - (it->>'qty')::int) where id = (it->>'id')::uuid;
        insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name)
          values ('out', (it->>'id')::uuid, it->>'name', (it->>'qty')::int, 'Venta ' || v_id, public.my_name());
      end if;
    end loop;
    if v_cust is not null then
      update public.customers set orders_count = orders_count + 1, spent = spent + v_total where id = v_cust;
    end if;
  end if;

  return to_jsonb(v_row);
end $$;

-- Cambiar estado de pago.
create or replace function public.set_sale_pay(p_id text, p_pay text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.sales;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if p_pay = 'cancelado' then raise exception 'Para anular una venta usa «Anular»'; end if;
  select * into s from public.sales where id = p_id;
  if not found then raise exception 'Venta no encontrada'; end if;
  if s.pay = 'cancelado' then raise exception 'Una venta anulada no se puede reactivar'; end if;
  if not public.is_admin() then
    if p_pay = 'reembolsado' then raise exception 'Sólo un administrador puede registrar reembolsos'; end if;
    if public.ve_day(s.date) <> public.ve_day(now()) then
      raise exception 'Sólo un administrador puede cambiar el pago de ventas de días anteriores';
    end if;
  end if;
  update public.sales set pay = p_pay where id = p_id;
end $$;

-- Corregir fecha (admin).
create or replace function public.set_sale_date(p_id text, p_date date) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare d timestamptz;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_date > public.ve_day(now()) then raise exception 'No se puede poner una fecha futura'; end if;
  d := (p_date::text || ' 12:00')::timestamp at time zone 'America/Caracas';
  update public.sales set date = d where id = p_id;
  if not found then raise exception 'Venta no encontrada'; end if;
  return d;
end $$;

-- Anular venta (admin): devuelve stock y guarda motivo.
create or replace function public.void_sale(p_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.sales; it jsonb; info jsonb;
begin
  if not public.is_admin() then raise exception 'Sólo un administrador puede anular ventas'; end if;
  if length(trim(coalesce(p_reason, ''))) < 4 then raise exception 'Escribe el motivo de la anulación'; end if;
  select * into s from public.sales where id = p_id for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if s.pay = 'cancelado' then raise exception 'Esta venta ya está anulada'; end if;
  if s.doc <> 'cotizacion' then
    for it in select * from jsonb_array_elements(s.items) loop
      if (it->>'id') is not null then
        update public.products set stock = stock + (it->>'qty')::int where id = (it->>'id')::uuid;
        insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name)
          values ('in', (it->>'id')::uuid, it->>'name', (it->>'qty')::int, 'Anulación ' || p_id, public.my_name());
      end if;
    end loop;
    if s.customer_id is not null then
      update public.customers set orders_count = greatest(0, orders_count - 1), spent = greatest(0, spent - s.total)
        where id = s.customer_id;
    end if;
  end if;
  info := jsonb_build_object('reason', left(trim(p_reason), 300), 'user', public.my_name(), 'at', now());
  update public.sales set pay = 'cancelado', void_info = info where id = p_id;
  return info;
end $$;

grant execute on function public.list_sales(date, date)    to authenticated;
grant execute on function public.create_sale(jsonb)        to authenticated;
grant execute on function public.set_sale_pay(text, text)  to authenticated;
grant execute on function public.set_sale_date(text, date) to authenticated;
grant execute on function public.void_sale(text, text)     to authenticated;
