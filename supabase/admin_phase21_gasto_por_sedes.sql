-- ============================================================================
-- Fase 21 - Gasto dividido entre sedes.
--
-- Un gasto puede ser general, de una sola sede (location_id) o repartido
-- entre varias (splits = [{"locationId": "...", "amount": 10.5}, ...]).
-- Las partes deben sumar el monto del gasto.
-- Idempotente.
-- ============================================================================

alter table public.expenses add column if not exists splits jsonb not null default '[]'::jsonb;

create or replace function public.expenses_check_splits() returns trigger
language plpgsql as $$
declare v_sum numeric;
begin
  if jsonb_typeof(coalesce(new.splits, '[]'::jsonb)) <> 'array' then raise exception 'Reparto invalido'; end if;
  if jsonb_array_length(new.splits) > 0 then
    select coalesce(sum((x->>'amount')::numeric), 0) into v_sum from jsonb_array_elements(new.splits) x;
    if abs(v_sum - new.amount) > 0.01 then
      raise exception 'Las partes por sede suman % y el gasto es de %', v_sum, new.amount;
    end if;
    new.location_id := null;
  end if;
  return new;
end $$;
drop trigger if exists expenses_check_splits on public.expenses;
create trigger expenses_check_splits before insert or update on public.expenses
  for each row execute function public.expenses_check_splits();

-- ---------- Gasto en la moneda en que se pago ----------
-- amount sigue en dolares (para reportes); aqui queda el monto original.
alter table public.expenses add column if not exists currency text not null default 'USD';
alter table public.expenses add column if not exists original_amount numeric(18,2);
alter table public.expenses add column if not exists fx_rate numeric(18,4);
