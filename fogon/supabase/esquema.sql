-- ============================================================
-- MESA Y RUTA v7 · base de datos en Supabase (plan gratuito)
-- Pegue todo en Supabase → SQL Editor → New query → Run.
-- Crea: perfiles del personal (roles y permisos), una tabla general
-- de registros (menú, pedidos, mensajes, reservas, caja, publicidad…)
-- con seguridad por filas, y el depósito de fotos «medios».
-- ============================================================

-- ---------- personal del negocio ----------
create table if not exists public.perfiles (
  correo    text primary key,
  user_id   uuid unique references auth.users(id) on delete set null,
  nombre    text,
  celular   text,
  rol       text not null check (rol in ('superadmin','admin','cajero','mesero','cocina','domiciliario')),
  permisos  text[] not null default '{}',
  inactivo  boolean not null default false,
  creado    timestamptz not null default now()
);

-- datos del carné (v5): foto, documento, RH, cargo, código del carné, vencimiento y turno
alter table public.perfiles add column if not exists foto text;
alter table public.perfiles add column if not exists documento text;
alter table public.perfiles add column if not exists rh text;
alter table public.perfiles add column if not exists cargo text;
alter table public.perfiles add column if not exists carnet text unique;
alter table public.perfiles add column if not exists carnet_vence date;
alter table public.perfiles add column if not exists turno text;

-- ---------- registros (una sola tabla para todas las colecciones) ----------
create table if not exists public.registros (
  coleccion   text not null,
  id          text not null,
  autor       uuid default auth.uid(),
  datos       jsonb not null,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  primary key (coleccion, id)
);
create index if not exists registros_col_fecha on public.registros (coleccion, creado desc);
create index if not exists registros_autor on public.registros (autor);
create index if not exists registros_pedido on public.registros ((datos->>'pedido')) where coleccion = 'mensajes';

-- ---------- funciones de permisos (security definer: no exponen la tabla) ----------
create or replace function public.es_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where user_id = auth.uid() and not inactivo);
$$;
create or replace function public.es_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where user_id = auth.uid() and not inactivo and rol = 'superadmin');
$$;
create or replace function public.tiene(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where user_id = auth.uid() and not inactivo and (rol in ('admin','superadmin') or p = any(permisos)));
$$;
create or replace function public.mi_pedido(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from registros where coleccion = 'pedidos' and id = pid and autor = auth.uid());
$$;

