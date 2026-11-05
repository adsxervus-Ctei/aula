// Pruebas de permisos y reglas de negocio de HatilloMall sobre PostgreSQL real (PGlite).
// Uso:  node supabase/test-seguridad.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

// Lo mínimo que Supabase ya trae
await db.exec(`
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id serial primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
create publication supabase_realtime;
create role authenticated; create role anon;
`);
await db.exec(schema);
await db.exec(`
grant usage on schema public, auth, storage to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated, anon;
grant select, insert on storage.objects to authenticated;
grant usage on all sequences in schema storage to authenticated;
`);

const U = {
  admin: '11111111-1111-1111-1111-111111111111',
  juan: '22222222-2222-2222-2222-222222222222',     // dueño de Rancho Costeño
  cajero: '33333333-3333-3333-3333-333333333333',   // cajero de Rancho Costeño
  danto: '44444444-4444-4444-4444-444444444444',    // cliente
  otro: '55555555-5555-5555-5555-555555555555',     // otro dueño
  maria: '66666666-6666-6666-6666-666666666666',    // cliente de confianza
};
for (const [k, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
    [id, `${k}@test.co`, { full_name: k, phone: '3000000000', username: k === 'cajero' ? 'rancho-cajero' : '' }]);
}
await db.query(`update public.profiles set role='superadmin' where email='admin@test.co'`);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
async function as(user, fn) {
  await db.exec('reset role;');
  await db.query(`select set_config('request.jwt.sub', $1, false)`, [user || '']);
  await db.exec(user ? 'set role authenticated;' : 'set role anon;');
  try { return await fn(); } finally { await db.exec('reset role;'); }
}
async function q(sql, p) {
  try { const r = await db.query(sql, p); return { ok: true, rows: r.rows, n: r.affectedRows }; }
  catch (e) { return { ok: false, err: e.message, rows: [] }; }
}
const one = async (sql, p) => (await q(sql, p)).rows[0];

console.log('Registro y perfiles');
ok((await one(`select username from public.profiles where id=$1`, [U.cajero])).username === 'rancho-cajero', 'el cajero entra con usuario (rancho-cajero)');
await as(U.danto, async () => {
  await q(`update public.profiles set role='superadmin' where id=$1`, [U.danto]);
  ok((await one(`select role from public.profiles where id=$1`, [U.danto])).role === 'cliente', 'un cliente no se vuelve superadmin');
});

console.log('Negocio: registro, aprobación y plan');
let rancho, otroBiz;
await as(U.juan, async () => {
  const r = await q(`insert into public.businesses (owner_id, category_id, name, status, plan, commission_rate, delivery, dine_in, pickup, allow_fiado, whatsapp)
    values ($1, 1, 'Rancho Costeño', 'aprobado', 'plus', 0.01, true, true, true, true, '3001234567') returning *`, [U.otro]);
  ok(r.ok, 'Don Juan registra Rancho Costeño');
  const b = r.rows[0]; rancho = b.id;
  ok(b.status === 'pendiente' && b.plan === 'vitrina' && Number(b.commission_rate) === 0.1 && b.owner_id === U.juan,
     'nace pendiente, en plan Vitrina, con 10 % y a su nombre (aunque intente otra cosa)');
  await q(`update public.businesses set status='aprobado', plan='plus', commission_rate=0 where id=$1`, [rancho]);
  const c = await one(`select status, plan, commission_rate from public.businesses where id=$1`, [rancho]);
  ok(c.status === 'pendiente' && c.plan === 'vitrina' && Number(c.commission_rate) === 0.1, 'el dueño no se aprueba, ni se sube de plan, ni se baja la comisión');
});
await as(U.otro, async () => {
  otroBiz = (await one(`insert into public.businesses (owner_id, category_id, name) values ($1, 2, 'Tienda Central') returning id`, [U.otro])).id;
});
await as(U.danto, async () => ok((await q(`select * from public.businesses`)).rows.length === 0, 'los clientes no ven negocios pendientes'));
await as(U.admin, async () => {
  ok((await q(`update public.businesses set status='aprobado' where id in ($1, $2)`, [rancho, otroBiz])).n === 2, 'el equipo aprueba los negocios');
});
ok((await one(`select role from public.profiles where id=$1`, [U.juan])).role === 'negocio', 'al aprobarse, Don Juan pasa a rol negocio');

