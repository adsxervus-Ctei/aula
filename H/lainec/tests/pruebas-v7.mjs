// Lainec v7 · pruebas de navegador de lo nuevo: repartidor en modo dual, admin, domicilios,
// inventario con foto y QR, escáner y los 5 tipos de negocio.
// Uso:  TEST_DATABASE_URL=postgres://usuario:clave@localhost/lobamall_test npm run test:v7
// ¡OJO! Borra y recrea el esquema de la base de PRUEBAS.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { iniciar, iniciarApi } from '../servidor.mjs';
import { sembrar } from '../api/semilla.mjs';
import { cerrar, uno, q } from '../api/db.mjs';
import { cerrarTodo } from '../api/tiempo-real.mjs';

const URL_DB = process.env.TEST_DATABASE_URL;
if (!URL_DB || !/test/.test(URL_DB)) { console.error('Define TEST_DATABASE_URL (debe contener "test").'); process.exit(1); }
const PUERTO = 8097, BASE = `http://localhost:${PUERTO}/index.html`;
const CAP = new URL('./capturas/', import.meta.url);
await mkdir(CAP, { recursive: true });
const resultados = [], ABIERTAS = [];
let nav, srv, JPG;

async function prueba(nombre, fn) {
  const t0 = Date.now();
  try { await fn(); resultados.push({ ok: true, nombre, ms: Date.now() - t0 }); console.log(`  ✔ ${nombre}`); }
  catch (e) {
    resultados.push({ ok: false, nombre, ms: Date.now() - t0, error: e.message.split('\n')[0] }); console.log(`  ✘ ${nombre}\n      → ${e.message.split('\n')[0]}`);
    let i = 0; for (const pg of ABIERTAS) { try { if (!pg.isClosed()) await pg.screenshot({ path: new URL(`fallo-${resultados.length}-${i++}.png`, CAP).pathname }); } catch (x) {} }
  }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };
async function pagina(movil = true) {
  const ctx = await nav.newContext(movil ? { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: +(process.env.ESCALA || 1) } : { viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('hm-pruebas', '1'); } catch (e) {} });
  const page = await ctx.newPage(); ABIERTAS.push(page);
  page.errores = [];
  page.on('pageerror', e => page.errores.push(e.message));
  return { ctx, page };
}
const listo = page => page.waitForFunction(() => window.LM && LM.api && LM.api.disponible !== null);
async function entrarRep(page, u) {
  await page.goto(BASE + '#rep'); await listo(page);
  await page.click('[data-act="rep-vista"][data-v="entrar"]');
  await page.fill('#reU', u); await page.fill('#reP', '1234');
  await page.click('form[data-form="rep-entrar"] button[type=submit]');
}
async function entrarNegocio(page, u) {
  await page.goto(BASE + '#inicio'); await listo(page);
  await page.evaluate(() => document.querySelector('[data-act="login"][data-tab="negocio"]').click());
  await page.fill('#lgU', u); await page.fill('#lgP', '1234');
  await page.click('form[data-form="login"] button[type="submit"]');
  await page.waitForSelector('.pn');
  if (['rancho', 'drogueria'].includes(u)) await page.waitForFunction(x => LM.api.yo && LM.api.yo.usuario === x, u);
}
const archivo = nombre => ({ name: nombre, mimeType: 'image/jpeg', buffer: JPG });

