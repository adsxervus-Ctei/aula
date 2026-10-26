-- =====================================================================
-- LOBA CONECTA · Hatillo de Loba
-- Esquema de base de datos para Supabase (PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Es idempotente en lo posible: puede volver a ejecutarse.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Perfil de cada persona registrada (se crea solo al registrarse)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text not null default '',
  phone       text default '',
  role        text not null default 'cliente'
              check (role in ('cliente', 'negocio', 'superadmin')),
  last_read_posts_at timestamptz not null default now(),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Categorías: Comercio, Restaurantes, Farmacias, Depósitos...
create table if not exists public.categories (
  id      serial primary key,
  name    text not null unique,
  slug    text not null unique,
  sort    int  not null default 0
);

-- Negocios (cada uno tiene un dueño = administrador)
create table if not exists public.businesses (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  category_id  int  not null references public.categories(id),
  name         text not null,
  description  text default '',
  whatsapp     text default '',
  address      text default '',
  hours        text default '',
  logo_url     text default '',
  delivery     boolean not null default false,
  delivery_fee int not null default 0 check (delivery_fee >= 0),
  status       text not null default 'pendiente'
               check (status in ('pendiente', 'aprobado', 'suspendido')),
  created_at   timestamptz not null default now()
);
create index if not exists businesses_owner_idx on public.businesses(owner_id);
create index if not exists businesses_status_idx on public.businesses(status);

-- Productos, platos o servicios de cada negocio
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  description  text default '',
  price        int  not null default 0 check (price >= 0),
  image_url    text default '',
  section      text default 'General',
  available    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists products_business_idx on public.products(business_id);

-- Publicaciones: nuevo menú, promoción, servicio, producto o aviso general.
-- business_id NULL = aviso general del equipo (superadmin).
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  type         text not null default 'aviso'
               check (type in ('menu', 'promocion', 'servicio', 'producto', 'aviso')),
  title        text not null,
  body         text default '',
  image_url    text default '',
  visible      boolean not null default true,
  pushed_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts(created_at desc);

-- Pedidos
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  customer_id  uuid not null references public.profiles(id) on delete cascade,
  items        jsonb not null default '[]'::jsonb,
  total        int  not null default 0 check (total >= 0),
  delivery     boolean not null default false,
  address      text default '',
  note         text default '',
  payment      text not null default 'efectivo'
               check (payment in ('efectivo', 'transferencia')),
  status       text not null default 'nuevo'
               check (status in ('nuevo', 'aceptado', 'preparando', 'enviado', 'entregado', 'cancelado')),
  pushed_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists orders_business_idx on public.orders(business_id, created_at desc);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);

-- Suscripciones a notificaciones push (una por dispositivo/navegador)
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------

-- ¿El usuario actual es superadministrador?
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin' and active
  );
$$;

-- ¿El usuario actual es dueño del negocio?
create or replace function public.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

-- ¿El negocio está aprobado?
create or replace function public.business_approved(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and status = 'aprobado');
$$;

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario normal no puede cambiarse el rol ni desactivarse/activarse a sí mismo
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() es NULL solo en el SQL Editor / service role (los anónimos no pasan RLS)
  if auth.uid() is not null and not public.is_superadmin() then
    new.role   := old.role;
    new.active := old.active;
    new.email  := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Un negocio nuevo siempre nace 'pendiente'; solo el superadmin cambia el estado
create or replace function public.protect_business_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new; -- SQL Editor / service role
  end if;
  if tg_op = 'INSERT' then
    if not public.is_superadmin() then
      new.status   := 'pendiente';
      new.owner_id := auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    if not public.is_superadmin() then
      new.status   := old.status;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_business_fields on public.businesses;
create trigger protect_business_fields
  before insert or update on public.businesses
  for each row execute function public.protect_business_fields();

-- Al aprobar un negocio, su dueño pasa a rol 'negocio' (si era cliente)
create or replace function public.promote_owner_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprobado' and (tg_op = 'INSERT' or old.status is distinct from 'aprobado') then
    update public.profiles set role = 'negocio'
    where id = new.owner_id and role = 'cliente';
  end if;
  return new;
