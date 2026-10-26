/* ============================================================
   MESA Y RUTA · asistente del chat
   Responde al instante preguntas sobre el pedido: estado, tiempo,
   pago, contenido, horario y reservas. Funciona sin internet porque
   razona con los datos del pedido que ya están en el teléfono.
   Si CONFIG.asistente.url apunta a la función en servidor
   (supabase/functions/asistente), usa un modelo de lenguaje con el
   mismo contexto y, si falla, vuelve al asistente local.
   Lo que no puede resolver solo (cambios, cancelaciones, reclamos)
   lo marca para que una persona del negocio responda.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG;
  const pesos = n => '$ ' + Math.round(n || 0).toLocaleString('es-CO');
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;]/g, ' ');
  const tiene = (t, ...pal) => pal.some(p => (' ' + t).includes(' ' + p));   // palabra que empieza así

  function minutosRestantes(p) {
    const t0 = new Date((p.historial.find(h => h.estado === 'confirmado') || p.historial[0] || { at: p.creado }).at);
    const trans = (Date.now() - t0) / 60000;
    const prep = C.domicilio.minutosPreparacion, ruta = p.modo === 'domicilio' ? (p.destino.min || 10) : 0;
    if (p.estado === 'entregado') return 0;
    if (p.estado === 'en_camino') return Math.max(3, Math.round(ruta - Math.max(0, trans - prep)));
    if (p.estado === 'listo') return p.modo === 'domicilio' ? ruta : 2;
    return Math.max(5, Math.round(prep + ruta - trans));
  }
  function frase(p) {
    const n = (window.N.NOMBRE_ESTADO[p.estado] || p.estado).toLowerCase();
    switch (p.estado) {
      case 'recibido': return `Su pedido ${p.codigo} fue recibido y el negocio lo está revisando para confirmarlo.`;
      case 'confirmado': return `Su pedido ${p.codigo} está confirmado y entra a la cocina en un momento.`;
      case 'preparando': return `Su pedido ${p.codigo} está en la cocina.`;
      case 'listo': return p.modo === 'domicilio' ? `Su pedido ${p.codigo} está listo y sale ya con el domiciliario.` : p.modo === 'recoger' ? `Su pedido ${p.codigo} está listo: puede pasar a recogerlo.` : `Su pedido ${p.codigo} está listo: en un momento se lo servimos en la mesa.`;
      case 'en_camino': return `Su pedido ${p.codigo} va en camino a ${p.destino.direccion}.`;
      case 'entregado': return `Su pedido ${p.codigo} figura como entregado. ¡Buen provecho!`;
      case 'cancelado': return `Su pedido ${p.codigo} fue cancelado. Si tiene dudas, escríbanos y una persona le responde.`;
      default: return `Su pedido está ${n}.`;
    }
  }

  function local(texto, p, ctx = {}) {
    const t = norm(texto);
    const nombre = ctx.nombre ? ctx.nombre.split(' ')[0] : '';
    if (!p) return { texto: 'Cuando haga un pedido, aquí le cuento en qué va, cuánto falta y cómo pagar.' };
    const min = minutosRestantes(p);
    if (tiene(t, 'persona', 'humano', 'asesor', 'alguien', 'encargado', 'administrador', 'dueno'))
      return { texto: 'Listo, le paso su mensaje a una persona del negocio. Le responde por aquí mismo.', persona: true };
    if (tiene(t, 'cancel', 'anular', 'cambiar', 'cambio de', 'quitar', 'agregar', 'anadir', 'equivoc', 'reclamo', 'queja', 'llego mal', 'esta frio', 'llego frio', 'falto', 'no llego'))
      return { texto: `Entendido. Los cambios, cancelaciones y reclamos los atiende una persona del negocio; ya le avisé con su mensaje.${p.estado === 'recibido' || p.estado === 'confirmado' ? ' Como su pedido aún no entra a la cocina, todavía se puede ajustar.' : ''}`, persona: true };
    if (tiene(t, 'horario', 'a que hora abren', 'a que hora cierran', 'abren', 'cierran', 'hasta que hora', 'donde quedan', 'direccion del'))
      return { texto: `${C.negocio.nombre}: ${C.negocio.horario}. Estamos en ${C.negocio.direccion}, ${C.negocio.municipio}.` };
    if (tiene(t, 'cuanto falta', 'cuanto se demora', 'demora', 'tarda', 'a que hora', 'cuando llega', 'cuando esta', 'tiempo', 'minutos', 'ya viene', 'falta'))
      return { texto: p.estado === 'entregado' ? frase(p) : `${frase(p)} Faltan unos ${min} minutos${p.modo === 'domicilio' ? ` para que llegue (la ruta es de ${String(p.destino.km).replace('.', ',')} km)` : ''}.` };
    if (tiene(t, 'estado', 'en que va', 'como va', 'ya esta', 'listo', 'avance', 'mi pedido va', 'que paso'))
      return { texto: `${frase(p)}${p.estado !== 'entregado' && p.estado !== 'cancelado' ? ` Tiempo estimado: unos ${min} minutos.` : ''}` };
    if (tiene(t, 'donde viene', 'domiciliario', 'ubicacion', 'direccion de entrega', 'mi direccion'))
      return { texto: p.modo === 'domicilio' ? `Lo llevamos a ${p.destino.direccion}${p.destino.indicaciones ? ' (' + p.destino.indicaciones + ')' : ''}. ${frase(p)} Si necesita cambiar la dirección, escríbalo y una persona lo confirma.` : 'Su pedido no es a domicilio: ' + (p.modo === 'local' ? `se lo servimos en la mesa${p.mesa ? ' ' + p.mesa : ''}.` : 'lo recoge en el local.') };
    if (tiene(t, 'pago', 'pagar', 'transfer', 'nequi', 'daviplata', 'bre-b', 'breb', 'llave', 'cuanto debo', 'cuanto es', 'total', 'cambio', 'devuelta', 'vueltas', 'tarjeta', 'datafono'))
      return { texto: textoPago(p) };
    if (tiene(t, 'que pedi', 'mi orden', 'detalle', 'que lleva', 'productos', 'resumen'))
      return { texto: 'Su pedido: ' + p.items.map(i => `${i.cant} × ${i.nombre}`).join(', ') + `. Total ${pesos(p.totales.total)}.` };
    if (tiene(t, 'recomienda', 'especialidad', 'que hay', 'menu', 'carta'))
      return { texto: 'Las especialidades de la casa son ' + (ctx.especialidades || []).join(', ') + '. Puede verlas en «Ver el menú».' };
    if (tiene(t, 'reserv'))
      return { texto: 'Puede reservar desde el inicio, en «Reservar»: escoge el día, la hora, cuántas personas y qué celebran.' };
    if (tiene(t, 'gracias', 'muy amable', 'perfecto', 'ok', 'listo gracias', 'vale'))
      return { texto: `¡Con gusto${nombre ? ', ' + nombre : ''}! Aquí sigo si necesita algo.` };
    if (tiene(t, 'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'))
      return { texto: `¡Hola${nombre ? ', ' + nombre : ''}! ${frase(p)} Pregúnteme lo que necesite sobre su pedido.` };
    return { texto: 'No estoy seguro de haberle entendido. Le paso su mensaje a una persona del negocio para que le responda. Mientras tanto, puede preguntarme cuánto falta, en qué va o cómo pagar.', persona: true };
  }
  function textoPago(p) {
    const tr = C.pagos.transferencia;
    if (p.pago.tipo === 'transferencia') {
      const llaves = [tr.llaveBreB && 'llave Bre-B ' + tr.llaveBreB, tr.nequi && 'Nequi ' + tr.nequi, tr.daviplata && 'Daviplata ' + tr.daviplata].filter(Boolean).join(' o ');
      return `El total es ${pesos(p.totales.total)}. ${llaves ? 'Transfiera a ' + llaves + (tr.titular ? ' (a nombre de ' + tr.titular + ')' : '') + ' y' : 'El negocio le envía su llave Bre-B por aquí;'} envíe el comprobante en este chat.`;
    }
    if (p.pago.tipo === 'efectivo') return `El total es ${pesos(p.totales.total)} en efectivo${p.pago.conCuanto ? `. Pagará con ${pesos(p.pago.conCuanto)}: le llevamos ${pesos(p.pago.cambio)} de cambio` : ''}.`;
    return `El total es ${pesos(p.totales.total)} con tarjeta: ${p.modo === 'domicilio' ? 'el domiciliario lleva el datáfono' : 'le llevamos el datáfono o paga en caja'}.`;
  }

  async function responder(texto, p, ctx) {
    if (C.asistente.url && navigator.onLine && p) {
      try {
        const ctl = new AbortController(); setTimeout(() => ctl.abort(), 9000);
        const r = await fetch(C.asistente.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
          body: JSON.stringify({ pregunta: texto, pedido: { codigo: p.codigo, estado: p.estado, modo: p.modo, items: p.items.map(i => ({ cant: i.cant, nombre: i.nombre, detalle: i.detalle })), totales: p.totales, pago: p.pago, destino: p.destino && { direccion: p.destino.direccion, km: p.destino.km, min: p.destino.min }, minutosRestantes: minutosRestantes(p) }, negocio: { nombre: C.negocio.nombre, horario: C.negocio.horario, direccion: C.negocio.direccion }, historial: (ctx.historial || []).slice(-8) }) });
        const j = await r.json();
        if (j && j.respuesta) return { texto: j.respuesta, persona: !!j.persona, ia: true };
      } catch (e) { /* sin servidor: asistente local */ }
    }
    return local(texto, p, ctx);
  }
  window.ASISTENTE = { responder, local, minutosRestantes, frase };
})();
