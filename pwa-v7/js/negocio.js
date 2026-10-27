/* ============================================================
   MESA Y RUTA · panel del negocio (POS) para computador o tableta
   Resumen del día · pedidos con ticket y chat · caja y balance ·
   menú con fotos y ofertas · publicidad · reservas · equipo y roles ·
   consolidado cada 15 días (Excel, CSV e impresión) · QR de mesas.
   Cada persona ve solo las secciones que su rol permite.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG, N = window.N, U = N.U, D = N.D;
  const { $, $$, esc, pesos } = U;
  const svg = id => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const P = { vueltas: 0, sec: null, pedido: null, filtro: 'activos', dia: U.hoy(), vistos: new Set(U.ls.get('myr2_vistos', [])), conocidos: null, editando: null };
  const SECCIONES = [
    ['resumen', 'Resumen', 'casa', null],
    ['pedidos', 'Pedidos', 'ticket', 'pedidos.ver'],
    ['caja', 'Caja y balance', 'efectivo', 'finanzas.ver'],
    ['menu', 'Menú y fotos', 'llama', 'menu.editar'],
    ['inventario', 'Inventario', 'bolsa', 'inventario.gestionar'],
    ['publicidad', 'Publicidad', 'chispa', 'publicidad.editar'],
    ['reservas', 'Reservas', 'calendario', 'reservas.gestionar'],
    ['clientes', 'Clientes', 'estrella', 'clientes.ver'],
    ['equipo', 'Equipo y roles', 'personas', 'equipo.gestionar'],
    ['asistencia', 'Asistencia', 'persona', 'asistencia.tomar'],
    ['reportes', 'Consolidado', 'descargar', 'reportes.exportar'],
    ['ajustes', 'QR y ajustes', 'mesa', null]
  ];
  const CATEG_EGRESO = ['Insumos y materia prima', 'Carbón y gas', 'Nómina y turnos', 'Domiciliarios', 'Arriendo', 'Servicios públicos', 'Empaques', 'Publicidad', 'Mantenimiento', 'Otros'];
  const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };
  const hace = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); };
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
  const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return U.hoy(d); };

  // ------------------------------------------------------------ estructura
  function abrir() {
    const s = N.sesion(); const raiz = $('#v-negocio');
    if (!s || s.rol === 'cliente') { raiz.innerHTML = '<p class="pad">Ingrese con una cuenta del negocio.</p>'; return; }
    const visibles = SECCIONES.filter(([, , , p]) => !p || N.puede(p));
    if (!P.sec || !visibles.some(x => x[0] === P.sec)) P.sec = N.puede('pedidos.ver') && !N.puede('finanzas.ver') ? 'pedidos' : 'resumen';
    const plegado = U.ls.get('myr2_ng_plegado', matchMedia('(max-width: 1100px)').matches);
    const PRIORIDAD = ['resumen', 'pedidos', 'caja', 'inventario', 'menu', 'reservas', 'asistencia', 'clientes'];
    const barra = PRIORIDAD.filter(id => visibles.some(v => v[0] === id)).slice(0, 4).map(id => visibles.find(v => v[0] === id));
    const insig = id => `${id === 'pedidos' ? '<b class="insignia" data-ins="nuevos" hidden>0</b>' : ''}${id === 'reservas' ? '<b class="insignia" data-ins="res" hidden>0</b>' : ''}${id === 'inventario' ? '<b class="insignia" data-ins="inv" hidden>0</b>' : ''}`;
    raiz.innerHTML = `<div class="ngApp ${plegado ? 'plegado' : ''}">
      <aside class="ngLado">
        <div class="ngMarca"><button class="ngPlegar" type="button" id="ng-plegar" aria-pressed="${!plegado}" aria-label="Menú: ${plegado ? 'mostrar con nombres' : 'dejar solo íconos'}" title="Menú">${svg('menu')}</button><span class="logoMini marca"><svg><use href="#i-llama"/></svg></span><div><b>${esc(C.negocio.nombre)}</b><small>Panel del negocio</small></div></div>
        <nav class="ngNav" role="tablist">${visibles.map(([id, n, ic]) => `<button role="tab" type="button" data-sec="${id}" aria-selected="${id === P.sec}">${svg(ic)}<span>${n}</span>${id === 'pedidos' ? '<b class="insignia" id="ng-nuevos" hidden>0</b>' : ''}${id === 'reservas' ? '<b class="insignia" id="ng-res-nuevas" hidden>0</b>' : ''}${id === 'inventario' ? '<b class="insignia" id="ng-inv" hidden>0</b>' : ''}</button>`).join('')}</nav>
        <div class="ngUsuario"><span class="avatarGrande chico">${esc(s.nombre[0])}</span><div><b>${esc(s.nombre)}</b><small>${esc(N.ROLES[s.rol] ? N.ROLES[s.rol].nombre : s.rol)}</small></div>
          <button class="redondo chico" type="button" id="ng-video" aria-label="Ver el tutorial del panel">${svg('play')}</button>
          <button class="redondo chico" type="button" id="ng-salir" aria-label="Cerrar sesión">${svg('cerrar')}</button></div>
      </aside>
      <div class="ngMain" id="ng-main"></div>
      <div class="ngCajon" id="ng-cajon" hidden></div>
      <nav class="ngBarra" aria-label="Secciones principales">${barra.map(([id, n, ic]) => `<button type="button" data-sec="${id}" aria-selected="${id === P.sec}">${svg(ic)}<span>${n.split(' ')[0]}</span>${insig(id)}</button>`).join('')}
        <button type="button" id="ng-mas" aria-expanded="false">${svg('cuadros')}<span>Más</span><b class="insignia" data-ins="mas" hidden>0</b></button></nav>
      <div class="ngMas" id="ng-mas-hoja" hidden><div class="ngMasCaja" role="dialog" aria-modal="true" aria-label="Todas las secciones"><span class="asa"></span>
        <div class="ngMasCab"><span class="logoMini marca"><svg><use href="#i-llama"/></svg></span><div><b>${esc(C.negocio.nombre)}</b><small>${esc(s.nombre)} · ${esc(N.ROLES[s.rol] ? N.ROLES[s.rol].nombre : s.rol)}</small></div></div>
        <div class="ngMasGrid">${visibles.map(([id, n, ic]) => `<button type="button" data-sec="${id}" aria-selected="${id === P.sec}"><span class="nmIco">${svg(ic)}${insig(id)}</span><span>${n}</span></button>`).join('')}</div>
        <div class="ngMasPie"><button class="btn claro" type="button" data-accion="video">${svg('play')} Tutorial del panel</button><button class="btn claro" type="button" data-accion="salir">${svg('cerrar')} Cerrar sesión</button></div></div></div>
    </div>`;
    $('#ng-salir').onclick = () => { D.salir(); location.reload(); };
    $('#ng-video').onclick = () => window.MYR_VIDEO('negocio');
    const hoja = $('#ng-mas-hoja'), app = raiz.querySelector('.ngApp');
    const irSec = sec => { P.sec = sec; raiz.querySelectorAll('[data-sec]').forEach(x => x.setAttribute('aria-selected', x.dataset.sec === sec)); hoja.hidden = true; $('#ng-mas').setAttribute('aria-expanded', 'false'); $('#ng-mas').classList.toggle('activo', !barra.some(b => b[0] === sec)); pintar(); window.scrollTo({ top: 0 }); };
    raiz.querySelectorAll('.ngNav, .ngBarra, .ngMasGrid').forEach(n => n.addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) irSec(b.dataset.sec); }));
    $('#ng-mas').onclick = () => { const abre = hoja.hidden; hoja.hidden = !abre; $('#ng-mas').setAttribute('aria-expanded', String(abre)); };
    hoja.onclick = e => { if (e.target === hoja) { hoja.hidden = true; $('#ng-mas').setAttribute('aria-expanded', 'false'); } const a = e.target.closest('[data-accion]'); if (a && a.dataset.accion === 'video') { hoja.hidden = true; window.MYR_VIDEO('negocio'); } if (a && a.dataset.accion === 'salir') { D.salir(); location.reload(); } };
    $('#ng-mas').classList.toggle('activo', !barra.some(b => b[0] === P.sec));
    // menú plegable: solo íconos; al pasar el mouse se abre encima; el botón «Menú» lo deja fijo
    $('#ng-plegar').onclick = () => { const pleg = !app.classList.contains('plegado'); app.classList.toggle('plegado', pleg); app.classList.remove('asomado'); U.ls.set('myr2_ng_plegado', pleg); $('#ng-plegar').setAttribute('aria-pressed', String(!pleg)); $('#ng-plegar').setAttribute('aria-label', 'Menú: ' + (pleg ? 'mostrar con nombres' : 'dejar solo íconos')); };
    P.conocidos = new Set(N.lista('pedidos').map(p => p.id));
    pintar(); insignias();
    if (D.modo === 'supabase' && navigator.onLine) (async () => { try { for (const c of ['pedidos', 'mensajes', 'reservas', 'egresos', 'ingresos', 'cierres', 'aperturas', 'exportes', 'ajustes', 'negocio', 'asistencia']) await N.refrescar(c); if (N.puede('equipo.gestionar')) await D.refrescarPersonal(); P.conocidos = new Set(N.lista('pedidos').map(p => p.id)); pintar(); insignias(); } catch (e) { /* sin señal */ } })();
    if (window.MYR_TUTORIAL_PENDIENTE && window.MYR_TUTORIAL_PENDIENTE('negocio')) setTimeout(() => window.MYR_VIDEO('negocio'), U.animar ? 600 : 0);   // todo el personal
    const corte = new URLSearchParams(location.search).get('corte');
    if (corte && N.puede('reportes.exportar')) { history.replaceState(history.state, '', location.pathname); if (corte === 'luego') posponerCorte(1).then(pintar); else setTimeout(generarCorte, 600); }
    else recordatorio(true);
  }
  function pintar() {
    const m = $('#ng-main'); if (!m) return;
    const f = { resumen, pedidos, caja, menu, inventario, publicidad, reservas, clientes, equipo, asistencia, reportes, ajustes }[P.sec];
    m.innerHTML = ''; f(m);
    m.querySelectorAll('[data-ir-verificar]').forEach(b => b.onclick = () => { P.filtro = 'verificar'; P.sec = 'pedidos'; $$('[data-sec]').forEach(x => x.setAttribute('aria-selected', x.dataset.sec === 'pedidos')); pintar(); });
    if (U.animar) m.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,.8,.25,1)' });
  }
  function insignias() {
    const nuevos = N.lista('pedidos').filter(p => p.estado === 'recibido' && !P.vistos.has(p.id)).length;
    const pon = (k, n, roja) => $$(`[data-ins="${k}"]`).forEach(x => { x.hidden = !n; x.textContent = n; x.classList.toggle('roja', !!roja); });
    pon('nuevos', nuevos);
    const b = $('#ng-nuevos'); if (b) { b.hidden = !nuevos; b.textContent = nuevos; }
    const rv = N.lista('reservas').filter(r => r.estado === 'solicitada').length;
    const c = $('#ng-res-nuevas'); if (c) { c.hidden = !rv; c.textContent = rv; }
    pon('res', rv);
    const inv = estadoInventario(), ni = inv.agotados.length + inv.bajos.length;
    const c2 = $('#ng-inv'); if (c2) { c2.hidden = !ni; c2.textContent = ni; c2.classList.toggle('roja', !!inv.agotados.length); }
    pon('inv', ni, inv.agotados.length);
    const fuera = $$('.ngMasGrid [data-ins]:not([hidden])').filter(x => !$$('.ngBarra [data-sec]').some(bb => bb.dataset.sec === x.closest('[data-sec]').dataset.sec)).reduce((a, x) => a + (+x.textContent || 0), 0);
    pon('mas', fuera);
    avisarInventario(inv);
    document.title = (nuevos ? `(${nuevos}) ` : '') + 'Panel · ' + C.negocio.nombre;
  }
  function sonar() {
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [0, .18, .36].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = [880, 1046, 1318][k]; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.18, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .2); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .22); }); } catch (e) { /* sin audio */ }
  }

  // ------------------------------------------------------------ recordatorio del consolidado (cada 15 días)
  function estadoCorte() {
    const aj = N.obtener('ajustes', 'reportes') || {};
    const primero = N.lista('pedidos').map(p => U.diaDe(p.creado)).sort()[0];
    const desde = aj.ultimoCorte ? sumarDias(aj.ultimoCorte, 1) : (primero || U.hoy());
    const dias = diasEntre(aj.ultimoCorte || primero || U.hoy(), U.hoy());
    const pospuesto = aj.pospuestoHasta && aj.pospuestoHasta > U.hoy() ? aj.pospuestoHasta : null;
    return { desde, dias, vence: dias >= C.reportes.cadaDias, ultimo: aj.ultimoCorte || null, pospuesto };
  }
  async function posponerCorte(dias = 1) {
    await guardar('ajustes', { ...(N.obtener('ajustes', 'reportes') || {}), id: 'reportes', pospuestoHasta: sumarDias(U.hoy(), dias) });
    U.aviso(dias === 1 ? 'Listo: se lo recordamos mañana.' : `Listo: se lo recordamos en ${dias} días.`);
  }
  async function generarCorte() {
    const e = estadoCorte(); P.rango = { desde: e.desde, hasta: U.hoy() };
    P.sec = 'reportes'; $$('.ngNav button').forEach(x => x.setAttribute('aria-selected', x.dataset.sec === 'reportes')); pintar();
    await exportar('xlsx');
  }
  // ventana propia: «Generar ahora» o «Más tarde»
  function ventanaCorte() {
    const e = estadoCorte(), b = N.balance(e.desde, U.hoy());
    const v = document.createElement('div'); v.className = 'velo centro'; v.id = 'velo-corte';
    v.innerHTML = `<div class="modal corte" role="dialog" aria-modal="true" aria-labelledby="ct-tit">
      <span class="logoMini grande">${svg('calendario')}</span>
      <p class="paso centro">Cada ${C.reportes.cadaDias} días</p>
      <h2 id="ct-tit">Es hora del consolidado</h2>
      <p class="mini centro">Han pasado <b>${e.dias} días</b>${e.ultimo ? ` desde el último corte (${esc(U.fechaLarga(e.ultimo + 'T12:00'))})` : ''}. Periodo: <b>${esc(e.desde)}</b> a <b>${esc(U.hoy())}</b>.</p>
      <div class="ctKpis"><div><small>Ventas</small><b>${pesos(b.ventas)}</b></div><div><small>Egresos</small><b>${pesos(b.gastos)}</b></div><div><small>Balance</small><b>${pesos(b.neto)}</b></div></div>
      <button class="btn verde grande" type="button" id="ct-si">${svg('descargar')} Generar ahora (Excel)</button>
      <div class="dos"><button class="btn claro" type="button" id="ct-manana">Más tarde: mañana</button><button class="btn claro" type="button" id="ct-tres">En 3 días</button></div>
    </div>`;
    document.body.append(v);
    const cerrar = () => v.remove();
    v.querySelector('#ct-si').onclick = async () => { cerrar(); await generarCorte(); };
    v.querySelector('#ct-manana').onclick = async () => { cerrar(); await posponerCorte(1); pintar(); };
    v.querySelector('#ct-tres').onclick = async () => { cerrar(); await posponerCorte(3); pintar(); };
  }
  async function recordatorio(alAbrir) {
    if (!N.puede('reportes.exportar')) return;
    const e = estadoCorte(); if (!e.vence || e.pospuesto) return;
    if (alAbrir && !$('#velo-corte')) ventanaCorte();
    // aviso del sistema con botones (sirve si el panel queda abierto en otra pestaña o minimizado)
    if ('Notification' in window && Notification.permission === 'granted' && (!alAbrir || document.visibilityState !== 'visible')) {
      try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); const t = 'Es hora del consolidado'; const cuerpo = `Han pasado ${e.dias} días: genere el archivo de ventas, ingresos y egresos.`;
        if (reg) reg.showNotification(t, { body: cuerpo, icon: 'icons/icono-192.png', badge: 'icons/icono-192.png', tag: 'consolidado', requireInteraction: true, data: { tipo: 'consolidado' }, actions: [{ action: 'generar', title: 'Generar ahora' }, { action: 'luego', title: 'Más tarde' }] });
        else new Notification(t, { body: cuerpo, icon: 'icons/icono-192.png' }); } catch (er) { /* sin notificación */ }
    }
  }
  // respuesta desde el aviso del sistema (botones «Generar ahora» / «Más tarde»)
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', ev => {
    const d = ev.data || {}; if (d.tipo !== 'consolidado' || !N.esPersonal()) return;
    if (d.accion === 'luego') posponerCorte(1).then(pintar); else { const x = $('#velo-corte'); if (x) x.remove(); generarCorte(); }
  });
  setInterval(() => { if (document.body.dataset.vista === 'negocio' && N.esPersonal()) recordatorio(false); }, 3600000);
  function bannerCorte() {
    if (!N.puede('reportes.exportar')) return '';
    const e = estadoCorte();
    if (e.vence && e.pospuesto) return `<div class="ngBanner suave">${svg('reloj')}<span>Consolidado pendiente (${e.dias} días). Lo pospuso hasta el <b>${esc(U.fechaLarga(e.pospuesto + 'T12:00'))}</b>.</span><button class="btn claro" type="button" id="bn-generar">Generar ahora</button></div>`;
    if (!e.vence) return `<div class="ngBanner suave">${svg('reloj')}<span>Próximo consolidado en <b>${C.reportes.cadaDias - e.dias} días</b>${e.ultimo ? ` · último corte: ${esc(U.fechaLarga(e.ultimo + 'T12:00'))}` : ''}.</span></div>`;
    return `<div class="ngBanner alerta">${svg('campana')}<span>Han pasado <b>${e.dias} días</b> desde el último corte. Genere el consolidado de ventas, ingresos y egresos.</span><button class="btn verde" type="button" id="bn-generar">Generar ahora</button><button class="btn claro" type="button" id="bn-luego">Más tarde</button></div>`;
  }

  // ------------------------------------------------------------ 1. RESUMEN
  function resumen(m) {
    const hoy = U.hoy(), b = N.balance(hoy, hoy);
    const pedHoy = N.lista('pedidos').filter(p => U.diaDe(p.creado) === hoy && p.estado !== 'cancelado');
    const activos = N.lista('pedidos').filter(p => !['entregado', 'cancelado'].includes(p.estado));
    const verFin = N.puede('finanzas.ver');
    // últimos 14 días
    const dias = Array.from({ length: 14 }, (_, k) => sumarDias(hoy, k - 13));
    const serie = dias.map(d => { const x = N.balance(d, d); return { d, i: x.ingresos, e: x.gastos }; });
    const max = Math.max(1, ...serie.map(s => Math.max(s.i, s.e)));
    const barras = serie.map((s, k) => { const x = 14 + k * 46, hi = s.i / max * 150, he = s.e / max * 150;
      return `<g><rect x="${x}" y="${170 - hi}" width="18" height="${hi}" rx="4" fill="#1C8748"><title>${s.d}: ingresos ${pesos(s.i)}</title></rect><rect x="${x + 20}" y="${170 - he}" width="18" height="${he}" rx="4" fill="#E2572B"><title>${s.d}: egresos ${pesos(s.e)}</title></rect><text x="${x + 19}" y="188" text-anchor="middle" font-size="10" fill="#6B6159">${+s.d.slice(8)}</text></g>`; }).join('');
    const porMedio = { efectivo: 0, transferencia: 0, tarjeta: 0 }; b.pedidos.forEach(p => { porMedio[p.pago.tipo] += p.totales.total; });
    const totMedio = Math.max(1, Object.values(porMedio).reduce((a, x) => a + x, 0));
    const conteo = {}; N.lista('pedidos').filter(p => p.estado !== 'cancelado' && diasEntre(U.diaDe(p.creado), hoy) <= 30).forEach(p => p.items.forEach(it => { conteo[it.nombre] = (conteo[it.nombre] || 0) + it.cant; it.bebidas.forEach(bb => { const x = N.obtener('menu', bb.id); if (x) conteo[x.nombre] = (conteo[x.nombre] || 0) + bb.cant; }); }));
    const top = Object.entries(conteo).sort((a, b2) => b2[1] - a[1]).slice(0, 6); const topMax = top[0] ? top[0][1] : 1;
    m.innerHTML = `<header class="ngCab"><div><p class="paso">${esc(U.fechaLarga(new Date().toISOString()))}</p><h1>Hola, ${esc(N.sesion().nombre.split(' ')[0])}</h1></div></header>
      ${bannerCorte()}
      ${bannerInventario()}
      ${b.porVerificar.length && N.puede('pedidos.pago') ? `<button type="button" class="avisoVerif" data-ir-verificar>${svg('transfer')}<span><b>${b.porVerificar.length} ${b.porVerificar.length === 1 ? 'transferencia' : 'transferencias'} por verificar · ${pesos(b.valorPorVerificar)}</b><small>No se suman a las ventas hasta que revise el comprobante y toque «Marcar pagado».</small></span>${svg('adelante')}</button>` : ''}
      <div class="kpis">
        ${verFin ? `<div class="kpi verde"><small>Ventas de hoy</small><b data-cuenta="${b.ventas}">${pesos(b.ventas)}</b><span>${b.pedidos.length} pedidos cobrados</span></div>` : ''}
        <div class="kpi"><small>Pedidos de hoy</small><b data-cuenta="${pedHoy.length}" data-plano="1">${pedHoy.length}</b><span>${activos.length} en curso ahora</span></div>
        ${verFin ? `<div class="kpi"><small>Ticket promedio</small><b>${pesos(b.pedidos.length ? b.ventas / b.pedidos.length : 0)}</b><span>por pedido</span></div>
        <div class="kpi brasa"><small>Egresos de hoy</small><b data-cuenta="${b.gastos}">${pesos(b.gastos)}</b><span>${b.egresos.length} registros</span></div>
        <div class="kpi oscuro"><small>Balance de hoy</small><b data-cuenta="${b.neto}">${pesos(b.neto)}</b><span>ingresos − egresos</span></div>` : ''}
      </div>
      <div class="ngGrid">
        ${verFin ? `<section class="ngCard ancho"><div class="ngCardCab"><h2>Ingresos y egresos · 14 días</h2><span class="leyenda"><i class="v"></i>Ingresos <i class="r"></i>Egresos</span></div>
          <svg class="grafica" viewBox="0 0 660 196" role="img" aria-label="Ingresos y egresos de los últimos 14 días">${[0, 50, 100, 150].map(y => `<line x1="0" x2="660" y1="${170 - y}" y2="${170 - y}" stroke="#EDE5DA"/>`).join('')}${barras}</svg></section>
        <section class="ngCard"><h2>Medios de pago hoy</h2>${Object.entries(porMedio).map(([k, v]) => `<div class="medio"><span>${MEDIOS[k]}</span><div class="medioBarra">${v ? `<i style="width:${v / totMedio * 100}%" class="${k}"></i>` : ""}</div><b>${pesos(v)}</b></div>`).join('')}</section>` : ''}
        <section class="ngCard"><h2>Más vendidos · 30 días</h2>${top.length ? top.map(([n, c]) => `<div class="medio"><span>${esc(n)}</span><div class="medioBarra"><i style="width:${c / topMax * 100}%"></i></div><b>${c}</b></div>`).join('') : '<p class="mini">Aún no hay ventas.</p>'}</section>
        <section class="ngCard"><h2>Pedidos en curso</h2>${['recibido', 'confirmado', 'preparando', 'listo', 'en_camino'].map(e => `<div class="medio"><span>${N.NOMBRE_ESTADO[e]}</span><b>${activos.filter(p => p.estado === e).length}</b></div>`).join('')}<button class="btn claro" type="button" data-ir-sec="pedidos">Ver pedidos</button></section>
      </div>`;
    if (U.animar) $$('[data-cuenta]').forEach(el => { const fin = +el.dataset.cuenta, t0 = performance.now(), plano = el.dataset.plano; const paso = t => { const k = Math.min(1, (t - t0) / 700), v = fin * (1 - Math.pow(1 - k, 3)); el.textContent = plano ? Math.round(v) : pesos(v); if (k < 1) requestAnimationFrame(paso); }; requestAnimationFrame(paso); });
  }

  // ------------------------------------------------------------ 2. PEDIDOS
  const COLUMNAS = [['recibido', 'Nuevos'], ['confirmado', 'Confirmados'], ['preparando', 'En cocina'], ['listo', 'Listos'], ['en_camino', 'En camino'], ['entregado', 'Entregados']];
  function pedidos(m) {
    const todos = N.lista('pedidos').sort((a, b) => b.creado.localeCompare(a.creado));
    const porVerif = p => p.estado !== 'cancelado' && p.pago && p.pago.tipo === 'transferencia' && p.pago.estado !== 'pagado';
    const lista = P.filtro === 'verificar' ? todos.filter(porVerif) : P.filtro === 'hoy' ? todos.filter(p => U.diaDe(p.creado) === U.hoy()) : P.filtro === 'activos' ? todos.filter(p => !['entregado', 'cancelado'].includes(p.estado) || U.diaDe(p.entregado || p.creado) === U.hoy()) : todos;
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Pedidos</p><h1>${lista.filter(p => !['entregado', 'cancelado'].includes(p.estado)).length} en curso</h1></div>
      <div class="segmento">${[['activos', 'En curso'], ['verificar', `Por verificar${todos.filter(porVerif).length ? ' (' + todos.filter(porVerif).length + ')' : ''}`], ['hoy', 'Hoy'], ['todos', 'Todos']].map(([k, n]) => `<button type="button" data-filtro="${k}" aria-pressed="${k === P.filtro}">${n}</button>`).join('')}</div></header>
      <div class="kanban">${COLUMNAS.map(([e, n]) => { const ps = lista.filter(p => p.estado === e); return `<section class="kCol"><h3>${n} <span>${ps.length}</span></h3>${ps.map(tarjetaPedido).join('') || '<p class="mini vacioCol">—</p>'}</section>`; }).join('')}</div>
      ${lista.some(p => p.estado === 'cancelado') ? `<details class="ngCard"><summary>Cancelados (${lista.filter(p => p.estado === 'cancelado').length})</summary>${lista.filter(p => p.estado === 'cancelado').map(tarjetaPedido).join('')}</details>` : ''}`;
    m.querySelector('.segmento').onclick = e => { const b = e.target.closest('[data-filtro]'); if (b) { P.filtro = b.dataset.filtro; pintar(); } };
  }
  function tarjetaPedido(p) {
    const nuevo = p.estado === 'recibido' && !P.vistos.has(p.id);
    const ic = p.modo === 'local' ? 'mesa' : p.modo === 'recoger' ? 'recoger' : 'moto';
    const persona = N.mensajesDe(p.id).some(x => x.paraPersona && !x.atendido);
    return `<button type="button" class="kTarj ${nuevo ? 'nuevo' : ''}" data-abrir-pedido="${p.id}">
      <span class="kTop"><b>${esc(p.codigo)}</b><span>${hace(p.enviado || p.creado)}</span></span>
      <span class="kCli">${svg(ic)} ${esc(p.cliente.nombre)}${p.mesa ? ' · Mesa ' + esc(p.mesa) : ''}</span>
      <span class="kItems">${esc(p.items.map(i => i.cant + '× ' + i.nombre).join(', '))}</span>
      <span class="kPie"><b>${pesos(p.totales.total)}</b><span class="etiqueta ${p.pago.estado === 'pagado' ? 'verde' : p.pago.tipo === 'transferencia' && p.estado !== 'cancelado' ? 'oro' : ''}">${MEDIOS[p.pago.tipo]}${p.pago.estado === 'pagado' ? ' · pagado' : p.pago.tipo === 'transferencia' && p.estado !== 'cancelado' ? ' · por verificar' : ''}</span>${persona ? `<span class="etiqueta roja">${svg('chat')} responder</span>` : ''}${p.pago.estado !== 'pagado' && N.mensajesDe(p.id).some(m => m.comprobante) ? '<span class="etiqueta oro">comprobante</span>' : ''}</span></button>`;
  }
  const SIGUIENTE = { recibido: 'confirmado', confirmado: 'preparando', preparando: 'listo', listo: p => p.modo === 'domicilio' ? 'en_camino' : 'entregado', en_camino: 'entregado' };
  const BOTON_SIG = { confirmado: 'Confirmar pedido', preparando: 'Pasar a cocina', listo: 'Marcar listo (avisa con voz)', en_camino: 'Salió el domiciliario', entregado: 'Marcar entregado' };
  async function abrirPedido(id) {
    P.pedido = id; P.vistos.add(id); U.ls.set('myr2_vistos', [...P.vistos]); insignias();
    const p = N.obtener('pedidos', id); if (!p) return;
    const caj = $('#ng-cajon'); caj.hidden = false;
    const sig = typeof SIGUIENTE[p.estado] === 'function' ? SIGUIENTE[p.estado](p) : SIGUIENTE[p.estado];
    const cel = String(p.cliente.celular || '').replace(/\D/g, '');
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">${esc(N.NOMBRE_ESTADO[p.estado])} · ${hace(p.enviado || p.creado)}</p><h2>${esc(p.codigo)} · ${pesos(p.totales.total)}</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <div class="cajCuerpo">
        <div class="cajAcciones">
          ${sig && N.puede('pedidos.estado') ? `<button class="btn verde grande" type="button" data-estado="${sig}">${svg('check')} ${BOTON_SIG[sig]}</button>` : ''}
          ${p.pago.estado !== 'pagado' && N.puede('pedidos.pago') && p.estado !== 'cancelado' ? `<button class="btn claro" type="button" id="caj-pagado">${svg('efectivo')} Marcar pagado (${MEDIOS[p.pago.tipo]})</button>` : ''}
          ${!['entregado', 'cancelado'].includes(p.estado) && N.puede('pedidos.estado') ? `<button class="btn peligro" type="button" data-estado="cancelado">Cancelar</button>` : ''}
        </div>
        ${p.estado === 'en_camino' && p.modo === 'domicilio' && !p.destino.sinMapa && N.puede('pedidos.estado') ? `<div class="gpsCaja ${GPS.pedido === p.id ? 'on' : ''}"><span class="gpsIco">${svg('motoGrande')}</span><div><b>${GPS.pedido === p.id ? 'Compartiendo su ubicación' : 'Ubicación en vivo para el cliente'}</b><small id="gps-txt">${GPS.pedido === p.id ? estadoGps() : 'El domiciliario la activa desde su celular: el cliente ve la moto en el mapa y cuánto falta.'}</small></div><button class="btn ${GPS.pedido === p.id ? 'claro' : 'verde'}" type="button" id="caj-gps">${GPS.pedido === p.id ? 'Dejar de compartir' : 'Compartir mi ubicación'}</button></div>` : ''}
        <div class="cajDatos">
          <div><h3>Cliente</h3><p>${esc(p.cliente.nombre)}<br>${esc(p.cliente.celular)}${cel.length === 10 ? ` · <a href="https://wa.me/57${cel}?text=${encodeURIComponent(`Hola, ${p.cliente.nombre.split(' ')[0]}. Le escribimos de ${C.negocio.nombre} por su pedido ${p.codigo}.`)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</p></div>
          <div><h3>Entrega</h3><p>${p.modo === 'domicilio' ? `${esc(p.destino.direccion)}${p.destino.indicaciones ? '<br>' + esc(p.destino.indicaciones) : ''}<br>${String(p.destino.km).replace('.', ',')} km · <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${C.negocio.lat}%2C${C.negocio.lng}%3B${p.destino.lat}%2C${p.destino.lng}" target="_blank" rel="noopener">abrir ruta</a>` : p.modo === 'local' ? `En el local${p.mesa ? ' · <b>mesa ' + esc(p.mesa) + '</b>' : ''}${p.fuenteModo === 'qr' ? ' (QR)' : ''}` : 'Pasa a recoger'}</p></div>
          <div><h3>Pago</h3><p>${MEDIOS[p.pago.tipo]}${p.pago.conCuanto ? `<br>Paga con ${pesos(p.pago.conCuanto)} · cambio <b>${pesos(p.pago.cambio)}</b>` : ''}<br>${p.pago.estado === 'pagado' ? '<b class="ok">Pagado</b>' : 'Pendiente'}</p></div>
        </div>
        ${N.mensajesDe(p.id).some(m => m.comprobante) ? `<div class="cajComp"><h3>Comprobante de pago</h3><div class="compFotos">${N.mensajesDe(p.id).filter(m => m.comprobante).map(m => `<a class="compFoto" data-comp="${esc(m.comprobante)}" target="_blank" rel="noopener"><span class="mini">Cargando…</span></a>`).join('')}</div>${p.pago.estado !== 'pagado' ? '<p class="mini">Revise que el valor y la cuenta coincidan en su banco antes de marcar pagado.</p>' : ''}</div>` : ''}
        <div class="cajTicket" id="caj-ticket"><div class="tkCargando">Generando el ticket…</div></div>
        <div class="cajTkBotones"><button class="btn claro" type="button" id="caj-descargar">${svg('descargar')} Descargar ticket</button></div>
        ${N.puede('chat.responder') ? `<div class="cajChat"><h3>Chat con el cliente</h3><ol class="hilo" id="caj-hilo"></ol>
          <div class="chips"><button type="button" data-r="¡Pedido confirmado! Ya lo estamos preparando.">Confirmado</button><button type="button" data-r="Se nos agotó un producto de su pedido. ¿Se lo cambiamos por otro similar?">Producto agotado</button><button type="button" data-r="Recibimos su pago. ¡Gracias!">Pago recibido</button>${C.pagos.transferencia.llaveBreB ? `<button type="button" data-r="Puede transferir a la llave Bre-B ${esc(C.pagos.transferencia.llaveBreB)}.">Enviar llave</button>` : ''}</div>
          <form class="escribir" id="caj-f"><input id="caj-txt" placeholder="Responder al cliente" autocomplete="off" maxlength="500" aria-label="Mensaje"><button class="redondo verde" type="submit" aria-label="Enviar">${svg('enviar')}</button></form></div>` : ''}
      </div>`;
    if (U.animar) caj.firstElementChild.parentElement.animate([{ transform: 'translateX(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.22,.8,.25,1)' });
    $('#caj-cerrar').onclick = () => { caj.hidden = true; P.pedido = null; };
    $('#caj-descargar').onclick = () => window.TICKET.descargar(p);
    caj.querySelectorAll('[data-estado]').forEach(b => b.onclick = () => cambiarEstado(p.id, b.dataset.estado));
    if ($('#caj-gps')) $('#caj-gps').onclick = () => { if (GPS.pedido === p.id) dejarDeCompartir(); else compartirUbicacion(p.id); abrirPedido(p.id); };
    if ($('#caj-pagado')) $('#caj-pagado').onclick = async () => { const x = N.obtener('pedidos', p.id); x.pago = { ...x.pago, estado: 'pagado', pagadoEn: new Date().toISOString(), cobradoPor: N.sesion().nombre }; await guardar('pedidos', x); U.aviso('Marcado como pagado.'); abrirPedido(p.id); pintar(); };
    if ($('#caj-f')) {
      $('#caj-f').onsubmit = async e => { e.preventDefault(); const t = $('#caj-txt').value.trim(); if (!t) return; await responder(p.id, t); $('#caj-txt').value = ''; };
      caj.querySelector('.cajChat .chips').onclick = e => { const b = e.target.closest('[data-r]'); if (b) responder(p.id, b.dataset.r); };
      pintarHilo(p.id);
    }
    for (const a of caj.querySelectorAll('[data-comp]')) { try { const u = await D.verComprobante(a.dataset.comp); if (u) { a.href = u; a.innerHTML = `<img src="${esc(u)}" alt="Comprobante de pago">`; } else a.innerHTML = '<span class="mini">No disponible</span>'; } catch (e) { a.innerHTML = '<span class="mini">Sin señal</span>'; } }
    const cv = await window.TICKET.dibujar(p); const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = 'Ticket ' + p.codigo;
    const t = $('#caj-ticket'); if (t && P.pedido === p.id) { t.innerHTML = ''; t.append(img); }
  }
  function pintarHilo(id) {
    const h = $('#caj-hilo'); if (!h) return;
    const ms = N.mensajesDe(id);
    h.innerHTML = ms.map(m => `<li class="${m.de === 'cliente' ? 'cliente' : m.de}${m.paraPersona ? ' paraPersona' : ''}">${m.de === 'asistente' ? `<span class="quien">${svg('chispa')} Asistente</span>` : m.de === 'negocio' ? `<span class="quien">${esc(m.firma || 'Negocio')}</span>` : ''}${esc(m.texto)}${m.comprobante ? ' 📎' : ''}<small>${U.hora(m.creado)}${m.paraPersona ? ' · necesita una persona' : ''}</small></li>`).join('');
    h.scrollTop = h.scrollHeight;
  }
  async function responder(id, texto) {
    for (const m of N.mensajesDe(id).filter(x => x.paraPersona && !x.atendido)) await guardar('mensajes', { ...m, atendido: true });
    await guardar('mensajes', { pedido: id, de: 'negocio', texto, firma: N.sesion().nombre.split(' ')[0] + ' · ' + C.negocio.nombre });
    pintarHilo(id);
  }
  // ------------------------------------------------------------ GPS del domiciliario (mientras el pedido va en camino)
  const GPS = { pedido: null, vigia: null, ultimo: null, enviado: 0 };
  const estadoGps = () => GPS.ultimo ? `Última posición enviada hace ${Math.round((Date.now() - GPS.enviado) / 1000)} s (precisión ±${Math.round(GPS.ultimo.prec)} m). Deje esta pantalla abierta.` : 'Buscando la señal del GPS…';
  function compartirUbicacion(id) {
    if (!('geolocation' in navigator)) { U.aviso('Este celular no permite compartir la ubicación.'); return; }
    dejarDeCompartir(); GPS.pedido = id; GPS.enviado = 0; GPS.ultimo = null;
    GPS.vigia = navigator.geolocation.watchPosition(async pos => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, prec: pos.coords.accuracy || 30 };
      const movio = !GPS.ultimo || window.SEGUIMIENTO.km([GPS.ultimo.lat, GPS.ultimo.lng], [c.lat, c.lng]) > .025;
      GPS.ultimo = c;
      if (Date.now() - GPS.enviado < (movio ? 10000 : 30000)) return;
      const x = N.obtener('pedidos', id); if (!x || x.estado !== 'en_camino') { dejarDeCompartir(); return; }
      GPS.enviado = Date.now();
      try { await N.guardar('pedidos', { ...x, repartidor: { ...(x.repartidor || {}), nombre: N.sesion().nombre, lat: c.lat, lng: c.lng, prec: c.prec, at: new Date().toISOString() } }); } catch (e) { /* sin señal: se intenta con la próxima posición */ }
      const t = $('#gps-txt'); if (t) t.textContent = estadoGps();
    }, e => { U.aviso(e.code === 1 ? 'Sin permiso de ubicación: actívelo para que el cliente vea la moto.' : 'No se pudo leer el GPS.', 5000); dejarDeCompartir(); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    U.aviso('Compartiendo su ubicación con el cliente.');
  }
  function dejarDeCompartir() { if (GPS.vigia !== null) navigator.geolocation.clearWatch(GPS.vigia); GPS.vigia = null; GPS.pedido = null; GPS.ultimo = null; }

  async function cambiarEstado(id, estado) {
    if (D.modo === 'supabase' && navigator.onLine) { try { await N.refrescar('pedidos'); } catch (e) { /* sin señal */ } }
    let p = N.obtener('pedidos', id); if (!p) return;
    if (estado === 'cancelado' && !confirm('¿Cancelar el pedido ' + p.codigo + '? Lo que tenía se devuelve al inventario.')) return;
    // inventario: se descuenta al atender el pedido (si el cliente no tenía señal) y se devuelve si se cancela
    const inv = p.inventario || {};
    if (estado !== 'cancelado' && !inv.descontado) await N.moverInventario(p, -1);
    if (estado === 'cancelado' && inv.descontado && !inv.devuelto) await N.moverInventario(p, 1);
    p = N.obtener('pedidos', id) || p;
    const ahora = new Date().toISOString();
    const nuevo = { ...p, estado, historial: [...(p.historial || []), { estado, at: ahora, por: N.sesion().nombre }] };
    if (estado === 'en_camino') nuevo.repartidor = { ...(p.repartidor || {}), nombre: N.sesion().nombre };
    if (estado === 'entregado' || estado === 'cancelado') { if (GPS.pedido === id) dejarDeCompartir(); }
    if (estado === 'entregado') { nuevo.entregado = ahora; if (p.pago.tipo !== 'transferencia') nuevo.pago = { ...p.pago, estado: 'pagado', pagadoEn: ahora }; }
    await guardar('pedidos', nuevo);
    const msg = { confirmado: '¡Pedido confirmado! Ya lo estamos preparando.', preparando: 'Su pedido está en la cocina.', listo: p.modo === 'domicilio' ? 'Su pedido está listo y sale ya con el domiciliario.' : p.modo === 'recoger' ? 'Su pedido está listo para recoger.' : 'Su pedido está listo: ya se lo llevamos a la mesa.', en_camino: 'Su pedido va en camino. Esté pendiente.', entregado: '¡Gracias por su compra! Buen provecho.', cancelado: 'Su pedido fue cancelado. Si tiene dudas, escríbanos por aquí.' }[estado];
    if (msg) await guardar('mensajes', { pedido: id, de: 'negocio', texto: msg, firma: C.negocio.nombre });
    U.aviso(`${p.codigo}: ${N.NOMBRE_ESTADO[estado]}. El cliente recibió el aviso.`); U.vibrar(15);
    pintar(); abrirPedido(id);
  }
  async function guardar(col, d) { try { return await N.guardar(col, d); } catch (e) { if (e.pendiente) { U.aviso(e.message); return e.registro; } U.aviso(e.message); throw e; } }

  // ------------------------------------------------------------ 3. CAJA Y BALANCE
  function caja(m) {
    const d = P.dia, b = N.balance(d, d);
    const porMedio = { efectivo: 0, transferencia: 0, tarjeta: 0 }; b.pedidos.forEach(p => { porMedio[p.pago.tipo] += p.totales.total; });
    const apertura = N.obtener('aperturas', d), base = apertura ? +apertura.base || 0 : 0;
    const efEsperado = base + porMedio.efectivo + b.ingresosCaja.filter(i => i.medio === 'efectivo').reduce((a, i) => a + +i.valor, 0) - b.egresos.filter(e => e.medio === 'efectivo').reduce((a, e) => a + +e.valor, 0);
    const cierre = N.obtener('cierres', d);
    const puedeReg = N.puede('finanzas.registrar');
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Caja y balance</p><h1>${esc(U.fechaLarga(d + 'T12:00'))}</h1></div>
      <div class="diaSel"><button class="redondo chico" type="button" data-dd="-1" aria-label="Día anterior">${svg('atras')}</button><input type="date" id="cj-dia" value="${d}" max="${U.hoy()}" aria-label="Día"><button class="redondo chico" type="button" data-dd="1" aria-label="Día siguiente" ${d >= U.hoy() ? 'disabled' : ''}>${svg('adelante')}</button></div></header>
      ${b.porVerificar.length && N.puede('pedidos.pago') ? `<button type="button" class="avisoVerif" data-ir-verificar>${svg('transfer')}<span><b>${b.porVerificar.length} ${b.porVerificar.length === 1 ? 'transferencia' : 'transferencias'} por verificar · ${pesos(b.valorPorVerificar)}</b><small>No se suman a las ventas hasta que revise el comprobante y toque «Marcar pagado».</small></span>${svg('adelante')}</button>` : ''}
      <div class="kpis">
        <div class="kpi verde"><small>Ventas cobradas</small><b>${pesos(b.ventas)}</b><span>${b.pedidos.length} pedidos</span></div>
        <div class="kpi"><small>Otros ingresos</small><b>${pesos(b.otros)}</b><span>${b.ingresosCaja.length} registros</span></div>
        <div class="kpi brasa"><small>Egresos</small><b>${pesos(b.gastos)}</b><span>${b.egresos.length} registros</span></div>
        <div class="kpi oscuro"><small>Balance del día</small><b>${pesos(b.neto)}</b><span>${b.neto >= 0 ? 'a favor' : 'en contra'}</span></div>
      </div>
      <section class="ngCard ancho cajaEstado ${apertura ? (cierre ? 'cerrada' : 'abierta') : 'sinAbrir'}">
        <span class="ceIco">${svg(cierre ? 'candado' : apertura ? 'efectivo' : 'candado')}</span>
        <div class="ceTxt">${cierre ? `<b>Caja cerrada</b><small>Por ${esc(cierre.por)} a las ${U.hora(cierre.creado)}${apertura ? ` · base ${pesos(base)}` : ''}</small>` : apertura ? `<b>Caja abierta</b><small>Desde las ${U.hora(apertura.creado)} por ${esc(apertura.por)} · base en efectivo ${pesos(base)}</small>` : `<b>Caja sin abrir</b><small>${d === U.hoy() ? 'Ábrala con la base en efectivo. Pide la clave de caja del administrador.' : 'Este día no se registró apertura.'}</small>`}</div>
        ${!apertura && !cierre && d === U.hoy() && puedeReg ? `<label class="ceBase">Base en efectivo<input id="cj-base" inputmode="numeric" placeholder="$ 0"></label><button class="btn verde" type="button" id="cj-abrir">${svg('candado')} Abrir caja</button>` : ''}
      </section>
      <div class="ngGrid">
        <section class="ngCard"><h2>Ventas por medio de pago</h2>${Object.entries(porMedio).map(([k, v]) => `<div class="medio"><span>${MEDIOS[k]}</span><b>${pesos(v)}</b></div>`).join('')}</section>
        ${puedeReg ? `<section class="ngCard"><h2>Registrar movimiento</h2>
          <form id="cj-form" class="formulario sinPad">
            <div class="segmento" id="cj-tipo"><button type="button" data-t="egreso" aria-pressed="true">Egreso</button><button type="button" data-t="ingreso" aria-pressed="false">Ingreso de caja</button></div>
            <label>Categoría<select id="cj-cat">${CATEG_EGRESO.map(c => `<option>${c}</option>`).join('')}</select></label>
            <label>Descripción<input id="cj-desc" required maxlength="120" placeholder="Ej.: 20 pollos al proveedor"></label>
            <div class="dos"><label>Valor<input id="cj-valor" inputmode="numeric" required placeholder="$ 0"></label><label>Medio<select id="cj-medio"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option></select></label></div>
            <button class="btn verde" type="submit">${svg('mas')} Registrar</button></form></section>` : ''}
        <section class="ngCard ancho"><h2>Movimientos del día</h2>
          <table class="tabla"><thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Medio</th><th class="der">Valor</th>${puedeReg ? '<th></th>' : ''}</tr></thead><tbody>
          ${[...b.pedidos.map(p => ({ t: p.entregado || p.creado, tipo: 'Venta', det: `${p.codigo} · ${p.cliente.nombre}`, medio: p.pago.tipo, v: p.totales.total })),
            ...b.ingresosCaja.map(i => ({ t: i.creado, tipo: 'Ingreso', det: `${i.categoria} · ${i.descripcion}`, medio: i.medio, v: +i.valor, id: i.id, col: 'ingresos' })),
            ...b.egresos.map(e => ({ t: e.creado, tipo: 'Egreso', det: `${e.categoria} · ${e.descripcion}`, medio: e.medio, v: -e.valor, id: e.id, col: 'egresos' }))].sort((a, z) => a.t.localeCompare(z.t))
            .map(r => `<tr><td>${U.hora(r.t)}</td><td><span class="etiqueta ${r.v < 0 ? 'roja' : 'verde'}">${r.tipo}</span></td><td>${esc(r.det)}</td><td>${MEDIOS[r.medio] || ''}</td><td class="der ${r.v < 0 ? 'neg' : ''}">${r.v < 0 ? '− ' : ''}${pesos(Math.abs(r.v))}</td>${puedeReg ? `<td>${r.id ? `<button class="redondo chico" type="button" data-borrar-mov="${r.col}/${r.id}" aria-label="Borrar movimiento">${svg('basura')}</button>` : ''}</td>` : ''}</tr>`).join('') || `<tr><td colspan="6" class="mini">Sin movimientos este día.</td></tr>`}
          </tbody></table></section>
        <section class="ngCard ancho"><h2>Cierre de caja</h2>
          <p class="mini">Efectivo esperado en caja: base + ventas en efectivo + ingresos en efectivo − egresos en efectivo. Para cerrar se pide la clave de caja.</p>
          <div class="cierre"><div><small>Esperado</small><b>${pesos(efEsperado)}</b></div>
            ${cierre ? `<div><small>Contado</small><b>${pesos(cierre.contado)}</b></div><div><small>Diferencia</small><b class="${cierre.contado - efEsperado < 0 ? 'neg' : ''}">${pesos(cierre.contado - efEsperado)}</b></div><p class="mini">Cerrado por ${esc(cierre.por)} a las ${U.hora(cierre.creado)}.</p>`
            : puedeReg ? `<label class="nota-campo sinMargen">Efectivo contado<input id="cj-contado" inputmode="numeric" placeholder="$ 0"></label><button class="btn oscuro" type="button" id="cj-cerrar">${svg('candado')} Cerrar caja</button>` : '<p class="mini">Aún sin cierre.</p>'}
          </div></section>
      </div>`;
    $('#cj-dia').onchange = e => { P.dia = e.target.value || U.hoy(); pintar(); };
    m.querySelectorAll('[data-dd]').forEach(b2 => b2.onclick = () => { P.dia = sumarDias(P.dia, +b2.dataset.dd); if (P.dia > U.hoy()) P.dia = U.hoy(); pintar(); });
    if (puedeReg) {
      let tipo = 'egreso';
      $('#cj-tipo').onclick = e => { const b2 = e.target.closest('[data-t]'); if (!b2) return; tipo = b2.dataset.t; $$('#cj-tipo button').forEach(x => x.setAttribute('aria-pressed', x === b2)); $('#cj-cat').innerHTML = (tipo === 'egreso' ? CATEG_EGRESO : ['Venta en mostrador', 'Aporte de socios', 'Otros ingresos']).map(c => `<option>${c}</option>`).join(''); };
      $('#cj-valor').oninput = e => { const n = Number(e.target.value.replace(/\D/g, '')) || 0; e.target.value = n ? n.toLocaleString('es-CO') : ''; };
      $('#cj-form').onsubmit = async e => { e.preventDefault(); const valor = Number($('#cj-valor').value.replace(/\D/g, '')) || 0; if (!valor) { U.aviso('Escriba el valor.'); return; }
        await guardar(tipo === 'egreso' ? 'egresos' : 'ingresos', { fecha: P.dia + 'T' + new Date().toTimeString().slice(0, 8), categoria: $('#cj-cat').value, descripcion: $('#cj-desc').value.trim(), valor, medio: $('#cj-medio').value, por: N.sesion().nombre });
        U.aviso(tipo === 'egreso' ? 'Egreso registrado.' : 'Ingreso registrado.'); pintar(); };
      m.querySelectorAll('[data-borrar-mov]').forEach(b2 => b2.onclick = async () => { if (!confirm('¿Borrar este movimiento?')) return; const [col, id] = b2.dataset.borrarMov.split('/'); await N.borrar(col, id); pintar(); });
      if ($('#cj-cerrar')) { $('#cj-contado').oninput = e => { const n = Number(e.target.value.replace(/\D/g, '')) || 0; e.target.value = n ? n.toLocaleString('es-CO') : ''; };
        $('#cj-cerrar').onclick = async () => {
          const contado = Number($('#cj-contado').value.replace(/\D/g, '')) || 0;
          if (!await conClave('Cerrar la caja', `Esperado ${pesos(efEsperado)} · contado ${pesos(contado)}`)) return;
          await guardar('cierres', { id: d, dia: d, base, esperado: efEsperado, contado, por: N.sesion().nombre }); U.aviso('Caja cerrada.'); pintar(); }; }
      if ($('#cj-abrir')) {
        $('#cj-base').oninput = e => { const n = Number(e.target.value.replace(/\D/g, '')) || 0; e.target.value = n ? n.toLocaleString('es-CO') : ''; };
        $('#cj-abrir').onclick = async () => {
          const b0 = Number($('#cj-base').value.replace(/\D/g, '')) || 0;
          if (!await conClave('Abrir la caja', `Base en efectivo: ${pesos(b0)}`)) return;
          await guardar('aperturas', { id: d, dia: d, base: b0, por: N.sesion().nombre }); U.aviso('Caja abierta.'); pintar(); };
      }
    }
  }

  // ------------------------------------------------------------ clave de caja (teclado numérico grande)
  function teclado(titulo, sub) {
    const v = $('#velo-pin'); let pin = '';
    $('#pin-tit').textContent = titulo; $('#pin-sub').textContent = sub || 'Solo el administrador la conoce.'; $('#pin-nota').textContent = '';
    const pintarP = () => { $('#pin-puntos').innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, k) => `<i class="${k < pin.length ? 'on' : ''}"></i>`).join(''); $('#b-pin-ok').disabled = pin.length < 4; };
    pintarP(); v.hidden = false;
    if (/incorrecta/.test(sub || '')) { $('#pin-nota').textContent = sub; $('#pin-sub').textContent = 'Solo el administrador la conoce.'; const pp = $('#pin-puntos'); pp.classList.remove('error'); void pp.offsetWidth; pp.classList.add('error'); }
    return new Promise(res => {
      const fin = val => { v.hidden = true; document.removeEventListener('keydown', tecla); res(val); };
      const pulsar = k => { if (k === 'x') return fin(null); if (k === 'b') pin = pin.slice(0, -1); else if (/\d/.test(k) && pin.length < 6) pin += k; U.vibrar(6); pintarP(); };
      const tecla = e => { if (/^\d$/.test(e.key)) pulsar(e.key); if (e.key === 'Backspace') pulsar('b'); if (e.key === 'Escape') pulsar('x'); if (e.key === 'Enter' && pin.length >= 4) fin(pin); };
      document.addEventListener('keydown', tecla);
      $('#pin-teclado').onclick = e => { const b = e.target.closest('[data-k]'); if (b) pulsar(b.dataset.k); };
      $('#b-pin-ok').onclick = () => { if (pin.length >= 4) fin(pin); };
    });
  }
  async function crearClave(motivo) {
    const s = N.sesion();
    if (!['admin', 'superadmin'].includes(s.rol)) { U.aviso('Aún no hay clave de caja. El administrador debe crearla en Ajustes.', 5000); return false; }
    const a = await teclado('Nueva clave de caja', motivo || 'De 4 a 6 números. Solo la sabrá el administrador.'); if (!a) return false;
    const b = await teclado('Repita la clave', 'Escríbala otra vez para confirmar.'); if (!b) return false;
    if (a !== b) { U.aviso('Las claves no coinciden. Intente de nuevo.'); return false; }
    await N.cambiarPin(a); U.aviso('Clave de caja guardada.'); return true;
  }
  async function conClave(titulo, sub) {
    if (!N.tienePin()) { if (!await crearClave('Primero cree la clave de caja (4 a 6 números).')) return false; }
    let ayuda = sub;
    for (let intento = 0; intento < 5; intento++) {
      const p = await teclado(titulo, ayuda);
      if (p === null) return false;
      if (await N.verificarPin(p)) { U.vibrar([10, 40, 10]); return true; }
      U.vibrar([80, 40, 80]); ayuda = `Clave incorrecta (${intento + 1} de 5). Intente de nuevo.`;
    }
    U.aviso('Demasiados intentos. Pida la clave al administrador.'); return false;
  }

  // ------------------------------------------------------------ 4. MENÚ Y FOTOS
  function menu(m) {
    const cats = N.categorias();
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Menú</p><h1>Platos, fotos y ofertas</h1></div><div class="mnBotones"><button class="btn claro" type="button" id="mn-importar">${svg('compartir')} Importar Excel o CSV</button><button class="btn claro" type="button" id="mn-exportar">${svg('descargar')} Exportar base</button><button class="btn claro" type="button" id="mn-fotos-comp">${svg('estrella')} Fotos de ingredientes y salsas</button><button class="btn verde" type="button" id="mn-nuevo">${svg('mas')} Nuevo producto</button></div></header>
      ${window.DATOS && window.DATOS.esMenuDeEjemplo() ? `<section class="ngCard ancho bannerImp"><div><b>¿Empieza de cero?</b><p class="mini">Este es el menú de ejemplo. Suba su menú completo (platos, precios, categorías, salsas, ocasiones y publicidad) en un Excel o CSV con el mismo formato de «Exportar base».</p></div><button class="btn verde" type="button" data-importar>${svg('compartir')} Importar mi menú</button><button class="btn claro" type="button" data-video="importar">${svg('play')} Ver video</button></section>` : ''}
      ${cats.map(c => { const ps = N.menu().filter(p => p.cat === c.id); return `<section class="ngCard ancho"><h2>${esc(c.nombre)} <small class="mini">${ps.length} productos</small></h2>
        <div class="prodGrid">${ps.map(p => `<article class="prodTarj ${N.agotado(p) ? 'agotado' : ''}">${U.imgPlato(p, 300, 'foto')}
          <div class="prodInfo"><b>${esc(p.nombre)}</b><span>${p.oferta && p.oferta.precio ? `<s>${pesos(p.precio)}</s> ${pesos(p.oferta.precio)}` : pesos(p.precio)}</span>
          <div class="prodTags">${p.especialidad ? '<span class="tag oro">Especialidad</span>' : ''}${p.oferta ? `<span class="tag brasa">${esc(p.oferta.etiqueta || 'Oferta')}</span>` : ''}${N.agotado(p) ? '<span class="tag">Agotado</span>' : N.bajo(p) ? `<span class="tag brasa">Quedan ${N.existencias(p)}</span>` : N.existencias(p) !== null ? `<span class="tag">${N.existencias(p)} disp.</span>` : ''}</div></div>
          <div class="prodAcc"><label class="interruptor" title="Disponible"><input type="checkbox" data-disp="${p.id}" ${p.disponible !== false ? 'checked' : ''}><i></i></label><button class="btn claro" type="button" data-editar="${p.id}">Editar</button></div></article>`).join('')}</div></section>`; }).join('')}
      <section class="ngCard ancho"><h2>Salsas del recipiente</h2><div class="salsasEd">${N.salsas().map(s => `<div class="salsaFila"><span class="ico">${window.ARTE.recipiente(s.color, s.brillo)}</span><input value="${esc(s.nombre)}" data-salsa-nombre="${s.id}" aria-label="Nombre de la salsa"><input value="${s.precio || ''}" placeholder="Sin costo" inputmode="numeric" data-salsa-precio="${s.id}" aria-label="Precio de la salsa"><label class="interruptor"><input type="checkbox" data-salsa-disp="${s.id}" ${s.disponible !== false ? 'checked' : ''}><i></i></label></div>`).join('')}</div>
        <button class="btn claro" type="button" id="sl-guardar">Guardar salsas</button></section>`;
    $('#mn-nuevo').onclick = () => editarProducto(null);
    $('#mn-importar').onclick = () => window.DATOS.abrirImportar(() => pintar());
    $('#mn-exportar').onclick = () => window.DATOS.exportar('xlsx');
    $('#mn-fotos-comp').onclick = editarFotosComponentes;
    m.querySelectorAll('[data-importar]').forEach(b => b.onclick = () => window.DATOS.abrirImportar(() => pintar()));
    m.querySelectorAll('[data-video]').forEach(b => b.onclick = () => abrirVideoAyuda(b.dataset.video));
    m.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => editarProducto(b.dataset.editar));
    m.querySelectorAll('[data-disp]').forEach(i => i.onchange = async () => { const p = N.obtener('menu', i.dataset.disp); await guardar('menu', { ...p, disponible: i.checked }); U.aviso(i.checked ? `${p.nombre}: disponible` : `${p.nombre}: agotado (los clientes lo ven en gris)`); pintar(); });
    $('#sl-guardar').onclick = async () => { for (const s of N.salsas()) await guardar('salsas', { ...s, nombre: $(`[data-salsa-nombre="${s.id}"]`).value.trim() || s.nombre, precio: Number($(`[data-salsa-precio="${s.id}"]`).value.replace(/\D/g, '')) || 0, disponible: $(`[data-salsa-disp="${s.id}"]`).checked }); U.aviso('Salsas guardadas.'); };
  }
  function editarProducto(id) {
    const p = id ? { ...N.obtener('menu', id) } : { id: null, cat: 'fogon', nombre: '', precio: 0, porcion: '', descripcion: '', foto: '', arte: 'acompanante', ingredientes: [], disponible: true, especialidad: false, ocasiones: [], oferta: null };
    const caj = $('#ng-cajon'); caj.hidden = false;
    let foto = p.foto;
    const ingrTexto = (p.ingredientes || []).map(k => (window.CATALOGO.INGR[k] || [(p.ingredientesTexto || {})[k] || k])[0]).join(', ');
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">${id ? 'Editar producto' : 'Nuevo producto'}</p><h2>${esc(p.nombre || 'Sin nombre')}</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <form class="cajCuerpo formulario sinPad" id="pr-form">
        <div class="fotoEd"><div class="fotoPrev" id="pr-prev">${U.imgPlato(p, 500)}</div>
          <div class="fotoBtns"><label class="btn verde">${svg('compartir')} Subir foto de su preparación<input type="file" accept="image/*" capture="environment" id="pr-archivo" hidden></label><small class="mini">Se reduce sola a 1000 px en WebP. Mejor cuadrada y con buena luz.</small>${foto ? '<button class="enlace" type="button" id="pr-quitar">Quitar foto</button>' : ''}</div></div>
        <label>Nombre<input id="pr-nombre" required value="${esc(p.nombre)}"></label>
        <div class="dos"><label>Categoría<select id="pr-cat">${N.categorias().map(c => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label><label>Precio<input id="pr-precio" inputmode="numeric" required value="${p.precio ? p.precio.toLocaleString('es-CO') : ''}"></label></div>
        <label>Porción<input id="pr-porcion" value="${esc(p.porcion || '')}" placeholder="Personal, para 2 personas, 300 g…"></label>
        <label>Descripción<textarea id="pr-desc" rows="2" maxlength="160">${esc(p.descripcion || '')}</textarea></label>
        <label>Ingredientes (separados por comas; el cliente puede quitarlos)<input id="pr-ingr" value="${esc(ingrTexto)}"></label>
        <fieldset class="caja2"><legend>Oferta</legend><div class="dos"><label>Precio de oferta<input id="pr-oferta" inputmode="numeric" value="${p.oferta && p.oferta.precio ? p.oferta.precio.toLocaleString('es-CO') : ''}" placeholder="Vacío = sin oferta"></label><label>Etiqueta<input id="pr-oferta-tx" value="${esc(p.oferta ? p.oferta.etiqueta || '' : '')}" placeholder="2×1, Martes de pollo…"></label></div></fieldset>
        <label class="check"><input type="checkbox" id="pr-esp" ${p.especialidad ? 'checked' : ''}> <span>Especialidad de la casa (sale en el inicio y en reservas)</span></label>
        <fieldset class="caja2"><legend>Sugerido para reservas de</legend><div class="chipsSel">${N.ocasiones().map(o => `<label><input type="checkbox" value="${o.id}" ${(p.ocasiones || []).includes(o.id) ? 'checked' : ''}><span>${esc(o.nombre)}</span></label>`).join('')}</div></fieldset>
        <div class="dos"><button class="btn verde grande" type="submit">Guardar</button>${id ? '<button class="btn peligro grande" type="button" id="pr-borrar">Borrar</button>' : ''}</div>
      </form>`;
    $('#caj-cerrar').onclick = () => { caj.hidden = true; };
    $('#pr-precio').oninput = $('#pr-oferta').oninput = e => { const n = Number(e.target.value.replace(/\D/g, '')) || 0; e.target.value = n ? n.toLocaleString('es-CO') : ''; };
    $('#pr-archivo').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; U.aviso('Subiendo la foto…');
      try { foto = await D.subirFoto(f); $('#pr-prev').innerHTML = U.imgPlato({ ...p, foto }, 500); U.aviso('Foto lista. Toque «Guardar».'); } catch (er) { U.aviso(er.message); }
    };
    if ($('#pr-quitar')) $('#pr-quitar').onclick = () => { foto = ''; $('#pr-prev').innerHTML = U.imgPlato({ ...p, foto: '' }, 500); };
    $('#pr-form').onsubmit = async e => {
      e.preventDefault();
      const ingr = $('#pr-ingr').value.split(',').map(x => x.trim()).filter(Boolean).map(n => { const k = Object.keys(window.CATALOGO.INGR).find(k2 => window.CATALOGO.INGR[k2][0].toLowerCase() === n.toLowerCase()); if (k) return k; const nk = 'x-' + n.toLowerCase().normalize('NFD').replace(/[^\w]/g, '').slice(0, 20); window.CATALOGO.INGR[nk] = [n, 'disco', '#C9A97A', '#8D6E4C']; return nk; });
      const ofertaP = Number($('#pr-oferta').value.replace(/\D/g, '')) || 0;
      const datos = { ...p, cat: $('#pr-cat').value, nombre: $('#pr-nombre').value.trim(), precio: Number($('#pr-precio').value.replace(/\D/g, '')) || 0, porcion: $('#pr-porcion').value.trim(), descripcion: $('#pr-desc').value.trim(),
        ingredientes: ingr, ingredientesTexto: Object.fromEntries(ingr.map(k => [k, window.CATALOGO.INGR[k][0]])), foto, especialidad: $('#pr-esp').checked,
        ocasiones: [...caj.querySelectorAll('.chipsSel input:checked')].map(i => i.value), oferta: ofertaP ? { precio: ofertaP, etiqueta: $('#pr-oferta-tx').value.trim() || 'Oferta' } : null,
        orden: p.orden ?? N.menu().length };
      if (!datos.id) delete datos.id;
      await guardar('menu', datos); caj.hidden = true; U.aviso('Producto guardado. Los clientes ya lo ven.'); pintar();
    };
    if ($('#pr-borrar')) $('#pr-borrar').onclick = async () => { if (!confirm('¿Borrar ' + p.nombre + ' del menú?')) return; await N.borrar('menu', p.id); caj.hidden = true; pintar(); };
  }

  // ------------------------------------------------------------ INVENTARIO (existencias, alertas y agotados)
  function itemsInventario() {
    return [...N.menu().map(x => ({ col: 'menu', x, grupo: x.cat === 'bebidas' ? 'Bebidas' : 'Platos y porciones' })), ...N.salsas().map(x => ({ col: 'salsas', x, grupo: 'Salsas' }))];
  }
  function estadoInventario() {
    const it = itemsInventario();
    return { agotados: it.filter(i => N.agotado(i.x)), bajos: it.filter(i => N.bajo(i.x)), sinControl: it.filter(i => N.existencias(i.x) === null && i.x.disponible !== false) };
  }
  // aviso una sola vez por producto y por nivel (por agotarse / agotado)
  function avisarInventario(inv) {
    const vistos = U.ls.get('myr2_inv_avisos', {}), nuevos = [];
    inv.bajos.forEach(i => { const k = i.col + ':' + i.x.id; if (vistos[k] !== 'bajo') { vistos[k] = 'bajo'; nuevos.push(`${i.x.nombre}: quedan ${N.existencias(i.x)}`); } });
    inv.agotados.forEach(i => { const k = i.col + ':' + i.x.id; if (vistos[k] !== 'agotado') { vistos[k] = 'agotado'; nuevos.push(`${i.x.nombre}: agotado`); } });
    Object.keys(vistos).forEach(k => { const [col, id] = k.split(':'); const x = N.obtener(col, id); if (!x || (!N.agotado(x) && !N.bajo(x))) delete vistos[k]; });
    U.ls.set('myr2_inv_avisos', vistos);
    if (!nuevos.length || !N.puede('inventario.gestionar')) return;
    U.aviso('Inventario · ' + nuevos.join(' · ') + '. Toca reponer para la producción.', 6500); sonar();
    try { if ('Notification' in window && Notification.permission === 'granted') navigator.serviceWorker.getRegistration().then(r => r && r.showNotification(`${C.negocio.nombre} · Inventario`, { body: nuevos.join('\n') + '\nToca reponer para la producción.', icon: 'icons/icono-192.png', tag: 'inventario' })); } catch (e) { /* sin aviso */ }
  }
  function bannerInventario() {
    if (!N.puede('inventario.gestionar')) return '';
    const inv = estadoInventario(); if (!inv.agotados.length && !inv.bajos.length) return '';
    return `<button type="button" class="avisoInv" data-ir-sec="inventario">${svg('bolsa')}<span><b>${inv.agotados.length ? inv.agotados.length + ' agotado' + (inv.agotados.length > 1 ? 's' : '') : ''}${inv.agotados.length && inv.bajos.length ? ' · ' : ''}${inv.bajos.length ? inv.bajos.length + ' por agotarse' : ''}</b>
      <small>${[...inv.agotados, ...inv.bajos].slice(0, 4).map(i => esc(i.x.nombre) + (N.agotado(i.x) ? ' (0)' : ` (${N.existencias(i.x)})`)).join(' · ')} — toca reponer para la producción.</small></span>${svg('adelante')}</button>`;
  }
  function inventario(m) {
    const inv = estadoInventario(), alerta = (C.inventario && C.inventario.alerta) || 5;
    P.invFiltro = P.invFiltro || 'todos';
    const filtra = i => P.invFiltro === 'todos' || (P.invFiltro === 'alerta' && (N.agotado(i.x) || N.bajo(i.x))) || (P.invFiltro === 'sin' && N.existencias(i.x) === null);
    const items = itemsInventario().filter(filtra), grupos = ['Platos y porciones', 'Bebidas', 'Salsas'];
    const estado = x => N.agotado(x) ? ['Agotado', 'roja'] : N.bajo(x) ? ['Por agotarse', 'oro'] : N.existencias(x) === null ? ['Sin control', ''] : ['Disponible', 'verde'];
    const mini = i => i.col === 'salsas' ? (i.x.foto ? U.imgMini(i.x.foto, window.ARTE.recipiente(i.x.color, i.x.brillo), i.x.nombre) : `<span class="arte">${window.ARTE.recipiente(i.x.color, i.x.brillo)}</span>`) : U.imgPlato(i.x, 160);
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Inventario</p><h1>Existencias para la producción</h1><p class="mini">Cada pedido descuenta lo que lleva (platos, salsas y bebidas). Con ${alerta} o menos avisa; en 0 el cliente lo ve <b>agotado y en gris</b>.</p></div>
      <button class="btn claro" type="button" id="iv-reponer">${svg('descargar')} Lista para reponer</button></header>
      <div class="kpis compactos"><div class="kpi brasa"><small>Agotados</small><b>${inv.agotados.length}</b></div><div class="kpi oro2"><small>Por agotarse</small><b>${inv.bajos.length}</b><span>${alerta} o menos</span></div><div class="kpi"><small>Sin control</small><b>${inv.sinControl.length}</b><span>no se descuentan</span></div></div>
      <div class="clFiltros"><div class="segmento">${[['todos', 'Todos'], ['alerta', `Por reponer (${inv.agotados.length + inv.bajos.length})`], ['sin', 'Sin control']].map(([k, n]) => `<button type="button" data-ivf="${k}" aria-pressed="${k === P.invFiltro}">${n}</button>`).join('')}</div></div>
      <form id="iv-form">${grupos.map(g => { const xs = items.filter(i => i.grupo === g); return xs.length ? `<section class="ngCard ancho"><h2>${g}</h2><div class="ivLista">${xs.map(i => { const [en, cl] = estado(i.x), e = N.existencias(i.x); return `<div class="ivFila ${N.agotado(i.x) ? 'agotado' : ''}" data-k="${i.col}:${esc(i.x.id)}">
          <span class="ivFoto">${mini(i)}</span><span class="ivNom"><b>${esc(i.x.nombre)}</b><span class="etiqueta ${cl}">${en}</span></span>
          <label class="ivCampo">Hay<input type="number" min="0" step="1" inputmode="numeric" name="stock" value="${e === null ? '' : e}" placeholder="—"></label>
          <label class="ivCampo">Avisar en<input type="number" min="0" step="1" inputmode="numeric" name="minimo" value="${i.x.minimo ?? ''}" placeholder="${alerta}"></label>
          <span class="ivSuma"><button type="button" class="btn claro chico" data-suma="10">+10</button><button type="button" class="btn claro chico" data-suma="20">+20</button></span>
          <label class="interruptor" title="Se vende"><input type="checkbox" name="disp" ${i.x.disponible !== false ? 'checked' : ''}><i></i></label></div>`; }).join('')}</div></section>` : ''; }).join('') || '<p class="mini pad">No hay productos en este filtro.</p>'}
        <div class="ivGuardar"><p class="mini">«Hay» vacío = sin control (nunca se agota solo). El interruptor apaga un producto a mano.</p><button class="btn verde grande" type="submit">${svg('check')} Guardar inventario</button></div></form>`;
    m.querySelector('.segmento').onclick = e => { const b = e.target.closest('[data-ivf]'); if (b) { P.invFiltro = b.dataset.ivf; pintar(); } };
    m.querySelectorAll('[data-suma]').forEach(b => b.onclick = () => { const i = b.closest('.ivFila').querySelector('[name=stock]'); i.value = (+i.value || 0) + +b.dataset.suma; i.dispatchEvent(new Event('input')); });
    $('#iv-form').onsubmit = async e => {
      e.preventDefault(); let n = 0;
      for (const f of m.querySelectorAll('.ivFila')) {
        const [col, id] = f.dataset.k.split(':'), x = N.obtener(col, id); if (!x) continue;
        const sv = f.querySelector('[name=stock]').value.trim(), mv = f.querySelector('[name=minimo]').value.trim(), disp = f.querySelector('[name=disp]').checked;
        const nuevo = { ...x, stock: sv === '' ? null : Math.max(0, Math.floor(+sv)), minimo: mv === '' ? null : Math.max(0, Math.floor(+mv)), disponible: disp };
        if (nuevo.stock !== N.existencias(x) || (nuevo.minimo ?? null) !== (x.minimo ?? null) || disp !== (x.disponible !== false)) { await guardar(col, nuevo); n++; }
      }
      U.aviso(n ? `Inventario guardado (${n} cambios). Los clientes ya lo ven.` : 'No había cambios.'); pintar(); insignias();
    };
    $('#iv-reponer').onclick = () => {
      const xs = [...inv.agotados, ...inv.bajos];
      const hoja = { nombre: 'Por reponer', columnas: [{ titulo: 'Producto', ancho: 30 }, { titulo: 'Tipo', ancho: 18 }, { titulo: 'Hay', tipo: 'numero', ancho: 8 }, { titulo: 'Avisar en', tipo: 'numero', ancho: 10 }, { titulo: 'Estado', ancho: 14 }],
        filas: xs.map(i => [i.x.nombre, i.grupo, N.existencias(i.x) ?? 0, N.minimo(i.x), estado(i.x)[0]]) };
      if (!xs.length) { U.aviso('Nada por reponer: todo tiene existencias.'); return; }
      window.INFORME.abrir({ titulo: `Lista para reponer · ${C.negocio.nombre}`, subtitulo: `Generada ${new Date().toLocaleString('es-CO')}`, hojas: [hoja], archivo: `reponer-${C.negocio.id}-${U.hoy()}`, vertical: true });
    };
  }

  // ------------------------------------------------------------ fotos reales de ingredientes y salsas
  function editarFotosComponentes() {
    const caj = $('#ng-cajon'); caj.hidden = false;
    const ings = N.ingredientes(), salsas = N.salsas();
    const tarj = (tipo, id, nombre, ref, arte, sub) => `<div class="fcTarj"><span class="fcFoto">${ref ? U.imgMini(ref, arte, nombre, 300) : `<span class="arte">${arte}</span>`}</span><b>${esc(nombre)}</b><small>${esc(sub)}</small>
      <div class="fcAcc"><label class="btn claro chico">${svg('compartir')} ${ref ? 'Cambiar' : 'Subir'} foto<input type="file" accept="image/*" hidden data-fc="${tipo}:${esc(id)}"></label>${ref ? `<button class="btn claro chico" type="button" data-fc-quitar="${tipo}:${esc(id)}">Quitar</button>` : ''}</div></div>`;
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">Menú y fotos</p><h2>Fotos de ingredientes y salsas</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <p class="mini">Son las fotos que ve el cliente en el paso 1 (ingredientes) y el paso 2 (recipientes de salsa). Mejor cuadradas y de cerca. Sin foto se ve la ilustración.</p>
      <h3 class="subt sinMargen">Ingredientes (${ings.length})</h3><div class="fcGrid">${ings.map(g => { const a = window.CATALOGO.INGR[g.id] || ['', 'disco', '#C9A97A', '#8D6E4C']; return tarj('ing', g.id, g.nombre, g.foto, window.ARTE.mini(a[1], a[2], a[3]), g.platos.slice(0, 2).join(', ') + (g.platos.length > 2 ? '…' : '')); }).join('')}</div>
      <h3 class="subt">Salsas (${salsas.length})</h3><div class="fcGrid">${salsas.map(x => tarj('sal', x.id, x.nombre, x.foto, window.ARTE.recipiente(x.color, x.brillo), x.precio ? pesos(x.precio) : 'Sin costo')).join('')}</div>`;
    $('#caj-cerrar').onclick = () => { caj.hidden = true; };
    const poner = async (k, foto) => {
      const [tipo, id] = k.split(':');
      if (tipo === 'sal') { const x = N.obtener('salsas', id); await guardar('salsas', { ...x, foto }); }
      else { const x = N.obtener('ingredientes', id) || { id, nombre: N.nombreIngrediente(id) }; await guardar('ingredientes', { ...x, id, foto }); }
      editarFotosComponentes();
    };
    caj.querySelectorAll('[data-fc]').forEach(i => i.onchange = async e => { const f = e.target.files[0]; if (!f) return; U.aviso('Subiendo la foto…'); try { await poner(i.dataset.fc, await D.subirFoto(f)); U.aviso('Foto guardada. Los clientes ya la ven.'); } catch (er) { U.aviso(er.message); } });
    caj.querySelectorAll('[data-fc-quitar]').forEach(b => b.onclick = () => poner(b.dataset.fcQuitar, ''));
  }

  // ------------------------------------------------------------ 5. PUBLICIDAD
  function publicidad(m) {
    const ads = N.lista('publicidad').sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Publicidad</p><h1>Anuncios del inicio</h1><p class="mini">Salen arriba, en el inicio de cada cliente, y pasan solos.</p></div><button class="btn verde" type="button" id="pb-nuevo">${svg('mas')} Nuevo anuncio</button></header>
      <div class="adGrid">${ads.map(a => `<article class="adTarj ${a.activo === false ? 'apagado' : ''}"><span class="anFoto">${U.imgAncha(a.foto, (N.obtener('menu', a.producto) || {}).arte || 'picada', 700, 380)}</span><span class="anTexto">${a.etiqueta ? `<em>${esc(a.etiqueta)}</em>` : ''}<b>${esc(a.titulo)}</b><small>${esc(a.texto || '')}</small></span>
        <div class="adAcc"><label class="interruptor" title="Activo"><input type="checkbox" data-ad-act="${a.id}" ${a.activo !== false ? 'checked' : ''}><i></i></label><button class="btn claro" type="button" data-ad-ed="${a.id}">Editar</button></div></article>`).join('') || '<p class="mini">No hay anuncios.</p>'}</div>`;
    $('#pb-nuevo').onclick = () => editarAnuncio(null);
    m.querySelectorAll('[data-ad-ed]').forEach(b => b.onclick = () => editarAnuncio(b.dataset.adEd));
    m.querySelectorAll('[data-ad-act]').forEach(i => i.onchange = async () => { await guardar('publicidad', { ...N.obtener('publicidad', i.dataset.adAct), activo: i.checked }); pintar(); });
  }
  function editarAnuncio(id) {
    const a = id ? { ...N.obtener('publicidad', id) } : { titulo: '', texto: '', etiqueta: '', foto: '', producto: '', accion: '', activo: true };
    let foto = a.foto; const caj = $('#ng-cajon'); caj.hidden = false;
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">${id ? 'Editar anuncio' : 'Nuevo anuncio'}</p><h2>${esc(a.titulo || 'Anuncio')}</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <form class="cajCuerpo formulario sinPad" id="ad-form">
        <div class="anFoto previa" id="ad-prev">${foto ? U.imgAncha(foto, 'picada', 700, 380) : ''}</div>
        <label class="btn verde">${svg('compartir')} Subir imagen<input type="file" accept="image/*" id="ad-archivo" hidden></label>
        <label>Título<input id="ad-tit" required maxlength="40" value="${esc(a.titulo)}"></label>
        <label>Texto<input id="ad-txt" maxlength="70" value="${esc(a.texto || '')}"></label>
        <label>Etiqueta<input id="ad-eti" maxlength="20" value="${esc(a.etiqueta || '')}" placeholder="Oferta, Nuevo, Hoy…"></label>
        <label>Al tocarlo lleva a<select id="ad-dest"><option value="">Nada</option><option value="reservas" ${a.accion === 'reservas' ? 'selected' : ''}>Reservas</option>${N.menu().map(p => `<option value="p:${p.id}" ${a.producto === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
        <div class="dos"><button class="btn verde grande" type="submit">Guardar</button>${id ? '<button class="btn peligro grande" type="button" id="ad-borrar">Borrar</button>' : ''}</div></form>`;
    $('#caj-cerrar').onclick = () => { caj.hidden = true; };
    $('#ad-archivo').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { foto = await D.subirFoto(f); $('#ad-prev').innerHTML = U.imgAncha(foto, 'picada', 700, 380); } catch (er) { U.aviso(er.message); } };
    $('#ad-form').onsubmit = async e => { e.preventDefault(); const dest = $('#ad-dest').value;
      const d = { ...a, titulo: $('#ad-tit').value.trim(), texto: $('#ad-txt').value.trim(), etiqueta: $('#ad-eti').value.trim(), foto, accion: dest === 'reservas' ? 'reservas' : '', producto: dest.startsWith('p:') ? dest.slice(2) : '', orden: a.orden ?? N.lista('publicidad').length };
      if (!d.foto) { U.aviso('Suba una imagen para el anuncio.'); return; }
      await guardar('publicidad', d); caj.hidden = true; U.aviso('Anuncio publicado en el inicio.'); pintar(); };
    if ($('#ad-borrar')) $('#ad-borrar').onclick = async () => { if (!confirm('¿Borrar el anuncio?')) return; await N.borrar('publicidad', a.id); caj.hidden = true; pintar(); };
  }

  // ------------------------------------------------------------ 6. RESERVAS
  // ------------------------------------------------------------ videos de ayuda (archivos en /video)
  const VIDEOS = { configuracion: ['Configurar toda la plataforma', 'video/configuracion.mp4'], importar: ['Importar y actualizar la base', 'video/importar.mp4'] };
  function abrirVideoAyuda(id) {
    const [tit, src] = VIDEOS[id] || []; if (!src) return;
    const v = document.createElement('div'); v.className = 'velo videoAyuda'; v.innerHTML = `<div class="vaCaja" role="dialog" aria-modal="true" aria-label="${esc(tit)}"><div class="vaCab"><b>${esc(tit)}</b><button class="redondo" type="button" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <video src="${src}" controls autoplay playsinline preload="metadata"></video><p class="mini">El video necesita conexión a internet. También está en la carpeta «video» del zip.</p></div>`;
    document.body.append(v); v.hidden = false;
    const cerrar = () => { const vi = v.querySelector('video'); vi.pause(); v.remove(); };
    v.querySelector('.vaCab button').onclick = cerrar; v.onclick = e => { if (e.target === v) cerrar(); };
  }
  window.MYR_AYUDA = abrirVideoAyuda;

  // ------------------------------------------------------------ CLIENTES FRECUENTES (fidelización)
  const SEGMENTOS = { fiel: ['Fiel', 'verde'], frecuente: ['Frecuente', 'oro'], nuevo: ['Nuevo', ''], recuperar: ['Por recuperar', 'brasa'] };
  function analizarClientes() {
    const map = {}, hoy = Date.now(), BEBIDAS = new Set(N.menu().filter(x => x.cat === 'bebidas').map(x => x.nombre));
    N.lista('pedidos').filter(p => p.estado !== 'cancelado' && p.cliente).forEach(p => {
      const k = (p.cliente.correo || '').toLowerCase() || String(p.cliente.celular || '').replace(/\D/g, '') || p.autor; if (!k) return;
      const c = map[k] = map[k] || { id: k, nombre: p.cliente.nombre, celular: p.cliente.celular, correo: p.cliente.correo, fechas: [], total: 0, platos: {}, modos: {} };
      c.fechas.push(p.creado); c.total += p.totales.total || 0; c.modos[p.modo] = (c.modos[p.modo] || 0) + 1;
      p.items.forEach(it => { c.platos[it.nombre] = (c.platos[it.nombre] || 0) + it.cant; });
    });
    N.lista('reservas').forEach(r => { const k = (r.cliente && (r.cliente.correo || '').toLowerCase()) || ''; if (map[k]) map[k].reservas = (map[k].reservas || 0) + 1; });
    return Object.values(map).map(c => {
      c.fechas.sort(); const n = c.fechas.length, ult = c.fechas[n - 1];
      c.pedidos = n; c.ultimo = ult; c.primero = c.fechas[0]; c.promedio = Math.round(c.total / n);
      c.cada = n > 1 ? Math.max(1, Math.round((new Date(ult) - new Date(c.fechas[0])) / 864e5 / (n - 1))) : null;
      c.sinVenir = Math.floor((hoy - new Date(ult)) / 864e5);
      c.recientes = c.fechas.filter(f => hoy - new Date(f) < 60 * 864e5).length;
      const comida = Object.entries(c.platos).filter(([n]) => !BEBIDAS.has(n)); c.favorito = (comida.length ? comida : Object.entries(c.platos)).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
      c.seg = n >= 2 && c.sinVenir > Math.max(30, (c.cada || 0) * 2.5) ? 'recuperar' : c.recientes >= 4 || (n >= 3 && c.cada && c.cada <= 10) ? 'fiel' : n >= 2 ? 'frecuente' : 'nuevo';
      return c;
    });
  }
  // Ley 2300 de 2023: mensajes comerciales de lunes a viernes 7 a. m.–7 p. m. y sábados 8 a. m.–3 p. m.; nunca domingos ni festivos.
  function horarioPermitido(d = new Date()) { const dia = d.getDay(), h = d.getHours() + d.getMinutes() / 60; return dia >= 1 && dia <= 5 ? h >= 7 && h < 19 : dia === 6 ? h >= 8 && h < 15 : false; }
  function textoOferta(c) {
    const o = P.oferta, nom = (c.nombre || '').split(' ')[0];
    const que = o.que === 'favorito' ? `tu ${c.favorito[0]}` : o.que === 'todo' ? 'tu próximo pedido' : o.que;
    return `Hola, ${nom}. Gracias por preferir ${C.negocio.nombre}. ${c.seg === 'recuperar' ? '¡Te extrañamos! ' : ''}Por ser cliente ${SEGMENTOS[c.seg][0].toLowerCase()}, tienes ${o.pct}% de descuento en ${que}${o.hasta ? ` hasta el ${new Date(o.hasta + 'T12:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}` : ''}. Muestra este mensaje al pedir. Si no deseas recibir ofertas, respóndenos «NO».`;
  }
  function clientes(m) {
    P.oferta = P.oferta || { pct: 10, que: 'favorito', hasta: sumarDias(U.hoy(), 7) };
    P.segCli = P.segCli || 'todos'; P.ordenCli = P.ordenCli || 'pedidos';
    const todos = analizarClientes();
    const orden = { pedidos: (a, b) => b.pedidos - a.pedidos || b.total - a.total, gasto: (a, b) => b.total - a.total, recientes: (a, b) => b.ultimo.localeCompare(a.ultimo) }[P.ordenCli];
    const lista = todos.filter(c => P.segCli === 'todos' || c.seg === P.segCli).sort(orden);
    const top = [...todos].sort((a, b) => b.pedidos - a.pedidos || b.total - a.total)[0];
    const cuenta = k => todos.filter(c => c.seg === k).length;
    const okHora = horarioPermitido();
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Fidelización</p><h1>Clientes frecuentes</h1><p class="mini">Quién viene más, cada cuánto y qué pide. Úselo para dar ofertas y descuentos.</p></div>
      <button class="btn claro" type="button" id="cl-informe">${svg('descargar')} Lista en PDF o Excel</button></header>
      ${top ? `<section class="clTop"><div class="clCorona">${svg('estrella')}</div><div><p>Cliente más frecuente</p><h2>${esc(top.nombre)}</h2>
        <span>${top.pedidos} pedidos · ${pesos(top.total)} · ${top.cada ? 'viene cada ' + top.cada + ' días' : 'primer pedido'} · pide ${esc(top.favorito[0])}</span></div>
        <button class="btn oro" type="button" data-cl-wa="${esc(top.id)}">${svg('wa')} Enviarle una oferta</button></section>` : ''}
      <div class="kpis compactos"><div class="kpi"><small>Clientes</small><b>${todos.length}</b></div><div class="kpi verde"><small>Fieles</small><b>${cuenta('fiel')}</b><span>4+ pedidos en 60 días</span></div><div class="kpi"><small>Frecuentes</small><b>${cuenta('frecuente')}</b></div><div class="kpi brasa"><small>Por recuperar</small><b>${cuenta('recuperar')}</b><span>hace rato no piden</span></div></div>
      <section class="ngCard ancho clOferta"><h2>Oferta para enviar por WhatsApp</h2>
        <div class="clOfFila"><label>Descuento<span class="clPct"><input type="number" id="cl-pct" min="1" max="90" value="${P.oferta.pct}">%</span></label>
        <label>En<select id="cl-que"><option value="favorito" ${P.oferta.que === 'favorito' ? 'selected' : ''}>Su plato favorito</option><option value="todo" ${P.oferta.que === 'todo' ? 'selected' : ''}>Todo el pedido</option></select></label>
        <label>Válida hasta<input type="date" id="cl-hasta" value="${P.oferta.hasta}" min="${U.hoy()}"></label></div>
        <p class="mini ${okHora ? '' : 'alerta'}">${okHora ? 'Horario permitido para mensajes comerciales.' : '⚠ Ahora no es horario permitido (Ley 2300 de 2023): lunes a viernes de 7 a. m. a 7 p. m. y sábados de 8 a. m. a 3 p. m.; nunca domingos ni festivos. Programe el envío.'} Envíe solo a clientes que aceptaron recibir mensajes.</p></section>
      <div class="clFiltros"><div class="segmento">${[['todos', 'Todos'], ['fiel', 'Fieles'], ['frecuente', 'Frecuentes'], ['nuevo', 'Nuevos'], ['recuperar', 'Por recuperar']].map(([k, n]) => `<button type="button" data-seg="${k}" aria-pressed="${k === P.segCli}">${n}</button>`).join('')}</div>
        <label class="clOrden">Ordenar<select id="cl-orden"><option value="pedidos">Más pedidos</option><option value="gasto">Más gasto</option><option value="recientes">Más recientes</option></select></label></div>
      <ul class="clLista">${lista.map((c, k) => `<li style="--k:${k}"><span class="clRank">${k + 1}</span>
        <div class="clQuien"><b>${esc(c.nombre)}</b><small>${esc(c.celular || '')}${c.correo ? ' · ' + esc(c.correo) : ''}</small>
          <span class="clDatos"><i>${c.pedidos} ${c.pedidos === 1 ? 'pedido' : 'pedidos'}</i><i>${pesos(c.total)}</i><i>Promedio ${pesos(c.promedio)}</i><i>${c.cada ? 'Cada ' + c.cada + ' d' : 'Una vez'}</i><i>Último: ${c.sinVenir === 0 ? 'hoy' : 'hace ' + c.sinVenir + ' d'}</i><i>Pide: ${esc(c.favorito[0])}</i></span></div>
        <span class="etiqueta ${SEGMENTOS[c.seg][1]}">${SEGMENTOS[c.seg][0]}</span>
        ${String(c.celular || '').replace(/\D/g, '').length === 10 ? `<button class="redondo chico clWa" type="button" data-cl-wa="${esc(c.id)}" aria-label="Enviar oferta a ${esc(c.nombre)}">${svg('wa')}</button>` : ''}</li>`).join('') || '<li class="mini pad">Aún no hay pedidos de clientes.</li>'}</ul>`;
    $('#cl-orden').value = P.ordenCli;
    $('#cl-orden').onchange = e => { P.ordenCli = e.target.value; pintar(); };
    m.querySelector('.clFiltros .segmento').onclick = e => { const b = e.target.closest('[data-seg]'); if (b) { P.segCli = b.dataset.seg; pintar(); } };
    $('#cl-pct').onchange = e => { P.oferta.pct = Math.min(90, Math.max(1, +e.target.value || 10)); };
    $('#cl-que').onchange = e => { P.oferta.que = e.target.value; };
    $('#cl-hasta').onchange = e => { P.oferta.hasta = e.target.value; };
    m.onclick = e => {
      const b = e.target.closest('[data-cl-wa]'); if (!b) return;
      const c = todos.find(x => x.id === b.dataset.clWa), cel = String(c.celular || '').replace(/\D/g, '');
      if (cel.length !== 10) { U.aviso('Este cliente no tiene un celular de 10 dígitos.'); return; }
      if (!horarioPermitido() && !confirm('Fuera del horario permitido por la Ley 2300. ¿Abrir WhatsApp de todas formas para dejar el mensaje listo?')) return;
      window.open(`https://wa.me/57${cel}?text=${encodeURIComponent(textoOferta(c))}`, '_blank', 'noopener');
    };
    $('#cl-informe').onclick = () => {
      const hoja = { nombre: 'Clientes frecuentes', columnas: [{ titulo: '#', tipo: 'numero', ancho: 5 }, { titulo: 'Cliente', ancho: 26 }, { titulo: 'Celular', ancho: 13 }, { titulo: 'Correo', ancho: 26 }, { titulo: 'Segmento', ancho: 14 }, { titulo: 'Pedidos', tipo: 'numero', ancho: 9 }, { titulo: 'Total', tipo: 'pesos', ancho: 14 }, { titulo: 'Promedio', tipo: 'pesos', ancho: 13 }, { titulo: 'Cada (días)', tipo: 'numero', ancho: 11 }, { titulo: 'Último pedido', tipo: 'fecha', ancho: 17 }, { titulo: 'Plato favorito', ancho: 26 }],
        filas: lista.map((c, k) => [k + 1, c.nombre, c.celular, c.correo, SEGMENTOS[c.seg][0], c.pedidos, c.total, c.promedio, c.cada || '', c.ultimo, c.favorito[0]]) };
      const v = window.INFORME.abrir({ titulo: `Clientes frecuentes · ${C.negocio.nombre}`, subtitulo: `Generado ${new Date().toLocaleString('es-CO')} · ${lista.length} clientes`, hojas: [hoja], archivo: `clientes-${C.negocio.id}-${U.hoy()}` });
      const bx = document.createElement('button'); bx.className = 'btn claro'; bx.type = 'button'; bx.innerHTML = `${svg('descargar')} Excel`;
      bx.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(window.XLSX_MYR.crear([{ ...hoja, titulo: `Clientes frecuentes · ${C.negocio.nombre}` }])); a.download = `clientes-${C.negocio.id}-${U.hoy()}.xlsx`; document.body.append(a); a.click(); a.remove(); };
      v.querySelector('.infBotones').append(bx);
    };
  }

  function reservas(m) {
    const rs = N.lista('reservas').sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
    const prox = rs.filter(r => r.dia >= U.hoy() && !['rechazada', 'cancelada', 'cumplida'].includes(r.estado));
    const EST = { solicitada: ['Por confirmar', ''], confirmada: ['Confirmada', 'verde'], rechazada: ['Rechazada', 'roja'], cumplida: ['Cumplida', ''], cancelada: ['Cancelada', 'roja'] };
    const porDia = {}; prox.forEach(r => (porDia[r.dia] = porDia[r.dia] || []).push(r));
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Reservas</p><h1>${prox.length} próximas</h1><p class="mini">Turnos de ${C.reservas.intervaloMin} min · ${C.reservas.capacidadPorTurno} cupos por turno · ${C.reservas.apertura} a ${C.reservas.cierre}</p></div></header>
      ${Object.keys(porDia).length ? Object.entries(porDia).map(([d, lista]) => `<section class="ngCard ancho"><h2>${esc(U.fechaLarga(d + 'T12:00'))} <small class="mini">${lista.reduce((a, r) => a + r.personas, 0)} personas</small></h2>
        ${lista.map(r => { const o = N.obtener('ocasiones', r.ocasion) || { nombre: r.ocasion }; return `<div class="resFila"><b class="resHora">${r.hora}</b><div><b>${esc(r.cliente.nombre)} · ${r.personas} personas</b><small>${esc(o.nombre)} · ${esc(r.cliente.celular)}${r.descripcion ? ' · «' + esc(r.descripcion) + '»' : ''}</small></div>
          <span class="etiqueta ${EST[r.estado][1]}">${EST[r.estado][0]}</span>
          <div class="resAcc">${r.estado === 'solicitada' ? `<button class="btn verde" type="button" data-res="${r.id}" data-a="confirmada">Confirmar</button><button class="btn claro" type="button" data-res="${r.id}" data-a="rechazada">No hay cupo</button>` : r.estado === 'confirmada' ? `<button class="btn claro" type="button" data-res="${r.id}" data-a="cumplida">Llegaron</button>` : ''}</div></div>`; }).join('')}</section>`).join('')
      : '<section class="ngCard ancho"><p class="mini">No hay reservas próximas.</p></section>'}
      <details class="ngCard ancho"><summary>Historial (${rs.length - prox.length})</summary>${rs.filter(r => !prox.includes(r)).reverse().map(r => `<div class="resFila"><b class="resHora">${r.dia.slice(5)}</b><div><b>${esc(r.cliente.nombre)} · ${r.personas}</b><small>${r.hora}</small></div><span class="etiqueta ${EST[r.estado][1]}">${EST[r.estado][0]}</span></div>`).join('')}</details>`;
    m.querySelectorAll('[data-res]').forEach(b => b.onclick = async () => {
      const r = N.obtener('reservas', b.dataset.res); const a = b.dataset.a;
      const respuesta = a === 'confirmada' ? '¡Los esperamos!' : a === 'rechazada' ? (prompt('Mensaje para el cliente:', 'Ese turno ya está lleno. ¿Le sirve otra hora?') || '') : '';
      await guardar('reservas', { ...r, estado: a, respuesta, atendidaPor: N.sesion().nombre }); U.aviso('Reserva actualizada. El cliente lo ve en la app.'); pintar(); insignias();
    });
  }

  // ------------------------------------------------------------ 7. EQUIPO Y ROLES
  function equipo(m) {
    const s = N.sesion(); const gente = D.personal();
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Equipo</p><h1>Empleados y roles</h1><p class="mini">Cada rol define qué puede ver y hacer en el panel.</p></div><button class="btn verde" type="button" id="eq-nuevo">${svg('mas')} Agregar persona</button></header>
      <section class="ngCard ancho"><table class="tabla tablaEquipo"><thead><tr><th>Persona</th><th>Rol</th><th>Puede</th><th></th></tr></thead><tbody>
      ${gente.map(u => `<tr class="${u.inactivo ? 'apagado' : ''}"><td class="eqPersona"><span class="avatarGrande chico">${esc((u.nombre || '?')[0])}</span><span><b>${esc(u.nombre)}</b><small class="mini">${esc(u.correo)}</small></span></td><td class="eqRol"><span class="etiqueta ${['admin', 'superadmin'].includes(u.rol) ? 'oro' : ''}">${esc((N.ROLES[u.rol] || { nombre: u.rol }).nombre)}</span></td><td class="permisos">${['admin', 'superadmin'].includes(u.rol) ? '<span class="tag oro">Todo</span>' : (u.permisos || []).map(p => `<span class="tag">${esc(N.PERMISOS[p] || p)}</span>`).join('')}</td>
        <td class="eqAcc"><button class="btn claro" type="button" data-carnet="${esc(u.id)}">${svg('ticket')} Carné</button>${u.correo !== s.correo && (u.rol !== 'superadmin' || s.rol === 'superadmin') ? `<button class="btn claro" type="button" data-eq="${esc(u.id)}">Editar</button>` : '<span class="mini">Usted</span>'}</td></tr>`).join('')}</tbody></table></section>
      <section class="ngCard ancho"><h2>Roles disponibles</h2><div class="rolesGrid">${Object.entries(N.ROLES).filter(([k]) => k !== 'cliente').map(([k, r]) => `<div><b>${esc(r.nombre)}</b><small>${r.permisos.length === Object.keys(N.PERMISOS).length ? 'Todos los permisos' : r.permisos.map(p => N.PERMISOS[p]).join(' · ')}</small></div>`).join('')}</div></section>`;
    $('#eq-nuevo').onclick = () => editarPersona(null);
    m.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => editarPersona(b.dataset.eq));
    m.querySelectorAll('[data-carnet]').forEach(b => b.onclick = () => verCarnet(b.dataset.carnet));
  }
  function editarPersona(id) {
    const s = N.sesion(); const u = id ? D.personal().find(x => x.id === id) : { nombre: '', correo: '', celular: '', rol: 'cajero', permisos: N.ROLES.cajero.permisos };
    const caj = $('#ng-cajon'); caj.hidden = false;
    const roles = Object.entries(N.ROLES).filter(([k]) => k !== 'cliente' && (k !== 'superadmin' || s.rol === 'superadmin'));
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">${id ? 'Editar persona' : 'Nueva persona'}</p><h2>${esc(u.nombre || 'Empleado')}</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <form class="cajCuerpo formulario sinPad" id="eq-form">
        <label>Nombre<input id="eq-nombre" required value="${esc(u.nombre)}"></label>
        <label>Correo (con este entra al panel)<input id="eq-correo" type="email" required value="${esc(u.correo)}" ${id ? 'readonly' : ''}></label>
        <label>Celular<input id="eq-cel" inputmode="numeric" value="${esc(u.celular || '')}"></label>
        <div class="fotoEd"><div class="fotoPrev redonda" id="eq-foto-prev">${u.foto ? `<img src="${esc(U.foto(u.foto, 300))}" alt="">` : `<b>${esc((u.nombre || '?')[0])}</b>`}</div><div class="fotoBtns"><label class="btn verde">${svg('compartir')} Foto para el carné<input type="file" accept="image/*" capture="user" id="eq-foto" hidden></label><small class="mini">De frente, fondo claro, buena luz.</small></div></div>
        <div class="dos"><label>Cargo (sale en el carné)<input id="eq-cargo" maxlength="40" value="${esc(u.cargo || '')}" placeholder="Jefe de cocina, cajera…"></label><label>Documento<input id="eq-doc" maxlength="20" inputmode="numeric" value="${esc(u.documento || '')}"></label></div>
        <div class="dos"><label>RH<select id="eq-rh">${['', 'O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'].map(r => `<option ${r === (u.rh || '') ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label>Hora de entrada (turno)<input id="eq-turno" type="time" value="${esc(u.turno || C.asistencia.horaEntrada)}"></label></div>
        <label>Rol<select id="eq-rol">${roles.map(([k, r]) => `<option value="${k}" ${k === u.rol ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select></label>
        <fieldset class="caja2 permCaja"><legend>Qué puede hacer</legend><p class="mini sinMargen" id="eq-perm-ayuda">${['admin', 'superadmin'].includes(u.rol) ? 'Este rol puede hacer todo.' : 'Active o apague cada permiso.'}</p><div class="permGrid">${Object.entries(N.PERMISOS).map(([k, n]) => `<label class="permFila"><span>${esc(n)}</span><span class="interruptor"><input type="checkbox" value="${k}" ${(['admin', 'superadmin'].includes(u.rol) || (u.permisos || []).includes(k)) ? 'checked' : ''} ${['admin', 'superadmin'].includes(u.rol) ? 'disabled' : ''}><i></i></span></label>`).join('')}</div></fieldset>
        ${D.modo === 'demo' ? `<label>${id ? 'Nueva clave (vacío = no cambia)' : 'Clave temporal (mínimo 6)'}<input id="eq-clave" type="text" ${id ? '' : 'required minlength="6"'} autocomplete="new-password"></label>` : '<p class="mini">La persona crea su clave desde «Crear cuenta» con este mismo correo; luego entra por «Soy del negocio».</p>'}
        ${id ? `<label class="check"><input type="checkbox" id="eq-inactivo" ${u.inactivo ? 'checked' : ''}> <span>Desactivar acceso</span></label>` : ''}
        <button class="btn verde grande" type="submit">Guardar</button></form>`;
    $('#caj-cerrar').onclick = () => { caj.hidden = true; };
    let fotoNueva;
    $('#eq-foto').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { fotoNueva = await D.subirFoto(f); $('#eq-foto-prev').innerHTML = `<img src="${esc(U.foto(fotoNueva, 300))}" alt="">`; } catch (er) { U.aviso(er.message); } };
    $('#eq-rol').onchange = e => { const r = e.target.value, ps = N.ROLES[r].permisos, todo = ['admin', 'superadmin'].includes(r); caj.querySelectorAll('.permGrid input').forEach(i => { i.checked = ps.includes(i.value); i.disabled = todo; }); $('#eq-perm-ayuda').textContent = todo ? 'Este rol puede hacer todo.' : 'Active o apague cada permiso.'; };
    $('#eq-form').onsubmit = async e => {
      e.preventDefault();
      const rol = $('#eq-rol').value, permisos = ['admin', 'superadmin'].includes(rol) ? N.ROLES[rol].permisos : [...caj.querySelectorAll('.permGrid input:checked')].map(i => i.value);
      const extra = { cargo: $('#eq-cargo').value.trim(), documento: $('#eq-doc').value.trim(), rh: $('#eq-rh').value, turno: $('#eq-turno').value, ...(fotoNueva ? { foto: fotoNueva } : {}) };
      try {
        if (id) await D.actualizarEmpleado(id, { ...extra, nombre: $('#eq-nombre').value.trim(), celular: $('#eq-cel').value.trim(), rol, permisos, inactivo: $('#eq-inactivo').checked, ...($('#eq-clave') && $('#eq-clave').value ? { clave: $('#eq-clave').value } : {}) });
        else { await D.crearEmpleado({ nombre: $('#eq-nombre').value, correo: $('#eq-correo').value, celular: $('#eq-cel').value.trim(), rol, permisos, clave: $('#eq-clave') ? $('#eq-clave').value : '' }); const nuevo = D.personal().find(x => x.correo === $('#eq-correo').value.trim().toLowerCase()); if (nuevo) await D.actualizarEmpleado(nuevo.id, extra); }
        caj.hidden = true; U.aviso('Equipo actualizado.'); pintar();
      } catch (er) { U.aviso(er.message); }
    };
  }

  // ------------------------------------------------------------ carné del personal
  const codigoCarnet = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8); crypto.getRandomValues(b); return 'MYR-' + [...b].map(x => a[x % a.length]).join(''); };
  async function verCarnet(id) {
    let u = D.personal().find(x => x.id === id); if (!u) return;
    const puedeEditar = N.puede('equipo.gestionar');
    if (!u.carnet && puedeEditar) { await D.actualizarEmpleado(id, { carnet: codigoCarnet(), carnet_vence: sumarDias(U.hoy(), 365) }); u = D.personal().find(x => x.id === id); }
    const caj = $('#ng-cajon'); caj.hidden = false;
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">Carné del personal</p><h2>${esc(u.nombre)}</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <div class="cajCuerpo"><div class="cnImg" id="cn-img"><div class="tkCargando">Generando el carné…</div></div>
        <div class="cajTkBotones dos"><button class="btn verde" type="button" id="cn-descargar">${svg('descargar')} Descargar</button><button class="btn claro" type="button" id="cn-imprimir">Imprimir (54 × 86 mm)</button></div>
        <p class="mini">El QR abre la verificación: muestra si el carné es original y está activo. El mismo QR se escanea en <b>Asistencia</b> al llegar al trabajo. Código: <b>${esc(u.carnet || '—')}</b> · vence ${esc(u.carnet_vence || '—')}.</p>
        ${!u.foto ? '<p class="nota">Falta la foto: agréguela en «Editar».</p>' : ''}
        ${puedeEditar ? `<button class="btn peligro" type="button" id="cn-nuevo">Generar código nuevo (anula el carné anterior)</button>` : ''}</div>`;
    $('#caj-cerrar').onclick = () => { caj.hidden = true; };
    const cv = await window.CARNET.dibujar(u, { cargo: u.cargo, rolNombre: (N.ROLES[u.rol] || {}).nombre, foto: U.foto(u.foto, 600) });
    const url = cv.toDataURL('image/png'); $('#cn-img').innerHTML = `<img src="${url}" alt="Carné de ${esc(u.nombre)}">`;
    $('#cn-descargar').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = `carne-${(u.nombre || 'personal').toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-')}.png`; document.body.append(a); a.click(); a.remove(); };
    $('#cn-imprimir').onclick = () => { const w = window.open('', '_blank'); if (!w) { U.aviso('Permita las ventanas emergentes para imprimir.'); return; } w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Carné ${esc(u.nombre)}</title><style>@page{size:auto;margin:12mm}body{margin:0}img{width:54mm;height:85.6mm;border-radius:3mm}</style></head><body><img src="${url}" alt=""><script>onload=()=>print()<\/script></body></html>`); w.document.close(); };
    if ($('#cn-nuevo')) $('#cn-nuevo').onclick = async () => { if (!confirm('¿Generar un código nuevo? El carné impreso anterior dejará de servir.')) return; await D.actualizarEmpleado(id, { carnet: codigoCarnet(), carnet_vence: sumarDias(U.hoy(), 365) }); verCarnet(id); };
  }

  // ------------------------------------------------------------ asistencia: escanear el carné al llegar
  const durTarde = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  const minutos = h => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + b; };
  function asistencia(m) {
    const dia = P.diaAs || U.hoy();
    const regs = N.lista('asistencia').filter(r => r.dia === dia).sort((a, b) => b.at.localeCompare(a.at));
    const presentes = new Set(regs.filter(r => r.tipo === 'entrada').map(r => r.persona));
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Asistencia</p><h1>${esc(U.fechaLarga(dia + 'T12:00'))}</h1><p class="mini">Cada persona escanea su carné al llegar (entrada) y al irse (salida).</p></div>
      <div class="diaSel"><input type="date" id="as-dia" value="${dia}" max="${U.hoy()}" aria-label="Día"></div></header>
      ${dia === U.hoy() ? `<section class="ngCard ancho asEscaner"><button class="btn verde grande" type="button" id="as-escanear">${svg('mira')} Escanear carné</button>
        <form id="as-manual" class="asManual"><input id="as-codigo" placeholder="O escriba el código: MYR-XXXXXXXX" autocomplete="off" aria-label="Código del carné"><button class="btn claro" type="submit">Registrar</button></form>
        <p class="mini">Ponga este celular o tableta en la entrada. Funciona con la cámara de atrás.</p></section>` : ''}
      <div class="kpis compactos"><div class="kpi verde"><small>Llegaron</small><b>${presentes.size}</b></div><div class="kpi brasa"><small>Llegadas tarde</small><b>${regs.filter(r => r.tipo === 'entrada' && r.tarde > 0).length}</b></div><div class="kpi"><small>Registros</small><b>${regs.length}</b></div></div>
      <section class="ngCard ancho"><h2>Registros del día</h2><table class="tabla"><thead><tr><th>Hora</th><th>Persona</th><th>Cargo</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>
        ${regs.map(r => `<tr><td>${U.hora(r.at)}</td><td><b>${esc(r.nombre)}</b></td><td>${esc(r.cargo || '')}</td><td><span class="etiqueta ${r.tipo === 'entrada' ? 'verde' : ''}">${r.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span></td><td>${r.tipo === 'entrada' ? (r.tarde > 0 ? `<span class="etiqueta roja">Tarde ${durTarde(r.tarde)}</span>` : '<span class="etiqueta verde">A tiempo</span>') : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="mini">Sin registros este día.</td></tr>'}
      </tbody></table></section>`;
    $('#as-dia').onchange = e => { P.diaAs = e.target.value || U.hoy(); pintar(); };
    if ($('#as-escanear')) {
      $('#as-escanear').onclick = abrirEscaner;
      $('#as-manual').onsubmit = e => { e.preventDefault(); const c = $('#as-codigo').value.trim(); if (c) registrarAsistencia(c); $('#as-codigo').value = ''; };
    }
  }
  async function registrarAsistencia(texto) {
    const codigo = (String(texto).match(/verificar=([^&#\s]+)/) || [])[1] ? decodeURIComponent(String(texto).match(/verificar=([^&#\s]+)/)[1]) : String(texto).trim();
    let u; try { u = await D.verificarCarnet(codigo); } catch (e) { mostrarResultado({ ok: false, titulo: 'Sin señal', texto: e.message }); return; }
    if (!u) { mostrarResultado({ ok: false, titulo: 'Carné no válido', texto: 'Este código no pertenece al personal del negocio.' }); return; }
    if (!u.activo) { mostrarResultado({ ok: false, titulo: 'Acceso desactivado', texto: `${u.nombre} no está activo. Hable con el administrador.`, u }); return; }
    if (u.carnet_vence && u.carnet_vence < U.hoy()) { mostrarResultado({ ok: false, titulo: 'Carné vencido', texto: `Venció el ${u.carnet_vence}. Pida uno nuevo.`, u }); return; }
    const hoy = U.hoy(), ahora = new Date();
    const ult = N.lista('asistencia').filter(r => r.dia === hoy && r.persona === u.id).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (ult && ahora - new Date(ult.at) < 3 * 60000) { mostrarResultado({ ok: true, titulo: 'Ya quedó registrado', texto: `${ult.tipo === 'entrada' ? 'Entrada' : 'Salida'} a las ${U.hora(ult.at)}.`, u }); return; }
    const tipo = ult && ult.tipo === 'entrada' ? 'salida' : 'entrada';
    const tarde = tipo === 'entrada' ? Math.max(0, ahora.getHours() * 60 + ahora.getMinutes() - minutos(u.turno || C.asistencia.horaEntrada) - C.asistencia.toleranciaMin) : 0;
    await guardar('asistencia', { dia: hoy, at: ahora.toISOString(), persona: u.id, nombre: u.nombre, cargo: u.cargo || (N.ROLES[u.rol] || {}).nombre || '', rol: u.rol, tipo, tarde, turno: u.turno || C.asistencia.horaEntrada, tomadaPor: N.sesion().nombre });
    const nombre = u.nombre.split(' ')[0];
    mostrarResultado({ ok: true, titulo: tipo === 'entrada' ? `¡Bienvenido, ${nombre}!` : `¡Hasta luego, ${nombre}!`, texto: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} a las ${U.hora(ahora.toISOString())}${tipo === 'entrada' ? (tarde ? ` · llegó ${durTarde(tarde)} tarde` : ' · a tiempo') : ''}.`, u, tarde });
    try { const v = new SpeechSynthesisUtterance(tipo === 'entrada' ? `Bienvenido, ${nombre}` : `Hasta luego, ${nombre}`); v.lang = 'es-CO'; speechSynthesis.speak(v); } catch (e) { /* sin voz */ }
    pintar();
  }
  function mostrarResultado({ ok, titulo, texto, u, tarde }) {
    sonar(); U.vibrar(ok ? [30, 40, 30] : [200, 80, 200]);
    const v = document.createElement('div'); v.className = 'velo centro'; v.id = 'velo-asis';
    v.innerHTML = `<div class="modal asResultado ${ok ? (tarde ? 'tarde' : 'ok') : 'mal'}" role="alertdialog" aria-live="assertive">
      <span class="asFoto">${u && u.foto ? `<img src="${esc(U.foto(u.foto, 300))}" alt="">` : svg(ok ? 'check' : 'cerrar')}</span>
      <h2>${esc(titulo)}</h2><p>${esc(texto)}</p>${u ? `<small>${esc(u.cargo || (N.ROLES[u.rol] || {}).nombre || '')}</small>` : ''}
      <button class="btn ${ok ? 'verde' : 'claro'} grande" type="button">Listo</button></div>`;
    document.body.append(v);
    const cerrar = () => v.remove(); v.querySelector('button').onclick = cerrar; setTimeout(cerrar, 4500);
  }
  let escaner = null;
  async function abrirEscaner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { U.aviso('Este equipo no permite usar la cámara. Escriba el código.'); return; }
    const v = document.createElement('div'); v.className = 'velo centro oscuro'; v.id = 'velo-escaner';
    v.innerHTML = `<div class="modal escaner"><div class="esMarco"><video playsinline muted></video><span class="esGuia"></span></div><p>Ponga el QR del carné dentro del cuadro</p><button class="btn claro" type="button">Cerrar</button></div>`;
    document.body.append(v);
    const video = v.querySelector('video'); let vivo = true;
    const cerrar = () => { vivo = false; if (escaner) escaner.getTracks().forEach(t => t.stop()); escaner = null; v.remove(); };
    v.querySelector('button').onclick = cerrar;
    try { escaner = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); video.srcObject = escaner; await video.play(); }
    catch (e) { cerrar(); U.aviso('No se pudo abrir la cámara. Dé permiso o escriba el código.', 5000); return; }
    const det = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    const paso = async () => {
      if (!vivo) return;
      let txt = null;
      try {
        if (video.readyState >= 2) {
          if (det) { const r = await det.detect(video); if (r[0]) txt = r[0].rawValue; }
          else if (window.jsQR) { cv.width = video.videoWidth; cv.height = video.videoHeight; ctx.drawImage(video, 0, 0); const d = ctx.getImageData(0, 0, cv.width, cv.height); const r = window.jsQR(d.data, cv.width, cv.height, { inversionAttempts: 'dontInvert' }); if (r) txt = r.data; }
        }
      } catch (e) { /* cuadro sin leer */ }
      if (txt) { cerrar(); registrarAsistencia(txt); return; }
      setTimeout(paso, 180);
    };
    paso();
  }
  // para el tutorial: registra la llegada del primer empleado con carné
  async function simularEscaneo() { const u = D.personal().find(x => x.carnet && x.rol !== 'admin'); if (u) await registrarAsistencia(u.carnet); }

  // ------------------------------------------------------------ 8. CONSOLIDADO (cada 15 días)
  function reportes(m) {
    const e = estadoCorte();
    P.rango = P.rango || { desde: e.desde, hasta: U.hoy() };
    const b = N.balance(P.rango.desde, P.rango.hasta);
    const historial = N.lista('exportes').sort((a, z) => z.creado.localeCompare(a.creado));
    const clientes = resumenClientes(P.rango.desde, P.rango.hasta);
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Consolidado</p><h1>Ventas, ingresos y egresos</h1><p class="mini">Cada ${C.reportes.cadaDias} días la app le recuerda generar este archivo.</p></div></header>
      ${bannerCorte()}
      <section class="ngCard ancho"><div class="rango"><label>Desde<input type="date" id="rp-desde" value="${P.rango.desde}" max="${U.hoy()}"></label><label>Hasta<input type="date" id="rp-hasta" value="${P.rango.hasta}" max="${U.hoy()}"></label>
        <button class="btn claro" type="button" id="rp-corte">Desde el último corte</button></div>
        <div class="kpis compactos"><div class="kpi verde"><small>Ventas</small><b>${pesos(b.ventas)}</b><span>${b.pedidos.length} pedidos</span></div><div class="kpi"><small>Otros ingresos</small><b>${pesos(b.otros)}</b></div><div class="kpi brasa"><small>Egresos</small><b>${pesos(b.gastos)}</b></div><div class="kpi oscuro"><small>Balance</small><b>${pesos(b.neto)}</b></div></div>
        <div class="rpBotones"><button class="btn verde grande" type="button" id="rp-xlsx">${svg('descargar')} Descargar consolidado en Excel</button><button class="btn claro" type="button" id="rp-csv">CSV de ventas</button><button class="btn claro" type="button" id="rp-imprimir">${svg('ticket')} Ver informe · PDF e imprimir</button><button class="btn claro" type="button" id="rp-tickets">Tickets del periodo (PNG)</button></div>
        <p class="mini">El Excel trae ocho hojas: resumen, ventas pedido por pedido, productos, balance diario, egresos, clientes, reservas y asistencia.</p></section>
      <div class="ngGrid">
        <section class="ngCard"><h2>Por cliente</h2>${clientes.slice(0, 8).map(c => `<div class="medio"><span>${esc(c.nombre)}<small class="mini"> · ${c.pedidos} pedidos</small></span><b>${pesos(c.total)}</b></div>`).join('') || '<p class="mini">Sin ventas en el periodo.</p>'}</section>
        <section class="ngCard"><h2>Cortes anteriores</h2>${historial.slice(0, 8).map(x => `<div class="medio"><span>${esc(x.desde)} a ${esc(x.hasta)}<small class="mini"> · ${esc(x.por)}</small></span><b>${pesos(x.neto)}</b></div>`).join('') || '<p class="mini">Aún no ha generado consolidados.</p>'}</section>
      </div>`;
    $('#rp-desde').onchange = ev => { P.rango.desde = ev.target.value; pintar(); };
    $('#rp-hasta').onchange = ev => { P.rango.hasta = ev.target.value; pintar(); };
    $('#rp-corte').onclick = () => { P.rango = { desde: estadoCorte().desde, hasta: U.hoy() }; pintar(); };
    $('#rp-xlsx').onclick = () => exportar('xlsx');
    $('#rp-csv').onclick = () => exportar('csv');
    $('#rp-imprimir').onclick = () => imprimir();
    $('#rp-tickets').onclick = async () => { for (const p of N.balance(P.rango.desde, P.rango.hasta).pedidos.slice(0, 40)) { await window.TICKET.descargar(p); await new Promise(r => setTimeout(r, 350)); } };
  }
  function resumenClientes(desde, hasta) {
    const map = {}; N.balance(desde, hasta).pedidos.forEach(p => { const k = p.cliente.correo || p.cliente.celular; map[k] = map[k] || { nombre: p.cliente.nombre, celular: p.cliente.celular, correo: p.cliente.correo, pedidos: 0, total: 0 }; map[k].pedidos++; map[k].total += p.totales.total; });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }
  function libro(desde, hasta) {
    const b = N.balance(desde, hasta), periodo = `Del ${desde} al ${hasta}`;
    const porMedio = { efectivo: 0, transferencia: 0, tarjeta: 0 }; b.pedidos.forEach(p => { porMedio[p.pago.tipo] += p.totales.total; });
    const prod = {}; b.pedidos.forEach(p => p.items.forEach(it => { prod[it.nombre] = prod[it.nombre] || { c: 0, v: 0 }; prod[it.nombre].c += it.cant; prod[it.nombre].v += (it.total - 0); it.bebidas.forEach(bb => { const x = N.obtener('menu', bb.id); if (x) { prod[x.nombre] = prod[x.nombre] || { c: 0, v: 0 }; prod[x.nombre].c += bb.cant; } }); }));
    const dias = []; for (let d = desde; d <= hasta; d = sumarDias(d, 1)) { const x = N.balance(d, d); dias.push([d, x.pedidos.length, x.ventas, x.otros, x.gastos, x.neto]); }
    const tot = (...v) => Object.assign(v, { negrita: true });
    return [
      { nombre: 'Resumen', titulo: `Consolidado · ${C.negocio.nombre}`, subtitulo: `${periodo} · generado ${new Date().toLocaleString('es-CO')} por ${N.sesion().nombre}`,
        columnas: [{ titulo: 'Concepto', ancho: 34 }, { titulo: 'Valor', tipo: 'pesos', ancho: 18 }],
        filas: [['Ventas cobradas', b.ventas], ['  · Efectivo', porMedio.efectivo], ['  · Transferencia', porMedio.transferencia], ['  · Tarjeta', porMedio.tarjeta], ['Otros ingresos de caja', b.otros], tot('Total ingresos', b.ingresos), tot('Total egresos', b.gastos), tot('Balance (ingresos − egresos)', b.neto), ['Número de pedidos cobrados', String(b.pedidos.length)]] },
      { nombre: 'Ventas', columnas: [{ titulo: 'Fecha', tipo: 'fecha', ancho: 17 }, { titulo: 'Código', ancho: 15 }, { titulo: 'Cliente', ancho: 24 }, { titulo: 'Celular', ancho: 13 }, { titulo: 'Modo', ancho: 11 }, { titulo: 'Mesa / dirección', ancho: 30 }, { titulo: 'Productos', ancho: 50 }, { titulo: 'Platos', tipo: 'pesos' }, { titulo: 'Salsas', tipo: 'pesos', ancho: 11 }, { titulo: 'Bebidas', tipo: 'pesos', ancho: 12 }, { titulo: 'Empaque', tipo: 'pesos', ancho: 11 }, { titulo: 'Domicilio', tipo: 'pesos', ancho: 12 }, { titulo: 'Total', tipo: 'pesos', ancho: 14 }, { titulo: 'Medio de pago', ancho: 14 }, { titulo: 'Estado', ancho: 12 }],
        filas: b.pedidos.map(p => [p.enviado || p.creado, p.codigo, p.cliente.nombre, p.cliente.celular, p.modo, p.modo === 'domicilio' ? p.destino.direccion : p.mesa ? 'Mesa ' + p.mesa : '', p.items.map(i => `${i.cant}× ${i.nombre} (${i.detalle})`).join(' | '), p.totales.platos, p.totales.salsas, p.totales.bebidas, p.totales.empaque, p.totales.domicilio, p.totales.total, MEDIOS[p.pago.tipo], N.NOMBRE_ESTADO[p.estado]]) },
      { nombre: 'Productos', columnas: [{ titulo: 'Producto', ancho: 30 }, { titulo: 'Unidades', tipo: 'numero', ancho: 12 }, { titulo: 'Ventas (platos con adiciones)', tipo: 'pesos', ancho: 26 }], filas: Object.entries(prod).sort((a, z) => z[1].c - a[1].c).map(([n, x]) => [n, x.c, x.v || '']) },
      { nombre: 'Balance diario', columnas: [{ titulo: 'Día', ancho: 12 }, { titulo: 'Pedidos', tipo: 'numero', ancho: 10 }, { titulo: 'Ventas', tipo: 'pesos' }, { titulo: 'Otros ingresos', tipo: 'pesos' }, { titulo: 'Egresos', tipo: 'pesos' }, { titulo: 'Balance', tipo: 'pesos' }], filas: [...dias, tot('Total', b.pedidos.length, b.ventas, b.otros, b.gastos, b.neto)] },
      { nombre: 'Egresos', columnas: [{ titulo: 'Fecha', tipo: 'fecha', ancho: 17 }, { titulo: 'Categoría', ancho: 24 }, { titulo: 'Descripción', ancho: 36 }, { titulo: 'Medio', ancho: 14 }, { titulo: 'Valor', tipo: 'pesos', ancho: 14 }, { titulo: 'Registró', ancho: 20 }],
        filas: [...b.egresos.map(e => [e.fecha || e.creado, e.categoria, e.descripcion, MEDIOS[e.medio] || e.medio, +e.valor, e.por || '']), ...b.ingresosCaja.map(i => [i.fecha || i.creado, 'INGRESO · ' + i.categoria, i.descripcion, MEDIOS[i.medio] || i.medio, -i.valor, i.por || ''])] },
      { nombre: 'Clientes', columnas: [{ titulo: 'Cliente', ancho: 26 }, { titulo: 'Celular', ancho: 14 }, { titulo: 'Correo', ancho: 28 }, { titulo: 'Pedidos', tipo: 'numero', ancho: 10 }, { titulo: 'Total', tipo: 'pesos', ancho: 14 }], filas: resumenClientes(desde, hasta).map(c => [c.nombre, c.celular, c.correo, c.pedidos, c.total]) },
      { nombre: 'Reservas', columnas: [{ titulo: 'Día', ancho: 12 }, { titulo: 'Hora', ancho: 8 }, { titulo: 'Cliente', ancho: 24 }, { titulo: 'Celular', ancho: 14 }, { titulo: 'Personas', tipo: 'numero', ancho: 10 }, { titulo: 'Ocasión', ancho: 18 }, { titulo: 'Estado', ancho: 14 }, { titulo: 'Descripción', ancho: 36 }],
        filas: N.lista('reservas').filter(r => r.dia >= desde && r.dia <= hasta).map(r => [r.dia, r.hora, r.cliente.nombre, r.cliente.celular, r.personas, (N.obtener('ocasiones', r.ocasion) || { nombre: r.ocasion }).nombre, r.estado, r.descripcion || '']) },
      { nombre: 'Asistencia', columnas: [{ titulo: 'Día', ancho: 12 }, { titulo: 'Hora', tipo: 'fecha', ancho: 17 }, { titulo: 'Persona', ancho: 26 }, { titulo: 'Cargo', ancho: 20 }, { titulo: 'Tipo', ancho: 10 }, { titulo: 'Turno', ancho: 8 }, { titulo: 'Minutos tarde', tipo: 'numero', ancho: 14 }],
        filas: N.lista('asistencia').filter(r => r.dia >= desde && r.dia <= hasta).sort((a, b) => a.at.localeCompare(b.at)).map(r => [r.dia, r.at, r.nombre, r.cargo || '', r.tipo, r.turno || '', r.tarde || 0]) }
    ];
  }
  async function exportar(tipo) {
    const { desde, hasta } = P.rango; const hojas = libro(desde, hasta);
    const nombre = `consolidado-${C.negocio.id}-${desde}-a-${hasta}`;
    const blob = tipo === 'xlsx' ? window.XLSX_MYR.crear(hojas) : new Blob([window.XLSX_MYR.csv(hojas[1])], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${nombre}.${tipo}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    if (hasta === U.hoy() || hasta >= estadoCorte().desde) {
      const b = N.balance(desde, hasta);
      await guardar('exportes', { desde, hasta, tipo, ventas: b.ventas, gastos: b.gastos, neto: b.neto, por: N.sesion().nombre });
      await guardar('ajustes', { ...(N.obtener('ajustes', 'reportes') || {}), id: 'reportes', ultimoCorte: hasta, pospuestoHasta: null });
    }
    U.aviso('Consolidado descargado. El próximo recordatorio llega en ' + C.reportes.cadaDias + ' días.', 4500); pintar();
  }
  function imprimir() {
    const { desde, hasta } = P.rango;
    window.INFORME.abrir({ titulo: `Consolidado · ${C.negocio.nombre}`, subtitulo: `Del ${desde} al ${hasta} · ${C.negocio.municipio || ''} · generado ${new Date().toLocaleString('es-CO')}`, hojas: libro(desde, hasta), archivo: `consolidado-${C.negocio.id}-${desde}-a-${hasta}` });
  }

  // ------------------------------------------------------------ logo: se cuadra con fondo transparente y se generan los íconos
  async function logoCuadrado(f) {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen.')); i.src = URL.createObjectURL(f); });
    const lado = Math.min(1024, Math.max(im.naturalWidth, im.naturalHeight, 512)), cv = document.createElement('canvas'); cv.width = cv.height = lado;
    const k = Math.min(lado / im.naturalWidth, lado / im.naturalHeight) * .94; const ctx = cv.getContext('2d');
    ctx.drawImage(im, (lado - im.naturalWidth * k) / 2, (lado - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
    return await new Promise(r => cv.toBlob(r, 'image/png'));
  }
  async function descargarIconos() {
    const src = N.logoURL(); if (!src) return;
    const im = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer el logo.')); i.src = src; });
    const fondo = '#1E1A17';
    const hacer = async (lado, margen, conFondo) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = lado; const ctx = cv.getContext('2d');
      if (conFondo) { const g = ctx.createRadialGradient(lado / 2, lado * .35, lado * .1, lado / 2, lado / 2, lado * .75); g.addColorStop(0, '#3A2E27'); g.addColorStop(1, fondo); ctx.fillStyle = g; ctx.fillRect(0, 0, lado, lado); }
      const caja = lado * (1 - margen * 2), k = Math.min(caja / im.width, caja / im.height);
      ctx.drawImage(im, (lado - im.width * k) / 2, (lado - im.height * k) / 2, im.width * k, im.height * k);
      return new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/png'))).arrayBuffer());
    };
    try {
      const archivos = {
        'icons/icono-192.png': await hacer(192, .12, true), 'icons/icono-512.png': await hacer(512, .12, true),
        'icons/icono-maskable-512.png': await hacer(512, .22, true), 'icons/apple-touch-icon.png': await hacer(180, .12, true),
        'icons/LEAME.txt': new TextEncoder().encode(`Íconos de ${C.negocio.nombre} generados desde su logo.\nReemplace la carpeta icons de su repositorio en GitHub con esta carpeta.\nAndroid actualiza el ícono de la app instalada solo (puede tardar hasta un día); en iPhone hay que quitar la app de la pantalla de inicio y volver a agregarla.\n`)
      };
      const blob = new Blob([window.fflate.zipSync(archivos, { level: 6 })], { type: 'application/zip' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `iconos-app-${C.negocio.id}.zip`; document.body.append(a); a.click(); a.remove();
      U.aviso('Íconos descargados. Reemplace la carpeta icons en GitHub.', 5000);
    } catch (er) { U.aviso(er.message || 'No se pudieron generar los íconos.'); }
  }

  // ------------------------------------------------------------ revisar que las fotos carguen en este equipo
  async function revisarFotos() {
    const caja = $('#aj-fotos-res'); caja.innerHTML = '<p class="mini">Revisando las fotos…</p>';
    const items = [...N.menu().map(p => ({ n: p.nombre, ref: p.foto, tipo: 'menu', id: p.id })), ...N.ocasiones().map(o => ({ n: 'Ocasión: ' + o.nombre, ref: o.foto })), ...N.lista('publicidad').map(a => ({ n: 'Anuncio: ' + a.titulo, ref: a.foto }))].filter(x => x.ref);
    const prueba = src => new Promise(r => { if (!src) return r(false); const im = new Image(); const t = setTimeout(() => r(false), 12000); im.onload = () => { clearTimeout(t); r(im.naturalWidth > 10); }; im.onerror = () => { clearTimeout(t); r(false); }; im.src = src; });
    const res = await Promise.all(items.map(async x => { const a = U.foto(x.ref, 300), b = U.fotoRespaldo(x.ref, 300); const ok = await prueba(a) || (b ? await prueba(b) : false); return { ...x, ok, local: a.startsWith('img/fotos/') }; }));
    const mal = res.filter(x => !x.ok), locales = res.filter(x => x.local).length;
    caja.innerHTML = `<p><b>${res.length - mal.length} de ${res.length}</b> fotos cargan en este equipo · ${locales} vienen del propio sitio${locales ? '' : ' (aún no se activó la copia de fotos: vea la guía, «Fotos del menú»)'}.</p>`
      + (mal.length ? `<ul class="ajLista">${mal.map(x => `<li>${esc(x.n)}${x.tipo === 'menu' ? ` · <button class="enlace" type="button" data-editar-foto="${x.id}">subir foto propia</button>` : ''}</li>`).join('')}</ul>` : '<p class="mini">Todas las fotos cargan bien.</p>');
    caja.querySelectorAll('[data-editar-foto]').forEach(b => b.onclick = () => { P.sec = 'menu'; pintar(); editarProducto(b.dataset.editarFoto); });
  }

  // ------------------------------------------------------------ 9. QR DE MESAS Y AJUSTES
  function ajustes(m) {
    const base = location.href.replace(/[?#].*$/, '').replace(/index\.html$/, '');
    const tr = C.pagos.transferencia;
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Ajustes</p><h1>QR de mesas y configuración</h1></div><button class="btn verde" type="button" id="aj-imprimir">Imprimir QR</button></header>
      <section class="ngCard ancho ayudaVid"><h2>${svg('play')} Videos de ayuda (con voz)</h2><p class="mini">Paso a paso, para verlos cuando quiera.</p>
        <div class="ayudaLista"><button type="button" data-video="configuracion"><b>Configurar toda la plataforma</b><small>GitHub, Supabase, Google, asistente, pagos, logo, carnés · 9 min aprox.</small></button>
        <button type="button" data-video="importar"><b>Importar y actualizar la base</b><small>Excel o CSV: plantilla, llenar, subir y actualizar</small></button>
        <button type="button" data-tutorial="negocio"><b>Tutorial del panel</b><small>Cómo se atienden pedidos, caja y asistencia</small></button>
        <button type="button" data-tutorial="cliente"><b>Tutorial del cliente</b><small>Cómo pide un cliente, de principio a fin</small></button></div>
        ${N.puede('menu.editar') ? `<div class="mnBotones"><button class="btn claro" type="button" data-importar>${svg('compartir')} Importar base (Excel o CSV)</button><button class="btn claro" type="button" id="aj-exportar-base">${svg('descargar')} Exportar base</button></div>` : ''}</section>
      ${N.puede('ajustes.editar') ? `<section class="ngCard ancho logoEd"><div class="logoPrev ${C.negocio.logo ? 'con' : ''}" id="aj-logo-prev">${C.negocio.logo ? `<img src="${esc(N.logoURL())}" alt="Logo">` : svg('llama')}</div>
        <div><h2>Logo del negocio</h2><p class="mini">Sale en toda la app: apertura, encabezados, chat, ticket, carné e instalación. Mejor cuadrado, PNG con fondo transparente, mínimo 512 × 512.</p>
          <div class="logoBtns"><label class="btn verde">${svg('compartir')} Subir logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" id="aj-logo" hidden></label>
          ${C.negocio.logo ? `<button class="btn claro" type="button" id="aj-iconos">${svg('descargar')} Íconos para el botón de la app (.zip)</button><button class="enlace" type="button" id="aj-logo-quitar">Quitar logo</button>` : ''}</div>
          ${C.negocio.logo ? '<p class="mini">Para que el <b>ícono de la app instalada</b> también tenga su logo: descargue el .zip y reemplace la carpeta <code>icons</code> de su repositorio en GitHub (vea la guía, «Logo»).</p>' : ''}</div></section>` : ''}
      ${N.puede('ajustes.editar') ? (() => { const x = N.obtener('negocio', 'datos') || {}; const v = k => esc(x[k] !== undefined ? x[k] : (k in C.negocio ? C.negocio[k] : C.pagos.transferencia[k]) || ''); return `<section class="ngCard ancho"><h2>Datos de contacto y de pago</h2><p class="mini">Los ven sus clientes en la app (WhatsApp del pedido, llaves para transferir). Se guardan aquí, sin tocar código.</p>
        <form id="aj-form" class="formulario sinPad ajForm">
          <label>WhatsApp del negocio (10 dígitos)<input id="aj-whatsapp" inputmode="numeric" maxlength="10" pattern="3[0-9]{9}" value="${v('whatsapp')}" placeholder="3001234567"></label>
          <label>Teléfono<input id="aj-telefono" inputmode="tel" maxlength="20" value="${v('telefono')}"></label>
          <label class="ancho2">Dirección del local<input id="aj-direccion" maxlength="90" value="${v('direccion')}"></label>
          <label class="ancho2">Horario<input id="aj-horario" maxlength="90" value="${v('horario')}"></label>
          <label>Llave Bre-B<input id="aj-llaveBreB" maxlength="40" value="${v('llaveBreB')}" placeholder="@negocio o celular"></label>
          <label>Nequi<input id="aj-nequi" inputmode="numeric" maxlength="10" value="${v('nequi')}"></label>
          <label>Daviplata<input id="aj-daviplata" inputmode="numeric" maxlength="10" value="${v('daviplata')}"></label>
          <label>Titular de las cuentas<input id="aj-titular" maxlength="60" value="${v('titular')}"></label>
          <label class="ancho2">Enlace de pago en línea (Wompi, Bold, Mercado Pago, ePayco…)<input id="aj-enlacePago" type="url" maxlength="300" value="${esc(x.enlacePago !== undefined ? x.enlacePago : C.pagos.enlacePago || '')}" placeholder="https://checkout.wompi.co/l/…"></label>
          <label class="ancho2">Función de pagos en línea con Wompi (opcional: Nequi recibe la notificación con el valor, Daviplata, PSE, tarjeta)<input id="aj-pagosUrl" type="url" maxlength="300" value="${esc(x.pagosUrl || '')}" placeholder="https://SU-PROYECTO.functions.supabase.co/pagos"></label>
          <div class="ancho2 qrEd"><div class="qrPrev" id="aj-qr-prev">${(x.qrBreB || C.pagos.transferencia.qrBreB) ? `<img src="${esc(U.foto(x.qrBreB || C.pagos.transferencia.qrBreB, 400))}" alt="QR Bre-B">` : '<small class="mini">Sin QR</small>'}</div><div><b>QR Bre-B del negocio</b><small class="mini">Descárguelo de la app de su banco (Bre-B → mis llaves → QR) y súbalo aquí. Los clientes lo ven al pagar por transferencia.</small><label class="btn claro">${svg('compartir')} Subir QR<input type="file" accept="image/*" id="aj-qr" hidden></label>${(x.qrBreB) ? '<button class="enlace" type="button" id="aj-qr-quitar">Quitar QR</button>' : ''}</div></div>
          <button class="btn verde ancho2" type="submit">Guardar datos</button></form></section>`; })() : ''}
      <section class="ngCard ancho"><div class="ajFila"><span class="ceIco">${svg('llama')}</span><div><h2>Fotos del menú</h2><p class="mini">Revisa si cada foto carga en este equipo y le dice cuáles cambiar.</p></div><button class="btn claro" type="button" id="aj-revisar">Revisar fotos</button></div><div id="aj-fotos-res"></div></section>
      ${['admin', 'superadmin'].includes(N.sesion().rol) ? `<section class="ngCard ancho ajFila"><span class="ceIco">${svg('candado')}</span><div><h2>Clave de caja</h2><p class="mini">Se pide para abrir y cerrar la caja. Solo el administrador debe saberla.${(N.obtener('ajustes', 'caja') || {}).ejemplo ? ' <b>Ahora es la clave de ejemplo 1234: cámbiela.</b>' : N.tienePin() ? '' : ' <b>Aún no está creada.</b>'}</p></div><button class="btn oscuro" type="button" id="aj-pin">${N.tienePin() ? 'Cambiar la clave' : 'Crear la clave'}</button></section>` : ''}
      ${D.modo === 'demo' && N.hayEjemplo() && N.puede('ajustes.editar') ? `<section class="ngCard ancho ajFila"><span class="ceIco">${svg('basura')}</span><div><h2>Datos de ejemplo</h2><p class="mini">La app trae pedidos, gastos, una clienta y reservas de ejemplo para explorarla. Bórrelos antes de empezar a vender.</p></div><button class="btn peligro" type="button" id="aj-ejemplo">Borrar datos de ejemplo</button></section>` : ''}
      <section class="ngCard ancho"><h2>Así está configurado</h2><ul class="ajLista">
        <li>Datos: <b>${D.modo === 'demo' ? 'modo demostración (este navegador)' : 'Supabase (nube) con copia sin señal'}</b></li>
        <li>Negocio: ${esc(C.negocio.nombre)} · ${esc(C.negocio.direccion)} · ${esc(C.negocio.municipio)}</li>
        <li>WhatsApp: <b>${C.negocio.whatsapp ? esc(C.negocio.whatsapp) + ' (los clientes le escriben con un toque)' : 'sin configurar'}</b> · Google: <b>${C.google.clientId ? 'activo' : 'sin configurar'}</b> · Asistente IA en servidor: <b>${C.asistente.url ? 'activo' : 'local'}</b></li>
        <li>Domicilio: ${pesos(C.domicilio.base)} + ${pesos(C.domicilio.porKm)}/km, mínimo ${pesos(C.domicilio.minimo)}, hasta ${C.domicilio.maxKm} km${C.domicilio.gratisDesde ? ', gratis desde ' + pesos(C.domicilio.gratisDesde) : ''}</li>
        <li>Pagos: efectivo ${C.pagos.efectivo ? 'sí' : 'no'} · transferencia ${tr.activa ? (tr.llaveBreB || tr.nequi || tr.daviplata ? 'sí' : 'sí, falta la llave Bre-B') : 'no'} · datáfono ${C.pagos.datafonoEnLocal ? 'sí' : 'no'} · pago en línea ${C.pagos.pasarelaEnLinea ? 'sí' : 'por activar'}</li>
        <li>Reservas: ${C.reservas.apertura} a ${C.reservas.cierre}, turnos de ${C.reservas.intervaloMin} min, ${C.reservas.capacidadPorTurno} cupos</li>
        <li>Consolidado: cada ${C.reportes.cadaDias} días</li></ul>
        <p class="mini">WhatsApp, dirección, horario y llaves de pago se cambian arriba. Lo demás (tarifas de domicilio, horario de reservas) en <b>js/config.js</b> (ver docs/GUIA_DESPLIEGUE.md). El menú, la publicidad y el equipo, aquí mismo.</p></section>
      <section class="ngCard ancho"><p class="mini">Pegue un código en cada mesa. Al escanearlo, la app sabe que la persona está en el local y en qué mesa: no cobra domicilio ni empaque.</p><div class="qrGrid" id="qr-grid">${Array.from({ length: C.local.mesas }, (_, k) => { const q = window.qrcode(0, 'M'); q.addData(`${base}?mesa=${k + 1}`); q.make(); return `<div class="qrMesa"><img alt="Código QR de la mesa ${k + 1}" src="${q.createDataURL(6, 2)}"><b>Mesa ${k + 1}</b><small>Escanee para pedir · ${esc(C.negocio.nombre)}</small></div>`; }).join('')}</div></section>`;
    if ($('#aj-form')) $('#aj-form').onsubmit = async e => {
      e.preventDefault();
      const d = { id: 'datos', qrBreB: P.qrNuevo !== undefined ? P.qrNuevo : ((N.obtener('negocio', 'datos') || {}).qrBreB || '') }; ['whatsapp', 'telefono', 'direccion', 'horario', 'llaveBreB', 'nequi', 'daviplata', 'titular', 'enlacePago', 'pagosUrl'].forEach(k => { d[k] = $('#aj-' + k).value.trim(); });
      if (d.enlacePago && !/^https:\/\//.test(d.enlacePago)) { U.aviso('El enlace de pago debe empezar por https://'); return; }
      if (d.pagosUrl && !/^https:\/\/.+\/pagos\/?$/.test(d.pagosUrl)) { U.aviso('La función de pagos debe ser https://…/pagos'); return; }
      P.qrNuevo = undefined;
      d.whatsapp = d.whatsapp.replace(/\D/g, '');
      if (d.whatsapp && !/^3\d{9}$/.test(d.whatsapp)) { U.aviso('El WhatsApp debe tener 10 dígitos y empezar por 3.'); return; }
      await guardar('negocio', { ...(N.obtener('negocio', 'datos') || {}), ...d }); U.aviso('Datos guardados. Los clientes ya los ven.'); pintar();
    };
    if ($('#aj-logo')) $('#aj-logo').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; U.aviso('Subiendo el logo…');
      try { const ref = await D.subirFoto(await logoCuadrado(f), 1024); await guardar('negocio', { ...(N.obtener('negocio', 'datos') || {}), id: 'datos', logo: ref }); U.aviso('Logo listo: ya se ve en toda la app.'); pintar(); }
      catch (er) { U.aviso(er.message || 'No se pudo subir el logo.'); }
    };
    if ($('#aj-logo-quitar')) $('#aj-logo-quitar').onclick = async () => { await guardar('negocio', { ...(N.obtener('negocio', 'datos') || {}), id: 'datos', logo: '' }); pintar(); };
    if ($('#aj-iconos')) $('#aj-iconos').onclick = descargarIconos;
    if ($('#aj-qr')) $('#aj-qr').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { P.qrNuevo = await D.subirFoto(f); $('#aj-qr-prev').innerHTML = `<img src="${esc(U.foto(P.qrNuevo, 400))}" alt="QR Bre-B">`; U.aviso('QR listo. Toque «Guardar datos».'); } catch (er) { U.aviso(er.message); } };
    if ($('#aj-qr-quitar')) $('#aj-qr-quitar').onclick = () => { P.qrNuevo = ''; $('#aj-qr-prev').innerHTML = '<small class="mini">Sin QR</small>'; U.aviso('Toque «Guardar datos» para quitarlo.'); };
    if ($('#aj-revisar')) $('#aj-revisar').onclick = revisarFotos;
    if ($('#aj-pin')) $('#aj-pin').onclick = async () => {
      const s = N.sesion();
      if (N.tienePin() && s.rol !== 'superadmin') { const p = await teclado('Clave actual', 'Escriba la clave de caja actual.'); if (p === null) return; if (!await N.verificarPin(p)) { U.aviso('La clave actual no coincide.'); return; } }
      if (await crearClave()) pintar();
    };
    if ($('#aj-ejemplo')) $('#aj-ejemplo').onclick = async () => { if (!confirm('¿Borrar todos los datos de ejemplo (pedidos, gastos, reservas y la clienta de ejemplo)? Sus propios datos no se tocan.')) return; await N.borrarEjemplo(); U.aviso('Datos de ejemplo borrados.'); pintar(); };
    m.querySelectorAll('[data-video]').forEach(b => b.onclick = () => abrirVideoAyuda(b.dataset.video));
    m.querySelectorAll('[data-tutorial]').forEach(b => b.onclick = () => window.MYR_VIDEO && window.MYR_VIDEO(b.dataset.tutorial));
    m.querySelectorAll('[data-importar]').forEach(b => b.onclick = () => window.DATOS.abrirImportar(() => pintar()));
    if ($('#aj-exportar-base')) $('#aj-exportar-base').onclick = () => window.DATOS.exportar('xlsx');
    $('#aj-imprimir').onclick = () => { document.body.classList.add('imprimiendoQR'); window.print(); setTimeout(() => document.body.classList.remove('imprimiendoQR'), 500); };
  }

  // ------------------------------------------------------------ eventos globales del panel
  document.addEventListener('click', e => {
    if (document.body.dataset.vista !== 'negocio') return;
    const ab = e.target.closest('[data-abrir-pedido]'); if (ab) { abrirPedido(ab.dataset.abrirPedido); return; }
    if (e.target.closest('#bn-generar')) { generarCorte(); return; }
    if (e.target.closest('#bn-luego')) { posponerCorte(1).then(pintar); return; }
    const s = e.target.closest('[data-ir-sec]'); if (s) { P.sec = s.dataset.irSec; $$('[data-sec]').forEach(x => x.setAttribute('aria-selected', x.dataset.sec === P.sec)); pintar(); }
  });
  N.escuchar(ev => {
    if (document.body.dataset.vista !== 'negocio' || !N.esPersonal()) return;
    if (ev.col === 'pedidos' && P.conocidos) {
      const nuevos = N.lista('pedidos').filter(p => !P.conocidos.has(p.id));
      if (nuevos.length) { nuevos.forEach(p => P.conocidos.add(p.id)); sonar(); U.aviso(`Nuevo pedido ${nuevos[0].codigo} · ${pesos(nuevos[0].totales.total)}`, 5000); U.vibrar([100, 50, 100]); }
    }
    if (['pedidos', 'mensajes', 'reservas', 'egresos', 'ingresos', 'menu', 'salsas', 'ingredientes', 'publicidad', 'cierres', 'aperturas', 'exportes', 'negocio', 'asistencia'].includes(ev.col)) {
      insignias();
      if (!$('#ng-cajon') || $('#ng-cajon').hidden || P.sec === 'pedidos') { if (!document.activeElement || !document.activeElement.closest('.ngMain form')) pintar(); }
      if (P.pedido && ev.col === 'mensajes') pintarHilo(P.pedido);
    }
  });
  setInterval(async () => {   // en la nube: revisa pedidos, chat y reservas cada 5 s
    if (D.modo !== 'supabase' || document.body.dataset.vista !== 'negocio' || !N.esPersonal() || !navigator.onLine) return;
    try { for (const c of ['pedidos', 'mensajes', 'reservas']) await N.refrescar(c); if (++P.vueltas % 6 === 0) for (const c of ['menu', 'salsas']) await N.refrescar(c); } catch (e) { /* sin señal */ }
  }, 5000);

  window.NEGOCIO = { abrir, libro, estadoCorte, registrarAsistencia, simularEscaneo, verCarnet };
})();
