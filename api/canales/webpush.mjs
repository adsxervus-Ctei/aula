// LobaMall · Canal Web Push (Fase 2). Requiere llaves VAPID en variables de entorno.
// Genera las llaves una vez con:  npm run llaves-push
import webpush from 'web-push';
import { q, filas } from '../db.mjs';

let listo = false;
export function iniciarPush() {
  const { VAPID_PUBLICA, VAPID_PRIVADA, VAPID_CONTACTO } = process.env;
  if (!VAPID_PUBLICA || !VAPID_PRIVADA) { listo = false; return false; }
  webpush.setVapidDetails(VAPID_CONTACTO || 'mailto:soporte@lobamall.com', VAPID_PUBLICA, VAPID_PRIVADA);
  listo = true;
  return true;
}
export const pushActivo = () => listo;
export const clavePublica = () => process.env.VAPID_PUBLICA || null;

// Para las pruebas: permite reemplazar el envío real por uno falso
let enviador = (sub, cuerpo, opts) => webpush.sendNotification(sub, cuerpo, opts);
export function usarEnviador(fn) { enviador = fn; listo = true; }

export async function enviarPush(usuarioId, carga) {
  if (!listo) return { enviados: 0, motivo: 'push sin configurar' };
  const subs = await filas('select id, endpoint, p256dh, auth from suscripciones_push where usuario_id=$1', [usuarioId]);
  let enviados = 0;
  await Promise.all(subs.map(async s => {
    try {
      await enviador({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(carga), { TTL: 600, urgency: 'high' });
      enviados++;
    } catch (e) {
      // 404/410: la suscripción ya no existe (desinstalaron la app o borraron datos)
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await q('delete from suscripciones_push where id=$1', [s.id]);
      else await q('update suscripciones_push set ultimo_error=$2 where id=$1', [s.id, String(e && e.message || e).slice(0, 300)]);
    }
  }));
  return { enviados };
}
