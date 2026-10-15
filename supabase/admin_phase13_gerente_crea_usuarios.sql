-- ============================================================================
-- Fase 13 - La gerente puede dar de alta personal, pero no borrarlo.
--
-- Puede: crear usuarios nuevos y ponerles rol, nombre, telefono y sede.
-- No puede: tocar a quien ya es personal, crear administradores, cambiar
--           roles de otros, activar o desactivar cuentas, borrar usuarios,
--           ni tocar la matriz de permisos. Todo eso sigue siendo del admin.
--
-- Un "usuario nuevo" es el que todavia es cliente: recien registrado y sin
-- rol de personal. Asi la gerente no puede ascender ni degradar a nadie.
-- Idempotente.
-- ============================================================================

-- can() cerraba el modulo a cualquiera que no fuera admin. Ahora "Usuarios y
-- permisos" sigue la matriz, como los demas; lo que la gerente no puede hacer
-- dentro lo impiden las funciones de abajo.
create or replace function public.can(p_module text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r text := public.my_role(); idx int; m jsonb;
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if p_module in ('Registro de actividad', chr(67)||'onfiguraci'||chr(243)||'n', 'Configuracion') then return false; end if;
  idx := case r when 'manager' then 1 when 'production' then 2 when 'sales' then 3 when 'employee' then 3 when 'support' then 4 else null end;
  if idx is null then return false; end if;
  select value into m from public.admin_settings where key = 'permissions';
  m := coalesce(m, public.default_permissions());
  return coalesce((coalesce(m->p_module, public.default_permissions()->p_module)->>idx)::int, 0) = 1;
end $$;
grant execute on function public.can(text) to authenticated;

create or replace function public.admin_set_user_role(target_id uuid, new_role text, new_name text default null, new_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
declare rol_actual text;
begin
  if new_role not in ('customer','employee','admin','manager','production','sales','support') then
    raise exception 'Rol invalido: %', new_role;
  end if;
  select role into rol_actual from public.profiles where id = target_id;

  if not public.is_admin() then
    -- La gerente solo da de alta a alguien que aun no es personal.
    if not (public.my_role() = 'manager' and public.can('Usuarios y permisos')) then
      raise exception 'Solo un administrador o gerente puede asignar roles';
    end if;
    if coalesce(rol_actual, 'customer') <> 'customer' then
      raise exception 'Solo un administrador puede cambiarle el rol a alguien del personal';
    end if;
    if new_role = 'admin' then
      raise exception 'Solo un administrador puede crear otro administrador';
    end if;
  end if;

  if target_id = auth.uid() and new_role <> 'admin' then raise exception 'No puedes quitarte el rol de admin'; end if;
  update public.profiles set role = new_role, name = coalesce(new_name, name), phone = coalesce(new_phone, phone)
   where id = target_id;
end $$;
grant execute on function public.admin_set_user_role(uuid, text, text, text) to authenticated;

-- El guardia del perfil deja pasar ese primer alta de la gerente.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and auth.uid() is not null and not public.is_admin()
     and exists (select 1 from public.profiles where role = 'admin')
     -- alta de personal nuevo hecha por la gerente: de cliente a algo que no sea admin
     and not (public.my_role() = 'manager'
              and old.role = 'customer' and new.role <> 'admin'
              and new.active is not distinct from old.active) then
    raise exception 'Solo un administrador puede cambiar roles o activar usuarios';
  end if;
  return new;
end $$;