console.log('Productos y zonas');
let asado, gaseosa, yuca, zonaCab, zonaVic;
zonaCab = (await one(`select id from public.zones where kind='cabecera'`)).id;
zonaVic = (await one(`select id from public.zones where name='La Victoria'`)).id;
ok((await one(`select count(*)::int n from public.zones`)).n === 11, 'zonas: cabecera y 10 centros poblados de Hatillo');
ok((await one(`select sum(target)::int n from public.categories`)).n === 74, 'metas por sector suman los 74 negocios del censo');
await as(U.juan, async () => {
  asado = (await one(`insert into public.products (business_id, name, price, section) values ($1, 'Asado Especial', 25000, 'Asados') returning id`, [rancho])).id;
  gaseosa = (await one(`insert into public.products (business_id, name, price, section) values ($1, 'Gaseosa', 3000, 'Bebidas') returning id`, [rancho])).id;
  yuca = (await one(`insert into public.products (business_id, name, price, section) values ($1, 'Porción de yuca', 4000, 'Acompañantes') returning id`, [rancho])).id;
  ok((await q(`insert into public.business_zones (business_id, zone_id, fee) values ($1, $2, 4000), ($1, $3, 8000)`, [rancho, zonaCab, zonaVic])).ok, 'Don Juan pone tarifas: cabecera $4.000, La Victoria $8.000');
});
await as(U.otro, async () => {
  ok(!(await q(`insert into public.products (business_id, name, price) values ($1, 'Intruso', 1)`, [rancho])).ok, 'otro dueño no agrega productos a Rancho Costeño');
  ok((await q(`update public.business_zones set fee=0 where business_id=$1`, [rancho])).n === 0, 'otro dueño no cambia las tarifas de domicilio ajenas');
});

console.log('Plan Vitrina vs PLUS');
await as(U.danto, async () => {
  const r = await q(`insert into public.orders (business_id, mode, items) values ($1, 'recoger', $2)`, [rancho, JSON.stringify([{ product_id: asado, qty: 1 }])]);
  ok(!r.ok && /WhatsApp/.test(r.err), 'en plan Vitrina no se reciben pedidos por la app (sale "Escríbale por WhatsApp")');
});
await as(U.juan, async () => ok(!(await q(`insert into public.posts (business_id, type, title) values ($1, 'oferta', 'Asado Especial $25.000')`, [rancho])).ok, 'en plan Vitrina no se publican ofertas'));
await as(U.admin, async () => { await q(`update public.businesses set plan='plus', plan_until=current_date + 15 where id=$1`, [rancho]); });
ok((await one(`select public.has_plus($1) v`, [rancho])).v === true, 'el equipo activa PLUS con 15 días de prueba');

