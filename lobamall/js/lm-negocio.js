/* LobaMall v7 · Integración NEGOCIO ↔ REPARTIDOR ↔ CLIENTE
   - Botón [NECESITO REPARTIDOR] en los pedidos a domicilio
   - Sección "Domicilios" del panel: ofertas, vencidas (reintentar / subir valor / cancelar),
     caja de los repartidores y pagos Nequi por confirmar
   - Seguimiento real del domicilio para el cliente (repartidor, mapa, foto de entrega, calificación) */
(function () {
  'use strict';
  const LM = window.LM, API = LM.api;
  const { esc, ic, pesos, toast, sheet, closeModal } = LM;
  const D = { cache: {}, cargando: {}, err: {} };
  const ESTADO = { abierta: ['Buscando repartidor', 'p-warn'], aceptada: ['Repartidor asignado', 'p-curso'], recogida: ['Recogido', 'p-curso'], en_camino: ['En camino', 'p-curso'], entregada: ['Entregado', 'p-ok'], vencida: ['Nadie lo tomó', 'p-no'], cancelada: ['Cancelado', 'p-gris'] };
  const pill = e => { const x = ESTADO[e] || [e, 'p-gris']; return '<span class="pill ' + x[1] + '">' + esc(x[0]) + '</span>'; };
  const enSeccion = () => (location.hash || '').slice(1) === 'panel-domicilios';
  const ses = () => LM.S.session;
  const conectadoNeg = tid => API.disponible && API.yo && API.esDeNegocio(tid);

  /* ---------------- datos del servidor ---------------- */
  async function cargar(tid) {
    if (D.cargando[tid]) return;
    D.cargando[tid] = true; D.err[tid] = '';
    try {
      const [o, c, p] = await Promise.all([API.get('/api/negocio/' + tid + '/ofertas'), API.get('/api/negocio/' + tid + '/caja'), API.get('/api/negocio/' + tid + '/pagos')]);
      D.cache[tid] = { ofertas: o.ofertas, caja: c, pagos: p.pagos, ts: Date.now() };
      sincronizar(o.ofertas);
      await importarPedidos(tid);
    } catch (e) { D.err[tid] = e.message; }
    D.cargando[tid] = false;
    if (enSeccion() || /^panel/.test((location.hash || '').slice(1))) LM.rerender();
  }
  const refrescar = tid => { delete D.cache[tid]; return cargar(tid); };

  // Pedidos hechos por clientes en OTROS celulares (llegan por el servidor) aparecen en el panel
  async function importarPedidos(tid) {
    try {
      const { pedidos } = await API.get('/api/negocio/' + tid + '/pedidos');
      const S = LM.S; let nuevos = 0;
      pedidos.filter(p => p.origen === 'lobamall' && p.cliente_id).forEach(p => {
        if (S.orders.some(o => o.srv === p.id) || ['cancelado'].includes(p.estado)) return;
        const ya = S.orders.find(o => o.t === tid && o.n === p.numero && !o.srv);
        if (ya) { ya.srv = p.id; return; }
        const zl = { hatillo: 'cabecera', chimi: 'chimi', sanmartin: 'sanmartin', barranco: 'barranco' }[p.zona_id] || 'cabecera';
        const num = p.numero && !S.orders.some(o => o.n === p.numero) ? p.numero : S.nPed++; S.nPed = Math.max(S.nPed, num + 1);
        S.orders.push({ n: num, srv: p.id, cli: 'srv:' + p.cliente_id, cliN: p.cliente_nombre, t: tid, items: p.items.map(i => ({ id: LM.PR(i.id) ? i.id : (LM.S.prods.find(x => x.t === tid) || {}).id, q: i.q, p: i.p })), modo: p.modo, zona: zl, dir: p.direccion || '', pago: p.pago, sub: p.subtotal, desc: p.descuento, env: p.domicilio, total: p.total, ts: Date.parse(p.creado), te: Date.now(), e: 0, chat: [], fecha: 'Hoy, ' + LM.hora(p.creado), hold: true, personas: 2, hora: '' });
        nuevos++;
      });
      if (nuevos) { LM.save(); toast(nuevos === 1 ? 'Llegó un pedido nuevo por LobaMall' : 'Llegaron ' + nuevos + ' pedidos nuevos'); }
    } catch (e) {}
  }

  // El estado del domicilio en el servidor mueve el pedido en el panel (En camino → Entregado)
  function sincronizar(ofertas) {
    let cambio = false;
    (ofertas || []).forEach(of => { if (aplicarEstado(of.pedido_id, of.estado, of.id)) cambio = true; });
    if (cambio) LM.save();
  }
  function aplicarEstado(pedidoId, estado, ofertaId) {
    const o = LM.S.orders.find(x => x.srv === pedidoId); if (!o) return false;
    const ps = LM.pasos(o), idx = n => ps.findIndex(p => p[0] === n);
    let meta = null;
    if (estado === 'recogida' || estado === 'en_camino') meta = idx('En camino');
    if (estado === 'entregada') meta = LM.fin(o);
    if (ofertaId && !o.srvDom) o.srvDom = ofertaId;
    if (estado === 'cancelada' && o.srvDom) { o.srvDom = null; return true; }
    if (meta == null || meta < 0) return false;
    let n = 0; while (o.e < meta && n++ < 6) LM.avanzar(o, 'dueno');
    return n > 0;
  }

  /* ---------------- botón [NECESITO REPARTIDOR] ---------------- */
  LM.EXT.btnRep = o => {
    const s = ses(); if (!s || !s.t) return '';
    if (o.srvDom) {
      const c = D.cache[o.t], of = c && c.ofertas.find(x => x.id === o.srvDom);
      return of ? pill(of.estado) + (of.estado === 'vencida' ? '<button class="btn b-sm b-rojo" type="button" data-act="go" data-h="panel-domicilios">' + ic('alert') + 'Reintentar</button>' : '') : '<span class="pill p-curso">' + ic('moto') + 'Domicilio publicado</span>';
    }
    return '<button class="btn b-sm b-sol lm-nec" type="button" data-act="neg-rep" data-n="' + o.n + '">' + ic('moto') + 'NECESITO REPARTIDOR</button>';
  };

  async function zonasSrv() { await API.cargarZonas(); return API.zonas; }
  LM.A['neg-rep'] = async el => {
    const s = ses(), o = LM.S.orders.find(x => x.n === +el.dataset.n && x.t === s.t);
    if (!o) return;
    if (!conectadoNeg(s.t)) return avisoSinServidor();
    const zs = await zonasSrv(), zid = LM.zonaSrv(o.zona), z = zs.find(x => x.id === zid) || { tarifa: 4000, nombre: zid };
    sheet('<div class="sh-h"><div class="tt"><small>Pedido #' + o.n + ' · ' + esc(o.cliN || o.cli) + '</small><h3>Pedir un repartidor</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<form class="sh-b stack lm-form" data-form="neg-rep" data-n="' + o.n + '"><div class="lm-resumen"><p>' + ic('pin') + '<b>' + esc(o.dir || 'Sin dirección') + '</b> · ' + esc(z.nombre) + '</p><p>' + ic('bolsa') + esc(o.items.map(i => i.q + ' ' + ((LM.PR(i.id) || {}).n || i.id)).join(', ')) + '</p><p>' + ic('cash') + 'Pago: ' + esc(LM.PAGO[o.pago] || o.pago) + ' · Total ' + pesos(o.total) + '</p></div>' +
      '<div class="campo"><label for="nrV">Valor del domicilio para el repartidor</label><input id="nrV" name="v" type="number" min="' + z.tarifa + '" step="500" value="' + z.tarifa + '"><small>Tarifa de ' + esc(z.nombre) + ': ' + pesos(z.tarifa) + '. Si lo subes, lo toman más rápido (la diferencia la pone el negocio).</small></div>' +
      '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('moto') + 'PUBLICAR DOMICILIO</button><p class="muted">Les llega al instante a los repartidores conectados de la zona. Si nadie lo toma, te avisamos para reintentar.</p></form>');
  };
  LM.F['neg-rep'] = async (f, d) => {
    const s = ses(), o = LM.S.orders.find(x => x.n === +f.dataset.n && x.t === s.t);
    const body = { valor: +d.get('v') };
    if (o.srv) body.pedido_id = o.srv;
    else body.pedido = { numero: o.n, cliente_nombre: o.cliN || o.cli, items: o.items.map(i => ({ id: i.id, n: (LM.PR(i.id) || {}).n || i.id, q: i.q, p: i.p })), descuento: o.desc || 0, domicilio: o.env, zona_id: LM.zonaSrv(o.zona), direccion: o.dir, pago: LM.pagoSrv(o.pago), origen: o.directo ? 'directo' : 'lobamall' };
    try {
      const r = await API.post('/api/negocio/' + s.t + '/ofertas', body);
      o.srv = r.pedido_id; o.srvDom = r.oferta.id; LM.save(); closeModal();
      toast(r.avisados ? 'Publicado. Se les avisó a ' + r.avisados + ' repartidor(es) conectados.' : 'Publicado. Ahora no hay repartidores conectados en esa zona; queda en la cartelera.');
      refrescar(s.t);
    } catch (e) { toast(e.message); }
  };
  function avisoSinServidor() {
    sheet('<div class="sh-h"><div class="tt"><h3>Falta conectar el servidor</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><div class="sh-b stack">' +
      (API.disponible ? '<p class="lm-grande">Tu negocio todavía no tiene cuenta en el servidor de LobaMall, o no has entrado con ella.</p><form class="stack" data-form="neg-entrar"><div class="campo"><label for="neU">Usuario del negocio</label><input id="neU" name="u" value="' + esc(ses().u) + '" required></div><div class="campo"><label for="neP">Clave</label><input id="neP" name="p" type="password" required></div><button class="btn b-sol" type="submit">' + ic('lock') + 'Conectar</button></form>'
        : '<p class="lm-grande">Los repartidores necesitan la app publicada con su servidor. Mira la guía de despliegue.</p>') + '</div>');
  }
  LM.F['neg-entrar'] = async (f, d) => { try { await API.entrar(String(d.get('u')), String(d.get('p'))); closeModal(); toast('Negocio conectado'); LM.rerender(); } catch (e) { toast(e.message); } };

  /* ---------------- sección "Domicilios" del panel ---------------- */
  function pDomicilios(t, N, ords) {
    const head = LM.head('Domicilios con repartidor', 'Pide un repartidor, mira quién lo lleva y cuadra la caja con cada uno.');
    if (API.disponible === false) return head + '<div class="aviso warn">' + ic('wifioff') + '<span>Esta sección necesita el servidor de LobaMall (la app publicada con base de datos).</span></div>';
    if (!conectadoNeg(t.id)) return head + '<div class="box stack"><p>Para pedir repartidores, conecta tu negocio con el servidor.</p><button class="btn b-sol" type="button" data-act="neg-conectar">' + ic('lock') + 'Conectar mi negocio</button></div>';
    const c = D.cache[t.id];
    if (!c) { cargar(t.id); return head + '<div class="box"><div class="lm-spin"></div> Cargando…</div>'; }
    const pend = ords.filter(o => o.modo === 'domicilio' && o.e >= 1 && o.e < LM.fin(o) && !o.rech && !o.srvDom);
    const activas = c.ofertas.filter(o => !['entregada', 'cancelada'].includes(o.estado));
    const cerradas = c.ofertas.filter(o => ['entregada', 'cancelada'].includes(o.estado)).slice(0, 8);
    return head + (D.err[t.id] ? '<div class="aviso warn">' + ic('alert') + '<span>' + esc(D.err[t.id]) + '</span></div>' : '') +
      LM.ayuda('¿Cómo pido un repartidor?', ['Acepta el pedido como siempre.', 'Presiona <b>NECESITO REPARTIDOR</b> en el pedido.', 'Les llega a los repartidores conectados. El primero que acepte se lo lleva.', 'Si en ' + '10 minutos nadie lo toma, te avisamos: puedes reintentar, subir el valor o cancelar.', 'Si el pago fue en efectivo, el repartidor te entrega la plata del producto. Anótalo en "Caja de repartidores".']) +
      '<div class="box"><h3>Pedidos a domicilio que esperan repartidor</h3>' + (pend.length ? pend.map(o => '<div class="lm-fila"><div><b>#' + o.n + ' · ' + esc(o.cliN || o.cli) + '</b><small>' + esc(o.dir) + ' · ' + pesos(o.total) + ' · ' + esc(LM.PAGO[o.pago] || o.pago) + '</small></div>' + LM.EXT.btnRep(o) + '</div>').join('') : '<p class="muted">No hay pedidos esperando. Cuando aceptes un pedido a domicilio, aparece aquí.</p>') + '</div>' +
      '<div class="box"><h3>Domicilios publicados <button class="link" type="button" data-act="neg-recargar">Actualizar</button></h3>' + (activas.length ? activas.map(ofertaH).join('') : '<p class="muted">No hay domicilios activos.</p>') +
      (cerradas.length ? '<details><summary>Ver los últimos cerrados</summary>' + cerradas.map(ofertaH).join('') + '</details>' : '') + '</div>' +
      '<div class="g2">' + cajaH(c.caja) + pagosH(c.pagos) + '</div>' + directoH(t);
  }
  function ofertaH(o) {
    const min = Math.max(0, Math.round((new Date(o.vence_en) - Date.now()) / 60000));
    const r = o.repartidor;
    let acts = '';
    if (o.estado === 'vencida') acts = '<button class="btn b-sm b-sol" type="button" data-act="neg-reint" data-id="' + o.id + '" data-v="' + o.valor + '">' + ic('repeat') + 'Reintentar</button><button class="btn b-sm" type="button" data-act="neg-subir" data-id="' + o.id + '" data-v="' + o.valor + '">' + ic('plus') + 'Subir valor</button>';
    if (o.estado === 'abierta') acts = '<button class="btn b-sm" type="button" data-act="neg-subir" data-id="' + o.id + '" data-v="' + o.valor + '">' + ic('plus') + 'Subir valor</button>';
    if (!['entregada', 'cancelada'].includes(o.estado)) acts += '<button class="btn b-sm b-rojo" type="button" data-act="neg-cancel" data-id="' + o.id + '" data-e="' + o.estado + '">' + ic('x') + 'Cancelar</button>';
    return '<div class="lm-of-neg"><div class="lm-of-h"><b>#' + (o.numero || o.pedido_id) + ' · ' + esc(o.valor_txt) + '</b>' + pill(o.estado) + '</div><small>' + esc(o.destino) + ' · ' + esc(o.distancia_txt) + '</small>' +
      (o.estado === 'abierta' ? '<small>' + ic('clock') + 'Vence en ' + min + ' min (intento ' + o.intento + ')</small>' : '') +
      (o.estado === 'vencida' ? '<div class="aviso warn">' + ic('alert') + '<span>Nadie lo tomó a tiempo. Puedes reintentar, subir el valor o cancelar.</span></div>' : '') +
      (r ? '<div class="lm-rep-mini">' + ic('moto') + '<span><b>' + esc(r.nombre_completo) + '</b> · ' + esc(r.moto_marca) + ' ' + esc(r.moto_color) + ' · placa <b>' + esc(r.placa) + '</b></span><a class="btn b-sm" href="tel:' + esc(r.telefono) + '">' + ic('phone') + 'Llamar</a></div>' : '') +
      (o.motivo_cancelacion ? '<small>Motivo: ' + esc(o.motivo_cancelacion) + '</small>' : '') + (acts ? '<div class="quick">' + acts + '</div>' : '') + '</div>';
  }
  function cajaH(c) {
    const s = c.saldos || [];
    return '<div class="box"><h3>' + ic('cash') + 'Caja de repartidores</h3>' + (s.length ? s.map(x => '<div class="lm-fila"><div><b>' + esc(x.nombre_completo) + '</b><small>Placa ' + esc(x.placa) + '</small></div><div class="lm-saldo">' +
      (x.saldo > 0 ? '<span class="debe">Te debe <b class="num">' + pesos(x.saldo) + '</b></span><button class="btn b-sm b-monte" type="button" data-act="neg-liq" data-r="' + x.repartidor_id + '" data-t="recibi" data-v="' + x.saldo + '" data-n="' + esc(x.nombre_completo) + '">' + ic('check') + 'Recibí la plata</button>'
        : x.saldo < 0 ? '<span class="ok">Le debes <b class="num">' + pesos(-x.saldo) + '</b></span><button class="btn b-sm" type="button" data-act="neg-liq" data-r="' + x.repartidor_id + '" data-t="pague" data-v="' + (-x.saldo) + '" data-n="' + esc(x.nombre_completo) + '">' + ic('check') + 'Ya le pagué</button>' : '<span class="muted">A paz y salvo</span>') + '</div></div>').join('') : '<p class="muted">Todavía no hay movimientos con repartidores.</p>') +
      '<p class="muted" style="font-size:14px">Efectivo: el repartidor cobra producto + domicilio, se queda su domicilio y te entrega el resto. Nequi o fiado: tú le pagas el domicilio.</p></div>';
  }
  function pagosH(p) {
    return '<div class="box"><h3>' + ic('cel') + 'Pagos Nequi por confirmar</h3>' + (p.length ? p.map(x => '<div class="lm-pago"><div><b>Pedido #' + x.numero + ' · ' + pesos(x.monto) + '</b><small>' + esc(x.cliente_nombre || '') + '</small></div>' + (x.comprobante_id ? '<a href="/api/archivos/' + x.comprobante_id + '" target="_blank" rel="noopener"><img class="lm-comp" src="/api/archivos/' + x.comprobante_id + '" alt="Comprobante"></a>' : '<small class="muted">El cliente aún no sube el comprobante</small>') +
      '<div class="quick"><button class="btn b-sm b-monte" type="button" data-act="neg-pago" data-id="' + x.id + '" data-a="confirmar">' + ic('check') + 'Sí me llegó</button><button class="btn b-sm b-rojo" type="button" data-act="neg-pago" data-id="' + x.id + '" data-a="rechazar">' + ic('x') + 'No me llegó</button></div></div>').join('') : '<p class="muted">No hay pagos pendientes. Revisa siempre en tu app de Nequi antes de confirmar.</p>') + '</div>';
  }
  function directoH(t) {
    return '<details class="box"><summary><b>' + ic('phone') + 'Domicilio de un pedido por WhatsApp, llamada o mostrador</b></summary><form class="stack lm-form" data-form="neg-directo" style="margin-top:12px"><p class="muted">Estos pedidos son <b>directos</b>: no pagan el 10 % de comisión.</p>' +
      '<div class="row2"><div class="campo"><label for="ndN">Cliente</label><input id="ndN" name="cli" required></div><div class="campo"><label for="ndT">Celular</label><input id="ndT" name="tel" inputmode="tel"></div></div>' +
      '<div class="campo"><label for="ndD">Dirección</label><input id="ndD" name="dir" required placeholder="Barrio, calle, color de la casa"></div>' +
      '<div class="row2"><div class="campo"><label for="ndZ">Zona</label><select id="ndZ" name="z">' + (API.zonas.length ? API.zonas : [{ id: 'hatillo', nombre: 'Hatillo cabecera' }]).map(z => '<option value="' + esc(z.id) + '">' + esc(z.nombre) + ' · ' + pesos(z.tarifa || 0) + '</option>').join('') + '</select></div><div class="campo"><label for="ndP">Pago</label><select id="ndP" name="pago"><option value="efectivo">Efectivo</option><option value="nequi">Nequi</option><option value="fiado">Fiado</option></select></div></div>' +
      '<div class="row2"><div class="campo"><label for="ndQ">Qué lleva</label><input id="ndQ" name="que" required placeholder="2 Asado Especial"></div><div class="campo"><label for="ndV">Valor de los productos</label><input id="ndV" name="val" type="number" min="0" required></div></div>' +
      '<button class="btn b-sol" type="submit">' + ic('moto') + 'NECESITO REPARTIDOR</button></form></details>';
  }

  LM.EXT.panelFn.domicilios = pDomicilios;
  const _items = LM.EXT.panelItems;
  LM.EXT.panelItems = (items, t, caj) => {
    items = _items(items, t, caj);
    if (LM.TIPOS && LM.TIPOS[t.cat] && LM.TIPOS[t.cat].sinDomicilio) return items;
    const i = items.findIndex(x => x[0] === 'pedidos');
    const c = D.cache[t.id], n = c ? c.ofertas.filter(o => o.estado === 'vencida').length : 0;
    items.splice(i + 1, 0, ['domicilios', 'moto', 'Domicilios', n || undefined]);
    return items;
  };
  LM.EXT.panelFn.domicilios.cajero = true;

  const A = LM.A, F = LM.F;
  A['neg-conectar'] = () => avisoSinServidor();
  A['neg-recargar'] = () => refrescar(ses().t);
  const subir = (id, valor, mensaje) => API.post('/api/negocio/' + ses().t + '/ofertas/' + id + '/reintentar', { valor }).then(() => { toast(mensaje); refrescar(ses().t); }).catch(e => toast(e.message));
  A['neg-reint'] = el => subir(el.dataset.id, +el.dataset.v, 'Publicado de nuevo. Les avisamos a los repartidores.');
  A['neg-subir'] = el => sheet('<div class="sh-h"><div class="tt"><h3>Subir el valor del domicilio</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><form class="sh-b stack" data-form="neg-subir" data-id="' + el.dataset.id + '"><div class="opts c2">' + [1000, 2000, 3000, 4000].map((x, i) => '<label class="opt"><input type="radio" name="s" value="' + x + '"' + (i ? '' : ' checked') + '><span><b>+ ' + pesos(x) + '</b><small>Queda en ' + pesos(+el.dataset.v + x) + '</small></span></label>').join('') + '</div><input type="hidden" name="v" value="' + el.dataset.v + '"><button class="btn b-sol lm-btn-xl" type="submit">' + ic('plus') + 'SUBIR Y PUBLICAR</button></form>');
  F['neg-subir'] = (f, d) => { closeModal(); subir(f.dataset.id, +d.get('v') + +d.get('s'), 'Valor subido y publicado de nuevo.'); };
  A['neg-cancel'] = el => sheet('<div class="sh-h"><div class="tt"><h3>Cancelar el domicilio</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><form class="sh-b stack" data-form="neg-cancel" data-id="' + el.dataset.id + '">' +
    (['recogida', 'en_camino'].includes(el.dataset.e) ? '<div class="aviso warn">' + ic('alert') + '<span>El repartidor ya tiene el pedido. Se le avisa que lo devuelva y <b>se le reconoce el domicilio</b> porque hizo el viaje.</span></div>' : el.dataset.e === 'aceptada' ? '<div class="aviso warn">' + ic('alert') + '<span>Ya hay un repartidor asignado. Se le avisa al instante que no vaya.</span></div>' : '') +
    '<div class="campo"><label for="ncM">Motivo</label><select id="ncM" name="m"><option>El cliente ya no lo quiere</option><option>No tenemos el producto</option><option>Lo llevamos nosotros mismos</option><option>Otro</option></select></div><button class="btn b-rojo lm-btn-xl" type="submit">' + ic('x') + 'CANCELAR DOMICILIO</button></form>');
  F['neg-cancel'] = async (f, d) => { try { await API.post('/api/negocio/' + ses().t + '/ofertas/' + f.dataset.id + '/cancelar', { motivo: String(d.get('m')) }); closeModal(); toast('Domicilio cancelado. Se les avisó al repartidor y al cliente.'); const o = LM.S.orders.find(x => x.srvDom === +f.dataset.id); if (o) { o.srvDom = null; LM.save(); } } catch (e) { toast(e.message); } refrescar(ses().t); };
  A['neg-liq'] = el => sheet('<div class="sh-h"><div class="tt"><small>' + esc(el.dataset.n) + '</small><h3>' + (el.dataset.t === 'recibi' ? 'Recibí plata del repartidor' : 'Le pagué al repartidor') + '</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><form class="sh-b stack" data-form="neg-liq" data-r="' + el.dataset.r + '" data-t="' + el.dataset.t + '"><div class="campo"><label for="nlV">Valor</label><input id="nlV" name="v" type="number" min="1" value="' + el.dataset.v + '" required></div><button class="btn b-monte lm-btn-xl" type="submit">' + ic('check') + 'ANOTAR</button></form>');
  F['neg-liq'] = async (f, d) => { try { await API.post('/api/negocio/' + ses().t + '/caja/liquidar', { repartidor_id: +f.dataset.r, tipo: f.dataset.t, monto: +d.get('v') }); closeModal(); toast('Anotado en la caja del repartidor'); } catch (e) { toast(e.message); } refrescar(ses().t); };
  A['neg-pago'] = async el => { try { await API.post('/api/negocio/' + ses().t + '/pagos/' + el.dataset.id + '/' + el.dataset.a); toast(el.dataset.a === 'confirmar' ? 'Pago confirmado. Se le avisó al cliente.' : 'Se le avisó al cliente que no llegó.'); } catch (e) { toast(e.message); } refrescar(ses().t); };
  F['neg-directo'] = async (f, d) => {
    const s = ses(), val = +d.get('val');
    try {
      const r = await API.post('/api/negocio/' + s.t + '/ofertas', { pedido: { cliente_nombre: d.get('cli'), cliente_tel: d.get('tel'), direccion: d.get('dir'), zona_id: d.get('z'), pago: d.get('pago'), origen: 'directo', items: [{ id: 'directo', n: String(d.get('que')), q: 1, p: val }] } });
      toast(r.avisados ? 'Publicado. Se les avisó a ' + r.avisados + ' repartidor(es).' : 'Publicado en la cartelera.'); f.reset(); refrescar(s.t);
    } catch (e) { toast(e.message); }
  };

  /* ---------------- el negocio acepta / prepara / rechaza: el cliente lo ve en su celular ---------------- */
  const PASO_SRV = { 'Pedido aceptado': 'aceptado', 'Mesa apartada': 'aceptado', 'Preparando': 'preparando', 'Listo para recoger': 'listo', 'Entregado': 'entregado', 'Atendido': 'entregado' };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act="o-acept"],[data-act="o-next"],[data-act="o-rech"]'); if (!el) return;
    const s = ses(); if (!s || !s.t || !API.disponible || !API.yo) return;
    const o = LM.S.orders.find(x => x.n === +el.dataset.n && x.t === s.t); if (!o || !o.srv) return;
    const estado = o.rech ? 'rechazado' : PASO_SRV[(LM.pasos(o)[o.e] || [])[0]];
    if (estado) API.post('/api/negocio/' + s.t + '/pedidos/' + o.srv + '/estado', { estado, motivo: o.rech || '' }).catch(() => {});
  });
  const PASO_LOCAL = { aceptado: ['Pedido aceptado', 'Mesa apartada'], preparando: ['Preparando'], listo: ['Listo para recoger'], entregado: ['Entregado', 'Atendido'] };
  API.on('pedido_estado', d => {
    const s = ses(); if (!s || s.rol !== 'cliente') return;
    const o = LM.S.orders.find(x => x.srv === d.pedido_id); if (!o) return;
    if (d.estado === 'rechazado') o.rech = d.texto;
    else { const meta = LM.pasos(o).findIndex(p => (PASO_LOCAL[d.estado] || []).includes(p[0])); let n = 0; while (meta >= 0 && o.e < meta && n++ < 6) LM.avanzar(o, 'negocio'); }
    LM.save(); toast('Pedido #' + o.n + ': ' + d.texto);
    if (document.getElementById('lmSeg') || /^cuenta/.test((location.hash || '').slice(1))) { if (document.getElementById('lmSeg')) LM.openOrder(o.n); else LM.rerender(); }
  });

  /* ---------------- tiempo real para el negocio y el cliente ---------------- */
  API.on('domicilio_estado', d => {
    const s = ses();
    if (s && s.t) { if (aplicarEstado(d.pedido_id, d.estado, d.oferta_id)) LM.save(); toast('Pedido #' + (d.numero || '') + ': ' + d.texto); refrescar(s.t); }
    else if (s && s.rol === 'cliente') { if (aplicarEstado(d.pedido_id, d.estado, d.oferta_id)) LM.save(); llenarSeguimiento(); if (/^cuenta/.test((location.hash || '').slice(1))) LM.rerender(); }
  });
  API.on('pedido_nuevo', () => { const s = ses(); if (s && s.t) { LM.sonar(); refrescar(s.t); } });
  API.on('notificacion', n => { const s = ses(); if (s && s.t && n && /^(oferta_vencida|domicilio_|comprobante|pedido_cancelado)/.test(n.tipo)) { if (n.tipo === 'oferta_vencida') LM.sonar('error'); refrescar(s.t); } });
  API.on('reconectado', () => { const s = ses(); if (s && s.t && conectadoNeg(s.t)) refrescar(s.t); });
  API.on('yo', () => { const s = ses(); if (s && s.t && conectadoNeg(s.t)) cargar(s.t); });

  /* ---------------- seguimiento real para el cliente ---------------- */
  let mapaSeg = null;
  LM.EXT.ordenCli = o => { setTimeout(llenarSeguimiento, 0); return '<div id="lmSeg" class="lm-seg" data-p="' + o.srv + '" data-n="' + o.n + '"><div class="lm-spin"></div> Buscando el estado del domicilio…</div>'; };
  async function llenarSeguimiento() {
    const el = document.getElementById('lmSeg'); if (!el || !API.disponible || !API.yo) return;
    let d;
    try { d = await API.get('/api/pedidos/' + el.dataset.p + '/seguimiento'); } catch (e) { el.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; return; }
    const o = LM.S.orders.find(x => x.n === +el.dataset.n), dom = d.domicilio, pe = d.pedido;
    if (o && dom) aplicarEstado(pe.id, dom.estado, dom.id);
    let h = '';
    if (!dom) h = '<div class="aviso">' + ic('clock') + '<span>El negocio está preparando tu pedido. Cuando llame a un repartidor, lo verás aquí.</span></div>';
    else if (dom.estado === 'abierta' || dom.estado === 'vencida') h = '<div class="aviso">' + ic('moto') + '<span><b>Buscando repartidor…</b> Apenas uno acepte, te mostramos quién es.</span></div>';
    else if (dom.estado === 'cancelada') h = '<div class="aviso warn">' + ic('alert') + '<span>El domicilio fue cancelado.</span></div>';
    else {
      h = '<div class="lm-rep-card">' + (dom.foto_id ? '<img src="/api/archivos/' + dom.foto_id + '" alt="Foto del repartidor">' : '<span class="lm-av">' + ic('moto') + '</span>') + '<div><b>' + esc(dom.nombre_completo) + '</b><span>' + esc(dom.moto_marca) + ' ' + esc(dom.moto_color) + ' · placa <b>' + esc(dom.placa) + '</b></span><span>' + (dom.promedio ? '★ ' + dom.promedio : 'Repartidor nuevo') + '</span></div>' + (dom.estado !== 'entregada' ? '<a class="btn b-sm" href="tel:' + esc(dom.repartidor_tel) + '">' + ic('phone') + 'Llamar</a>' : '') + '</div>' +
        '<p class="lm-grande">' + pill(dom.estado) + ' ' + ({ aceptada: 'Va a recoger tu pedido al negocio.', recogida: 'Ya recogió tu pedido.', en_camino: 'Va en camino a tu casa.', entregada: '¡Entregado!' }[dom.estado] || '') + '</p>';
      if (dom.estado !== 'entregada') h += '<div id="lmMapaSeg" class="lm-mapa"></div>';
      if (dom.evidencia_id) h += '<p><a href="/api/archivos/' + dom.evidencia_id + '" target="_blank" rel="noopener">' + ic('camera') + 'Ver la foto de entrega</a></p>';
    }
    // Nequi: subir el comprobante (registro manual; el negocio lo confirma)
    const pg = (d.pagos || []).find(x => x.metodo === 'nequi' || x.metodo === 'banco');
    if (pg) h += pg.estado === 'confirmado' ? '<div class="aviso ok">' + ic('check') + '<span>El negocio confirmó tu pago.</span></div>'
      : '<div class="box stack"><b>' + ic('cel') + 'Paga ' + pesos(pg.monto) + ' por Nequi al negocio y sube el pantallazo</b>' + (pg.comprobante_id ? '<small class="muted">Ya subiste un comprobante. El negocio lo está revisando.</small>' : '') + (pg.estado === 'rechazado' ? '<small class="err">El negocio dice que no le llegó. Revisa y sube otro.</small>' : '') + '<label class="btn b-sol">' + ic('camera') + (pg.comprobante_id ? 'Cambiar comprobante' : 'Subir comprobante') + '<input type="file" accept="image/*" data-chg="cli-comp" data-p="' + pe.id + '" hidden></label></div>';
    // Calificación del negocio y del repartidor
    if (pe.estado === 'entregado') {
      const ya = (d.calificaciones || []).map(c => c.objetivo_tipo);
      if (ya.length) h += '<div class="aviso ok">' + ic('star', 'fill') + '<span>Gracias por calificar.</span></div>';
      else h += '<form class="box stack" data-form="cli-cal" data-p="' + pe.id + '" data-n="' + el.dataset.n + '"><h3 style="margin:0">Califica tu pedido</h3>' + estrellas('neg', 'Al negocio') + (dom && dom.repartidor_id ? estrellas('rep', 'Al repartidor ' + esc((dom.nombre_completo || '').split(' ')[0])) : '') + '<div class="campo"><label for="ccT">Comentario (opcional)</label><input id="ccT" name="c"></div><button class="btn b-sol" type="submit">' + ic('star', 'fill') + 'Enviar calificación</button></form>';
    } else if (!dom || ['abierta', 'aceptada', 'vencida'].includes(dom.estado)) {
      if (pe.estado !== 'cancelado') h += '<button class="btn b-ghost" type="button" data-act="cli-cancel" data-p="' + pe.id + '">' + ic('x') + 'Cancelar mi pedido</button>';
    }
    el.innerHTML = h; LM.paint(el);
    const mEl = document.getElementById('lmMapaSeg');
    if (mEl && dom) mapaSeg = await LM.mapa(mEl, [{ lat: dom.origen_lat, lng: dom.origen_lng, tipo: 'negocio', txt: 'Negocio' }, { lat: dom.destino_lat, lng: dom.destino_lng, tipo: 'destino', txt: 'Tu casa' }, d.ubicacion ? { lat: d.ubicacion.lat, lng: d.ubicacion.lng, tipo: 'moto', txt: 'Repartidor' } : null]);
  }
  const estrellas = (k, t) => '<fieldset class="lm-est"><legend>' + t + '</legend>' + [1, 2, 3, 4, 5].map(v => '<label><input type="radio" name="' + k + '" value="' + v + '"' + (v === 5 ? ' checked' : '') + '><span aria-label="' + v + ' estrellas">★</span></label>').join('') + '</fieldset>';
  API.on('ubicacion', d => { if (mapaSeg && mapaSeg.moverMoto && document.getElementById('lmMapaSeg')) mapaSeg.moverMoto(d.lat, d.lng); });
  F['cli-cal'] = async (f, d) => {
    try {
      await API.post('/api/pedidos/' + f.dataset.p + '/calificar', { negocio: +d.get('neg'), repartidor: +d.get('rep') || null, comentario: String(d.get('c') || '') });
      const o = LM.S.orders.find(x => x.n === +f.dataset.n);
      if (o && !o.cal) { o.cal = { est: +d.get('neg'), txt: String(d.get('c') || '') || 'Sin comentario' }; LM.S.reviews.unshift({ t: o.t, pid: o.items[0].id, a: LM.S.user.nombre, est: o.cal.est, txt: o.cal.txt, f: 'Hoy' }); LM.save(); }
      toast('¡Gracias por calificar!'); LM.openOrder(+f.dataset.n);
    } catch (e) { toast(e.message); }
  };
  A['cli-cancel'] = async el => { try { await API.post('/api/pedidos/' + el.dataset.p + '/cancelar', { motivo: 'El cliente canceló desde la app' }); toast('Pedido cancelado'); llenarSeguimiento(); } catch (e) { toast(e.message); } };
  document.addEventListener('change', async e => {
    const el = e.target; if (el.dataset.chg !== 'cli-comp' || !el.files[0]) return;
    try { const foto = await LM.comprimir(el.files[0], 1000, 0.7); await API.post('/api/pedidos/' + el.dataset.p + '/comprobante', { foto }); toast('Comprobante enviado. El negocio lo confirma.'); } catch (x) { toast(x.message); }
    llenarSeguimiento();
  });
})();
