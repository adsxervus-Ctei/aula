/* ============================================================
   MESA Y RUTA · tutorial del cliente (a pantalla completa)
   No es un video grabado: la app real corre dentro del reproductor
   (index.html?tutorial=1, con datos propios que no tocan los reales)
   y un guion la maneja paso a paso con un dedo animado, voz que
   explica cada paso, música de fondo y subtítulos. Así se ven las
   fotos reales del menú y ocupa toda la pantalla del celular.
   Controles: pausar, sonido, ver de nuevo, continuar y cerrar.
   ============================================================ */
(function () {
  'use strict';
  const U = window.N.U, BASE = 'audio/tutorial/';
  const svg = id => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const espera = ms => new Promise(r => setTimeout(r, ms));
  let guion = null, cargando = null; const audiosDe = {};
  const pasos = () => (T.tipo === 'negocio' ? guion.negocio : guion.pasos) || [];
  const T = { corrida: 0, pausado: false, sonido: true, voz: null, musica: null, raiz: null, frame: null, resolver: null, paso: 0, t0: 0 };

  // ---------- audio: se baja completo una vez (así queda guardado para verlo sin señal)
  async function cargarAudios() {
    if (audiosDe[T.tipo]) return audiosDe[T.tipo];
    if (cargando) return cargando;
    cargando = (async () => {
      guion = guion || await (await fetch(BASE + 'guion.json')).json();
      const blob = async f => { try { const r = await fetch(BASE + f); if (!r.ok) throw 0; return URL.createObjectURL(await r.blob()); } catch (e) { return null; } };
      const voces = await Promise.all(pasos().map(p => blob(p.id + '.mp3')));
      audiosDe[T.tipo] = { voces, musica: await blob(guion.musica.archivo) };
      return audiosDe[T.tipo];
    })();
    try { return await cargando; } finally { cargando = null; }
  }

  // ---------- control de la corrida (pausa y cancelación)
  class Cancelado extends Error {}
  function vigente(id) { if (id !== T.corrida) throw new Cancelado(); }
  async function dormir(ms, id) { let t = 0; while (t < ms) { await espera(50); vigente(id); if (!T.pausado) t += 50; } }
  async function esperarQue(fn, ms, id) { let t = 0; while (t < ms) { vigente(id); try { if (fn()) return true; } catch (e) { /* aún no */ } await espera(100); if (!T.pausado) t += 100; } return false; }

  // ---------- el dedo y los gestos dentro de la app
  const W = () => T.frame.contentWindow, Dc = () => T.frame.contentDocument;
  function dedo() {
    let d = Dc().getElementById('tu-dedo');
    if (!d) {
      d = Dc().createElement('div'); d.id = 'tu-dedo';
      Object.assign(d.style, { position: 'fixed', left: '50%', top: '60%', width: '46px', height: '46px', margin: '-23px 0 0 -23px', borderRadius: '50%', background: 'rgba(255,255,255,.72)', border: '3px solid rgba(226,87,43,.95)', boxShadow: '0 6px 18px rgba(0,0,0,.35)', zIndex: 2147483000, pointerEvents: 'none', transition: 'left .55s cubic-bezier(.22,.8,.25,1), top .55s cubic-bezier(.22,.8,.25,1), transform .15s, opacity .3s', opacity: '0' });
      Dc().body.append(d);
    }
    return d;
  }
  function moverDedo(x, y, rapido) { if (T.raiz) T.raiz.querySelector('.tuSub').classList.toggle('arriba', y > W().innerHeight * .55); const d = dedo(); if (rapido) d.style.transition = 'transform .15s, opacity .3s'; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.opacity = '1'; }
  function restaurarDedo() { const d = dedo(); d.style.transition = 'left .55s cubic-bezier(.22,.8,.25,1), top .55s cubic-bezier(.22,.8,.25,1), transform .15s, opacity .3s'; }
  function onda(x, y) {
    const o = Dc().createElement('div');
    Object.assign(o.style, { position: 'fixed', left: x - 30 + 'px', top: y - 30 + 'px', width: '60px', height: '60px', borderRadius: '50%', border: '3px solid rgba(226,87,43,.9)', zIndex: 2147482999, pointerEvents: 'none' });
    Dc().body.append(o);
    o.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 550, easing: 'ease-out' }).finished.then(() => o.remove());
    dedo().animate([{ transform: 'scale(1)' }, { transform: 'scale(.78)' }, { transform: 'scale(1)' }], { duration: 260 });
  }
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyleSafe(el).visibility !== 'hidden'; };
  function getComputedStyleSafe(el) { try { return W().getComputedStyle(el); } catch (e) { return {}; } }
  async function elemento(sel, id, ms = 4000) { let el = null; await esperarQue(() => { el = typeof sel === 'string' ? Dc().querySelector(sel) : sel(); return visible(el); }, ms, id); return el; }
  async function asegurarVisible(el, id) {
    let r = el.getBoundingClientRect(); const w = W().innerWidth;
    if (r.left < 0 || r.right > w) { el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); await dormir(550, id); r = el.getBoundingClientRect(); }
    const h = W().innerHeight;
    if (r.top < 70 || r.bottom > h - 110) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await dormir(650, id); }
  }
  async function tocar(sel, id, { pausa = 600, hacer = true } = {}) {
    const el = await elemento(sel, id); if (!el) return false;
    await asegurarVisible(el, id);
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    restaurarDedo(); moverDedo(x, y); await dormir(pausa, id);
    if (!hacer) return true;
    onda(x, y); await dormir(140, id); el.click(); await dormir(320, id);
    return true;
  }
  async function deslizar(sel, dx, id, pasos = 14) {
    const el = await elemento(sel, id); if (!el) return;
    const r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y = r.top + r.height / 2;
    restaurarDedo(); moverDedo(x0, y); await dormir(500, id);
    const P = (tipo, x) => el.dispatchEvent(new (W().PointerEvent)(tipo, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true }));
    P('pointerdown', x0); moverDedo(x0, y, true);
    for (let k = 1; k <= pasos; k++) { const x = x0 + dx * k / pasos; P('pointermove', x); moverDedo(x, y, true); await dormir(22, id); }
    P('pointerup', x0 + dx); await dormir(700, id); restaurarDedo();
  }
  async function desplazar(px, id) { W().scrollBy({ top: px, behavior: 'smooth' }); await dormir(700, id); }
  async function arrastrarMapa(dx, dy, id) {
    const reg = W().MYR.mapas.mapa; if (!reg || !reg.mp) return;
    const el = Dc().getElementById('mapa'), r = el.getBoundingClientRect();
    const x0 = r.left + r.width / 2 + 40, y0 = r.top + r.height * .32;
    restaurarDedo(); moverDedo(x0, y0); await dormir(500, id);
    moverDedo(x0, y0, true); const pasos = 16;
    for (let k = 1; k <= pasos; k++) { moverDedo(x0 + dx * k / pasos, y0 + dy * k / pasos, true); await dormir(30, id); }
    reg.mp.panBy([-dx, -dy], { animate: true, duration: .55 });
    await dormir(400, id); restaurarDedo();
  }
  const esVista = v => W().MYR && W().MYR.actual() === v;

  // ---------- guion: qué hace la app mientras la voz explica
  const ACCIONES = {
    async c01(id) { await dormir(1200, id); await tocar('#anuncios', id, { hacer: false, pausa: 900 }); },
    async c02(id) {
      await tocar('#b-ver-menu', id); await esperarQue(() => !Dc().getElementById('velo-modo').hidden, 2500, id); await dormir(700, id);
      await tocar('[data-elegir="domicilio"]', id); await esperarQue(() => esVista('mapa'), 3000, id);
    },
    async c03(id) {
      await dormir(900, id); await arrastrarMapa(-70, 90, id);
      await esperarQue(() => Dc().querySelector('#mp-datos b'), 9000, id); await dormir(900, id);
      await tocar('#b-confirmar-dir', id); await esperarQue(() => esVista('menu'), 3000, id);
    },
    async c04(id) {
      await dormir(600, id); await deslizar('#plato', -170, id); await deslizar('#plato', -170, id);
      await tocar('#cats-menu [data-cat="rapidas"]', id); await dormir(700, id);
      await deslizar('#plato', 0, id, 2); await dormir(1200, id);          // toque: el plato se corre y aparece el detalle
    },
    async c05(id) {
      await tocar(Dc().querySelector('#v-menu[data-detalle]') ? '#b-dt-agregar' : '#b-agregar', id); await dormir(500, id);
      await tocar('#hoja-lista [data-ingr]', id); await tocar('#cant-plato [data-cp="1"]', id);
    },
    async c06(id) { await tocar('#b-hoja', id); await dormir(300, id); await tocar('#hoja-lista li:nth-child(2) [data-salsa]', id); await tocar('#hoja-lista li:nth-child(3) [data-salsa]', id); },
    async c07(id) { await tocar('#b-hoja', id); await dormir(300, id); await tocar('#hoja-lista [data-beb][data-d="1"]', id); await tocar('#b-hoja', id); await esperarQue(() => esVista('resumen'), 3000, id); },
    async c08(id) { await dormir(700, id); await desplazar(260, id); await tocar('#res-items [data-d="1"]', id); },
    async c09(id) { await tocar('[data-pago="efectivo"]', id); await dormir(500, id); await tocar('#b-pedir', id); await esperarQue(() => esVista('ticket'), 3000, id); },
    async c10(id) { await dormir(900, id); await desplazar(380, id); await tocar('#b-tk-enviar', id); await esperarQue(() => esVista('inicio'), 6000, id); await esperarQue(() => !Dc().querySelector('.gracias'), 5000, id); },
    async c11(id) { await dormir(900, id); await tocar('.enCurso', id); await esperarQue(() => esVista('pedido'), 3000, id); await dormir(700, id); await desplazar(300, id); },
    async c12(id) { await desplazar(600, id); await tocar('#b-pd-chat', id, { hacer: false, pausa: 900 }); }
  };

  const enPanel = sec => async id => {
    const vis = sel => { const el = Dc().querySelector(sel); return el && visible(el) ? sel : null; };
    const directo = vis(`.ngNav [data-sec="${sec}"]`) || vis(`.ngBarra [data-sec="${sec}"]`);
    if (directo) await tocar(directo, id);
    else { await tocar('#ng-mas', id); await dormir(400, id); await tocar(`.ngMasGrid [data-sec="${sec}"]`, id); }
    await dormir(700, id);
  };
  const ACCIONES_NEGOCIO = {
    async n01(id) { await dormir(1500, id); await tocar('.ngMarca', id, { hacer: false, pausa: 1200 }); },
    async n02(id) { await dormir(600, id); await desplazar(420, id); await dormir(1200, id); await desplazar(-420, id); },
    async n03(id) { await enPanel('pedidos')(id); await tocar('.kTarj', id); await esperarQue(() => Dc().querySelector('#caj-ticket img'), 5000, id); await dormir(800, id); },
    async n04(id) {
      await tocar('#ng-cajon [data-estado="confirmado"]', id); await dormir(900, id);
      await tocar('#ng-cajon [data-estado="preparando"]', id); await dormir(900, id); await tocar('#caj-cerrar', id);
    },
    async n05(id) {
      await enPanel('caja')(id); await tocar('#cj-abrir', id); await dormir(500, id);
      for (const k of '1234') await tocar(`#pin-teclado [data-k="${k}"]`, id, { pausa: 280 });
      await tocar('#b-pin-ok', id); await dormir(1200, id);
    },
    async n06(id) { await enPanel('menu')(id); await tocar('[data-editar]', id); await dormir(1800, id); await tocar('#caj-cerrar', id); },
    async n07(id) { await enPanel('equipo')(id); await tocar('[data-carnet="tutorial-luis"]', id); await esperarQue(() => Dc().querySelector('#cn-img img'), 5000, id); await dormir(2200, id); },
    async n08(id) {
      await tocar('#caj-cerrar', id); await enPanel('asistencia')(id); await tocar('#as-escanear', id, { hacer: false, pausa: 900 });
      await W().NEGOCIO.simularEscaneo(); await dormir(2600, id);
    },
    async n09(id) { await enPanel('reportes')(id); await tocar('#rp-xlsx', id, { hacer: false, pausa: 1400 }); }
  };

  // ---------- reproductor
  function armar() {
    const r = document.createElement('div'); r.className = 'tuVelo'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); r.setAttribute('aria-label', 'Tutorial: así se pide');
    r.innerHTML = `<div class="tuCab"><span class="logoMini chico marca">${svg('llama')}</span><div><small>Tutorial · ${T.tipo === 'negocio' ? 'panel del negocio' : '1 minuto'}</small><b>${T.tipo === 'negocio' ? 'Así se maneja el negocio' : 'Así se pide en ' + U.esc(window.CONFIG.negocio.nombre)}</b></div>
        <button class="redondo" type="button" id="tu-sonido" aria-label="Quitar el sonido">${svg('volumen')}</button><button class="redondo" type="button" id="tu-cerrar" aria-label="Cerrar el tutorial">${svg('cerrar')}</button></div>
      <div class="tuEscena"><div class="tuMarco"><iframe class="tuApp" id="tu-app" title="Demostración de la app" tabindex="-1"></iframe>
        <div class="tuSub" aria-live="polite"><p id="tu-sub"></p></div>
        <div class="tuCargando" id="tu-cargando"><div class="apLogo marca">${svg('llama')}</div><b id="tu-cargando-txt">Preparando el tutorial…</b><small class="mini" style="color:rgba(255,255,255,.7)">Con voz y música. Suba el volumen.</small></div></div></div>
      <div class="tuPie"><div class="tuBarra"><i id="tu-barra"></i></div>
        <div class="tuBotones"><button class="redondo" type="button" id="tu-pausa" aria-label="Pausar">${svg('pausa')}</button><button class="btn claro" type="button" id="tu-repetir">${svg('repetir')} Ver de nuevo</button><button class="btn verde" type="button" id="tu-continuar">Continuar ${svg('adelante')}</button></div></div>`;
    r.classList.toggle('ancho', T.tipo === 'negocio');
    document.body.append(r); T.raiz = r; T.frame = r.querySelector('#tu-app');
    r.querySelector('#tu-cerrar').onclick = cerrar; r.querySelector('#tu-continuar').onclick = cerrar;
    r.querySelector('#tu-repetir').onclick = () => empezar(true);
    r.querySelector('#tu-pausa').onclick = () => pausar(!T.pausado);
    r.querySelector('#tu-sonido').onclick = () => { T.sonido = !T.sonido; [T.voz, T.musica].forEach(a => { if (a) a.muted = !T.sonido; }); r.querySelector('#tu-sonido').innerHTML = svg(T.sonido ? 'volumen' : 'silencio'); r.querySelector('#tu-sonido').setAttribute('aria-label', T.sonido ? 'Quitar el sonido' : 'Poner el sonido'); };
    r.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); if (e.key === ' ') { e.preventDefault(); pausar(!T.pausado); } });
    document.documentElement.style.overflow = 'hidden';
  }
  function pausar(si) {
    T.pausado = si; if (!T.raiz) return;
    const b = T.raiz.querySelector('#tu-pausa'); b.innerHTML = svg(si ? 'play' : 'pausa'); b.setAttribute('aria-label', si ? 'Seguir' : 'Pausar');
    [T.voz, T.musica].forEach(a => { if (!a) return; if (si) a.pause(); else if (a.dataset.sonando === '1') a.play().catch(() => {}); });
    if (si) ponerSub('<b>En pausa.</b> Toque ▶ para seguir.', true); else ponerSub(T.subActual || '');
  }
  function ponerSub(html, temporal) { if (!T.raiz) return; const p = T.raiz.querySelector('#tu-sub'); p.innerHTML = html; if (!temporal) T.subActual = html; }
  function barra() { if (!guion || !T.raiz) return; const total = pasos().reduce((a, p) => a + p.dur, 0); let hecho = pasos().slice(0, T.paso).reduce((a, p) => a + p.dur, 0); if (T.voz && pasos()[T.paso]) hecho += Math.min(pasos()[T.paso].dur, T.voz.currentTime || 0); T.raiz.querySelector('#tu-barra').style.width = Math.min(100, hecho / total * 100) + '%'; }

  async function prepararApp(id) {
    // datos limpios del tutorial: otra base local y otras llaves (prefijo T_)
    try { Object.keys(localStorage).filter(k => k.startsWith('T_')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* sin almacenamiento */ }
    await new Promise(r => { try { const q = indexedDB.deleteDatabase('mesa-y-ruta-tutorial'); q.onsuccess = q.onerror = q.onblocked = () => r(); } catch (e) { r(); } });
    vigente(id);
    T.frame.src = `index.html?tutorial=${T.tipo}&v=` + Date.now();
    const ok = await esperarQue(() => W().MYR && W().MYR.listo && (T.tipo === 'negocio' ? Dc().querySelector('.ngNav') : esVista('inicio')), 20000, id);
    if (!ok) throw new Error('La app del tutorial no cargó.');
    await dormir(400, id);
  }
  function sonar(a, src) {
    return new Promise(res => {
      if (!src) { setTimeout(res, 0); return; }
      a.src = src; a.muted = !T.sonido; a.dataset.sonando = '1';
      a.onended = () => { a.dataset.sonando = '0'; res(); }; a.onerror = () => { a.dataset.sonando = '0'; res(); };
      a.play().catch(() => { a.dataset.sonando = '0'; res(); });
    });
  }
  async function correr(id) {
    const lista = pasos();
    for (let i = 0; i < lista.length; i++) {
      vigente(id); T.paso = i; const p = lista[i];
      ponerSub(U.esc(p.texto).replace(/«([^»]+)»/g, '«<b>$1</b>»'));
      if (T.musica) T.musica.volume = .1;
      const accion = ((T.tipo === 'negocio' ? ACCIONES_NEGOCIO : ACCIONES)[p.id] || (async () => {}))(id).catch(e => { if (e instanceof Cancelado) throw e; console.warn('tutorial', p.id, e); });
      const voz = audiosDe[T.tipo].voces[i] ? sonar(T.voz, audiosDe[T.tipo].voces[i]) : dormir(p.dur * 1000, id);
      await Promise.all([accion, voz]);
      vigente(id); if (T.musica) T.musica.volume = .22;
      await dormir(450, id);
    }
    T.paso = lista.length; barra();
    ponerSub(T.tipo === 'negocio' ? '<b>¡Listo!</b> Ya conoce el panel. Toque «Continuar» para empezar.' : '<b>¡Listo!</b> Ya sabe pedir. Toque «Continuar» para empezar.');
    const d = Dc().getElementById('tu-dedo'); if (d) d.style.opacity = '0';
    if (T.musica) { for (let v = .22; v > 0; v -= .02) { T.musica.volume = Math.max(0, v); await espera(120); } T.musica.pause(); T.musica.dataset.sonando = '0'; }
  }
  async function empezar(reiniciar) {
    const id = ++T.corrida; T.pausado = false; T.subActual = '';
    const b = T.raiz.querySelector('#tu-pausa'); b.innerHTML = svg('pausa');
    [T.voz, T.musica].forEach(a => { if (a) { a.pause(); a.dataset.sonando = '0'; } });
    const car = T.raiz.querySelector('#tu-cargando'); car.hidden = false; car.querySelector('#tu-cargando-txt').textContent = reiniciar ? 'Empezando de nuevo…' : 'Preparando el tutorial…';
    ponerSub(''); T.paso = 0; barra();
    try {
      const [, a] = await Promise.all([prepararApp(id), cargarAudios()]); vigente(id);
      T.voz = T.voz || new Audio(); T.musica = T.musica || new Audio();
      T.musica.loop = true; T.musica.volume = .22;
      // ¿el navegador deja sonar? si no, un botón grande de reproducir (toque del usuario)
      let puede = true;
      if (a.musica) { T.musica.src = a.musica; T.musica.muted = !T.sonido; try { await T.musica.play(); T.musica.dataset.sonando = '1'; } catch (e) { puede = false; } }
      if (!puede) {
        car.innerHTML = `<button class="tuPlayGrande" type="button" id="tu-play" aria-label="Ver el tutorial">${svg('play')}</button><b>Toque para ver el tutorial</b><small class="mini" style="color:rgba(255,255,255,.7)">Con voz y música · 1 minuto</small>`;
        await new Promise(r => { car.querySelector('#tu-play').onclick = r; });
        vigente(id); try { await T.musica.play(); T.musica.dataset.sonando = '1'; } catch (e) { /* sin sonido */ }
      }
      car.hidden = true;
      const reloj = setInterval(barra, 250);
      try { await correr(id); } finally { clearInterval(reloj); }
    } catch (e) {
      if (e instanceof Cancelado) return;
      car.hidden = false; car.innerHTML = `<div class="apLogo">${svg('sinsenal')}</div><b>No se pudo cargar el tutorial</b><small class="mini" style="color:rgba(255,255,255,.75)">${U.esc(e.message || '')} Revise la conexión y toque «Ver de nuevo».</small>`;
    }
  }
  function cerrar() {
    T.corrida++;
    [T.voz, T.musica].forEach(a => { if (a) { a.pause(); a.removeAttribute('src'); a.dataset.sonando = '0'; } });
    if (T.raiz) { T.raiz.remove(); T.raiz = null; }
    document.documentElement.style.overflow = '';
    try { Object.keys(localStorage).filter(k => k.startsWith('T_')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* nada */ }
    const r = T.resolver; T.resolver = null; if (r) r();
  }
  function abrir(tipo = 'cliente') {
    if (T.raiz) return Promise.resolve();
    T.tipo = tipo === 'negocio' ? 'negocio' : 'cliente';
    armar();
    return new Promise(res => { T.resolver = res; empezar(false); });
  }
  window.TUTORIAL = { abrir, cerrar, get estado() { return { paso: T.paso, pausado: T.pausado, total: guion ? pasos().length : 0, corriendo: !!T.raiz }; } };
})();
