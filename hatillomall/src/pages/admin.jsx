// Vista del EQUIPO HatilloMall (superadministradores)
import React, { useEffect, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, Icon, Empty, Spinner, Sheet, Field, Confirm, ImageInput, go } from '../ui.jsx';
import { peso, timeAgo, fechaHora, POST_TYPES, waLink, bogotaDay, addDays, weekStart, diaCorto, planVigente } from '../lib/format.js';
import { PLAN_PLUS_PRECIO } from '../config.js';

const TABS = [['resumen', 'Resumen'], ['negocios', 'Negocios'], ['impulsos', 'Impulsos'], ['liquidaciones', 'Liquidaciones'], ['usuarios', 'Usuarios'], ['zonas', 'Zonas'], ['avisos', 'Avisos']];

export function Admin({ tab }) {
  const { profile, session } = useApp();
  useEffect(() => { if (session === null) go('#/entrar?volver=%23%2Fadmin'); }, [session]);
  if (session && !profile) return <Spinner />;
  if (!profile) return null;
  if (profile.role !== 'superadmin') return <Empty icon="shield" title="Esta sección es solo para el equipo de HatilloMall" />;
  return (
    <div className="stack">
      <div className="stack" style={{ gap: 2 }}><span className="eyebrow">Equipo HatilloMall</span><h1>Administración</h1></div>
      <nav className="tabs" aria-label="Secciones">{TABS.map(([k, l]) => <a key={k} href={`#/admin/${k}`} className={tab === k ? 'on' : ''}>{l}</a>)}</nav>
      {tab === 'resumen' && <Summary />}
      {tab === 'negocios' && <Businesses />}
      {tab === 'impulsos' && <Boosts />}
      {tab === 'liquidaciones' && <Settlements />}
      {tab === 'usuarios' && <Users />}
      {tab === 'zonas' && <Zones />}
      {tab === 'avisos' && <Notices />}
    </div>
  );
}

