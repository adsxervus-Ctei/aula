-- =====================================================================
-- HATILLOMALL · Hatillo de Loba, Bolívar
-- Marketplace + sistema de negocios. Base de datos para Supabase (PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Se puede volver a ejecutar sin perder datos.
-- =====================================================================

-- gen_random_uuid() viene incluido en PostgreSQL 13+

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Personas registradas (clientes, dueños, cajeros, equipo)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  username    text unique,
  full_name   text not null default '',
  phone       text default '',
  role        text not null default 'cliente'
              check (role in ('cliente', 'negocio', 'superadmin')),
  active      boolean not null default true,
  accepts_marketing boolean not null default false,
  last_read_posts_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Sectores. "target" = negocios que existen en el municipio (censo del equipo)
create table if not exists public.categories (
  id      serial primary key,
  name    text not null unique,
  slug    text not null unique,
  target  int  not null default 0,
  sort    int  not null default 0
);

-- Zonas de domicilio: cabecera y centros poblados de Hatillo de Loba
create table if not exists public.zones (
  id     serial primary key,
  name   text not null unique,
  kind   text not null default 'corregimiento' check (kind in ('cabecera', 'corregimiento')),
  default_fee int not null default 8000 check (default_fee >= 0),
  sort   int not null default 0
);

-- Negocios
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
  cover_url    text default '',
  -- Modalidades
  delivery     boolean not null default false,
  pickup       boolean not null default true,
  dine_in      boolean not null default false,
  prep_minutes int not null default 25 check (prep_minutes between 5 and 240),
  table_hold_minutes int not null default 15 check (table_hold_minutes between 5 and 120),
  -- Pagos
  breb_key     text default '',
  breb_holder  text default '',
  breb_qr_url  text default '',
  allow_fiado  boolean not null default false,
  -- Datos que exige la Ley 1480 de 2011 (art. 53) a los portales de contacto
  legal_name   text default '',
  id_number    text default '',
  notify_address text default '',
  -- Plan y comisión (solo los cambia el equipo)
  plan         text not null default 'vitrina' check (plan in ('vitrina', 'plus')),
  plan_until   date,
  commission_rate numeric(5,4) not null default 0.10 check (commission_rate between 0 and 0.5),
  status       text not null default 'pendiente'
               check (status in ('pendiente', 'aprobado', 'suspendido')),
  created_at   timestamptz not null default now()
);
create index if not exists businesses_owner_idx on public.businesses(owner_id);

-- Tarifa de domicilio de cada negocio por zona
create table if not exists public.business_zones (
  business_id uuid not null references public.businesses(id) on delete cascade,
  zone_id     int  not null references public.zones(id) on delete cascade,
  fee         int  not null default 0 check (fee >= 0),
  primary key (business_id, zone_id)
);

-- Empleados (cajeros) de cada negocio
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Cajero',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);

-- Productos, platos y servicios
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

-- Clientes de cada negocio (para fiado y bloqueo)
create table if not exists public.business_customers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  name        text not null,
  phone       text default '',
  fiado_ok    boolean not null default false,
  blocked     boolean not null default false,
  note        text default '',
  created_at  timestamptz not null default now()
);
create unique index if not exists business_customers_uniq
  on public.business_customers(business_id, customer_id) where customer_id is not null;

-- Pedidos (las 3 modalidades)
create sequence if not exists public.order_number_seq start 100;
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  number       bigint not null default nextval('public.order_number_seq'),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  customer_id  uuid not null references public.profiles(id) on delete cascade,
  mode         text not null check (mode in ('domicilio', 'mesa', 'recoger')),
  zone_id      int references public.zones(id),
  address      text default '',
  people       int check (people between 1 and 30),
  reserve_at   timestamptz,
  items        jsonb not null default '[]'::jsonb,
  subtotal     int not null default 0 check (subtotal >= 0),
  delivery_fee int not null default 0 check (delivery_fee >= 0),
  total        int not null default 0 check (total >= 0),
  payment      text not null default 'efectivo' check (payment in ('efectivo', 'transferencia', 'fiado')),
  proof_url    text default '',
  note         text default '',
  status       text not null default 'nuevo'
               check (status in ('nuevo', 'aceptado', 'preparando', 'listo', 'en_camino', 'entregado', 'rechazado', 'cancelado')),
  eta_minutes  int,
  commission_rate numeric(5,4) not null default 0,
  commission   int not null default 0,
  accepted_at  timestamptz,
  delivered_at timestamptz,
  pushed_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists orders_business_idx on public.orders(business_id, created_at desc);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);

-- Chat dentro del pedido
create table if not exists public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists order_messages_idx on public.order_messages(order_id, created_at);

-- Ventas (de la app y del local). No se borran: se anulan con motivo.
create table if not exists public.sales (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  order_id     uuid unique references public.orders(id) on delete set null,
  source       text not null default 'local' check (source in ('app', 'local')),
  concept      text not null default '',
  items        jsonb not null default '[]'::jsonb,
  amount       int  not null check (amount > 0),
  method       text not null default 'efectivo' check (method in ('efectivo', 'transferencia', 'fiado')),
  customer_ref uuid references public.business_customers(id) on delete set null,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  voided       boolean not null default false,
  voided_by    uuid references public.profiles(id) on delete set null,
  voided_at    timestamptz,
  void_reason  text default ''
);
create index if not exists sales_business_idx on public.sales(business_id, occurred_at desc);

-- Gastos (con foto de la factura)
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  concept      text not null,
  category     text not null default 'Insumos',
  amount       int  not null check (amount > 0),
  paid_cash    boolean not null default true,
  receipt_url  text default '',
  occurred_at  timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  voided       boolean not null default false,
  voided_by    uuid references public.profiles(id) on delete set null,
  voided_at    timestamptz,
  void_reason  text default ''
);
create index if not exists expenses_business_idx on public.expenses(business_id, occurred_at desc);

