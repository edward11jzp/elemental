-- ============================================================================
-- Fase 8 · Sedes: inventario y ventas por sede, juntas y por separado.
--
-- Las sedes son las que ya administras en Ubicaciones. Cada una lleva su
-- propio inventario; products.stock pasa a ser la suma de todas, para que la
-- tienda en línea siga funcionando igual.
--
-- Una venta queda en la sede de quien la hace (cada usuario tiene su sede) y
-- descuenta del inventario de esa sede. Anular una venta devuelve el stock
-- a la sede donde se hizo.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================================

-- ---------- Sedes ----------
alter table public.locations add column if not exists kind   text    not null default 'tienda';
alter table public.locations add column if not exists active boolean not null default true;
alter table public.locations add column if not exists code   text    not null default '';
do $$ begin
  alter table public.locations add constraint locations_kind_ok
    check (kind in ('tienda','taller','deposito','envios'));
exception when duplicate_object then null; end $$;

-- Nombre corto para los selectores: «Sambil» en vez de «ELEMENTAL - Sambil».
update public.locations
   set code = btrim(regexp_replace(name, '^\s*ELEMENTAL\s*-\s*', '', 'i'))
 where code = '';

-- ---------- La sede de cada quien ----------
alter table public.profiles add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.staff    add column if not exists location_id uuid references public.locations(id) on delete set null;

create or replace function public.my_location() returns uuid
language sql stable security definer set search_path = public as $$
  select location_id from public.profiles where id = auth.uid();
$$;

-- ---------- Inventario por sede ----------
create table if not exists public.product_stock (
  product_id  uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  qty         int  not null default 0,
  min_stock   int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (product_id, location_id)
);
create index if not exists product_stock_loc_idx on public.product_stock (location_id);
alter table public.product_stock enable row level security;

drop policy if exists product_stock_read  on public.product_stock;
drop policy if exists product_stock_write on public.product_stock;
create policy product_stock_read  on public.product_stock for select using (public.is_staff());
create policy product_stock_write on public.product_stock for all
  using (public.can('Inventario')) with check (public.can('Inventario'));

-- products.stock = suma de todas las sedes. Lo mantiene la base, no el panel.
create or replace function public.sync_product_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare p uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
     set stock = (select coalesce(sum(qty), 0) from public.product_stock where product_id = p)
   where id = p;
  return null;
end $$;
drop trigger if exists product_stock_sync on public.product_stock;
create trigger product_stock_sync after insert or update or delete on public.product_stock
  for each row execute function public.sync_product_stock();

-- ---------- Movimientos con sede ----------
alter table public.inventory_movements add column if not exists location_id    uuid references public.locations(id) on delete set null;
alter table public.inventory_movements add column if not exists to_location_id uuid references public.locations(id) on delete set null;
do $$ begin
  alter table public.inventory_movements drop constraint inventory_movements_type_check;
exception when undefined_object then null; end $$;
do $$ begin
  alter table public.inventory_movements add constraint inventory_movements_type_ok
    check (type in ('in','out','adjust','traslado'));
exception when duplicate_object then null; end $$;

-- Suma (o resta) existencias en una sede. Devuelve lo que queda allí.
create or replace function public.bump_stock(p_product uuid, p_loc uuid, p_delta int) returns int
language plpgsql security definer set search_path = public as $$
declare q int;
begin
  insert into public.product_stock (product_id, location_id, qty)
  values (p_product, p_loc, greatest(0, p_delta))
  on conflict (product_id, location_id)
    do update set qty = greatest(0, public.product_stock.qty + p_delta), updated_at = now()
  returning qty into q;
  return q;
end $$;

-- Entrada o salida en una sede.
create or replace function public.register_movement(p_product uuid, p_type text, p_qty int, p_reason text, p_loc uuid default null)
returns int
language plpgsql security definer set search_path = public as $$
declare v_name text; v_loc uuid := coalesce(p_loc, public.my_location()); v_have int; q int;
begin
  if not public.can('Inventario') then raise exception 'forbidden'; end if;
  if p_type not in ('in','out') then raise exception 'Tipo inválido'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  if v_loc is null then raise exception 'Indica la sede del movimiento'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  select coalesce(qty, 0) into v_have from public.product_stock where product_id = p_product and location_id = v_loc;
  if p_type = 'out' and coalesce(v_have, 0) < p_qty then
    raise exception 'Sólo hay % de % en esa sede', coalesce(v_have, 0), v_name;
  end if;
  q := public.bump_stock(p_product, v_loc, case when p_type = 'in' then p_qty else -p_qty end);
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id)
    values (p_type, p_product, v_name, p_qty, coalesce(nullif(trim(p_reason), ''), 'Ajuste'), public.my_name(), v_loc);
  return q;
end $$;
grant execute on function public.register_movement(uuid, text, int, text, uuid) to authenticated;

