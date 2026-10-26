import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

// --- Stub mínimo de lo que Supabase ya trae ---
await db.exec(`

create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id serial primary key, bucket_id text, name text); alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as
  $$ select string_to_array(name, '/') $$;
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
grant select, insert, delete on storage.objects to authenticated; grant usage on all sequences in schema storage to authenticated;
`);

const U = {
  admin: '11111111-1111-1111-1111-111111111111',
  dueno: '22222222-2222-2222-2222-222222222222',
  cliente: '33333333-3333-3333-3333-333333333333',
  otro: '44444444-4444-4444-4444-444444444444',
};
for (const [k, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
    [id, `${k}@test.co`, { full_name: k, phone: '300' }]);
}
// Bootstrap del superadmin desde el "SQL editor" (sin usuario)
await db.query(`update public.profiles set role='superadmin' where email='admin@test.co'`);

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } };

async function as(user, fn) {
  await db.exec(`reset role;`);
  if (user) {
    await db.query(`select set_config('request.jwt.sub', $1, false)`, [user]);
    await db.exec(`set role authenticated;`);
  } else {
    await db.query(`select set_config('request.jwt.sub', '', false)`);
    await db.exec(`set role anon;`);
  }
  try { return await fn(); } finally { await db.exec(`reset role;`); }
}
async function tryq(sql, params) {
  try { const r = await db.query(sql, params); return { ok: true, rows: r.rows, n: r.affectedRows }; }
  catch (e) { return { ok: false, err: e.message }; }
}

console.log('Perfiles');
let r = await db.query(`select email, role from public.profiles order by email`);
ok(r.rows.length === 4, 'se creó un perfil por cada registro');
ok(r.rows.find(x => x.email === 'admin@test.co').role === 'superadmin', 'bootstrap del superadmin desde SQL editor');

await as(U.cliente, async () => {
  await tryq(`update public.profiles set role='superadmin' where id=$1`, [U.cliente]);
  const me = await tryq(`select role from public.profiles where id=$1`, [U.cliente]);
  ok(me.rows[0].role === 'cliente', 'un cliente NO puede volverse superadmin');
  const all = await tryq(`select * from public.profiles`);
  ok(all.rows.length === 1, 'un cliente solo ve su propio perfil');
});

console.log('Negocios');
let bizId;
await as(U.dueno, async () => {
  const ins = await tryq(`insert into public.businesses (owner_id, category_id, name, status, whatsapp, delivery, delivery_fee)
    values ($1, 1, 'Sabor Ribereño', 'aprobado', '3000000000', true, 3000) returning id, status`, [U.otro]);
  ok(ins.ok, 'el dueño puede registrar su negocio');
  ok(ins.rows?.[0]?.status === 'pendiente', 'el negocio nace pendiente aunque intente ponerse aprobado');
  bizId = ins.rows[0].id;
  const own = await tryq(`select owner_id from public.businesses where id=$1`, [bizId]);
  ok(own.rows[0].owner_id === U.dueno, 'no puede registrar el negocio a nombre de otro');
  const p = await tryq(`insert into public.posts (business_id, type, title) values ($1,'menu','Menú nuevo')`, [bizId]);
  ok(!p.ok, 'un negocio pendiente NO puede publicar');
});
await as(U.cliente, async () => {
  const v = await tryq(`select * from public.businesses`);
  ok(v.rows.length === 0, 'los clientes no ven negocios pendientes');
});
await as(null, async () => {
  const v = await tryq(`select * from public.businesses`);
  ok(v.ok && v.rows.length === 0, 'visitante anónimo no ve negocios pendientes');
});
await as(U.dueno, async () => {
  await tryq(`update public.businesses set status='aprobado' where id=$1`, [bizId]);
  const s = await tryq(`select status from public.businesses where id=$1`, [bizId]);
  ok(s.rows[0].status === 'pendiente', 'el dueño NO puede autoaprobarse');
});
await as(U.admin, async () => {
  const a = await tryq(`update public.businesses set status='aprobado' where id=$1`, [bizId]);
  ok(a.ok && a.n === 1, 'el superadmin aprueba el negocio');
});
r = await db.query(`select role from public.profiles where id=$1`, [U.dueno]);
ok(r.rows[0].role === 'negocio', 'al aprobarse, el dueño pasa a rol negocio');

