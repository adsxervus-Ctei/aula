// Vista del SUPERADMINISTRADOR: el equipo del proyecto
import React, { useEffect, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, Icon, Empty, Spinner, Field, ImageInput, Confirm, go } from '../ui.jsx';
import { peso, timeAgo, POST_TYPES } from '../lib/format.js';

const TABS = [['resumen', 'Resumen'], ['negocios', 'Negocios'], ['usuarios', 'Usuarios'], ['publicaciones', 'Publicaciones'], ['categorias', 'Categorías']];

export function Admin({ tab }) {
  const { profile, session } = useApp();
  useEffect(() => { if (session === null) go('#/entrar?volver=%23%2Fadmin'); }, [session]);
  if (session && !profile) return <Spinner />;
  if (!profile) return null;
  if (profile.role !== 'superadmin') return <Empty icon="shield" title="Esta sección es solo para el equipo de Loba Conecta" />;
  return (
    <div className="stack">
      <div className="stack" style={{ gap: 4 }}>
        <span className="eyebrow">Superadministración</span>
        <h1>Administración</h1>
      </div>
      <nav className="tabs" aria-label="Secciones de administración">
        {TABS.map(([k, label]) => <a key={k} href={`#/admin/${k}`} className={tab === k ? 'on' : ''}>{label}</a>)}
      </nav>
      {tab === 'resumen' && <Stats />}
      {tab === 'negocios' && <Businesses />}
      {tab === 'usuarios' && <Users />}
      {tab === 'publicaciones' && <Posts />}
      {tab === 'categorias' && <Categories />}
    </div>
  );
}

function Stats() {
  const s = useLoad(() => api.platformStats());
  if (s.loading) return <Spinner />;
  if (s.error) return <div className="notice err">{s.error}</div>;
  const d = s.data;
  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <div className="stat teal"><b>{d.negocios_pendientes}</b><span>Negocios por aprobar</span></div>
        <div className="stat"><b>{d.negocios_aprobados}</b><span>Negocios activos</span></div>
        <div className="stat"><b>{d.usuarios}</b><span>Usuarios registrados</span></div>
        <div className="stat"><b>{d.clientes}</b><span>Clientes</span></div>
        <div className="stat"><b>{d.pedidos}</b><span>Pedidos totales</span></div>
        <div className="stat"><b>{d.pedidos_hoy}</b><span>Pedidos hoy</span></div>
        <div className="stat"><b>{peso(d.ventas_entregadas)}</b><span>Ventas entregadas</span></div>
        <div className="stat"><b>{d.publicaciones}</b><span>Publicaciones</span></div>
        <div className="stat"><b>{d.suscritos_push}</b><span>Usuarios con notificaciones</span></div>
      </div>
      {d.negocios_pendientes > 0 && <a className="btn orange" href="#/admin/negocios" style={{ alignSelf: 'flex-start' }}>Revisar negocios pendientes</a>}
    </div>
  );
}

