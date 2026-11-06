// LobaMall · datos semilla de PRUEBA
// Uso: DATABASE_URL=postgres://… npm run semilla
// Crea: 1 admin, 2 negocios, 3 repartidores (pendiente, aprobado, rechazado), 2 clientes,
// productos con código QR y un pedido con oferta abierta. Todas las claves son 1234: cámbialas
// o no corras esto en la base real. Se puede correr varias veces: no duplica nada.
import { conectar, migrar, q, uno, cerrar } from './db.mjs';
import { hashClave } from './auth.mjs';
import { fileURLToPath } from 'node:url';

const avatar = (ini, color) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="20" fill="${color}"/><text x="60" y="75" font-size="44" font-family="Arial" font-weight="700" text-anchor="middle" fill="#fff">${ini}</text></svg>`);
const doc = (txt, color) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="${color}"/><text x="20" y="40" font-size="20" font-family="Arial" font-weight="700" fill="#fff">${txt}</text><text x="20" y="180" font-size="13" font-family="Arial" fill="#fff">DOCUMENTO DE PRUEBA · NO VÁLIDO</text></svg>`);

async function archivo(propietario, tipo, datos, privado = true) {
  return (await uno('insert into archivos(propietario_id, tipo, mime, datos, bytes, privado) values ($1,$2,$3,$4,$5,$6) returning id',
    [propietario, tipo, 'image/svg+xml', datos, datos.length, privado])).id;
}
async function usuario(tel, usuario, nombre, roles) {
  await q(`insert into usuarios(telefono, usuario, nombre, clave_hash, roles) values ($1,$2,$3,$4,$5) on conflict (telefono) do nothing`, [tel, usuario, nombre, hashClave('1234'), roles]);
  return (await uno('select id from usuarios where telefono=$1', [tel])).id;
}

