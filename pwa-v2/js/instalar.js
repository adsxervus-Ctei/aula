/* ============================================================
   MESA Y RUTA · detectar el teléfono y recomendar la instalación
   · Android (Chrome, Edge, Samsung Internet): botón «Instalar» directo
     cuando el navegador lo permite (evento beforeinstallprompt).
   · iPhone/iPad: Safari (y Chrome desde iOS 16.4) instalan con
     Compartir → «Agregar a inicio»: se muestran esos pasos.
   · Navegadores dentro de otras apps (Facebook, Instagram, TikTok):
     no pueden instalar; se ofrece abrir en Chrome o Safari.
   · Si no se puede instalar, la app sigue normal en el navegador.
   ============================================================ */
(function () {
  'use strict';
  let evento = null, instalada = false;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); evento = e; document.dispatchEvent(new CustomEvent('myr:instalable')); });
  window.addEventListener('appinstalled', () => { instalada = true; evento = null; document.dispatchEvent(new CustomEvent('myr:instalada')); });

  const ua = navigator.userAgent;
  function info() {
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const enApp = /FBAN|FBAV|Instagram|TikTok|Line\/|Snapchat|Twitter/i.test(ua);
    let nav = 'otro';
    if (enApp) nav = /Instagram/i.test(ua) ? 'Instagram' : /TikTok/i.test(ua) ? 'TikTok' : 'Facebook';
    else if (/SamsungBrowser/i.test(ua)) nav = 'Samsung Internet';
    else if (/EdgA|Edg\//i.test(ua)) nav = 'Edge';
    else if (/OPR|Opera/i.test(ua)) nav = 'Opera';
    else if (/FxiOS|Firefox/i.test(ua)) nav = 'Firefox';
    else if (/CriOS|Chrome/i.test(ua)) nav = 'Chrome';
    else if (/Safari/i.test(ua)) nav = 'Safari';
    const verIOS = (ua.match(/OS (\d+)_(\d+)/) || [])[1];
    const verAndroid = (ua.match(/Android (\d+(\.\d+)?)/) || [])[1];
    let modelo = '';
    if (android) { const m = ua.match(/Android [\d.]+; ([^;)]+)[;)]/); if (m && !/^(K|wv)$/.test(m[1].trim())) modelo = m[1].trim(); }
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const movil = ios || android || /Mobi/i.test(ua);
    return { ios, android, enApp, nav, verIOS, verAndroid, modelo, standalone, movil, so: ios ? 'iOS' : android ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Linux' };
  }
  async function modeloDetallado() {
    const i = info();
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const h = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion']);
        if (h.model) i.modelo = h.model;
        if (h.platformVersion && i.android) i.verAndroid = h.platformVersion.split('.')[0];
      }
    } catch (e) { /* sin datos de alta entropía */ }
    return i;
  }
  function nombreEquipo(i) {
    if (i.ios) return `${/iPad/.test(ua) ? 'iPad' : 'iPhone'}${i.verIOS ? ' con iOS ' + i.verIOS : ''}`;
    if (i.android) return `${i.modelo ? 'teléfono ' + i.modelo : 'teléfono Android'}${i.verAndroid ? ' con Android ' + i.verAndroid : ''}`;
    return `computador con ${i.so}`;
  }
  // ¿Qué se puede hacer en este equipo?
  function opcion(i) {
    if (i.standalone || instalada) return { tipo: 'ya' };
    if (i.enApp) return { tipo: 'abrir', texto: i.ios ? 'Toque ··· o el ícono de compartir y escoja «Abrir en Safari». Desde Safari se instala.' : 'Ábrala en Chrome para poder instalarla.' };
    if (evento) return { tipo: 'directo' };
    if (i.ios && (i.nav === 'Safari' || (i.nav === 'Chrome' && +i.verIOS >= 16) || +i.verIOS >= 17))
      return { tipo: 'pasos', pasos: ['Toque el botón Compartir (el cuadrado con la flecha hacia arriba).', 'Baje y toque «Agregar a inicio».', 'Toque «Agregar»: el ícono queda en su pantalla de inicio.'] };
    if (i.android && i.nav === 'Firefox') return { tipo: 'pasos', pasos: ['Toque el menú ⋮ (arriba o abajo a la derecha).', 'Toque «Instalar» o «Agregar a la pantalla de inicio».'] };
    if (i.android && i.nav === 'Samsung Internet') return { tipo: 'pasos', pasos: ['Toque el menú ☰ abajo a la derecha.', 'Toque «Agregar página a» → «Pantalla de inicio».'] };
    if (i.android && (i.nav === 'Chrome' || i.nav === 'Edge')) return { tipo: 'pasos', pasos: ['Toque el menú ⋮ arriba a la derecha.', 'Toque «Instalar aplicación» o «Agregar a la pantalla principal».'] };
    return { tipo: 'no' };
  }
  async function instalarDirecto() {
    if (!evento) return 'no';
    evento.prompt(); const r = await evento.userChoice; evento = null;
    return r && r.outcome === 'accepted' ? 'aceptada' : 'rechazada';
  }
  const abrirEnChrome = () => `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
  window.INSTALAR = { info, modeloDetallado, nombreEquipo, opcion, instalarDirecto, abrirEnChrome, get disponible() { return !!evento; } };
})();
