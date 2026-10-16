-- ============================================================================
-- Fase 15 - Pedidos de traslado entre tiendas.
--
-- Flujo: una tienda PIDE -> la tienda que tiene la mercancia la ENVIA (sale de
-- su inventario) -> la que pidio CONFIRMA que llego (entra al suyo). Mientras
-- viaja no esta en ninguna de las dos, que es la verdad.
-- Quien pidio puede CANCELAR y quien tiene la mercancia puede RECHAZAR.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.transfer_requests (
  id           bigserial primary key,
  product_id   uuid not null references public.products(id) on delete cascade,
  product_name text not null default '',
  size         text not null default '',
  color        text not null default '',
  qty          int  not null check (qty > 0),
  from_location uuid not null references public.locations(id) on delete cascade,
  to_location   uuid not null references public.locations(id) on delete cascade,
  status       text not null default 'pedido'
                 check (status in ('pedido','enviado','recibido','rechazado','cancelado')),
  note         text not null default '',
  asked_by     text not null default '',
  sent_by      text not null default '',
  got_by       text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists transfer_requests_estado_idx on public.transfer_requests (status, created_at desc);
alter table public.transfer_requests enable row level security;

drop policy if exists transfer_requests_read on public.transfer_requests;
create policy transfer_requests_read on public.transfer_requests for select using (public.is_staff());

-- Pedir: la mercancia viene hacia mi sede.
create or replace function public.request_transfer(p_product uuid, p_from uuid, p_qty int,
                                                   p_size text default '', p_color text default '',
                                                   p_note text default '') returns bigint
language plpgsql security definer set search_path = public as $$
declare v_to uuid := public.my_location(); v_name text; v_id bigint;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if v_to is null then raise exception 'Tu usuario no tiene sede asignada'; end if;
  if p_from is null or p_from = v_to then raise exception 'Elige la tienda que tiene la mercancia'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'Indica cuantas piezas necesitas'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  insert into public.transfer_requests (product_id, product_name, size, color, qty, from_location, to_location, note, asked_by)
  values (p_product, v_name, coalesce(p_size, ''), coalesce(p_color, ''), p_qty, p_from, v_to,
          left(coalesce(p_note, ''), 200), public.my_name())
  returning id into v_id;
  perform public.audit('Pidio traslado de ' || p_qty || ' ' || v_name || ' ' || coalesce(p_size,'') || ' ' || coalesce(p_color,''));
  return v_id;
end $$;

-- Enviar: sale del inventario de quien la tiene.
create or replace function public.send_transfer(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests; v_have int;
begin
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese pedido ya no existe'; end if;
  if r.status <> 'pedido' then raise exception 'Ese pedido ya fue atendido'; end if;
  if not (public.is_manager() or public.my_location() = r.from_location) then
    raise exception 'Solo la tienda que tiene la mercancia puede enviarla';
  end if;
  select coalesce(qty, 0) into v_have from public.product_stock
   where product_id = r.product_id and location_id = r.from_location and size = r.size and color = r.color;
  if coalesce(v_have, 0) < r.qty then
    raise exception 'Solo quedan % piezas de esa talla y color', coalesce(v_have, 0);
  end if;
  perform public.bump_stock(r.product_id, r.from_location, -r.qty, r.size, r.color);
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, to_location_id, size, color)
    values ('traslado', r.product_id, r.product_name, r.qty, 'Envio a otra tienda', public.my_name(), r.from_location, r.to_location, r.size, r.color);
  update public.transfer_requests set status = 'enviado', sent_by = public.my_name(), updated_at = now() where id = p_id;
end $$;

-- Confirmar que llego: entra al inventario de quien pidio.
create or replace function public.receive_transfer(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests;
begin
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese pedido ya no existe'; end if;
  if r.status <> 'enviado' then raise exception 'Ese pedido todavia no ha sido enviado'; end if;
  if not (public.is_manager() or public.my_location() = r.to_location) then
    raise exception 'Solo la tienda que pidio puede confirmar que llego';
  end if;
  perform public.bump_stock(r.product_id, r.to_location, r.qty, r.size, r.color);
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, size, color)
    values ('in', r.product_id, r.product_name, r.qty, 'Llego de otra tienda', public.my_name(), r.to_location, r.size, r.color);
  update public.transfer_requests set status = 'recibido', got_by = public.my_name(), updated_at = now() where id = p_id;
end $$;

-- Rechazar (quien la tiene) o cancelar (quien pidio). Solo antes de enviarla.
create or replace function public.close_transfer(p_id bigint, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests;
begin
  if p_estado not in ('rechazado','cancelado') then raise exception 'Estado invalido'; end if;
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese pedido ya no existe'; end if;
  if r.status <> 'pedido' then raise exception 'Ese pedido ya fue atendido'; end if;
  if p_estado = 'rechazado' and not (public.is_manager() or public.my_location() = r.from_location) then
    raise exception 'Solo la tienda que tiene la mercancia puede rechazarlo';
  end if;
  if p_estado = 'cancelado' and not (public.is_manager() or public.my_location() = r.to_location) then
    raise exception 'Solo la tienda que pidio puede cancelarlo';
  end if;
  update public.transfer_requests set status = p_estado, updated_at = now() where id = p_id;
end $$;

grant execute on function public.request_transfer(uuid, uuid, int, text, text, text) to authenticated;
grant execute on function public.send_transfer(bigint)    to authenticated;
grant execute on function public.receive_transfer(bigint) to authenticated;
grant execute on function public.close_transfer(bigint, text) to authenticated;
