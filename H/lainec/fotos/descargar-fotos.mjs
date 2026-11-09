// Descarga las fotos de stock del catálogo (Unsplash, licencia Unsplash) a img/productos/
// Uso:  npm run fotos      (necesita internet; corre en tu computador)
// - Solo baja fotos gratuitas: si una foto resulta ser Unsplash+ (de pago), la salta y lo avisa.
// - Deja img/productos/CREDITOS.md con autor y enlace de cada foto.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const RAIZ = new URL('../', import.meta.url);
const DEST = new URL('img/productos/', RAIZ);
await mkdir(DEST, { recursive: true });
const cat = JSON.parse(await readFile(new URL('fotos/catalogo.json', RAIZ), 'utf8'));

const porFoto = {};
for (const [pid, f] of Object.entries(cat)) (porFoto[f.u] ??= { ...f, pids: [] }).pids.push(pid);

const ok = [], fallo = [];
for (const [u, f] of Object.entries(porFoto)) {
  const url = `https://unsplash.com/photos/${u}/download?force=true&w=1080`;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Lainec-prototipo' } });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || !tipo.startsWith('image/')) throw new Error(`no es una foto gratuita (${r.status} ${tipo || 'sin tipo'})`);
    const buf = Buffer.from(await r.arrayBuffer());
    const primero = new URL(`${f.pids[0]}.jpg`, DEST);
    await writeFile(primero, buf);
    for (const pid of f.pids.slice(1)) await copyFile(primero, new URL(`${pid}.jpg`, DEST));
    ok.push({ u, ...f });
    console.log(`  ✔ ${f.pids.join(', ')}  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    fallo.push({ u, ...f, error: e.message });
    console.log(`  ✘ ${f.pids.join(', ')}  → ${e.message}`);
  }
}

const md = ['# Créditos de las fotos', '', 'Fotos de [Unsplash](https://unsplash.com/license): uso libre, también comercial, sin pedir permiso. Igual damos el crédito.', '',
  '| Producto(s) | Foto | Autor |', '|---|---|---|',
  ...ok.map(f => `| ${f.pids.join(', ')} | [${f.d}](https://unsplash.com/photos/${f.u}) | ${f.a} |`),
  '', fallo.length ? '## No se descargaron\n\n' + fallo.map(f => `- ${f.pids.join(', ')}: ${f.error}`).join('\n') : ''].join('\n');
await writeFile(new URL('CREDITOS.md', DEST), md + '\n');
console.log(`\n${ok.length} fotos descargadas, ${fallo.length} saltadas. Créditos en img/productos/CREDITOS.md`);
console.log('Los productos sin foto siguen mostrando su ilustración. Recarga la app para verlas.');