-- Fiado: cargos y abonos por cliente
create table if not exists public.fiado_moves (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  customer_ref uuid not null references public.business_customers(id) on delete cascade,
  kind         text not null check (kind in ('cargo', 'abono')),
  amount       int  not null check (amount > 0),
  method       text not null default 'efectivo' check (method in ('efectivo', 'transferencia')),
  note         text default '',
  sale_id      uuid unique references public.sales(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Inventario sencillo
create table if not exists public.inventory_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  unit         text not null default 'unidades',
  qty          numeric(12,2) not null default 0,
  min_qty      numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);
create table if not exists public.inventory_moves (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.inventory_items(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  delta        numeric(12,2) not null check (delta <> 0),
  reason       text not null default 'Ajuste',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Cierre de caja con firma
create table if not exists public.cash_closings (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  day           date not null,
  expected_cash int not null,
  counted_cash  int not null check (counted_cash >= 0),
  difference    int generated always as (counted_cash - expected_cash) stored,
  signed_by     text not null,
  note          text default '',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (business_id, day)
);

-- Historial que nadie puede borrar ni editar desde la app
create table if not exists public.audit_log (
  id          bigserial primary key,
  business_id uuid references public.businesses(id) on delete cascade,
  actor_id    uuid,
  actor_name  text default '',
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_business_idx on public.audit_log(business_id, created_at desc);

-- Publicaciones: ofertas, menús, productos, servicios y avisos del equipo
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  type         text not null default 'oferta'
               check (type in ('oferta', 'menu', 'producto', 'servicio', 'aviso')),
  title        text not null check (char_length(title) between 3 and 90),
  body         text default '',
  price        int check (price >= 0),
  product_id   uuid references public.products(id) on delete set null,
  image_url    text default '',
  visible      boolean not null default true,
  pushed_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts(created_at desc);

-- Impulsos: la oferta sale de primera 48 horas y avisa a todos
create table if not exists public.boosts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  post_id      uuid not null references public.posts(id) on delete cascade,
  hours        int not null default 48 check (hours between 1 and 168),
  price        int not null default 15000 check (price >= 0),
  status       text not null default 'solicitado'
               check (status in ('solicitado', 'activo', 'rechazado')),
  starts_at    timestamptz,
  ends_at      timestamptz,
  paid         boolean not null default false,
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by  uuid references public.profiles(id) on delete set null,
  pushed_at    timestamptz,
  created_at   timestamptz not null default now()
);

-- Liquidación semanal de la comisión (solo pedidos hechos por la app)
create table if not exists public.settlements (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  week_start   date not null,
  week_end     date not null,
  orders_count int not null default 0,
  base_amount  int not null default 0,
  commission_amount int not null default 0,
  status       text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  paid_at      timestamptz,
  paid_method  text default '',
  created_at   timestamptz not null default now(),
  unique (business_id, week_start)
);

-- Suscripciones a notificaciones del celular
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE PERMISOS
-- ---------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin' and active);
$$;

create or replace function public.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

create or replace function public.works_at(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff s join public.profiles p on p.id = s.user_id
    where s.business_id = b and s.user_id = auth.uid() and s.active and p.active
  );
$$;

create or replace function public.member_of(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.owns_business(b) or public.works_at(b);
$$;

create or replace function public.business_approved(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and status = 'aprobado');
$$;

-- Plan PLUS vigente (el plan VITRINA solo muestra el negocio)
create or replace function public.has_plus(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses
    where id = b and plan = 'plus' and (plan_until is null or plan_until >= (now() at time zone 'America/Bogota')::date)
  );
$$;

create or replace function public.bogota_day(t timestamptz)
returns date language sql immutable as $$ select (t at time zone 'America/Bogota')::date $$;

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(full_name, '') from public.profiles where id = auth.uid()), 'Sistema');
$$;

-- ---------------------------------------------------------------------
-- 3. HISTORIAL AUTOMÁTICO (auditoría)
-- ---------------------------------------------------------------------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb; prev jsonb; changes jsonb := '{}'::jsonb; k text; act text; biz uuid;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    prev := to_jsonb(old);
    for k in select jsonb_object_keys(rec) loop
      if k not in ('pushed_at') and (rec->k) is distinct from (prev->k) then
        changes := changes || jsonb_build_object(k, jsonb_build_object('antes', prev->k, 'ahora', rec->k));
      end if;
    end loop;
    if changes = '{}'::jsonb then return new; end if;
    act := case when (rec->>'voided') = 'true' and (prev->>'voided') = 'false' then 'anuló' else 'cambió' end;
  elsif tg_op = 'INSERT' then
    act := 'creó'; changes := rec - 'items' - 'pushed_at';
  else
    act := 'borró'; changes := rec;
  end if;
  biz := case when tg_table_name = 'businesses' then (rec->>'id')::uuid else (rec->>'business_id')::uuid end;
  insert into public.audit_log (business_id, actor_id, actor_name, action, entity, entity_id, detail)
  values (biz, auth.uid(), public.actor_name(), act, tg_table_name, rec->>'id', changes);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['sales','expenses','fiado_moves','inventory_moves','cash_closings','products','staff','business_customers','boosts','settlements'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- Pedidos y negocios: solo se registran los cambios (no cada pedido nuevo)
drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after update of status on public.orders
  for each row execute function public.audit_row();
drop trigger if exists audit_businesses on public.businesses;
create trigger audit_businesses after update on public.businesses
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- 4. REGLAS DE NEGOCIO (triggers)
-- ---------------------------------------------------------------------

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username, full_name, phone, accepts_marketing)
  values (
    new.id, new.email,
    nullif(lower(new.raw_user_meta_data->>'username'), ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'accepts_marketing')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie se cambia su propio rol, estado, correo ni usuario
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    new.role := old.role; new.active := old.active; new.email := old.email; new.username := old.username;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Negocios: nacen pendientes y en plan VITRINA; plan, estado y comisión los pone el equipo
create or replace function public.protect_business_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_superadmin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pendiente'; new.owner_id := auth.uid(); new.plan := 'vitrina';
    new.plan_until := null; new.commission_rate := 0.10;
  else
    new.status := old.status; new.owner_id := old.owner_id; new.plan := old.plan;
    new.plan_until := old.plan_until; new.commission_rate := old.commission_rate;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_business_fields on public.businesses;
create trigger protect_business_fields before insert or update on public.businesses
  for each row execute function public.protect_business_fields();

create or replace function public.promote_owner_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprobado' and (tg_op = 'INSERT' or old.status is distinct from 'aprobado') then
    update public.profiles set role = 'negocio' where id = new.owner_id and role = 'cliente';
  end if;
  return new;
end;
$$;
drop trigger if exists promote_owner_on_approval on public.businesses;
create trigger promote_owner_on_approval after insert or update of status on public.businesses
  for each row execute function public.promote_owner_on_approval();

-- Pedidos: precios, domicilio y comisión los calcula la base de datos
create or replace function public.prepare_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it jsonb; p record; qty int; clean jsonb := '[]'::jsonb; sub int := 0; biz record; fee int;
  cust record; owner_or_staff boolean;
begin
  if tg_op = 'INSERT' then
    select * into biz from public.businesses where id = new.business_id;
    if biz is null or biz.status <> 'aprobado' or not public.has_plus(biz.id) then
      raise exception 'Este negocio no recibe pedidos por la app. Escríbale por WhatsApp.';
    end if;
    select * into cust from public.business_customers
      where business_id = biz.id and customer_id = auth.uid();
    if cust.blocked then raise exception 'No es posible hacer pedidos a este negocio. Comuníquese con él.'; end if;
    new.customer_id := auth.uid();
    new.status := 'nuevo'; new.pushed_at := null; new.accepted_at := null; new.delivered_at := null;
    if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
      raise exception 'El pedido no tiene productos';
    end if;
    for it in select * from jsonb_array_elements(new.items) loop
      qty := greatest(1, least(99, coalesce((it->>'qty')::int, 1)));
      select id, name, price into p from public.products
        where id = (it->>'product_id')::uuid and business_id = biz.id and available;
      if p.id is null then raise exception 'Un producto del pedido ya no está disponible'; end if;
      clean := clean || jsonb_build_object('product_id', p.id, 'name', p.name, 'price', p.price, 'qty', qty,
                                           'note', left(coalesce(it->>'note', ''), 120));
      sub := sub + p.price * qty;
    end loop;
    new.items := clean; new.subtotal := sub;
    -- Modalidad
    if new.mode = 'domicilio' then
      if not biz.delivery then raise exception 'Este negocio no hace domicilios'; end if;
      select bz.fee into fee from public.business_zones bz where bz.business_id = biz.id and bz.zone_id = new.zone_id;
      if fee is null then raise exception 'El negocio no lleva domicilios a esa zona'; end if;
      if char_length(trim(coalesce(new.address, ''))) < 5 then raise exception 'Escriba la dirección del domicilio'; end if;
      new.delivery_fee := fee; new.people := null; new.reserve_at := null;
    elsif new.mode = 'mesa' then
      if not biz.dine_in then raise exception 'Este negocio no aparta mesa'; end if;
      if new.reserve_at is null or new.reserve_at < now() - interval '5 minutes'
         or new.reserve_at > now() + interval '7 days' then
        raise exception 'Elija una hora válida para la mesa (hasta 7 días)';
      end if;
      new.people := coalesce(new.people, 2); new.delivery_fee := 0; new.zone_id := null; new.address := '';
    else
      if not biz.pickup then raise exception 'Este negocio no tiene la opción de recoger'; end if;
      new.delivery_fee := 0; new.zone_id := null; new.address := ''; new.people := null; new.reserve_at := null;
    end if;
    -- Pago
    if new.payment = 'fiado' and not (biz.allow_fiado and coalesce(cust.fiado_ok, false)) then
      raise exception 'El fiado solo está disponible para clientes de confianza de este negocio';
    end if;
    if new.payment <> 'transferencia' then new.proof_url := ''; end if;
    new.total := new.subtotal + new.delivery_fee;
    -- Comisión: solo sobre los productos, nunca sobre el domicilio
    new.commission_rate := biz.commission_rate;
    new.commission := round(new.subtotal * biz.commission_rate);
  elsif tg_op = 'UPDATE' then
    new.items := old.items; new.subtotal := old.subtotal; new.delivery_fee := old.delivery_fee;
    new.total := old.total; new.business_id := old.business_id; new.customer_id := old.customer_id;
    new.created_at := old.created_at; new.number := old.number; new.mode := old.mode;
    new.commission_rate := old.commission_rate; new.commission := old.commission; new.payment := old.payment;
    owner_or_staff := auth.uid() is null or public.is_superadmin() or public.member_of(old.business_id);
    if not owner_or_staff then
      -- El cliente solo puede cancelar mientras nadie lo ha aceptado, y adjuntar su comprobante
      if not (old.status = 'nuevo' and new.status = 'cancelado') then new.status := old.status; end if;
      new.pushed_at := old.pushed_at; new.eta_minutes := old.eta_minutes;
      new.zone_id := old.zone_id; new.address := old.address; new.people := old.people; new.reserve_at := old.reserve_at;
    else
      new.proof_url := old.proof_url;
      if old.status in ('entregado', 'rechazado', 'cancelado') then new.status := old.status; end if;
    end if;
    if new.status = 'aceptado' and old.status <> 'aceptado' then new.accepted_at := now(); end if;
    if new.status = 'entregado' and old.status <> 'entregado' then new.delivered_at := now(); end if;
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_order on public.orders;
create trigger prepare_order before insert or update on public.orders
  for each row execute function public.prepare_order();

-- Al entregar un pedido: queda la venta en caja (y el cargo si fue fiado)
create or replace function public.order_delivered()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid; cref uuid; cname text; cphone text;
begin
  if new.status = 'entregado' and old.status <> 'entregado' then
    perform set_config('hm.system', '1', true);
    select full_name, phone into cname, cphone from public.profiles where id = new.customer_id;
    select id into cref from public.business_customers where business_id = new.business_id and customer_id = new.customer_id;
    if cref is null then
      insert into public.business_customers (business_id, customer_id, name, phone)
      values (new.business_id, new.customer_id, coalesce(nullif(cname, ''), 'Cliente'), coalesce(cphone, ''))
      returning id into cref;
    end if;
    insert into public.sales (business_id, order_id, source, concept, items, amount, method, customer_ref, created_by)
    values (new.business_id, new.id, 'app', 'Pedido #' || new.number, new.items, new.subtotal, new.payment, cref, null)
    on conflict (order_id) do nothing
    returning id into sid;
    perform set_config('hm.system', '0', true);
    if sid is not null and new.payment = 'fiado' then
      insert into public.fiado_moves (business_id, customer_ref, kind, amount, note, sale_id, created_by)
      values (new.business_id, cref, 'cargo', new.subtotal, 'Pedido #' || new.number, sid, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists order_delivered on public.orders;
create trigger order_delivered after update of status on public.orders
  for each row execute function public.order_delivered();

-- Chat: autor fijado y solo en pedidos abiertos
create or replace function public.prepare_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists prepare_message on public.order_messages;
create trigger prepare_message before insert on public.order_messages
  for each row execute function public.prepare_message();

-- Ventas: quién la anotó queda fijo; solo se pueden ANULAR (con motivo), nunca editar
create or replace function public.prepare_sale()
returns trigger language plpgsql security definer set search_path = public as $$
declare reason text;
begin
  if tg_op = 'INSERT' then
    -- Las ventas "por app" solo las crea el sistema al entregar un pedido
    if coalesce(current_setting('hm.system', true), '') <> '1' and auth.uid() is not null then
      new.created_by := auth.uid();
      if not public.is_superadmin() then new.order_id := null; end if;
    end if;
    if new.order_id is null then new.source := 'local'; end if;
    new.created_at := now(); new.voided := false; new.voided_by := null; new.voided_at := null;
    -- Ventas sin internet: se acepta la hora del celular, máximo 7 días atrás
    if new.occurred_at > now() + interval '5 minutes' or new.occurred_at < now() - interval '7 days' then
      new.occurred_at := now();
    end if;
    if new.method = 'fiado' then
      if new.customer_ref is null then raise exception 'Para fiar, elija el cliente'; end if;
      if not exists (select 1 from public.business_customers where id = new.customer_ref and business_id = new.business_id) then
        raise exception 'El cliente no es de este negocio';
      end if;
    end if;
  else
    if old.voided then raise exception 'Esta venta ya está anulada'; end if;
    if not new.voided then raise exception 'Las ventas no se editan: anúlela y anótela de nuevo'; end if;
    if auth.uid() is not null and not (public.owns_business(old.business_id) or public.is_superadmin()) then
      raise exception 'Solo el dueño puede anular ventas';
    end if;
    reason := trim(coalesce(new.void_reason, ''));
    if char_length(reason) < 3 then raise exception 'Escriba el motivo de la anulación'; end if;
    new := old;
    new.voided := true; new.voided_by := auth.uid(); new.voided_at := now(); new.void_reason := reason;
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_sale on public.sales;
create trigger prepare_sale before insert or update on public.sales
  for each row execute function public.prepare_sale();

-- Venta fiada del local: genera el cargo
create or replace function public.sale_fiado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.method = 'fiado' and new.source = 'local' and new.customer_ref is not null then
    insert into public.fiado_moves (business_id, customer_ref, kind, amount, note, sale_id, created_by)
    values (new.business_id, new.customer_ref, 'cargo', new.amount, coalesce(nullif(new.concept, ''), 'Venta fiada'), new.id, new.created_by)
    on conflict (sale_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists sale_fiado on public.sales;
create trigger sale_fiado after insert on public.sales
  for each row execute function public.sale_fiado();

-- Venta fiada anulada: se reversa el cargo con un abono automático
create or replace function public.sale_void_fiado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.voided and not old.voided and old.method = 'fiado' and old.customer_ref is not null then
    insert into public.fiado_moves (business_id, customer_ref, kind, amount, method, note, created_by)
    values (old.business_id, old.customer_ref, 'abono', old.amount, 'efectivo', 'Reverso por venta anulada: ' || new.void_reason, auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists sale_void_fiado on public.sales;
create trigger sale_void_fiado after update on public.sales
  for each row execute function public.sale_void_fiado();

-- Gastos: igual que ventas, solo se anulan
create or replace function public.prepare_expense()
returns trigger language plpgsql security definer set search_path = public as $$
declare reason text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.created_by := auth.uid(); end if;
    new.created_at := now(); new.voided := false; new.voided_by := null; new.voided_at := null;
    if new.occurred_at > now() + interval '5 minutes' or new.occurred_at < now() - interval '7 days' then
      new.occurred_at := now();
    end if;
    return new;
  end if;
  if old.voided then raise exception 'Este gasto ya está anulado'; end if;
  if not new.voided then raise exception 'Los gastos no se editan: anúlelo y anótelo de nuevo'; end if;
  reason := trim(coalesce(new.void_reason, ''));
  if char_length(reason) < 3 then raise exception 'Escriba el motivo de la anulación'; end if;
  new := old;
  new.voided := true; new.voided_by := auth.uid(); new.voided_at := now(); new.void_reason := reason;
  return new;
end;
$$;
drop trigger if exists prepare_expense on public.expenses;
create trigger prepare_expense before insert or update on public.expenses
  for each row execute function public.prepare_expense();

-- Fiado: los movimientos no se editan
create or replace function public.prepare_fiado_move()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.created_by := auth.uid(); end if;
  new.created_at := now();
  if not exists (select 1 from public.business_customers where id = new.customer_ref and business_id = new.business_id) then
    raise exception 'El cliente no es de este negocio';
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_fiado_move on public.fiado_moves;
create trigger prepare_fiado_move before insert on public.fiado_moves
  for each row execute function public.prepare_fiado_move();

-- Clientes del negocio: solo el dueño decide a quién se le fía o se bloquea
create or replace function public.protect_business_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(current_setting('hm.system', true), '') = '1'
     or public.is_superadmin() or public.owns_business(new.business_id) then return new; end if;
  if tg_op = 'INSERT' then new.fiado_ok := false; new.blocked := false; new.customer_id := null; end if;
  return new;
end;
$$;
drop trigger if exists protect_business_customer on public.business_customers;
create trigger protect_business_customer before insert on public.business_customers
  for each row execute function public.protect_business_customer();

-- Inventario: la cantidad solo cambia con movimientos (entradas y salidas)
create or replace function public.protect_inventory_qty()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('hm.inventory_move', true), '') <> '1' then
    if tg_op = 'INSERT' then new.qty := 0; else new.qty := old.qty; end if;
  end if;
  if tg_op = 'UPDATE' then new.business_id := old.business_id; end if;
  return new;
end;
$$;
drop trigger if exists protect_inventory_qty on public.inventory_items;
create trigger protect_inventory_qty before insert or update on public.inventory_items
  for each row execute function public.protect_inventory_qty();

create or replace function public.apply_inventory_move()
returns trigger language plpgsql security definer set search_path = public as $$
declare it record;
begin
  select * into it from public.inventory_items where id = new.item_id;
  if it.id is null or it.business_id <> new.business_id then raise exception 'Producto de inventario no válido'; end if;
  if auth.uid() is not null then new.created_by := auth.uid(); end if;
  new.created_at := now();
  perform set_config('hm.inventory_move', '1', true);
  update public.inventory_items set qty = qty + new.delta where id = new.item_id;
  perform set_config('hm.inventory_move', '0', true);
  return new;
end;
$$;
drop trigger if exists apply_inventory_move on public.inventory_moves;
create trigger apply_inventory_move before insert on public.inventory_moves
  for each row execute function public.apply_inventory_move();

-- Publicaciones: autor fijado; avisos generales solo del equipo; ofertas solo con plan PLUS
create or replace function public.prepare_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id); new.pushed_at := null;
    if auth.uid() is not null and not public.is_superadmin() then
      if new.business_id is null then raise exception 'Solo el equipo publica avisos generales'; end if;
      if not public.has_plus(new.business_id) then raise exception 'Publicar ofertas es parte del plan PLUS'; end if;
      if new.type = 'aviso' then new.type := 'oferta'; end if;
    end if;
  else
    new.author_id := old.author_id; new.business_id := old.business_id; new.created_at := old.created_at;
    if auth.uid() is not null and not public.is_superadmin() then new.pushed_at := old.pushed_at; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_post on public.posts;
create trigger prepare_post before insert or update on public.posts
  for each row execute function public.prepare_post();

-- Impulsos: el negocio lo pide; el equipo lo activa cuando recibe el pago
create or replace function public.prepare_boost()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_superadmin() then
      if not public.has_plus(new.business_id) then raise exception 'El Impulso es para negocios con plan PLUS'; end if;
      new.status := 'solicitado'; new.paid := false; new.starts_at := null; new.ends_at := null;
      new.hours := 48; new.price := 15000; new.approved_by := null;
    end if;
    if not exists (select 1 from public.posts where id = new.post_id and business_id = new.business_id) then
      raise exception 'La oferta no es de este negocio';
    end if;
    new.requested_by := coalesce(auth.uid(), new.requested_by); new.pushed_at := null;
  else
    new.business_id := old.business_id; new.post_id := old.post_id;
    if auth.uid() is not null and not public.is_superadmin() then
      new := old; return new;
    end if;
    if new.status = 'activo' and old.status <> 'activo' then
      new.starts_at := now(); new.ends_at := now() + make_interval(hours => new.hours); new.approved_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_boost on public.boosts;
create trigger prepare_boost before insert or update on public.boosts
  for each row execute function public.prepare_boost();

-- Empleados: el dueño solo puede activar o desactivar (crear es por la función segura)
create or replace function public.protect_staff()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_superadmin() then return new; end if;
  new.business_id := old.business_id; new.user_id := old.user_id; new.created_at := old.created_at;
  return new;
end;
$$;
drop trigger if exists protect_staff on public.staff;
create trigger protect_staff before update on public.staff
  for each row execute function public.protect_staff();

-- ---------------------------------------------------------------------
-- 5. CONSULTAS DEL SISTEMA (funciones)
-- ---------------------------------------------------------------------

-- Tablero del día (solo dueño y equipo: el cajero no ve la ganancia)
create or replace function public.business_dashboard(b uuid, d date default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare dd date := coalesce(d, public.bogota_day(now())); r json;
begin
  if not (public.owns_business(b) or public.is_superadmin()) then raise exception 'No autorizado'; end if;
  select json_build_object(
    'dia', dd,
    'ventas', coalesce((select sum(amount) from public.sales where business_id = b and not voided and public.bogota_day(occurred_at) = dd), 0),
    'ventas_efectivo', coalesce((select sum(amount) from public.sales where business_id = b and not voided and method = 'efectivo' and public.bogota_day(occurred_at) = dd), 0),
    'ventas_transferencia', coalesce((select sum(amount) from public.sales where business_id = b and not voided and method = 'transferencia' and public.bogota_day(occurred_at) = dd), 0),
    'ventas_fiado', coalesce((select sum(amount) from public.sales where business_id = b and not voided and method = 'fiado' and public.bogota_day(occurred_at) = dd), 0),
    'gastos', coalesce((select sum(amount) from public.expenses where business_id = b and not voided and public.bogota_day(occurred_at) = dd), 0),
    'abonos_efectivo', coalesce((select sum(amount) from public.fiado_moves where business_id = b and kind = 'abono' and method = 'efectivo' and sale_id is null and note not like 'Reverso%' and public.bogota_day(created_at) = dd), 0),
    'pedidos_app', (select count(*) from public.orders where business_id = b and public.bogota_day(created_at) = dd and status not in ('rechazado', 'cancelado')),
    'pedidos_pendientes', (select count(*) from public.orders where business_id = b and status in ('nuevo', 'aceptado', 'preparando', 'listo', 'en_camino')),
    'stock_bajo', (select count(*) from public.inventory_items where business_id = b and qty <= min_qty),
    'fiado_total', coalesce((select sum(case when kind = 'cargo' then amount else -amount end) from public.fiado_moves where business_id = b), 0),
    'comision_semana', coalesce((select sum(commission) from public.orders where business_id = b and status = 'entregado'
                          and public.bogota_day(delivered_at) >= date_trunc('week', dd)::date), 0),
    'cerrada', exists (select 1 from public.cash_closings where business_id = b and day = dd)
  ) into r;
  return r;
end;
$$;

-- Balance de un periodo: entradas, salidas, ganancia, mejor día, lo más vendido
create or replace function public.business_balance(b uuid, d1 date, d2 date)
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not (public.owns_business(b) or public.is_superadmin()) then raise exception 'No autorizado'; end if;
  with dias as (
    select g::date as dia from generate_series(d1, d2, interval '1 day') g
  ), v as (
    select public.bogota_day(occurred_at) dia, sum(amount) total from public.sales
    where business_id = b and not voided and public.bogota_day(occurred_at) between d1 and d2 group by 1
  ), g as (
    select public.bogota_day(occurred_at) dia, sum(amount) total from public.expenses
    where business_id = b and not voided and public.bogota_day(occurred_at) between d1 and d2 group by 1
  ), serie as (
    select dias.dia, coalesce(v.total, 0) ventas, coalesce(g.total, 0) gastos
    from dias left join v on v.dia = dias.dia left join g on g.dia = dias.dia
  ), prod as (
    select it->>'name' nombre, sum((it->>'qty')::int) cant
    from public.sales s, jsonb_array_elements(s.items) it
    where s.business_id = b and not s.voided and public.bogota_day(s.occurred_at) between d1 and d2
    group by 1 order by 2 desc limit 5
  ), cats as (
    select category, sum(amount) total from public.expenses
    where business_id = b and not voided and public.bogota_day(occurred_at) between d1 and d2
    group by 1 order by 2 desc
  )
  select json_build_object(
    'desde', d1, 'hasta', d2,
    'entradas', (select coalesce(sum(ventas), 0) from serie),
    'salidas', (select coalesce(sum(gastos), 0) from serie),
    'ganancia', (select coalesce(sum(ventas) - sum(gastos), 0) from serie),
    'por_app', coalesce((select sum(amount) from public.sales where business_id = b and not voided and source = 'app' and public.bogota_day(occurred_at) between d1 and d2), 0),
    'serie', (select json_agg(json_build_object('dia', dia, 'ventas', ventas, 'gastos', gastos) order by dia) from serie),
    'mejor_dia', (select json_build_object('dia', dia, 'ventas', ventas) from serie where ventas > 0 order by ventas desc limit 1),
    'mas_vendidos', coalesce((select json_agg(json_build_object('nombre', nombre, 'cantidad', cant)) from prod), '[]'::json),
    'gastos_por_categoria', coalesce((select json_agg(json_build_object('categoria', category, 'total', total)) from cats), '[]'::json)
  ) into r;
  return r;
end;
$$;

-- Cierre de caja: la base calcula cuánto debe haber en efectivo
create or replace function public.cash_expected(b uuid, d date)
returns int language sql stable security definer set search_path = public as $$
  select (
    coalesce((select sum(amount) from public.sales where business_id = b and not voided and method = 'efectivo' and public.bogota_day(occurred_at) = d), 0)
  + coalesce((select sum(amount) from public.fiado_moves where business_id = b and kind = 'abono' and method = 'efectivo' and sale_id is null and note not like 'Reverso%' and public.bogota_day(created_at) = d), 0)
  - coalesce((select sum(amount) from public.expenses where business_id = b and not voided and paid_cash and public.bogota_day(occurred_at) = d), 0)
  )::int;
$$;

create or replace function public.close_cash(b uuid, counted int, signer text, obs text default '')
returns json language plpgsql security definer set search_path = public as $$
declare dd date := public.bogota_day(now()); exp int; row public.cash_closings;
begin
  if not (public.owns_business(b) or public.is_superadmin()) then raise exception 'Solo el dueño hace el cierre de caja'; end if;
  if char_length(trim(coalesce(signer, ''))) < 3 then raise exception 'Escriba el nombre de quien firma'; end if;
  exp := public.cash_expected(b, dd);
  insert into public.cash_closings (business_id, day, expected_cash, counted_cash, signed_by, note, created_by)
  values (b, dd, exp, counted, trim(signer), coalesce(obs, ''), auth.uid())
  returning * into row;
  return to_json(row);
exception when unique_violation then
  raise exception 'La caja de hoy ya se cerró';
end;
$$;

create or replace function public.cash_preview(b uuid)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.owns_business(b) or public.is_superadmin()) then raise exception 'No autorizado'; end if;
  return public.cash_expected(b, public.bogota_day(now()));
end;
$$;

-- Saldos de fiado por cliente
create or replace function public.fiado_balances(b uuid)
returns table (customer_ref uuid, name text, phone text, fiado_ok boolean, blocked boolean, saldo int, ultimo timestamptz, customer_id uuid)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.phone, c.fiado_ok, c.blocked,
         coalesce(sum(case when m.kind = 'cargo' then m.amount else -m.amount end), 0)::int,
         max(m.created_at), c.customer_id
  from public.business_customers c
  left join public.fiado_moves m on m.customer_ref = c.id
  where c.business_id = b and (public.owns_business(b) or public.is_superadmin())
  group by c.id
  order by 6 desc, c.name;
$$;

-- Novedades sin leer
create or replace function public.mark_posts_read()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_read_posts_at = now() where id = auth.uid();
$$;
create or replace function public.unread_posts_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.posts po
  left join public.businesses b on b.id = po.business_id
  where po.visible and (po.business_id is null or b.status = 'aprobado')
    and po.created_at > coalesce((select last_read_posts_at from public.profiles where id = auth.uid()), now())
    and po.author_id <> auth.uid();
$$;

-- Liquidación semanal: genera (o actualiza si sigue pendiente) la de cada negocio
create or replace function public.generate_settlements(p_week date)
returns int language plpgsql security definer set search_path = public as $$
declare ws date := date_trunc('week', p_week)::date; we date := ws + 6; n int := 0; r record;
begin
  if not public.is_superadmin() then raise exception 'Solo el equipo genera liquidaciones'; end if;
  for r in
    select business_id, count(*) c, sum(subtotal) base, sum(commission) com
    from public.orders
    where status = 'entregado' and public.bogota_day(delivered_at) between ws and we
    group by business_id
  loop
    insert into public.settlements (business_id, week_start, week_end, orders_count, base_amount, commission_amount)
    values (r.business_id, ws, we, r.c, r.base, r.com)
    on conflict (business_id, week_start) do update
      set orders_count = excluded.orders_count, base_amount = excluded.base_amount, commission_amount = excluded.commission_amount
      where public.settlements.status = 'pendiente';
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Estadísticas del equipo y cobertura por sector (meta: negocios del censo)
create or replace function public.platform_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'No autorizado'; end if;
  return json_build_object(
    'usuarios', (select count(*) from public.profiles),
    'clientes', (select count(*) from public.profiles where role = 'cliente'),
    'negocios_aprobados', (select count(*) from public.businesses where status = 'aprobado'),
    'negocios_pendientes', (select count(*) from public.businesses where status = 'pendiente'),
    'negocios_plus', (select count(*) from public.businesses where status = 'aprobado' and public.has_plus(id)),
    'pedidos_hoy', (select count(*) from public.orders where public.bogota_day(created_at) = public.bogota_day(now())),
    'pedidos_mes', (select count(*) from public.orders where created_at >= date_trunc('month', now())),
    'ventas_app_mes', coalesce((select sum(subtotal) from public.orders where status = 'entregado' and delivered_at >= date_trunc('month', now())), 0),
    'comision_mes', coalesce((select sum(commission) from public.orders where status = 'entregado' and delivered_at >= date_trunc('month', now())), 0),
    'comision_por_cobrar', coalesce((select sum(commission_amount) from public.settlements where status = 'pendiente'), 0),
    'impulsos_solicitados', (select count(*) from public.boosts where status = 'solicitado'),
    'cobertura', (select json_agg(json_build_object('sector', c.name, 'meta', c.target,
                  'vinculados', (select count(*) from public.businesses b where b.category_id = c.id and b.status = 'aprobado'))
                  order by c.sort) from public.categories c),
    'suscritos_push', (select count(distinct user_id) from public.push_subscriptions)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. SEGURIDAD POR FILAS (RLS)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','zones','businesses','business_zones','staff','products','business_customers',
    'orders','order_messages','sales','expenses','fiado_moves','inventory_items','inventory_moves','cash_closings',
    'audit_log','posts','boosts','settlements','push_subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Borra las políticas anteriores para poder re-ejecutar
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- PROFILES: cada quien el suyo; el negocio ve a sus clientes y a sus empleados
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.is_superadmin()
  or exists (select 1 from public.orders o where o.customer_id = profiles.id and public.member_of(o.business_id))
  or exists (select 1 from public.staff s where s.user_id = profiles.id and public.owns_business(s.business_id))
);
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_superadmin()) with check (id = auth.uid() or public.is_superadmin());

-- CATÁLOGOS: todos leen, el equipo edita
create policy categories_select on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy zones_select on public.zones for select using (true);
create policy zones_write on public.zones for all using (public.is_superadmin()) with check (public.is_superadmin());

-- BUSINESSES
create policy businesses_select on public.businesses for select
  using (status = 'aprobado' or owner_id = auth.uid() or public.works_at(id) or public.is_superadmin());
create policy businesses_insert on public.businesses for insert with check (auth.uid() is not null);
create policy businesses_update on public.businesses for update
  using (owner_id = auth.uid() or public.is_superadmin()) with check (owner_id = auth.uid() or public.is_superadmin());
create policy businesses_delete on public.businesses for delete using (public.is_superadmin());

create policy bz_select on public.business_zones for select using (true);
create policy bz_write on public.business_zones for all
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());

-- STAFF
create policy staff_select on public.staff for select
  using (user_id = auth.uid() or public.owns_business(business_id) or public.is_superadmin());
create policy staff_update on public.staff for update
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());
create policy staff_admin on public.staff for insert with check (public.is_superadmin());

-- PRODUCTS
create policy products_select on public.products for select
  using (public.business_approved(business_id) or public.member_of(business_id) or public.is_superadmin());
create policy products_write on public.products for all
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());

