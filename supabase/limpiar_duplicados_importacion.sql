-- ============================================================================
-- Limpieza del catálogo de facturación (segunda versión).
--
-- Los intentos anteriores dejaron sobrantes, y las cargas parciales les
-- pusieron existencias, así que la limpieza anterior no los tocaba.
--
-- Ahora: de cada producto repetido se conserva uno, se descartan las
-- existencias de las copias (se vuelven a cargar correctas con el archivo de
-- existencias) y se borran las copias. Nunca se borra un producto que tenga
-- ventas registradas. Repetirlo es inocuo.
-- ============================================================================

create or replace function public.norm_name(t text) returns text
language sql immutable as $$
  select regexp_replace(upper(normalize(coalesce(t, ''), NFD)), '[^A-Z0-9]', '', 'g')
$$;

begin;

create temporary table _borrar on commit drop as
with viejos as (
  -- Nombres que el Excel escribe de otra forma: ya no se usan.
  select p.id, p.name
    from public.products p
   where not p.web
     and public.norm_name(p.name) in (public.norm_name('FRANELA MANGA LARGA'),
                                      public.norm_name('FRANELA MANGA LARGA DAMA'),
                                      public.norm_name('CHEMISE MANGA LARGA'),
                                      public.norm_name('BODY'),
                                      public.norm_name('CROP TOP HOLGADO'),
                                      public.norm_name('OVERSIZE ACANALADO'),
                                      public.norm_name('OVERSIZE ACID WASH'))
),
ranked as (
  select p.id, p.name,
         row_number() over (
           partition by public.norm_name(p.name)
           order by coalesce((select sum(s.qty) from public.product_stock s where s.product_id = p.id), 0) desc,
                    p.created_at asc, p.id asc) as puesto
    from public.products p
   where not p.web and p.id not in (select id from viejos)
)
select id, name from viejos
union
select id, name from ranked where puesto > 1;

-- Nunca se borra algo que ya se vendió.
delete from _borrar b
 where exists (select 1 from public.sales v
                where v.items @> jsonb_build_array(jsonb_build_object('id', b.id::text)));

delete from public.product_stock s using _borrar b where s.product_id = b.id;
delete from public.products     p using _borrar b where p.id = b.id;

select (select count(*) from _borrar) || ' sobrantes borrados' as borrados;

commit;

select count(*) || ' productos de facturación quedan' from public.products where not web;
