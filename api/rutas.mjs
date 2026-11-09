// Lainec · API. Todas las reglas de permisos se validan AQUÍ, en el servidor.
// Ocultar un botón en la pantalla nunca es suficiente.
import { q, uno, filas, tx, config } from './db.mjs';
import * as auth from './auth.mjs';
import * as rt from './tiempo-real.mjs';
import * as N from './notificaciones.mjs';
import { clavePublica, pushActivo } from './canales/webpush.mjs';
import { estimar, textoDistancia } from './geo.mjs';

export class ErrorApi extends Error {
  constructor(status, codigo, mensaje, extra) { super(mensaje); this.status = status; this.codigo = codigo; this.extra = extra; }
}
const falla = (s, c, m, x) => { throw new ErrorApi(s, c, m, x); };
const pesos = n => '$' + Math.round(n).toLocaleString('es-CO');
const EN_CURSO = ['aceptada', 'recogida', 'en_camino'];
const HABEAS_VERSION = '2026-11';

/* ---------------- utilidades de petición ---------------- */
async function leerJSON(req, limite) {
  const trozos = []; let n = 0;
  for await (const t of req) {
    n += t.length;
    if (n > limite) falla(413, 'muy_grande', 'El archivo es muy pesado. La app lo comprime sola: intenta de nuevo.');
    trozos.push(t);
  }
  if (!n) return {};
  try { return JSON.parse(Buffer.concat(trozos).toString('utf8')); }
  catch { falla(400, 'json_invalido', 'Los datos llegaron dañados. Intenta de nuevo.'); }
}
const ip = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const txt = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
const entero = (v, def = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : def; };

// Imagen en dataURL → { mime, datos }. Las fotos llegan comprimidas desde el celular.
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];
function imagen(dataUrl, maxBytes, nombre) {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) falla(400, 'foto_falta', `Falta la foto: ${nombre}.`);
  if (!MIMES.includes(m[1])) falla(400, 'foto_tipo', `La foto (${nombre}) debe ser JPG, PNG o WEBP.`);
  const datos = Buffer.from(m[2], 'base64');
  if (datos.length > maxBytes) falla(413, 'foto_pesada', `La foto (${nombre}) pesa mucho. Tómala de nuevo.`);
  return { mime: m[1], datos };
}
async function guardarArchivo(c, propietario, tipo, img, privado = true) {
  const r = await c.uno('insert into archivos(propietario_id, tipo, mime, datos, bytes, privado) values ($1,$2,$3,$4,$5,$6) returning id',
    [propietario, tipo, img.mime, img.datos, img.datos.length, privado]);
  return r.id;
}

/* ---------------- sesión y roles ---------------- */
const tiene = (u, rol) => !!u && Array.isArray(u.roles) && u.roles.includes(rol);
function requiereSesion(ctx) { if (!ctx.u) falla(401, 'sin_sesion', 'Entra con tu cuenta para seguir.'); return ctx.u; }
function requiereRol(ctx, rol) { const u = requiereSesion(ctx); if (!tiene(u, rol)) falla(403, 'sin_permiso', 'Tu cuenta no tiene permiso para esto.'); return u; }
async function requiereNegocio(ctx, nid) {
  const u = requiereSesion(ctx);
  if (tiene(u, 'admin')) return { u, rol: 'admin' };
  const r = await uno('select rol from negocio_usuarios where negocio_id=$1 and usuario_id=$2', [nid, u.id]);
  if (!r) falla(403, 'sin_permiso', 'No eres parte de este negocio.');
  return { u, rol: r.rol };
}
async function repartidorDe(id, c = null) {
  const sql = 'select * from repartidores where usuario_id=$1' + (c ? ' for update' : '');
  return c ? c.uno(sql, [id]) : uno(sql, [id]);
}
// Un repartidor NO aprobado no ve ofertas ni recibe notificaciones: se corta aquí.
async function requiereAprobado(ctx, c = null) {
  const u = requiereSesion(ctx);
  const r = await repartidorDe(u.id, c);
  if (!r) falla(403, 'no_repartidor', 'Tu cuenta no está registrada como repartidor.');
  if (r.estado_aprobacion !== 'aprobado') falla(403, 'no_aprobado', 'Tu solicitud está en revisión.', { estado: r.estado_aprobacion, motivo: r.motivo_rechazo });
  return { u, r };
}

async function perfil(u) {
  const negocios = await filas(`select n.id, n.nombre, n.categoria, nu.rol from negocio_usuarios nu join negocios n on n.id=nu.negocio_id where nu.usuario_id=$1 order by n.nombre`, [u.id]);
  const rep = await uno(`select estado_aprobacion, motivo_rechazo, modo_actual, conectado, zona_id, zonas_extra, nombre_completo from repartidores where usuario_id=$1`, [u.id]);
  return { id: u.id, nombre: u.nombre, telefono: u.telefono, usuario: u.usuario, roles: u.roles, negocios, repartidor: rep };
}

/* ---------------- ofertas: tarjeta y estimación ---------------- */
async function zona(id) { return uno('select * from zonas_tarifas where id=$1', [id]); }
const primerNombre = s => String(s || '').trim().split(/\s+/)[0] || 'cliente';
function itemsTexto(items) {
  return (items || []).map(i => `${i.q || 1} ${i.n || i.id}${i.p ? ' ' + pesos(i.p * (i.q || 1)) : ''}`).join(', ');
}
function tarjeta(o) {
  return {
    id: Number(o.id), valor: o.valor, valor_txt: pesos(o.valor), negocio: o.negocio_nombre, negocio_dir: o.negocio_dir,
    destino: `${o.destino_texto || o.direccion || o.zona_nombre}${o.cliente_nombre ? ' — Casa de ' + primerNombre(o.cliente_nombre) : ''}`,
    pedido: itemsTexto(o.items), numero: o.numero, zona: o.zona_id, zona_nombre: o.zona_nombre,
    distancia_km: o.distancia_km, minutos: o.minutos, distancia_txt: textoDistancia(o.distancia_km, o.minutos),
    pago: o.pago, cobrar: o.pago === 'efectivo' ? o.total : 0, vence_en: o.vence_en, estado: o.estado, intento: o.intento
  };
}
const SQL_OFERTA = `select o.*, p.numero, p.items, p.total, p.subtotal, p.descuento, p.domicilio as pedido_domicilio, p.pago, p.cliente_id, p.cliente_nombre, p.cliente_tel, p.direccion,
       n.nombre as negocio_nombre, n.direccion as negocio_dir, n.telefono as negocio_tel, z.nombre as zona_nombre
  from ofertas_domicilio o join pedidos p on p.id=o.pedido_id join negocios n on n.id=o.negocio_id join zonas_tarifas z on z.id=o.zona_id`;
const ofertaCompleta = (id, c) => (c || { uno }).uno(SQL_OFERTA + ' where o.id=$1', [id]);
const historial = (c, oferta, evento, usuario, detalle = {}) =>
  c.q('insert into ofertas_historial(oferta_id, evento, usuario_id, detalle) values ($1,$2,$3,$4)', [oferta, evento, usuario || null, detalle]);

async function anunciar(ofertaId, excluir = null) {
  const o = await ofertaCompleta(ofertaId);
  if (!o || o.estado !== 'abierta') return [];
  const t = tarjeta(o);
  const ids = await N.avisarOfertaNueva(o, { publica: t, cliente_id: o.cliente_id });
  if (excluir) rt.enviar(excluir, 'oferta_retirada', { id: Number(o.id), motivo: 'cancelaste' });
  return ids;
}
async function minutosVencimiento() { return entero(await config('vencimiento_oferta_min', 10), 10) || 10; }

/* ---------------- tabla de rutas ---------------- */
const R = [];
const ruta = (metodo, patron, fn, opts = {}) => {
  const claves = [];
  const re = new RegExp('^' + patron.replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; }) + '$');
  R.push({ metodo, re, claves, fn, limite: opts.limite || 64 * 1024 });
};

/* ===== estado ===== */
ruta('GET', '/api/estado', async () => ({ ok: true, db: true, push: pushActivo(), hora: new Date().toISOString() }));
ruta('GET', '/api/zonas', async () => ({ zonas: await filas('select id, nombre, municipio, tipo, tarifa, activo from zonas_tarifas where activo order by municipio, nombre') }));

/* ===== autenticación ===== */
ruta('POST', '/api/auth/entrar', async (ctx, b) => {
  const id = txt(b.usuario, 60).toLowerCase(), dig = auth.soloDigitos(id);
  if (!auth.limitar('login:' + ip(ctx.req) + ':' + id, 5, 15 * 60e3) || !auth.limitar('login-u:' + id, 20, 24 * 3600e3))
    falla(429, 'muchos_intentos', 'Hiciste muchos intentos. Espera 15 minutos y vuelve a probar.');
  const u = await uno('select * from usuarios where (telefono=$1 and $1<>\'\') or usuario=$2', [dig, id]);
  if (!u || !u.activo || !auth.verificarClave(b.clave, u.clave_hash)) falla(401, 'clave_mala', 'El celular o la clave no coinciden.');
  const token = await auth.crearSesion(u.id, ctx.req.headers['user-agent']);
  ctx.cookie = auth.cookieSesion(token, ctx.segura);
  return { token, usuario: await perfil(u) };
});
ruta('POST', '/api/auth/registro', async (ctx, b) => {
  if (!auth.limitar('reg:' + ip(ctx.req), 10, 3600e3)) falla(429, 'muchos_intentos', 'Muchos registros desde este celular. Intenta más tarde.');
  const u = await crearUsuario(b, ['cliente']);
  const token = await auth.crearSesion(u.id, ctx.req.headers['user-agent']);
  ctx.cookie = auth.cookieSesion(token, ctx.segura);
  return { token, usuario: await perfil(u) };
});
async function crearUsuario(b, roles, c = null) {
  const nombre = txt(b.nombre, 80), tel = auth.soloDigitos(b.telefono), clave = String(b.clave || '');
  if (nombre.length < 3) falla(400, 'nombre', 'Escribe tu nombre completo.');
  if (!/^3\d{9}$/.test(tel)) falla(400, 'telefono', 'El celular debe tener 10 números y empezar por 3.');
  if (clave.length < 4) falla(400, 'clave', 'La clave debe tener mínimo 4 números o letras.');
  const ya = await (c || { uno }).uno('select id from usuarios where telefono=$1', [tel]);
  if (ya) falla(409, 'ya_existe', 'Ese celular ya tiene cuenta. Entra con tu clave.');
  return (c || { uno }).uno('insert into usuarios(telefono, nombre, clave_hash, roles) values ($1,$2,$3,$4) returning *', [tel, nombre, auth.hashClave(clave), roles]);
}
ruta('POST', '/api/auth/salir', async ctx => { await auth.cerrarSesion(auth.tokenDe(ctx.req)); ctx.cookie = auth.cookieBorrar(ctx.segura); return { ok: true }; });
ruta('GET', '/api/auth/yo', async ctx => ({ usuario: ctx.u ? await perfil(ctx.u) : null }));

