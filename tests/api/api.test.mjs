// Lainec · pruebas de la API (casos críticos del repartidor)
// Uso:  TEST_DATABASE_URL=postgres://usuario:clave@localhost/lobamall_test npm run test:api
// ¡OJO! Borra y recrea el esquema de la base de PRUEBAS. Nunca la apuntes a la base real.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { iniciar, iniciarApi } from '../../servidor.mjs';
import { cerrar, q, uno, migrar, conectar } from '../../api/db.mjs';
import { sembrar } from '../../api/semilla.mjs';
import { vencerOfertas } from '../../api/rutas.mjs';
import { bitacora } from '../../api/notificaciones.mjs';
import { usarEnviador } from '../../api/canales/webpush.mjs';
import { reiniciarLimites } from '../../api/auth.mjs';
import { cerrarTodo } from '../../api/tiempo-real.mjs';

const URL_DB = process.env.TEST_DATABASE_URL;
if (!URL_DB || !/test/.test(URL_DB)) { console.error('Define TEST_DATABASE_URL (debe contener "test" en el nombre).'); process.exit(1); }
const PUERTO = 8095, BASE = `http://localhost:${PUERTO}`;
const FOTO = 'data:image/jpeg;base64,' + Buffer.from('foto-de-prueba-'.repeat(20)).toString('base64');
const pushEnviados = [];
let srv;

async function api(token, metodo, ruta, cuerpo) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-Lainec': '1', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const tipo = r.headers.get('content-type') || '';
  return { status: r.status, body: tipo.includes('json') ? await r.json() : await r.arrayBuffer() };
}
async function entrar(usuario) {
  const r = await api(null, 'POST', '/api/auth/entrar', { usuario, clave: '1234' });
  assert.equal(r.status, 200, 'login ' + usuario + ': ' + JSON.stringify(r.body));
  return r.body.token;
}
// Escucha eventos SSE de un usuario y los guarda en una lista
function escuchar(token) {
  const eventos = [], ctl = new AbortController();
  const listo = fetch(BASE + '/api/eventos', { headers: { Authorization: 'Bearer ' + token }, signal: ctl.signal }).then(async r => {
    const dec = new TextDecoder(); let buf = '';
    try {
      for await (const trozo of r.body) {
        buf += dec.decode(trozo, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const bloque = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = /event: (.+)/.exec(bloque), da = /data: (.+)/.exec(bloque);
          if (ev && da) eventos.push({ evento: ev[1], datos: JSON.parse(da[1]) });
        }
      }
    } catch {}
  }).catch(() => {});
  return { eventos, cerrar: () => ctl.abort(), listo };
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
async function nuevaOferta(tokNeg, extra = {}) {
  const r = await api(tokNeg, 'POST', '/api/negocio/rancho/ofertas', {
    pedido: { numero: Math.floor(Math.random() * 9000) + 1000, cliente_nombre: 'Carmen Ruiz', items: [{ id: 'asado', n: 'Asado Especial', q: 1, p: 25000 }], zona_id: 'hatillo', direccion: 'Barrio Abajo, casa 4', pago: 'efectivo', origen: 'lobamall', ...extra }
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}

const T = {};
before(async () => {
  // Esquema limpio en la base de pruebas
  const c = new pg.Client({ connectionString: URL_DB });
  await c.connect();
  await c.query('drop schema public cascade; create schema public;');
  // Simula una base "vieja" con datos: la tabla pedidos ya existía sin la columna origen
  await c.query(`create table usuarios (id bigserial primary key, telefono text not null unique, usuario text unique, nombre text not null, clave_hash text not null, roles text[] not null default '{cliente}', municipio text, activo boolean not null default true, creado timestamptz not null default now());
                 create table negocios (id text primary key, nombre text not null, categoria text not null, municipio text not null default 'Hatillo de Loba', zona_id text, direccion text, lat double precision, lng double precision, telefono text, nequi text, mensualidad integer not null default 70000, comision_pct numeric(5,2) not null default 10, aprobado boolean not null default true, creado timestamptz not null default now());
                 insert into negocios(id,nombre,categoria) values ('viejo','Negocio viejo','tienda');
                 create table pedidos (id bigserial primary key, numero integer, negocio_id text not null references negocios(id), cliente_id bigint, cliente_nombre text, cliente_tel text, items jsonb not null default '[]', subtotal integer not null default 0, domicilio integer not null default 0, descuento integer not null default 0, total integer not null default 0, modo text not null default 'domicilio', zona_id text, direccion text, lat double precision, lng double precision, pago text not null default 'efectivo', estado text not null default 'recibido', creado timestamptz not null default now(), actualizado timestamptz not null default now());
                 insert into pedidos(numero, negocio_id, subtotal, total) values (1,'viejo',10000,10000),(2,'viejo',20000,20000);`);
  await c.end();
  usarEnviador(async (sub) => { pushEnviados.push(sub.endpoint); });
  await iniciarApi({ url: URL_DB, vencimientoMs: 0 });
  await sembrar({ conOferta: false });
  srv = await iniciar(PUERTO);
  T.admin = await entrar('admin'); T.rancho = await entrar('rancho'); T.danto = await entrar('danto');
  T.yeison = await entrar('yeison'); T.maria = await entrar('maria'); T.drog = await entrar('drogueria');
  T.dantoId = (await uno(`select id from usuarios where usuario='danto'`)).id;
  T.yeisonId = (await uno(`select id from usuarios where usuario='yeison'`)).id;
});
after(async () => { cerrarTodo(); srv && srv.close(); await cerrar(); });

test('Migración segura: los pedidos que ya existían quedan intactos y con origen', async () => {
  const r = await q(`select numero, total, origen from pedidos where negocio_id='viejo' order by numero`);
  assert.deepEqual(r.rows, [{ numero: 1, total: 10000, origen: 'lobamall' }, { numero: 2, total: 20000, origen: 'lobamall' }]);
  assert.deepEqual(await migrar({ silencioso: true }), [], 'correr las migraciones de nuevo no hace nada');
  await assert.rejects(q(`insert into pedidos(negocio_id, origen) values ('viejo','otro')`), /pedidos_origen_chk/);
});

test('Sin el encabezado X-Lainec las escrituras se rechazan', async () => {
  const r = await fetch(BASE + '/api/auth/entrar', { method: 'POST', body: '{}' });
  assert.equal(r.status, 403);
});

test('Límite de intentos: la clave mala se bloquea al sexto intento', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await api(null, 'POST', '/api/auth/entrar', { usuario: 'juan', clave: 'mala' })).status, 401);
  assert.equal((await api(null, 'POST', '/api/auth/entrar', { usuario: 'juan', clave: 'mala' })).status, 429);
  reiniciarLimites();
});

