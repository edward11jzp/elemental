-- ============================================================================
-- Fase 18 - Traslados: la gerente interviene siempre, al inicio y al final.
--
--   PEDIDO : A pide            -> gerente aprueba -> B envia -> A confirma -> gerente cierra
--   ENVIO  : B prepara el envio -> gerente aprueba -> B envia -> A confirma -> gerente cierra
--
-- La mercancia sale de B solo cuando pulsa Enviar (ya aprobado) y entra a A
-- cuando confirma. Si quien prepara es gerente o admin, queda aprobado de una.
-- Al cerrar, si llegaron menos piezas, la gerente decide si el faltante se
-- da por perdido o vuelve a la tienda de origen.
-- Idempotente.
-- ============================================================================

-- Preparar un envio: ya no saca la mercancia; espera aprobacion.
create or replace function public.push_transfer(p_product uuid, p_to uuid, p_qty int,
                                                p_size text default '', p_color text default '',
                                                p_note text default '', p_from uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_from uuid; v_name text; v_have int; v_id bigint; v_mgr boolean := public.is_manager();
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  v_from := case when v_mgr then coalesce(p_from, public.my_location()) else public.my_location() end;
  if v_from is null then raise exception 'Tu usuario no tiene sede asignada'; end if;
  if p_to is null or p_to = v_from then raise exception 'Elige la tienda a la que la envias'; end if;
  if coalesce(p_qty, 0) <= 0 then raise exception 'Indica cuantas piezas envias'; end if;
  select name into v_name from public.products where id = p_product;
  if v_name is null then raise exception 'Producto no encontrado'; end if;
  -- No se puede proponer enviar lo que no se tiene.
  select coalesce(qty, 0) into v_have from public.product_stock
   where product_id = p_product and location_id = v_from and size = coalesce(p_size, '') and color = coalesce(p_color, '');
  if coalesce(v_have, 0) < p_qty then
    raise exception 'Solo tienes % piezas de esa talla y color', coalesce(v_have, 0);
  end if;
  insert into public.transfer_requests (kind, product_id, product_name, size, color, qty, from_location, to_location,
                                        status, note, asked_by, approved_by)
  values ('envio', p_product, v_name, coalesce(p_size, ''), coalesce(p_color, ''), p_qty, v_from, p_to,
          case when v_mgr then 'aprobado' else 'pedido' end,
          left(coalesce(p_note, ''), 200), public.my_name(),
          case when v_mgr then public.my_name() else '' end)
  returning id into v_id;
  perform public.audit('Preparo envio de ' || p_qty || ' ' || v_name || ' a otra tienda');
  return v_id;
end $$;
grant execute on function public.push_transfer(uuid, uuid, int, text, text, text, uuid) to authenticated;

-- Cerrar: la gerente revisa todo traslado que llego, completo o no.
create or replace function public.review_transfer(p_id bigint, p_devolver boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r public.transfer_requests; v_falta int;
begin
  if not public.is_manager() then raise exception 'Solo la gerente o el administrador cierran traslados'; end if;
  select * into r from public.transfer_requests where id = p_id for update;
  if not found then raise exception 'Ese traslado ya no existe'; end if;
  if r.status not in ('recibido', 'con_diferencia') then raise exception 'Ese traslado no esta esperando cierre'; end if;
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