-- CLIENTES DEL NEGOCIO (fiado / bloqueo)
create policy bc_select on public.business_customers for select
  using (public.member_of(business_id) or public.is_superadmin());
create policy bc_insert on public.business_customers for insert
  with check (public.member_of(business_id) or public.is_superadmin());
create policy bc_update on public.business_customers for update
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());

-- ORDERS
create policy orders_select on public.orders for select
  using (customer_id = auth.uid() or public.member_of(business_id) or public.is_superadmin());
create policy orders_insert on public.orders for insert with check (auth.uid() is not null);
create policy orders_update on public.orders for update
  using (customer_id = auth.uid() or public.member_of(business_id) or public.is_superadmin())
  with check (customer_id = auth.uid() or public.member_of(business_id) or public.is_superadmin());

-- CHAT DEL PEDIDO: solo los que participan
create policy msg_select on public.order_messages for select using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.customer_id = auth.uid() or public.member_of(o.business_id) or public.is_superadmin()))
);
create policy msg_insert on public.order_messages for insert with check (
  exists (select 1 from public.orders o where o.id = order_id
          and o.status not in ('entregado', 'rechazado', 'cancelado')
          and (o.customer_id = auth.uid() or public.member_of(o.business_id)))
);

-- VENTAS: el dueño ve todo; el cajero anota y ve solo lo que él anotó
create policy sales_select on public.sales for select using (
  public.owns_business(business_id) or public.is_superadmin()
  or (public.works_at(business_id) and created_by = auth.uid())
);
create policy sales_insert on public.sales for insert
  with check ((public.member_of(business_id) and public.has_plus(business_id)) or public.is_superadmin());
