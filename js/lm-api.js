/* LobaMall v7 · conexión con el servidor (API), tiempo real, avisos push y utilidades comunes.
   Si la app se abre sin servidor (archivo suelto o Netlify), todo lo de antes sigue funcionando
   y las pantallas nuevas explican que necesitan el servidor. */
(function () {
  'use strict';
  const LM = window.LM, E = LM.EXT;
  const { esc, ic, toast } = LM;

  /* ---------- peticiones ---------- */
  class ErrorLM extends Error { constructor(m, codigo, status, datos) { super(m); this.codigo = codigo; this.status = status; this.datos = datos || {}; } }
  async function pedir(metodo, ruta, cuerpo) {
    let r;
    try {
      r = await fetch(ruta, {
        method: metodo, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-LobaMall': '1' },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    } catch (e) { throw new ErrorLM('No hay señal o el servidor no responde. Intenta de nuevo.', 'sin_red', 0); }
    let d = {};
    try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new ErrorLM(d.error || 'Algo falló. Intenta de nuevo.', d.codigo || 'error', r.status, d);
    return d;
  }

  const API = {
    disponible: null, yo: null, pushActivo: false, zonas: [],
    pedir,
    get: r => pedir('GET', r), post: (r, b) => pedir('POST', r, b || {}), put: (r, b) => pedir('PUT', r, b || {}),
    async estado() {
      if (location.protocol === 'file:') { API.disponible = false; return false; }
      try { const d = await pedir('GET', '/api/estado'); API.disponible = !!d.ok; API.pushActivo = !!d.push; }
      catch (e) { API.disponible = false; }
      return API.disponible;
    },
    async cargarYo() {
      if (!API.disponible) return null;
      try { API.yo = (await pedir('GET', '/api/auth/yo')).usuario; } catch (e) { API.yo = null; }
      emitir('yo', API.yo);
      return API.yo;
    },
    async entrar(usuario, clave) {
      const d = await pedir('POST', '/api/auth/entrar', { usuario, clave });
      API.yo = d.usuario; emitir('yo', API.yo); conectarEventos(true);
      return d.usuario;
    },
    async salir() {
      try { await pedir('POST', '/api/auth/salir'); } catch (e) {}
      API.yo = null; cerrarEventos(); emitir('yo', null);
    },
    async cargarZonas() {
      if (API.zonas.length || !API.disponible) return API.zonas;
      try { API.zonas = (await pedir('GET', '/api/zonas')).zonas; } catch (e) {}
      return API.zonas;
    },
    tieneRol: r => !!(API.yo && API.yo.roles && API.yo.roles.includes(r)),
    esDeNegocio: nid => !!(API.yo && (API.yo.negocios || []).some(n => n.id === nid)) || API.tieneRol('admin'),
    ErrorLM
  };
  LM.api = API;

  // Zonas de la tienda (prototipo) → zonas del servidor
  LM.zonaSrv = z => ({ cabecera: 'hatillo', chimi: 'chimi', sanmartin: 'sanmartin', barranco: 'barranco' }[z] || 'hatillo');
  const PAGO_SRV = { efectivo: 'efectivo', nequi: 'nequi', banco: 'banco', fiado: 'fiado', saldo: 'banco' };
  LM.pagoSrv = p => PAGO_SRV[p] || 'efectivo';

  /* ---------- pequeños eventos internos ---------- */
  const oyentes = {};
  function on(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); }
  function emitir(ev, d) { (oyentes[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }
  API.on = on; API.emitir = emitir;

  /* ---------- tiempo real (SSE) ---------- */
  let es = null, reintento = null;
  const EVENTOS = ['hola', 'oferta_nueva', 'oferta_retirada', 'domicilio_estado', 'ubicacion', 'notificacion', 'repartidor_revisado', 'pedido_nuevo', 'pedido_estado', 'mesa'];
  function conectarEventos(forzar) {
    if (!API.disponible || !API.yo || !window.EventSource) return;
    if (es && !forzar) return;
    cerrarEventos();
    es = new EventSource('/api/eventos');
    EVENTOS.forEach(ev => es.addEventListener(ev, m => { let d = {}; try { d = JSON.parse(m.data); } catch (e) {} emitir(ev, d); }));
    // Al volver la señal se reconecta solo; avisamos para recargar la cartelera (sin duplicar avisos)
    es.onopen = () => emitir('reconectado');
    es.onerror = () => {
      if (es && es.readyState === 2) { cerrarEventos(); clearTimeout(reintento); reintento = setTimeout(() => conectarEventos(), 5000); }
    };
  }
  function cerrarEventos() { if (es) { es.close(); es = null; } }
  API.conectarEventos = conectarEventos;
  addEventListener('online', () => conectarEventos(true));

  // Avisos generales: se muestran como mensaje corto (los de domicilio los maneja la pantalla del repartidor)
  on('notificacion', n => { if (n && n.tipo !== 'oferta_domicilio') toast(n.titulo + (n.cuerpo ? ' · ' + n.cuerpo : '')); });

  /* ---------- Web Push (fase 2) ---------- */
  function b64aBytes(b64) { const p = '='.repeat((4 - b64.length % 4) % 4); const s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); }
  API.pushSoportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  API.pushEstado = async () => {
    if (!API.pushSoportado()) return 'no_soportado';
    if (Notification.permission === 'denied') return 'bloqueado';
    try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); return s ? 'activo' : 'apagado'; } catch (e) { return 'apagado'; }
  };
  API.activarPush = async () => {
    if (!API.pushSoportado()) throw new ErrorLM('Este celular no permite avisos con la app cerrada. Déjala abierta para recibir domicilios.', 'no_soportado');
    const { clave, activo } = await pedir('GET', '/api/push/clave');
    if (!activo || !clave) throw new ErrorLM('Los avisos con la app cerrada todavía no están activados en el servidor.', 'push_apagado');
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new ErrorLM('No diste permiso para los avisos. Puedes activarlo en la configuración del navegador.', 'sin_permiso');
    const reg = await navigator.serviceWorker.ready;
    let s = await reg.pushManager.getSubscription();
    if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(clave) });
    await pedir('POST', '/api/push/suscribir', { suscripcion: s.toJSON() });
    return true;
  };

  /* ---------- fotos: se comprimen en el celular antes de subir ---------- */
  // max: lado más largo en píxeles. calidad: 0 a 1. Devuelve un dataURL JPEG.
  LM.comprimir = async function (archivo, max = 1000, calidad = 0.7) {
    if (!archivo) throw new ErrorLM('No se tomó la foto.', 'sin_foto');
    let fuente, w, h;
    try { fuente = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); w = fuente.width; h = fuente.height; }
    catch (e) {
      fuente = await new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok(im); im.onerror = mal; im.src = URL.createObjectURL(archivo); });
      w = fuente.naturalWidth; h = fuente.naturalHeight;
    }
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(fuente, 0, 0, c.width, c.height);
    let url = c.toDataURL('image/jpeg', calidad);
    // Si quedó pesada (fotos de 48 MP), se baja un poco más la calidad
    for (let q = calidad - 0.15; url.length > 600000 && q > 0.3; q -= 0.15) url = c.toDataURL('image/jpeg', q);
    return url;
  };

  /* ---------- sonido, vibración y voz (sin descargar audio) ---------- */
  let actx = null;
  LM.sonar = function (tipo) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notas = tipo === 'error' ? [[330, 0, .25]] : [[880, 0, .14], [1175, .17, .14], [1568, .34, .22]];
      notas.forEach(([f, t, d]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        const t0 = actx.currentTime + t; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.25, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
        o.start(t0); o.stop(t0 + d + .02);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(tipo === 'error' ? 200 : [250, 120, 250, 120, 400]); } catch (e) {}
  };
  // El navegador solo deja sonar después de que la persona toca la pantalla una vez
  addEventListener('pointerdown', () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} }, { once: true });

  LM.hablar = function (texto) {
    try {
      const s = window.speechSynthesis; if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      const vs = s.getVoices();
      u.voice = vs.find(v => /es[-_]CO/i.test(v.lang)) || vs.find(v => /es[-_](MX|US|419)/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
      u.lang = u.voice ? u.voice.lang : 'es-CO'; u.rate = 0.95;
      s.speak(u);
    } catch (e) {}
  };

  /* ---------- tarjeta de ayuda "¿Cómo se usa?" (para que nadie se pierda) ---------- */
  LM.ayuda = function (titulo, pasos, abierta) {
    const texto = titulo + '. ' + pasos.map((p, i) => 'Paso ' + (i + 1) + ': ' + p.replace(/<[^>]+>/g, '')).join('. ');
    return '<details class="lm-ayuda"' + (abierta ? ' open' : '') + '><summary>' + ic('spark') + '<span>' + esc(titulo) + '</span></summary><ol>' +
      pasos.map(p => '<li>' + p + '</li>').join('') + '</ol><button class="btn b-sm lm-escuchar" type="button" data-act="lm-hablar" data-t="' + esc(texto) + '">' + ic('play', 'fill') + 'Escuchar la explicación</button></details>';
  };
  LM.A['lm-hablar'] = el => LM.hablar(el.dataset.t);

  /* ---------- rutas nuevas (#rep, #admin, #q-…, #escanear) ---------- */
  const rutas = [];
  LM.rutaExt = (prueba, fn, opts) => rutas.push({ prueba, fn, sinGate: !!(opts && opts.sinGate), clase: (opts && opts.clase) || 'mode-ext' });
  E.ruta = r => {
    document.body.classList.remove('mode-rep', 'mode-admin', 'mode-ext');
    const x = rutas.find(x => x.prueba(r));
    if (!x) return false;
    document.body.classList.add(x.clase);
    x.fn(r);
    return true;
  };
  E.sinGate = () => { const r = (location.hash || '').slice(1); return rutas.some(x => x.sinGate && x.prueba(r)); };
  const trasRender = [];
  LM.trasRender = fn => trasRender.push(fn);
  E.trasRender = r => trasRender.forEach(f => { try { f(r); } catch (e) { console.error(e); } });

  // Pantalla estándar de "necesita el servidor"
  LM.sinServidorH = (que) => '<div class="lm-wrap"><div class="lm-card lm-centro">' + ic('wifioff') + '<h1>Esto necesita el servidor de LobaMall</h1><p>' + esc(que) +
    ' funciona cuando la app está publicada con su servidor y base de datos. Si estás sin señal, espera a que vuelva y presiona <b>Reintentar</b>.</p><button class="btn b-sol b-lg" type="button" data-act="lm-reintentar">' + ic('repeat') + 'Reintentar</button><button class="btn b-lg" type="button" data-act="go" data-h="inicio">' + ic('home') + 'Ir a la tienda</button></div></div>';
  LM.A['lm-reintentar'] = async () => { await API.estado(); await API.cargarYo(); LM.rerender(); };

  /* ---------- sesión: al entrar en la tienda también se entra al servidor ---------- */
  E.trasLogin = (rol, u, p) => {
    if (!API.disponible) return;
    API.entrar(u, p).then(() => { emitir('sesion', rol); }).catch(() => {});
  };
  E.trasSalir = () => { if (API.yo) API.salir(); };

  // Un pedido hecho en la tienda se copia al servidor si la persona tiene cuenta allá:
  // así el negocio lo ve en otro celular y el repartidor lo puede llevar.
  E.trasPedido = async o => {
    if (!API.disponible || !API.yo) return;
    try {
      const d = await pedir('POST', '/api/pedidos', {
        negocio_id: o.t, numero: o.n, modo: o.modo, zona_id: LM.zonaSrv(o.zona), direccion: o.dir, pago: LM.pagoSrv(o.pago), descuento: o.desc,
        items: o.items.map(it => ({ id: it.id, n: (LM.PR(it.id) || {}).n || it.id, q: it.q, p: it.p }))
      });
      const loc = LM.S.orders.find(x => x.n === o.n);
      if (loc) {
        loc.srv = d.pedido.id;
        // Mismo número en el celular del cliente y en el del negocio (si el servidor tuvo que cambiarlo)
        if (d.pedido.numero !== loc.n && !LM.S.orders.some(x => x.n === d.pedido.numero)) { loc.n = d.pedido.numero; LM.S.nPed = Math.max(LM.S.nPed, loc.n + 1); }
        LM.save();
      }
    } catch (e) { /* el negocio aún no está en el servidor: el pedido sigue funcionando como antes */ }
  };

  /* ---------- arranque ---------- */
  API.listo = (async () => {
    await API.estado();
    if (API.disponible) { await API.cargarYo(); conectarEventos(); }
    emitir('listo');
    LM.rerender();
  })();
})();
