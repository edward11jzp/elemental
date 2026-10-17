-- ============================================================================
-- Fase 16 - La gerente administra a todo el personal, menos a los admin.
--
-- Puede: ver a todos los usuarios, crearlos, cambiarles rol y sede,
--        activarlos o desactivarlos y borrarlos.
-- No puede: tocar a un administrador, convertir a nadie en administrador,
--           ni borrarse a si misma. La matriz de permisos sigue siendo del admin.
--
-- Corrige ademas la fase 13: alli la gerente podia crear usuarios, pero no
-- podia verlos en la lista ni guardarles la sede.
-- Idempotente.
-- ============================================================================

-- Quien puede administrar a otro: el admin a cualquiera; la gerente a quien no
-- sea admin. Nadie se administra a si mismo por esta via.
create or replace function public.puede_administrar(target_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then true
    when public.my_role() = 'manager' and public.can('Usuarios y permisos')
         then coalesce((select role from public.profiles where id = target_id), 'customer') <> 'admin'
    else false
  end
$$;

-- Lista de usuarios, ahora con su sede, para admin y gerente.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (id uuid, email text, name text, role text, active boolean, phone text,
               created_at timestamptz, location_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or (public.my_role() = 'manager' and public.can('Usuarios y permisos'))) then
    raise exception 'Solo un administrador o gerente puede ver los usuarios';
  end if;
  return query
    select p.id, u.email::text, p.name, p.role, p.active, p.phone, p.created_at, p.location_id
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.created_at desc;
end $$;
grant execute on function public.admin_list_users() to authenticated;

-- Rol, nombre y telefono.
create or replace function public.admin_set_user_role(target_id uuid, new_role text, new_name text default null, new_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if new_role not in ('customer','employee','admin','manager','production','sales','support') then
    raise exception 'Rol invalido: %', new_role;
  end if;
  if not public.puede_administrar(target_id) then
    raise exception 'Solo un administrador puede modificar a otro administrador';
  end if;
  if new_role = 'admin' and not public.is_admin() then
    raise exception 'Solo un administrador puede crear otro administrador';
  end if;
  if target_id = auth.uid() and new_role <> (select role from public.profiles where id = target_id) then
    raise exception 'No puedes cambiar tu propio rol';
  end if;
  update public.profiles set role = new_role, name = coalesce(new_name, name), phone = coalesce(new_phone, phone)
   where id = target_id;
end $$;
grant execute on function public.admin_set_user_role(uuid, text, text, text) to authenticated;

-- Sede.
create or replace function public.admin_set_user_location(target_id uuid, new_location uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.puede_administrar(target_id) or target_id = auth.uid() and public.is_admin()) then
    raise exception 'Solo un administrador puede modificar a otro administrador';
  end if;
  update public.profiles set location_id = new_location where id = target_id;
end $$;
grant execute on function public.admin_set_user_location(uuid, uuid) to authenticated;

-- Activar o desactivar.
create or replace function public.admin_set_user_active(target_id uuid, is_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target_id = auth.uid() then raise exception 'No puedes desactivarte a ti mismo'; end if;
  if not public.puede_administrar(target_id) then
    raise exception 'Solo un administrador puede modificar a otro administrador';
  end if;
  update public.profiles set active = is_active where id = target_id;
end $$;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;

-- Borrar.
create or replace function public.admin_delete_user(target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target_id = auth.uid() then raise exception 'No puedes borrarte a ti mismo'; end if;
  if not public.puede_administrar(target_id) then
    raise exception 'Solo un administrador puede borrar a otro administrador';
  end if;
  delete from auth.users where id = target_id;
end $$;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- El guardia del perfil deja pasar a la gerente con quien no es admin.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and auth.uid() is not null and not public.is_admin()
     and exists (select 1 from public.profiles where role = 'admin')
     and not (public.my_role() = 'manager' and old.role <> 'admin' and new.role <> 'admin') then
    raise exception 'Solo un administrador puede cambiar roles o activar usuarios';
  end if;
  return new;
end $$;
