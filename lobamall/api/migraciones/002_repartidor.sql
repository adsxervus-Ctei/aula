-- LobaMall · Migración 002 · Rol repartidor / mototaxista con modo dual
-- Segura para datos existentes: solo crea tablas nuevas y agrega columnas con IF NOT EXISTS.

-- 1. Origen del pedido (obligatorio). Se usa para cobrar el 10 % solo a lo que vende LobaMall.
--    Los pedidos que ya existían vinieron todos por la app (las ventas de mostrador del
--    prototipo van en la caja, no en pedidos), por eso se rellenan con 'lobamall'.
alter table pedidos add column if not exists origen text;
update pedidos set origen = 'lobamall' where origen is null;
alter table pedidos alter column origen set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_origen_chk') then
    alter table pedidos add constraint pedidos_origen_chk check (origen in ('lobamall','directo'));
  end if;
end $$;

-- 2. Zonas y tarifas de domicilio (las edita el admin; no van escritas en el código)
create table if not exists zonas_tarifas (
  id                 text primary key,           -- hatillo, chimi, sanmartin, barranco
  nombre             text not null,
  municipio          text not null,
  tipo               text not null default 'pueblo' check (tipo in ('pueblo','vereda')),
  tarifa             integer not null check (tarifa >= 0),
  lat                double precision,           -- centro aproximado de la zona
  lng                double precision,
  distancia_ref_km   numeric(6,2),               -- se usa si la zona no tiene coordenadas
  activo             boolean not null default true,
  actualizado        timestamptz not null default now()
);

-- 3. Perfil del repartidor (el usuario conserva su rol cliente: una sola cuenta)
create table if not exists repartidores (
  usuario_id          bigint primary key references usuarios(id) on delete cascade,
  nombre_completo     text not null,
  cedula              text not null,
  foto_id             bigint references archivos(id),
  cedula_foto_id      bigint references archivos(id),
  pase_foto_id        bigint references archivos(id),
  moto_marca          text not null,
  moto_color          text not null,
  placa               text not null,             -- se guarda en mayúsculas y sin espacios
  telefono            text not null,
  nequi               text not null,
  zona_id             text not null references zonas_tarifas(id),
  zonas_extra         text[] not null default '{}',   -- ampliación de zona que da el admin
  estado_aprobacion   text not null default 'pendiente' check (estado_aprobacion in ('pendiente','aprobado','rechazado')),
  motivo_rechazo      text,
  revisado_por        bigint references usuarios(id),
  revisado_en         timestamptz,
  modo_actual         text not null default 'trabajo' check (modo_actual in ('trabajo','cliente')),
  conectado           boolean not null default false,
  habeas_data_en      timestamptz not null,      -- Ley 1581 de 2012: cuándo autorizó
  habeas_data_version text not null,
  creado              timestamptz not null default now(),
  actualizado         timestamptz not null default now()
);
create unique index if not exists repartidores_cedula_uq on repartidores(cedula);
create unique index if not exists repartidores_placa_uq  on repartidores(placa);
create index if not exists repartidores_disponibles_idx on repartidores(zona_id) where estado_aprobacion = 'aprobado' and conectado and modo_actual = 'trabajo';

-- 4. Ofertas de domicilio (una por pedido; se reabre si el repartidor cancela o el negocio reintenta)
create table if not exists ofertas_domicilio (
  id                  bigserial primary key,
  pedido_id           bigint not null references pedidos(id) on delete cascade,
  negocio_id          text not null references negocios(id),
  zona_id             text not null references zonas_tarifas(id),
  valor               integer not null check (valor >= 0),
  estado              text not null default 'abierta'
                      check (estado in ('abierta','aceptada','recogida','en_camino','entregada','vencida','cancelada')),
  repartidor_id       bigint references usuarios(id),
  origen_lat          double precision, origen_lng  double precision,
  destino_lat         double precision, destino_lng double precision,
  destino_texto       text,
  distancia_km        numeric(6,2),
  minutos             integer,
  intento             integer not null default 1,
  vence_en            timestamptz not null,
  aceptada_en         timestamptz,
  recogida_en         timestamptz,
  en_camino_en        timestamptz,
  entregada_en        timestamptz,
  cerrada_en          timestamptz,
  cancelada_por       text check (cancelada_por in ('cliente','negocio','admin')),
  motivo_cancelacion  text,
  cobrado_efectivo    integer not null default 0,  -- lo que el repartidor recibió en la mano
  creada              timestamptz not null default now(),
  actualizada         timestamptz not null default now()
);
-- Nunca dos ofertas vivas para el mismo pedido
create unique index if not exists ofertas_pedido_viva_uq on ofertas_domicilio(pedido_id)
  where estado in ('abierta','aceptada','recogida','en_camino');
