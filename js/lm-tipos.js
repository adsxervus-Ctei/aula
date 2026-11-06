/* LobaMall v7 · TIPOS DE NEGOCIO
   Todos los negocios comparten un núcleo igual (tablero, caja, gastos, balance, productos,
   inventario con foto y QR, promociones, clientes y fiados, reseñas, empleados, configuración).
   Encima de ese núcleo, cada tipo de negocio trae SU herramienta propia, porque un billar no
   trabaja como una ferretería ni como un restaurante. Aquí están los 5 tipos nuevos. */
(function () {
  'use strict';
  const LM = window.LM;
  const { esc, ic, pesos, toast, hora } = LM;
  const ses = () => LM.S.session;

  /* ---------- qué cambia según el tipo de negocio ---------- */
  LM.TIPOS = {
    comida:    { nombre: 'Restaurante o asadero', herramienta: null, atributos: [], nota: 'Pedidos a domicilio, para comer allá (mesa) o para recoger. Insumos de cocina.' },
    rapida:    { nombre: 'Comidas rápidas y jugos', herramienta: null, atributos: [], nota: 'Igual que restaurante, con tiempos de preparación cortos.' },
    tienda:    { nombre: 'Tienda o panadería', herramienta: null, atributos: ['marca', 'presentación'], nota: 'Mucho producto pequeño: aquí el QR y el lector de códigos ahorran más tiempo.' },
    farmacia:  { nombre: 'Droguería', herramienta: null, atributos: ['lote', 'vence', 'registro INVIMA'], nota: 'Venta libre y fechas de vencimiento.' },
    papeleria: { nombre: 'Papelería', herramienta: null, atributos: ['marca'], nota: 'Fotocopias y útiles; el cliente manda el archivo por el chat.' },
    deposito:  { nombre: 'Depósito y ferretería', herramienta: null, atributos: ['referencia', 'medida'], nota: 'Productos pesados: el flete se acuerda aparte; fiado apagado por defecto.' },
    campo:     { nombre: 'Del campo', herramienta: null, atributos: ['por kilo'], nota: 'Productos frescos por kilo o por unidad.' },
    billar:    { nombre: 'Billar y juegos', herramienta: ['mesas', 'billar', 'Mesas y cuentas'], atributos: [], nota: 'Se cobra por TIEMPO de mesa más lo que consuman. Cuenta abierta por mesa.' },
    belleza:   { nombre: 'Barbería y belleza', herramienta: ['turnos', 'tijera', 'Turnos del día'], atributos: ['duración'], sinDomicilio: true, nota: 'Se venden SERVICIOS con hora: turnos, quién atiende y lo que gana cada estilista. "Que venga a mi casa" es el estilista el que va.' },
    taller:    { nombre: 'Taller de motos', herramienta: ['ordenes', 'llave', 'Órdenes de servicio'], atributos: ['referencia', 'sirve para'], nota: 'Cada moto entra con una orden: falla, repuestos, mano de obra y estado. Historial por placa.' },
    ropa:      { nombre: 'Ropa y calzado', herramienta: ['apartados', 'camisa', 'Tallas y apartados'], atributos: ['talla', 'color'], nota: 'Un mismo producto en varias tallas y colores, y apartados con abonos.' },
    agro:      { nombre: 'Agro y veterinaria', herramienta: ['lotes', 'huella', 'Lotes y vencimientos'], atributos: ['lote', 'vence', 'registro ICA'], nota: 'Medicamentos con lote y fecha de vencimiento, y venta a granel por kilo.' }
  };

  // Menú del panel: se agrega la herramienta propia del tipo de negocio, de segunda
  const _items = LM.EXT.panelItems;
  LM.EXT.panelItems = (items, t, caj) => {
    items = _items(items, t, caj);
    const h = (LM.TIPOS[t.cat] || {}).herramienta;
    if (h) items.splice(1, 0, [h[0], h[1], h[2], aviso(t)]);
    return items;
  };
  function aviso(t) {
    const N = LM.NEG(t.id);
    if (t.cat === 'agro') { iniAgro(t, N); return N.lotes.filter(l => diasA(l.vence) <= 30 && l.c > 0).length || undefined; }
    if (t.cat === 'billar') { iniBillar(N); return N.mesas.filter(m => m.ini).length || undefined; }
    if (t.cat === 'taller') { iniTaller(N); return N.ordenes.filter(o => o.estado === 'lista').length || undefined; }
    return undefined;
  }
  const vender = (t, desc, v, m) => {
    const N = LM.NEG(t.id), s = ses();
    N.ventas.push({ h: hora(), d: desc, v, m: m || 'efectivo', o: 'mostrador', por: s.u });
    LM.logN(t.id, 'Anotó venta: ' + desc + ' ' + pesos(v));
  };
  const prodsDe = (t, subs) => LM.S.prods.filter(p => p.t === t.id && (!subs || subs.includes(p.sub)));
  const redondear = v => Math.round(v / 500) * 500;
  const pagoSel = (nombre) => '<select name="' + (nombre || 'm') + '" aria-label="Forma de pago"><option value="efectivo">Efectivo</option><option value="nequi">Nequi</option><option value="fiado">Fiado</option></select>';

  /* ======================= 1. BILLAR: mesas por tiempo ======================= */
  function iniBillar(N) {
    if (!N.mesas) N.mesas = [1, 2, 3, 4].map(i => ({ id: i, n: 'Mesa ' + i, tipo: i === 4 ? 'Tres bandas' : 'Pool', tarifa: i === 4 ? 10000 : 8000, ini: null, cons: [] }));
  }
  const minutos = m => m.ini ? Math.max(1, Math.round((Date.now() - m.ini) / 60000)) : 0;
  const valorTiempo = m => redondear(m.tarifa * minutos(m) / 60);
  function pMesas(t, N) {
    iniBillar(N);
    const extras = prodsDe(t).filter(p => p.sub !== 'Mesas');
    return LM.head('Mesas y cuentas', 'El tiempo corre solo. Al cobrar se suma el tiempo y lo que consumieron, y queda en la caja.') +
      LM.ayuda('¿Cómo cobro una mesa?', ['Cuando lleguen a jugar, presiona <b>EMPEZAR</b> en la mesa.', 'Lo que pidan (cerveza, picada) súmalo con <b>Agregar consumo</b>.', 'Al terminar presiona <b>COBRAR</b>: sale el total del tiempo más el consumo.']) +
      '<div class="lm-mesas">' + N.mesas.map(m => {
        const cons = m.cons.reduce((a, c) => a + c.p * c.q, 0), tot = valorTiempo(m) + cons;
        return '<div class="lm-mesa ' + (m.ini ? 'on' : '') + '"><h3>' + ic('billar') + esc(m.n) + ' <small>' + esc(m.tipo) + ' · ' + pesos(m.tarifa) + '/hora</small></h3>' +
          (m.ini ? '<p class="lm-reloj-mesa" data-ini="' + m.ini + '"><b class="num">' + minutos(m) + ' min</b> · tiempo ' + pesos(valorTiempo(m)) + '</p>' +
            (m.cons.length ? '<ul>' + m.cons.map(c => '<li>' + c.q + ' × ' + esc(c.n) + ' <b class="num">' + pesos(c.p * c.q) + '</b></li>').join('') + '</ul>' : '') +
            '<form class="inline" data-form="bi-cons" data-m="' + m.id + '"><select name="p" aria-label="Producto">' + extras.map(p => '<option value="' + p.id + '">' + esc(p.n) + ' · ' + pesos(p.p) + '</option>').join('') + '</select><button class="btn b-sm" type="submit">' + ic('plus') + 'Agregar consumo</button></form>' +
            '<p class="lm-grande">Total: <b class="num">' + pesos(tot) + '</b></p><form class="inline" data-form="bi-cobrar" data-m="' + m.id + '">' + pagoSel() + '<button class="btn b-monte" type="submit">' + ic('cash') + 'COBRAR</button></form>'
            : '<p class="muted">Libre</p><button class="btn b-sol lm-btn-xl" type="button" data-act="bi-ini" data-m="' + m.id + '">' + ic('play', 'fill') + 'EMPEZAR</button>') + '</div>';
      }).join('') + '</div>' +
      '<form class="box inline" data-form="bi-tarifa"><b>Tarifa por hora:</b> Pool <input name="pool" type="number" step="500" min="0" value="' + N.mesas[0].tarifa + '" style="max-width:110px"> Tres bandas <input name="tres" type="number" step="500" min="0" value="' + N.mesas[3].tarifa + '" style="max-width:110px"><button class="btn b-sm" type="submit">Guardar</button></form>';
  }
  LM.A['bi-ini'] = el => { const N = LM.NEG(ses().t); const m = N.mesas.find(x => x.id === +el.dataset.m); m.ini = Date.now(); m.cons = []; LM.save(); LM.rerender(); toast(m.n + ': empezó el tiempo'); };
  LM.F['bi-cons'] = (f, d) => { const t = LM.T(ses().t), N = LM.NEG(t.id), m = N.mesas.find(x => x.id === +f.dataset.m), p = LM.PR(d.get('p')); const c = m.cons.find(x => x.id === p.id); if (c) c.q++; else m.cons.push({ id: p.id, n: p.n, p: LM.precio(p).p, q: 1 }); p.stock = Math.max(0, p.stock - 1); LM.save(); LM.rerender(); };
  LM.F['bi-cobrar'] = (f, d) => { const t = LM.T(ses().t), N = LM.NEG(t.id), m = N.mesas.find(x => x.id === +f.dataset.m); const tot = valorTiempo(m) + m.cons.reduce((a, c) => a + c.p * c.q, 0); vender(t, m.n + ' · ' + minutos(m) + ' min' + (m.cons.length ? ' + consumo' : ''), tot, d.get('m')); m.ini = null; m.cons = []; LM.save(); LM.rerender(); toast('Cobrado ' + pesos(tot) + '. Quedó en la caja.'); };
  LM.F['bi-tarifa'] = (f, d) => { const N = LM.NEG(ses().t); N.mesas.forEach(m => m.tarifa = +(m.tipo === 'Pool' ? d.get('pool') : d.get('tres')) || m.tarifa); LM.save(); LM.rerender(); toast('Tarifa guardada'); };
  setInterval(() => { document.querySelectorAll('.lm-reloj-mesa[data-ini]').forEach(el => { const b = el.querySelector('b'); if (b) b.textContent = Math.max(1, Math.round((Date.now() - +el.dataset.ini) / 60000)) + ' min'; }); }, 30000);

  /* ======================= 2. BARBERÍA Y BELLEZA: turnos ======================= */
  function iniTurnos(t, N) {
    if (!N.turnos) N.turnos = [{ id: 1, h: '09:00', cli: 'Kevin Díaz', cel: '313 880 1122', pid: 'corte', emp: N.emp[0].n, casa: false, estado: 'atendido' }, { id: 2, h: '10:30', cli: 'Ana Mercado', cel: '311 300 4455', pid: 'unas', emp: N.emp[0].n, casa: true, estado: 'pendiente' }, { id: 3, h: '15:00', cli: 'Luis Ortega', cel: '301 777 8899', pid: 'barba', emp: N.emp[1] ? N.emp[1].n : N.emp[0].n, casa: false, estado: 'pendiente' }];
    if (N.pctEstilista == null) N.pctEstilista = 40;
  }
  function pTurnos(t, N) {
    iniTurnos(t, N);
    const serv = prodsDe(t, ['Cortes', 'Uñas', 'Tratamientos']);
    const app = LM.S.orders.filter(o => o.t === t.id && o.modo === 'alla' && !o.rech && o.e < LM.fin(o));
    const ls = N.turnos.slice().sort((a, b) => a.h.localeCompare(b.h));
    const porEmp = {};
    ls.filter(x => x.estado === 'atendido').forEach(x => { const p = LM.PR(x.pid); porEmp[x.emp] = (porEmp[x.emp] || 0) + (p ? p.p : 0) + (x.casa ? 5000 : 0); });
    return LM.head('Turnos del día', 'Agenda por hora, quién atiende y cuánto le toca a cada estilista.') +
      LM.ayuda('¿Cómo manejo los turnos?', ['Anota el turno con la hora, el cliente y el servicio.', 'Si es <b>a domicilio</b>, márcalo: el estilista va a la casa (cuesta $5.000 más).', 'Cuando termines presiona <b>ATENDIDO</b>: se anota la venta sola.', 'Abajo ves cuánto le toca a cada estilista hoy.']) +
      (app.length ? '<div class="box"><h3>' + ic('bell') + 'Reservas hechas por la app</h3>' + app.map(o => '<div class="lm-fila"><div><b>' + esc(o.hora || '') + ' · ' + esc(o.cliN || o.cli) + '</b><small>' + esc(o.items.map(i => (LM.PR(i.id) || {}).n).join(', ')) + '</small></div><button class="btn b-sm" type="button" data-act="orden" data-n="' + o.n + '">Ver</button></div>').join('') + '</div>' : '') +
      '<div class="box"><h3>Agenda de hoy</h3>' + ls.map(x => { const p = LM.PR(x.pid) || { n: '?', p: 0 }; return '<div class="lm-turno ' + x.estado + '"><b class="num">' + esc(x.h) + '</b><div><b>' + esc(x.cli) + '</b><small>' + esc(p.n) + ' · ' + esc(x.emp) + (x.casa ? ' · ' + ic('home') + ' a domicilio' : '') + '</small></div>' +
        (x.estado === 'pendiente' ? '<div class="quick"><button class="btn b-sm b-monte" type="button" data-act="tu-est" data-id="' + x.id + '" data-e="atendido">' + ic('check') + 'ATENDIDO</button><button class="btn b-sm" type="button" data-act="tu-est" data-id="' + x.id + '" data-e="novino">No vino</button>' + (x.cel ? '<a class="btn b-sm" href="https://wa.me/57' + x.cel.replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola ' + x.cli + ', te recordamos tu turno de hoy a las ' + x.h + ' en ' + t.n + '.') + '" target="_blank" rel="noopener">' + ic('chat') + 'Recordar</a>' : '') + '</div>' : '<span class="pill ' + (x.estado === 'atendido' ? 'p-ok' : 'p-gris') + '">' + (x.estado === 'atendido' ? 'Atendido' : 'No vino') + '</span>') + '</div>'; }).join('') + '</div>' +
      '<form class="box stack" data-form="tu-nuevo"><h3 style="margin:0">Nuevo turno</h3><div class="row2"><div class="campo"><label for="tuH">Hora</label><input id="tuH" name="h" type="time" required value="16:00"></div><div class="campo"><label for="tuS">Servicio</label><select id="tuS" name="pid">' + serv.map(p => '<option value="' + p.id + '">' + esc(p.n) + ' · ' + pesos(p.p) + '</option>').join('') + '</select></div></div>' +
      '<div class="row2"><div class="campo"><label for="tuC">Cliente</label><input id="tuC" name="cli" required></div><div class="campo"><label for="tuT">Celular</label><input id="tuT" name="cel" inputmode="tel"></div></div><div class="row2"><div class="campo"><label for="tuE">Atiende</label><select id="tuE" name="emp">' + N.emp.map(e => '<option>' + esc(e.n) + '</option>').join('') + '</select></div><label class="lm-ck"><input type="checkbox" name="casa">Que vaya a la casa (+$5.000)</label></div><button class="btn b-sol" type="submit">' + ic('plus') + 'Anotar turno</button></form>' +
      '<div class="box"><h3>Lo que gana cada estilista hoy (' + N.pctEstilista + ' %)</h3>' + (Object.keys(porEmp).length ? Object.keys(porEmp).map(e => '<div class="kv"><span>' + esc(e) + ' · vendió ' + pesos(porEmp[e]) + '</span><b class="num">' + pesos(porEmp[e] * N.pctEstilista / 100) + '</b></div>').join('') : '<p class="muted">Aún no hay turnos atendidos.</p>') + '</div>';
  }
  LM.F['tu-nuevo'] = (f, d) => { const t = LM.T(ses().t), N = LM.NEG(t.id); N.turnos.push({ id: Date.now(), h: d.get('h'), cli: d.get('cli'), cel: d.get('cel'), pid: d.get('pid'), emp: d.get('emp'), casa: !!d.get('casa'), estado: 'pendiente' }); LM.save(); LM.rerender(); toast('Turno anotado'); };
  LM.A['tu-est'] = el => { const t = LM.T(ses().t), N = LM.NEG(t.id), x = N.turnos.find(y => y.id === +el.dataset.id); x.estado = el.dataset.e; if (x.estado === 'atendido') { const p = LM.PR(x.pid); vender(t, (p ? p.n : 'Servicio') + ' · ' + x.cli + (x.casa ? ' (a domicilio)' : ''), (p ? p.p : 0) + (x.casa ? 5000 : 0)); } LM.save(); LM.rerender(); };

  /* ======================= 3. TALLER DE MOTOS: órdenes de servicio ======================= */
  const PASOS_T = [['recibida', 'Recibida'], ['diagnostico', 'En diagnóstico'], ['reparando', 'Reparando'], ['lista', 'Lista para entregar'], ['entregada', 'Entregada']];
  function iniTaller(N) {
    if (!N.ordenes) N.ordenes = [{ id: 101, placa: 'HTL12A', moto: 'Bajaj Boxer roja', cli: 'Danto Ruiz', cel: '3001112233', falla: 'Cambio de aceite y revisar frenos', estado: 'reparando', rep: [{ id: 'aceite', n: 'Cambio de aceite', q: 1, p: 35000 }], mo: 10000, f: 'Hoy' }, { id: 100, placa: 'HTL12A', moto: 'Bajaj Boxer roja', cli: 'Danto Ruiz', cel: '3001112233', falla: 'Bujía', estado: 'entregada', rep: [{ id: 'bujia', n: 'Bujía para moto', q: 1, p: 12000 }], mo: 5000, f: '20 oct.' }];
  }
  let placaBus = '';
  function pOrdenes(t, N) {
    iniTaller(N);
    const reps = prodsDe(t, ['Repuestos', 'Lubricantes', 'Servicios']);
    const abiertas = N.ordenes.filter(o => o.estado !== 'entregada');
    const hist = placaBus ? N.ordenes.filter(o => o.placa.includes(placaBus)) : [];
    const totalO = o => o.rep.reduce((a, r) => a + r.p * r.q, 0) + (+o.mo || 0);
    return LM.head('Órdenes de servicio', 'Cada moto que entra queda con su orden: falla, repuestos, mano de obra y estado.') +
      LM.ayuda('¿Cómo uso las órdenes?', ['Cuando llegue una moto, llena <b>Nueva orden</b> con la placa y la falla.', 'Ve pasando el estado: diagnóstico, reparando, lista.', 'Agrega los repuestos que uses: se descuentan del inventario.', 'Cuando esté <b>lista</b>, avísale al cliente por WhatsApp con un toque.', 'Al entregar, se cobra y queda en la caja.']) +
      (abiertas.length ? abiertas.map(o => { const i = PASOS_T.findIndex(p => p[0] === o.estado), sig = PASOS_T[i + 1]; return '<div class="box lm-orden"><div class="lm-of-h"><b>Orden #' + o.id + ' · ' + esc(o.placa) + '</b><span class="pill ' + (o.estado === 'lista' ? 'p-ok' : 'p-curso') + '">' + esc(PASOS_T[i][1]) + '</span></div><small>' + esc(o.moto) + ' · ' + esc(o.cli) + ' · ' + esc(o.falla) + '</small>' +
        '<ul>' + o.rep.map(r => '<li>' + r.q + ' × ' + esc(r.n) + ' <b class="num">' + pesos(r.p * r.q) + '</b></li>').join('') + '<li>Mano de obra <b class="num">' + pesos(+o.mo || 0) + '</b></li></ul><p class="lm-grande">Total: <b class="num">' + pesos(totalO(o)) + '</b></p>' +
        '<form class="inline" data-form="ta-rep" data-id="' + o.id + '"><select name="p" aria-label="Repuesto">' + reps.map(p => '<option value="' + p.id + '">' + esc(p.n) + ' · ' + pesos(p.p) + ' (' + p.stock + ')</option>').join('') + '</select><button class="btn b-sm" type="submit">' + ic('plus') + 'Repuesto</button></form>' +
        '<form class="inline" data-form="ta-mo" data-id="' + o.id + '"><label>Mano de obra <input name="mo" type="number" min="0" step="1000" value="' + (+o.mo || 0) + '" style="max-width:120px"></label><button class="btn b-sm" type="submit">Guardar</button></form>' +
        '<div class="quick">' + (sig && sig[0] !== 'entregada' ? '<button class="btn b-sol" type="button" data-act="ta-paso" data-id="' + o.id + '">' + ic('arrow') + 'Pasar a: ' + sig[1] + '</button>' : '') +
        (o.estado === 'lista' ? '<a class="btn b-monte" href="https://wa.me/57' + String(o.cel).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola ' + o.cli + ', tu moto ' + o.placa + ' ya está lista en ' + t.n + '. Total: ' + pesos(totalO(o)) + '.') + '" target="_blank" rel="noopener">' + ic('chat') + 'Avisar por WhatsApp</a><form class="inline" data-form="ta-entregar" data-id="' + o.id + '">' + pagoSel() + '<button class="btn b-tinta" type="submit">' + ic('cash') + 'ENTREGAR Y COBRAR</button></form>' : '') + '</div></div>'; }).join('') : '<div class="vacio">No hay motos en el taller.</div>') +
      '<form class="box stack" data-form="ta-nueva"><h3 style="margin:0">Nueva orden</h3><div class="row2"><div class="campo"><label for="taP">Placa</label><input id="taP" name="placa" required style="text-transform:uppercase"></div><div class="campo"><label for="taM">Moto</label><input id="taM" name="moto" placeholder="Marca y color"></div></div><div class="row2"><div class="campo"><label for="taC">Cliente</label><input id="taC" name="cli" required></div><div class="campo"><label for="taT">Celular</label><input id="taT" name="cel" inputmode="tel"></div></div><div class="campo"><label for="taF">¿Qué tiene la moto?</label><input id="taF" name="falla" required></div><button class="btn b-sol" type="submit">' + ic('plus') + 'Crear orden</button></form>' +
      '<form class="box stack" data-form="ta-buscar"><h3 style="margin:0">' + ic('history') + 'Historial por placa</h3><div class="inline"><input name="q" value="' + esc(placaBus) + '" placeholder="HTL12A" style="text-transform:uppercase" aria-label="Placa"><button class="btn b-sm" type="submit">' + ic('search') + 'Buscar</button></div>' +
      (placaBus ? (hist.length ? hist.map(o => '<div class="kv"><span>' + esc(o.f) + ' · ' + esc(o.falla) + ' (' + esc(o.estado) + ')</span><b class="num">' + pesos(totalO(o)) + '</b></div>').join('') : '<p class="muted">Esa placa no tiene órdenes.</p>') : '') + '</form>';
  }
  const orden = id => LM.NEG(ses().t).ordenes.find(o => o.id === +id);
  LM.F['ta-nueva'] = (f, d) => { const N = LM.NEG(ses().t); const id = Math.max(100, ...N.ordenes.map(o => o.id)) + 1; N.ordenes.unshift({ id, placa: String(d.get('placa')).toUpperCase().replace(/\s/g, ''), moto: d.get('moto'), cli: d.get('cli'), cel: d.get('cel'), falla: d.get('falla'), estado: 'recibida', rep: [], mo: 0, f: 'Hoy' }); LM.save(); LM.rerender(); toast('Orden #' + id + ' creada'); };
  LM.A['ta-paso'] = el => { const o = orden(el.dataset.id), i = PASOS_T.findIndex(p => p[0] === o.estado); o.estado = PASOS_T[Math.min(i + 1, 3)][0]; LM.save(); LM.rerender(); };
  LM.F['ta-rep'] = (f, d) => { const o = orden(f.dataset.id), p = LM.PR(d.get('p')); const r = o.rep.find(x => x.id === p.id); if (r) r.q++; else o.rep.push({ id: p.id, n: p.n, q: 1, p: p.p }); p.stock = Math.max(0, p.stock - 1); LM.save(); LM.rerender(); };
  LM.F['ta-mo'] = (f, d) => { orden(f.dataset.id).mo = +d.get('mo') || 0; LM.save(); LM.rerender(); };
  LM.F['ta-entregar'] = (f, d) => { const t = LM.T(ses().t), o = orden(f.dataset.id); const tot = o.rep.reduce((a, r) => a + r.p * r.q, 0) + (+o.mo || 0); vender(t, 'Orden #' + o.id + ' · moto ' + o.placa, tot, d.get('m')); o.estado = 'entregada'; LM.save(); LM.rerender(); toast('Moto entregada. ' + pesos(tot) + ' en la caja.'); };
  LM.F['ta-buscar'] = (f, d) => { placaBus = String(d.get('q') || '').toUpperCase().replace(/\s/g, ''); LM.rerender(); };

  /* ======================= 4. ROPA Y CALZADO: tallas y apartados ======================= */
  const TALLAS = { Calzado: ['34', '36', '38', '40', '42', '44'], Niños: ['6', '8', '10', '12', '14', '16'], def: ['S', 'M', 'L', 'XL'] };
  function iniRopa(t, N) {
    if (!N.tallas) { N.tallas = {}; prodsDe(t).forEach(p => { N.tallas[p.id] = {}; (TALLAS[p.sub] || TALLAS.def).forEach((x, i) => N.tallas[p.id][x] = Math.max(0, Math.round(p.stock / 4) - (i % 3))); }); }
    if (!N.apartados) N.apartados = [{ id: 1, cli: 'Rosa Pacheco', cel: '3156007788', pid: 'vestido', talla: 'M', precio: 65000, abonos: [{ v: 20000, f: '1 nov.' }], vence: Date.now() + 25 * 864e5, estado: 'activo' }];
  }
  function pApartados(t, N) {
    iniRopa(t, N);
    const ps = prodsDe(t);
    const ab = a => a.abonos.reduce((s, x) => s + x.v, 0);
    return LM.head('Tallas y apartados', 'Cuántas hay de cada talla, y los apartados con sus abonos.') +
      LM.ayuda('¿Cómo funciona un apartado?', ['El cliente escoge la prenda y la talla, y deja un abono.', 'Esa prenda se separa: ya no se vende a otro.', 'Cada vez que traiga plata, presiona <b>ABONAR</b>.', 'Cuando complete, presiona <b>ENTREGAR</b>. Si pasan 30 días sin completar, puedes liberarla.']) +
      '<div class="box"><h3>Apartados</h3>' + (N.apartados.filter(a => a.estado === 'activo').map(a => { const p = LM.PR(a.pid) || { n: '?' }, sal = a.precio - ab(a), dias = Math.ceil((a.vence - Date.now()) / 864e5); return '<div class="lm-apartado"><div><b>' + esc(a.cli) + '</b><small>' + esc(p.n) + ' · talla ' + esc(a.talla) + ' · ' + (dias > 0 ? 'vence en ' + dias + ' días' : '<span class="err">venció</span>') + '</small><small>Abonó ' + pesos(ab(a)) + ' de ' + pesos(a.precio) + '</small><div class="meter"><i style="width:' + Math.min(100, ab(a) / a.precio * 100) + '%"></i></div></div><div class="stack" style="gap:6px"><b class="num">Debe ' + pesos(sal) + '</b>' +
        (sal > 0 ? '<form class="inline" data-form="ap-abono" data-id="' + a.id + '"><input name="v" type="number" min="1000" step="1000" value="' + Math.min(sal, 10000) + '" style="max-width:110px" aria-label="Valor del abono"><button class="btn b-sm b-sol" type="submit">ABONAR</button></form>' : '<button class="btn b-sm b-monte" type="button" data-act="ap-entregar" data-id="' + a.id + '">' + ic('check') + 'ENTREGAR</button>') +
        (dias <= 0 && sal > 0 ? '<button class="btn b-sm b-rojo" type="button" data-act="ap-liberar" data-id="' + a.id + '">Liberar la prenda</button>' : '') + '</div></div>'; }).join('') || '<p class="muted">No hay apartados activos.</p>') + '</div>' +
      '<form class="box stack" data-form="ap-nuevo"><h3 style="margin:0">Nuevo apartado</h3><div class="row2"><div class="campo"><label for="apP">Prenda</label><select id="apP" name="pid">' + ps.map(p => '<option value="' + p.id + '">' + esc(p.n) + ' · ' + pesos(p.p) + '</option>').join('') + '</select></div><div class="campo"><label for="apT">Talla</label><input id="apT" name="talla" required placeholder="M, 38, 10…"></div></div><div class="row2"><div class="campo"><label for="apC">Cliente</label><input id="apC" name="cli" required></div><div class="campo"><label for="apA">Primer abono</label><input id="apA" name="v" type="number" min="0" step="1000" required></div></div><div class="campo"><label for="apN">Celular</label><input id="apN" name="cel" inputmode="tel"></div><button class="btn b-sol" type="submit">' + ic('plus') + 'Apartar</button></form>' +
      '<div class="box"><h3>Inventario por talla</h3><div class="tbl-w"><table class="tbl"><thead><tr><th>Prenda</th><th>Tallas (toca para cambiar)</th></tr></thead><tbody>' + ps.map(p => '<tr><td><b>' + esc(p.n) + '</b></td><td class="lm-tallas">' + Object.keys(N.tallas[p.id] || {}).map(x => '<label><span>' + esc(x) + '</span><input type="number" min="0" value="' + N.tallas[p.id][x] + '" data-chg="ap-talla" data-id="' + p.id + '" data-t="' + esc(x) + '" aria-label="' + esc(p.n) + ' talla ' + esc(x) + '"></label>').join('') + '</td></tr>').join('') + '</tbody></table></div></div>';
  }
  const apart = id => LM.NEG(ses().t).apartados.find(a => a.id === +id);
  LM.F['ap-nuevo'] = (f, d) => { const t = LM.T(ses().t), N = LM.NEG(t.id), p = LM.PR(d.get('pid')), v = +d.get('v') || 0; const tl = String(d.get('talla')).toUpperCase(); if (N.tallas[p.id] && N.tallas[p.id][tl] != null) N.tallas[p.id][tl] = Math.max(0, N.tallas[p.id][tl] - 1); N.apartados.push({ id: Date.now(), cli: d.get('cli'), cel: d.get('cel'), pid: p.id, talla: tl, precio: p.p, abonos: v ? [{ v, f: 'Hoy' }] : [], vence: Date.now() + 30 * 864e5, estado: 'activo' }); if (v) vender(t, 'Abono apartado ' + p.n + ' · ' + d.get('cli'), v); LM.save(); LM.rerender(); toast('Prenda apartada'); };
  LM.F['ap-abono'] = (f, d) => { const t = LM.T(ses().t), a = apart(f.dataset.id), v = +d.get('v') || 0; a.abonos.push({ v, f: 'Hoy' }); vender(t, 'Abono apartado · ' + a.cli, v); LM.save(); LM.rerender(); toast('Abono anotado: ' + pesos(v)); };
  LM.A['ap-entregar'] = el => { apart(el.dataset.id).estado = 'entregado'; LM.save(); LM.rerender(); toast('Prenda entregada'); };
  LM.A['ap-liberar'] = el => { const N = LM.NEG(ses().t), a = apart(el.dataset.id); a.estado = 'liberado'; if (N.tallas[a.pid] && N.tallas[a.pid][a.talla] != null) N.tallas[a.pid][a.talla]++; LM.save(); LM.rerender(); toast('La prenda volvió a la venta'); };
  document.addEventListener('change', e => { const el = e.target; if (el.dataset.chg !== 'ap-talla') return; const N = LM.NEG(ses().t); N.tallas[el.dataset.id][el.dataset.t] = Math.max(0, +el.value || 0); const p = LM.PR(el.dataset.id); p.stock = Object.values(N.tallas[p.id]).reduce((a, b) => a + b, 0); LM.save(); toast('Talla actualizada'); });

  /* ======================= 5. AGRO Y VETERINARIA: lotes, vencimientos y granel ======================= */
  const diasA = f => Math.ceil((new Date(f + 'T23:59:59') - Date.now()) / 864e5);
  const enDias = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  function iniAgro(t, N) {
    if (!N.lotes) N.lotes = [{ id: 1, pid: 'purgante', lote: 'PG-2611', vence: enDias(20), c: 6 }, { id: 2, pid: 'purgante', lote: 'PG-2702', vence: enDias(200), c: 9 }, { id: 3, pid: 'semilla', lote: 'SM-0926', vence: enDias(-3), c: 2 }, { id: 4, pid: 'concentrado', lote: 'CP-1107', vence: enDias(75), c: 10 }];
  }
  function pLotes(t, N) {
    iniAgro(t, N);
    const ps = prodsDe(t), ls = N.lotes.filter(l => l.c > 0).sort((a, b) => a.vence.localeCompare(b.vence));
    const gr = ps.filter(p => /\d+\s*kg/i.test(p.n));
    return LM.head('Lotes y vencimientos', 'Vende primero lo que vence primero. Aquí ves qué está por vencerse.') +
      LM.ayuda('¿Cómo uso los lotes?', ['Cuando llegue mercancía, anota el <b>lote</b> y la <b>fecha de vencimiento</b> que trae la caja.', 'La lista se ordena sola: lo de arriba es lo que se vence primero.', 'Rojo: ya venció, no lo vendas. Naranja: vence en menos de 30 días.', 'Para vender por kilo un bulto, usa <b>Venta a granel</b>.']) +
      '<div class="box"><h3>Inventario por lote</h3>' + (ls.map(l => { const p = LM.PR(l.pid) || { n: '?' }, dd = diasA(l.vence); return '<div class="lm-lote ' + (dd < 0 ? 'vencido' : dd <= 30 ? 'pronto' : '') + '"><div><b>' + esc(p.n) + '</b><small>Lote ' + esc(l.lote) + ' · ' + l.c + ' und</small></div><span class="pill ' + (dd < 0 ? 'p-no' : dd <= 30 ? 'p-warn' : 'p-ok') + '">' + (dd < 0 ? 'VENCIDO · no vender' : 'Vence en ' + dd + ' días') + '</span><button class="btn b-sm" type="button" data-act="lo-menos" data-id="' + l.id + '">' + ic('minus') + 'Vendí 1</button></div>'; }).join('') || '<p class="muted">No hay lotes anotados.</p>') + '</div>' +
      '<form class="box stack" data-form="lo-nuevo"><h3 style="margin:0">Llegó mercancía</h3><div class="row2"><div class="campo"><label for="loP">Producto</label><select id="loP" name="pid">' + ps.map(p => '<option value="' + p.id + '">' + esc(p.n) + '</option>').join('') + '</select></div><div class="campo"><label for="loL">Lote</label><input id="loL" name="lote" required></div></div><div class="row2"><div class="campo"><label for="loV">Vence</label><input id="loV" name="vence" type="date" required></div><div class="campo"><label for="loC">Cantidad</label><input id="loC" name="c" type="number" min="1" value="1" required></div></div><button class="btn b-sol" type="submit">' + ic('plus') + 'Anotar lote</button></form>' +
      (gr.length ? '<form class="box stack" data-form="lo-granel"><h3 style="margin:0">' + ic('saco') + 'Venta a granel (por kilo)</h3><div class="row2"><div class="campo"><label for="grP">Bulto</label><select id="grP" name="pid">' + gr.map(p => { const kg = +(/(\d+)\s*kg/i.exec(p.n)[1]); return '<option value="' + p.id + '">' + esc(p.n) + ' · ' + pesos(redondear(p.p / kg * 1.1)) + ' el kilo</option>'; }).join('') + '</select><small>El kilo suelto sale 10 % más caro que comprar el bulto.</small></div><div class="campo"><label for="grK">Kilos</label><input id="grK" name="kg" type="number" min="0.5" step="0.5" value="2" required></div></div><div class="inline">' + pagoSel() + '<button class="btn b-monte" type="submit">' + ic('cash') + 'Vender</button></div></form>' : '');
  }
  LM.F['lo-nuevo'] = (f, d) => { const N = LM.NEG(ses().t), p = LM.PR(d.get('pid')); N.lotes.push({ id: Date.now(), pid: p.id, lote: String(d.get('lote')).toUpperCase(), vence: d.get('vence'), c: +d.get('c') || 1 }); p.stock += +d.get('c') || 1; LM.save(); LM.rerender(); toast('Lote anotado'); };
  LM.A['lo-menos'] = el => { const t = LM.T(ses().t), N = LM.NEG(t.id), l = N.lotes.find(x => x.id === +el.dataset.id), p = LM.PR(l.pid); if (diasA(l.vence) < 0) { toast('Ese lote está vencido: no se vende.'); return; } l.c--; p.stock = Math.max(0, p.stock - 1); vender(t, p.n + ' (lote ' + l.lote + ')', LM.precio(p).p); LM.save(); LM.rerender(); toast('Venta anotada'); };
  LM.F['lo-granel'] = (f, d) => { const t = LM.T(ses().t), p = LM.PR(d.get('pid')), kg = +d.get('kg'); const bulto = +(/(\d+)\s*kg/i.exec(p.n)[1]); const v = redondear(p.p / bulto * 1.1 * kg); vender(t, p.n + ' a granel · ' + kg + ' kg', v, d.get('m')); LM.save(); LM.rerender(); toast('Vendidos ' + kg + ' kg: ' + pesos(v)); };

  LM.iniTipo = t => { const N = LM.NEG(t.id); if (t.cat === 'ropa') iniRopa(t, N); if (t.cat === 'agro') iniAgro(t, N); }; // para el punto de venta
  Object.assign(LM.EXT.panelFn, { mesas: pMesas, turnos: pTurnos, ordenes: pOrdenes, apartados: pApartados, lotes: pLotes });
  ['mesas', 'turnos', 'ordenes', 'apartados', 'lotes'].forEach(k => LM.EXT.panelFn[k].cajero = true);

  // Cuentas de prueba de los negocios nuevos en la ventana de entrada
  // Las cuentas de prueba de los 5 negocios nuevos están como botones en la ventana de entrada (js/app.js)
})();
