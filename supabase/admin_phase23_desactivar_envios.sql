-- ============================================================================
-- Fase 23 - Desactivar la sede "Envios Nacionales".
-- Los envios ahora se marcan en cada venta. La sede no se borra: su historial
-- (ventas, movimientos) se conserva, solo deja de salir en los selectores.
-- Muestra cuanto inventario le queda, para trasladarlo si hace falta.
-- ============================================================================
update public.locations set active = false
 where public.norm_name(name) like '%ENVIO%';

select l.name, l.active, coalesce(sum(s.qty), 0) as piezas_en_inventario
  from public.locations l left join public.product_stock s on s.location_id = l.id
 where public.norm_name(l.name) like '%ENVIO%'
 group by l.name, l.active;
