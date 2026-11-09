// Lainec v8 · Pruebas de la nueva identidad y de las mejoras tomadas de las plataformas de referencia
// Uso:  npm run test:v8   (no necesita base de datos)
import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';
import { iniciar } from '../servidor.mjs';

const PUERTO = 8093;
const DIR = `http://localhost:${PUERTO}/index.html`;
const resultados = [];
async function prueba(nombre, fn) {
  const t0 = Date.now();
  try { await fn(); resultados.push({ ok: true, nombre, ms: Date.now() - t0 }); console.log(`  ✔ ${nombre}`); }
  catch (e) { resultados.push({ ok: false, nombre, ms: Date.now() - t0, error: e.message.split('\n')[0] }); console.log(`  ✘ ${nombre}\n      → ${e.message.split('\n')[0]}`); }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };

const servidor = await iniciar(PUERTO);
const navegador = await chromium.launch();
async function pagina(vp = { width: 1366, height: 900 }) {
  const ctx = await navegador.newContext({ viewport: vp });
  await ctx.addInitScript(() => { try { localStorage.setItem('hm-pruebas', '1'); } catch (e) {} });
  const page = await ctx.newPage(); page.errores = [];
  page.on('pageerror', e => page.errores.push(e.message));
  return { ctx, page };
}

console.log('Identidad Lainec');
await prueba('El nombre visible es Lainec y no queda "LobaMall" ni "HatilloMall" en pantalla', async () => {
  const { ctx, page } = await pagina();
  await page.goto(DIR + '#inicio'); await page.waitForSelector('.lx-chips');
  afirmar((await page.title()).startsWith('Lainec'), 'El título de la pestaña no dice Lainec');
  const txt = await page.evaluate(() => document.body.innerText);
  afirmar(!/LobaMall|HatilloMall|LobaPago|HatilloPago/i.test(txt), 'Todavía aparece un nombre viejo en pantalla');
  afirmar(txt.includes('Lo que conecta a Loba'), 'Falta el eslogan');
  afirmar(page.errores.length === 0, 'Errores de JavaScript: ' + page.errores.join(' | '));
  await ctx.close();
});
await prueba('El manifiesto, el color del tema y el ícono son de Lainec', async () => {
  const m = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  afirmar(m.short_name === 'Lainec', 'short_name no es Lainec');
  afirmar(m.theme_color === '#0B5D63', 'El color del tema no es Ciénaga');
  const svg = await readFile(new URL('../icons/favicon.svg', import.meta.url), 'utf8');
  afirmar(svg.includes('#0B5D63') && svg.includes('#F4C21B'), 'El ícono no usa Ciénaga y Luciérnaga');
});
await prueba('El encabezado usa Ciénaga y el botón de buscar usa Corozo', async () => {
  const { ctx, page } = await pagina();
  await page.goto(DIR + '#inicio'); await page.waitForSelector('header.top');
  const [hdr, btn] = await page.evaluate(() => [getComputedStyle(document.querySelector('header.top')).backgroundColor, getComputedStyle(document.querySelector('.search button')).backgroundColor]);
  afirmar(hdr === 'rgb(11, 93, 99)', 'Encabezado: ' + hdr);
  afirmar(btn === 'rgb(194, 39, 45)', 'Botón de buscar: ' + btn);
  await ctx.close();
});

