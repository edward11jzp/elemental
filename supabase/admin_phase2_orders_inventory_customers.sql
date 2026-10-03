-- =====================================================================
-- FASE 2 · Pedidos (kanban, entrega, historial, pedido manual)
--          Inventario (mínimo, ubicación, movimientos) · Clientes
-- Datos 100% de Elemental. Idempotente. Ejecutar completo en SQL Editor.
-- =====================================================================

-- ---------- Pedidos ----------
alter table public.orders add column if not exists due_date date;
alter table public.orders add column if not exists history  jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists source   text  not null default 'web';

-- Historial automático: se anota al crear el pedido y en cada cambio de estado.
create or replace function public.orders_history() returns trigger
language plpgsql as $$
declare lbl text;
begin
  if tg_op = 'INSERT' then
    new.history := coalesce(new.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'label', case when new.source = 'admin' then 'Pedido creado (admin)' else 'Pedido recibido (web)' end,
      'at', now()));
  elsif new.status is distinct from old.status then
    lbl := case new.status when 'pending' then 'Pendiente' when 'approved' then 'Aprobado'
                           when 'in_progress' then 'En proceso' when 'completed' then 'Listo'
                           when 'rejected' then 'Rechazado' else new.status end;
    new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'label', 'Estado → ' || lbl, 'at', now(),
      'by', (select name from public.profiles where id = auth.uid())));
  end if;
  return new;
end $$;
drop trigger if exists orders_history_trg on public.orders;
create trigger orders_history_trg before insert or update on public.orders
  for each row execute function public.orders_history();

-- ---------- Productos: stock mínimo y ubicación ----------
alter table public.products add column if not exists min_stock int  not null default 50;
alter table public.products add column if not exists location  text not null default '';

-- Movimiento manual de inventario (entrada / salida) — atómico.
create or replace function public.register_movement(p_product uuid, p_type text, p_qty int, p_reason text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_stock int; v_name text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_type not in ('in','out') then raise exception 'Tipo inválido'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  select stock, name into v_stock, v_name from public.products where id = p_product for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_type = 'out' and v_stock < p_qty then
    raise exception 'Sólo hay % en stock de %', v_stock, v_name;
  end if;
  update public.products
     set stock = case when p_type = 'in' then stock + p_qty else stock - p_qty end
   where id = p_product
  returning stock into v_stock;
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name)
    values (p_type, p_product, v_name, p_qty, coalesce(nullif(trim(p_reason), ''), 'Ajuste'), public.my_name());
  return v_stock;
end $$;
grant execute on function public.register_movement(uuid, text, int, text) to authenticated;

-- ---------- Clientes ----------
alter table public.customers add column if not exists tier text not null default 'Regular';
alter table public.customers add column if not exists fav  text not null default '';
