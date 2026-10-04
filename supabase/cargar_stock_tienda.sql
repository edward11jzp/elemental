-- ============================================================================
-- Existencias de la vitrina (tienda en linea) en una sede.
--
-- Los productos de la tienda tienen un total global que viene de antes de
-- separar por sede. Esto lo coloca en Envios Nacionales, que es de donde
-- salen los pedidos de la web, como una linea sin talla ni color.
--
-- Despues se reparte con traslados, o se detalla por talla y color desde
-- Inventario. Repetirlo deja la misma cantidad, no la suma.
--
-- OJO: si estas prendas son las mismas que ya cargamos en el catalogo de
-- facturacion, la mercancia quedaria contada dos veces.
-- ============================================================================

insert into public.product_stock (product_id, location_id, size, color, qty)
select p.id, l.id, '', '', greatest(0, coalesce(p.stock, 0))
  from public.products p
 cross join lateral (select id from public.locations
                      where public.norm_name(name) = public.norm_name('ELEMENTAL - Envios Nacionales')
                      limit 1) l
 where p.web
   and coalesce(p.stock, 0) > 0
on conflict (product_id, location_id, size, color) do update set qty = excluded.qty, updated_at = now();

select count(*) || ' productos de la tienda con existencias en Envios Nacionales'
  from public.product_stock s join public.products p on p.id = s.product_id where p.web;