end;
$$;

drop trigger if exists promote_owner_on_approval on public.businesses;
create trigger promote_owner_on_approval
  after insert or update of status on public.businesses
  for each row execute function public.promote_owner_on_approval();

-- Pedidos: el cliente queda fijado, el total se recalcula desde la BD
-- y solo se aceptan pedidos a negocios aprobados.
create or replace function public.prepare_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it   jsonb;
  p    record;
  qty  int;
  clean jsonb := '[]'::jsonb;
  sum_total int := 0;
  fee  int := 0;
  biz  record;
begin
  if tg_op = 'INSERT' then
    select * into biz from public.businesses where id = new.business_id;
    if biz is null or biz.status <> 'aprobado' then
      raise exception 'El negocio no está disponible para pedidos';
    end if;
    new.customer_id := auth.uid();
    new.status := 'nuevo';
    new.pushed_at := null;
    if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
      raise exception 'El pedido no tiene productos';
    end if;
    for it in select * from jsonb_array_elements(new.items) loop
      qty := greatest(1, least(99, coalesce((it->>'qty')::int, 1)));
      select id, name, price into p from public.products
        where id = (it->>'product_id')::uuid and business_id = new.business_id and available;
      if p.id is null then
        raise exception 'Un producto del pedido ya no está disponible';
      end if;
      clean := clean || jsonb_build_object('product_id', p.id, 'name', p.name, 'price', p.price, 'qty', qty);
      sum_total := sum_total + p.price * qty;
    end loop;
    if new.delivery and biz.delivery then
      fee := biz.delivery_fee;
    else
      new.delivery := false;
    end if;
    new.items := clean;
    new.total := sum_total + fee;
  elsif tg_op = 'UPDATE' then
    -- Nadie puede alterar el contenido del pedido, solo su estado
    new.items := old.items;
    new.total := old.total;
    new.business_id := old.business_id;
    new.customer_id := old.customer_id;
    new.created_at := old.created_at;
    -- El cliente solo puede cancelar mientras el pedido está 'nuevo'
    if auth.uid() is not null and not public.is_superadmin() and not public.owns_business(old.business_id) then
      if not (old.status = 'nuevo' and new.status = 'cancelado') then
        new.status := old.status;
      end if;
      new.pushed_at := old.pushed_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_order on public.orders;
create trigger prepare_order
  before insert or update on public.orders
  for each row execute function public.prepare_order();

-- Publicaciones: autor fijado; solo el superadmin publica avisos generales.
create or replace function public.prepare_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.pushed_at := null;
    if new.business_id is null and not public.is_superadmin() then
      raise exception 'Solo el equipo puede publicar avisos generales';
    end if;
  elsif tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.business_id := old.business_id;
    new.created_at := old.created_at;
    if auth.uid() is not null and not public.is_superadmin() then
      new.pushed_at := old.pushed_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_post on public.posts;
create trigger prepare_post
  before insert or update on public.posts
  for each row execute function public.prepare_post();

-- Marca como leídas las novedades del usuario actual
create or replace function public.mark_posts_read()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_read_posts_at = now() where id = auth.uid();
$$;

-- Número de novedades sin leer del usuario actual
create or replace function public.unread_posts_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.posts po
  left join public.businesses b on b.id = po.business_id
  where po.visible
    and (po.business_id is null or b.status = 'aprobado')
    and po.created_at > coalesce(
      (select last_read_posts_at from public.profiles where id = auth.uid()),
      now()
    )
    and po.author_id <> auth.uid();
$$;

