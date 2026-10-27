/* ============================================================
   MESA Y RUTA · carné del personal (imagen lista para imprimir)
   Tamaño tarjeta CR80 vertical (54 × 85,6 mm) a 300 ppp: 638 × 1012 px.
   El QR lleva a la verificación del carné en la app (¿es original y
   está activo?) y es el mismo que se escanea para marcar asistencia.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG, W = 638, H = 1012;
  const fuente = (peso, tam, fam = 'Poppins') => `${peso} ${tam}px ${fam === 'serif' ? '"Playfair Display", Georgia, serif' : 'Poppins, system-ui, sans-serif'}`;
  function base() { return location.href.replace(/[?#].*$/, '').replace(/index\.html$/, ''); }
  const urlVerificar = codigo => `${base()}?verificar=${encodeURIComponent(codigo)}`;
  function cargarImg(src) {
    return new Promise(res => { if (!src) return res(null); const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  }
  function redondo(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function texto(ctx, t, x, y, f, color, al = 'left', max) { ctx.font = f; ctx.fillStyle = color; ctx.textAlign = al; let s = String(t || ''); if (max) while (s.length > 3 && ctx.measureText(s).width > max) s = s.slice(0, -2) + '…'; ctx.fillText(s, x, y); }
  async function dibujar(p, { cargo, rolNombre, foto } = {}) {
    try { await document.fonts.load(fuente(700, 40, 'serif')); await document.fonts.load(fuente(600, 20)); } catch (e) { /* sin fuentes */ }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    // fondo carbón con textura de brasa
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2B2420'); g.addColorStop(1, '#141110'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .06; ctx.strokeStyle = '#F2A23A'; ctx.lineWidth = 2;
    for (let i = -H; i < W; i += 26) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // franja superior en curva
    const gg = ctx.createLinearGradient(0, 0, W, 280); gg.addColorStop(0, '#B8441C'); gg.addColorStop(.55, '#E2572B'); gg.addColorStop(1, '#F2A23A');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 230); ctx.quadraticCurveTo(W / 2, 330, 0, 230); ctx.closePath(); ctx.fill();
    // logo y negocio
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(80, 78, 40, 0, Math.PI * 2); ctx.fill();
    const logo = await cargarImg(window.N && window.N.logoURL ? window.N.logoURL() : '');
    if (logo) { ctx.save(); ctx.beginPath(); ctx.arc(80, 78, 38, 0, Math.PI * 2); ctx.clip(); const k = Math.min(60 / logo.width, 60 / logo.height); ctx.drawImage(logo, 80 - logo.width * k / 2, 78 - logo.height * k / 2, logo.width * k, logo.height * k); ctx.restore(); }
    ctx.fillStyle = logo ? 'transparent' : '#E2572B'; ctx.beginPath(); ctx.moveTo(80, 50); ctx.bezierCurveTo(88, 66, 104, 72, 104, 92); ctx.arcTo(104, 112, 80, 112, 24); ctx.arcTo(56, 112, 56, 92, 24); ctx.bezierCurveTo(56, 80, 64, 74, 70, 68); ctx.bezierCurveTo(72, 76, 76, 80, 80, 82); ctx.bezierCurveTo(76, 70, 76, 60, 80, 50); ctx.fill();
    texto(ctx, C.negocio.nombre, 138, 76, fuente(700, 38, 'serif'), '#fff', 'left', 470);
    texto(ctx, (C.negocio.municipio || '').toUpperCase(), 140, 108, fuente(600, 17), 'rgba(255,255,255,.88)', 'left', 470);
    texto(ctx, 'CARNÉ DE IDENTIFICACIÓN', W / 2, 172, fuente(600, 19), 'rgba(255,255,255,.92)', 'center');
    // foto
    const fx = W / 2 - 135, fy = 210, fw = 270, fh = 310;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; redondo(ctx, fx - 8, fy - 8, fw + 16, fh + 16, 34); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    const im = await cargarImg(foto);
    ctx.save(); redondo(ctx, fx, fy, fw, fh, 28); ctx.clip();
    if (im) { const k = Math.max(fw / im.width, fh / im.height), w = im.width * k, h = im.height * k; ctx.drawImage(im, fx + (fw - w) / 2, fy + (fh - h) / 2.6, w, h); }
    else { const ga = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh); ga.addColorStop(0, '#4A3B33'); ga.addColorStop(1, '#2B2420'); ctx.fillStyle = ga; ctx.fillRect(fx, fy, fw, fh); texto(ctx, (p.nombre || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(), W / 2, fy + fh / 2 + 40, fuente(700, 120, 'serif'), '#F2A23A', 'center'); }
    ctx.restore();
    // nombre y cargo
    texto(ctx, p.nombre, W / 2, 590, fuente(700, 42, 'serif'), '#fff', 'center', W - 60);
    const cg = (cargo || rolNombre || '').toUpperCase(); ctx.font = fuente(700, 21); const cw = Math.min(W - 80, ctx.measureText(cg).width + 50);
    redondo(ctx, W / 2 - cw / 2, 608, cw, 44, 22); ctx.fillStyle = '#E2572B'; ctx.fill();
    texto(ctx, cg, W / 2, 638, fuente(700, 21), '#fff', 'center', cw - 30);
    // datos
    const datos = [['Documento', p.documento || '—'], ['RH', p.rh || '—'], ['Código', p.carnet || '—'], ['Vence', p.carnet_vence ? new Date(p.carnet_vence + 'T12:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—']];
    datos.forEach(([n, v], k) => { const x = k % 2 ? W / 2 + 20 : 56, y = 700 + Math.floor(k / 2) * 58; texto(ctx, n.toUpperCase(), x, y, fuente(600, 14), '#C9A97A', 'left'); texto(ctx, v, x, y + 28, fuente(600, 22), '#fff', 'left', W / 2 - 80); });
    // QR de verificación y asistencia
    const q = window.qrcode(0, 'M'); q.addData(urlVerificar(p.carnet || '')); q.make();
    const n = q.getModuleCount(), lado = 150, cel = lado / n, qx = 50, qy = 832;
    redondo(ctx, qx - 12, qy - 12, lado + 24, lado + 24, 14); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#1E1A17'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(qx + c * cel, qy + r * cel, Math.ceil(cel), Math.ceil(cel));
    texto(ctx, 'Escanee para verificar', 236, 872, fuente(700, 20), '#fff', 'left');
    texto(ctx, 'que es original y para', 236, 900, fuente(400, 18), 'rgba(255,255,255,.8)', 'left');
    texto(ctx, 'marcar la asistencia.', 236, 926, fuente(400, 18), 'rgba(255,255,255,.8)', 'left');
    texto(ctx, 'Mesa y Ruta · Powered by AXERVUS CTeI', 236, 976, fuente(400, 13), 'rgba(255,255,255,.5)', 'left');
    return cv;
  }
  window.CARNET = { dibujar, urlVerificar, W, H };
})();
