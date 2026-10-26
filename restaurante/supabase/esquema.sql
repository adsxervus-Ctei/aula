-- ============================================================
-- MESA Y RUTA · base de datos en Supabase (plan gratuito)
-- Pegue todo esto en Supabase → SQL Editor → New query → Run.
-- Crea: personal del negocio, pedidos y mensajes del chat,
-- con seguridad por filas (cada cliente ve solo lo suyo).
-- ============================================================

-- Personal del negocio: quienes pueden ver TODOS los pedidos y responder.
create table if not exists public.personal (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre  text,
  creado  timestamptz not null default now()
);

create table if not exists public.pedidos (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  cliente_id uuid not null references auth.users(id) on delete cascade,
  estado     text not null default 'recibido'
             check (estado in ('recibido','confirmado','preparando','en_camino','entregado')),
  datos      jsonb not null,          -- ítems, modo, destino, pago, totales, cliente
  historial  jsonb not null default '[]'::jsonb,
  creado     timestamptz not null default now()
);
create index if not exists pedidos_cliente_idx on public.pedidos (cliente_id, creado desc);
create index if not exists pedidos_creado_idx  on public.pedidos (creado desc);

create table if not exists public.mensajes (
  id        uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  de        text not null check (de in ('cliente','negocio','sistema')),
  texto     text not null check (char_length(texto) between 1 and 500),
  creado    timestamptz not null default now()
);
create index if not exists mensajes_pedido_idx on public.mensajes (pedido_id, creado);

-- ¿La persona que llama es del personal? (security definer: no expone la tabla)
create or replace function public.es_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.personal where user_id = auth.uid());
$$;

alter table public.personal enable row level security;
alter table public.pedidos  enable row level security;
alter table public.mensajes enable row level security;

-- personal: cada miembro solo puede ver su propia fila (sirve para comprobar el acceso)
drop policy if exists personal_ver on public.personal;
create policy personal_ver on public.personal for select to authenticated using (user_id = auth.uid());

-- pedidos
drop policy if exists pedidos_crear on public.pedidos;
create policy pedidos_crear on public.pedidos for insert to authenticated
  with check (cliente_id = auth.uid() and estado = 'recibido');
drop policy if exists pedidos_ver on public.pedidos;
create policy pedidos_ver on public.pedidos for select to authenticated
  using (cliente_id = auth.uid() or public.es_personal());
drop policy if exists pedidos_estado on public.pedidos;
create policy pedidos_estado on public.pedidos for update to authenticated
  using (public.es_personal()) with check (public.es_personal());
drop policy if exists pedidos_borrar on public.pedidos;
create policy pedidos_borrar on public.pedidos for delete to authenticated
  using (cliente_id = auth.uid());

-- mensajes
drop policy if exists mensajes_ver on public.mensajes;
create policy mensajes_ver on public.mensajes for select to authenticated using (
  public.es_personal() or exists (select 1 from public.pedidos p where p.id = pedido_id and p.cliente_id = auth.uid()));
drop policy if exists mensajes_crear on public.mensajes;
create policy mensajes_crear on public.mensajes for insert to authenticated with check (
  (de = 'negocio' and public.es_personal())
  or (de in ('cliente','sistema') and exists (select 1 from public.pedidos p where p.id = pedido_id and p.cliente_id = auth.uid()))
);

-- ============================================================
-- DESPUÉS de crear la cuenta del personal en Authentication → Users
-- (Add user → correo y clave), regístrela como personal así:
--   insert into public.personal (user_id, nombre)
--   select id, 'Cocina' from auth.users where email = 'cocina@su-negocio.co';
-- ============================================================
