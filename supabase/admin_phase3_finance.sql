-- =====================================================================
-- FASE 3 · Finanzas (saldos por cuenta) + Cambios de divisas realizados
-- Datos 100% de Elemental. Idempotente. Sólo administradores.
-- =====================================================================

-- Saldo de partida de cada cuenta: "al cierre de `since`, había `opening`".
create table if not exists public.finance_accounts (
  key      text primary key,
  opening  numeric(18,2) not null default 0,
  since    date not null default current_date,
  set_at   timestamptz not null default now()
);
alter table public.finance_accounts enable row level security;
drop policy if exists "finance_accounts admin" on public.finance_accounts;
create policy "finance_accounts admin" on public.finance_accounts for all using (public.is_admin()) with check (public.is_admin());

-- Movimientos: ingreso, egreso, transferencia, cambio de divisas y ajustes.
create table if not exists public.finance_moves (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('in','out','transfer','cambio','ajuste')),
  account     text not null,
  to_account  text,
  amount      numeric(18,2) not null,
  amount_to   numeric(18,2),
  rate        numeric(18,4),
  date        date not null default current_date,
  note        text not null default '',
  user_name   text,
  created_at  timestamptz not null default now(),
  constraint finance_moves_amount_ok check (type = 'ajuste' or amount >= 0)
);
create index if not exists finance_moves_created_idx on public.finance_moves (created_at desc);
alter table public.finance_moves enable row level security;
drop policy if exists "finance_moves admin" on public.finance_moves;
create policy "finance_moves admin" on public.finance_moves for all using (public.is_admin()) with check (public.is_admin());

-- Ajustar saldo: guarda el nuevo punto de partida y deja constancia en movimientos.
create or replace function public.adjust_finance_account(p_key text, p_balance numeric, p_since date, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  insert into public.finance_accounts (key, opening, since, set_at) values (p_key, p_balance, p_since, now())
    on conflict (key) do update set opening = excluded.opening, since = excluded.since, set_at = excluded.set_at;
  insert into public.finance_moves (type, account, amount, date, note, user_name)
    values ('ajuste', p_key, p_balance, p_since, coalesce(p_note, ''), public.my_name());
end $$;
grant execute on function public.adjust_finance_account(text, numeric, date, text) to authenticated;
