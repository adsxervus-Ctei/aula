-- Lainec · Migración 003 · Inventario con foto profesional y código QR
-- Cada producto tiene un código corto (ej. RC-0007) que va en el QR y en la etiqueta.
-- Así cualquier celular, tablet o lector USB lo encuentra aunque el producto se haya
-- creado en otro dispositivo.

create table if not exists productos (
  id              text primary key,                  -- mismo id que usa la tienda (asado, np1730…)
  negocio_id      text not null references negocios(id) on delete cascade,
  codigo          text not null unique,              -- RC-0007
  nombre          text not null,
  categoria       text,                              -- subcategoría dentro del negocio
  precio          integer not null default 0 check (precio >= 0),
  stock           integer not null default 0,
  unidad          text not null default 'und',
  ubicacion       text,                              -- dónde está en el local: "Estante 2, abajo"
  descripcion     text,
  atributos       jsonb not null default '{}',       -- talla, color, lote, vencimiento… según el tipo de negocio
  foto_id         bigint references archivos(id),
  foto_estado     text not null default 'pendiente' check (foto_estado in ('pendiente','lista')),
  foto_por        bigint references usuarios(id),
  etiqueta_impresa boolean not null default false,
  disponible      boolean not null default true,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);
create index if not exists productos_negocio_idx on productos(negocio_id);
create index if not exists productos_busqueda_idx on productos(lower(nombre));

-- Consecutivo por negocio para armar el código
create table if not exists productos_consecutivo (
  negocio_id  text primary key references negocios(id) on delete cascade,
  prefijo     text not null,
  ultimo      integer not null default 0
);
