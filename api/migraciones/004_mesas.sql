-- LobaMall · Migración 004 · Mesas en vivo con código QR de un solo uso
-- Billar (chicos o tiempo, jugadores, extras) y restaurantes / asaderos (comensales y comanda).
-- Cada vez que se abre una mesa nace un código nuevo; al cerrarla, ese código queda usado para siempre.

create table if not exists mesas_sesiones (
  id            bigserial primary key,
  negocio_id    text not null references negocios(id) on delete cascade,
  tipo          text not null check (tipo in ('billar','restaurante')),
  mesa          text not null,                      -- "Mesa 1"
  juego         text,                               -- Bola 8, Bola 9, Tres bandas… (billar)
  cobro         text not null check (cobro in ('chico','tiempo','consumo')),
  valor         integer not null default 0 check (valor >= 0),  -- por chico o por hora
  token         text not null unique,               -- va dentro del QR; no se repite nunca
  estado        text not null default 'abierta' check (estado in ('abierta','cerrada')),
  personas      integer,
  abierta_por   bigint references usuarios(id),
  abierta_en    timestamptz not null default now(),
  cerrada_en    timestamptz,
  forma_pago    text,                               -- cada_uno / uno / iguales
  factura       jsonb,
  total         integer
);
-- Una misma mesa no puede estar abierta dos veces
create unique index if not exists mesas_abierta_uq on mesas_sesiones(negocio_id, mesa) where estado = 'abierta';

create table if not exists mesas_jugadores (
  id          bigserial primary key,
  sesion_id   bigint not null references mesas_sesiones(id) on delete cascade,
  usuario_id  bigint references usuarios(id),       -- null: agregado a mano por la mesera (sin app)
  nombre      text not null,
  unido_en    timestamptz not null default now()
);
create unique index if not exists mesas_jugador_uq on mesas_jugadores(sesion_id, usuario_id) where usuario_id is not null;

create table if not exists mesas_eventos (
  id               bigserial primary key,
  sesion_id        bigint not null references mesas_sesiones(id) on delete cascade,
  tipo             text not null check (tipo in ('chico','extra')),
  ganador_id       bigint references mesas_jugadores(id),
  perdedor_id      bigint references mesas_jugadores(id),
  producto_id      text,
  descripcion      text,
  cantidad         numeric(8,2) not null default 1,
  valor_unit       integer not null default 0,
  para_jugador_id  bigint references mesas_jugadores(id),   -- null = se divide entre todos
  estado           text not null default 'ok' check (estado in ('ok','pendiente','anulado')),
  cocina           text check (cocina in ('en_cocina','servido')),
  pedido_por       bigint references mesas_jugadores(id),    -- lo pidió el cliente desde su celular
  registrado_por   bigint references usuarios(id),
  creado           timestamptz not null default now()
);
create index if not exists mesas_eventos_idx on mesas_eventos(sesion_id, id);
