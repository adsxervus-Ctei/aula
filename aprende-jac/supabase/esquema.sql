-- =========================================================================
-- Aprende JAC · Chimí — Base de datos OPCIONAL en Supabase (plan gratuito)
-- Guarda SOLO resultados seudónimos de la evaluación (escala SUS) y el avance.
-- Nunca nombres, cédulas, firmas, huellas ni fotos.
--
-- Cómo usarlo: Supabase → su proyecto → SQL Editor → New query →
-- pegue TODO este archivo → Run.
-- =========================================================================

create table if not exists public.resultados (
  id           bigint generated always as identity primary key,
  id_local     uuid        not null unique,          -- evita duplicados al reintentar
  codigo       text        not null check (codigo ~ '^[A-Z]{1,3}[0-9]{1,3}$'),
  junta        text        not null default '',
  puntaje_sus  numeric(5,1) not null check (puntaje_sus between 0 and 100),
  respuestas   smallint[]  not null check (array_length(respuestas, 1) = 10),
  progreso     jsonb       not null default '{}'::jsonb,
  creado       timestamptz not null,
  recibido     timestamptz not null default now()
);

comment on table public.resultados is
  'Resultados seudónimos de la evaluación de usabilidad (SUS). Sin datos personales.';

-- Seguridad a nivel de fila: sin políticas, nadie puede hacer nada.
alter table public.resultados enable row level security;

-- La app (rol anon) SOLO puede insertar. No puede leer, cambiar ni borrar.
drop policy if exists "app inserta resultados" on public.resultados;
create policy "app inserta resultados"
  on public.resultados
  for insert
  to anon
  with check (true);

-- Permisos de tabla coherentes con la política
revoke all on public.resultados from anon, authenticated;
grant insert (id_local, codigo, junta, puntaje_sus, respuestas, progreso, creado)
  on public.resultados to anon;

-- Vista de resumen para el equipo investigador (se consulta desde el panel
-- de Supabase con su cuenta, nunca desde la app).
create or replace view public.resumen_sus
with (security_invoker = true) as
select
  junta,
  count(*)                        as evaluaciones,
  round(avg(puntaje_sus), 1)      as sus_promedio,
  round(min(puntaje_sus), 1)      as sus_minimo,
  round(max(puntaje_sus), 1)      as sus_maximo
from public.resultados
group by junta;

revoke all on public.resumen_sus from anon, authenticated;
