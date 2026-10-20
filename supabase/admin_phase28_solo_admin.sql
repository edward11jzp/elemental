-- ============================================================================
-- Fase 28 - Estampados y linea libre solo para el administrador.
--
-- * La lista de estampados (admin_settings 'prints') solo la edita el admin.
--   El gerente sigue pudiendo cambiar la tasa ('rates').
-- * Una linea libre solo la cobra el admin (salvo que venga en un presupuesto).
-- * Un estampado fuera de la lista o con otro precio, solo el admin.
-- Idempotente.
-- ============================================================================

drop policy if exists "admin_settings write" on public.admin_settings;
create policy "admin_settings write" on public.admin_settings for all
  using (public.is_admin() or (key = 'rates' and public.is_manager()))
  with check (public.is_admin() or (key = 'rates' and public.is_manager()));

create or replace function public.create_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  mgr       boolean := public.is_manager();
  v_doc     text := coalesce(p->>'doc', 'nota_entrega');
  v_prefix  text; v_seq int; v_id text;
  v_items   jsonb := '[]'::jsonb; it jsonb; prod record;
  v_free    boolean; v_qty int; v_price numeric; v_cost numeric; v_have int; v_extra numeric; v_entrega int;
  v_prints  jsonb; v_print numeric;
  v_catalog jsonb := coalesce((select value from public.admin_settings where key = 'prints'), '[]'::jsonb);
  v_encargo boolean := coalesce((p->>'encargo')::boolean, false);
  v_quote   text := nullif(p->>'fromQuote', '');
  v_qitems  jsonb := '[]'::jsonb;
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
  v_split   jsonb := coalesce(p->'paySplit', '[]'::jsonb);
  v_splsum  numeric;
  e_is      boolean := false;
  e_name    text;
  e_limit   numeric := 0;
  v_row     public.sales;
  v_loc     uuid;
  v_locname text;
