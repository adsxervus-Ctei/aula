import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/index.js';
import { DEMO, TOWN } from './config.js';
import { AppCtx, useRoute, Icon, Logo, Spinner, go } from './ui.jsx';
import { registerSW, localNotify } from './lib/push.js';
import { POST_TYPES, ORDER_STATUS, peso } from './lib/format.js';
import { Home, BusinessList, BusinessDetail, Feed, MyOrders } from './pages/client.jsx';
import { Login, Register, Profile } from './pages/auth.jsx';
import { Panel } from './pages/panel.jsx';
import { Admin } from './pages/admin.jsx';

export default function App() {
  const route = useRoute();
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [myBusiness, setMyBusiness] = useState(null);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [cart, setCart] = useState({ businessId: null, items: {} });
  const meRef = useRef(null);

  const toast = useCallback((text, kind = '', link) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind, link }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'news' ? 7000 : 4000);
  }, []);

  const refreshProfile = useCallback(async () => {
    const p = await api.getMyProfile().catch(() => null);
    setProfile(p);
    meRef.current = p;
    if (p) {
      setMyBusiness(await api.getMyBusiness().catch(() => null));
      setUnread(await api.unreadCount().catch(() => 0));
    } else {
      setMyBusiness(null);
      setUnread(0);
    }
    return p;
  }, []);

  // Sesión
  useEffect(() => {
    registerSW();
    api.getSession().then((s) => { setSession(s); refreshProfile(); });
    return api.onAuthChange((s) => { setSession(s); refreshProfile(); });
  }, [refreshProfile]);

  // Novedades en tiempo real: TODOS los usuarios reciben cada publicación
  useEffect(() => api.onNewPost((post) => {
    if (meRef.current && post.author_id === meRef.current.id) return;
    if (meRef.current) setUnread((n) => n + 1);
    const who = post.business?.name || 'Loba Conecta';
    const title = `${POST_TYPES[post.type] || 'Novedad'} · ${who}`;
    toast(`${title}: ${post.title}`, 'news', '#/novedades');
    localNotify(title, post.title, '#/novedades');
    window.dispatchEvent(new CustomEvent('loba:new-post', { detail: post }));
  }), [toast]);

  // Pedidos en tiempo real para el dueño del negocio
  useEffect(() => {
    if (!myBusiness?.id || myBusiness.status !== 'aprobado') return undefined;
    return api.onOrdersChange(`business_id=eq.${myBusiness.id}`, (payload) => {
      if (payload.eventType === 'INSERT') {
        toast(`Nuevo pedido por ${peso(payload.new.total)}`, 'news', '#/panel/pedidos');
        localNotify('Nuevo pedido', `Pedido por ${peso(payload.new.total)}`, '#/panel/pedidos');
      }
      window.dispatchEvent(new CustomEvent('loba:orders', { detail: payload }));
    });
  }, [myBusiness?.id, myBusiness?.status, toast]);

  // Cambios de estado para el cliente
  useEffect(() => {
    if (!profile?.id) return undefined;
    return api.onOrdersChange(`customer_id=eq.${profile.id}`, (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new.status !== 'nuevo') {
        const st = ORDER_STATUS[payload.new.status] || payload.new.status;
        if (!(myBusiness && payload.new.business_id === myBusiness.id)) toast(`Tu pedido: ${st}`, 'news', '#/pedidos');
      }
      window.dispatchEvent(new CustomEvent('loba:my-orders', { detail: payload }));
    });
  }, [profile?.id, myBusiness, toast]);

  // ---------- Carrito (un negocio a la vez) ----------
  const cartApi = useMemo(() => ({
    cart,
    add(product) {
      setCart((c) => {
        const base = c.businessId === product.business_id ? c : { businessId: product.business_id, items: {} };
        const cur = base.items[product.id]?.qty || 0;
        return { ...base, items: { ...base.items, [product.id]: { product, qty: Math.min(99, cur + 1) } } };
      });
    },
    remove(product) {
      setCart((c) => {
        const cur = c.items[product.id]?.qty || 0;
        const items = { ...c.items };
        if (cur <= 1) delete items[product.id]; else items[product.id] = { product, qty: cur - 1 };
        return { ...c, items };
      });
    },
    clear() { setCart({ businessId: null, items: {} }); },
  }), [cart]);

  const ctx = { session, profile, myBusiness, refreshProfile, setMyBusiness, unread, setUnread, toast, route, ...cartApi };

  const p = route.parts;
  let page;
  if (session === undefined) page = <Spinner />;
  else if (p.length === 0) page = <Home />;
  else if (p[0] === 'negocios') page = <BusinessList />;
  else if (p[0] === 'negocio' && p[1]) page = <BusinessDetail id={p[1]} />;
  else if (p[0] === 'novedades') page = <Feed />;
  else if (p[0] === 'pedidos') page = <MyOrders />;
  else if (p[0] === 'entrar') page = <Login />;
  else if (p[0] === 'registro') page = <Register />;
  else if (p[0] === 'perfil') page = <Profile />;
  else if (p[0] === 'panel') page = <Panel tab={p[1] || 'resumen'} />;
  else if (p[0] === 'admin') page = <Admin tab={p[1] || 'resumen'} />;
  else page = <Home />;

  const isOwner = !!myBusiness;
  const isSuper = profile?.role === 'superadmin';
  const on = (k) => (p[0] || '') === k ? 'on' : '';

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {DEMO && (
          <div className="demo-bar">
            Modo demostración: los datos son de ejemplo y se guardan solo en este navegador.
            {api.resetDemo && <button onClick={() => { api.resetDemo(); cartApi.clear(); go('#/'); toast('Datos de ejemplo restaurados', 'ok'); }}>Restaurar</button>}
          </div>
        )}
        <header className="topbar">
          <div className="topbar-in">
            <a className="brand" href="#/">
              <Logo />
              <span><b>Loba Conecta</b><small>{TOWN}</small></span>
            </a>
            <nav className="topnav" aria-label="Principal">
              <a href="#/" className={on('')}>Inicio</a>
              <a href="#/negocios" className={on('negocios')}>Negocios</a>
              <a href="#/novedades" className={on('novedades')}>Novedades</a>
              {profile && <a href="#/pedidos" className={on('pedidos')}>Mis pedidos</a>}
              {isOwner && <a href="#/panel" className={on('panel')}>Mi negocio</a>}
              {isSuper && <a href="#/admin" className={on('admin')}>Administración</a>}
            </nav>
            <a href="#/novedades" className="icon-btn" aria-label={`Novedades${unread ? `, ${unread} sin leer` : ''}`}>
              <Icon name="bell" />
              {unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
            </a>
            <a href={profile ? '#/perfil' : '#/entrar'} className="icon-btn" aria-label={profile ? 'Mi perfil' : 'Entrar'}>
              <Icon name="user" />
            </a>
          </div>
        </header>

        <main>{page}</main>

        <nav className="bottomnav" aria-label="Navegación">
          <a href="#/" className={on('')}><Icon name="home" />Inicio</a>
          <a href="#/negocios" className={on('negocios')}><Icon name="store" />Negocios</a>
          <a href="#/novedades" className={on('novedades')}>
            <Icon name="bell" />Novedades
            {unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
          </a>
          {isSuper ? <a href="#/admin" className={on('admin')}><Icon name="shield" />Admin</a>
            : isOwner ? <a href="#/panel" className={on('panel')}><Icon name="grid" />Mi negocio</a>
              : <a href="#/pedidos" className={on('pedidos')}><Icon name="bag" />Pedidos</a>}
          <a href={profile ? '#/perfil' : '#/entrar'} className={on('perfil') || on('entrar') || on('registro')}><Icon name="user" />{profile ? 'Perfil' : 'Entrar'}</a>
        </nav>

        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={'toast ' + t.kind}>
              {t.kind === 'news' && <Icon name="bell" size={18} />}
              <span>{t.text}</span>
              {t.link && <a href={t.link}>Ver</a>}
            </div>
          ))}
        </div>
      </div>
    </AppCtx.Provider>
  );
}
