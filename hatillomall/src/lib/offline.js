// Cola de ventas y gastos sin internet.
// Si se va la luz o la señal, lo anotado se guarda en este celular y se sube solo al volver.
// Cada registro lleva su propio id: si se envía dos veces, la base lo cuenta una sola vez.
const KEY = 'hatillomall-cola-v1';
const listeners = new Set();

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ }
  listeners.forEach((fn) => fn(list));
}
export const pending = () => read();
export const onQueue = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export const isNetworkError = (e) => /fetch|network|Failed to|NetworkError|Load failed/i.test(String(e?.message || e));

export function enqueue(kind, payload) {
  write([...read(), { kind, payload, queued_at: new Date().toISOString() }]);
}

// Intenta guardar; si no hay internet, lo deja en la cola. Devuelve { queued: bool }
export async function saveOrQueue(kind, payload, send) {
  if (isOffline()) { enqueue(kind, payload); return { queued: true }; }
  try { await send(payload); return { queued: false }; }
  catch (e) {
    if (isNetworkError(e)) { enqueue(kind, payload); return { queued: true }; }
    throw e;
  }
}

let flushing = false;
export async function flush(senders) {
  if (flushing || isOffline()) return 0;
  const list = read();
  if (!list.length) return 0;
  flushing = true;
  let sent = 0;
  const rest = [];
  for (const item of list) {
    try { await senders[item.kind](item.payload); sent++; }
    catch (e) { if (isNetworkError(e)) rest.push(item); else sent++; /* error de datos: no se reintenta para no bloquear la cola */ }
  }
  write(rest);
  flushing = false;
  return sent;
}
