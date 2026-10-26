import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, Icon, Avatar, Empty, Spinner, Sheet, Field, go } from '../ui.jsx';
import { peso, timeAgo, POST_TYPES, ORDER_STATUS, waLink, orderText } from '../lib/format.js';
import { pushStatus, enablePush, pushSupport } from '../lib/push.js';
import { TOWN } from '../config.js';

// ---------- Tarjetas reutilizables ----------
export function BusinessCard({ b }) {
  return (
    <a className="card click" href={`#/negocio/${b.id}`}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Avatar name={b.name} url={b.logo_url} />
        <div className="stack" style={{ gap: 4, minWidth: 0 }}>
          <h3>{b.name}</h3>
          <span className="muted small">{b.category?.name}</span>
          <p className="small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.description}</p>
          <div className="row" style={{ gap: 6 }}>
            {b.delivery && <span className="badge green"><Icon name="truck" size={14} />Domicilio</span>}
            {b.hours && <span className="badge gray"><Icon name="clock" size={14} />{b.hours.split('·')[0].trim()}</span>}
          </div>
        </div>
      </div>
    </a>
  );
}

export function PostCard({ post, isNew }) {
  return (
    <article className={'card post' + (isNew ? ' new-flag' : '')}>
      {post.business
        ? <a href={`#/negocio/${post.business.id}`} aria-label={post.business.name}><Avatar name={post.business.name} url={post.business.logo_url} /></a>
        : <div className="avatar" style={{ background: 'var(--teal)', color: '#fff' }}><Icon name="megaphone" /></div>}
      <div className="content">
        <div className="row" style={{ gap: 8 }}>
          <span className={'badge ' + (post.type === 'promocion' ? 'orange' : post.type === 'aviso' ? '' : 'green')}>{POST_TYPES[post.type]}</span>
          {isNew && <span className="badge yellow">Nuevo</span>}
          <span className="muted small">{timeAgo(post.created_at)}</span>
        </div>
        <b>{post.title}</b>
        {post.body && <p className="small">{post.body}</p>}
        {post.image_url && <img className="cover" src={post.image_url} alt="" loading="lazy" />}
        <span className="muted small">
          {post.business ? <a href={`#/negocio/${post.business.id}`}>{post.business.name}</a> : 'Equipo Loba Conecta'}
        </span>
      </div>
    </article>
  );
}

// ---------- Inicio ----------
export function Home() {
  const { profile, myBusiness } = useApp();
  const [q, setQ] = useState('');
  const cats = useLoad(() => api.listCategories());
  const posts = useLoad(() => api.listPosts({ limit: 3 }));
  const biz = useLoad(() => api.listBusinesses());
  useEffect(() => {
    const on = () => posts.reload();
    window.addEventListener('loba:new-post', on);
    return () => window.removeEventListener('loba:new-post', on);
  }, []); // eslint-disable-line

  return (
    <div className="stack" style={{ gap: 22 }}>
      <section className="hero">
        <span className="eyebrow" style={{ color: '#F6C9A8' }}>{TOWN}, Bolívar</span>
        <h1>{profile ? `Hola, ${profile.full_name.split(' ')[0] || 'vecino'}` : 'Los negocios del pueblo, en tu celular'}</h1>
        <p>Menús, productos, promociones y pedidos de los negocios de {TOWN}.</p>
        <form className="search" onSubmit={(e) => { e.preventDefault(); go(`#/negocios?q=${encodeURIComponent(q)}`); }} role="search">
          <Icon name="search" />
          <label className="sr-only" htmlFor="home-q">Buscar negocio</label>
          <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar restaurante, tienda, droguería…" />
        </form>
      </section>

      <div className="chips" aria-label="Categorías">
        {(cats.data || []).map((c) => <a key={c.id} className="chip" href={`#/negocios?cat=${c.id}`}>{c.name}</a>)}
      </div>

      <section className="stack">
        <div className="section-title"><h2>Novedades</h2><a href="#/novedades">Ver todas</a></div>
        {posts.loading ? <Spinner /> : posts.data?.length ? posts.data.map((p) => <PostCard key={p.id} post={p} />)
          : <Empty icon="bell" title="Aún no hay publicaciones" />}
      </section>

      <section className="stack">
        <div className="section-title"><h2>Negocios</h2><a href="#/negocios">Ver todos</a></div>
        {biz.loading ? <Spinner /> : biz.error ? <div className="notice err">{biz.error}</div> : (
          <div className="grid">{(biz.data || []).slice(0, 6).map((b) => <BusinessCard key={b.id} b={b} />)}</div>
        )}
      </section>

      {!myBusiness && (
        <section className="card soft row between">
          <div className="stack" style={{ gap: 4 }}>
            <h3>¿Tienes un negocio en {TOWN}?</h3>
            <p className="small muted">Publica tu menú o tus productos y recibe pedidos. El equipo revisa y aprueba cada negocio.</p>
          </div>
          <a className="btn orange" href={profile ? '#/perfil?negocio=1' : '#/registro?negocio=1'}>Registrar mi negocio</a>
        </section>
      )}
    </div>
  );
}

