// Lainec · despachador de notificaciones
// Fase 1: tiempo real dentro de la app (SSE).  Fase 2: Web Push.  Fase 3: WhatsApp (adaptador apagado).
// La regla de oro: a un repartidor en MODO CLIENTE, DESCONECTADO o NO APROBADO no se le envía
// ningún aviso de domicilio. Se filtra aquí, en el servidor, con la consulta de elegibles.
import { uno, filas } from './db.mjs';
import * as rt from './tiempo-real.mjs';
import { enviarPush } from './canales/webpush.mjs';
import { enviarWhatsApp, whatsappActivo } from './canales/whatsapp.mjs';

// Registro de lo que se intentó enviar (lo usan las pruebas para verificar el filtro)
export const bitacora = [];
const anotar = x => { bitacora.push({ ...x, ts: Date.now() }); if (bitacora.length > 500) bitacora.shift(); };

export async function notificar(usuarioId, { tipo, titulo, cuerpo, datos = {}, clave, push = true }) {
  const fila = await uno(
    `insert into notificaciones(usuario_id, tipo, titulo, cuerpo, datos, clave_dedupe)
     values ($1,$2,$3,$4,$5,$6) on conflict (usuario_id, clave_dedupe) do nothing returning id, creada`,
    [usuarioId, tipo, titulo, cuerpo, datos, clave || `${tipo}:${Date.now()}:${Math.random()}`]);
  if (!fila) return false; // ya se había avisado: no se duplica
  const n = { id: fila.id, tipo, titulo, cuerpo, datos, creada: fila.creada };
  rt.enviar(usuarioId, 'notificacion', n);
  anotar({ canal: 'app', usuarioId, tipo });
  if (push) {
    const r = await enviarPush(usuarioId, { titulo, cuerpo, tipo, datos, id: fila.id, url: datos.url || './index.html?app=1#rep' });
    if (r.enviados) anotar({ canal: 'push', usuarioId, tipo });
  }
  if (whatsappActivo()) await enviarWhatsApp({ usuarioId, plantilla: tipo, variables: datos });
  return true;
}

// Repartidores que SÍ pueden recibir una oferta de esta zona
export function repartidoresElegibles(zonaId, excluirClienteId = null) {
  return filas(
    `select usuario_id from repartidores
      where estado_aprobacion = 'aprobado' and conectado and modo_actual = 'trabajo'
        and (zona_id = $1 or $1 = any(zonas_extra))
        and ($2::bigint is null or usuario_id <> $2)`, [zonaId, excluirClienteId]);
}

export async function avisarOfertaNueva(oferta, tarjeta) {
  const ids = (await repartidoresElegibles(oferta.zona_id, tarjeta.cliente_id || null)).map(r => r.usuario_id);
  for (const id of ids) {
    rt.enviar(id, 'oferta_nueva', tarjeta.publica);
    await notificar(id, {
      tipo: 'oferta_domicilio',
      titulo: `Domicilio ${pesos(oferta.valor)} · ${tarjeta.publica.negocio}`,
      cuerpo: `Para ${tarjeta.publica.destino}. ${tarjeta.publica.distancia_txt}`,
      datos: { oferta_id: oferta.id, url: './index.html?app=1#rep' },
      clave: `oferta:${oferta.id}:${oferta.intento}`
    });
  }
  return ids;
}

// La tarjeta desaparece para todos: se avisa a todos los repartidores aprobados conectados por SSE
export async function avisarOfertaRetirada(ofertaId, motivo, ganadorId = null) {
  const ids = (await filas(`select usuario_id from repartidores where estado_aprobacion='aprobado'`)).map(r => r.usuario_id);
  const vivos = new Set(rt.conectados());
  for (const id of ids) if (vivos.has(id)) rt.enviar(id, 'oferta_retirada', { id: Number(ofertaId), motivo, tuya: id === ganadorId });
}

// Avisos al negocio (dueño y cajeros) y al cliente del pedido
export async function usuariosNegocio(negocioId) {
  return (await filas('select usuario_id from negocio_usuarios where negocio_id=$1', [negocioId])).map(r => r.usuario_id);
}
export async function avisarEstado(oferta, pedido, texto, extra = {}) {
  const evento = { oferta_id: oferta.id, pedido_id: oferta.pedido_id, numero: pedido.numero, estado: oferta.estado, texto, ...extra };
  const neg = await usuariosNegocio(oferta.negocio_id);
  rt.enviarVarios(neg, 'domicilio_estado', evento);
  if (pedido.cliente_id) rt.enviar(pedido.cliente_id, 'domicilio_estado', evento);
  if (oferta.repartidor_id) rt.enviar(oferta.repartidor_id, 'domicilio_estado', evento);
  return { neg };
}

const pesos = n => '$' + Math.round(n).toLocaleString('es-CO');
export { pesos };
