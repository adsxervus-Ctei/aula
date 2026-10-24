/* =========================================================================
   Aprende JAC · Chimí — Sincronización opcional (solo resultados seudónimos)
   Funciona sin librerías: llama directo a la API REST de Supabase.
   Si no hay configuración, no hace nada. Si no hay señal, espera y reintenta
   cuando vuelve la conexión o cuando se abre la app (iPhone no soporta
   sincronización en segundo plano, por eso no se usa Background Sync).
   ========================================================================= */
window.Sync = (function () {
  const cfg = window.CONFIG || {};
  const activo = () => Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  async function enviar(fila) {
    const url = cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/resultados";
    /* Clave nueva (sb_publishable_…): solo en "apikey".
       Clave antigua anon (JWT que empieza por eyJ): también en Authorization.
       Supabase anunció retirar las claves antiguas a finales de 2026. */
    const headers = {
      "apikey": cfg.supabaseAnonKey,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    };
    if (cfg.supabaseAnonKey.startsWith("eyJ")) headers["Authorization"] = "Bearer " + cfg.supabaseAnonKey;
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(fila) });
    if (!r.ok) throw new Error("HTTP " + r.status);
  }

  /* Recibe la lista de resultados guardados en el teléfono; envía los
     pendientes y devuelve cuántos se enviaron. Marca enviado=true en cada uno. */
  async function sincronizar(resultados) {
    if (!activo() || !navigator.onLine) return 0;
    let n = 0;
    for (const res of resultados) {
      if (res.enviado) continue;
      try {
        await enviar({
          id_local: res.id,
          codigo: res.codigo,
          junta: cfg.junta || "",
          puntaje_sus: res.puntaje,
          respuestas: res.respuestas,
          progreso: res.progreso,
          creado: res.fecha
        });
        res.enviado = true;
        n++;
      } catch (e) {
        /* 409 = ya existía (id_local único): se da por enviado */
        if (String(e.message).includes("409")) { res.enviado = true; continue; }
        break; // sin señal o error: se reintenta después
      }
    }
    return n;
  }

  return { activo, sincronizar };
})();
