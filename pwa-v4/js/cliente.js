/* ============================================================
   MESA Y RUTA · aplicación del cliente
   Entrada → (instalar) → registro → inicio con publicidad →
   menú en carrusel → receta → salsas → bebidas → resumen →
   forma de pago → ticket → enviar → estado con aviso de voz,
   chat con asistente, reservas y perfil.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG, N = window.N, U = N.U, D = N.D;
  const { $, $$, esc, pesos } = U;
  const svg = id => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const ANIMAR = U.animar;

  // ------------------------------------------------------------ estado
  const E = {
    cat: 'fogon', i: 0, etapa: 'carrusel', arma: nuevaArma(),
    carrito: U.ls.get('myr2_carrito', []), modo: U.ls.get('myr2_modo', null),
    pago: { tipo: null, conCuanto: '' }, nota: '',
    pedidoId: U.ls.get('myr2_pedido', null), borrador: null,
    pila: [], volverTrasCuenta: false, google: null,
    estados: U.ls.get('myr2_estados', {}), rvEstados: U.ls.get('myr2_rv_estados', {}), mrTab: 'prox', rv: { ocasion: 'cumpleanos', dia: null, hora: null, n: 2 }
  };
  function nuevaArma() { return { quitados: new Set(), salsas: new Set(), bebidas: new Map(), cant: 1 }; }
  const guardarCarrito = () => U.ls.set('myr2_carrito', E.carrito);
  const guardarModo = () => U.ls.set('myr2_modo', E.modo);

  // ------------------------------------------------------------ navegación con historial y transiciones
  function mostrar(id, dir) {
    const cambiar = () => {
      $$('.vista').forEach(v => v.classList.toggle('oculta', v.id !== 'v-' + id));
      document.body.dataset.vista = id;
      window.scrollTo(0, 0);
      alEntrar(id);
    };
    if (ANIMAR && document.startViewTransition) {
      document.documentElement.dataset.dir = dir;
      const t = document.startViewTransition(cambiar);
      t.finished.finally(() => { delete document.documentElement.dataset.dir; });
    } else cambiar();
  }
  // historial: en el tutorial no se toca el historial del navegador (corre dentro del reproductor)
  const H = U.tutorial ? {
    push() {}, replace() {},
    back() { setTimeout(() => alVolverA(E.pila.length - 2), 0); },
    go(n) { setTimeout(() => alVolverA(E.pila.length - 1 + n), 0); }
  } : { push: i => history.pushState({ i }, ''), replace: i => history.replaceState({ i }, ''), back: () => history.back(), go: n => history.go(n) };
  function ir(id, { reemplazar = false, raiz = false } = {}) {
    if (raiz) { E.pila = [id]; H.replace(0); }
    else if (reemplazar && E.pila.length) { E.pila[E.pila.length - 1] = id; H.replace(E.pila.length - 1); }
    else { E.pila.push(id); H.push(E.pila.length - 1); }
    mostrar(id, 'adelante');
  }
  const actual = () => E.pila[E.pila.length - 1];
  function atras() {
    if (actual() === 'menu' && E.etapa !== 'carrusel') { etapaAnterior(); return; }
    if (E.pila.length > 1) H.back();
  }
  function volverA(id) {
    const k = E.pila.lastIndexOf(id);
    if (k < 0) { ir(id, { raiz: true }); return; }
    const n = E.pila.length - 1 - k; if (n > 0) H.go(-n);
  }
  function alVolverA(i) {
    if (actual() === 'menu' && E.etapa !== 'carrusel' && i < E.pila.length - 1) { etapaAnterior(); H.push(E.pila.length - 1); return; }
    E.pila.length = Math.max(1, i + 1);
    mostrar(actual(), 'atras');
  }
  window.addEventListener('popstate', e => { if (!U.tutorial) alVolverA(e.state && typeof e.state.i === 'number' ? e.state.i : 0); });
  document.addEventListener('click', e => { if (e.target.closest('[data-atras]')) atras(); });

  function alEntrar(id) {
    if (id === 'inicio') pintarInicio();
    if (id === 'menu') { pintarInsignia(); pintarChip(); if (!E.modo) setTimeout(abrirModo, ANIMAR ? 450 : 0); }
    if (id === 'resumen') pintarResumen();
    if (id === 'ticket') pintarTicket();
    if (id === 'mapa') abrirMapa();
    if (id === 'pedido') pintarPedido();
    if (id === 'chat') pintarChat();
    if (id === 'perfil') pintarPerfil();
    if (id === 'reservas') pintarReservas();
    if (id === 'mis-reservas') pintarMisReservas();
    if (id === 'seguir') abrirSeguir();
    if (id !== 'seguir' && id !== 'pedido') pararSeguimiento();
    if (id === 'negocio' && window.NEGOCIO) window.NEGOCIO.abrir();
    if (id === 'cuenta') { const m = $('#cuenta-motivo'); m.hidden = !E.volverTrasCuenta; m.textContent = 'Para enviar su pedido necesitamos sus datos. Es solo una vez.'; }
  }

  // ------------------------------------------------------------ apertura
  function apertura() {
    const ap = $('#apertura');
    $('#ap-negocio').textContent = C.negocio.nombre; $('#ap-lugar').textContent = C.negocio.municipio;
    if (U.robot || U.tutorial) { ap.remove(); return Promise.resolve(); }
    return new Promise(res => {
      let p = 0; const b = $('#ap-barra');
      const paso = () => { p = Math.min(100, p + 8 + Math.random() * 12); b.style.width = p + '%'; if (p < 100) setTimeout(paso, 60); else setTimeout(() => { ap.classList.add('fuera'); setTimeout(() => { ap.remove(); res(); }, 450); }, 150); };
      paso();
    });
  }

  // ------------------------------------------------------------ instalar (primero, si se puede) · hoja tipo tienda
  function capturas() {
    const m = id => N.obtener('menu', id) || N.menu()[0] || {};
    const pl = m('pollo-entero'), oc = N.ocasiones()[0] || {};
    const foto = (p, w) => U.imgPlato(p, w);
    const marco = (tit, cuerpo, tono = '') => `<figure class="captura ${tono}"><figcaption>${tit}</figcaption><div class="cpTel"><div class="cpPantalla">${cuerpo}</div></div></figure>`;
    return [
      marco('Pida viendo<br><b>cada plato</b>', `<div class="cpHeroe">${foto(pl, 400)}</div><div class="cpPlato">${foto(pl, 300)}</div><b class="cpNom">${esc(pl.nombre || '')}</b><small class="cpPrecio">${pesos(pl.precio)}</small><span class="cpBoton">Agregar al pedido</span><span class="cpMinis">${N.menu().filter(x => x.cat === 'fogon').slice(0, 4).map(x => `<i>${foto(x, 120)}</i>`).join('')}</span>`, 'oscuro'),
      marco('Arme su plato<br><b>a su gusto</b>', `<div class="cpPlato chico">${foto(m('hamburguesa'), 300)}</div><b class="cpNom">Recipiente de salsas</b>${N.salsas().slice(0, 4).map((x, k) => `<span class="cpFila"><span class="cpIco">${window.ARTE.recipiente(x.color, x.brillo)}</span>${esc(x.nombre)}<em class="${k < 2 ? 'on' : ''}">${k < 2 ? '✓' : '+'}</em></span>`).join('')}<span class="cpBoton verde">Elegir bebida</span>`),
      marco('Siga la moto<br><b>en el mapa</b>', `<div class="cpMapa"><svg viewBox="0 0 120 160" class="cpRuta"><path d="M18 140 C 30 110, 70 120, 64 88 S 96 50, 100 22" fill="none" stroke="#E2572B" stroke-width="5" stroke-linecap="round"/><path d="M18 140 C 30 110, 70 120, 64 88" fill="none" stroke="#1C8748" stroke-width="5" stroke-linecap="round"/></svg><span class="cpMoto"><svg><use href="#i-motoGrande"/></svg></span><span class="cpCasa"><svg><use href="#i-casa"/></svg></span></div><span class="cpEta"><b>Llega en 7 min</b><small>Va por la mitad del camino</small></span>`, 'mapaT'),
      marco('Su ticket<br><b>al instante</b>', `<div class="cpTicket"><span class="logoMini chico"><svg><use href="#i-llama"/></svg></span><b>${esc(C.negocio.nombre)}</b><small>Ticket de compra</small><i></i><span>1 × ${esc(pl.nombre || '')}<b>${pesos(pl.precio)}</b></span><span>2 × ${esc(m('limonada').nombre || 'Limonada')}<b>${pesos((m('limonada').precio || 0) * 2)}</b></span><i></i><span class="tot">Total<b>${pesos((pl.precio || 0) + (m('limonada').precio || 0) * 2)}</b></span><span class="cpQR"></span></div>`),
      marco('Reserve su<br><b>celebración</b>', `<div class="cpPlato">${U.imgPlato({ foto: oc.foto, arte: 'picada', nombre: oc.nombre }, 300)}</div><b class="cpNom">${esc(oc.nombre || 'Cumpleaños')}</b><span class="cpDias">${['Vie', 'Sáb', 'Dom', 'Lun'].map((d, k) => `<i class="${k === 1 ? 'on' : ''}"><small>${d}</small>${12 + k}</i>`).join('')}</span><span class="cpBoton verde">Solicitar reserva</span>`, 'crema')
    ].join('');
  }
  let instalarAbierto = null;
  function ofrecerInstalar(forzar = false) {
    if (U.tutorial) return Promise.resolve();
    if (instalarAbierto) return instalarAbierto;
    instalarAbierto = abrirInstalar(forzar).finally(() => { instalarAbierto = null; });
    return instalarAbierto;
  }
  async function yaInstalada(i) {
    if (i.standalone) return true;
    try { if (navigator.getInstalledRelatedApps) { const r = await navigator.getInstalledRelatedApps(); if (r && r.length) return true; } } catch (e) { /* sin dato */ }
    return !window.INSTALAR.disponible && U.ls.get('myr2_instalada', false);
  }
  const sesionVista = () => { try { return sessionStorage.getItem('myr2_inst_sesion') === '1'; } catch (e) { return false; } };
  const marcarSesion = () => { try { sessionStorage.setItem('myr2_inst_sesion', '1'); } catch (e) { /* nada */ } };
  // Se muestra cada vez que se abre la app: si ya está instalada lo confirma; si no, ofrece instalarla.
  async function abrirInstalar(forzar) {
    const i = await window.INSTALAR.modeloDetallado();
    if (!forzar && sesionVista()) return;
    marcarSesion();
    if (i.standalone) { if (!forzar) { avisoInstalada(); return; } }
    const instalada = await yaInstalada(i);
    const op = window.INSTALAR.opcion(i);
    const v = $('#velo-instalar');
    $('#it-tit').textContent = C.negocio.nombre;
    $('#it-equipo').innerHTML = `${svg('check')} Compatible con su ${esc(window.INSTALAR.nombreEquipo(i))}${i.nav !== 'otro' ? ' · ' + esc(i.nav) : ''}`;
    $('#it-capturas').innerHTML = capturas();
    const pasos = $('#it-pasos'), bI = $('#b-it-instalar'), bC = $('#b-it-chrome'), sub = $('#it-sub'), estado = $('#it-estado');
    pasos.hidden = true; bC.hidden = true; bI.hidden = false; bI.disabled = false; bI.innerHTML = `${svg('descargar')} Instalar`; estado.hidden = true;
    $('#b-it-luego').textContent = 'Seguir en el navegador';
    sub.textContent = 'Para el mejor uso: abre más rápido, funciona sin señal y le avisa con voz cuando su pedido esté listo.';
    const pintarOpcion = o => {
      pasos.hidden = true; bI.hidden = false; bC.hidden = true;
      if (o.tipo === 'pasos') { pasos.hidden = false; pasos.innerHTML = `<li class="pTit">Así se instala en su ${esc(i.ios ? (/iPad/.test(navigator.userAgent) ? 'iPad' : 'iPhone') : i.movil ? 'celular' : 'computador')}:</li>` + o.pasos.map((p, k) => `<li><span class="pNum">${k + 1}</span><span>${esc(p)}</span>${k === 0 && i.ios ? `<span class="pIco">${svg('compartir')}</span>` : ''}</li>`).join(''); bI.hidden = true; }
      if (o.tipo === 'abrir') { pasos.hidden = false; pasos.innerHTML = `<li><span class="pNum">!</span><span>${esc(o.texto)}</span></li>`; bI.hidden = true; if (i.android) { bC.hidden = false; bC.href = window.INSTALAR.abrirEnChrome(); } }
      if (o.tipo === 'no') { pasos.hidden = false; bI.hidden = true; pasos.innerHTML = `<li><span class="pNum">!</span><span>${esc(i.ios ? 'Para instalarla, ábrala en Safari.' : i.movil ? 'Este navegador no permite instalar apps. Ábrala en Chrome para instalarla.' : 'Para instalarla en el computador, ábrala en Chrome o Edge y use el ícono ⊕ de la barra de direcciones.')}</span></li>`; }
    };
    if (instalada || op.tipo === 'ya') {
      bI.hidden = true; estado.hidden = false;
      estado.innerHTML = `<span class="ieIco">${svg('check')}</span><div><b>Ya está instalada en su equipo</b><small>${i.standalone ? 'Está usando la app instalada. ¡Todo listo!' : 'Ábrala desde el ícono de ' + esc(C.negocio.nombre) + ' en su pantalla de inicio: abre más rápido y funciona sin señal.'}</small></div>`;
      sub.textContent = ''; $('#b-it-luego').textContent = i.standalone ? 'Continuar' : 'Seguir aquí en el navegador';
    } else pintarOpcion(op);
    v.hidden = false;
    // si el navegador habilita la instalación directa mientras la hoja está abierta, el botón cambia solo
    const alHabilitar = () => { if (!v.hidden && !instalada) pintarOpcion({ tipo: 'directo' }); };
    document.addEventListener('myr:instalable', alHabilitar);
    return new Promise(res => {
      const cerrar = () => { v.hidden = true; document.removeEventListener('myr:instalable', alHabilitar); res(); };
      $('#b-it-luego').onclick = cerrar;
      v.onclick = e => { if (e.target === v) cerrar(); };
      bI.onclick = async () => {
        bI.disabled = true; bI.innerHTML = `${svg('descargar')} Instalando…`;
        const r = await window.INSTALAR.instalarDirecto();
        if (r === 'aceptada') { bI.hidden = true; estado.hidden = false; estado.innerHTML = `<span class="ieIco">${svg('check')}</span><div><b>¡Instalada!</b><small>Busque el ícono de ${esc(C.negocio.nombre)} en su pantalla de inicio y ábrala desde ahí.</small></div>`; sub.textContent = ''; $('#b-it-luego').textContent = 'Continuar'; U.ls.set('myr2_instalada', true); }
        else if (r === 'rechazada') cerrar();
        else { bI.disabled = false; bI.innerHTML = `${svg('descargar')} Instalar`; pintarOpcion(window.INSTALAR.opcion(i).tipo === 'directo' ? { tipo: 'pasos', pasos: ['Toque el menú ⋮ del navegador.', 'Toque «Instalar aplicación» o «Agregar a la pantalla principal».'] } : window.INSTALAR.opcion(i)); }
      };
    });
  }
  function avisoInstalada() {
    const a = document.createElement('div'); a.className = 'avisoInstalada'; a.setAttribute('role', 'status');
    a.innerHTML = `<img src="icons/icono-192.png" alt="" width="40" height="40"><div><b>App instalada en su equipo</b><small>${esc(C.negocio.nombre)} · versión instalada, funciona sin señal</small></div><span class="aiCheck">${svg('check')}</span>`;
    document.body.append(a);
    setTimeout(() => { a.classList.add('fuera'); setTimeout(() => a.remove(), 500); }, 3800);
  }
  document.addEventListener('myr:instalada', () => U.ls.set('myr2_instalada', true));
  document.addEventListener('myr:instalable', () => U.ls.set('myr2_instalada', false));
  document.addEventListener('myr:instalable', () => { const b = $('#b-instalar-perfil'); if (b) b.hidden = false; });

  // ------------------------------------------------------------ permiso de avisos (pantalla propia antes del permiso del sistema)
  function puedePedirAvisos() { return !U.tutorial && 'Notification' in window && Notification.permission === 'default'; }
  function pedirPermisoAvisos(forzar = false) {
    if (!puedePedirAvisos()) return Promise.resolve();
    const ult = U.ls.get('myr2_avisos_preg', 0);
    if (!forzar && Date.now() - ult < 3 * 86400000) return Promise.resolve();
    U.ls.set('myr2_avisos_preg', Date.now());
    const v = $('#velo-avisos'); const s = N.sesion();
    $('#av-negocio').textContent = `${C.negocio.nombre} · Listo`;
    v.querySelector('.avEjemplo small').textContent = `${s ? s.nombre.split(' ')[0] : 'Ana'}, su pedido ya está listo y sale para su casa.`;
    v.hidden = false;
    return new Promise(res => {
      const fin = () => { v.hidden = true; pintarPerfilAvisos(); res(); };
      $('#b-av-no').onclick = fin;
      $('#b-av-si').onclick = async () => { try { const r = await Notification.requestPermission(); U.aviso(r === 'granted' ? 'Listo: le avisaremos en este celular.' : 'Sin avisos. Puede activarlos luego desde su perfil.'); } catch (e) { /* sin permiso */ } fin(); };
    });
  }
  function pintarPerfilAvisos() { const b = $('#b-pf-avisos'); if (b) b.hidden = !puedePedirAvisos(); }

  // ------------------------------------------------------------ video tutorial
  function verVideo(cual = 'cliente') {
    if (U.tutorial) return Promise.resolve();
    if (cual === 'cliente' && window.TUTORIAL) return window.TUTORIAL.abrir().then(() => { U.ls.set('myr2_video_cliente', true); });
    const v = $('#velo-video'), vid = $('#vd-video');
    $('#vd-tit').textContent = cual === 'cliente' ? 'Así se pide en 40 segundos' : 'Su negocio en el panel · 40 segundos';
    $('#vd-paso').textContent = cual === 'cliente' ? 'Tutorial para clientes' : 'Tutorial para el dueño del negocio';
    vid.src = `video/tutorial-${cual}.mp4`; vid.poster = `video/tutorial-${cual}.jpg`;
    $('.modal.video').classList.toggle('ancho', cual === 'negocio');
    vid.onerror = () => { $('#vd-paso').textContent = 'Sin señal: el video se ve cuando haya conexión'; };
    v.hidden = false; $('#b-vd-play').hidden = false;
    const jugar = () => { vid.play().then(() => { $('#b-vd-play').hidden = true; }).catch(() => {}); };
    if (!U.robot) jugar();
    $('#b-vd-play').onclick = jugar;
    $('#b-vd-repetir').onclick = () => { vid.currentTime = 0; jugar(); };
    vid.onended = () => { $('#b-vd-play').hidden = false; };
    return new Promise(res => {
      const cerrar = () => { vid.pause(); v.hidden = true; U.ls.set('myr2_video_' + cual, true); res(); };
      $('#b-vd-cerrar').onclick = cerrar; $('#b-vd-continuar').onclick = cerrar;
    });
  }
  window.MYR_VIDEO = verVideo;

  // ------------------------------------------------------------ entrada y cuentas
  function pintarEntrada() {
    $('#en-negocio').textContent = C.negocio.nombre; $('#en-lugar').textContent = C.negocio.municipio;
    const f = $('#en-foto'); if (!f.firstChild) f.innerHTML = U.imgAncha(window.CATALOGO.HEROE, 'picada', 900, 1100);
    // Google Identity Services, si está configurado
    if (C.google.clientId && !U.robot) cargarGoogle();
  }
  let gCargado = false;
  function cargarGoogle() {
    if (gCargado) return; gCargado = true;
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => {
      try {
        window.google.accounts.id.initialize({ client_id: C.google.clientId, callback: r => conGoogle(r.credential), ux_mode: 'popup', auto_select: false, locale: 'es' });
        const cont = $('#g-boton'); cont.hidden = false; $('#b-google').hidden = true;
        window.google.accounts.id.renderButton(cont, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(360, cont.clientWidth || 320) });
      } catch (e) { $('#b-google').hidden = false; }
    };
    s.onerror = () => { gCargado = false; };
    document.head.append(s);
  }
  async function conGoogle(credencial) {
    try {
      const yaEntro = await D.ingresarGoogle(credencial).catch(() => null);
      if (yaEntro) { trasEntrar(yaEntro); return; }
      const g = await D.datosGoogle(credencial); E.google = g;
      pestana('registro', true);
      $('#rg-nombre').value = g.nombre; $('#rg-correo').value = g.correo; $('#rg-correo').readOnly = true;
      $('#g-resumen').hidden = false;
      $('#g-resumen').innerHTML = `${g.foto ? `<img src="${esc(g.foto)}" alt="" referrerpolicy="no-referrer">` : svg('google')}<div><b>${esc(g.nombre)}</b><small>${esc(g.correo)} · cuenta de Google</small></div>`;
      $('#rg-clave-lbl').textContent = 'Cree una clave para entrar sin señal (mínimo 6)';
      ir('cuenta');
    } catch (e) { U.aviso(e.message); }
  }
  function pestana(cual, google = false) {
    $('#tab-registro').setAttribute('aria-selected', cual === 'registro'); $('#tab-ingresar').setAttribute('aria-selected', cual === 'ingresar');
    $('#f-registro').hidden = cual !== 'registro'; $('#f-ingresar').hidden = cual !== 'ingresar';
    $('#cuenta-tit').textContent = cual === 'registro' ? 'Crear su cuenta' : 'Ingresar';
    if (!google) { E.google = null; $('#g-resumen').hidden = true; $('#rg-correo').readOnly = false; $('#rg-clave-lbl').textContent = 'Clave (mínimo 6)'; }
  }
  async function trasEntrar(s) {
    if (s.rol && s.rol !== 'cliente') { ir('negocio', { raiz: true }); return; }
    U.aviso(`¡Bienvenido, ${s.nombre.split(' ')[0]}!`); U.vibrar(20);
    if (E.volverTrasCuenta) { E.volverTrasCuenta = false; H.back(); setTimeout(() => { armarBorrador(); ir('ticket'); }, ANIMAR ? 450 : 80); return; }
    ir('inicio', { raiz: true });
    if (!U.ls.get('myr2_video_cliente', false)) setTimeout(() => verVideo('cliente'), ANIMAR ? 700 : 0);
  }

  // ------------------------------------------------------------ inicio
  function pintarInicio() {
    const s = N.sesion(); const nombre = s ? s.nombre.split(' ')[0] : '';
    const h = new Date().getHours();
    $('#in-hora').textContent = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    $('#in-saludo').textContent = nombre ? `Hola, ${nombre}` : 'Hola';
    $('#in-negocio').textContent = C.negocio.nombre;
    $('#in-avatar').innerHTML = s && s.foto ? `<img src="${esc(s.foto)}" alt="" referrerpolicy="no-referrer">` : `<b>${esc((nombre || '?')[0].toUpperCase())}</b>`;
    pintarAnuncios(); pintarEnCurso(); pintarInsignia(); pintarProximaReserva();
    const esp = N.menu().filter(p => p.especialidad && p.disponible !== false);
    $('#in-especiales').innerHTML = esp.map(p => tarjetaProducto(p)).join('');
    $('#in-cats').innerHTML = window.CATALOGO.CATEGORIAS.map(c => {
      const p = N.menu().find(x => x.cat === c.id);
      return `<button class="cat" type="button" data-ir-cat="${c.id}">${p ? U.imgPlato(p, 300) : ''}<span><b>${esc(c.nombre)}</b><small>${esc(c.sub)}</small></span></button>`;
    }).join('');
  }
  function tarjetaProducto(p) {
    const oferta = p.oferta && p.oferta.precio ? `<s>${pesos(p.precio)}</s> ${pesos(p.oferta.precio)}` : pesos(p.precio);
    return `<button class="tProd" type="button" data-ir-prod="${p.id}">${U.imgPlato(p, 500)}${p.oferta ? `<em class="cinta">${esc(p.oferta.etiqueta || 'Oferta')}</em>` : ''}<span><b>${esc(p.nombre)}</b><small>${oferta}</small></span></button>`;
  }
  let tAnuncio = null, anIdx = 0;
  function pintarAnuncios() {
    const ads = N.publicidad(); const pista = $('#an-pista');
    $('#anuncios').hidden = !ads.length;
    pista.innerHTML = ads.map((a, k) => `<button class="anuncio" type="button" data-anuncio="${a.id}" aria-label="${esc(a.titulo)}" style="--k:${k}">
      <span class="anFoto">${U.imgAncha(a.foto, (N.obtener('menu', a.producto) || {}).arte || 'picada', 900, 500)}</span>
      <span class="anTexto">${a.etiqueta ? `<em>${esc(a.etiqueta)}</em>` : ''}<b>${esc(a.titulo)}</b><small>${esc(a.texto || '')}</small></span></button>`).join('');
    $('#an-puntos').innerHTML = ads.map((a, k) => `<i class="${k === 0 ? 'on' : ''}"></i>`).join('');
    anIdx = 0; clearInterval(tAnuncio);
    if (ads.length > 1 && !U.robot) tAnuncio = setInterval(() => { if (actual() === 'inicio' && document.visibilityState === 'visible') moverAnuncio(1); }, 4500);
    pista.onscroll = () => { const k = Math.round(pista.scrollLeft / pista.clientWidth); if (k !== anIdx) { anIdx = k; $$('#an-puntos i').forEach((p, j) => p.classList.toggle('on', j === k)); } };
  }
  function moverAnuncio(d) {
    const pista = $('#an-pista'), n = pista.children.length; if (!n) return;
    anIdx = (anIdx + d + n) % n; pista.scrollTo({ left: anIdx * pista.clientWidth, behavior: ANIMAR ? 'smooth' : 'auto' });
    $$('#an-puntos i').forEach((p, j) => p.classList.toggle('on', j === anIdx));
  }
  function pintarEnCurso() {
    const s = N.sesion(); const box = $('#in-encurso');
    const activos = s ? N.lista('pedidos').filter(p => p.autor === s.id && !['entregado', 'cancelado'].includes(p.estado)).sort((a, b) => b.creado.localeCompare(a.creado)) : [];
    if (!activos.length) { box.innerHTML = ''; return; }
    const p = activos[0]; const min = window.ASISTENTE.minutosRestantes(p);
    const pasos = ['recibido', 'confirmado', 'preparando', 'listo', p.modo === 'domicilio' ? 'en_camino' : null, 'entregado'].filter(Boolean);
    const k = pasos.indexOf(p.estado);
    box.innerHTML = `<button class="enCurso" type="button" data-ver-pedido="${p.id}">
      <span class="ecTop"><b>Pedido ${esc(p.codigo)}</b><span class="etiqueta verde">${esc(N.NOMBRE_ESTADO[p.estado])}</span></span>
      <span class="ecBarra"><i style="width:${Math.round((k + 1) / pasos.length * 100)}%"></i></span>
      <small>${p.estado === 'listo' ? '¡Está listo!' : `Unos ${min} minutos`} · ${esc(p.items.map(i => i.cant + ' × ' + i.nombre).join(', '))}</small></button>`;
  }

  function misReservas() { const s = N.sesion(); return s ? N.lista('reservas').filter(r => r.autor === s.id) : []; }
  const ahoraClave = () => { const d = new Date(); return U.hoy(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const esProxima = r => !['rechazada', 'cancelada', 'cumplida'].includes(r.estado) && (r.dia + ' ' + r.hora) >= ahoraClave();
  function pintarProximaReserva() {
    const box = $('#in-reserva'); if (!box) return;
    const r = misReservas().filter(esProxima).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora))[0];
    const n = misReservas().filter(esProxima).length; const ins = $('#rv-insignia'); if (ins) { ins.hidden = !n; ins.textContent = n; }
    if (!r) { box.innerHTML = ''; return; }
    const o = N.obtener('ocasiones', r.ocasion) || { nombre: r.ocasion };
    box.innerHTML = `<button class="proxReserva" type="button" id="b-in-reserva"><span class="prFoto">${U.imgPlato({ foto: o.foto, arte: 'picada', nombre: o.nombre }, 200)}</span><span class="prTxt"><small>Su próxima reserva</small><b>${esc(o.nombre)} · ${r.personas} personas</b><small>${esc(U.fechaLarga(r.dia + 'T12:00'))} · ${horaBonita(r.hora)}</small></span><span class="etiqueta ${r.estado === 'confirmada' ? 'verde' : ''}">${r.estado === 'confirmada' ? 'Confirmada' : 'Por confirmar'}</span></button>`;
  }
  const horaBonita = h => { const [hh, mm] = h.split(':').map(Number); return `${(hh % 12) || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`; };

  // ------------------------------------------------------------ menú en carrusel
  const productosCat = () => N.menu().filter(p => p.cat === E.cat && p.disponible !== false);
  const plato = () => productosCat()[E.i] || productosCat()[0];
  const esPlatoFuerte = p => !['bebidas', 'acomp'].includes(p.cat);
  function precioDe(p) { return p.oferta && p.oferta.precio ? p.oferta.precio : p.precio; }
  function pintarCats() {
    const visibles = window.CATALOGO.CATEGORIAS.filter(c => N.menu().some(p => p.cat === c.id && p.disponible !== false)).map(c => c.id).join();
    const nav = $('#cats-menu');
    if (nav.dataset.cats === visibles && nav.dataset.menu === String(N.menu().length)) {
      $$('#cats-menu [data-cat]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === E.cat));
      const sel = $('#cats-menu [aria-pressed=true]'); if (sel) nav.scrollTo({ left: sel.offsetLeft - nav.clientWidth / 2 + sel.offsetWidth / 2, behavior: ANIMAR ? 'smooth' : 'auto' });
      return;
    }
    nav.dataset.cats = visibles; nav.dataset.menu = String(N.menu().length);
    $('#cats-menu').innerHTML = window.CATALOGO.CATEGORIAS.filter(c => N.menu().some(p => p.cat === c.id && p.disponible !== false))
      .map(c => { const p = N.menu().find(x => x.cat === c.id && x.disponible !== false); return `<button type="button" data-cat="${c.id}" aria-pressed="${c.id === E.cat}"><span class="catPlato">${p ? U.imgPlato(p, 160) : ''}</span><span class="catNom">${esc(c.nombre)}</span></button>`; }).join('');

  }
  function pintarPlato(dir = 0) {
    const p = plato(); if (!p) return;
    const cont = $('#plato'), heroe = $('#heroe-arte');
    const nueva = document.createElement('div'); nueva.className = 'platoCapa'; nueva.innerHTML = U.imgPlato(p, 700);
    const hNueva = document.createElement('div'); hNueva.className = 'heroeCapa'; hNueva.innerHTML = U.imgPlato(p, 900);
    const viejas = [...cont.querySelectorAll('.platoCapa')], hViejas = [...heroe.querySelectorAll('.heroeCapa')];
    cont.append(nueva); heroe.append(hNueva);
    const titulo = $('#pl-nombre');
    if (dir && ANIMAR) {
      const d = 620, ez = 'cubic-bezier(.22,.8,.25,1)';
      viejas.forEach(v => v.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 70}%) rotate(${-dir * 120}deg) scale(.7)`, opacity: 0 }], { duration: d, easing: ez, fill: 'forwards' }).finished.then(() => v.remove()));
      nueva.animate([{ transform: `translateX(${dir * 70}%) rotate(${dir * 120}deg) scale(.7)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: d, easing: ez });
      hViejas.forEach(v => v.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.18)' }], { duration: d, easing: ez, fill: 'forwards' }).finished.then(() => v.remove()));
      hNueva.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: d, easing: ez });
      const sale = document.createElement('h1'); sale.className = 'sale'; sale.textContent = titulo.textContent; sale.setAttribute('aria-hidden', 'true');
      titulo.parentNode.append(sale);
      sale.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 30}px)` }], { duration: 380, fill: 'forwards' }).finished.then(() => sale.remove());
      titulo.animate([{ opacity: 0, transform: `translateX(${dir * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ez });
      ['#pl-precio', '#pl-desc', '#pl-porcion', '#pl-etiquetas'].forEach(s => $(s).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420 }));
      U.vibrar(8);
    } else { viejas.forEach(v => v.remove()); hViejas.forEach(v => v.remove()); }
    titulo.textContent = p.nombre;
    $('#pl-precio').innerHTML = p.oferta && p.oferta.precio ? `<s>${pesos(p.precio)}</s> ${pesos(p.oferta.precio)}` : pesos(p.precio);
    $('#pl-porcion').textContent = p.porcion ? '· ' + p.porcion : '';
    $('#pl-desc').textContent = p.descripcion;
    $('#pl-etiquetas').innerHTML = [p.especialidad ? `<span class="tag oro">${svg('estrella')} Especialidad de la casa</span>` : '', p.oferta ? `<span class="tag brasa">${esc(p.oferta.etiqueta || 'Oferta')}</span>` : ''].join('');
    $('#heroe').style.setProperty('--tinte', p.color || '#2B2420');
    const fuerte = esPlatoFuerte(p);
    $('#b-receta').hidden = !fuerte;
    $('#b-agregar').textContent = fuerte ? 'Agregar al pedido' : 'Agregar';
    const lista = productosCat();
    $('#puntos').innerHTML = lista.map((x, k) => `<button role="tab" type="button" aria-label="${esc(x.nombre)}" data-punto="${k}" aria-selected="${k === E.i}">${U.imgPlato(x, 140)}</button>`).join('');
    const ps = $('#puntos [aria-selected=true]'); if (ps) { const cont = $('#puntos'); cont.scrollTo({ left: ps.offsetLeft - cont.clientWidth / 2 + ps.offsetWidth / 2, behavior: ANIMAR ? 'smooth' : 'auto' }); }
    $('#b-ant').hidden = $('#b-sig').hidden = lista.length < 2;
  }
  function mover(dir) {
    if (E.etapa !== 'carrusel') return;
    const n = productosCat().length; if (n < 2) return;
    E.i = (E.i + dir + n) % n; E.arma = nuevaArma(); pintarPlato(dir);
  }
  function irACategoria(cat, idProd) {
    E.cat = cat; const lista = productosCat(); E.i = Math.max(0, idProd ? lista.findIndex(p => p.id === idProd) : 0);
    E.arma = nuevaArma(); pintarCats(); pintarPlato(0);
  }
  function gestos() {
    const zona = $('#v-menu'), plt = $('#plato'); let x0 = 0, y0 = 0, t0 = 0, activo = false, moviendo = false;
    zona.addEventListener('pointerdown', e => {
      if (e.target.closest('button, input, a, .lista, .catsMenu')) { activo = false; return; }
      activo = true; moviendo = false; x0 = e.clientX; y0 = e.clientY; t0 = Date.now();
    });
    zona.addEventListener('pointermove', e => {
      if (!activo || E.etapa !== 'carrusel' || !ANIMAR) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {      // el plato sigue al dedo y gira
        moviendo = true; const capa = plt.querySelector('.platoCapa:last-child');
        if (capa) capa.style.transform = `translateX(${dx * .35}px) rotate(${dx * .25}deg)`;
      }
    });
    const soltar = e => {
      if (!activo) return; activo = false;
      const capa = plt.querySelector('.platoCapa:last-child'); if (capa) capa.style.transform = '';
      const dx = e.clientX - x0, dy = e.clientY - y0, rapido = Date.now() - t0 < 800;
      if (E.etapa === 'carrusel' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) mover(dx < 0 ? 1 : -1);
      else if (E.etapa === 'carrusel' && rapido && dy < -45 && Math.abs(dy) > Math.abs(dx) && esPlatoFuerte(plato())) abrirEtapa('receta');
      else if (E.etapa !== 'carrusel' && rapido && dy > 60 && Math.abs(dy) > Math.abs(dx)) etapaAnterior();
    };
    zona.addEventListener('pointerup', soltar);
    zona.addEventListener('pointercancel', () => { activo = false; const capa = plt.querySelector('.platoCapa:last-child'); if (capa) capa.style.transform = ''; });
    $('#asa').addEventListener('click', etapaAnterior);
  }

  // ------------------------------------------------------------ etapas
  const ETAPAS = ['carrusel', 'receta', 'salsas', 'bebidas'];
  function abrirEtapa(etapa, atrasAnim = false) {
    E.etapa = etapa; $('#v-menu').dataset.etapa = etapa;
    $('#hoja').setAttribute('aria-hidden', etapa === 'carrusel');
    if (etapa === 'carrusel') return;
    const p = plato(), n = ETAPAS.indexOf(etapa), lista = $('#hoja-lista'), b = $('#b-hoja');
    $('#hoja-paso').textContent = `Paso ${n} de 3`;
    $('#cant-plato').hidden = etapa !== 'receta'; $('#cp-n').textContent = E.arma.cant;
    if (etapa === 'receta') {
      $('#hoja-tit').textContent = p.nombre;
      $('#hoja-sub').textContent = 'Toque un ingrediente para quitarlo. Abajo escoja cuántos quiere.';
      lista.innerHTML = p.ingredientes.map(id => {
        const ing = window.CATALOGO.INGR[id] || [(p.ingredientesTexto || {})[id] || id, 'disco', '#C9A97A', '#8D6E4C']; const q = E.arma.quitados.has(id);
        return `<li class="${q ? 'quitado' : ''}"><span class="ico">${window.ARTE.mini(ing[1], ing[2], ing[3])}</span><span class="nom">${esc(ing[0])}</span>
          <button class="togg" type="button" data-ingr="${id}" aria-pressed="${!q}" aria-label="${q ? 'Volver a poner' : 'Quitar'} ${esc(ing[0])}">${svg(q ? 'mas' : 'check')}</button></li>`;
      }).join('');
      b.textContent = 'Elegir salsas'; b.classList.remove('listo');
    }
    if (etapa === 'salsas') {
      $('#hoja-tit').textContent = 'Recipiente de salsas';
      $('#hoja-sub').textContent = 'Toque + para agregar. Van en recipiente aparte.';
      lista.innerHTML = N.salsas().filter(s => s.disponible !== false).map(s => {
        const on = E.arma.salsas.has(s.id);
        return `<li><span class="ico">${window.ARTE.recipiente(s.color, s.brillo)}</span><span class="nom">${esc(s.nombre)}<small>${s.precio ? '+ ' + pesos(s.precio) : 'Sin costo'}</small></span>
          <button class="togg" type="button" data-salsa="${s.id}" aria-pressed="${on}" aria-label="${on ? 'Quitar' : 'Agregar'} salsa ${esc(s.nombre)}">${svg(on ? 'check' : 'mas')}</button></li>`;
      }).join('');
      b.textContent = 'Elegir bebida'; b.classList.remove('listo');
    }
    if (etapa === 'bebidas') {
      $('#hoja-tit').textContent = 'Bebidas disponibles';
      $('#hoja-sub').textContent = 'Opcional. Elija cuántas quiere.';
      lista.innerHTML = N.menu().filter(x => x.cat === 'bebidas' && x.disponible !== false).map(x => {
        const c = E.arma.bebidas.get(x.id) || 0;
        return `<li><span class="ico foto">${U.imgPlato(x, 160)}</span><span class="nom">${esc(x.nombre)}<small>${esc(x.porcion || '')} · ${pesos(precioDe(x))}</small></span>
          <span class="cant">${c ? `<button class="togg" type="button" data-beb="${x.id}" data-d="-1" aria-label="Una ${esc(x.nombre)} menos">${svg('menos')}</button><b>${c}</b>` : ''}
          <button class="togg" type="button" data-beb="${x.id}" data-d="1" aria-pressed="${c > 0}" aria-label="Agregar ${esc(x.nombre)}">${svg('mas')}</button></span></li>`;
      }).join('');
      b.textContent = 'Confirmar'; b.classList.add('listo');
    }
    lista.classList.remove('entra', 'entraAtras'); void lista.offsetWidth;
    if (ANIMAR) lista.classList.add(atrasAnim ? 'entraAtras' : 'entra');
  }
  function etapaAnterior() { const n = ETAPAS.indexOf(E.etapa); if (n > 0) abrirEtapa(ETAPAS[n - 1], true); }
  function siguienteEtapa() { if (E.etapa === 'bebidas') { confirmarPlato(); return; } abrirEtapa(ETAPAS[ETAPAS.indexOf(E.etapa) + 1]); }
  function refrescarEtapa() { const l = $('#hoja-lista'), y = l.scrollTop; abrirEtapa(E.etapa); l.classList.remove('entra'); l.scrollTop = y; }

  function precioItem(it) {
    const salsas = it.salsas.reduce((a, id) => a + ((N.salsas().find(s => s.id === id) || {}).precio || 0), 0);
    const beb = it.bebidas.reduce((a, b) => { const x = N.obtener('menu', b.id); return a + (x ? precioDe(x) : 0) * b.cant; }, 0);
    return { unitario: it.precio + salsas, bebidas: beb, total: (it.precio + salsas) * it.cant + beb };
  }
  function confirmarPlato() {
    const p = plato();
    E.carrito.push({ platoId: p.id, nombre: p.nombre, precio: precioDe(p), cant: E.arma.cant,
      quitados: [...E.arma.quitados], salsas: [...E.arma.salsas], bebidas: [...E.arma.bebidas].filter(([, c]) => c > 0).map(([id, cant]) => ({ id, cant })) });
    guardarCarrito(); E.arma = nuevaArma(); pintarInsignia(true); U.vibrar([10, 40, 10]);
    ir('resumen');
    setTimeout(() => abrirEtapa('carrusel'), ANIMAR ? 650 : 0);
  }
  function agregarDirecto() {      // bebidas y acompañantes: entran directo, con el plato volando a la bolsa
    const p = plato();
    const ya = E.carrito.find(x => x.platoId === p.id && !x.salsas.length && !x.bebidas.length && !x.quitados.length);
    if (ya) ya.cant++; else E.carrito.push({ platoId: p.id, nombre: p.nombre, precio: precioDe(p), cant: 1, quitados: [], salsas: [], bebidas: [] });
    guardarCarrito(); volarABolsa(); U.vibrar(15);
    U.aviso(`${p.nombre} agregado. Toque la bolsa para ver su pedido.`, 2200);
  }
  function volarABolsa() {
    const desde = $('#plato').getBoundingClientRect(), hasta = $('#b-bolsa').getBoundingClientRect();
    if (!ANIMAR) { pintarInsignia(true); return; }
    const c = $('#plato .platoCapa:last-child').cloneNode(true);
    Object.assign(c.style, { position: 'fixed', left: desde.left + 'px', top: desde.top + 'px', width: desde.width + 'px', height: desde.height + 'px', zIndex: 70, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' });
    document.body.append(c);
    const dx = hasta.left + hasta.width / 2 - (desde.left + desde.width / 2), dy = hasta.top + hasta.height / 2 - (desde.top + desde.height / 2);
    c.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx * .5}px, ${dy - 80}px) scale(.45) rotate(90deg)`, opacity: 1, offset: .55 }, { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(200deg)`, opacity: .4 }], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' }).finished.then(() => { c.remove(); pintarInsignia(true); });
  }
  function pintarInsignia(saltar) {
    const n = E.carrito.reduce((a, x) => a + x.cant, 0);
    ['#insignia', '#insignia-inicio'].forEach(s => { const b = $(s); if (!b) return; b.hidden = !n; b.textContent = n;
      if (saltar && ANIMAR) { b.classList.remove('salta'); void b.offsetWidth; b.classList.add('salta'); } });
  }

  // ------------------------------------------------------------ local o domicilio
  function distanciaKm(a, b) {
    const r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  const NEG = { lat: C.negocio.lat, lng: C.negocio.lng };
  function nombreModo(m) {
    if (!m) return '¿Cómo lo quiere?';
    if (m.tipo === 'local') return m.mesa ? `Mesa ${m.mesa} · comer aquí` : 'Comer aquí';
    if (m.tipo === 'recoger') return 'Recoger en el local';
    return m.sinMapa ? 'Domicilio · dirección escrita' : m.lat ? `Domicilio · ${m.km.toFixed(1).replace('.', ',')} km` : 'Domicilio · falta dirección';
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
    if (tipo === 'domicilio' && !C.domicilio.activo) { U.aviso('Este negocio aún no hace domicilios.'); return; }
    const prev = E.modo && E.modo.tipo === 'domicilio' ? E.modo : null;
    E.modo = { fuente: 'manual', ...(tipo === 'domicilio' && prev ? prev : {}), ...extra, tipo };
    if (tipo === 'local') { const m = $('#md-mesa').value.trim(); if (m) E.modo.mesa = m.replace(/\D/g, '').slice(0, 3); }
    guardarModo();
  }
  function ubicar() {
    return new Promise((res, rej) => {
      if (!('geolocation' in navigator)) { rej(new Error('Este teléfono no permite ver la ubicación.')); return; }
      navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, prec: p.coords.accuracy || 50 }),
        e => rej(new Error(e.code === 1 ? 'No dio permiso para ver su ubicación. Escoja una opción.' : 'No pudimos ver su ubicación. Escoja una opción.')),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }
  async function decidirPorUbicacion() {
    const nota = $('#md-nota'); nota.textContent = 'Buscando su ubicación…';
    try {
      const u = await ubicar(); const dKm = distanciaKm(NEG, u), dM = dKm * 1000;
      if (dM - Math.min(u.prec, 80) <= C.local.radioMetros) {
        elegirModo('local', { fuente: 'gps' }); nota.textContent = `Está a unos ${Math.round(dM)} m: parece que está en el local.`;
        $('#md-mesa-caja').hidden = false; $$('.opcModo button').forEach(b => b.classList.toggle('sugerido', b.dataset.elegir === 'local'));
        U.aviso('Está en el local: su pedido llega a la mesa.'); return;
      }
      if (dKm > C.domicilio.maxKm || !C.domicilio.activo) {
        elegirModo('recoger', { fuente: 'gps' }); nota.textContent = `Está a ${dKm.toFixed(1).replace('.', ',')} km, fuera de la zona de domicilio. Puede recogerlo.`;
        $$('.opcModo button').forEach(b => b.classList.toggle('sugerido', b.dataset.elegir === 'recoger')); return;
      }
      E.modo = { tipo: 'domicilio', fuente: 'gps', lat: u.lat, lng: u.lng, direccion: 'Mi ubicación actual', indicaciones: '' };
      await calcularRuta(E.modo); guardarModo();
      nota.textContent = `Está a ${E.modo.km.toFixed(1).replace('.', ',')} km: activamos el domicilio.`;
      U.aviso(`Domicilio activado · ${tarifa(E.modo.km, subtotal()).valor ? pesos(tarifa(E.modo.km, subtotal()).valor) : 'gratis'}`);
      setTimeout(cerrarModo, ANIMAR ? 1200 : 0); direccionInversa(E.modo);
    } catch (e) { nota.textContent = e.message; }
  }

  // ------------------------------------------------------------ totales
  const subtotal = () => E.carrito.reduce((a, it) => a + precioItem(it).total, 0);
  function tarifa(km, sub) {
    const d = C.domicilio; const calc = Math.max(d.minimo, Math.ceil((d.base + d.porKm * km) / 500) * 500);
    return d.gratisDesde && sub >= d.gratisDesde ? { valor: 0, ahorro: calc } : { valor: calc, ahorro: 0 };
  }
  function totales() {
    const sub = subtotal(), platos = E.carrito.reduce((a, it) => a + it.cant, 0);
    const salsas = E.carrito.reduce((a, it) => a + (precioItem(it).unitario - it.precio) * it.cant, 0);
    const bebidas = E.carrito.reduce((a, it) => a + precioItem(it).bebidas, 0);
    const tipo = E.modo ? E.modo.tipo : null;
    const empaque = (tipo === 'domicilio' || tipo === 'recoger') ? C.empaquePorPlato * platos : 0;
    const dom = tipo === 'domicilio' && E.modo.lat ? tarifa(E.modo.km, sub) : { valor: 0, ahorro: 0 };
    return { platos: sub - salsas - bebidas, salsas, bebidas, empaque, domicilio: dom.valor, ahorro: dom.ahorro, total: sub + empaque + dom.valor, unidades: platos };
  }
  function detalleItem(it) {
    const partes = [];
    if (it.quitados.length) { const pr = N.obtener('menu', it.platoId) || {}; partes.push('Sin ' + it.quitados.map(id => (window.CATALOGO.INGR[id] || [(pr.ingredientesTexto || {})[id] || id])[0].toLowerCase()).join(', ')); }
    if (it.salsas.length) partes.push('Salsas: ' + it.salsas.map(id => (N.salsas().find(s => s.id === id) || { nombre: id }).nombre).join(', '));
    if (it.bebidas.length) partes.push(it.bebidas.map(b => `${b.cant} × ${(N.obtener('menu', b.id) || { nombre: b.id }).nombre}`).join(', '));
    return partes.join(' · ') || 'Como viene';
  }

  // ------------------------------------------------------------ resumen
  function pintarResumen() {
    const vacio = !E.carrito.length, ult = E.carrito[E.carrito.length - 1];
    const prod = ult ? N.obtener('menu', ult.platoId) : plato();
    $('#plato-grande').innerHTML = prod ? `<div class="platoCapa">${U.imgPlato(prod, 700)}</div>` : '';
    $$('#res-modos button').forEach(b => b.setAttribute('aria-checked', !!E.modo && b.dataset.modo === E.modo.tipo));
    const d = $('#res-destino'), m = E.modo;
    if (!m) d.innerHTML = `<div class="fila">${svg('ubicacion')}<div><b>¿Cómo lo quiere?</b><small>Escoja arriba o use su ubicación.</small></div><button type="button" id="b-res-ubicar">Ubicarme</button></div>`;
    else if (m.tipo === 'local') d.innerHTML = `<div class="fila">${svg('mesa')}<div><b>${m.mesa ? 'Mesa ' + esc(m.mesa) : 'En el local'}</b><small>${m.fuente === 'qr' ? 'Leído del código QR de la mesa' : 'Se lo llevamos a la mesa'}</small></div><button type="button" id="b-res-mesa">${m.mesa ? 'Cambiar' : 'Poner mesa'}</button></div>`;
    else if (m.tipo === 'recoger') d.innerHTML = `<div class="fila">${svg('recoger')}<div><b>Recoge en ${esc(C.negocio.nombre)}</b><small>${esc(C.negocio.direccion)} · listo en unos ${C.domicilio.minutosPreparacion} min</small></div></div>`;
    else d.innerHTML = m.sinMapa
      ? `<div class="fila">${svg('escribir')}<div><b>${esc(m.direccion)}</b><small>Dirección escrita sin mapa · domicilio mínimo, el negocio lo confirma</small></div><button type="button" id="b-res-ruta">Cambiar</button></div>`
      : m.lat
      ? `<div class="fila">${svg('ubicacion')}<div><b>${esc(m.direccion || 'Punto marcado en el mapa')}</b><small>${m.km.toFixed(1).replace('.', ',')} km · unos ${m.min} min de camino${m.recta ? ' (aprox.)' : ''}</small></div><button type="button" id="b-res-ruta">Ver ruta</button></div>`
      : `<div class="fila">${svg('ubicacion')}<div><b>Falta la dirección</b><small>Márquela en el mapa.</small></div><button type="button" id="b-res-ruta">Marcar</button></div>`;
    $('#res-items').innerHTML = vacio ? '<li class="vacio"><b>Su pedido está vacío</b><small>Agregue un plato desde el menú.</small></li>' :
      E.carrito.map((it, k) => {
        const p = N.obtener('menu', it.platoId) || { nombre: it.nombre, arte: 'acompanante' };
        return `<li><span class="mini-plato">${U.imgPlato(p, 200)}</span><span class="txt"><b>${esc(it.nombre)}</b><small>${esc(detalleItem(it))}</small></span>
        <span class="val">${pesos(precioItem(it).total)}</span>
        <span class="acciones grande"><button type="button" data-item="${k}" data-d="-1" aria-label="${it.cant > 1 ? 'Uno menos' : 'Quitar'} ${esc(it.nombre)}">${svg(it.cant > 1 ? 'menos' : 'basura')}</button><b aria-live="polite">${it.cant}</b><button type="button" data-item="${k}" data-d="1" aria-label="Uno más de ${esc(it.nombre)}">${svg('mas')}</button></span></li>`;
      }).join('');
    const t = totales();
    let h = `<dt>Platos</dt><dd>${pesos(t.platos)}</dd>`;
    if (t.salsas) h += `<dt>Salsas especiales</dt><dd>${pesos(t.salsas)}</dd>`;
    if (t.bebidas) h += `<dt>Bebidas</dt><dd>${pesos(t.bebidas)}</dd>`;
    if (t.empaque) h += `<dt>Empaque</dt><dd>${pesos(t.empaque)}</dd>`;
    if (m && m.tipo === 'domicilio') h += `<dt>Domicilio</dt><dd>${m.lat ? (t.domicilio ? pesos(t.domicilio) : 'Gratis') : '—'}</dd>`;
    if (t.ahorro) h += `<dt class="ahorro">Su ahorro</dt><dd class="ahorro">${pesos(t.ahorro)}</dd>`;
    else if (m && m.tipo === 'domicilio' && C.domicilio.gratisDesde && t.domicilio) h += `<dt class="ahorro largo">Domicilio gratis desde ${pesos(C.domicilio.gratisDesde)}</dt>`;
    h += `<dt class="tot">Total</dt><dd class="tot">${pesos(t.total)}</dd>`;
    $('#res-cuentas').innerHTML = h; $('#res-total').textContent = pesos(t.total);
    pintarPagos(); $('#b-pedir').disabled = vacio; $('#res-nota').value = E.nota;
  }
  function tarjetaDisponible(tipo = E.modo ? E.modo.tipo : null) {
    if (C.pagos.pasarelaEnLinea) return { ok: true, txt: 'Pago en línea con tarjeta.' };
    if (tipo === 'domicilio') return C.pagos.datafonoContraEntrega ? { ok: true, txt: 'El domiciliario lleva el datáfono: paga con tarjeta débito o crédito al recibir.' } : { ok: false, txt: 'Para domicilio aún no recibimos tarjeta.' };
    if (tipo) return C.pagos.datafonoEnLocal ? { ok: true, txt: tipo === 'local' ? 'Le llevamos el datáfono a la mesa.' : 'Paga con tarjeta en la caja al recoger.' } : { ok: false, txt: 'Aún no recibimos tarjeta.' };
    return { ok: true, txt: 'Con datáfono en el local o contra entrega.' };
  }
  function pintarPagos() {
    const tj = tarjetaDisponible(); if (E.pago.tipo === 'tarjeta' && !tj.ok) E.pago.tipo = null;
    $$('#res-pagos button').forEach(b => {
      const tipo = b.dataset.pago;
      const no = (tipo === 'efectivo' && !C.pagos.efectivo) || (tipo === 'transferencia' && !C.pagos.transferencia.activa) || (tipo === 'tarjeta' && !tj.ok);
      b.setAttribute('aria-disabled', no); b.setAttribute('aria-checked', E.pago.tipo === tipo);
    });
    const det = $('#res-pago-detalle'), t = totales();
    if (E.pago.tipo === 'efectivo') {
      const cc = Number(String(E.pago.conCuanto).replace(/\D/g, '')) || 0;
      det.innerHTML = `<div class="caja"><label class="nota-campo sinMargen">¿Con cuánto va a pagar?<input id="pg-con" inputmode="numeric" placeholder="${pesos(Math.ceil(t.total / 10000) * 10000)}" value="${cc ? cc.toLocaleString('es-CO') : ''}"></label>
        <span id="pg-cambio" class="mini">${cc ? (cc >= t.total ? 'Cambio: <b>' + pesos(cc - t.total) + '</b>' : 'Le faltan ' + pesos(t.total - cc)) : 'Opcional: así le llevamos el cambio.'}</span></div>`;
    } else if (E.pago.tipo === 'transferencia') {
      const tr = C.pagos.transferencia;
      const llaves = [['Llave Bre-B', tr.llaveBreB], ['Nequi', tr.nequi], ['Daviplata', tr.daviplata]].filter(x => x[1]);
      const qr = tr.qrBreB ? U.foto(tr.qrBreB, 600) : '';
      det.innerHTML = `<div class="caja transf">
        ${qr ? `<div class="qrBreB"><img src="${esc(qr)}" alt="Código QR Bre-B del negocio"><div><b>Escanee con su banco</b><small>Abra la app de su banco o billetera → Bre-B → pagar con QR. Si paga desde este mismo celular, descargue el QR y súbalo en su banco.</small><a class="enlace" href="${esc(qr)}" download="QR-Bre-B-${esc(C.negocio.id)}.png">${svg('descargar')} Descargar QR</a></div></div>` : ''}
        ${llaves.length ? llaves.map(([n, v]) => `<div class="llave"><span>${n}<br><code>${esc(v)}</code></span><button type="button" data-copiar="${esc(v)}">${svg('copiar')} Copiar</button></div>`).join('') + (tr.titular ? `<small class="mini">A nombre de ${esc(tr.titular)}</small>` : '')
        : qr ? '' : '<span>El negocio le envía su llave Bre-B por el chat al confirmar.</span>'}
        ${C.pagos.enlacePago ? `<a class="btn oscuro" href="${esc(C.pagos.enlacePago)}" target="_blank" rel="noopener">${svg('tarjeta')} Pagar en línea (PSE, Nequi, tarjeta)</a>` : ''}
        <span class="mini">Transfiera <b>${pesos(t.total)}</b>. Después de enviar el pedido, suba el comprobante desde «Su pedido»: el negocio lo verifica y lo marca pagado.</span></div>`;
    } else if (E.pago.tipo === 'tarjeta') det.innerHTML = `<div class="caja"><span>${esc(tj.txt)}</span>${C.pagos.pasarelaEnLinea ? '' : '<span class="mini">Pago en línea con tarjeta: por activar.</span>'}</div>`;
    else det.innerHTML = '';
  }
  function validarPedido() {
    if (!E.carrito.length) { U.aviso('Su pedido está vacío.'); return false; }
    if (!E.modo) { abrirModo(); U.aviso('Primero díganos cómo lo quiere.'); return false; }
    if (E.modo.tipo === 'domicilio' && !E.modo.lat) { U.aviso('Marque la dirección de entrega.'); ir('mapa'); return false; }
    if (!E.pago.tipo) { U.aviso('Escoja la forma de pago.'); $('#res-pagos').scrollIntoView({ behavior: ANIMAR ? 'smooth' : 'auto', block: 'center' }); return false; }
    const cc = Number(String(E.pago.conCuanto).replace(/\D/g, '')) || 0;
    if (E.pago.tipo === 'efectivo' && cc && cc < totales().total) { U.aviso('El valor con el que paga es menor que el total.'); return false; }
    return true;
  }
  function armarBorrador() {
    const s = N.sesion(), t = totales(), m = E.modo, cc = Number(String(E.pago.conCuanto).replace(/\D/g, '')) || 0;
    E.borrador = E.borrador && E.borrador.firma === JSON.stringify([E.carrito, m, E.pago, E.nota]) ? E.borrador : {
      firma: JSON.stringify([E.carrito, m, E.pago, E.nota]),
      codigo: N.codigoPedido(), negocio: C.negocio.nombre, creado: new Date().toISOString(),
      cliente: { nombre: s.nombre, celular: s.celular, correo: s.correo },
      items: E.carrito.map(it => ({ ...it, detalle: detalleItem(it), total: precioItem(it).total })),
      modo: m.tipo, mesa: m.mesa || null, fuenteModo: m.fuente,
      destino: m.tipo === 'domicilio' ? { lat: m.lat, lng: m.lng, direccion: m.direccion, indicaciones: m.indicaciones || '', km: m.km, min: m.min, linea: m.linea || null, sinMapa: !!m.sinMapa } : null,
      pago: { tipo: E.pago.tipo, conCuanto: cc || null, cambio: cc ? cc - t.total : null, estado: 'pendiente' }, nota: E.nota, totales: t
    };
    return E.borrador;
  }
  function verTicket() {
    if (!validarPedido()) return;
    if (!N.sesion()) { E.volverTrasCuenta = true; pestana('registro'); ir('cuenta'); return; }
    armarBorrador(); ir('ticket');
  }

  // ------------------------------------------------------------ ticket (vista previa → enviar)
  let ticketCanvas = null;
  async function pintarTicket() {
    const p = E.borrador || (E.ticketDe ? N.obtener('pedidos', E.ticketDe) : null);
    const enviado = !E.borrador;
    $('#b-tk-enviar').hidden = enviado;
    $('#tk-ayuda').textContent = enviado ? 'Este es el soporte de su pedido. También lo tiene el negocio.' : 'Revise su pedido. Al tocar «Enviar pedido», el negocio lo recibe con este ticket.';
    const papel = $('#tk-papel'); papel.innerHTML = '<div class="tkCargando">Generando su ticket…</div>';
    if (!p) return;
    ticketCanvas = await window.TICKET.dibujar(p, { borrador: !enviado });
    const img = document.createElement('img'); img.alt = `Ticket del pedido ${p.codigo}`; img.src = ticketCanvas.toDataURL('image/png');
    papel.innerHTML = ''; papel.append(img);
    if (ANIMAR) img.animate([{ transform: 'translateY(-40px)', clipPath: 'inset(0 0 100% 0)' }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: 'cubic-bezier(.22,.8,.25,1)' });
  }
  async function enviarPedido() {
    const b = $('#b-tk-enviar'); b.disabled = true; b.innerHTML = `${svg('enviar')} Enviando…`;
    const p = { ...E.borrador }; delete p.firma;
    p.estado = 'recibido'; p.historial = [{ estado: 'recibido', at: new Date().toISOString() }]; p.enviado = new Date().toISOString();
    p.autor = N.sesion().id;
    let guardado;
    try { guardado = await N.guardar('pedidos', p); }
    catch (e) { if (e.pendiente) guardado = e.registro; else { U.aviso(e.message || 'No se pudo enviar.'); b.disabled = false; b.innerHTML = `${svg('enviar')} Enviar pedido`; return; } }
    try { await N.mensaje(guardado.id, 'sistema', `Recibimos su pedido ${guardado.codigo} con su ticket. En unos minutos se lo confirmamos por aquí.`); } catch (e) { /* se reintenta con señal */ }
    E.pedidoId = guardado.id; U.ls.set('myr2_pedido', guardado.id);
    E.estados[guardado.id] = 'recibido'; U.ls.set('myr2_estados', E.estados);
    E.carrito = []; guardarCarrito(); E.nota = ''; E.pago = { tipo: null, conCuanto: '' }; E.borrador = null; pintarInsignia();
    b.disabled = false; b.innerHTML = `${svg('enviar')} Enviar pedido`;
    confeti(); U.vibrar([20, 60, 20]);
    ir('inicio', { raiz: true });
    setTimeout(() => pedirPermisoAvisos(), ANIMAR ? 2200 : 0);
    U.aviso(`¡Pedido ${guardado.codigo} enviado! Le avisamos con voz cuando esté listo.`, 4500);
  }

  // ------------------------------------------------------------ aviso de voz cuando el pedido cambia
  function hablar(texto) {
    try {
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(texto); u.lang = 'es-CO'; u.rate = 1; u.pitch = 1.05;
      const voz = speechSynthesis.getVoices().find(v => /es[-_](CO|US|MX|419)/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/i.test(v.lang));
      if (voz) u.voice = voz;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }
  function campanita() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1175, .16], [1568, .32]].forEach(([f, t]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.25, ctx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + t + .5); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .55); });
    } catch (e) { /* sin audio */ }
  }
  async function notificar(titulo, cuerpo) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) reg.showNotification(titulo, { body: cuerpo, icon: 'icons/icono-192.png', badge: 'icons/icono-192.png', vibrate: [200, 100, 200], tag: 'pedido' });
      else new Notification(titulo, { body: cuerpo, icon: 'icons/icono-192.png' });
    } catch (e) { /* sin notificación */ }
  }
  function anunciarCambio(p, antes) {
    const nombre = (N.sesion() && N.sesion().nombre.split(' ')[0]) || '';
    let frase = null;
    if (p.estado === 'confirmado') frase = `${C.negocio.nombre} confirmó su pedido.`;
    if (p.estado === 'listo') frase = p.modo === 'local' ? `${nombre}, su pedido ya está listo. En un momento se lo servimos en la mesa.` : p.modo === 'recoger' ? `${nombre}, su pedido ya está listo. Puede pasar a recogerlo.` : `${nombre}, su pedido ya está listo y sale para su casa.`;
    if (p.estado === 'en_camino') frase = `${nombre}, su pedido va en camino. Esté pendiente.`;
    if (p.estado === 'entregado') frase = null;
    U.aviso(`Pedido ${p.codigo}: ${N.NOMBRE_ESTADO[p.estado]}`, 5000);
    if (frase && ['listo', 'en_camino', 'confirmado'].includes(p.estado)) {
      campanita(); U.vibrar([200, 100, 200, 100, 300]);
      if (p.estado !== 'confirmado') setTimeout(() => hablar(frase), 900);
      notificar(`${C.negocio.nombre} · ${N.NOMBRE_ESTADO[p.estado]}`, frase);
    }
  }
  function revisarCambios() {
    const s = N.sesion(); if (!s || s.rol !== 'cliente') return;
    for (const p of N.lista('pedidos').filter(x => x.autor === s.id)) {
      const antes = E.estados[p.id];
      if (antes && antes !== p.estado) anunciarCambio(p, antes);
      E.estados[p.id] = p.estado;
    }
    U.ls.set('myr2_estados', E.estados);
  }
  N.escuchar(ev => {
    if (ev.col === 'pedidos') { revisarCambios(); const v = actual(); if (v === 'pedido') pintarPedido(); if (v === 'seguir') { mapaSeguimiento('mapa-seguir', true); pintarEta(); } if (v === 'inicio') pintarEnCurso(); if (v === 'chat') pintarChat(true); }
    if (ev.col === 'mensajes' && actual() === 'chat') pintarChat(true);
    if (ev.col === 'mensajes' && actual() === 'pedido') { const p = pedidoActual(); if (p) pintarPagoPedido(p); }
    if (ev.col === 'reservas') { revisarReservas(); if (['mis-reservas', 'inicio', 'reservas'].includes(actual())) pintarMisReservas(); if (actual() === 'reservas') pintarFechas(); }
    if (ev.col === 'menu') { const nav = $('#cats-menu'); if (nav) nav.dataset.cats = ''; }
    if (['menu', 'publicidad'].includes(ev.col) && actual() === 'inicio') pintarInicio();
  });
  // en la nube: se revisa cada 6 s mientras haya un pedido activo
  setInterval(async () => {
    const s = N.sesion(); if (D.modo !== 'supabase' || !s || s.rol !== 'cliente' || document.visibilityState !== 'visible' || !navigator.onLine) return;
    try { await N.refrescar('pedidos'); await N.refrescar('mensajes'); await N.refrescar('reservas'); } catch (e) { /* sin señal */ }
  }, 6000);

  // ------------------------------------------------------------ confeti
  function confeti() {
    if (!ANIMAR) return;
    const cv = $('#confeti'), ctx = cv.getContext('2d'); cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cv.style.display = 'block';
    const cols = ['#E2572B', '#F2A23A', '#1C8748', '#FFD23F', '#F4A3B4'];
    const ps = Array.from({ length: 140 }, () => ({ x: cv.width / 2, y: cv.height * .7, vx: (Math.random() - .5) * 22, vy: -Math.random() * 26 - 8, r: Math.random() * 6 + 4, c: cols[Math.random() * 5 | 0], a: Math.random() * 6, va: (Math.random() - .5) * .4 }));
    let t = 0;
    (function cuadro() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .7; p.vx *= .99; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
      if (++t < 110) requestAnimationFrame(cuadro); else { ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    })();
  }

  // ------------------------------------------------------------ mapa y ruta
  const mapas = {};
  function iconoPin(clase, ic) { return window.L.divIcon({ className: '', html: `<div class="${clase}">${svg(ic)}</div>`, iconSize: [34, 34], iconAnchor: [17, 34] }); }
  async function calcularRuta(m) {
    m.km = Math.round(distanciaKm(NEG, m) * 1.35 * 10) / 10; m.min = Math.max(4, Math.round(m.km * C.domicilio.minutosPorKm)); m.linea = null; m.recta = true;
    try {
      if (!navigator.onLine) throw new Error('sin señal');
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`${C.servicios.rutas}/route/v1/driving/${NEG.lng},${NEG.lat};${m.lng},${m.lat}?overview=full&geometries=geojson`, { signal: ctl.signal });
      clearTimeout(to); const j = await r.json();
      if (j.code !== 'Ok' || !j.routes || !j.routes[0]) throw new Error('sin ruta');
      const ru = j.routes[0];
      m.km = Math.round(ru.distance / 100) / 10; m.min = Math.max(4, Math.round(ru.duration / 60 * 1.3));
      m.linea = ru.geometry.coordinates.map(([lng, lat]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]); m.recta = false;
    } catch (e) { /* línea recta × 1,35 */ }
    return m;
  }
  async function direccionInversa(m) {
    try {
      const r = await fetch(`${C.servicios.direcciones}/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${m.lat}&lon=${m.lng}`);
      const j = await r.json(); const a = j.address || {};
      const txt = [a.road, a.house_number, a.neighbourhood || a.suburb].filter(Boolean).join(' ');
      if (txt) { m.direccion = txt; guardarModo(); if (actual() === 'resumen') pintarResumen(); if (actual() === 'mapa') $('#mp-direccion').value = txt; }
    } catch (e) { /* sin señal */ }
  }
  function sinMosaicos(el) {
    el.classList.add('sinMosaicos');
    if (!el.querySelector('.notaMapa')) { const n = document.createElement('p'); n.className = 'notaMapa'; n.textContent = 'Sin señal para las calles del mapa: se ve la ruta sobre un plano simple.'; el.append(n); }
  }
  function crearMapa(el, interactivo) {
    const L = window.L; if (!L) { sinMosaicos(el); return null; }
    const mp = L.map(el, { zoomControl: interactivo, dragging: interactivo, scrollWheelZoom: interactivo, touchZoom: interactivo, doubleClickZoom: interactivo, boxZoom: false, keyboard: interactivo });
    let fallos = 0;
    L.tileLayer(C.servicios.mosaicos, { maxZoom: 19, attribution: '© OpenStreetMap · rutas OSRM' }).addTo(mp).on('tileerror', () => { if (++fallos === 3) sinMosaicos(el); });
    if (!navigator.onLine) sinMosaicos(el);
    L.marker([NEG.lat, NEG.lng], { icon: iconoPin('pinNegocio', 'llama'), keyboard: false, title: C.negocio.nombre }).addTo(mp);
    return { mp, el };
  }
  function dibujarRuta(reg, m) {
    const L = window.L; if (!reg.mp) return;
    if (reg.linea) reg.linea.remove();
    if (m && m.lat) {
      const pts = m.linea || [[NEG.lat, NEG.lng], [m.lat, m.lng]];
      reg.linea = L.polyline(pts, { color: '#E2572B', weight: 6, opacity: .9, dashArray: m.linea ? null : '2 10', lineCap: 'round' }).addTo(reg.mp);
      if (reg.el.id === 'mapa') return;
      if (reg.el.id !== 'mapa') { if (!reg.fijo) reg.fijo = L.marker([m.lat, m.lng], { icon: iconoPin('pinCliente', 'ubicacion'), keyboard: false }).addTo(reg.mp); else reg.fijo.setLatLng([m.lat, m.lng]); }
      const caja = L.latLngBounds(pts.concat([[NEG.lat, NEG.lng], [m.lat, m.lng]]));
      const encuadrar = () => { reg.mp.invalidateSize(); const grande = reg.el.id === 'mapa', alto = grande ? ($('.mapaTarjeta').offsetHeight || 340) : 0;
        reg.mp.fitBounds(caja, grande ? { paddingTopLeft: [40, 100], paddingBottomRight: [40, alto + 30], maxZoom: 17 } : { paddingTopLeft: [30, 64], paddingBottomRight: [30, 30], maxZoom: 17 }); };
      encuadrar(); setTimeout(encuadrar, 450);
    } else reg.mp.setView([NEG.lat, NEG.lng], 15);
  }
  function mapaEn(id, m, interactivo) {
    const el = document.getElementById(id); let reg = mapas[id];
    if (!reg) reg = mapas[id] = crearMapa(el, interactivo) || { el, mp: null };
    setTimeout(() => { if (reg.mp) reg.mp.invalidateSize(); dibujarRuta(reg, m); }, 60);
    return reg;
  }
  function abrirMapa() {
    const m = E.modo && E.modo.tipo === 'domicilio' && !E.modo.sinMapa ? E.modo : { tipo: 'domicilio' };
    const s = N.sesion();
    if (!m.lat && s && s.direccion && !$('#mp-direccion').value) $('#mp-direccion').value = s.direccion;
    else if (m.lat && m.direccion && m.direccion !== 'Mi ubicación actual') $('#mp-direccion').value = m.direccion;
    $('#mp-indicaciones').value = m.indicaciones || ''; E.borradorDir = { ...m };
    $('#dir-manual').hidden = true;
    const reg = mapaEn('mapa', m.lat ? m : null, true);
    if (reg.mp) {
      const pin = $('#pin-centro');
      if (!reg.oyentes) {
        reg.oyentes = true;
        reg.mp.on('movestart', () => { pin.classList.add('levantado'); });
        reg.mp.on('moveend', () => {
          pin.classList.remove('levantado');
          if (reg.prog) { reg.prog = false; return; }
          clearTimeout(reg.tMov); reg.tMov = setTimeout(() => { const c = reg.mp.getCenter(); moverDestino(c.lat, c.lng, { centrar: false }); }, 380);
        });
        reg.mp.on('click', e => reg.mp.panTo(e.latlng));
      }
      reg.prog = true; setTimeout(() => { reg.prog = false; }, 900);
      setTimeout(() => { reg.mp.invalidateSize(); reg.mp.setView(m.lat ? [m.lat, m.lng] : [NEG.lat, NEG.lng], m.lat ? 17 : 16, { animate: false }); }, 80);
      $('#pc-ayuda').textContent = m.lat ? 'Su casa · mueva el mapa para corregir' : 'Mueva el mapa: el pin es su casa';
    }
    pintarDatosRuta(m.lat ? m : null);
  }
  async function moverDestino(lat, lng, { centrar = true } = {}) {
    const b = E.borradorDir = { ...(E.borradorDir || {}), tipo: 'domicilio', lat, lng, sinMapa: false, fuente: (E.borradorDir && E.borradorDir.fuente) || 'manual' };
    const reg = mapas.mapa;
    if (centrar && reg && reg.mp) { reg.prog = true; reg.mp.setView([lat, lng], Math.max(reg.mp.getZoom(), 17)); setTimeout(() => { reg.prog = false; }, 900); }
    $('#pc-ayuda').textContent = 'Su casa · mueva el mapa para corregir';
    $('#mp-datos').innerHTML = '<div class="largo"><small>Calculando la ruta…</small></div>';
    const yo = (E.rutaN = (E.rutaN || 0) + 1);
    await calcularRuta(b);
    if (yo !== E.rutaN) return;                 // llegó otra posición mientras tanto
    if (reg) dibujarRuta(reg, b);
    pintarDatosRuta(b);
  }
  function pintarDatosRuta(m) {
    if (!m || !m.lat) { $('#mp-datos').innerHTML = '<div class="largo"><small>Busque su dirección, use su ubicación o toque el mapa.</small></div>'; return; }
    const lejos = m.km > C.domicilio.maxKm, t = tarifa(m.km, subtotal());
    $('#mp-datos').innerHTML = `<div><small>Distancia</small><b>${m.km.toFixed(1).replace('.', ',')} km</b></div><div><small>Tiempo</small><b>${m.min} min</b></div><div><small>Domicilio</small><b>${lejos ? 'Fuera' : t.valor ? pesos(t.valor) : 'Gratis'}</b></div>`
      + (m.recta ? '<div class="largo"><small>Distancia aproximada (sin ruta exacta por ahora).</small></div>' : '')
      + (lejos ? `<div class="largo"><small>Llevamos hasta ${C.domicilio.maxKm} km. Puede escoger «Recoger».</small></div>` : '');
    $('#b-confirmar-dir').disabled = lejos;
  }
  async function buscarDireccion(txt) {
    if (!txt) return;
    $('#mp-datos').innerHTML = '<div class="largo"><small>Buscando…</small></div>';
    try {
      const q = /,/.test(txt) ? txt : `${txt}, ${C.negocio.municipio}`;
      const vb = [NEG.lng - .2, NEG.lat + .2, NEG.lng + .2, NEG.lat - .2].join(',');
      const r = await fetch(`${C.servicios.direcciones}/search?format=jsonv2&limit=1&countrycodes=co&accept-language=es&viewbox=${vb}&q=${encodeURIComponent(q)}`);
      const [hit] = await r.json();
      if (!hit) { $('#mp-datos').innerHTML = '<div class="largo"><small>No la encontramos. Toque el mapa o mueva el pin hasta su puerta.</small></div>'; return; }
      await moverDestino(Number(hit.lat), Number(hit.lon)); E.borradorDir.direccion = txt;
    } catch (e) { $('#mp-datos').innerHTML = '<div class="largo"><small>Sin señal para buscar. Use su ubicación o toque el mapa.</small></div>'; }
  }
  function direccionSinMapa() {
    const calle = $('#mp-direccion').value.trim(), barrio = $('#mp-barrio').value.trim();
    if (calle.length < 4) { U.aviso('Escriba la calle, el número o una referencia.'); $('#mp-direccion').focus(); return; }
    E.modo = { tipo: 'domicilio', fuente: 'manual', sinMapa: true, lat: NEG.lat, lng: NEG.lng, km: 1, min: 10, recta: true, linea: null,
      direccion: barrio ? `${calle}, ${barrio}` : calle, indicaciones: $('#mp-indicaciones').value.trim() };
    guardarModo(); U.aviso(`Domicilio: ${pesos(tarifa(1, subtotal()).valor)} (mínimo). El negocio le confirma por el chat.`, 4500);
    atras();
  }
  function confirmarDireccion() {
    const b = E.borradorDir; if (!b || !b.lat) { U.aviso('Marque primero su dirección.'); return; }
    b.direccion = $('#mp-direccion').value.trim() || b.direccion || 'Punto marcado en el mapa';
    b.indicaciones = $('#mp-indicaciones').value.trim();
    E.modo = { ...b, tipo: 'domicilio' }; guardarModo();
    const v = tarifa(b.km, subtotal()).valor; U.aviso(`Domicilio: ${v ? pesos(v) : 'gratis'} · ${b.min} min`);
    atras();
  }

  // ------------------------------------------------------------ pedido
  const PASOS = {
    local: [['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'], ['listo', '¡Listo! Ya se lo servimos'], ['entregado', 'Servido. ¡Buen provecho!']],
    recoger: [['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'], ['listo', 'Listo para recoger'], ['entregado', 'Entregado']],
    domicilio: [['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'], ['listo', 'Listo'], ['en_camino', 'En camino'], ['entregado', 'Entregado']]
  };
  const pedidoActual = () => E.pedidoId ? N.obtener('pedidos', E.pedidoId) : null;
  function enlaceWa(texto) { const n = String(C.negocio.whatsapp || '').replace(/\D/g, ''); return n.length === 10 ? `https://wa.me/57${n}?text=${encodeURIComponent(texto)}` : null; }
  function textoWhatsApp(p) {
    const l = [`Hola, ${C.negocio.nombre}. Pedido *${p.codigo}*`, ''];
    p.items.forEach(it => l.push(`• ${it.cant} × ${it.nombre} (${it.detalle}) ${pesos(it.total)}`));
    l.push('', `Total: *${pesos(p.totales.total)}* · Pago: ${p.pago.tipo}`);
    if (p.modo === 'domicilio') l.push(`Domicilio: ${p.destino.direccion}${p.destino.indicaciones ? ' · ' + p.destino.indicaciones : ''}`, `Mapa: https://www.openstreetmap.org/?mlat=${p.destino.lat}&mlon=${p.destino.lng}#map=18/${p.destino.lat}/${p.destino.lng}`);
    if (p.modo === 'local') l.push(`En el local${p.mesa ? ' · mesa ' + p.mesa : ''}`);
    if (p.modo === 'recoger') l.push('Para recoger');
    l.push(`A nombre de ${p.cliente.nombre} · ${p.cliente.celular}`); return l.join('\n');
  }
  function pintarPedido() {
    const p = pedidoActual(); if (!p) { $('#pd-estado').innerHTML = '<p>No hay un pedido en curso.</p>'; return; }
    $('#pd-codigo').textContent = p.codigo;
    const pasos = PASOS[p.modo], k = Math.max(0, pasos.findIndex(x => x[0] === p.estado)), fin = p.estado === 'entregado';
    const min = window.ASISTENTE.minutosRestantes(p);
    $('#pd-estado').innerHTML = p.estado === 'cancelado' ? '<div class="estado"><h3>Pedido cancelado</h3><p class="mini">Escríbanos por el chat si tiene dudas.</p></div>' :
      `<div class="estado"><h3>${esc(pasos[k][1])}</h3><p class="eta">${svg('reloj')} ${fin ? 'Pedido terminado' : p.estado === 'listo' ? '¡Está listo!' : `Faltan unos ${min} minutos`}</p>
      <ol class="pasos">${pasos.map(([id, n], j) => `<li class="${j < k || fin ? 'hecho' : j === k ? 'actual' : ''}"><span class="pt">${j < k || fin ? svg('check') : ''}</span><span>${esc(n)}</span></li>`).join('')}</ol></div>`;
    $('#pd-ruta-caja').hidden = p.modo !== 'domicilio';
    if (p.modo === 'domicilio') {
      const sm = p.destino.sinMapa;
      $('#mapa-pedido').hidden = sm; $('#b-pd-seguir').hidden = sm;
      $('#pd-ruta-txt').textContent = sm ? `${p.destino.direccion} · dirección escrita sin mapa: el domiciliario lo llama si necesita indicaciones.` : `${p.destino.direccion} · ${String(p.destino.km).replace('.', ',')} km desde ${C.negocio.nombre}.`;
      if (!sm) { mapaSeguimiento('mapa-pedido', false); iniciarSeguimiento(); }
      pintarEta();
    }
    $('#pd-detalle').innerHTML = `<h3 class="subt sinMargen">Detalle</h3><ul class="detalle-lista">${p.items.map(it => `<li><span>${it.cant} × ${esc(it.nombre)}<br><small class="mini">${esc(it.detalle)}</small></span><b>${pesos(it.total)}</b></li>`).join('')}
      ${p.totales.empaque ? `<li><span>Empaque</span><b>${pesos(p.totales.empaque)}</b></li>` : ''}${p.modo === 'domicilio' ? `<li><span>Domicilio</span><b>${p.totales.domicilio ? pesos(p.totales.domicilio) : 'Gratis'}</b></li>` : ''}
      <li class="tot"><span>Total · ${esc({ efectivo: 'efectivo', transferencia: 'transferencia', tarjeta: 'tarjeta' }[p.pago.tipo])}</span><b>${pesos(p.totales.total)}</b></li></ul>`;
    const wa = enlaceWa(textoWhatsApp(p)), b = $('#b-pd-wa'); if (wa) b.href = wa; else b.removeAttribute('href');
    pintarPagoPedido(p);
  }
  function pintarPagoPedido(p) {
    const box = $('#pd-pago'); if (!box) return;
    if (p.pago.tipo !== 'transferencia' || p.estado === 'cancelado') { box.hidden = true; return; }
    box.hidden = false;
    const comp = N.mensajesDe(p.id).filter(m => m.comprobante).pop();
    const pagado = p.pago.estado === 'pagado';
    box.innerHTML = `<div class="pagoCab"><span class="pagoIco ${pagado ? 'ok' : ''}">${svg(pagado ? 'check' : 'transfer')}</span><div><b>${pagado ? 'Pago recibido' : comp ? 'Comprobante enviado' : 'Pago por transferencia'}</b><small>${pagado ? 'El negocio confirmó su transferencia.' : comp ? 'El negocio lo está verificando. Le avisamos por el chat.' : `Transfiera ${pesos(p.totales.total)} y suba aquí la foto o captura del comprobante.`}</small></div></div>
      ${!pagado ? `<label class="btn ${comp ? 'claro' : 'verde'} grande">${svg('compartir')} ${comp ? 'Subir otro comprobante' : 'Subir comprobante'}<input type="file" accept="image/*" id="pd-comp" hidden></label>` : ''}
      ${!pagado && C.pagos.enlacePago ? `<a class="btn oscuro" href="${esc(C.pagos.enlacePago)}" target="_blank" rel="noopener">${svg('tarjeta')} Pagar en línea</a>` : ''}`;
    const inp = $('#pd-comp');
    if (inp) inp.onchange = async e => {
      const f = e.target.files[0]; if (!f) return; U.aviso('Subiendo el comprobante…');
      try {
        const ref = await D.subirComprobante(f);
        await N.mensaje(p.id, 'cliente', 'Le envío el comprobante de la transferencia.', { comprobante: ref });
        U.aviso('Comprobante enviado. El negocio lo verifica.'); U.vibrar([10, 40, 10]); pintarPedido();
      } catch (er) { U.aviso(er.message || 'No se pudo subir. Intente de nuevo.'); }
    };
  }

  // ------------------------------------------------------------ seguimiento de la moto (mapa del pedido y vista en grande)
  let tSeg = null;
  function motoIcono() { return window.L.divIcon({ className: '', html: '<div class="motoPin"><span class="motoPulso"></span><span class="motoCirculo"><svg><use href="#i-motoGrande"/></svg></span></div>', iconSize: [52, 52], iconAnchor: [26, 26] }); }
  function mapaSeguimiento(id, interactivo) {
    const el = document.getElementById(id); let reg = mapas[id];
    if (!reg) reg = mapas[id] = crearMapa(el, interactivo) || { el, mp: null };
    const p = pedidoActual(); if (!p || !reg.mp) return reg;
    const L = window.L, st = window.SEGUIMIENTO.estado(p);
    if (reg.pedido !== p.id) {
      ['restante', 'hecho', 'casa', 'moto'].forEach(k => { if (reg[k]) { reg[k].remove(); reg[k] = null; } });
      reg.pedido = p.id;
      reg.restante = L.polyline(st.pts, { color: '#E2572B', weight: 6, opacity: .85, dashArray: p.destino.linea ? null : '2 10', lineCap: 'round' }).addTo(reg.mp);
      reg.hecho = L.polyline([], { color: '#1C8748', weight: 7, opacity: .95, lineCap: 'round' }).addTo(reg.mp);
      reg.casa = L.marker([p.destino.lat, p.destino.lng], { icon: iconoPin('pinCliente', 'casa'), keyboard: false, title: 'Su casa' }).addTo(reg.mp);
      reg.moto = L.marker([st.pos.lat, st.pos.lng], { icon: motoIcono(), keyboard: false, zIndexOffset: 1000, title: 'Domiciliario' }).addTo(reg.mp);
      reg.motoPos = [st.pos.lat, st.pos.lng];
      const caja = L.latLngBounds(st.pts.concat([[NEG.lat, NEG.lng], [p.destino.lat, p.destino.lng]]));
      const encuadrar = () => { reg.mp.invalidateSize(); const grande = id === 'mapa-seguir', alto = grande ? ($('.sgTarjeta').offsetHeight || 260) : 0;
        reg.mp.fitBounds(caja, grande ? { paddingTopLeft: [50, 110], paddingBottomRight: [50, alto + 40], maxZoom: 17 } : { padding: [36, 36], maxZoom: 17 }); };
      encuadrar(); setTimeout(encuadrar, 450);
    } else setTimeout(() => reg.mp.invalidateSize(), 60);
    moverMoto(reg, st);
    return reg;
  }
  function moverMoto(reg, st) {
    if (!reg.moto) return;
    reg.hecho.setLatLngs(st.frac > 0 ? st.pos.recorrido : []);
    const el = reg.moto.getElement && reg.moto.getElement(); if (el) { const c = el.querySelector('.motoPin'); if (c) { c.classList.toggle('izq', st.pos.rumbo > 180); c.classList.toggle('quieta', st.fuente === 'espera' || st.fuente === 'fin'); } }
    const [la0, lo0] = reg.motoPos || [st.pos.lat, st.pos.lng], la1 = st.pos.lat, lo1 = st.pos.lng;
    reg.motoPos = [la1, lo1];
    if (!ANIMAR || (la0 === la1 && lo0 === lo1)) { reg.moto.setLatLng([la1, lo1]); return; }
    const t0 = performance.now(), dur = 1200;
    const paso = t => { const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; reg.moto.setLatLng([la0 + (la1 - la0) * e, lo0 + (lo1 - lo0) * e]); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
  function textoEta(p, st) {
    if (!st) return { tit: '', sub: '' };
    const km = x => x.toFixed(1).replace('.', ',');
    if (st.fuente === 'fin') return { tit: '¡Entregado!', sub: 'Buen provecho.' };
    if (st.fuente === 'espera') return { tit: `Llega en unos ${st.minRest} min`, sub: p.estado === 'listo' ? 'Su pedido está listo: la moto sale ya.' : 'La moto sale cuando su pedido esté listo.' };
    return { tit: `Llega en ${st.minRest} min`, sub: `Faltan ${km(st.kmRest)} km de ${km(st.kmTotal)} km · ${st.fuente === 'gps' ? 'ubicación en vivo del domiciliario' : 'posición aproximada según el tiempo'}` };
  }
  function pintarEta() {
    const p = pedidoActual(); if (!p || p.modo !== 'domicilio') return;
    const st = p.destino.sinMapa ? null : window.SEGUIMIENTO.estado(p), t = textoEta(p, st);
    const box = $('#pd-eta');
    if (box) box.innerHTML = p.destino.sinMapa ? '' : `<span class="motoMini">${svg('motoGrande')}</span><div><b>${esc(t.tit)}</b><small>${esc(t.sub)}</small></div><span class="etaBarra"><i style="width:${Math.round((st ? st.frac : 0) * 100)}%"></i></span>`;
    if (actual() === 'seguir' && st) {
      $('#sg-estado').textContent = st.texto; $('#sg-min').textContent = st.fuente === 'fin' ? '¡Entregado!' : `${st.minRest} min`;
      $('#sg-km').textContent = st.fuente === 'fin' ? '' : st.fuente === 'espera' ? 'para que llegue' : `faltan ${st.kmRest.toFixed(1).replace('.', ',')} km`;
      $('#sg-barra').style.width = Math.round(st.frac * 100) + '%';
      $('#sg-fuente').textContent = st.fuente === 'gps' ? `Ubicación en vivo del domiciliario (hace ${st.gpsHace} s).` : st.fuente === 'estimado' ? 'Posición aproximada según el tiempo en camino. Se ve en vivo cuando el domiciliario comparte su ubicación.' : '';
    }
  }
  function iniciarSeguimiento() {
    clearInterval(tSeg);
    tSeg = setInterval(() => {
      const p = pedidoActual(); if (!p || p.modo !== 'domicilio' || p.destino.sinMapa) return;
      const st = window.SEGUIMIENTO.estado(p);
      ['mapa-pedido', 'mapa-seguir'].forEach(id => { const reg = mapas[id]; if (reg && reg.moto && reg.pedido === p.id) moverMoto(reg, st); });
      pintarEta();
    }, 3000);
  }
  function pararSeguimiento() { clearInterval(tSeg); tSeg = null; }
  function abrirSeguir() {
    const p = pedidoActual(); if (!p || p.modo !== 'domicilio' || p.destino.sinMapa) { U.aviso('Este pedido no tiene ruta en el mapa.'); return; }
    setTimeout(() => { mapaSeguimiento('mapa-seguir', true); pintarEta(); }, 60);
    iniciarSeguimiento();
  }

  // ------------------------------------------------------------ chat con asistente
  async function pintarChat(soloNuevos) {
    const p = pedidoActual(); $('#ch-negocio').textContent = C.negocio.nombre;
    if (!p) { $('#hilo').innerHTML = '<li class="sistema">Haga un pedido para chatear con el negocio.</li>'; return; }
    $('#ch-estado').textContent = `Pedido ${p.codigo} · ${N.NOMBRE_ESTADO[p.estado]} · asistente al instante`;
    const ms = N.mensajesDe(p.id), hilo = $('#hilo');
    if (soloNuevos && hilo.dataset.n === String(ms.length)) return;
    hilo.dataset.n = ms.length; let dia = '';
    hilo.innerHTML = ms.map(m => {
      const d = U.fechaLarga(m.creado), sep = d !== dia ? `<li class="fecha">${esc(d)}</li>` : ''; dia = d;
      const quien = m.de === 'asistente' ? `<span class="quien">${svg('chispa')} Asistente${m.ia ? ' IA' : ''}</span>` : m.de === 'negocio' ? `<span class="quien">${esc(m.firma || C.negocio.nombre)}</span>` : '';
      return `${sep}<li class="${m.de}">${quien}${esc(m.texto)}${m.comprobante ? `<span class="chComp" data-comp="${esc(m.comprobante)}">${svg('ticket')} Comprobante adjunto</span>` : ''}<small>${U.hora(m.creado)}</small></li>`;
    }).join('');
    requestAnimationFrame(() => { hilo.scrollTop = hilo.scrollHeight; });
    const wa = enlaceWa(`Hola, escribo por el pedido ${p.codigo}.`), b = $('#b-chat-wa'); if (wa) b.href = wa; else b.removeAttribute('href');
  }
  async function enviarChat(txt) {
    txt = txt.trim(); if (!txt) return; const p = pedidoActual(); if (!p) return;
    $('#ch-txt').value = '';
    try { await N.mensaje(p.id, 'cliente', txt); } catch (e) { /* queda en el teléfono */ }
    pintarChat();
    const escribiendo = document.createElement('li'); escribiendo.className = 'asistente escribiendo'; escribiendo.innerHTML = '<i></i><i></i><i></i>'; $('#hilo').append(escribiendo); $('#hilo').scrollTop = 1e6;
    const ctx = { nombre: N.sesion().nombre, especialidades: N.menu().filter(x => x.especialidad).map(x => x.nombre), historial: N.mensajesDe(p.id).map(m => ({ de: m.de, texto: m.texto })) };
    const r = await window.ASISTENTE.responder(txt, N.obtener('pedidos', p.id), ctx);
    await new Promise(res => setTimeout(res, U.robot ? 0 : 500));
    escribiendo.remove();
    try { await N.mensaje(p.id, 'asistente', r.texto, { ia: !!r.ia, paraPersona: !!r.persona }); } catch (e) { /* nada */ }
    pintarChat();
  }

  // ------------------------------------------------------------ reservas
  function diasDisponibles() {
    const out = [], hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (let k = 0; k < C.reservas.anticipacionDias; k++) { const d = new Date(hoy); d.setDate(d.getDate() + k); out.push(d); }
    return out;
  }
  function horasDe(dia) {
    const [ha, ma] = C.reservas.apertura.split(':').map(Number), [hc, mc] = C.reservas.cierre.split(':').map(Number);
    const out = []; for (let m = ha * 60 + ma; m <= hc * 60 + mc - C.reservas.intervaloMin; m += C.reservas.intervaloMin) out.push(`${String(m / 60 | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    const ocupado = h => N.lista('reservas').filter(r => r.dia === dia && r.hora === h && !['rechazada', 'cancelada'].includes(r.estado)).reduce((a, r) => a + r.personas, 0);
    const ahora = new Date();
    return out.map(h => ({ h, libres: C.reservas.capacidadPorTurno - ocupado(h), pasada: dia === U.hoy() && (+h.slice(0, 2) * 60 + +h.slice(3)) < ahora.getHours() * 60 + ahora.getMinutes() + 30 }));
  }
  const ARTE_OC = ['picada', 'pollo', 'carne', 'costillas', 'pescado', 'chuzo', 'hamburguesa', 'acompanante'];
  const ocImg = (o, w) => U.imgPlato({ foto: o.foto, arte: ARTE_OC[N.ocasiones().indexOf(o) % 8], nombre: o.nombre }, w);
  function pintarOcasion(dir = 0) {
    const ocs = N.ocasiones(); if (!ocs.length) return;
    let k = ocs.findIndex(o => o.id === E.rv.ocasion); if (k < 0) { k = 0; E.rv.ocasion = ocs[0].id; }
    const o = ocs[k], cont = $('#rv-plato');
    const nueva = document.createElement('div'); nueva.className = 'platoCapa'; nueva.innerHTML = ocImg(o, 600);
    const viejas = [...cont.querySelectorAll('.platoCapa')]; cont.append(nueva);
    const tit = $('#rv-oc-nombre');
    if (dir && ANIMAR) {
      const d = 620, ez = 'cubic-bezier(.22,.8,.25,1)';
      viejas.forEach(v => v.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 70}%) rotate(${-dir * 120}deg) scale(.7)`, opacity: 0 }], { duration: d, easing: ez, fill: 'forwards' }).finished.then(() => v.remove()));
      nueva.animate([{ transform: `translateX(${dir * 70}%) rotate(${dir * 120}deg) scale(.7)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: d, easing: ez });
      tit.animate([{ opacity: 0, transform: `translateX(${dir * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ez });
      $('#rv-oc-texto').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420 });
      U.vibrar(8);
    } else viejas.forEach(v => v.remove());
    tit.textContent = o.nombre; $('#rv-oc-texto').textContent = o.texto || '';
    $('#rv-ocasiones').innerHTML = ocs.map(x => `<button role="tab" type="button" data-ocasion="${x.id}" aria-selected="${x.id === o.id}" aria-label="${esc(x.nombre)}">${ocImg(x, 140)}<small>${esc(x.nombre)}</small></button>`).join('');
    const sel = $('#rv-ocasiones [aria-selected=true]'), fila = $('#rv-ocasiones');
    if (sel) fila.scrollTo({ left: sel.offsetLeft - fila.clientWidth / 2 + sel.offsetWidth / 2, behavior: ANIMAR ? 'smooth' : 'auto' });
    const sugeridos = N.menu().filter(p => p.disponible !== false && (p.ocasiones || []).includes(o.id));
    const lista = sugeridos.length ? sugeridos : N.menu().filter(p => p.especialidad);
    $('#rv-menu').innerHTML = lista.map(p => tarjetaProducto(p)).join('');
  }
  function moverOcasion(d) { const ocs = N.ocasiones(); if (ocs.length < 2) return; const k = ocs.findIndex(o => o.id === E.rv.ocasion); E.rv.ocasion = ocs[(k + d + ocs.length) % ocs.length].id; pintarOcasion(d); }
  function pintarReservas() {
    const R = E.rv; if (!R.dia) R.dia = U.hoy();
    pintarOcasion(0); pintarFechas(); pintarProximaReserva();
  }
  function pintarFechas() {
    const R = E.rv;
    $('#rv-dias').innerHTML = diasDisponibles().map(d => { const iso = U.hoy(d); return `<button type="button" data-dia="${iso}" aria-pressed="${iso === R.dia}"><small>${d.toLocaleDateString('es-CO', { weekday: 'short' })}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('es-CO', { month: 'short' })}</small></button>`; }).join('');
    const hs = horasDe(R.dia);
    if (R.hora && !hs.some(x => x.h === R.hora && x.libres >= R.n && !x.pasada)) R.hora = null;
    $('#rv-horas').innerHTML = hs.map(x => `<button type="button" data-hora="${x.h}" aria-pressed="${x.h === R.hora}" ${x.pasada || x.libres < R.n ? 'disabled' : ''}>${horaBonita(x.h)}<small>${x.pasada ? 'Pasó' : x.libres < R.n ? 'Lleno' : x.libres + ' cupos'}</small></button>`).join('');
    $('#rv-n').textContent = R.n;
  }
  const EST_RV = { solicitada: ['Por confirmar', ''], confirmada: ['Confirmada', 'verde'], rechazada: ['No disponible', 'roja'], cumplida: ['Cumplida', 'oro'], cancelada: ['Cancelada', 'roja'] };
  function tarjetaReserva(r) {
    const o = N.obtener('ocasiones', r.ocasion) || { nombre: r.ocasion }, est = esProxima(r) ? EST_RV[r.estado] : r.estado === 'cumplida' ? EST_RV.cumplida : ['rechazada', 'cancelada'].includes(r.estado) ? EST_RV[r.estado] : ['Pasó', ''];
    const wa = enlaceWa(`Hola, ${C.negocio.nombre}. Escribo por mi reserva de ${o.nombre} del ${U.fechaLarga(r.dia + 'T12:00')} a las ${horaBonita(r.hora)} (${r.personas} personas).`);
    return `<li class="tReserva"><span class="trFoto">${U.imgPlato({ foto: o.foto, arte: 'picada', nombre: o.nombre }, 220)}</span>
      <div class="trTxt"><span class="etiqueta ${est[1]}">${est[0]}</span><b>${esc(o.nombre)}</b><small>${esc(U.fechaLarga(r.dia + 'T12:00'))} · ${horaBonita(r.hora)}</small><small>${r.personas} personas${r.descripcion ? ' · «' + esc(r.descripcion) + '»' : ''}</small>${r.respuesta ? `<small class="trResp">${svg('chat')} ${esc(r.respuesta)}</small>` : ''}
      ${esProxima(r) && wa ? `<a class="enlace" href="${esc(wa)}" target="_blank" rel="noopener">${svg('wa')} Cambiar o cancelar por WhatsApp</a>` : ''}</div></li>`;
  }
  function pintarMisReservas() {
    pintarProximaReserva();
    if (actual() !== 'mis-reservas') return;
    const ant = E.mrTab === 'ant', todas = misReservas();
    const lista = ant ? todas.filter(r => !esProxima(r)).sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora)) : todas.filter(esProxima).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
    $('#mr-tab-prox').setAttribute('aria-selected', !ant); $('#mr-tab-ant').setAttribute('aria-selected', ant);
    $('#mr-tab-prox').textContent = `Próximas (${todas.filter(esProxima).length})`; $('#mr-tab-ant').textContent = `Anteriores (${todas.filter(r => !esProxima(r)).length})`;
    $('#mr-lista').innerHTML = lista.length ? lista.map(tarjetaReserva).join('') : `<li class="vacioRes">${svg('calendario')}<b>${ant ? 'Aún no tiene reservas anteriores' : 'No tiene reservas próximas'}</b><small>${ant ? 'Aquí verá las que ya se cumplieron.' : 'Haga una y la verá aquí.'}</small></li>`;
  }
  async function reservar() {
    const R = E.rv, s = N.sesion();
    if (!s) { E.volverTrasCuenta = false; pestana('registro'); ir('cuenta'); return; }
    if (!R.hora) { U.aviso('Escoja la hora.'); $('#rv-horas').scrollIntoView({ behavior: ANIMAR ? 'smooth' : 'auto', block: 'center' }); return; }
    let r;
    try {
      r = await N.guardar('reservas', { ocasion: R.ocasion, dia: R.dia, hora: R.hora, personas: R.n, descripcion: $('#rv-desc').value.trim(), estado: 'solicitada', cliente: { nombre: s.nombre, celular: s.celular, correo: s.correo } });
    } catch (e) { if (!e.pendiente) { U.aviso(e.message); return; } r = e.registro; }
    E.rvEstados[r.id] = r.estado; U.ls.set('myr2_rv_estados', E.rvEstados);
    $('#rv-desc').value = ''; R.hora = null;
    const o = N.obtener('ocasiones', r.ocasion) || { nombre: r.ocasion };
    $('#rok-resumen').innerHTML = `<span class="okFoto">${ocImg(o, 300)}</span><div><b>${esc(o.nombre)}</b><span>${esc(U.fechaLarga(r.dia + 'T12:00'))}</span><span>${horaBonita(r.hora)} · ${r.personas} personas</span><span class="etiqueta">Por confirmar</span></div>`;
    ir('reserva-ok', { reemplazar: true }); confeti(); U.vibrar([20, 60, 20]);
  }
  function revisarReservas() {
    const s = N.sesion(); if (!s || s.rol !== 'cliente') return;
    for (const r of misReservas()) {
      const antes = E.rvEstados[r.id];
      if (antes && antes !== r.estado && ['confirmada', 'rechazada'].includes(r.estado)) {
        const o = N.obtener('ocasiones', r.ocasion) || { nombre: 'su reserva' };
        const t = r.estado === 'confirmada' ? `¡Reserva confirmada! ${o.nombre}, ${U.fechaLarga(r.dia + 'T12:00')} a las ${horaBonita(r.hora)}.` : `Su reserva de ${o.nombre} no se pudo confirmar. ${r.respuesta || ''}`;
        U.aviso(t, 5500); campanita(); U.vibrar([120, 60, 120]); notificar(C.negocio.nombre + ' · Reservas', t);
      }
      E.rvEstados[r.id] = r.estado;
    }
    U.ls.set('myr2_rv_estados', E.rvEstados);
  }

  // ------------------------------------------------------------ perfil
  function pintarPerfil() {
    const s = N.sesion();
    if (!s) { $('#pf-datos').innerHTML = '<p>No ha ingresado.</p>'; return; }
    $('#pf-datos').innerHTML = `<div class="datos-perfil"><span class="avatarGrande">${s.foto ? `<img src="${esc(s.foto)}" alt="" referrerpolicy="no-referrer">` : esc(s.nombre[0].toUpperCase())}</span><b>${esc(s.nombre)}</b><span>${esc(s.celular)} · ${esc(s.correo)}</span><span class="mini">${esc(s.direccion || 'Sin dirección habitual')}</span>
      <span class="mini">Datos: ${D.modo === 'demo' ? 'modo demostración (solo este teléfono)' : 'en la nube, con copia para usar sin señal'}</span></div>`;
    const ps = N.lista('pedidos').filter(p => p.autor === s.id).sort((a, b) => b.creado.localeCompare(a.creado));
    $('#pf-pedidos').innerHTML = ps.length ? ps.map(p => `<li><div class="filaPedido"><button type="button" class="filaBoton" data-ver-pedido="${p.id}"><b>${esc(p.codigo)}</b><small>${new Date(p.creado).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })} · ${pesos(p.totales.total)}</small></button>
      <span class="etiqueta ${p.estado === 'entregado' ? 'verde' : ''}">${N.NOMBRE_ESTADO[p.estado]}</span><button class="redondo chico" type="button" data-ticket="${p.id}" aria-label="Ver ticket ${esc(p.codigo)}">${svg('ticket')}</button></div></li>`).join('')
      : '<li class="mini pad">Aún no tiene pedidos.</li>';
    $('#b-instalar-perfil').hidden = false;
    pintarPerfilAvisos();
  }

  // ------------------------------------------------------------ eventos
  function enganchar() {
    // entrada
    $('#b-google').addEventListener('click', () => {
      if (C.google.clientId && window.google && window.google.accounts) { window.google.accounts.id.prompt(); return; }
      pestana('registro'); ir('cuenta'); setTimeout(() => $('#rg-correo').focus(), 400);
      U.aviso('Escriba su correo de Gmail y cree una clave para entrar también sin señal.', 4500);
    });
    $('#b-ir-registro').addEventListener('click', () => { pestana('registro'); ir('cuenta'); });
    $('#b-ir-ingresar').addEventListener('click', () => { pestana('ingresar'); ir('cuenta'); });
    $('#b-ir-negocio').addEventListener('click', () => {
      $('#ng-ayuda').textContent = D.modo === 'demo' ? 'Modo demostración · administrador: admin@fogondelrio.co / FOGON-2026 · superadministrador: super@mesayruta.co / SUPER-2026 · clave de caja: 1234. Cámbielas antes de publicar.' : 'Si el administrador ya registró su correo, cree su clave con «Crear cuenta» usando ese mismo correo y luego entre aquí por «Admin».';
      ir('negocio-entrar');
    });
    $('#tab-registro').addEventListener('click', () => pestana('registro'));
    $('#tab-ingresar').addEventListener('click', () => pestana('ingresar'));
    $('#f-registro').addEventListener('submit', async e => {
      e.preventDefault(); const n = $('#rg-nota'); n.textContent = '';
      try { trasEntrar(await D.registrar({ nombre: $('#rg-nombre').value, celular: $('#rg-celular').value.replace(/\D/g, ''), correo: $('#rg-correo').value, clave: $('#rg-clave').value, direccion: $('#rg-direccion').value, google: !!E.google, foto: E.google ? E.google.foto : '' })); }
      catch (er) { n.textContent = er.message; }
    });
    $('#f-ingresar').addEventListener('submit', async e => {
      e.preventDefault(); const n = $('#in-nota'); n.textContent = '';
      try { trasEntrar(await D.ingresar($('#in-usuario').value, $('#in-clave').value)); } catch (er) { n.textContent = er.message; }
    });
    $('#f-negocio').addEventListener('submit', async e => {
      e.preventDefault(); const n = $('#ng-nota'); n.textContent = '';
      try {
        const s = await D.ingresar($('#ng-correo').value, $('#ng-clave').value);
        if (s.rol === 'cliente') { D.salir(); n.textContent = 'Esa cuenta es de cliente. Si trabaja en el negocio, pida al administrador que le asigne un rol.'; return; }
        ir('negocio', { raiz: true });
      } catch (er) { n.textContent = er.message; }
    });
    // inicio
    $('#b-perfil').addEventListener('click', () => ir('perfil'));
    $('#b-ver-menu').addEventListener('click', () => { irACategoria(E.cat); ir('menu'); });
    $('#b-todo-menu').addEventListener('click', () => { irACategoria('fogon'); ir('menu'); });
    $('#b-ir-reservas').addEventListener('click', () => ir('reservas'));
    $('#b-mis-pedidos').addEventListener('click', () => ir('perfil'));
    $('#b-bolsa-inicio').addEventListener('click', () => { if (!E.carrito.length) { U.aviso('Aún no ha agregado platos.'); return; } ir('resumen'); });
    document.addEventListener('click', e => {
      const prod = e.target.closest('[data-ir-prod]'); if (prod) { const p = N.obtener('menu', prod.dataset.irProd); if (p) { irACategoria(p.cat, p.id); if (actual() !== 'menu') ir('menu'); } return; }
      const cat = e.target.closest('[data-ir-cat]'); if (cat) { irACategoria(cat.dataset.irCat); ir('menu'); return; }
      const an = e.target.closest('[data-anuncio]'); if (an) { const a = N.obtener('publicidad', an.dataset.anuncio); if (!a) return; if (a.accion === 'reservas') ir('reservas'); else if (a.producto) { const p = N.obtener('menu', a.producto); if (p) { irACategoria(p.cat, p.id); ir('menu'); } } return; }
      const vp = e.target.closest('[data-ver-pedido]'); if (vp) { E.pedidoId = vp.dataset.verPedido; U.ls.set('myr2_pedido', E.pedidoId); ir('pedido'); return; }
      const tk = e.target.closest('[data-ticket]'); if (tk) { E.borrador = null; E.ticketDe = tk.dataset.ticket; ir('ticket'); return; }
    });
    // menú
    $('#b-menu-atras').addEventListener('click', atras);
    $('#b-ant').addEventListener('click', () => mover(-1));
    $('#b-sig').addEventListener('click', () => mover(1));
    $('#cats-menu').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b && b.dataset.cat !== E.cat) { irACategoria(b.dataset.cat); U.vibrar(8); } });
    $('#puntos').addEventListener('click', e => { const b = e.target.closest('[data-punto]'); if (!b) return; const k = +b.dataset.punto; if (k !== E.i) { const dir = k > E.i ? 1 : -1; E.i = k; E.arma = nuevaArma(); pintarPlato(dir); } });
    $('#b-agregar').addEventListener('click', () => { if (esPlatoFuerte(plato())) abrirEtapa('receta'); else agregarDirecto(); });
    $('#b-receta').addEventListener('click', () => abrirEtapa('receta'));
    $('#b-hoja').addEventListener('click', siguienteEtapa);
    $('#b-bolsa').addEventListener('click', () => { if (!E.carrito.length) { U.aviso('Aún no ha agregado platos.'); return; } ir('resumen'); });
    $('#b-chip-modo').addEventListener('click', abrirModo);
    $('#cant-plato').addEventListener('click', e => { const b = e.target.closest('[data-cp]'); if (!b) return; E.arma.cant = Math.max(1, Math.min(20, E.arma.cant + +b.dataset.cp)); $('#cp-n').textContent = E.arma.cant; U.vibrar(8); if (ANIMAR) $('#cp-n').animate([{ transform: 'scale(1.4)' }, { transform: 'none' }], { duration: 250 }); });
    $('#hoja-lista').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ingr) { const id = b.dataset.ingr; E.arma.quitados.has(id) ? E.arma.quitados.delete(id) : E.arma.quitados.add(id); }
      if (b.dataset.salsa) { const id = b.dataset.salsa; E.arma.salsas.has(id) ? E.arma.salsas.delete(id) : E.arma.salsas.add(id); }
      if (b.dataset.beb) { const id = b.dataset.beb, c = Math.max(0, Math.min(9, (E.arma.bebidas.get(id) || 0) + +b.dataset.d)); c ? E.arma.bebidas.set(id, c) : E.arma.bebidas.delete(id); }
      U.vibrar(8); refrescarEtapa();
    });
    document.addEventListener('keydown', e => {
      if (actual() !== 'menu' || e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') mover(1); if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowUp' && E.etapa === 'carrusel' && esPlatoFuerte(plato())) abrirEtapa('receta');
      if (e.key === 'Escape' && E.etapa !== 'carrusel') etapaAnterior();
    });
    // modo
    $('#b-md-ubicar').addEventListener('click', decidirPorUbicacion);
    $('#b-md-cerrar').addEventListener('click', cerrarModo);
    $('#velo-modo').addEventListener('click', e => { if (e.target.id === 'velo-modo') cerrarModo(); });
    $$('.opcModo button').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.elegir; elegirModo(t); $$('.opcModo button').forEach(x => x.classList.toggle('sugerido', x === b));
      if (t === 'local') { $('#md-mesa-caja').hidden = false; $('#md-mesa').focus(); return; }
      cerrarModo(); if (t === 'domicilio' && !E.modo.lat) ir('mapa');
    }));
    $('#md-mesa').addEventListener('input', () => { if (E.modo && E.modo.tipo === 'local') { E.modo.mesa = $('#md-mesa').value.replace(/\D/g, '').slice(0, 3); guardarModo(); } });
    // resumen
    $('#res-modos').addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (!b) return; elegirModo(b.dataset.modo); pintarChip(); pintarResumen(); if (b.dataset.modo === 'domicilio' && !E.modo.lat) ir('mapa'); });
    $('#res-destino').addEventListener('click', e => { if (e.target.closest('#b-res-ruta')) ir('mapa'); if (e.target.closest('#b-res-ubicar') || e.target.closest('#b-res-mesa')) abrirModo(); });
    $('#res-items').addEventListener('click', e => {
      const b = e.target.closest('[data-item]'); if (!b) return; const k = +b.dataset.item, it = E.carrito[k];
      it.cant += +b.dataset.d; if (it.cant <= 0) E.carrito.splice(k, 1); U.vibrar(10);
      guardarCarrito(); pintarInsignia(); pintarResumen();
    });
    $('#res-pagos').addEventListener('click', e => {
      const b = e.target.closest('[data-pago]'); if (!b) return;
      if (b.getAttribute('aria-disabled') === 'true') { U.aviso(b.dataset.pago === 'tarjeta' ? tarjetaDisponible().txt : 'Esta forma de pago no está activa.'); return; }
      E.pago.tipo = b.dataset.pago; U.vibrar(8); pintarPagos();
    });
    $('#res-pago-detalle').addEventListener('input', e => {
      if (e.target.id !== 'pg-con') return; E.pago.conCuanto = e.target.value;
      const cc = Number(e.target.value.replace(/\D/g, '')) || 0, t = totales().total;
      $('#pg-cambio').innerHTML = cc ? (cc >= t ? 'Cambio: <b>' + pesos(cc - t) + '</b>' : 'Le faltan ' + pesos(t - cc)) : 'Opcional: así le llevamos el cambio.';
    });
    $('#res-pago-detalle').addEventListener('click', async e => { const b = e.target.closest('[data-copiar]'); if (!b) return; try { await navigator.clipboard.writeText(b.dataset.copiar); U.aviso('Copiado.'); } catch (er) { U.aviso('No se pudo copiar.'); } });
    $('#res-nota').addEventListener('input', e => { E.nota = e.target.value; });
    const otro = () => volverA('menu');
    $('#b-otro').addEventListener('click', otro); $('#b-otro2').addEventListener('click', otro);
    $('#b-pedir').addEventListener('click', verTicket);
    // ticket
    $('#b-tk-descargar').addEventListener('click', async () => { const p = E.borrador || N.obtener('pedidos', E.ticketDe); if (p) await window.TICKET.descargar(p, { borrador: !!E.borrador }); });
    $('#b-tk-compartir').addEventListener('click', async () => { const p = E.borrador || N.obtener('pedidos', E.ticketDe); if (p) try { await window.TICKET.compartir(p, { borrador: !!E.borrador }); } catch (e) { /* cancelado */ } });
    $('#b-tk-enviar').addEventListener('click', enviarPedido);
    // mapa
    $('#f-direccion').addEventListener('submit', e => { e.preventDefault(); buscarDireccion($('#mp-direccion').value.trim()); });
    $('#b-mi-ubicacion').addEventListener('click', async () => { try { const u = await ubicar(); await moverDestino(u.lat, u.lng); E.borradorDir.direccion = 'Mi ubicación actual'; E.borradorDir.fuente = 'gps'; direccionInversa(E.borradorDir); } catch (er) { U.aviso(er.message, 4500); } });
    $('#b-confirmar-dir').addEventListener('click', confirmarDireccion);
    // pedido y chat
    $('#b-pedido-atras').addEventListener('click', () => volverA('inicio'));
    $('#b-pedido-chat').addEventListener('click', () => ir('chat'));
    $('#b-pd-chat').addEventListener('click', () => ir('chat'));
    $('#b-pd-ticket').addEventListener('click', () => { E.borrador = null; E.ticketDe = E.pedidoId; ir('ticket'); });
    $('#b-pd-wa').addEventListener('click', e => { if (!e.currentTarget.getAttribute('href')) { e.preventDefault(); U.aviso('El negocio aún no registra su WhatsApp. Use el chat.'); } });
    $('#b-chat-wa').addEventListener('click', e => { if (!e.currentTarget.getAttribute('href')) { e.preventDefault(); U.aviso('El negocio aún no registra su WhatsApp.'); } });
    $('#f-chat').addEventListener('submit', e => { e.preventDefault(); enviarChat($('#ch-txt').value); });
    $('#ch-rapidas').addEventListener('click', e => { const b = e.target.closest('[data-rapido]'); if (b) enviarChat(b.dataset.rapido); });
    // reservas
    $('#rv-ocasiones').addEventListener('click', e => { const b = e.target.closest('[data-ocasion]'); if (!b || b.dataset.ocasion === E.rv.ocasion) return; const ocs = N.ocasiones(); const d = ocs.findIndex(o => o.id === b.dataset.ocasion) > ocs.findIndex(o => o.id === E.rv.ocasion) ? 1 : -1; E.rv.ocasion = b.dataset.ocasion; pintarOcasion(d); });
    $('#rv-ant').addEventListener('click', () => moverOcasion(-1));
    $('#rv-sig').addEventListener('click', () => moverOcasion(1));
    (() => { const z = $('#rv-escena'); let x0 = null, y0 = 0; const capa = () => z.querySelector('#rv-plato .platoCapa:last-child');
      z.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
      z.addEventListener('pointermove', e => { if (x0 === null || !ANIMAR) return; const dx = e.clientX - x0; if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - y0)) { const c = capa(); if (c) c.style.transform = `translateX(${dx * .35}px) rotate(${dx * .25}deg)`; } });
      const fin = e => { if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; const c = capa(); if (c) c.style.transform = ''; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) moverOcasion(dx < 0 ? 1 : -1); };
      z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', () => { x0 = null; const c = capa(); if (c) c.style.transform = ''; }); })();
    $('#rv-dias').addEventListener('click', e => { const b = e.target.closest('[data-dia]'); if (b) { E.rv.dia = b.dataset.dia; pintarFechas(); } });
    $('#rv-horas').addEventListener('click', e => { const b = e.target.closest('[data-hora]'); if (b && !b.disabled) { E.rv.hora = b.dataset.hora; U.vibrar(8); pintarFechas(); } });
    $('#rv-menos').addEventListener('click', () => { E.rv.n = Math.max(1, E.rv.n - 1); pintarFechas(); });
    $('#rv-mas').addEventListener('click', () => { E.rv.n = Math.min(C.reservas.maxPersonas, E.rv.n + 1); pintarFechas(); });
    $('#b-reservar').addEventListener('click', reservar);
    const verMias = (tab = 'prox') => { E.mrTab = tab; ir('mis-reservas'); };
    $('#b-rv-mias').addEventListener('click', () => verMias());
    $('#b-rv-mias2').addEventListener('click', () => verMias());
    $('#b-rok-inicio').addEventListener('click', () => ir('inicio', { raiz: true }));
    $('#b-rok-mias').addEventListener('click', () => { E.mrTab = 'prox'; ir('mis-reservas', { reemplazar: true }); });
    $('#mr-tab-prox').addEventListener('click', () => { E.mrTab = 'prox'; pintarMisReservas(); });
    $('#mr-tab-ant').addEventListener('click', () => { E.mrTab = 'ant'; pintarMisReservas(); });
    $('#b-mr-inicio').addEventListener('click', () => ir('inicio', { raiz: true }));
    $('#b-mr-nueva').addEventListener('click', () => volverA('reservas'));
    $('#b-pf-reservas').addEventListener('click', () => verMias());
    $('#b-pf-avisos').addEventListener('click', () => pedirPermisoAvisos(true));
    document.addEventListener('click', e => { if (e.target.closest('#b-in-reserva')) verMias(); });
    // pedido y seguimiento
    $('#b-pd-inicio').addEventListener('click', () => ir('inicio', { raiz: true }));
    $('#b-pd-seguir').addEventListener('click', () => ir('seguir'));
    $('#mapa-pedido').addEventListener('click', () => { const p = pedidoActual(); if (p && p.modo === 'domicilio' && !p.destino.sinMapa) ir('seguir'); });
    $('#b-sg-inicio').addEventListener('click', () => ir('inicio', { raiz: true }));
    $('#b-sg-chat').addEventListener('click', () => ir('chat'));
    $('#b-sg-centrar').addEventListener('click', () => { const r = mapas['mapa-seguir']; if (r && r.moto) r.mp.setView(r.moto.getLatLng(), 17); });
    // dirección sin mapa
    $('#b-dir-manual').addEventListener('click', () => { const d = $('#dir-manual'); d.hidden = !d.hidden; if (!d.hidden) $('#mp-direccion').focus(); });
    $('#b-dir-sin-mapa').addEventListener('click', direccionSinMapa);
    // perfil
    $('#b-ver-tutorial').addEventListener('click', () => verVideo('cliente'));
    $('#b-instalar-perfil').addEventListener('click', () => ofrecerInstalar(true));
    $('#b-pf-admin').addEventListener('click', () => { D.salir(); ir('entrada', { raiz: true }); setTimeout(() => $('#b-ir-negocio').click(), ANIMAR ? 350 : 0); });
    $('#b-salir').addEventListener('click', () => { D.salir(); U.aviso('Sesión cerrada.'); ir('entrada', { raiz: true }); });
    $('#b-borrar-cuenta').addEventListener('click', async () => {
      if (!confirm('¿Borrar su cuenta, sus pedidos, reservas y chats? No se puede deshacer.')) return;
      await D.borrarCuenta(); E.carrito = []; guardarCarrito(); E.pedidoId = null; U.ls.del('myr2_pedido'); U.aviso('Datos borrados.'); ir('entrada', { raiz: true });
    });
  }

  // ------------------------------------------------------------ arranque
  function leerQR() {
    const q = new URLSearchParams(location.search); const mesa = (q.get('mesa') || '').replace(/\D/g, '').slice(0, 3);
    if (mesa) { E.modo = { tipo: 'local', mesa, fuente: 'qr' }; guardarModo(); history.replaceState({ i: 0 }, '', location.pathname); }
    return mesa || null;
  }
  async function iniciar() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !U.robot && !U.tutorial) navigator.serviceWorker.register('sw.js').catch(() => {});
    await N.iniciar();
    const mesa = leerQR();
    enganchar(); gestos(); pintarCats(); pintarPlato(0); pintarEntrada();
    await apertura();
    if (!U.tutorial) ofrecerInstalar();      // la hoja se abre encima de la app, sin detenerla
    const s = N.sesion();
    if (s && s.rol !== 'cliente') ir('negocio', { raiz: true });
    else if (s) {
      ir('inicio', { raiz: true });
      const info = window.INSTALAR.info();
      if (info.standalone && !U.tutorial && !U.ls.get('myr2_video_cliente', false)) await verVideo('cliente');
      const atajo = new URLSearchParams(location.search).get('ir');      // accesos directos del ícono instalado
      if (mesa) { U.aviso(`Mesa ${mesa}: su pedido llega a la mesa, sin domicilio.`, 4500); irACategoria('fogon'); ir('menu'); }
      else if (atajo === 'menu') { irACategoria('fogon'); ir('menu'); }
      else if (atajo === 'reservas') ir('reservas');
      if (atajo) history.replaceState({ i: E.pila.length - 1 }, '', location.pathname);
    } else {
      ir('entrada', { raiz: true });
      if (mesa) U.aviso(`Mesa ${mesa}: cree su cuenta en un minuto y pida desde la mesa.`, 4500);
    }
    revisarCambios(); revisarReservas();
    if (U.tutorial) { window.MYR.listo = true; return; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  window.MYR = { E, totales, tarifa, ir, actual, verVideo, confeti, anunciarCambio, pintarInicio, mover, irACategoria, mapas, pedirPermisoAvisos, ofrecerInstalar };
})();