-- verificación pública del carné (el QR): solo devuelve lo que se ve en el carné
create or replace function public.verificar_carnet(c text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('correo', correo, 'nombre', nombre, 'rol', rol, 'cargo', cargo, 'foto', foto,
    'activo', not inactivo, 'carnet_vence', carnet_vence, 'turno', turno)
  from perfiles where carnet is not null and carnet = upper(trim(c)) limit 1;
$$;
grant execute on function public.verificar_carnet(text) to anon, authenticated;

-- ---------- enlazar el perfil con la cuenta (por correo) ----------
create or replace function public.vincular_perfil_por_correo() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  new.correo := lower(new.correo);
  if new.user_id is null then
    select id into new.user_id from auth.users where lower(email) = new.correo;
  end if;
  return new;
end $$;
drop trigger if exists perfiles_vincular on public.perfiles;
create trigger perfiles_vincular before insert or update on public.perfiles for each row execute function public.vincular_perfil_por_correo();

create or replace function public.vincular_cuenta_nueva() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.perfiles set user_id = new.id where correo = lower(new.email) and user_id is null;
  return new;
end $$;
drop trigger if exists auth_vincular_perfil on auth.users;
create trigger auth_vincular_perfil after insert on auth.users for each row execute function public.vincular_cuenta_nueva();

-- ---------- permisos de la API (Supabase ya no los da solos a las tablas nuevas, desde 2026) ----------
-- Sin estas líneas la app no puede leer los roles ni los pedidos. Las reglas por filas (RLS) siguen mandando.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.perfiles to authenticated, service_role;
grant select on public.registros to anon;
grant select, insert, update, delete on public.registros to authenticated, service_role;

-- ---------- seguridad por filas: perfiles ----------
alter table public.perfiles enable row level security;
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated using (user_id = auth.uid() or public.tiene('equipo.gestionar'));
drop policy if exists perfiles_crear on public.perfiles;
create policy perfiles_crear on public.perfiles for insert to authenticated
  with check (public.tiene('equipo.gestionar') and (rol <> 'superadmin' or public.es_superadmin()));
drop policy if exists perfiles_cambiar on public.perfiles;
create policy perfiles_cambiar on public.perfiles for update to authenticated
  using (public.tiene('equipo.gestionar') and (rol <> 'superadmin' or public.es_superadmin()))
  with check (public.tiene('equipo.gestionar') and (rol <> 'superadmin' or public.es_superadmin()));

-- ---------- seguridad por filas: registros ----------
alter table public.registros enable row level security;

drop policy if exists reg_ver on public.registros;
create policy reg_ver on public.registros for select to anon, authenticated using (
  coleccion in ('menu','salsas','ocasiones','publicidad','negocio','categorias','ingredientes')
  or (coleccion = 'pedidos'  and (autor = auth.uid() or public.tiene('pedidos.ver')))
  or (coleccion = 'reservas' and (autor = auth.uid() or public.tiene('reservas.gestionar')))
  or (coleccion = 'mensajes' and (autor = auth.uid() or public.mi_pedido(datos->>'pedido') or public.tiene('chat.responder') or public.tiene('pedidos.ver')))
  or (coleccion in ('egresos','ingresos','cierres','aperturas') and public.tiene('finanzas.ver'))
  or (coleccion = 'exportes' and public.tiene('reportes.exportar'))
  or (coleccion = 'ajustes'  and public.es_personal())
  or (coleccion = 'asistencia' and (public.tiene('asistencia.tomar') or public.tiene('equipo.gestionar')))
);

drop policy if exists reg_crear on public.registros;
create policy reg_crear on public.registros for insert to authenticated with check (
  autor = auth.uid() and (
    (coleccion = 'pedidos'  and datos->>'estado' = 'recibido')
    or (coleccion = 'reservas' and datos->>'estado' = 'solicitada')
    or (coleccion = 'mensajes' and (public.mi_pedido(datos->>'pedido') or public.tiene('chat.responder')))
    or (coleccion in ('menu','salsas','ocasiones','categorias','ingredientes') and public.tiene('menu.editar'))
    or (coleccion = 'publicidad' and public.tiene('publicidad.editar'))
    or (coleccion in ('egresos','ingresos','cierres','aperturas') and public.tiene('finanzas.registrar'))
    or (coleccion = 'exportes' and public.tiene('reportes.exportar'))
    or (coleccion = 'ajustes'  and (public.tiene('reportes.exportar') or public.tiene('ajustes.editar')))
    or (coleccion = 'negocio'  and public.tiene('ajustes.editar'))
    or (coleccion = 'asistencia' and public.tiene('asistencia.tomar'))
  )
);

drop policy if exists reg_cambiar on public.registros;
create policy reg_cambiar on public.registros for update to authenticated using (
  (coleccion = 'pedidos'  and (public.tiene('pedidos.estado') or public.tiene('pedidos.pago')))
  or (coleccion in ('menu','salsas') and public.tiene('inventario.gestionar'))
  or (coleccion = 'reservas' and public.tiene('reservas.gestionar'))
  or (coleccion = 'mensajes' and public.tiene('chat.responder'))
  or (coleccion in ('menu','salsas','ocasiones','categorias','ingredientes') and public.tiene('menu.editar'))
  or (coleccion = 'publicidad' and public.tiene('publicidad.editar'))
  or (coleccion in ('egresos','ingresos','cierres','aperturas') and public.tiene('finanzas.registrar'))
  or (coleccion = 'ajustes'  and (public.tiene('reportes.exportar') or public.tiene('ajustes.editar')))
  or (coleccion = 'negocio'  and public.tiene('ajustes.editar'))
) with check (true);

drop policy if exists reg_borrar on public.registros;
create policy reg_borrar on public.registros for delete to authenticated using (
  (coleccion in ('pedidos','reservas','mensajes') and autor = auth.uid())          -- el cliente borra sus datos
  or (coleccion in ('menu','salsas','ocasiones','categorias','ingredientes') and public.tiene('menu.editar'))
  or (coleccion = 'publicidad' and public.tiene('publicidad.editar'))
  or (coleccion in ('egresos','ingresos') and public.tiene('finanzas.registrar'))
);

-- ---------- inventario (v7): descontar o devolver existencias de un pedido ----------
-- El cliente no puede editar el menú; esta función lo hace por él, solo con lo que trae su pedido y una sola vez.
create or replace function public.mover_uno(c text, i text, delta int) returns void
language sql security definer set search_path = public as $$
  update registros
     set datos = jsonb_set(datos, '{stock}', to_jsonb(greatest(0, floor((datos->>'stock')::numeric)::int + delta)))
                 || jsonb_build_object('actualizado', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
         actualizado = now()
   where coleccion = c and id = i and jsonb_typeof(datos->'stock') = 'number';
$$;
revoke execute on function public.mover_uno(text, text, int) from public, anon, authenticated;

create or replace function public.mover_inventario(pid text, signo int) returns void
language plpgsql security definer set search_path = public as $$
declare ped jsonb; dueno uuid; it jsonb; sid text; b jsonb; n int; marca text;
begin
  if signo not in (-1, 1) then raise exception 'signo inválido'; end if;
  select datos, autor into ped, dueno from registros where coleccion = 'pedidos' and id = pid for update;
  if ped is null then return; end if;
  if not (dueno = auth.uid() or public.tiene('pedidos.estado')) then raise exception 'sin permiso'; end if;
  if signo = 1 and not public.tiene('pedidos.estado') then raise exception 'sin permiso'; end if;
  if signo = -1 and coalesce(ped->'inventario'->>'descontado', '') <> '' then return; end if;
  if signo = 1 and (coalesce(ped->'inventario'->>'descontado', '') = '' or coalesce(ped->'inventario'->>'devuelto', '') <> '') then return; end if;
  for it in select * from jsonb_array_elements(coalesce(ped->'items', '[]'::jsonb)) loop
    n := coalesce((it->>'cant')::int, 1);
    perform public.mover_uno('menu', it->>'platoId', signo * n);
    for sid in select jsonb_array_elements_text(coalesce(it->'salsas', '[]'::jsonb)) loop
      perform public.mover_uno('salsas', sid, signo * n);
    end loop;
    for b in select * from jsonb_array_elements(coalesce(it->'bebidas', '[]'::jsonb)) loop
      perform public.mover_uno('menu', b->>'id', signo * coalesce((b->>'cant')::int, 1));
    end loop;
  end loop;
  marca := case when signo = -1 then 'descontado' else 'devuelto' end;
  update registros set datos = datos || jsonb_build_object('inventario', coalesce(datos->'inventario', '{}'::jsonb) || jsonb_build_object(marca, now()))
   where coleccion = 'pedidos' and id = pid;
end $$;
grant execute on function public.mover_inventario(text, int) to authenticated;

-- ---------- fotos: depósito público «medios» ----------
insert into storage.buckets (id, name, public) values ('medios', 'medios', true) on conflict (id) do nothing;
drop policy if exists medios_subir on storage.objects;
create policy medios_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'medios' and (public.tiene('menu.editar') or public.tiene('publicidad.editar')));

-- ---------- comprobantes de transferencia: depósito PRIVADO ----------
-- Cada cliente sube a su carpeta (su id de usuario); solo él y el personal los ven,
-- y la app los muestra con un enlace firmado que vence en una hora.
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', false) on conflict (id) do nothing;
drop policy if exists comp_subir on storage.objects;
create policy comp_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists comp_ver on storage.objects;
create policy comp_ver on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.tiene('pedidos.pago') or public.tiene('finanzas.ver')));

-- ============================================================
-- PRIMER SUPERADMINISTRADOR (el equipo de la plataforma)
-- 1) Créelo en Authentication → Users → Add user (correo y clave).
-- 2) Ejecute, con su correo:
--    insert into public.perfiles (correo, nombre, rol) values ('super@su-dominio.co', 'Equipo Mesa y Ruta', 'superadmin');
-- Desde el panel, el superadministrador crea al administrador del negocio
-- y este a sus empleados. Cada persona crea su clave con «Crear cuenta»
-- usando el mismo correo y entra por «Soy del negocio».
-- ============================================================
