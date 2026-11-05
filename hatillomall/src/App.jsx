import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/index.js';
import { DEMO, TOWN } from './config.js';
import { AppCtx, useRoute, Icon, Logo, Spinner, go } from './ui.jsx';
import { registerSW, localNotify } from './lib/push.js';
import { POST_TYPES, STATUS, peso } from './lib/format.js';
import { flush, onQueue, pending } from './lib/offline.js';
import { ding, unlockAudio } from './lib/media.js';
import { Home, BusinessList, BusinessDetail, Offers, MyOrders } from './pages/client.jsx';
import { OrderPage } from './pages/order.jsx';
import { Login, Register, Profile } from './pages/auth.jsx';
import { Panel } from './pages/panel.jsx';
import { Admin } from './pages/admin.jsx';

export default function App() {
  const route = useRoute();
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [work, setWork] = useState(null); // { role: 'owner' | 'cajero', business }
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [cart, setCart] = useState({ businessId: null, items: {} });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  const [queued, setQueued] = useState(pending().length);
  const meRef = useRef(null);

  const toast = useCallback((text, kind = '', link) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind, link }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'news' ? 8000 : 4200);
  }, []);

  const refresh = useCallback(async () => {
    const p = await api.getMyProfile().catch(() => null);
    setProfile(p); meRef.current = p;
    if (p) {
      setWork(await api.getMyWork().catch(() => null));
      setUnread(await api.unreadCount().catch(() => 0));
    } else { setWork(null); setUnread(0); }
    return p;
  }, []);

  useEffect(() => {
    registerSW();
    api.getSession().then((s) => { setSession(s); refresh(); });
    return api.onAuthChange((s) => { setSession(s); refresh(); });
  }, [refresh]);

  // Ventas y gastos guardados sin internet: se suben solos al volver la señal
  const sync = useCallback(async () => {
    const n = await flush({ sale: (p) => api.addSale(p), expense: (p) => api.addExpense(p) });
    if (n) { toast(`Se subieron ${n} ${n === 1 ? 'registro pendiente' : 'registros pendientes'}`, 'ok'); window.dispatchEvent(new Event('hm:synced')); }
  }, [toast]);
  useEffect(() => {
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const un = onQueue((l) => setQueued(l.length));
    if (navigator.onLine !== false) sync();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); un(); };
  }, [sync]);
  useEffect(() => { const u = () => unlockAudio(); window.addEventListener('pointerdown', u, { once: true }); return () => window.removeEventListener('pointerdown', u); }, []);

  // Ofertas nuevas: todos se enteran
  useEffect(() => api.onNewPost((post) => {
    if (meRef.current && post.author_id === meRef.current.id) return;
    if (meRef.current) setUnread((n) => n + 1);
    const title = `${POST_TYPES[post.type] || 'Novedad'} · ${post.business?.name || 'HatilloMall'}`;
    toast(`${title}: ${post.title}`, 'news', '#/ofertas');
    localNotify(title, post.title, '#/ofertas');
    window.dispatchEvent(new CustomEvent('hm:post', { detail: post }));
  }), [toast]);

  // Pedidos del negocio: suena al llegar uno nuevo
  const bizId = work?.business?.id;
  const bizOk = work?.business?.status === 'aprobado';
  useEffect(() => {
    if (!bizId || !bizOk) return undefined;
    return api.onOrdersChange(`business_id=eq.${bizId}`, (p) => {
      if (p.eventType === 'INSERT') {
        ding();
        toast(`¡NUEVO PEDIDO #${p.new.number}! ${peso(p.new.total)}`, 'news', `#/pedido/${p.new.id}`);
        localNotify(`¡Nuevo pedido #${p.new.number}!`, peso(p.new.total), `#/pedido/${p.new.id}`);
      }
      window.dispatchEvent(new CustomEvent('hm:orders', { detail: p }));
    });
  }, [bizId, bizOk, toast]);

  // Pedidos del cliente: aviso de cada cambio
  useEffect(() => {
    if (!profile?.id) return undefined;
    return api.onOrdersChange(`customer_id=eq.${profile.id}`, (p) => {
      if (p.eventType === 'UPDATE' && p.new.status !== 'nuevo' && p.new.business_id !== bizId) {
        toast(`Pedido #${p.new.number}: ${STATUS[p.new.status]}`, 'news', `#/pedido/${p.new.id}`);
      }
      window.dispatchEvent(new CustomEvent('hm:my-orders', { detail: p }));
    });
  }, [profile?.id, bizId, toast]);

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
        const cur = c.items[product.id]?.qty || 0; const items = { ...c.items };
        if (cur <= 1) delete items[product.id]; else items[product.id] = { product, qty: cur - 1 };
        return { ...c, items };
      });
    },
    clear() { setCart({ businessId: null, items: {} }); },
  }), [cart]);

  const ctx = { session, profile, work, setWork, refresh, unread, setUnread, toast, route, online, queued, sync, ...cartApi };
  const p = route.parts;
  let page;
  if (session === undefined) page = <Spinner />;
  else if (p.length === 0) page = <Home />;
  else if (p[0] === 'negocios') page = <BusinessList />;
  else if (p[0] === 'negocio' && p[1]) page = <BusinessDetail id={p[1]} />;
  else if (p[0] === 'ofertas') page = <Offers />;
  else if (p[0] === 'pedidos') page = <MyOrders />;
  else if (p[0] === 'pedido' && p[1]) page = <OrderPage id={p[1]} />;
  else if (p[0] === 'entrar') page = <Login />;
  else if (p[0] === 'registro') page = <Register />;
  else if (p[0] === 'perfil') page = <Profile />;
  else if (p[0] === 'panel') page = <Panel tab={p[1]} />;
  else if (p[0] === 'admin') page = <Admin tab={p[1] || 'resumen'} />;
  else page = <Home />;

  const isSuper = profile?.role === 'superadmin';
  const on = (k) => ((p[0] || '') === k ? 'on' : '');
  const workTab = work ? <a href="#/panel" className={on('panel')}><Icon name="grid" />{work.role === 'cajero' ? 'Caja' : 'Mi negocio'}</a> : null;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {DEMO && (
          <div className="strip demo">
            Demostración con datos de ejemplo, guardados solo en este navegador.
            {api.resetDemo && <button onClick={() => { api.resetDemo(); cartApi.clear(); go('#/'); toast('Datos de ejemplo restaurados', 'ok'); }}>Restaurar</button>}
          </div>
        )}
        {!online && <div className="strip off" role="status">Sin internet. Lo que anote en la caja se guarda en este celular{queued ? ` (${queued} pendientes)` : ''} y se sube solo al volver la señal.</div>}
        {online && queued > 0 && <div className="strip demo" role="status">{queued} {queued === 1 ? 'registro pendiente' : 'registros pendientes'} por subir. <button onClick={sync}>Subir ahora</button></div>}
        <header className="topbar">
          <div className="topbar-in">
            <a className="brand" href="#/">
              <Logo />
              <span><b>Hatillo<span>Mall</span></b><small>{TOWN}, Bolívar</small></span>
            </a>
            <nav className="topnav" aria-label="Principal">
              <a href="#/" className={on('')}>Inicio</a>
              <a href="#/negocios" className={on('negocios')}>Negocios</a>
              <a href="#/ofertas" className={on('ofertas')}>Ofertas</a>
              {profile && <a href="#/pedidos" className={on('pedidos')}>Mis pedidos</a>}
              {work && <a href="#/panel" className={on('panel')}>{work.role === 'cajero' ? 'Caja' : 'Mi negocio'}</a>}
              {isSuper && <a href="#/admin" className={on('admin')}>Equipo</a>}
            </nav>
            <a href="#/ofertas" className="icon-btn" aria-label={`Ofertas${unread ? `, ${unread} sin ver` : ''}`}>
              <Icon name="bell" />{unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
            </a>
            <a href={profile ? '#/perfil' : '#/entrar'} className="icon-btn" aria-label={profile ? 'Mi perfil' : 'Entrar'}><Icon name="user" /></a>
          </div>
        </header>
        <main>{page}</main>
        <nav className="bottomnav" aria-label="Navegación">
          <a href="#/" className={on('')}><Icon name="home" />Inicio</a>
          <a href="#/negocios" className={on('negocios')}><Icon name="store" />Negocios</a>
          <a href="#/ofertas" className={on('ofertas')}><Icon name="bolt" />Ofertas{unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}</a>
          {isSuper ? <a href="#/admin" className={on('admin')}><Icon name="shield" />Equipo</a> : workTab || <a href="#/pedidos" className={on('pedidos')}><Icon name="bag" />Pedidos</a>}
          <a href={profile ? '#/perfil' : '#/entrar'} className={on('perfil') || on('entrar') || on('registro')}><Icon name="user" />{profile ? 'Perfil' : 'Entrar'}</a>
        </nav>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={'toast ' + t.kind}>
              {t.kind === 'news' && <Icon name="bell" size={18} />}<span>{t.text}</span>{t.link && <a href={t.link}>Ver</a>}
            </div>
          ))}
        </div>
      </div>
    </AppCtx.Provider>
  );
}
