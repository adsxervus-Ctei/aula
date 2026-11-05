import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, useOn, Icon, Avatar, Empty, Spinner, Sheet, Field, Group, Confirm, CopyText, CAT_ICON, go } from '../ui.jsx';
import { peso, timeAgo, MODE, PAY, STATUS, STATUS_TONE, POST_TYPES, waLink, planVigente, bogotaDay, addDays } from '../lib/format.js';
import { TOWN } from '../config.js';

const minFee = (b) => (b.zones?.length ? Math.min(...b.zones.map((z) => z.fee)) : null);

export function BusinessCard({ b }) {
  const plus = planVigente(b);
  const fee = minFee(b);
  return (
    <a className="card click" href={`#/negocio/${b.id}`}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Avatar name={b.name} url={b.logo_url} />
        <div className="stack" style={{ gap: 4, minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <h3>{b.name}</h3>
          </div>
          <span className="muted small">{b.category?.name} · Listo en {b.prep_minutes} min</span>
          <p className="small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.description}</p>
          <div className="row" style={{ gap: 6 }}>
            {plus ? <span className="badge green">Pida aquí</span> : <span className="badge gray">Pedidos por WhatsApp</span>}
            {plus && b.delivery && fee != null && <span className="badge mango"><Icon name="truck" size={14} />Domicilio desde {peso(fee)}</span>}
            {plus && b.dine_in && <span className="badge blue"><Icon name="table" size={14} />Mesa</span>}
          </div>
        </div>
      </div>
    </a>
  );
}

export function PostCard({ post, boosted, isNew }) {
  return (
    <article className="card" style={boosted ? { borderColor: 'var(--mango)', borderWidth: 2 } : null}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        {post.business
          ? <a href={`#/negocio/${post.business.id}`} aria-label={post.business.name}><Avatar name={post.business.name} url={post.business.logo_url} /></a>
          : <div className="avatar" style={{ background: 'var(--palma)', color: '#fff' }}><Icon name="megaphone" /></div>}
        <div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className={'badge ' + (post.type === 'oferta' ? 'mango' : post.type === 'aviso' ? 'ink' : 'green')}>{POST_TYPES[post.type]}</span>
            {boosted && <span className="badge ink"><Icon name="bolt" size={13} />Destacada</span>}
            {isNew && <span className="badge yellow">Nueva</span>}
            <span className="muted tiny">{timeAgo(post.created_at)}</span>
          </div>
          <b style={{ fontSize: 17 }}>{post.title}</b>
          {post.price && !post.title.includes(peso(post.price)) ? <span className="price" style={{ fontSize: 18 }}>{peso(post.price)}</span> : null}
          {post.body && <p className="small">{post.body}</p>}
          {post.image_url && <img src={post.image_url} alt="" loading="lazy" style={{ borderRadius: 12, maxHeight: 280, width: '100%', objectFit: 'cover' }} />}
          {post.business && <a className="btn secondary sm" style={{ alignSelf: 'flex-start' }} href={`#/negocio/${post.business.id}`}>Ver {post.business.name}</a>}
        </div>
      </div>
    </article>
  );
}

function HeroOffer({ f }) {
  const p = f.post || f;
  const b = f.business;
  return (
    <a className="hero-offer" href={`#/negocio/${b?.id || ''}`} aria-label={`${p.title}, ${b?.name || ''}`}>
      <div className="pic">
        {p.image_url ? <img src={p.image_url} alt="" /> : <div className="plate" aria-hidden="true" />}
        <span className="tag">{f.post ? 'Oferta del día' : 'Oferta reciente'}</span>
      </div>
      <div className="body">
        <span className="small" style={{ color: '#CFE6DA', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{b?.name}</span>
        <h2 style={{ fontSize: 26, color: '#fff' }}>{p.title}</h2>
        {p.price && !p.title.includes(peso(p.price)) ? <span className="price" style={{ color: 'var(--mango)', fontSize: 30, fontFamily: 'var(--display)' }}>{peso(p.price)}</span> : null}
        {p.body && <p style={{ color: '#E9E4DA' }}>{p.body}</p>}
        <div className="row" style={{ gap: 8, color: '#E9E4DA' }}>
          {b?.prep_minutes && <span className="row small" style={{ gap: 4 }}><Icon name="clock" size={16} />Listo en {b.prep_minutes} min</span>}
        </div>
        <span className="btn mango" style={{ alignSelf: 'flex-start', marginTop: 4 }}>VER</span>
      </div>
    </a>
  );
}

export function Home() {
  const { profile, work } = useApp();
  const [q, setQ] = useState('');
  const feat = useLoad(() => api.listFeatured());
  const posts = useLoad(() => api.listPosts({ limit: 8 }));
  const cats = useLoad(() => api.listCategories());
  const biz = useLoad(() => api.listBusinesses());
  useOn('hm:post', () => { posts.reload(); feat.reload(); });

  const counts = useMemo(() => { const m = {}; (biz.data || []).forEach((b) => { m[b.category_id] = (m[b.category_id] || 0) + 1; }); return m; }, [biz.data]);
  const featuredIds = new Set((feat.data || []).map((f) => f.post_id));
  const hero = feat.data?.[0] || (posts.data || []).find((p) => p.type === 'oferta' && p.business);
  const recent = (posts.data || []).filter((p) => !featuredIds.has(p.id) && p !== hero);
  const ordered = (biz.data || []).slice().sort((a, b) => Number(planVigente(b)) - Number(planVigente(a)));

  return (
    <div className="stack" style={{ gap: 22 }}>
      <section className="stack" style={{ gap: 12 }}>
        <h1>{profile ? `Hola, ${profile.full_name.split(' ')[0] || 'vecino'}` : `Todo ${TOWN} en una sola app`}</h1>
        <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); go(`#/negocios?q=${encodeURIComponent(q)}`); }}>
          <Icon name="search" />
          <label className="sr-only" htmlFor="home-q">Buscar negocio</label>
          <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar asado, tienda, droguería…" />
        </form>
      </section>

      {feat.loading || posts.loading ? <Spinner /> : hero ? (
        <section className="stack" style={{ gap: 10 }}>
          <HeroOffer f={hero.post ? hero : { ...hero, business: hero.business }} />
          {(feat.data || []).length > 1 && (
            <div className="chips">{feat.data.slice(1).map((f) => <a key={f.id} className="chip" href={`#/negocio/${f.business?.id}`}><Icon name="bolt" size={16} />{f.post?.title}</a>)}</div>
          )}
        </section>
      ) : null}

      <section className="stack" style={{ gap: 10 }}>
        <h2>¿Qué necesita?</h2>
        <div className="grid tiles">
          {(cats.data || []).map((c) => (
            <a key={c.id} className="cat-tile" href={`#/negocios?cat=${c.id}`}>
              <Icon name={CAT_ICON[c.slug] || 'store'} size={26} />
              <b>{c.name}</b>
              <span className="small muted">{counts[c.id] || 0} en la app</span>
            </a>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="stack">
          <div className="section-title"><h2>Ofertas y novedades</h2><a href="#/ofertas">Ver todas</a></div>
          {recent.slice(0, 3).map((p) => <PostCard key={p.id} post={p} />)}
        </section>
      )}

      <section className="stack">
        <div className="section-title"><h2>Negocios</h2><a href="#/negocios">Ver todos</a></div>
        {biz.loading ? <Spinner /> : biz.error ? <div className="notice err">{biz.error}</div> : (
          <div className="grid">{ordered.slice(0, 6).map((b) => <BusinessCard key={b.id} b={b} />)}</div>
        )}
      </section>

      {!work && (
        <section className="card soft stack" style={{ gap: 10 }}>
          <h3>¿Tiene un negocio en {TOWN}?</h3>
          <p className="small muted">Aparezca gratis con foto y WhatsApp. Con el plan PLUS recibe pedidos, publica ofertas y lleva ventas, gastos, ganancia e inventario sin cuaderno.</p>
          <a className="btn mango" style={{ alignSelf: 'flex-start' }} href={profile ? '#/perfil?negocio=1' : '#/registro?negocio=1'}>Registrar mi negocio</a>
        </section>
      )}
    </div>
  );
}

export function BusinessList() {
  const { route } = useApp();
  const cat = route.query.cat ? Number(route.query.cat) : null;
  const [q, setQ] = useState(route.query.q || '');
  const [term, setTerm] = useState(route.query.q || '');
  useEffect(() => { const t = setTimeout(() => setTerm(q), 250); return () => clearTimeout(t); }, [q]);
  const cats = useLoad(() => api.listCategories());
  const list = useLoad(() => api.listBusinesses({ categoryId: cat, q: term }), [cat, term]);
  const name = cats.data?.find((c) => c.id === cat)?.name;
  const ordered = (list.data || []).slice().sort((a, b) => Number(planVigente(b)) - Number(planVigente(a)));
  return (
    <div className="stack">
      <h1>{name || 'Negocios'}</h1>
      <div className="search"><Icon name="search" /><label className="sr-only" htmlFor="lq">Buscar</label><input id="lq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre" /></div>
      <div className="chips">
        <a className={'chip' + (!cat ? ' on' : '')} href="#/negocios">Todos</a>
        {(cats.data || []).map((c) => <a key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} href={`#/negocios?cat=${c.id}`}>{c.name}</a>)}
      </div>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div>
        : ordered.length ? <div className="grid">{ordered.map((b) => <BusinessCard key={b.id} b={b} />)}</div>
          : <Empty title="No encontramos negocios">Pruebe con otra palabra o categoría.</Empty>}
    </div>
  );
}