test('Registro: exige autorización de Habeas Data y valida placa y cédula repetidas', async () => {
  const base = { nombre_completo: 'Luis Ortega Díaz', cedula: '1047400999', placa: 'LOB99Z', moto_marca: 'Honda CB', moto_color: 'Gris', telefono: '3017778899', nequi: '3017778899', zona_id: 'hatillo', clave: '1234', foto: FOTO, cedula_foto: FOTO, pase_foto: FOTO };
  let r = await api(null, 'POST', '/api/repartidor/solicitud', { ...base });
  assert.equal(r.status, 400); assert.equal(r.body.codigo, 'habeas_data');
  r = await api(null, 'POST', '/api/repartidor/solicitud', { ...base, habeas_data: true, placa: 'htl-12a', telefono: '3017770000', nequi: '3017770000' });
  assert.equal(r.status, 409, 'placa de Danto repetida (aunque se escriba distinto)'); assert.equal(r.body.codigo, 'placa_repetida');
  r = await api(null, 'POST', '/api/repartidor/solicitud', { ...base, habeas_data: true, cedula: '1047400111', telefono: '3017770001', nequi: '3017770001' });
  assert.equal(r.status, 409); assert.equal(r.body.codigo, 'cedula_repetida');
  r = await api(null, 'POST', '/api/repartidor/solicitud', { ...base, habeas_data: true });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.estado, 'pendiente');
  assert.deepEqual(r.body.usuario.roles.sort(), ['cliente', 'repartidor'], 'una sola cuenta: sigue siendo cliente');
  T.luis = r.body.token || (await entrar('3017778899'));
  T.luisId = r.body.usuario.id;
});