begin
  if not public.can('Ventas') then raise exception 'forbidden'; end if;
  if v_encargo and v_doc = 'cotizacion' then raise exception 'Una cotizacion no puede ser un encargo'; end if;
  -- Venta que sale de un presupuesto: se respetan los precios presupuestados.
  if v_quote is not null then
    if v_doc = 'cotizacion' then raise exception 'Un presupuesto no se convierte en otro presupuesto'; end if;
    select items into v_qitems from public.sales
     where id = v_quote and doc = 'cotizacion' and converted_to is null and pay <> 'cancelado' for update;
    if not found then raise exception 'Ese presupuesto ya se facturo o fue anulado'; end if;
  end if;
  -- La venta pertenece a la sede de quien la hace; un gerente puede indicar otra.
  v_loc := case when mgr then coalesce(nullif(p->>'locationId', '')::uuid, public.my_location()) else public.my_location() end;
  if v_loc is null and v_doc <> 'cotizacion' then
    raise exception 'Tu usuario no tiene sede asignada. Pidele a un administrador que te la asigne en Usuarios y permisos.';
  end if;
  select l.name into v_locname from public.locations l where l.id = v_loc;
  v_prefix := case v_doc when 'nota_entrega' then 'NE' when 'factura' then 'FAC' when 'recibo' then 'REC'
                         when 'cotizacion' then 'COT' when 'orden' then 'ORD' end;
  if v_prefix is null then raise exception 'Tipo de documento invalido'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'La venta no tiene productos'; end if;

  if mgr and nullif(p->>'date', '') is not null then
    if (p->>'date')::date > public.ve_day(now()) then raise exception 'No se puede usar una fecha futura'; end if;
    v_date := case when (p->>'date')::date = public.ve_day(now()) then now()
                   else ((p->>'date') || ' 12:00')::timestamp at time zone 'America/Caracas' end;
  else
    if nullif(p->>'date', '') is not null and (p->>'date')::date <> public.ve_day(now()) then
      raise exception 'Solo un administrador o gerente puede registrar ventas de dias anteriores';
    end if;
    v_date := now();
  end if;
  if not mgr and v_disc > 0 then raise exception 'Solo un administrador o gerente puede aplicar descuentos'; end if;

  -- Venta al personal: solo admin/gerente; a credito queda pendiente y se paga con abonos.
  if v_cust is not null then
    select c.is_employee, c.name, c.credit_limit into e_is, e_name, e_limit from public.customers c where c.id = v_cust;
    e_is := coalesce(e_is, false);
  end if;
  if v_credit then
    if v_doc = 'cotizacion' then raise exception 'Una cotizacion no puede ser a credito'; end if;
    if not e_is then raise exception 'La venta a credito es solo para el personal'; end if;
    if not mgr then raise exception 'Las ventas al personal solo las puede facturar un administrador o gerente'; end if;
    v_pay := 'pendiente'; v_method := 'credito'; v_paycur := null;
  elsif e_is and v_doc <> 'cotizacion' and not mgr then
    raise exception 'Las ventas al personal solo las puede facturar un administrador o gerente';
  end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_free  := coalesce((it->>'free')::boolean, false) or nullif(it->>'id', '') is null;
    v_qty   := greatest(1, coalesce((it->>'qty')::int, 1));
    v_price := round(coalesce((it->>'price')::numeric, 0), 2);
    if v_price < 0 then raise exception 'Precio invalido'; end if;
    if v_free then
      if coalesce(trim(it->>'name'), '') = '' then raise exception 'Una linea libre necesita descripcion'; end if;
      -- Linea libre: solo el administrador (o si ya venia asi en el presupuesto que se factura).
      if coalesce(public.my_role(), '') <> 'admin' and not exists (
        select 1 from jsonb_array_elements(v_qitems) q
         where coalesce((q->>'free')::boolean, false) and q->>'name' = it->>'name'
           and abs((q->>'price')::numeric - v_price) <= 0.005) then
        raise exception 'Solo el administrador puede cobrar una linea libre';
      end if;
      v_cost := case when public.can('Ganancias y costos') then greatest(0, coalesce((it->>'cost')::numeric, 0)) else 0 end;
      v_items := v_items || jsonb_build_object('id', null, 'free', true, 'name', it->>'name', 'qty', v_qty, 'price', v_price, 'cost', v_cost);
    else
      select p2.id, p2.name, p2.stock, p2.retail_price, p2.wholesale_price into prod
        from public.products p2 where p2.id = (it->>'id')::uuid for update;
      if not found then raise exception 'Producto no encontrado: %', it->>'name'; end if;
      -- Por encargo solo sale hoy lo que se entrega hoy; el resto queda pendiente.
      v_entrega := case when v_encargo
                        then least(v_qty, greatest(0, coalesce((it->>'deliverNow')::int, 0)))
                        else v_qty end;
      if v_doc <> 'cotizacion' and v_entrega > 0 then
        select coalesce(s.qty, 0) into v_have from public.product_stock s
          where s.product_id = prod.id and s.location_id = v_loc
            and s.size = coalesce(it->>'size', '') and s.color = coalesce(it->>'color', '') for update;
        -- Se permite vender sin existencias: el inventario queda en negativo.
      end if;
      v_extra := public.size_upcharge(it->>'size') + public.color_upcharge(it->>'color');
      -- Estampados de la linea: su precio va sumado al de la prenda. Fuera de la
      -- lista (o con otro precio) solo lo puede poner un administrador o gerente.
      v_prints := case when jsonb_typeof(it->'prints') = 'array' then it->'prints' else '[]'::jsonb end;
      select coalesce(sum((x->>'price')::numeric), 0) into v_print from jsonb_array_elements(v_prints) x;
      if coalesce(public.my_role(), '') <> 'admin' and exists (
        select 1 from jsonb_array_elements(v_prints) x
         where not exists (select 1 from jsonb_array_elements(v_catalog) c
                            where c->>'name' = x->>'name' and abs((c->>'price')::numeric - (x->>'price')::numeric) <= 0.005)) then
        raise exception 'Ese estampado no esta en la lista de precios';
      end if;
      if not mgr and abs(v_price - (prod.retail_price + v_extra + v_print)) > 0.005
                 and abs(v_price - (prod.wholesale_price + v_extra + v_print)) > 0.005
                 and not exists (select 1 from jsonb_array_elements(v_qitems) q
                                  where q->>'id' = prod.id::text and abs((q->>'price')::numeric - v_price) <= 0.005) then
        raise exception 'El precio de "%" no coincide con la lista', prod.name;
      end if;
      select coalesce(c.cost, 0) into v_cost from public.product_costs c where c.product_id = prod.id;
      v_items := v_items || jsonb_build_object('id', prod.id, 'name', prod.name, 'size', it->>'size', 'color', it->>'color',
                                               'qty', v_qty, 'delivered', v_entrega, 'price', v_price, 'cost', coalesce(v_cost, 0),
                                               'prints', v_prints);
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

  -- Metodo de pago obligatorio; si son varios, queda como "mixto" con su detalle.
  if v_doc <> 'cotizacion' and v_method is distinct from 'credito' and v_pay in ('pagado', 'parcial') then
    if jsonb_typeof(v_split) <> 'array' then raise exception 'Pago mixto invalido'; end if;
    if jsonb_array_length(v_split) > 0 then
      if exists (select 1 from jsonb_array_elements(v_split) x
                  where coalesce(x->>'method', '') = '' or coalesce((x->>'amount')::numeric, 0) <= 0) then
        raise exception 'Cada parte del pago necesita metodo y monto';
      end if;
      select sum((x->>'amount')::numeric) into v_splsum from jsonb_array_elements(v_split) x;
      if v_splsum > v_total + 0.01 then raise exception 'Los pagos suman % y la venta es de %', round(v_splsum, 2), v_total; end if;
      if v_pay = 'pagado' and v_splsum < v_total - 0.01 then
        raise exception 'Faltan % por cobrar (los pagos suman %)', round(v_total - v_splsum, 2), round(v_splsum, 2);
      end if;
      v_method := case when jsonb_array_length(v_split) > 1 then 'mixto' else v_split->0->>'method' end;
      v_paycur := case when jsonb_array_length(v_split) > 1 then null else v_split->0->>'currency' end;
    end if;
    if v_method is null then raise exception 'Elige el metodo de pago'; end if;
  else
    v_split := '[]'::jsonb;
  end if;

  insert into public.sales (id, doc, date, user_id, user_name, customer_id, customer, email, items, subtotal, discount,
                            tax_rate, tax, total, pay, pay_method, pay_currency, doc_currency, notes,
                            exchange_rate, total_bs, real_factor, total_real, location_id, location_name, is_order, is_shipping, pay_split)
  values (v_id, v_doc, v_date, auth.uid(), public.my_name(), v_cust, coalesce(p->>'customer', ''), coalesce(p->>'email', ''),
          v_items, round(v_sub, 2), v_disc, v_taxr, v_tax, v_total, v_pay, v_method, v_paycur,
          case when p->>'docCurrency' = 'BS' then 'BS' else 'USD' end, coalesce(p->>'notes', ''),
          v_rate, case when v_rate > 0 then round(v_total * v_rate, 2) else 0 end,
          v_factor, case when v_factor > 0 then round(v_total * v_factor, 2) else 0 end,
          v_loc, coalesce(v_locname, ''), v_encargo, coalesce((p->>'shipping')::boolean, false), v_split)
  returning * into v_row;

  if v_doc <> 'cotizacion' then
    for it in select * from jsonb_array_elements(v_items) loop
      if (it->>'id') is not null then
        if coalesce((it->>'delivered')::int, (it->>'qty')::int) > 0 then
          perform public.bump_stock_neg((it->>'id')::uuid, v_loc, -coalesce((it->>'delivered')::int, (it->>'qty')::int),
                                    coalesce(it->>'size', ''), coalesce(it->>'color', ''));
          insert into public.inventory_movements (type, product_id, product_name, qty, reason, user_name, location_id, size, color)
            values ('out', (it->>'id')::uuid, it->>'name', coalesce((it->>'delivered')::int, (it->>'qty')::int),
                    'Venta ' || v_id, public.my_name(), v_loc, coalesce(it->>'size', ''), coalesce(it->>'color', ''));
        end if;
        -- Lo que no se entrego queda debiendose al cliente.
        if (it->>'qty')::int > coalesce((it->>'delivered')::int, (it->>'qty')::int) then
          insert into public.sale_pending (sale_id, product_id, product_name, size, color, qty_ordered, location_id)
          values (v_id, (it->>'id')::uuid, it->>'name', coalesce(it->>'size', ''), coalesce(it->>'color', ''),
                  (it->>'qty')::int - coalesce((it->>'delivered')::int, (it->>'qty')::int), v_loc);
        end if;
      end if;
    end loop;
    if v_cust is not null then
      update public.customers set orders_count = orders_count + 1, spent = spent + v_total where id = v_cust;
    end if;
  end if;
  if v_quote is not null then
    update public.sales set converted_to = v_id where id = v_quote;
  end if;
  return to_jsonb(v_row);
end $$;