export async function sembrar({ conOferta = true } = {}) {
  const admin = await usuario('3000000001', 'admin', 'Administración LobaMall', ['admin', 'cliente']);
  await usuario('3000000002', 'equipo', 'Equipo de fotos LobaMall', ['equipo', 'cliente']);
  const maria = await usuario('3105550102', 'maria', 'María de Chimí', ['cliente']);
  const juan = await usuario('3124441020', 'juan', 'Juan Pérez', ['cliente']);
  const dRancho = await usuario('3001004000', 'rancho', 'Don Juan Ríos', ['negocio', 'cliente']);
  const cRancho = await usuario('3001004001', 'rancho-cajero', 'Mesero de turno', ['negocio', 'cliente']);
  const dDrog = await usuario('3001374111', 'drogueria', 'Dueña Droguería Loba', ['negocio', 'cliente']);

  const negocios = [
    ['rancho', 'Rancho Costeño', 'comida', 'Calle Principal, Hatillo', 8.95612, -74.07721, '3001004000', '3102005000'],
    ['drogueria', 'Droguería Loba', 'farmacia', 'Frente a la iglesia, Hatillo', 8.95531, -74.07648, '3001374111', '3102915679']
  ];
  for (const n of negocios)
    await q(`insert into negocios(id, nombre, categoria, municipio, zona_id, direccion, lat, lng, telefono, nequi) values ($1,$2,$3,'Hatillo de Loba','hatillo',$4,$5,$6,$7,$8) on conflict (id) do nothing`, n);
  for (const [nid, uid, rol] of [['rancho', dRancho, 'dueno'], ['rancho', cRancho, 'cajero'], ['drogueria', dDrog, 'dueno']])
    await q('insert into negocio_usuarios values ($1,$2,$3) on conflict do nothing', [nid, uid, rol]);

  const reps = [
    { tel: '3001112233', u: 'danto', nombre: 'Danto Ruiz Pérez', cedula: '1047400111', placa: 'HTL12A', marca: 'Bajaj Boxer', color: 'Roja', estado: 'aprobado', motivo: null, color2: '#16a34a', conectado: true },
    { tel: '3008889900', u: 'yeison', nombre: 'Yeison Mendoza Arias', cedula: '1047400222', placa: 'SML34B', marca: 'AKT NKD', color: 'Negra', estado: 'pendiente', motivo: null, color2: '#2563eb', conectado: false },
    { tel: '3016667788', u: 'kelly', nombre: 'Kelly Arrieta Gómez', cedula: '1047400333', placa: 'BRL56C', marca: 'Yamaha XTZ', color: 'Azul', estado: 'rechazado', motivo: 'La foto del pase de conducción no se lee. Tómala de nuevo con buena luz.', color2: '#9333ea', conectado: false }
  ];
  for (const r of reps) {
    const id = await usuario(r.tel, r.u, r.nombre, ['cliente', 'repartidor']);
    if (await uno('select 1 from repartidores where usuario_id=$1', [id])) continue;
    const ini = r.nombre.split(' ').map(x => x[0]).slice(0, 2).join('');
    const f = await archivo(id, 'foto_repartidor', avatar(ini, r.color2));
    const c = await archivo(id, 'cedula', doc('CÉDULA · ' + r.nombre, '#475569'));
    const p = await archivo(id, 'pase', doc('PASE · ' + r.nombre, '#0f766e'));
    await q(`insert into repartidores(usuario_id, nombre_completo, cedula, foto_id, cedula_foto_id, pase_foto_id, moto_marca, moto_color, placa, telefono, nequi, zona_id,
               estado_aprobacion, motivo_rechazo, revisado_por, revisado_en, conectado, habeas_data_en, habeas_data_version)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,'hatillo',$11,$12,$13,$14,$15, now(), '2026-11')`,
      [id, r.nombre, r.cedula, f, c, p, r.marca, r.color, r.placa, r.tel, r.estado, r.motivo, r.estado === 'pendiente' ? null : admin, r.estado === 'pendiente' ? null : new Date(), r.conectado]);
  }

  // Productos con código (el QR apunta a este código)
  const prods = [
    ['asado', 'rancho', 'Asado Especial', 'Asados', 30000, 30, 'Cocina · sale al momento'],
    ['mojarra', 'rancho', 'Mojarra frita con patacón', 'Pescados', 28000, 12, 'Cocina · sale al momento'],
    ['sancocho', 'rancho', 'Sancocho de gallina', 'Almuerzos', 18000, 20, 'Cocina · olla de leña'],
    ['suero', 'drogueria', 'Suero oral x2', 'Medicamentos', 7000, 40, 'Vitrina 1, segundo nivel'],
    ['acetaminofen', 'drogueria', 'Acetaminofén 500 mg x10', 'Medicamentos', 3000, 100, 'Detrás del mostrador, cajón A'],
    ['panales', 'drogueria', 'Pañales etapa 3 x30', 'Bebés', 46000, 18, 'Estante del fondo, abajo'],
    ['bloqueador', 'drogueria', 'Bloqueador solar SPF 50', 'Cuidado personal', 25000, 12, 'Exhibidor de la entrada']
  ];
  const pref = { rancho: 'RC', drogueria: 'DL' };
  for (const nid of Object.keys(pref)) await q('insert into productos_consecutivo(negocio_id, prefijo) values ($1,$2) on conflict do nothing', [nid, pref[nid]]);
  for (const [id, nid, nombre, cat, precio, stock, ubic] of prods) {
    if (await uno('select 1 from productos where id=$1', [id])) continue;
    const r = await uno('update productos_consecutivo set ultimo=ultimo+1 where negocio_id=$1 returning prefijo, ultimo', [nid]);
    await q(`insert into productos(id, negocio_id, codigo, nombre, categoria, precio, stock, ubicacion) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, nid, `${r.prefijo}-${String(r.ultimo).padStart(4, '0')}`, nombre, cat, precio, stock, ubic]);
  }

  if (conOferta && !(await uno(`select 1 from pedidos where negocio_id='rancho' and numero=127`))) {
    const pe = await uno(`insert into pedidos(numero, negocio_id, cliente_id, cliente_nombre, cliente_tel, items, subtotal, domicilio, total, modo, zona_id, direccion, pago, origen, estado)
                          values (127,'rancho',$1,'Juan Pérez','3124441020',$2,50000,4000,54000,'domicilio','hatillo','Calle Principal, al lado de la cancha','efectivo','lobamall','buscando_repartidor') returning id`,
      [juan, JSON.stringify([{ id: 'asado', n: 'Asado Especial', q: 2, p: 25000 }])]);
    await q(`insert into ofertas_domicilio(pedido_id, negocio_id, zona_id, valor, origen_lat, origen_lng, destino_lat, destino_lng, destino_texto, distancia_km, minutos, vence_en)
             values ($1,'rancho','hatillo',4000,8.95612,-74.07721,8.9549,-74.0791,'Calle Principal, al lado de la cancha',0.3,4, now() + interval '10 minutes')`, [pe.id]);
  }
  return { admin, maria, juan };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.env.NODE_ENV === 'production' && process.env.SEMILLA_EN_PRODUCCION !== 'si') {
    console.error('Esta semilla crea cuentas con clave 1234. No se corre en producción (define SEMILLA_EN_PRODUCCION=si si de verdad quieres).');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL'); process.exit(1); }
  conectar();
  await migrar();
  await sembrar();
  console.log('Semilla lista. Cuentas (clave 1234): admin, equipo, rancho, rancho-cajero, drogueria, danto (aprobado), yeison (pendiente), kelly (rechazado), maria, juan');
  await cerrar();
}
