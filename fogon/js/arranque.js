/* ============================================================
   MESA Y RUTA · arranque seguro
   1) ?reparar en la dirección borra lo guardado en ESTE teléfono
      (datos locales, copia sin señal y versión guardada de la app)
      y vuelve a abrir la app limpia. No toca la nube (Supabase).
   2) Si la apertura tarda demasiado o algo falla al arrancar, ofrece
      «Reintentar» o «Reparar» en vez de quedarse pensando.
   ============================================================ */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  if (q.has('reparar')) {
    document.documentElement.style.background = '#1E1A17';
    const fin = () => location.replace(location.pathname);
    (async () => {
      try { Object.keys(localStorage).filter(k => /^(myr|T_)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* sin acceso */ }
      try { sessionStorage.clear(); } catch (e) { /* sin acceso */ }
      try { await new Promise(r => { const d = indexedDB.deleteDatabase('mesa-y-ruta'); d.onsuccess = d.onerror = d.onblocked = r; setTimeout(r, 2500); }); } catch (e) { /* sin IDB */ }
      try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* sin caché */ }
      try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* sin SW */ }
      fin();
    })();
    setTimeout(fin, 6000);
    window.MYR_REPARANDO = true;
    return;
  }
  let avisado = false;
  function ofrecer(motivo) {
    if (avisado) return;
    const ap = document.getElementById('apertura'); if (!ap) return;
    avisado = true;
    const caja = document.createElement('div'); caja.className = 'apAyuda';
    caja.innerHTML = `<p>${motivo}</p><div><button type="button" class="btn claro" id="ap-reintentar">Reintentar</button><button type="button" class="btn oro" id="ap-reparar">Reparar la app</button></div>
      <small>«Reparar» borra solo lo guardado en este teléfono (sesión y copia sin señal). Sus pedidos en la nube no se pierden.</small>`;
    ap.append(caja);
    caja.querySelector('#ap-reintentar').onclick = () => location.reload();
    caja.querySelector('#ap-reparar').onclick = () => location.replace(location.pathname + '?reparar');
  }
  setTimeout(() => ofrecer('La app está tardando más de lo normal en abrir.'), 12000);
  window.addEventListener('error', () => setTimeout(() => ofrecer('Algo falló al abrir la app.'), 2500));
  window.addEventListener('unhandledrejection', () => setTimeout(() => ofrecer('Algo falló al abrir la app.'), 4000));
  window.MYR_ARRANQUE = { ofrecer };
})();