create policy sales_update on public.sales for update
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());

-- GASTOS, INVENTARIO, CIERRES, FIADO: solo el dueño (y el equipo)
create policy expenses_select on public.expenses for select using (public.owns_business(business_id) or public.is_superadmin());
create policy expenses_insert on public.expenses for insert
  with check ((public.owns_business(business_id) and public.has_plus(business_id)) or public.is_superadmin());
create policy expenses_update on public.expenses for update
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());

create policy fiado_select on public.fiado_moves for select using (public.owns_business(business_id) or public.is_superadmin());
create policy fiado_insert on public.fiado_moves for insert
  with check ((public.owns_business(business_id) and kind = 'abono') or public.is_superadmin());

create policy inv_select on public.inventory_items for select using (public.owns_business(business_id) or public.is_superadmin());
create policy inv_write on public.inventory_items for all
  using (public.owns_business(business_id) or public.is_superadmin())
  with check (public.owns_business(business_id) or public.is_superadmin());
create policy invm_select on public.inventory_moves for select using (public.owns_business(business_id) or public.is_superadmin());
create policy invm_insert on public.inventory_moves for insert
  with check (public.owns_business(business_id) or public.is_superadmin());

create policy closings_select on public.cash_closings for select using (public.owns_business(business_id) or public.is_superadmin());