console.log('Pedido a domicilio (ejemplo del documento)');
let p1;
await as(U.danto, async () => {
  const r = await q(`insert into public.orders (business_id, customer_id, mode, zone_id, address, items, total, payment, status, commission)
    values ($1, $2, 'domicilio', $3, 'Calle Principal, casa verde', $4, 1, 'efectivo', 'entregado', 0) returning *`,
    [rancho, U.otro, zonaCab, JSON.stringify([{ product_id: asado, qty: 1, price: 1 }])]);
  ok(r.ok, 'Danto pide un Asado Especial a domicilio');
  p1 = r.rows[0];
  ok(p1.subtotal === 25000 && p1.delivery_fee === 4000 && p1.total === 29000, 'total = $25.000 + $4.000 de domicilio = $29.000 (precios manipulados se ignoran)');
  ok(p1.commission === 2500, 'comisión 10 % = $2.500, solo sobre el producto, no sobre el domicilio');
  ok(p1.status === 'nuevo' && p1.customer_id === U.danto, 'el pedido nace nuevo y a nombre de quien pide');
  const r2 = await q(`insert into public.orders (business_id, mode, zone_id, address, items) values ($1, 'domicilio', $2, 'x', $3)`, [rancho, zonaCab, JSON.stringify([{ product_id: asado, qty: 1 }])]);
  ok(!r2.ok, 'sin dirección no hay domicilio');
  const r3 = await q(`insert into public.orders (business_id, mode, zone_id, address, items) values ($1, 'domicilio', (select id from public.zones where name='Las Palmas'), 'Calle 1 casa 2', $2)`, [rancho, JSON.stringify([{ product_id: asado, qty: 1 }])]);
  ok(!r3.ok, 'no se pide domicilio a una zona que el negocio no cubre');
  const r4 = await q(`insert into public.orders (business_id, mode, items, payment) values ($1, 'recoger', $2, 'fiado')`, [rancho, JSON.stringify([{ product_id: asado, qty: 1 }])]);
  ok(!r4.ok, 'un cliente que no es de confianza no puede pedir fiado');
});

console.log('Comer allá y recoger');
await as(U.danto, async () => {
  const m = await one(`insert into public.orders (business_id, mode, people, reserve_at, items, zone_id, address) values ($1, 'mesa', 2, now() + interval '2 hours', $2, $3, 'no aplica') returning *`,
    [rancho, JSON.stringify([{ product_id: asado, qty: 2 }]), zonaCab]);
  ok(m && m.people === 2 && m.delivery_fee === 0 && m.total === 50000 && m.zone_id === null, 'mesa para 2: $50.000, sin domicilio');
  const bad = await q(`insert into public.orders (business_id, mode, people, reserve_at, items) values ($1, 'mesa', 2, now() - interval '3 hours', $2)`, [rancho, JSON.stringify([{ product_id: asado, qty: 1 }])]);
  ok(!bad.ok, 'no se aparta mesa en una hora que ya pasó');
  const rec = await one(`insert into public.orders (business_id, mode, items) values ($1, 'recoger', $2) returning *`, [rancho, JSON.stringify([{ product_id: asado, qty: 1 }])]);
  ok(rec.total === 25000, 'paso a recoger: $25.000');
  await q(`update public.orders set status='cancelado' where id=$1`, [rec.id]);
  ok((await one(`select status from public.orders where id=$1`, [rec.id])).status === 'cancelado', 'el cliente cancela mientras el pedido está nuevo');
});

console.log('Chat del pedido');
await as(U.danto, async () => {
  ok((await q(`insert into public.order_messages (order_id, body, author_id) values ($1, '¿Me le puede echar más yuca?', $2)`, [p1.id, U.otro])).ok, 'el cliente escribe en el chat del pedido');
});
await as(U.cajero, async () => ok(!(await q(`insert into public.order_messages (order_id, body) values ($1, 'hola')`, [p1.id])).ok, 'el cajero aún no es empleado: no puede escribir'));
await as(U.admin, async () => {
  ok((await q(`insert into public.staff (business_id, user_id, title) values ($1, $2, 'Cajero')`, [rancho, U.cajero])).ok, 'el equipo (función segura) crea el usuario cajero');
});
await as(U.cajero, async () => {
  ok((await q(`insert into public.order_messages (order_id, body) values ($1, 'Listo, ya va con extra yuca')`, [p1.id])).ok, 'el cajero responde en el chat');
});
await as(U.otro, async () => ok((await q(`select * from public.order_messages`)).rows.length === 0, 'nadie más lee ese chat'));
await as(U.danto, async () => {
  const m = await q(`select author_id from public.order_messages order by created_at`);
  ok(m.rows.length === 2 && m.rows[0].author_id === U.danto, 'el autor de cada mensaje queda fijo');
});

