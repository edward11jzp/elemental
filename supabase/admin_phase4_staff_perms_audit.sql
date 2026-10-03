-- =====================================================================
-- FASE 4 · Seguridad de roles · Roles y permisos por módulo · Personal
--          (nómina y créditos) · Proveedores · Registro de actividad
--          · Confirmación de pagos
-- Datos 100% de Elemental. Idempotente. Ejecutar completo en SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. SEGURIDAD: nadie se asigna un rol al registrarse ni se lo cambia solo.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Siempre 'customer'. El rol de staff lo asigna un admin con admin_set_user_role().
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'customer')
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor / servidor (dueño del proyecto): permitido.
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and auth.uid() is not null and not public.is_admin()
     -- claim_first_admin(): el primer admin del sistema puede reclamarse si aún no hay ninguno.
     and exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Sólo un administrador puede cambiar roles o activar usuarios';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------
-- 1. ROLES: admin · manager (Gerente) · production · sales · support
--    ('employee' queda como sinónimo de Ventas para no romper cuentas viejas)
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer','employee','admin','manager','production','sales','support'));

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid() and active)
                  in ('admin','employee','manager','production','sales','support'), false);
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

-- Admin o gerente: anular, fechas pasadas, descuentos, tasas, créditos.
create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','manager'), false)
$$;