test('Repartidor NO aprobado: no ve ofertas, no se conecta, no acepta y no recibe avisos', async () => {
  const tl = T.luis;
  for (const [m, ruta, b] of [['GET', '/api/repartidor/ofertas'], ['PUT', '/api/repartidor/conectado', { conectado: true }], ['POST', '/api/repartidor/ofertas/1/aceptar']]) {
    const r = await api(tl, m, ruta, b);
    assert.equal(r.status, 403, ruta); assert.equal(r.body.codigo, 'no_aprobado', ruta);
  }
  // Aunque en la base lo pongan conectado a la fuerza, el filtro del servidor no le avisa
  await q('update repartidores set conectado=true where usuario_id=$1', [T.yeisonId]);
  const sse = escuchar(T.yeison); await esperar(150);
  const n0 = bitacora.length;
  const of = await nuevaOferta(T.rancho);
  await esperar(200);
  assert.ok(!bitacora.slice(n0).some(x => x.usuarioId === T.yeisonId), 'yeison (pendiente) no debe recibir notificación');
  assert.ok(!sse.eventos.some(e => e.evento === 'oferta_nueva'), 'yeison no recibe la oferta en tiempo real');
  assert.ok(bitacora.slice(n0).some(x => x.usuarioId === T.dantoId), 'danto (aprobado y conectado) sí la recibe');
  sse.cerrar();
  await api(T.rancho, 'POST', `/api/negocio/rancho/ofertas/${of.oferta.id}/cancelar`, { motivo: 'prueba' });
});

test('Admin aprueba (y rechaza con motivo obligatorio)', async () => {
  let r = await api(T.danto, 'POST', `/api/admin/repartidores/${T.luisId}/aprobar`);
  assert.equal(r.status, 403, 'un repartidor no puede aprobarse');
  r = await api(T.admin, 'POST', `/api/admin/repartidores/${T.yeisonId}/rechazar`, { motivo: '' });
  assert.equal(r.status, 400);
  r = await api(T.admin, 'GET', '/api/admin/solicitudes?estado=pendiente');
  assert.ok(r.body.solicitudes.some(s => s.usuario_id === T.luisId));
  r = await api(T.admin, 'POST', `/api/admin/repartidores/${T.luisId}/aprobar`);
  assert.equal(r.status, 200);
  assert.equal((await api(T.luis, 'PUT', '/api/repartidor/conectado', { conectado: true })).status, 200);
});

test('Aceptación simultánea: de 2 repartidores solo uno gana (10 rondas)', async () => {
  const sseD = escuchar(T.danto), sseL = escuchar(T.luis); await esperar(150);
  for (let i = 0; i < 10; i++) {
    const { oferta } = await nuevaOferta(T.rancho);
    const [a, b] = await Promise.all([
      api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/aceptar`),
      api(T.luis, 'POST', `/api/repartidor/ofertas/${oferta.id}/aceptar`)
    ]);
    const st = [a.status, b.status].sort();
    assert.deepEqual(st, [200, 409], `ronda ${i}: ${a.status}/${b.status} ${JSON.stringify([a.body, b.body])}`);
    const perdedor = a.status === 409 ? a : b;
    assert.equal(perdedor.body.error, 'Esta oferta ya fue tomada.');
    const fila = await uno('select estado, repartidor_id from ofertas_domicilio where id=$1', [oferta.id]);
    assert.equal(fila.estado, 'aceptada');
    assert.ok([T.dantoId, T.luisId].includes(fila.repartidor_id));
    await api(T.rancho, 'POST', `/api/negocio/rancho/ofertas/${oferta.id}/cancelar`, { motivo: 'ronda de prueba' });
  }
  await esperar(150);
  assert.ok(sseD.eventos.filter(e => e.evento === 'oferta_retirada').length >= 10, 'la tarjeta desaparece en tiempo real');
  sseD.cerrar(); sseL.cerrar();
});

test('Modo cliente: el servidor NO envía avisos de domicilio y conserva "conectado"', async () => {
  pushEnviados.length = 0;
  await q(`insert into suscripciones_push(usuario_id, endpoint, p256dh, auth) values ($1,'https://push.ejemplo/danto','k','a') on conflict do nothing`, [T.dantoId]);
  let r = await api(T.danto, 'PUT', '/api/repartidor/modo', { modo: 'cliente' });
  assert.equal(r.status, 200); assert.equal(r.body.modo_actual, 'cliente'); assert.equal(r.body.conectado, true);
  const sse = escuchar(T.danto); await esperar(150);
  const n0 = bitacora.length;
  const { oferta } = await nuevaOferta(T.rancho);
  await esperar(250);
  assert.ok(!bitacora.slice(n0).some(x => x.usuarioId === T.dantoId), 'sin notificación en la app');
  assert.ok(!pushEnviados.includes('https://push.ejemplo/danto'), 'sin Web Push');
  assert.ok(!sse.eventos.some(e => e.evento === 'oferta_nueva'), 'sin evento en tiempo real');
  assert.equal((await api(T.danto, 'GET', '/api/repartidor/ofertas')).status, 409, 'la cartelera no se entrega en modo cliente');
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/aceptar`)).body.codigo, 'modo_cliente');
  r = await api(T.danto, 'PUT', '/api/repartidor/modo', { modo: 'trabajo' });
  assert.equal(r.body.conectado, true, 'vuelve conectado como estaba');
  r = await api(T.danto, 'GET', '/api/repartidor/ofertas');
  assert.ok(r.body.ofertas.some(o => o.id === oferta.id), 'al volver, la oferta sigue en la cartelera');
  sse.cerrar();
  await api(T.rancho, 'POST', `/api/negocio/rancho/ofertas/${oferta.id}/cancelar`, { motivo: 'prueba' });
});