console.log('Estados y entrega');
await as(U.danto, async () => {
  await q(`update public.orders set status='entregado' where id=$1`, [p1.id]);
  ok((await one(`select status from public.orders where id=$1`, [p1.id])).status === 'nuevo', 'el cliente no puede marcar su pedido como entregado');
});
await as(U.cajero, async () => {
  ok((await one(`update public.orders set status='aceptado', total=1 where id=$1 returning status, total, accepted_at`, [p1.id])).total === 29000, 'el cajero acepta el pedido; el total no cambia');
  await q(`update public.orders set status='en_camino' where id=$1`, [p1.id]);
  await q(`update public.orders set status='entregado' where id=$1`, [p1.id]);
});
await as(U.juan, async () => {
  const s = await q(`select * from public.sales where order_id=$1`, [p1.id]);
  ok(s.rows.length === 1 && s.rows[0].amount === 25000 && s.rows[0].source === 'app', 'al entregar, la venta de $25.000 entra sola a la caja como venta por app');
});
await as(U.danto, async () => {
  await q(`update public.orders set status='cancelado' where id=$1`, [p1.id]);
  ok((await one(`select status from public.orders where id=$1`, [p1.id])).status === 'entregado', 'un pedido entregado ya no se cancela');
});

console.log('Caja: ventas del local');
let saleLocal;
await as(U.cajero, async () => {
  const r = await q(`insert into public.sales (business_id, source, concept, items, amount, method, created_by, order_id)
    values ($1, 'app', 'Mojarra en mesa', $2, 28000, 'efectivo', $3, $4) returning *`, [rancho, JSON.stringify([{ name: 'Mojarra', qty: 1, price: 28000 }]), U.danto, p1.id]);
  ok(r.ok, 'el cajero anota una venta del local');
  saleLocal = r.rows[0];
  ok(saleLocal.source === 'local' && saleLocal.order_id === null && saleLocal.created_by === U.cajero, 'una venta anotada a mano nunca cuenta como "por app" (no paga comisión)');
  const offline = await one(`insert into public.sales (business_id, concept, amount, method, occurred_at) values ($1, 'Venta sin internet', 3000, 'efectivo', now() - interval '15 minutes') returning occurred_at`, [rancho]);
  ok(new Date(offline.occurred_at) < new Date(Date.now() - 600e3), 'una venta guardada sin internet conserva su hora real');
  ok((await q(`select * from public.sales`)).rows.length === 2, 'el cajero solo ve las ventas que él anotó');
  { const v = await q(`update public.sales set voided=true, void_reason='me equivoqué' where id=$1`, [saleLocal.id]); ok(!v.ok || v.n === 0, 'el cajero no puede anular ventas'); }
  ok(!(await q(`select public.business_dashboard($1)`, [rancho])).ok, 'el cajero no ve la ganancia del día');
  { const c = await one(`insert into public.business_customers (business_id, name, fiado_ok) values ($1, 'Amigo del cajero', true) returning fiado_ok`, [rancho]);
    ok(c && c.fiado_ok === false, 'el cajero no puede crear clientes "de confianza" para fiarles'); }
  ok(!(await q(`select * from public.expenses`)).rows.length && !(await q(`insert into public.expenses (business_id, concept, amount) values ($1, 'x', 1)`, [rancho])).ok, 'el cajero no ve ni anota gastos');
  ok((await q(`delete from public.sales where id=$1`, [saleLocal.id])).n === 0, 'nadie borra ventas');
});
await as(U.juan, async () => {
  ok(!(await q(`update public.sales set amount=1 where id=$1`, [saleLocal.id])).ok, 'el dueño tampoco edita ventas: solo las anula');
  ok(!(await q(`update public.sales set voided=true where id=$1`, [saleLocal.id])).ok, 'anular exige un motivo');
  const v = await q(`update public.sales set voided=true, void_reason='Cliente devolvió el plato' where id=$1 returning voided, voided_by`, [saleLocal.id]);
  ok(v.ok && v.rows[0].voided && v.rows[0].voided_by === U.juan, 'el dueño anula con motivo y queda quién lo hizo');
});

