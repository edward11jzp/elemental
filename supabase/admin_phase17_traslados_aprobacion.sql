-- ============================================================================
-- Fase 17 - Traslados: aprobacion, envio directo y revision de faltantes.
--
-- Dos maneras de mover mercancia entre tiendas:
--
--   PEDIDO  : A pide -> la gerente APRUEBA -> B envia -> A confirma.
--             Si quien pide es gerente o admin, queda aprobado de una vez.
--   ENVIO   : B envia por iniciativa propia -> A confirma. Sin aprobacion.
--
-- Al confirmar, quien recibe dice CUANTAS piezas llegaron. Si llegaron menos
-- de las enviadas, el traslado queda "con diferencia" para que la gerente lo
-- revise: lo da por perdido o devuelve el faltante a la tienda de origen.
--
-- La mercancia sale de una tienda al enviarse y entra a la otra al
-- confirmarse; mientras viaja no esta en ninguna de las dos.
-- Idempotente.
-- ============================================================================

alter table public.transfer_requests add column if not exists kind         text not null default 'pedido';
alter table public.transfer_requests add column if not exists qty_received int;
alter table public.transfer_requests add column if not exists approved_by  text not null default '';
alter table public.transfer_requests add column if not exists reviewed_by  text not null default '';
alter table public.transfer_requests add column if not exists review_note  text not null default '';

do $$ begin
  alter table public.transfer_requests drop constraint transfer_requests_status_check;
