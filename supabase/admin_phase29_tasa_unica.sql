-- ============================================================================
-- Fase 29 - Una sola tasa para facturacion y pagina web.
--
-- La tasa se fija en Ventas (admin_settings 'rates'). Cada vez que cambia, se
-- copia a site_settings.exchange_rate, que es la que ve el cliente en la web.
-- Idempotente.
-- ============================================================================

alter table public.site_settings add column if not exists exchange_rate numeric;

create or replace function public.sync_web_rate() returns trigger
language plpgsql security definer set search_path = public as $$
declare r numeric;
begin
  if new.key = 'rates' then
    r := nullif(new.value->>'exchangeRate', '')::numeric;
    update public.site_settings set exchange_rate = case when r > 0 then r else null end where id = 1;
  end if;
  return new;
end $$;

drop trigger if exists admin_settings_sync_web_rate on public.admin_settings;
create trigger admin_settings_sync_web_rate after insert or update on public.admin_settings
  for each row execute function public.sync_web_rate();

-- Igualar desde ya.
update public.site_settings s
   set exchange_rate = case when (a.value->>'exchangeRate')::numeric > 0 then (a.value->>'exchangeRate')::numeric else null end
  from public.admin_settings a
 where a.key = 'rates' and s.id = 1;

select exchange_rate as tasa_web from public.site_settings where id = 1;