-- Estadísticas para el panel del superadministrador
create or replace function public.platform_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado';
  end if;
  return json_build_object(
    'usuarios',            (select count(*) from public.profiles),
    'clientes',            (select count(*) from public.profiles where role = 'cliente'),
    'negocios_aprobados',  (select count(*) from public.businesses where status = 'aprobado'),
    'negocios_pendientes', (select count(*) from public.businesses where status = 'pendiente'),
    'publicaciones',       (select count(*) from public.posts),
    'pedidos',             (select count(*) from public.orders),
    'pedidos_hoy',         (select count(*) from public.orders where created_at >= date_trunc('day', now())),
    'ventas_entregadas',   (select coalesce(sum(total), 0) from public.orders where status = 'entregado'),
    'suscritos_push',      (select count(distinct user_id) from public.push_subscriptions)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 3. SEGURIDAD POR FILAS (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.businesses          enable row level security;
alter table public.products            enable row level security;
alter table public.posts               enable row level security;
alter table public.orders              enable row level security;
alter table public.push_subscriptions  enable row level security;

-- PROFILES
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_superadmin()
         or exists (select 1 from public.orders o
                    where o.customer_id = profiles.id and public.owns_business(o.business_id)));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

-- CATEGORIES (todos leen, solo superadmin edita)
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- BUSINESSES
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select
  using (status = 'aprobado' or owner_id = auth.uid() or public.is_superadmin());
drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses for insert
  with check (auth.uid() is not null);
drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses for update
  using (owner_id = auth.uid() or public.is_superadmin())
  with check (owner_id = auth.uid() or public.is_superadmin());
drop policy if exists businesses_delete on public.businesses;
create policy businesses_delete on public.businesses for delete
  using (public.is_superadmin());

-- PRODUCTS
drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (public.business_approved(business_id) or public.owns_business(business_id) or public.is_superadmin());
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());

-- POSTS (todos ven las publicaciones visibles de negocios aprobados y los avisos generales)
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select
  using (
    (visible and (business_id is null or public.business_approved(business_id)))
    or (business_id is not null and public.owns_business(business_id))
    or public.is_superadmin()
  );
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert
  with check (
    (business_id is not null and public.owns_business(business_id) and public.business_approved(business_id))
    or public.is_superadmin()
  );
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update
  using ((business_id is not null and public.owns_business(business_id)) or public.is_superadmin())
  with check ((business_id is not null and public.owns_business(business_id)) or public.is_superadmin());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete
  using ((business_id is not null and public.owns_business(business_id)) or public.is_superadmin());

-- ORDERS
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (customer_id = auth.uid() or public.owns_business(business_id) or public.is_superadmin());
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (auth.uid() is not null);
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
  using (customer_id = auth.uid() or public.owns_business(business_id) or public.is_superadmin())
  with check (customer_id = auth.uid() or public.owns_business(business_id) or public.is_superadmin());

-- PUSH SUBSCRIPTIONS (cada quien las suyas)
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. TIEMPO REAL (para que las novedades y pedidos lleguen al instante)
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.posts;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.orders;
  exception when others then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 5. ALMACENAMIENTO DE IMÁGENES (logos, productos, publicaciones)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

drop policy if exists imagenes_read on storage.objects;
create policy imagenes_read on storage.objects for select
  using (bucket_id = 'imagenes');
drop policy if exists imagenes_upload on storage.objects;
create policy imagenes_upload on storage.objects for insert
  with check (bucket_id = 'imagenes' and auth.uid() is not null
              and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists imagenes_delete on storage.objects;
create policy imagenes_delete on storage.objects for delete
  using (bucket_id = 'imagenes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin()));

-- ---------------------------------------------------------------------
-- 6. DATOS INICIALES
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, sort) values
  ('Restaurantes', 'restaurantes', 1),
  ('Comercio',     'comercio',     2),
  ('Farmacias',    'farmacias',    3),
  ('Depósitos',    'depositos',    4),
  ('Servicios',    'servicios',    5)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 7. PRIMER SUPERADMINISTRADOR
-- Después de registrarte en la app con tu correo, ejecuta (cambiando el correo):
--   update public.profiles set role = 'superadmin' where email = 'tu-correo@gmail.com';
-- Desde ese momento, ese superadmin puede dar el rol a los demás desde la app.
-- ---------------------------------------------------------------------
