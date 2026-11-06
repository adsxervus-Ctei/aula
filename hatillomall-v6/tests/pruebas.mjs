// Pruebas automáticas de HatilloMall v6
// Uso:  npm test        (necesita: npm install  y  npm run instalar-navegador)
// Abre la app en un navegador Chromium invisible, recorre los flujos del cliente,
// del dueño y del cajero, y deja un reporte en tests/reporte.txt y capturas en tests/capturas/.
import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { iniciar } from '../servidor.mjs';

const PUERTO = 8091;
const DIR = `http://localhost:${PUERTO}/index.html`;
const CAP = new URL('./capturas/', import.meta.url);
await mkdir(CAP, { recursive: true });

const resultados = [];
let navegador, servidor;

async function prueba(nombre, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultados.push({ ok: true, nombre, ms: Date.now() - t0 });
    console.log(`  ✔ ${nombre}`);
  } catch (e) {
    resultados.push({ ok: false, nombre, ms: Date.now() - t0, error: e.message.split('\n')[0] });
    console.log(`  ✘ ${nombre}\n      → ${e.message.split('\n')[0]}`);
  }
}
const afirmar = (cond, msg) => { if (!cond) throw new Error(msg); };

async function nuevaPagina(opts = {}, real = false) {
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 900 }, ...opts });
  // Las pruebas de flujo desactivan la ficha de instalación y el tutorial para que no tapen la pantalla.
  if (!real) await ctx.addInitScript(() => { try { localStorage.setItem('hm-pruebas', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.errores = [];
  page.on('pageerror', e => page.errores.push(e.message));
  await page.goto(DIR + '#inicio');
  await page.waitForSelector('#mlhero');
  return { ctx, page };
}
async function entrarCliente(page) {
  await page.click('#btnCuenta');
  await page.fill('#lgU', 'maria');
  await page.fill('#lgP', '1234');
  await page.click('form[data-form="login"] button[type="submit"]');
  await page.waitForSelector('#modal', { state: 'hidden' });
}
async function entrarNegocio(page, usuario) {
  await page.evaluate(() => document.querySelector('[data-act="login"][data-tab="negocio"]').click());
  await page.fill('#lgU', usuario);
  await page.fill('#lgP', '1234');
  await page.click('form[data-form="login"] button[type="submit"]');
  await page.waitForSelector('.pn');
}

try {
  servidor = await iniciar(PUERTO);
  navegador = await chromium.launch();
  console.log('\nHatilloMall v6 · pruebas automáticas\n');

  console.log('Portada y PWA');
  await prueba('La portada carga sin errores de JavaScript', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.waitForTimeout(800);
    afirmar(page.errores.length === 0, 'Errores: ' + page.errores.join(' | '));
    afirmar(await page.locator('.mlhero .hs.on').count() === 1, 'No se ve el carrusel principal');
    afirmar(await page.locator('.vendors .vd').count() === 12, 'No aparecen los 12 negocios');
    await page.screenshot({ path: new URL('01-portada.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('El manifiesto de la app es válido y sus íconos existen', async () => {
    const { ctx, page } = await nuevaPagina();
    const m = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
    afirmar(m.name && m.start_url && m.display === 'standalone', 'Faltan campos en el manifiesto');
    for (const i of m.icons) {
      const st = await page.evaluate(async s => (await fetch(s)).status, i.src);
      afirmar(st === 200, 'Falta el ícono ' + i.src);
    }
    await ctx.close();
  });
  await prueba('El service worker se registra y la app abre sin internet', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('#mlhero');
    await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('#mlhero', { timeout: 8000 });
    afirmar(await page.locator('.vendors .vd').count() === 12, 'Sin internet no cargó la tienda');
    await ctx.close();
  });
  await prueba('En el celular (390 px) no hay desplazamiento horizontal', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } });
    for (const h of ['inicio', 'p-asado', 'buscar', 'cupones']) {
      await page.evaluate(x => location.hash = x, h); await page.waitForTimeout(300);
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      afirmar(w <= 392, `La vista #${h} mide ${w}px de ancho`);
    }
    await page.evaluate(() => location.hash = 'inicio'); await page.waitForTimeout(300);
    await page.screenshot({ path: new URL('02-celular.png', CAP).pathname });
    await ctx.close();
  });

  console.log('Compra del cliente');
  await prueba('El buscador sugiere productos mientras se escribe', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.click('#q'); await page.type('#q', 'moj');
    await page.waitForSelector('#ac:not([hidden]) [data-act="ver"]');
    afirmar((await page.textContent('#ac')).includes('Mojarra'), 'No sugiere la mojarra');
    await ctx.close();
  });
  await prueba('La ficha del producto muestra precio, opiniones con IA y preguntas', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.evaluate(() => location.hash = 'p-asado'); await page.waitForSelector('.buybox');
    afirmar(await page.locator('text=Comprar ahora').count() > 0, 'Falta "Comprar ahora"');
    afirmar(await page.locator('.iabox').count() > 0, 'Falta el resumen de opiniones');
    await page.click('.qchips button >> nth=0');
    afirmar((await page.textContent('#pqAns')).includes('Chimí'), 'La respuesta rápida no menciona Chimí');
    await page.screenshot({ path: new URL('03-ficha.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('Agregar al carrito actualiza el contador', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.click('.rail .card .add >> nth=0');
    await page.waitForTimeout(300);
    afirmar((await page.textContent('#nCart')).trim() === '1', 'El carrito no subió a 1');
    await ctx.close();
  });
  await prueba('La cliente entra con maria / 1234, pide y el pedido avanza solo', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarCliente(page);
    await page.evaluate(() => location.hash = 'p-sancocho'); await page.waitForSelector('.buybox');
    await page.click('[data-act="pv-buy"]');
    await page.waitForSelector('[data-act="co-go"]');
    await page.click('[data-act="co-go"]');
    await page.waitForSelector('text=Pedido #128');
    await page.waitForSelector('.sh-h .pill:has-text("Pedido aceptado")', { timeout: 15000 });
    await page.screenshot({ path: new URL('04-seguimiento.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('Un cupón activado se aplica solo en el negocio', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.evaluate(() => location.hash = 'cupones'); await page.waitForSelector('.cupgrid');
    await page.click('.cupon:has-text("CHIMI10") [data-act="cup-act"]');
    await entrarCliente(page);
    await page.evaluate(() => location.hash = 'p-mojarra'); await page.waitForSelector('.buybox');
    await page.click('[data-act="pv-buy"]'); await page.waitForSelector('[data-act="co-go"]');
    afirmar((await page.textContent('#sheet')).includes('Descuento'), 'No se aplicó el descuento');
    await ctx.close();
  });
  await prueba('Pagar con HatilloPago descuenta el saldo', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarCliente(page);
    await page.evaluate(() => location.hash = 'p-jugo'); await page.waitForSelector('.buybox');
    await page.click('[data-act="pv-buy"]'); await page.waitForSelector('[data-act="co-go"]');
    await page.click('label[for="o-pago-saldo"]');
    await page.click('[data-act="co-go"]'); await page.waitForSelector('text=Pedido #128');
    await page.click('[data-act="cerrar"]');
    await page.evaluate(() => location.hash = 'cuenta-billetera'); await page.waitForSelector('#wSaldo');
    // Jugo $3.000 + domicilio a Chimí $8.000 = $11.000  →  $48.500 - $11.000 = $37.500
    afirmar((await page.textContent('#wSaldo')).includes('37.500'), 'El saldo no quedó en $37.500');
    await ctx.close();
  });
  await prueba('Toño (asistente) responde con opciones dentro del presupuesto', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.click('#tonoFab');
    await page.fill('#tnIn', 'almuerzo por menos de 20 mil en chimí');
    await page.press('#tnIn', 'Enter');
    await page.waitForSelector('.tono .tp', { timeout: 4000 });
    afirmar(await page.locator('[data-act="tono-pedir"]').count() > 0, 'No ofrece "Pídelo por mí"');
    await page.screenshot({ path: new URL('05-asistente.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('Sin señal, el pedido queda en cola y sale al volver la señal', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarCliente(page);
    await page.click('.hacts .senal');
    await page.evaluate(() => location.hash = 'p-coco'); await page.waitForSelector('.buybox');
    await page.click('[data-act="pv-buy"]'); await page.waitForSelector('[data-act="co-go"]');
    await page.click('[data-act="co-go"]');
    afirmar((await page.textContent('#toast')).includes('guardado'), 'No avisó que quedó guardado');
    await page.click('.hacts .senal');
    await page.waitForTimeout(300);
    afirmar((await page.textContent('#toast')).includes('Se enviaron 1'), 'No envió el pedido pendiente');
    await ctx.close();
  });

  console.log('Panel del negocio');
  await prueba('El dueño (rancho) ve el tablero del día con ventas, gastos y ganancia', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarNegocio(page, 'rancho');
    const t = await page.textContent('.pn-body');
    afirmar(t.includes('Ventas de hoy') && t.includes('$385.000') && t.includes('$240.000'), 'Cifras del tablero incorrectas');
    afirmar(t.includes('NUEVO PEDIDO #127'), 'No aparece el pedido nuevo');
    await page.screenshot({ path: new URL('06-panel-dueno.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('El dueño acepta un pedido y lo pasa a "Preparando"', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarNegocio(page, 'rancho');
    await page.click('[data-act="o-acept"][data-n="127"]');
    await page.evaluate(() => location.hash = 'panel-pedidos'); await page.waitForTimeout(300);
    await page.click('[data-act="pn-tab"][data-t="curso"]');
    await page.click('[data-act="o-next"][data-n="127"]');
    await page.waitForTimeout(200);
    afirmar((await page.textContent('.pn-body')).includes('Preparando'), 'El pedido no pasó a Preparando');
    await ctx.close();
  });
  await prueba('El dueño publica una oferta y sale en la portada', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarNegocio(page, 'rancho');
    await page.evaluate(() => location.hash = 'panel-promos'); await page.waitForSelector('#prV');
    await page.selectOption('#prP', 'sancocho');
    await page.fill('#prV', '15000'); await page.fill('#prT', 'Sancocho del jueves');
    await page.click('form[data-form="promo"] button[type="submit"]');
    await page.click('[data-act="salir"]'); await page.waitForSelector('#mlhero');
    afirmar((await page.textContent('#mlhero')).includes('Sancocho del jueves'), 'La oferta no salió en la portada');
    await ctx.close();
  });
  await prueba('El cajero solo ve Pedidos y Caja, no la ganancia', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarNegocio(page, 'rancho-cajero');
    const nav = await page.textContent('.pn-nav');
    afirmar(nav.includes('Pedidos') && nav.includes('Caja') && !nav.includes('Balance'), 'El cajero ve secciones del dueño');
    afirmar(!(await page.textContent('.pn-body')).includes('Ganancia de hoy'), 'El cajero ve la ganancia');
    await ctx.close();
  });
  await prueba('El dueño puede eliminar al cajero y ese usuario ya no entra', async () => {
    const { ctx, page } = await nuevaPagina();
    await entrarNegocio(page, 'rancho');
    await page.evaluate(() => location.hash = 'panel-empleados'); await page.waitForSelector('[data-act="emp-del"]');
    await page.click('[data-act="emp-del"]');
    await page.click('[data-act="salir"]'); await page.waitForSelector('#mlhero');
    await page.evaluate(() => document.querySelector('[data-act="login"][data-tab="negocio"]').click());
    await page.fill('#lgU', 'rancho-cajero'); await page.fill('#lgP', '1234');
    await page.click('form[data-form="login"] button[type="submit"]');
    afirmar((await page.textContent('#sheet')).includes('eliminado'), 'El cajero eliminado pudo entrar');
    await ctx.close();
  });
  console.log('Marcas, fotos y celular (v6)');
  await prueba('Los 12 negocios muestran su logo en el directorio', async () => {
    const { ctx, page } = await nuevaPagina();
    afirmar(await page.locator('.vendors .vd-av svg.lg').count() === 12, 'Faltan logos en las tarjetas de negocios');
    await ctx.close();
  });
  await prueba('La página de marcas presenta las 12 identidades con concepto, paleta y dueño', async () => {
    const { ctx, page } = await nuevaPagina();
    await page.evaluate(() => location.hash = 'marcas'); await page.waitForSelector('.bgrid');
    afirmar(await page.locator('.bcard').count() === 12, 'No hay 12 fichas de marca');
    afirmar(await page.locator('.bcard .pal i').count() >= 36, 'Faltan colores de las paletas');
    afirmar(await page.locator('.bcard .own .oav svg').count() === 12, 'Faltan avatares de los dueños');
    await page.screenshot({ path: new URL('07-marcas.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('Cuando existe la foto descargada, la ficha la muestra con su crédito', async () => {
    const { ctx, page } = await nuevaPagina();
    const foto = new URL('../img/productos/asado.jpg', import.meta.url);
    await writeFile(foto, await page.screenshot({ type: 'jpeg', clip: { x: 0, y: 0, width: 400, height: 400 } }));
    try {
      await page.evaluate(() => location.hash = 'p-asado');
      await page.waitForSelector('.gal .credito', { timeout: 5000 });
      afirmar((await page.textContent('.gal .credito')).includes('Tim Toomey'), 'El crédito no nombra al autor');
      await page.evaluate(() => location.hash = 'inicio'); await page.waitForTimeout(500);
      afirmar(await page.locator('img.ph[src*="asado.jpg"]').count() > 0, 'La tarjeta no usa la foto');
    } finally { await rm(foto, { force: true }); }
    await ctx.close();
  });
  await prueba('Celular: los chips de categoría cambian la vista y se puede deslizar', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await page.evaluate(() => location.hash = 'c-comida'); await page.waitForSelector('.mchips');
    afirmar((await page.textContent('.vt-tit')).includes('Restaurantes'), 'No abrió Restaurantes');
    await page.click('.mchip[data-k="farmacia"]'); await page.waitForTimeout(600);
    afirmar((await page.textContent('.vt-tit')).includes('Droguerías'), 'El chip no cambió a Droguerías');
    await page.evaluate(() => { const p = document.getElementById('catPane'); const o = { bubbles: true, pointerType: 'touch', clientY: 400 };
      p.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: 320 })); p.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 120 })); });
    await page.waitForTimeout(700);
    afirmar((await page.textContent('.vt-tit')).includes('Papelerías'), 'Deslizar no pasó a la siguiente categoría');
    await page.screenshot({ path: new URL('08-categorias-celular.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('Celular: "Filtrar" abre una hoja abajo y filtra por negocio', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } });
    await page.evaluate(() => location.hash = 'c-comida'); await page.waitForSelector('.mbar');
    await page.click('[data-act="m-filtros"]'); await page.waitForSelector('.mneg');
    await page.click('.mng:has-text("Asadero El Brazo")');
    await page.click('button[form="mfF"]'); await page.waitForTimeout(400);
    const tiendas = await page.locator('#catPane .card .st').allTextContents();
    afirmar(tiendas.length > 0 && tiendas.every(x => x.includes('Asadero El Brazo')), 'El filtro por negocio no funcionó');
    await ctx.close();
  });
  await prueba('El dueño puede ocultar su foto y la tienda muestra solo el logo', async () => {
    const { ctx, page } = await nuevaPagina();
    afirmar(await page.locator('.vd:has-text("Rancho Costeño") .vd-own .oav').count() === 1, 'No se ve el dueño en la tarjeta');
    await entrarNegocio(page, 'rancho');
    await page.evaluate(() => location.hash = 'panel-config'); await page.waitForSelector('input[name="mostrarDueno"]');
    await page.uncheck('input[name="mostrarDueno"]');
    await page.click('form[data-form="config"] button[type="submit"]');
    await page.evaluate(() => location.hash = 't-rancho'); await page.waitForSelector('.sbanner');
    afirmar(await page.locator('.sb-own').count() === 0, 'La tienda sigue mostrando la foto del dueño');
    await ctx.close();
  });
  console.log('Instalación, entrada de la app y tutorial (v6)');
  await prueba('Al abrir en el navegador aparece la ficha de instalación con pantallazos y tamaño', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } }, true);
    await page.waitForSelector('#instOv .st-sheet', { timeout: 6000 });
    await page.waitForTimeout(500);
    const t = await page.textContent('#instOv');
    afirmar(t.includes('Instalar') && t.includes('Cerrar') && t.includes('Tamaño') && /\d,\d MB/.test(t), 'Faltan botones o el tamaño');
    afirmar(!/gratis/i.test(t), 'La ficha dice "gratis"');
    afirmar(await page.locator('#instOv .st-shots img').count() === 6, 'No hay 6 pantallazos');
    await page.locator('#instOv .st-shots').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('#instOv .st-shots img')].slice(0, 2).every(i => i.complete && i.naturalWidth > 0), null, { timeout: 5000 });
    await page.screenshot({ path: new URL('09-ficha-instalacion.png', CAP).pathname });
    await page.click('[data-act="inst-x"]'); await page.waitForTimeout(400);
    afirmar(await page.locator('#instOv').count() === 0, 'Cerrar no cerró la ficha');
    await page.reload(); await page.waitForTimeout(3000);
    afirmar(await page.locator('#instOv').count() === 0, 'Volvió a salir después de cerrarla');
    await ctx.close();
  });
  await prueba('Instalar muestra dónde quedó el ícono y al abrir pide iniciar sesión', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } }, true);
    await page.waitForSelector('#instOv .st-inst', { timeout: 6000 });
    await page.waitForTimeout(500);
    await page.click('#instOv .st-inst');
    await page.waitForSelector('.home-mock', { timeout: 5000 }); await page.waitForTimeout(1800);
    await page.screenshot({ path: new URL('10-icono-instalado.png', CAP).pathname });
    await page.click('[data-act="app-abrir"]');
    await page.waitForSelector('#gate .gt-card', { timeout: 4000 });
    afirmar((await page.textContent('#gate')).includes('Continuar con Google'), 'Falta "Continuar con Google"');
    await page.waitForTimeout(500);
    await page.screenshot({ path: new URL('11-entrada-app.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('En la app, la cliente entra y ve el tutorial narrado de su cuenta', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } }, true);
    await page.goto(DIR.replace('index.html', 'index.html?app=1') + '#inicio');
    await page.waitForSelector('#gate .gt-card');
    await page.fill('#gU', 'maria'); await page.fill('#gP', '1234');
    await page.click('form[data-form="g-login"] button[type="submit"]');
    await page.waitForSelector('#tutOv .tv', { timeout: 4000 });
    afirmar((await page.textContent('#tvCap')).includes('Hola María'), 'El tutorial no saluda a la cliente');
    afirmar(await page.locator('.tv-bars span').count() === 8, 'El tutorial de cliente no tiene 8 escenas');
    await page.click('[data-act="tut-n"]'); await page.waitForTimeout(300);
    afirmar((await page.textContent('#tvCap')).includes('barra amarilla'), 'Siguiente no pasó a la escena de buscar');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: new URL('12-tutorial.png', CAP).pathname });
    await page.click('.tv-ft [data-act="tut-x"]'); await page.waitForTimeout(400);
    afirmar(await page.locator('#tutOv').count() === 0 && await page.locator('#gate').count() === 0, 'No se cerró el tutorial o la entrada');
    await page.reload(); await page.waitForTimeout(1200);
    afirmar(await page.locator('#tutOv').count() === 0, 'El tutorial salió de nuevo tras marcar "no volver a mostrar"');
    await ctx.close();
  });
  await prueba('En la app, el dueño entra y ve el tutorial de su negocio', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } }, true);
    await page.goto(DIR.replace('index.html', 'index.html?app=1') + '#inicio');
    await page.waitForSelector('#gate .gt-card');
    await page.click('[data-act="g-tab"][data-t="negocio"]');
    await page.fill('#gU', 'rancho'); await page.fill('#gP', '1234');
    await page.click('form[data-form="g-login"] button[type="submit"]');
    await page.waitForSelector('#tutOv .tv', { timeout: 4000 });
    afirmar((await page.textContent('#tvCap')).includes('Rancho Costeño'), 'El tutorial no nombra el negocio');
    afirmar(await page.locator('.tv-bars span').count() === 7, 'El tutorial de dueño no tiene 7 escenas');
    await page.click('[data-act="tut-n"]'); await page.waitForTimeout(1500);
    await page.screenshot({ path: new URL('13-tutorial-negocio.png', CAP).pathname });
    await ctx.close();
  });
  await prueba('En la app, "Continuar con Google" (simulado) crea la cuenta y entra', async () => {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 } }, true);
    await page.goto(DIR.replace('index.html', 'index.html?app=1') + '#inicio');
    await page.waitForSelector('#gate .gbtn');
    await page.click('#gate .gbtn');
    await page.fill('#gsN', 'Laura Gómez'); await page.fill('#gsE', 'laura.gomez@gmail.com');
    await page.click('button[form="gSim"]');
    await page.waitForSelector('#tutOv .tv', { timeout: 4000 });
    afirmar((await page.textContent('#tvCap')).includes('Hola Laura'), 'No entró con la cuenta de Google');
    await ctx.close();
  });
  await prueba('El manifiesto trae descripción y pantallazos para la ficha de Chrome', async () => {
    const { ctx, page } = await nuevaPagina();
    const m = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
    afirmar(m.description && m.screenshots && m.screenshots.length === 6, 'Faltan descripción o pantallazos');
    for (const s of m.screenshots) afirmar(await page.evaluate(async x => (await fetch(x)).status, s.src) === 200, 'Falta ' + s.src);
    await ctx.close();
  });
} finally {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
}

const ok = resultados.filter(r => r.ok).length;
const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
const reporte = [
  'HatilloMall v6 · Reporte de pruebas automáticas',
  `Fecha: ${fecha}`,
  `Resultado: ${ok} de ${resultados.length} pruebas pasaron`,
  '',
  ...resultados.map((r, i) => `${String(i + 1).padStart(2, '0')}. ${r.ok ? 'PASÓ ' : 'FALLÓ'}  ${r.nombre}  (${(r.ms / 1000).toFixed(1)} s)${r.ok ? '' : '\n      ' + r.error}`)
].join('\n');
await writeFile(new URL('./reporte.txt', import.meta.url), reporte + '\n');
console.log(`\n${ok} de ${resultados.length} pruebas pasaron. Reporte: tests/reporte.txt\n`);
process.exit(ok === resultados.length ? 0 : 1);
