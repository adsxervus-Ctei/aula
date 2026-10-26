// Vista del ADMINISTRADOR: el dueño de cada negocio
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, Icon, Empty, Spinner, Sheet, Field, ImageInput, Confirm, go } from '../ui.jsx';
import { BusinessForm } from './auth.jsx';
import { peso, timeAgo, ORDER_STATUS, NEXT_STATUS, POST_TYPES, waLink } from '../lib/format.js';

const TABS = [
  ['resumen', 'Resumen'], ['pedidos', 'Pedidos'], ['productos', 'Productos'], ['publicar', 'Publicar'], ['negocio', 'Mi negocio'],
];

export function Panel({ tab }) {
  const { profile, myBusiness, session } = useApp();
  useEffect(() => { if (session === null) go('#/entrar?volver=%23%2Fpanel'); }, [session]);
  if (session && !profile) return <Spinner />;
  if (!profile) return null;
  if (!myBusiness) return (
    <Empty icon="store" title="Aún no tienes un negocio registrado">
      <a className="btn orange" href="#/perfil?negocio=1">Registrar mi negocio</a>
    </Empty>
  );
  const b = myBusiness;
  return (
    <div className="stack">
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Panel del negocio</span>
          <h1>{b.name}</h1>
        </div>
        <a className="btn secondary sm" href={`#/negocio/${b.id}`}>Ver como cliente</a>
      </div>
      {b.status === 'pendiente' && <div className="notice warn">Tu negocio está <b>pendiente de aprobación</b>. Ya puedes cargar productos; cuando el equipo lo apruebe aparecerá para todos y podrás publicar novedades.</div>}
      {b.status === 'suspendido' && <div className="notice err">Tu negocio está <b>suspendido</b> y no es visible. Comunícate con el equipo de Loba Conecta.</div>}
      <nav className="tabs" aria-label="Secciones del panel">
        {TABS.map(([k, label]) => <a key={k} href={`#/panel/${k}`} className={tab === k ? 'on' : ''}>{label}</a>)}
      </nav>
      {tab === 'resumen' && <Summary b={b} />}
      {tab === 'pedidos' && <Orders b={b} />}
      {tab === 'productos' && <Products b={b} />}
      {tab === 'publicar' && <Publish b={b} />}
      {tab === 'negocio' && <EditBusiness b={b} />}
    </div>
  );
}

function useOrders(b) {
  const list = useLoad(() => api.listBusinessOrders(b.id), [b.id]);
  useEffect(() => {
    const on = () => list.reload();
    window.addEventListener('loba:orders', on);
    return () => window.removeEventListener('loba:orders', on);
  }, []); // eslint-disable-line
  return list;
}

function Summary({ b }) {
  const orders = useOrders(b);
  const prods = useLoad(() => api.listProducts(b.id), [b.id]);
  const s = useMemo(() => {
    const o = orders.data || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      hoy: o.filter((x) => new Date(x.created_at) >= today).length,
      activos: o.filter((x) => ['nuevo', 'aceptado', 'preparando', 'enviado'].includes(x.status)).length,
      ventas: o.filter((x) => x.status === 'entregado').reduce((t, x) => t + x.total, 0),
      productos: (prods.data || []).filter((p) => p.available).length,
    };
  }, [orders.data, prods.data]);
  if (orders.loading) return <Spinner />;
  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <div className="stat teal"><b>{s.activos}</b><span>Pedidos por atender</span></div>
        <div className="stat"><b>{s.hoy}</b><span>Pedidos hoy</span></div>
        <div className="stat"><b>{peso(s.ventas)}</b><span>Ventas entregadas</span></div>
        <div className="stat"><b>{s.productos}</b><span>Productos activos</span></div>
      </div>
      <div className="row">
        <a className="btn" href="#/panel/pedidos"><Icon name="bag" size={18} />Atender pedidos</a>
        <a className="btn secondary" href="#/panel/productos"><Icon name="plus" size={18} />Agregar producto</a>
        <a className="btn orange" href="#/panel/publicar"><Icon name="megaphone" size={18} />Publicar novedad</a>
      </div>
      <div className="notice small">Cuando publicas un menú, promoción o servicio, <b>todos los usuarios</b> lo ven en Novedades y quienes activaron las notificaciones reciben un aviso en el celular.</div>
    </div>
  );
}

