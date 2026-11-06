-- LobaMall · Migración 001 · Tablas base
-- El prototipo v6 guardaba todo en localStorage, así que estas tablas no existían en SQL.
-- Todo usa IF NOT EXISTS: si ya existen (por ejemplo, en una base que alguien creó a mano),
-- no se borra ni se reemplaza nada.

create table if not exists usuarios (
  id           bigserial primary key,
  telefono     text not null unique,              -- solo dígitos, sin espacios
  usuario      text unique,                       -- alias opcional para entrar (ej: rancho, admin)
  nombre       text not null,
  clave_hash   text not null,                     -- scrypt: sal$hash
  roles        text[] not null default '{cliente}',
  municipio    text,
  activo       boolean not null default true,
  creado       timestamptz not null default now()
);

create table if not exists sesiones (
  token_hash   text primary key,                  -- sha256 del token; el token nunca se guarda
  usuario_id   bigint not null references usuarios(id) on delete cascade,
  creada       timestamptz not null default now(),
  expira       timestamptz not null,
  dispositivo  text
);
create index if not exists sesiones_usuario_idx on sesiones(usuario_id);

-- Archivos (fotos). Se guardan en la base para no depender de otro servicio.
-- privado = true: solo el dueño del archivo y el admin (y quien la regla permita) lo pueden ver.
create table if not exists archivos (
  id             bigserial primary key,
  propietario_id bigint references usuarios(id) on delete set null,
  tipo           text not null,                   -- foto_repartidor, cedula, pase, evidencia, comprobante, producto
  mime           text not null,
  datos          bytea not null,
  bytes          integer not null,
  privado        boolean not null default true,
  creado         timestamptz not null default now()
);

create table if not exists negocios (
  id             text primary key,                -- mismo id del prototipo: rancho, drogueria…
  nombre         text not null,
  categoria      text not null,
  municipio      text not null default 'Hatillo de Loba',
  zona_id        text,                            -- zona de tarifa donde queda el local
  direccion      text,
  lat            double precision,
  lng            double precision,
  telefono       text,
  nequi          text,
  mensualidad    integer not null default 70000,
  comision_pct   numeric(5,2) not null default 10,
  aprobado       boolean not null default true,
  creado         timestamptz not null default now()
);

create table if not exists negocio_usuarios (
  negocio_id   text   not null references negocios(id) on delete cascade,
  usuario_id   bigint not null references usuarios(id) on delete cascade,
  rol          text   not null check (rol in ('dueno','cajero')),
  primary key (negocio_id, usuario_id)
);

create table if not exists pedidos (
  id             bigserial primary key,
  numero         integer,                         -- número visible (#127) que usa el negocio
  negocio_id     text not null references negocios(id),
  cliente_id     bigint references usuarios(id),  -- null si el pedido llegó por WhatsApp o mostrador
  cliente_nombre text,
  cliente_tel    text,
  items          jsonb not null default '[]',
  subtotal       integer not null default 0,
  domicilio      integer not null default 0,
  descuento      integer not null default 0,
  total          integer not null default 0,
  modo           text not null default 'domicilio' check (modo in ('domicilio','alla','recoger')),
  zona_id        text,
  direccion      text,
  lat            double precision,
  lng            double precision,
  pago           text not null default 'efectivo' check (pago in ('efectivo','nequi','banco','fiado')),
  estado         text not null default 'recibido',
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now()
);
create index if not exists pedidos_negocio_idx on pedidos(negocio_id, creado desc);
create index if not exists pedidos_cliente_idx on pedidos(cliente_id, creado desc);

create table if not exists pagos (
  id              bigserial primary key,
  pedido_id       bigint not null references pedidos(id) on delete cascade,
  metodo          text not null check (metodo in ('efectivo','nequi','banco','fiado')),
  monto           integer not null,
  estado          text not null default 'pendiente' check (estado in ('pendiente','confirmado','rechazado')),
  comprobante_id  bigint references archivos(id),
  confirmado_por  bigint references usuarios(id),
  nota            text,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);
create index if not exists pagos_pedido_idx on pagos(pedido_id);

create table if not exists calificaciones (
  id             bigserial primary key,
  pedido_id      bigint not null references pedidos(id) on delete cascade,
  autor_id       bigint not null references usuarios(id),
  objetivo_tipo  text not null check (objetivo_tipo in ('negocio','repartidor')),
  objetivo_id    text not null,                   -- id del negocio o usuario_id del repartidor
  estrellas      smallint not null check (estrellas between 1 and 5),
  comentario     text,
  creado         timestamptz not null default now(),
  unique (pedido_id, autor_id, objetivo_tipo)
);
create index if not exists calificaciones_obj_idx on calificaciones(objetivo_tipo, objetivo_id);

create table if not exists configuracion (
  clave  text primary key,
  valor  jsonb not null
);