create or replace function public.admin_set_user_role(target_id uuid, new_role text, new_name text default null, new_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo admin puede asignar roles'; end if;
  if new_role not in ('customer','employee','admin','manager','production','sales','support') then
    raise exception 'Rol invalido: %', new_role;
  end if;
  if target_id = auth.uid() and new_role <> 'admin' then raise exception 'No puedes quitarte el rol de admin'; end if;
  update public.profiles set role = new_role, name = coalesce(new_name, name), phone = coalesce(new_phone, phone)
   where id = target_id;
end $$;
grant execute on function public.admin_set_user_role(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. PERMISOS POR MÓDULO (matriz guardada en admin_settings 'permissions')
--    Columnas: [admin, gerente, producción, ventas, soporte]
-- ---------------------------------------------------------------------
create or replace function public.default_permissions() returns jsonb language sql immutable as $$
  select '{
    "Dashboard":[1,1,1,1,1], "Pedidos":[1,1,1,1,1], "Inventario":[1,1,1,0,0], "Clientes":[1,1,0,1,1],
    "Ventas":[1,1,0,1,0], "Confirmación de pagos":[1,1,0,1,0], "Gastos":[1,1,0,0,0], "Finanzas":[1,1,0,0,0],
    "Ganancias y costos":[1,1,0,0,0], "Cambio de divisas":[1,1,0,0,0], "Personal":[1,1,0,0,0],
    "Proveedores":[1,1,0,0,0], "Usuarios y permisos":[1,0,0,0,0], "Registro de actividad":[1,0,0,0,0],
    "Configuración":[1,0,0,0,0]
  }'::jsonb
$$;

create or replace function public.can(p_module text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r text := public.my_role(); idx int; m jsonb;
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if p_module in ('Usuarios y permisos','Registro de actividad','Configuración') then return false; end if;
  idx := case r when 'manager' then 1 when 'production' then 2 when 'sales' then 3 when 'employee' then 3 when 'support' then 4 else null end;
  if idx is null then return false; end if;
  select value into m from public.admin_settings where key = 'permissions';
  m := coalesce(m, public.default_permissions());
  return coalesce((coalesce(m->p_module, public.default_permissions()->p_module)->>idx)::int, 0) = 1;
end $$;
grant execute on function public.can(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. POLÍTICAS según la matriz
-- ---------------------------------------------------------------------
drop policy if exists "products write" on public.products;
create policy "products write" on public.products for all using (public.can('Inventario')) with check (public.can('Inventario'));

drop policy if exists "admin_settings write admin" on public.admin_settings;
drop policy if exists "admin_settings write" on public.admin_settings;
create policy "admin_settings write" on public.admin_settings for all
  using (public.is_admin() or (key = 'rates' and public.is_manager()))
  with check (public.is_admin() or (key = 'rates' and public.is_manager()));

drop policy if exists "product_costs admin" on public.product_costs;
drop policy if exists "product_costs perm" on public.product_costs;
create policy "product_costs perm" on public.product_costs for all using (public.can('Ganancias y costos')) with check (public.can('Ganancias y costos'));

drop policy if exists "customers staff" on public.customers;
drop policy if exists "customers perm" on public.customers;
create policy "customers perm" on public.customers for all
  using (public.can('Clientes') or public.can('Ventas') or public.can('Pedidos') or public.can('Personal'))
  with check (public.can('Clientes') or public.can('Ventas') or public.can('Pedidos') or public.can('Personal'));

drop policy if exists "sales read admin" on public.sales;
drop policy if exists "sales read perm" on public.sales;
create policy "sales read perm" on public.sales for select using (public.can('Ganancias y costos'));

drop policy if exists "movements insert admin" on public.inventory_movements;
drop policy if exists "movements insert perm" on public.inventory_movements;
create policy "movements insert perm" on public.inventory_movements for insert with check (public.can('Inventario'));

-- Gastos: módulo Gastos; Personal puede registrar pagos de nómina (categoría Empleados).
drop policy if exists "expenses admin" on public.expenses;
drop policy if exists "expenses perm" on public.expenses;
create policy "expenses perm" on public.expenses for all
  using (public.can('Gastos') or (public.can('Personal') and category = 'Empleados'))
  with check (public.can('Gastos') or (public.can('Personal') and category = 'Empleados'));

drop policy if exists "expense receipts admin read"   on storage.objects;
drop policy if exists "expense receipts admin write"  on storage.objects;
drop policy if exists "expense receipts admin delete" on storage.objects;
create policy "expense receipts admin read"   on storage.objects for select using (bucket_id = 'expense-receipts' and public.can('Gastos'));
create policy "expense receipts admin write"  on storage.objects for insert with check (bucket_id = 'expense-receipts' and public.can('Gastos'));
create policy "expense receipts admin delete" on storage.objects for delete using (bucket_id = 'expense-receipts' and public.can('Gastos'));

drop policy if exists "finance_accounts admin" on public.finance_accounts;
drop policy if exists "finance_accounts perm" on public.finance_accounts;
create policy "finance_accounts perm" on public.finance_accounts for all
  using (public.can('Finanzas') or public.can('Cambio de divisas')) with check (public.can('Finanzas'));
drop policy if exists "finance_moves admin" on public.finance_moves;
drop policy if exists "finance_moves perm" on public.finance_moves;
create policy "finance_moves perm" on public.finance_moves for all
  using (public.can('Finanzas') or (type = 'cambio' and public.can('Cambio de divisas')))
  with check (public.can('Finanzas') or (type = 'cambio' and public.can('Cambio de divisas')));

create or replace function public.adjust_finance_account(p_key text, p_balance numeric, p_since date, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can('Finanzas') then raise exception 'forbidden'; end if;
  insert into public.finance_accounts (key, opening, since, set_at) values (p_key, p_balance, p_since, now())
    on conflict (key) do update set opening = excluded.opening, since = excluded.since, set_at = excluded.set_at;
  insert into public.finance_moves (type, account, amount, date, note, user_name)
    values ('ajuste', p_key, p_balance, p_since, coalesce(p_note, ''), public.my_name());
end $$;

create or replace function public.register_movement(p_product uuid, p_type text, p_qty int, p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare v_stock int; v_name text;
begin
  if not public.can('Inventario') then raise exception 'forbidden'; end if;
  if p_type not in ('in','out') then raise exception 'Tipo inválido'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  select stock, name into v_stock, v_name from public.products where id = p_product for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_type = 'out' and v_stock < p_qty then raise exception 'Sólo hay % en stock de %', v_stock, v_name; end if;
  update public.products set stock = case when p_type = 'in' then stock + p_qty else stock - p_qty end
   where id = p_product returning stock into v_stock;
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name)
    values (p_type, p_product, v_name, p_qty, coalesce(nullif(trim(p_reason), ''), 'Ajuste'), public.my_name());
  return v_stock;
end $$;

-- ---------------------------------------------------------------------
-- 4. PROVEEDORES
-- ---------------------------------------------------------------------
create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null default '',
  contact    text not null default '',
  phone      text not null default '',
  email      text not null default '',
  notes      text not null default '',
  status     text not null default 'Activo' check (status in ('Activo','Pendiente','Inactivo')),
  created_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
drop policy if exists "suppliers perm" on public.suppliers;
create policy "suppliers perm" on public.suppliers for all
  using (public.can('Proveedores') or public.can('Inventario')) with check (public.can('Proveedores'));
alter table public.products add column if not exists supplier text not null default '';

-- ---------------------------------------------------------------------
-- 5. PERSONAL: nómina + créditos al personal
-- ---------------------------------------------------------------------
alter table public.customers add column if not exists is_employee     boolean not null default false;
alter table public.customers add column if not exists employee_branch text not null default '';
alter table public.customers add column if not exists credit_limit    numeric(12,2) not null default 0;

create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  position    text not null default '',
  cedula      text not null default '',
  phone       text not null default '',
  email       text not null default '',
  hire_date   date,
  salary      numeric(12,2) not null default 0,
  pay_freq    text not null default 'quincenal' check (pay_freq in ('semanal','quincenal','mensual')),
  customer_id uuid references public.customers(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  notes       text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.staff enable row level security;
drop policy if exists "staff perm" on public.staff;
create policy "staff perm" on public.staff for all using (public.can('Personal')) with check (public.can('Personal'));

-- Pagos de nómina: son gastos operativos (Empleados) ligados a la persona.
alter table public.expenses add column if not exists staff_id    uuid references public.staff(id) on delete set null;
alter table public.expenses add column if not exists period_from date;
alter table public.expenses add column if not exists period_to   date;
alter table public.expenses add column if not exists deductions  jsonb not null default '[]'::jsonb;

-- Abonos a ventas a crédito del personal.
create table if not exists public.sale_payments (
  id         uuid primary key default gen_random_uuid(),
  sale_id    text not null references public.sales(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  method     text not null,          -- cuenta de dinero o 'nomina'
  currency   text not null default 'USD',
  bs         numeric(18,2),
  date       date not null default current_date,
  note       text not null default '',
  user_name  text,
  created_at timestamptz not null default now()
);
create index if not exists sale_payments_sale_idx on public.sale_payments (sale_id);
alter table public.sale_payments enable row level security;
drop policy if exists "sale_payments read" on public.sale_payments;
create policy "sale_payments read" on public.sale_payments for select using (public.can('Ventas') or public.can('Personal') or public.can('Finanzas'));

-- Lo que debe una persona del personal en compras a crédito.
create or replace function public.employee_owed(p_customer uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(s.total - coalesce((select sum(p.amount) from public.sale_payments p where p.sale_id = s.id), 0)), 0)
    from public.sales s
   where s.customer_id = p_customer and s.pay_method = 'credito' and s.pay <> 'cancelado'
$$;

-- ---------------------------------------------------------------------
-- 6. VENTAS (se re-crean con permisos por módulo y crédito al personal)
-- ---------------------------------------------------------------------
create or replace function public.list_sales(p_from date default null, p_to date default null)
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
declare
  costs   boolean := public.can('Ganancias y costos');
  min_day date := case when public.is_manager() then null else public.ve_day(now()) - 1 end;
begin
  if not (public.can('Ventas') or public.can('Personal') or public.can('Finanzas') or costs) then raise exception 'forbidden'; end if;
  return query
    select (case when costs then to_jsonb(s)
                 else to_jsonb(s) || jsonb_build_object('items',
                   coalesce((select jsonb_agg(i - 'cost') from jsonb_array_elements(s.items) i), '[]'::jsonb),
                   'total_real', 0, 'real_factor', 0) end)
           || jsonb_build_object('payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at)
                                                         from public.sale_payments p where p.sale_id = s.id), '[]'::jsonb))
      from public.sales s
     where (p_from is null or public.ve_day(s.date) >= p_from)
       and (p_to   is null or public.ve_day(s.date) <= p_to)
       and (min_day is null or public.ve_day(s.date) >= min_day or (s.pay_method = 'credito' and s.pay in ('pendiente','parcial')))
     order by s.date desc;
end $$;

create or replace function public.create_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  mgr       boolean := public.is_manager();
  v_doc     text := coalesce(p->>'doc', 'nota_entrega');
  v_prefix  text; v_seq int; v_id text;
  v_items   jsonb := '[]'::jsonb; it jsonb; prod record;
  v_free    boolean; v_qty int; v_price numeric; v_cost numeric;
  v_sub     numeric := 0;
  v_disc    numeric := greatest(0, coalesce((p->>'discount')::numeric, 0));
  v_taxr    numeric := coalesce((p->>'taxRate')::numeric, 0);
  v_tax numeric; v_total numeric;
  v_rate    numeric := coalesce((p->>'exchangeRate')::numeric, 0);
  v_factor  numeric := coalesce((p->>'realFactor')::numeric, 0);
  v_date    timestamptz;
  v_cust    uuid := nullif(p->>'customerId', '')::uuid;
  v_credit  boolean := coalesce((p->>'credit')::boolean, false);
  v_pay     text := coalesce(nullif(p->>'pay', ''), 'pagado');
  v_method  text := nullif(p->>'payMethod', '');
  v_paycur  text := nullif(p->>'payCurrency', '');
  e_is      boolean := false;
  e_name    text;
  e_limit   numeric := 0;
  v_row     public.sales;
begin
  if not public.can('Ventas') then raise exception 'forbidden'; end if;
  v_prefix := case v_doc when 'nota_entrega' then 'NE' when 'factura' then 'FAC' when 'recibo' then 'REC'
                         when 'cotizacion' then 'COT' when 'orden' then 'ORD' end;
  if v_prefix is null then raise exception 'Tipo de documento inválido'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'La venta no tiene productos'; end if;

  if mgr and nullif(p->>'date', '') is not null then
    if (p->>'date')::date > public.ve_day(now()) then raise exception 'No se puede usar una fecha futura'; end if;
    v_date := case when (p->>'date')::date = public.ve_day(now()) then now()
                   else ((p->>'date') || ' 12:00')::timestamp at time zone 'America/Caracas' end;
  else
    if nullif(p->>'date', '') is not null and (p->>'date')::date <> public.ve_day(now()) then
      raise exception 'Sólo un administrador o gerente puede registrar ventas de días anteriores';
    end if;
    v_date := now();
  end if;
  if not mgr and v_disc > 0 then raise exception 'Sólo un administrador o gerente puede aplicar descuentos'; end if;

  -- Venta al personal: sólo admin/gerente; a crédito queda pendiente y se paga con abonos.
  if v_cust is not null then
    select c.is_employee, c.name, c.credit_limit into e_is, e_name, e_limit from public.customers c where c.id = v_cust;
    e_is := coalesce(e_is, false);
  end if;
  if v_credit then
    if v_doc = 'cotizacion' then raise exception 'Una cotización no puede ser a crédito'; end if;
    if not e_is then raise exception 'La venta a crédito es sólo para el personal'; end if;
    if not mgr then raise exception 'Las ventas al personal sólo las puede facturar un administrador o gerente'; end if;
    v_pay := 'pendiente'; v_method := 'credito'; v_paycur := null;
  elsif e_is and v_doc <> 'cotizacion' and not mgr then
    raise exception 'Las ventas al personal sólo las puede facturar un administrador o gerente';
  end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_free  := coalesce((it->>'free')::boolean, false) or nullif(it->>'id', '') is null;
    v_qty   := greatest(1, coalesce((it->>'qty')::int, 1));
    v_price := round(coalesce((it->>'price')::numeric, 0), 2);
    if v_price < 0 then raise exception 'Precio inválido'; end if;
    if v_free then
      if coalesce(trim(it->>'name'), '') = '' then raise exception 'Una línea libre necesita descripción'; end if;
      v_cost := case when public.can('Ganancias y costos') then greatest(0, coalesce((it->>'cost')::numeric, 0)) else 0 end;
      v_items := v_items || jsonb_build_object('id', null, 'free', true, 'name', it->>'name', 'qty', v_qty, 'price', v_price, 'cost', v_cost);
    else
      select p2.id, p2.name, p2.stock, p2.retail_price, p2.wholesale_price into prod
        from public.products p2 where p2.id = (it->>'id')::uuid for update;
      if not found then raise exception 'Producto no encontrado: %', it->>'name'; end if;
      if v_doc <> 'cotizacion' and prod.stock < v_qty then
        raise exception 'Stock insuficiente de % (hay %, pides %)', prod.name, prod.stock, v_qty;
      end if;
      if not mgr and abs(v_price - (prod.retail_price + public.size_upcharge(it->>'size'))) > 0.005
                 and abs(v_price - (prod.wholesale_price + public.size_upcharge(it->>'size'))) > 0.005 then
        raise exception 'El precio de "%" no coincide con la lista', prod.name;
      end if;
      select coalesce(c.cost, 0) into v_cost from public.product_costs c where c.product_id = prod.id;
      v_items := v_items || jsonb_build_object('id', prod.id, 'name', prod.name, 'size', it->>'size', 'color', it->>'color',
                                               'qty', v_qty, 'price', v_price, 'cost', coalesce(v_cost, 0));
    end if;
    v_sub := v_sub + v_price * v_qty;
  end loop;

  v_tax   := round(greatest(0, v_sub - v_disc) * v_taxr) / 100;
  v_total := round(greatest(0, v_sub - v_disc) + v_tax, 2);

  if v_credit and e_limit > 0 and not coalesce((p->>'confirmOverLimit')::boolean, false)
     and public.employee_owed(v_cust) + v_total - coalesce((p->>'initialAbono')::numeric, 0) > e_limit + 0.005 then
    raise exception 'LIMIT|%|%|%|%', e_name, e_limit, round(public.employee_owed(v_cust), 2), v_total;
  end if;

  insert into public.doc_sequences (prefix, last) values (v_prefix, 1)
    on conflict (prefix) do update set last = public.doc_sequences.last + 1 returning last into v_seq;
  v_id := v_prefix || '-' || lpad(v_seq::text, 6, '0');

  insert into public.sales (id, doc, date, user_id, user_name, customer_id, customer, email, items, subtotal, discount,
                            tax_rate, tax, total, pay, pay_method, pay_currency, doc_currency, notes,
                            exchange_rate, total_bs, real_factor, total_real)
  values (v_id, v_doc, v_date, auth.uid(), public.my_name(), v_cust, coalesce(p->>'customer', ''), coalesce(p->>'email', ''),
          v_items, round(v_sub, 2), v_disc, v_taxr, v_tax, v_total, v_pay, v_method, v_paycur,
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

create or replace function public.set_sale_pay(p_id text, p_pay text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.sales;
begin
  if not public.can('Ventas') then raise exception 'forbidden'; end if;
  if p_pay = 'cancelado' then raise exception 'Para anular una venta usa «Anular»'; end if;
  select * into s from public.sales where id = p_id;
  if not found then raise exception 'Venta no encontrada'; end if;
  if s.pay = 'cancelado' then raise exception 'Una venta anulada no se puede reactivar'; end if;
  if s.pay_method = 'credito' then raise exception 'Las ventas a crédito se pagan con abonos (Personal → Créditos)'; end if;
  if not public.is_manager() then
    if p_pay = 'reembolsado' then raise exception 'Sólo un administrador o gerente puede registrar reembolsos'; end if;
    if public.ve_day(s.date) <> public.ve_day(now()) then
      raise exception 'Sólo un administrador o gerente puede cambiar el pago de ventas de días anteriores';
    end if;
  end if;
  update public.sales set pay = p_pay where id = p_id;
end $$;

create or replace function public.set_sale_date(p_id text, p_date date) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare d timestamptz;
begin
  if not public.is_manager() then raise exception 'forbidden'; end if;
  if p_date > public.ve_day(now()) then raise exception 'No se puede poner una fecha futura'; end if;
  d := (p_date::text || ' 12:00')::timestamp at time zone 'America/Caracas';
  update public.sales set date = d where id = p_id;
  if not found then raise exception 'Venta no encontrada'; end if;
  return d;
end $$;

create or replace function public.void_sale(p_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.sales; it jsonb; info jsonb; removed jsonb;
begin
  if not public.is_manager() then raise exception 'Sólo un administrador o gerente puede anular ventas'; end if;
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
  -- Abonos de un crédito: se revierten (salen de Finanzas y de los cierres).
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into removed from public.sale_payments p where p.sale_id = p_id;
  delete from public.sale_payments where sale_id = p_id;
  info := jsonb_build_object('reason', left(trim(p_reason), 300), 'user', public.my_name(), 'at', now(),
                             'removedPayments', jsonb_array_length(removed));
  update public.sales set pay = 'cancelado', void_info = info || jsonb_build_object('payments', removed) where id = p_id;
  return info;
end $$;

-- Abono a una venta a crédito.
create or replace function public.add_sale_payment(p_sale text, p_amount numeric, p_method text, p_currency text,
                                                   p_bs numeric, p_date date, p_note text) returns numeric
language plpgsql security definer set search_path = public as $$
declare s public.sales; paid numeric; bal numeric;
begin
  if not (public.is_manager() and (public.can('Ventas') or public.can('Personal'))) then
    raise exception 'Sólo un administrador o gerente registra abonos';
  end if;
  select * into s from public.sales where id = p_sale for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if s.pay = 'cancelado' then raise exception 'Esa venta está anulada'; end if;
  if s.pay_method <> 'credito' then raise exception 'Esa venta no es a crédito'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Indica el monto del abono'; end if;
  select coalesce(sum(amount), 0) into paid from public.sale_payments where sale_id = p_sale;
  if paid + p_amount > s.total + 0.005 then raise exception 'El abono supera lo que falta (%)', round(s.total - paid, 2); end if;
  insert into public.sale_payments (sale_id, amount, method, currency, bs, date, note, user_name)
    values (p_sale, round(p_amount, 2), p_method, coalesce(p_currency, 'USD'), p_bs, coalesce(p_date, public.ve_day(now())),
            coalesce(p_note, ''), public.my_name());
  bal := round(s.total - paid - p_amount, 2);
  update public.sales set pay = case when bal <= 0.005 then 'pagado' else 'parcial' end where id = p_sale;
  return greatest(bal, 0);
end $$;

create or replace function public.delete_sale_payment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_sale text; rest numeric;
begin
  if not public.is_manager() then raise exception 'forbidden'; end if;
  delete from public.sale_payments where id = p_id returning sale_id into v_sale;
  if v_sale is null then raise exception 'Abono no encontrado'; end if;
  select count(*) into rest from public.sale_payments where sale_id = v_sale;
  update public.sales set pay = case when rest > 0 then 'parcial' else 'pendiente' end where id = v_sale and pay <> 'cancelado';
end $$;

grant execute on function public.add_sale_payment(text, numeric, text, text, numeric, date, text) to authenticated;
grant execute on function public.delete_sale_payment(uuid) to authenticated;
grant execute on function public.employee_owed(uuid) to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.my_role() to authenticated;

-- ---------------------------------------------------------------------
-- 7. CONFIRMACIÓN DE PAGOS: marcas manuales sobre cobros de Binance
-- ---------------------------------------------------------------------
create table if not exists public.payment_links (
  provider  text not null,
  ref       text not null,
  status    text not null check (status in ('store','ignored')),
  sale_id   text,
  user_name text,
  at        timestamptz not null default now(),
  primary key (provider, ref)
);
alter table public.payment_links enable row level security;
drop policy if exists "payment_links perm" on public.payment_links;
create policy "payment_links perm" on public.payment_links for all
  using (public.can('Confirmación de pagos')) with check (public.can('Confirmación de pagos'));

-- ---------------------------------------------------------------------
-- 8. REGISTRO DE ACTIVIDAD (automático, por disparadores)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  user_name  text,
  role       text,
  action     text not null,
  ip         text
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
drop policy if exists "audit read" on public.audit_log;
create policy "audit read" on public.audit_log for select using (public.can('Registro de actividad'));

create or replace function public.audit(p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare hdr json; v_ip text;
begin
  begin hdr := current_setting('request.headers', true)::json; exception when others then hdr := null; end;
  v_ip := split_part(coalesce(hdr->>'x-forwarded-for', hdr->>'x-real-ip', ''), ',', 1);
  insert into public.audit_log (user_name, role, action, ip)
  values (coalesce((select name from public.profiles where id = auth.uid()),
                   case when auth.uid() is null and current_user = 'anon' then 'Cliente web' else 'Sistema' end),
          coalesce(public.my_role(), case when auth.uid() is null and current_user = 'anon' then 'web' else 'sistema' end),
          left(p_action, 500), nullif(trim(v_ip), ''));
end $$;

create or replace function public.audit_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare a text;
begin
  case tg_table_name
  when 'sales' then
    if tg_op = 'INSERT' then
      a := 'Creó ' || case new.doc when 'nota_entrega' then 'nota de entrega' when 'cotizacion' then 'cotización' else new.doc end
           || ' ' || new.id || ' ($' || new.total || ') · ' || coalesce(nullif(new.customer, ''), 'Consumidor final')
           || case when new.pay_method = 'credito' then ' · A CRÉDITO (personal)' else '' end;
    elsif new.pay = 'cancelado' and old.pay <> 'cancelado' then
      a := 'Anuló ' || new.id || ' ($' || new.total || ') · motivo: ' || coalesce(new.void_info->>'reason', '—');
    elsif new.pay is distinct from old.pay then a := 'Cambió pago de ' || new.id || ': ' || old.pay || ' → ' || new.pay;
    elsif new.date is distinct from old.date then a := 'Cambió la fecha de ' || new.id;
    end if;
  when 'expenses' then
    if tg_op = 'INSERT' then a := 'Registró gasto "' || new.description || '" ($' || new.amount || ') · ' || new.category;
    elsif tg_op = 'UPDATE' then a := 'Editó gasto "' || new.description || '" ($' || new.amount || ')';
    else a := 'Eliminó gasto "' || old.description || '" ($' || old.amount || ')'; end if;
  when 'finance_moves' then
    if tg_op = 'INSERT' then
      a := case new.type when 'ajuste' then 'Ajustó saldo de ' || new.account || ' a ' || new.amount
                         when 'cambio' then 'Registró cambio ' || new.account || ' → ' || new.to_account || ' (' || new.amount || ' → ' || new.amount_to || ')'
                         when 'transfer' then 'Transferencia ' || new.account || ' → ' || new.to_account || ' (' || new.amount || ')'
                         when 'in' then 'Ingreso en ' || new.account || ' (' || new.amount || ')'
                         else 'Egreso de ' || new.account || ' (' || new.amount || ')' end;
    elsif tg_op = 'DELETE' then a := 'Eliminó movimiento ' || old.type || ' de ' || old.account || ' (' || old.amount || ')'; end if;
  when 'products' then
    if tg_op = 'INSERT' then a := 'Creó producto "' || new.name || '"';
    elsif tg_op = 'DELETE' then a := 'Eliminó producto "' || old.name || '"';
    elsif new.retail_price is distinct from old.retail_price or new.wholesale_price is distinct from old.wholesale_price then
      a := 'Cambió precios de "' || new.name || '": $' || old.retail_price || '/$' || old.wholesale_price || ' → $' || new.retail_price || '/$' || new.wholesale_price;
    elsif new.name is distinct from old.name then a := 'Renombró producto "' || old.name || '" → "' || new.name || '"';
    end if;
  when 'inventory_movements' then
    if new.reason not like 'Venta %' and new.reason not like 'Anulación %' then
      a := 'Movimiento de inventario: ' || case new.type when 'in' then '+' else '-' end || new.qty || ' ' || new.product_name || ' (' || new.reason || ')';
    end if;
  when 'orders' then
    if tg_op = 'INSERT' and new.source = 'admin' then a := 'Creó pedido ' || new.id || ' · ' || new.customer_name || ' ($' || new.total || ')';
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then a := 'Pedido ' || new.id || ': ' || old.status || ' → ' || new.status;
    end if;
  when 'customers' then
    if tg_op = 'INSERT' then a := 'Creó cliente "' || new.name || '"';
    elsif tg_op = 'DELETE' then a := 'Eliminó cliente "' || old.name || '"';
    elsif new.is_employee is distinct from old.is_employee or new.credit_limit is distinct from old.credit_limit then
      a := 'Cambió datos de personal/crédito de "' || new.name || '"';
    end if;
  when 'staff' then
    if tg_op = 'INSERT' then a := 'Agregó al personal: ' || new.name;
    elsif tg_op = 'DELETE' then a := 'Eliminó del personal: ' || old.name;
    elsif new.salary is distinct from old.salary then a := 'Cambió sueldo de ' || new.name || ': $' || old.salary || ' → $' || new.salary;
    elsif new.active is distinct from old.active then a := case when new.active then 'Reactivó a ' else 'Desactivó a ' end || new.name;
    end if;
  when 'sale_payments' then
    if tg_op = 'INSERT' then a := 'Abono de $' || new.amount || ' a ' || new.sale_id || ' (' || new.method || ')';
    else a := 'Eliminó abono de $' || old.amount || ' de ' || old.sale_id; end if;
  when 'suppliers' then
    if tg_op = 'INSERT' then a := 'Creó proveedor "' || new.name || '"';
    elsif tg_op = 'DELETE' then a := 'Eliminó proveedor "' || old.name || '"'; end if;
  when 'profiles' then
    if new.role is distinct from old.role then a := 'Cambió rol de ' || coalesce(new.name, '?') || ': ' || old.role || ' → ' || new.role;
    elsif new.active is distinct from old.active then a := case when new.active then 'Activó usuario ' else 'Desactivó usuario ' end || coalesce(new.name, '?');
    end if;
  when 'admin_settings' then
    a := case new.key when 'rates' then 'Cambió la tasa del día: Bs ' || coalesce(new.value->>'exchangeRate', '?')
                      when 'permissions' then 'Cambió la matriz de permisos'
                      else 'Cambió ajustes: ' || new.key end;
  else null;
  end case;
  if a is not null then perform public.audit(a); end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['sales','expenses','finance_moves','products','inventory_movements','orders','customers',
                           'staff','sale_payments','suppliers','profiles','admin_settings'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trg()', t);
  end loop;
end $$;

-- Borrar registro viejo (lo anterior al mes pasado). Sólo admin, con confirmación en el panel.
create or replace function public.audit_purge(p_cutoff date) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_cutoff > (date_trunc('month', public.ve_day(now())) - interval '1 month')::date then
    raise exception 'Siempre se conserva el mes anterior completo';
  end if;
  delete from public.audit_log where at < (p_cutoff::timestamp at time zone 'America/Caracas');
  get diagnostics n = row_count;
  perform public.audit('Borró ' || n || ' entradas del registro anteriores al ' || p_cutoff);
  return n;
end $$;
grant execute on function public.audit_purge(date) to authenticated;
