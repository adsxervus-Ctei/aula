-- ============================================================
-- MESA Y RUTA · dejar la plataforma limpia antes de abrir al público
-- Borra los pedidos, mensajes, reservas, caja, asistencia y consolidados de
-- PRUEBA, y las cuentas de CLIENTES de prueba. Conserva:
--   · el menú, categorías, salsas, ingredientes, ocasiones, publicidad,
--   · los datos del negocio (WhatsApp, llaves, logo) y los ajustes,
--   · el equipo del negocio (todo correo que esté en «perfiles»: superadministrador,
--     administradores y empleados).
-- No se puede deshacer. Ejecútelo una sola vez, antes de abrir al público.
-- ============================================================

-- 1) Revise primero qué se va a borrar (solo mira, no borra):
select 'clientes de prueba' as que, count(*) as cuantos from auth.users u
  where lower(u.email) not in (select correo from public.perfiles)
union all
select coleccion, count(*) from public.registros
  where coleccion in ('pedidos','mensajes','reservas','egresos','ingresos','cierres','aperturas','exportes','asistencia')
  group by coleccion;

-- 2) Borrar (seleccione desde aquí hasta el final y toque Run):
delete from public.registros
 where coleccion in ('pedidos','mensajes','reservas','egresos','ingresos','cierres','aperturas','exportes','asistencia');

-- el aviso de «consolidado cada 15 días» vuelve a empezar desde hoy
delete from public.registros where coleccion = 'ajustes' and id = 'reportes';

-- cuentas de clientes de prueba (las del equipo, que están en «perfiles», se conservan)
delete from auth.users u
 where lower(u.email) not in (select correo from public.perfiles);

-- Los comprobantes de pago de prueba (imágenes) se borran aparte, en Storage:
-- Storage → comprobantes → seleccione las carpetas → Delete. Supabase no deja borrarlos con SQL.
