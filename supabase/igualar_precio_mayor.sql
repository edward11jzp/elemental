-- ============================================================================
-- Igualar el precio al mayor de "solo facturacion" con el de la tienda en linea
-- (los que corrigio la gerente). Empareja por nombre, sin acentos y sin el
-- sufijo "(facturacion)".
-- Guarda antes una copia de los precios viejos en precios_mayor_respaldo, por
-- si hay que deshacer:
--   update public.products p set wholesale_price = r.wholesale_price
--     from public.precios_mayor_respaldo r where r.id = p.id;
-- ============================================================================

create table if not exists public.precios_mayor_respaldo as
  select id, name, wholesale_price, now() as saved_at from public.products where web = false;
alter table public.precios_mayor_respaldo enable row level security;

with pares as (
  select distinct on (f.id) f.id, w.wholesale_price as nuevo
    from public.products f
    join public.products w
      on w.web is distinct from false
     and (public.norm_name(w.name) = public.norm_name(f.name)
          or public.norm_name(w.name) || 'FACTURACION' = public.norm_name(f.name))
   where f.web = false
   order by f.id, w.updated_at desc nulls last
)
update public.products p set wholesale_price = pares.nuevo
  from pares
 where p.id = pares.id and p.wholesale_price is distinct from pares.nuevo;

-- Resultado: cada producto de facturacion y si quedo igual a la tienda.
select f.name as facturacion, f.wholesale_price as mayor_ahora, w.wholesale_price as mayor_tienda,
       case when w.id is null then 'SIN PAREJA EN LA TIENDA: revisar a mano'
            when f.wholesale_price = w.wholesale_price then 'ok' else 'distinto' end as estado
  from public.products f
  left join public.products w
    on w.web is distinct from false
   and (public.norm_name(w.name) = public.norm_name(f.name)
        or public.norm_name(w.name) || 'FACTURACION' = public.norm_name(f.name))
 where f.web = false
 order by (w.id is null) desc, f.name;