/* ===== tiempo real y notificaciones ===== */
ruta('GET', '/api/eventos', async ctx => { requiereSesion(ctx); rt.abrir(ctx.req, ctx.res, ctx.u); return ctx.SSE; });
ruta('GET', '/api/notificaciones', async (ctx, b, p, qs) => {
  const u = requiereSesion(ctx);
  return { notificaciones: await filas('select id, tipo, titulo, cuerpo, datos, leida, creada from notificaciones where usuario_id=$1 and id > $2 order by id desc limit 50', [u.id, entero(qs.get('desde'))]) };
});
ruta('POST', '/api/notificaciones/leidas', async ctx => { const u = requiereSesion(ctx); await q('update notificaciones set leida=true where usuario_id=$1 and not leida', [u.id]); return { ok: true }; });
ruta('GET', '/api/push/clave', async () => ({ clave: clavePublica(), activo: pushActivo() }));
ruta('POST', '/api/push/suscribir', async (ctx, b) => {
  const u = requiereSesion(ctx), s = b.suscripcion || {};
  if (!s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth || !/^https:\/\//.test(s.endpoint)) falla(400, 'suscripcion', 'Suscripción de avisos inválida.');
  await q(`insert into suscripciones_push(usuario_id, endpoint, p256dh, auth) values ($1,$2,$3,$4)
           on conflict (endpoint) do update set usuario_id=excluded.usuario_id, p256dh=excluded.p256dh, auth=excluded.auth, ultimo_error=null`,
    [u.id, txt(s.endpoint, 1000), txt(s.keys.p256dh, 200), txt(s.keys.auth, 100)]);
  return { ok: true };
});
ruta('POST', '/api/push/quitar', async (ctx, b) => { const u = requiereSesion(ctx); await q('delete from suscripciones_push where usuario_id=$1 and endpoint=$2', [u.id, txt(b.endpoint, 1000)]); return { ok: true }; });

/* ===== archivos privados ===== */
// cédula y pase: solo el admin y el propio repartidor. Foto del repartidor: además el cliente
// y el negocio de un domicilio que él lleva. Evidencia y comprobante: las partes del pedido.
ruta('GET', '/api/archivos/:id', async (ctx, b, p) => {
  const a = await uno('select id, propietario_id, tipo, mime, datos, privado from archivos where id=$1', [entero(p.id)]);
  if (!a) falla(404, 'no_existe', 'No encontrado.');
  let ok = !a.privado;
  const u = ctx.u;
  if (!ok && u) {
    if (tiene(u, 'admin') || a.propietario_id === u.id) ok = true;
    else if (a.tipo === 'foto_repartidor') {
      ok = !!(await uno(`select 1 from repartidores r join ofertas_domicilio o on o.repartidor_id=r.usuario_id join pedidos pe on pe.id=o.pedido_id
                          left join negocio_usuarios nu on nu.negocio_id=o.negocio_id and nu.usuario_id=$2
                         where r.foto_id=$1 and (pe.cliente_id=$2 or nu.usuario_id is not null) limit 1`, [a.id, u.id]));
    } else if (a.tipo === 'evidencia' || a.tipo === 'comprobante') {
      ok = !!(await uno(`select 1 from pedidos pe left join ofertas_domicilio o on o.pedido_id=pe.id left join evidencias_entrega e on e.oferta_id=o.id
                          left join pagos pg on pg.pedido_id=pe.id left join negocio_usuarios nu on nu.negocio_id=pe.negocio_id and nu.usuario_id=$2
                         where (e.archivo_id=$1 or pg.comprobante_id=$1) and (pe.cliente_id=$2 or nu.usuario_id is not null or o.repartidor_id=$2) limit 1`, [a.id, u.id]));
    }
  }
  if (!ok) falla(u ? 403 : 401, 'privado', 'Este archivo es privado.');
  ctx.res.writeHead(200, { 'Content-Type': a.mime, 'Cache-Control': a.privado ? 'private, max-age=300' : 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
  ctx.res.end(a.datos);
  return ctx.SSE;
});

/* ===== REPARTIDOR: solicitud y aprobación ===== */
const MAX_FOTO = 700 * 1024;
ruta('POST', '/api/repartidor/solicitud', async (ctx, b) => {
  if (!auth.limitar('sol:' + ip(ctx.req), 8, 3600e3)) falla(429, 'muchos_intentos', 'Muchos intentos. Espera un rato.');
  if (b.habeas_data !== true) falla(400, 'habeas_data', 'Debes autorizar el tratamiento de tus datos personales para registrarte.');
  const d = {
    nombre_completo: txt(b.nombre_completo, 100), cedula: auth.soloDigitos(b.cedula), moto_marca: txt(b.moto_marca, 40),
    moto_color: txt(b.moto_color, 30), placa: txt(b.placa, 10).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    telefono: auth.soloDigitos(b.telefono), nequi: auth.soloDigitos(b.nequi), zona_id: txt(b.zona_id, 20)
  };
  if (d.nombre_completo.split(/\s+/).length < 2) falla(400, 'nombre', 'Escribe tu nombre completo (nombre y apellido).');
  if (!/^\d{6,10}$/.test(d.cedula)) falla(400, 'cedula', 'La cédula debe tener entre 6 y 10 números.');
  if (!/^[A-Z]{3}\d{2}[A-Z]?$/.test(d.placa)) falla(400, 'placa', 'La placa de moto se escribe así: ABC12D.');
  if (!d.moto_marca || !d.moto_color) falla(400, 'moto', 'Escribe la marca y el color de la moto.');
  if (!/^3\d{9}$/.test(d.telefono)) falla(400, 'telefono', 'El celular debe tener 10 números y empezar por 3.');
  if (!/^3\d{9}$/.test(d.nequi)) falla(400, 'nequi', 'El Nequi debe ser un celular de 10 números.');
  if (!(await zona(d.zona_id))) falla(400, 'zona', 'Elige tu zona de trabajo.');
  const fotos = { foto: imagen(b.foto, MAX_FOTO, 'tu foto'), cedula: imagen(b.cedula_foto, MAX_FOTO, 'cédula'), pase: imagen(b.pase_foto, MAX_FOTO, 'pase de conducción') };

  const res = await tx(async c => {
    let u = ctx.u;
    if (!u) u = await crearUsuario({ nombre: d.nombre_completo, telefono: d.telefono, clave: b.clave }, ['cliente', 'repartidor'], c);
    const previo = await c.uno('select estado_aprobacion from repartidores where usuario_id=$1 for update', [u.id]);
    if (previo && previo.estado_aprobacion !== 'rechazado') falla(409, 'ya_solicito', previo.estado_aprobacion === 'aprobado' ? 'Ya eres repartidor aprobado.' : 'Ya enviaste tu solicitud. Está en revisión.');
    const dupC = await c.uno('select 1 from repartidores where cedula=$1 and usuario_id<>$2', [d.cedula, u.id]);
    if (dupC) falla(409, 'cedula_repetida', 'Esa cédula ya está registrada con otro repartidor.');
    const dupP = await c.uno('select 1 from repartidores where placa=$1 and usuario_id<>$2', [d.placa, u.id]);
    if (dupP) falla(409, 'placa_repetida', 'Esa placa ya está registrada con otro repartidor.');
    const foto_id = await guardarArchivo(c, u.id, 'foto_repartidor', fotos.foto);
    const cedula_foto_id = await guardarArchivo(c, u.id, 'cedula', fotos.cedula);
    const pase_foto_id = await guardarArchivo(c, u.id, 'pase', fotos.pase);
    const campos = [u.id, d.nombre_completo, d.cedula, foto_id, cedula_foto_id, pase_foto_id, d.moto_marca, d.moto_color, d.placa, d.telefono, d.nequi, d.zona_id, HABEAS_VERSION];
    if (previo) {
      await c.q(`update repartidores set nombre_completo=$2, cedula=$3, foto_id=$4, cedula_foto_id=$5, pase_foto_id=$6, moto_marca=$7, moto_color=$8, placa=$9,
                 telefono=$10, nequi=$11, zona_id=$12, habeas_data_en=now(), habeas_data_version=$13, estado_aprobacion='pendiente', motivo_rechazo=null, actualizado=now() where usuario_id=$1`, campos);
    } else {
      await c.q(`insert into repartidores(usuario_id, nombre_completo, cedula, foto_id, cedula_foto_id, pase_foto_id, moto_marca, moto_color, placa, telefono, nequi, zona_id, habeas_data_en, habeas_data_version)
                 values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), $13)`, campos);
    }
    await c.q(`update usuarios set roles = (select array_agg(distinct x) from unnest(roles || array['cliente','repartidor']) x) where id=$1`, [u.id]);
    return u;
  }).catch(e => {
    if (e.code === '23505') falla(409, 'repetido', /placa/.test(e.constraint || '') ? 'Esa placa ya está registrada con otro repartidor.' : 'Esa cédula ya está registrada con otro repartidor.');
    throw e;
  });
  if (!ctx.u) { const token = await auth.crearSesion(res.id, ctx.req.headers['user-agent']); ctx.cookie = auth.cookieSesion(token, ctx.segura); }
  for (const a of await filas(`select id from usuarios where 'admin' = any(roles)`))
    await N.notificar(a.id, { tipo: 'solicitud_repartidor', titulo: 'Nueva solicitud de repartidor', cuerpo: `${d.nombre_completo} · placa ${d.placa}`, datos: { url: './index.html#admin' }, clave: `sol:${res.id}:${Date.now()}` });
  return { ok: true, estado: 'pendiente', usuario: await perfil(await uno('select * from usuarios where id=$1', [res.id])) };
}, { limite: 3 * MAX_FOTO * 1.4 + 20000 });

ruta('GET', '/api/repartidor/yo', async ctx => {
  const u = requiereSesion(ctx);
  const r = await uno(`select r.usuario_id, r.nombre_completo, r.cedula, r.foto_id, r.moto_marca, r.moto_color, r.placa, r.telefono, r.nequi, r.zona_id, r.zonas_extra,
                              r.estado_aprobacion, r.motivo_rechazo, r.modo_actual, r.conectado, z.nombre as zona_nombre
                         from repartidores r join zonas_tarifas z on z.id=r.zona_id where r.usuario_id=$1`, [u.id]);
  if (!r) return { repartidor: null };
  const cal = await uno(`select round(avg(estrellas)::numeric,1) as promedio, count(*) as n from calificaciones where objetivo_tipo='repartidor' and objetivo_id=$1`, [String(u.id)]);
  const enCurso = r.estado_aprobacion === 'aprobado' ? await uno(SQL_OFERTA + ` where o.repartidor_id=$1 and o.estado = any($2)`, [u.id, EN_CURSO]) : null;
  return { repartidor: { ...r, promedio: cal.promedio, calificaciones: cal.n }, en_curso: enCurso ? detalleCurso(enCurso) : null, ganancias: r.estado_aprobacion === 'aprobado' ? await ganancias(u.id) : null };
});
function detalleCurso(o) {
  return { ...tarjeta(o), negocio_tel: o.negocio_tel, cliente_nombre: o.cliente_nombre, cliente_tel: o.cliente_tel, direccion: o.direccion,
    destino_lat: o.destino_lat, destino_lng: o.destino_lng, origen_lat: o.origen_lat, origen_lng: o.origen_lng, total: o.total, subtotal: o.subtotal,
    debe_negocio: o.pago === 'efectivo' ? o.total - o.valor : -o.valor };
}
async function ganancias(id) {
  const r = await uno(`
    with e as (select valor, entregada_en at time zone 'America/Bogota' as f from ofertas_domicilio where repartidor_id=$1 and estado='entregada'),
         h as (select (now() at time zone 'America/Bogota') as ahora)
    select count(*) filter (where f >= date_trunc('day', ahora))   as hoy_n,  coalesce(sum(valor) filter (where f >= date_trunc('day', ahora)),0)   as hoy,
           count(*) filter (where f >= date_trunc('week', ahora))  as sem_n,  coalesce(sum(valor) filter (where f >= date_trunc('week', ahora)),0)  as semana,
           count(*) filter (where f >= date_trunc('month', ahora)) as mes_n,  coalesce(sum(valor) filter (where f >= date_trunc('month', ahora)),0) as mes
      from e, h`, [id]);
  return r;
}

ruta('PUT', '/api/repartidor/conectado', async (ctx, b) => {
  const { u, r } = await requiereAprobado(ctx);
  if (r.modo_actual !== 'trabajo') falla(409, 'modo_cliente', 'Estás en modo cliente. Vuelve a modo trabajo para conectarte.');
  const conectado = b.conectado === true;
  await q('update repartidores set conectado=$2, actualizado=now() where usuario_id=$1', [u.id, conectado]);
  return { conectado, ofertas: conectado ? await cartelera(u.id, r) : [] };
});

ruta('PUT', '/api/repartidor/modo', async (ctx, b) => {
  const u = requiereSesion(ctx);
  const modo = b.modo === 'cliente' ? 'cliente' : b.modo === 'trabajo' ? 'trabajo' : falla(400, 'modo', 'Modo inválido.');
  const r = await tx(async c => {
    const rep = await repartidorDe(u.id, c); // bloqueo: evita cambiar de modo mientras acepta una oferta
    if (!rep) falla(403, 'no_repartidor', 'Tu cuenta no está registrada como repartidor.');
    if (modo === 'cliente') {
      const curso = await c.uno(`select o.id, p.numero from ofertas_domicilio o join pedidos p on p.id=o.pedido_id where o.repartidor_id=$1 and o.estado = any($2)`, [u.id, EN_CURSO]);
      if (curso) falla(409, 'domicilio_en_curso', `Tienes el domicilio #${curso.numero || curso.id} en curso. Entrégalo antes de cambiar a modo cliente.`);
    }
    // "conectado" no se toca: al volver a modo trabajo queda como estaba
    return c.uno('update repartidores set modo_actual=$2, actualizado=now() where usuario_id=$1 returning modo_actual, conectado', [u.id, modo]);
  });
  return r;
});

async function cartelera(uid, r) {
  const zonas = [r.zona_id, ...(r.zonas_extra || [])];
  const ls = await filas(SQL_OFERTA + ` where o.estado='abierta' and o.vence_en > now() and o.zona_id = any($1) and (p.cliente_id is null or p.cliente_id <> $2) order by o.creada`, [zonas, uid]);
  return ls.map(tarjeta);
}
ruta('GET', '/api/repartidor/ofertas', async ctx => {
  const { u, r } = await requiereAprobado(ctx);
  if (r.modo_actual !== 'trabajo') falla(409, 'modo_cliente', 'Estás en modo cliente.');
  return { conectado: r.conectado, ofertas: r.conectado ? await cartelera(u.id, r) : [] };
});

// ACEPTAR: operación atómica. La fila del repartidor se bloquea y la oferta se toma con una
// actualización condicional (solo si sigue "abierta"). Si dos presionan a la vez, Postgres
// deja pasar a uno solo; el otro recibe "Esta oferta ya fue tomada".
ruta('POST', '/api/repartidor/ofertas/:id/aceptar', async (ctx, b, p) => {
  const id = entero(p.id);
  if (ctx.u && !auth.limitar('acep:' + ctx.u.id, 30, 60e3)) falla(429, 'muchos_intentos', 'Espera un momento.');
  const o = await tx(async c => {
    const { u, r } = await requiereAprobado(ctx, c);
    if (r.modo_actual !== 'trabajo') falla(409, 'modo_cliente', 'Estás en modo cliente. Vuelve a modo trabajo para aceptar domicilios.');
    if (!r.conectado) falla(409, 'desconectado', 'Estás desconectado. Conéctate para aceptar domicilios.');
    const ya = await c.uno('select id from ofertas_domicilio where repartidor_id=$1 and estado = any($2)', [u.id, EN_CURSO]);
    if (ya) falla(409, 'ya_tienes_uno', 'Ya llevas un domicilio. Entrégalo primero.');
    const info = await c.uno('select o.estado, o.zona_id, o.vence_en, p.cliente_id from ofertas_domicilio o join pedidos p on p.id=o.pedido_id where o.id=$1', [id]);
    if (!info) falla(404, 'no_existe', 'Esa oferta no existe.');
    if (info.cliente_id && Number(info.cliente_id) === u.id) falla(403, 'pedido_propio', 'No puedes tomar el domicilio de un pedido que tú mismo hiciste.');
    const zonas = [r.zona_id, ...(r.zonas_extra || [])];
    if (!zonas.includes(info.zona_id)) falla(403, 'otra_zona', 'Esa oferta es de otra zona.');
    const g = await c.uno(`update ofertas_domicilio set estado='aceptada', repartidor_id=$1, aceptada_en=now(), actualizada=now()
                           where id=$2 and estado='abierta' and vence_en > now() returning id`, [u.id, id]);
    if (!g) falla(409, 'ya_tomada', info.estado === 'vencida' ? 'Esta oferta ya venció.' : 'Esta oferta ya fue tomada.');
    await historial(c, id, 'aceptada', u.id);
    await c.q(`update pedidos set estado='repartidor_asignado', actualizado=now() where id=(select pedido_id from ofertas_domicilio where id=$1)`, [id]);
    return ofertaCompleta(id, c);
  }).catch(e => { if (e.code === '23505') falla(409, 'ya_tienes_uno', 'Ya llevas un domicilio. Entrégalo primero.'); throw e; });
  await N.avisarOfertaRetirada(id, 'tomada', ctx.u.id);
  const rep = await repartidorDe(ctx.u.id);
  await N.avisarEstado(o, o, `${primerNombre(rep.nombre_completo)} aceptó el domicilio. Moto ${rep.moto_marca} ${rep.moto_color}, placa ${rep.placa}.`);
  for (const nid of await N.usuariosNegocio(o.negocio_id))
    await N.notificar(nid, { tipo: 'domicilio_aceptado', titulo: `Pedido #${o.numero}: ya hay repartidor`, cuerpo: `${rep.nombre_completo} · placa ${rep.placa}`, datos: { url: './index.html#panel-domicilios' }, clave: `acep:${id}:${o.intento}` });
  return { ok: true, en_curso: detalleCurso(o) };
});

const SIGUIENTE = { recogida: 'aceptada', en_camino: 'recogida' };
const TEXTO_ESTADO = { recogida: 'El repartidor recogió el pedido en el negocio.', en_camino: 'El repartidor va en camino.' };
ruta('POST', '/api/repartidor/ofertas/:id/estado', async (ctx, b, p) => {
  const { u } = await requiereAprobado(ctx);
  const nuevo = b.estado, previo = SIGUIENTE[nuevo];
  if (!previo) falla(400, 'estado', 'Estado inválido.');
  const col = nuevo === 'recogida' ? 'recogida_en' : 'en_camino_en';
  const o = await tx(async c => {
    const g = await c.uno(`update ofertas_domicilio set estado=$1, ${col}=now(), actualizada=now() where id=$2 and repartidor_id=$3 and estado=$4 returning id`, [nuevo, entero(p.id), u.id, previo]);
    if (!g) falla(409, 'estado_invalido', 'Ese paso no corresponde ahora. Recarga la pantalla.');
    await historial(c, g.id, nuevo, u.id);
    await c.q(`update pedidos set estado=$2, actualizado=now() where id=(select pedido_id from ofertas_domicilio where id=$1)`, [g.id, nuevo]);
    return ofertaCompleta(g.id, c);
  });
  await N.avisarEstado(o, o, TEXTO_ESTADO[nuevo]);
  if (o.cliente_id) await N.notificar(o.cliente_id, { tipo: 'domicilio_' + nuevo, titulo: `Pedido #${o.numero}`, cuerpo: TEXTO_ESTADO[nuevo], datos: { url: './index.html#cuenta-pedidos' }, clave: `${nuevo}:${o.id}:${o.intento}` });
  return { ok: true, en_curso: detalleCurso(o) };
});

// ENTREGAR con foto de evidencia y registro de la caja del repartidor
ruta('POST', '/api/repartidor/ofertas/:id/entregar', async (ctx, b, p) => {
  const { u } = await requiereAprobado(ctx);
  const foto = imagen(b.foto, 500 * 1024, 'evidencia de entrega');
  const id = entero(p.id);
  const o = await tx(async c => {
    const of = await c.uno(SQL_OFERTA + ' where o.id=$1 and o.repartidor_id=$2 for update of o', [id, u.id]);
    if (!of) falla(404, 'no_existe', 'Ese domicilio no es tuyo.');
    if (of.estado !== 'en_camino') falla(409, 'estado_invalido', of.estado === 'entregada' ? 'Ese domicilio ya está entregado.' : 'Primero marca "Voy en camino".');
    const arch = await guardarArchivo(c, u.id, 'evidencia', foto);
    const lat = Number.isFinite(+b.lat) ? +b.lat : null, lng = Number.isFinite(+b.lng) ? +b.lng : null;
    await c.q('insert into evidencias_entrega(oferta_id, archivo_id, lat, lng) values ($1,$2,$3,$4)', [id, arch, lat, lng]);
    const cobrado = of.pago === 'efectivo' ? of.total : 0;
    await c.q(`update ofertas_domicilio set estado='entregada', entregada_en=now(), cerrada_en=now(), cobrado_efectivo=$2, actualizada=now() where id=$1`, [id, cobrado]);
    await c.q(`update pedidos set estado='entregado', actualizado=now() where id=$1`, [of.pedido_id]);
    // Caja: en efectivo el repartidor cobra todo, se queda su domicilio y le debe el resto al negocio.
    // Nequi / transferencia / fiado: no recibe plata; el negocio le debe el domicilio.
    if (of.pago === 'efectivo') {
      await c.q(`insert into caja_repartidor(repartidor_id, negocio_id, oferta_id, tipo, monto, nota, registrado_por) values ($1,$2,$3,'cobro_efectivo',$4,$5,$1)`,
        [u.id, of.negocio_id, id, of.total - of.valor, `Cobró ${pesos(of.total)} (producto + domicilio) del pedido #${of.numero}. Se queda ${pesos(of.valor)}.`]);
      await c.q(`insert into pagos(pedido_id, metodo, monto, estado, confirmado_por, nota) values ($1,'efectivo',$2,'confirmado',$3,'Cobrado por el repartidor')`, [of.pedido_id, of.total, u.id]);
    } else {
      await c.q(`insert into caja_repartidor(repartidor_id, negocio_id, oferta_id, tipo, monto, nota, registrado_por) values ($1,$2,$3,'domicilio_por_pagar',$4,$5,$1)`,
        [u.id, of.negocio_id, id, -of.valor, `Pedido #${of.numero} pagado por ${of.pago}: el negocio le debe el domicilio.`]);
      if (of.pago === 'fiado') await c.q(`insert into pagos(pedido_id, metodo, monto, estado, nota) values ($1,'fiado',$2,'pendiente','Queda en la cuenta de fiado del cliente (producto + domicilio)')`, [of.pedido_id, of.total]);
    }
    await historial(c, id, 'entregada', u.id, { cobrado });
    return ofertaCompleta(id, c);
  });
  await N.avisarEstado(o, o, '¡Pedido entregado!');
  if (o.cliente_id) await N.notificar(o.cliente_id, { tipo: 'domicilio_entregado', titulo: `Pedido #${o.numero} entregado`, cuerpo: 'Califica al negocio y al repartidor.', datos: { url: './index.html#cuenta-pedidos', pedido_id: o.pedido_id }, clave: `entregada:${o.id}` });
  for (const nid of await N.usuariosNegocio(o.negocio_id))
    await N.notificar(nid, { tipo: 'domicilio_entregado', titulo: `Pedido #${o.numero} entregado`, cuerpo: o.pago === 'efectivo' ? `El repartidor cobró ${pesos(o.total)} y te debe ${pesos(o.total - o.valor)}.` : `Le debes el domicilio (${pesos(o.valor)}) al repartidor.`, datos: { url: './index.html#panel-domicilios' }, clave: `entregada:${o.id}` });
  return { ok: true, ganancias: await ganancias(u.id) };
}, { limite: 800 * 1024 });

ruta('POST', '/api/repartidor/ofertas/:id/cancelar', async (ctx, b, p) => {
  const { u } = await requiereAprobado(ctx);
  const motivo = txt(b.motivo, 200);
  if (motivo.length < 3) falla(400, 'motivo', 'Escribe por qué cancelas.');
  const id = entero(p.id), min = await minutosVencimiento();
  const o = await tx(async c => {
    const g = await c.uno(`update ofertas_domicilio set estado='abierta', repartidor_id=null, aceptada_en=null, recogida_en=null, en_camino_en=null,
                             intento=intento+1, vence_en=now() + make_interval(mins => $3::int), actualizada=now()
                           where id=$1 and repartidor_id=$2 and estado = any($4) returning id, estado`, [id, u.id, String(min), EN_CURSO]);
    if (!g) falla(409, 'estado_invalido', 'No puedes cancelar ese domicilio.');
    await historial(c, id, 'cancelada_por_repartidor', u.id, { motivo });
    await c.q(`update pedidos set estado='buscando_repartidor', actualizado=now() where id=(select pedido_id from ofertas_domicilio where id=$1)`, [id]);
    return ofertaCompleta(id, c);
  });
  await N.avisarEstado(o, o, `El repartidor canceló: "${motivo}". La oferta volvió a la cartelera.`);
  for (const nid of await N.usuariosNegocio(o.negocio_id))
    await N.notificar(nid, { tipo: 'domicilio_cancelado_rep', titulo: `Pedido #${o.numero}: el repartidor canceló`, cuerpo: `Motivo: ${motivo}. Ya está otra vez en la cartelera.`, datos: { url: './index.html#panel-domicilios' }, clave: `cancrep:${id}:${o.intento}` });
  await anunciar(id, u.id);
  return { ok: true };
});

ruta('POST', '/api/repartidor/ubicacion', async (ctx, b) => {
  const { u } = await requiereAprobado(ctx);
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) falla(400, 'ubicacion', 'Ubicación inválida.');
  // La ubicación solo se acepta mientras hay un domicilio en curso (ahorra batería y protege la privacidad)
  const o = await uno(`select o.id, o.negocio_id, p.cliente_id from ofertas_domicilio o join pedidos p on p.id=o.pedido_id where o.repartidor_id=$1 and o.estado = any($2)`, [u.id, EN_CURSO]);
  if (!o) falla(409, 'sin_domicilio', 'Solo se comparte la ubicación mientras llevas un domicilio.');
  if (!auth.limitar('ubi:' + u.id, 1, 4000)) return { ok: true, omitida: true };
  await q('insert into ubicaciones_repartidor(repartidor_id, oferta_id, lat, lng, precision_m) values ($1,$2,$3,$4,$5)', [u.id, o.id, lat, lng, Number(b.precision) || null]);
  const ev = { oferta_id: o.id, lat, lng, ts: Date.now() };
  rt.enviarVarios(await N.usuariosNegocio(o.negocio_id), 'ubicacion', ev);
  if (o.cliente_id) rt.enviar(o.cliente_id, 'ubicacion', ev);
  return { ok: true };
});

ruta('GET', '/api/repartidor/ganancias', async ctx => { const { u } = await requiereAprobado(ctx); return { ganancias: await ganancias(u.id) }; });
ruta('GET', '/api/repartidor/historial', async ctx => {
  const { u } = await requiereAprobado(ctx);
  return { entregas: (await filas(SQL_OFERTA + ` where o.repartidor_id=$1 and o.estado='entregada' order by o.entregada_en desc limit 30`, [u.id])).map(o => ({ ...tarjeta(o), entregada_en: o.entregada_en })) };
});
ruta('GET', '/api/repartidor/caja', async ctx => {
  const { u } = await requiereAprobado(ctx);
  return { saldos: await filas(`select c.negocio_id, n.nombre, sum(c.monto) as saldo from caja_repartidor c join negocios n on n.id=c.negocio_id where c.repartidor_id=$1 group by 1,2 having sum(c.monto)<>0 order by 2`, [u.id]) };
});

/* ===== CLIENTE ===== */
ruta('POST', '/api/pedidos', async (ctx, b) => {
  const u = requiereSesion(ctx);
  const neg = await uno('select * from negocios where id=$1', [txt(b.negocio_id, 40)]);
  if (!neg) falla(404, 'negocio', 'Ese negocio no está en el servidor todavía.');
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map(i => ({ id: txt(i.id, 40), n: txt(i.n, 80), q: Math.max(1, entero(i.q, 1)), p: Math.max(0, entero(i.p)) }));
  if (!items.length) falla(400, 'items', 'El pedido está vacío.');
  const modo = ['domicilio', 'alla', 'recoger'].includes(b.modo) ? b.modo : 'domicilio';
  const pago = ['efectivo', 'nequi', 'banco', 'fiado'].includes(b.pago) ? b.pago : 'efectivo';
  const z = modo === 'domicilio' ? await zona(txt(b.zona_id, 20)) : null;
  if (modo === 'domicilio' && !z) falla(400, 'zona', 'Elige la zona de entrega.');
  const subtotal = items.reduce((a, i) => a + i.q * i.p, 0), descuento = Math.min(subtotal, Math.max(0, entero(b.descuento)));
  const domicilio = z ? z.tarifa : 0, total = subtotal - descuento + domicilio;
  const ped = await tx(async c => {
    // El número que propone el celular se respeta si está libre en ese negocio; si no, el servidor pone el siguiente
    const propuesto = entero(b.numero);
    const libre = propuesto && !(await c.uno(`select 1 from pedidos where negocio_id=$1 and numero=$2 and creado > now() - interval '30 days'`, [neg.id, propuesto]));
    const numero = libre ? propuesto : (await c.uno('select coalesce(max(numero),100)+1 as n from pedidos where negocio_id=$1', [neg.id])).n;
    const pe = await c.uno(`insert into pedidos(numero, negocio_id, cliente_id, cliente_nombre, cliente_tel, items, subtotal, domicilio, descuento, total, modo, zona_id, direccion, lat, lng, pago, origen)
                            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'lobamall') returning *`,
      [numero, neg.id, u.id, u.nombre, u.telefono, JSON.stringify(items), subtotal, domicilio, descuento, total, modo, z ? z.id : null, txt(b.direccion, 200), Number(b.lat) || null, Number(b.lng) || null, pago]);
    if (pago === 'nequi' || pago === 'banco') await c.q(`insert into pagos(pedido_id, metodo, monto, estado, nota) values ($1,$2,$3,'pendiente','Esperando comprobante del cliente')`, [pe.id, pago, total]);
    return pe;
  });
  rt.enviarVarios(await N.usuariosNegocio(neg.id), 'pedido_nuevo', { pedido_id: ped.id, numero: ped.numero });
  return { pedido: ped };
});
ruta('GET', '/api/pedidos/mios', async ctx => {
  const u = requiereSesion(ctx);
  return { pedidos: await filas(`select p.*, n.nombre as negocio_nombre, o.id as oferta_id, o.estado as domicilio_estado, o.repartidor_id
                                   from pedidos p join negocios n on n.id=p.negocio_id
                                   left join lateral (select * from ofertas_domicilio where pedido_id=p.id order by id desc limit 1) o on true
                                  where p.cliente_id=$1 order by p.creado desc limit 30`, [u.id]) };
});
async function pedidoConPermiso(ctx, id) {
  const u = requiereSesion(ctx);
  const pe = await uno('select * from pedidos where id=$1', [id]);
  if (!pe) falla(404, 'no_existe', 'Ese pedido no existe.');
  const esNeg = !!(await uno('select 1 from negocio_usuarios where negocio_id=$1 and usuario_id=$2', [pe.negocio_id, u.id]));
  if (pe.cliente_id !== u.id && !esNeg && !tiene(u, 'admin')) falla(403, 'sin_permiso', 'Ese pedido no es tuyo.');
  return { u, pe, esNeg };
}
ruta('GET', '/api/pedidos/:id/seguimiento', async (ctx, b, p) => {
  const { pe } = await pedidoConPermiso(ctx, entero(p.id));
  const o = await uno(`select o.id, o.estado, o.valor, o.aceptada_en, o.recogida_en, o.en_camino_en, o.entregada_en, o.destino_lat, o.destino_lng, o.origen_lat, o.origen_lng,
                              r.usuario_id as repartidor_id, r.nombre_completo, r.moto_marca, r.moto_color, r.placa, r.telefono as repartidor_tel, r.foto_id,
                              (select round(avg(estrellas)::numeric,1) from calificaciones where objetivo_tipo='repartidor' and objetivo_id=r.usuario_id::text) as promedio,
                              e.archivo_id as evidencia_id
                         from ofertas_domicilio o left join repartidores r on r.usuario_id=o.repartidor_id left join evidencias_entrega e on e.oferta_id=o.id
                        where o.pedido_id=$1 order by o.id desc limit 1`, [pe.id]);
  const ubi = o && EN_CURSO.includes(o.estado) ? await uno('select lat, lng, creada from ubicaciones_repartidor where oferta_id=$1 order by id desc limit 1', [o.id]) : null;
  const cal = await filas('select objetivo_tipo, estrellas from calificaciones where pedido_id=$1', [pe.id]);
  const pagos = await filas('select id, metodo, monto, estado, comprobante_id from pagos where pedido_id=$1 order by id', [pe.id]);
  return { pedido: pe, domicilio: o, ubicacion: ubi, calificaciones: cal, pagos };
});
ruta('POST', '/api/pedidos/:id/cancelar', async (ctx, b, p) => {
  const { u, pe } = await pedidoConPermiso(ctx, entero(p.id));
  if (pe.cliente_id !== u.id) falla(403, 'sin_permiso', 'Solo quien hizo el pedido lo puede cancelar desde aquí.');
  const motivo = txt(b.motivo, 200) || 'Sin motivo';
  const r = await tx(async c => {
    const o = await c.uno(`select * from ofertas_domicilio where pedido_id=$1 and estado = any($2) for update`, [pe.id, ['abierta', ...EN_CURSO]]);
    if (o && ['recogida', 'en_camino'].includes(o.estado)) falla(409, 'ya_en_camino', 'El repartidor ya recogió tu pedido. Llama al negocio para cancelarlo.');
    if (['entregado', 'cancelado'].includes(pe.estado)) falla(409, 'cerrado', 'Ese pedido ya está cerrado.');
    if (o) {
      await c.q(`update ofertas_domicilio set estado='cancelada', cancelada_por='cliente', motivo_cancelacion=$2, cerrada_en=now(), actualizada=now() where id=$1`, [o.id, motivo]);
      await historial(c, o.id, 'cancelada_por_cliente', u.id, { motivo });
    }
    await c.q(`update pedidos set estado='cancelado', actualizado=now() where id=$1`, [pe.id]);
    return o;
  });
  if (r) {
    const o = await ofertaCompleta(r.id);
    await N.avisarEstado(o, o, `El cliente canceló el pedido. Motivo: ${motivo}`);
    if (r.estado === 'abierta') await N.avisarOfertaRetirada(r.id, 'cancelada');
    if (r.repartidor_id) await N.notificar(r.repartidor_id, { tipo: 'domicilio_cancelado', titulo: `Pedido #${pe.numero} cancelado por el cliente`, cuerpo: 'No vayas a recogerlo. Ya puedes tomar otro.', datos: {}, clave: `canccli:${r.id}` });
  }
  for (const nid of await N.usuariosNegocio(pe.negocio_id))
    await N.notificar(nid, { tipo: 'pedido_cancelado', titulo: `El cliente canceló el pedido #${pe.numero}`, cuerpo: `Motivo: ${motivo}`, datos: { url: './index.html#panel-domicilios' }, clave: `canccli-n:${pe.id}` });
  return { ok: true };
});
ruta('POST', '/api/pedidos/:id/comprobante', async (ctx, b, p) => {
  const { u, pe } = await pedidoConPermiso(ctx, entero(p.id));
  if (pe.cliente_id !== u.id) falla(403, 'sin_permiso', 'Solo quien hizo el pedido sube el comprobante.');
  if (!['nequi', 'banco'].includes(pe.pago)) falla(409, 'pago', 'Este pedido no se paga por Nequi.');
  const img = imagen(b.foto, 500 * 1024, 'comprobante');
  await tx(async c => {
    const arch = await guardarArchivo(c, u.id, 'comprobante', img);
    const pg = await c.uno(`update pagos set comprobante_id=$2, estado='pendiente', actualizado=now() where id=(select id from pagos where pedido_id=$1 and metodo=$3 order by id desc limit 1) returning id`, [pe.id, arch, pe.pago]);
    if (!pg) await c.q(`insert into pagos(pedido_id, metodo, monto, estado, comprobante_id) values ($1,$2,$3,'pendiente',$4)`, [pe.id, pe.pago, pe.total, arch]);
  });
  for (const nid of await N.usuariosNegocio(pe.negocio_id))
    await N.notificar(nid, { tipo: 'comprobante', titulo: `Comprobante Nequi del pedido #${pe.numero}`, cuerpo: `Revisa que te hayan llegado ${pesos(pe.total)} y confírmalo.`, datos: { url: './index.html#panel-domicilios' }, clave: `comp:${pe.id}:${Date.now()}` });
  return { ok: true };
}, { limite: 800 * 1024 });
ruta('POST', '/api/pedidos/:id/calificar', async (ctx, b, p) => {
  const { u, pe } = await pedidoConPermiso(ctx, entero(p.id));
  if (pe.cliente_id !== u.id) falla(403, 'sin_permiso', 'Solo quien hizo el pedido lo califica.');
  if (pe.estado !== 'entregado') falla(409, 'no_entregado', 'Puedes calificar cuando el pedido esté entregado.');
  const est = x => { const n = entero(x); return n >= 1 && n <= 5 ? n : null; };
  const comentario = txt(b.comentario, 300) || null;
  if (est(b.negocio)) await q(`insert into calificaciones(pedido_id, autor_id, objetivo_tipo, objetivo_id, estrellas, comentario) values ($1,$2,'negocio',$3,$4,$5) on conflict do nothing`, [pe.id, u.id, pe.negocio_id, est(b.negocio), comentario]);
  const o = await uno(`select repartidor_id from ofertas_domicilio where pedido_id=$1 and estado='entregada' order by id desc limit 1`, [pe.id]);
  if (o && est(b.repartidor)) await q(`insert into calificaciones(pedido_id, autor_id, objetivo_tipo, objetivo_id, estrellas, comentario) values ($1,$2,'repartidor',$3,$4,$5) on conflict do nothing`, [pe.id, u.id, String(o.repartidor_id), est(b.repartidor), comentario]);
  return { ok: true };
});

/* ===== NEGOCIO ===== */
ruta('GET', '/api/negocio/:nid/pedidos', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  return { pedidos: await filas(`select p.*, o.id as oferta_id, o.estado as domicilio_estado from pedidos p
                                   left join lateral (select * from ofertas_domicilio where pedido_id=p.id order by id desc limit 1) o on true
                                  where p.negocio_id=$1 and p.creado > now() - interval '3 days' order by p.creado desc limit 60`, [p.nid]) };
});

// El negocio acepta / prepara / rechaza un pedido que el cliente hizo desde otro celular.
// Solo mueve los estados de cocina; los del domicilio los mueve el repartidor.
const ESTADOS_NEGOCIO = { aceptado: 'El negocio aceptó tu pedido.', preparando: 'Están preparando tu pedido.', listo: 'Tu pedido está listo.', rechazado: 'El negocio no pudo aceptar tu pedido.', entregado: 'Pedido entregado.' };
ruta('POST', '/api/negocio/:nid/pedidos/:id/estado', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const estado = String(b.estado || '');
  if (!ESTADOS_NEGOCIO[estado]) falla(400, 'estado', 'Estado inválido.');
  const pe = await uno(`update pedidos set estado=$3, actualizado=now() where id=$1 and negocio_id=$2
                          and estado not in ('cancelado','entregado','repartidor_asignado','recogida','en_camino')
                          and not exists (select 1 from ofertas_domicilio o where o.pedido_id=pedidos.id and o.estado in ('aceptada','recogida','en_camino'))
                        returning *`, [entero(p.id), p.nid, estado]);
  if (!pe) falla(409, 'estado_invalido', 'Ese pedido ya no se puede cambiar desde aquí.');
  const texto = estado === 'rechazado' && b.motivo ? `${ESTADOS_NEGOCIO.rechazado} ${txt(b.motivo, 200)}` : ESTADOS_NEGOCIO[estado];
  if (pe.cliente_id) {
    rt.enviar(pe.cliente_id, 'pedido_estado', { pedido_id: pe.id, numero: pe.numero, estado, texto });
    await N.notificar(pe.cliente_id, { tipo: 'pedido_' + estado, titulo: `Pedido #${pe.numero}`, cuerpo: texto, datos: { url: './index.html#cuenta-pedidos' }, clave: `ped:${pe.id}:${estado}` });
  }
  return { ok: true };
});