export function BusinessDetail({ id }) {
  const { cart, add, remove, clear, profile, work, toast } = useApp();
  const biz = useLoad(() => api.getBusiness(id), [id]);
  const prods = useLoad(() => api.listProducts(id), [id]);
  const posts = useLoad(() => api.listPosts({ businessId: id, limit: 3 }), [id]);
  const [checkout, setCheckout] = useState(false);
  const [switchTo, setSwitchTo] = useState(null);
  const [legal, setLegal] = useState(false);
  const sections = useMemo(() => {
    const m = {}; (prods.data || []).filter((p) => p.available).forEach((p) => { (m[p.section || 'General'] ||= []).push(p); });
    return Object.entries(m);
  }, [prods.data]);

  if (biz.loading) return <Spinner />;
  const b = biz.data;
  if (!b) return <Empty title="Este negocio no está disponible"><a className="btn secondary" href="#/negocios">Ver negocios</a></Empty>;
  const plus = planVigente(b);
  const mine = work?.business?.id === b.id;
  const canOrder = plus && b.status === 'aprobado' && !mine;
  const myCart = cart.businessId === b.id ? Object.values(cart.items) : [];
  const count = myCart.reduce((s, i) => s + i.qty, 0);
  const subtotal = myCart.reduce((s, i) => s + i.qty * i.product.price, 0);
  const tryAdd = (p) => { if (cart.businessId && cart.businessId !== b.id && Object.keys(cart.items).length) return setSwitchTo(p); add(p); };
  const fee = minFee(b);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <a href="#/negocios" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}><Icon name="back" size={18} />Negocios</a>
      {b.status !== 'aprobado' && <div className="notice warn">Este negocio está {b.status}. Solo usted y el equipo lo ven.</div>}
      <section className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 14 }}>
        <Avatar name={b.name} url={b.logo_url} lg />
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <span className="eyebrow">{b.category?.name}</span>
          <h1>{b.name}</h1>
          <p className="muted">{b.description}</p>
        </div>
      </section>
      <section className="card soft stack" style={{ gap: 10 }}>
        {b.address && <div className="row small"><Icon name="pin" size={18} />{b.address}</div>}
        {b.hours && <div className="row small"><Icon name="clock" size={18} />{b.hours} · Listo en {b.prep_minutes} minutos</div>}
        {plus && (
          <div className="row" style={{ gap: 6 }}>
            {b.delivery && fee != null && <span className="badge mango"><Icon name="truck" size={14} />Domicilio desde {peso(fee)}</span>}
            {b.dine_in && <span className="badge blue"><Icon name="table" size={14} />Comer allá</span>}
            {b.pickup && <span className="badge green"><Icon name="bag" size={14} />Recoger</span>}
            {b.allow_fiado && <span className="badge gray">Fiado a clientes de confianza</span>}
          </div>
        )}
        {b.whatsapp && (
          <a className={'btn sm ' + (plus ? 'secondary' : '')} style={{ alignSelf: 'flex-start' }} href={waLink(b.whatsapp, `Hola ${b.name}, le escribo desde HatilloMall.`)} target="_blank" rel="noopener noreferrer">
            <Icon name="chat" size={18} />{plus ? 'WhatsApp' : 'Pedir por WhatsApp'} · {b.whatsapp}
          </a>
        )}
        {!plus && <p className="small muted">Este negocio está en la vitrina gratuita: haga su pedido por WhatsApp.</p>}
      </section>

      {posts.data?.length > 0 && (
        <section className="stack"><h2>Ofertas</h2>{posts.data.map((p) => <PostCard key={p.id} post={{ ...p, business: null }} />)}</section>
      )}

      <section className="stack" style={{ gap: 8 }}>
        <h2>{b.category?.slug === 'restaurantes' ? 'Menú' : 'Productos'}</h2>
        {b.category?.slug === 'farmacias' && <div className="notice info small">Solo productos de venta libre. Para dosis o medicamentos con fórmula, consulte al regente de farmacia.</div>}
        {prods.loading ? <Spinner /> : sections.length === 0 ? <Empty title="Aún no hay productos publicados" /> : sections.map(([sec, items]) => (
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
                  {canOrder && (
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

      <section>
        <button className="btn ghost sm" onClick={() => setLegal(!legal)} aria-expanded={legal}>Datos del vendedor (Ley 1480 de 2011)</button>
        {legal && (
          <div className="card small stack" style={{ gap: 4 }}>
            <span><b>Nombre o razón social:</b> {b.legal_name || b.name}</span>
            <span><b>Identificación:</b> {b.id_number || 'Pendiente de registrar'}</span>
            <span><b>Dirección de notificaciones:</b> {b.notify_address || b.address || 'Pendiente de registrar'}</span>
            <span><b>Teléfono:</b> {b.whatsapp || 'Pendiente de registrar'}</span>
            <span className="muted tiny">HatilloMall es un portal de contacto: el negocio responde por sus productos.</span>
          </div>
        )}
      </section>

      {count > 0 && (
        <div className="cartbar">
          <button className="btn mango" onClick={() => (profile ? setCheckout(true) : (toast('Entre o cree su cuenta para pedir'), go(`#/entrar?volver=${encodeURIComponent('#/negocio/' + b.id)}`)))}>
            <span>Ver pedido · {count} {count === 1 ? 'producto' : 'productos'}</span><span className="num">{peso(subtotal)}</span>
          </button>
        </div>
      )}
      {checkout && <Checkout b={b} items={myCart} subtotal={subtotal} onClose={() => setCheckout(false)} onDone={(o) => { setCheckout(false); clear(); go(`#/pedido/${o.id}`); }} />}
      {switchTo && <Confirm text="Su pedido tiene productos de otro negocio. ¿Empezar un pedido nuevo aquí?" yes="Empezar pedido nuevo" onClose={() => setSwitchTo(null)} onYes={() => { clear(); add(switchTo); }} />}
    </div>
  );
}

function defaultReserve() {
  const t = new Date(Date.now() + 45 * 60000);
  const m = Math.ceil(t.getMinutes() / 15) * 15;
  t.setMinutes(m, 0, 0);
  return t.toTimeString().slice(0, 5);
}

function Checkout({ b, items, subtotal, onClose, onDone }) {
  const { toast, profile } = useApp();
  const modes = ['domicilio', 'mesa', 'recoger'].filter((m) => (m === 'domicilio' ? b.delivery && b.zones?.length : m === 'mesa' ? b.dine_in : b.pickup));
  const [mode, setMode] = useState(modes[0]);
  const [zone, setZone] = useState(b.zones?.[0]?.zone_id || '');
  const [address, setAddress] = useState('');
  const [people, setPeople] = useState(2);
  const [rday, setRday] = useState(bogotaDay());
  const [rtime, setRtime] = useState(defaultReserve());
  const [payment, setPayment] = useState('efectivo');
  const [proof, setProof] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const z = b.zones?.find((x) => String(x.zone_id) === String(zone));
  const fee = mode === 'domicilio' ? z?.fee || 0 : 0;
  const total = subtotal + fee;

  if (!modes.length) return <Sheet title="Su pedido" onClose={onClose}><div className="notice warn">Este negocio todavía no configuró cómo entregar. Escríbale por WhatsApp.</div></Sheet>;

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'domicilio' && address.trim().length < 5) return toast('Escriba la dirección con una referencia', 'err');
    setBusy(true);
    try {
      const order = await api.createOrder({
        business_id: b.id, mode, zone_id: mode === 'domicilio' ? Number(zone) : null, address,
        people: mode === 'mesa' ? people : null, reserve_at: mode === 'mesa' ? new Date(`${rday}T${rtime}:00-05:00`).toISOString() : null,
        items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })), payment, note, proofFile: payment === 'transferencia' ? proof : null,
      });
      toast(`Pedido #${order.number} enviado a ${b.name}`, 'ok');
      onDone(order);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  return (
    <Sheet title="Su pedido" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="stack" style={{ gap: 8 }}>
          <b>¿Cómo lo quiere?</b>
          <div className="modes" role="radiogroup" aria-label="Forma de pedido">
            {modes.map((m) => (
              <button type="button" key={m} role="radio" aria-checked={mode === m} className={'mode-opt' + (mode === m ? ' on' : '')} onClick={() => setMode(m)}>
                <Icon name={MODE[m].icon} size={26} />{MODE[m].label}<small>{MODE[m].help}</small>
              </button>
            ))}
          </div>
        </div>
        {mode === 'domicilio' && (
          <div className="stack" style={{ gap: 10 }}>
            <Field label="¿A dónde?">
              <select className="input" value={zone} onChange={(e) => setZone(e.target.value)}>
                {b.zones.map((x) => <option key={x.zone_id} value={x.zone_id}>{x.name} · domicilio {peso(x.fee)}</option>)}
              </select>
            </Field>
            <Field label="Dirección" hint="Barrio, calle y una referencia (casa de color, frente a…)"><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" required /></Field>
          </div>
        )}
        {mode === 'mesa' && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="two">
              <Group label="Personas">
                <div className="qty"><button type="button" onClick={() => setPeople(Math.max(1, people - 1))} aria-label="Menos personas">−</button><span>{people}</span><button type="button" className="add" onClick={() => setPeople(Math.min(30, people + 1))} aria-label="Más personas">+</button></div>
              </Group>
              <Group label="Día">
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className={'chip' + (rday === bogotaDay() ? ' on' : '')} onClick={() => setRday(bogotaDay())}>Hoy</button>
                  <button type="button" className={'chip' + (rday === addDays(bogotaDay(), 1) ? ' on' : '')} onClick={() => setRday(addDays(bogotaDay(), 1))}>Mañana</button>
                </div>
              </Group>
            </div>
            <Field label="Hora"><input className="input" type="time" value={rtime} onChange={(e) => setRtime(e.target.value)} required /></Field>
            <div className="notice small">Le guardan la mesa {b.table_hold_minutes} minutos después de la hora elegida.</div>
          </div>
        )}
        {mode === 'recoger' && <div className="notice small">Pase a recoger en {b.address || 'el local'}. Estará listo en unos {b.prep_minutes} minutos; le avisamos.</div>}

        <div className="stack" style={{ gap: 8 }}>
          <b>¿Cómo paga?</b>
          {['efectivo', 'transferencia', 'fiado'].filter((p) => (p === 'transferencia' ? b.breb_key : p === 'fiado' ? b.allow_fiado : true)).map((p) => (
            <button type="button" key={p} className={'pay-opt' + (payment === p ? ' on' : '')} onClick={() => setPayment(p)} aria-pressed={payment === p}>
              <Icon name={p === 'efectivo' ? 'cash' : p === 'fiado' ? 'receipt' : 'phone'} />
              <span style={{ flex: 1 }}>{p === 'efectivo' ? (mode === 'domicilio' ? 'Efectivo al recibir' : mode === 'mesa' ? 'Efectivo al comer allá' : 'Efectivo al recoger') : PAY[p]}</span>
              {payment === p && <Icon name="check" />}
            </button>
          ))}
          {payment === 'transferencia' && (
            <div className="card soft stack" style={{ gap: 8 }}>
              <span className="small">Transfiera <b>{peso(total)}</b> desde Nequi, Daviplata o su banco a la llave Bre-B:</span>
              <CopyText text={b.breb_key} label="llave" />
              {b.breb_holder && <span className="small muted">A nombre de {b.breb_holder}</span>}
              {b.breb_qr_url && <img className="qr" src={b.breb_qr_url} alt="Código QR para pagar" />}
              <label className="btn secondary sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
                {proof ? 'Pantallazo listo ✓' : 'Adjuntar pantallazo (opcional)'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => setProof(e.target.files?.[0] || null)} />
              </label>
              <span className="tiny muted">También puede adjuntarlo después, desde el pedido.</span>
            </div>
          )}
          {payment === 'fiado' && <div className="notice warn small">El fiado es solo para clientes de confianza que el negocio ya autorizó. Si no lo está, el pedido no se enviará.</div>}
        </div>
        <Field label="Nota para el negocio (opcional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: con bastante yuca" maxLength={200} /></Field>
        <div className="card">
          {items.map((i) => <div key={i.product.id} className="row between small" style={{ padding: '5px 0', flexWrap: 'nowrap' }}><span>{i.qty} × {i.product.name}</span><b className="num">{peso(i.qty * i.product.price)}</b></div>)}
          {mode === 'domicilio' && <div className="row between small" style={{ padding: '5px 0' }}><span>Domicilio · {z?.name}</span><b className="num">{peso(fee)}</b></div>}
          <div className="row between" style={{ paddingTop: 8, borderTop: '1px solid var(--line)', marginTop: 6 }}><b>Total</b><b className="price" style={{ fontSize: 20 }}>{peso(total)}</b></div>
        </div>
        <p className="tiny muted">Pide a nombre de {profile?.full_name} · {profile?.phone || 'sin celular registrado'}.</p>
        <button className="btn mango big block" disabled={busy}>{busy ? 'Enviando…' : `HACER PEDIDO · ${peso(total)}`}</button>
      </form>
    </Sheet>
  );
}

