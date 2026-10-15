-- ============================================================================
-- Fase 14 - Ver que hay en las otras tiendas.
--
-- Cualquiera del personal puede CONSULTAR las existencias de todas las sedes,
-- para decirle al cliente "eso lo hay en Sambil". Lo demas no cambia:
--   - Vende y descuenta solo de su sede (create_sale).
--   - Solo mueve o traslada mercancia quien tenga el permiso de Inventario.
--   - Las ventas de otras sedes siguen sin verse (list_sales).
-- Idempotente.
-- ============================================================================

drop policy if exists product_stock_read on public.product_stock;
create policy product_stock_read on public.product_stock for select
  using (public.is_staff());
