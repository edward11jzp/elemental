-- ============================================================================
-- Limpieza del catálogo de facturación.
--
-- Una de las pegadas anteriores en el editor de Supabase malinterpretó los
-- acentos y creó productos gemelos con el nombre corrupto:
--   «BODY NI√ëO» junto a «BODY NIÑO», «CHEMISE (facturaci√≥n)» junto al bueno.
-- Se reconocen porque llevan el carácter √, que no aparece en ningún nombre
-- legítimo.
--
-- Se borran esos gemelos y, si quedara alguno, los nombres viejos que el
-- Excel escribe de otra forma. Nunca se borra algo que ya se vendió.
-- Sus existencias se descartan porque se vuelven a cargar con el archivo de
-- existencias. Repetirlo es inocuo.
-- ============================================================================

begin;

create temporary table _borrar on commit drop as
select p.id, p.name
  from public.products p
 where not p.web
   and (p.name like '%√%'                                  -- nombre corrupto
        or upper(p.name) in ('FRANELA MANGA LARGA', 'FRANELA MANGA LARGA DAMA',
                             'CHEMISE MANGA LARGA', 'BODY', 'CROP TOP HOLGADO',
                             'OVERSIZE ACANALADO', 'OVERSIZE ACID WASH'));

delete from _borrar b
 where exists (select 1 from public.sales v
                where v.items @> jsonb_build_array(jsonb_build_object('id', b.id::text)));

delete from public.product_stock s using _borrar b where s.product_id = b.id;
delete from public.products      p using _borrar b where p.id = b.id;

select (select count(*) from _borrar) || ' sobrantes borrados' as borrados;

commit;

select count(*) || ' productos de facturación quedan · ' ||
       coalesce((select count(*)::text || ' con nombre corrupto todavía'
                   from public.products where not web and name like '%√%'), '0') as estado
  from public.products where not web;