// [NECESITO REPARTIDOR]: crea (o reutiliza) el pedido en el servidor y publica la oferta
ruta('POST', '/api/negocio/:nid/ofertas', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const neg = await uno('select * from negocios where id=$1', [p.nid]);
  let pe;
  if (b.pedido_id) {
    pe = await uno('select * from pedidos where id=$1 and negocio_id=$2', [entero(b.pedido_id), p.nid]);
    if (!pe) falla(404, 'no_existe', 'Ese pedido no existe.');
  } else {
    const d = b.pedido || {};
    const items = (Array.isArray(d.items) ? d.items : []).slice(0, 40).map(i => ({ id: txt(i.id, 40), n: txt(i.n, 80), q: Math.max(1, entero(i.q, 1)), p: Math.max(0, entero(i.p)) }));
    if (!items.length) falla(400, 'items', 'El pedido está vacío.');
    const origen = d.origen === 'lobamall' ? 'lobamall' : d.origen === 'directo' ? 'directo' : falla(400, 'origen', 'Indica si el pedido llegó por Lainec o directo (WhatsApp, llamada, mostrador).');
    const z = await zona(txt(d.zona_id, 20));
    if (!z) falla(400, 'zona', 'Elige la zona de entrega.');
    const pago = ['efectivo', 'nequi', 'banco', 'fiado'].includes(d.pago) ? d.pago : 'efectivo';
    const subtotal = items.reduce((a, i) => a + i.q * i.p, 0), descuento = Math.min(subtotal, Math.max(0, entero(d.descuento)));
    const domicilio = d.domicilio != null ? Math.max(0, entero(d.domicilio)) : z.tarifa;
    pe = await uno(`insert into pedidos(numero, negocio_id, cliente_nombre, cliente_tel, items, subtotal, domicilio, descuento, total, modo, zona_id, direccion, pago, origen, estado)
                    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'domicilio',$10,$11,$12,$13,'aceptado') returning *`,
      [entero(d.numero) || null, p.nid, txt(d.cliente_nombre, 80) || 'Cliente', auth.soloDigitos(d.cliente_tel) || null, JSON.stringify(items), subtotal, domicilio, descuento, subtotal - descuento + domicilio, z.id, txt(d.direccion, 200), pago, origen]);
  }
  if (pe.modo !== 'domicilio') falla(409, 'modo', 'Ese pedido no es a domicilio.');
  const z = await zona(pe.zona_id || neg.zona_id);
  const valor = Math.max(z.tarifa, entero(b.valor, z.tarifa));
  const kmh = entero(await config('velocidad_moto_kmh', 25), 25);
  const destino = pe.lat != null ? { lat: pe.lat, lng: pe.lng } : (z.lat != null ? { lat: z.lat, lng: z.lng } : null);
  const est = estimar(neg.lat != null ? { lat: neg.lat, lng: neg.lng } : null, destino, { refKm: z.lat == null ? z.distancia_ref_km : null, kmh });
  const min = await minutosVencimiento();
  const o = await tx(async c => {
    const r = await c.uno(`insert into ofertas_domicilio(pedido_id, negocio_id, zona_id, valor, origen_lat, origen_lng, destino_lat, destino_lng, destino_texto, distancia_km, minutos, vence_en)
                           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now() + make_interval(mins => $12::int)) returning id`,
      [pe.id, p.nid, z.id, valor, neg.lat, neg.lng, destino && destino.lat, destino && destino.lng, pe.direccion || z.nombre, est.km, est.minutos, String(min)]);
    await historial(c, r.id, 'publicada', u.id, { valor });
    await c.q(`update pedidos set estado='buscando_repartidor', actualizado=now() where id=$1`, [pe.id]);
    return r;
  }).catch(e => { if (e.code === '23505') falla(409, 'ya_hay_oferta', 'Ese pedido ya tiene una oferta de domicilio activa.'); throw e; });
  const avisados = await anunciar(o.id);
  return { oferta: tarjeta(await ofertaCompleta(o.id)), pedido_id: pe.id, avisados: avisados.length };
});
ruta('GET', '/api/negocio/:nid/ofertas', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const ls = await filas(SQL_OFERTA + ` where o.negocio_id=$1 and (o.estado <> all($2) or o.actualizada > now() - interval '1 day') order by o.id desc limit 40`, [p.nid, ['entregada', 'cancelada']]);
  const reps = await filas(`select usuario_id, nombre_completo, placa, moto_marca, moto_color, telefono from repartidores where usuario_id = any($1)`, [ls.map(o => o.repartidor_id).filter(Boolean)]);
  const R2 = Object.fromEntries(reps.map(r => [r.usuario_id, r]));
  return { ofertas: ls.map(o => ({ ...tarjeta(o), pedido_id: o.pedido_id, repartidor: R2[o.repartidor_id] || null, aceptada_en: o.aceptada_en, entregada_en: o.entregada_en, motivo_cancelacion: o.motivo_cancelacion })) };
});
ruta('POST', '/api/negocio/:nid/ofertas/:id/reintentar', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const min = await minutosVencimiento();
  const g = await tx(async c => {
    const o = await c.uno('select * from ofertas_domicilio where id=$1 and negocio_id=$2 for update', [entero(p.id), p.nid]);
    if (!o) falla(404, 'no_existe', 'Esa oferta no existe.');
    if (!['vencida', 'abierta'].includes(o.estado)) falla(409, 'estado_invalido', 'Solo se puede reintentar o subir el valor mientras nadie la ha tomado.');
    const valor = Math.max(o.valor, entero(b.valor, o.valor));
    await c.q(`update ofertas_domicilio set estado='abierta', valor=$2, intento=intento+1, vence_en=now() + make_interval(mins => $3::int), actualizada=now() where id=$1`, [o.id, valor, String(min)]);
    await historial(c, o.id, valor > o.valor ? 'subio_valor' : 'reintento', u.id, { antes: o.valor, ahora: valor });
    return o;
  });
  if (g.estado === 'abierta') await N.avisarOfertaRetirada(g.id, 'actualizada');
  await anunciar(g.id);
  return { oferta: tarjeta(await ofertaCompleta(g.id)) };
});
ruta('POST', '/api/negocio/:nid/ofertas/:id/cancelar', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const motivo = txt(b.motivo, 200) || 'Cancelado por el negocio';
  const o = await tx(async c => {
    const o = await c.uno('select * from ofertas_domicilio where id=$1 and negocio_id=$2 for update', [entero(p.id), p.nid]);
    if (!o) falla(404, 'no_existe', 'Esa oferta no existe.');
    if (['entregada', 'cancelada'].includes(o.estado)) falla(409, 'cerrada', 'Ese domicilio ya está cerrado.');
    await c.q(`update ofertas_domicilio set estado='cancelada', cancelada_por='negocio', motivo_cancelacion=$2, cerrada_en=now(), actualizada=now() where id=$1`, [o.id, motivo]);
    await c.q(`update pedidos set estado='cancelado', actualizado=now() where id=$1`, [o.pedido_id]);
    // Si el repartidor ya recogió o iba en camino, igual se le reconoce el domicilio (hizo el viaje)
    if (['recogida', 'en_camino'].includes(o.estado))
      await c.q(`insert into caja_repartidor(repartidor_id, negocio_id, oferta_id, tipo, monto, nota, registrado_por) values ($1,$2,$3,'domicilio_por_pagar',$4,'Pedido cancelado por el negocio con el repartidor en camino: se le reconoce el domicilio.',$5)`, [o.repartidor_id, o.negocio_id, o.id, -o.valor, u.id]);
    await historial(c, o.id, 'cancelada_por_negocio', u.id, { motivo, estado_previo: o.estado });
    return o;
  });
  const full = await ofertaCompleta(o.id);
  await N.avisarEstado(full, full, `El negocio canceló el domicilio. Motivo: ${motivo}`);
  if (o.estado === 'abierta' || o.estado === 'vencida') await N.avisarOfertaRetirada(o.id, 'cancelada');
  if (o.repartidor_id) await N.notificar(o.repartidor_id, { tipo: 'domicilio_cancelado', titulo: `Pedido #${full.numero} cancelado por el negocio`, cuerpo: ['recogida', 'en_camino'].includes(o.estado) ? `Devuelve el pedido al negocio. Se te reconoce el domicilio (${pesos(o.valor)}).` : 'No vayas a recogerlo. Ya puedes tomar otro.', datos: {}, clave: `cancneg:${o.id}` });
  if (full.cliente_id) await N.notificar(full.cliente_id, { tipo: 'pedido_cancelado', titulo: `Pedido #${full.numero} cancelado`, cuerpo: `${full.negocio_nombre} canceló el pedido. Motivo: ${motivo}`, datos: { url: './index.html#cuenta-pedidos' }, clave: `cancneg-c:${o.id}` });
  return { ok: true };
});
ruta('GET', '/api/negocio/:nid/caja', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const saldos = await filas(`select c.repartidor_id, r.nombre_completo, r.placa, r.telefono, sum(c.monto) as saldo, count(*) as movimientos
                                from caja_repartidor c join repartidores r on r.usuario_id=c.repartidor_id where c.negocio_id=$1 group by 1,2,3,4 order by 2`, [p.nid]);
  const movs = await filas(`select c.id, c.repartidor_id, c.tipo, c.monto, c.nota, c.creado from caja_repartidor c where c.negocio_id=$1 order by c.id desc limit 40`, [p.nid]);
  return { saldos, movimientos: movs };
});
ruta('POST', '/api/negocio/:nid/caja/liquidar', async (ctx, b, p) => {
  const { u } = await requiereNegocio(ctx, p.nid);
  const monto = entero(b.monto);
  if (monto <= 0) falla(400, 'monto', 'Escribe el valor.');
  const tipo = b.tipo === 'pague' ? 'pague' : 'recibi';
  await q(`insert into caja_repartidor(repartidor_id, negocio_id, tipo, monto, nota, registrado_por) values ($1,$2,'liquidacion',$3,$4,$5)`,
    [entero(b.repartidor_id), p.nid, tipo === 'recibi' ? -monto : monto, tipo === 'recibi' ? `El negocio recibió ${pesos(monto)} del repartidor` : `El negocio le pagó ${pesos(monto)} al repartidor`, u.id]);
  return { ok: true };
});
ruta('GET', '/api/negocio/:nid/pagos', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  return { pagos: await filas(`select pg.*, pe.numero, pe.cliente_nombre from pagos pg join pedidos pe on pe.id=pg.pedido_id
                                where pe.negocio_id=$1 and pg.metodo in ('nequi','banco') and pg.estado='pendiente' order by pg.id desc`, [p.nid]) };
});
for (const accion of ['confirmar', 'rechazar']) {
  ruta('POST', `/api/negocio/:nid/pagos/:id/${accion}`, async (ctx, b, p) => {
    const { u } = await requiereNegocio(ctx, p.nid);
    const pg = await uno(`update pagos set estado=$3, confirmado_por=$4, nota=coalesce($5, nota), actualizado=now()
                           where id=$1 and pedido_id in (select id from pedidos where negocio_id=$2) and estado='pendiente' returning *`,
      [entero(p.id), p.nid, accion === 'confirmar' ? 'confirmado' : 'rechazado', u.id, txt(b.nota, 200) || null]);
    if (!pg) falla(404, 'no_existe', 'Ese pago no está pendiente.');
    const pe = await uno('select * from pedidos where id=$1', [pg.pedido_id]);
    if (pe.cliente_id) await N.notificar(pe.cliente_id, { tipo: 'pago_' + accion, titulo: accion === 'confirmar' ? `Pago confirmado · pedido #${pe.numero}` : `Pago no recibido · pedido #${pe.numero}`, cuerpo: accion === 'confirmar' ? 'El negocio confirmó tu pago por Nequi.' : 'El negocio no ve tu pago. Revisa el comprobante o escríbele.', datos: {}, clave: `pago:${pg.id}:${accion}` });
    return { pago: pg };
  });
}

