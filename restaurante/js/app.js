/* ============================================================
   MESA Y RUTA · aplicación del cliente
   Flujo: carrusel de platos → receta → salsas → bebidas → resumen
   → forma de pago → pedido (estado, ruta) → chat con el negocio.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG, M = window.MENU, D = window.Datos, LS = D.LS;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const ROBOT = navigator.webdriver === true;
  const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANIMAR = !ROBOT && !QUIETO;
  const pesos = n => '$ ' + Math.round(n).toLocaleString('es-CO');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = id => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

  // ------------------------------------------------------------ estado
  const E = {
    i: 0,                                   // plato visible
    etapa: 'carrusel',
    arma: nuevaArma(),                      // lo que se está armando
    carrito: LS.get('myr_carrito', []),
    modo: LS.get('myr_modo', null),         // {tipo, mesa, lat, lng, direccion, indicaciones, km, min, fuente, linea}
    pago: { tipo: null, conCuanto: '' },
    nota: '',
    pedidoId: LS.get('myr_ultimo_pedido', null),
    pila: ['bienvenida'],
    volverTrasCuenta: false
  };
  function nuevaArma() { return { quitados: new Set(), salsas: new Set(), bebidas: new Map() }; }
  const guardarCarrito = () => LS.set('myr_carrito', E.carrito);
  const guardarModo = () => LS.set('myr_modo', E.modo);

  // ------------------------------------------------------------ avisos
  let tAviso;
  function aviso(t, ms = 3200) { const a = $('#toast'); a.textContent = t; a.classList.add('ver'); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('ver'), ms); }

  // ------------------------------------------------------------ navegación
  function mostrar(id, dir) {
    const cambiar = () => {
      $$('.vista').forEach(v => v.classList.toggle('oculta', v.id !== 'v-' + id));
      window.scrollTo(0, 0);
      alEntrar(id);
    };
    if (ANIMAR && document.startViewTransition) {
      document.documentElement.dataset.dir = dir;
      const t = document.startViewTransition(cambiar);
      t.finished.finally(() => { delete document.documentElement.dataset.dir; });
    } else cambiar();
  }
  function ir(id, { reemplazar = false } = {}) {
    if (reemplazar) { E.pila[E.pila.length - 1] = id; history.replaceState({ i: E.pila.length - 1 }, ''); }
    else { E.pila.push(id); history.pushState({ i: E.pila.length - 1 }, ''); }
    mostrar(id, 'adelante');
  }
  function actual() { return E.pila[E.pila.length - 1]; }
  function atras() {
    if (actual() === 'menu' && E.etapa !== 'carrusel') { etapaAnterior(); return; }
    if (E.pila.length > 1) history.back();
  }
  function volverA(id) {
    const k = E.pila.length - 1 - E.pila.lastIndexOf(id);
    if (E.pila.lastIndexOf(id) < 0) { ir(id); return; }
    if (k > 0) history.go(-k);
  }
  window.addEventListener('popstate', e => {
    const i = e.state && typeof e.state.i === 'number' ? e.state.i : 0;
    if (actual() === 'menu' && E.etapa !== 'carrusel' && i < E.pila.length - 1) {
      etapaAnterior(); history.pushState({ i: E.pila.length - 1 }, ''); return;
    }
    E.pila.length = Math.max(1, i + 1);
    mostrar(actual(), 'atras');
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-atras]')) atras(); });

  function alEntrar(id) {
    if (id === 'bienvenida') pintarBienvenida();
    if (id === 'menu') { pintarInsignia(); pintarChip(); if (!E.modo) setTimeout(abrirModo, ANIMAR ? 450 : 0); }
    if (id === 'resumen') pintarResumen();
    if (id === 'mapa') abrirMapa();
    if (id === 'pedido') pintarPedido();
    if (id === 'chat') pintarChat();
    if (id === 'perfil') pintarPerfil();
    if (id === 'cuenta') { const m = $('#cuenta-motivo'); m.hidden = !E.volverTrasCuenta; m.textContent = 'Para enviar su pedido necesitamos saber quién es. Ingrese o cree su cuenta en un minuto.'; }
  }

  // ------------------------------------------------------------ apertura
  function apertura() {
    const ap = $('#apertura');
    if (ROBOT) { ap.remove(); return Promise.resolve(); }
    return new Promise(res => {
      let p = 0; const b = $('#ap-barra');
      const paso = () => { p = Math.min(100, p + 7 + Math.random() * 12); b.style.width = p + '%'; if (p < 100) setTimeout(paso, 70); else setTimeout(() => { ap.classList.add('fuera'); setTimeout(() => { ap.remove(); res(); }, 450); }, 200); };
      paso();
    });
  }

  // ------------------------------------------------------------ bienvenida
  function pintarBienvenida() {
    $('#bn-negocio').textContent = C.negocio.nombre;
    [['#bn-p1', 0], ['#bn-p2', 1], ['#bn-p3', 3]].forEach(([s, k]) => { const el = $(s); if (!el.firstChild) el.innerHTML = M.arte(M.PLATOS[k]); });
    const s = D.sesion(), t = $('#bn-sesion');
    $('#b-ir-ingresar').hidden = $('#b-ir-registro').hidden = !!s;
    $('.fila2').style.display = s ? 'none' : '';
    t.innerHTML = s ? `Hola, ${esc(s.nombre.split(' ')[0])}. <button class="enlace" id="b-ir-perfil" type="button">${svg('persona')} Mi perfil y mis pedidos</button>` : '';
  }

  // ------------------------------------------------------------ cuenta
  function pestana(cual) {
    $('#tab-ingresar').setAttribute('aria-selected', cual === 'ingresar'); $('#tab-registro').setAttribute('aria-selected', cual === 'registro');
    $('#f-ingresar').hidden = cual !== 'ingresar'; $('#f-registro').hidden = cual !== 'registro';
  }
  async function trasEntrar(u) {
    aviso(`¡Bienvenido, ${u.nombre.split(' ')[0]}!`);
    if (E.volverTrasCuenta) { E.volverTrasCuenta = false; history.back(); }
    else ir('menu', { reemplazar: true });
  }

  // ------------------------------------------------------------ carrusel
  const plato = () => M.PLATOS[E.i];
  function pintarPlato(dir = 0) {
    const p = plato();
    const cont = $('#plato'), heroe = $('#heroe-arte');
    const nueva = document.createElement('div'); nueva.className = 'platoCapa'; nueva.innerHTML = M.arte(p);
    const hNueva = document.createElement('div'); hNueva.className = 'heroeCapa'; hNueva.innerHTML = M.arte(p);
    const viejas = [...cont.querySelectorAll('.platoCapa')], hViejas = [...heroe.querySelectorAll('.heroeCapa')];
    cont.append(nueva); heroe.append(hNueva);
    const titulo = $('#pl-nombre');
    if (dir && ANIMAR) {
      const d = 600, ez = 'cubic-bezier(.22,.8,.25,1)';
      viejas.forEach(v => v.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 70}%) rotate(${-dir * 120}deg) scale(.7)`, opacity: 0 }], { duration: d, easing: ez, fill: 'forwards' }).finished.then(() => v.remove()));
      nueva.animate([{ transform: `translateX(${dir * 70}%) rotate(${dir * 120}deg) scale(.7)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: d, easing: ez });
      hViejas.forEach(v => v.animate([{ opacity: 1, transform: 'scale(1) rotate(0)' }, { opacity: 0, transform: `scale(1.15) rotate(${-dir * 25}deg)` }], { duration: d, easing: ez, fill: 'forwards' }).finished.then(() => v.remove()));
      hNueva.animate([{ opacity: 0, transform: `scale(.9) rotate(${dir * 25}deg)` }, { opacity: 1, transform: 'none' }], { duration: d, easing: ez });
      // nombre: fundido cruzado, los dos se ven un instante como en la referencia
      const sale = document.createElement('h1'); sale.className = 'sale'; sale.textContent = titulo.textContent; sale.setAttribute('aria-hidden', 'true');
      titulo.parentNode.append(sale);
      sale.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 30}px)` }], { duration: 380, fill: 'forwards' }).finished.then(() => sale.remove());
      titulo.animate([{ opacity: 0, transform: `translateX(${dir * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ez });
      ['#pl-precio', '#pl-desc'].forEach(s => $(s).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420 }));
    } else { viejas.forEach(v => v.remove()); hViejas.forEach(v => v.remove()); }
    titulo.textContent = p.nombre;
    $('#pl-precio').textContent = pesos(p.precio);
    $('#pl-desc').textContent = p.descripcion;
    $('#heroe').style.background = p.fondo;
    $$('#puntos button').forEach((b, k) => b.setAttribute('aria-selected', k === E.i));
  }
  function mover(dir) {
    if (E.etapa !== 'carrusel') return;
    E.i = (E.i + dir + M.PLATOS.length) % M.PLATOS.length; E.arma = nuevaArma(); pintarPlato(dir);
  }
  function pintarPuntos() {
    $('#puntos').innerHTML = M.PLATOS.map((p, k) => `<button role="tab" type="button" aria-label="${esc(p.nombre)}" data-punto="${k}"></button>`).join('');
  }

  // gestos: deslizar a los lados cambia el plato; hacia arriba abre la receta
  function gestos() {
    const zona = $('#v-menu'); let x0 = 0, y0 = 0, t0 = 0, activo = false, enHoja = false;
    zona.addEventListener('pointerdown', e => {
      if (e.target.closest('button, input, a, .lista')) { activo = false; return; }
      activo = true; enHoja = !!e.target.closest('.hoja'); x0 = e.clientX; y0 = e.clientY; t0 = Date.now();
    });
    zona.addEventListener('pointerup', e => {
      if (!activo) return; activo = false;
      const dx = e.clientX - x0, dy = e.clientY - y0, rapido = Date.now() - t0 < 700;
      if (!rapido) return;
      if (E.etapa === 'carrusel' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) mover(dx < 0 ? 1 : -1);
      else if (E.etapa === 'carrusel' && dy < -45 && Math.abs(dy) > Math.abs(dx)) abrirEtapa('receta');
      else if (E.etapa !== 'carrusel' && dy > 60 && Math.abs(dy) > Math.abs(dx) && (enHoja || true)) etapaAnterior();
    });
    zona.addEventListener('pointercancel', () => { activo = false; });
    // asa de la hoja: también se puede bajar tocándola
    $('#asa').addEventListener('click', etapaAnterior);
  }

  // ------------------------------------------------------------ etapas (receta, salsas, bebidas)
  const ETAPAS = ['carrusel', 'receta', 'salsas', 'bebidas'];
  function abrirEtapa(etapa, atrasAnim = false) {
    E.etapa = etapa; $('#v-menu').dataset.etapa = etapa;
    const hoja = $('#hoja'); hoja.setAttribute('aria-hidden', etapa === 'carrusel');
    if (etapa === 'carrusel') return;
    const p = plato(), n = ETAPAS.indexOf(etapa);
    $('#hoja-paso').textContent = `Paso ${n} de 3`;
    const lista = $('#hoja-lista'), b = $('#b-hoja');
    if (etapa === 'receta') {
      $('#hoja-tit').textContent = 'Receta · ' + p.nombre;
      $('#hoja-sub').textContent = 'Toque un ingrediente para quitarlo.';
      lista.innerHTML = p.ingredientes.map(id => {
        const q = E.arma.quitados.has(id);
        return `<li class="${q ? 'quitado' : ''}"><span class="ico">${M.miniIngrediente(id)}</span><span class="nom">${esc(M.nombreIngrediente(id))}</span>
          <button class="togg" type="button" data-ingr="${id}" aria-pressed="${!q}" aria-label="${q ? 'Volver a poner' : 'Quitar'} ${esc(M.nombreIngrediente(id))}">${svg(q ? 'mas' : 'check')}</button></li>`;
      }).join('');
      b.textContent = 'Elegir salsas'; b.classList.remove('listo');
    }
    if (etapa === 'salsas') {
      $('#hoja-tit').textContent = 'Recipiente de salsas';
      $('#hoja-sub').textContent = 'Toque + para agregar. Van en recipiente aparte.';
      lista.innerHTML = M.SALSAS.map(s => {
        const on = E.arma.salsas.has(s.id);
        return `<li><span class="ico">${M.miniSalsa(s)}</span><span class="nom">${esc(s.nombre)}<small>${s.precio ? '+ ' + pesos(s.precio) : 'Sin costo'}</small></span>
          <button class="togg" type="button" data-salsa="${s.id}" aria-pressed="${on}" aria-label="${on ? 'Quitar' : 'Agregar'} salsa ${esc(s.nombre)}">${svg(on ? 'check' : 'mas')}</button></li>`;
      }).join('');
      b.textContent = 'Elegir bebida'; b.classList.remove('listo');
    }
    if (etapa === 'bebidas') {
      $('#hoja-tit').textContent = 'Bebidas disponibles';
      $('#hoja-sub').textContent = 'Opcional. Elija cuántas quiere.';
      lista.innerHTML = M.BEBIDAS.map(x => {
        const c = E.arma.bebidas.get(x.id) || 0;
        return `<li><span class="ico">${M.miniBebida(x)}</span><span class="nom">${esc(x.nombre)}<small>${esc(x.detalle)} · ${pesos(x.precio)}</small></span>
          <span class="cant">${c ? `<button class="togg" type="button" data-beb="${x.id}" data-d="-1" aria-label="Una ${esc(x.nombre)} menos">${svg('menos')}</button><b>${c}</b>` : ''}
          <button class="togg" type="button" data-beb="${x.id}" data-d="1" aria-pressed="${c > 0}" aria-label="Agregar ${esc(x.nombre)}">${svg('mas')}</button></span></li>`;
      }).join('');
      b.textContent = 'Confirmar'; b.classList.add('listo');
    }
    lista.classList.remove('entra', 'entraAtras'); void lista.offsetWidth;
    if (ANIMAR) lista.classList.add(atrasAnim ? 'entraAtras' : 'entra');
  }
  function etapaAnterior() {
    const n = ETAPAS.indexOf(E.etapa); if (n <= 0) return;
    abrirEtapa(ETAPAS[n - 1], true);
  }
  function siguienteEtapa() {
    const n = ETAPAS.indexOf(E.etapa);
    if (E.etapa === 'bebidas') { confirmarPlato(); return; }
    abrirEtapa(ETAPAS[n + 1]);
  }
  function refrescarEtapa() { const l = $('#hoja-lista'), y = l.scrollTop; abrirEtapa(E.etapa); l.classList.remove('entra'); l.scrollTop = y; }

  function precioItem(it) {
    const salsas = it.salsas.reduce((a, id) => a + (M.SALSAS.find(s => s.id === id)?.precio || 0), 0);
    const beb = it.bebidas.reduce((a, b) => a + (M.BEBIDAS.find(x => x.id === b.id)?.precio || 0) * b.cant, 0);
    return { unitario: it.precio + salsas, bebidas: beb, total: (it.precio + salsas) * it.cant + beb };
  }
  function confirmarPlato() {
    const p = plato();
    E.carrito.push({ platoId: p.id, nombre: p.nombre, precio: p.precio, cant: 1,
      quitados: [...E.arma.quitados], salsas: [...E.arma.salsas], bebidas: [...E.arma.bebidas].filter(([, c]) => c > 0).map(([id, cant]) => ({ id, cant })) });
    guardarCarrito(); E.arma = nuevaArma();
    pintarInsignia(true);
    ir('resumen');
    setTimeout(() => abrirEtapa('carrusel'), ANIMAR ? 650 : 0);
  }
  function pintarInsignia(saltar) {
    const n = E.carrito.reduce((a, x) => a + x.cant, 0), b = $('#insignia');
    b.hidden = !n; b.textContent = n;
    if (saltar && ANIMAR) { b.classList.remove('salta'); void b.offsetWidth; b.classList.add('salta'); }
  }

  // ------------------------------------------------------------ cómo lo quiere (local / recoger / domicilio)
  const R_TIERRA = 6371;
  function distanciaKm(a, b) {
    const r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R_TIERRA * Math.asin(Math.sqrt(h));
  }
  const NEG = { lat: C.negocio.lat, lng: C.negocio.lng };
  function nombreModo(m) {
    if (!m) return '¿Cómo lo quiere?';
    if (m.tipo === 'local') return m.mesa ? `Mesa ${m.mesa} · comer aquí` : 'Comer aquí';
    if (m.tipo === 'recoger') return 'Recoger en el local';
    return m.lat ? `Domicilio · ${m.km.toFixed(1).replace('.', ',')} km` : 'Domicilio · falta dirección';
  }
  function pintarChip() {
    $('#chip-modo').textContent = nombreModo(E.modo);
    const ic = !E.modo ? 'moto' : E.modo.tipo === 'local' ? 'mesa' : E.modo.tipo === 'recoger' ? 'recoger' : 'moto';
    $('#b-chip-modo use').setAttribute('href', '#i-' + ic);
  }
  function abrirModo() {
    if (!$('#velo-modo').hidden) return;
    $('#velo-modo').hidden = false; $('#md-nota').textContent = '';
    $$('.opcModo button').forEach(b => b.classList.toggle('sugerido', !!E.modo && b.dataset.elegir === E.modo.tipo));
    $('#md-mesa-caja').hidden = !(E.modo && E.modo.tipo === 'local');
    if (E.modo && E.modo.mesa) $('#md-mesa').value = E.modo.mesa;
  }
  function cerrarModo() { $('#velo-modo').hidden = true; pintarChip(); if (actual() === 'resumen') pintarResumen(); }
  function elegirModo(tipo, extra = {}) {
    if (tipo === 'domicilio' && !C.domicilio.activo) { aviso('Este negocio aún no hace domicilios.'); return; }
    const prev = E.modo && E.modo.tipo === 'domicilio' ? E.modo : null;
    E.modo = { tipo, fuente: 'manual', ...(tipo === 'domicilio' && prev ? prev : {}), ...extra, tipo };
    if (tipo === 'local') { const m = $('#md-mesa').value.trim(); if (m) E.modo.mesa = m.replace(/\D/g, '').slice(0, 3); }
    guardarModo();
  }
  function ubicar() {
    return new Promise((res, rej) => {
      if (!('geolocation' in navigator)) { rej(new Error('Este teléfono no permite ver la ubicación.')); return; }
      navigator.geolocation.getCurrentPosition(
        p => res({ lat: p.coords.latitude, lng: p.coords.longitude, prec: p.coords.accuracy || 50 }),
        e => rej(new Error(e.code === 1 ? 'No dio permiso para ver su ubicación. Escoja una opción.' : 'No pudimos ver su ubicación. Escoja una opción o intente al aire libre.')),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }
  // Decide solo: cerca del negocio → comer aquí; lejos → domicilio con su ubicación.
  async function decidirPorUbicacion() {
    const nota = $('#md-nota'); nota.textContent = 'Buscando su ubicación…';
    try {
      const u = await ubicar();
      const dKm = distanciaKm(NEG, u), dM = dKm * 1000;
      const margen = Math.min(u.prec, 80);
      if (dM - margen <= C.local.radioMetros) {
        elegirModo('local', { fuente: 'gps' });
        nota.textContent = `Está a unos ${Math.round(dM)} m: parece que está en el local.`;
        $('#md-mesa-caja').hidden = false;
        $$('.opcModo button').forEach(b => b.classList.toggle('sugerido', b.dataset.elegir === 'local'));
        aviso('Está en el local: su pedido llega a la mesa.');
        return;
      }
      if (dKm > C.domicilio.maxKm || !C.domicilio.activo) {
        elegirModo('recoger', { fuente: 'gps' });
        nota.textContent = `Está a ${dKm.toFixed(1).replace('.', ',')} km, fuera de la zona de domicilio. Puede recogerlo.`;
        $$('.opcModo button').forEach(b => b.classList.toggle('sugerido', b.dataset.elegir === 'recoger'));
        return;
      }
      E.modo = { tipo: 'domicilio', fuente: 'gps', lat: u.lat, lng: u.lng, direccion: 'Mi ubicación actual', indicaciones: '' };
      await calcularRuta(E.modo); guardarModo();
      nota.textContent = `Está a ${E.modo.km.toFixed(1).replace('.', ',')} km: activamos el domicilio.`;
      aviso(`Domicilio activado · ${pesos(tarifa(E.modo.km, subtotal()).valor)}`);
      setTimeout(cerrarModo, ANIMAR ? 1200 : 0);
      direccionInversa(E.modo);
    } catch (e) { nota.textContent = e.message; }
  }

  // ------------------------------------------------------------ tarifas y totales
  function subtotal() { return E.carrito.reduce((a, it) => a + precioItem(it).total, 0); }
  function tarifa(km, sub) {
    const d = C.domicilio; const calc = Math.max(d.minimo, Math.ceil((d.base + d.porKm * km) / 500) * 500);
    if (d.gratisDesde && sub >= d.gratisDesde) return { valor: 0, ahorro: calc };
    return { valor: calc, ahorro: 0 };
  }
  function totales() {
    const sub = subtotal(), platos = E.carrito.reduce((a, it) => a + it.cant, 0);
    const salsas = E.carrito.reduce((a, it) => a + (precioItem(it).unitario - it.precio) * it.cant, 0);
    const bebidas = E.carrito.reduce((a, it) => a + precioItem(it).bebidas, 0);
    const base = sub - salsas - bebidas;
    const tipo = E.modo ? E.modo.tipo : null;
    const empaque = (tipo === 'domicilio' || tipo === 'recoger') ? C.empaquePorPlato * platos : 0;
    let dom = { valor: 0, ahorro: 0 };
    if (tipo === 'domicilio' && E.modo.lat) dom = tarifa(E.modo.km, sub);
    return { platos: base, salsas, bebidas, empaque, domicilio: dom.valor, ahorro: dom.ahorro, total: sub + empaque + dom.valor, unidades: platos };
  }

  // ------------------------------------------------------------ resumen
  function detalleItem(it) {
    const partes = [];
    if (it.quitados.length) partes.push('Sin ' + it.quitados.map(id => M.nombreIngrediente(id).toLowerCase()).join(', '));
    if (it.salsas.length) partes.push('Salsas: ' + it.salsas.map(id => M.SALSAS.find(s => s.id === id).nombre).join(', '));
    if (it.bebidas.length) partes.push(it.bebidas.map(b => `${b.cant} × ${M.BEBIDAS.find(x => x.id === b.id).nombre}`).join(', '));
    return partes.join(' · ') || 'Como viene';
  }
  function pintarResumen() {
    const vacio = !E.carrito.length;
    const ult = E.carrito[E.carrito.length - 1];
    const pg = $('#plato-grande');
    pg.innerHTML = `<div class="platoCapa">${M.arte(ult ? M.PLATOS.find(p => p.id === ult.platoId) : plato())}</div>`;
    $$('#res-modos button').forEach(b => b.setAttribute('aria-checked', !!E.modo && b.dataset.modo === E.modo.tipo));
    // destino
    const d = $('#res-destino'); const m = E.modo;
    if (!m) d.innerHTML = `<div class="fila">${svg('ubicacion')}<div><b>¿Cómo lo quiere?</b><small>Escoja arriba o use su ubicación.</small></div><button type="button" id="b-res-ubicar">Ubicarme</button></div>`;
    else if (m.tipo === 'local') d.innerHTML = `<div class="fila">${svg('mesa')}<div><b>${m.mesa ? 'Mesa ' + esc(m.mesa) : 'En el local'}</b><small>${m.fuente === 'qr' ? 'Leído del código QR de la mesa' : 'Se lo llevamos a la mesa'}</small></div><button type="button" id="b-res-mesa">${m.mesa ? 'Cambiar' : 'Poner mesa'}</button></div>`;
    else if (m.tipo === 'recoger') d.innerHTML = `<div class="fila">${svg('recoger')}<div><b>Recoge en ${esc(C.negocio.nombre)}</b><small>${esc(C.negocio.direccion)} · listo en unos 20 min</small></div></div>`;
    else d.innerHTML = m.lat
      ? `<div class="fila">${svg('ubicacion')}<div><b>${esc(m.direccion || 'Dirección marcada en el mapa')}</b><small>${m.km.toFixed(1).replace('.', ',')} km · unos ${m.min} min de camino${m.linea ? ' (aprox.)' : ''}</small></div><button type="button" id="b-res-ruta">Ver ruta</button></div>`
      : `<div class="fila">${svg('ubicacion')}<div><b>Falta la dirección</b><small>Márquela en el mapa para calcular el domicilio.</small></div><button type="button" id="b-res-ruta">Marcar</button></div>`;
    // ítems
    $('#res-items').innerHTML = vacio ? '<li><span class="txt"><b>Su pedido está vacío</b><small>Agregue un plato desde el menú.</small></span></li>' :
      E.carrito.map((it, k) => {
        const p = M.PLATOS.find(x => x.id === it.platoId);
        return `<li><span class="mini-plato">${M.arte(p)}</span><span class="txt"><b>${esc(it.nombre)}</b><small>${esc(detalleItem(it))}</small></span>
        <span class="acciones"><button type="button" data-item="${k}" data-d="-1" aria-label="${it.cant > 1 ? 'Uno menos' : 'Quitar'} ${esc(it.nombre)}">${svg(it.cant > 1 ? 'menos' : 'basura')}</button><b>${it.cant}</b><button type="button" data-item="${k}" data-d="1" aria-label="Uno más ${esc(it.nombre)}">${svg('mas')}</button></span>
        <span class="val">${pesos(precioItem(it).total)}</span></li>`;
      }).join('');
    // cuentas
    const t = totales();
    let h = `<dt>Platos</dt><dd>${pesos(t.platos)}</dd>`;
    if (t.salsas) h += `<dt>Salsas especiales</dt><dd>${pesos(t.salsas)}</dd>`;
    if (t.bebidas) h += `<dt>Bebidas</dt><dd>${pesos(t.bebidas)}</dd>`;
    if (t.empaque) h += `<dt>Empaque</dt><dd>${pesos(t.empaque)}</dd>`;
    if (m && m.tipo === 'domicilio') h += `<dt>Domicilio</dt><dd>${m.lat ? (t.domicilio ? pesos(t.domicilio) : 'Gratis') : '—'}</dd>`;
    if (t.ahorro) h += `<dt class="ahorro">Su ahorro</dt><dd class="ahorro">${pesos(t.ahorro)}</dd>`;
    else if (m && m.tipo === 'domicilio' && C.domicilio.gratisDesde && t.domicilio) h += `<dt class="ahorro" style="grid-column:1/-1;font-size:12.5px">Domicilio gratis desde ${pesos(C.domicilio.gratisDesde)}</dt>`;
    h += `<dt class="tot">Total</dt><dd class="tot">${pesos(t.total)}</dd>`;
    $('#res-cuentas').innerHTML = h;
    $('#res-total').textContent = pesos(t.total);
    pintarPagos();
    $('#b-pedir').disabled = vacio;
    $('#res-nota').value = E.nota;
  }
  function tarjetaDisponible() {
    const tipo = E.modo ? E.modo.tipo : null;
    if (C.pagos.pasarelaEnLinea) return { ok: true, txt: 'Pago en línea con tarjeta.' };
    if (tipo === 'domicilio') return C.pagos.datafonoContraEntrega ? { ok: true, txt: 'El domiciliario lleva el datáfono: paga con tarjeta débito o crédito al recibir.' } : { ok: false, txt: 'Para domicilio aún no recibimos tarjeta.' };
    if (tipo) return C.pagos.datafonoEnLocal ? { ok: true, txt: tipo === 'local' ? 'Le llevamos el datáfono a la mesa.' : 'Paga con tarjeta en la caja al recoger.' } : { ok: false, txt: 'Aún no recibimos tarjeta.' };
    return { ok: true, txt: 'Con datáfono en el local o contra entrega.' };
  }
  function pintarPagos() {
    const tj = tarjetaDisponible();
    if (E.pago.tipo === 'tarjeta' && !tj.ok) E.pago.tipo = null;
    $$('#res-pagos button').forEach(b => {
      const tipo = b.dataset.pago;
      const no = (tipo === 'efectivo' && !C.pagos.efectivo) || (tipo === 'transferencia' && !C.pagos.transferencia.activa) || (tipo === 'tarjeta' && !tj.ok);
      b.setAttribute('aria-disabled', no); b.setAttribute('aria-checked', E.pago.tipo === tipo);
    });
    const det = $('#res-pago-detalle'), t = totales();
    if (E.pago.tipo === 'efectivo') {
      const cc = Number(String(E.pago.conCuanto).replace(/\D/g, '')) || 0;
      det.innerHTML = `<div class="caja"><label class="nota-campo" style="margin:0">¿Con cuánto va a pagar? (para llevar el cambio)<input id="pg-con" inputmode="numeric" placeholder="${pesos(Math.ceil(t.total / 10000) * 10000)}" value="${cc ? cc.toLocaleString('es-CO') : ''}"></label>
        <span id="pg-cambio" class="mini">${cc ? (cc >= t.total ? 'Cambio: <b>' + pesos(cc - t.total) + '</b>' : 'Le faltan ' + pesos(t.total - cc)) : 'Opcional.'}</span></div>`;
    } else if (E.pago.tipo === 'transferencia') {
      const tr = C.pagos.transferencia;
      const llaves = [['Llave Bre-B', tr.llaveBreB], ['Nequi', tr.nequi], ['Daviplata', tr.daviplata]].filter(x => x[1]);
      det.innerHTML = `<div class="caja">${llaves.length ? llaves.map(([n, v]) => `<div class="llave"><span>${n}<br><code>${esc(v)}</code></span><button type="button" data-copiar="${esc(v)}">${svg('copiar')} Copiar</button></div>`).join('') + (tr.titular ? `<small class="mini">A nombre de ${esc(tr.titular)}</small>` : '')
        : '<span>El negocio le envía su llave Bre-B o su número Nequi por el chat al confirmar el pedido.</span>'}
        <span class="mini">Transfiera <b>${pesos(t.total)}</b> y envíe el comprobante por el chat. Confirmamos al verlo.</span></div>`;
    } else if (E.pago.tipo === 'tarjeta') {
      det.innerHTML = `<div class="caja"><span>${esc(tj.txt)}</span>${C.pagos.pasarelaEnLinea ? '' : '<span class="mini">Pago en línea con tarjeta: por activar.</span>'}</div>`;
    } else det.innerHTML = '';
  }

  async function hacerPedido() {
    if (!E.carrito.length) { aviso('Su pedido está vacío.'); return; }
    if (!E.modo) { abrirModo(); aviso('Primero díganos cómo lo quiere.'); return; }
    if (E.modo.tipo === 'domicilio' && !E.modo.lat) { aviso('Marque la dirección de entrega.'); ir('mapa'); return; }
    if (!E.pago.tipo) { aviso('Escoja la forma de pago.'); $('#res-pagos').scrollIntoView({ behavior: ANIMAR ? 'smooth' : 'auto', block: 'center' }); return; }
    const t = totales();
    const cc = Number(String(E.pago.conCuanto).replace(/\D/g, '')) || 0;
    if (E.pago.tipo === 'efectivo' && cc && cc < t.total) { aviso('El valor con el que paga es menor que el total.'); return; }
    const s = D.sesion();
    if (!s) { E.volverTrasCuenta = true; pestana('registro'); ir('cuenta'); return; }
    const b = $('#b-pedir'); b.disabled = true; b.textContent = 'Enviando…';
    try {
      const m = E.modo;
      const ped = await D.crearPedido({
        negocio: C.negocio.nombre,
        cliente: { nombre: s.nombre, celular: s.celular, correo: s.correo },
        items: E.carrito.map(it => ({ ...it, detalle: detalleItem(it), total: precioItem(it).total })),
        modo: m.tipo, mesa: m.mesa || null, fuenteModo: m.fuente,
        destino: m.tipo === 'domicilio' ? { lat: m.lat, lng: m.lng, direccion: m.direccion, indicaciones: m.indicaciones || '', km: m.km, min: m.min, linea: m.linea || null } : null,
        pago: { tipo: E.pago.tipo, conCuanto: cc || null, cambio: cc ? cc - t.total : null },
        nota: E.nota, totales: t
      });
      E.carrito = []; guardarCarrito(); pintarInsignia(); E.nota = ''; E.pago = { tipo: null, conCuanto: '' };
      E.pedidoId = ped.id; LS.set('myr_ultimo_pedido', ped.id);
      ir('pedido', { reemplazar: true });
      aviso('¡Pedido enviado! Le confirmamos por el chat.');
    } catch (e) { aviso(e.message || 'No se pudo enviar. Revise la señal e intente de nuevo.', 5000); }
    finally { b.disabled = false; b.textContent = 'Hacer pedido'; }
  }

  // ------------------------------------------------------------ mapa y ruta
  const mapas = {};
  function iconoPin(clase, ic) { return window.L.divIcon({ className: '', html: `<div class="${clase}">${svg(ic)}</div>`, iconSize: [34, 34], iconAnchor: [17, 34] }); }
  async function calcularRuta(m) {
    const kmRecto = distanciaKm(NEG, m);
    m.km = Math.round(kmRecto * 1.35 * 10) / 10; m.min = Math.max(5, Math.round(m.km * C.domicilio.minutosPorKm)); m.linea = null; m.recta = true;
    try {
      if (!navigator.onLine) throw new Error('sin señal');
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`${C.servicios.rutas}/route/v1/driving/${NEG.lng},${NEG.lat};${m.lng},${m.lat}?overview=full&geometries=geojson`, { signal: ctl.signal });
      clearTimeout(to);
      const j = await r.json();
      if (j.code !== 'Ok' || !j.routes || !j.routes[0]) throw new Error('sin ruta');
      const ru = j.routes[0];
      m.km = Math.round(ru.distance / 100) / 10; m.min = Math.max(5, Math.round(ru.duration / 60 * 1.3));
      m.linea = ru.geometry.coordinates.map(([lng, lat]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]);
      m.recta = false;
    } catch (e) { /* sin ruta: se usa la distancia en línea recta × 1,35 */ }
    return m;
  }
  async function direccionInversa(m) {
    try {
      const r = await fetch(`${C.servicios.direcciones}/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${m.lat}&lon=${m.lng}`);
      const j = await r.json(); const a = j.address || {};
      const txt = [a.road, a.house_number, a.neighbourhood || a.suburb].filter(Boolean).join(' ');
      if (txt) { m.direccion = txt; guardarModo(); if (actual() === 'resumen') pintarResumen(); const i = $('#mp-direccion'); if (i && actual() === 'mapa') i.value = txt; }
    } catch (e) { /* sin señal: se queda «Mi ubicación actual» */ }
  }
  function plano(el, m) {
    // Respaldo sin señal: esquema de calles con la ruta en línea, sin mosaicos.
    let r = el.querySelector('.planoRespaldo'); if (!r) { r = document.createElement('div'); r.className = 'planoRespaldo'; el.append(r); }
    const W = 400, H = 400, a = NEG, b = m && m.lat ? m : { lat: NEG.lat - .008, lng: NEG.lng + .01 };
    const minLa = Math.min(a.lat, b.lat), maxLa = Math.max(a.lat, b.lat), minLo = Math.min(a.lng, b.lng), maxLo = Math.max(a.lng, b.lng);
    const pad = .25, sLa = (maxLa - minLa) || .002, sLo = (maxLo - minLo) || .002;
    const P = (la, lo) => [((lo - minLo) / sLo * (1 - 2 * pad) + pad) * W, ((maxLa - la) / sLa * (1 - 2 * pad) + pad) * H];
    const pts = (m && m.linea ? m.linea : [[a.lat, a.lng], [b.lat, b.lng]]).map(([la, lo]) => P(la, lo).map(n => n.toFixed(1)).join(',')).join(' ');
    const [ax, ay] = P(a.lat, a.lng), [bx, by] = P(b.lat, b.lng);
    let calles = '';
    for (let i = -1; i < 9; i++) calles += `<path d="M${i * 52} 0l${40} ${H}" stroke="#fff" stroke-width="${i % 3 ? 7 : 12}"/><path d="M0 ${i * 50 + 10}l${W} ${-30}" stroke="#fff" stroke-width="${i % 4 ? 7 : 12}"/>`;
    r.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"><rect width="${W}" height="${H}" fill="#ECE6DC"/>${calles}
      <rect x="250" y="40" width="90" height="60" rx="10" fill="#D7E8C9"/><path d="M0 330C120 300 220 360 400 320V400H0Z" fill="#CFE3EE"/>
      <polyline points="${pts}" fill="none" stroke="#E2572B" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" ${m && m.linea ? '' : 'stroke-dasharray="2 12"'}/>
      <circle cx="${ax}" cy="${ay}" r="13" fill="#1E1A17" stroke="#fff" stroke-width="4"/><circle cx="${bx}" cy="${by}" r="13" fill="#E2572B" stroke="#fff" stroke-width="4"/></svg>
      <p class="mini" style="position:absolute;left:10px;top:${el.classList.contains('chico') ? 8 : 74}px;background:rgba(255,255,255,.85);padding:4px 8px;border-radius:8px">Sin señal para el mapa: se muestra un esquema de la ruta.</p>`;
  }
  function sinMosaicos(el) {
    el.classList.add('sinMosaicos');
    if (!el.querySelector('.notaMapa')) { const n = document.createElement('p'); n.className = 'notaMapa'; n.textContent = 'Sin señal para las calles del mapa: se ve la ruta sobre un plano simple.'; el.append(n); }
  }
  function crearMapa(el, m, interactivo) {
    const L = window.L;
    if (!L) { plano(el, m); return null; }
    const mp = L.map(el, { zoomControl: interactivo, attributionControl: true, dragging: interactivo, scrollWheelZoom: interactivo, touchZoom: interactivo, doubleClickZoom: interactivo, boxZoom: false, keyboard: interactivo });
    let fallos = 0;
    const capa = L.tileLayer(C.servicios.mosaicos, { maxZoom: 19, attribution: '© OpenStreetMap · rutas OSRM' }).addTo(mp);
    capa.on('tileerror', () => { if (++fallos === 3) sinMosaicos(el); });
    if (!navigator.onLine) sinMosaicos(el);
    const neg = L.marker([NEG.lat, NEG.lng], { icon: iconoPin('pinNegocio', 'llama'), keyboard: false, title: C.negocio.nombre }).addTo(mp);
    return { mp, neg, cli: null, linea: null, m, fallos: () => fallos };
  }
  function dibujarRuta(reg, m) {
    const L = window.L; reg.m = m;
    if (!reg.mp) { plano(reg.el, m); return; }
    if (reg.linea) reg.linea.remove();
    if (m && m.lat) {
      const pts = m.linea || [[NEG.lat, NEG.lng], [m.lat, m.lng]];
      reg.linea = L.polyline(pts, { color: '#E2572B', weight: 6, opacity: .9, dashArray: m.linea ? null : '2 10', lineCap: 'round' }).addTo(reg.mp);
      if (reg.el.id !== 'mapa') {               // mapa pequeño del pedido: pin del cliente fijo
        if (!reg.fijo) reg.fijo = L.marker([m.lat, m.lng], { icon: iconoPin('pinCliente', 'ubicacion'), keyboard: false }).addTo(reg.mp);
        else reg.fijo.setLatLng([m.lat, m.lng]);
      }
      const caja = L.latLngBounds(pts.concat([[NEG.lat, NEG.lng], [m.lat, m.lng]]));
      const encuadrar = () => {
        reg.mp.invalidateSize();
        const grande = reg.el.id === 'mapa', tarjeta = grande ? (document.querySelector('.mapaTarjeta')?.offsetHeight || 340) : 0;
        reg.mp.fitBounds(caja, grande ? { paddingTopLeft: [40, 100], paddingBottomRight: [40, tarjeta + 30], maxZoom: 17 } : { paddingTopLeft: [30, 64], paddingBottomRight: [30, 30], maxZoom: 17 });
      };
      encuadrar(); setTimeout(encuadrar, 450);
    } else reg.mp.setView([NEG.lat, NEG.lng], 15);
  }
  function mapaEn(id, m, interactivo) {
    const el = document.getElementById(id);
    let reg = mapas[id];
    if (!reg) { const r = crearMapa(el, m, interactivo); reg = mapas[id] = r ? { ...r, el } : { el, mp: null }; }
    setTimeout(() => { if (reg.mp) reg.mp.invalidateSize(); dibujarRuta(reg, m); }, 60);
    return reg;
  }
  function abrirMapa() {
    const m = E.modo && E.modo.tipo === 'domicilio' ? E.modo : { tipo: 'domicilio' };
    if (!m.lat) { const s = D.sesion(); if (s && s.direccion && !$('#mp-direccion').value) $('#mp-direccion').value = s.direccion; }
    else $('#mp-direccion').value = m.direccion && m.direccion !== 'Mi ubicación actual' ? m.direccion : $('#mp-direccion').value;
    $('#mp-indicaciones').value = m.indicaciones || '';
    E.borrador = { ...m };
    const reg = mapaEn('mapa', m.lat ? m : null, true);
    if (reg.mp) {
      const L = window.L;
      if (!reg.cli) {
        reg.cli = L.marker(m.lat ? [m.lat, m.lng] : [NEG.lat - .004, NEG.lng + .004], { draggable: true, icon: iconoPin('pinCliente', 'ubicacion'), title: 'Su dirección' }).addTo(reg.mp);
        reg.cli.on('dragend', async () => { const p = reg.cli.getLatLng(); await moverDestino(p.lat, p.lng, true); });
        reg.mp.on('click', async e => { reg.cli.setLatLng(e.latlng); await moverDestino(e.latlng.lat, e.latlng.lng, true); });
      } else if (m.lat) reg.cli.setLatLng([m.lat, m.lng]);
    }
    pintarDatosRuta(m.lat ? m : null);
  }
  async function moverDestino(lat, lng, inversa) {
    const b = E.borrador = { ...(E.borrador || {}), tipo: 'domicilio', lat, lng, fuente: E.borrador?.fuente || 'manual' };
    $('#mp-datos').innerHTML = '<div style="grid-column:1/-1"><small>Calculando la ruta…</small></div>';
    await calcularRuta(b);
    const reg = mapas.mapa; if (reg && reg.cli) reg.cli.setLatLng([lat, lng]);
    if (reg) dibujarRuta(reg, b);
    pintarDatosRuta(b);
    if (inversa) { b.direccion = $('#mp-direccion').value.trim() || 'Punto marcado en el mapa'; }
  }
  function pintarDatosRuta(m) {
    if (!m || !m.lat) { $('#mp-datos').innerHTML = '<div style="grid-column:1/-1"><small>Busque su dirección, use su ubicación o toque el mapa.</small></div>'; return; }
    const lejos = m.km > C.domicilio.maxKm;
    const t = tarifa(m.km, subtotal());
    $('#mp-datos').innerHTML = `<div><small>Distancia</small><b>${m.km.toFixed(1).replace('.', ',')} km</b></div><div><small>Tiempo</small><b>${m.min} min</b></div><div><small>Domicilio</small><b>${lejos ? 'Fuera' : t.valor ? pesos(t.valor) : 'Gratis'}</b></div>`
      + (m.recta ? '<div style="grid-column:1/-1"><small>Distancia aproximada (sin ruta exacta por ahora).</small></div>' : '')
      + (lejos ? `<div style="grid-column:1/-1"><small>Llevamos hasta ${C.domicilio.maxKm} km. Puede escoger «Recoger».</small></div>` : '');
    $('#b-confirmar-dir').disabled = lejos;
  }
  async function buscarDireccion(txt) {
    if (!txt) return;
    $('#mp-datos').innerHTML = '<div style="grid-column:1/-1"><small>Buscando…</small></div>';
    try {
      const q = /,/.test(txt) ? txt : `${txt}, ${C.negocio.ciudad}`;
      const vb = [NEG.lng - .3, NEG.lat + .3, NEG.lng + .3, NEG.lat - .3].join(',');
      const r = await fetch(`${C.servicios.direcciones}/search?format=jsonv2&limit=1&countrycodes=co&accept-language=es&viewbox=${vb}&q=${encodeURIComponent(q)}`);
      const [hit] = await r.json();
      if (!hit) { $('#mp-datos').innerHTML = '<div style="grid-column:1/-1"><small>No la encontramos. Toque el mapa o mueva el pin hasta su puerta.</small></div>'; return; }
      await moverDestino(Number(hit.lat), Number(hit.lon), false);
      E.borrador.direccion = txt;
    } catch (e) { $('#mp-datos').innerHTML = '<div style="grid-column:1/-1"><small>Sin señal para buscar. Use su ubicación o toque el mapa.</small></div>'; }
  }
  function confirmarDireccion() {
    const b = E.borrador;
    if (!b || !b.lat) { aviso('Marque primero su dirección.'); return; }
    b.direccion = $('#mp-direccion').value.trim() || b.direccion || 'Punto marcado en el mapa';
    b.indicaciones = $('#mp-indicaciones').value.trim();
    E.modo = { ...b, tipo: 'domicilio' }; guardarModo();
    aviso(`Domicilio: ${pesos(tarifa(b.km, subtotal()).valor) === '$ 0' ? 'gratis' : pesos(tarifa(b.km, subtotal()).valor)} · ${b.min} min`);
    atras();
  }

  // ------------------------------------------------------------ pedido
  const PASOS = {
    local: [['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'], ['en_camino', 'Llevándolo a su mesa'], ['entregado', 'Servido. ¡Buen provecho!']],
    recoger: [['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'], ['en_camino', 'Listo para recoger'], ['entregado', 'Entregado']],
    domicilio: [['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'], ['en_camino', 'En camino'], ['entregado', 'Entregado']]
  };
  let ultimoEstado = {};
  async function pedidoActual() { if (!E.pedidoId) return null; try { return await D.pedido(E.pedidoId); } catch (e) { return null; } }
  function textoWhatsApp(p) {
    const lineas = [`Hola, ${C.negocio.nombre}. Pedido *${p.codigo}*`, ''];
    p.items.forEach(it => lineas.push(`• ${it.cant} × ${it.nombre} (${it.detalle}) ${pesos(it.total)}`));
    lineas.push('', `Total: *${pesos(p.totales.total)}* · Pago: ${p.pago.tipo}${p.pago.conCuanto ? ' (paga con ' + pesos(p.pago.conCuanto) + ')' : ''}`);
    if (p.modo === 'domicilio') lineas.push(`Domicilio: ${p.destino.direccion}${p.destino.indicaciones ? ' · ' + p.destino.indicaciones : ''}`, `Mapa: https://www.openstreetmap.org/?mlat=${p.destino.lat}&mlon=${p.destino.lng}#map=18/${p.destino.lat}/${p.destino.lng}`);
    if (p.modo === 'local') lineas.push(`En el local${p.mesa ? ' · mesa ' + p.mesa : ''}`);
    if (p.modo === 'recoger') lineas.push('Para recoger');
    lineas.push(`A nombre de ${p.cliente.nombre} · ${p.cliente.celular}`);
    return lineas.join('\n');
  }
  function enlaceWa(texto) {
    const n = String(C.negocio.whatsapp || '').replace(/\D/g, '');
    if (n.length !== 10) return null;
    return `https://wa.me/57${n}?text=${encodeURIComponent(texto)}`;
  }
  async function pintarPedido() {
    const p = await pedidoActual();
    if (!p) { $('#pd-estado').innerHTML = '<p>No hay un pedido en curso.</p>'; return; }
    ultimoEstado[p.id] = p.estado;
    $('#pd-codigo').textContent = p.codigo;
    const pasos = PASOS[p.modo], k = pasos.findIndex(x => x[0] === p.estado);
    const min = 20 + (p.modo === 'domicilio' ? p.destino.min : 0);
    $('#pd-estado').innerHTML = `<div class="estado"><h3>${esc(pasos[k][1])}</h3><p class="eta">${svg('reloj')} ${p.estado === 'entregado' ? 'Pedido terminado' : `Tiempo estimado: ${min}–${min + 10} min`}</p>
      <ol class="pasos">${pasos.map(([id, n], j) => `<li class="${j < k || p.estado === 'entregado' ? 'hecho' : j === k ? 'actual' : ''}"><span class="pt">${j < k || p.estado === 'entregado' ? svg('check') : ''}</span><span>${esc(n)}</span></li>`).join('')}</ol></div>`;
    const caja = $('#pd-ruta-caja');
    caja.hidden = p.modo !== 'domicilio';
    if (p.modo === 'domicilio') {
      $('#pd-ruta-txt').textContent = `${p.destino.direccion} · ${String(p.destino.km).replace('.', ',')} km · unos ${p.destino.min} min desde ${C.negocio.nombre}.`;
      mapaEn('mapa-pedido', { ...p.destino }, false);
    }
    const tr = C.pagos.transferencia;
    const pagoTxt = { efectivo: `Efectivo${p.pago.conCuanto ? `: paga con ${pesos(p.pago.conCuanto)}, cambio ${pesos(p.pago.cambio)}` : ''}.`,
      transferencia: `Transferencia de ${pesos(p.totales.total)}${tr.llaveBreB ? ' a la llave Bre-B ' + tr.llaveBreB : ''}. Envíe el comprobante por el chat.`,
      tarjeta: tarjetaDisponibleParaModo(p.modo) }[p.pago.tipo];
    $('#pd-pago').innerHTML = `<h3 class="subt" style="margin-top:0">Pago</h3><p style="margin:0">${esc(pagoTxt)}</p>`;
    $('#pd-detalle').innerHTML = `<h3 class="subt" style="margin-top:0">Detalle</h3><ul class="detalle-lista">${p.items.map(it => `<li><span>${it.cant} × ${esc(it.nombre)}<br><small class="mini">${esc(it.detalle)}</small></span><b>${pesos(it.total)}</b></li>`).join('')}
      ${p.totales.empaque ? `<li><span>Empaque</span><b>${pesos(p.totales.empaque)}</b></li>` : ''}${p.modo === 'domicilio' ? `<li><span>Domicilio</span><b>${p.totales.domicilio ? pesos(p.totales.domicilio) : 'Gratis'}</b></li>` : ''}
      <li><span><b>Total</b></span><b>${pesos(p.totales.total)}</b></li></ul>`;
    const wa = enlaceWa(textoWhatsApp(p)), b = $('#b-pd-wa');
    if (wa) b.href = wa; else b.removeAttribute('href');
  }
  function tarjetaDisponibleParaModo(modo) { const g = E.modo; E.modo = { tipo: modo }; const t = tarjetaDisponible().txt; E.modo = g; return 'Tarjeta. ' + t; }

  // ------------------------------------------------------------ chat
  const NOMBRE_ESTADO = { recibido: 'Recibido', confirmado: 'Confirmado', preparando: 'En la cocina', en_camino: 'En camino', entregado: 'Entregado' };
  async function pintarChat(soloNuevos) {
    const p = await pedidoActual();
    $('#ch-negocio').textContent = C.negocio.nombre;
    if (!p) { $('#hilo').innerHTML = '<li class="sistema">Haga un pedido para chatear con el negocio.</li>'; return; }
    $('#ch-estado').textContent = `Pedido ${p.codigo} · ${NOMBRE_ESTADO[p.estado]}`;
    const ms = await D.mensajes(p.id);
    const hilo = $('#hilo');
    if (soloNuevos && hilo.childElementCount - 1 === ms.length) return;
    let dia = '';
    hilo.innerHTML = ms.map(m => {
      const f = new Date(m.creado), d = f.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
      const sep = d !== dia ? `<li class="fecha">${esc(d)}</li>` : ''; dia = d;
      return `${sep}<li class="${m.de}">${esc(m.texto)}<small>${f.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</small></li>`;
    }).join('');
    requestAnimationFrame(() => { hilo.scrollTop = hilo.scrollHeight; });
    const wa = enlaceWa(`Hola, escribo por el pedido ${p.codigo}.`), b = $('#b-chat-wa');
    if (wa) b.href = wa; else b.removeAttribute('href');
  }
  async function enviarChat(txt) {
    txt = txt.trim(); if (!txt) return;
    const p = await pedidoActual(); if (!p) return;
    try { await D.enviarMensaje(p.id, 'cliente', txt); $('#ch-txt').value = ''; pintarChat(); }
    catch (e) { aviso('No se envió. Revise la señal.'); }
  }

  // ------------------------------------------------------------ perfil
  async function pintarPerfil() {
    const s = D.sesion();
    if (!s) { $('#pf-datos').innerHTML = '<p>No ha ingresado.</p>'; $('#pf-pedidos').innerHTML = ''; return; }
    $('#pf-datos').innerHTML = `<div class="datos-perfil"><b>${esc(s.nombre)}</b><span>${esc(s.celular)} · ${esc(s.correo)}</span><span class="mini">${esc(s.direccion || 'Sin dirección habitual')}</span>
      <span class="mini">Modo de datos: ${D.modo === 'demo' ? 'demostración (solo este teléfono)' : 'en la nube'}</span></div>`;
    const ps = await D.misPedidos().catch(() => []);
    $('#pf-pedidos').innerHTML = ps.length ? ps.map(p => `<li><button type="button" data-ver-pedido="${p.id}"><span><b>${esc(p.codigo)}</b><small>${new Date(p.creado).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })} · ${pesos(p.totales.total)}</small></span><span class="etiqueta ${p.estado === 'entregado' ? 'verde' : ''}">${NOMBRE_ESTADO[p.estado]}</span></button></li>`).join('')
      : '<li class="mini" style="padding:0 4px">Aún no tiene pedidos.</li>';
  }

  // ------------------------------------------------------------ cambios desde el negocio
  D.escuchar(async () => {
    const v = actual();
    if (v === 'pedido' || v === 'chat') {
      const p = await pedidoActual();
      if (p && ultimoEstado[p.id] && ultimoEstado[p.id] !== p.estado) {
        aviso(`Su pedido: ${NOMBRE_ESTADO[p.estado]}`);
        if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) { /* nada */ }
      }
      if (p) ultimoEstado[p.id] = p.estado;
      if (v === 'pedido') pintarPedido(); else pintarChat(true);
    }
  });

  // ------------------------------------------------------------ eventos
  function enganchar() {
    $('#b-ver-menu').addEventListener('click', () => ir('menu'));
    $('#b-ir-ingresar').addEventListener('click', () => { E.volverTrasCuenta = false; pestana('ingresar'); ir('cuenta'); });
    $('#b-ir-registro').addEventListener('click', () => { E.volverTrasCuenta = false; pestana('registro'); ir('cuenta'); });
    $('#v-bienvenida').addEventListener('click', e => { if (e.target.closest('#b-ir-perfil')) ir('perfil'); });
    $('#tab-ingresar').addEventListener('click', () => pestana('ingresar'));
    $('#tab-registro').addEventListener('click', () => pestana('registro'));
    $('#f-ingresar').addEventListener('submit', async e => {
      e.preventDefault(); const n = $('#in-nota'); n.textContent = '';
      try { trasEntrar(await D.ingresar($('#in-usuario').value, $('#in-clave').value)); } catch (er) { n.textContent = er.message; }
    });
    $('#f-registro').addEventListener('submit', async e => {
      e.preventDefault(); const n = $('#rg-nota'); n.textContent = '';
      try {
        trasEntrar(await D.registrar({ nombre: $('#rg-nombre').value, celular: $('#rg-celular').value.replace(/\D/g, ''), correo: $('#rg-correo').value, clave: $('#rg-clave').value, direccion: $('#rg-direccion').value }));
      } catch (er) { n.textContent = er.message; }
    });

    // menú
    $('#b-menu-atras').addEventListener('click', atras);
    $('#b-ant').addEventListener('click', () => mover(-1));
    $('#b-sig').addEventListener('click', () => mover(1));
    $('#puntos').addEventListener('click', e => { const b = e.target.closest('[data-punto]'); if (!b) return; const k = +b.dataset.punto; if (k !== E.i) { const dir = k > E.i ? 1 : -1; E.i = k; E.arma = nuevaArma(); pintarPlato(dir); } });
    $('#b-agregar').addEventListener('click', () => abrirEtapa('receta'));
    $('#b-receta').addEventListener('click', () => abrirEtapa('receta'));
    $('#b-hoja').addEventListener('click', siguienteEtapa);
    $('#b-bolsa').addEventListener('click', () => { if (!E.carrito.length) { aviso('Aún no ha agregado platos.'); return; } ir('resumen'); });
    $('#b-chip-modo').addEventListener('click', abrirModo);
    $('#hoja-lista').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ingr) { const id = b.dataset.ingr; E.arma.quitados.has(id) ? E.arma.quitados.delete(id) : E.arma.quitados.add(id); }
      if (b.dataset.salsa) { const id = b.dataset.salsa; E.arma.salsas.has(id) ? E.arma.salsas.delete(id) : E.arma.salsas.add(id); }
      if (b.dataset.beb) { const id = b.dataset.beb, c = Math.max(0, Math.min(9, (E.arma.bebidas.get(id) || 0) + +b.dataset.d)); c ? E.arma.bebidas.set(id, c) : E.arma.bebidas.delete(id); }
      refrescarEtapa();
    });
    document.addEventListener('keydown', e => {
      if (actual() !== 'menu' || e.target.closest('input')) return;
      if (e.key === 'ArrowRight') mover(1); if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowUp' && E.etapa === 'carrusel') abrirEtapa('receta');
      if (e.key === 'Escape' && E.etapa !== 'carrusel') etapaAnterior();
    });

    // modal de modo
    $('#b-md-ubicar').addEventListener('click', decidirPorUbicacion);
    $('#b-md-cerrar').addEventListener('click', cerrarModo);
    $('#velo-modo').addEventListener('click', e => { if (e.target.id === 'velo-modo') cerrarModo(); });
    $$('.opcModo button').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.elegir; elegirModo(t);
      $$('.opcModo button').forEach(x => x.classList.toggle('sugerido', x === b));
      if (t === 'local') { $('#md-mesa-caja').hidden = false; $('#md-mesa').focus(); return; }
      cerrarModo();
      if (t === 'domicilio' && !E.modo.lat) ir('mapa');
    }));
    $('#md-mesa').addEventListener('input', () => { if (E.modo && E.modo.tipo === 'local') { E.modo.mesa = $('#md-mesa').value.replace(/\D/g, '').slice(0, 3); guardarModo(); } });

    // resumen
    $('#res-modos').addEventListener('click', e => {
      const b = e.target.closest('[data-modo]'); if (!b) return; elegirModo(b.dataset.modo);
      pintarChip(); pintarResumen();
      if (b.dataset.modo === 'domicilio' && !E.modo.lat) ir('mapa');
    });
    $('#res-destino').addEventListener('click', e => {
      if (e.target.closest('#b-res-ruta')) ir('mapa');
      if (e.target.closest('#b-res-ubicar') || e.target.closest('#b-res-mesa')) abrirModo();
    });
    $('#res-items').addEventListener('click', e => {
      const b = e.target.closest('[data-item]'); if (!b) return; const k = +b.dataset.item, it = E.carrito[k];
      it.cant += +b.dataset.d; if (it.cant <= 0) E.carrito.splice(k, 1);
      guardarCarrito(); pintarInsignia(); pintarResumen();
    });
    $('#res-pagos').addEventListener('click', e => {
      const b = e.target.closest('[data-pago]'); if (!b) return;
      if (b.getAttribute('aria-disabled') === 'true') { aviso(b.dataset.pago === 'tarjeta' ? tarjetaDisponible().txt : 'Esta forma de pago no está activa.'); return; }
      E.pago.tipo = b.dataset.pago; pintarPagos();
    });
    $('#res-pago-detalle').addEventListener('input', e => {
      if (e.target.id !== 'pg-con') return; E.pago.conCuanto = e.target.value;
      const cc = Number(e.target.value.replace(/\D/g, '')) || 0, t = totales().total;
      $('#pg-cambio').innerHTML = cc ? (cc >= t ? 'Cambio: <b>' + pesos(cc - t) + '</b>' : 'Le faltan ' + pesos(t - cc)) : 'Opcional.';
    });
    $('#res-pago-detalle').addEventListener('click', async e => {
      const b = e.target.closest('[data-copiar]'); if (!b) return;
      try { await navigator.clipboard.writeText(b.dataset.copiar); aviso('Copiado.'); } catch (er) { aviso('No se pudo copiar: selecciónelo a mano.'); }
    });
    $('#res-nota').addEventListener('input', e => { E.nota = e.target.value; });
    const otro = () => volverA('menu');
    $('#b-otro').addEventListener('click', otro); $('#b-otro2').addEventListener('click', otro);
    $('#b-pedir').addEventListener('click', hacerPedido);

    // mapa
    $('#f-direccion').addEventListener('submit', e => { e.preventDefault(); buscarDireccion($('#mp-direccion').value.trim()); });
    $('#b-mi-ubicacion').addEventListener('click', async () => {
      try { const u = await ubicar(); await moverDestino(u.lat, u.lng, false); E.borrador.direccion = 'Mi ubicación actual'; E.borrador.fuente = 'gps'; direccionInversa(E.borrador); }
      catch (er) { aviso(er.message, 4500); }
    });
    $('#b-confirmar-dir').addEventListener('click', confirmarDireccion);

    // pedido y chat
    $('#b-pedido-atras').addEventListener('click', () => volverA('menu'));
    $('#b-pedido-chat').addEventListener('click', () => ir('chat'));
    $('#b-pd-chat').addEventListener('click', () => ir('chat'));
    $('#b-pd-wa').addEventListener('click', e => { if (!e.currentTarget.getAttribute('href')) { e.preventDefault(); aviso('El negocio aún no registra su WhatsApp. Use el chat.'); } });
    $('#b-chat-wa').addEventListener('click', e => { if (!e.currentTarget.getAttribute('href')) { e.preventDefault(); aviso('El negocio aún no registra su WhatsApp.'); } });
    $('#f-chat').addEventListener('submit', e => { e.preventDefault(); enviarChat($('#ch-txt').value); });
    $('#ch-rapidas').addEventListener('click', e => { const b = e.target.closest('[data-rapido]'); if (b) enviarChat(b.dataset.rapido); });

    // perfil
    $('#pf-pedidos').addEventListener('click', e => { const b = e.target.closest('[data-ver-pedido]'); if (!b) return; E.pedidoId = b.dataset.verPedido; LS.set('myr_ultimo_pedido', E.pedidoId); ir('pedido'); });
    $('#b-salir').addEventListener('click', () => { D.salir(); aviso('Sesión cerrada.'); volverA('bienvenida'); });
    $('#b-borrar-cuenta').addEventListener('click', async () => {
      if (!confirm('¿Borrar su cuenta, sus pedidos y su chat de este teléfono? No se puede deshacer.')) return;
      await D.borrarCuenta(); E.carrito = []; E.pedidoId = null; LS.del('myr_ultimo_pedido'); aviso('Datos borrados.'); volverA('bienvenida');
    });
  }

  // ------------------------------------------------------------ arranque
  function leerQR() {
    const q = new URLSearchParams(location.search);
    const mesa = (q.get('mesa') || '').replace(/\D/g, '').slice(0, 3);
    if (mesa) { E.modo = { tipo: 'local', mesa, fuente: 'qr' }; guardarModo(); history.replaceState({ i: 0 }, '', location.pathname); return mesa; }
    return null;
  }
  async function iniciar() {
    history.replaceState({ i: 0 }, '');
    const mesa = leerQR();
    pintarPuntos(); pintarPlato(0); gestos(); enganchar(); pintarBienvenida(); pintarInsignia(); pintarChip();
    await apertura();
    if (mesa) { aviso(`Mesa ${mesa}: su pedido llega a la mesa, sin domicilio.`, 4500); ir('menu'); }
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !ROBOT) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  // para las pruebas automáticas
  window.__MYR = { E, totales, tarifa, distanciaKm, calcularRuta };
})();
