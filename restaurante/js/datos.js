/* ============================================================
   MESA Y RUTA · capa de datos
   Dos modos con la misma interfaz:
   · DEMO: todo en este navegador (localStorage). El panel del negocio,
     abierto en otra pestaña del MISMO navegador, ve pedidos y chat.
   · SUPABASE: base de datos gratuita en la nube. Pedidos y chat llegan
     al panel desde cualquier teléfono. Se activa llenando CONFIG.supabase.
   ============================================================ */
(function () {
  'use strict';
  const C = window.CONFIG;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento lleno o bloqueado */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
  };
  async function sha(t) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  function codigoPedido() {
    const d = new Date(), mmdd = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const n = new Uint16Array(1); crypto.getRandomValues(n);
    return `${C.negocio.prefijoPedido}-${mmdd}-${String(n[0] % 10000).padStart(4, '0')}`;
  }
  const publico = u => u && ({ id: u.id, nombre: u.nombre, celular: u.celular, correo: u.correo, direccion: u.direccion || '' });
  const oyentes = new Set();
  const avisar = (que) => oyentes.forEach(f => { try { f(que); } catch (e) { console.warn(e); } });
  const ESTADOS = ['recibido', 'confirmado', 'preparando', 'en_camino', 'entregado'];

  /* ---------------------------------------------------- DEMO */
  const demo = {
    modo: 'demo',
    async registrar(d) {
      const us = LS.get('myr_usuarios', []);
      const correo = d.correo.trim().toLowerCase();
      if (us.some(u => u.correo === correo || u.celular === d.celular)) throw new Error('Ya hay una cuenta con ese correo o celular. Use «Ingresar».');
      const u = { id: uid(), nombre: d.nombre.trim(), celular: d.celular, correo, direccion: (d.direccion || '').trim(),
        hash: await sha('MYR-U|' + correo + '|' + d.clave), creado: new Date().toISOString() };
      us.push(u); LS.set('myr_usuarios', us); LS.set('myr_sesion', publico(u));
      return publico(u);
    },
    async ingresar(usuario, clave) {
      const q = usuario.trim().toLowerCase();
      const u = LS.get('myr_usuarios', []).find(x => x.correo === q || x.celular === q);
      if (!u) throw new Error('No encontramos esa cuenta en este teléfono. Puede crearla.');
      if (u.hash !== await sha('MYR-U|' + u.correo + '|' + clave)) throw new Error('La clave no coincide.');
      LS.set('myr_sesion', publico(u)); return publico(u);
    },
    sesion() { return LS.get('myr_sesion', null); },
    async actualizarPerfil(campos) {
      const s = this.sesion(); if (!s) return null;
      const us = LS.get('myr_usuarios', []); const u = us.find(x => x.id === s.id); if (!u) return null;
      Object.assign(u, campos); LS.set('myr_usuarios', us); LS.set('myr_sesion', publico(u)); return publico(u);
    },
    salir() { LS.del('myr_sesion'); },
    async borrarCuenta() {
      const s = this.sesion(); if (!s) return;
      const ped = LS.get('myr_pedidos', []); const mios = new Set(ped.filter(p => p.cliente_id === s.id).map(p => p.id));
      LS.set('myr_pedidos', ped.filter(p => !mios.has(p.id)));
      LS.set('myr_mensajes', LS.get('myr_mensajes', []).filter(m => !mios.has(m.pedido_id)));
      LS.set('myr_usuarios', LS.get('myr_usuarios', []).filter(u => u.id !== s.id));
      LS.del('myr_sesion'); LS.del('myr_carrito');
    },
    async crearPedido(p) {
      const s = this.sesion(); if (!s) throw new Error('Debe ingresar para hacer el pedido.');
      const ahora = new Date().toISOString();
      const ped = { ...p, id: uid(), codigo: codigoPedido(), cliente_id: s.id, estado: 'recibido', creado: ahora, historial: [{ estado: 'recibido', at: ahora }] };
      const todos = LS.get('myr_pedidos', []); todos.push(ped); LS.set('myr_pedidos', todos);
      await this.enviarMensaje(ped.id, 'sistema', `Recibimos su pedido ${ped.codigo}. En unos minutos se lo confirmamos por aquí.`);
      avisar('pedidos'); return ped;
    },
    async misPedidos() { const s = this.sesion(); if (!s) return []; return LS.get('myr_pedidos', []).filter(p => p.cliente_id === s.id).sort((a, b) => b.creado.localeCompare(a.creado)); },
    async pedido(id) { return LS.get('myr_pedidos', []).find(p => p.id === id) || null; },
    async mensajes(pedidoId) { return LS.get('myr_mensajes', []).filter(m => m.pedido_id === pedidoId).sort((a, b) => a.creado.localeCompare(b.creado)); },
    async enviarMensaje(pedidoId, de, texto) {
      const m = { id: uid(), pedido_id: pedidoId, de, texto: String(texto).slice(0, 500), creado: new Date().toISOString() };
      const ms = LS.get('myr_mensajes', []); ms.push(m); LS.set('myr_mensajes', ms); avisar('mensajes'); return m;
    },
    // ---- negocio
    async ingresarNegocio(clave) { return (await sha('MYR|' + clave)) === C.panel.claveHash; },
    async todosPedidos() { return LS.get('myr_pedidos', []).sort((a, b) => b.creado.localeCompare(a.creado)); },
    async cambiarEstado(id, estado) {
      const todos = LS.get('myr_pedidos', []); const p = todos.find(x => x.id === id); if (!p) return null;
      p.estado = estado; (p.historial = p.historial || []).push({ estado, at: new Date().toISOString() });
      LS.set('myr_pedidos', todos); avisar('pedidos'); return p;
    },
    escuchar(cb) {
      oyentes.add(cb);
      window.addEventListener('storage', e => { if (e.key && e.key.startsWith('myr_')) cb(e.key.includes('mensajes') ? 'mensajes' : 'pedidos'); });
      return () => oyentes.delete(cb);
    }
  };

  /* ---------------------------------------------------- SUPABASE */
  function crearSupabase() {
    const URL_ = C.supabase.url.replace(/\/$/, ''), KEY = C.supabase.llave;
    // El panel guarda su sesión aparte, para no cerrar la del cliente si se abren en el mismo navegador.
    const clave = /panel\.html$/.test(location.pathname) ? 'myr_sb_panel' : 'myr_sb_sesion';
    let ses = LS.get(clave, null);
    const guardar = s => { ses = s; s ? LS.set(clave, s) : LS.del(clave); };
    async function auth(ruta, cuerpo) {
      const r = await fetch(`${URL_}/auth/v1/${ruta}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
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
    function deSesion(j) {
      const md = (j.user && j.user.user_metadata) || {};
      return { access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + (j.expires_in || 3600) * 1000,
        usuario: { id: j.user.id, correo: j.user.email, nombre: md.nombre || '', celular: md.celular || '', direccion: md.direccion || '' } };
    }
    async function token() {
      if (!ses) return null;
      if (Date.now() > ses.expira - 60000) {
        try { guardar(deSesion(await auth('token?grant_type=refresh_token', { refresh_token: ses.refresh_token }))); }
        catch (e) { guardar(null); return null; }
      }
      return ses.access_token;
    }
    async function rest(ruta, op = {}) {
      const t = await token(); if (!t) throw new Error('Su sesión venció. Ingrese de nuevo.');
      const r = await fetch(`${URL_}/rest/v1/${ruta}`, { ...op, headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(op.headers || {}) } });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || 'Error de la base de datos.'); }
      return r.status === 204 ? [] : r.json();
    }
    const aPedido = f => f && ({ ...f.datos, id: f.id, codigo: f.codigo, cliente_id: f.cliente_id, estado: f.estado, creado: f.creado, historial: f.historial || [] });
    let timer = null;
    return {
      modo: 'supabase',
      async registrar(d) {
        const j = await auth('signup', { email: d.correo.trim().toLowerCase(), password: d.clave, data: { nombre: d.nombre.trim(), celular: d.celular, direccion: (d.direccion || '').trim() } });
        if (!j.access_token) throw new Error('Le enviamos un correo para confirmar la cuenta. Ábralo y luego ingrese.');
        guardar(deSesion(j)); return ses.usuario;
      },
      async ingresar(usuario, clave) {
        if (!usuario.includes('@')) throw new Error('Ingrese con su correo.');
        guardar(deSesion(await auth('token?grant_type=password', { email: usuario.trim().toLowerCase(), password: clave }))); return ses.usuario;
      },
      sesion() { return ses ? ses.usuario : null; },
      async actualizarPerfil(campos) {
        const t = await token(); if (!t) return null;
        await fetch(`${URL_}/auth/v1/user`, { method: 'PUT', headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: campos }) });
        Object.assign(ses.usuario, campos); guardar(ses); return ses.usuario;
      },
      salir() { guardar(null); },
      async borrarCuenta() {
        // Borra pedidos propios (y sus mensajes por cascada). La cuenta de acceso
        // la elimina el negocio desde Supabase (Authentication → Users), según su política de datos.
        try { await rest(`pedidos?cliente_id=eq.${ses.usuario.id}`, { method: 'DELETE' }); } catch (e) { /* sin permiso o sin señal */ }
        guardar(null); LS.del('myr_carrito');
      },
      async crearPedido(p) {
        const s = this.sesion(); if (!s) throw new Error('Debe ingresar para hacer el pedido.');
        const ahora = new Date().toISOString();
        const [f] = await rest('pedidos', { method: 'POST', body: JSON.stringify({ codigo: codigoPedido(), cliente_id: s.id, estado: 'recibido', datos: p, historial: [{ estado: 'recibido', at: ahora }] }) });
        await this.enviarMensaje(f.id, 'sistema', `Recibimos su pedido ${f.codigo}. En unos minutos se lo confirmamos por aquí.`);
        return aPedido(f);
      },
      async misPedidos() { const s = this.sesion(); if (!s) return []; return (await rest(`pedidos?cliente_id=eq.${s.id}&order=creado.desc`)).map(aPedido); },
      async pedido(id) { const [f] = await rest(`pedidos?id=eq.${id}`); return aPedido(f); },
      async mensajes(pid) { return rest(`mensajes?pedido_id=eq.${pid}&order=creado.asc`); },
      async enviarMensaje(pid, de, texto) { const [m] = await rest('mensajes', { method: 'POST', body: JSON.stringify({ pedido_id: pid, de, texto: String(texto).slice(0, 500) }) }); avisar('mensajes'); return m; },
      async ingresarNegocio(correo, clave) { await this.ingresar(correo, clave); let r = []; try { r = await rest('personal?select=user_id&limit=1'); } catch (e) { r = []; } if (!r.length) { guardar(null); return false; } return true; },
      async todosPedidos() { return (await rest('pedidos?order=creado.desc&limit=200')).map(aPedido); },
      async cambiarEstado(id, estado) {
        const p = await this.pedido(id); const h = (p.historial || []).concat({ estado, at: new Date().toISOString() });
        const [f] = await rest(`pedidos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ estado, historial: h }) }); avisar('pedidos'); return aPedido(f);
      },
      escuchar(cb) {
        oyentes.add(cb);
        if (!timer) timer = setInterval(() => { if (document.visibilityState === 'visible' && ses) avisar('sondeo'); }, 5000);
        return () => oyentes.delete(cb);
      }
    };
  }

  window.Datos = (C.supabase.url && C.supabase.llave) ? crearSupabase() : demo;
  window.Datos.ESTADOS = ESTADOS;
  window.Datos.sha = sha;
  window.Datos.LS = LS;
})();
