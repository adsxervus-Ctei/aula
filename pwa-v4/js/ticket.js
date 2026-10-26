/* ============================================================
   MESA Y RUTA · ticket del pedido en imagen (PNG)
   Lo usan el cliente (vista previa, descarga, compartir) y el panel
   del negocio (soporte de cada venta). Siempre se dibuja a partir de
   los datos del pedido, así el ticket del cliente y el del negocio
   son idénticos.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG;
  const W = 1080, M = 72;
  const pesos = n => '$ ' + Math.round(n || 0).toLocaleString('es-CO');
  const MODOS = { local: 'Comer en el local', recoger: 'Recoger en el local', domicilio: 'Domicilio' };
  const PAGOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta (datáfono)' };

  function partir(ctx, texto, ancho) {
    const palabras = String(texto).split(/\s+/); const lineas = []; let l = '';
    for (const p of palabras) { const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > ancho && l) { lineas.push(l); l = p; } else l = t; }
    if (l) lineas.push(l); return lineas;
  }
  function llama(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    ctx.beginPath(); const p = new Path2D('M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.5 1 2.4 2 2.8C11 8.5 11 5.5 12 3z');
    ctx.fillStyle = '#fff'; ctx.fill(p); ctx.restore();
  }

  async function dibujar(p, opciones = {}) {
    try { await Promise.all(['400', '600', '700'].map(w => document.fonts.load(`${w} 30px Poppins`))); } catch (e) { /* tipografía del sistema */ }
    const F = (w, s) => `${w} ${s}px Poppins, system-ui, sans-serif`;
    // 1) medir alto: se dibuja en un lienzo de prueba
    const pasadas = async (ctx, medir) => {
      let y = 0; const linea = (t, font, color, x = M, alinear = 'left', alto) => { if (!medir) { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = alinear; ctx.fillText(t, x, y); } y += alto; };
      const separador = (punteado = true) => { if (!medir) { ctx.strokeStyle = '#D9CFC4'; ctx.lineWidth = 3; ctx.setLineDash(punteado ? [14, 12] : []); ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke(); ctx.setLineDash([]); } y += 40; };
      // cabecera
      y = 60;
      if (!medir) {
        const g = ctx.createLinearGradient(W / 2 - 60, y, W / 2 + 60, y + 120); g.addColorStop(0, '#E2572B'); g.addColorStop(1, '#F2A23A');
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(W / 2 - 60, y, 120, 120, 36); ctx.fill(); llama(ctx, W / 2 - 40, y + 20, 80);
      }
      y += 180;
      linea(C.negocio.nombre, F(700, 56), '#1E1A17', W / 2, 'center', 52);
      linea(C.negocio.lema, F(400, 28), '#6B6159', W / 2, 'center', 40);
      linea(`${C.negocio.direccion} · ${C.negocio.municipio}`, F(400, 26), '#6B6159', W / 2, 'center', 36);
      const extra = [C.negocio.nit ? 'NIT ' + C.negocio.nit : '', C.negocio.telefono || C.negocio.whatsapp ? 'Tel. ' + (C.negocio.telefono || C.negocio.whatsapp) : ''].filter(Boolean).join(' · ');
      if (extra) linea(extra, F(400, 26), '#6B6159', W / 2, 'center', 36);
      y += 20; separador(false);
      // código y QR
      const yQR = y;
      linea('COMPROBANTE DE PEDIDO', F(600, 26), '#B8441C', M, 'left', 52);
      linea(p.codigo, F(700, 64), '#1E1A17', M, 'left', 56);
      const f = new Date(p.enviado || p.creado || Date.now());
      linea(f.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) + ' · ' + f.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }), F(400, 28), '#6B6159', M, 'left', 44);
      linea(opciones.borrador ? 'Vista previa · aún no enviado' : 'Enviado al negocio', F(600, 26), opciones.borrador ? '#B8441C' : '#1C8748', M, 'left', 40);
      if (!medir && window.qrcode) {
        const q = window.qrcode(0, 'M'); q.addData(`${p.codigo}|${Math.round(p.totales.total)}|${C.negocio.id}`); q.make();
        const n = q.getModuleCount(), lado = 210, t = lado / n, x0 = W - M - lado;
        ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 10, yQR - 30, lado + 20, lado + 20); ctx.fillStyle = '#1E1A17';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x0 + c * t, yQR - 20 + r * t, Math.ceil(t), Math.ceil(t));
      }
      y = Math.max(y, yQR + 210); separador();
      // cliente y entrega
      linea('CLIENTE', F(600, 24), '#6B6159', M, 'left', 40);
      linea(p.cliente.nombre, F(600, 34), '#1E1A17', M, 'left', 44);
      linea([p.cliente.celular, p.cliente.correo].filter(Boolean).join(' · '), F(400, 26), '#6B6159', M, 'left', 44);
      linea('ENTREGA', F(600, 24), '#6B6159', M, 'left', 40);
      const entrega = p.modo === 'local' ? `${MODOS.local}${p.mesa ? ' · Mesa ' + p.mesa : ''}` : p.modo === 'recoger' ? MODOS.recoger : `${MODOS.domicilio} · ${String(p.destino.km).replace('.', ',')} km`;
      linea(entrega, F(600, 32), '#1E1A17', M, 'left', 44);
      if (p.modo === 'domicilio') {
        ctx.font = F(400, 26);
        for (const l of partir(ctx, p.destino.direccion + (p.destino.indicaciones ? ' · ' + p.destino.indicaciones : ''), W - 2 * M)) linea(l, F(400, 26), '#6B6159', M, 'left', 36);
      }
      y += 10; separador();
      // productos
      linea('PRODUCTOS', F(600, 24), '#6B6159', M, 'left', 46);
      for (const it of p.items) {
        if (!medir) { ctx.font = F(600, 32); ctx.fillStyle = '#1E1A17'; ctx.textAlign = 'left'; ctx.fillText(`${it.cant} × ${it.nombre}`, M, y); ctx.textAlign = 'right'; ctx.fillText(pesos(it.total), W - M, y); }
        y += 42; ctx.font = F(400, 24);
        for (const l of partir(ctx, it.detalle, W - 2 * M - 40)) linea(l, F(400, 24), '#6B6159', M + 28, 'left', 34);
        y += 14;
      }
      separador();
      // totales
      const T = p.totales, filas = [['Platos', T.platos]];
      if (T.salsas) filas.push(['Salsas especiales', T.salsas]);
      if (T.bebidas) filas.push(['Bebidas', T.bebidas]);
      if (T.empaque) filas.push(['Empaque', T.empaque]);
      if (p.modo === 'domicilio') filas.push(['Domicilio', T.domicilio]);
      if (T.ahorro) filas.push(['Su ahorro en domicilio', -T.ahorro]);
      for (const [n, v] of filas) {
        if (!medir) { ctx.font = F(400, 28); ctx.fillStyle = '#4A423C'; ctx.textAlign = 'left'; ctx.fillText(n, M, y); ctx.textAlign = 'right'; ctx.fillText(n === 'Domicilio' && !v ? 'Gratis' : (v < 0 ? '− ' : '') + pesos(Math.abs(v)), W - M, y); }
        y += 42;
      }
      y += 16;
      if (!medir) {
        ctx.fillStyle = '#1C8748'; ctx.beginPath(); ctx.roundRect(M - 20, y - 50, W - 2 * M + 40, 84, 22); ctx.fill();
        ctx.font = F(600, 32); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('TOTAL', M + 10, y + 4);
        ctx.font = F(700, 46); ctx.textAlign = 'right'; ctx.fillText(pesos(T.total), W - M - 10, y + 8);
      }
      y += 90;
      // pago
      linea('FORMA DE PAGO', F(600, 24), '#6B6159', M, 'left', 40);
      const pg = p.pago;
      linea(PAGOS[pg.tipo] + (pg.tipo === 'efectivo' && pg.conCuanto ? ` · paga con ${pesos(pg.conCuanto)} · cambio ${pesos(pg.cambio)}` : ''), F(600, 30), '#1E1A17', M, 'left', 42);
      linea(pg.estado === 'pagado' ? 'Pagado' : (pg.tipo === 'transferencia' ? 'Pendiente: envíe el comprobante por el chat' : 'Se paga al recibir'), F(400, 26), '#6B6159', M, 'left', 40);
      if (p.nota) { ctx.font = F(400, 26); for (const l of partir(ctx, 'Nota: ' + p.nota, W - 2 * M)) linea(l, F(400, 26), '#6B6159', M, 'left', 36); }
      y += 10; separador();
      // políticas
      linea('POLÍTICAS', F(600, 22), '#6B6159', M, 'left', 36);
      ctx.font = F(400, 22);
      for (const pol of C.negocio.politicas) for (const l of partir(ctx, '• ' + pol, W - 2 * M)) linea(l, F(400, 22), '#7A7068', M, 'left', 31);
      y += 26;
      linea('¡Gracias por su compra!', F(600, 32), '#1E1A17', W / 2, 'center', 44);
      linea('Mesa y Ruta · Powered by AXERVUS CTeI', F(400, 22), '#9A8F86', W / 2, 'center', 30);
      return y + 60;
    };
    const prueba = document.createElement('canvas').getContext('2d');
    const alto = await pasadas(prueba, true);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = alto;
    const ctx = cv.getContext('2d');
    // papel con bordes dentados
    ctx.fillStyle = '#FFFDF9'; ctx.fillRect(0, 0, W, alto);
    ctx.fillStyle = '#EDE5DA';
    for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 16); ctx.lineTo(x + 36, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, alto); ctx.lineTo(x + 18, alto - 16); ctx.lineTo(x + 36, alto); ctx.fill(); }
    await pasadas(ctx, false);
    if (opciones.borrador) {
      ctx.save(); ctx.translate(W / 2, alto / 2); ctx.rotate(-Math.PI / 7); ctx.font = F(700, 120); ctx.fillStyle = 'rgba(226,87,43,.07)'; ctx.textAlign = 'center'; ctx.fillText('VISTA PREVIA', 0, 0); ctx.restore();
    }
    return cv;
  }

  async function blob(p, op) { const cv = await dibujar(p, op); return new Promise(r => cv.toBlob(r, 'image/png')); }
  async function descargar(p, op) {
    const b = await blob(p, op); const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `ticket-${p.codigo}.png`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function compartir(p, op) {
    const b = await blob(p, op); const f = new File([b], `ticket-${p.codigo}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: `Pedido ${p.codigo}`, text: `${C.negocio.nombre} · ${pesos(p.totales.total)}` }); return true; }
    await descargar(p, op); return false;
  }
  window.TICKET = { dibujar, blob, descargar, compartir };
})();
