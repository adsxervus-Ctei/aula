/* Lainec v7 · ENTRADA A LA APP
   1. En el navegador: la ficha de instalación (estilo tienda de apps) sale de primero.
      Dice dónde va a quedar el ícono según el aparato (celular Android, iPhone, Windows, Mac).
   2. Si ya está instalada: "Ya tienes Lainec instalada" con el botón ABRIR APP.
   3. Al abrir la app: elegir el municipio (Hatillo, San Martín, Barranco), como Mercado Libre pide el país.
   4. Luego: ¿Cómo vas a usar Lainec? Cliente · Negocio · Domiciliario. De ahí en adelante todo sigue igual. */
(function () {
  'use strict';
  const LM = window.LM, E = LM.EXT;
  const { esc, ic, toast } = LM;

  /* ---------------- el aparato ---------------- */
  const ua = navigator.userAgent;
  const APARATO = /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'iphone' : /windows/i.test(ua) ? 'windows' : /macintosh/i.test(ua) && !('ontouchend' in document) ? 'mac' : /cros/i.test(ua) ? 'chromebook' : 'computador';
  LM.aparato = APARATO;
  const esCel = APARATO === 'android' || APARATO === 'iphone';
  const DONDE = {
    android: ['En la pantalla de inicio de tu celular', 'También queda en el cajón de aplicaciones, con las demás apps. Se abre en pantalla completa, sin la barra del navegador.'],
    iphone: ['En la pantalla de inicio de tu iPhone', 'En iPhone se instala desde Safari: Compartir → "Agregar a inicio". Te mostramos los pasos.'],
    windows: ['En el Escritorio y en el menú Inicio', 'Chrome o Edge crean el acceso directo. Puedes anclarla a la barra de tareas con clic derecho → Anclar.'],
    mac: ['En Aplicaciones y en el Launchpad', 'Chrome la guarda en la carpeta "Aplicaciones de Chrome". Arrástrala al Dock para tenerla a mano.'],
    chromebook: ['En el selector de aplicaciones', 'Queda con las demás apps del Chromebook y la puedes fijar en la barra.'],
    computador: ['En el menú de aplicaciones de tu computador', 'Chrome o Edge crean el acceso directo para abrirla en su propia ventana.']
  };
  const nombreAparato = { android: 'este celular', iphone: 'este iPhone', windows: 'este computador', mac: 'este Mac', chromebook: 'este Chromebook', computador: 'este computador' }[APARATO];

  // Mini dibujo del lugar donde queda el ícono (celular o computador)
  function mock(destacar) {
    if (esCel) return '<div class="home-mock" aria-hidden="true"><div class="hm-bar"><span class="num">' + LM.hora() + '</span><span>●●●</span></div><div class="hm-grid">' + Array.from({ length: 11 }, (_, i) => '<i style="--d:' + i * 40 + 'ms"></i>').join('') + '<span class="hm-new"><img src="icons/icon-192.png" alt=""><small>Lainec</small>' + (destacar ? '<em class="hm-ring"></em><em class="hm-arrow">' + ic('arrow') + '</em>' : '') + '</span></div><div class="hm-dock"><i></i><i></i><i></i><i></i></div></div>';
    return '<div class="lm-pc-mock ' + APARATO + '" aria-hidden="true"><div class="lm-pc-pantalla"><div class="lm-pc-iconos"><span><i></i><small>Papelera</small></span><span><i></i><small>Documentos</small></span><span class="nuevo"><img src="icons/icon-192.png" alt=""><small>Lainec</small>' + (destacar ? '<em class="hm-ring"></em>' : '') + '</span></div><div class="lm-pc-barra"><i class="inicio"></i><i></i><i></i><img src="icons/icon-192.png" alt=""></div></div><div class="lm-pc-base"></div></div>';
  }
  E.dondeQueda = () => '<section class="lm-donde-queda"><h3>¿Dónde va a quedar?</h3><div class="lm-dq">' + mock(false) + '<div><p><b>' + esc(DONDE[APARATO][0]) + '</b></p><p>' + esc(DONDE[APARATO][1]) + '</p><p class="muted">Detectamos que estás en ' + esc(nombreAparato) + '.</p></div></div></section>';

  /* ---------------- ¿ya está instalada? ---------------- */
  let instalada = false;
  try { instalada = localStorage.getItem('lm-instalada') === '1'; } catch (e) {}
  if (!instalada && navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(r => { if (r && r.length) instalada = true; }).catch(() => {});
  addEventListener('appinstalled', () => { instalada = true; try { localStorage.setItem('lm-instalada', '1'); } catch (e) {} });
  E.yaInstalada = () => instalada && !LM.enApp();
  const urlApp = () => new URL('./index.html?app=1#inicio', location.href).href;
  E.instaladaH = () => '<div class="st-sheet ok" role="dialog" aria-modal="true" aria-label="Lainec ya está instalada"><div class="st-scroll" style="text-align:center">' + mock(true) +
    '<h2>Ya tienes Lainec instalada</h2><p>Está ' + esc(DONDE[APARATO][0].toLowerCase()) + '. Ábrela desde ahí: carga al instante y gasta menos datos.</p>' +
    '<div class="st-acts" style="justify-content:center;flex-direction:column"><button class="btn b-fucsia b-lg" type="button" data-act="app-abrir-real">' + ic('arrow') + 'ABRIR APP</button><button class="btn b-lg" type="button" data-act="inst-x">Seguir en el navegador</button></div>' +
    '<p class="muted" style="font-size:14px">Si se abre otra pestaña del navegador en vez de la app, busca el ícono verde de Lainec, con la letra C ' + esc(DONDE[APARATO][0].toLowerCase()) + '.</p></div></div>';
  // El navegador no deja que una página abra la app instalada a la fuerza: se intenta y, si no,
  // se abre la versión de app en una pestaña (funciona igual) y se explica dónde está el ícono.
  LM.A['app-abrir-real'] = () => { const w = window.open(urlApp(), '_blank'); if (!w) location.href = urlApp(); else LM.ovlClose('instOv'); };
  E.instExitoH = real => '<div class="st-sheet ok" role="dialog" aria-modal="true" aria-label="App instalada"><div class="st-scroll" style="text-align:center">' + mock(true) +
    '<h2>¡Listo! Lainec quedó instalada</h2><p><b>' + esc(DONDE[APARATO][0]) + '.</b> ' + esc(DONDE[APARATO][1]) + '</p>' +
    (real ? '' : '<p class="muted" style="font-size:13px">Aquí es una demostración. En tu aparato, el navegador pone el ícono de verdad.</p>') +
    '<div class="st-acts" style="justify-content:center"><button class="btn b-fucsia b-lg" type="button" data-act="app-abrir">' + ic('arrow') + 'ABRIR APP</button></div></div></div>';
  E.abrirApp = () => { if (!instalada) return false; LM.A['app-abrir-real'](); return true; };

  /* ---------------- municipio (como el país en Mercado Libre) ---------------- */
  const MUNICIPIOS = [
    { id: 'hatillo', n: 'Hatillo de Loba', s: 'Cabecera, Chimí y veredas', zona: 'cabecera', c1: '#00A650', c2: '#FFE600', fig: '<path d="M12 22V13"/><path d="M12 14c-4 0-7-2.5-7-6 2.5-2 5-2 7 0 2-2 4.5-2 7 0 0 3.5-3 6-7 6z"/>' },
    { id: 'sanmartin', n: 'San Martín de Loba', s: 'Cabecera y corregimientos', zona: 'sanmartin', c1: '#3483FA', c2: '#FFFFFF', fig: '<path d="M12 3v4M10 5h4"/><path d="M7 21V11l5-4 5 4v10"/><path d="M10 21v-5h4v5"/>' },
    { id: 'barranco', n: 'Barranco de Loba', s: 'Cabecera y corregimientos', zona: 'barranco', c1: '#FF7733', c2: '#2D3277', fig: '<path d="M3 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/><path d="M3 21c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/><path d="M6 13l3-6 4 4 2-3 3 5"/>' }
  ];
  LM.MUNICIPIOS = MUNICIPIOS;
  // Logo provisional dibujado aquí; si existe img/municipios/<id>.png (el escudo oficial), se usa ese.
  const emblema = m => '<span class="lm-emb" style="--c1:' + m.c1 + ';--c2:' + m.c2 + '"><img src="img/municipios/' + m.id + '.png" alt="" onerror="this.remove()"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="var(--c1)"/><g fill="none" stroke="var(--c2)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(3.6 3.4) scale(.7)">' + m.fig + '</g></svg></span>';
  LM.emblemaMunicipio = id => emblema(MUNICIPIOS.find(m => m.id === id) || MUNICIPIOS[0]);
  E.municipioShow = () => {
    LM.ovl('lmMuni', '<div class="lm-muni" role="dialog" aria-modal="true" aria-labelledby="lmMuniT"><div class="lm-muni-in"><img src="icons/icon-192.png" alt="" width="72" height="72"><h1 id="lmMuniT">¡Hola! Elige tu municipio</h1><p>Así te mostramos primero los negocios y los domicilios de tu zona.</p>' +
      '<div class="lm-muni-lista">' + MUNICIPIOS.map(m => '<button type="button" class="lm-muni-it" data-act="lm-muni" data-m="' + m.id + '">' + emblema(m) + '<span><b>' + esc(m.n) + '</b><small>' + esc(m.s) + '</small></span>' + ic('chevr') + '</button>').join('') + '</div>' +
      '<p class="muted">Lo puedes cambiar después en "Enviar a".</p></div></div>', 'lm-muni-ovl');
  };
  LM.A['lm-muni'] = el => {
    const m = MUNICIPIOS.find(x => x.id === el.dataset.m), S = LM.S;
    S.municipio = m.id; S.zona = m.zona; LM.save();
    LM.ovlClose('lmMuni'); toast('Listo: ' + m.n);
    setTimeout(() => { if (!LM.gateCheck()) LM.rerender(); }, 120);
  };
  LM.A['lm-muni-cambiar'] = () => E.municipioShow();

  /* ---------------- ¿cómo vas a usar Lainec? ---------------- */
  E.elegirRolH = () => {
    const m = MUNICIPIOS.find(x => x.id === LM.S.municipio) || MUNICIPIOS[0];
    return '<div class="gate-in"><div class="gt-top"><img src="icons/icon-192.png" alt="" width="72" height="72"><h1>¿Cómo vas a usar Lainec?</h1><button type="button" class="lm-muni-chip" data-act="lm-muni-cambiar">' + emblema(m) + esc(m.n) + ' · cambiar</button></div>' +
      '<div class="lm-roles">' + [['cliente', 'user', 'Soy cliente', 'Compro, pido domicilios, me uno a una mesa'], ['negocio', 'tienda', 'Tengo un negocio', 'Vendo, manejo la caja, el inventario y los pedidos'], ['rep', 'moto', 'Soy domiciliario o mototaxista', 'Llevo domicilios y gano el 100 % del domicilio']]
        .map(r => '<button type="button" class="lm-rol" data-act="lm-rol" data-r="' + r[0] + '"><span class="lm-rol-ic">' + ic(r[1]) + '</span><span><b>' + r[2] + '</b><small>' + r[3] + '</small></span>' + ic('chevr') + '</button>').join('') + '</div><p class="gt-pw">Powered by AXERVUS CTeI</p></div>';
  };
  LM.A['lm-rol'] = el => {
    const r = el.dataset.r;
    if (r === 'rep') { LM.ovlClose('gate'); LM.go('rep'); return; }
    LM.setGateTab(r); LM.gateShow();
  };
  LM.A['g-elegir'] = () => { LM.setGateTab('elegir'); LM.gateShow(); };
  const _ge = E.gateExtra;
  E.gateExtra = () => '<button class="btn b-ghost lm-gate-rep" type="button" data-act="g-elegir">' + ic('chevl') + 'Volver: soy cliente, negocio o domiciliario</button>';

  /* ---------------- en el navegador, después de la ficha: el municipio ---------------- */
  const pruebas = () => { try { return !!localStorage.getItem('hm-pruebas'); } catch (e) { return false; } };
  E.trasCargar = () => { if (!LM.enApp() && !LM.S.municipio && !pruebas() && !document.getElementById('instOv')) E.municipioShow(); };
  const _x = LM.A['inst-x'];
  LM.A['inst-x'] = el => { _x(el); if (!LM.enApp() && !LM.S.municipio && !pruebas()) setTimeout(E.municipioShow, 280); };

  /* ---------------- la tienda muestra primero los negocios del municipio ---------------- */
  const MUN_NEG = { estanque: 'sanmartin', ropa: 'sanmartin', barberia: 'barranco' };
  LM.municipioDe = t => t.mun || MUN_NEG[t.id] || 'hatillo';
  LM.trasRender(r => {
    if (r !== 'inicio' || !LM.S.municipio) return;
    const cont = document.querySelector('.vendors'); if (!cont || cont.dataset.lmMun === LM.S.municipio) return;
    const vds = [...cont.querySelectorAll('.vd[data-h^="t-"]')];
    const mios = vds.filter(v => { const t = LM.T(v.dataset.h.slice(2)); return t && LM.municipioDe(t) === LM.S.municipio; });
    mios.reverse().forEach(v => { cont.prepend(v); v.classList.add('lm-local'); });
    cont.dataset.lmMun = LM.S.municipio;
  });
})();