console.log('Productos');
let prodA, prodB;
await as(U.dueno, async () => {
  const a = await tryq(`insert into public.products (business_id, name, price) values ($1,'Bocachico frito',18000) returning id`, [bizId]);
  const b = await tryq(`insert into public.products (business_id, name, price) values ($1,'Jugo natural',4000) returning id`, [bizId]);
  ok(a.ok && b.ok, 'el dueño crea productos');
  prodA = a.rows[0].id; prodB = b.rows[0].id;
});
await as(U.otro, async () => {
  const x = await tryq(`insert into public.products (business_id, name, price) values ($1,'Intruso',1)`, [bizId]);
  ok(!x.ok, 'otro usuario NO puede agregar productos a un negocio ajeno');
  const u = await tryq(`update public.products set price=1 where id=$1`, [prodA]);
  ok(u.n === 0, 'otro usuario NO puede cambiar precios ajenos');
});
await as(U.cliente, async () => {
  const v = await tryq(`select * from public.products where business_id=$1`, [bizId]);
  ok(v.rows.length === 2, 'los clientes ven los productos de negocios aprobados');
});

console.log('Publicaciones (todos las ven)');
await as(U.dueno, async () => {
  const p = await tryq(`insert into public.posts (business_id, type, title, author_id) values ($1,'menu','Menú del domingo',$2) returning author_id`, [bizId, U.otro]);
  ok(p.ok, 'el negocio aprobado publica un nuevo menú');
  ok(p.rows[0].author_id === U.dueno, 'el autor queda fijado (no se puede suplantar)');
  const g = await tryq(`insert into public.posts (type, title) values ('aviso','Aviso falso del equipo')`);
  ok(!g.ok, 'un negocio NO puede publicar avisos generales');
});
await as(U.admin, async () => {
  const g = await tryq(`insert into public.posts (type, title) values ('aviso','Bienvenidos a Loba Conecta')`);
  ok(g.ok, 'el superadmin publica avisos generales');
});
await as(U.cliente, async () => {
  const f = await tryq(`select title from public.posts order by created_at`);
  ok(f.rows.length === 2, 'el cliente ve el menú nuevo y el aviso general');
  const c = await tryq(`select public.unread_posts_count() as n`);
  ok(c.rows[0].n === 2, 'el cliente tiene 2 novedades sin leer');
  await tryq(`select public.mark_posts_read()`);
  const c2 = await tryq(`select public.unread_posts_count() as n`);
  ok(c2.rows[0].n === 0, 'al abrir novedades, el contador vuelve a 0');
});
await as(null, async () => {
  const f = await tryq(`select title from public.posts`);
  ok(f.rows.length === 2, 'un visitante sin cuenta también ve las publicaciones');
});
const nuevo = '55555555-5555-5555-5555-555555555555';
await db.query(`insert into auth.users (id, email) values ($1, 'nuevo@test.co')`, [nuevo]);
await as(nuevo, async () => {
  const c = await tryq(`select public.unread_posts_count() as n`);
  ok(c.rows[0].n === 0, 'publicaciones anteriores al registro no cuentan como nuevas');
});
await as(U.admin, async () => {
  await tryq(`update public.posts set visible=false where title='Menú del domingo'`);
});
await as(U.cliente, async () => {
  const f = await tryq(`select title from public.posts`);
  ok(f.rows.length === 1, 'una publicación ocultada por moderación deja de verse');
});
await as(U.dueno, async () => {
  const f = await tryq(`select title from public.posts where business_id=$1`, [bizId]);
  ok(f.rows.length === 1, 'el dueño sigue viendo su publicación oculta');
});

