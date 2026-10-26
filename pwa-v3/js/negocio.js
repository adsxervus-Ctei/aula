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
  const P = { sec: null, pedido: null, filtro: 'activos', dia: U.hoy(), vistos: new Set(U.ls.get('myr2_vistos', [])), conocidos: null, editando: null };
  const SECCIONES = [
    ['resumen', 'Resumen', 'casa', null],
    ['pedidos', 'Pedidos', 'ticket', 'pedidos.ver'],
    ['caja', 'Caja y balance', 'efectivo', 'finanzas.ver'],
    ['menu', 'Menú y fotos', 'llama', 'menu.editar'],
    ['publicidad', 'Publicidad', 'chispa', 'publicidad.editar'],
    ['reservas', 'Reservas', 'calendario', 'reservas.gestionar'],
    ['equipo', 'Equipo y roles', 'personas', 'equipo.gestionar'],
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
    raiz.innerHTML = `<div class="ngApp">
      <aside class="ngLado">
        <div class="ngMarca"><span class="logoMini"><svg><use href="#i-llama"/></svg></span><div><b>${esc(C.negocio.nombre)}</b><small>Panel del negocio</small></div></div>
        <nav class="ngNav" role="tablist">${visibles.map(([id, n, ic]) => `<button role="tab" type="button" data-sec="${id}" aria-selected="${id === P.sec}">${svg(ic)}<span>${n}</span>${id === 'pedidos' ? '<b class="insignia" id="ng-nuevos" hidden>0</b>' : ''}${id === 'reservas' ? '<b class="insignia" id="ng-res-nuevas" hidden>0</b>' : ''}</button>`).join('')}</nav>
        <div class="ngUsuario"><span class="avatarGrande chico">${esc(s.nombre[0])}</span><div><b>${esc(s.nombre)}</b><small>${esc(N.ROLES[s.rol] ? N.ROLES[s.rol].nombre : s.rol)}</small></div>
          <button class="redondo chico" type="button" id="ng-video" aria-label="Ver el video del panel">${svg('play')}</button>
          <button class="redondo chico" type="button" id="ng-salir" aria-label="Cerrar sesión">${svg('cerrar')}</button></div>
      </aside>
      <div class="ngMain" id="ng-main"></div>
      <div class="ngCajon" id="ng-cajon" hidden></div>
    </div>`;
    $('#ng-salir').onclick = () => { D.salir(); location.reload(); };
    $('#ng-video').onclick = () => window.MYR_VIDEO('negocio');
    raiz.querySelector('.ngNav').onclick = e => { const b = e.target.closest('[data-sec]'); if (b) { P.sec = b.dataset.sec; $$('.ngNav button').forEach(x => x.setAttribute('aria-selected', x === b)); pintar(); } };
    P.conocidos = new Set(N.lista('pedidos').map(p => p.id));
    pintar(); insignias();
    if (D.modo === 'supabase' && navigator.onLine) (async () => { try { for (const c of ['pedidos', 'mensajes', 'reservas', 'egresos', 'ingresos', 'cierres', 'aperturas', 'exportes', 'ajustes', 'negocio']) await N.refrescar(c); if (N.puede('equipo.gestionar')) await D.refrescarPersonal(); P.conocidos = new Set(N.lista('pedidos').map(p => p.id)); pintar(); insignias(); } catch (e) { /* sin señal */ } })();
    if (['admin', 'superadmin'].includes(s.rol) && !U.ls.get('myr2_video_negocio', false)) setTimeout(() => window.MYR_VIDEO('negocio'), U.animar ? 600 : 0);
    recordatorio(true);
  }
  function pintar() {
    const m = $('#ng-main'); if (!m) return;
    const f = { resumen, pedidos, caja, menu, publicidad, reservas, equipo, reportes, ajustes }[P.sec];
    m.innerHTML = ''; f(m);
    if (U.animar) m.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,.8,.25,1)' });
  }
  function insignias() {
    const nuevos = N.lista('pedidos').filter(p => p.estado === 'recibido' && !P.vistos.has(p.id)).length;
    const b = $('#ng-nuevos'); if (b) { b.hidden = !nuevos; b.textContent = nuevos; }
    const rv = N.lista('reservas').filter(r => r.estado === 'solicitada').length;
    const c = $('#ng-res-nuevas'); if (c) { c.hidden = !rv; c.textContent = rv; }
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
    return { desde, dias, vence: dias >= C.reportes.cadaDias, ultimo: aj.ultimoCorte || null };
  }
  async function recordatorio(alAbrir) {
    if (!N.puede('reportes.exportar')) return;
    const e = estadoCorte(); if (!e.vence) return;
    if (alAbrir && 'Notification' in window) {
      try { if (Notification.permission === 'default') await Notification.requestPermission(); if (Notification.permission === 'granted') { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); const t = 'Es hora del consolidado'; const b = `Han pasado ${e.dias} días: genere el archivo de ventas, ingresos y egresos.`; reg ? reg.showNotification(t, { body: b, icon: 'icons/icono-192.png', tag: 'consolidado' }) : new Notification(t, { body: b }); } } catch (er) { /* sin notificación */ }
    }
  }
  function bannerCorte() {
    if (!N.puede('reportes.exportar')) return '';
    const e = estadoCorte();
    if (!e.vence) return `<div class="ngBanner suave">${svg('reloj')}<span>Próximo consolidado en <b>${C.reportes.cadaDias - e.dias} días</b>${e.ultimo ? ` · último corte: ${esc(U.fechaLarga(e.ultimo + 'T12:00'))}` : ''}.</span></div>`;
    return `<div class="ngBanner alerta">${svg('campana')}<span>Han pasado <b>${e.dias} días</b> desde el último corte. Genere el consolidado de ventas, ingresos y egresos.</span><button class="btn verde" type="button" data-ir-sec="reportes">Generar ahora</button></div>`;
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
    const lista = P.filtro === 'hoy' ? todos.filter(p => U.diaDe(p.creado) === U.hoy()) : P.filtro === 'activos' ? todos.filter(p => !['entregado', 'cancelado'].includes(p.estado) || U.diaDe(p.entregado || p.creado) === U.hoy()) : todos;
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Pedidos</p><h1>${lista.filter(p => !['entregado', 'cancelado'].includes(p.estado)).length} en curso</h1></div>
      <div class="segmento">${[['activos', 'En curso'], ['hoy', 'Hoy'], ['todos', 'Todos']].map(([k, n]) => `<button type="button" data-filtro="${k}" aria-pressed="${k === P.filtro}">${n}</button>`).join('')}</div></header>
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
      <span class="kPie"><b>${pesos(p.totales.total)}</b><span class="etiqueta ${p.pago.estado === 'pagado' ? 'verde' : ''}">${MEDIOS[p.pago.tipo]}${p.pago.estado === 'pagado' ? ' · pagado' : ''}</span>${persona ? `<span class="etiqueta roja">${svg('chat')} responder</span>` : ''}</span></button>`;
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
    const cv = await window.TICKET.dibujar(p); const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = 'Ticket ' + p.codigo;
    const t = $('#caj-ticket'); if (t && P.pedido === p.id) { t.innerHTML = ''; t.append(img); }
  }
  function pintarHilo(id) {
    const h = $('#caj-hilo'); if (!h) return;
    const ms = N.mensajesDe(id);
    h.innerHTML = ms.map(m => `<li class="${m.de === 'cliente' ? 'cliente' : m.de}${m.paraPersona ? ' paraPersona' : ''}">${m.de === 'asistente' ? `<span class="quien">${svg('chispa')} Asistente</span>` : m.de === 'negocio' ? `<span class="quien">${esc(m.firma || 'Negocio')}</span>` : ''}${esc(m.texto)}<small>${U.hora(m.creado)}${m.paraPersona ? ' · necesita una persona' : ''}</small></li>`).join('');
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
    const p = N.obtener('pedidos', id); if (!p) return;
    if (estado === 'cancelado' && !confirm('¿Cancelar el pedido ' + p.codigo + '?')) return;
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
    const cats = window.CATALOGO.CATEGORIAS;
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Menú</p><h1>Platos, fotos y ofertas</h1></div><button class="btn verde" type="button" id="mn-nuevo">${svg('mas')} Nuevo producto</button></header>
      ${cats.map(c => { const ps = N.menu().filter(p => p.cat === c.id); return `<section class="ngCard ancho"><h2>${esc(c.nombre)} <small class="mini">${ps.length} productos</small></h2>
        <div class="prodGrid">${ps.map(p => `<article class="prodTarj ${p.disponible === false ? 'agotado' : ''}">${U.imgPlato(p, 300, 'foto')}
          <div class="prodInfo"><b>${esc(p.nombre)}</b><span>${p.oferta && p.oferta.precio ? `<s>${pesos(p.precio)}</s> ${pesos(p.oferta.precio)}` : pesos(p.precio)}</span>
          <div class="prodTags">${p.especialidad ? '<span class="tag oro">Especialidad</span>' : ''}${p.oferta ? `<span class="tag brasa">${esc(p.oferta.etiqueta || 'Oferta')}</span>` : ''}${p.disponible === false ? '<span class="tag">Agotado</span>' : ''}</div></div>
          <div class="prodAcc"><label class="interruptor" title="Disponible"><input type="checkbox" data-disp="${p.id}" ${p.disponible !== false ? 'checked' : ''}><i></i></label><button class="btn claro" type="button" data-editar="${p.id}">Editar</button></div></article>`).join('')}</div></section>`; }).join('')}
      <section class="ngCard ancho"><h2>Salsas del recipiente</h2><div class="salsasEd">${N.salsas().map(s => `<div class="salsaFila"><span class="ico">${window.ARTE.recipiente(s.color, s.brillo)}</span><input value="${esc(s.nombre)}" data-salsa-nombre="${s.id}" aria-label="Nombre de la salsa"><input value="${s.precio || ''}" placeholder="Sin costo" inputmode="numeric" data-salsa-precio="${s.id}" aria-label="Precio de la salsa"><label class="interruptor"><input type="checkbox" data-salsa-disp="${s.id}" ${s.disponible !== false ? 'checked' : ''}><i></i></label></div>`).join('')}</div>
        <button class="btn claro" type="button" id="sl-guardar">Guardar salsas</button></section>`;
    $('#mn-nuevo').onclick = () => editarProducto(null);
    m.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => editarProducto(b.dataset.editar));
    m.querySelectorAll('[data-disp]').forEach(i => i.onchange = async () => { const p = N.obtener('menu', i.dataset.disp); await guardar('menu', { ...p, disponible: i.checked }); U.aviso(i.checked ? `${p.nombre}: disponible` : `${p.nombre}: agotado (no se muestra a los clientes)`); pintar(); });
    $('#sl-guardar').onclick = async () => { for (const s of N.salsas()) await guardar('salsas', { ...s, nombre: $(`[data-salsa-nombre="${s.id}"]`).value.trim() || s.nombre, precio: Number($(`[data-salsa-precio="${s.id}"]`).value.replace(/\D/g, '')) || 0, disponible: $(`[data-salsa-disp="${s.id}"]`).checked }); U.aviso('Salsas guardadas.'); };
  }
  function editarProducto(id) {
    const p = id ? { ...N.obtener('menu', id) } : { id: null, cat: 'fogon', nombre: '', precio: 0, porcion: '', descripcion: '', foto: '', arte: 'acompanante', ingredientes: [], disponible: true, especialidad: false, ocasiones: [], oferta: null };
    const caj = $('#ng-cajon'); caj.hidden = false;
    let foto = p.foto;
    const ingrTexto = (p.ingredientes || []).map(k => (window.CATALOGO.INGR[k] || [k])[0]).join(', ');
    caj.innerHTML = `<div class="cajCab"><div><p class="paso">${id ? 'Editar producto' : 'Nuevo producto'}</p><h2>${esc(p.nombre || 'Sin nombre')}</h2></div><button class="redondo" type="button" id="caj-cerrar" aria-label="Cerrar">${svg('cerrar')}</button></div>
      <form class="cajCuerpo formulario sinPad" id="pr-form">
        <div class="fotoEd"><div class="fotoPrev" id="pr-prev">${U.imgPlato(p, 500)}</div>
          <div class="fotoBtns"><label class="btn verde">${svg('compartir')} Subir foto de su preparación<input type="file" accept="image/*" capture="environment" id="pr-archivo" hidden></label><small class="mini">Se reduce sola a 1000 px en WebP. Mejor cuadrada y con buena luz.</small>${foto ? '<button class="enlace" type="button" id="pr-quitar">Quitar foto</button>' : ''}</div></div>
        <label>Nombre<input id="pr-nombre" required value="${esc(p.nombre)}"></label>
        <div class="dos"><label>Categoría<select id="pr-cat">${window.CATALOGO.CATEGORIAS.map(c => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label><label>Precio<input id="pr-precio" inputmode="numeric" required value="${p.precio ? p.precio.toLocaleString('es-CO') : ''}"></label></div>
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
        <td>${u.correo !== s.correo && (u.rol !== 'superadmin' || s.rol === 'superadmin') ? `<button class="btn claro" type="button" data-eq="${esc(u.id)}">Editar</button>` : '<span class="mini">Usted</span>'}</td></tr>`).join('')}</tbody></table></section>
      <section class="ngCard ancho"><h2>Roles disponibles</h2><div class="rolesGrid">${Object.entries(N.ROLES).filter(([k]) => k !== 'cliente').map(([k, r]) => `<div><b>${esc(r.nombre)}</b><small>${r.permisos.length === Object.keys(N.PERMISOS).length ? 'Todos los permisos' : r.permisos.map(p => N.PERMISOS[p]).join(' · ')}</small></div>`).join('')}</div></section>`;
    $('#eq-nuevo').onclick = () => editarPersona(null);
    m.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => editarPersona(b.dataset.eq));
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
        <label>Rol<select id="eq-rol">${roles.map(([k, r]) => `<option value="${k}" ${k === u.rol ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select></label>
        <fieldset class="caja2 permCaja"><legend>Qué puede hacer</legend><p class="mini sinMargen" id="eq-perm-ayuda">${['admin', 'superadmin'].includes(u.rol) ? 'Este rol puede hacer todo.' : 'Active o apague cada permiso.'}</p><div class="permGrid">${Object.entries(N.PERMISOS).map(([k, n]) => `<label class="permFila"><span>${esc(n)}</span><span class="interruptor"><input type="checkbox" value="${k}" ${(['admin', 'superadmin'].includes(u.rol) || (u.permisos || []).includes(k)) ? 'checked' : ''} ${['admin', 'superadmin'].includes(u.rol) ? 'disabled' : ''}><i></i></span></label>`).join('')}</div></fieldset>
        ${D.modo === 'demo' ? `<label>${id ? 'Nueva clave (vacío = no cambia)' : 'Clave temporal (mínimo 6)'}<input id="eq-clave" type="text" ${id ? '' : 'required minlength="6"'} autocomplete="new-password"></label>` : '<p class="mini">La persona crea su clave desde «Crear cuenta» con este mismo correo; luego entra por «Soy del negocio».</p>'}
        ${id ? `<label class="check"><input type="checkbox" id="eq-inactivo" ${u.inactivo ? 'checked' : ''}> <span>Desactivar acceso</span></label>` : ''}
        <button class="btn verde grande" type="submit">Guardar</button></form>`;
    $('#caj-cerrar').onclick = () => { caj.hidden = true; };
    $('#eq-rol').onchange = e => { const r = e.target.value, ps = N.ROLES[r].permisos, todo = ['admin', 'superadmin'].includes(r); caj.querySelectorAll('.permGrid input').forEach(i => { i.checked = ps.includes(i.value); i.disabled = todo; }); $('#eq-perm-ayuda').textContent = todo ? 'Este rol puede hacer todo.' : 'Active o apague cada permiso.'; };
    $('#eq-form').onsubmit = async e => {
      e.preventDefault();
      const rol = $('#eq-rol').value, permisos = ['admin', 'superadmin'].includes(rol) ? N.ROLES[rol].permisos : [...caj.querySelectorAll('.permGrid input:checked')].map(i => i.value);
      try {
        if (id) await D.actualizarEmpleado(id, { nombre: $('#eq-nombre').value.trim(), celular: $('#eq-cel').value.trim(), rol, permisos, inactivo: $('#eq-inactivo').checked, ...($('#eq-clave') && $('#eq-clave').value ? { clave: $('#eq-clave').value } : {}) });
        else await D.crearEmpleado({ nombre: $('#eq-nombre').value, correo: $('#eq-correo').value, celular: $('#eq-cel').value.trim(), rol, permisos, clave: $('#eq-clave') ? $('#eq-clave').value : '' });
        caj.hidden = true; U.aviso('Equipo actualizado.'); pintar();
      } catch (er) { U.aviso(er.message); }
    };
  }

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
        <div class="rpBotones"><button class="btn verde grande" type="button" id="rp-xlsx">${svg('descargar')} Descargar consolidado en Excel</button><button class="btn claro" type="button" id="rp-csv">CSV de ventas</button><button class="btn claro" type="button" id="rp-imprimir">Imprimir o guardar PDF</button><button class="btn claro" type="button" id="rp-tickets">Tickets del periodo (PNG)</button></div>
        <p class="mini">El Excel trae siete hojas: resumen, ventas pedido por pedido, productos, balance diario, egresos, clientes y reservas.</p></section>
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
        filas: N.lista('reservas').filter(r => r.dia >= desde && r.dia <= hasta).map(r => [r.dia, r.hora, r.cliente.nombre, r.cliente.celular, r.personas, (N.obtener('ocasiones', r.ocasion) || { nombre: r.ocasion }).nombre, r.estado, r.descripcion || '']) }
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
      await guardar('ajustes', { ...(N.obtener('ajustes', 'reportes') || {}), id: 'reportes', ultimoCorte: hasta });
    }
    U.aviso('Consolidado descargado. El próximo recordatorio llega en ' + C.reportes.cadaDias + ' días.', 4500); pintar();
  }
  function imprimir() {
    const { desde, hasta } = P.rango, hojas = libro(desde, hasta);
    const w = window.open('', '_blank'); if (!w) { U.aviso('Permita las ventanas emergentes para imprimir.'); return; }
    const tabla = h => `<h2>${esc(h.nombre)}</h2><table><thead><tr>${h.columnas.map(c => `<th>${esc(c.titulo)}</th>`).join('')}</tr></thead><tbody>${h.filas.map(f => `<tr>${f.map((v, k) => `<td class="${(h.columnas[k] || {}).tipo === 'pesos' ? 'n' : ''}">${(h.columnas[k] || {}).tipo === 'pesos' && v !== '' ? pesos(v) : (h.columnas[k] || {}).tipo === 'fecha' ? new Date(v).toLocaleString('es-CO') : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Consolidado ${desde} a ${hasta}</title><style>body{font:12px system-ui,sans-serif;margin:24px;color:#1E1A17}h1{font-size:20px}h2{font-size:15px;margin-top:22px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}th{background:#1E1A17;color:#fff}.n{text-align:right;white-space:nowrap}@media print{h2{break-before:auto}}</style></head><body><h1>Consolidado · ${esc(C.negocio.nombre)}</h1><p>Del ${desde} al ${hasta} · ${esc(C.negocio.municipio)}</p>${hojas.map(tabla).join('')}<script>print()<\/script></body></html>`);
    w.document.close();
  }

  // ------------------------------------------------------------ 9. QR DE MESAS Y AJUSTES
  function ajustes(m) {
    const base = location.href.replace(/[?#].*$/, '').replace(/index\.html$/, '');
    const tr = C.pagos.transferencia;
    m.innerHTML = `<header class="ngCab"><div><p class="paso">Ajustes</p><h1>QR de mesas y configuración</h1></div><button class="btn verde" type="button" id="aj-imprimir">Imprimir QR</button></header>
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
          <button class="btn verde ancho2" type="submit">Guardar datos</button></form></section>`; })() : ''}
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
      const d = { id: 'datos' }; ['whatsapp', 'telefono', 'direccion', 'horario', 'llaveBreB', 'nequi', 'daviplata', 'titular'].forEach(k => { d[k] = $('#aj-' + k).value.trim(); });
      d.whatsapp = d.whatsapp.replace(/\D/g, '');
      if (d.whatsapp && !/^3\d{9}$/.test(d.whatsapp)) { U.aviso('El WhatsApp debe tener 10 dígitos y empezar por 3.'); return; }
      await guardar('negocio', { ...(N.obtener('negocio', 'datos') || {}), ...d }); U.aviso('Datos guardados. Los clientes ya los ven.'); pintar();
    };
    if ($('#aj-pin')) $('#aj-pin').onclick = async () => {
      const s = N.sesion();
      if (N.tienePin() && s.rol !== 'superadmin') { const p = await teclado('Clave actual', 'Escriba la clave de caja actual.'); if (p === null) return; if (!await N.verificarPin(p)) { U.aviso('La clave actual no coincide.'); return; } }
      if (await crearClave()) pintar();
    };
    if ($('#aj-ejemplo')) $('#aj-ejemplo').onclick = async () => { if (!confirm('¿Borrar todos los datos de ejemplo (pedidos, gastos, reservas y la clienta de ejemplo)? Sus propios datos no se tocan.')) return; await N.borrarEjemplo(); U.aviso('Datos de ejemplo borrados.'); pintar(); };
    $('#aj-imprimir').onclick = () => { document.body.classList.add('imprimiendoQR'); window.print(); setTimeout(() => document.body.classList.remove('imprimiendoQR'), 500); };
  }

  // ------------------------------------------------------------ eventos globales del panel
  document.addEventListener('click', e => {
    if (document.body.dataset.vista !== 'negocio') return;
    const ab = e.target.closest('[data-abrir-pedido]'); if (ab) { abrirPedido(ab.dataset.abrirPedido); return; }
    const s = e.target.closest('[data-ir-sec]'); if (s) { P.sec = s.dataset.irSec; $$('.ngNav button').forEach(x => x.setAttribute('aria-selected', x.dataset.sec === P.sec)); pintar(); }
  });
  N.escuchar(ev => {
    if (document.body.dataset.vista !== 'negocio' || !N.esPersonal()) return;
    if (ev.col === 'pedidos' && P.conocidos) {
      const nuevos = N.lista('pedidos').filter(p => !P.conocidos.has(p.id));
      if (nuevos.length) { nuevos.forEach(p => P.conocidos.add(p.id)); sonar(); U.aviso(`Nuevo pedido ${nuevos[0].codigo} · ${pesos(nuevos[0].totales.total)}`, 5000); U.vibrar([100, 50, 100]); }
    }
    if (['pedidos', 'mensajes', 'reservas', 'egresos', 'ingresos', 'menu', 'publicidad', 'cierres', 'aperturas', 'exportes', 'negocio'].includes(ev.col)) {
      insignias();
      if (!$('#ng-cajon') || $('#ng-cajon').hidden || P.sec === 'pedidos') { if (!document.activeElement || !document.activeElement.closest('.ngMain form')) pintar(); }
      if (P.pedido && ev.col === 'mensajes') pintarHilo(P.pedido);
    }
  });
  setInterval(async () => {   // en la nube: revisa pedidos, chat y reservas cada 5 s
    if (D.modo !== 'supabase' || document.body.dataset.vista !== 'negocio' || !N.esPersonal() || !navigator.onLine) return;
    try { for (const c of ['pedidos', 'mensajes', 'reservas']) await N.refrescar(c); } catch (e) { /* sin señal */ }
  }, 5000);

  window.NEGOCIO = { abrir, libro, estadoCorte };
})();