test('Con un domicilio en curso no puede cambiar a modo cliente', async () => {
  const { oferta } = await nuevaOferta(T.rancho);
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/aceptar`)).status, 200);
  const r = await api(T.danto, 'PUT', '/api/repartidor/modo', { modo: 'cliente' });
  assert.equal(r.status, 409); assert.equal(r.body.codigo, 'domicilio_en_curso');
  assert.match(r.body.error, /Entrégalo antes/);
  assert.equal((await uno('select modo_actual from repartidores where usuario_id=$1', [T.dantoId])).modo_actual, 'trabajo');
  T.ofertaEnCurso = oferta.id;
});

test('Flujo completo: recogí → en camino → entregado con foto; caja y ganancias', async () => {
  const id = T.ofertaEnCurso;
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${id}/entregar`, { foto: FOTO })).status, 409, 'no se salta pasos');
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${id}/estado`, { estado: 'recogida' })).status, 200);
  assert.equal((await api(T.danto, 'POST', '/api/repartidor/ubicacion', { lat: 8.9558, lng: -74.0770 })).status, 200);
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${id}/estado`, { estado: 'en_camino' })).status, 200);
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${id}/entregar`, {})).status, 400, 'la foto es obligatoria');
  const r = await api(T.danto, 'POST', `/api/repartidor/ofertas/${id}/entregar`, { foto: FOTO, lat: 8.955, lng: -74.079 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.ganancias.hoy_n, 1); assert.equal(r.body.ganancias.hoy, 4000);
  const caja = await api(T.rancho, 'GET', '/api/negocio/rancho/caja');
  const s = caja.body.saldos.find(x => x.repartidor_id === T.dantoId);
  assert.equal(s.saldo, 25000, 'cobró $29.000 en efectivo, se queda $4.000 y le debe $25.000 al negocio');
  assert.equal((await api(T.danto, 'POST', '/api/repartidor/ubicacion', { lat: 8.9, lng: -74 })).status, 409, 'sin domicilio no se envía ubicación');
  assert.equal((await api(T.rancho, 'POST', '/api/negocio/rancho/caja/liquidar', { repartidor_id: T.dantoId, tipo: 'recibi', monto: 25000 })).status, 200);
  assert.equal((await api(T.rancho, 'GET', '/api/negocio/rancho/caja')).body.saldos.find(x => x.repartidor_id === T.dantoId).saldo, 0);
});

test('Un repartidor no puede tomar el domicilio de un pedido que él mismo hizo', async () => {
  const p = await api(T.danto, 'POST', '/api/pedidos', { negocio_id: 'rancho', items: [{ id: 'sancocho', n: 'Sancocho de gallina', q: 1, p: 18000 }], modo: 'domicilio', zona_id: 'hatillo', direccion: 'Casa de Danto', pago: 'efectivo' });
  assert.equal(p.status, 200); assert.equal(p.body.pedido.origen, 'lobamall'); assert.equal(p.body.pedido.domicilio, 4000, 'tarifa tomada de la tabla de zonas');
  const n0 = bitacora.length;
  const o = await api(T.rancho, 'POST', '/api/negocio/rancho/ofertas', { pedido_id: p.body.pedido.id });
  assert.equal(o.status, 200);
  await esperar(150);
  assert.ok(!bitacora.slice(n0).some(x => x.usuarioId === T.dantoId), 'no le avisa de su propio pedido');
  assert.ok(!(await api(T.danto, 'GET', '/api/repartidor/ofertas')).body.ofertas.some(x => x.id === o.body.oferta.id), 'no aparece en su cartelera');
  const r = await api(T.danto, 'POST', `/api/repartidor/ofertas/${o.body.oferta.id}/aceptar`);
  assert.equal(r.status, 403); assert.equal(r.body.codigo, 'pedido_propio');
  assert.equal((await api(T.luis, 'POST', `/api/repartidor/ofertas/${o.body.oferta.id}/aceptar`)).status, 200, 'otro repartidor sí puede');
  T.ofertaLuis = o.body.oferta.id; T.pedidoDanto = p.body.pedido.id;
});

test('Cancelación del repartidor: la oferta vuelve a la cartelera con el motivo registrado', async () => {
  let r = await api(T.luis, 'POST', `/api/repartidor/ofertas/${T.ofertaLuis}/cancelar`, { motivo: '' });
  assert.equal(r.status, 400, 'motivo obligatorio');
  r = await api(T.luis, 'POST', `/api/repartidor/ofertas/${T.ofertaLuis}/cancelar`, { motivo: 'Se me pinchó la llanta' });
  assert.equal(r.status, 200);
  const o = await uno('select estado, repartidor_id, intento from ofertas_domicilio where id=$1', [T.ofertaLuis]);
  assert.deepEqual(o, { estado: 'abierta', repartidor_id: null, intento: 2 });
  const h = await uno(`select detalle from ofertas_historial where oferta_id=$1 and evento='cancelada_por_repartidor'`, [T.ofertaLuis]);
  assert.equal(h.detalle.motivo, 'Se me pinchó la llanta');
  // El cliente (Danto) cancela su propio pedido mientras nadie lo ha recogido
  r = await api(T.danto, 'POST', `/api/pedidos/${T.pedidoDanto}/cancelar`, { motivo: 'Ya no lo necesito' });
  assert.equal(r.status, 200);
  assert.equal((await uno('select estado, cancelada_por from ofertas_domicilio where id=$1', [T.ofertaLuis])).cancelada_por, 'cliente');
});

test('Vencimiento: si nadie acepta, se avisa al negocio y puede subir el valor', async () => {
  const { oferta } = await nuevaOferta(T.rancho);
  await q(`update ofertas_domicilio set vence_en = now() - interval '1 second' where id=$1`, [oferta.id]);
  assert.ok(await vencerOfertas() >= 1);
  assert.equal((await uno('select estado from ofertas_domicilio where id=$1', [oferta.id])).estado, 'vencida');
  const ranchoId = (await uno(`select id from usuarios where usuario='rancho'`)).id;
  assert.ok(await uno(`select 1 from notificaciones where usuario_id=$1 and tipo='oferta_vencida' and datos->>'oferta_id'=$2`, [ranchoId, String(oferta.id)]));
  assert.equal((await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/aceptar`)).body.error, 'Esta oferta ya venció.');
  const r = await api(T.rancho, 'POST', `/api/negocio/rancho/ofertas/${oferta.id}/reintentar`, { valor: 6000 });
  assert.equal(r.status, 200); assert.equal(r.body.oferta.valor, 6000); assert.equal(r.body.oferta.estado, 'abierta');
  await api(T.rancho, 'POST', `/api/negocio/rancho/ofertas/${oferta.id}/cancelar`, { motivo: 'fin de prueba' });
  // Un mismo aviso no se duplica (reconexión)
  const antes = (await uno('select count(*) n from notificaciones')).n;
  await vencerOfertas();
  assert.equal((await uno('select count(*) n from notificaciones')).n, antes);
});

