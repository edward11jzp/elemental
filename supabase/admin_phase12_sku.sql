-- ============================================================================
-- Fase 12 - Codigo de producto (SKU).
--
-- sku       : el codigo base, como en el sistema anterior (CHD, FD, JN...).
-- sku_sizes : el codigo exacto de cada talla, {"L": "CHDL", "M": "CHDM"}.
--
-- Sirven para buscar e identificar el producto igual que antes.
-- Idempotente.
-- ============================================================================

alter table public.products add column if not exists sku       text  not null default '';
alter table public.products add column if not exists sku_sizes jsonb not null default '{}'::jsonb;
create index if not exists products_sku_idx on public.products (upper(sku));