-- Traslado entre sedes: sale de una y entra en la otra, en un solo paso.
create or replace function public.transfer_stock(p_product uuid, p_from uuid, p_to uuid, p_qty int, p_reason text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_name text; v_have int;
begin
  if not public.can('Inventario') then raise exception 'forbidden'; end if;
  if p_from is null or p_to is null or p_from = p_to then raise exception 'Elige dos sedes distintas'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  select coalesce(qty, 0) into v_have from public.product_stock where product_id = p_product and location_id = p_from for update;
  if coalesce(v_have, 0) < p_qty then
    raise exception 'Sólo hay % de % en la sede de origen', coalesce(v_have, 0), v_name;
  end if;
  perform public.bump_stock(p_product, p_from, -p_qty);
  perform public.bump_stock(p_product, p_to, p_qty);
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, to_location_id)
    values ('traslado', p_product, v_name, p_qty, coalesce(nullif(trim(p_reason), ''), 'Traslado'), public.my_name(), p_from, p_to);
  return p_qty;
end $$;
grant execute on function public.transfer_stock(uuid, uuid, uuid, int, text) to authenticated;

-- ---------- Ventas con sede ----------
alter table public.sales    add column if not exists location_id   uuid references public.locations(id) on delete set null;
alter table public.sales    add column if not exists location_name text not null default '';
alter table public.expenses add column if not exists location_id   uuid references public.locations(id) on delete set null;
create index if not exists sales_location_idx on public.sales (location_id, date desc);

-- ---------- Reparto inicial ----------
-- Lo que hay hoy en products.stock se carga en la sede principal, para no
-- perder nada. Desde el panel se reparte con traslados.
create or replace function public.seed_stock_into(p_loc uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  if coalesce(public.my_role(), '') <> 'admin' then raise exception 'Sólo un administrador puede repartir el inventario'; end if;
  if p_loc is null then raise exception 'Indica la sede'; end if;
  if exists (select 1 from public.product_stock) then raise exception 'El inventario por sede ya está repartido'; end if;
  insert into public.product_stock (product_id, location_id, qty, min_stock)
    select p.id, p_loc, greatest(0, coalesce(p.stock, 0)), coalesce(p.min_stock, 0) from public.products p;
  get diagnostics n = row_count;
  perform public.audit('Cargó el inventario inicial en una sede (' || n || ' productos)');
  return n;
end $$;
grant execute on function public.seed_stock_into(uuid) to authenticated;


-- ---------- Ventas: la sede entra en create_sale, void_sale y list_sales ----------
create or replace function public.create_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  mgr       boolean := public.is_manager();
  v_doc     text := coalesce(p->>'doc', 'nota_entrega');
  v_prefix  text; v_seq int; v_id text;
  v_items   jsonb := '[]'::jsonb; it jsonb; prod record;
  v_free    boolean; v_qty int; v_price numeric; v_cost numeric; v_have int;
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
  v_loc     uuid;
  v_locname text;
begin
  if not public.can('Ventas') then raise exception 'forbidden'; end if;
  -- La venta pertenece a la sede de quien la hace; un gerente puede indicar otra.
  v_loc := case when mgr then coalesce(nullif(p->>'locationId', '')::uuid, public.my_location()) else public.my_location() end;
  if v_loc is null and v_doc <> 'cotizacion' then
    raise exception 'Tu usuario no tiene sede asignada. Pídele a un administrador que te la asigne en Usuarios y permisos.';
  end if;
  select l.name into v_locname from public.locations l where l.id = v_loc;
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
      if v_doc <> 'cotizacion' then
        select coalesce(s.qty, 0) into v_have from public.product_stock s
          where s.product_id = prod.id and s.location_id = v_loc for update;
        if coalesce(v_have, 0) < v_qty then
          raise exception 'En % sólo hay % de % (pides %)', coalesce(v_locname, 'tu sede'), coalesce(v_have, 0), prod.name, v_qty;
        end if;
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
                            exchange_rate, total_bs, real_factor, total_real, location_id, location_name)
  values (v_id, v_doc, v_date, auth.uid(), public.my_name(), v_cust, coalesce(p->>'customer', ''), coalesce(p->>'email', ''),
          v_items, round(v_sub, 2), v_disc, v_taxr, v_tax, v_total, v_pay, v_method, v_paycur,
          case when p->>'docCurrency' = 'BS' then 'BS' else 'USD' end, coalesce(p->>'notes', ''),
          v_rate, case when v_rate > 0 then round(v_total * v_rate, 2) else 0 end,
          v_factor, case when v_factor > 0 then round(v_total * v_factor, 2) else 0 end,
          v_loc, coalesce(v_locname, ''))
  returning * into v_row;

  if v_doc <> 'cotizacion' then
    for it in select * from jsonb_array_elements(v_items) loop
      if (it->>'id') is not null then
        perform public.bump_stock((it->>'id')::uuid, v_loc, -(it->>'qty')::int);
        insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id)
          values ('out', (it->>'id')::uuid, it->>'name', (it->>'qty')::int, 'Venta ' || v_id, public.my_name(), v_loc);
      end if;
    end loop;
    if v_cust is not null then
      update public.customers set orders_count = orders_count + 1, spent = spent + v_total where id = v_cust;
    end if;
  end if;
  return to_jsonb(v_row);
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
        perform public.bump_stock((it->>'id')::uuid, s.location_id, (it->>'qty')::int);
        insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id)
          values ('in', (it->>'id')::uuid, it->>'name', (it->>'qty')::int, 'Anulación ' || p_id, public.my_name(), s.location_id);
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
