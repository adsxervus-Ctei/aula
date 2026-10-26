/* ============================================================
   MESA Y RUTA · panel del negocio
   Ver pedidos, cambiar su estado, chatear con el cliente,
   avisarle por WhatsApp e imprimir los QR de las mesas.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG, D = window.Datos, LS = D.LS;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const pesos = n => '$ ' + Math.round(n || 0).toLocaleString('es-CO');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ESTADOS = [['recibido', 'Recibido'], ['confirmado', 'Confirmar'], ['preparando', 'En cocina'], ['en_camino', 'En camino / listo'], ['entregado', 'Entregado']];
  const NOMBRE = { recibido: 'Nuevo', confirmado: 'Confirmado', preparando: 'En cocina', en_camino: 'En camino', entregado: 'Entregado' };
  const MODO = { local: ['Mesa', 'M3 9h18M5 9v11M19 9v11M8 9V6h8v3'], recoger: ['Recoger', 'M5 9h14l-1.2 11H6.2L5 9zM9 9V7a3 3 0 0 1 6 0v2'], domicilio: ['Domicilio', 'M6 17a3 3 0 1 0 0-.1M18 17a3 3 0 1 0 0-.1M9 17h6l2-6h-4l-2 3H8M14 7h3l1 4'] };
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const P = { pedidos: [], sel: null, filtro: 'activos', vistos: new Set(LS.get('myr_panel_vistos', [])), entro: false };
  let tAviso; const aviso = t => { const a = $('#toast'); a.textContent = t; a.classList.add('ver'); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('ver'), 3000); };

  // ---------------------------------------------- entrar
  $('#pn-negocio').textContent = C.negocio.nombre;
  document.title = 'Panel del negocio · ' + C.negocio.nombre;
  $('#pn-modo').textContent = D.modo === 'demo' ? 'Modo demostración: ve los pedidos hechos en este mismo navegador. Clave de ejemplo: FOGON-2026 (cámbiela en config.js).' : 'Ingrese con el correo y la clave del personal registrado en Supabase.';
  $('#pn-correo-caja').hidden = D.modo === 'demo';
  if (sessionStorage.getItem('myr_panel') === '1' && D.modo === 'demo') entrar();
  $('#f-panel').addEventListener('submit', async e => {
    e.preventDefault(); const n = $('#pn-nota'); n.textContent = '';
    try {
      const ok = D.modo === 'demo' ? await D.ingresarNegocio($('#pn-clave').value) : await D.ingresarNegocio($('#pn-correo').value, $('#pn-clave').value);
      if (!ok) { n.textContent = 'Clave incorrecta o cuenta sin permiso de personal.'; return; }
      sessionStorage.setItem('myr_panel', '1'); entrar();
    } catch (er) { n.textContent = er.message; }
  });
  $('#pn-salir').addEventListener('click', () => { sessionStorage.removeItem('myr_panel'); if (D.modo !== 'demo') D.salir(); location.reload(); });

  async function entrar() {
    P.entro = true; $('#pn-entrar').hidden = true; $('#pn-app').hidden = false;
    await cargar(); pintarQR(); pintarAjustes();
    D.escuchar(async () => { await cargar(true); });
  }

  // ---------------------------------------------- pedidos
  async function cargar(silencio) {
    const antes = new Set(P.pedidos.map(p => p.id));
    try { P.pedidos = await D.todosPedidos(); } catch (e) { if (!silencio) aviso(e.message); return; }
    const nuevos = P.pedidos.filter(p => !antes.has(p.id));
    if (silencio && nuevos.length) { sonar(); aviso(`Nuevo pedido ${nuevos[0].codigo}`); }
    pintarLista();
    if (P.sel) pintarDetalle(true);
  }
  function sonar() {
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [0, .18].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.15, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .16); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .17); }); } catch (e) { /* sin audio */ }
  }
  const hace = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }); };
  function pintarLista() {
    const lista = P.pedidos.filter(p => P.filtro === 'todos' || p.estado !== 'entregado');
    const sinVer = P.pedidos.filter(p => p.estado === 'recibido' && !P.vistos.has(p.id)).length;
    const b = $('#pn-nuevos'); b.hidden = !sinVer; b.textContent = sinVer;
    document.title = (sinVer ? `(${sinVer}) ` : '') + 'Panel · ' + C.negocio.nombre;
    $('#pn-lista').innerHTML = lista.length ? lista.map(p => {
      const [nm, d] = MODO[p.modo];
      return `<li><button type="button" data-ped="${p.id}" aria-current="${P.sel === p.id}" class="${p.estado === 'recibido' && !P.vistos.has(p.id) ? 'nuevo' : ''}">
        <span class="ico">${ic(d)}</span><span><b>${esc(p.codigo)}</b><small>${esc(p.cliente.nombre)} · ${nm}${p.mesa ? ' ' + esc(p.mesa) : ''} · ${hace(p.creado)}</small></span>
        <span style="text-align:right"><b>${pesos(p.totales.total)}</b><small><span class="etiqueta ${p.estado === 'entregado' ? 'verde' : ''}">${NOMBRE[p.estado]}</span></small></span></button></li>`;
    }).join('') : '<li class="mini" style="padding:10px">No hay pedidos por ahora. Cuando un cliente pida, aparece aquí con un sonido.</li>';
  }
  function textoPago(p) {
    if (p.pago.tipo === 'efectivo') return `Efectivo${p.pago.conCuanto ? ` · paga con ${pesos(p.pago.conCuanto)} · llevar cambio de ${pesos(p.pago.cambio)}` : ''}`;
    if (p.pago.tipo === 'transferencia') return 'Transferencia · esperar comprobante por el chat';
    return 'Tarjeta · ' + (p.modo === 'domicilio' ? 'llevar datáfono' : 'datáfono en mesa o caja');
  }
  async function pintarDetalle(soloChat) {
    const p = P.pedidos.find(x => x.id === P.sel); if (!p) return;
    const det = $('#pn-detalle');
    if (!soloChat || !det.querySelector('.pnChat')) {
      const k = ESTADOS.findIndex(x => x[0] === p.estado);
      const destino = p.modo === 'domicilio'
        ? `${esc(p.destino.direccion)}${p.destino.indicaciones ? '<br>' + esc(p.destino.indicaciones) : ''}<br>${String(p.destino.km).replace('.', ',')} km · ${p.destino.min} min<br><a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${C.negocio.lat}%2C${C.negocio.lng}%3B${p.destino.lat}%2C${p.destino.lng}" target="_blank" rel="noopener">Abrir la ruta</a>`
        : p.modo === 'local' ? `En el local${p.mesa ? ' · <b>mesa ' + esc(p.mesa) + '</b>' : ''}${p.fuenteModo === 'qr' ? ' (QR)' : p.fuenteModo === 'gps' ? ' (por ubicación)' : ''}` : 'Pasa a recoger';
      const cel = String(p.cliente.celular || '').replace(/\D/g, '');
      det.innerHTML = `<button class="enlace pnVolver" type="button" id="pn-volver">‹ Pedidos</button>
        <div class="pnDetCab"><div><h2>${esc(p.codigo)}</h2><p class="mini">${hace(p.creado)} · ${MODO[p.modo][0]}</p></div><b style="font-size:20px">${pesos(p.totales.total)}</b></div>
        <div class="pnEstados" role="group" aria-label="Estado del pedido">${ESTADOS.map(([id, n], j) => `<button type="button" data-estado="${id}" aria-pressed="${j <= k}">${n}</button>`).join('')}</div>
        <div class="pnBloques">
          <div class="pnBloque"><h3>Cliente</h3>${esc(p.cliente.nombre)}<br>${esc(p.cliente.celular)}${cel.length === 10 ? `<br><a href="https://wa.me/57${cel}?text=${encodeURIComponent(`Hola, ${p.cliente.nombre.split(' ')[0]}. Le escribimos de ${C.negocio.nombre} por su pedido ${p.codigo}.`)}" target="_blank" rel="noopener">Escribirle por WhatsApp</a>` : ''}</div>
          <div class="pnBloque"><h3>Entrega</h3>${destino}</div>
          <div class="pnBloque"><h3>Pedido</h3>${p.items.map(it => `${it.cant} × <b>${esc(it.nombre)}</b><br><small class="mini">${esc(it.detalle)}</small>`).join('<br>')}${p.nota ? `<br><br><b>Nota:</b> ${esc(p.nota)}` : ''}</div>
          <div class="pnBloque"><h3>Pago</h3>${esc(textoPago(p))}<br><br>Platos ${pesos(p.totales.platos)}${p.totales.salsas ? '<br>Salsas ' + pesos(p.totales.salsas) : ''}${p.totales.bebidas ? '<br>Bebidas ' + pesos(p.totales.bebidas) : ''}${p.totales.empaque ? '<br>Empaque ' + pesos(p.totales.empaque) : ''}${p.modo === 'domicilio' ? '<br>Domicilio ' + (p.totales.domicilio ? pesos(p.totales.domicilio) : 'gratis') : ''}</div>
        </div>
        <div class="pnChat"><ol class="hilo" id="pn-hilo"></ol>
          <div class="chips" id="pn-rapidas">
            <button type="button" data-r="¡Pedido confirmado! Estará listo en unos 25 minutos.">Confirmado</button>
            <button type="button" data-r="Se nos agotó un producto de su pedido. ¿Se lo cambiamos por otro similar?">Producto agotado</button>
            <button type="button" data-r="Su pedido va en camino.">Va en camino</button>
            <button type="button" data-r="Recibimos su transferencia. ¡Gracias!">Pago recibido</button>
            ${C.pagos.transferencia.llaveBreB ? `<button type="button" data-r="Puede transferir a la llave Bre-B ${esc(C.pagos.transferencia.llaveBreB)}${C.pagos.transferencia.titular ? ' a nombre de ' + esc(C.pagos.transferencia.titular) : ''}.">Enviar llave</button>` : ''}
          </div>
          <form class="escribir" id="pn-f-chat"><input id="pn-txt" placeholder="Responder al cliente" autocomplete="off" aria-label="Mensaje" maxlength="500"><button class="redondo verde" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg></button></form>
        </div>`;
      $('#tab-pedidos').classList.add('conDetalle');
    }
    const ms = await D.mensajes(p.id).catch(() => []);
    const h = $('#pn-hilo');
    if (h.childElementCount !== ms.length) {
      h.innerHTML = ms.map(m => `<li class="${m.de}">${esc(m.texto)}<small>${new Date(m.creado).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</small></li>`).join('');
      h.scrollTop = h.scrollHeight;
    }
  }
  $('#pn-lista').addEventListener('click', e => {
    const b = e.target.closest('[data-ped]'); if (!b) return;
    P.sel = b.dataset.ped; P.vistos.add(P.sel); LS.set('myr_panel_vistos', [...P.vistos]);
    pintarLista(); pintarDetalle();
  });
  $('#pn-detalle').addEventListener('click', async e => {
    if (e.target.closest('#pn-volver')) { $('#tab-pedidos').classList.remove('conDetalle'); return; }
    const est = e.target.closest('[data-estado]');
    if (est) {
      const p = P.pedidos.find(x => x.id === P.sel);
      await D.cambiarEstado(P.sel, est.dataset.estado);
      const msg = { confirmado: '¡Pedido confirmado! Ya lo estamos preparando.', preparando: 'Su pedido está en la cocina.', en_camino: p.modo === 'domicilio' ? 'Su pedido va en camino.' : p.modo === 'recoger' ? 'Su pedido está listo para recoger.' : 'Ya le llevamos su pedido a la mesa.', entregado: '¡Gracias por su compra! Buen provecho.' }[est.dataset.estado];
      if (msg) await D.enviarMensaje(P.sel, 'negocio', msg);
      await cargar(true); pintarDetalle(); aviso('Estado actualizado y cliente avisado.');
      return;
    }
    const r = e.target.closest('[data-r]');
    if (r) { await D.enviarMensaje(P.sel, 'negocio', r.dataset.r); pintarDetalle(true); }
  });
  $('#pn-detalle').addEventListener('submit', async e => {
    if (e.target.id !== 'pn-f-chat') return; e.preventDefault();
    const t = $('#pn-txt').value.trim(); if (!t) return;
    await D.enviarMensaje(P.sel, 'negocio', t); $('#pn-txt').value = ''; pintarDetalle(true);
  });
  $$('.pnFiltro button').forEach(b => b.addEventListener('click', () => {
    P.filtro = b.dataset.filtro; $$('.pnFiltro button').forEach(x => x.setAttribute('aria-checked', x === b)); pintarLista();
  }));
  $$('.pnTabs button').forEach(b => b.addEventListener('click', () => {
    $$('.pnTabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    ['pedidos', 'qr', 'ajustes'].forEach(t => { $('#tab-' + t).hidden = t !== b.dataset.tab; });
  }));

  // ---------------------------------------------- QR de mesas
  function pintarQR() {
    const base = $('#qr-base');
    if (!base.value) base.value = location.href.replace(/panel\.html.*$/, '');
    const url = base.value.replace(/\/?$/, '/');
    $('#qr-grid').innerHTML = Array.from({ length: C.local.mesas }, (_, k) => {
      const q = window.qrcode(0, 'M'); q.addData(`${url}?mesa=${k + 1}`); q.make();
      return `<div class="qrMesa"><img alt="Código QR de la mesa ${k + 1}" src="${q.createDataURL(6, 2)}"><b>Mesa ${k + 1}</b><small>Escanee para pedir · ${esc(C.negocio.nombre)}</small></div>`;
    }).join('');
  }
  $('#qr-base').addEventListener('change', pintarQR);
  $('#qr-imprimir').addEventListener('click', () => window.print());

  // ---------------------------------------------- ajustes (solo lectura)
  function pintarAjustes() {
    const tr = C.pagos.transferencia;
    $('#aj-datos').innerHTML = `<h2 style="font-size:18px;margin-bottom:10px">Así está configurado</h2><ul class="ajLista">
      <li>Datos: <b>${D.modo === 'demo' ? 'modo demostración (solo este navegador)' : 'Supabase (en la nube)'}</b></li>
      <li>WhatsApp del negocio: <b>${C.negocio.whatsapp ? esc(C.negocio.whatsapp) : 'sin configurar'}</b></li>
      <li>Punto de salida: ${C.negocio.lat}, ${C.negocio.lng} · radio del local ${C.local.radioMetros} m</li>
      <li>Domicilio: ${pesos(C.domicilio.base)} + ${pesos(C.domicilio.porKm)} por km (mínimo ${pesos(C.domicilio.minimo)}, hasta ${C.domicilio.maxKm} km${C.domicilio.gratisDesde ? ', gratis desde ' + pesos(C.domicilio.gratisDesde) : ''})</li>
      <li>Empaque por plato: ${pesos(C.empaquePorPlato)}</li>
      <li>Pagos: efectivo ${C.pagos.efectivo ? 'sí' : 'no'} · transferencia ${tr.activa ? (tr.llaveBreB || tr.nequi || tr.daviplata ? 'sí' : 'sí, falta la llave') : 'no'} · datáfono local ${C.pagos.datafonoEnLocal ? 'sí' : 'no'} · contra entrega ${C.pagos.datafonoContraEntrega ? 'sí' : 'no'} · en línea ${C.pagos.pasarelaEnLinea ? 'sí' : 'por activar'}</li>
    </ul><p class="mini" style="margin-top:12px">Para cambiar estos datos edite <b>js/config.js</b> y suba la versión en <b>sw.js</b>. La guía está en docs/GUIA_DESPLIEGUE.md.</p>`;
  }
})();
