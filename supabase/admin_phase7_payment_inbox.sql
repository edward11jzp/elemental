-- ============================================================================
-- Fase 7 · Buzón de cobros: avisos de pago que entran desde fuera.
--
-- Hoy lo usa Zelle: un script dentro del Gmail de la tienda lee los avisos de
-- Chase y los deja aquí. Así no hace falta guardar ninguna contraseña del
-- correo en ningún lado.
--
-- Como la clave pública (anon) de Supabase la puede ver cualquiera, escribir
-- aquí exige además un código secreto que sólo conocen la tienda y el script:
-- vive en ingest_secret, que nadie puede leer, ni siquiera un administrador.
-- Antes de ejecutar, cambia PON_AQUI_TU_CODIGO por el código que generes.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================================

create table if not exists public.incoming_payments (
  provider   text not null,
  ref        text not null,
  at         timestamptz not null,
  amount     numeric(12,2) not null check (amount > 0),
  currency   text not null default 'USD',
  from_name  text not null default '',
  note       text not null default '',
  created_at timestamptz not null default now(),
  primary key (provider, ref)
);
alter table public.incoming_payments enable row level security;

drop policy if exists incoming_payments_read on public.incoming_payments;
create policy incoming_payments_read on public.incoming_payments for select
  using (public.can('Confirmación de pagos'));

-- Código secreto del buzón. Sin políticas: nadie lo lee desde fuera.
create table if not exists public.ingest_secret (
  id    int primary key default 1 check (id = 1),
  token text not null
);
alter table public.ingest_secret enable row level security;

insert into public.ingest_secret (id, token) values (1, 'PON_AQUI_TU_CODIGO')
  on conflict (id) do update set token = excluded.token;

-- Deja un cobro en el buzón. Repetir el mismo aviso no lo duplica.
create or replace function public.ingest_payment(
  p_token text, p_provider text, p_ref text, p_at timestamptz,
  p_amount numeric, p_currency text, p_from text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or p_token <> (select token from public.ingest_secret where id = 1) then
    raise exception 'Código incorrecto';
  end if;
  if p_provider is null or p_ref is null or coalesce(p_amount, 0) <= 0 then
    raise exception 'Aviso incompleto';
  end if;
  insert into public.incoming_payments (provider, ref, at, amount, currency, from_name, note)
  values (p_provider, p_ref, coalesce(p_at, now()), round(p_amount, 2), coalesce(nullif(p_currency, ''), 'USD'),
          left(coalesce(p_from, ''), 120), left(coalesce(p_note, ''), 200))
  on conflict (provider, ref) do nothing;
end $$;

revoke all on function public.ingest_payment(text, text, text, timestamptz, numeric, text, text, text) from public;
grant execute on function public.ingest_payment(text, text, text, timestamptz, numeric, text, text, text) to anon, authenticated;
