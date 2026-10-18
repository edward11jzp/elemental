-- ============================================================================
-- Fase 19 - Traslados: la gerente solo interviene al final.
--
--   PEDIDO : A pide    -> B envia -> A confirma cuantas llegaron -> gerente cierra
--   ENVIO  : B envia   ->            A confirma cuantas llegaron -> gerente cierra
--
-- Ya no hace falta aprobar antes de que salga la mercancia. Al cerrar, si
-- llegaron menos piezas, la gerente decide si se dan por perdidas o vuelven a
-- la tienda de origen.
-- Idempotente.
-- ============================================================================

-- Lo que estaba esperando aprobacion pasa directo a "por enviar".
update public.transfer_requests set status = 'aprobado', updated_at = now() where status = 'pedido';

-- Pedir: queda listo para que la otra tienda lo envie.
create or replace function public.request_transfer(p_product uuid, p_from uuid, p_qty int,
                                                   p_size text default '', p_color text default '',
                                                   p_note text default '', p_to uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_to uuid := case when public.is_manager() then coalesce(p_to, public.my_location()) else public.my_location() end;
        v_name text; v_id bigint;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if v_to is null then raise exception 'Tu usuario no tiene sede asignada'; end if;
  if p_from is null or p_from = v_to then raise exception 'Elige la tienda que tiene la mercancia'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'Indica cuantas piezas necesitas'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  insert into public.transfer_requests (kind, product_id, product_name, size, color, qty, from_location, to_location,
                                        status, note, asked_by)
  values ('pedido', p_product, v_name, coalesce(p_size, ''), coalesce(p_color, ''), p_qty, p_from, v_to,
          'aprobado', left(coalesce(p_note, ''), 200), public.my_name())
  returning id into v_id;
  perform public.audit('Pidio traslado de ' || p_qty || ' ' || v_name);
  return v_id;
end $$;
grant execute on function public.request_transfer(uuid, uuid, int, text, text, text, uuid) to authenticated;

-- Enviar sin pedido: sale de una vez de la tienda que envia.
create or replace function public.push_transfer(p_product uuid, p_to uuid, p_qty int,
                                                p_size text default '', p_color text default '',
                                                p_note text default '', p_from uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_from uuid; v_name text; v_have int; v_id bigint;
        s text := coalesce(p_size, ''); c text := coalesce(p_color, '');
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  v_from := case when public.is_manager() then coalesce(p_from, public.my_location()) else public.my_location() end;
  if v_from is null then raise exception 'Tu usuario no tiene sede asignada'; end if;
  if p_to is null or p_to = v_from then raise exception 'Elige la tienda a la que la envias'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'Indica cuantas piezas envias'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  select coalesce(qty, 0) into v_have from public.product_stock
   where product_id = p_product and location_id = v_from and size = s and color = c for update;
  if coalesce(v_have, 0) < p_qty then
    raise exception 'Solo tienes % piezas de esa talla y color', coalesce(v_have, 0);
  end if;
  perform public.bump_stock(p_product, v_from, -p_qty, s, c);
  insert into public.transfer_requests (kind, product_id, product_name, size, color, qty, from_location, to_location,
                                        status, note, asked_by, sent_by)
  values ('envio', p_product, v_name, s, c, p_qty, v_from, p_to,
          'enviado', left(coalesce(p_note, ''), 200), public.my_name(), public.my_name())
  returning id into v_id;
  insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, to_location_id, size, color)
    values ('traslado', p_product, v_name, p_qty, 'Envio a otra tienda', public.my_name(), v_from, p_to, s, c);
  return v_id;
end $$;
grant execute on function public.push_transfer(uuid, uuid, int, text, text, text, uuid) to authenticated;

-- Aprobar al final: la gerente revisa todo traslado que llego, completo o no.
-- (Va aqui tambien para que este archivo baste solo, se haya corrido o no la fase 18.)
create or replace function public.review_transfer(p_id bigint, p_devolver boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests; v_falta int;
begin
  if not public.is_manager() then raise exception 'Solo la gerente o el administrador aprueban traslados'; end if;
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status not in ('recibido', 'con_diferencia') then raise exception 'Ese traslado no esta esperando aprobacion'; end if;
  v_falta := r.qty - coalesce(r.qty_received, r.qty);
  if p_devolver and v_falta > 0 then
    perform public.bump_stock(r.product_id, r.from_location, v_falta, r.size, r.color);
    insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, size, color)
      values ('in', r.product_id, r.product_name, v_falta, 'Faltante de traslado devuelto', public.my_name(), r.from_location, r.size, r.color);
  end if;
  update public.transfer_requests
     set status = 'revisado', reviewed_by = public.my_name(), updated_at = now(),
         review_note = left(coalesce(p_note, '') ||
                            case when v_falta <= 0 then ''
                                 when p_devolver then ' [faltante devuelto al origen]'
                                 else ' [faltante dado por perdido]' end, 300)
   where id = p_id;
  if v_falta > 0 then
    perform public.audit('Cerro traslado con faltante: ' || v_falta || ' ' || r.product_name
                         || case when p_devolver then ' devueltas al origen' else ' perdidas' end);
  end if;
end $$;
grant execute on function public.review_transfer(bigint, boolean, text) to authenticated;