function Orders({ b }) {
  const { toast } = useApp();
  const list = useOrders(b);
  const [filter, setFilter] = useState('activos');
  const [busy, setBusy] = useState(null);
  const shown = (list.data || []).filter((o) => filter === 'todos' || ['nuevo', 'aceptado', 'preparando', 'enviado'].includes(o.status));

  const setStatus = async (o, st) => {
    setBusy(o.id);
    try { await api.updateOrderStatus(o.id, st); toast(`Pedido: ${ORDER_STATUS[st]}`, 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); }
    setBusy(null);
  };

  return (
    <div className="stack">
      <div className="row">
        <button className={'chip' + (filter === 'activos' ? ' on' : '')} onClick={() => setFilter('activos')}>Por atender</button>
        <button className={'chip' + (filter === 'todos' ? ' on' : '')} onClick={() => setFilter('todos')}>Todos</button>
      </div>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : shown.length === 0
        ? <Empty icon="bag" title={filter === 'activos' ? 'No hay pedidos por atender' : 'Aún no tienes pedidos'}>Los pedidos nuevos aparecen aquí al instante.</Empty>
        : shown.map((o) => (
          <article key={o.id} className={'card stack' + (o.status === 'nuevo' ? ' new-flag' : '')} style={{ gap: 10 }}>
            <div className="row between">
              <b>{o.customer?.full_name || 'Cliente'}</b>
              <span className={'badge ' + (o.status === 'nuevo' ? 'yellow' : o.status === 'entregado' ? 'green' : o.status === 'cancelado' ? 'red' : '')}>{ORDER_STATUS[o.status]}</span>
            </div>
            <div className="small muted">{timeAgo(o.created_at)} · {o.delivery ? `Domicilio: ${o.address}` : 'Recoge en el local'} · {o.payment === 'transferencia' ? 'Transferencia' : 'Efectivo'}</div>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {o.items.map((i, k) => <li key={k}>{i.qty} × {i.name} — {peso(i.qty * i.price)}</li>)}
            </ul>
            {o.note && <div className="notice small">Nota: {o.note}</div>}
            <div className="row between">
              <b className="price">{peso(o.total)}</b>
              {o.customer?.phone && <a className="btn ghost sm" href={waLink(o.customer.phone, `Hola ${o.customer.full_name}, te escribo de ${b.name} por tu pedido de ${peso(o.total)}.`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={18} />{o.customer.phone}</a>}
            </div>
            {NEXT_STATUS[o.status].length > 0 && (
              <div className="row">
                {NEXT_STATUS[o.status].map((st) => (
                  <button key={st} className={'btn sm ' + (st === 'cancelado' ? 'danger' : '')} disabled={busy === o.id} onClick={() => setStatus(o, st)}>
                    {st === 'cancelado' ? 'Rechazar' : `Marcar: ${ORDER_STATUS[st]}`}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
    </div>
  );
}

function Products({ b }) {
  const { toast } = useApp();
  const list = useLoad(() => api.listProducts(b.id), [b.id]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);

  const toggle = async (p) => {
    try { await api.saveProduct({ ...p, available: !p.available }); list.reload(); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div className="stack">
      <div className="row between">
        <p className="muted small">{list.data?.length || 0} productos. Los agotados no se muestran a los clientes.</p>
        <button className="btn" onClick={() => setEdit({ business_id: b.id, available: true, section: 'General' })}><Icon name="plus" size={18} />Agregar</button>
      </div>
      {list.loading ? <Spinner /> : list.data?.length === 0 ? <Empty title="Agrega tu primer producto o plato" /> : (
        <div className="card">
          {list.data.map((p) => (
            <div key={p.id} className="product">
              {p.image_url ? <img className="thumb" src={p.image_url} alt="" /> : null}
              <div className="info">
                <b>{p.name}</b>
                <span className="small muted">{p.section}{p.description ? ` · ${p.description}` : ''}</span>
                <div className="row" style={{ gap: 6 }}>
                  <span className="price">{peso(p.price)}</span>
                  {!p.available && <span className="badge gray">Agotado</span>}
                </div>
              </div>
              <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                <button className="icon-btn" style={{ color: 'var(--teal)' }} onClick={() => toggle(p)} aria-label={p.available ? `Marcar ${p.name} agotado` : `Marcar ${p.name} disponible`}><Icon name={p.available ? 'eye' : 'eyeoff'} /></button>
                <button className="icon-btn" style={{ color: 'var(--teal)' }} onClick={() => setEdit(p)} aria-label={`Editar ${p.name}`}><Icon name="edit" /></button>
                <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => setDel(p)} aria-label={`Eliminar ${p.name}`}><Icon name="trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <ProductForm p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); toast('Producto guardado', 'ok'); }} />}
      {del && <Confirm danger yes="Eliminar" text={`¿Eliminar "${del.name}"? No se puede deshacer.`} onClose={() => setDel(null)}
        onYes={async () => { try { await api.deleteProduct(del.id); list.reload(); toast('Eliminado'); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}

function ProductForm({ p, onClose, onSaved }) {
  const { toast } = useApp();
  const [f, setF] = useState({ name: '', description: '', price: '', section: 'General', image_url: '', ...p });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(f.price) >= 0)) return toast('Revisa el precio', 'err');
    setBusy(true);
    try { await api.saveProduct(f); onSaved(); } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  return (
    <Sheet title={p.id ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <Field label="Nombre"><input className="input" value={f.name} onChange={set('name')} required /></Field>
        <Field label="Precio (pesos)"><input className="input" type="number" min="0" step="100" value={f.price} onChange={set('price')} required /></Field>
        <Field label="Sección" hint="Ej.: Platos, Bebidas, Aseo, Granos"><input className="input" value={f.section} onChange={set('section')} /></Field>
        <Field label="Descripción (opcional)"><input className="input" value={f.description} onChange={set('description')} maxLength={160} /></Field>
        <ImageInput label="Foto (opcional)" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
        <label className="check"><input type="checkbox" checked={f.available !== false} onChange={set('available')} />Disponible</label>
        <button className="btn block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Sheet>
  );
}

function Publish({ b }) {
  const { toast } = useApp();
  const mine = useLoad(() => api.listMyBusinessPosts(b.id), [b.id]);
  const [f, setF] = useState({ type: b.category?.slug === 'restaurantes' ? 'menu' : 'promocion', title: '', body: '', image_url: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const approved = b.status === 'aprobado';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.createPost({ ...f, business_id: b.id });
      setResult(r.push);
      setF({ ...f, title: '', body: '', image_url: '' });
      mine.reload();
      toast('Publicado para todos', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const vis = async (p) => { try { await api.setPostVisible(p.id, !p.visible); mine.reload(); } catch (e) { toast(e.message, 'err'); } };

  return (
    <div className="stack">
      <form className="card stack" onSubmit={submit}>
        <h2>Nueva publicación</h2>
        {!approved && <div className="notice warn small">Podrás publicar cuando el equipo apruebe tu negocio.</div>}
        <div className="chips">
          {['menu', 'promocion', 'servicio', 'producto'].map((t) => (
            <button type="button" key={t} className={'chip' + (f.type === t ? ' on' : '')} onClick={() => setF({ ...f, type: t })}>{POST_TYPES[t]}</button>
          ))}
        </div>
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={90} required placeholder="Ej.: Hoy hay sancocho de gallina" /></Field>
        <Field label="Detalle (opcional)"><textarea className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={400} /></Field>
        <ImageInput label="Foto (opcional)" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
        <button className="btn orange block" disabled={busy || !approved}><Icon name="megaphone" size={18} />{busy ? 'Publicando…' : 'Publicar y avisar a todos'}</button>
        {result && (
          <div className="notice ok small">
            {result.demo ? `Publicado. En la app real, ${result.sent} usuarios recibirían el aviso.`
              : result.error ? 'Publicado. Todos lo ven en Novedades; el aviso al celular no se pudo enviar (revisa la función send-push).'
                : `Publicado. Aviso enviado a ${result.sent} ${result.sent === 1 ? 'celular' : 'celulares'}.`}
          </div>
        )}
      </form>
      <h2>Mis publicaciones</h2>
      {mine.loading ? <Spinner /> : mine.data?.length === 0 ? <Empty icon="megaphone" title="Aún no has publicado" /> : mine.data.map((p) => (
        <div key={p.id} className="card row between">
          <div className="stack" style={{ gap: 4 }}>
            <div className="row" style={{ gap: 6 }}><span className="badge">{POST_TYPES[p.type]}</span><span className="small muted">{timeAgo(p.created_at)}</span>{!p.visible && <span className="badge gray">Oculta</span>}</div>
            <b>{p.title}</b>
          </div>
          <button className="btn ghost sm" onClick={() => vis(p)}>{p.visible ? 'Ocultar' : 'Mostrar'}</button>
        </div>
      ))}
    </div>
  );
}

function EditBusiness({ b }) {
  const { setMyBusiness, toast, refreshProfile } = useApp();
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <BusinessForm initial={{ ...b, category_id: String(b.category_id) }} onSaved={async () => { await refreshProfile(); toast('Datos del negocio guardados', 'ok'); }} />
    </div>
  );
}