exception when undefined_object then null; end $$;
do $$ begin
  alter table public.transfer_requests add constraint transfer_requests_status_ok
    check (status in ('pedido','aprobado','enviado','recibido','con_diferencia','revisado','rechazado','cancelado'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.transfer_requests add constraint transfer_requests_kind_ok check (kind in ('pedido','envio'));
exception when duplicate_object then null; end $$;

-- La version anterior de "confirmar" no pedia la cantidad; se retira para que
-- no haya dos funciones con el mismo nombre.
drop function if exists public.receive_transfer(bigint);

-- Pedir. Si lo pide la gerente o el admin, ya va aprobado, y ellos pueden
-- indicar para que tienda es (no siempre tienen sede propia).
drop function if exists public.request_transfer(uuid, uuid, int, text, text, text);
create or replace function public.request_transfer(p_product uuid, p_from uuid, p_qty int,
                                                   p_size text default '', p_color text default '',
                                                   p_note text default '', p_to uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_mgr boolean := public.is_manager();
        v_to uuid := case when public.is_manager() then coalesce(p_to, public.my_location()) else public.my_location() end;
        v_name text; v_id bigint;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if v_to is null then raise exception 'Tu usuario no tiene sede asignada'; end if;
  if p_from is null or p_from = v_to then raise exception 'Elige la tienda que tiene la mercancia'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'Indica cuantas piezas necesitas'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  insert into public.transfer_requests (kind, product_id, product_name, size, color, qty, from_location, to_location,
                                        status, note, asked_by, approved_by)
  values ('pedido', p_product, v_name, coalesce(p_size, ''), coalesce(p_color, ''), p_qty, p_from, v_to,
          case when v_mgr then 'aprobado' else 'pedido' end,
          left(coalesce(p_note, ''), 200), public.my_name(),
          case when v_mgr then public.my_name() else '' end)
  returning id into v_id;
  perform public.audit('Pidio traslado de ' || p_qty || ' ' || v_name);
  return v_id;
end $$;

-- La gerente aprueba un pedido.
create or replace function public.approve_transfer(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests;
begin
  if not public.is_manager() then raise exception 'Solo la gerente o el administrador aprueban traslados'; end if;
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status <> 'pedido' then raise exception 'Ese pedido ya no esta esperando aprobacion'; end if;
  update public.transfer_requests set status = 'aprobado', approved_by = public.my_name(), updated_at = now() where id = p_id;
end $$;

-- Enviar un pedido ya aprobado: sale del inventario de quien lo tiene.
create or replace function public.send_transfer(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests; v_have int;
begin
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status = 'pedido' then raise exception 'Ese pedido todavia no esta aprobado por la gerente'; end if;
  if r.status <> 'aprobado' then raise exception 'Ese pedido ya fue atendido'; end if;
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

-- Envio directo: la tienda manda mercancia sin que nadie la pida.
create or replace function public.push_transfer(p_product uuid, p_to uuid, p_qty int,
                                                p_size text default '', p_color text default '',
                                                p_note text default '', p_from uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_from uuid; v_name text; v_have int; v_id bigint;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  -- Se envia desde la sede propia; la gerente puede indicar otra.
  v_from := case when public.is_manager() then coalesce(p_from, public.my_location()) else public.my_location() end;
  if v_from is null then raise exception 'Tu usuario no tiene sede asignada'; end if;
  if p_to is null or p_to = v_from then raise exception 'Elige la tienda a la que la envias'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'Indica cuantas piezas envias'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  select coalesce(qty, 0) into v_have from public.product_stock
   where product_id = p_product and location_id = v_from and size = coalesce(p_size, '') and color = coalesce(p_color, '')
   for update;
  if coalesce(v_have, 0) < p_qty then
    raise exception 'Solo tienes % piezas de esa talla y color', coalesce(v_have, 0);
  end if;
  perform public.bump_stock(p_product, v_from, -p_qty, coalesce(p_size, ''), coalesce(p_color, ''));
  insert into public.transfer_requests (kind, product_id, product_name, size, color, qty, from_location, to_location,
                                        status, note, asked_by, sent_by)
  values ('envio', p_product, v_name, coalesce(p_size, ''), coalesce(p_color, ''), p_qty, v_from, p_to,
          'enviado', left(coalesce(p_note, ''), 200), public.my_name(), public.my_name())
  returning id into v_id;
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, to_location_id, size, color)
    values ('traslado', p_product, v_name, p_qty, 'Envio a otra tienda', public.my_name(), v_from, p_to,
            coalesce(p_size, ''), coalesce(p_color, ''));
  return v_id;
end $$;

-- Confirmar la llegada diciendo cuantas piezas llegaron.
create or replace function public.receive_transfer(p_id bigint, p_qty int default null) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests; v_llego int;
begin
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status <> 'enviado' then raise exception 'Ese traslado todavia no ha sido enviado'; end if;
  if not (public.is_manager() or public.my_location() = r.to_location) then
    raise exception 'Solo la tienda que lo recibe puede confirmar que llego';
  end if;
  v_llego := coalesce(p_qty, r.qty);
  if v_llego < 0 then raise exception 'La cantidad no puede ser negativa'; end if;
  if v_llego > r.qty then raise exception 'Llegaron mas de las enviadas (%): revisa el conteo', r.qty; end if;
  if v_llego > 0 then
    perform public.bump_stock(r.product_id, r.to_location, v_llego, r.size, r.color);
    insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, size, color)
      values ('in', r.product_id, r.product_name, v_llego, 'Llego de otra tienda', public.my_name(), r.to_location, r.size, r.color);
  end if;
  update public.transfer_requests
     set status = case when v_llego < r.qty then 'con_diferencia' else 'recibido' end,
         qty_received = v_llego, got_by = public.my_name(), updated_at = now()
   where id = p_id;
  if v_llego < r.qty then
    perform public.audit('Traslado con faltante: llegaron ' || v_llego || ' de ' || r.qty || ' ' || r.product_name);
  end if;
end $$;

-- La gerente revisa un traslado con faltante: lo da por perdido, o el
-- faltante aparecio en la tienda de origen y se le devuelve.
create or replace function public.review_transfer(p_id bigint, p_devolver boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests; v_falta int;
begin
  if not public.is_manager() then raise exception 'Solo la gerente o el administrador revisan faltantes'; end if;
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status <> 'con_diferencia' then raise exception 'Ese traslado no tiene diferencias por revisar'; end if;
  v_falta := r.qty - coalesce(r.qty_received, 0);
  if p_devolver and v_falta > 0 then
    perform public.bump_stock(r.product_id, r.from_location, v_falta, r.size, r.color);
    insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, size, color)
      values ('in', r.product_id, r.product_name, v_falta, 'Faltante de traslado devuelto', public.my_name(), r.from_location, r.size, r.color);
  end if;
  update public.transfer_requests
     set status = 'revisado', reviewed_by = public.my_name(), updated_at = now(),
         review_note = left(coalesce(p_note, '') || case when p_devolver then ' [faltante devuelto al origen]' else ' [faltante dado por perdido]' end, 300)
   where id = p_id;
  perform public.audit('Reviso faltante de traslado: ' || v_falta || ' ' || r.product_name
                       || case when p_devolver then ' devueltas al origen' else ' perdidas' end);
end $$;

-- Rechazar o cancelar: antes de que salga la mercancia.
create or replace function public.close_transfer(p_id bigint, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests;
begin
  if p_estado not in ('rechazado','cancelado') then raise exception 'Estado invalido'; end if;
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status not in ('pedido','aprobado') then raise exception 'Ese traslado ya salio; no se puede anular'; end if;
  if p_estado = 'rechazado' and not (public.is_manager() or public.my_location() = r.from_location) then
    raise exception 'Solo la gerente o la tienda que tiene la mercancia puede rechazarlo';
  end if;
  if p_estado = 'cancelado' and not (public.is_manager() or public.my_location() = r.to_location) then
    raise exception 'Solo la tienda que pidio puede cancelarlo';
  end if;
  update public.transfer_requests set status = p_estado, updated_at = now() where id = p_id;
end $$;

grant execute on function public.request_transfer(uuid, uuid, int, text, text, text, uuid) to authenticated;
grant execute on function public.approve_transfer(bigint) to authenticated;
grant execute on function public.send_transfer(bigint) to authenticated;
grant execute on function public.push_transfer(uuid, uuid, int, text, text, text, uuid) to authenticated;
grant execute on function public.receive_transfer(bigint, int) to authenticated;
grant execute on function public.review_transfer(bigint, boolean, text) to authenticated;
grant execute on function public.close_transfer(bigint, text) to authenticated;
