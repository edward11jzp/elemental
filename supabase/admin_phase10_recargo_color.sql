-- ============================================================================
-- Fase 10 · Recargo por color.
--
-- Los colores camuflajeados cuestan $1 más que los lisos, igual que las
-- tallas grandes cuestan más (2XL +$1, 3XL +$2, 4XL +$3, que ya estaba).
-- El punto de venta lo suma solo, y la base lo exige al validar el precio.
-- Idempotente.
-- ============================================================================

create or replace function public.color_upcharge(c text) returns numeric
language sql immutable as $$
  select case when upper(coalesce(c, '')) like 'CAMU%' then 1 else 0 end::numeric
$$;

-- La venta valida el precio con los dos recargos: talla y color.
create or replace function public.create_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  mgr       boolean := public.is_manager();
  v_doc     text := coalesce(p->>'doc', 'nota_entrega');
  v_prefix  text; v_seq int; v_id text;
  v_items   jsonb := '[]'::jsonb; it jsonb; prod record;
  v_free    boolean; v_qty int; v_price numeric; v_cost numeric; v_have int; v_extra numeric;
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
          where s.product_id = prod.id and s.location_id = v_loc
            and s.size = coalesce(it->>'size', '') and s.color = coalesce(it->>'color', '') for update;
        if coalesce(v_have, 0) < v_qty then
          raise exception 'En % sólo hay % de % % % (pides %)', coalesce(v_locname, 'tu sede'),
            coalesce(v_have, 0), prod.name, coalesce(it->>'size', ''), coalesce(it->>'color', ''), v_qty;
        end if;
      end if;
      v_extra := public.size_upcharge(it->>'size') + public.color_upcharge(it->>'color');
      if not mgr and abs(v_price - (prod.retail_price + v_extra)) > 0.005
                 and abs(v_price - (prod.wholesale_price + v_extra)) > 0.005 then
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
        perform public.bump_stock((it->>'id')::uuid, v_loc, -(it->>'qty')::int, coalesce(it->>'size', ''), coalesce(it->>'color', ''));
        insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, size, color)
          values ('out', (it->>'id')::uuid, it->>'name', (it->>'qty')::int, 'Venta ' || v_id, public.my_name(), v_loc,
                  coalesce(it->>'size', ''), coalesce(it->>'color', ''));
      end if;
    end loop;
    if v_cust is not null then
      update public.customers set orders_count = orders_count + 1, spent = spent + v_total where id = v_cust;
    end if;
  end if;
  return to_jsonb(v_row);
end $$;