/* ===== PRODUCTOS, FOTO PROFESIONAL Y CÓDIGO QR ===== */
function prefijoDe(nombre) {
  if (/^[A-Z]{2,3}$/.test(String(nombre))) return String(nombre);
  const ini = String(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').split(/\s+/).filter(w => w.length > 2 || /^[A-Z]{2}$/.test(w));
  return ((ini[0] || 'X')[0] + ((ini[1] || ini[0] || 'X')[0])).slice(0, 2);
}
async function nuevoCodigo(c, nid, nombreNeg) {
  await c.q(`insert into productos_consecutivo(negocio_id, prefijo) values ($1,$2) on conflict do nothing`, [nid, prefijoDe(nombreNeg)]);
  const r = await c.uno('update productos_consecutivo set ultimo=ultimo+1 where negocio_id=$1 returning prefijo, ultimo', [nid]);
  for (let i = 0; i < 50; i++) {
    const cod = `${r.prefijo}-${String(r.ultimo + i).padStart(4, '0')}`;
    if (!(await c.uno('select 1 from productos where codigo=$1', [cod]))) {
      if (i) await c.q('update productos_consecutivo set ultimo=$2 where negocio_id=$1', [nid, r.ultimo + i]);
      return cod;
    }
  }
  return `${r.prefijo}-${Date.now().toString(36).toUpperCase()}`;
}
const pubProducto = x => x && ({ id: x.id, codigo: x.codigo, nombre: x.nombre, categoria: x.categoria, precio: x.precio, stock: x.stock, unidad: x.unidad, ubicacion: x.ubicacion,
  descripcion: x.descripcion, atributos: x.atributos, disponible: x.disponible, foto: x.foto_id && x.foto_estado === 'lista' ? `/api/archivos/${x.foto_id}` : null,
  foto_estado: x.foto_estado, negocio_id: x.negocio_id, negocio: x.negocio_nombre, negocio_tel: x.negocio_tel, negocio_dir: x.negocio_dir, etiqueta_impresa: x.etiqueta_impresa });
const SQL_PROD = `select pr.*, n.nombre as negocio_nombre, n.telefono as negocio_tel, n.direccion as negocio_dir from productos pr join negocios n on n.id=pr.negocio_id`;

ruta('POST', '/api/negocio/:nid/productos', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const neg = await uno('select nombre from negocios where id=$1', [p.nid]);
  const d = { id: txt(b.id, 60) || 'np' + Date.now(), nombre: txt(b.nombre, 100), categoria: txt(b.categoria, 60), precio: Math.max(0, entero(b.precio)), stock: entero(b.stock),
    unidad: txt(b.unidad, 12) || 'und', ubicacion: txt(b.ubicacion, 80) || null, descripcion: txt(b.descripcion, 400) || null,
    atributos: b.atributos && typeof b.atributos === 'object' ? b.atributos : {}, disponible: b.disponible !== false };
  if (!d.nombre) falla(400, 'nombre', 'Escribe el nombre del producto.');
  const r = await tx(async c => {
    const ya = await c.uno('select negocio_id, codigo from productos where id=$1', [d.id]);
    if (ya && ya.negocio_id !== p.nid) falla(409, 'id_ajeno', 'Ese producto es de otro negocio.');
    // El celular puede proponer el código que ya imprimió en la etiqueta (ej. RC-0012).
    // Se respeta si tiene el formato correcto y nadie más lo usa; si no, el servidor asigna otro.
    let codigo = ya ? ya.codigo : null;
    const deseado = txt(b.codigo, 12).toUpperCase();
    if (!codigo && /^[A-Z]{2,3}-\d{4}$/.test(deseado) && !(await c.uno('select 1 from productos where codigo=$1', [deseado]))) {
      codigo = deseado;
      const [pre, num] = deseado.split('-');
      await c.q(`insert into productos_consecutivo(negocio_id, prefijo, ultimo) values ($1,$2,$3) on conflict (negocio_id) do update set ultimo=greatest(productos_consecutivo.ultimo, excluded.ultimo)`, [p.nid, pre, +num]);
    }
    if (!codigo) codigo = await nuevoCodigo(c, p.nid, b.prefijo || neg.nombre);
    return c.uno(`insert into productos(id, negocio_id, codigo, nombre, categoria, precio, stock, unidad, ubicacion, descripcion, atributos, disponible)
                  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                  on conflict (id) do update set nombre=excluded.nombre, categoria=excluded.categoria, precio=excluded.precio, stock=excluded.stock, unidad=excluded.unidad,
                    ubicacion=excluded.ubicacion, descripcion=excluded.descripcion, atributos=excluded.atributos, disponible=excluded.disponible, actualizado=now()
                  returning *`, [d.id, p.nid, codigo, d.nombre, d.categoria, d.precio, d.stock, d.unidad, d.ubicacion, d.descripcion, JSON.stringify(d.atributos), d.disponible]);
  });
  return { producto: pubProducto(r) };
});
ruta('GET', '/api/negocio/:nid/productos', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  return { productos: (await filas(SQL_PROD + ' where pr.negocio_id=$1 order by pr.codigo', [p.nid])).map(pubProducto) };
});
// Foto profesional: la sube el dueño o el equipo de Lainec (rol "equipo" o admin)
ruta('POST', '/api/productos/:id/foto', async (ctx, b, p) => {
  const u = requiereSesion(ctx);
  const pr = await uno('select * from productos where id=$1', [txt(p.id, 60)]);
  if (!pr) falla(404, 'no_existe', 'Ese producto no está en el servidor. Guárdalo primero.');
  if (!tiene(u, 'admin') && !tiene(u, 'equipo')) await requiereNegocio(ctx, pr.negocio_id);
  const img = imagen(b.foto, 900 * 1024, 'foto del producto');
  const r = await tx(async c => {
    const arch = await guardarArchivo(c, u.id, 'producto', img, false);
    return c.uno(`update productos set foto_id=$2, foto_estado='lista', foto_por=$3, actualizado=now() where id=$1 returning *`, [pr.id, arch, u.id]);
  });
  return { producto: pubProducto(r) };
}, { limite: 1300 * 1024 });
ruta('POST', '/api/negocio/:nid/productos/etiquetas', async (ctx, b, p) => {
  await requiereNegocio(ctx, p.nid);
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(x => txt(x, 60)).slice(0, 500);
  await q('update productos set etiqueta_impresa=true where negocio_id=$1 and id = any($2)', [p.nid, ids]);
  return { ok: true, marcados: ids.length };
});
ruta('GET', '/api/equipo/fotos-pendientes', async ctx => {
  const u = requiereSesion(ctx);
  if (!tiene(u, 'admin') && !tiene(u, 'equipo')) falla(403, 'sin_permiso', 'Solo el equipo de fotos.');
  return { productos: (await filas(SQL_PROD + ` where pr.foto_estado='pendiente' order by n.nombre, pr.codigo limit 200`)).map(pubProducto) };
});
// Públicos: lo que muestra el QR cuando un cliente lo escanea en la tienda
ruta('GET', '/api/productos/codigo/:cod', async (ctx, b, p) => {
  const cod = txt(decodeURIComponent(p.cod), 40).toUpperCase().replace(/\s/g, '');
  const pr = await uno(SQL_PROD + ' where pr.codigo=$1 or upper(pr.id)=$1', [cod]);
  if (!pr) falla(404, 'no_existe', 'No encontramos un producto con ese código.');
  return { producto: pubProducto(pr) };
});
ruta('GET', '/api/productos/buscar', async (ctx, b, p, qs) => {
  const t = txt(qs.get('q'), 60);
  if (t.length < 2) return { productos: [] };
  const nid = txt(qs.get('negocio'), 40) || null;
  const ls = await filas(SQL_PROD + ` where ($2::text is null or pr.negocio_id=$2) and (pr.codigo ilike $1 or pr.nombre ilike $1 or pr.categoria ilike $1 or pr.ubicacion ilike $1) order by pr.nombre limit 20`, ['%' + t.replace(/[%_]/g, '') + '%', nid]);
  return { productos: ls.map(pubProducto) };
});

