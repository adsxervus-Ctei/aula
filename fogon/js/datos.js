/* ============================================================
   MESA Y RUTA · importar y exportar la base del negocio
   Un solo formato para ida y vuelta: el Excel que se descarga es el
   mismo que se sube. Hojas: Categorías, Menú, Salsas, Ingredientes, Ocasiones y
   Publicidad (también acepta un CSV con cualquiera de ellas).
   La primera fila de cada hoja son los títulos de las columnas; la
   columna «ID» decide si se crea un registro nuevo o se actualiza.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG, N = window.N, U = N.U;
  const { esc } = U;
  const SI = v => /^(s[ií]|si|yes|y|x|1|true|verdadero)$/i.test(String(v ?? '').trim());
  const siNo = b => (b ? 'SÍ' : 'NO');
  const lista = v => String(v ?? '').split(/[,;|]/).map(x => x.trim()).filter(Boolean);
  const num = v => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/[$\s]/g, ''); if (!s) return NaN; return Number(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,](?=\d{3}(\D|$))/g, '')); };
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = s => norm(s).replace(/ /g, '-').slice(0, 40) || 'item-' + Date.now().toString(36);

  // ---------- esquema: columnas de cada hoja (título visible ↔ campo)
  const ESQUEMA = {
    categorias: { hoja: 'Categorías', col: 'categorias', columnas: [
      ['ID', 'id', { ancho: 14 }], ['Nombre', 'nombre', { ancho: 24 }], ['Descripción corta', 'sub', { ancho: 30 }], ['Orden', 'orden', { tipo: 'numero', ancho: 8 }]] },
    menu: { hoja: 'Menú', col: 'menu', columnas: [
      ['ID', 'id', { ancho: 18 }], ['Categoría', 'cat', { ancho: 12 }], ['Nombre', 'nombre', { ancho: 28 }], ['Precio', 'precio', { tipo: 'numero', ancho: 11 }],
      ['Precio de oferta', 'ofertaPrecio', { tipo: 'numero', ancho: 15 }], ['Texto de la oferta', 'ofertaEtiqueta', { ancho: 18 }], ['Porción', 'porcion', { ancho: 20 }],
      ['Descripción', 'descripcion', { ancho: 44 }], ['Ingredientes (separados por coma)', 'ingredientes', { ancho: 44 }], ['Disponible (SÍ/NO)', 'disponible', { ancho: 12 }],
      ['Especialidad (SÍ/NO)', 'especialidad', { ancho: 12 }], ['Ocasiones (ID separados por coma)', 'ocasiones', { ancho: 28 }], ['Foto (enlace)', 'foto', { ancho: 40 }],
      ['Ilustración', 'arte', { ancho: 13 }], ['Existencias (vacío = sin control)', 'stock', { tipo: 'numero', ancho: 14 }], ['Avisar en', 'minimo', { tipo: 'numero', ancho: 10 }], ['Orden', 'orden', { tipo: 'numero', ancho: 8 }]] },
    salsas: { hoja: 'Salsas', col: 'salsas', columnas: [
      ['ID', 'id', { ancho: 14 }], ['Nombre', 'nombre', { ancho: 24 }], ['Precio', 'precio', { tipo: 'numero', ancho: 10 }], ['Color', 'color', { ancho: 10 }], ['Foto (enlace)', 'foto', { ancho: 40 }], ['Disponible (SÍ/NO)', 'disponible', { ancho: 12 }], ['Existencias (vacío = sin control)', 'stock', { tipo: 'numero', ancho: 14 }], ['Avisar en', 'minimo', { tipo: 'numero', ancho: 10 }], ['Orden', 'orden', { tipo: 'numero', ancho: 8 }]] },
    ingredientes: { hoja: 'Ingredientes', col: 'ingredientes', columnas: [
      ['ID', 'id', { ancho: 16 }], ['Nombre', 'nombre', { ancho: 28 }], ['Foto (enlace)', 'foto', { ancho: 44 }]] },
    ocasiones: { hoja: 'Ocasiones', col: 'ocasiones', columnas: [
      ['ID', 'id', { ancho: 14 }], ['Nombre', 'nombre', { ancho: 22 }], ['Descripción', 'texto', { ancho: 50 }], ['Foto (enlace)', 'foto', { ancho: 40 }], ['Orden', 'orden', { tipo: 'numero', ancho: 8 }]] },
    publicidad: { hoja: 'Publicidad', col: 'publicidad', columnas: [
      ['ID', 'id', { ancho: 12 }], ['Título', 'titulo', { ancho: 26 }], ['Texto', 'texto', { ancho: 40 }], ['Etiqueta', 'etiqueta', { ancho: 16 }], ['Producto (ID)', 'producto', { ancho: 16 }],
      ['Acción', 'accion', { ancho: 10 }], ['Foto (enlace)', 'foto', { ancho: 40 }], ['Activo (SÍ/NO)', 'activo', { ancho: 10 }], ['Orden', 'orden', { tipo: 'numero', ancho: 8 }]] }
  };
  const ORDEN_HOJAS = ['categorias', 'menu', 'salsas', 'ingredientes', 'ocasiones', 'publicidad'];
  const ARTES = ['pollo', 'costillas', 'carne', 'picada', 'chuzo', 'pescado', 'hamburguesa', 'perro', 'salchipapa', 'papas', 'acompanante', 'arroz', 'vaso'];
  const nombreIngr = k => (window.CATALOGO.INGR[k] || [k])[0];

  // ---------- de registro a fila y de fila a registro
  function aFila(clave, r) {
    const ing = r.ingredientesTexto || {};
    const v = {
      ...r, ofertaPrecio: r.oferta && r.oferta.precio || '', ofertaEtiqueta: r.oferta && r.oferta.etiqueta || '',
      ingredientes: (r.ingredientes || []).map(k => ing[k] || nombreIngr(k)).join(', '), ocasiones: (r.ocasiones || []).join(', '),
      stock: r.stock ?? '', minimo: r.minimo ?? '',
      disponible: siNo(r.disponible !== false), especialidad: siNo(!!r.especialidad), activo: siNo(r.activo !== false), foto: /^(data|blob):/.test(r.foto || '') ? '' : r.foto || ''
    };
    return ESQUEMA[clave].columnas.map(([, campo]) => v[campo] ?? '');
  }
  function datosActuales(clave) {
    const xs = clave === 'categorias' ? N.categorias() : clave === 'menu' ? N.menu() : clave === 'salsas' ? N.salsas() : clave === 'ingredientes' ? N.ingredientes() : clave === 'ocasiones' ? N.ocasiones() : N.lista('publicidad').sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
    return xs.map((r, k) => ({ ...r, orden: r.orden ?? k }));
  }
  function hojas(ejemplo = false) {
    const K = window.CATALOGO;
    const ingEj = [...new Set(K.PRODUCTOS.flatMap(p => p.ingredientes || []))].map(id => ({ id, nombre: (K.INGR[id] || [id])[0], foto: (K.INGR_FOTO || {})[id] || '' }));
    const fuente = { categorias: K.CATEGORIAS, menu: K.PRODUCTOS, salsas: K.SALSAS, ingredientes: ingEj, ocasiones: K.OCASIONES, publicidad: K.PUBLICIDAD };
    return ORDEN_HOJAS.map(k => ({ nombre: ESQUEMA[k].hoja, columnas: ESQUEMA[k].columnas.map(([titulo, , o]) => ({ titulo, ...o })),
      filas: (ejemplo ? fuente[k].map((r, i) => ({ ...r, orden: i })) : datosActuales(k)).map(r => aFila(k, r)) }));
  }
  function bajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); }
  function exportar(tipo = 'xlsx', ejemplo = false) {
    const hs = hojas(ejemplo), base = `${ejemplo ? 'plantilla' : 'base'}-${C.negocio.id}-${U.hoy()}`;
    if (tipo === 'xlsx') { bajar(window.XLSX_MYR.crear(hs), base + '.xlsx'); return; }
    hs.forEach((h, k) => setTimeout(() => bajar(new Blob([window.XLSX_MYR.csv(h)], { type: 'text/csv;charset=utf-8' }), `${base}-${slug(h.nombre)}.csv`), k * 400));
  }

  // ---------- lectura de Excel (.xlsx) sin librerías extra (fflate + DOMParser)
  function leerXlsx(buf) {
    const z = window.fflate.unzipSync(new Uint8Array(buf)), txt = p => z[p] ? window.fflate.strFromU8(z[p]) : '';
    const dom = s => new DOMParser().parseFromString(s, 'application/xml');
    const porTag = (d, t) => [...d.getElementsByTagNameNS('*', t)];
    const compartidas = porTag(dom(txt('xl/sharedStrings.xml')), 'si').map(si => porTag(si, 't').map(t => t.textContent).join(''));
    const libro = dom(txt('xl/workbook.xml')), rels = dom(txt('xl/_rels/workbook.xml.rels'));
    const destino = {}; porTag(rels, 'Relationship').forEach(r => { destino[r.getAttribute('Id')] = r.getAttribute('Target'); });
    const fechas = new Set(); try { const st = dom(txt('xl/styles.xml')); const xfs = porTag(porTag(st, 'cellXfs')[0] || st, 'xf'); xfs.forEach((x, i) => { const f = +x.getAttribute('numFmtId'); if ((f >= 14 && f <= 22) || f === 165) fechas.add(i); }); } catch (e) { /* sin estilos */ }
    const colN = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    return porTag(libro, 'sheet').map(sh => {
      const rid = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sh.getAttribute('r:id');
      let ruta = destino[rid] || ''; ruta = ruta.startsWith('/') ? ruta.slice(1) : 'xl/' + ruta.replace(/^\.\//, '');
      const filas = [];
      porTag(dom(txt(ruta)), 'row').forEach(row => {
        const f = [];
        porTag(row, 'c').forEach(c => {
          const t = c.getAttribute('t'), v = porTag(c, 'v')[0], s = +c.getAttribute('s');
          let val = t === 's' ? compartidas[+v.textContent] : t === 'inlineStr' ? porTag(c, 't').map(x => x.textContent).join('') : v ? v.textContent : '';
          if (!t && v && val !== '') { val = Number(val); if (fechas.has(s)) val = new Date(Math.round((val - 25569) * 864e5)).toISOString(); }
          if (t === 'b') val = val === '1' ? 'SÍ' : 'NO';
          f[colN(c.getAttribute('r'))] = val;
        });
        filas.push(Array.from(f, x => x ?? ''));
      });
      return { nombre: sh.getAttribute('name'), filas };
    });
  }
  function leerCsv(texto, nombre) {
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/)[0] || '', sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : (primera.includes('\t') ? '\t' : ',');
    const filas = []; let f = [], c = '', q = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (q) { if (ch === '"') { if (texto[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { f.push(c); c = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; f.push(c); filas.push(f); f = []; c = ''; } else c += ch;
    }
    if (c !== '' || f.length) { f.push(c); filas.push(f); }
    return [{ nombre, filas: filas.filter(r => r.some(x => String(x).trim() !== '')) }];
  }

  // ---------- reconocer cada hoja por su nombre o por sus columnas
  function reconocer(h) {
    const n = norm(h.nombre);
    // la fila de títulos es la primera que tenga «ID» o «Nombre»/«Título»
    const iEnc = h.filas.findIndex(f => f.some(x => ['id', 'nombre', 'titulo'].includes(norm(x))));
    if (iEnc < 0) return null;
    const enc = h.filas[iEnc].map(norm);
    const mapear = k => {
      const cols = ESQUEMA[k].columnas.map(([t, campo]) => [norm(t), campo]), m = {};
      enc.forEach((e, i) => { if (!e) return; const c = cols.find(([t]) => t === e) || cols.find(([t]) => t.startsWith(e + ' ')) || cols.find(([t]) => e.startsWith(t + ' ')); if (c && m[c[1]] === undefined) m[c[1]] = i; });
      return m;
    };
    let mejor = null, puntos = 0, mapa = null;
    for (const k of ORDEN_HOJAS) {
      const m = mapear(k); let p = Object.keys(m).length;
      if (n && (n === norm(ESQUEMA[k].hoja) || n.includes(norm(ESQUEMA[k].hoja)))) p += 3;
      if (p > puntos) { puntos = p; mejor = k; mapa = m; }
    }
    if (!mejor || puntos < 2 || (mapa.nombre === undefined && mapa.titulo === undefined)) return null;
    return { clave: mejor, mapa, filas: h.filas.slice(iEnc + 1).filter(f => f.some(x => String(x).trim() !== '')), hoja: h.nombre };
  }

  // ---------- convertir filas a registros, con avisos por fila
  function convertir(paquete) {
    const res = { categorias: [], menu: [], salsas: [], ingredientes: [], ocasiones: [], publicidad: [] }, avisos = [], errores = [];
    const existencias = (r, val, nombre, hoja, fila) => {
      const sv = val('stock'), mv = val('minimo');
      if (sv !== undefined) { if (String(sv).trim() === '') r.stock = null; else { const n = num(sv); if (isFinite(n) && n >= 0) r.stock = Math.floor(n); else avisos.push(`${hoja}, fila ${fila} (${nombre}): existencias «${sv}» no es un número; se deja sin control.`); } }
      if (mv !== undefined) { const n = num(mv); r.minimo = String(mv).trim() === '' || !isFinite(n) ? null : Math.max(0, Math.floor(n)); }
    };
    const catsNuevas = new Set(), INGR = window.CATALOGO.INGR;
    for (const { clave, mapa, filas, hoja } of paquete) {
      filas.forEach((f, k) => {
        const fila = k + 2, val = campo => mapa[campo] === undefined ? undefined : f[mapa[campo]];
        const txt = campo => { const v = val(campo); return v === undefined ? undefined : String(v).trim(); };
        const nombre = txt(clave === 'publicidad' ? 'titulo' : 'nombre');
        if (!nombre) { errores.push(`${hoja}, fila ${fila}: falta el nombre.`); return; }
        const r = { id: txt('id') || slug(nombre) };
        const o = num(val('orden')); if (isFinite(o)) r.orden = o;
        if (clave === 'categorias') { r.nombre = nombre; if (txt('sub') !== undefined) r.sub = txt('sub'); }
        if (clave === 'menu') {
          r.nombre = nombre; r.cat = slug(txt('cat') || 'otros'); catsNuevas.add(r.cat);
          const p = num(val('precio')); if (!isFinite(p) || p < 0) { errores.push(`${hoja}, fila ${fila} (${nombre}): el precio «${val('precio') ?? ''}» no es un número.`); return; } r.precio = Math.round(p);
          const op = num(val('ofertaPrecio')); r.oferta = isFinite(op) && op > 0 ? { precio: Math.round(op), etiqueta: txt('ofertaEtiqueta') || 'Oferta' } : null;
          if (r.oferta && r.oferta.precio >= r.precio) avisos.push(`${nombre}: el precio de oferta no es menor que el precio normal.`);
          for (const c of ['porcion', 'descripcion', 'foto']) if (txt(c) !== undefined) r[c] = txt(c);
          if (val('ingredientes') !== undefined) {
            r.ingredientes = lista(val('ingredientes')).map(n => Object.keys(INGR).find(k2 => INGR[k2][0].toLowerCase() === n.toLowerCase() || k2 === n) || 'x-' + slug(n).replace(/-/g, '').slice(0, 20));
            r.ingredientesTexto = Object.fromEntries(r.ingredientes.map((key, i) => [key, INGR[key] ? INGR[key][0] : lista(val('ingredientes'))[i]]));
          }
          if (val('disponible') !== undefined && txt('disponible') !== '') r.disponible = SI(val('disponible'));
          if (val('especialidad') !== undefined) r.especialidad = SI(val('especialidad'));
          if (val('ocasiones') !== undefined) r.ocasiones = lista(val('ocasiones')).map(slug);
          const a = norm(txt('arte') || ''); r.arte = ARTES.includes(a) ? a : (r.cat === 'bebidas' ? 'vaso' : 'acompanante');
          existencias(r, val, nombre, hoja, fila);
        }
        if (clave === 'salsas') { r.nombre = nombre; const p = num(val('precio')); r.precio = isFinite(p) ? Math.round(p) : 0; r.color = /^#[0-9a-f]{3,8}$/i.test(txt('color') || '') ? txt('color') : '#E9B44C'; if (txt('foto') !== undefined) r.foto = txt('foto'); if (val('disponible') !== undefined && txt('disponible') !== '') r.disponible = SI(val('disponible')); existencias(r, val, nombre, hoja, fila); }
        if (clave === 'ingredientes') { r.nombre = nombre; if (txt('foto') !== undefined) r.foto = txt('foto'); }
        if (clave === 'ocasiones') { r.nombre = nombre; for (const c of ['texto', 'foto']) if (txt(c) !== undefined) r[c] = txt(c); }
        if (clave === 'publicidad') { r.titulo = nombre; for (const c of ['texto', 'etiqueta', 'producto', 'accion', 'foto']) if (txt(c)) r[c] = txt(c); r.activo = val('activo') === undefined || txt('activo') === '' ? true : SI(val('activo')); }
        if (res[clave].some(x => x.id === r.id)) avisos.push(`${hoja}: el ID «${r.id}» está repetido; se usa la última fila.`);
        res[clave] = res[clave].filter(x => x.id !== r.id).concat(r);
      });
    }
    // categorías que usa el menú y no vienen en la hoja de categorías: se crean
    const conocidas = new Set([...res.categorias.map(c => c.id), ...N.lista('categorias').map(c => c.id), ...(N.lista('categorias').length ? [] : window.CATALOGO.CATEGORIAS.map(c => c.id))]);
    catsNuevas.forEach(c => { if (!conocidas.has(c)) { res.categorias.push({ id: c, nombre: c.replace(/-/g, ' ').replace(/^./, x => x.toUpperCase()), sub: '', orden: 50 + res.categorias.length }); avisos.push(`Se crea la categoría «${c}» porque la usa el menú.`); } });
    return { res, avisos, errores };
  }

  async function leerArchivo(f) {
    const nombre = f.name.replace(/\.[^.]+$/, '');
    if (/\.xlsx$/i.test(f.name) || f.type.includes('spreadsheetml')) return leerXlsx(await f.arrayBuffer());
    if (/\.xls$/i.test(f.name)) throw new Error('Ese es el formato antiguo de Excel (.xls). En Excel use «Guardar como → Libro de Excel (.xlsx)» o «CSV UTF-8».');
    if (/\.(csv|txt|tsv)$/i.test(f.name) || /text|csv/.test(f.type)) { const b = await f.arrayBuffer(); let t = new TextDecoder('utf-8').decode(b); if (t.includes('�')) t = new TextDecoder('windows-1252').decode(b); return leerCsv(t, nombre); }
    throw new Error('Suba un archivo .xlsx (Excel) o .csv.');
  }
  async function analizar(f) {
    const hs = await leerArchivo(f), paquete = hs.map(reconocer).filter(Boolean);
    if (!paquete.length) throw new Error('No reconocí ninguna hoja. Descargue la plantilla y conserve la fila de títulos (ID, Nombre, Precio…).');
    return { ...convertir(paquete), hojas: paquete.map(p => ({ clave: p.clave, hoja: p.hoja, filas: p.filas.length })) };
  }
  async function aplicar(a, modo = 'actualizar') {
    let nuevos = 0, cambiados = 0, borrados = 0;
    for (const k of ORDEN_HOJAS) {
      const col = ESQUEMA[k].col, xs = a.res[k]; if (!xs.length && !(modo === 'reemplazar' && a.hojas.some(h => h.clave === k))) continue;
      const antes = new Map(N.lista(col).map(x => [x.id, x]));
      for (const r of xs) { const prev = antes.get(r.id); await N.guardar(col, prev ? { ...prev, ...r } : r); prev ? cambiados++ : nuevos++; }
      if (modo === 'reemplazar' && a.hojas.some(h => h.clave === k)) { const quedan = new Set(xs.map(x => x.id)); for (const id of antes.keys()) if (!quedan.has(id)) { await N.borrar(col, id); borrados++; } }
    }
    await N.guardar('ajustes', { ...(N.obtener('ajustes', 'datos') || {}), id: 'datos', importado: new Date().toISOString(), por: (N.sesion() || {}).nombre || '' });
    return { nuevos, cambiados, borrados };
  }
  // ¿el negocio sigue con el menú de ejemplo? (para ofrecer importar al empezar)
  function esMenuDeEjemplo() {
    if (N.obtener('ajustes', 'datos')) return false;
    const ids = new Set(window.CATALOGO.PRODUCTOS.map(p => p.id)), m = N.menu();
    return !m.length || m.every(p => ids.has(p.id));
  }

  // ---------- ventana de importación (vista previa y confirmación)
  function abrirImportar(alTerminar) {
    const v = document.createElement('div'); v.className = 'velo'; v.id = 'velo-importar';
    v.innerHTML = `<div class="modal vidrio impModal" role="dialog" aria-modal="true" aria-labelledby="imp-tit">
      <h2 id="imp-tit">Importar la base del negocio</h2>
      <p class="mini">Suba el Excel (.xlsx) o un CSV con el mismo formato de «Exportar base». Hojas: Categorías, Menú, Salsas, Ingredientes, Ocasiones y Publicidad. La columna ID decide si un producto es nuevo o se actualiza.</p>
      <div class="impBotones"><button class="btn claro" type="button" id="imp-plantilla">Descargar plantilla con ejemplo</button><button class="btn claro" type="button" id="imp-actual">Descargar mi base actual</button></div>
      <label class="impSoltar" id="imp-zona"><input type="file" id="imp-archivo" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden>
        <b>Toque para elegir el archivo</b><small>o arrástrelo aquí · .xlsx o .csv</small></label>
      <div id="imp-previa"></div>
      <p class="nota" id="imp-nota" role="status"></p>
      <div class="impAcc"><button class="btn claro" type="button" id="imp-cerrar">Cerrar</button><button class="btn verde" type="button" id="imp-ok" disabled>Importar</button></div></div>`;
    document.body.append(v); v.hidden = false;
    const $ = s => v.querySelector(s); let analisis = null;
    $('#imp-cerrar').onclick = () => v.remove();
    $('#imp-plantilla').onclick = () => exportar('xlsx', true);
    $('#imp-actual').onclick = () => exportar('xlsx', false);
    const nota = t => { $('#imp-nota').textContent = t; };
    const elegir = async f => {
      if (!f) return; nota('Leyendo ' + f.name + '…'); $('#imp-ok').disabled = true; $('#imp-previa').innerHTML = '';
      try {
        analisis = await analizar(f); const { res, avisos, errores } = analisis;
        const antes = k => new Set(N.lista(ESQUEMA[k].col).map(x => x.id));
        $('#imp-previa').innerHTML = `<ul class="impResumen">${analisis.hojas.map(h => { const xs = res[h.clave], a = antes(h.clave), n = xs.filter(x => !a.has(x.id)).length; return `<li><b>${esc(ESQUEMA[h.clave].hoja)}</b><span>${xs.length} filas · ${n} nuevas · ${xs.length - n} actualizan</span></li>`; }).join('')}</ul>
          ${res.menu.length ? `<div class="impMuestra">${res.menu.slice(0, 6).map(p => `<span><b>${esc(p.nombre)}</b><small>${esc(p.cat)} · ${U.pesos(p.precio)}${p.oferta ? ' → ' + U.pesos(p.oferta.precio) : ''}</small></span>`).join('')}${res.menu.length > 6 ? `<span class="mini">y ${res.menu.length - 6} más…</span>` : ''}</div>` : ''}
          ${errores.length ? `<div class="impErr"><b>${errores.length} fila(s) no se importan:</b><ul>${errores.slice(0, 8).map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
          ${avisos.length ? `<details class="impAv"><summary>${avisos.length} aviso(s)</summary><ul>${avisos.map(e => `<li>${esc(e)}</li>`).join('')}</ul></details>` : ''}
          <fieldset class="impModo"><legend>¿Cómo importar?</legend>
            <label><input type="radio" name="imp-modo" value="actualizar" checked><span><b>Agregar y actualizar</b><small>Crea lo nuevo y actualiza por ID. No borra nada.</small></span></label>
            <label><input type="radio" name="imp-modo" value="reemplazar"><span><b>Reemplazar</b><small>Deja solo lo que trae el archivo en esas hojas (borra lo demás). Ideal al empezar de cero.</small></span></label></fieldset>`;
        const total = Object.values(res).reduce((s, x) => s + x.length, 0);
        $('#imp-ok').disabled = !total; nota(total ? 'Revise y toque «Importar».' : 'El archivo no trae filas válidas.');
      } catch (e) { nota(e.message); analisis = null; }
    };
    $('#imp-archivo').onchange = e => elegir(e.target.files[0]);
    const z = $('#imp-zona');
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('sobre'); });
    z.addEventListener('dragleave', () => z.classList.remove('sobre'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('sobre'); elegir(e.dataTransfer.files[0]); });
    $('#imp-ok').onclick = async () => {
      const modo = (v.querySelector('[name=imp-modo]:checked') || {}).value || 'actualizar';
      if (modo === 'reemplazar' && !confirm('Se borrarán los productos que no estén en el archivo. ¿Continuar?')) return;
      $('#imp-ok').disabled = true; nota('Guardando…');
      try { const r = await aplicar(analisis, modo); v.remove(); U.aviso(`Base importada: ${r.nuevos} nuevos, ${r.cambiados} actualizados${r.borrados ? ', ' + r.borrados + ' borrados' : ''}. Los clientes ya lo ven.`, 5500); alTerminar && alTerminar(r); }
      catch (e) { nota('No se pudo guardar: ' + e.message); $('#imp-ok').disabled = false; }
    };
    return v;
  }

  window.DATOS = { ESQUEMA, hojas, exportar, leerXlsx, leerCsv, analizar, aplicar, abrirImportar, esMenuDeEjemplo };
})();
