/* LobaMall v7 · Rol REPARTIDOR / MOTOTAXISTA con MODO DUAL
   Una sola cuenta: la persona es cliente y además repartidor. El modo (trabajo / cliente)
   y el estado conectado se guardan en el servidor, que es quien decide a quién avisar. */
(function () {
  'use strict';
  const LM = window.LM, API = LM.api;
  const { esc, ic, pesos, toast, sheet, closeModal } = LM;
  const $ = s => document.querySelector(s);

  const R = { datos: null, ofertas: [], cargando: false, error: '', vista: 'landing', fotos: {}, err: '', enviando: false, ubiWatch: null, ubiUlt: 0, mapa: null, tomando: null };
  const vistas = new Set((() => { try { return JSON.parse(sessionStorage.getItem('lm-vistas') || '[]'); } catch (e) { return []; } })());
  const guardarVistas = () => { try { sessionStorage.setItem('lm-vistas', JSON.stringify([...vistas].slice(-200))); } catch (e) {} };

  const rep = () => API.yo && API.yo.repartidor;
  const aprobado = () => rep() && rep().estado_aprobacion === 'aprobado';
  const enRep = () => (location.hash || '').slice(1) === 'rep';
  const ESTRELLAS = n => n == null ? 'Sin calificaciones todavía' : '★ ' + String(n).replace('.', ',') + ' de 5';

  /* =================== MAPA (Leaflet + OpenStreetMap, se carga solo cuando hace falta) =================== */
  let cargaLeaflet = null;
  LM.cargarLeaflet = () => cargaLeaflet || (cargaLeaflet = new Promise((ok, mal) => {
    if (window.L) return ok(window.L);
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'js/vendor/leaflet/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'js/vendor/leaflet/leaflet.js'; s.onload = () => ok(window.L); s.onerror = () => { cargaLeaflet = null; mal(new Error('mapa')); };
    document.head.appendChild(s);
  }));
  // puntos: [{lat,lng,txt,tipo:'negocio'|'destino'|'moto'}]
  LM.mapa = async function (el, puntos) {
    if (!el) return null;
    const validos = puntos.filter(p => p && p.lat != null && p.lng != null);
    if (!validos.length) { el.innerHTML = '<p class="lm-mapa-vacio">' + ic('pin') + 'Todavía no hay ubicación para mostrar en el mapa.</p>'; return null; }
    let L;
    try { L = await LM.cargarLeaflet(); } catch (e) { el.innerHTML = '<p class="lm-mapa-vacio">No se pudo cargar el mapa (poca señal).</p>'; return null; }
    if (el._mapa) { el._mapa.remove(); }
    const m = L.map(el, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    const icono = t => L.divIcon({ className: 'lm-pin lm-pin-' + t, html: t === 'moto' ? '🏍️' : t === 'negocio' ? '🏪' : '🏠', iconSize: [38, 38], iconAnchor: [19, 19] });
    const marcas = {};
    validos.forEach(p => { marcas[p.tipo] = L.marker([p.lat, p.lng], { icon: icono(p.tipo) }).addTo(m).bindPopup(esc(p.txt || '')); });
    if (validos.length > 1) m.fitBounds(L.latLngBounds(validos.map(p => [p.lat, p.lng])).pad(0.3)); else m.setView([validos[0].lat, validos[0].lng], 16);
    el._mapa = m;
    m.moverMoto = (lat, lng) => { if (marcas.moto) marcas.moto.setLatLng([lat, lng]); else marcas.moto = L.marker([lat, lng], { icon: icono('moto') }).addTo(m); };
    setTimeout(() => m.invalidateSize(), 120);
    return m;
  };
  const linkMapa = (lat, lng) => lat != null ? 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=17/' + lat + '/' + lng : null;

  /* =================== DATOS =================== */
  async function cargar() {
    if (R.cargando) return;
    R.cargando = true; R.error = '';
    try {
      R.datos = await API.get('/api/repartidor/yo');
      if (R.datos.repartidor && API.yo) API.yo.repartidor = Object.assign(API.yo.repartidor || {}, { estado_aprobacion: R.datos.repartidor.estado_aprobacion, modo_actual: R.datos.repartidor.modo_actual, conectado: R.datos.repartidor.conectado, motivo_rechazo: R.datos.repartidor.motivo_rechazo });
      if (aprobado() && rep().modo_actual === 'trabajo') {
        const o = await API.get('/api/repartidor/ofertas');
        R.ofertas = o.ofertas;
        // las ofertas que ya estaban al entrar no vuelven a sonar
        R.ofertas.forEach(x => vistas.add(x.id + ':' + x.intento)); guardarVistas();
      } else R.ofertas = [];
    } catch (e) { R.error = e.message; }
    R.cargando = false;
    ubicacion();
  }
  const refrescar = async () => { await cargar(); if (enRep()) pintar(); };

  /* =================== VISTAS =================== */
  function pintar() {
    const app = $('#app'); if (!app) return;
    app.innerHTML = vRep(); LM.paint(app);
    const cur = R.datos && R.datos.en_curso;
    const mEl = document.getElementById('lmMapaRep');
    if (cur && mEl) {
      LM.mapa(mEl, [
        { lat: cur.origen_lat, lng: cur.origen_lng, txt: cur.negocio, tipo: 'negocio' },
        { lat: cur.destino_lat, lng: cur.destino_lng, txt: cur.destino, tipo: 'destino' },
        R.ubiPos ? { lat: R.ubiPos.lat, lng: R.ubiPos.lng, txt: 'Tú', tipo: 'moto' } : null
      ]).then(m => { R.mapa = m; });
    } else R.mapa = null;
  }

  function vRep() {
    if (API.disponible === null) return '<div class="lm-wrap"><div class="lm-card lm-centro"><div class="lm-spin"></div><p>Cargando…</p></div></div>';
    if (!API.disponible) return LM.sinServidorH('El registro y el tablero de repartidores');
    if (!API.yo) return R.vista === 'registro' ? vRegistro() : R.vista === 'entrar' ? vEntrar() : vLanding();
    if (!R.datos && !R.error) { refrescar(); return '<div class="lm-wrap"><div class="lm-card lm-centro"><div class="lm-spin"></div><p>Cargando tu tablero…</p></div></div>'; }
    if (R.error) return '<div class="lm-wrap"><div class="lm-card lm-centro">' + ic('alert') + '<h1>No se pudo cargar</h1><p>' + esc(R.error) + '</p><button class="btn b-sol b-lg" type="button" data-act="rep-recargar">' + ic('repeat') + 'Reintentar</button></div></div>';
    const r = R.datos.repartidor;
    if (!r || R.vista === 'corregir') return vRegistro(r);
    if (r.estado_aprobacion === 'pendiente') return vPendiente(r);
    if (r.estado_aprobacion === 'rechazado') return vRechazado(r);
    if (r.modo_actual === 'cliente') return vVolver();
    return vTablero(r);
  }

  const barra = (r, extra) => '<header class="lm-barra"><div class="lm-barra-id"><span class="lm-av">' + (r && r.foto_id ? '<img src="/api/archivos/' + r.foto_id + '" alt="">' : ic('moto')) + '</span><div><b>' + esc(r ? r.nombre_completo.split(' ')[0] : 'Repartidor') + '</b><small>' + esc(r ? ESTRELLAS(r.promedio) : 'LobaMall') + '</small></div></div>' + (extra || '') + '</header>';

  function vLanding() {
    const z = API.zonas;
    const tar = z.length ? z.map(x => '<li><b>' + pesos(x.tarifa) + '</b> ' + esc(x.nombre) + (x.tipo === 'vereda' ? ' (vereda)' : '') + '</li>').join('') : '<li><b>$4.000</b> dentro del pueblo</li><li><b>$8.000</b> a veredas como Chimí</li>';
    if (!z.length) API.cargarZonas().then(() => { if (enRep() && !API.yo) pintar(); });
    return '<div class="lm-wrap">' + barra(null) +
      '<section class="lm-card"><h1>' + ic('moto') + 'Repartidores y mototaxistas</h1><p class="lm-grande">Con tu misma cuenta de LobaMall puedes <b>hacer domicilios</b> y también <b>comprar como cliente</b>.</p>' +
      '<ul class="lm-lista-ok"><li>' + ic('check') + 'Ganas el <b>100 % del domicilio</b>. Sin pagar membresía.</li><li>' + ic('check') + 'Tú decides cuándo te conectas.</li><li>' + ic('check') + 'Te avisa con sonido cuando hay un domicilio cerca.</li></ul>' +
      '<h2>Lo que ganas por domicilio</h2><ul class="lm-tarifas">' + tar + '</ul>' +
      '<div class="lm-botones"><button class="btn b-sol lm-btn-xl" type="button" data-act="rep-vista" data-v="registro">' + ic('user') + 'QUIERO SER REPARTIDOR</button><button class="btn lm-btn-xl" type="button" data-act="rep-vista" data-v="entrar">' + ic('lock') + 'YA TENGO CUENTA · ENTRAR</button></div></section>' +
      LM.ayuda('¿Cómo funciona?', ['Te registras con tus datos, tu foto, la cédula, el pase y la moto.', 'LobaMall revisa tus papeles y te aprueba.', 'Presionas <b>ESTOY CONECTADO</b> y te llegan los domicilios de tu zona.', 'Aceptas uno, lo recoges, lo llevas, tomas la foto de entrega y listo.']) +
      '</div>';
  }

  function vEntrar() {
    return '<div class="lm-wrap">' + barra(null) + '<form class="lm-card lm-form" data-form="rep-entrar"><h1>' + ic('lock') + 'Entrar</h1>' +
      '<div class="campo"><label for="reU">Tu celular o usuario</label><input id="reU" name="u" required autocomplete="username" inputmode="text" placeholder="300 000 0000"></div>' +
      '<div class="campo"><label for="reP">Clave</label><input id="reP" name="p" type="password" required autocomplete="current-password"></div>' +
      (R.err ? '<p class="err" role="alert">' + esc(R.err) + '</p>' : '') +
      '<button class="btn b-sol lm-btn-xl" type="submit"' + (R.enviando ? ' disabled' : '') + '>' + ic('arrow') + 'ENTRAR</button>' +
      '<button class="btn b-ghost" type="button" data-act="rep-vista" data-v="landing">' + ic('chevl') + 'Volver</button>' +
      '<p class="muted">Cuentas de prueba (clave 1234): <b>danto</b> (aprobado), <b>yeison</b> (en revisión), <b>kelly</b> (rechazado).</p></form></div>';
  }

  function campoFoto(k, titulo, ayuda, captura) {
    const f = R.fotos[k];
    return '<div class="lm-foto-campo"><span class="l">' + esc(titulo) + '</span><label class="lm-foto' + (f ? ' lista' : '') + '">' + (f ? '<img src="' + f + '" alt="">' : ic('camera')) +
      '<span>' + (f ? 'Cambiar foto' : 'Tomar foto') + '</span><input type="file" accept="image/*" capture="' + captura + '" data-chg="rep-foto" data-k="' + k + '"></label><small>' + esc(ayuda) + '</small></div>';
  }

  function vRegistro(prev) {
    const z = API.zonas;
    if (!z.length) API.cargarZonas().then(() => { if (enRep()) pintar(); });
    const v = prev || {};
    const cuenta = !API.yo;
    return '<div class="lm-wrap">' + barra(null) + '<form class="lm-card lm-form" data-form="rep-registro" novalidate><h1>' + ic('user') + (prev ? 'Corrige tu solicitud' : 'Registro de repartidor') + '</h1>' +
      (prev && prev.motivo_rechazo ? '<div class="aviso warn">' + ic('alert') + '<span><b>Lo que hay que corregir:</b> ' + esc(prev.motivo_rechazo) + '</span></div>' : '') +
      '<p class="muted">Todo se revisa con cuidado. Tus documentos solo los ve el equipo de LobaMall.</p>' +
      '<fieldset class="lm-fs"><legend>1. Tus datos</legend>' +
      '<div class="campo"><label for="rgNom">Nombre completo</label><input id="rgNom" name="nombre_completo" required value="' + esc(v.nombre_completo || (API.yo && API.yo.nombre) || '') + '" autocomplete="name"></div>' +
      '<div class="campo"><label for="rgCed">Número de cédula</label><input id="rgCed" name="cedula" inputmode="numeric" required value="' + esc(v.cedula || '') + '"></div>' +
      '<div class="campo"><label for="rgTel">Celular</label><input id="rgTel" name="telefono" inputmode="tel" required value="' + esc(v.telefono || (API.yo && API.yo.telefono) || '') + '" placeholder="300 000 0000"></div>' +
      '<div class="campo"><label for="rgNeq">Nequi (para pagarte)</label><input id="rgNeq" name="nequi" inputmode="tel" required value="' + esc(v.nequi || '') + '" placeholder="Si es el mismo celular, escríbelo igual"></div>' +
      (cuenta ? '<div class="campo"><label for="rgCla">Crea una clave (mínimo 4)</label><input id="rgCla" name="clave" type="password" required minlength="4" autocomplete="new-password"></div>' : '') +
      '</fieldset><fieldset class="lm-fs"><legend>2. Fotos</legend><div class="lm-fotos">' +
      campoFoto('foto', 'Tu foto', 'De frente, sin gafas ni casco.', 'user') + campoFoto('cedula_foto', 'Cédula', 'Por el lado de la foto, que se lea.', 'environment') + campoFoto('pase_foto', 'Pase de conducción', 'Vigente y que se lea.', 'environment') +
      '</div></fieldset><fieldset class="lm-fs"><legend>3. Tu moto</legend>' +
      '<div class="row2"><div class="campo"><label for="rgMar">Marca</label><input id="rgMar" name="moto_marca" required value="' + esc(v.moto_marca || '') + '" placeholder="Bajaj Boxer"></div><div class="campo"><label for="rgCol">Color</label><input id="rgCol" name="moto_color" required value="' + esc(v.moto_color || '') + '" placeholder="Roja"></div></div>' +
      '<div class="campo"><label for="rgPla">Placa</label><input id="rgPla" name="placa" required value="' + esc(v.placa || '') + '" placeholder="ABC12D" style="text-transform:uppercase" autocapitalize="characters"></div>' +
      '</fieldset><fieldset class="lm-fs"><legend>4. ¿Dónde trabajas?</legend><div class="lm-opciones">' +
      (z.length ? z : [{ id: 'hatillo', nombre: 'Hatillo cabecera' }]).map(x => '<label class="lm-opcion"><input type="radio" name="zona_id" value="' + esc(x.id) + '"' + ((v.zona_id || 'hatillo') === x.id ? ' checked' : '') + '><span>' + ic('pin') + esc(x.nombre) + '</span></label>').join('') +
      '</div></fieldset>' +
      '<label class="lm-habeas"><input type="checkbox" name="habeas_data" required><span><b>Autorizo el tratamiento de mis datos personales.</b> LobaMall usará mi nombre, cédula, fotos, datos de la moto, celular, Nequi y mi ubicación (solo mientras llevo un domicilio) para verificar mi identidad, asignarme domicilios, pagarme y atender reclamos, según la Ley 1581 de 2012. Puedo conocer, corregir o pedir que borren mis datos cuando quiera. <a href="privacidad.html" target="_blank" rel="noopener">Leer la política de tratamiento de datos</a>.</span></label>' +
      (R.err ? '<p class="err" role="alert">' + esc(R.err) + '</p>' : '') +
      '<button class="btn b-sol lm-btn-xl" type="submit"' + (R.enviando ? ' disabled' : '') + '>' + ic('check') + (R.enviando ? 'ENVIANDO…' : 'ENVIAR MI SOLICITUD') + '</button>' +
      (cuenta ? '<button class="btn b-ghost" type="button" data-act="rep-vista" data-v="landing">' + ic('chevl') + 'Volver</button>' : '<button class="btn b-ghost" type="button" data-act="go" data-h="inicio">' + ic('chevl') + 'Ahora no, ir a la tienda</button>') +
      '</form></div>';
  }

  function vPendiente(r) {
    return '<div class="lm-wrap">' + barra(r) + '<section class="lm-card lm-centro lm-espera"><span class="lm-reloj">' + ic('clock') + '</span><h1>Tu solicitud está en revisión</h1>' +
      '<p class="lm-grande">El equipo de LobaMall está revisando tus papeles. Cuando te aprueben te llega un aviso y aquí mismo aparece tu tablero de trabajo.</p>' +
      '<p class="muted">Mientras tanto no recibes domicilios. Puedes seguir usando LobaMall como cliente.</p>' +
      '<div class="lm-botones"><button class="btn b-sol lm-btn-xl" type="button" data-act="rep-recargar">' + ic('repeat') + 'VER SI YA ME APROBARON</button><button class="btn lm-btn-xl" type="button" data-act="go" data-h="inicio">' + ic('bolsa') + 'USAR LOBAMALL COMO CLIENTE</button></div>' +
      '<button class="btn b-ghost" type="button" data-act="rep-salir">' + ic('logout') + 'Salir</button></section></div>';
  }
  function vRechazado(r) {
    return '<div class="lm-wrap">' + barra(r) + '<section class="lm-card lm-centro"><span class="lm-reloj no">' + ic('alert') + '</span><h1>Tu solicitud no fue aprobada</h1>' +
      '<div class="aviso warn" style="text-align:left">' + ic('alert') + '<span><b>Motivo:</b> ' + esc(r.motivo_rechazo || 'Sin motivo') + '</span></div>' +
      '<div class="lm-botones"><button class="btn b-sol lm-btn-xl" type="button" data-act="rep-vista" data-v="corregir">' + ic('edit') + 'CORREGIR Y ENVIAR DE NUEVO</button><button class="btn lm-btn-xl" type="button" data-act="go" data-h="inicio">' + ic('bolsa') + 'USAR LOBAMALL COMO CLIENTE</button></div>' +
      '<button class="btn b-ghost" type="button" data-act="rep-salir">' + ic('logout') + 'Salir</button></section></div>';
  }
  function vVolver() {
    return '<div class="lm-wrap"><section class="lm-card lm-centro"><h1>Estás en modo cliente</h1><p class="lm-grande">En modo cliente no te llegan domicilios.</p><button class="btn b-sol lm-btn-xl" type="button" data-act="rep-modo" data-m="trabajo">' + ic('moto') + 'VOLVER A MODO TRABAJO</button><button class="btn lm-btn-xl" type="button" data-act="go" data-h="inicio">' + ic('bolsa') + 'Seguir comprando</button></section></div>';
  }

  function vTablero(r) {
    const d = R.datos, cur = d.en_curso, g = d.ganancias || {};
    const zonas = [r.zona_nombre].concat((r.zonas_extra || []).map(z => (API.zonas.find(x => x.id === z) || { nombre: z }).nombre));
    const modoBtn = '<button class="btn lm-btn-modo" type="button" data-act="rep-modo" data-m="cliente"' + (cur ? ' data-bloq="1"' : '') + '>' + ic('bolsa') + 'CAMBIAR A MODO CLIENTE</button>';
    const con = r.conectado;
    return '<div class="lm-wrap lm-tablero">' + barra(r, modoBtn) +
      '<button class="lm-conexion ' + (con ? 'on' : 'off') + '" type="button" data-act="rep-conectar" aria-pressed="' + con + '"><i></i><span><b>' + (con ? 'ESTOY CONECTADO' : 'ESTOY DESCONECTADO') + '</b><small>' + (con ? 'Te llegan domicilios de ' + esc(zonas.join(', ')) + '. Toca para desconectarte.' : 'No te llegan domicilios. Toca para conectarte.') + '</small></span></button>' +
      vPushAviso() +
      (cur ? vEnCurso(cur) : vCartelera(con)) +
      '<section class="lm-card"><h2>' + ic('wallet') + 'Tus ganancias</h2><p class="lm-grande">Hoy has hecho <b>' + (g.hoy_n || 0) + '</b> domicilio' + (g.hoy_n === 1 ? '' : 's') + ', ganaste <b class="num">' + pesos(g.hoy || 0) + '</b>.</p>' +
      '<div class="lm-kpis"><div><small>Hoy</small><b class="num">' + pesos(g.hoy || 0) + '</b><span>' + (g.hoy_n || 0) + ' dom.</span></div><div><small>Esta semana</small><b class="num">' + pesos(g.semana || 0) + '</b><span>' + (g.sem_n || 0) + ' dom.</span></div><div><small>Este mes</small><b class="num">' + pesos(g.mes || 0) + '</b><span>' + (g.mes_n || 0) + ' dom.</span></div></div>' +
      '<div id="lmCajaRep"><button class="btn b-sm" type="button" data-act="rep-caja">' + ic('cash') + 'Ver mi caja con los negocios</button></div></section>' +
      '<section class="lm-card lm-perfil"><h2>' + ic('user') + 'Mi perfil</h2><p><b>' + esc(r.nombre_completo) + '</b> · ' + esc(ESTRELLAS(r.promedio)) + (r.calificaciones ? ' (' + r.calificaciones + ')' : '') + '</p><p>Moto ' + esc(r.moto_marca) + ' ' + esc(r.moto_color) + ' · placa <b>' + esc(r.placa) + '</b></p><p>Nequi ' + esc(r.nequi) + '</p>' +
      '<button class="btn b-ghost" type="button" data-act="rep-salir">' + ic('logout') + 'Salir de mi cuenta</button></section>' +
      LM.ayuda('¿Cómo llevo un domicilio?', ['Presiona <b>ESTOY CONECTADO</b>.', 'Cuando suene, mira la oferta y presiona <b>ACEPTAR DOMICILIO</b>.', 'En el negocio presiona <b>RECOGÍ EN NEGOCIO</b>.', 'Al salir presiona <b>VOY EN CAMINO</b>.', 'Al entregar, toma la <b>foto de entrega</b>. Si era en efectivo, cobra lo que dice la pantalla.']) +
      '</div>';
  }

  function vPushAviso() {
    if (!API.pushActivo || !API.pushSoportado() || R.push === 'activo' || R.push === 'oculto') return ''; // sin llaves VAPID en el servidor no se ofrece
    if (R.push === undefined) { API.pushEstado().then(s => { R.push = s; if (s !== 'activo' && enRep()) pintar(); }); return ''; }
    if (R.push === 'bloqueado') return '<div class="aviso warn lm-push">' + ic('bell') + '<span>Bloqueaste los avisos. Para recibirlos con la app cerrada, actívalos en la configuración del navegador.</span></div>';
    return '<div class="aviso lm-push">' + ic('bell') + '<span><b>¿Quieres que te avise con la app cerrada?</b></span><button class="btn b-sol b-sm" type="button" data-act="rep-push">' + ic('bell') + 'Activar avisos</button></div>';
  }

  function tarjeta(o) {
    const min = Math.max(0, Math.round((new Date(o.vence_en) - Date.now()) / 60000));
    return '<article class="lm-oferta" data-oferta="' + o.id + '"><h3><span>OFERTA #' + o.id + '</span><b class="num">' + esc(o.valor_txt) + '</b></h3>' +
      '<dl><dt>De:</dt><dd>' + esc(o.negocio) + '</dd><dt>Para:</dt><dd>' + esc(o.destino) + '</dd><dt>Pedido:</dt><dd>' + esc(o.pedido) + '</dd><dt>Distancia:</dt><dd>' + esc(o.distancia_txt) + '</dd>' +
      '<dt>Cobro:</dt><dd>' + (o.cobrar ? 'Cobras <b class="num">' + pesos(o.cobrar) + '</b> en efectivo' : 'Ya está pagado (' + esc(o.pago) + '): no cobres') + '</dd></dl>' +
      '<p class="lm-vence" data-vence="' + esc(o.vence_en) + '">' + ic('clock') + 'Vence en ' + min + ' min</p>' +
      '<button class="btn b-monte lm-btn-xl" type="button" data-act="rep-aceptar" data-id="' + o.id + '"' + (R.tomando === o.id ? ' disabled' : '') + '>' + ic('check') + (R.tomando === o.id ? 'ACEPTANDO…' : 'ACEPTAR DOMICILIO') + '</button></article>';
  }
  function vCartelera(con) {
    if (!con) return '<section class="lm-card lm-centro lm-vacio">' + ic('moto') + '<p class="lm-grande">Conéctate para ver los domicilios disponibles.</p></section>';
    return '<section class="lm-cartelera"><h2>' + ic('bell') + 'Domicilios disponibles <span class="pill p-nuevo">' + R.ofertas.length + '</span></h2>' +
      (R.ofertas.length ? R.ofertas.map(tarjeta).join('') : '<div class="lm-card lm-centro lm-vacio">' + ic('clock') + '<p class="lm-grande">No hay domicilios en este momento.</p><p>Deja la app abierta: te avisamos con sonido cuando llegue uno.</p></div>') + '</section>';
  }

  const PASOS = [['aceptada', 'ACEPTADO'], ['recogida', 'RECOGÍ EN NEGOCIO'], ['en_camino', 'VOY EN CAMINO'], ['entregada', 'ENTREGADO']];
  function vEnCurso(c) {
    const i = PASOS.findIndex(p => p[0] === c.estado);
    const tel = t => t ? '<a class="btn b-sm" href="tel:' + esc(t) + '">' + ic('phone') + 'Llamar</a>' : '';
    const sig = c.estado === 'aceptada' ? ['recogida', 'RECOGÍ EN NEGOCIO', 'tienda'] : c.estado === 'recogida' ? ['en_camino', 'VOY EN CAMINO', 'moto'] : null;
    const cobro = c.pago === 'efectivo' ? '<div class="lm-cobro">' + ic('cash') + '<span>Cobra <b class="num">' + pesos(c.total) + '</b> en efectivo.<small>Tu domicilio: ' + pesos(c.valor) + ' · le entregas al negocio ' + pesos(c.total - c.valor) + '</small></span></div>'
      : '<div class="lm-cobro ok">' + ic('check') + '<span>Ya está pagado (' + esc(c.pago) + '). <b>No cobres nada.</b><small>El negocio te paga tu domicilio: ' + pesos(c.valor) + '</small></span></div>';
    const lnk = linkMapa(c.destino_lat, c.destino_lng);
    return '<section class="lm-card lm-curso"><h2>' + ic('moto') + 'Domicilio en curso · #' + (c.numero || c.id) + '</h2>' +
      '<ol class="lm-pasos">' + PASOS.map((p, k) => '<li class="' + (k < i ? 'ok' : k === i ? 'now' : '') + '"><span>' + (k <= i ? ic('check') : k + 1) + '</span>' + p[1] + '</li>').join('') + '</ol>' +
      cobro +
      '<div class="lm-partes"><div><small>Recoges en</small><b>' + esc(c.negocio) + '</b><span>' + esc(c.negocio_dir || '') + '</span>' + tel(c.negocio_tel) + '</div><div><small>Entregas a</small><b>' + esc(c.cliente_nombre || 'Cliente') + '</b><span>' + esc(c.direccion || c.destino) + '</span>' + tel(c.cliente_tel) + (lnk ? '<a class="btn b-sm" href="' + lnk + '" target="_blank" rel="noopener">' + ic('pin') + 'Ver en el mapa</a>' : '') + '</div></div>' +
      '<p class="lm-pedido">' + ic('bolsa') + esc(c.pedido) + '</p>' +
      '<div id="lmMapaRep" class="lm-mapa"></div>' +
      (sig ? '<button class="btn b-sol lm-btn-xl" type="button" data-act="rep-paso" data-id="' + c.id + '" data-e="' + sig[0] + '">' + ic(sig[2]) + sig[1] + '</button>'
        : '<label class="btn b-monte lm-btn-xl lm-entregar">' + ic('camera') + 'ENTREGADO · TOMAR FOTO<input type="file" accept="image/*" capture="environment" data-chg="rep-evidencia" data-id="' + c.id + '"></label><p class="muted">La foto se comprime en tu celular antes de enviarla, para que suba aunque haya poca señal.</p>') +
      '<button class="btn b-ghost lm-cancelar" type="button" data-act="rep-cancelar" data-id="' + c.id + '">' + ic('x') + 'No puedo llevarlo (cancelar)</button></section>';
  }

  /* =================== UBICACIÓN: solo mientras hay un domicilio en curso =================== */
  function ubicacion() {
    const cur = R.datos && R.datos.en_curso;
    if (cur && navigator.geolocation && R.ubiWatch == null) {
      R.ubiWatch = navigator.geolocation.watchPosition(p => {
        R.ubiPos = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (R.mapa && R.mapa.moverMoto) R.mapa.moverMoto(R.ubiPos.lat, R.ubiPos.lng);
        if (Date.now() - R.ubiUlt < 10000) return; // cada 10 s: ahorra datos y batería
        R.ubiUlt = Date.now();
        API.post('/api/repartidor/ubicacion', { lat: R.ubiPos.lat, lng: R.ubiPos.lng, precision: p.coords.accuracy }).catch(() => {});
      }, () => {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
    } else if (!cur && R.ubiWatch != null) {
      navigator.geolocation.clearWatch(R.ubiWatch); R.ubiWatch = null; R.ubiPos = null;
    }
  }

  /* =================== ACCIONES =================== */
  const A = LM.A, F = LM.F;
  A['rep-vista'] = el => { R.vista = el.dataset.v; R.err = ''; if (R.vista === 'corregir') R.fotos = {}; pintar(); scrollTo(0, 0); };
  A['rep-recargar'] = async () => { R.datos = null; await API.cargarYo(); await refrescar(); };
  A['rep-salir'] = async () => { await API.salir(); const s = LM.S; s.session = null; LM.save(); R.datos = null; R.vista = 'landing'; toast('Saliste de tu cuenta'); pintar(); };
  F['rep-entrar'] = async (f, d) => {
    R.err = ''; R.enviando = true;
    try { await API.entrar(String(d.get('u')), String(d.get('p'))); R.datos = null; R.vista = 'landing'; sesionCliente(); await entrarModoTrabajo(); }
    catch (e) { R.err = e.message; }
    R.enviando = false; pintar();
  };
  A['go-rep'] = () => { try { document.getElementById('gate') && document.getElementById('gate').remove(); } catch (e) {} closeModal(); LM.go('rep'); };

  LM.document = document;
  document.addEventListener('change', async e => {
    const el = e.target;
    if (el.dataset.chg === 'rep-foto') {
      const f = el.files[0]; if (!f) return;
      try { R.fotos[el.dataset.k] = await LM.comprimir(f, 1000, 0.7); } catch (x) { toast('No se pudo leer la foto. Intenta de nuevo.'); }
      const form = el.closest('form'); const datos = form ? new FormData(form) : null;
      pintar();
      if (datos) restaurar(datos);
    } else if (el.dataset.chg === 'rep-evidencia') {
      const f = el.files[0]; if (!f) return;
      const id = el.dataset.id;
      toast('Enviando la foto de entrega…');
      try {
        const foto = await LM.comprimir(f, 800, 0.6);
        const pos = R.ubiPos || {};
        const r = await API.post('/api/repartidor/ofertas/' + id + '/entregar', { foto, lat: pos.lat, lng: pos.lng });
        LM.sonar(); toast('¡Entregado! Llevas ' + r.ganancias.hoy_n + ' domicilios hoy: ' + pesos(r.ganancias.hoy));
      } catch (x) { LM.sonar('error'); toast(x.message); }
      await refrescar();
    }
  });
  // Al redibujar el formulario por una foto, se devuelven los datos que ya estaban escritos
  function restaurar(datos) {
    const f = document.querySelector('form[data-form="rep-registro"]'); if (!f) return;
    for (const [k, v] of datos.entries()) {
      const el = f.elements[k]; if (!el || typeof v !== 'string') continue;
      if (el.length && el[0] && el[0].type === 'radio') [...el].forEach(r => r.checked = r.value === v);
      else if (el.type === 'checkbox') el.checked = true; else el.value = v;
    }
  }

  F['rep-registro'] = async (f, d) => {
    R.err = '';
    const b = Object.fromEntries([...d.entries()].filter(([k, v]) => typeof v === 'string'));
    b.habeas_data = !!d.get('habeas_data');
    const falta = !b.habeas_data ? 'Debes marcar la autorización de tratamiento de datos.' : !R.fotos.foto ? 'Falta tu foto.' : !R.fotos.cedula_foto ? 'Falta la foto de la cédula.' : !R.fotos.pase_foto ? 'Falta la foto del pase.' : '';
    if (falta) { R.err = falta; pintar(); restaurar(d); return; }
    Object.assign(b, R.fotos);
    R.enviando = true; pintar(); restaurar(d);
    try {
      await API.post('/api/repartidor/solicitud', b);
      R.fotos = {}; R.vista = 'landing'; R.datos = null;
      await API.cargarYo(); API.conectarEventos(true); sesionCliente();
      toast('¡Solicitud enviada! Te avisamos cuando la revisen.');
    } catch (e) { R.err = e.message; }
    R.enviando = false; await refrescar();
    if (R.err) restaurar(d);
  };

  A['rep-conectar'] = async () => {
    const r = R.datos.repartidor, nuevo = !r.conectado;
    try {
      const x = await API.put('/api/repartidor/conectado', { conectado: nuevo });
      r.conectado = x.conectado; R.ofertas = x.ofertas || [];
      R.ofertas.forEach(o => vistas.add(o.id + ':' + o.intento)); guardarVistas();
      toast(x.conectado ? 'Conectado. Te avisamos cuando haya domicilios.' : 'Desconectado. No te llegan domicilios.');
      if (x.conectado && R.ofertas.length) LM.sonar();
    } catch (e) { toast(e.message); }
    pintar();
  };
  A['rep-push'] = async () => {
    try { await API.activarPush(); R.push = 'activo'; toast('Listo: te avisamos aunque la app esté cerrada.'); }
    catch (e) { toast(e.message); if (e.codigo === 'push_apagado' || e.codigo === 'no_soportado') R.push = 'oculto'; }
    pintar();
  };
  A['rep-aceptar'] = async el => {
    const id = +el.dataset.id;
    R.tomando = id; pintar();
    try {
      const r = await API.post('/api/repartidor/ofertas/' + id + '/aceptar');
      R.datos.en_curso = r.en_curso; R.ofertas = [];
      LM.sonar(); toast('¡Es tuyo! Ve a recoger a ' + r.en_curso.negocio + '.');
      R.tomando = null; ubicacion(); pintar(); scrollTo(0, 0);
    } catch (e) {
      R.tomando = null;
      if (e.codigo === 'ya_tomada') { R.ofertas = R.ofertas.filter(o => o.id !== id); LM.sonar('error'); toast('Esta oferta ya fue tomada.'); }
      else toast(e.message);
      pintar();
    }
  };
  A['rep-paso'] = async el => {
    try { const r = await API.post('/api/repartidor/ofertas/' + el.dataset.id + '/estado', { estado: el.dataset.e }); R.datos.en_curso = r.en_curso; toast(el.dataset.e === 'recogida' ? 'Listo. Cuando salgas, presiona VOY EN CAMINO.' : 'El cliente ya sabe que vas en camino.'); }
    catch (e) { toast(e.message); await cargar(); }
    pintar();
  };
  A['rep-cancelar'] = el => {
    sheet('<div class="sh-h"><div class="tt"><small>Domicilio #' + esc(el.dataset.id) + '</small><h3>¿Por qué no puedes llevarlo?</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="rep-cancelar" data-id="' + esc(el.dataset.id) + '"><div class="lm-opciones">' +
      ['Se me dañó la moto', 'Se me pinchó la llanta', 'Emergencia personal', 'El negocio se demora mucho', 'Está muy lejos'].map((m, i) => '<label class="lm-opcion"><input type="radio" name="m" value="' + m + '"' + (i ? '' : ' checked') + '><span>' + m + '</span></label>').join('') +
      '</div><div class="campo"><label for="rcOtro">Otro motivo</label><input id="rcOtro" name="otro" placeholder="Escribe aquí si es otro"></div>' +
      '<div class="aviso warn">' + ic('alert') + '<span>El domicilio vuelve a la cartelera para otro repartidor. Si ya recogiste el pedido, devuélvelo al negocio.</span></div>' +
      '<button class="btn b-rojo lm-btn-xl" type="submit">' + ic('x') + 'CANCELAR ESTE DOMICILIO</button></form>');
  };
  F['rep-cancelar'] = async (f, d) => {
    const motivo = String(d.get('otro') || '').trim() || String(d.get('m') || '');
    try { await API.post('/api/repartidor/ofertas/' + f.dataset.id + '/cancelar', { motivo }); closeModal(); toast('Cancelado. El domicilio volvió a la cartelera.'); }
    catch (e) { toast(e.message); }
    await refrescar();
  };
  A['rep-caja'] = async () => {
    const box = document.getElementById('lmCajaRep'); if (!box) return;
    try {
      const { saldos } = await API.get('/api/repartidor/caja');
      box.innerHTML = saldos.length ? '<ul class="lm-caja">' + saldos.map(s => '<li><b>' + esc(s.nombre) + '</b>' + (s.saldo > 0 ? '<span class="debe">Le debes entregar <b class="num">' + pesos(s.saldo) + '</b></span>' : '<span class="ok">Te debe <b class="num">' + pesos(-s.saldo) + '</b></span>') + '</li>').join('') + '</ul>' : '<p class="muted">Estás a paz y salvo con todos los negocios.</p>';
    } catch (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
  };

  /* =================== MODO DUAL =================== */
  // La vista de cliente usa la misma cuenta: se arma la sesión de cliente de la tienda con sus datos
  function sesionCliente() {
    const y = API.yo; if (!y) return;
    const S = LM.S, u = y.usuario || y.telefono;
    if (S.user.usuario !== u) S.user = { usuario: u, nombre: y.nombre, cel: y.telefono, dirs: [], favT: [], favP: [], fiados: [], srv: true };
    S.session = { rol: 'cliente', u };
    LM.save();
  }
  async function entrarModoTrabajo() {
    // Al entrar, el repartidor aprobado arranca en MODO TRABAJO (no en la vitrina)
    if (!aprobado()) return;
    if (rep().modo_actual !== 'trabajo') { try { const x = await API.put('/api/repartidor/modo', { modo: 'trabajo' }); Object.assign(rep(), x); } catch (e) {} }
  }
  A['rep-modo'] = async el => {
    const modo = el.dataset.m;
    try {
      const x = await API.put('/api/repartidor/modo', { modo });
      Object.assign(rep(), x); if (R.datos && R.datos.repartidor) Object.assign(R.datos.repartidor, x);
      if (modo === 'cliente') { sesionCliente(); toast('Modo cliente: no te llegan domicilios.'); LM.go('inicio'); }
      else { R.datos = null; toast(x.conectado ? 'Modo trabajo. Sigues conectado.' : 'Modo trabajo. Estás desconectado.'); if (enRep()) refrescar(); else LM.go('rep'); }
    } catch (e) {
      // ej.: "Tienes el domicilio #127 en curso. Entrégalo antes de cambiar a modo cliente."
      LM.sonar('error');
      sheet('<div class="sh-h"><div class="tt"><h3>No puedes cambiar de modo ahora</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><div class="sh-b"><div class="aviso warn">' + ic('alert') + '<span class="lm-grande">' + esc(e.message) + '</span></div></div><div class="sh-f"><button class="btn b-sol" type="button" data-act="cerrar">Entendido</button></div>');
    }
  };

  // Barra fija arriba en la vista de cliente: siempre visible para volver a trabajar
  LM.trasRender(r => {
    const enCli = aprobado() && rep().modo_actual === 'cliente' && r !== 'rep';
    let b = document.getElementById('lmVolver');
    const h = document.querySelector('header.top');
    if (enCli && h) {
      if (!b) { h.insertAdjacentHTML('afterbegin', '<div id="lmVolver" class="lm-volver"><button class="btn b-sol" type="button" data-act="rep-modo" data-m="trabajo">' + ic('moto') + 'VOLVER A MODO TRABAJO</button></div>'); }
    } else if (b) b.remove();
    document.body.classList.toggle('lm-modo-cliente', !!enCli);
  });

  /* =================== TIEMPO REAL =================== */
  API.on('oferta_nueva', o => {
    if (!R.datos || !aprobado() || rep().modo_actual !== 'trabajo') return;
    if (R.datos.en_curso) return;
    const k = o.id + ':' + o.intento;
    if (!R.ofertas.some(x => x.id === o.id)) R.ofertas.push(o);
    if (!vistas.has(k)) { vistas.add(k); guardarVistas(); LM.sonar(); toast('Nuevo domicilio: ' + o.valor_txt + ' · ' + o.negocio); }
    if (enRep()) pintar();
  });
  API.on('oferta_retirada', d => {
    const antes = R.ofertas.length;
    R.ofertas = R.ofertas.filter(o => o.id !== d.id);
    if (antes !== R.ofertas.length && enRep()) {
      const card = document.querySelector('[data-oferta="' + d.id + '"]');
      if (card && !d.tuya) { card.classList.add('lm-se-va'); setTimeout(pintar, 350); } else pintar();
    }
  });
  API.on('domicilio_estado', d => { if (R.datos && R.datos.en_curso && R.datos.en_curso.id === d.oferta_id && ['cancelada'].includes(d.estado)) { LM.sonar('error'); toast(d.texto); refrescar(); } });
  API.on('repartidor_revisado', d => { toast(d.estado === 'aprobado' ? '¡Te aprobaron! Ya puedes conectarte.' : 'Revisaron tu solicitud.'); R.datos = null; API.cargarYo().then(refrescar); });
  API.on('reconectado', () => { if (R.datos && aprobado()) refrescar(); });
  API.on('yo', () => { if (!API.yo) { R.datos = null; } });

  // Cuenta regresiva de las ofertas
  setInterval(() => { document.querySelectorAll('.lm-vence[data-vence]').forEach(el => { const m = Math.max(0, Math.round((new Date(el.dataset.vence) - Date.now()) / 60000)); el.lastChild.textContent = m ? 'Vence en ' + m + ' min' : 'Vence en menos de 1 min'; }); }, 20000);

  /* =================== RUTA Y ENTRADAS =================== */
  LM.rutaExt(r => r === 'rep', () => { pintar(); }, { sinGate: true, clase: 'mode-rep' });

  LM.EXT.gateExtra = () => '<button class="btn b-ghost lm-gate-rep" type="button" data-act="go-rep">' + ic('moto') + 'Soy repartidor o mototaxista</button>';
  LM.EXT.loginExtra = cli => cli ? '' : '<button class="btn b-ghost b-full lm-login-rep" type="button" data-act="go-rep">' + ic('moto') + '¿Eres repartidor o mototaxista? Entra aquí</button>';

  // Al abrir la app: si es repartidor aprobado en modo trabajo, arranca en su tablero
  API.on('listo', () => {
    if (!aprobado()) return;
    const h = (location.hash || '#inicio').slice(1);
    if (rep().modo_actual === 'trabajo' && (h === 'inicio' || h === '')) LM.go('rep');
  });
})();