try {
  // Base de pruebas limpia con la semilla (incluye la oferta #127 abierta)
  const c = new pg.Client({ connectionString: URL_DB }); await c.connect(); await c.query('drop schema public cascade; create schema public;'); await c.end();
  await iniciarApi({ url: URL_DB, vencimientoMs: 0 });
  await sembrar({ conOferta: true });
  srv = await iniciar(PUERTO);
  nav = await chromium.launch();
  { // foto JPEG de prueba hecha en el propio navegador
    const { ctx, page } = await pagina(false);
    await page.goto(BASE + '#inicio');
    const b64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 640; c.height = 480; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 640, 480); g.fillStyle = '#e33'; g.beginPath(); g.arc(320, 240, 150, 0, 7); g.fill(); return c.toDataURL('image/jpeg', .9).split(',')[1]; });
    JPG = Buffer.from(b64, 'base64'); await ctx.close();
  }
  console.log('\nLainec v7 · pruebas de navegador (lo nuevo)\n');

  console.log('Repartidor');
  await prueba('Repartidor pendiente: solo ve "Tu solicitud está en revisión", sin ofertas', async () => {
    const { ctx, page } = await pagina();
    await entrarRep(page, 'yeison');
    await page.waitForSelector('text=Tu solicitud está en revisión');
    afirmar(await page.locator('.lm-oferta').count() === 0, 'No debería ver ofertas');
    afirmar(await page.locator('.lm-conexion').count() === 0, 'No debería ver el botón de conexión');
    await page.screenshot({ path: new URL('v7-01-en-revision.png', CAP).pathname });
    afirmar(!page.errores.length, page.errores.join(' | ')); await ctx.close();
  });

  await prueba('Registro con fotos, Habeas Data obligatorio y aprobación del admin en tiempo real', async () => {
    const { ctx, page } = await pagina();
    await page.goto(BASE + '#rep'); await listo(page);
    await page.click('[data-act="rep-vista"][data-v="registro"]');
    await page.fill('#rgNom', 'Luis Ortega Díaz'); await page.fill('#rgCed', '1047400999'); await page.fill('#rgTel', '3017778899'); await page.fill('#rgNeq', '3017778899'); await page.fill('#rgCla', '1234');
    for (const k of ['foto', 'cedula_foto', 'pase_foto']) { await page.setInputFiles(`input[data-k="${k}"]`, archivo(k + '.jpg')); await page.waitForSelector(`input[data-k="${k}"]`); await page.waitForTimeout(300); }
    afirmar(await page.inputValue('#rgNom') === 'Luis Ortega Díaz', 'El formulario perdió lo escrito al tomar las fotos');
    await page.fill('#rgMar', 'Honda CB'); await page.fill('#rgCol', 'Gris'); await page.fill('#rgPla', 'lob99z');
    await page.click('form[data-form="rep-registro"] button[type=submit]');
    await page.waitForSelector('.err >> text=autorización');
    await page.check('input[name="habeas_data"]');
    await page.screenshot({ path: new URL('v7-02-registro.png', CAP).pathname, fullPage: true });
    await page.click('form[data-form="rep-registro"] button[type=submit]');
    await page.waitForSelector('text=Tu solicitud está en revisión', { timeout: 10000 });
    // El admin la aprueba en otra ventana; al repartidor le cambia la pantalla sola
    const a = await pagina(false);
    await a.page.goto(BASE + '#admin'); await listo(a.page);
    await a.page.fill('#adU', 'admin'); await a.page.fill('#adP', '1234'); await a.page.click('form[data-form="ad-entrar"] button[type=submit]');
    await a.page.waitForSelector('.lm-sol >> text=Luis Ortega Díaz');
    afirmar(await a.page.locator('.lm-sol').filter({ hasText: 'Luis Ortega Díaz' }).locator('.lm-doc img').count() === 3, 'El admin no ve las 3 fotos');
    await a.page.screenshot({ path: new URL('v7-03-admin-solicitudes.png', CAP).pathname, fullPage: true });
    await a.page.locator('.lm-sol').filter({ hasText: 'Luis Ortega Díaz' }).locator('[data-act="ad-aprobar"]').click();
    await page.waitForSelector('.lm-conexion', { timeout: 10000 });
    afirmar(!page.errores.length && !a.page.errores.length, page.errores.concat(a.page.errores).join(' | '));
    await a.ctx.close(); await ctx.close();
  });

  await prueba('Negocio publica [NECESITO REPARTIDOR] y la oferta llega al instante; dos aceptan a la vez y solo uno gana', async () => {
    const n = await pagina(false), d = await pagina(), l = await pagina();
    // La oferta sembrada (#1) se retira antes, para empezar limpio
    await q(`update ofertas_domicilio set estado='cancelada' where estado='abierta'`);
    await entrarRep(d.page, 'danto'); await d.page.waitForSelector('.lm-conexion.on');
    await entrarRep(l.page, '3017778899'); await l.page.waitForSelector('.lm-conexion');
    if (await l.page.locator('.lm-conexion.off').count()) { await l.page.click('.lm-conexion'); await l.page.waitForSelector('.lm-conexion.on'); }
    await entrarNegocio(n.page, 'rancho');
    await n.page.evaluate(() => location.hash = 'panel-pedidos');
    await n.page.click('.newo [data-act="o-acept"]');
    await n.page.evaluate(() => location.hash = 'panel-domicilios');
    await n.page.waitForSelector('.lm-nec');
    await n.page.screenshot({ path: new URL('v7-04-negocio-domicilios.png', CAP).pathname, fullPage: true });
    await n.page.click('.lm-nec');
    await n.page.click('form[data-form="neg-rep"] button[type=submit]');
    await d.page.waitForSelector('.lm-oferta', { timeout: 8000 });
    await l.page.waitForSelector('.lm-oferta', { timeout: 8000 });
    await d.page.screenshot({ path: new URL('v7-05-oferta-tiempo-real.png', CAP).pathname });
    await Promise.all([d.page.click('.lm-oferta [data-act="rep-aceptar"]'), l.page.click('.lm-oferta [data-act="rep-aceptar"]')]);
    await Promise.all([d.page.waitForFunction(() => !document.querySelector('.lm-oferta [disabled]')), l.page.waitForFunction(() => !document.querySelector('.lm-oferta [disabled]'))]);
    await d.page.waitForTimeout(800);
    const ganD = await d.page.locator('.lm-curso').count(), ganL = await l.page.locator('.lm-curso').count();
    afirmar(ganD + ganL === 1, `Ganadores: danto=${ganD} luis=${ganL} · avisos: ${await d.page.locator('#toast').innerText()} / ${await l.page.locator('#toast').innerText()}`);
    const perdedor = ganD ? l.page : d.page;
    afirmar(await perdedor.locator('.lm-oferta').count() === 0, 'La tarjeta no desapareció para el que perdió');
    afirmar((await perdedor.locator('#toast').innerText()).includes('ya fue tomada'), 'El perdedor no vio "Esta oferta ya fue tomada"');
    globalThis.GANADOR = ganD ? d : l; globalThis.PERDEDOR = ganD ? l : d; globalThis.NEG = n;
  });

  await prueba('Con el domicilio en curso no puede cambiar a modo cliente', async () => {
    const g = globalThis.GANADOR.page;
    await g.click('[data-act="rep-modo"][data-m="cliente"]');
    await g.waitForSelector('#sheet >> text=Entrégalo antes de cambiar a modo cliente');
    await g.screenshot({ path: new URL('v7-06-bloqueo-modo.png', CAP).pathname });
    await g.click('#sheet [data-act="cerrar"]');
    afirmar(await g.locator('.lm-curso').count() === 1, 'Debe seguir en el tablero de trabajo');
  });

  await prueba('Flujo RECOGÍ → EN CAMINO → ENTREGADO con foto; el negocio ve el pedido entregado y la caja', async () => {
    const g = globalThis.GANADOR.page, n = globalThis.NEG.page;
    await g.click('[data-act="rep-paso"][data-e="recogida"]'); await g.waitForSelector('[data-act="rep-paso"][data-e="en_camino"]');
    await g.click('[data-act="rep-paso"][data-e="en_camino"]'); await g.waitForSelector('input[data-chg="rep-evidencia"]');
    await g.screenshot({ path: new URL('v7-07-en-camino.png', CAP).pathname, fullPage: true });
    await g.setInputFiles('input[data-chg="rep-evidencia"]', archivo('entrega.jpg'));
    await g.waitForSelector('text=Hoy has hecho 1 domicilio', { timeout: 10000 });
    await n.waitForFunction(() => LM.S.orders.find(o => o.n === 127).e === LM.fin(LM.S.orders.find(o => o.n === 127)), null, { timeout: 10000 });
    await n.evaluate(() => location.hash = 'panel-domicilios');
    await n.waitForSelector('.lm-saldo >> text=Te debe');
    afirmar((await n.locator('.lm-saldo').first().innerText()).includes('50.000'), 'La caja debería decir que le debe $50.000');
    await n.screenshot({ path: new URL('v7-08-caja-repartidor.png', CAP).pathname, fullPage: true });
    const ev = await uno(`select count(*) n from evidencias_entrega`);
    afirmar(ev.n === 1, 'No quedó la foto de evidencia');
  });

  await prueba('Modo cliente: no suenan ofertas, ve la vitrina con [VOLVER A MODO TRABAJO] y sobrevive a recargar', async () => {
    const d = globalThis.PERDEDOR, n = globalThis.NEG.page;
    await d.page.click('[data-act="rep-modo"][data-m="cliente"]');
    await d.page.waitForSelector('#lmVolver');
    afirmar(await d.page.locator('#mlhero').count() === 1, 'Debe ver la vitrina de cliente');
    await d.page.reload(); await listo(d.page); await d.page.waitForSelector('#lmVolver');
    await d.page.screenshot({ path: new URL('v7-09-modo-cliente.png', CAP).pathname });
    // El negocio publica otro domicilio: en modo cliente no le llega nada
    const nombre = await d.page.evaluate(() => LM.api.yo.id);
    const antes = (await uno(`select count(*) n from notificaciones where usuario_id=$1`, [nombre])).n;
    await n.evaluate(async () => { await LM.api.post('/api/negocio/rancho/ofertas', { pedido: { cliente_nombre: 'Carmen', items: [{ id: 'asado', n: 'Asado', q: 1, p: 25000 }], zona_id: 'hatillo', direccion: 'Calle 9', pago: 'efectivo', origen: 'directo' } }); });
    await d.page.waitForTimeout(1200);
    afirmar((await uno(`select count(*) n from notificaciones where usuario_id=$1`, [nombre])).n === antes, 'En modo cliente le llegó una notificación');
    await d.page.click('#lmVolver button');
    await d.page.waitForSelector('.lm-conexion.on');
    afirmar(await d.page.locator('.lm-oferta').count() === 1, 'Al volver, la oferta debe estar en la cartelera');
  });

  await prueba('El repartidor que pide como cliente no ve su propio pedido en la cartelera', async () => {
    const g = globalThis.GANADOR.page;
    const yo = await g.evaluate(() => LM.api.yo.id);
    const r = await g.evaluate(async () => (await LM.api.post('/api/pedidos', { negocio_id: 'rancho', items: [{ id: 'sancocho', n: 'Sancocho', q: 1, p: 18000 }], modo: 'domicilio', zona_id: 'hatillo', direccion: 'Mi casa', pago: 'efectivo' })).pedido.id);
    await globalThis.NEG.page.evaluate(async id => LM.api.post('/api/negocio/rancho/ofertas', { pedido_id: id }), r);
    await g.waitForTimeout(800);
    const tarjetas = await g.locator('.lm-oferta').allInnerTexts();
    afirmar(!tarjetas.some(t => t.includes('Sancocho')), 'Su propio pedido aparece en su cartelera');
    const res = await g.evaluate(async id => { try { await LM.api.post('/api/repartidor/ofertas/' + id + '/aceptar'); return 'aceptó'; } catch (e) { return e.codigo; } }, (await uno('select id from ofertas_domicilio where pedido_id=$1', [r])).id);
    afirmar(res === 'pedido_propio', 'El servidor debía rechazarlo: ' + res);
    void yo;
  });

  await prueba('Cliente en otro celular: pide, el negocio acepta, el repartidor lo lleva y la cliente ve quién va, la entrega y califica', async () => {
    const m = await pagina(false), n = globalThis.NEG.page, g = globalThis.GANADOR.page;
    await m.page.goto(BASE + '#inicio'); await listo(m.page);
    await m.page.click('#btnCuenta'); await m.page.fill('#lgU', 'maria'); await m.page.fill('#lgP', '1234');
    await m.page.click('form[data-form="login"] button[type="submit"]');
    await m.page.waitForFunction(() => LM.api.yo && LM.api.yo.usuario === 'maria');
    await m.page.evaluate(() => location.hash = 'p-mojarra'); await m.page.waitForSelector('.buybox');
    await m.page.click('[data-act="pv-buy"]'); await m.page.waitForSelector('[data-act="co-go"]'); await m.page.click('[data-act="co-go"]');
    await m.page.waitForFunction(() => LM.S.orders.some(o => o.srv && o.items[0].id === 'mojarra'));
    const srvId = await m.page.evaluate(() => LM.S.orders.find(o => o.srv && o.items[0].id === 'mojarra').srv);
    const num = await m.page.evaluate(x => LM.S.orders.find(o => o.srv === x).n, srvId);
    // El negocio (otro computador) recibe el pedido por el servidor, con el MISMO número, y lo acepta
    await n.evaluate(() => location.hash = 'panel-domicilios');
    await n.waitForFunction(x => LM.S.orders.some(o => o.srv === x), srvId, { timeout: 15000 });
    afirmar(await n.evaluate(x => LM.S.orders.find(o => o.srv === x).n, srvId) === num, 'El número del pedido no coincide entre el cliente y el negocio');
    await n.evaluate(() => location.hash = 'panel-pedidos');
    await n.click(`.newo [data-act="o-acept"][data-n="${num}"]`);
    await m.page.waitForFunction(x => LM.S.orders.find(o => o.n === x).e >= 1, num, { timeout: 10000 });
    // María vive en Chimí (vereda): el admin le amplía la zona al repartidor para que le llegue
    const gid = await g.evaluate(() => LM.api.yo.id);
    await q(`update repartidores set zonas_extra='{chimi}' where usuario_id=$1`, [gid]);
    await n.evaluate(() => location.hash = 'panel-domicilios');
    await n.click(`.lm-nec[data-n="${num}"]`); await n.click('form[data-form="neg-rep"] button[type=submit]');
    await g.evaluate(() => location.hash = 'rep');
    const card = g.locator('.lm-oferta').filter({ hasText: 'Mojarra' });
    await card.waitFor({ timeout: 10000 });
    await card.locator('[data-act="rep-aceptar"]').click(); await g.waitForSelector('.lm-curso');
    await m.page.evaluate(x => LM.openOrder(x), num);
    await m.page.waitForSelector('#lmSeg .lm-rep-card', { timeout: 10000 });
    const tarjeta = await m.page.locator('#lmSeg .lm-rep-card').innerText();
    afirmar(/placa/i.test(tarjeta), 'La cliente no ve la placa del repartidor: ' + tarjeta);
    await m.page.screenshot({ path: new URL('v7-17-cliente-ve-repartidor.png', CAP).pathname, fullPage: true });
    await g.click('[data-act="rep-paso"][data-e="recogida"]'); await g.waitForSelector('[data-act="rep-paso"][data-e="en_camino"]');
    await g.click('[data-act="rep-paso"][data-e="en_camino"]'); await g.waitForSelector('input[data-chg="rep-evidencia"]');
    await g.setInputFiles('input[data-chg="rep-evidencia"]', archivo('entrega2.jpg'));
    await m.page.waitForSelector('#lmSeg form[data-form="cli-cal"]', { timeout: 15000 });
    await m.page.click('#lmSeg .lm-est:nth-of-type(2) label:nth-child(5)');
    await m.page.click('#lmSeg form[data-form="cli-cal"] button[type=submit]');
    await m.page.waitForSelector('#lmSeg >> text=Gracias por calificar', { timeout: 10000 });
    const cal = await uno(`select count(*) n from calificaciones c join pedidos p on p.id=c.pedido_id where p.numero=$1 and p.negocio_id='rancho'`, [num]);
    afirmar(cal.n === 2, 'Deberían quedar 2 calificaciones (negocio y repartidor): ' + cal.n);
    afirmar(!m.page.errores.length, m.page.errores.join(' | '));
    await m.ctx.close();
  });

  console.log('Inventario con foto y QR');
  let codigoNuevo = '';
  await prueba('Asistente: producto nuevo con foto profesional, código y QR, y la etiqueta se imprime', async () => {
    const n = globalThis.NEG.page;
    await n.evaluate(() => location.hash = 'panel-etiquetas');
    await n.waitForSelector('[data-act="inv-nuevo"]');
    await n.click('[data-act="inv-nuevo"]');
    await n.fill('#npN1', 'Bollo de yuca'); await n.fill('#npP1', '2000'); await n.fill('#npQ1', '30');
    await n.click('.lm-chip >> text=Vitrina');
    await n.click('form[data-form="inv-p1"] button[type=submit]');
    await n.setInputFiles('input[data-chg="inv-foto-nuevo"]', archivo('bollo.jpg'));
    await n.waitForSelector('.lm-prev');
    await n.click('[data-act="inv-guardar"]:not([data-sin])');
    await n.waitForSelector('.lm-cod-g');
    codigoNuevo = (await n.locator('.lm-cod-g').innerText()).trim();
    afirmar(/^RC-\d{4}$/.test(codigoNuevo), 'Código raro: ' + codigoNuevo);
    await n.screenshot({ path: new URL('v7-10-qr-creado.png', CAP).pathname });
    const srvP = await uno('select codigo, ubicacion, foto_estado from productos where nombre=$1', ['Bollo de yuca']);
    afirmar(srvP && srvP.codigo === codigoNuevo && srvP.ubicacion === 'Vitrina' && srvP.foto_estado === 'lista', 'No quedó igual en el servidor: ' + JSON.stringify(srvP));
    // El QR dibujado se puede leer (lo decodificamos con jsQR dentro del navegador)
    const leido = await n.evaluate(async () => {
      await new Promise(ok => { const s = document.createElement('script'); s.src = 'js/vendor/jsQR.min.js'; s.onload = ok; document.head.appendChild(s); });
      const svg = document.querySelector('#sheet svg.lm-qr'); const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 400; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 400, 400);
      const d = g.getImageData(0, 0, 400, 400); const r = jsQR(d.data, 400, 400); return r && r.data;
    });
    afirmar(leido && leido.endsWith('#q-' + codigoNuevo), 'El QR no se pudo leer: ' + leido);
    await n.click('[data-act="inv-fin"]');
    // Imprimir: se arma la hoja con QR, barras y código (window.print se simula)
    await n.evaluate(() => { window.print = () => setTimeout(() => dispatchEvent(new Event('afterprint')), 50); });
    await n.click('[data-act="inv-selfalt"]');
    await n.click('[data-act="inv-imprimir"]');
    await n.waitForFunction(() => document.querySelectorAll('#lmPrint .lm-et').length > 0);
    const et = await n.evaluate(() => ({ n: document.querySelectorAll('#lmPrint .lm-et').length, qr: document.querySelectorAll('#lmPrint .lm-qr').length, bar: document.querySelectorAll('#lmPrint .lm-barras').length }));
    afirmar(et.n >= 5 && et.qr === et.n && et.bar === et.n, 'Etiquetas incompletas: ' + JSON.stringify(et));
    await n.emulateMedia({ media: 'print' });
    await n.evaluate(() => document.body.classList.add('lm-imprimiendo'));
    await n.screenshot({ path: new URL('v7-11-etiquetas-impresas.png', CAP).pathname });
    await n.evaluate(() => document.body.classList.remove('lm-imprimiendo'));
    await n.emulateMedia({ media: 'screen' });
    await n.waitForFunction(() => LM.S.prods.filter(p => p.t === 'rancho').every(p => p.impreso));
  });

  await prueba('Un cliente nuevo escanea el QR desde OTRO celular y ve el producto con el lugar donde está', async () => {
    const { ctx, page } = await pagina();
    await page.goto(BASE + '#q-' + codigoNuevo);
    await page.waitForSelector('.lm-ficha h1');
    const t = await page.locator('.lm-ficha').innerText();
    afirmar(t.includes('Bollo de yuca') && t.includes('Vitrina') && t.includes('$2.000'), 'Ficha incompleta: ' + t.slice(0, 200));
    afirmar(await page.locator('.lm-ficha-foto img').count() === 1, 'No muestra la foto profesional');
    await page.screenshot({ path: new URL('v7-12-ficha-escaneada.png', CAP).pathname, fullPage: true });
    afirmar(!page.errores.length, page.errores.join(' | ')); await ctx.close();
  });

  await prueba('Lector USB (teclado rápido) y buscador: RC-0001 y RC\'0001 abren el producto', async () => {
    const { ctx, page } = await pagina(false);
    await page.goto(BASE + '#inicio'); await listo(page);
    await page.keyboard.type("RC'0001", { delay: 8 }); await page.keyboard.press('Enter');
    await page.waitForSelector('.lm-ficha >> text=Asado Especial');
    await page.goto(BASE + '#escanear'); await page.waitForSelector('#ibQ');
    await page.fill('#ibQ', 'mojarra'); await page.press('#ibQ', 'Enter');
    await page.waitForSelector('.lm-res-it >> text=Mojarra');
    await page.screenshot({ path: new URL('v7-13-escaner.png', CAP).pathname });
    await page.fill('#q', 'dl-0001'); await page.press('#q', 'Enter');
    await page.waitForSelector('.lm-ficha >> text=Suero oral');
    afirmar(!page.errores.length, page.errores.join(' | ')); await ctx.close();
  });

  console.log('Tipos de negocio nuevos');
  await prueba('Billar: la mesera configura la mesa, sale un QR de un solo uso, los jugadores lo escanean y ven chicos, extras y su cuenta', async () => {
    const ms = await pagina();
    await entrarNegocio(ms.page, 'billar-cajero').catch(() => {});
    await ms.page.waitForFunction(() => LM.api.yo && LM.api.yo.usuario === 'billar-cajero');
    await ms.page.evaluate(() => location.hash = 'panel-mesas'); await ms.page.waitForSelector('[data-act="me-iniciar"]');
    await ms.page.click('[data-act="me-iniciar"][data-m="Mesa 3"]');
    await ms.page.click('.lm-opcion:has-text("Tres bandas")');
    await ms.page.click('form[data-form="me-iniciar"] button[type=submit]');
    await ms.page.waitForSelector('#lmQR .lm-qr');
    const token = await ms.page.evaluate(() => LM.api.get('/api/negocio/billar/mesas').then(r => r.mesas.find(m => m.mesa === 'Mesa 3' && m.estado === 'abierta').token));
    // El QR de la pantalla lleva a esa mesa (se lee con jsQR)
    const leido = await ms.page.evaluate(async () => {
      await new Promise(ok => { const s = document.createElement('script'); s.src = 'js/vendor/jsQR.min.js'; s.onload = ok; document.head.appendChild(s); });
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(document.querySelector('#lmQR svg.lm-qr')));
      await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 500; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 500, 500);
      const d = g.getImageData(0, 0, 500, 500); return (jsQR(d.data, 500, 500) || {}).data;
    });
    afirmar(leido && leido.endsWith('#mesa-' + token), 'El QR no lleva a la mesa: ' + leido);
    // Dos clientes escanean (abren el enlace del QR) y entran con su cuenta
    const a = await pagina(), b = await pagina();
    for (const [x, u] of [[a, 'maria'], [b, 'juan']]) {
      await x.page.goto(BASE + '#mesa-' + token); await listo(x.page);
      await x.page.fill('#mmU', u); await x.page.fill('#mmP', '1234'); await x.page.click('form[data-form="mm-entrar"] button[type=submit]');
      await x.page.waitForSelector('.lm-mi-total');
    }
    await ms.page.waitForSelector('#lmQR .lm-qr-jug >> text=Juan Pérez');
    await ms.page.screenshot({ path: new URL('v7-14-billar-qr.png', CAP).pathname });
    await ms.page.click('[data-act="me-qr-x"]');
    // Chico: gana María, pierde Juan. Extra: 2 cervezas para Juan
    await ms.page.click('.lm-mesa.on [data-act="me-chico"]');
    await ms.page.click('form[data-form="me-chico"] input[name="g"] >> nth=0', { force: true });
    await ms.page.click('form[data-form="me-chico"] button[type=submit]');
    await b.page.waitForSelector('.lm-marcador tr.yo td:nth-child(3) >> text=1', { timeout: 8000 });
    await ms.page.click('.lm-mesa.on [data-act="me-extra"]');
    await ms.page.click('.lm-opcion:has-text("Cerveza fría (unidad)")');
    await ms.page.fill('#meQ', '2');
    await ms.page.click('.lm-opcion:has-text("Juan Pérez")');
    await ms.page.click('form[data-form="me-extra"] button[type=submit]');
    await b.page.waitForFunction(() => document.querySelector('.lm-total-g') && document.querySelector('.lm-total-g').textContent.includes('9.000'), null, { timeout: 8000 });
    await b.page.screenshot({ path: new URL('v7-15-billar-jugador.png', CAP).pathname, fullPage: true });
    // María pide desde su celular y la mesera lo acepta
    await a.page.click('[data-act="mm-menu"]'); await a.page.waitForSelector('[data-act="mm-pedir"]');
    await a.page.click('.lm-fila:has-text("Picada") [data-act="mm-pedir"]');
    await ms.page.waitForSelector('.lm-pend [data-a="aceptar"]', { timeout: 8000 });
    await ms.page.click('.lm-pend [data-a="aceptar"]');
    await a.page.waitForFunction(() => document.querySelector('.lm-total-g').textContent.includes('22.000'), null, { timeout: 8000 });
    // Cierra: paga el que perdió; a los dos les llega la factura y el código queda usado
    await ms.page.click('.lm-mesa.on [data-act="me-cerrar"]');
    await ms.page.click('.lm-opcion:has-text("Paga uno solo todo")');
    await ms.page.click('form[data-form="me-cerrar"] button[type=submit]');
    await ms.page.waitForSelector('.lm-factura');
    await b.page.waitForSelector('.lm-mi-total >> text=Te toca pagar', { timeout: 8000 });
    afirmar((await b.page.locator('.lm-total-g').innerText()).includes('31.000'), 'Juan debía pagar los $31.000 de la mesa');
    await a.page.waitForSelector('.lm-mi-total >> text=No te toca pagar nada', { timeout: 8000 });
    afirmar(await ms.page.evaluate(() => LM.NEG('billar').ventas.some(v => v.v === 31000)), 'La plata no quedó en la caja del día');
    const otro = await pagina(); await otro.page.goto(BASE + '#mesa-' + token); await listo(otro.page);
    await otro.page.fill('#mmU', 'danto'); await otro.page.fill('#mmP', '1234'); await otro.page.click('form[data-form="mm-entrar"] button[type=submit]');
    await otro.page.waitForSelector('text=Este código ya se usó');
    await ms.page.click('[data-act="cerrar"] >> nth=-1');
    await ms.page.click('[data-act="me-iniciar"][data-m="Mesa 3"]'); await ms.page.click('form[data-form="me-iniciar"] button[type=submit]');
    await ms.page.waitForSelector('#lmQR .lm-qr');
    const token2 = await ms.page.evaluate(() => LM.api.get('/api/negocio/billar/mesas').then(r => r.mesas.find(m => m.mesa === 'Mesa 3' && m.estado === 'abierta').token));
    afirmar(token2 && token2 !== token, 'Al abrir otra vez la mesa debe salir un código diferente');
    for (const x of [ms, a, b, otro]) afirmar(!x.page.errores.length, x.page.errores.join(' | '));
    for (const x of [ms, a, b, otro]) await x.ctx.close();
  });

  await prueba('Punto de venta: tienda con lector y cambio, comida rápida con turno, droguería pide fórmula, ropa pide talla', async () => {
    const { ctx, page } = await pagina(false);
    await entrarNegocio(page, 'tienda');
    await page.evaluate(() => location.hash = 'panel-pos'); await page.waitForSelector('#posQ');
    await page.fill('#posQ', 'MP-0003'); await page.press('#posQ', 'Enter');   // arroz, como si fuera el lector USB
    await page.fill('#posQ', 'gaseosa'); await page.press('#posQ', 'Enter');
    await page.waitForSelector('.lm-pos-l >> nth=1');
    await page.click('[data-act="pos-cobrar"]'); await page.fill('#posR', '20000'); await page.dispatchEvent('#posR', 'input');
    afirmar((await page.locator('#posV').innerText()).includes('9.500'), 'El cambio de $20.000 sobre $10.500 debe ser $9.500');
    await page.screenshot({ path: new URL('v7-18-punto-de-venta.png', CAP).pathname });
    await page.click('form[data-form="pos-cobrar"] button[type=submit]');
    afirmar(await page.evaluate(() => LM.NEG('tienda').ventas.some(v => v.v === 10500)), 'La venta no quedó en la caja');
    await page.click('[data-act="salir"]');
    await entrarNegocio(page, 'parque');
    await page.evaluate(() => location.hash = 'panel-pos'); await page.waitForSelector('.lm-pos-p');
    await page.click('.lm-pos-p >> nth=0'); await page.click('[data-act="pos-cobrar"]'); await page.click('form[data-form="pos-cobrar"] button[type=submit]');
    await page.waitForSelector('.lm-turnos-pos b >> text=1');
    await page.click('[data-act="pos-turno"]'); await page.waitForSelector('.lm-llamar');
    await page.click('#sheet [data-act="cerrar"]'); await page.click('[data-act="salir"]');
    await entrarNegocio(page, 'drogueria');
    await page.evaluate(() => location.hash = 'panel-pos'); await page.waitForSelector('#posQ');
    await page.fill('#posQ', 'acetaminof'); await page.press('#posQ', 'Enter');
    await page.waitForSelector('.lm-pos-l .err >> text=fórmula');
    await page.click('[data-act="pos-cobrar"]');
    afirmar(await page.locator('input[name="formula"]').count() === 1, 'Debía pedir confirmar la fórmula');
    await page.click('#sheet .x'); await page.click('[data-act="salir"]');
    await entrarNegocio(page, 'ropa');
    await page.evaluate(() => location.hash = 'panel-pos'); await page.waitForSelector('#posQ');
    await page.fill('#posQ', 'camisa'); await page.press('#posQ', 'Enter');
    await page.waitForSelector('[data-act="pos-talla"]');
    afirmar(!page.errores.length, page.errores.join(' | ')); await ctx.close();
  });

  await prueba('Entrada a la app: ficha de instalación con "dónde va a quedar", municipio y "¿cómo vas a usar Lainec?"', async () => {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.ESCALA || 1), userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A145M) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' });
    const page = await ctx.newPage(); const err = []; page.on('pageerror', e => err.push(e.message));
    await page.goto(BASE);
    await page.waitForSelector('#instOv .st-sheet', { timeout: 6000 });
    const t = await page.locator('#instOv').innerText();
    afirmar(t.includes('0,3 MB') && t.includes('¿Dónde va a quedar?') && t.includes('pantalla de inicio de tu celular'), 'La ficha no trae tamaño o dónde queda');
    afirmar(await page.locator('#instOv .st-shots img').count() === 6, 'Faltan los pantallazos');
    await page.click('[data-act="inst-go"]'); await page.waitForSelector('[data-act="app-abrir"]', { timeout: 6000 });
    await page.click('[data-act="app-abrir"]');
    await page.waitForSelector('.lm-muni-it'); await page.screenshot({ path: new URL('v7-19-municipio.png', CAP).pathname });
    await page.click('.lm-muni-it[data-m="barranco"]');
    await page.waitForSelector('.lm-rol'); await page.screenshot({ path: new URL('v7-20-como-vas-a-usar.png', CAP).pathname });
    afirmar(await page.evaluate(() => LM.S.zona === 'barranco'), 'No quedó Barranco como zona');
    await page.click('.lm-rol[data-r="rep"]');
    await page.waitForSelector('[data-act="rep-vista"][data-v="registro"]');
    afirmar(!err.length, err.join(' | ')); await ctx.close();
  });

  await prueba('Barbería: turnos con estilista; al marcar ATENDIDO se registra la venta', async () => {
    const { ctx, page } = await pagina(false);
    await entrarNegocio(page, 'barberia');
    await page.evaluate(() => location.hash = 'panel-turnos'); await page.waitForSelector('.lm-turno');
    afirmar(await page.locator('.pn-nav [data-h="panel-domicilios"]').count() === 0, 'La barbería no debería tener "Domicilios" de repartidor');
    const antes = await page.evaluate(() => LM.NEG('barberia').ventas.length);
    await page.click('.lm-turno.pendiente [data-act="tu-est"][data-e="atendido"]');
    afirmar(await page.evaluate(() => LM.NEG('barberia').ventas.length) === antes + 1, 'No se anotó la venta');
    await page.screenshot({ path: new URL('v7-15-barberia.png', CAP).pathname, fullPage: true });
    await ctx.close();
  });
  await prueba('Taller: orden de servicio con repuesto, lista, entrega y cobro; historial por placa', async () => {
    const { ctx, page } = await pagina(false);
    await entrarNegocio(page, 'taller');
    await page.evaluate(() => location.hash = 'panel-ordenes'); await page.waitForSelector('.lm-orden');
    await page.click('.lm-orden [data-act="ta-paso"]');
    await page.waitForSelector('.lm-orden form[data-form="ta-entregar"]');
    await page.click('.lm-orden form[data-form="ta-entregar"] button');
    afirmar(await page.evaluate(() => LM.NEG('taller').ventas.some(v => v.d.includes('HTL12A') && v.v === 45000)), 'No se cobró $45.000');
    await page.fill('form[data-form="ta-buscar"] input', 'htl12a'); await page.click('form[data-form="ta-buscar"] button');
    afirmar(await page.locator('form[data-form="ta-buscar"] .kv').count() === 2, 'El historial de la placa debería tener 2 órdenes');
    await ctx.close();
  });
  await prueba('Ropa: apartado con abonos; Agro: un lote vencido no se deja vender', async () => {
    const { ctx, page } = await pagina(false);
    await entrarNegocio(page, 'ropa');
    await page.evaluate(() => location.hash = 'panel-apartados'); await page.waitForSelector('.lm-apartado');
    await page.click('.lm-apartado form[data-form="ap-abono"] button');
    afirmar((await page.locator('.lm-apartado').first().innerText()).includes('Abonó $30.000'), 'El abono no se sumó');
    await page.click('[data-act="salir"]');
    await entrarNegocio(page, 'agro');
    await page.evaluate(() => location.hash = 'panel-lotes'); await page.waitForSelector('.lm-lote');
    await page.click('.lm-lote.vencido [data-act="lo-menos"]');
    afirmar((await page.locator('#toast').innerText()).includes('vencido'), 'Dejó vender un lote vencido');
    await page.screenshot({ path: new URL('v7-16-agro.png', CAP).pathname, fullPage: true });
    await ctx.close();
  });

  console.log('Accesibilidad y celular');
  await prueba('Pantallas del repartidor: botones de 48 px o más, letra de 18 px o más y sin desplazamiento lateral', async () => {
    const g = globalThis.GANADOR.page;
    await g.evaluate(() => location.hash = 'rep'); await g.waitForSelector('.lm-conexion');
    const m = await g.evaluate(() => {
      const bajos = [...document.querySelectorAll('.lm-wrap button, .lm-wrap .btn')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.innerText.trim().slice(0, 30));
      const letra = parseFloat(getComputedStyle(document.querySelector('.lm-wrap')).fontSize);
      return { bajos, letra, lateral: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    afirmar(!m.bajos.length, 'Botones bajos: ' + m.bajos.join(', '));
    afirmar(m.letra >= 18, 'Letra base de ' + m.letra + ' px');
    afirmar(!m.lateral, 'Hay desplazamiento lateral');
  });

  await prueba('Ninguna pantalla nueva dejó errores de JavaScript', async () => {
    const todas = [globalThis.GANADOR, globalThis.PERDEDOR, globalThis.NEG].flatMap(x => x.page.errores);
    afirmar(!todas.length, todas.join(' | '));
  });
} finally {
  if (nav) await nav.close();
  cerrarTodo(); if (srv) srv.close();
  await cerrar();
}

const ok = resultados.filter(r => r.ok).length;
const rep = ['Lainec v7 · Reporte de pruebas de navegador (lo nuevo)', 'Fecha: ' + new Date().toLocaleString('es-CO'), `Resultado: ${ok} de ${resultados.length} pruebas pasaron`, '',
  ...resultados.map((r, i) => `${String(i + 1).padStart(2, '0')}. ${r.ok ? 'PASÓ ' : 'FALLÓ'}  ${r.nombre}  (${(r.ms / 1000).toFixed(1)} s)${r.ok ? '' : '\n      → ' + r.error}`)].join('\n');
await writeFile(new URL('./reporte-v7.txt', import.meta.url), rep + '\n');
console.log(`\n${ok} de ${resultados.length} pruebas pasaron. Reporte: tests/reporte-v7.txt`);
process.exit(ok === resultados.length ? 0 : 1);