test('Archivos privados: la cédula solo la ven el admin y el propio repartidor', async () => {
  const r = await uno('select cedula_foto_id, pase_foto_id from repartidores where usuario_id=$1', [T.dantoId]);
  assert.equal((await api(null, 'GET', `/api/archivos/${r.cedula_foto_id}`)).status, 401);
  assert.equal((await api(T.maria, 'GET', `/api/archivos/${r.cedula_foto_id}`)).status, 403);
  assert.equal((await api(T.rancho, 'GET', `/api/archivos/${r.pase_foto_id}`)).status, 403);
  assert.equal((await api(T.danto, 'GET', `/api/archivos/${r.cedula_foto_id}`)).status, 200);
  assert.equal((await api(T.admin, 'GET', `/api/archivos/${r.pase_foto_id}`)).status, 200);
});

test('Permisos de negocio: la droguería no puede tocar las ofertas del Rancho', async () => {
  assert.equal((await api(T.drog, 'GET', '/api/negocio/rancho/caja')).status, 403);
  assert.equal((await api(T.maria, 'POST', '/api/negocio/rancho/ofertas', { pedido: {} })).status, 403);
  assert.equal((await api(T.rancho, 'PUT', '/api/admin/zonas/hatillo', { tarifa: 1 })).status, 403);
});

