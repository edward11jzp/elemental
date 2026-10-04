-- ============================================================================
-- Limpieza del catálogo de facturación.
--
-- Los intentos anteriores dejaron dos clases de sobrantes:
--   · productos con el nombre viejo (MANGA LARGA, BODY, OVERSIZE ACANALADO…)
--   · copias del mismo producto, creadas cuando la comparación de acentos
--     fallaba y «CHEMISE (facturación)» no se reconocía a sí mismo.
--
-- De cada grupo se conserva el que tenga existencias (o el más antiguo) y se
-- borran los demás, siempre que no tengan existencias ni ventas.
-- Repetirlo es inocuo.
-- ============================================================================

create or replace function public.norm_name(t text) returns text
language sql immutable as $$
  select regexp_replace(upper(normalize(coalesce(t, ''), NFD)), '[^A-Z0-9]', '', 'g')
$$;

-- 1. Nombres viejos que el Excel escribe de otra forma.
with sobrantes as (
  select p.id
    from public.products p
   where not p.web
     and public.norm_name(p.name) in (public.norm_name('FRANELA MANGA LARGA'),
                                      public.norm_name('FRANELA MANGA LARGA DAMA'),
                                      public.norm_name('CHEMISE MANGA LARGA'),
                                      public.norm_name('BODY'),
                                      public.norm_name('CROP TOP HOLGADO'),
                                      public.norm_name('OVERSIZE ACANALADO'),
                                      public.norm_name('OVERSIZE ACID WASH'))
     and not exists (select 1 from public.product_stock s where s.product_id = p.id and s.qty > 0)
     and not exists (select 1 from public.sales v
                      where v.items @> jsonb_build_array(jsonb_build_object('id', p.id::text)))
)
delete from public.products p using sobrantes s where p.id = s.id;

-- 2. Copias del mismo producto: se queda la que tiene existencias.
with ranked as (
  select p.id, p.name,
         row_number() over (
           partition by public.norm_name(p.name)
           order by coalesce((select sum(s.qty) from public.product_stock s where s.product_id = p.id), 0) desc,
                    p.created_at asc, p.id asc) as puesto
    from public.products p
   where not p.web
),
copias as (
  select r.id from ranked r
   where r.puesto > 1
     and not exists (select 1 from public.product_stock s where s.product_id = r.id and s.qty > 0)
     and not exists (select 1 from public.sales v
                      where v.items @> jsonb_build_array(jsonb_build_object('id', r.id::text)))
)
delete from public.products p using copias c where p.id = c.id;

select count(*) || ' productos de facturación quedan' from public.products where not web;
