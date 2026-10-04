-- ============================================================================
-- Fase 11 - Cada quien ve solo su sede.
--
-- Un administrador o gerente sigue viendo todas y puede cambiar de sede con
-- el selector. El resto del personal ve unicamente las ventas y las
-- existencias de la sede que tiene asignada.
--
-- Quien tenga el permiso de Inventario sigue viendo todas las sedes, porque
-- necesita repartir y trasladar mercancia.
-- Idempotente.
-- ============================================================================

-- Las ventas: list_sales deja fuera las de otras sedes.
drop policy if exists product_stock_read on public.product_stock;
create policy product_stock_read on public.product_stock for select
  using (
    public.is_staff()
    and (public.is_manager()
         or public.can('Inventario')
         or location_id is not distinct from public.my_location())
  );
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
       and (public.is_manager() or s.location_id is not distinct from public.my_location())
       and (min_day is null or public.ve_day(s.date) >= min_day or (s.pay_method = 'credito' and s.pay in ('pendiente','parcial')))
     order by s.date desc;
end $$;
