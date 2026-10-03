-- ============================================================================
-- Fase 5 · Auto-revisión: lo que un gerente hace sobre sí mismo queda
-- «por aprobar» hasta que un administrador lo confirme.
--
-- Se marca (pero NO se bloquea): venderse a sí mismo, anular una venta propia,
-- abonar a su propio crédito y registrar su propio pago de nómina.
-- Un administrador no se marca a sí mismo: él es quien aprueba.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================================

create table if not exists public.self_reviews (
  key       text primary key,            -- '<kind>:<ref>'
  kind      text not null check (kind in ('sale','void','abono','payroll')),
  ref       text not null,
  by_name   text not null default '',
  by_user   uuid,
  detail    text not null default '',
  at        timestamptz not null default now()
);
alter table public.self_reviews enable row level security;

drop policy if exists self_reviews_read on public.self_reviews;
create policy self_reviews_read on public.self_reviews for select
  using (public.is_manager());
-- Se escriben sólo desde las funciones de abajo (security definer).

-- La ficha de personal del usuario actual. Null para un administrador.
create or replace function public.self_staff() returns public.staff
language sql stable security definer set search_path = public as $$
  select s.* from public.staff s
   where s.user_id = auth.uid() and s.active and coalesce(public.my_role(), '') <> 'admin'
   limit 1;
$$;

create or replace function public.flag_self(p_kind text, p_ref text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
declare lbl text;
begin
  if coalesce(public.my_role(), '') = 'admin' then return; end if;
  lbl := case p_kind when 'void'    then 'anuló su propia venta'
                     when 'sale'    then 'se facturó una venta a sí mismo'
                     when 'abono'   then 'registró un abono a su propio crédito'
                     when 'payroll' then 'registró su propio pago de sueldo' end;
  insert into public.self_reviews (key, kind, ref, by_name, by_user, detail)
  values (p_kind || ':' || p_ref, p_kind, p_ref, public.my_name(), auth.uid(), left(coalesce(p_detail, ''), 200))
  on conflict (key) do update set detail = excluded.detail, at = now();
  perform public.audit('[Por aprobar] ' || lbl || ': ' || left(coalesce(p_detail, ''), 200));
end $$;

create or replace function public.approve_self_review(p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.self_reviews;
begin
  if coalesce(public.my_role(), '') <> 'admin' then raise exception 'Sólo un administrador aprueba'; end if;
  delete from public.self_reviews where key = p_key returning * into r;
  if not found then raise exception 'Ya no está por aprobar'; end if;
  perform public.audit('Aprobó lo que ' || r.by_name || ' hizo sobre sí mismo: ' || r.detail);
end $$;

grant execute on function public.approve_self_review(text) to authenticated;

-- ---------------------------------------------------------------- enganches
-- Venta: el cliente de la venta es el propio usuario (su ficha de personal).
create or replace function public.flag_self_sale() returns trigger
language plpgsql security definer set search_path = public as $$
declare me public.staff;
begin
  if new.customer_id is null then return new; end if;
  me := public.self_staff();
  if me.id is not null and me.customer_id = new.customer_id then
    perform public.flag_self('sale', new.id,
      new.id || ' · $' || new.total || case when new.pay_method = 'credito' then ' · a crédito' else '' end || ' · ' || coalesce(new.customer, ''));
  end if;
  return new;
end $$;
drop trigger if exists sales_self_review on public.sales;
create trigger sales_self_review after insert on public.sales
  for each row execute function public.flag_self_sale();

-- Anulación de una venta registrada por uno mismo.
create or replace function public.flag_self_void() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pay = 'cancelado' and coalesce(old.pay, '') <> 'cancelado'
     and new.user_id = auth.uid() and coalesce(public.my_role(), '') <> 'admin' then
    perform public.flag_self('void', new.id,
      new.id || ' · $' || new.total || ' · ' || coalesce(nullif(new.customer, ''), 'Consumidor final')
      || ' · motivo: ' || coalesce(new.void_info->>'reason', ''));
  end if;
  return new;
end $$;
drop trigger if exists sales_self_void_review on public.sales;
create trigger sales_self_void_review after update of pay on public.sales
  for each row execute function public.flag_self_void();

-- Abono a un crédito propio.
create or replace function public.flag_self_abono() returns trigger
language plpgsql security definer set search_path = public as $$
declare me public.staff; c uuid;
begin
  me := public.self_staff();
  if me.id is null or me.customer_id is null then return new; end if;
  select s.customer_id into c from public.sales s where s.id = new.sale_id;
  if c is not null and c = me.customer_id then
    perform public.flag_self('abono', new.sale_id || '|' || new.id,
      '$' || new.amount || ' (' || new.method || ') a ' || new.sale_id);
  end if;
  return new;
end $$;
drop trigger if exists sale_payments_self_review on public.sale_payments;
create trigger sale_payments_self_review after insert on public.sale_payments
  for each row execute function public.flag_self_abono();

-- Pago de nómina a uno mismo.
create or replace function public.flag_self_payroll() returns trigger
language plpgsql security definer set search_path = public as $$
declare me public.staff;
begin
  if new.staff_id is null then return new; end if;
  me := public.self_staff();
  if me.id is not null and me.id = new.staff_id then
    perform public.flag_self('payroll', new.id::text,
      coalesce(new.description, 'Nómina') || ' · $' || new.amount);
  end if;
  return new;
end $$;
drop trigger if exists expenses_self_review on public.expenses;
create trigger expenses_self_review after insert on public.expenses
  for each row execute function public.flag_self_payroll();
