/* ============================================================
   MESA Y RUTA · seguimiento del domicilio
   Dónde va la moto y cuánto le falta:
   · Con GPS: el domiciliario comparte su ubicación desde el panel
     (rol Domiciliario) y la moto se ubica sobre la ruta.
   · Sin GPS: se estima con el tiempo que lleva en camino y la
     duración calculada de la ruta.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG;
  const rad = x => x * Math.PI / 180;
  function km(a, b) {
    const dLa = rad(b[0] - a[0]), dLo = rad(b[1] - a[1]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLo / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  function puntos(p) {
    const d = p.destino || {};
    const pts = d.linea && d.linea.length > 1 ? d.linea : [[C.negocio.lat, C.negocio.lng], [d.lat, d.lng]];
    return pts.map(x => [+x[0], +x[1]]);
  }
  function acumulado(pts) { const a = [0]; for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + km(pts[i - 1], pts[i])); return a; }
  function rumbo(a, b) { const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0])), x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1])); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
  // punto a una fracción (0..1) del recorrido
  function enFraccion(pts, f) {
    const ac = acumulado(pts), total = ac[ac.length - 1] || 1e-9, objetivo = Math.max(0, Math.min(1, f)) * total;
    let i = 1; while (i < ac.length - 1 && ac[i] < objetivo) i++;
    const tramo = (ac[i] - ac[i - 1]) || 1e-9, k = Math.max(0, Math.min(1, (objetivo - ac[i - 1]) / tramo));
    const a = pts[i - 1], b = pts[i] || a;
    return { lat: a[0] + (b[0] - a[0]) * k, lng: a[1] + (b[1] - a[1]) * k, rumbo: rumbo(a, b), recorrido: pts.slice(0, i).concat([[a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]]) };
  }
  // fracción del recorrido más cercana a una posición GPS
  function proyectar(pts, lat, lng) {
    const ac = acumulado(pts), total = ac[ac.length - 1] || 1e-9; let mejor = { d: Infinity, f: 0 };
    const kx = Math.cos(rad(lat));
    for (let i = 1; i < pts.length; i++) {
      const [ay, ax] = pts[i - 1], [by, bx] = pts[i];
      const vx = (bx - ax) * kx, vy = by - ay, wx = (lng - ax) * kx, wy = lat - ay;
      const t = Math.max(0, Math.min(1, (vx * wx + vy * wy) / ((vx * vx + vy * vy) || 1e-12)));
      const d = km([lat, lng], [ay + vy * t, ax + (bx - ax) * t]);
      if (d < mejor.d) mejor = { d, f: (ac[i - 1] + (ac[i] - ac[i - 1]) * t) / total };
    }
    return mejor;
  }
  const NOMBRES = { recibido: 'Esperando confirmación', confirmado: 'Pedido confirmado', preparando: 'En la cocina', listo: 'Listo: sale ya la moto', en_camino: 'La moto va en camino', entregado: 'Entregado', cancelado: 'Cancelado' };
  function estado(p, ahora = Date.now()) {
    if (!p || p.modo !== 'domicilio' || !p.destino) return null;
    const pts = puntos(p), d = p.destino, durMin = Math.max(3, d.min || 10), kmTotal = d.km || acumulado(pts).slice(-1)[0];
    const base = { pts, kmTotal, durMin, texto: NOMBRES[p.estado] || '' };
    if (p.estado === 'entregado') return { ...base, frac: 1, pos: enFraccion(pts, 1), kmRest: 0, minRest: 0, fuente: 'fin' };
    if (p.estado !== 'en_camino') {
      const min = window.ASISTENTE ? window.ASISTENTE.minutosRestantes(p) : durMin;
      return { ...base, frac: 0, pos: enFraccion(pts, 0), kmRest: kmTotal, minRest: min, fuente: 'espera' };
    }
    const h = (p.historial || []).find(x => x.estado === 'en_camino'); const t0 = h ? new Date(h.at).getTime() : ahora;
    const r = p.repartidor;
    if (r && r.lat && r.at && ahora - new Date(r.at).getTime() < 4 * 60000) {
      const pr = proyectar(pts, r.lat, r.lng), f = Math.min(.99, pr.f);
      const vel = kmTotal / durMin;                        // km por minuto de la ruta calculada
      const kmRest = kmTotal * (1 - f);
      return { ...base, frac: f, pos: { ...enFraccion(pts, f), lat: pr.d < .15 ? enFraccion(pts, f).lat : r.lat, lng: pr.d < .15 ? enFraccion(pts, f).lng : r.lng }, kmRest, minRest: Math.max(1, Math.round(kmRest / Math.max(vel, .1))), fuente: 'gps', gpsHace: Math.round((ahora - new Date(r.at).getTime()) / 1000) };
    }
    const f = Math.max(.02, Math.min(.96, (ahora - t0) / (durMin * 60000)));
    return { ...base, frac: f, pos: enFraccion(pts, f), kmRest: kmTotal * (1 - f), minRest: Math.max(1, Math.round(durMin * (1 - f))), fuente: 'estimado' };
  }
  window.SEGUIMIENTO = { estado, puntos, enFraccion, proyectar, km };
})();
