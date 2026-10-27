-- ============================================================
-- MESA Y RUTA · limpiar tablas que NO son de esta app
-- Úselo solo si en Table Editor aparecen tablas como negocios,
-- pedidos, pedido_items, productos o un «perfiles» distinto, que
-- quedaron de una prueba anterior. Borra esas tablas y sus datos.
-- Después ejecute supabase/esquema.sql completo.
-- ============================================================

-- 1) Mire primero cuántas filas tiene cada una (si alguna tiene datos reales, deténgase).
select 'negocios' as tabla, count(*) as filas from public.negocios
union all select 'pedidos', count(*) from public.pedidos
union all select 'pedido_items', count(*) from public.pedido_items
union all select 'productos', count(*) from public.productos
union all select 'perfiles', count(*) from public.perfiles;

-- 2) Borrar: seleccione desde la línea «drop table» hasta el final y toque Run.
--    (Si el paso 1 dio error porque alguna tabla no existe, ignórelo y siga.)
drop table if exists public.pedido_items cascade;
drop table if exists public.pedidos cascade;
drop table if exists public.productos cascade;
drop table if exists public.negocios cascade;
drop table if exists public.perfiles cascade;
-- el script anterior también dejó un disparador en los usuarios que fallaría al registrar a alguien
drop trigger if exists al_crear_usuario on auth.users;
drop function if exists public.crear_perfil() cascade;