console.log('Gastos, inventario y fiado');
let carne, maria;
await as(U.juan, async () => {
  ok((await q(`insert into public.expenses (business_id, concept, category, amount, receipt_url) values ($1, 'Carne', 'Insumos', 80000, 'r.jpg')`, [rancho])).ok, 'Don Juan anota gasto: carne $80.000 con foto');
  await q(`insert into public.expenses (business_id, concept, amount) values ($1, 'Pago mesero', 65000)`, [rancho]);
  carne = (await one(`insert into public.inventory_items (business_id, name, unit, qty, min_qty) values ($1, 'Carne', 'kg', 999, 2) returning id, qty`, [rancho]));
  ok(Number(carne.qty) === 0, 'el inventario no se crea con cantidad inventada: arranca en 0');
  await q(`insert into public.inventory_moves (item_id, business_id, delta, reason) values ($1, $2, 8, 'Compra')`, [carne.id, rancho]);
  await q(`insert into public.inventory_moves (item_id, business_id, delta, reason) values ($1, $2, -6.5, 'Ventas del día')`, [carne.id, rancho]);
  ok(Number((await one(`select qty from public.inventory_items where id=$1`, [carne.id])).qty) === 1.5, 'carne: 8 kg − 6,5 kg = 1,5 kg');
  await q(`update public.inventory_items set qty=50 where id=$1`, [carne.id]);
  ok(Number((await one(`select qty from public.inventory_items where id=$1`, [carne.id])).qty) === 1.5, 'la cantidad solo cambia con entradas y salidas');
  const d = await one(`select public.business_dashboard($1) d`, [rancho]);
  ok(d.d.stock_bajo === 1, 'avisa: "te queda poca carne"');
  maria = (await one(`insert into public.business_customers (business_id, customer_id, name, phone, fiado_ok) values ($1, $2, 'María', '3110000000', true) returning id`, [rancho, U.maria])).id;
  await q(`insert into public.sales (business_id, concept, amount, method, customer_ref) values ($1, 'Almuerzo fiado', 15000, 'fiado', $2)`, [rancho, maria]);
  let saldo = (await q(`select * from public.fiado_balances($1)`, [rancho])).rows.find((r) => r.customer_ref === maria);
  ok(saldo.saldo === 15000, 'venta fiada: María debe $15.000');
  ok(!(await q(`insert into public.fiado_moves (business_id, customer_ref, kind, amount) values ($1, $2, 'cargo', 999999)`, [rancho, maria])).ok, 'no se inventan deudas a mano: solo nacen de una venta fiada');
  await q(`insert into public.fiado_moves (business_id, customer_ref, kind, amount, method, note) values ($1, $2, 'abono', 5000, 'efectivo', 'Abono viernes')`, [rancho, maria]);
  saldo = (await q(`select * from public.fiado_balances($1)`, [rancho])).rows.find((r) => r.customer_ref === maria);
  ok(saldo.saldo === 10000, 'María abona $5.000: debe $10.000');
});
await as(U.maria, async () => {
  const r = await q(`insert into public.orders (business_id, mode, items, payment) values ($1, 'recoger', $2, 'fiado') returning total`, [rancho, JSON.stringify([{ product_id: gaseosa, qty: 2 }])]);
  ok(r.ok, 'María (cliente de confianza) puede pedir fiado por la app');
});