function Summary() {
  const s = useLoad(() => api.platformStats());
  if (s.loading) return <Spinner />;
  if (s.error) return <div className="notice err">{s.error}</div>;
  const d = s.data;
  const meta = d.cobertura.reduce((t, c) => t + c.meta, 0);
  const vin = d.cobertura.reduce((t, c) => t + c.vinculados, 0);
  const fijo = d.negocios_plus * PLAN_PLUS_PRECIO;
  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi win"><span>Negocios en la app</span><b>{vin} de {meta}</b></div>
        <div className="kpi"><span>Con plan PLUS</span><b>{d.negocios_plus}</b></div>
        <div className="kpi"><span>Por aprobar</span><b>{d.negocios_pendientes}</b></div>
        <div className="kpi"><span>Usuarios</span><b>{d.usuarios}</b></div>
        <div className="kpi"><span>Pedidos hoy</span><b>{d.pedidos_hoy}</b></div>
        <div className="kpi"><span>Pedidos del mes</span><b>{d.pedidos_mes}</b></div>
        <div className="kpi"><span>Vendido por la app (mes)</span><b>{peso(d.ventas_app_mes)}</b></div>
        <div className="kpi"><span>Comisión del mes</span><b>{peso(d.comision_mes)}</b></div>
      </div>
      <div className="two">
        <div className="card stack" style={{ gap: 10 }}>
          <b>Cobertura por sector</b>
          <span className="small muted">Meta: los {meta} negocios del censo del equipo.</span>
          {d.cobertura.map((c) => (
            <div key={c.sector} className="stack" style={{ gap: 4 }}>
              <div className="row between small"><span>{c.sector}</span><b className="num">{c.vinculados} de {c.meta}</b></div>
              <div className="meter"><i style={{ width: `${Math.min(100, (c.vinculados / Math.max(1, c.meta)) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <b>Ingresos de HatilloMall</b>
          <div className="row between small"><span>Planes PLUS ({d.negocios_plus} × {peso(PLAN_PLUS_PRECIO)})</span><b className="num">{peso(fijo)}</b></div>
          <div className="row between small"><span>Comisión del mes</span><b className="num">{peso(d.comision_mes)}</b></div>
          <div className="row between small"><span>Comisión por cobrar (liquidaciones)</span><b className="num">{peso(d.comision_por_cobrar)}</b></div>
          <div className="row between small"><span>Impulsos por activar</span><b className="num">{d.impulsos_solicitados}</b></div>
          <div className="row between small"><span>Personas con avisos al celular</span><b className="num">{d.suscritos_push}</b></div>
        </div>
      </div>
      <div className="row">
        {d.negocios_pendientes > 0 && <a className="btn mango" href="#/admin/negocios">Revisar negocios por aprobar</a>}
        {d.impulsos_solicitados > 0 && <a className="btn secondary" href="#/admin/impulsos">Activar Impulsos</a>}
      </div>
    </div>
  );
}

function Businesses() {
  const { toast } = useApp();
  const list = useLoad(() => api.adminListBusinesses());
  const [filter, setFilter] = useState('pendiente');
  const [plan, setPlan] = useState(null);
  const shown = (list.data || []).filter((b) => filter === 'todos' || b.status === filter);
  const n = (st) => (list.data || []).filter((b) => b.status === st).length;
  const set = async (b, ch, msg) => { try { await api.adminUpdateBusiness(b.id, ch); toast(msg || 'Guardado', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); } };
  return (
    <div className="stack">
      <div className="chips">{[['pendiente', 'Por aprobar'], ['aprobado', 'Aprobados'], ['suspendido', 'Suspendidos'], ['todos', 'Todos']].map(([k, l]) => <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}{k !== 'todos' ? ` (${n(k)})` : ''}</button>)}</div>
      {list.loading ? <Spinner /> : !shown.length ? <Empty title="No hay negocios aquí" /> : shown.map((b) => (
        <article key={b.id} className="card stack" style={{ gap: 8 }}>
          <div className="row between">
            <div className="stack" style={{ gap: 2 }}><b>{b.name}</b><span className="small muted">{b.category?.name} · registrado {timeAgo(b.created_at)}</span></div>
            <div className="row" style={{ gap: 6 }}>
              <span className={'badge ' + (planVigente(b) ? 'green' : 'gray')}>{planVigente(b) ? `PLUS${b.plan_until ? ` hasta ${diaCorto(b.plan_until)}` : ''}` : 'Vitrina'}</span>
              <span className={'badge ' + (b.status === 'aprobado' ? 'green' : b.status === 'pendiente' ? 'yellow' : 'red')}>{b.status}</span>
            </div>
          </div>
          <p className="small">{b.description}</p>
          <div className="small muted">Dueño: {b.owner?.full_name} · {b.owner?.email} · {b.owner?.phone}</div>
          <div className="small muted">Datos del vendedor: {b.legal_name || 'sin nombre legal'} · {b.id_number || 'sin identificación'} · {b.notify_address || 'sin dirección de notificaciones'}</div>
          <div className="row">
            {b.status !== 'aprobado' && <button className="btn sm" onClick={() => set(b, { status: 'aprobado' }, `${b.name} aprobado`)}><Icon name="check" size={18} />Aprobar</button>}
            {b.status === 'aprobado' && <button className="btn danger sm" onClick={() => set(b, { status: 'suspendido' }, `${b.name} suspendido`)}>Suspender</button>}
            <button className="btn secondary sm" onClick={() => setPlan(b)}>Plan y comisión</button>
            <a className="btn ghost sm" href={`#/negocio/${b.id}`}>Ver</a>
            {b.owner?.phone && <a className="btn ghost sm" href={waLink(b.owner.phone, `Hola ${b.owner.full_name}, le escribimos de HatilloMall sobre ${b.name}.`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} />WhatsApp</a>}
          </div>
        </article>
      ))}
      {plan && <PlanSheet b={plan} onClose={() => setPlan(null)} onSave={(ch) => { set(plan, ch, 'Plan actualizado'); setPlan(null); }} />}
    </div>
  );
}

function PlanSheet({ b, onClose, onSave }) {
  const [p, setP] = useState(b.plan);
  const [until, setUntil] = useState(b.plan_until || addDays(bogotaDay(), 15));
  const [indef, setIndef] = useState(!b.plan_until && b.plan === 'plus');
  const [rate, setRate] = useState(Math.round(Number(b.commission_rate) * 100));
  return (
    <Sheet title={`Plan · ${b.name}`} onClose={onClose}>
      <div className="row">{[['vitrina', 'Vitrina (gratis)'], ['plus', `PLUS · ${peso(PLAN_PLUS_PRECIO)}/mes`]].map(([k, l]) => <button key={k} className={'chip' + (p === k ? ' on' : '')} onClick={() => setP(k)}>{l}</button>)}</div>
      {p === 'plus' && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <button className="chip" onClick={() => { setIndef(false); setUntil(addDays(bogotaDay(), 15)); }}>Prueba 15 días</button>
            <button className="chip" onClick={() => { setIndef(false); setUntil(addDays(b.plan_until && b.plan_until > bogotaDay() ? b.plan_until : bogotaDay(), 30)); }}>Pagó 1 mes</button>
          </div>
          <Field label="Vigente hasta"><input className="input" type="date" value={until} disabled={indef} onChange={(e) => setUntil(e.target.value)} /></Field>
          <label className="check small"><input type="checkbox" checked={indef} onChange={(e) => setIndef(e.target.checked)} />Sin fecha de vencimiento</label>
        </div>
      )}
      <Field label="Comisión por pedidos de la app (%)" hint="La regla firmada es 10 %. Cámbiela solo si hay un acuerdo escrito."><input className="input" type="number" min="0" max="50" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
      <button className="btn block" onClick={() => onSave({ plan: p, plan_until: p === 'plus' && !indef ? until : null, commission_rate: Math.max(0, Math.min(50, Number(rate) || 0)) / 100 })}>Guardar</button>
    </Sheet>
  );
}

function Boosts() {
  const { toast } = useApp();
  const list = useLoad(() => api.adminListBoosts());
  const [act, setAct] = useState(null);
  const now = new Date().toISOString();
  const pend = (list.data || []).filter((b) => b.status === 'solicitado');
  const active = (list.data || []).filter((b) => b.status === 'activo' && b.ends_at > now);
  return (
    <div className="stack">
      <h2>Por activar</h2>
      {list.loading ? <Spinner /> : !pend.length ? <p className="muted small">No hay Impulsos pedidos.</p> : pend.map((b) => (
        <div key={b.id} className="card row between">
          <div className="stack" style={{ gap: 2 }}><b>{b.business?.name}</b><span className="small">{b.post?.title}</span><span className="tiny muted">Pedido {timeAgo(b.created_at)} · {peso(b.price)} por {b.hours} h</span></div>
          <div className="row">
            <button className="btn mango sm" onClick={() => setAct(b)}><Icon name="bolt" size={16} />Recibí el pago · Activar</button>
            <button className="btn ghost sm" onClick={async () => { await api.adminSetBoost(b.id, { status: 'rechazado' }); list.reload(); }}>Rechazar</button>
          </div>
        </div>
      ))}
      <h2>Activos ahora</h2>
      {!active.length ? <p className="muted small">Ninguno.</p> : active.map((b) => <div key={b.id} className="card"><b>{b.business?.name}</b> · {b.post?.title}<div className="tiny muted">Hasta {fechaHora(b.ends_at)}</div></div>)}
      {act && <Confirm title="Activar Impulso" yes="Activar y avisar a todos" text={`Confirme que ${act.business?.name} pagó ${peso(act.price)}. La oferta sale de primera ${act.hours} horas y se envía un aviso a todos.`}
        onClose={() => setAct(null)} onYes={async () => { try { const r = await api.adminSetBoost(act.id, { status: 'activo', paid: true }); toast(r?.demo ? 'Impulso activo' : `Impulso activo · aviso a ${r?.sent ?? 0} celulares`, 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}

function Settlements() {
  const { toast } = useApp();
  const list = useLoad(() => api.adminListSettlements());
  const [week, setWeek] = useState(weekStart(addDays(bogotaDay(), -7)));
  const [pay, setPay] = useState(null);
  const gen = async () => { try { const n = await api.generateSettlements(week); toast(n ? `${n} liquidaciones generadas` : 'Esa semana no tuvo pedidos entregados', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); } };
  const msg = (s) => `Hola ${s.business?.name}. Liquidación HatilloMall de la semana ${diaCorto(s.week_start)} a ${diaCorto(s.week_end)}: ${s.orders_count} pedidos por la app, ${peso(s.base_amount)} en productos. Comisión: ${peso(s.commission_amount)}. Puede pagar en efectivo o por Nequi. El detalle está en la app, en Mi negocio > Comisión. ¡Gracias!`;
  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 8 }}>
        <b>Generar liquidación semanal</b>
        <p className="small muted">Suma los pedidos de la app entregados de lunes a domingo. Las ventas anotadas a mano en la caja no pagan comisión.</p>
        <div className="row">
          <Field label="Semana que empieza el lunes"><input className="input" type="date" value={week} onChange={(e) => setWeek(weekStart(e.target.value))} /></Field>
          <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={gen}>Generar</button>
        </div>
      </div>
      {list.loading ? <Spinner /> : !list.data?.length ? <Empty icon="percent" title="Aún no hay liquidaciones" /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Negocio</th><th>Semana</th><th className="r">Pedidos</th><th className="r">Comisión</th><th>Estado</th><th /></tr></thead>
          <tbody>{list.data.map((s) => (
            <tr key={s.id}>
              <td>{s.business?.name}</td><td>{diaCorto(s.week_start)} – {diaCorto(s.week_end)}</td><td className="r">{s.orders_count}</td><td className="r">{peso(s.commission_amount)}</td>
              <td>{s.status === 'pagado' ? <span className="badge green">Pagada · {s.paid_method}</span> : <span className="badge yellow">Pendiente</span>}</td>
              <td className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                {s.business?.whatsapp && <a className="btn ghost sm" href={waLink(s.business.whatsapp, msg(s))} target="_blank" rel="noopener noreferrer">Enviar</a>}
                {s.status === 'pendiente' && <button className="btn sm" onClick={() => setPay(s)}>Pagó</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {pay && (
        <Sheet title={`Pago · ${pay.business?.name}`} onClose={() => setPay(null)}>
          <p>Comisión: <b>{peso(pay.commission_amount)}</b></p>
          <div className="row">{['Efectivo', 'Nequi', 'Daviplata', 'Bre-B'].map((m) => <button key={m} className="btn secondary" onClick={async () => { try { await api.markSettlementPaid(pay.id, m); toast('Liquidación pagada', 'ok'); setPay(null); list.reload(); } catch (e) { toast(e.message, 'err'); } }}>{m}</button>)}</div>
        </Sheet>
      )}
    </div>
  );
}

function Users() {
  const { toast, profile } = useApp();
  const list = useLoad(() => api.adminListUsers());
  const [q, setQ] = useState('');
  const [ask, setAsk] = useState(null);
  const shown = (list.data || []).filter((u) => !q || `${u.full_name} ${u.email} ${u.username || ''} ${u.phone}`.toLowerCase().includes(q.toLowerCase()));
  const upd = async (u, ch) => { try { await api.adminUpdateUser(u.id, ch); toast('Usuario actualizado', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); } };
  return (
    <div className="stack">
      <div className="search"><Icon name="search" /><label className="sr-only" htmlFor="uq">Buscar</label><input id="uq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, correo, usuario o celular" /></div>
      {list.loading ? <Spinner /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Nombre</th><th>Contacto</th><th>Rol</th><th>Acceso</th></tr></thead>
          <tbody>{shown.map((u) => (
            <tr key={u.id}>
              <td><b>{u.full_name || '—'}</b><div className="tiny muted">desde {timeAgo(u.created_at)}{u.accepts_marketing ? ' · acepta ofertas' : ''}</div></td>
              <td className="small">{u.username ? <>usuario <b>{u.username}</b></> : u.email}<br />{u.phone}</td>
              <td>
                <label className="sr-only" htmlFor={`r-${u.id}`}>Rol de {u.full_name}</label>
                <select id={`r-${u.id}`} className="input" style={{ minWidth: 150 }} value={u.role} disabled={u.id === profile.id}
                  onChange={(e) => (e.target.value === 'superadmin' ? setAsk({ u, role: e.target.value }) : upd(u, { role: e.target.value }))}>
                  <option value="cliente">Cliente</option><option value="negocio">Negocio</option><option value="superadmin">Equipo</option>
                </select>
              </td>
              <td>{u.id === profile.id ? <span className="badge">Usted</span> : <button className={'btn sm ' + (u.active ? 'danger' : '')} onClick={() => upd(u, { active: !u.active })}>{u.active ? 'Desactivar' : 'Activar'}</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {ask && <Confirm text={`¿Dar acceso de equipo a ${ask.u.full_name}? Podrá aprobar negocios, cambiar planes y ver todo.`} yes="Dar acceso" onClose={() => setAsk(null)} onYes={() => upd(ask.u, { role: ask.role })} />}
    </div>
  );
}

function Zones() {
  const { toast } = useApp();
  const list = useLoad(() => api.listZones());
  const [vals, setVals] = useState({});
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <p className="small muted">Cabecera y centros poblados de Hatillo de Loba (DANE, censo 2018). La tarifa sugerida es la que se propone a cada negocio; cada uno puede poner la suya.</p>
      {list.loading ? <Spinner /> : (
        <div className="card">
          {list.data.map((z) => (
            <div key={z.id} className="list-row">
              <div className="grow"><b>{z.name}</b><span className="tiny muted">{z.kind === 'cabecera' ? 'Cabecera municipal' : 'Centro poblado'}</span></div>
              <input className="input" style={{ width: 120 }} inputMode="numeric" aria-label={`Tarifa sugerida ${z.name}`} value={vals[z.id] ?? z.default_fee} onChange={(e) => setVals({ ...vals, [z.id]: e.target.value.replace(/\D/g, '') })} />
              {vals[z.id] != null && <button className="btn sm" onClick={async () => { try { await api.adminSaveZone({ id: z.id, default_fee: vals[z.id] }); toast('Tarifa guardada', 'ok'); list.reload(); setVals((v) => { const c = { ...v }; delete c[z.id]; return c; }); } catch (e) { toast(e.message, 'err'); } }}>Guardar</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Notices() {
  const { toast } = useApp();
  const list = useLoad(() => api.adminListPosts());
  const [f, setF] = useState({ title: '', body: '', image_url: '' });
  const [del, setDel] = useState(null);
  return (
    <div className="stack">
      <form className="card stack" onSubmit={async (e) => { e.preventDefault(); try { const r = await api.createPost({ ...f, type: 'aviso' }); toast(r.push?.demo ? 'Aviso publicado para todos' : `Aviso publicado · ${r.push?.sent ?? 0} celulares`, 'ok'); setF({ title: '', body: '', image_url: '' }); list.reload(); } catch (err) { toast(err.message, 'err'); } }}>
        <h2>Aviso para todo el pueblo</h2>
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={90} required placeholder="Ej.: Feria de emprendimiento este sábado" /></Field>
        <Field label="Detalle"><textarea className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={400} /></Field>
        <ImageInput label="Imagen (opcional)" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
        <button className="btn mango"><Icon name="megaphone" size={18} />Publicar aviso</button>
      </form>
      <h2>Moderación de publicaciones</h2>
      {list.loading ? <Spinner /> : list.data.map((p) => (
        <div key={p.id} className="card row between">
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <div className="row" style={{ gap: 6 }}><span className="badge">{POST_TYPES[p.type]}</span><span className="small muted">{p.business?.name || 'Equipo'} · {timeAgo(p.created_at)}</span>{!p.visible && <span className="badge gray">Oculta</span>}</div>
            <b>{p.title}</b>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn ghost sm" onClick={async () => { await api.setPostVisible(p.id, !p.visible); list.reload(); }}>{p.visible ? 'Ocultar' : 'Mostrar'}</button>
            <button className="icon-btn" style={{ color: 'var(--rojo)' }} onClick={() => setDel(p)} aria-label={`Eliminar ${p.title}`}><Icon name="trash" /></button>
          </div>
        </div>
      ))}
      {del && <Confirm danger yes="Eliminar" text={`¿Eliminar "${del.title}"?`} onClose={() => setDel(null)} onYes={async () => { try { await api.deletePost(del.id); list.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}