function Businesses() {
  const { toast } = useApp();
  const list = useLoad(() => api.adminListBusinesses());
  const [filter, setFilter] = useState('pendiente');
  const shown = (list.data || []).filter((b) => filter === 'todos' || b.status === filter);
  const set = async (b, status) => {
    try { await api.adminSetBusinessStatus(b.id, status); toast(`${b.name}: ${status}`, 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const count = (st) => (list.data || []).filter((b) => b.status === st).length;
  return (
    <div className="stack">
      <div className="chips">
        {[['pendiente', 'Pendientes'], ['aprobado', 'Aprobados'], ['suspendido', 'Suspendidos'], ['todos', 'Todos']].map(([k, l]) => (
          <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}{k !== 'todos' ? ` (${count(k)})` : ''}</button>
        ))}
      </div>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : shown.length === 0 ? <Empty title="No hay negocios en este estado" /> : shown.map((b) => (
        <article key={b.id} className="card stack" style={{ gap: 8 }}>
          <div className="row between">
            <div className="stack" style={{ gap: 2 }}>
              <b>{b.name}</b>
              <span className="small muted">{b.category?.name} · registrado {timeAgo(b.created_at)}</span>
            </div>
            <span className={'badge ' + (b.status === 'aprobado' ? 'green' : b.status === 'pendiente' ? 'yellow' : 'red')}>{b.status}</span>
          </div>
          <p className="small">{b.description}</p>
          <div className="small muted">Dueño: {b.owner?.full_name} · {b.owner?.email} · {b.owner?.phone} {b.address ? `· ${b.address}` : ''}</div>
          <div className="row">
            {b.status !== 'aprobado' && <button className="btn green sm" onClick={() => set(b, 'aprobado')}><Icon name="check" size={18} />Aprobar</button>}
            {b.status === 'aprobado' && <button className="btn danger sm" onClick={() => set(b, 'suspendido')}>Suspender</button>}
            <a className="btn secondary sm" href={`#/negocio/${b.id}`}>Ver página</a>
          </div>
        </article>
      ))}
    </div>
  );
}

function Users() {
  const { toast, profile } = useApp();
  const list = useLoad(() => api.adminListUsers());
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const shown = (list.data || []).filter((u) => !q || `${u.full_name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()));
  const update = async (u, changes) => {
    try { await api.adminUpdateUser(u.id, changes); toast('Usuario actualizado', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <div className="stack">
      <div className="search"><Icon name="search" /><label className="sr-only" htmlFor="uq">Buscar usuario</label><input id="uq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o celular" /></div>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Contacto</th><th>Rol</th><th>Estado</th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.full_name || '—'}</b><div className="small muted">desde {timeAgo(u.created_at)}</div></td>
                  <td className="small">{u.email}<br />{u.phone}</td>
                  <td>
                    <label className="sr-only" htmlFor={`r-${u.id}`}>Rol de {u.full_name}</label>
                    <select id={`r-${u.id}`} className="input" style={{ minWidth: 150 }} value={u.role} disabled={u.id === profile.id}
                      onChange={(e) => { const role = e.target.value; if (role === 'superadmin') setConfirm({ u, role }); else update(u, { role }); }}>
                      <option value="cliente">Cliente</option>
                      <option value="negocio">Negocio</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </td>
                  <td>
                    {u.id === profile.id ? <span className="badge">Tú</span> : (
                      <button className={'btn sm ' + (u.active ? 'danger' : 'green')} onClick={() => update(u, { active: !u.active })}>{u.active ? 'Desactivar' : 'Activar'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm && <Confirm text={`¿Dar acceso de superadministrador a ${confirm.u.full_name}? Podrá aprobar negocios, moderar y cambiar roles.`} yes="Dar acceso"
        onClose={() => setConfirm(null)} onYes={() => update(confirm.u, { role: confirm.role })} />}
    </div>
  );
}

function Posts() {
  const { toast } = useApp();
  const list = useLoad(() => api.adminListPosts());
  const [f, setF] = useState({ title: '', body: '', image_url: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.createPost({ ...f, type: 'aviso', business_id: null });
      toast(r.push?.demo ? 'Aviso publicado para todos' : `Aviso publicado · enviado a ${r.push?.sent ?? 0} celulares`, 'ok');
      setF({ title: '', body: '', image_url: '' });
      list.reload();
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const vis = async (p) => { try { await api.setPostVisible(p.id, !p.visible); list.reload(); } catch (e) { toast(e.message, 'err'); } };
  return (
    <div className="stack">
      <form className="card stack" onSubmit={send}>
        <h2>Aviso general a todo el pueblo</h2>
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={90} required placeholder="Ej.: Feria de emprendimiento este sábado" /></Field>
        <Field label="Detalle"><textarea className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={400} /></Field>
        <ImageInput label="Imagen (opcional)" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
        <button className="btn orange" disabled={busy}><Icon name="megaphone" size={18} />{busy ? 'Publicando…' : 'Publicar aviso'}</button>
      </form>
      <h2>Moderación</h2>
      {list.loading ? <Spinner /> : list.data?.length === 0 ? <Empty icon="bell" title="Sin publicaciones" /> : list.data.map((p) => (
        <div key={p.id} className="card row between">
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="badge">{POST_TYPES[p.type]}</span>
              <span className="small muted">{p.business?.name || 'Equipo'} · {timeAgo(p.created_at)}</span>
              {!p.visible && <span className="badge gray">Oculta</span>}
            </div>
            <b>{p.title}</b>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn ghost sm" onClick={() => vis(p)}>{p.visible ? 'Ocultar' : 'Mostrar'}</button>
            <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => setDel(p)} aria-label={`Eliminar ${p.title}`}><Icon name="trash" /></button>
          </div>
        </div>
      ))}
      {del && <Confirm danger yes="Eliminar" text={`¿Eliminar "${del.title}"?`} onClose={() => setDel(null)}
        onYes={async () => { try { await api.deletePost(del.id); list.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}

function Categories() {
  const { toast } = useApp();
  const list = useLoad(() => api.listCategories());
  const [f, setF] = useState({ name: '', sort: 10 });
  const add = async (e) => {
    e.preventDefault();
    const slug = f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try { await api.saveCategory({ name: f.name.trim(), slug, sort: Number(f.sort) }); setF({ name: '', sort: 10 }); list.reload(); toast('Categoría creada', 'ok'); }
    catch (err) { toast(err.message, 'err'); }
  };
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="card">
        {(list.data || []).map((c) => <div key={c.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><b>{c.name}</b><span className="small muted">orden {c.sort}</span></div>)}
      </div>
      <form className="card stack" onSubmit={add}>
        <h3>Nueva categoría</h3>
        <Field label="Nombre"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="Ej.: Ferreterías" /></Field>
        <Field label="Orden"><input className="input" type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} /></Field>
        <button className="btn">Agregar</button>
      </form>
    </div>
  );
}