console.log('Tablero, balance y cierre de caja');
await as(U.juan, async () => {
  const d = (await one(`select public.business_dashboard($1) d`, [rancho])).d;
  // ventas: 25.000 (app) + 3.000 (sin internet) + 15.000 (fiado) = 43.000 (la de 28.000 se anuló)
  ok(d.ventas === 43000, `ventas de hoy $43.000 (dio ${d.ventas})`);
  ok(d.gastos === 145000, 'gastos de hoy $145.000');
  ok(d.ventas - d.gastos === -102000, 'ganancia de hoy negativa: se muestra en rojo');
  ok(d.comision_semana === 2500, 'comisión de la semana: $2.500');
  const exp = (await one(`select public.cash_preview($1) v`, [rancho])).v;
  // efectivo: 25.000 + 3.000 + abono 5.000 − gastos 145.000 = −112.000
  ok(exp === -112000, `efectivo esperado en caja: $${exp}`);
  const c = await q(`select public.close_cash($1, 0, 'Juan Ríos', 'Prueba') r`, [rancho]);
  ok(c.ok && c.rows[0].r.difference === 112000, 'cierre de caja firmado: muestra la diferencia');
  ok(!(await q(`select public.close_cash($1, 0, 'Juan Ríos')`, [rancho])).ok, 'la caja del día se cierra una sola vez');
  const today = (await one(`select public.bogota_day(now()) d`)).d;
  const b = (await one(`select public.business_balance($1, $2::date - 6, $2::date) b`, [rancho, today])).b;
  ok(b.entradas === 43000 && b.salidas === 145000 && b.serie.length === 7, 'balance semanal con 7 días');
  ok(b.mas_vendidos[0].nombre === 'Asado Especial', 'el plato que más se vende: Asado Especial');
});

console.log('Historial que no se borra');
await as(U.juan, async () => {
  const h = await q(`select action, entity, actor_name from public.audit_log where business_id=$1 order by id`, [rancho]);
  ok(h.rows.some((r) => r.action === 'anuló' && r.entity === 'sales'), 'queda "anuló venta" con nombre de quien lo hizo');
  ok(h.rows.some((r) => r.entity === 'orders'), 'quedan los cambios de estado de los pedidos');
  ok((await q(`delete from public.audit_log`)).n === 0 && !(await q(`insert into public.audit_log (business_id, action, entity) values ($1, 'x', 'y')`, [rancho])).ok, 'nadie borra ni escribe el historial a mano');
});
await as(U.otro, async () => ok((await q(`select * from public.audit_log where business_id=$1`, [rancho])).rows.length === 0, 'otro dueño no ve el historial ajeno'));

console.log('Ofertas, Impulso y novedades');
let post;
await as(U.juan, async () => {
  post = (await one(`insert into public.posts (business_id, type, title, price, author_id) values ($1, 'oferta', 'Asado Especial $25.000', 25000, $2) returning *`, [rancho, U.otro]));
  ok(post && post.author_id === U.juan, 'Don Juan publica la oferta del día');
  const bo = await one(`insert into public.boosts (business_id, post_id, status, price, hours) values ($1, $2, 'activo', 0, 168) returning *`, [rancho, post.id]);
  ok(bo.status === 'solicitado' && bo.price === 15000 && bo.hours === 48, 'pide Impulso: queda solicitado, $15.000 por 48 horas');
  await q(`update public.boosts set status='activo' where id=$1`, [bo.id]);
  ok((await one(`select status from public.boosts where id=$1`, [bo.id])).status === 'solicitado', 'el negocio no se activa el Impulso solo');
});
await as(U.admin, async () => {
  const b = await one(`update public.boosts set status='activo', paid=true where business_id=$1 returning *`, [rancho]);
  ok(b.starts_at && new Date(b.ends_at) - new Date(b.starts_at) === 48 * 3600e3, 'el equipo lo activa al recibir el pago: corre 48 horas');
});
await as(U.danto, async () => {
  ok((await q(`select * from public.boosts`)).rows.length === 1, 'todos ven la oferta impulsada');
  ok((await one(`select public.unread_posts_count() n`)).n >= 1, 'al cliente le aparece como novedad sin leer');
});
await as(null, async () => ok((await q(`select * from public.posts`)).rows.length >= 1, 'un visitante sin cuenta también ve las ofertas'));