/* ===== ADMIN ===== */
ruta('GET', '/api/admin/solicitudes', async (ctx, b, p, qs) => {
  requiereRol(ctx, 'admin');
  const est = ['pendiente', 'aprobado', 'rechazado'].includes(qs.get('estado')) ? qs.get('estado') : 'pendiente';
  return { solicitudes: await filas(`select r.*, z.nombre as zona_nombre, u.telefono as cuenta_tel,
                                       (select round(avg(estrellas)::numeric,1) from calificaciones where objetivo_tipo='repartidor' and objetivo_id=r.usuario_id::text) as promedio
                                       from repartidores r join zonas_tarifas z on z.id=r.zona_id join usuarios u on u.id=r.usuario_id
                                      where r.estado_aprobacion=$1 order by r.creado`, [est]) };
});
for (const accion of ['aprobar', 'rechazar']) {
  ruta('POST', `/api/admin/repartidores/:id/${accion}`, async (ctx, b, p) => {
    const a = requiereRol(ctx, 'admin');
    const motivo = txt(b.motivo, 300);
    if (accion === 'rechazar' && motivo.length < 5) falla(400, 'motivo', 'Escribe el motivo del rechazo para que el repartidor sepa qué corregir.');
    const r = await uno(`update repartidores set estado_aprobacion=$2, motivo_rechazo=$3, revisado_por=$4, revisado_en=now(), conectado=false, actualizado=now()
                          where usuario_id=$1 returning usuario_id, nombre_completo`, [entero(p.id), accion === 'aprobar' ? 'aprobado' : 'rechazado', accion === 'rechazar' ? motivo : null, a.id]);
    if (!r) falla(404, 'no_existe', 'Ese repartidor no existe.');
    rt.enviar(r.usuario_id, 'repartidor_revisado', { estado: accion === 'aprobar' ? 'aprobado' : 'rechazado', motivo });
    await N.notificar(r.usuario_id, { tipo: 'solicitud_' + accion, titulo: accion === 'aprobar' ? '¡Ya eres repartidor de Lainec!' : 'Tu solicitud no fue aprobada', cuerpo: accion === 'aprobar' ? 'Entra y presiona ESTOY CONECTADO para recibir domicilios.' : `Motivo: ${motivo}`, datos: { url: './index.html?app=1#rep' }, clave: `rev:${r.usuario_id}:${accion}:${Date.now()}` });
    return { ok: true };
  });
}
ruta('PUT', '/api/admin/repartidores/:id/zonas', async (ctx, b, p) => {
  requiereRol(ctx, 'admin');
  const validas = (await filas('select id from zonas_tarifas')).map(z => z.id);
  const extra = (Array.isArray(b.zonas_extra) ? b.zonas_extra : []).filter(z => validas.includes(z));
  const r = await uno('update repartidores set zonas_extra=$2, actualizado=now() where usuario_id=$1 returning zonas_extra', [entero(p.id), extra]);
  if (!r) falla(404, 'no_existe', 'Ese repartidor no existe.');
  return r;
});
ruta('GET', '/api/admin/zonas', async ctx => { requiereRol(ctx, 'admin'); return { zonas: await filas('select * from zonas_tarifas order by municipio, nombre') }; });
ruta('PUT', '/api/admin/zonas/:id', async (ctx, b, p) => {
  requiereRol(ctx, 'admin');
  const tarifa = entero(b.tarifa, -1);
  if (tarifa < 0 || tarifa > 200000) falla(400, 'tarifa', 'Tarifa inválida.');
  const num = v => (v === '' || v == null || !Number.isFinite(Number(v))) ? null : Number(v);
  const r = await uno(`insert into zonas_tarifas(id, nombre, municipio, tipo, tarifa, lat, lng, distancia_ref_km, activo) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                       on conflict (id) do update set nombre=excluded.nombre, municipio=excluded.municipio, tipo=excluded.tipo, tarifa=excluded.tarifa, lat=excluded.lat, lng=excluded.lng,
                         distancia_ref_km=excluded.distancia_ref_km, activo=excluded.activo, actualizado=now() returning *`,
    [txt(p.id, 20).toLowerCase(), txt(b.nombre, 60) || p.id, txt(b.municipio, 60) || 'Hatillo de Loba', b.tipo === 'vereda' ? 'vereda' : 'pueblo', tarifa, num(b.lat), num(b.lng), num(b.distancia_ref_km), b.activo !== false]);
  return { zona: r };
});
ruta('GET', '/api/admin/config', async ctx => { requiereRol(ctx, 'admin'); return { config: Object.fromEntries((await filas('select clave, valor from configuracion')).map(r => [r.clave, r.valor])) }; });
ruta('PUT', '/api/admin/config', async (ctx, b) => {
  requiereRol(ctx, 'admin');
  if (b.vencimiento_oferta_min != null) { const m = entero(b.vencimiento_oferta_min); if (m < 1 || m > 120) falla(400, 'vencimiento', 'Entre 1 y 120 minutos.'); await q(`insert into configuracion values ('vencimiento_oferta_min',$1) on conflict (clave) do update set valor=excluded.valor`, [JSON.stringify(m)]); }
  if (b.velocidad_moto_kmh != null) { const v = entero(b.velocidad_moto_kmh); if (v < 5 || v > 80) falla(400, 'velocidad', 'Entre 5 y 80 km/h.'); await q(`insert into configuracion values ('velocidad_moto_kmh',$1) on conflict (clave) do update set valor=excluded.valor`, [JSON.stringify(v)]); }
  return { ok: true };
});
ruta('GET', '/api/admin/cajas', async ctx => {
  requiereRol(ctx, 'admin');
  return { saldos: await filas(`select c.repartidor_id, r.nombre_completo, r.placa, c.negocio_id, n.nombre as negocio, sum(c.monto) as saldo
                                  from caja_repartidor c join repartidores r on r.usuario_id=c.repartidor_id join negocios n on n.id=c.negocio_id
                                 group by 1,2,3,4,5 having sum(c.monto) <> 0 order by 2, 5`) };
});
// Comisión: 10 % SOLO de lo vendido por Lainec (origen = 'lobamall'), sobre productos (sin el domicilio)
ruta('GET', '/api/admin/comisiones', async (ctx, b, p, qs) => {
  requiereRol(ctx, 'admin');
  const desde = txt(qs.get('desde'), 10) || null, hasta = txt(qs.get('hasta'), 10) || null;
  return { filas: await filas(`select n.municipio, n.id as negocio_id, n.nombre, n.comision_pct, n.mensualidad,
                                      coalesce(sum(p.subtotal - p.descuento) filter (where p.origen='lobamall'),0) as ventas_lobamall,
                                      coalesce(sum(p.subtotal - p.descuento) filter (where p.origen='directo'),0)  as ventas_directas,
                                      round(coalesce(sum(p.subtotal - p.descuento) filter (where p.origen='lobamall'),0) * n.comision_pct / 100) as comision
                                 from negocios n left join pedidos p on p.negocio_id=n.id and p.estado='entregado'
                                  and ($1::date is null or p.creado >= $1::date) and ($2::date is null or p.creado < $2::date + 1)
                                group by 1,2,3,4,5 order by 1,3`, [desde, hasta]) };
});
ruta('GET', '/api/admin/ofertas', async ctx => {
  requiereRol(ctx, 'admin');
  return { ofertas: (await filas(SQL_OFERTA + ` where o.actualizada > now() - interval '2 days' order by o.id desc limit 80`)).map(o => ({ ...tarjeta(o), negocio_id: o.negocio_id, repartidor_id: o.repartidor_id })) };
});