export function Offers() {
  const { profile, setUnread } = useApp();
  const [lastRead] = useState(() => profile?.last_read_posts_at || null);
  const feat = useLoad(() => api.listFeatured());
  const list = useLoad(() => api.listPosts({ limit: 60 }));
  useEffect(() => { if (profile) api.markRead().then(() => setUnread(0)).catch(() => {}); }, [profile, setUnread]);
  useOn('hm:post', () => { list.reload(); feat.reload(); if (profile) api.markRead().then(() => setUnread(0)); });
  const featIds = new Set((feat.data || []).map((f) => f.post_id));
  return (
    <div className="stack">
      <h1>Ofertas y novedades</h1>
      <p className="muted">Lo que publican los negocios de {TOWN}. Active las notificaciones en su perfil para enterarse aunque tenga la app cerrada.</p>
      {(feat.data || []).map((f) => f.post && <PostCard key={f.id} post={{ ...f.post, business: f.business }} boosted />)}
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div>
        : (list.data || []).filter((p) => !featIds.has(p.id)).map((p) => <PostCard key={p.id} post={p} isNew={!!lastRead && p.created_at > lastRead && p.author_id !== profile?.id} />)}
      {!list.loading && !list.data?.length && !feat.data?.length && <Empty icon="bolt" title="Aún no hay ofertas" />}
    </div>
  );
}

export function MyOrders() {
  const { profile } = useApp();
  const list = useLoad(() => (profile ? api.listMyOrders() : Promise.resolve([])), [profile?.id]);
  useOn('hm:my-orders', () => list.reload());
  if (!profile) return <Empty icon="bag" title="Entre para ver sus pedidos"><a className="btn" href="#/entrar?volver=%23%2Fpedidos">Entrar</a></Empty>;
  return (
    <div className="stack">
      <h1>Mis pedidos</h1>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : !list.data.length
        ? <Empty icon="bag" title="Aún no ha hecho pedidos"><a className="btn" href="#/negocios">Ver negocios</a></Empty>
        : list.data.map((o) => (
          <a key={o.id} className="card click" href={`#/pedido/${o.id}`}>
            <div className="row between"><b>#{o.number} · {o.business?.name}</b><span className={'badge ' + STATUS_TONE[o.status]}>{STATUS[o.status]}</span></div>
            <div className="small muted" style={{ marginTop: 6 }}>{MODE[o.mode].short} · {timeAgo(o.created_at)} · {o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</div>
            <b className="price" style={{ display: 'block', marginTop: 6 }}>{peso(o.total)}</b>
          </a>
        ))}
    </div>
  );
}