console.log('Liquidación de la comisión');
await as(U.juan, async () => ok(!(await q(`select public.generate_settlements(current_date)`)).ok, 'el dueño no genera liquidaciones'));
await as(U.admin, async () => {
  { const g = await q(`select public.generate_settlements(current_date) n`); ok(g.ok && g.rows[0].n >= 1, 'el equipo genera la liquidación semanal' + (g.ok ? '' : ' -> ' + g.err)); }
  const s = await one(`select * from public.settlements where business_id=$1`, [rancho]);
  ok(s.orders_count === 1 && s.base_amount === 25000 && s.commission_amount === 2500, 'liquidación Rancho Costeño: 1 pedido, $25.000, comisión $2.500');
  await q(`update public.settlements set status='pagado', paid_at=now(), paid_method='Nequi' where id=$1`, [s.id]);
  await q(`select public.generate_settlements(current_date)`);
  ok((await one(`select status from public.settlements where id=$1`, [s.id])).status === 'pagado', 'una liquidación pagada no se recalcula');
  const st = (await one(`select public.platform_stats() s`)).s;
  ok(st.cobertura.find((c) => c.sector === 'Restaurantes').meta === 29, 'cobertura: 1 de 29 restaurantes, 1 de 39 comercios…');
});
await as(U.danto, async () => ok(!(await q(`select * from public.settlements`)).rows.length, 'los clientes no ven liquidaciones'));

console.log('Bloqueo, suspensión y empleados');
await as(U.juan, async () => {
  const c = await one(`select id from public.business_customers where customer_id=$1`, [U.danto]);
  await q(`update public.business_customers set blocked=true where id=$1`, [c.id]);
});
await as(U.danto, async () => ok(!(await q(`insert into public.orders (business_id, mode, items) values ($1, 'recoger', $2)`, [rancho, JSON.stringify([{ product_id: asado, qty: 1 }])])).ok, 'un cliente bloqueado no puede pedir a ese negocio'));
await as(U.juan, async () => {
  await q(`update public.staff set active=false, user_id=$2 where business_id=$1`, [rancho, U.danto]);
  const s = await one(`select active, user_id from public.staff where business_id=$1`, [rancho]);
  ok(s.active === false && s.user_id === U.cajero, 'Don Juan desactiva al cajero (y no puede cambiarlo por otra persona)');
});
await as(U.cajero, async () => {
  ok((await q(`select * from public.orders`)).rows.length === 0, 'el cajero desactivado ya no ve pedidos');
  ok(!(await q(`insert into public.sales (business_id, concept, amount) values ($1, 'x', 1000)`, [rancho])).ok, 'ni anota ventas');
});
await as(U.admin, async () => { await q(`update public.businesses set status='suspendido' where id=$1`, [rancho]); });
await as(U.maria, async () => {
  ok((await q(`select * from public.businesses where id=$1`, [rancho])).rows.length === 0, 'un negocio suspendido desaparece del marketplace');
});

console.log('Archivos privados (comprobantes y facturas)');
await as(U.danto, async () => {
  ok((await q(`insert into storage.objects (bucket_id, name) values ('privado', $1)`, [`${rancho}/${U.danto}/nequi.jpg`])).ok, 'el cliente sube su comprobante de Nequi');
  ok(!(await q(`insert into storage.objects (bucket_id, name) values ('privado', $1)`, [`${rancho}/${U.juan}/x.jpg`])).ok, 'nadie sube archivos a nombre de otro');
});
await as(U.otro, async () => ok((await q(`select * from storage.objects where bucket_id='privado'`)).rows.length === 0, 'otro negocio no ve comprobantes ajenos'));
await as(U.juan, async () => ok((await q(`select * from storage.objects where bucket_id='privado'`)).rows.length === 1, 'Don Juan ve el comprobante de su pedido'));

console.log(`\n${pass} pruebas OK, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
