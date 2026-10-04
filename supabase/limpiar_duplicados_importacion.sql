-- ============================================================================
-- Limpieza: productos del primer intento de importación que el Excel nombra
-- de otra forma (MANGA LARGA → MANGA LRG, BODY → BODY NIÑO, OVERSIZE
-- ACANALADO y ACID WASH → colores de OVERSIZE, CROP TOP HOLGADO → CROP TOP).
--
-- Sólo borra productos de facturación que no tengan existencias ni ventas.
-- Lo que no cumpla queda en pie y se avisa.
-- ============================================================================

with sobrantes as (
  select p.id, p.name
    from public.products p
   where not p.web
     and upper(p.name) in ('FRANELA MANGA LARGA', 'FRANELA MANGA LARGA DAMA', 'CHEMISE MANGA LARGA',
                           'BODY', 'CROP TOP HOLGADO', 'OVERSIZE ACANALADO', 'OVERSIZE ACID WASH')
     and not exists (select 1 from public.product_stock s where s.product_id = p.id and s.qty > 0)
     and not exists (select 1 from public.sales v
                      where v.items @> jsonb_build_array(jsonb_build_object('id', p.id::text)))
)
delete from public.products p using sobrantes s where p.id = s.id;

select count(*) || ' productos de facturación quedan' from public.products where not web;