/* ---------------- despachador ---------------- */
export async function manejar(req, res, { segura = false } = {}) {
  const url = new URL(req.url, 'http://x');
  const metodo = req.method;
  const ctx = { req, res, u: null, cookie: null, segura, SSE: Symbol('crudo') };
  const responder = (status, cuerpo) => {
    const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (ctx.cookie) h['Set-Cookie'] = ctx.cookie;
    res.writeHead(status, h);
    res.end(JSON.stringify(cuerpo));
  };
  try {
    const r = R.find(x => x.metodo === metodo && x.re.test(url.pathname));
    if (!r) {
      const otro = R.some(x => x.re.test(url.pathname));
      return responder(otro ? 405 : 404, { error: 'No existe esa ruta de la API.', codigo: 'ruta' });
    }
    // Protección contra peticiones desde otros sitios: las escrituras deben traer este encabezado
    if (metodo !== 'GET' && req.headers['x-lainec'] !== '1' && req.headers['x-lobamall'] !== '1') return responder(403, { error: 'Petición no permitida.', codigo: 'csrf' });
    ctx.u = await auth.usuarioDeToken(auth.tokenDe(req));
    const m = r.re.exec(url.pathname);
    const params = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const cuerpo = metodo === 'GET' ? {} : await leerJSON(req, r.limite);
    const out = await r.fn(ctx, cuerpo, params, url.searchParams);
    if (out === ctx.SSE) return;
    responder(200, out);
  } catch (e) {
    if (e instanceof ErrorApi) return responder(e.status, { error: e.message, codigo: e.codigo, ...(e.extra || {}) });
    console.error('[api]', metodo, url.pathname, e);
    responder(500, { error: 'Algo falló en el servidor. Intenta de nuevo.', codigo: 'interno' });
  }
}

