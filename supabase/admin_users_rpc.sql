-- ============================================================================
-- Elemental — RPCs para que el admin gestione usuarios del staff
-- Ejecuta este archivo en Supabase: SQL Editor → New query → pega todo → Run
-- ============================================================================

-- 1. Listar todos los usuarios (admin only). Une auth.users (email) con profiles.
create or replace function public.admin_list_users()
returns table (
  id         uuid,
  email      text,
  name       text,
  role       text,
  active     boolean,
  phone      text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede listar usuarios';
  end if;
  return query
    select p.id, u.email::text, p.name, p.role, p.active, p.phone, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;
grant execute on function public.admin_list_users() to authenticated;

-- 2. Cambiar rol / nombre / teléfono de un usuario (admin only)
create or replace function public.admin_set_user_role(
  target_id uuid,
  new_role  text,
  new_name  text default null,
  new_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede asignar roles';
  end if;
  if new_role not in ('customer','employee','admin') then
    raise exception 'Rol invalido: %', new_role;
  end if;
  update public.profiles
  set role  = new_role,
      name  = coalesce(new_name, name),
      phone = coalesce(new_phone, phone)
  where id = target_id;
end;
$$;
grant execute on function public.admin_set_user_role(uuid, text, text, text) to authenticated;

-- 3. Activar/desactivar un usuario (admin only)
create or replace function public.admin_set_user_active(
  target_id uuid,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede activar/desactivar usuarios';
  end if;
  if target_id = auth.uid() then
    raise exception 'No puedes desactivarte a ti mismo';
  end if;
  update public.profiles set active = is_active where id = target_id;
end;
$$;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;

-- 4. Borrar un usuario (admin only). Cascada borra el profile.
create or replace function public.admin_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede borrar usuarios';
  end if;
  if target_id = auth.uid() then
    raise exception 'No puedes borrarte a ti mismo';
  end if;
  delete from auth.users where id = target_id;
end;
$$;
grant execute on function public.admin_delete_user(uuid) to authenticated;