test('Tarifas por zona editables por el admin y usadas en nuevas ofertas', async () => {
  assert.equal((await api(T.admin, 'PUT', '/api/admin/zonas/chimi', { nombre: 'Chimí', municipio: 'Hatillo de Loba', tipo: 'vereda', tarifa: 9000, distancia_ref_km: 6 })).status, 200);
  const r = await nuevaOferta(T.rancho, { zona_id: 'chimi' });
  assert.equal(r.oferta.valor, 9000);
  assert.ok(r.oferta.distancia_km > 0 && r.oferta.minutos > 0);
  await api(T.rancho, 'POST', `/api/negocio/rancho/ofertas/${r.oferta.id}/cancelar`, { motivo: 'fin' });
});

test('Nequi manual: el cliente sube el comprobante y el negocio lo confirma', async () => {
  const p = await api(T.maria, 'POST', '/api/pedidos', { negocio_id: 'drogueria', items: [{ id: 'suero', n: 'Suero oral x2', q: 1, p: 7000 }], modo: 'domicilio', zona_id: 'hatillo', direccion: 'Calle 3', pago: 'nequi' });
  assert.equal((await api(T.maria, 'POST', `/api/pedidos/${p.body.pedido.id}/comprobante`, { foto: FOTO })).status, 200);
  const pend = await api(T.drog, 'GET', '/api/negocio/drogueria/pagos');
  const pago = pend.body.pagos.find(x => x.pedido_id === p.body.pedido.id);
  assert.ok(pago && pago.comprobante_id);
  assert.equal((await api(T.drog, 'GET', `/api/archivos/${pago.comprobante_id}`)).status, 200, 'el negocio ve el comprobante');
  assert.equal((await api(T.rancho, 'GET', `/api/archivos/${pago.comprobante_id}`)).status, 403, 'otro negocio no');
  assert.equal((await api(T.drog, 'POST', `/api/negocio/drogueria/pagos/${pago.id}/confirmar`)).status, 200);
});

