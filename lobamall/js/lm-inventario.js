/* LobaMall v7 · INVENTARIO CON FOTO PROFESIONAL Y CÓDIGO QR (para TODOS los tipos de negocio)
   1. Cada producto recibe un código corto (RC-0012) apenas se crea.
   2. Se le toma la foto profesional (la toma el equipo de LobaMall o el dueño).
   3. Al terminar el inventario se imprimen las etiquetas: QR + código de barras + código escrito.
   4. Cualquiera la lee: con la cámara del celular (sin instalar nada), con el escáner de la app,
      con una cámara USB en el computador, con un lector de códigos USB, o escribiendo el código. */
(function () {
  'use strict';
  const LM = window.LM, API = LM.api;
  const { esc, ic, pesos, toast, sheet, closeModal } = LM;
  const $ = s => document.querySelector(s);
  const ses = () => LM.S.session;
  const esStaff = tid => { const s = ses(); return !!(s && s.t && (!tid || s.t === tid)); };

  /* =================== CÓDIGOS =================== */
  const prefijo = t => String(t.ini || t.n || 'XX').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(2, 'X');
  // Los productos de ejemplo reciben siempre el mismo código en todos los celulares (por orden)
  LM.codigoDe = function (p) {
    if (p.cod) return p.cod;
    const t = LM.T(p.t); if (!t) return '';
    const N = LM.NEG(t.id), pre = prefijo(t);
    const usados = LM.S.prods.filter(x => x.t === t.id && x.cod).map(x => +x.cod.split('-')[1] || 0);
    if (!N.consec) N.consec = Math.max(0, ...usados);
    LM.S.prods.filter(x => x.t === t.id && !x.cod).forEach(x => { N.consec++; x.cod = pre + '-' + String(N.consec).padStart(4, '0'); });
    LM.save();
    return p.cod;
  };
  // Lee lo que llegue de una cámara, un lector USB o lo que la persona escriba.
  // Tolera teclados mal configurados (un lector en inglés con Windows en español escribe RC'0012 o RC?0012).
  LM.leerCodigo = function (texto) {
    const s = String(texto || '').toUpperCase();
    const m = s.match(/([A-Z]{2,3})[^A-Z0-9]{0,2}(\d{4})(?!\d)/g);
    if (!m) return null;
    const ult = m[m.length - 1].match(/([A-Z]{2,3})[^A-Z0-9]{0,2}(\d{4})/);
    return ult[1] + '-' + ult[2];
  };
  const urlQR = cod => location.origin + location.pathname.replace(/index\.html$/, '') + '#q-' + cod;
  const local = cod => LM.S.prods.find(p => LM.codigoDe(p) === cod);

  /* =================== QR (qrcode-generator, MIT) y CÓDIGO DE BARRAS 128 =================== */
  LM.qrSVG = function (texto, px) {
    if (!window.qrcode) return '<span class="lm-qr-falta">QR</span>';
    const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
    const n = q.getModuleCount(); let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += 'M' + x + ' ' + y + 'h1v1h-1z';
    // margen blanco de 4 módulos (lo que pide la norma del QR) para que lo lea cualquier celular
    return '<svg class="lm-qr" viewBox="-4 -4 ' + (n + 8) + ' ' + (n + 8) + '" width="' + (px || 120) + '" height="' + (px || 120) + '" role="img" aria-label="Código QR"><rect x="-4" y="-4" width="' + (n + 8) + '" height="' + (n + 8) + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  };
  // Code 128 B: lo leen los lectores USB baratos (de línea roja) que no leen QR.
  const W128 = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
  LM.code128 = function (texto) {
    const v = [104]; let suma = 104;
    [...String(texto)].forEach((c, i) => { const k = c.charCodeAt(0) - 32; if (k < 0 || k > 95) return; v.push(k); suma += k * (i + 1); });
    v.push(suma % 103, 106);
    return v.map(k => W128[k]).join('');
  };
  LM.barrasSVG = function (texto, alto) {
    const w = LM.code128(texto); let x = 10, d = '', barra = true;
    for (const c of w) { const n = +c; if (barra) d += 'M' + x + ' 0h' + n + 'v' + (alto || 40) + 'h-' + n + 'z'; x += n; barra = !barra; }
    return '<svg class="lm-barras" viewBox="0 0 ' + (x + 10) + ' ' + (alto || 40) + '" preserveAspectRatio="none" role="img" aria-label="Código de barras ' + esc(texto) + '"><rect width="' + (x + 10) + '" height="' + (alto || 40) + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  };

  /* =================== FICHA AL ESCANEAR (#q-CODIGO) =================== */
  async function vFicha(cod) {
    const app = $('#app');
    let p = local(cod), srv = null;
    app.innerHTML = '<div class="lm-wrap"><div class="lm-card lm-centro"><div class="lm-spin"></div><p>Buscando ' + esc(cod) + '…</p></div></div>';
    if (API.disponible) { try { srv = (await API.get('/api/productos/codigo/' + encodeURIComponent(cod))).producto; } catch (e) {} }
    if (!p && srv) p = LM.PR(srv.id);
    if (!p && !srv) { app.innerHTML = '<div class="lm-wrap"><div class="lm-card lm-centro">' + ic('alert') + '<h1>No encontramos ' + esc(cod) + '</h1><p class="lm-grande">Revisa que el código esté bien escrito o pregúntale a alguien del negocio.</p>' + buscadorH(cod) + '<button class="btn lm-btn-xl" type="button" data-act="go" data-h="escanear">' + ic('scan') + 'Escanear otro</button></div></div>'; LM.paint(app); return; }
    const t = p ? LM.T(p.t) : null;
    const n = p ? p.n : srv.nombre, precio = p ? LM.precio(p) : { p: srv.precio, old: 0 };
    const foto = (srv && srv.foto) || (p && (p.fotoSrv || p.fotoMini)) || null;
    const ubic = (p && p.ubic) || (srv && srv.ubicacion);
    const stock = p ? p.stock : srv.stock, attrs = Object.assign({}, srv && srv.atributos, p && p.attrs);
    const staff = p && esStaff(p.t);
    app.innerHTML = '<div class="lm-wrap lm-ficha"><article class="lm-card">' +
      '<div class="lm-ficha-foto">' + (foto ? '<img src="' + esc(foto) + '" alt="' + esc(n) + '">' : (p ? '<span class="art-p" style="--c:' + LM.tc(t) + '">' + ic(p.i) + '</span>' : ic('box'))) + '</div>' +
      '<p class="lm-ficha-cod">' + ic('scan') + esc(cod) + '</p><h1>' + esc(n) + '</h1>' +
      '<p class="lm-ficha-precio num">' + pesos(precio.p) + (precio.old ? ' <s>' + pesos(precio.old) + '</s>' : '') + '</p>' +
      (ubic ? '<div class="lm-donde">' + ic('pin') + '<span><small>Dónde está</small><b>' + esc(ubic) + '</b></span></div>' : '') +
      '<p class="lm-grande">' + (stock > 0 ? ic('check') + ' Hay ' + (stock >= 999 ? 'disponible' : stock + ' disponibles') : ic('alert') + ' Agotado por ahora') + '</p>' +
      (Object.keys(attrs).length ? '<dl class="lm-dl">' + Object.keys(attrs).filter(k => attrs[k]).map(k => '<dt>' + esc(k) + '</dt><dd>' + esc(attrs[k]) + '</dd>').join('') + '</dl>' : '') +
      ((p && p.d) || (srv && srv.descripcion) ? '<p>' + esc((p && p.d) || srv.descripcion) + '</p>' : '') +
      '<p class="muted">' + ic('tienda') + esc(t ? t.n : srv.negocio) + '</p>' +
      '<div class="lm-botones">' +
      (staff ? '<form class="lm-vender" data-form="inv-vender" data-id="' + esc(p.id) + '"><label>Cantidad <input name="q" type="number" min="1" value="1"></label><select name="m" aria-label="Forma de pago"><option value="efectivo">Efectivo</option><option value="nequi">Nequi</option><option value="fiado">Fiado</option></select><button class="btn b-monte lm-btn-xl" type="submit">' + ic('cash') + 'VENDER</button></form>' : '') +
      (p && !staff && stock > 0 ? '<button class="btn b-sol lm-btn-xl" type="button" data-act="inv-carrito" data-id="' + esc(p.id) + '">' + ic('cart') + 'AGREGAR AL CARRITO</button>' : '') +
      (p ? '<button class="btn lm-btn-xl" type="button" data-act="go" data-h="p-' + esc(p.id) + '">' + ic('eye') + 'Ver en la tienda</button>' : '') +
      '<button class="btn lm-btn-xl" type="button" data-act="go" data-h="escanear">' + ic('scan') + 'Escanear otro</button></div></article></div>';
    LM.paint(app);
  }
  const buscadorH = v => '<form class="lm-buscar-cod" data-form="inv-buscar"><label for="ibQ">Escribe el código, el nombre o la categoría</label><div class="inline"><input id="ibQ" name="q" value="' + esc(v || '') + '" placeholder="RC-0012 o arroz" autocomplete="off" enterkeyhint="search"><button class="btn b-sol" type="submit">' + ic('search') + 'Buscar</button></div></form>';
  LM.F['inv-buscar'] = async (f, d) => {
    const q = String(d.get('q') || '').trim(); if (!q) return;
    const cod = LM.leerCodigo(q); if (cod) { LM.go('q-' + cod); return; }
    const s = q.toLowerCase(), s0 = ses();
    let ls = LM.S.prods.filter(p => (!s0 || !s0.t || p.t === s0.t) && (p.n.toLowerCase().includes(s) || (p.sub || '').toLowerCase().includes(s) || (p.ubic || '').toLowerCase().includes(s))).slice(0, 20);
    const box = document.getElementById('lmRes') || f.insertAdjacentElement('afterend', Object.assign(document.createElement('div'), { id: 'lmRes' }));
    box.className = 'lm-res';
    box.innerHTML = ls.length ? ls.map(p => '<button type="button" class="lm-res-it" data-act="go" data-h="q-' + LM.codigoDe(p) + '"><b>' + esc(p.n) + '</b><span>' + esc(LM.codigoDe(p)) + ' · ' + pesos(p.p) + (p.ubic ? ' · ' + esc(p.ubic) : '') + '</span></button>').join('') : '<p class="muted">No encontramos nada con "' + esc(q) + '".</p>';
    LM.paint(box);
  };
  LM.A['inv-carrito'] = el => { if (LM.addCart) LM.addCart(el.dataset.id, 1); };
  LM.F['inv-vender'] = (f, d) => {
    const p = LM.PR(f.dataset.id), t = LM.T(p.t), N = LM.NEG(t.id), q = Math.max(1, +d.get('q') || 1), v = LM.precio(p).p * q, s = ses();
    N.ventas.push({ h: LM.hora(), d: p.n + (q > 1 ? ' x' + q : '') + ' (escaneado)', v, m: d.get('m') || 'efectivo', o: 'mostrador', por: s.u });
    LM.logN(t.id, 'Vendió con el escáner: ' + p.n + ' x' + q + ' ' + pesos(v));
    p.stock = Math.max(0, p.stock - q); p.v += q; LM.save(); LM.sonar(); toast('Vendido ' + pesos(v) + '. Quedó en la caja del día.');
    vFicha(LM.codigoDe(p));
  };

  /* =================== ESCÁNER CON CÁMARA (#escanear) =================== */
  const ESC = { stream: null, timer: null, detector: null, usandoJsQR: false };
  function pararCamara() { clearInterval(ESC.timer); ESC.timer = null; if (ESC.stream) { ESC.stream.getTracks().forEach(t => t.stop()); ESC.stream = null; } }
  async function detectorListo() {
    if (ESC.detector) return ESC.detector;
    try {
      if ('BarcodeDetector' in window) {
        const fm = await window.BarcodeDetector.getSupportedFormats();
        if (fm.includes('qr_code')) { ESC.detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128'].filter(x => fm.includes(x)) }); return ESC.detector; }
      }
    } catch (e) {}
    // Celulares sin lector propio: se descarga jsQR solo ahora (130 KB, una vez)
    await new Promise((ok, mal) => { if (window.jsQR) return ok(); const s = document.createElement('script'); s.src = 'js/vendor/jsQR.min.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
    ESC.usandoJsQR = true;
    ESC.detector = { detect: async c => { const g = c.getContext('2d', { willReadFrequently: true }); const im = g.getImageData(0, 0, c.width, c.height); const r = window.jsQR(im.data, im.width, im.height, { inversionAttempts: 'dontInvert' }); return r ? [{ rawValue: r.data }] : []; } };
    return ESC.detector;
  }
  function vEscanear() {
    const app = $('#app');
    app.innerHTML = '<div class="lm-wrap lm-escaner"><section class="lm-card"><h1>' + ic('scan') + 'Escanear un producto</h1>' +
      '<div class="lm-video"><video id="lmVid" playsinline muted></video><span class="lm-marco"></span><p id="lmEstado" class="lm-estado">Toca <b>ABRIR LA CÁMARA</b></p></div>' +
      '<div class="lm-botones"><button class="btn b-sol lm-btn-xl" type="button" data-act="esc-abrir">' + ic('camera') + 'ABRIR LA CÁMARA</button><button class="btn" type="button" data-act="esc-luz" id="lmLuz" hidden>' + ic('sol') + 'Linterna</button></div>' +
      buscadorH('') +
      LM.ayuda('Otras formas de leer el código', ['Con la <b>cámara normal del celular</b> (sin abrir LobaMall): apunta al QR y toca el enlace que aparece.', 'En el computador, con una <b>cámara USB</b>: presiona ABRIR LA CÁMARA y acerca la etiqueta.', 'Con un <b>lector de códigos USB</b> (pistola): conéctalo y dispara a la etiqueta en cualquier pantalla de LobaMall. Lee el QR o las barras.', 'O escribe el código que está debajo del QR, por ejemplo <b>RC-0012</b>.'], true) +
      '</section></div>';
    LM.paint(app);
  }
  LM.A['esc-abrir'] = async () => {
    const est = $('#lmEstado'), vid = $('#lmVid');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { est.innerHTML = 'Este navegador no deja usar la cámara. Escribe el código abajo.'; return; }
    if (!isSecureContext) { est.innerHTML = 'La cámara solo funciona con el enlace seguro (https).'; return; }
    try {
      est.textContent = 'Pidiendo permiso para la cámara…';
      ESC.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      vid.srcObject = ESC.stream; await vid.play();
      const tr = ESC.stream.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
      if (cap.torch) $('#lmLuz').hidden = false;
      const det = await detectorListo();
      est.textContent = 'Apunta al código QR o de barras' + (ESC.usandoJsQR ? ' (QR)' : '');
      const c = document.createElement('canvas');
      ESC.timer = setInterval(async () => {
        if (!vid.videoWidth) return;
        const k = Math.min(1, 640 / vid.videoWidth); c.width = vid.videoWidth * k; c.height = vid.videoHeight * k;
        c.getContext('2d', { willReadFrequently: true }).drawImage(vid, 0, 0, c.width, c.height);
        try {
          const r = await det.detect(ESC.usandoJsQR ? c : c);
          const cod = r && r[0] && LM.leerCodigo(r[0].rawValue);
          if (cod) { pararCamara(); LM.sonar(); if (navigator.vibrate) navigator.vibrate(80); LM.go('q-' + cod); }
        } catch (e) {}
      }, 220);
    } catch (e) {
      est.innerHTML = e && e.name === 'NotAllowedError' ? 'No diste permiso para la cámara. Tócale al candado de la barra de direcciones → Cámara → Permitir.' : e && e.name === 'NotFoundError' ? 'No encontramos una cámara. Conecta una cámara USB o usa el lector o el buscador.' : 'No se pudo abrir la cámara. Escribe el código abajo.';
    }
  };
  LM.A['esc-luz'] = async () => { try { const tr = ESC.stream.getVideoTracks()[0]; ESC.luz = !ESC.luz; await tr.applyConstraints({ advanced: [{ torch: ESC.luz }] }); } catch (e) {} };

  /* =================== LECTOR USB (funciona como un teclado muy rápido) =================== */
  let buf = '', ult = 0;
  document.addEventListener('keydown', e => {
    const ahora = Date.now(), enCampo = /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) && e.target.id !== 'q';
    if (ahora - ult > 150) buf = ''; // un lector escribe en milisegundos; una persona, más despacio
    ult = ahora;
    if (e.key === 'Enter') {
      const cod = buf.length >= 6 ? LM.leerCodigo(buf) : null; buf = '';
      if (cod && !enCampo) { e.preventDefault(); e.stopPropagation(); LM.closeModal(); LM.go('q-' + cod); }
      return;
    }
    if (e.key.length === 1) buf += e.key;
  }, true);
  // Si escriben o "disparan" un código en el buscador de la tienda, abre el producto
  LM.EXT.buscarCodigo = q => {
    const t = String(q || '').trim().toUpperCase(), cod = LM.leerCodigo(t);
    // Solo si lo escrito ES un código (RC-0012) o el enlace de un QR; "arroz 1000" sigue siendo una búsqueda normal
    if (cod && (/^[A-Z]{2,3}[^A-Z0-9]{0,2}\d{4}$/.test(t) || /#Q-|HTTP/.test(t))) { LM.go('q-' + cod); return true; }
    return false;
  };

  /* =================== SECCIÓN DEL PANEL: INVENTARIO Y ETIQUETAS =================== */
  const IV = { filtro: 'todos', sel: new Set(), formato: 'carta', q: '' };
  function pEtiquetas(t, N) {
    const ps = LM.S.prods.filter(p => p.t === t.id);
    ps.forEach(LM.codigoDe);
    const sinFoto = ps.filter(p => !(p.fotoSrv || p.fotoMini));
    const sinImp = ps.filter(p => !p.impreso);
    const q = IV.q.toLowerCase();
    let ls = IV.filtro === 'foto' ? sinFoto : IV.filtro === 'imprimir' ? sinImp : ps;
    if (q) ls = ls.filter(p => (p.n + ' ' + p.cod + ' ' + (p.sub || '') + ' ' + (p.ubic || '')).toLowerCase().includes(q));
    const conectado = API.disponible && API.yo && API.esDeNegocio(t.id);
    setTimeout(() => sincronizar(t), 0);
    return LM.head('Inventario y etiquetas QR', 'Cada producto con su foto, su código y su etiqueta para pegar.') +
      LM.ayuda('Paso a paso: inventario con QR', ['Presiona <b>AGREGAR PRODUCTO CON FOTO Y QR</b>.', 'Escribe el nombre, el precio, cuántos hay y <b>dónde está en el local</b>.', 'El equipo de LobaMall toma la <b>foto profesional</b> (fondo blanco, buena luz). Si no está, puedes dejarla pendiente.', 'Se crea solo el <b>código QR</b> del producto.', 'Cuando termines todo el inventario, presiona <b>IMPRIMIR ETIQUETAS</b> y pega cada una en su producto.', 'Para buscar un producto: escanéalo con el celular, con el lector USB, o escribe el código.'], !ps.some(p => p.impreso)) +
      '<div class="quick"><button class="btn b-sol lm-btn-xl" type="button" data-act="inv-nuevo">' + ic('plus') + 'AGREGAR PRODUCTO CON FOTO Y QR</button><button class="btn lm-btn-xl" type="button" data-act="go" data-h="escanear">' + ic('scan') + 'ESCANEAR</button></div>' +
      '<div class="lm-kpis"><div><small>Productos</small><b>' + ps.length + '</b></div><div><small>Sin foto profesional</small><b>' + sinFoto.length + '</b></div><div><small>Etiquetas por imprimir</small><b>' + sinImp.length + '</b></div></div>' +
      (!conectado ? '<div class="aviso">' + ic('wifioff') + '<span>Los códigos funcionan en este celular. Para que cualquier cliente pueda escanearlos desde su teléfono, conecta el negocio con el servidor (se suben solos).</span></div>' : '') +
      '<div class="box"><div class="tabs">' + [['todos', 'Todos (' + ps.length + ')'], ['foto', 'Sin foto (' + sinFoto.length + ')'], ['imprimir', 'Por imprimir (' + sinImp.length + ')']].map(x => '<button type="button" aria-selected="' + (IV.filtro === x[0]) + '" data-act="inv-filtro" data-f="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<form class="inline" data-form="inv-q"><input name="q" value="' + esc(IV.q) + '" placeholder="Buscar por nombre, código, categoría o lugar" aria-label="Buscar en el inventario"><button class="btn b-sm" type="submit">' + ic('search') + '</button></form>' +
      '<div class="lm-inv">' + ls.map(p => '<div class="lm-inv-it"><label class="lm-ck"><input type="checkbox" data-chg="inv-sel" data-id="' + esc(p.id) + '"' + (IV.sel.has(p.id) ? ' checked' : '') + ' aria-label="Seleccionar ' + esc(p.n) + '"></label>' +
        '<button class="lm-inv-qr" type="button" data-act="inv-qr" data-id="' + esc(p.id) + '" aria-label="Ver QR grande">' + LM.qrSVG(urlQR(p.cod), 64) + '</button>' +
        '<div class="lm-inv-d"><b>' + esc(p.n) + '</b><span class="lm-cod">' + esc(p.cod) + '</span><span>' + pesos(p.p) + ' · ' + (p.stock >= 999 ? 'servicio' : p.stock + ' und') + ' · ' + esc(p.sub || '') + '</span>' +
        '<label class="lm-ubic">' + ic('pin') + '<input value="' + esc(p.ubic || '') + '" placeholder="¿Dónde está? Ej: Estante 2" data-chg="inv-ubic" data-id="' + esc(p.id) + '" aria-label="Dónde está ' + esc(p.n) + '"></label></div>' +
        '<div class="lm-inv-f">' + ((p.fotoSrv || p.fotoMini) ? '<img src="' + esc(p.fotoSrv || p.fotoMini) + '" alt="">' : '<span class="pill p-warn">Falta foto</span>') + '<label class="btn b-sm">' + ic('camera') + ((p.fotoSrv || p.fotoMini) ? 'Cambiar' : 'Tomar foto') + '<input type="file" accept="image/*" capture="environment" data-chg="inv-foto" data-id="' + esc(p.id) + '" hidden></label>' + (p.impreso ? '<span class="pill p-ok">' + ic('check') + 'Impresa</span>' : '') + '</div></div>').join('') + (ls.length ? '' : '<p class="muted">No hay productos aquí.</p>') + '</div></div>' +
      '<div class="box lm-imprimir"><h3>' + ic('printer') + 'Imprimir etiquetas</h3><div class="quick"><button class="btn b-sm" type="button" data-act="inv-selfalt">Seleccionar las ' + sinImp.length + ' que faltan</button><button class="btn b-sm" type="button" data-act="inv-seltodo">Seleccionar todas</button><button class="btn b-sm b-ghost" type="button" data-act="inv-selnada">Quitar selección</button></div>' +
      '<div class="opts c2">' + [['carta', 'Hoja carta', '21 etiquetas por hoja (3 × 7)'], ['rollo', 'Rollo térmico 50 × 30 mm', 'Una etiqueta por cada producto']].map(x => '<label class="opt"><input type="radio" name="fmt" value="' + x[0] + '" data-chg="inv-fmt"' + (IV.formato === x[0] ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></label>').join('') + '</div>' +
      '<button class="btn b-tinta lm-btn-xl" type="button" data-act="inv-imprimir">' + ic('printer') + 'IMPRIMIR ' + (IV.sel.size || 'LAS') + ' ETIQUETA' + (IV.sel.size === 1 ? '' : 'S') + '</button><p class="muted">Cada etiqueta trae el QR (cámara del celular o lector 2D), el código de barras (lector USB común) y el código escrito.</p></div>';
  }
  LM.EXT.panelFn.etiquetas = pEtiquetas;
  const _items = LM.EXT.panelItems;
  LM.EXT.panelItems = (items, t, caj) => {
    items = _items(items, t, caj);
    const i = items.findIndex(x => x[0] === 'inventario');
    const n = LM.S.prods.filter(p => p.t === t.id && !p.impreso).length;
    items.splice(i >= 0 ? i + 1 : items.length, 0, ['etiquetas', 'scan', 'Inventario y QR', n || undefined]);
    return items;
  };

  const A = LM.A, F = LM.F;
  A['inv-filtro'] = el => { IV.filtro = el.dataset.f; LM.rerender(); };
  F['inv-q'] = (f, d) => { IV.q = String(d.get('q') || ''); LM.rerender(); };
  A['inv-seltodo'] = () => { LM.S.prods.filter(p => p.t === ses().t).forEach(p => IV.sel.add(p.id)); LM.rerender(); };
  A['inv-selfalt'] = () => { IV.sel.clear(); LM.S.prods.filter(p => p.t === ses().t && !p.impreso).forEach(p => IV.sel.add(p.id)); LM.rerender(); };
  A['inv-selnada'] = () => { IV.sel.clear(); LM.rerender(); };
  A['inv-qr'] = el => {
    const p = LM.PR(el.dataset.id);
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(p.cod) + '</small><h3>' + esc(p.n) + '</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><div class="sh-b lm-centro">' + LM.qrSVG(urlQR(p.cod), 240) + '<div class="lm-barras-w">' + LM.barrasSVG(p.cod, 50) + '</div><p class="lm-cod-g">' + esc(p.cod) + '</p><p class="muted">Pruébalo: apunta la cámara de otro celular a este QR.</p></div><div class="sh-f"><button class="btn b-tinta" type="button" data-act="inv-imp1" data-id="' + esc(p.id) + '">' + ic('printer') + 'Imprimir solo esta</button></div>');
  };
  A['inv-imp1'] = el => { closeModal(); imprimir([LM.PR(el.dataset.id)]); };
  A['inv-imprimir'] = () => {
    const t = ses().t;
    let ls = LM.S.prods.filter(p => p.t === t && IV.sel.has(p.id));
    if (!ls.length) ls = LM.S.prods.filter(p => p.t === t && !p.impreso);
    if (!ls.length) { toast('Selecciona las etiquetas que quieres imprimir.'); return; }
    imprimir(ls);
  };
  document.addEventListener('change', async e => {
    const el = e.target, k = el.dataset.chg; if (!k || k.indexOf('inv-') !== 0) return;
    if (k === 'inv-sel') { el.checked ? IV.sel.add(el.dataset.id) : IV.sel.delete(el.dataset.id); const b = document.querySelector('[data-act="inv-imprimir"]'); if (b) b.lastChild.textContent = 'IMPRIMIR ' + (IV.sel.size || 'LAS') + ' ETIQUETA' + (IV.sel.size === 1 ? '' : 'S'); }
    if (k === 'inv-fmt') IV.formato = el.value;
    if (k === 'inv-ubic') { const p = LM.PR(el.dataset.id); p.ubic = el.value.trim(); LM.save(); toast('Lugar guardado'); sincronizar(LM.T(p.t)); }
    if (k === 'inv-foto' && el.files[0]) { await guardarFoto(LM.PR(el.dataset.id), el.files[0]); LM.rerender(); }
    if (k === 'inv-foto-nuevo' && el.files[0]) { NP.archivo = el.files[0]; NP.prev = await LM.comprimir(el.files[0], 500, 0.75); pasoNuevo(); }
  });

  async function guardarFoto(p, archivo) {
    try {
      p.fotoMini = await LM.comprimir(archivo, 420, 0.72); // miniatura liviana para este celular
      LM.save();
      if (API.disponible && API.yo && API.esDeNegocio(p.t)) {
        await subirProducto(p);
        const foto = await LM.comprimir(archivo, 1400, 0.85); // la profesional, para la tienda y el QR
        const r = await API.post('/api/productos/' + encodeURIComponent(p.id) + '/foto', { foto });
        if (r.producto.foto) { p.fotoSrv = r.producto.foto; delete p.fotoMini; }
      }
      LM.save(); toast('Foto guardada. Ya se ve en la tienda.');
    } catch (e) { toast(e.message || 'No se pudo guardar la foto'); }
  }

  /* --- sincronizar el catálogo con el servidor (para que el QR funcione en cualquier celular) --- */
  const huella = p => [p.n, p.p, p.stock, p.ubic || '', p.sub, p.disp, JSON.stringify(p.attrs || {})].join('|');
  function subirProducto(p) {
    return API.post('/api/negocio/' + p.t + '/productos', { id: p.id, codigo: p.cod, prefijo: prefijo(LM.T(p.t)), nombre: p.n, categoria: p.sub, precio: p.p, stock: p.stock, ubicacion: p.ubic || '', descripcion: p.d || '', atributos: p.attrs || {}, disponible: p.disp !== false })
      .then(r => { if (r.producto.codigo !== p.cod) p.cod = r.producto.codigo; p.sincro = huella(p); if (r.producto.foto && !p.fotoSrv) p.fotoSrv = r.producto.foto; });
  }
  let sincronizando = false;
  async function sincronizar(t) {
    if (!t || sincronizando || !API.disponible || !API.yo || !API.esDeNegocio(t.id)) return;
    const ls = LM.S.prods.filter(p => p.t === t.id && (LM.codigoDe(p), p.sincro !== huella(p)));
    if (!ls.length) return;
    sincronizando = true;
    let cambio = false;
    for (const p of ls) { const antes = p.cod; try { await subirProducto(p); if (antes !== p.cod) cambio = true; } catch (e) { break; } }
    sincronizando = false; LM.save();
    if (cambio && (location.hash || '').includes('panel-etiquetas')) { toast('Algunos códigos cambiaron porque ya existían: revisa antes de imprimir.'); LM.rerender(); }
  }
  API.on('yo', () => { const s = ses(); if (s && s.t) sincronizar(LM.T(s.t)); });

  /* --- asistente: producto nuevo con foto y QR (3 pasos) --- */
  const NP = {};
  A['inv-nuevo'] = () => { Object.keys(NP).forEach(k => delete NP[k]); NP.paso = 1; pasoNuevo(); };
  function pasoNuevo() {
    const t = LM.T(ses().t), tipo = (LM.TIPOS && LM.TIPOS[t.cat]) || { atributos: [] };
    const pasos = '<ol class="lm-wiz">' + ['Datos', 'Foto', 'Código QR'].map((x, i) => '<li class="' + (i + 1 < NP.paso ? 'ok' : i + 1 === NP.paso ? 'now' : '') + '"><span>' + (i + 1) + '</span>' + x + '</li>').join('') + '</ol>';
    const cab = '<div class="sh-h"><div class="tt"><small>' + esc(t.n) + '</small><h3>Producto nuevo</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>';
    let cuerpo;
    if (NP.paso === 1) {
      const v = NP.datos || {};
      cuerpo = '<form class="sh-b stack lm-form" data-form="inv-p1">' + pasos +
        '<div class="campo"><label for="npN1">¿Cómo se llama el producto?</label><input id="npN1" name="n" required value="' + esc(v.n || '') + '" placeholder="Arroz Diana 1 kg"></div>' +
        '<div class="row2"><div class="campo"><label for="npP1">Precio de venta</label><input id="npP1" name="p" type="number" min="0" step="50" required value="' + esc(v.p || '') + '"></div><div class="campo"><label for="npQ1">¿Cuántos hay?</label><input id="npQ1" name="q" type="number" min="0" value="' + esc(v.q != null ? v.q : 10) + '"></div></div>' +
        '<div class="campo"><label for="npS1">Categoría</label><select id="npS1" name="s">' + LM.CAT[t.cat].subs.map(s => '<option' + (v.s === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></div>' +
        '<div class="campo"><label for="npU1">¿Dónde está en el local?</label><input id="npU1" name="u" value="' + esc(v.u || '') + '" placeholder="Estante 2, abajo"><div class="lm-chips">' + ['Estante 1', 'Estante 2', 'Vitrina', 'Detrás del mostrador', 'Bodega', 'Nevera'].map(x => '<button type="button" class="lm-chip" data-act="inv-ubic-chip" data-v="' + x + '">' + x + '</button>').join('') + '</div><small>Así, quien no conozca el local lo encuentra al escanear.</small></div>' +
        tipo.atributos.map(a => '<div class="campo"><label for="npA' + esc(a) + '">' + esc(a.charAt(0).toUpperCase() + a.slice(1)) + '</label><input id="npA' + esc(a) + '" name="attr_' + esc(a) + '" value="' + esc((v.attrs || {})[a] || '') + '"' + (a === 'vence' ? ' type="date"' : '') + '></div>').join('') +
        '<div class="campo"><label for="npD1">Descripción (opcional)</label><input id="npD1" name="d" value="' + esc(v.d || '') + '" placeholder="Qué trae, tamaño, para qué sirve"></div>' +
        '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('arrow') + 'SIGUIENTE: LA FOTO</button></form>';
    } else if (NP.paso === 2) {
      cuerpo = '<div class="sh-b stack">' + pasos + '<h4 style="margin:0">Foto profesional de: ' + esc(NP.datos.n) + '</h4>' +
        '<ul class="lm-check"><li>' + ic('check') + 'Fondo blanco o tela clara, nada más alrededor</li><li>' + ic('check') + 'Luz de ventana o caja de luz, sin flash directo</li><li>' + ic('check') + 'Producto limpio, centrado y que llene la foto</li><li>' + ic('check') + 'Celular quieto, a la altura del producto</li></ul>' +
        (NP.prev ? '<img class="lm-prev" src="' + NP.prev + '" alt="Vista previa">' : '') +
        '<label class="btn ' + (NP.prev ? '' : 'b-sol ') + 'lm-btn-xl">' + ic('camera') + (NP.prev ? 'TOMAR OTRA' : 'TOMAR LA FOTO') + '<input type="file" accept="image/*" capture="environment" data-chg="inv-foto-nuevo" hidden></label>' +
        (NP.prev ? '<button class="btn b-sol lm-btn-xl" type="button" data-act="inv-guardar">' + ic('check') + 'USAR ESTA FOTO Y CREAR EL QR</button>' : '') +
        '<button class="btn b-ghost" type="button" data-act="inv-guardar" data-sin="1">La foto la toma el equipo después</button><button class="btn b-ghost" type="button" data-act="inv-atras">' + ic('chevl') + 'Volver a los datos</button></div>';
    } else {
      const p = LM.PR(NP.id);
      cuerpo = '<div class="sh-b stack lm-centro">' + pasos + '<h4 style="margin:0">' + ic('check') + '¡Listo! Ya está en tu tienda</h4>' + LM.qrSVG(urlQR(p.cod), 200) + '<p class="lm-cod-g">' + esc(p.cod) + '</p><p class="muted">' + esc(p.n) + ' · ' + pesos(p.p) + (p.ubic ? ' · ' + esc(p.ubic) : '') + '</p>' +
        '<button class="btn b-sol lm-btn-xl" type="button" data-act="inv-nuevo">' + ic('plus') + 'AGREGAR OTRO PRODUCTO</button><button class="btn lm-btn-xl" type="button" data-act="inv-imp1" data-id="' + esc(p.id) + '">' + ic('printer') + 'Imprimir esta etiqueta ya</button><button class="btn b-ghost" type="button" data-act="inv-fin">Terminar (imprimo todas al final)</button></div>';
    }
    sheet(cab + cuerpo, '', 'inv-nuevo');
  }
  A['inv-ubic-chip'] = el => { const i = document.getElementById('npU1'); if (i) i.value = el.dataset.v; };
  F['inv-p1'] = (f, d) => { const attrs = {}; for (const [k, v] of d.entries()) if (k.startsWith('attr_') && v) attrs[k.slice(5)] = v; NP.datos = { n: String(d.get('n')).trim(), p: +d.get('p') || 0, q: +d.get('q') || 0, s: d.get('s'), u: String(d.get('u') || '').trim(), d: String(d.get('d') || '').trim(), attrs }; NP.paso = 2; pasoNuevo(); };
  A['inv-atras'] = () => { NP.paso = 1; pasoNuevo(); };
  A['inv-guardar'] = async el => {
    const t = LM.T(ses().t), v = NP.datos, sin = !!el.dataset.sin;
    const tpl = LM.S.prods.find(p => p.t === t.id && p.sub === v.s) || LM.S.prods.find(p => p.t === t.id);
    const p = { id: 'np' + Date.now(), n: v.n, t: t.id, sub: v.s, i: tpl ? tpl.i : LM.CAT[t.cat].i, p: v.p, r: 5, rc: 0, v: 0, stock: v.q, nuevo: true, d: v.d, disp: true, ubic: v.u, attrs: v.attrs };
    LM.S.prods.push(p); LM.codigoDe(p); NP.id = p.id;
    LM.logN(t.id, 'Agregó al inventario con QR: ' + p.n + ' (' + p.cod + ')');
    LM.save();
    if (!sin && NP.archivo) await guardarFoto(p, NP.archivo);
    else if (API.disponible && API.yo && API.esDeNegocio(t.id)) { try { await subirProducto(p); } catch (e) {} LM.save(); }
    NP.paso = 3; NP.prev = null; NP.archivo = null; pasoNuevo();
  };
  A['inv-fin'] = () => { closeModal(); LM.rerender(); };

  /* --- impresión de etiquetas --- */
  function imprimir(ls) {
    const t = LM.T(ls[0].t);
    let w = document.getElementById('lmPrint');
    if (!w) { w = document.createElement('div'); w.id = 'lmPrint'; document.body.appendChild(w); }
    w.className = 'lm-print ' + IV.formato;
    w.innerHTML = ls.map(p => '<div class="lm-et"><div class="lm-et-qr">' + LM.qrSVG(urlQR(LM.codigoDe(p)), 96) + '</div><div class="lm-et-d"><b class="lm-et-n">' + esc(p.n) + '</b><span class="lm-et-p">' + pesos(LM.precio(p).p) + '</span>' + LM.barrasSVG(p.cod, 30) + '<span class="lm-et-c">' + esc(p.cod) + '</span><small>' + esc(t.n) + (p.ubic ? ' · ' + esc(p.ubic) : '') + '</small></div></div>').join('');
    document.body.classList.add('lm-imprimiendo');
    const fin = () => {
      document.body.classList.remove('lm-imprimiendo');
      removeEventListener('afterprint', fin);
      ls.forEach(p => p.impreso = true); IV.sel.clear(); LM.save();
      if (API.disponible && API.yo && API.esDeNegocio(t.id)) API.post('/api/negocio/' + t.id + '/productos/etiquetas', { ids: ls.map(p => p.id) }).catch(() => {});
      toast(ls.length + ' etiqueta(s) marcadas como impresas'); LM.rerender();
    };
    addEventListener('afterprint', fin);
    setTimeout(() => { try { window.print(); } catch (e) { fin(); } }, 60);
  }
  LM.imprimirEtiquetas = imprimir;

  /* =================== RUTAS Y BOTONES =================== */
  LM.rutaExt(r => /^q-/.test(r), r => { vFicha(LM.leerCodigo(r.slice(2)) || r.slice(2).toUpperCase()); }, { sinGate: true });
  LM.rutaExt(r => r === 'escanear', () => vEscanear(), { sinGate: true });
  LM.trasRender(r => {
    if (r !== 'escanear') pararCamara();
    // Código visible en la ficha del producto de la tienda
    if (/^p-/.test(r)) { const p = LM.PR(r.slice(2)), b = document.querySelector('.buybox'); if (p && b && !b.querySelector('.lm-cod-tienda')) b.insertAdjacentHTML('beforeend', '<p class="lm-cod-tienda">' + ic('scan') + 'Código: <b>' + esc(LM.codigoDe(p)) + '</b>' + (p.ubic ? ' · ' + esc(p.ubic) : '') + '</p>'); }
    // Botón ESCANEAR en la barra del panel del negocio
    const top = document.querySelector('.pn-top .r');
    if (top && !top.querySelector('[data-h="escanear"]')) top.insertAdjacentHTML('afterbegin', '<button class="btn b-sm" type="button" data-act="go" data-h="escanear">' + ic('scan') + 'Escanear</button>');
  });
})();