-- HISTORIAL: se lee, nunca se escribe ni se borra desde la app
create policy audit_select on public.audit_log for select using (public.owns_business(business_id) or public.is_superadmin());

-- POSTS
create policy posts_select on public.posts for select using (
  (visible and (business_id is null or public.business_approved(business_id)))
  or (business_id is not null and public.owns_business(business_id)) or public.is_superadmin()
);
create policy posts_insert on public.posts for insert with check (
  (business_id is not null and public.owns_business(business_id) and public.business_approved(business_id)) or public.is_superadmin()
);
create policy posts_update on public.posts for update
  using ((business_id is not null and public.owns_business(business_id)) or public.is_superadmin())
  with check ((business_id is not null and public.owns_business(business_id)) or public.is_superadmin());
create policy posts_delete on public.posts for delete
  using ((business_id is not null and public.owns_business(business_id)) or public.is_superadmin());

-- IMPULSOS: todos ven los activos; el negocio ve y pide los suyos
create policy boosts_select on public.boosts for select using (
  (status = 'activo' and ends_at > now()) or public.owns_business(business_id) or public.is_superadmin()
);
create policy boosts_insert on public.boosts for insert
  with check (public.owns_business(business_id) or public.is_superadmin());
create policy boosts_update on public.boosts for update using (public.is_superadmin()) with check (public.is_superadmin());