/* ---------------- vencimiento de ofertas ---------------- */
export async function vencerOfertas() {
  const vencidas = await filas(`update ofertas_domicilio set estado='vencida', actualizada=now() where estado='abierta' and vence_en <= now() returning id`);
  for (const v of vencidas) {
    const o = await ofertaCompleta(v.id);
    await q(`insert into ofertas_historial(oferta_id, evento, detalle) values ($1,'vencida',$2)`, [v.id, { intento: o.intento }]);
    await N.avisarOfertaRetirada(v.id, 'vencida');
    await N.avisarEstado(o, o, 'Nadie tomó el domicilio a tiempo.');
    const min = await minutosVencimiento();
    for (const nid of await N.usuariosNegocio(o.negocio_id))
      await N.notificar(nid, { tipo: 'oferta_vencida', titulo: `Nadie tomó el domicilio del pedido #${o.numero}`, cuerpo: `Pasaron ${min} minutos. Puedes reintentar, subir el valor o cancelar.`, datos: { url: './index.html#panel-domicilios', oferta_id: o.id }, clave: `vencida:${o.id}:${o.intento}` });
  }
  return vencidas.length;
}

// Para los módulos de rutas que viven en otros archivos (api/mesas.mjs)
export { ruta, falla, requiereSesion, requiereNegocio, txt, entero, pesos, tiene };