-- Un repartidor lleva un domicilio a la vez (supuesto documentado)
create unique index if not exists ofertas_repartidor_en_curso_uq on ofertas_domicilio(repartidor_id)
  where estado in ('aceptada','recogida','en_camino');
create index if not exists ofertas_abiertas_idx on ofertas_domicilio(zona_id, vence_en) where estado = 'abierta';
create index if not exists ofertas_repartidor_idx on ofertas_domicilio(repartidor_id, entregada_en desc);

-- Historial: cancelaciones del repartidor (con motivo), vencimientos, reintentos, cambios de valor
create table if not exists ofertas_historial (
  id          bigserial primary key,
  oferta_id   bigint not null references ofertas_domicilio(id) on delete cascade,
  evento      text not null,
  usuario_id  bigint references usuarios(id),
  detalle     jsonb not null default '{}',
  creado      timestamptz not null default now()
);
create index if not exists ofertas_historial_idx on ofertas_historial(oferta_id, creado);

-- 5. Ubicación del repartidor (solo mientras lleva un domicilio)
create table if not exists ubicaciones_repartidor (
  id             bigserial primary key,
  repartidor_id  bigint not null references usuarios(id) on delete cascade,
  oferta_id      bigint not null references ofertas_domicilio(id) on delete cascade,
  lat            double precision not null,
  lng            double precision not null,
  precision_m    real,
  creada         timestamptz not null default now()
);
create index if not exists ubicaciones_oferta_idx on ubicaciones_repartidor(oferta_id, creada desc);

-- 6. Foto de evidencia al entregar
create table if not exists evidencias_entrega (
  id          bigserial primary key,
  oferta_id   bigint not null unique references ofertas_domicilio(id) on delete cascade,
  archivo_id  bigint not null references archivos(id),
  lat         double precision,
  lng         double precision,
  creada      timestamptz not null default now()
);

-- 7. Notificaciones (la clave_dedupe evita avisar dos veces lo mismo al reconectar)
create table if not exists notificaciones (
  id            bigserial primary key,
  usuario_id    bigint not null references usuarios(id) on delete cascade,
  tipo          text not null,
  titulo        text not null,
  cuerpo        text not null,
  datos         jsonb not null default '{}',
  clave_dedupe  text not null,
  leida         boolean not null default false,
  creada        timestamptz not null default now(),
  unique (usuario_id, clave_dedupe)
);
create index if not exists notificaciones_usuario_idx on notificaciones(usuario_id, creada desc);

create table if not exists suscripciones_push (
  id            bigserial primary key,
  usuario_id    bigint not null references usuarios(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  creada        timestamptz not null default now(),
  ultimo_error  text
);
create index if not exists suscripciones_push_usuario_idx on suscripciones_push(usuario_id);

-- 8. Caja del repartidor: lo que cobró en efectivo y lo que debe entregar al negocio.
--    monto > 0: el repartidor le debe al negocio.  monto < 0: el negocio le debe al repartidor.
create table if not exists caja_repartidor (
  id              bigserial primary key,
  repartidor_id   bigint not null references usuarios(id),
  negocio_id      text not null references negocios(id),
  oferta_id       bigint references ofertas_domicilio(id),
  tipo            text not null check (tipo in ('cobro_efectivo','domicilio_por_pagar','liquidacion','ajuste')),
  monto           integer not null,
  nota            text,
  registrado_por  bigint references usuarios(id),
  creado          timestamptz not null default now()
);
create index if not exists caja_repartidor_idx on caja_repartidor(repartidor_id, negocio_id);

-- 9. Configuración por defecto
insert into configuracion(clave, valor) values
  ('vencimiento_oferta_min', '10'),
  ('velocidad_moto_kmh', '25'),
  ('fiado_domicilio_lo_cubre', '"negocio"')
on conflict (clave) do nothing;

-- 10. Zonas iniciales (valores del negocio: $4.000 en el pueblo, $8.000 a veredas)
insert into zonas_tarifas(id, nombre, municipio, tipo, tarifa, lat, lng, distancia_ref_km) values
  ('hatillo',   'Hatillo cabecera',  'Hatillo de Loba',   'pueblo', 4000, 8.955556, -74.076944, null),
  ('chimi',     'Chimí',             'Hatillo de Loba',   'vereda', 8000, null,      null,       6),
  ('sanmartin', 'San Martín de Loba','San Martín de Loba','pueblo', 4000, 8.938889, -74.039167, null),
  ('barranco',  'Barranco de Loba',  'Barranco de Loba',  'pueblo', 4000, 8.945556, -74.105833, null)
on conflict (id) do nothing;
