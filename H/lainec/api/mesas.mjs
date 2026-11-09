// Lainec · MESAS EN VIVO con código QR de un solo uso
// Billar: la mesera configura la mesa (juego, cobro por chico o por tiempo), la inicia y sale un QR.
// Los jugadores (clientes de Lainec) lo escanean y ven en su celular el marcador, lo que llevan
// y la cuenta. Restaurante / asadero: igual, pero con comensales y comanda a la cocina.
// Al cerrar la mesa se hace la factura de cada uno y ese código ya no sirve más.
import { randomBytes } from 'node:crypto';
import { q, uno, filas, tx } from './db.mjs';
import * as rt from './tiempo-real.mjs';
import { usuariosNegocio } from './notificaciones.mjs';
import { ruta, falla, requiereSesion, requiereNegocio, txt, entero } from './rutas.mjs';

const r500 = v => Math.round(v / 500) * 500;
// Reparte un valor en n partes enteras; lo que sobra va a los primeros (nadie paga centavos de más)
function repartir(valor, n) {
  if (n <= 0) return [];
  const base = Math.floor(valor / n), resto = valor - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

/* ---------------- la cuenta de cada jugador ---------------- */
export function calcular(s, jugadores, eventos, ahora = Date.now()) {
  const J = jugadores.map(j => ({ id: Number(j.id), nombre: j.nombre, usuario_id: j.usuario_id ? Number(j.usuario_id) : null, sin_app: !j.usuario_id, ganados: 0, perdidos: 0, valor_chicos: 0, tiempo: 0, extras: [], valor_extras: 0, total: 0 }));
  const porId = Object.fromEntries(J.map(j => [j.id, j]));
  const validos = eventos.filter(e => e.estado === 'ok');
  let sinRepartir = 0;
  for (const e of validos.filter(e => e.tipo === 'chico')) {
    if (porId[e.ganador_id]) porId[e.ganador_id].ganados++;
    if (porId[e.perdedor_id]) { porId[e.perdedor_id].perdidos++; porId[e.perdedor_id].valor_chicos += s.valor; }
  }
  const fin = s.cerrada_en ? new Date(s.cerrada_en).getTime() : ahora;
  const minutos = Math.max(0, Math.round((fin - new Date(s.abierta_en).getTime()) / 60000));
  const valorTiempo = s.cobro === 'tiempo' ? r500(s.valor * minutos / 60) : 0;
  if (valorTiempo) { if (J.length) repartir(valorTiempo, J.length).forEach((v, i) => J[i].tiempo = v); else sinRepartir += valorTiempo; }
  for (const e of validos.filter(e => e.tipo === 'extra')) {
    const monto = Math.round(Number(e.cantidad) * e.valor_unit);
    const item = { id: Number(e.id), descripcion: e.descripcion, cantidad: Number(e.cantidad), monto };
    if (e.para_jugador_id && porId[e.para_jugador_id]) { porId[e.para_jugador_id].extras.push(item); porId[e.para_jugador_id].valor_extras += monto; }
    else if (J.length) repartir(monto, J.length).forEach((v, i) => { J[i].extras.push({ ...item, monto: v, compartido: true }); J[i].valor_extras += v; });
    else sinRepartir += monto;
  }
  J.forEach(j => j.total = j.valor_chicos + j.tiempo + j.valor_extras);
  const total = J.reduce((a, j) => a + j.total, 0) + sinRepartir;
  return { jugadores: J, minutos, valor_tiempo: valorTiempo, total };
}

// Cómo se paga al cerrar: cada uno lo suyo, uno solo paga todo (ej. el que perdió) o partes iguales
export function factura(cuenta, forma, pagadorId) {
  const J = cuenta.jugadores;
  if (!J.length) return [{ nombre: 'Mesa', paga: cuenta.total }];
  if (forma === 'uno') {
    const p = J.find(j => j.id === Number(pagadorId)) || J.slice().sort((a, b) => b.perdidos - a.perdidos)[0];
    return J.map(j => ({ jugador_id: j.id, nombre: j.nombre, paga: j.id === p.id ? cuenta.total : 0 }));
  }
  if (forma === 'iguales') { const v = repartir(cuenta.total, J.length); return J.map((j, i) => ({ jugador_id: j.id, nombre: j.nombre, paga: v[i] })); }
  return J.map(j => ({ jugador_id: j.id, nombre: j.nombre, paga: j.total }));
}

/* ---------------- lectura ---------------- */
async function cargar(id) {
  const s = await uno(`select m.*, n.nombre as negocio_nombre from mesas_sesiones m join negocios n on n.id=m.negocio_id where m.id=$1`, [id]);
  if (!s) return null;
  const jugadores = await filas('select * from mesas_jugadores where sesion_id=$1 order by id', [id]);
  const eventos = await filas('select * from mesas_eventos where sesion_id=$1 order by id', [id]);
  return { s, jugadores, eventos };
}
function vista(d, { staff = false, usuario = null } = {}) {
  const { s, jugadores, eventos } = d;
  const c = calcular(s, jugadores, eventos);
  const nombre = id => (jugadores.find(j => Number(j.id) === Number(id)) || {}).nombre || 'Todos';
  const yo = usuario ? c.jugadores.find(j => j.usuario_id === usuario.id) : null;
  return {
    id: Number(s.id), negocio_id: s.negocio_id, negocio: s.negocio_nombre, tipo: s.tipo, mesa: s.mesa, juego: s.juego, cobro: s.cobro, valor: s.valor,
    estado: s.estado, abierta_en: s.abierta_en, cerrada_en: s.cerrada_en, personas: s.personas, token: staff && s.estado === 'abierta' ? s.token : undefined,
    minutos: c.minutos, valor_tiempo: c.valor_tiempo, total: c.total, jugadores: c.jugadores.map(j => ({ ...j, yo: !!(yo && yo.id === j.id) })),
    yo_id: yo ? yo.id : null,
    eventos: eventos.filter(e => e.estado !== 'anulado').slice(-60).map(e => ({
      id: Number(e.id), tipo: e.tipo, estado: e.estado, cocina: e.cocina, creado: e.creado,
      texto: e.tipo === 'chico' ? `${nombre(e.ganador_id)} le ganó a ${nombre(e.perdedor_id)}` : `${Number(e.cantidad)} × ${e.descripcion} · para ${e.para_jugador_id ? nombre(e.para_jugador_id) : 'todos'}`,
      monto: e.tipo === 'chico' ? s.valor : Math.round(Number(e.cantidad) * e.valor_unit), pedido_por: e.pedido_por ? nombre(e.pedido_por) : null
    })),
    forma_pago: s.forma_pago, factura: s.factura
  };
}
// Avisa a todos los que están mirando la mesa (jugadores con app + personal del negocio)
async function avisar(id, motivo) {
  const d = await cargar(id);
  const v = vista(d);
  const ids = new Set([...(await usuariosNegocio(d.s.negocio_id)), ...d.jugadores.filter(j => j.usuario_id).map(j => Number(j.usuario_id))]);
  for (const u of ids) rt.enviar(u, 'mesa', { motivo, mesa: v });
  return v;
}
async function mesaDelNegocio(nid, id) {
  const s = await uno('select * from mesas_sesiones where id=$1 and negocio_id=$2', [entero(id), nid]);
  if (!s) falla(404, 'no_existe', 'Esa mesa no existe.');
  return s;
}
const abierta = s => { if (s.estado !== 'abierta') falla(409, 'cerrada', 'Esa mesa ya se cerró.'); };

/* ---------------- personal del negocio (mesera, cajero, dueño) ---------------- */
ruta('POST', '/api/negocio/:nid/mesas', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const tipo = b.tipo === 'restaurante' ? 'restaurante' : 'billar';
  const cobro = tipo === 'restaurante' ? 'consumo' : (b.cobro === 'tiempo' ? 'tiempo' : 'chico');
  const mesa = txt(b.mesa, 30); if (!mesa) falla(400, 'mesa', 'Indica la mesa.');
  const valor = tipo === 'restaurante' ? 0 : Math.max(0, entero(b.valor));
  if (tipo === 'billar' && !valor) falla(400, 'valor', cobro === 'chico' ? 'Escribe cuánto vale cada chico.' : 'Escribe cuánto vale la hora.');
  const token = randomBytes(9).toString('base64url');
  const s = await q(`insert into mesas_sesiones(negocio_id, tipo, mesa, juego, cobro, valor, token, personas, abierta_por) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [p.nid, tipo, mesa, txt(b.juego, 40) || null, cobro, valor, token, entero(b.personas) || null, u.id])
    .catch(e => { if (e.code === '23505') falla(409, 'mesa_abierta', `La ${mesa} ya está abierta.`); throw e; });
  const v = vista(await cargar(s.rows[0].id), { staff: true });
  return { mesa: v };
});
ruta('GET', '/api/negocio/:nid/mesas', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const ls = await filas(`select id from mesas_sesiones where negocio_id=$1 and (estado='abierta' or cerrada_en > now() - interval '12 hours') order by estado, id desc limit 40`, [p.nid]);
  const out = [];
  for (const x of ls) out.push(vista(await cargar(x.id), { staff: true }));
  return { mesas: out };
});
ruta('POST', '/api/negocio/:nid/mesas/:id/jugadores', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const s = await mesaDelNegocio(p.nid, p.id); abierta(s);
  const nombre = txt(b.nombre, 40); if (!nombre) falla(400, 'nombre', 'Escribe el nombre.');
  await q('insert into mesas_jugadores(sesion_id, nombre) values ($1,$2)', [s.id, nombre]);
  return { mesa: { ...(await avisar(s.id, 'jugador')), token: s.token } };
});
const jugadorDe = async (sid, id) => { const j = await uno('select * from mesas_jugadores where id=$1 and sesion_id=$2', [entero(id), sid]); if (!j) falla(400, 'jugador', 'Ese jugador no está en la mesa.'); return j; };
ruta('POST', '/api/negocio/:nid/mesas/:id/chico', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const s = await mesaDelNegocio(p.nid, p.id); abierta(s);
  if (s.tipo !== 'billar') falla(400, 'tipo', 'Los chicos son del billar.');
  const g = await jugadorDe(s.id, b.ganador), pe = await jugadorDe(s.id, b.perdedor);
  if (g.id === pe.id) falla(400, 'jugador', 'El ganador y el perdedor no pueden ser el mismo.');
  await q(`insert into mesas_eventos(sesion_id, tipo, ganador_id, perdedor_id, registrado_por) values ($1,'chico',$2,$3,$4)`, [s.id, g.id, pe.id, u.id]);
  return { mesa: { ...(await avisar(s.id, 'chico')), token: s.token } };
});
ruta('POST', '/api/negocio/:nid/mesas/:id/extra', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const s = await mesaDelNegocio(p.nid, p.id); abierta(s);
  const para = b.para ? (await jugadorDe(s.id, b.para)).id : null;
  const pr = b.producto_id ? await uno('select nombre, precio from productos where id=$1 and negocio_id=$2', [txt(b.producto_id, 60), p.nid]) : null;
  const descripcion = txt(b.descripcion, 80) || (pr && pr.nombre); if (!descripcion) falla(400, 'extra', 'Escribe qué se agrega.');
  const valor = b.valor != null ? Math.max(0, entero(b.valor)) : (pr ? pr.precio : 0);
  const cant = Math.max(0.25, Math.min(99, Number(b.cantidad) || 1));
  await q(`insert into mesas_eventos(sesion_id, tipo, producto_id, descripcion, cantidad, valor_unit, para_jugador_id, cocina, registrado_por) values ($1,'extra',$2,$3,$4,$5,$6,$7,$8)`,
    [s.id, txt(b.producto_id, 60) || null, descripcion, cant, valor, para, s.tipo === 'restaurante' ? 'en_cocina' : null, u.id]);
  return { mesa: { ...(await avisar(s.id, 'extra')), token: s.token } };
});
for (const accion of ['aceptar', 'anular', 'servido']) {
  ruta('POST', `/api/negocio/:nid/mesas/:id/eventos/:eid/${accion}`, async (ctx, b, p) => {
    await requiereNegocio(ctx, p.nid);
    const s = await mesaDelNegocio(p.nid, p.id); abierta(s);
    const set = accion === 'aceptar' ? "estado='ok'" : accion === 'anular' ? "estado='anulado'" : "cocina='servido'";
    const r = await uno(`update mesas_eventos set ${set} where id=$1 and sesion_id=$2 and estado <> 'anulado' returning id`, [entero(p.eid), s.id]);
    if (!r) falla(404, 'no_existe', 'Ese movimiento no existe.');
    return { mesa: { ...(await avisar(s.id, accion)), token: s.token } };
  });
}
ruta('POST', '/api/negocio/:nid/mesas/:id/cerrar', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const forma = ['cada_uno', 'uno', 'iguales'].includes(b.forma) ? b.forma : 'cada_uno';
  const v = await tx(async c => {
    const s = await c.uno('select * from mesas_sesiones where id=$1 and negocio_id=$2 for update', [entero(p.id), p.nid]);
    if (!s) falla(404, 'no_existe', 'Esa mesa no existe.');
    abierta(s);
    const pend = await c.uno(`select count(*) n from mesas_eventos where sesion_id=$1 and estado='pendiente'`, [s.id]);
    if (pend.n > 0 && !b.ignorar_pendientes) falla(409, 'pendientes', `Hay ${pend.n} pedido(s) del cliente sin aceptar o quitar.`);
    const cerrada_en = new Date();
    const jug = await c.filas('select * from mesas_jugadores where sesion_id=$1 order by id', [s.id]);
    const ev = await c.filas('select * from mesas_eventos where sesion_id=$1 order by id', [s.id]);
    const cuenta = calcular({ ...s, cerrada_en }, jug, ev);
    const fac = { forma, pagos: factura(cuenta, forma, b.pagador), detalle: cuenta.jugadores, minutos: cuenta.minutos, valor_tiempo: cuenta.valor_tiempo, total: cuenta.total, pago: txt(b.pago, 12) || 'efectivo' };
    // El código queda usado: la sesión se cierra y ya no se puede volver a unir nadie
    await c.q(`update mesas_sesiones set estado='cerrada', cerrada_en=$2, forma_pago=$3, factura=$4, total=$5 where id=$1`, [s.id, cerrada_en, forma, fac, cuenta.total]);
    return s.id;
  });
  return { mesa: await avisar(v, 'cerrada') };
});

/* ---------------- cliente: escanea el QR ---------------- */
ruta('POST', '/api/mesas/unirse', async (ctx, b) => {
  const u = requiereSesion(ctx);
  const s = await uno('select * from mesas_sesiones where token=$1', [txt(b.token, 40)]);
  if (!s) falla(404, 'no_existe', 'Ese código no existe. Pídele a la mesera que te lo muestre otra vez.');
  if (s.estado !== 'abierta') falla(410, 'usado', 'Este código ya se usó: esa mesa se cerró. Pide el código nuevo.');
  await q(`insert into mesas_jugadores(sesion_id, usuario_id, nombre) values ($1,$2,$3) on conflict (sesion_id, usuario_id) where usuario_id is not null do nothing`, [s.id, u.id, u.nombre]);
  await avisar(s.id, 'jugador');
  return { mesa: vista(await cargar(s.id), { usuario: u }) };
});
async function mesaDelCliente(ctx, id) {
  const u = requiereSesion(ctx);
  const d = await cargar(entero(id));
  if (!d) falla(404, 'no_existe', 'Esa mesa no existe.');
  const esJug = d.jugadores.some(j => Number(j.usuario_id) === u.id);
  const esNeg = !!(await uno('select 1 from negocio_usuarios where negocio_id=$1 and usuario_id=$2', [d.s.negocio_id, u.id]));
  if (!esJug && !esNeg) falla(403, 'sin_permiso', 'No estás en esa mesa. Escanea el código.');
  return { u, d, esJug };
}
ruta('GET', '/api/mesas/mias', async ctx => {
  const u = requiereSesion(ctx);
  const ls = await filas(`select m.id from mesas_sesiones m join mesas_jugadores j on j.sesion_id=m.id where j.usuario_id=$1 and (m.estado='abierta' or m.cerrada_en > now() - interval '2 days') order by m.id desc limit 10`, [u.id]);
  const out = []; for (const x of ls) out.push(vista(await cargar(x.id), { usuario: u }));
  return { mesas: out };
});
ruta('GET', '/api/mesas/:id', async (ctx, b, p) => { const { u, d } = await mesaDelCliente(ctx, p.id); return { mesa: vista(d, { usuario: u }) }; });
// El cliente pide desde su celular: queda "pendiente" hasta que la mesera lo acepte (nadie se cobra solo)
ruta('POST', '/api/mesas/:id/pedir', async (ctx, b, p) => {
  const { u, d, esJug } = await mesaDelCliente(ctx, p.id);
  if (!esJug) falla(403, 'sin_permiso', 'Solo los de la mesa piden desde aquí.');
  if (d.s.estado !== 'abierta') falla(409, 'cerrada', 'Esa mesa ya se cerró.');
  const pr = await uno('select id, nombre, precio from productos where id=$1 and negocio_id=$2 and disponible', [txt(b.producto_id, 60), d.s.negocio_id]);
  if (!pr) falla(404, 'producto', 'Ese producto no está disponible.');
  const yo = d.jugadores.find(j => Number(j.usuario_id) === u.id);
  const cant = Math.max(1, Math.min(20, entero(b.cantidad, 1)));
  await q(`insert into mesas_eventos(sesion_id, tipo, producto_id, descripcion, cantidad, valor_unit, para_jugador_id, estado, pedido_por, cocina) values ($1,'extra',$2,$3,$4,$5,$6,'pendiente',$6,$7)`,
    [d.s.id, pr.id, pr.nombre, cant, pr.precio, yo.id, d.s.tipo === 'restaurante' ? 'en_cocina' : null]);
  return { mesa: vista(await cargar(d.s.id), { usuario: u }), aviso: await avisar(d.s.id, 'pedido') && 'ok' };
});
// Productos que se pueden pedir desde la mesa (los del servidor de ese negocio)
ruta('GET', '/api/mesas/:id/menu', async (ctx, b, p) => {
  const { d } = await mesaDelCliente(ctx, p.id);
  return { productos: await filas(`select id, nombre, precio, categoria from productos where negocio_id=$1 and disponible and stock <> 0 and coalesce(categoria,'') <> 'Mesas' order by categoria, nombre`, [d.s.negocio_id]) };
});