// ---------- Directorio ----------
export function BusinessList() {
  const { route } = useApp();
  const cat = route.query.cat ? Number(route.query.cat) : null;
  const [q, setQ] = useState(route.query.q || '');
  const [term, setTerm] = useState(route.query.q || '');
  useEffect(() => { const t = setTimeout(() => setTerm(q), 250); return () => clearTimeout(t); }, [q]);
  const cats = useLoad(() => api.listCategories());
  const list = useLoad(() => api.listBusinesses({ categoryId: cat, q: term }), [cat, term]);
  const catName = cats.data?.find((c) => c.id === cat)?.name;

  return (
    <div className="stack">
      <h1>{catName || 'Negocios'}</h1>
      <div className="search">
        <Icon name="search" />
        <label className="sr-only" htmlFor="list-q">Buscar</label>
        <input id="list-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre" />
      </div>
      <div className="chips">
        <a className={'chip' + (!cat ? ' on' : '')} href="#/negocios">Todos</a>
        {(cats.data || []).map((c) => <a key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} href={`#/negocios?cat=${c.id}`}>{c.name}</a>)}
      </div>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div>
        : list.data.length ? <div className="grid">{list.data.map((b) => <BusinessCard key={b.id} b={b} />)}</div>
          : <Empty title="No encontramos negocios">Prueba con otra palabra o categoría.</Empty>}
    </div>
  );
}

