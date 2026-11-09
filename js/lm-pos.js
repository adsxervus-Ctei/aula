/* Lainec v7 · PUNTO DE VENTA (caja rápida) — la base es la misma para todos los negocios:
   buscar o escanear → ticket → cobrar (con vueltas) → queda en la caja y baja el inventario.
   Lo que cambia según el tipo de negocio está en POS_TIPO (abajo). */
(function () {
  'use strict';
  const LM = window.LM;
  const { esc, ic, pesos, toast, sheet, closeModal } = LM;
  const ses = () => LM.S.session;

  // Qué cambia en la caja según el tipo de negocio
  const POS_TIPO = {
    comida:    { titulo: 'Caja del mostrador', nota: 'Para lo que se vende en el mostrador o para llevar. Las mesas van en "Mesas y comandas".' },
    rapida:    { titulo: 'Caja con turnos', turno: true, nota: 'Cada venta saca un número de turno. Cuando el pedido esté listo, lo llamas en grande.' },
    tienda:    { titulo: 'Caja registradora', nota: 'Pasa los productos con el lector o búscalos. Ideal para mercado y bebidas.' },
    farmacia:  { titulo: 'Caja de la droguería', formula: true, nota: 'Si vendes un medicamento, la caja te recuerda preguntar por la fórmula médica.' },
    papeleria: { titulo: 'Caja de la papelería', rapidos: [['fotocopias', 1, 'x10'], ['fotocopias', 5, 'x50'], ['fotocopias', 10, 'x100']], nota: 'Botones rápidos para fotocopias.' },
    deposito:  { titulo: 'Caja y cotizaciones', cotizar: true, flete: true, nota: 'Puedes imprimir una cotización sin vender, y sumar el flete.' },
    campo:     { titulo: 'Caja por kilo', kilo: true, nota: 'Las cantidades pueden ser por medio kilo (0,5).' },
    billar:    { titulo: 'Caja del mostrador', nota: 'Para lo que se vende sin mesa. Las mesas van en "Mesas y cuentas".' },
    belleza:   { titulo: 'Caja de servicios y productos', nota: 'Cobra un servicio sin turno o vende productos (ceras, tintes).' },
    taller:    { titulo: 'Caja de repuestos', nota: 'Venta de repuestos sueltos. Las reparaciones van en "Órdenes de servicio".' },
    ropa:      { titulo: 'Caja con tallas', tallas: true, nota: 'Al pasar una prenda, eliges la talla y se descuenta de esa talla.' },
    agro:      { titulo: 'Caja con lotes y granel', kilo: true, lotes: true, nota: 'No deja vender lo que ya está vencido y permite vender por kilo.' }
  };
  LM.POS_TIPO = POS_TIPO;
  const conf = t => POS_TIPO[t.cat] || POS_TIPO.tienda;
  const P = {}; // ticket por negocio
  const tk = tid => P[tid] || (P[tid] = { lineas: [], desc: 0, flete: 0 });

  function pPOS(t, N) {
    if (LM.iniTipo) LM.iniTipo(t);
    const c = conf(t), T = tk(t.id);
    const sub = T.lineas.reduce((a, l) => a + l.p * l.q, 0), total = Math.max(0, sub - T.desc + (c.flete ? T.flete : 0));
    const top = LM.S.prods.filter(p => p.t === t.id && p.disp !== false).sort((a, b) => b.v - a.v).slice(0, 8);
    const turnos = (N.turnosPos || []).filter(x => x.estado !== 'entregado');
    return LM.head(c.titulo, c.nota) +
      LM.ayuda('¿Cómo vendo aquí?', ['Pasa el producto por el <b>lector</b>, toca <b>CÁMARA</b>, o escribe el nombre o el código y presiona Enter.', 'También puedes tocar los botones de los más vendidos.', 'Revisa el ticket y toca <b>COBRAR</b>. Si pagan en efectivo, escribe con cuánto pagan y te sale el cambio.', 'La venta queda en la Caja del día y se descuenta del inventario.']) +
      '<div class="lm-pos"><div class="lm-pos-izq">' +
      '<form class="lm-pos-buscar" data-form="pos-buscar"><input id="posQ" name="q" placeholder="Código, nombre o pasa el lector" autocomplete="off" enterkeyhint="done" aria-label="Buscar producto"><button class="btn b-sol" type="submit">' + ic('plus') + 'Agregar</button><button class="btn" type="button" data-act="pos-cam">' + ic('camera') + 'Cámara</button></form>' +
      '<div id="posRes" class="lm-res"></div>' +
      (c.rapidos ? '<div class="quick">' + c.rapidos.map(r => '<button class="btn b-sm" type="button" data-act="pos-rapido" data-id="' + r[0] + '" data-q="' + r[1] + '">' + ic('hojas') + 'Fotocopias ' + r[2] + '</button>').join('') + '</div>' : '') +
      '<div class="lm-pos-top">' + top.map(p => '<button type="button" class="lm-pos-p" data-act="pos-add" data-id="' + esc(p.id) + '"><b>' + esc(p.n) + '</b><span class="num">' + pesos(LM.precio(p).p) + '</span></button>').join('') + '</div></div>' +
      '<div class="lm-pos-der box"><h3>' + ic('receipt') + 'Ticket</h3>' +
      (T.lineas.length ? T.lineas.map((l, i) => '<div class="lm-pos-l"><div><b>' + esc(l.n) + '</b>' + (l.talla ? '<small>Talla ' + esc(l.talla) + '</small>' : '') + (l.aviso ? '<small class="err">' + esc(l.aviso) + '</small>' : '') + '<small class="num">' + pesos(l.p) + (c.kilo && l.kg ? ' el kilo' : ' c/u') + '</small></div><div class="qty"><button type="button" data-act="pos-q" data-ix="' + i + '" data-d="-1" aria-label="Menos">' + ic('minus') + '</button><span class="num">' + String(l.q).replace('.', ',') + '</span><button type="button" data-act="pos-q" data-ix="' + i + '" data-d="1" aria-label="Más">' + ic('plus') + '</button></div><b class="num">' + pesos(l.p * l.q) + '</b></div>').join('') : '<p class="muted">Aún no hay productos en el ticket.</p>') +
      '<div class="kv"><span>Subtotal</span><b class="num">' + pesos(sub) + '</b></div>' +
      '<div class="kv"><label for="posD">Descuento</label><input id="posD" type="number" min="0" step="500" value="' + T.desc + '" data-chg="pos-desc" style="max-width:120px"></div>' +
      (c.flete ? '<div class="kv"><label for="posF">Flete</label><input id="posF" type="number" min="0" step="1000" value="' + T.flete + '" data-chg="pos-flete" style="max-width:120px"></div>' : '') +
      '<p class="lm-pos-total">Total <b class="num">' + pesos(total) + '</b></p>' +
      '<div class="lm-botones"><button class="btn b-monte lm-btn-xl" type="button" data-act="pos-cobrar"' + (T.lineas.length ? '' : ' disabled') + '>' + ic('cash') + 'COBRAR ' + pesos(total) + '</button>' +
      (c.cotizar ? '<button class="btn" type="button" data-act="pos-cotizar"' + (T.lineas.length ? '' : ' disabled') + '>' + ic('printer') + 'Imprimir cotización</button>' : '') +
      (T.lineas.length ? '<button class="btn b-ghost" type="button" data-act="pos-vaciar">' + ic('trash') + 'Vaciar ticket</button>' : '') + '</div></div></div>' +
      (c.turno ? '<div class="box"><h3>' + ic('bell') + 'Turnos en preparación</h3>' + (turnos.length ? '<div class="lm-turnos-pos">' + turnos.map(x => '<div class="' + x.estado + '"><b class="num">' + x.n + '</b><span>' + esc(x.d) + '</span>' + (x.estado === 'preparando' ? '<button class="btn b-sol" type="button" data-act="pos-turno" data-n="' + x.n + '">' + ic('check') + 'LISTO: LLAMAR</button>' : '<button class="btn" type="button" data-act="pos-turno" data-n="' + x.n + '">Ya lo entregué</button>') + '</div>').join('') + '</div>' : '<p class="muted">No hay turnos pendientes.</p>') + '</div>' : '');
  }

  /* ---------------- agregar al ticket ---------------- */
  function buscar(t, q) {
    const cod = LM.leerCodigo && LM.leerCodigo(q);
    const ps = LM.S.prods.filter(p => p.t === t.id);
    if (cod) { const p = ps.find(x => LM.codigoDe(x) === cod); if (p) return [p]; }
    const s = q.toLowerCase();
    return ps.filter(p => (p.n + ' ' + (p.sub || '') + ' ' + (p.cod || '')).toLowerCase().includes(s)).slice(0, 8);
  }
  function agregar(t, p, q, talla) {
    const c = conf(t), T = tk(t.id);
    if (p.disp === false || p.stock <= 0) { LM.sonar('error'); toast(p.n + ' está agotado.'); return; }
    // Agro y veterinaria: si todos los lotes del producto están vencidos, no se vende
    if (c.lotes) { const N = LM.NEG(t.id), ls = (N.lotes || []).filter(l => l.pid === p.id && l.c > 0); if (ls.length && ls.every(l => new Date(l.vence + 'T23:59:59') < new Date())) { LM.sonar('error'); toast('Todo el lote de ' + p.n + ' está vencido: no se puede vender.'); return; } }
    // Ropa: se escoge la talla
    if (c.tallas && !talla) { const N = LM.NEG(t.id), tl = N.tallas && N.tallas[p.id]; if (tl && Object.keys(tl).length) { elegirTalla(t, p, tl); return; } }
    const kilo = c.kilo && /kilo|kg/i.test(p.n);
    const l = T.lineas.find(x => x.id === p.id && x.talla === talla);
    if (l) l.q = +(l.q + (q || 1)).toFixed(2);
    else T.lineas.push({ id: p.id, n: p.n, p: LM.precio(p).p, q: q || 1, talla: talla || null, kg: kilo, aviso: c.formula && p.sub === 'Medicamentos' ? 'Pregunta si tiene fórmula médica' : '' });
    if (navigator.vibrate) navigator.vibrate(40);
    LM.rerender(); setTimeout(() => { const i = document.getElementById('posQ'); if (i) i.focus(); }, 30);
  }
  function elegirTalla(t, p, tl) {
    sheet('<div class="sh-h"><div class="tt"><small>' + esc(p.n) + '</small><h3>¿Qué talla?</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><div class="sh-b"><div class="lm-tallas-b">' +
      Object.keys(tl).map(x => '<button class="btn lm-btn-xl" type="button" data-act="pos-talla" data-id="' + esc(p.id) + '" data-t="' + esc(x) + '"' + (tl[x] > 0 ? '' : ' disabled') + '>' + esc(x) + '<small>' + tl[x] + ' disp.</small></button>').join('') + '</div></div>');
  }
  const A = LM.A, F = LM.F, tienda = () => LM.T(ses().t);
  A['pos-talla'] = el => { closeModal(); agregar(tienda(), LM.PR(el.dataset.id), 1, el.dataset.t); };
  A['pos-add'] = el => agregar(tienda(), LM.PR(el.dataset.id), 1);
  A['pos-rapido'] = el => { const t = tienda(), p = LM.PR(el.dataset.id); if (p && p.t === t.id) agregar(t, p, +el.dataset.q); else toast('Crea el producto "Fotocopias" primero.'); };
  F['pos-buscar'] = (f, d) => {
    const t = tienda(), q = String(d.get('q') || '').trim(); if (!q) return;
    const ls = buscar(t, q), box = document.getElementById('posRes');
    if (ls.length === 1 || (LM.leerCodigo(q) && ls.length)) { f.reset(); box.innerHTML = ''; agregar(t, ls[0], 1); return; }
    box.innerHTML = ls.length ? ls.map(p => '<button type="button" class="lm-res-it" data-act="pos-add" data-id="' + esc(p.id) + '"><b>' + esc(p.n) + '</b><span>' + esc(LM.codigoDe(p)) + ' · ' + pesos(LM.precio(p).p) + ' · ' + p.stock + ' disp.</span></button>').join('') : '<p class="muted">No hay nada con "' + esc(q) + '".</p>';
    LM.paint(box);
  };
  A['pos-cam'] = () => { if (!LM.escanearUna) { LM.go('escanear'); return; } LM.escanearUna(cod => { const t = tienda(), p = LM.S.prods.find(x => x.t === t.id && LM.codigoDe(x) === cod); if (p) agregar(t, p, 1); else toast('Ese código no es de este negocio: ' + cod); }); };
  A['pos-q'] = el => { const t = tienda(), T = tk(t.id), l = T.lineas[+el.dataset.ix], k = conf(t).kilo && l.kg ? 0.5 : 1; l.q = +(l.q + k * +el.dataset.d).toFixed(2); if (l.q <= 0) T.lineas.splice(+el.dataset.ix, 1); LM.rerender(); };
  A['pos-vaciar'] = () => { P[ses().t] = null; LM.rerender(); };
  document.addEventListener('change', e => { const el = e.target; if (el.dataset.chg === 'pos-desc') { tk(ses().t).desc = Math.max(0, +el.value || 0); LM.rerender(); } if (el.dataset.chg === 'pos-flete') { tk(ses().t).flete = Math.max(0, +el.value || 0); LM.rerender(); } });

  /* ---------------- cobrar ---------------- */
  const totalDe = t => { const c = conf(t), T = tk(t.id); return Math.max(0, T.lineas.reduce((a, l) => a + l.p * l.q, 0) - T.desc + (c.flete ? T.flete : 0)); };
  A['pos-cobrar'] = () => {
    const t = tienda(), c = conf(t), T = tk(t.id), tot = totalDe(t);
    const med = c.formula && T.lineas.some(l => l.aviso);
    sheet('<div class="sh-h"><div class="tt"><small>' + T.lineas.length + ' producto(s)</small><h3>Cobrar ' + pesos(tot) + '</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="pos-cobrar"><div class="lm-opciones c2">' + [['efectivo', 'cash', 'Efectivo'], ['nequi', 'cel', 'Nequi'], ['banco', 'bank', 'Transferencia'], ['fiado', 'fiado', 'Fiado']].map((x, i) => '<label class="lm-opcion"><input type="radio" name="m" value="' + x[0] + '"' + (i ? '' : ' checked') + ' data-chg="pos-metodo"><span>' + ic(x[1]) + x[2] + '</span></label>').join('') + '</div>' +
      '<div class="campo" id="posEf"><label for="posR">¿Con cuánto paga?</label><input id="posR" name="r" type="number" min="0" step="1000" data-inp="pos-vueltas" data-tot="' + tot + '" inputmode="numeric"><div class="quick">' + [tot, Math.ceil(tot / 10000) * 10000, Math.ceil(tot / 20000) * 20000, Math.ceil(tot / 50000) * 50000].filter((v, i, a) => a.indexOf(v) === i).map(v => '<button class="btn b-sm" type="button" data-act="pos-billete" data-v="' + v + '">' + pesos(v) + '</button>').join('') + '</div><p class="lm-vueltas" id="posV">Cambio: <b class="num">$0</b></p></div>' +
      '<div class="campo" id="posFi" hidden><label for="posC">¿A quién se le fía?</label><input id="posC" name="cli" list="posCl"><datalist id="posCl">' + LM.NEG(t.id).clientes.map(x => '<option value="' + esc(x.n) + '">').join('') + '</datalist></div>' +
      (med ? '<label class="lm-habeas"><input type="checkbox" name="formula" required><span><b>Pregunté por la fórmula médica.</b> Los medicamentos que no son de venta libre necesitan fórmula.</span></label>' : '') +
      (c.turno ? '<p class="aviso">' + ic('bell') + '<span>Esta venta saca el <b>turno #' + ((LM.NEG(t.id).turnoN || 0) + 1) + '</b>.</span></p>' : '') +
      '<label class="lm-ck"><input type="checkbox" name="imp">Imprimir el recibo</label>' +
      '<button class="btn b-monte lm-btn-xl" type="submit">' + ic('check') + 'CONFIRMAR VENTA</button></form>');
  };
  A['pos-billete'] = el => { const i = document.getElementById('posR'); i.value = el.dataset.v; vueltas(i); };
  function vueltas(i) { const v = (+i.value || 0) - +i.dataset.tot, o = document.getElementById('posV'); if (o) o.innerHTML = v >= 0 ? 'Cambio: <b class="num">' + pesos(v) + '</b>' : '<span class="err">Faltan ' + pesos(-v) + '</span>'; }
  document.addEventListener('input', e => { if (e.target.dataset.inp === 'pos-vueltas') vueltas(e.target); });
  document.addEventListener('change', e => { if (e.target.dataset.chg !== 'pos-metodo') return; const ef = document.getElementById('posEf'), fi = document.getElementById('posFi'); if (ef) ef.hidden = e.target.value !== 'efectivo'; if (fi) { fi.hidden = e.target.value !== 'fiado'; const c = document.getElementById('posC'); if (c) c.required = e.target.value === 'fiado'; } });
  F['pos-cobrar'] = (f, d) => {
    const t = tienda(), c = conf(t), N = LM.NEG(t.id), T = tk(t.id), tot = totalDe(t), m = d.get('m');
    if (m === 'efectivo' && d.get('r') && +d.get('r') < tot) { toast('Lo que pagan no alcanza.'); return; }
    const desc = T.lineas.map(l => l.n + (l.talla ? ' T' + l.talla : '') + (l.q !== 1 ? ' x' + String(l.q).replace('.', ',') : '')).join(', ') + (c.flete && T.flete ? ' + flete' : '');
    let turno = null;
    if (c.turno) { N.turnoN = (N.turnoN || 0) + 1; turno = N.turnoN; (N.turnosPos = N.turnosPos || []).push({ n: turno, d: desc, estado: 'preparando' }); }
    N.ventas.push({ h: LM.hora(), d: (turno ? 'Turno #' + turno + ' · ' : '') + desc, v: tot, m, o: 'mostrador', por: ses().u });
    T.lineas.forEach(l => { const p = LM.PR(l.id); if (!p) return; if (p.stock < 999) p.stock = Math.max(0, +(p.stock - l.q).toFixed(2)); p.v += Math.ceil(l.q); if (l.talla && N.tallas && N.tallas[p.id] && N.tallas[p.id][l.talla] != null) N.tallas[p.id][l.talla] = Math.max(0, N.tallas[p.id][l.talla] - l.q); });
    if (m === 'fiado') { const nom = String(d.get('cli') || '').trim(); let cl = N.clientes.find(x => x.n.toLowerCase() === nom.toLowerCase()); if (!cl) { cl = { n: nom, cel: '', ped: 0, debe: 0 }; N.clientes.push(cl); } cl.debe += tot; cl.nota = 'Venta de mostrador'; }
    LM.logN(t.id, 'Vendió en caja: ' + desc + ' ' + pesos(tot));
    const recibo = { t: t.n, h: LM.hora(), lineas: T.lineas.slice(), desc: T.desc, flete: c.flete ? T.flete : 0, tot, m, r: +d.get('r') || 0, turno };
    P[t.id] = null; LM.save(); closeModal(); LM.sonar();
    toast((turno ? 'Turno #' + turno + ' · ' : '') + 'Venta de ' + pesos(tot) + ' anotada.' + (m === 'efectivo' && recibo.r > tot ? ' Cambio: ' + pesos(recibo.r - tot) : ''));
    if (d.get('imp')) imprimirRecibo(recibo, 'RECIBO');
    LM.rerender();
  };
  A['pos-cotizar'] = () => { const t = tienda(), c = conf(t), T = tk(t.id); imprimirRecibo({ t: t.n, h: LM.hora(), lineas: T.lineas, desc: T.desc, flete: c.flete ? T.flete : 0, tot: totalDe(t) }, 'COTIZACIÓN'); };
  A['pos-turno'] = el => {
    const N = LM.NEG(ses().t), x = (N.turnosPos || []).find(y => y.n === +el.dataset.n); if (!x) return;
    if (x.estado === 'preparando') { x.estado = 'listo'; LM.save(); LM.hablar('Turno ' + x.n + ', su pedido está listo'); sheet('<div class="sh-b lm-centro lm-llamar"><p>Turno</p><b class="num">' + x.n + '</b><p>¡Su pedido está listo!</p><button class="btn b-sol lm-btn-xl" type="button" data-act="cerrar">Cerrar</button></div>'); }
    else { x.estado = 'entregado'; LM.save(); }
    LM.rerender();
  };
  function imprimirRecibo(r, titulo) {
    let w = document.getElementById('lmPrint'); if (!w) { w = document.createElement('div'); w.id = 'lmPrint'; document.body.appendChild(w); }
    w.className = 'lm-print ticket';
    w.innerHTML = '<div class="lm-tk"><b>' + esc(r.t) + '</b><span>' + titulo + ' · ' + esc(r.h) + '</span>' + (r.turno ? '<b class="lm-tk-turno">TURNO ' + r.turno + '</b>' : '') + '<hr>' + r.lineas.map(l => '<div><span>' + esc(l.n) + (l.talla ? ' T' + esc(l.talla) : '') + ' x' + String(l.q).replace('.', ',') + '</span><span>' + pesos(l.p * l.q) + '</span></div>').join('') + '<hr>' + (r.desc ? '<div><span>Descuento</span><span>-' + pesos(r.desc) + '</span></div>' : '') + (r.flete ? '<div><span>Flete</span><span>' + pesos(r.flete) + '</span></div>' : '') + '<div class="tot"><span>TOTAL</span><span>' + pesos(r.tot) + '</span></div>' + (r.m ? '<div><span>Pago</span><span>' + esc(r.m) + '</span></div>' : '') + (r.r > r.tot ? '<div><span>Cambio</span><span>' + pesos(r.r - r.tot) + '</span></div>' : '') + (titulo === 'COTIZACIÓN' ? '<p>Precios válidos por 8 días.</p>' : '<p>¡Gracias por su compra!</p>') + '<p>Lainec · lainec.com</p></div>';
    document.body.classList.add('lm-imprimiendo');
    const fin = () => { document.body.classList.remove('lm-imprimiendo'); removeEventListener('afterprint', fin); };
    addEventListener('afterprint', fin); setTimeout(() => { try { window.print(); } catch (e) { fin(); } }, 60);
  }

  /* ---------------- menú del panel ---------------- */
  LM.EXT.panelFn.pos = pPOS; LM.EXT.panelFn.pos.cajero = true;
  const _items = LM.EXT.panelItems;
  LM.EXT.panelItems = (items, t, caj) => { items = _items(items, t, caj); const i = items.findIndex(x => x[0] === 'caja'); items.splice(i >= 0 ? i : 1, 0, ['pos', 'cash', 'Punto de venta']); return items; };
})();
