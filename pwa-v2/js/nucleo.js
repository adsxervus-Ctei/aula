/* ============================================================
   MESA Y RUTA · núcleo: utilidades, datos, cuentas, roles y permisos
   Dos modos con la misma interfaz:
   · DEMO: todo en este navegador (IndexedDB). Las pestañas se sincronizan
     entre sí (BroadcastChannel): el panel del negocio abierto en otra
     pestaña ve los pedidos al instante.
   · SUPABASE: base de datos gratuita en la nube. Se activa llenando
     CONFIG.supabase. Guarda una copia local para abrir sin señal.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG;

  // ------------------------------------------------------------ utilidades
  const U = {
    $: s => document.querySelector(s),
    $$: s => [...document.querySelectorAll(s)],
    esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    pesos: n => '$ ' + Math.round(n || 0).toLocaleString('es-CO'),
    uid: () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2)),
    async sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); },
    hoy: (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    diaDe: iso => U.hoy(new Date(iso)),
    fechaLarga: iso => new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
    hora: iso => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }),
    vibrar(p = 12) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } },
    robot: navigator.webdriver === true,
    quieto: matchMedia('(prefers-reduced-motion: reduce)').matches,
    ls: {
      get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* lleno o bloqueado */ } },
      del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
    }
  };
  U.animar = !U.robot && !U.quieto;
  let tAviso;
  U.aviso = (t, ms = 3200) => {
    const a = document.getElementById('toast'); if (!a) return;
    a.textContent = t; a.classList.add('ver'); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('ver'), ms);
  };

  // fotos: 'unsplash:photo-…' → URL del CDN con tamaño; 'medio:…' → archivo local; http(s) → tal cual
  const objetos = new Map();
  U.foto = (ref, w = 800) => {
    if (!ref) return '';
    if (ref.startsWith('unsplash:')) return `${C.servicios.fotos}${ref.slice(9)}?auto=format&fit=crop&w=${w}&h=${w}&q=72`;
    if (ref.startsWith('medio:')) return objetos.get(ref) || '';
    return ref;
  };
  U.fotoAncha = (ref, w = 1200, h = 640) => ref && ref.startsWith('unsplash:') ? `${C.servicios.fotos}${ref.slice(9)}?auto=format&fit=crop&w=${w}&h=${h}&q=72` : U.foto(ref, w);
  // <img> con respaldo: si la foto no carga (sin señal la primera vez), se ve la ilustración
  U.imgPlato = (p, w = 700, clase = '') => {
    const arte = window.ARTE.svg(p.arte || 'acompanante', p.color);
    const src = U.foto(p.foto, w);
    if (!src) return `<span class="arte ${clase}">${arte}</span>`;
    return `<span class="arte ${clase}">${arte}<img src="${U.esc(src)}" alt="${U.esc(p.nombre)}" decoding="async" draggable="false"></span>`;
  };
  // foto ancha (anuncios, portada, ocasiones) con ilustración de respaldo
  U.imgAncha = (ref, arte, w = 900, h = 500, color) => {
    const src = U.fotoAncha(ref, w, h);
    return `<span class="arte ancha">${window.ARTE.svg(arte || 'pollo', color)}${src ? `<img src="${U.esc(src)}" alt="" decoding="async" draggable="false">` : ''}</span>`;
  };
  // la foto aparece con un fundido cuando carga; si falla, queda la ilustración
  document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('arte')) t.classList.add('ok'); }, true);
  document.addEventListener('error', e => { const t = e.target; if (t.tagName !== 'IMG') return; if (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('arte')) t.remove(); else t.style.visibility = 'hidden'; }, true);

  // ------------------------------------------------------------ permisos y roles
  const PERMISOS = {
    'pedidos.ver': 'Ver pedidos', 'pedidos.estado': 'Cambiar el estado de los pedidos', 'pedidos.pago': 'Marcar pedidos como pagados',
    'chat.responder': 'Responder el chat de clientes', 'menu.editar': 'Editar menú, fotos y ofertas', 'publicidad.editar': 'Publicidad del inicio',
    'reservas.gestionar': 'Confirmar reservas', 'finanzas.ver': 'Ver balance e ingresos', 'finanzas.registrar': 'Registrar egresos e ingresos de caja',
    'reportes.exportar': 'Generar el consolidado', 'equipo.gestionar': 'Empleados y roles', 'ajustes.editar': 'Ajustes del negocio'
  };
  const TODOS = Object.keys(PERMISOS);
  const ROLES = {
    superadmin: { nombre: 'Superadministrador', permisos: TODOS },
    admin: { nombre: 'Administrador del negocio', permisos: TODOS },
    cajero: { nombre: 'Caja', permisos: ['pedidos.ver', 'pedidos.estado', 'pedidos.pago', 'chat.responder', 'reservas.gestionar', 'finanzas.ver', 'finanzas.registrar'] },
    mesero: { nombre: 'Mesero', permisos: ['pedidos.ver', 'pedidos.estado', 'chat.responder', 'reservas.gestionar'] },
    cocina: { nombre: 'Cocina', permisos: ['pedidos.ver', 'pedidos.estado'] },
    domiciliario: { nombre: 'Domiciliario', permisos: ['pedidos.ver', 'pedidos.estado', 'pedidos.pago'] },
    cliente: { nombre: 'Cliente', permisos: [] }
  };
  const ESTADOS = [
    ['recibido', 'Recibido'], ['confirmado', 'Confirmado'], ['preparando', 'En la cocina'],
    ['listo', 'Listo'], ['en_camino', 'En camino'], ['entregado', 'Entregado'], ['cancelado', 'Cancelado']
  ];
  const NOMBRE_ESTADO = Object.fromEntries(ESTADOS);

  // ------------------------------------------------------------ almacén local (IndexedDB + caché en memoria)
  const cache = new Map();          // col → Map(id → registro)
  const oyentes = new Set();
  let canal = null;
  let idb = null;
  function abrirIDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('mesa-y-ruta', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('registros')) db.createObjectStore('registros', { keyPath: 'clave' });
        if (!db.objectStoreNames.contains('medios')) db.createObjectStore('medios');
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  const tx = (store, modo, fn) => new Promise((res, rej) => {
    const t = idb.transaction(store, modo); const s = t.objectStore(store); const out = fn(s);
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
  });
  function colMap(col) { if (!cache.has(col)) cache.set(col, new Map()); return cache.get(col); }
  async function cargarTodo() {
    const todos = await new Promise((res, rej) => { const t = idb.transaction('registros').objectStore('registros').getAll(); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); });
    cache.clear();
    todos.forEach(r => colMap(r.col).set(r.id, r.datos));
    const medios = await new Promise((res) => { const t = idb.transaction('medios').objectStore('medios').openCursor(); const out = []; t.onsuccess = () => { const c = t.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); }; t.onerror = () => res(out); });
    medios.forEach(([k, blob]) => { if (!objetos.has(k)) objetos.set(k, URL.createObjectURL(blob)); });
  }
  async function ponerLocal(col, datos, avisarOtros = true) {
    colMap(col).set(datos.id, datos);
    await tx('registros', 'readwrite', s => s.put({ clave: col + '/' + datos.id, col, id: datos.id, datos }));
    emitir({ col, id: datos.id }, avisarOtros);
  }
  async function quitarLocal(col, id, avisarOtros = true) {
    colMap(col).delete(id);
    await tx('registros', 'readwrite', s => s.delete(col + '/' + id));
    emitir({ col, id, borrado: true }, avisarOtros);
  }
  function emitir(ev, avisarOtros) {
    oyentes.forEach(f => { try { f(ev); } catch (e) { console.warn(e); } });
    if (avisarOtros && canal) canal.postMessage(ev);
  }
  async function recargarDe(ev) {
    if (ev.medio) { const b = await tx('medios', 'readonly', s => s.get(ev.medio)); if (b && !objetos.has(ev.medio)) objetos.set(ev.medio, URL.createObjectURL(b)); }
    else if (ev.borrado) colMap(ev.col).delete(ev.id);
    else { const r = await tx('registros', 'readonly', s => s.get(ev.col + '/' + ev.id)); if (r) colMap(ev.col).set(ev.id, r.datos); }
    oyentes.forEach(f => { try { f(ev); } catch (e) { console.warn(e); } });
  }
  const lista = col => [...colMap(col).values()];
  const obtener = (col, id) => colMap(col).get(id) || null;

  // imágenes subidas por el negocio: se reducen a WebP de 1000 px antes de guardarlas
  async function comprimir(archivo, max = 1000) {
    const bmp = await createImageBitmap(archivo);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(r => cv.toBlob(r, 'image/webp', 0.82)) || await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
  }

  // ------------------------------------------------------------ sesión
  let sesion = U.ls.get('myr2_sesion', null);   // {id, nombre, correo, celular, direccion, rol, permisos, foto}
  const guardarSesion = s => { sesion = s; s ? U.ls.set('myr2_sesion', s) : U.ls.del('myr2_sesion'); };
  const publico = u => u && ({ id: u.id, nombre: u.nombre, correo: u.correo, celular: u.celular || '', direccion: u.direccion || '', rol: u.rol || 'cliente', permisos: u.permisos || ROLES[u.rol || 'cliente'].permisos, foto: u.foto || '' });
  const hashClave = (correo, clave) => U.sha('MYR-U|' + correo.trim().toLowerCase() + '|' + clave);
  function decodificarJWT(t) {
    const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(p).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  }

  // ------------------------------------------------------------ MODO DEMO
  const local = {
    modo: 'demo',
    async iniciar() {
      // semillas: cuentas iniciales, menú, salsas, ocasiones y publicidad
      if (!U.ls.get('myr2_semilla', false)) {
        for (const c of C.cuentasIniciales) await ponerLocal('usuarios', { id: U.uid(), nombre: c.nombre, correo: c.correo, rol: c.rol, permisos: ROLES[c.rol].permisos, hash: c.claveHash, creado: new Date().toISOString() }, false);
        await sembrarCatalogo();
        U.ls.set('myr2_semilla', true);
      }
    },
    async registrar(d) {
      const correo = d.correo.trim().toLowerCase();
      if (lista('usuarios').some(u => u.correo === correo)) throw new Error('Ya hay una cuenta con ese correo. Use «Ingresar».');
      const u = { id: U.uid(), nombre: d.nombre.trim(), correo, celular: d.celular || '', direccion: (d.direccion || '').trim(), rol: 'cliente', permisos: [],
        hash: await hashClave(correo, d.clave), google: !!d.google, foto: d.foto || '', autorizaDatos: new Date().toISOString(), creado: new Date().toISOString() };
      await ponerLocal('usuarios', u); guardarSesion(publico(u)); return sesion;
    },
    async ingresar(correo, clave) {
      correo = correo.trim().toLowerCase();
      const u = lista('usuarios').find(x => x.correo === correo || (x.celular && x.celular === correo));
      if (!u) throw new Error('No encontramos esa cuenta. Revise el correo o cree su cuenta.');
      if (u.inactivo) throw new Error('Esta cuenta está desactivada. Hable con el administrador.');
      if (u.hash !== await hashClave(u.correo, clave)) throw new Error('La clave no coincide.');
      guardarSesion(publico(u)); return sesion;
    },
    async datosGoogle(credencial) {
      const p = decodificarJWT(credencial);   // en modo demo no se verifica la firma (ver guía)
      return { correo: (p.email || '').toLowerCase(), nombre: p.name || '', foto: p.picture || '', existe: lista('usuarios').some(u => u.correo === (p.email || '').toLowerCase()) };
    },
    async ingresarGoogle(credencial) {
      const g = await this.datosGoogle(credencial);
      const u = lista('usuarios').find(x => x.correo === g.correo);
      if (!u) return null;
      guardarSesion(publico(u)); return sesion;
    },
    async actualizarPerfil(campos) {
      const u = obtener('usuarios', sesion.id); if (!u) return;
      Object.assign(u, campos); await ponerLocal('usuarios', u); guardarSesion(publico(u)); return sesion;
    },
    async cambiarClave(clave) { const u = obtener('usuarios', sesion.id); u.hash = await hashClave(u.correo, clave); await ponerLocal('usuarios', u); },
    salir() { guardarSesion(null); },
    async borrarCuenta() {
      const id = sesion.id;
      for (const p of lista('pedidos').filter(x => x.autor === id)) {
        for (const m of lista('mensajes').filter(x => x.pedido === p.id)) await quitarLocal('mensajes', m.id);
        await quitarLocal('pedidos', p.id);
      }
      for (const r of lista('reservas').filter(x => x.autor === id)) await quitarLocal('reservas', r.id);
      await quitarLocal('usuarios', id); guardarSesion(null);
    },
    // equipo (solo personal con permiso)
    async crearEmpleado(d) {
      const correo = d.correo.trim().toLowerCase();
      if (lista('usuarios').some(u => u.correo === correo)) throw new Error('Ya existe una cuenta con ese correo.');
      if (d.rol === 'superadmin' && sesion.rol !== 'superadmin') throw new Error('Solo un superadministrador crea superadministradores.');
      const u = { id: U.uid(), nombre: d.nombre.trim(), correo, celular: d.celular || '', rol: d.rol, permisos: d.permisos, hash: await hashClave(correo, d.clave), creado: new Date().toISOString() };
      await ponerLocal('usuarios', u); return u;
    },
    async actualizarEmpleado(id, campos) {
      const u = obtener('usuarios', id); if (!u) return;
      if ((u.rol === 'superadmin' || campos.rol === 'superadmin') && sesion.rol !== 'superadmin') throw new Error('Solo un superadministrador cambia a otro superadministrador.');
      if (campos.clave) { u.hash = await hashClave(u.correo, campos.clave); delete campos.clave; }
      Object.assign(u, campos); await ponerLocal('usuarios', u); return u;
    },
    personal() { return lista('usuarios').filter(u => u.rol !== 'cliente').map(u => ({ ...u, hash: undefined })); },
    clientes() { return lista('usuarios').filter(u => u.rol === 'cliente').map(u => ({ ...u, hash: undefined })); },
    // registros genéricos
    lista, obtener,
    async guardar(col, d) {
      const ahora = new Date().toISOString();
      const r = { ...d, id: d.id || U.uid(), creado: d.creado || ahora, actualizado: ahora, autor: d.autor || (sesion && sesion.id) || null };
      await ponerLocal(col, r); return r;
    },
    async borrar(col, id) { await quitarLocal(col, id); },
    async refrescar() { /* en modo demo todo ya está aquí */ },
    async subirFoto(archivo) {
      const blob = await comprimir(archivo); const ref = 'medio:' + U.uid();
      await tx('medios', 'readwrite', s => s.put(blob, ref));
      objetos.set(ref, URL.createObjectURL(blob)); if (canal) canal.postMessage({ medio: ref });
      return ref;
    }
  };

  async function sembrarCatalogo(guardar = (c, d) => ponerLocal(c, d, false)) {
    const K = window.CATALOGO; let n = 0;
    for (const p of K.PRODUCTOS) await guardar('menu', { ...p, orden: n++ });
    n = 0; for (const s of K.SALSAS) await guardar('salsas', { ...s, orden: n++ });
    n = 0; for (const o of K.OCASIONES) await guardar('ocasiones', { ...o, orden: n++ });
    n = 0; for (const p of K.PUBLICIDAD) await guardar('publicidad', { ...p, orden: n++ });
  }

  // ------------------------------------------------------------ MODO SUPABASE
  function crearSupabase() {
    const URL_ = C.supabase.url.replace(/\/$/, ''), KEY = C.supabase.llave;
    let tok = U.ls.get('myr2_sb', null);
    const guardarTok = t => { tok = t; t ? U.ls.set('myr2_sb', t) : U.ls.del('myr2_sb'); };
    async function auth(ruta, cuerpo, metodo = 'POST', conToken = false) {
      const h = { apikey: KEY, 'Content-Type': 'application/json' };
      if (conToken) h.Authorization = 'Bearer ' + await token();
      const r = await fetch(`${URL_}/auth/v1/${ruta}`, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(traducir(j.error_description || j.msg || j.message || 'No se pudo conectar.'));
      return j;
    }
    function traducir(m) {
      if (/Invalid login/i.test(m)) return 'Correo o clave incorrectos.';
      if (/already registered/i.test(m)) return 'Ya hay una cuenta con ese correo. Use «Ingresar».';
      if (/Email not confirmed/i.test(m)) return 'Confirme su correo con el enlace que le enviamos.';
      return m;
    }
    async function token() {
      if (!tok) return null;
      if (Date.now() > tok.expira - 60000) {
        try { const j = await auth('token?grant_type=refresh_token', { refresh_token: tok.refresh }); guardarTok({ acceso: j.access_token, refresh: j.refresh_token, expira: Date.now() + (j.expires_in || 3600) * 1000 }); }
        catch (e) { if (navigator.onLine) guardarTok(null); return null; }
      }
      return tok.acceso;
    }
    async function rest(ruta, op = {}) {
      const t = await token();
      const h = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(op.headers || {}) };
      if (t) h.Authorization = 'Bearer ' + t;
      const r = await fetch(`${URL_}/rest/v1/${ruta}`, { ...op, headers: h });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || 'Error de la base de datos.'); }
      return r.status === 204 ? [] : r.json();
    }
    async function tras(j, extra = {}) {
      guardarTok({ acceso: j.access_token, refresh: j.refresh_token, expira: Date.now() + (j.expires_in || 3600) * 1000 });
      const md = (j.user && j.user.user_metadata) || {};
      let perfil = null;
      try { [perfil] = await rest(`perfiles?user_id=eq.${j.user.id}&select=rol,permisos,nombre,celular`); } catch (e) { /* sin perfil: cliente */ }
      const rol = perfil ? perfil.rol : 'cliente';
      const s = { id: j.user.id, nombre: (perfil && perfil.nombre) || md.nombre || md.full_name || '', correo: j.user.email, celular: (perfil && perfil.celular) || md.celular || '', direccion: md.direccion || '', rol,
        permisos: perfil ? (['admin', 'superadmin'].includes(rol) ? TODOS : perfil.permisos || []) : [], foto: md.foto || md.avatar_url || '', ...extra };
      guardarSesion(s);
      // copia local de la credencial para entrar sin señal
      if (extra.clave) { await ponerLocal('credenciales', { id: s.correo, hash: await hashClave(s.correo, extra.clave), sesion: { ...s, clave: undefined } }, false); delete sesion.clave; U.ls.set('myr2_sesion', sesion); }
      return sesion;
    }
    // UPDATE si la fila ya está en la nube (el personal cambia estados sin ser el autor); si no, INSERT.
    // Así también sube a la nube el menú de ejemplo la primera vez que el administrador lo edita.
    async function subir(col, r) {
      const filtro = `registros?coleccion=eq.${col}&id=eq.${encodeURIComponent(r.id)}`;
      const cambiadas = await rest(filtro + '&select=id', { method: 'PATCH', body: JSON.stringify({ datos: r, actualizado: r.actualizado }) });
      if (!cambiadas.length) await rest('registros', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ coleccion: col, id: r.id, autor: r.autor, datos: r }) });
    }
    const COLS_PUBLICAS = ['menu', 'salsas', 'ocasiones', 'publicidad', 'ajustes'];
    return {
      modo: 'supabase',
      async iniciar() {
        if (!navigator.onLine) return;
        await Promise.all(COLS_PUBLICAS.map(c => this.refrescar(c).catch(() => {})));
        if (!lista('menu').length) await sembrarCatalogo();   // sin menú en la nube: el de ejemplo, solo en local
      },
      async registrar(d) {
        const correo = d.correo.trim().toLowerCase();
        const j = await auth('signup', { email: correo, password: d.clave, data: { nombre: d.nombre.trim(), celular: d.celular, direccion: (d.direccion || '').trim(), foto: d.foto || '' } });
        if (!j.access_token) throw new Error('Le enviamos un correo para confirmar la cuenta. Ábralo y luego ingrese.');
        return tras(j, { clave: d.clave });
      },
      async ingresar(correo, clave) {
        correo = correo.trim().toLowerCase();
        if (!navigator.onLine) {           // sin señal: la credencial guardada en el teléfono
          const c = obtener('credenciales', correo);
          if (!c || c.hash !== await hashClave(correo, clave)) throw new Error('Sin señal: solo puede entrar con una cuenta que ya usó en este teléfono.');
          guardarSesion(c.sesion); return sesion;
        }
        return tras(await auth('token?grant_type=password', { email: correo, password: clave }), { clave });
      },
      async datosGoogle(credencial) { const p = decodificarJWT(credencial); return { correo: (p.email || '').toLowerCase(), nombre: p.name || '', foto: p.picture || '', existe: false, credencial }; },
      async ingresarGoogle(credencial) { return tras(await auth('token?grant_type=id_token', { provider: 'google', id_token: credencial })); },
      async actualizarPerfil(campos) { await auth('user', { data: campos }, 'PUT', true); guardarSesion({ ...sesion, ...campos }); return sesion; },
      async cambiarClave(clave) { await auth('user', { password: clave }, 'PUT', true); await ponerLocal('credenciales', { id: sesion.correo, hash: await hashClave(sesion.correo, clave), sesion }, false); },
      salir() { guardarSesion(null); guardarTok(null); },
      async borrarCuenta() {
        try { await rest(`registros?autor=eq.${sesion.id}&coleccion=in.(pedidos,reservas,mensajes)`, { method: 'DELETE' }); } catch (e) { /* sin señal */ }
        await quitarLocal('credenciales', sesion.correo, false); this.salir();
      },
      // equipo: el administrador crea el perfil por correo; la persona crea su acceso con ese correo
      async crearEmpleado(d) {
        if (d.rol === 'superadmin' && sesion.rol !== 'superadmin') throw new Error('Solo un superadministrador crea superadministradores.');
        const [f] = await rest('perfiles', { method: 'POST', body: JSON.stringify({ correo: d.correo.trim().toLowerCase(), nombre: d.nombre, celular: d.celular || '', rol: d.rol, permisos: d.permisos }) });
        await this.refrescarPersonal(); return f;
      },
      async actualizarEmpleado(id, campos) {
        delete campos.clave;
        await rest(`perfiles?correo=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(campos) });
        await this.refrescarPersonal();
      },
      async refrescarPersonal() { const fs = await rest('perfiles?select=correo,nombre,celular,rol,permisos,user_id,inactivo'); for (const f of fs) await ponerLocal('personal', { ...f, id: f.correo }, false); },
      personal() { return lista('personal'); },
      clientes() { return []; },
      lista, obtener,
      async guardar(col, d) {
        const ahora = new Date().toISOString();
        const r = { ...d, id: d.id || U.uid(), creado: d.creado || ahora, actualizado: ahora, autor: d.autor || (sesion && sesion.id) || null };
        await ponerLocal(col, r);                     // primero en el teléfono (funciona sin señal)
        try {
          await subir(col, r);
        }
        catch (e) { const pend = U.ls.get('myr2_pendientes', []); pend.push([col, r.id]); U.ls.set('myr2_pendientes', pend); throw Object.assign(new Error('Guardado en el teléfono. Se enviará cuando haya señal.'), { pendiente: true, registro: r }); }
        return r;
      },
      async borrar(col, id) { await quitarLocal(col, id); await rest(`registros?coleccion=eq.${col}&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); },
      async refrescar(col) {
        const fs = await rest(`registros?coleccion=eq.${col}&select=id,datos&order=creado.desc&limit=500`);
        const vistos = new Set();
        for (const f of fs) { vistos.add(f.id); const actual = obtener(col, f.id); if (!actual || actual.actualizado !== f.datos.actualizado) await ponerLocal(col, f.datos, false); }
        if (COLS_PUBLICAS.includes(col)) for (const id of [...colMap(col).keys()]) if (!vistos.has(id) && fs.length) await quitarLocal(col, id, false);
      },
      async enviarPendientes() {
        const pend = U.ls.get('myr2_pendientes', []); const quedan = [];
        for (const [col, id] of pend) {
          const r = obtener(col, id); if (!r) continue;
          try {
            await subir(col, r);
          } catch (e) { quedan.push([col, id]); }
        }
        U.ls.set('myr2_pendientes', quedan); return pend.length - quedan.length;
      },
      async subirFoto(archivo) {
        const blob = await comprimir(archivo); const ruta = `${C.negocio.id}/${U.uid()}.webp`;
        const r = await fetch(`${URL_}/storage/v1/object/medios/${ruta}`, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + await token(), 'Content-Type': blob.type }, body: blob });
        if (!r.ok) throw new Error('No se pudo subir la foto.');
        return `${URL_}/storage/v1/object/public/medios/${ruta}`;
      }
    };
  }

  const D = (C.supabase.url && C.supabase.llave) ? crearSupabase() : local;

  // ------------------------------------------------------------ API pública
  const N = {
    U, PERMISOS, ROLES, ESTADOS, NOMBRE_ESTADO, D,
    async iniciar() {
      idb = await abrirIDB();
      await cargarTodo();
      if ('BroadcastChannel' in window) { canal = new BroadcastChannel('mesa-y-ruta'); canal.onmessage = e => recargarDe(e.data); }
      await D.iniciar();
      if (D.enviarPendientes) window.addEventListener('online', async () => { const n = await D.enviarPendientes(); if (n) U.aviso(`Se enviaron ${n} registros guardados sin señal.`); });
    },
    sesion: () => sesion,
    puede: p => !!sesion && (sesion.rol === 'superadmin' || sesion.rol === 'admin' || (sesion.permisos || []).includes(p)),
    esPersonal: () => !!sesion && sesion.rol !== 'cliente',
    escuchar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
    lista: (col) => D.lista(col),
    obtener: (col, id) => D.obtener(col, id),
    guardar: (col, d) => D.guardar(col, d),
    borrar: (col, id) => D.borrar(col, id),
    refrescar: (col) => D.refrescar(col),
    menu() { return lista('menu').sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)); },
    salsas() { return lista('salsas').sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)); },
    ocasiones() { return lista('ocasiones').sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)); },
    publicidad() { return lista('publicidad').filter(p => p.activo !== false).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)); },
    codigoPedido() {
      const d = new Date(), mmdd = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
      const n = new Uint16Array(1); crypto.getRandomValues(n);
      return `${C.negocio.prefijoPedido}-${mmdd}-${String(n[0] % 10000).padStart(4, '0')}`;
    },
    async mensaje(pedido, de, texto, extra = {}) {
      return D.guardar('mensajes', { pedido, de, texto: String(texto).slice(0, 800), ...extra, autor: (sesion && sesion.id) || null });
    },
    mensajesDe: pid => lista('mensajes').filter(m => m.pedido === pid).sort((a, b) => a.creado.localeCompare(b.creado)),
    // balance del día: ingresos por pedidos entregados/pagados + ingresos de caja; egresos registrados
    balance(desde, hasta) {
      const dentro = iso => { const d = U.diaDe(iso); return d >= desde && d <= hasta; };
      const pedidos = lista('pedidos').filter(p => p.estado !== 'cancelado' && (p.estado === 'entregado' || (p.pago && p.pago.estado === 'pagado')) && dentro(p.entregado || p.creado));
      const ingresosCaja = lista('ingresos').filter(i => dentro(i.fecha || i.creado));
      const egresos = lista('egresos').filter(e => dentro(e.fecha || e.creado));
      const ventas = pedidos.reduce((a, p) => a + p.totales.total, 0);
      const otros = ingresosCaja.reduce((a, i) => a + Number(i.valor || 0), 0);
      const gastos = egresos.reduce((a, e) => a + Number(e.valor || 0), 0);
      return { pedidos, ingresosCaja, egresos, ventas, otros, ingresos: ventas + otros, gastos, neto: ventas + otros - gastos };
    }
  };
  window.N = N;
})();
