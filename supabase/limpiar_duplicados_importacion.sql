-- ============================================================================
-- Limpieza del catalogo de facturacion.
--
-- Una pegada anterior en el editor de Supabase malinterpreto los acentos y
-- creo productos gemelos con el nombre corrupto, junto a los buenos.
--
-- Este archivo no escribe ningun caracter acentuado: el propio editor los
-- corrompia tambien al pegarlos, y por eso los intentos anteriores no
-- encontraban nada. Los caracteres se nombran por su numero.
--
-- Un nombre bueno solo puede llevar, fuera del alfabeto ingles, estas letras:
--   N con virgulilla y las vocales con tilde o dieresis.
-- Cualquier otro signo raro delata un nombre corrupto.
--
-- No se borra nada que ya se haya vendido. Las existencias de los borrados se
-- descartan porque se vuelven a cargar con el archivo de existencias.
-- Repetirlo es inocuo.
-- ============================================================================

begin;

create temporary table _borrar on commit drop as
select p.id, p.name
  from public.products p
 where not p.web
   and (
     exists (
       select 1
         from regexp_split_to_table(p.name, '') as letra
        where ascii(letra) > 127
          and ascii(letra) not in (209, 241,   -- N con virgulilla
                                   193, 225,   -- A con tilde
                                   201, 233,   -- E con tilde
                                   205, 237,   -- I con tilde
                                   211, 243,   -- O con tilde
                                   218, 250,   -- U con tilde
                                   220, 252)   -- U con dieresis
     )
     or upper(p.name) in ('FRANELA MANGA LARGA', 'FRANELA MANGA LARGA DAMA',
                          'CHEMISE MANGA LARGA', 'BODY', 'CROP TOP HOLGADO',
                          'OVERSIZE ACANALADO', 'OVERSIZE ACID WASH')
   );

delete from _borrar b
 where exists (select 1 from public.sales v
                where v.items @> jsonb_build_array(jsonb_build_object('id', b.id::text)));

delete from public.product_stock s using _borrar b where s.product_id = b.id;
delete from public.products      p using _borrar b where p.id = b.id;

select (select count(*) from _borrar) || ' sobrantes borrados' as borrados;

commit;

select count(*) || ' productos de facturacion quedan' as estado
  from public.products where not web;