test('Comisión del 10 % solo sobre pedidos con origen Lainec', async () => {
  const { oferta } = await nuevaOferta(T.rancho, { origen: 'directo', items: [{ id: 'mojarra', n: 'Mojarra', q: 1, p: 30000 }] });
  await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/aceptar`);
  await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/estado`, { estado: 'recogida' });
  await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/estado`, { estado: 'en_camino' });
  await api(T.danto, 'POST', `/api/repartidor/ofertas/${oferta.id}/entregar`, { foto: FOTO });
  const r = await api(T.admin, 'GET', '/api/admin/comisiones');
  const f = r.body.filas.find(x => x.negocio_id === 'rancho');
  assert.equal(f.ventas_lobamall, 25000, 'solo el pedido entregado que vino por la app');
  assert.equal(f.ventas_directas, 30000);
  assert.equal(f.comision, 2500);
});

test('Productos: código automático, búsqueda pública y QR sin sesión', async () => {
  const r = await api(T.rancho, 'POST', '/api/negocio/rancho/productos', { id: 'np-prueba', nombre: 'Bollo de yuca', categoria: 'Almuerzos', precio: 2000, stock: 30, ubicacion: 'Vitrina de la entrada' });
  assert.equal(r.status, 200); assert.match(r.body.producto.codigo, /^RC-\d{4}$/);
  const c = await api(null, 'GET', `/api/productos/codigo/${r.body.producto.codigo.toLowerCase()}`);
  assert.equal(c.status, 200); assert.equal(c.body.producto.ubicacion, 'Vitrina de la entrada');
  assert.equal(c.body.producto.foto, null, 'sin foto profesional todavía');
  assert.equal((await api(T.rancho, 'POST', '/api/productos/np-prueba/foto', { foto: FOTO })).status, 200);
  assert.match((await api(null, 'GET', `/api/productos/codigo/${r.body.producto.codigo}`)).body.producto.foto, /^\/api\/archivos\/\d+$/);
  assert.ok((await api(null, 'GET', '/api/productos/buscar?q=bollo')).body.productos.length >= 1);
  assert.equal((await api(T.drog, 'POST', '/api/negocio/rancho/productos', { nombre: 'X' })).status, 403);
});

test('Calificaciones: el cliente califica negocio y repartidor; el promedio sale en el perfil', async () => {
  const p = await api(T.maria, 'POST', '/api/pedidos', { negocio_id: 'rancho', items: [{ id: 'asado', n: 'Asado Especial', q: 1, p: 25000 }], modo: 'domicilio', zona_id: 'hatillo', direccion: 'Calle 5', pago: 'fiado' });
  const o = await api(T.rancho, 'POST', '/api/negocio/rancho/ofertas', { pedido_id: p.body.pedido.id });
  const id = o.body.oferta.id;
  assert.equal((await api(T.maria, 'POST', `/api/pedidos/${p.body.pedido.id}/calificar`, { negocio: 5, repartidor: 4 })).status, 409, 'antes de entregar no se califica');
  await api(T.luis, 'POST', `/api/repartidor/ofertas/${id}/aceptar`);
  await api(T.luis, 'POST', `/api/repartidor/ofertas/${id}/estado`, { estado: 'recogida' });
  await api(T.luis, 'POST', `/api/repartidor/ofertas/${id}/estado`, { estado: 'en_camino' });
  assert.equal((await api(T.luis, 'POST', `/api/repartidor/ofertas/${id}/entregar`, { foto: FOTO })).status, 200);
  const seg = await api(T.maria, 'GET', `/api/pedidos/${p.body.pedido.id}/seguimiento`);
  assert.equal(seg.body.domicilio.estado, 'entregada');
  assert.equal((await api(T.maria, 'GET', `/api/archivos/${seg.body.domicilio.evidencia_id}`)).status, 200, 'el cliente ve la foto de evidencia');
  assert.equal((await api(T.drog, 'GET', `/api/archivos/${seg.body.domicilio.evidencia_id}`)).status, 403);
  // Fiado: el negocio le debe el domicilio al repartidor y el pago queda pendiente en la cuenta del cliente
  const caja = await api(T.rancho, 'GET', '/api/negocio/rancho/caja');
  assert.equal(caja.body.saldos.find(x => x.repartidor_id === T.luisId).saldo, -4000);
  assert.equal(seg.body.pagos.find(x => x.metodo === 'fiado').estado, 'pendiente');
  assert.equal((await api(T.maria, 'POST', `/api/pedidos/${p.body.pedido.id}/calificar`, { negocio: 5, repartidor: 4, comentario: 'Bien' })).status, 200);
  const yo = await api(T.luis, 'GET', '/api/repartidor/yo');
  assert.equal(yo.body.repartidor.promedio, 4);
  assert.equal(yo.body.repartidor.calificaciones, 1);
  assert.equal((await api(T.juan || await entrar('juan'), 'POST', `/api/pedidos/${p.body.pedido.id}/calificar`, { negocio: 1 })).status, 403, 'nadie más califica ese pedido');
});

test('Mesa de billar: QR de un solo uso, jugadores, chicos, extras y factura por jugador', async () => {
  const mesera = await entrar('billar-cajero'), juan = await entrar('juan');
  let r = await api(T.maria, 'POST', '/api/negocio/billar/mesas', { mesa: 'Mesa 1', juego: 'Bola 8', cobro: 'chico', valor: 2000 });
  assert.equal(r.status, 403, 'un cliente no abre mesas');
  r = await api(mesera, 'POST', '/api/negocio/billar/mesas', { mesa: 'Mesa 1', juego: 'Bola 8', cobro: 'chico', valor: 2000 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const m = r.body.mesa, token = m.token;
  assert.ok(token && token.length >= 10);
  assert.equal((await api(mesera, 'POST', '/api/negocio/billar/mesas', { mesa: 'Mesa 1', cobro: 'chico', valor: 2000 })).body.codigo, 'mesa_abierta', 'la misma mesa no se abre dos veces');
  assert.equal((await api(null, 'POST', '/api/mesas/unirse', { token })).status, 401, 'hay que tener cuenta de cliente');
  const sse = escuchar(T.maria); await esperar(150);
  const a = await api(T.maria, 'POST', '/api/mesas/unirse', { token });
  const b = await api(juan, 'POST', '/api/mesas/unirse', { token });
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal((await api(T.maria, 'POST', '/api/mesas/unirse', { token })).body.mesa.jugadores.length, 2, 'escanear dos veces no duplica al jugador');
  const jm = a.body.mesa.yo_id, jj = b.body.mesa.yo_id;
  // Juan pierde 2 chicos, María pierde 1
  for (const [g, p] of [[jm, jj], [jm, jj], [jj, jm]]) assert.equal((await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/chico`, { ganador: g, perdedor: p })).status, 200);
  await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/extra`, { producto_id: 'cerveza1', cantidad: 2, para: jj });           // 2 cervezas para Juan: 7.000
  await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/extra`, { descripcion: 'Ronda de gaseosas', valor: 6000 });           // para todos: 3.000 c/u
  // María pide desde su celular: queda pendiente hasta que la mesera la acepte
  const ped = await api(T.maria, 'POST', `/api/mesas/${m.id}/pedir`, { producto_id: 'picada', cantidad: 1 });
  assert.equal(ped.status, 200);
  let v = (await api(T.maria, 'GET', `/api/mesas/${m.id}`)).body.mesa;
  assert.equal(v.jugadores.find(x => x.id === jm).total, 2000 + 3000, 'lo pendiente no se cobra todavía');
  assert.equal((await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/cerrar`, {})).body.codigo, 'pendientes', 'no cierra con pedidos sin revisar');
  const pend = v.eventos.find(e => e.estado === 'pendiente');
  await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/eventos/${pend.id}/aceptar`);
  v = (await api(T.maria, 'GET', `/api/mesas/${m.id}`)).body.mesa;
  const tm = v.jugadores.find(x => x.id === jm), tj = v.jugadores.find(x => x.id === jj);
  assert.deepEqual([tm.ganados, tm.perdidos, tm.total], [2, 1, 2000 + 3000 + 22000]);
  assert.deepEqual([tj.ganados, tj.perdidos, tj.total], [1, 2, 4000 + 7000 + 3000]);
  assert.equal(v.total, 41000);
  await esperar(200);
  assert.ok(sse.eventos.filter(e => e.evento === 'mesa').length >= 5, 'a María le llegan los cambios en vivo');
  sse.cerrar();
  // Cierra: paga solo el que más perdió (Juan)
  r = await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/cerrar`, { forma: 'uno' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.mesa.factura.pagos.map(x => x.paga).sort((x, y) => x - y), [0, 41000]);
  assert.equal(r.body.mesa.factura.pagos.find(x => x.paga > 0).jugador_id, jj);
  // El código ya se usó
  const otro = await entrar('juan');
  assert.equal((await api(otro, 'POST', '/api/mesas/unirse', { token })).status, 410);
  assert.equal((await api(mesera, 'POST', `/api/negocio/billar/mesas/${m.id}/chico`, { ganador: jm, perdedor: jj })).status, 409, 'una mesa cerrada no se toca');
  // La misma mesa se vuelve a abrir con un código DIFERENTE
  const n2 = await api(mesera, 'POST', '/api/negocio/billar/mesas', { mesa: 'Mesa 1', juego: 'Tres bandas', cobro: 'tiempo', valor: 8000 });
  assert.notEqual(n2.body.mesa.token, token);
  assert.equal((await api(T.drog, 'GET', `/api/mesas/${n2.body.mesa.id}`)).status, 403, 'quien no escaneó no ve la mesa');
});

test('Mesa de restaurante: comensales, comanda a la cocina y partes iguales', async () => {
  const r = await api(T.rancho, 'POST', '/api/negocio/rancho/mesas', { tipo: 'restaurante', mesa: 'Mesa 4', personas: 3 });
  const m = r.body.mesa;
  assert.equal(m.cobro, 'consumo');
  await api(T.rancho, 'POST', `/api/negocio/rancho/mesas/${m.id}/jugadores`, { nombre: 'Señor de la gorra' });
  const j = (await api(T.maria, 'POST', '/api/mesas/unirse', { token: m.token })).body.mesa.yo_id;
  const x = await api(T.rancho, 'POST', `/api/negocio/rancho/mesas/${m.id}/extra`, { producto_id: 'asado', cantidad: 1, para: j });
  const ev = x.body.mesa.eventos[0];
  assert.equal(ev.cocina, 'en_cocina');
  await api(T.rancho, 'POST', `/api/negocio/rancho/mesas/${m.id}/eventos/${ev.id}/servido`);
  await api(T.rancho, 'POST', `/api/negocio/rancho/mesas/${m.id}/extra`, { descripcion: 'Jarra de limonada', valor: 9001 });
  const c = await api(T.rancho, 'POST', `/api/negocio/rancho/mesas/${m.id}/cerrar`, { forma: 'iguales' });
  assert.equal(c.body.mesa.factura.total, 30000 + 9001);
  assert.deepEqual(c.body.mesa.factura.pagos.map(p => p.paga), [19501, 19500], 'partes iguales sin perder un peso');
});
