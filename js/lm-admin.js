/* Lainec v7 · ADMIN: aprobación de repartidores, tarifas por zona, configuración,
   caja de repartidores, comisiones por origen y fotos pendientes del equipo. */
(function () {
  'use strict';
  const LM = window.LM, API = LM.api;
  const { esc, ic, pesos, toast, sheet, closeModal } = LM;
  const AD = { tab: 'solicitudes', estado: 'pendiente', datos: {}, err: '' };
  const enAdmin = () => (location.hash || '').slice(1) === 'admin';
  const fecha = d => d ? new Date(d).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

  async function cargar() {
    AD.err = '';
    try {
      if (AD.tab === 'solicitudes') AD.datos.sol = (await API.get('/api/admin/solicitudes?estado=' + AD.estado)).solicitudes;
      if (AD.tab === 'solicitudes' || AD.tab === 'zonas') AD.datos.zonas = (await API.get('/api/admin/zonas')).zonas;
      if (AD.tab === 'zonas') AD.datos.config = (await API.get('/api/admin/config')).config;
      if (AD.tab === 'cajas') AD.datos.cajas = (await API.get('/api/admin/cajas')).saldos;
      if (AD.tab === 'comisiones') AD.datos.com = (await API.get('/api/admin/comisiones')).filas;
      if (AD.tab === 'ofertas') AD.datos.ofertas = (await API.get('/api/admin/ofertas')).ofertas;
      if (AD.tab === 'fotos') AD.datos.fotos = (await API.get('/api/equipo/fotos-pendientes')).productos;
    } catch (e) { AD.err = e.message; }
  }
  async function pintar(recargar) {
    const app = document.getElementById('app'); if (!app) return;
    if (recargar !== false && API.yo && (API.tieneRol('admin') || API.tieneRol('equipo'))) { app.innerHTML = '<div class="lm-wrap"><div class="lm-card lm-centro"><div class="lm-spin"></div><p>Cargando…</p></div></div>'; await cargar(); }
    app.innerHTML = vAdmin(); LM.paint(app);
  }

  function vAdmin() {
    if (API.disponible === null) return '<div class="lm-wrap"><div class="lm-card lm-centro"><div class="lm-spin"></div></div></div>';
    if (!API.disponible) return LM.sinServidorH('El panel de administración');
    const esAdmin = API.tieneRol('admin'), esEquipo = API.tieneRol('equipo');
    if (!API.yo || (!esAdmin && !esEquipo)) return vEntrar();
    if (!esAdmin) AD.tab = 'fotos';
    const tabs = esAdmin ? [['solicitudes', 'users', 'Repartidores'], ['zonas', 'pin', 'Tarifas y reglas'], ['ofertas', 'moto', 'Domicilios'], ['cajas', 'cash', 'Cajas'], ['comisiones', 'chart', 'Comisiones'], ['fotos', 'camera', 'Fotos pendientes']] : [['fotos', 'camera', 'Fotos pendientes']];
    const cuerpo = { solicitudes: vSolicitudes, zonas: vZonas, ofertas: vOfertas, cajas: vCajas, comisiones: vComisiones, fotos: vFotos }[AD.tab]();
    return '<div class="lm-wrap lm-admin"><header class="lm-barra"><div class="lm-barra-id"><span class="lm-av">' + ic('shield') + '</span><div><b>' + (esAdmin ? 'Administración' : 'Equipo de fotos') + '</b><small>Lainec · ' + esc(API.yo.nombre) + '</small></div></div><button class="btn b-sm" type="button" data-act="ad-salir">' + ic('logout') + 'Salir</button></header>' +
      '<nav class="lm-tabs" role="tablist">' + tabs.map(t => '<button type="button" role="tab" aria-selected="' + (AD.tab === t[0]) + '" data-act="ad-tab" data-t="' + t[0] + '">' + ic(t[1]) + t[2] + '</button>').join('') + '</nav>' +
      (AD.err ? '<div class="aviso warn">' + ic('alert') + '<span>' + esc(AD.err) + '</span></div>' : '') + cuerpo + '</div>';
  }
  function vEntrar() {
    return '<div class="lm-wrap"><form class="lm-card lm-form" data-form="ad-entrar"><h1>' + ic('shield') + 'Administración de Lainec</h1>' +
      (API.yo ? '<div class="aviso warn">' + ic('lock') + '<span>Tu cuenta (' + esc(API.yo.nombre) + ') no es de administración.</span></div>' : '') +
      '<div class="campo"><label for="adU">Usuario</label><input id="adU" name="u" required autocomplete="username"></div><div class="campo"><label for="adP">Clave</label><input id="adP" name="p" type="password" required autocomplete="current-password"></div>' +
      (AD.err ? '<p class="err">' + esc(AD.err) + '</p>' : '') + '<button class="btn b-sol lm-btn-xl" type="submit">' + ic('lock') + 'ENTRAR</button><p class="muted">Prueba: <b>admin</b> / 1234 · equipo de fotos: <b>equipo</b> / 1234</p></form></div>';
  }

  const foto = (id, alt) => id ? '<a href="/api/archivos/' + id + '" target="_blank" rel="noopener" class="lm-doc"><img src="/api/archivos/' + id + '" alt="' + esc(alt) + '" loading="lazy"><span>' + esc(alt) + '</span></a>' : '<span class="lm-doc vacio">Sin ' + esc(alt) + '</span>';
  function vSolicitudes() {
    const ls = AD.datos.sol || [], zonas = AD.datos.zonas || [];
    return '<div class="tabs">' + [['pendiente', 'En revisión'], ['aprobado', 'Aprobados'], ['rechazado', 'Rechazados']].map(x => '<button type="button" aria-selected="' + (AD.estado === x[0]) + '" data-act="ad-estado" data-e="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      (ls.length ? ls.map(r => '<article class="lm-card lm-sol"><div class="lm-sol-h"><h3>' + esc(r.nombre_completo) + '</h3><span class="pill ' + (r.estado_aprobacion === 'aprobado' ? 'p-ok' : r.estado_aprobacion === 'rechazado' ? 'p-no' : 'p-warn') + '">' + esc(r.estado_aprobacion) + '</span></div>' +
        '<div class="lm-docs">' + foto(r.foto_id, 'foto') + foto(r.cedula_foto_id, 'cédula') + foto(r.pase_foto_id, 'pase') + '</div>' +
        '<dl class="lm-dl"><dt>Cédula</dt><dd>' + esc(r.cedula) + '</dd><dt>Celular</dt><dd>' + esc(r.telefono) + '</dd><dt>Nequi</dt><dd>' + esc(r.nequi) + '</dd><dt>Moto</dt><dd>' + esc(r.moto_marca) + ' · ' + esc(r.moto_color) + '</dd><dt>Placa</dt><dd><b>' + esc(r.placa) + '</b></dd><dt>Zona</dt><dd>' + esc(r.zona_nombre) + '</dd><dt>Solicitó</dt><dd>' + fecha(r.creado) + '</dd><dt>Habeas Data</dt><dd>Autorizó el ' + fecha(r.habeas_data_en) + ' (v. ' + esc(r.habeas_data_version) + ')</dd>' + (r.promedio ? '<dt>Calificación</dt><dd>★ ' + r.promedio + '</dd>' : '') + (r.motivo_rechazo ? '<dt>Motivo</dt><dd>' + esc(r.motivo_rechazo) + '</dd>' : '') + '</dl>' +
        (r.estado_aprobacion === 'aprobado' ? '<form class="lm-zonas-extra" data-form="ad-zonas" data-id="' + r.usuario_id + '"><span class="l">Ampliar zona (además de ' + esc(r.zona_nombre) + '):</span>' + zonas.filter(z => z.id !== r.zona_id).map(z => '<label><input type="checkbox" name="z" value="' + esc(z.id) + '"' + ((r.zonas_extra || []).includes(z.id) ? ' checked' : '') + '>' + esc(z.nombre) + '</label>').join('') + '<button class="btn b-sm" type="submit">Guardar zonas</button></form>' : '') +
        '<div class="quick">' + (r.estado_aprobacion !== 'aprobado' ? '<button class="btn b-monte" type="button" data-act="ad-aprobar" data-id="' + r.usuario_id + '">' + ic('check') + 'APROBAR</button>' : '') + (r.estado_aprobacion !== 'rechazado' ? '<button class="btn b-rojo" type="button" data-act="ad-rechazar" data-id="' + r.usuario_id + '" data-n="' + esc(r.nombre_completo) + '">' + ic('x') + (r.estado_aprobacion === 'aprobado' ? 'SUSPENDER' : 'RECHAZAR') + '</button>' : '') + '</div></article>').join('')
        : '<div class="vacio">No hay solicitudes aquí.</div>');
  }
  function vZonas() {
    const z = AD.datos.zonas || [], c = AD.datos.config || {};
    return '<section class="lm-card"><h2>' + ic('pin') + 'Tarifas de domicilio por zona</h2><p class="muted">El repartidor gana el 100 % de este valor. Si una zona no tiene coordenadas, se usa la distancia de referencia para estimar el tiempo.</p>' +
      z.map(x => '<form class="lm-zona" data-form="ad-zona" data-id="' + esc(x.id) + '"><div class="campo"><label>Zona</label><input name="nombre" value="' + esc(x.nombre) + '" required></div><div class="campo"><label>Municipio</label><input name="municipio" value="' + esc(x.municipio) + '"></div><div class="campo"><label>Tipo</label><select name="tipo"><option value="pueblo"' + (x.tipo === 'pueblo' ? ' selected' : '') + '>Pueblo</option><option value="vereda"' + (x.tipo === 'vereda' ? ' selected' : '') + '>Vereda</option></select></div><div class="campo"><label>Tarifa ($)</label><input name="tarifa" type="number" min="0" step="500" value="' + x.tarifa + '" required></div><div class="campo"><label>Latitud</label><input name="lat" inputmode="decimal" value="' + (x.lat ?? '') + '"></div><div class="campo"><label>Longitud</label><input name="lng" inputmode="decimal" value="' + (x.lng ?? '') + '"></div><div class="campo"><label>Km de referencia</label><input name="distancia_ref_km" inputmode="decimal" value="' + (x.distancia_ref_km ?? '') + '"></div><label class="lm-ck"><input type="checkbox" name="activo"' + (x.activo ? ' checked' : '') + '>Activa</label><button class="btn b-sol b-sm" type="submit">' + ic('check') + 'Guardar</button></form>').join('') +
      '<details class="lm-nueva-zona"><summary>' + ic('plus') + 'Agregar zona o vereda</summary><form class="lm-zona" data-form="ad-zona" data-nueva="1"><div class="campo"><label>Código (sin espacios)</label><input name="id" required pattern="[a-z0-9]+" placeholder="lavictoria"></div><div class="campo"><label>Nombre</label><input name="nombre" required></div><div class="campo"><label>Municipio</label><input name="municipio" value="Hatillo de Loba"></div><div class="campo"><label>Tipo</label><select name="tipo"><option value="vereda">Vereda</option><option value="pueblo">Pueblo</option></select></div><div class="campo"><label>Tarifa ($)</label><input name="tarifa" type="number" min="0" step="500" value="8000" required></div><div class="campo"><label>Km de referencia</label><input name="distancia_ref_km" inputmode="decimal" value="5"></div><input type="hidden" name="activo" value="on"><button class="btn b-sol b-sm" type="submit">Agregar</button></form></details></section>' +
      '<form class="lm-card lm-form" data-form="ad-config"><h2>' + ic('gear') + 'Reglas de las ofertas</h2><div class="row2"><div class="campo"><label for="acV">Minutos para que venza una oferta</label><input id="acV" name="vencimiento_oferta_min" type="number" min="1" max="120" value="' + (c.vencimiento_oferta_min ?? 10) + '"></div><div class="campo"><label for="acK">Velocidad promedio de la moto (km/h)</label><input id="acK" name="velocidad_moto_kmh" type="number" min="5" max="80" value="' + (c.velocidad_moto_kmh ?? 25) + '"></div></div>' +
      '<p class="muted">Fiado: el domicilio lo cubre <b>el negocio</b> (le paga al repartidor y le cobra al cliente en su cuenta de fiado).</p><button class="btn b-sol" type="submit">' + ic('check') + 'Guardar reglas</button></form>';
  }
  const ESTADO_TXT = { abierta: 'Buscando repartidor', aceptada: 'Aceptada', recogida: 'Recogida', en_camino: 'En camino', entregada: 'Entregada', vencida: 'Vencida', cancelada: 'Cancelada' };
  function vOfertas() {
    const ls = AD.datos.ofertas || [];
    return '<section class="lm-card"><h2>' + ic('moto') + 'Domicilios de los últimos 2 días</h2>' + (ls.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th>#</th><th>Negocio</th><th>Destino</th><th>Valor</th><th>Estado</th></tr></thead><tbody>' + ls.map(o => '<tr><td>' + o.id + '</td><td>' + esc(o.negocio) + '</td><td>' + esc(o.destino) + '</td><td class="num">' + esc(o.valor_txt) + '</td><td>' + esc(ESTADO_TXT[o.estado] || o.estado) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Sin domicilios todavía.</p>') + '</section>';
  }
  function vCajas() {
    const ls = AD.datos.cajas || [];
    return '<section class="lm-card"><h2>' + ic('cash') + 'Caja de los repartidores</h2><p class="muted">Positivo: el repartidor le debe al negocio (cobró en efectivo). Negativo: el negocio le debe el domicilio.</p>' + (ls.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th>Repartidor</th><th>Negocio</th><th class="r">Saldo</th></tr></thead><tbody>' + ls.map(s => '<tr><td>' + esc(s.nombre_completo) + ' · ' + esc(s.placa) + '</td><td>' + esc(s.negocio) + '</td><td class="r num"><b>' + (s.saldo > 0 ? 'Debe ' + pesos(s.saldo) : 'Le deben ' + pesos(-s.saldo)) + '</b></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Todos están a paz y salvo.</p>') + '</section>';
  }
  function vComisiones() {
    const ls = AD.datos.com || [];
    const tot = ls.reduce((a, f) => a + f.comision, 0), mens = ls.reduce((a, f) => a + f.mensualidad, 0);
    let mun = '';
    return '<section class="lm-card"><h2>' + ic('chart') + 'Comisiones por municipio</h2><p class="muted">10 % solo sobre lo que se vendió por Lainec (origen <b>lobamall</b>), sin contar el domicilio. Lo que llega directo (WhatsApp, llamada, mostrador) no paga comisión.</p>' +
      '<div class="lm-kpis"><div><small>Comisiones</small><b class="num">' + pesos(tot) + '</b></div><div><small>Mensualidades</small><b class="num">' + pesos(mens) + '</b><span>' + ls.length + ' negocios × $70.000</span></div></div>' +
      '<div class="tbl-w"><table class="tbl"><thead><tr><th>Negocio</th><th class="r">Por Lainec</th><th class="r">Directo</th><th class="r">Comisión</th></tr></thead><tbody>' +
      ls.map(f => (f.municipio !== mun ? '<tr class="lm-sep"><td colspan="4"><b>' + esc(mun = f.municipio) + '</b></td></tr>' : '') + '<tr><td>' + esc(f.nombre) + '</td><td class="r num">' + pesos(f.ventas_lobamall) + '</td><td class="r num">' + pesos(f.ventas_directas) + '</td><td class="r num"><b>' + pesos(f.comision) + '</b></td></tr>').join('') + '</tbody></table></div></section>';
  }
  function vFotos() {
    const ls = AD.datos.fotos || [];
    return '<section class="lm-card"><h2>' + ic('camera') + 'Productos sin foto profesional</h2>' +
      LM.ayuda('Cómo tomar la foto profesional', ['Fondo blanco o tela clara, sin cosas alrededor.', 'Luz de ventana o caja de luz; sin flash directo.', 'Producto centrado, que ocupe casi toda la foto.', 'Celular quieto y a la altura del producto.', 'Toma la foto aquí mismo: se comprime y queda en la tienda y en la etiqueta.'], true) +
      (ls.length ? '<div class="lm-fotos-pend">' + ls.map(p => '<div class="lm-fp"><b>' + esc(p.nombre) + '</b><span>' + esc(p.negocio) + ' · ' + esc(p.codigo) + '</span><span class="muted">' + esc(p.ubicacion || '') + '</span><label class="btn b-sol b-sm">' + ic('camera') + 'Tomar foto<input type="file" accept="image/*" capture="environment" data-chg="ad-foto" data-id="' + esc(p.id) + '" hidden></label></div>').join('') + '</div>' : '<p class="muted">Todos los productos del servidor tienen foto. ¡Buen trabajo!</p>') + '</section>';
  }

  const A = LM.A, F = LM.F;
  A['ad-tab'] = el => { AD.tab = el.dataset.t; pintar(); };
  A['ad-estado'] = el => { AD.estado = el.dataset.e; pintar(); };
  A['ad-salir'] = async () => { await API.salir(); pintar(false); };
  F['ad-entrar'] = async (f, d) => { AD.err = ''; try { await API.entrar(String(d.get('u')), String(d.get('p'))); } catch (e) { AD.err = e.message; } pintar(); };
  A['ad-aprobar'] = async el => { try { await API.post('/api/admin/repartidores/' + el.dataset.id + '/aprobar'); toast('Repartidor aprobado. Ya le llegó el aviso.'); } catch (e) { toast(e.message); } pintar(); };
  A['ad-rechazar'] = el => sheet('<div class="sh-h"><div class="tt"><small>' + esc(el.dataset.n) + '</small><h3>Motivo del rechazo</h3></div><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">' + ic('x') + '</button></div><form class="sh-b stack" data-form="ad-rechazar" data-id="' + esc(el.dataset.id) + '"><div class="campo"><label for="arM">Explícale qué debe corregir</label><textarea id="arM" name="m" required minlength="5" placeholder="Ej: la foto del pase no se lee"></textarea></div><button class="btn b-rojo" type="submit">' + ic('x') + 'Rechazar</button></form>');
  F['ad-rechazar'] = async (f, d) => { try { await API.post('/api/admin/repartidores/' + f.dataset.id + '/rechazar', { motivo: String(d.get('m')) }); closeModal(); toast('Listo. Se le avisó con el motivo.'); } catch (e) { toast(e.message); } pintar(); };
  F['ad-zonas'] = async (f, d) => { try { await API.put('/api/admin/repartidores/' + f.dataset.id + '/zonas', { zonas_extra: d.getAll('z') }); toast('Zonas guardadas'); } catch (e) { toast(e.message); } };
  F['ad-zona'] = async (f, d) => {
    const id = f.dataset.nueva ? String(d.get('id') || '').toLowerCase() : f.dataset.id;
    try { await API.put('/api/admin/zonas/' + encodeURIComponent(id), { nombre: d.get('nombre'), municipio: d.get('municipio'), tipo: d.get('tipo'), tarifa: +d.get('tarifa'), lat: d.get('lat'), lng: d.get('lng'), distancia_ref_km: d.get('distancia_ref_km'), activo: !!d.get('activo') }); toast('Tarifa guardada'); API.zonas = []; }
    catch (e) { toast(e.message); }
    pintar();
  };
  F['ad-config'] = async (f, d) => { try { await API.put('/api/admin/config', { vencimiento_oferta_min: +d.get('vencimiento_oferta_min'), velocidad_moto_kmh: +d.get('velocidad_moto_kmh') }); toast('Reglas guardadas'); } catch (e) { toast(e.message); } };
  document.addEventListener('change', async e => {
    const el = e.target; if (el.dataset.chg !== 'ad-foto' || !el.files[0]) return;
    try { const foto = await LM.comprimir(el.files[0], 1400, 0.85); await API.post('/api/productos/' + encodeURIComponent(el.dataset.id) + '/foto', { foto }); toast('Foto guardada. Ya sale en la tienda y en el QR.'); }
    catch (x) { toast(x.message); }
    pintar();
  });
  API.on('notificacion', n => { if (n && n.tipo === 'solicitud_repartidor' && enAdmin() && AD.tab === 'solicitudes') pintar(); });

  LM.rutaExt(r => r === 'admin', () => pintar(), { sinGate: true, clase: 'mode-admin' });
})();
