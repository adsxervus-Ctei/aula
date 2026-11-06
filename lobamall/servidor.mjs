// LobaMall · servidor: archivos de la app + API (si hay base de datos)
//   Solo la tienda (sin repartidores):   node servidor.mjs
//   Con API y base de datos:             DATABASE_URL=postgres://… node servidor.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conectar, migrar, hayDB } from './api/db.mjs';
import { manejar, vencerOfertas } from './api/rutas.mjs';
import { iniciarPush } from './api/canales/webpush.mjs';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PUERTO = Number(process.env.PORT) || 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8'
};
// Solo se publican los archivos de la app. Nunca node_modules, api/, tests/, .env ni package.json.
const PUBLICO = [/^\/index\.html$/, /^\/sw\.js$/, /^\/manifest\.webmanifest$/, /^\/privacidad\.html$/, /^\/(css|js|icons|img)\//];

let timerVence = null;

export async function iniciarApi({ url = process.env.DATABASE_URL, vencimientoMs = 20000 } = {}) {
  if (!url) return false;
  conectar(url);
  await migrar();
  iniciarPush();
  if (vencimientoMs) {
    clearInterval(timerVence);
    timerVence = setInterval(() => vencerOfertas().catch(e => console.error('[vencimiento]', e.message)), vencimientoMs);
    timerVence.unref();
  }
  return true;
}

export function iniciar(puerto = PUERTO) {
  const srv = http.createServer(async (req, res) => {
    const segura = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    let ruta;
    try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }

    if (ruta.startsWith('/api/')) {
      if (!hayDB()) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'El servidor está funcionando sin base de datos. Los repartidores necesitan DATABASE_URL (ver GUIA-DESPLIEGUE.md).', codigo: 'sin_db' }));
        return;
      }
      return manejar(req, res, { segura });
    }
    try {
      if (ruta === '/' || ruta === '') ruta = '/index.html';
      if (!PUBLICO.some(re => re.test(ruta))) throw new Error('privado');
      const archivo = normalize(join(RAIZ, ruta));
      if (!archivo.startsWith(RAIZ) || archivo.includes(sep + '..')) throw new Error('fuera');
      const datos = await readFile(archivo);
      const h = {
        'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()'
      };
      if (segura) h['Strict-Transport-Security'] = 'max-age=31536000';
      if (ruta === '/sw.js') h['Service-Worker-Allowed'] = '/';
      res.writeHead(200, h);
      res.end(datos);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
    }
  });
  srv.keepAliveTimeout = 65000;
  return new Promise(ok => srv.listen(puerto, () => ok(srv)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    try {
      const api = await iniciarApi();
      await iniciar();
      console.log(`LobaMall corriendo en http://localhost:${PUERTO}  (Ctrl+C para detener)`);
      console.log(api ? 'API y base de datos: activas.' : 'Sin DATABASE_URL: solo la tienda (modo prototipo). Repartidores y admin desactivados.');
    } catch (e) {
      console.error('No se pudo iniciar:', e.message);
      process.exit(1);
    }
  })();
}
