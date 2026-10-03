-- Fase 6 · Emoji de producto: miniatura para los productos que no tienen foto.
alter table public.products add column if not exists emoji text not null default '';