-- LIQUIDACIONES
create policy settle_select on public.settlements for select using (public.owns_business(business_id) or public.is_superadmin());
create policy settle_update on public.settlements for update using (public.is_superadmin()) with check (public.is_superadmin());

-- PUSH
create policy push_own on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7. TIEMPO REAL
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['posts','orders','order_messages','boosts'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 8. ARCHIVOS: fotos públicas y documentos privados (comprobantes y facturas)
-- Ruta de los privados: <id del negocio>/<id del usuario>/<archivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('imagenes', 'imagenes', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('privado', 'privado', false) on conflict (id) do nothing;

drop policy if exists hm_img_read on storage.objects;
create policy hm_img_read on storage.objects for select using (bucket_id = 'imagenes');
drop policy if exists hm_img_upload on storage.objects;
create policy hm_img_upload on storage.objects for insert
  with check (bucket_id = 'imagenes' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists hm_priv_read on storage.objects;
create policy hm_priv_read on storage.objects for select using (
  bucket_id = 'privado' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.owns_business(nullif((storage.foldername(name))[1], '')::uuid)
    or public.is_superadmin()
  )
);
drop policy if exists hm_priv_upload on storage.objects;
create policy hm_priv_upload on storage.objects for insert
  with check (bucket_id = 'privado' and auth.uid() is not null and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 9. DATOS INICIALES
-- Metas del censo del equipo: 39 comercio, 29 restaurantes, 3 farmacias, 3 depósitos (74)
-- Zonas: cabecera y centros poblados de Hatillo de Loba (DANE, censo 2018)
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, target, sort) values
  ('Restaurantes', 'restaurantes', 29, 1),
  ('Comercio',     'comercio',     39, 2),
  ('Farmacias',    'farmacias',     3, 3),
  ('Depósitos',    'depositos',     3, 4)
on conflict (slug) do update set target = excluded.target;

insert into public.zones (name, kind, default_fee, sort) values
  ('Hatillo de Loba (cabecera)', 'cabecera', 4000, 1),
  ('La Victoria', 'corregimiento', 8000, 2),
  ('San Miguel', 'corregimiento', 8000, 3),
  ('Juana Sánchez', 'corregimiento', 8000, 4),
  ('La Ribona', 'corregimiento', 8000, 5),
  ('Las Brisas', 'corregimiento', 8000, 6),
  ('Cerro de las Aguadas', 'corregimiento', 8000, 7),
  ('Pueblo Nuevo', 'corregimiento', 8000, 8),
  ('Gualí', 'corregimiento', 8000, 9),
  ('El Pozón', 'corregimiento', 8000, 10),
  ('Las Palmas', 'corregimiento', 8000, 11)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 10. PRIMER SUPERADMINISTRADOR
-- Regístrese en la app y luego ejecute (con su correo):
--   update public.profiles set role = 'superadmin' where email = 'su-correo@gmail.com';
-- ---------------------------------------------------------------------
