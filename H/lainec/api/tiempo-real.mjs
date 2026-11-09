// Lainec · tiempo real con Server-Sent Events (SSE). Sin dependencias.
// Cada usuario puede tener varias pestañas o celulares conectados al tiempo.
const conexiones = new Map(); // usuarioId -> Set(res)

export function abrir(req, res, usuario) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 4000\n\n');
  res.write(`event: hola\ndata: ${JSON.stringify({ usuario: usuario.id })}\n\n`);
  let set = conexiones.get(usuario.id);
  if (!set) conexiones.set(usuario.id, set = new Set());
  set.add(res);
  const latido = setInterval(() => { try { res.write(': latido\n\n'); } catch {} }, 25000);
  req.on('close', () => {
    clearInterval(latido);
    set.delete(res);
    if (!set.size) conexiones.delete(usuario.id);
  });
}

export function enviar(usuarioId, evento, datos) {
  const set = conexiones.get(Number(usuarioId));
  if (!set) return 0;
  const msg = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const res of set) { try { res.write(msg); } catch {} }
  return set.size;
}
export const enviarVarios = (ids, evento, datos) => ids.reduce((n, id) => n + enviar(id, evento, datos), 0);
export const conectados = () => [...conexiones.keys()];
export function cerrarTodo() { for (const set of conexiones.values()) for (const r of set) { try { r.end(); } catch {} } conexiones.clear(); }