console.log('Mejoras de experiencia');
await prueba('Inicio: atajos de categorías que llevan a la categoría (Temu, Shein, Dafiti)', async () => {
  const { ctx, page } = await pagina({ width: 390, height: 844 });
  await page.goto(DIR + '#inicio'); await page.waitForSelector('.lx-chip');
  afirmar(await page.locator('.lx-chip').count() >= 8, 'Faltan atajos');
  await page.click('.lx-chip[data-h="c-farmacia"]'); await page.waitForTimeout(400);
  afirmar((await page.evaluate(() => location.hash)) === '#buscar', 'El atajo no abrió la categoría');
  const sinLateral = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  afirmar(sinLateral, 'La página se desplaza hacia los lados en el celular');
  await ctx.close();
});
await prueba('Inicio: franja de confianza con pago al recibir, domicilio, compra protegida y sin señal', async () => {
  const { ctx, page } = await pagina();
  await page.goto(DIR + '#inicio'); await page.waitForSelector('.lx-trust');
  const t = await page.textContent('.lx-trust');
  ['Pagas al recibir', 'Domicilio desde', 'Compra protegida', 'Funciona sin señal'].forEach(x => afirmar(t.includes(x), 'Falta: ' + x));
  await ctx.close();
});
await prueba('Inicio: "Pedir de nuevo" aparece para la cliente con pedidos entregados y agrega al carrito', async () => {
  const { ctx, page } = await pagina();
  await page.goto(DIR + '#inicio');
  await page.click('#btnCuenta'); await page.waitForSelector('form[data-form="login"]');
  await page.fill('form[data-form="login"] input[name="u"]', 'maria'); await page.fill('form[data-form="login"] input[name="p"]', '1234');
  await page.click('form[data-form="login"] button[type="submit"]'); await page.waitForTimeout(500);
  await page.goto(DIR + '#inicio'); await page.waitForTimeout(400);
  afirmar(await page.locator('.lx-ag').count() > 0, 'No aparece "Pedir de nuevo"');
  const antes = +(await page.textContent('#nCart'));
  await page.click('.lx-ag .btn[data-act="add"]:not([disabled])'); await page.waitForTimeout(300);
  afirmar(+(await page.textContent('#nCart')) === antes + 1, 'No sumó al carrito');
  await ctx.close();
});
await prueba('Buscador: "Lo más buscado en el pueblo" busca con un toque (Amazon, Mercado Libre)', async () => {
  const { ctx, page } = await pagina();
  await page.goto(DIR + '#inicio'); await page.focus('#q'); await page.waitForSelector('.lx-pop button');
  const q = await page.getAttribute('.lx-pop button', 'data-q');
  await page.click('.lx-pop button'); await page.waitForTimeout(400);
  afirmar((await page.evaluate(() => location.hash)) === '#buscar', 'No abrió la búsqueda');
  afirmar((await page.inputValue('#q')) === q || (await page.textContent('#app')).includes(q), 'No buscó el término');
  await ctx.close();
});
await prueba('Ficha en el celular: barra fija con precio, Agregar y Comprar (Shein, Temu); en computador no aparece', async () => {
  const { ctx, page } = await pagina({ width: 390, height: 844 });
  await page.goto(DIR + '#p-asado'); await page.waitForTimeout(600);
  afirmar(await page.isVisible('#lxBuy.on'), 'La barra fija no se ve al abrir la ficha');
  await page.click('#lxBuy [data-act="pv-add"]'); await page.waitForTimeout(300);
  afirmar(+(await page.textContent('#nCart2')) >= 1, 'Agregar desde la barra no sumó al carrito');
  await page.goto(DIR + '#inicio'); await page.waitForTimeout(300);
  afirmar(!(await page.evaluate(() => document.body.classList.contains('lx-bar'))), 'La barra se quedó pegada al salir de la ficha');
  await ctx.close();
  const d = await pagina();
  await d.page.goto(DIR + '#p-asado'); await d.page.waitForTimeout(500);
  afirmar(!(await d.page.isVisible('#lxBuy')), 'En computador no debe aparecer la barra fija');
  await d.ctx.close();
});
await prueba('La entrada de la app (municipio y rol) usa Ciénaga, no amarillo', async () => {
  const { ctx, page } = await pagina({ width: 390, height: 844 });
  await page.goto(DIR.replace('index.html', 'index.html?app=1') + '#inicio'); await page.waitForSelector('.lm-muni-it');
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.lm-muni-ovl')).backgroundImage);
  afirmar(bg.includes('rgb(11, 93, 99)'), 'Fondo de la entrada: ' + bg);
  await ctx.close();
});

await navegador.close(); servidor.close();
const ok = resultados.filter(r => r.ok).length;
const reporte = ['Lainec v8 · Reporte de pruebas de identidad y experiencia', `Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`, `Resultado: ${ok} de ${resultados.length} pruebas pasaron`, '',
  ...resultados.map((r, i) => `${String(i + 1).padStart(2, '0')}. ${r.ok ? 'PASÓ ' : 'FALLÓ'}  ${r.nombre}  (${(r.ms / 1000).toFixed(1)} s)${r.ok ? '' : '\n      ' + r.error}`)].join('\n');
await writeFile(new URL('./reporte-v8.txt', import.meta.url), reporte + '\n');
console.log(`\n${ok} de ${resultados.length} pruebas pasaron. Reporte: tests/reporte-v8.txt\n`);
process.exit(ok === resultados.length ? 0 : 1);
