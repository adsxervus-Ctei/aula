/* LobaMall v7 · MESAS EN VIVO (billar y restaurantes / asaderos)
   Mesera: configura la mesa → INICIAR → sale un QR en toda la pantalla → los clientes lo escanean.
   Billar: anota cada chico (quién ganó y quién perdió) y los extras (cervezas, rondas) para quien los pidió.
   Restaurante: anota lo que pide cada comensal y lo manda a la cocina.
   Al cerrar: la cuenta de cada uno, o paga uno solo, o partes iguales. Ese QR ya no vuelve a servir. */
(function () {
  'use strict';
  const LM = window.LM, API = LM.api;
  const { esc, ic, pesos, toast, sheet, closeModal } = LM;
  const ses = () => LM.S.session;
  const tipoMesa = t => t.cat === 'billar' ? 'billar' : 'restaurante';
  const M = { cache: {}, cargando: {}, err: {}, qrAbierto: null, wake: null };
  const minTxt = m => m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
  const urlMesa = token => location.origin + location.pathname.replace(/index\.html$/, '') + '#mesa-' + token;
  const conectado = tid => API.disponible && API.yo && API.esDeNegocio(tid);

  /* ---------------- configuración local de cada negocio ---------------- */
  function cfg(t) {
    const N = LM.NEG(t.id);
    if (!N.mesasCfg) N.mesasCfg = t.cat === 'billar'
      ? { mesas: ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4'], juegos: ['Bola 8', 'Bola 9', 'Tres bandas', 'Carambola libre'], chico: 2000, hora: 8000 }
      : { mesas: ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6'] };
    return N.mesasCfg;
  }
  async function cargar(tid) {
    if (M.cargando[tid]) return;
    M.cargando[tid] = true; M.err[tid] = '';
    try { M.cache[tid] = (await API.get('/api/negocio/' + tid + '/mesas')).mesas; } catch (e) { M.err[tid] = e.message; }
    M.cargando[tid] = false;
    if ((location.hash || '').slice(1) === 'panel-mesas') LM.rerender();
  }
  const abiertaDe = (tid, mesa) => (M.cache[tid] || []).find(x => x.estado === 'abierta' && x.mesa === mesa);
  const porId = (tid, id) => (M.cache[tid] || []).find(x => x.id === +id);
  function guardar(tid, v) {
    const ls = M.cache[tid] || (M.cache[tid] = []);
    const i = ls.findIndex(x => x.id === v.id);
    if (i >= 0) ls[i] = Object.assign({}, ls[i], v, { token: v.token || ls[i].token }); else ls.unshift(v);
  }

  /* ---------------- PANEL: mesas ---------------- */
  function pMesasVivo(t, N) {
    const billar = t.cat === 'billar', c = cfg(t);
    const head = LM.head(billar ? 'Mesas y cuentas' : 'Mesas y comandas', billar ? 'Configura la mesa, muéstrales el código y anota cada chico y cada extra. La cuenta de cada jugador se hace sola.' : 'Abre la mesa, los comensales escanean y cada uno ve lo que pidió. La cuenta se divide sola.');
    if (!M.cache[t.id]) { cargar(t.id); return head + '<div class="box"><span class="lm-spin"></span> Cargando mesas…</div>'; }
    const cerradas = M.cache[t.id].filter(x => x.estado === 'cerrada').slice(0, 6);
    return head + (M.err[t.id] ? '<div class="aviso warn">' + ic('alert') + '<span>' + esc(M.err[t.id]) + '</span></div>' : '') +
      LM.ayuda(billar ? '¿Cómo funciona una mesa?' : '¿Cómo funciona una mesa?', billar
        ? ['Toca <b>INICIAR</b> en una mesa libre y escoge el juego y cómo se cobra (por chico o por tiempo).', 'Aparece un <b>código QR en toda la pantalla</b>: muéstraselo a los jugadores para que lo escaneen con su celular.', 'Cada vez que termine un chico, toca <b>CHICO</b> y marca quién ganó y quién perdió. A ellos les aparece al instante.', 'Las cervezas o rondas van en <b>EXTRA</b>, para quien la pidió o para todos.', 'Al final toca <b>CERRAR Y COBRAR</b>: cada uno paga lo suyo, o paga el que perdió, o partes iguales. Ese código ya no sirve más.']
        : ['Toca <b>ABRIR</b> en una mesa libre.', 'Muestra el <b>código QR</b>: cada comensal lo escanea y queda en la mesa.', 'Anota lo que pide cada uno con <b>PEDIDO</b>: va a la cocina. Cuando salga, toca <b>SERVIDO</b>.', 'Los comensales también pueden pedir desde su celular; tú lo aceptas.', 'Al final, <b>CERRAR Y COBRAR</b>: cada uno lo suyo, partes iguales o uno paga todo.']) +
      '<div class="lm-mesas">' + c.mesas.map(nombre => { const m = abiertaDe(t.id, nombre); return m ? mesaAbiertaH(t, m) : mesaLibreH(t, nombre); }).join('') + '</div>' +
      (cerradas.length ? '<details class="box"><summary><b>Mesas cerradas hoy (' + cerradas.length + ')</b></summary>' + cerradas.map(m => '<div class="lm-fila"><div><b>' + esc(m.mesa) + (m.juego ? ' · ' + esc(m.juego) : '') + '</b><small>' + minTxt(m.minutos) + ' · ' + m.jugadores.length + ' persona(s)</small></div><b class="num">' + pesos(m.total) + '</b><button class="btn b-sm" type="button" data-act="me-factura" data-id="' + m.id + '">' + ic('receipt') + 'Factura</button></div>').join('') + '</details>' : '') +
      cfgH(t, c);
  }
  function mesaLibreH(t, nombre) {
    return '<div class="lm-mesa"><h3>' + ic(t.cat === 'billar' ? 'billar' : 'mesa') + esc(nombre) + '</h3><p class="muted">Libre</p><button class="btn b-sol lm-btn-xl" type="button" data-act="me-iniciar" data-m="' + esc(nombre) + '">' + ic('play', 'fill') + (t.cat === 'billar' ? 'INICIAR' : 'ABRIR') + '</button></div>';
  }
  function mesaAbiertaH(t, m) {
    const billar = m.tipo === 'billar';
    const pend = m.eventos.filter(e => e.estado === 'pendiente');
    const cocina = m.eventos.filter(e => e.cocina === 'en_cocina' && e.estado === 'ok');
    return '<div class="lm-mesa on" data-mesa="' + m.id + '"><h3>' + ic(billar ? 'billar' : 'mesa') + esc(m.mesa) + ' <small>' + (billar ? esc(m.juego || '') + ' · ' + (m.cobro === 'chico' ? pesos(m.valor) + ' el chico' : pesos(m.valor) + '/hora') : (m.personas ? m.personas + ' personas' : 'Mesa abierta')) + '</small></h3>' +
      '<p class="lm-reloj-mesa" data-ini="' + Date.parse(m.abierta_en) + '">' + ic('clock') + '<b class="num">' + minTxt(m.minutos) + '</b>' + (m.cobro === 'tiempo' ? ' · tiempo ' + pesos(m.valor_tiempo) : '') + '</p>' +
      (m.jugadores.length ? '<table class="lm-marcador"><thead><tr><th>' + (billar ? 'Jugador' : 'Comensal') + '</th>' + (billar ? '<th>Ganó</th><th>Perdió</th>' : '') + '<th class="r">Lleva</th></tr></thead><tbody>' + m.jugadores.map(j => '<tr><td>' + esc(j.nombre) + (j.sin_app ? ' <small class="muted">(sin app)</small>' : '') + '</td>' + (billar ? '<td class="num">' + j.ganados + '</td><td class="num">' + j.perdidos + '</td>' : '') + '<td class="r num"><b>' + pesos(j.total) + '</b></td></tr>').join('') + '</tbody></table>'
        : '<p class="aviso">' + ic('scan') + '<span>Todavía nadie ha escaneado el código. Toca <b>MOSTRAR QR</b>.</span></p>') +
      (pend.length ? '<div class="lm-pend">' + pend.map(e => '<div><span>' + ic('bell') + '<b>' + esc(e.pedido_por || '') + '</b> pidió ' + esc(e.texto.split(' · ')[0]) + ' · ' + pesos(e.monto) + '</span><button class="btn b-sm b-monte" type="button" data-act="me-ev" data-a="aceptar" data-id="' + m.id + '" data-e="' + e.id + '">' + ic('check') + 'Aceptar</button><button class="btn b-sm" type="button" data-act="me-ev" data-a="anular" data-id="' + m.id + '" data-e="' + e.id + '">Quitar</button></div>').join('') + '</div>' : '') +
      (cocina.length ? '<div class="lm-cocina"><b>' + ic('olla') + 'En la cocina</b>' + cocina.map(e => '<div><span>' + esc(e.texto) + '</span><button class="btn b-sm b-sol" type="button" data-act="me-ev" data-a="servido" data-id="' + m.id + '" data-e="' + e.id + '">' + ic('check') + 'SERVIDO</button></div>').join('') + '</div>' : '') +
      '<p class="lm-grande">Total de la mesa: <b class="num">' + pesos(m.total) + '</b></p>' +
      '<div class="lm-mesa-acts">' + (billar ? '<button class="btn b-sol" type="button" data-act="me-chico" data-id="' + m.id + '"' + (m.jugadores.length < 2 ? ' disabled' : '') + '>' + ic('billar') + 'CHICO</button>' : '') +
      '<button class="btn b-sol" type="button" data-act="me-extra" data-id="' + m.id + '">' + ic('plus') + (billar ? 'EXTRA' : 'PEDIDO') + '</button>' +
      '<button class="btn" type="button" data-act="me-qr" data-id="' + m.id + '">' + ic('scan') + 'MOSTRAR QR</button>' +
      '<button class="btn" type="button" data-act="me-jug" data-id="' + m.id + '">' + ic('user') + '+ Sin app</button>' +
      '<button class="btn b-tinta" type="button" data-act="me-cerrar" data-id="' + m.id + '">' + ic('cash') + 'CERRAR Y COBRAR</button></div>' +
      (m.eventos.filter(e => e.estado === 'ok').length ? '<details class="lm-hist"><summary>Movimientos (' + m.eventos.filter(e => e.estado === 'ok').length + ')</summary>' + m.eventos.filter(e => e.estado === 'ok').slice().reverse().map(e => '<div><span>' + esc(e.texto) + ' · ' + pesos(e.monto) + '</span><button class="link" type="button" data-act="me-ev" data-a="anular" data-id="' + m.id + '" data-e="' + e.id + '" aria-label="Anular">' + ic('x') + 'anular</button></div>').join('') + '</details>' : '') + '</div>';
  }
  function cfgH(t, c) {
    const billar = t.cat === 'billar';
    return '<details class="box"><summary><b>' + ic('gear') + 'Configurar mesas' + (billar ? ', juegos y precios' : '') + '</b></summary><form class="stack" data-form="me-cfg" style="margin-top:10px">' +
      '<div class="campo"><label for="mcM">Mesas (separadas por coma)</label><input id="mcM" name="mesas" value="' + esc(c.mesas.join(', ')) + '"></div>' +
      (billar ? '<div class="campo"><label for="mcJ">Juegos (separados por coma)</label><input id="mcJ" name="juegos" value="' + esc(c.juegos.join(', ')) + '"><small>Escribe los que se juegan en tu billar, por ejemplo "La 11" o "Chicos de 3 bandas".</small></div><div class="row2"><div class="campo"><label for="mcC">Valor del chico</label><input id="mcC" name="chico" type="number" min="0" step="500" value="' + c.chico + '"></div><div class="campo"><label for="mcH">Valor de la hora</label><input id="mcH" name="hora" type="number" min="0" step="500" value="' + c.hora + '"></div></div>' : '') +
      '<button class="btn b-sol" type="submit">' + ic('check') + 'Guardar</button></form></details>';
  }

  /* ---------------- acciones de la mesera ---------------- */
  const A = LM.A, F = LM.F;
  const tienda = () => LM.T(ses().t);
  const post = (ruta, b) => API.post('/api/negocio/' + ses().t + '/mesas' + ruta, b);
  async function hacer(ruta, b, msg) {
    try { const r = await post(ruta, b); guardar(ses().t, r.mesa); if (msg) toast(msg); LM.rerender(); refrescarQR(r.mesa); return r.mesa; }
    catch (e) { LM.sonar('error'); toast(e.message); return null; }
  }
  A['me-iniciar'] = el => {
    const t = tienda(), c = cfg(t), billar = t.cat === 'billar', nombre = el.dataset.m;
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(t.n) + '</small><h3>' + (billar ? 'Configurar ' : 'Abrir ') + esc(nombre) + '</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="me-iniciar" data-m="' + esc(nombre) + '">' +
      (billar ? '<fieldset class="lm-fs"><legend>¿Qué van a jugar?</legend><div class="lm-opciones c2">' + c.juegos.map((j, i) => '<label class="lm-opcion"><input type="radio" name="juego" value="' + esc(j) + '"' + (i ? '' : ' checked') + '><span>' + ic('billar') + esc(j) + '</span></label>').join('') + '</div></fieldset>' +
        '<fieldset class="lm-fs"><legend>¿Cómo se cobra?</legend><div class="lm-opciones"><label class="lm-opcion"><input type="radio" name="cobro" value="chico" checked data-chg="me-cobro"><span>' + ic('tag') + 'Por chico: el que pierde paga</span></label><label class="lm-opcion"><input type="radio" name="cobro" value="tiempo" data-chg="me-cobro"><span>' + ic('clock') + 'Por tiempo de mesa</span></label></div>' +
        '<div class="campo"><label for="meV" id="meVl">Valor del chico</label><input id="meV" name="valor" type="number" min="500" step="500" value="' + c.chico + '" required data-chico="' + c.chico + '" data-hora="' + c.hora + '"></div></fieldset>'
        : '<div class="campo"><label for="meP">¿Cuántas personas?</label><input id="meP" name="personas" type="number" min="1" max="30" value="2"></div>') +
      '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('play', 'fill') + (billar ? 'INICIAR MESA Y MOSTRAR QR' : 'ABRIR MESA Y MOSTRAR QR') + '</button></form>');
  };
  document.addEventListener('change', e => { const el = e.target; if (el.dataset.chg !== 'me-cobro') return; const v = document.getElementById('meV'), l = document.getElementById('meVl'); if (!v) return; const tiempo = el.value === 'tiempo'; v.value = tiempo ? v.dataset.hora : v.dataset.chico; l.textContent = tiempo ? 'Valor de la hora' : 'Valor del chico'; });
  F['me-iniciar'] = async (f, d) => {
    const t = tienda();
    const b = t.cat === 'billar' ? { tipo: 'billar', mesa: f.dataset.m, juego: d.get('juego'), cobro: d.get('cobro'), valor: +d.get('valor') } : { tipo: 'restaurante', mesa: f.dataset.m, personas: +d.get('personas') };
    try { const r = await API.post('/api/negocio/' + t.id + '/mesas', b); guardar(t.id, r.mesa); closeModal(); LM.rerender(); mostrarQR(r.mesa); }
    catch (e) { toast(e.message); }
  };
  F['me-cfg'] = (f, d) => {
    const t = tienda(), c = cfg(t), lista = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
    c.mesas = lista(d.get('mesas')).slice(0, 30); if (!c.mesas.length) c.mesas = ['Mesa 1'];
    if (t.cat === 'billar') { c.juegos = lista(d.get('juegos')).slice(0, 12); if (!c.juegos.length) c.juegos = ['Bola 8']; c.chico = +d.get('chico') || c.chico; c.hora = +d.get('hora') || c.hora; }
    LM.save(); LM.rerender(); toast('Configuración guardada');
  };

  // QR en TODA la pantalla del celular de la mesera, con la lista de quién ya se unió
  function qrH(m) {
    return '<div class="lm-qr-full" role="dialog" aria-modal="true" aria-label="Código QR de la mesa"><div class="lm-qr-in"><p class="lm-qr-neg">' + esc(m.negocio || '') + '</p><h2>' + esc(m.mesa) + (m.juego ? ' · ' + esc(m.juego) : '') + '</h2>' +
      '<p class="lm-qr-txt">Escanea con la cámara de tu celular para unirte</p><div class="lm-qr-caja">' + LM.qrSVG(urlMesa(m.token), 600) + '</div>' +
      '<p class="lm-qr-cod">Código de esta mesa: <b>' + esc(m.token.slice(0, 6).toUpperCase()) + '</b> · sirve solo mientras la mesa esté abierta</p>' +
      '<div class="lm-qr-jug">' + (m.jugadores.length ? m.jugadores.map(j => '<span>' + ic('check') + esc(j.nombre) + '</span>').join('') : '<span class="muted">Esperando que escaneen…</span>') + '</div>' +
      '<button class="btn b-sol lm-btn-xl" type="button" data-act="me-qr-x">' + ic('check') + 'LISTO</button></div></div>';
  }
  async function mostrarQR(m) {
    let o = document.getElementById('lmQR');
    if (!o) { o = document.createElement('div'); o.id = 'lmQR'; document.body.appendChild(o); }
    o.innerHTML = qrH(m); LM.paint(o); M.qrAbierto = m.id;
    try { if (navigator.wakeLock) M.wake = await navigator.wakeLock.request('screen'); } catch (e) {} // que la pantalla no se apague
  }
  function refrescarQR(m) { if (M.qrAbierto === m.id && document.getElementById('lmQR') && m.estado === 'abierta' && m.token) { document.getElementById('lmQR').innerHTML = qrH(m); LM.paint(document.getElementById('lmQR')); } }
  A['me-qr'] = el => { const m = porId(ses().t, el.dataset.id); if (m && m.token) mostrarQR(m); };
  A['me-qr-x'] = () => { const o = document.getElementById('lmQR'); if (o) o.remove(); M.qrAbierto = null; try { M.wake && M.wake.release(); } catch (e) {} };

  A['me-chico'] = el => {
    const m = porId(ses().t, el.dataset.id); if (!m) return;
    const J = m.jugadores;
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(m.mesa) + ' · ' + esc(m.juego || '') + '</small><h3>Terminó un chico</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="me-chico" data-id="' + m.id + '"><fieldset class="lm-fs"><legend>¿Quién GANÓ?</legend><div class="lm-opciones">' + J.map((j, i) => '<label class="lm-opcion"><input type="radio" name="g" value="' + j.id + '"' + (i ? '' : ' checked') + ' data-chg="me-gana"><span>' + ic('star', 'fill') + esc(j.nombre) + '</span></label>').join('') + '</div></fieldset>' +
      '<fieldset class="lm-fs"><legend>¿Quién PERDIÓ? (paga ' + pesos(m.cobro === 'chico' ? m.valor : 0) + ')</legend><div class="lm-opciones">' + J.map((j, i) => '<label class="lm-opcion"><input type="radio" name="p" value="' + j.id + '"' + (i === 1 ? ' checked' : '') + '><span>' + ic('x') + esc(j.nombre) + '</span></label>').join('') + '</div></fieldset>' +
      '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('check') + 'ANOTAR CHICO</button></form>');
  };
  // Con dos jugadores, al marcar el ganador el otro queda como perdedor solo
  document.addEventListener('change', e => { const el = e.target; if (el.dataset.chg !== 'me-gana') return; const f = el.form, ps = [...f.querySelectorAll('input[name="p"]')]; if (ps.length === 2) ps.forEach(r => r.checked = r.value !== el.value); });
  F['me-chico'] = async (f, d) => { if (d.get('g') === d.get('p')) { toast('El ganador y el perdedor no pueden ser el mismo.'); return; } closeModal(); await hacer('/' + f.dataset.id + '/chico', { ganador: +d.get('g'), perdedor: +d.get('p') }, 'Chico anotado. A los jugadores ya les aparece.'); };

  A['me-extra'] = el => {
    const t = tienda(), m = porId(t.id, el.dataset.id); if (!m) return;
    const ps = LM.S.prods.filter(p => p.t === t.id && p.sub !== 'Mesas' && p.disp !== false);
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(m.mesa) + '</small><h3>' + (m.tipo === 'billar' ? 'Agregar un extra' : 'Nuevo pedido') + '</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="me-extra" data-id="' + m.id + '"><fieldset class="lm-fs"><legend>¿Qué?</legend><div class="lm-opciones c2">' + ps.map((p, i) => '<label class="lm-opcion"><input type="radio" name="pid" value="' + esc(p.id) + '"' + (i ? '' : ' checked') + '><span>' + esc(p.n) + ' · ' + pesos(LM.precio(p).p) + '</span></label>').join('') + '<label class="lm-opcion"><input type="radio" name="pid" value="otro"><span>' + ic('edit') + 'Otra cosa</span></label></div>' +
      '<div class="row2"><div class="campo"><label for="meO">Si es otra cosa: qué</label><input id="meO" name="desc" placeholder="Ronda de gaseosas"></div><div class="campo"><label for="meOv">Valor</label><input id="meOv" name="val" type="number" min="0" step="500"></div></div>' +
      '<div class="campo"><label for="meQ">Cantidad</label><input id="meQ" name="q" type="number" min="1" max="50" value="1"></div></fieldset>' +
      '<fieldset class="lm-fs"><legend>¿Para quién?</legend><div class="lm-opciones c2">' + m.jugadores.map((j, i) => '<label class="lm-opcion"><input type="radio" name="para" value="' + j.id + '"' + (i ? '' : ' checked') + '><span>' + ic('user') + esc(j.nombre) + '</span></label>').join('') + '<label class="lm-opcion"><input type="radio" name="para" value=""' + (m.jugadores.length ? '' : ' checked') + '><span>' + ic('users') + 'Para todos (se divide)</span></label></div></fieldset>' +
      '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('plus') + 'AGREGAR</button></form>');
  };
  F['me-extra'] = async (f, d) => {
    const pid = d.get('pid'), otro = pid === 'otro', p = otro ? null : LM.PR(pid);
    if (otro && !String(d.get('desc') || '').trim()) { toast('Escribe qué se agrega.'); return; }
    const b = { cantidad: +d.get('q') || 1, para: d.get('para') ? +d.get('para') : null, producto_id: otro ? null : pid, descripcion: otro ? String(d.get('desc')).trim() : p.n, valor: otro ? (+d.get('val') || 0) : LM.precio(p).p };
    closeModal();
    const m = await hacer('/' + f.dataset.id + '/extra', b, 'Agregado a la cuenta.');
    if (m && p && p.stock < 999) { p.stock = Math.max(0, p.stock - b.cantidad); LM.save(); }
  };
  A['me-ev'] = el => hacer('/' + el.dataset.id + '/eventos/' + el.dataset.e + '/' + el.dataset.a, {}, { aceptar: 'Aceptado: ya suma a la cuenta.', anular: 'Quitado de la cuenta.', servido: 'Marcado como servido.' }[el.dataset.a]);
  A['me-jug'] = el => sheet('<div class="sh-h"><div class="tt"><h3>Agregar alguien sin celular</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><form class="sh-b stack" data-form="me-jug" data-id="' + el.dataset.id + '"><p class="muted">Lo ideal es que escanee el código con su celular. Si no tiene, anótalo con un nombre o apodo.</p><div class="campo"><label for="mjN">Nombre o apodo</label><input id="mjN" name="n" required></div><button class="btn b-sol" type="submit">' + ic('plus') + 'Agregar</button></form>');
  F['me-jug'] = async (f, d) => { closeModal(); await hacer('/' + f.dataset.id + '/jugadores', { nombre: String(d.get('n')) }, 'Agregado a la mesa.'); };

  // Cierre: muestra la cuenta de cada uno y cómo se va a pagar
  function detalleJugador(m, j) {
    const l = [];
    if (j.perdidos && m.cobro === 'chico') l.push([j.perdidos + ' chico(s) perdido(s) × ' + pesos(m.valor), j.valor_chicos]);
    if (j.tiempo) l.push(['Tiempo de mesa (' + minTxt(m.minutos) + ', su parte)', j.tiempo]);
    j.extras.forEach(x => l.push([x.cantidad + ' × ' + x.descripcion + (x.compartido ? ' (compartido)' : ''), x.monto]));
    return l;
  }
  A['me-cerrar'] = el => {
    const m = porId(ses().t, el.dataset.id); if (!m) return;
    const mayor = m.jugadores.slice().sort((a, b) => b.perdidos - a.perdidos || b.total - a.total)[0];
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(m.mesa) + ' · ' + minTxt(m.minutos) + '</small><h3>Cerrar y cobrar</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="me-cerrar" data-id="' + m.id + '">' +
      m.jugadores.map(j => '<div class="lm-fac-j"><div class="lm-of-h"><b>' + esc(j.nombre) + '</b><b class="num">' + pesos(j.total) + '</b></div>' + detalleJugador(m, j).map(x => '<div class="kv"><span>' + esc(x[0]) + '</span><span class="num">' + pesos(x[1]) + '</span></div>').join('') + '</div>').join('') +
      '<p class="lm-grande">Total: <b class="num">' + pesos(m.total) + '</b></p>' +
      (m.jugadores.length ? '<fieldset class="lm-fs"><legend>¿Cómo pagan?</legend><div class="lm-opciones"><label class="lm-opcion"><input type="radio" name="forma" value="cada_uno" checked><span>' + ic('users') + 'Cada uno paga lo suyo</span></label><label class="lm-opcion"><input type="radio" name="forma" value="uno"><span>' + ic('user') + 'Paga uno solo todo</span></label><label class="lm-opcion"><input type="radio" name="forma" value="iguales"><span>' + ic('grid') + 'Partes iguales</span></label></div>' +
        '<div class="campo"><label for="mcP">Si paga uno solo, ¿quién?</label><select id="mcP" name="pagador">' + m.jugadores.map(j => '<option value="' + j.id + '"' + (mayor && j.id === mayor.id ? ' selected' : '') + '>' + esc(j.nombre) + (j.perdidos ? ' (perdió ' + j.perdidos + ')' : '') + '</option>').join('') + '</select></div></fieldset>' : '') +
      '<div class="campo"><label for="mcF">Forma de pago</label><select id="mcF" name="pago"><option value="efectivo">Efectivo</option><option value="nequi">Nequi</option><option value="fiado">Fiado</option></select></div>' +
      '<div class="aviso warn">' + ic('lock') + '<span>Al cerrar, el código QR de esta mesa deja de servir. La próxima vez que la abras sale uno nuevo.</span></div>' +
      '<button class="btn b-tinta lm-btn-xl" type="submit">' + ic('cash') + 'CERRAR MESA Y HACER LA FACTURA</button></form>');
  };
  F['me-cerrar'] = async (f, d) => {
    const t = tienda();
    try {
      const r = await post('/' + f.dataset.id + '/cerrar', { forma: d.get('forma') || 'cada_uno', pagador: +d.get('pagador') || null, pago: d.get('pago') });
      const m = r.mesa; guardar(t.id, m);
      // La plata entra a la caja del día, una línea por cada persona que paga
      const N = LM.NEG(t.id);
      m.factura.pagos.filter(x => x.paga > 0).forEach(x => N.ventas.push({ h: LM.hora(), d: m.mesa + (m.juego ? ' (' + m.juego + ')' : '') + ' · ' + x.nombre, v: x.paga, m: m.factura.pago, o: 'mostrador', por: ses().u }));
      LM.logN(t.id, 'Cerró ' + m.mesa + ': ' + pesos(m.total));
      LM.save(); A['me-qr-x'](); facturaSheet(m); LM.rerender();
    } catch (e) { toast(e.message); }
  };
  function facturaSheet(m) {
    const f = m.factura;
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(m.negocio || '') + ' · ' + esc(m.mesa) + '</small><h3>Factura de la mesa</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><div class="sh-b stack lm-factura">' +
      f.pagos.map(p => { const j = f.detalle.find(x => x.id === p.jugador_id); return '<div class="lm-fac-j"><div class="lm-of-h"><b>' + esc(p.nombre) + '</b><b class="num">Paga ' + pesos(p.paga) + '</b></div>' + (j ? detalleJugador({ ...m, minutos: f.minutos }, j).map(x => '<div class="kv"><span>' + esc(x[0]) + '</span><span class="num">' + pesos(x[1]) + '</span></div>').join('') : '') + '</div>'; }).join('') +
      '<p class="lm-grande">Total: <b class="num">' + pesos(f.total) + '</b> · ' + esc({ cada_uno: 'cada uno paga lo suyo', uno: 'paga uno solo', iguales: 'partes iguales' }[f.forma]) + '</p></div><div class="sh-f"><button class="btn" type="button" data-act="me-imprimir">' + ic('printer') + 'Imprimir</button><button class="btn b-sol" type="button" data-act="cerrar">Listo</button></div>', '', 'me-factura');
  }
  A['me-factura'] = el => { const m = porId(ses().t, el.dataset.id); if (m) facturaSheet(m); };
  A['me-imprimir'] = () => window.print();

  /* ---------------- integración con el panel ---------------- */
  const pLocal = LM.EXT.panelFn.mesas; // versión sin servidor (solo este celular)
  LM.EXT.panelFn.mesas = function (t, N, ords, caj) {
    if (conectado(t.id)) return pMesasVivo(t, N);
    if (t.cat === 'billar' && pLocal) return '<div class="aviso">' + ic('wifioff') + '<span>Sin conexión con el servidor: las mesas funcionan solo en este celular y <b>sin código QR</b> para los jugadores. Conecta el negocio para usar el QR.</span></div>' + pLocal(t, N, ords, caj);
    return LM.head('Mesas y comandas', '') + '<div class="aviso warn">' + ic('wifioff') + '<span>Las mesas con código QR necesitan el servidor de LobaMall. Conecta el negocio (usuario y clave) cuando haya señal.</span></div>';
  };
  LM.EXT.panelFn.mesas.cajero = true;
  // Los restaurantes y asaderos también tienen "Mesas y comandas"
  if (LM.TIPOS && LM.TIPOS.comida) LM.TIPOS.comida.herramienta = ['mesas', 'mesa', 'Mesas y comandas'];

  /* ======================= CLIENTE: escanea y ve su mesa ======================= */
  let miMesa = null;
  function pintarCliente(html) { const app = document.getElementById('app'); app.innerHTML = '<div class="lm-wrap lm-mi-mesa">' + html + '</div>'; LM.paint(app); }
  async function unirse(token) {
    if (API.disponible === null) await API.listo;
    if (!API.disponible) { pintarCliente(LM.sinServidorH('La mesa con código QR').replace('<div class="lm-wrap">', '').replace(/<\/div>$/, '')); return; }
    if (!API.yo) { pintarCliente(entrarH(token)); return; }
    pintarCliente('<div class="lm-card lm-centro"><div class="lm-spin"></div><p>Uniéndote a la mesa…</p></div>');
    try { const r = await API.post('/api/mesas/unirse', { token }); miMesa = r.mesa; sesionLocal(); LM.sonar(); history.replaceState(null, '', '#mi-mesa-' + r.mesa.id); vMiMesa(); }
    catch (e) { pintarCliente('<div class="lm-card lm-centro">' + ic('alert') + '<h1>' + (e.codigo === 'usado' ? 'Este código ya se usó' : 'No pudimos unirte') + '</h1><p class="lm-grande">' + esc(e.message) + '</p><button class="btn lm-btn-xl" type="button" data-act="go" data-h="inicio">' + ic('home') + 'Ir a LobaMall</button></div>'); }
  }
  function entrarH(token) {
    return '<form class="lm-card lm-form" data-form="mm-entrar" data-t="' + esc(token) + '"><h1>' + ic('billar') + 'Únete a la mesa</h1><p class="lm-grande">Entra con tu cuenta de LobaMall para ver tu marcador y tu cuenta en vivo.</p>' +
      '<div class="campo"><label for="mmU">Tu celular o usuario</label><input id="mmU" name="u" required autocomplete="username"></div><div class="campo"><label for="mmP">Clave</label><input id="mmP" name="p" type="password" required autocomplete="current-password"></div>' +
      '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('arrow') + 'ENTRAR Y UNIRME</button>' +
      '<details><summary><b>No tengo cuenta: crearla ahora</b></summary><div class="stack" style="margin-top:10px"><div class="campo"><label for="mmN">Nombre</label><input id="mmN" name="n" autocomplete="name"></div><p class="muted">Usa el celular de arriba y crea una clave de mínimo 4 números o letras.</p><button class="btn lm-btn-xl" type="button" data-act="mm-crear">' + ic('user') + 'CREAR CUENTA Y UNIRME</button></div></details>' +
      '<p class="muted">Prueba: <b>maria</b> o <b>juan</b>, clave 1234.</p></form>';
  }
  F['mm-entrar'] = async (f, d) => {
    try { await API.entrar(String(d.get('u')), String(d.get('p'))); unirse(f.dataset.t); } catch (e) { toast(e.message); }
  };
  LM.A['mm-crear'] = async el => {
    const f = el.closest('form'), d = new FormData(f);
    try { const r = await API.post('/api/auth/registro', { nombre: d.get('n'), telefono: d.get('u'), clave: d.get('p') }); API.yo = r.usuario; API.conectarEventos(true); unirse(f.dataset.t); }
    catch (e) { toast(e.message); }
  };
  // La vista de cliente de la tienda usa la misma cuenta
  function sesionLocal() {
    const y = API.yo; if (!y) return; const S = LM.S, u = y.usuario || y.telefono;
    if (S.session && S.session.t) return; // es personal del negocio: no se toca su sesión
    if (S.user.usuario !== u) S.user = { usuario: u, nombre: y.nombre, cel: y.telefono, dirs: [], favT: [], favP: [], fiados: [], srv: true };
    S.session = { rol: 'cliente', u }; LM.save();
  }
  async function cargarMiMesa(id) {
    if (API.disponible === null) await API.listo;
    if (!API.yo) { pintarCliente('<div class="lm-card lm-centro"><h1>Entra con tu cuenta</h1><button class="btn b-sol lm-btn-xl" type="button" data-act="go" data-h="inicio">Ir a LobaMall</button></div>'); return; }
    try { miMesa = (await API.get('/api/mesas/' + id)).mesa; vMiMesa(); } catch (e) { pintarCliente('<div class="lm-card lm-centro">' + ic('alert') + '<p class="lm-grande">' + esc(e.message) + '</p></div>'); }
  }
  function vMiMesa() {
    const m = miMesa; if (!m) return;
    const yo = m.jugadores.find(j => j.yo), billar = m.tipo === 'billar', cerrada = m.estado === 'cerrada';
    let h = '<header class="lm-barra"><div class="lm-barra-id"><span class="lm-av">' + ic(billar ? 'billar' : 'mesa') + '</span><div><b>' + esc(m.mesa) + (m.juego ? ' · ' + esc(m.juego) : '') + '</b><small>' + esc(m.negocio) + '</small></div></div><span class="pill ' + (cerrada ? 'p-gris' : 'p-ok') + '">' + (cerrada ? 'Mesa cerrada' : 'En juego') + '</span></header>';
    if (cerrada && m.factura) {
      const mio = yo && m.factura.pagos.find(p => p.jugador_id === yo.id);
      h += '<section class="lm-card lm-centro lm-mi-total">' + ic('receipt') + '<h1>' + (mio && mio.paga ? 'Te toca pagar' : 'No te toca pagar nada') + '</h1>' + (mio && mio.paga ? '<p class="lm-total-g num">' + pesos(mio.paga) + '</p>' : '') + '<p>' + esc({ cada_uno: 'Cada uno paga lo suyo', uno: 'Paga uno solo', iguales: 'Partes iguales' }[m.factura.forma]) + ' · total de la mesa ' + pesos(m.factura.total) + '</p></section>';
    } else {
      h += '<section class="lm-card lm-centro lm-mi-total"><small>Tu cuenta hasta ahora</small><p class="lm-total-g num">' + pesos(yo ? yo.total : 0) + '</p><p>' + ic('clock') + ' ' + minTxt(m.minutos) + (billar ? ' · ' + (m.cobro === 'chico' ? 'el chico vale ' + pesos(m.valor) : pesos(m.valor) + ' la hora') : '') + '</p></section>';
    }
    h += '<section class="lm-card"><h2>' + ic(billar ? 'billar' : 'users') + (billar ? 'Marcador' : 'La mesa') + '</h2><table class="lm-marcador"><thead><tr><th>' + (billar ? 'Jugador' : 'Persona') + '</th>' + (billar ? '<th>Ganó</th><th>Perdió</th>' : '') + '<th class="r">Lleva</th></tr></thead><tbody>' +
      m.jugadores.map(j => '<tr class="' + (j.yo ? 'yo' : '') + '"><td>' + esc(j.nombre) + (j.yo ? ' (tú)' : '') + '</td>' + (billar ? '<td class="num">' + j.ganados + '</td><td class="num">' + j.perdidos + '</td>' : '') + '<td class="r num"><b>' + pesos(j.total) + '</b></td></tr>').join('') + '</tbody></table></section>';
    if (yo && (yo.extras.length || yo.valor_chicos || yo.tiempo)) h += '<section class="lm-card"><h2>' + ic('receipt') + 'Lo tuyo</h2>' + detalleJugador(m, yo).map(x => '<div class="kv"><span>' + esc(x[0]) + '</span><b class="num">' + pesos(x[1]) + '</b></div>').join('') + '</section>';
    const pend = m.eventos.filter(e => e.estado === 'pendiente' && yo && e.pedido_por === yo.nombre);
    if (pend.length) h += '<div class="aviso">' + ic('clock') + '<span>Esperando que la mesera acepte: ' + pend.map(e => esc(e.texto.split(' · ')[0])).join(', ') + '</span></div>';
    if (!cerrada) h += '<button class="btn b-sol lm-btn-xl" type="button" data-act="mm-menu">' + ic('plus') + (billar ? 'PEDIR UNA CERVEZA O ALGO MÁS' : 'PEDIR ALGO MÁS') + '</button><div id="mmMenu"></div>';
    h += '<section class="lm-card"><h2>' + ic('history') + 'Lo que ha pasado</h2>' + (m.eventos.length ? m.eventos.slice().reverse().slice(0, 20).map(e => '<div class="lm-ev ' + e.estado + '">' + ic(e.tipo === 'chico' ? 'billar' : 'plus') + '<span>' + esc(e.texto) + (e.estado === 'pendiente' ? ' (por aceptar)' : '') + (e.cocina === 'en_cocina' ? ' · en la cocina' : e.cocina === 'servido' ? ' · servido' : '') + '</span><b class="num">' + pesos(e.monto) + '</b></div>').join('') : '<p class="muted">Aún no hay movimientos.</p>') + '</section>' +
      '<button class="btn b-ghost" type="button" data-act="go" data-h="inicio">' + ic('home') + 'Seguir en LobaMall</button>';
    pintarCliente(h);
  }
  LM.A['mm-menu'] = async () => {
    const box = document.getElementById('mmMenu'); if (!box) return;
    box.innerHTML = '<div class="lm-spin"></div>';
    try {
      const { productos } = await API.get('/api/mesas/' + miMesa.id + '/menu');
      box.innerHTML = '<div class="lm-card"><h2>¿Qué quieres?</h2>' + (productos.length ? productos.map(p => '<div class="lm-fila"><div><b>' + esc(p.nombre) + '</b><small>' + pesos(p.precio) + '</small></div><button class="btn b-sm b-sol" type="button" data-act="mm-pedir" data-id="' + esc(p.id) + '">' + ic('plus') + 'Pedir</button></div>').join('') : '<p class="muted">El negocio no tiene productos para pedir desde aquí. Pídeselo a la mesera.</p>') + '</div>';
      LM.paint(box);
    } catch (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
  };
  LM.A['mm-pedir'] = async el => { try { const r = await API.post('/api/mesas/' + miMesa.id + '/pedir', { producto_id: el.dataset.id, cantidad: 1 }); miMesa = r.mesa; toast('Pedido enviado. La mesera lo confirma.'); vMiMesa(); } catch (e) { toast(e.message); } };

  /* ---------------- tiempo real ---------------- */
  API.on('mesa', d => {
    const m = d.mesa, s = ses();
    if (s && s.t === m.negocio_id) {
      guardar(s.t, m); refrescarQR(Object.assign({}, porId(s.t, m.id)));
      if (d.motivo === 'pedido') { LM.sonar(); toast('Pedido desde ' + m.mesa + ': revísalo'); }
      if ((location.hash || '').slice(1) === 'panel-mesas' && !document.querySelector('#modal:not([hidden])')) LM.rerender();
    }
    if (miMesa && miMesa.id === m.id) {
      const yoId = miMesa.yo_id;
      miMesa = Object.assign({}, m, { yo_id: yoId, jugadores: m.jugadores.map(j => ({ ...j, yo: j.id === yoId })) });
      if (/^mi-mesa-/.test((location.hash || '').slice(1))) vMiMesa();
      if (d.motivo === 'chico') { if (navigator.vibrate) navigator.vibrate(120); toast(m.eventos[m.eventos.length - 1].texto); }
      if (d.motivo === 'cerrada') { LM.sonar(); toast('Se cerró la mesa. Mira lo que te toca pagar.'); }
    }
  });
  API.on('reconectado', () => { const s = ses(); if (s && s.t && conectado(s.t)) cargar(s.t); if (miMesa) cargarMiMesa(miMesa.id); });
  API.on('yo', () => { const s = ses(); if (s && s.t && conectado(s.t)) cargar(s.t); });

  // Si el cliente tiene una mesa abierta, un botón flotante lo lleva a ella desde cualquier pantalla
  let mias = null, miasTs = 0;
  LM.trasRender(async r => {
    let b = document.getElementById('lmMiMesaBtn');
    if (/^(mi-mesa|mesa)-/.test(r) || r === 'rep' || r === 'admin' || /^panel/.test(r)) { if (b) b.remove(); return; }
    if (!API.disponible || !API.yo || (ses() && ses().t)) { if (b) b.remove(); return; }
    if (Date.now() - miasTs > 30000) { miasTs = Date.now(); try { mias = (await API.get('/api/mesas/mias')).mesas.filter(m => m.estado === 'abierta'); } catch (e) { mias = []; } }
    b = document.getElementById('lmMiMesaBtn');
    if (mias && mias.length) {
      if (!b) { b = document.createElement('button'); b.id = 'lmMiMesaBtn'; b.className = 'btn b-sol lm-mi-mesa-btn'; b.type = 'button'; document.body.appendChild(b); }
      b.dataset.act = 'go'; b.dataset.h = 'mi-mesa-' + mias[0].id; b.innerHTML = ic('billar') + 'Estás en ' + esc(mias[0].mesa) + ' · ver mi cuenta';
    } else if (b) b.remove();
  });

  LM.rutaExt(r => /^mesa-/.test(r), r => unirse(r.slice(5)), { sinGate: true });
  LM.rutaExt(r => /^mi-mesa-\d+$/.test(r), r => cargarMiMesa(+r.slice(8)), { sinGate: true });
})();
