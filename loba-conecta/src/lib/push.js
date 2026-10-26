// Notificaciones en el celular (Web Push)
import { api } from '../api/index.js';
import { VAPID_PUBLIC_KEY, DEMO } from '../config.js';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function pushSupport() {
  if (DEMO) return { ok: false, reason: 'En el modo demo las notificaciones se simulan dentro de la app.' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (isIOS() && !isStandalone()) {
      return { ok: false, reason: 'En iPhone primero instala la app: botón Compartir → "Agregar a inicio". Luego actívalas desde ahí.' };
    }
    return { ok: false, reason: 'Este navegador no permite notificaciones. Prueba con Chrome.' };
  }
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'Falta configurar la llave de notificaciones (VITE_VAPID_PUBLIC_KEY).' };
  return { ok: true };
}

export async function registerSW() {
  if (DEMO || !('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('./sw.js'); } catch { return null; }
}

function b64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function pushStatus() {
  if (!pushSupport().ok) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export async function enablePush() {
  const s = pushSupport();
  if (!s.ok) throw new Error(s.reason);
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No diste permiso. Puedes activarlo en la configuración del navegador.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
  if (!reg) throw new Error('No se pudo preparar la app para notificaciones.');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY) });
  }
  await api.savePushSubscription(sub);
  return true;
}

export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.deletePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
}

// Aviso local cuando llega algo en tiempo real y la app está en segundo plano
export async function localNotify(title, body, url) {
  try {
    if (DEMO || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.showNotification(title, { body, icon: './icon-192.png', data: { url } });
  } catch { /* sin soporte */ }
}