console.log('Pedidos');
let orderId;
await as(U.cliente, async () => {
  const o = await tryq(`insert into public.orders (business_id, customer_id, items, total, delivery, status)
    values ($1, $2, $3, 1, true, 'entregado') returning id, total, status, customer_id, items`,
    [bizId, U.otro, JSON.stringify([{ product_id: prodA, qty: 2, price: 1 }, { product_id: prodB, qty: 1 }])]);
  ok(o.ok, 'el cliente hace un pedido');
  orderId = o.rows[0].id;
  ok(o.rows[0].total === 2 * 18000 + 4000 + 3000, 'el total se recalcula con precios reales + domicilio (43.000)');
  ok(o.rows[0].status === 'nuevo', 'el pedido nace en estado nuevo');
  ok(o.rows[0].customer_id === U.cliente, 'no se puede pedir a nombre de otro');
  ok(o.rows[0].items[0].price === 18000, 'el precio manipulado se reemplaza por el real');
  const s = await tryq(`update public.orders set status='entregado' where id=$1`, [orderId]);
  const st = await tryq(`select status from public.orders where id=$1`, [orderId]);
  ok(st.rows[0].status === 'nuevo', 'el cliente NO puede marcar su pedido como entregado');
});
await as(U.otro, async () => {
  const v = await tryq(`select * from public.orders`);
  ok(v.rows.length === 0, 'otro usuario NO ve pedidos ajenos');
});
await as(U.dueno, async () => {
  const v = await tryq(`select * from public.orders where business_id=$1`, [bizId]);
  ok(v.rows.length === 1, 'el negocio ve sus pedidos');
  const pr = await tryq(`select full_name, phone from public.profiles where id=$1`, [U.cliente]);
  ok(pr.rows.length === 1, 'el negocio ve nombre y teléfono del cliente que le pidió');
  const pr2 = await tryq(`select * from public.profiles where id=$1`, [U.otro]);
  ok(pr2.rows.length === 0, 'el negocio NO ve datos de personas que no le han pedido');
  const u = await tryq(`update public.orders set status='preparando', total=1 where id=$1 returning status, total`, [orderId]);
  ok(u.rows[0].status === 'preparando' && u.rows[0].total === 43000, 'el negocio cambia el estado pero no el total');
});
await as(U.cliente, async () => {
  await tryq(`update public.orders set status='cancelado' where id=$1`, [orderId]);
  const st = await tryq(`select status from public.orders where id=$1`, [orderId]);
  ok(st.rows[0].status === 'preparando', 'el cliente ya no puede cancelar un pedido en preparación');
  const bad = await tryq(`insert into public.orders (business_id, items) values ($1, '[]')`, [bizId]);
  ok(!bad.ok, 'no se aceptan pedidos vacíos');
});

console.log('Función de notificaciones (service role)');
{
  await db.exec('reset role;'); await db.query(`select set_config('request.jwt.sub', '', false)`);
  const c1 = await db.query(`update public.posts set pushed_at = now() where title='Bienvenidos a Loba Conecta' and pushed_at is null returning id`);
  ok(c1.rows.length === 1, 'la función marca la publicación como notificada');
  const c2 = await db.query(`update public.posts set pushed_at = now() where title='Bienvenidos a Loba Conecta' and pushed_at is null returning id`);
  ok(c2.rows.length === 0, 'una publicación no se notifica dos veces');
  const o1 = await db.query(`update public.orders set pushed_at = now() where id=$1 and pushed_at is null returning id`, [orderId]);
  ok(o1.rows.length === 1, 'la función marca el pedido como notificado');
}
await as(U.admin, async () => {
  await tryq(`update public.posts set visible=true where title='Menú del domingo'`);
});
await db.exec('reset role;');
await db.query(`update public.posts set pushed_at = now() where title='Menú del domingo'`);
await as(U.dueno, async () => {
  const r = await tryq(`update public.posts set pushed_at = null where title='Menú del domingo' returning pushed_at`);
  ok(r.rows[0].pushed_at !== null, 'el dueño no puede reiniciar el aviso para notificar dos veces');
});

console.log('Superadmin');
await as(U.admin, async () => {
  const s = await tryq(`select public.platform_stats() as s`);
  ok(s.ok && s.rows[0].s.pedidos === 1, 'el superadmin ve estadísticas');
  const role = await tryq(`update public.profiles set role='superadmin' where id=$1`, [U.otro]);
  ok(role.n === 1, 'el superadmin puede nombrar a otro superadmin');
  await tryq(`update public.businesses set status='suspendido' where id=$1`, [bizId]);
});
await as(U.cliente, async () => {
  const s = await tryq(`select public.platform_stats()`);
  ok(!s.ok, 'un cliente NO ve las estadísticas');
  const v = await tryq(`select * from public.businesses`);
  ok(v.rows.length === 0, 'un negocio suspendido desaparece para los clientes');
  const o = await tryq(`insert into public.orders (business_id, items) values ($1, $2)`, [bizId, JSON.stringify([{ product_id: prodA, qty: 1 }])]);
  ok(!o.ok, 'no se puede pedir a un negocio suspendido');
});

console.log('Imágenes');
await as(U.dueno, async () => {
  const a = await tryq(`insert into storage.objects (bucket_id, name) values ('imagenes', $1)`, [`${U.dueno}/logo.jpg`]);
  ok(a.ok, 'cada usuario sube imágenes a su carpeta' + (a.ok ? '' : ' -> ' + a.err));
  const b = await tryq(`insert into storage.objects (bucket_id, name) values ('imagenes', $1)`, [`${U.cliente}/x.jpg`]);
  ok(!b.ok, 'nadie sube imágenes a la carpeta de otro');
});

console.log(`\n${pass} pruebas OK, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