// ---------- Detalle del negocio + pedido ----------
export function BusinessDetail({ id }) {
  const app = useApp();
  const { cart, add, remove, clear, profile, toast } = app;
  const biz = useLoad(() => api.getBusiness(id), [id]);
  const prods = useLoad(() => api.listProducts(id), [id]);
  const posts = useLoad(() => api.listPosts({ businessId: id, limit: 3 }), [id]);
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState(null);

  const sections = useMemo(() => {
    const m = {};
    (prods.data || []).filter((p) => p.available).forEach((p) => { (m[p.section || 'General'] ||= []).push(p); });
    return Object.entries(m);
  }, [prods.data]);

  if (biz.loading) return <Spinner />;
  const b = biz.data;
  if (!b) return <Empty title="Este negocio no está disponible"><a className="btn secondary" href="#/negocios">Ver negocios</a></Empty>;

  const myCart = cart.businessId === b.id ? Object.values(cart.items) : [];
  const count = myCart.reduce((s, i) => s + i.qty, 0);
  const subtotal = myCart.reduce((s, i) => s + i.qty * i.product.price, 0);
  const isMine = profile && b.owner_id === profile.id;

  const tryAdd = (p) => {
    if (cart.businessId && cart.businessId !== b.id && Object.keys(cart.items).length) {
      if (!window.confirm('Tienes productos de otro negocio en tu pedido. ¿Empezar un pedido nuevo aquí?')) return;
    }
    add(p);
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <a href="#/negocios" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}><Icon name="back" size={18} />Negocios</a>
      {b.status !== 'aprobado' && <div className="notice warn">Este negocio está {b.status}. Solo tú y el equipo lo ven.</div>}
      <section className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 14 }}>
        <Avatar name={b.name} url={b.logo_url} lg />
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{b.category?.name}</span>
          <h1>{b.name}</h1>
          <p className="muted">{b.description}</p>
        </div>
      </section>
      <section className="card soft stack" style={{ gap: 10 }}>
        {b.address && <div className="row small"><Icon name="pin" size={18} />{b.address}</div>}
        {b.hours && <div className="row small"><Icon name="clock" size={18} />{b.hours}</div>}
        <div className="row small"><Icon name="truck" size={18} />{b.delivery ? `Domicilio ${b.delivery_fee ? peso(b.delivery_fee) : 'gratis'}` : 'Sin domicilio · recoge en el local'}</div>
        {b.whatsapp && (
          <a className="btn green sm" style={{ alignSelf: 'flex-start' }} href={waLink(b.whatsapp, `Hola ${b.name}, te escribo desde Loba Conecta.`)} target="_blank" rel="noopener noreferrer">
            <Icon name="chat" size={18} />Escribir por WhatsApp
          </a>
        )}
      </section>

      {posts.data?.length > 0 && (
        <section className="stack">
          <h2>Últimas publicaciones</h2>
          {posts.data.map((p) => <PostCard key={p.id} post={{ ...p, business: { id: b.id, name: b.name, logo_url: b.logo_url } }} />)}
        </section>
      )}

      <section className="stack" style={{ gap: 8 }}>
        <h2>{b.category?.slug === 'restaurantes' ? 'Menú' : 'Productos y servicios'}</h2>
        {b.category?.slug === 'farmacias' && <div className="notice small">Consulta siempre al regente de farmacia sobre dosis y uso de medicamentos.</div>}
        {prods.loading ? <Spinner /> : sections.length === 0 ? <Empty title="Aún no hay productos publicados" /> :
          sections.map(([sec, items]) => (
            <div key={sec} className="card">
              <h3 style={{ marginBottom: 4 }}>{sec}</h3>
              {items.map((p) => {
                const q = cart.businessId === b.id ? cart.items[p.id]?.qty || 0 : 0;
                return (
                  <div key={p.id} className="product">
                    {p.image_url ? <img className="thumb" src={p.image_url} alt="" loading="lazy" /> : null}
                    <div className="info">
                      <b>{p.name}</b>
                      {p.description && <span className="small muted">{p.description}</span>}
                      <span className="price">{peso(p.price)}</span>
                    </div>
                    {!isMine && (
                      <div className="qty">
                        {q > 0 && <button onClick={() => remove(p)} aria-label={`Quitar un ${p.name}`}>−</button>}
                        {q > 0 && <span aria-live="polite">{q}</span>}
                        <button className="add" onClick={() => tryAdd(p)} aria-label={`Agregar ${p.name}`}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </section>

      {count > 0 && (
        <div className="cartbar">
          <button className="btn orange" onClick={() => (profile ? setCheckout(true) : (toast('Inicia sesión para hacer tu pedido'), go(`#/entrar?volver=${encodeURIComponent('#/negocio/' + b.id)}`)))}>
            <span>Ver pedido · {count} {count === 1 ? 'producto' : 'productos'}</span><span>{peso(subtotal)}</span>
          </button>
        </div>
      )}
      {checkout && <Checkout b={b} items={myCart} subtotal={subtotal} onClose={() => setCheckout(false)} onDone={(o) => { setCheckout(false); clear(); setDone(o); }} />}
      {done && (
        <Sheet title="¡Pedido enviado!" onClose={() => setDone(null)}>
          <div className="notice ok">{b.name} ya recibió tu pedido por {peso(done.total)}. Te avisaremos cuando cambie de estado.</div>
          {b.whatsapp && (
            <a className="btn green block" href={waLink(b.whatsapp, orderText(done, b))} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" size={18} />Enviar también por WhatsApp
            </a>
          )}
          <a className="btn secondary block" href="#/pedidos" onClick={() => setDone(null)}>Ver mis pedidos</a>
        </Sheet>
      )}
    </div>
  );
}

function Checkout({ b, items, subtotal, onClose, onDone }) {
  const { profile, toast } = useApp();
  const [delivery, setDelivery] = useState(b.delivery);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('efectivo');
  const [busy, setBusy] = useState(false);
  const fee = delivery && b.delivery ? b.delivery_fee : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (delivery && address.trim().length < 5) return toast('Escribe la dirección del domicilio', 'err');
    setBusy(true);
    try {
      const order = await api.createOrder({
        business_id: b.id, items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })), delivery, address, note, payment,
      });
      onDone(order);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  return (
    <Sheet title="Tu pedido" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="card">
          {items.map((i) => (
            <div key={i.product.id} className="row between small" style={{ padding: '6px 0' }}>
              <span>{i.qty} × {i.product.name}</span><b>{peso(i.qty * i.product.price)}</b>
            </div>
          ))}
          {fee > 0 && <div className="row between small" style={{ padding: '6px 0' }}><span>Domicilio</span><b>{peso(fee)}</b></div>}
          <div className="row between" style={{ paddingTop: 8, borderTop: '1px solid var(--line)', marginTop: 6 }}><b>Total</b><b className="price">{peso(subtotal + fee)}</b></div>
        </div>
        {b.delivery && (
          <div className="row">
            <button type="button" className={'chip' + (delivery ? ' on' : '')} onClick={() => setDelivery(true)}>Domicilio</button>
            <button type="button" className={'chip' + (!delivery ? ' on' : '')} onClick={() => setDelivery(false)}>Recojo en el local</button>
          </div>
        )}
        {delivery && <Field label="Dirección"><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Barrio, calle, referencia" required /></Field>}
        <Field label="Nota para el negocio (opcional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: sin cebolla" /></Field>
        <Field label="¿Cómo vas a pagar?">
          <select className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia (Nequi, Daviplata o Bre-B)</option>
          </select>
        </Field>
        <p className="small muted">Pide a nombre de {profile?.full_name || 'tu cuenta'} · {profile?.phone || 'sin teléfono'}. El negocio confirmará el pedido.</p>
        <button className="btn orange block" disabled={busy}>{busy ? 'Enviando…' : `Hacer pedido · ${peso(subtotal + fee)}`}</button>
      </form>
    </Sheet>
  );
}

// ---------- Novedades ----------
export function Feed() {
  const { profile, setUnread, toast } = useApp();
  const [lastRead] = useState(() => profile?.last_read_posts_at || null);
  const list = useLoad(() => api.listPosts({ limit: 60 }));
  const [ps, setPs] = useState('off');

  useEffect(() => { pushStatus().then(setPs).catch(() => setPs('unsupported')); }, []);
  useEffect(() => {
    if (!profile) return;
    api.markRead().then(() => setUnread(0)).catch(() => {});
  }, [profile, setUnread]);
  useEffect(() => {
    const on = (e) => { list.setData((d) => [e.detail, ...(d || []).filter((x) => x.id !== e.detail.id)]); if (profile) api.markRead().then(() => setUnread(0)); };
    window.addEventListener('loba:new-post', on);
    return () => window.removeEventListener('loba:new-post', on);
  }, [profile]); // eslint-disable-line

  const activate = async () => {
    try { await enablePush(); setPs('on'); toast('Listo: te avisaremos de cada novedad', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  };
  const support = pushSupport();

  return (
    <div className="stack">
      <h1>Novedades</h1>
      <p className="muted">Todo lo que publican los negocios de {TOWN}: menús nuevos, promociones, servicios y avisos.</p>
      {!profile ? (
        <div className="notice">Crea tu cuenta para recibir un aviso cada vez que haya algo nuevo. <a href="#/registro">Crear cuenta</a></div>
      ) : ps === 'on' ? (
        <div className="notice ok">Notificaciones activadas en este celular.</div>
      ) : ps === 'denied' ? (
        <div className="notice warn">Bloqueaste las notificaciones. Actívalas en la configuración del navegador para este sitio.</div>
      ) : support.ok ? (
        <div className="card soft row between">
          <span className="small"><b>Activa las notificaciones</b> para enterarte de cada menú y promoción, aunque tengas la app cerrada.</span>
          <button className="btn sm" onClick={activate}><Icon name="bell" size={18} />Activar</button>
        </div>
      ) : (
        <div className="notice small">{support.reason}</div>
      )}
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div>
        : list.data.length ? list.data.map((p) => <PostCard key={p.id} post={p} isNew={!!lastRead && p.created_at > lastRead && p.author_id !== profile?.id} />)
          : <Empty icon="bell" title="Aún no hay publicaciones" />}
    </div>
  );
}

// ---------- Mis pedidos ----------
const STEPS = ['nuevo', 'aceptado', 'preparando', 'enviado', 'entregado'];
export function MyOrders() {
  const { profile, toast } = useApp();
  const list = useLoad(() => (profile ? api.listMyOrders() : Promise.resolve([])), [profile?.id]);
  useEffect(() => {
    const on = () => list.reload();
    window.addEventListener('loba:my-orders', on);
    return () => window.removeEventListener('loba:my-orders', on);
  }, []); // eslint-disable-line

  if (!profile) return <Empty icon="bag" title="Inicia sesión para ver tus pedidos"><a className="btn" href="#/entrar?volver=%23%2Fpedidos">Entrar</a></Empty>;

  const cancel = async (o) => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    try { await api.cancelMyOrder(o.id); toast('Pedido cancelado', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div className="stack">
      <h1>Mis pedidos</h1>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : list.data.length === 0
        ? <Empty icon="bag" title="Aún no has hecho pedidos"><a className="btn" href="#/negocios">Ver negocios</a></Empty>
        : list.data.map((o) => {
          const step = STEPS.indexOf(o.status);
          return (
            <article key={o.id} className="card stack" style={{ gap: 10 }}>
              <div className="row between">
                <a href={`#/negocio/${o.business?.id}`}><b>{o.business?.name}</b></a>
                <span className={'badge ' + (o.status === 'cancelado' ? 'red' : o.status === 'entregado' ? 'green' : o.status === 'nuevo' ? 'yellow' : '')}>{ORDER_STATUS[o.status]}</span>
              </div>
              {o.status !== 'cancelado' && <div className="timeline" aria-hidden="true">{STEPS.map((s, i) => <i key={s} className={i <= step ? 'on' : ''} />)}</div>}
              <div className="small muted">{timeAgo(o.created_at)} · {o.delivery ? 'Domicilio' : 'Recoge en el local'} · {o.payment === 'transferencia' ? 'Transferencia' : 'Efectivo'}</div>
              <div className="small">{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</div>
              <div className="row between">
                <b className="price">{peso(o.total)}</b>
                <div className="row">
                  {o.business?.whatsapp && <a className="btn ghost sm" href={waLink(o.business.whatsapp, `Hola, pregunto por mi pedido de ${peso(o.total)} en Loba Conecta.`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={18} />WhatsApp</a>}
                  {o.status === 'nuevo' && <button className="btn danger sm" onClick={() => cancel(o)}>Cancelar</button>}
                </div>
              </div>
            </article>
          );
        })}
    </div>
  );
}
