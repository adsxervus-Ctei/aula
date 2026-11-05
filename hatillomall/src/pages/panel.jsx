// Sistema del negocio: vista del DUEÑO y del CAJERO
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, useOn, Icon, Empty, Spinner, Sheet, Field, Confirm, ImageInput, PrivateImg, go } from '../ui.jsx';
import { peso, hora, timeAgo, fecha, MODE, PAY_SHORT, STATUS, STATUS_TONE, GASTO_CATS, bogotaDay, addDays, diaCorto, diaLargo, planVigente, diasPlan, isOpen, uid } from '../lib/format.js';
import { saveOrQueue, pending, onQueue } from '../lib/offline.js';
import { Inventory, Customers, Products, Offers as OwnerOffers, Staff, Commission, History, Settings } from './panel2.jsx';
import { PLAN_PLUS_PRECIO } from '../config.js';

const OWNER_TABS = [
  ['hoy', 'Hoy', 'home'], ['pedidos', 'Pedidos', 'bag'], ['caja', 'Caja', 'cash'], ['gastos', 'Gastos', 'receipt'], ['balance', 'Balance', 'chart'],
  ['inventario', 'Inventario', 'box'], ['clientes', 'Clientes y fiados', 'users'], ['productos', 'Productos', 'store'], ['ofertas', 'Ofertas', 'bolt'],
  ['equipo', 'Empleados', 'users'], ['comision', 'Comisión', 'percent'], ['historial', 'Historial', 'history'], ['ajustes', 'Ajustes', 'cog'],
];
const CAJERO_TABS = [['caja', 'Anotar venta', 'cash'], ['pedidos', 'Pedidos', 'bag']];
const PLUS_ONLY = new Set(['pedidos', 'caja', 'gastos', 'balance', 'inventario', 'clientes', 'ofertas', 'equipo', 'comision']);

export function Panel({ tab }) {
  const { profile, work, session } = useApp();
  useEffect(() => { if (session === null) go('#/entrar?volver=%23%2Fpanel'); }, [session]);
  if (session && !profile) return <Spinner />;
  if (!profile) return null;
  if (!work) return <Empty icon="store" title="Aún no tiene un negocio registrado"><a className="btn mango" href="#/perfil?negocio=1">Registrar mi negocio</a></Empty>;
  const b = work.business;
  const owner = work.role === 'owner';
  const tabs = owner ? OWNER_TABS : CAJERO_TABS;
  const t = tab || (owner ? 'hoy' : 'caja');
  const plus = planVigente(b);
  const days = diasPlan(b);

  return (
    <div className="stack">
      <div className="row between">
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">{owner ? 'Sistema del negocio' : `${work.staff?.title || 'Cajero'} · ${profile.full_name}`}</span>
          <h1>{b.name}</h1>
        </div>
        <a className="btn secondary sm" href={`#/negocio/${b.id}`}>Ver como cliente</a>
      </div>
      {b.status === 'pendiente' && <div className="alert warn">El equipo de HatilloMall está revisando el negocio. Mientras tanto cargue sus productos y ajustes.</div>}
      {b.status === 'suspendido' && <div className="alert err">El negocio está suspendido y no aparece en la app. Hable con el equipo de HatilloMall.</div>}
      {owner && !plus && b.status === 'aprobado' && (
        <div className="alert info"><Icon name="lock" />Está en el plan Vitrina (gratis): aparece con foto y WhatsApp. El plan PLUS ({peso(PLAN_PLUS_PRECIO)} al mes) activa pedidos, caja, gastos, ofertas y lo demás.</div>
      )}
      {owner && plus && days != null && days <= 5 && <div className="alert warn">Su plan PLUS vence en {days} {days === 1 ? 'día' : 'días'}. Hable con el equipo para renovarlo.</div>}
      <nav className="tabs" aria-label="Secciones">
        {tabs.map(([k, label]) => <a key={k} href={`#/panel/${k}`} className={t === k ? 'on' : ''}>{label}</a>)}
      </nav>
      {!plus && PLUS_ONLY.has(t) ? <Locked /> : (
        <>
          {t === 'hoy' && owner && <Today b={b} />}
          {t === 'pedidos' && <Orders b={b} />}
          {t === 'caja' && <Cash b={b} owner={owner} />}
          {t === 'gastos' && owner && <Expenses b={b} />}
          {t === 'balance' && owner && <Balance b={b} />}
          {t === 'inventario' && owner && <Inventory b={b} />}
          {t === 'clientes' && owner && <Customers b={b} />}
          {t === 'productos' && owner && <Products b={b} />}
          {t === 'ofertas' && owner && <OwnerOffers b={b} />}
          {t === 'equipo' && owner && <Staff b={b} />}
          {t === 'comision' && owner && <Commission b={b} />}
          {t === 'historial' && owner && <History b={b} />}
          {t === 'ajustes' && owner && <Settings b={b} />}
        </>
      )}
    </div>
  );
}

function Locked() {
  return <Empty icon="lock" title="Disponible en el plan PLUS">Hable con el equipo de HatilloMall para activarlo. Los primeros 15 días son de prueba gratis.</Empty>;
}

function useQueued() {
  const [q, setQ] = useState(pending());
  useEffect(() => onQueue(setQ), []);
  return q;
}

// ---------- HOY ----------
function Today({ b }) {
  const { queued } = useApp();
  const d = useLoad(() => api.dashboard(b.id), [b.id]);
  const orders = useLoad(() => api.listBusinessOrders(b.id), [b.id]);
  useOn('hm:orders', () => { d.reload(); orders.reload(); });
  useOn('hm:synced', () => d.reload());
  if (d.loading) return <Spinner />;
  if (d.error) return <div className="notice err">{d.error}</div>;
  const x = d.data;
  const gan = x.ventas - x.gastos;
  const nuevos = (orders.data || []).filter((o) => o.status === 'nuevo');
  return (
    <div className="stack">
      <p className="muted">{diaLargo(x.dia)}</p>
      <div className="kpis">
        <div className="kpi"><span>Ventas de hoy</span><b>{peso(x.ventas)}</b></div>
        <div className="kpi"><span>Gastos de hoy</span><b>{peso(x.gastos)}</b></div>
        <div className={'kpi ' + (gan >= 0 ? 'win' : 'loss')}><span>{gan >= 0 ? 'Ganancia de hoy' : 'Pérdida de hoy'}</span><b>{peso(gan)}</b></div>
        <div className="kpi"><span>Pedidos por HatilloMall</span><b>{x.pedidos_app}</b></div>
      </div>
      <div className="bigbtns">
        <a className="btn" href="#/panel/caja"><Icon name="cash" />ANOTAR VENTA</a>
        <a className="btn mango" href="#/panel/gastos"><Icon name="receipt" />ANOTAR GASTO</a>
        <a className="btn secondary" href="#/panel/caja"><Icon name="bag" />VER VENTAS</a>
        <a className="btn secondary" href="#/panel/balance"><Icon name="chart" />VER BALANCE</a>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {nuevos.map((o) => <a key={o.id} className="alert warn" href={`#/pedido/${o.id}`}><Icon name="bell" />¡Pedido #{o.number} esperando! {MODE[o.mode].short} · {peso(o.total)} · {timeAgo(o.created_at)}</a>)}
        {x.stock_bajo > 0 && <a className="alert err" href="#/panel/inventario"><Icon name="box" />Ojo: {x.stock_bajo} {x.stock_bajo === 1 ? 'producto se está acabando' : 'productos se están acabando'} en el inventario.</a>}
        {!x.cerrada && new Date().getHours() >= 18 && <a className="alert info" href="#/panel/caja"><Icon name="lock" />Todavía no ha cerrado la caja de hoy.</a>}
        {queued > 0 && <div className="alert warn"><Icon name="wifioff" />{queued} registros guardados sin internet, pendientes por subir.</div>}
      </div>
      <div className="two">
        <div className="card stack" style={{ gap: 6 }}>
          <b>En caja hoy</b>
          <div className="row between small"><span>Efectivo</span><b className="num">{peso(x.ventas_efectivo)}</b></div>
          <div className="row between small"><span>Transferencias</span><b className="num">{peso(x.ventas_transferencia)}</b></div>
          <div className="row between small"><span>Fiado</span><b className="num">{peso(x.ventas_fiado)}</b></div>
          {x.abonos_efectivo > 0 && <div className="row between small"><span>Abonos de fiados</span><b className="num">{peso(x.abonos_efectivo)}</b></div>}
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <b>Para tener en cuenta</b>
          <div className="row between small"><span>Le deben (fiados)</span><b className="num">{peso(x.fiado_total)}</b></div>
          <div className="row between small"><span>Pedidos en curso</span><b className="num">{x.pedidos_pendientes}</b></div>
          <div className="row between small"><span>Comisión de esta semana</span><b className="num">{peso(x.comision_semana)}</b></div>
          <a className="small" href="#/panel/comision">¿Cómo se calcula la comisión?</a>
        </div>
      </div>
    </div>
  );
}

// ---------- PEDIDOS ----------
function Orders({ b }) {
  const list = useLoad(() => api.listBusinessOrders(b.id), [b.id]);
  const [all, setAll] = useState(false);
  useOn('hm:orders', () => list.reload());
  const shown = (list.data || []).filter((o) => all || isOpen(o));
  return (
    <div className="stack">
      <div className="row">
        <button className={'chip' + (!all ? ' on' : '')} onClick={() => setAll(false)}>En curso ({(list.data || []).filter(isOpen).length})</button>
        <button className={'chip' + (all ? ' on' : '')} onClick={() => setAll(true)}>Todos</button>
      </div>
      <p className="small muted">Cuando llega un pedido nuevo suena una alarma con la app abierta. Active las notificaciones en su perfil para recibirlos con la app cerrada.</p>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : shown.length === 0
        ? <Empty icon="bag" title={all ? 'Aún no hay pedidos' : 'No hay pedidos en curso'}>Los pedidos nuevos aparecen aquí al instante.</Empty>
        : shown.map((o) => (
          <a key={o.id} className="card click" href={`#/pedido/${o.id}`} style={o.status === 'nuevo' ? { borderColor: 'var(--mango)', borderWidth: 2 } : null}>
            <div className="row between"><b>#{o.number} · {o.customer?.full_name || 'Cliente'}</b><span className={'badge ' + STATUS_TONE[o.status]}>{STATUS[o.status]}</span></div>
            <div className="small" style={{ marginTop: 6 }}>{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</div>
            <div className="row between small muted" style={{ marginTop: 6 }}>
              <span><Icon name={MODE[o.mode].icon} size={15} /> {MODE[o.mode].short}{o.mode === 'domicilio' ? ` · ${o.zone?.name || ''}` : o.mode === 'mesa' ? ` · ${o.people} personas · ${hora(o.reserve_at)}` : ''} · {PAY_SHORT[o.payment]} · {timeAgo(o.created_at)}</span>
              <b className="price">{peso(o.total)}</b>
            </div>
          </a>
        ))}
    </div>
  );
}

// ---------- CAJA ----------
function Cash({ b, owner }) {
  const { toast, online } = useApp();
  const today = bogotaDay();
  const from = new Date(`${today}T00:00:00-05:00`).toISOString();
  const sales = useLoad(() => api.listSales(b.id, { from }), [b.id]);
  const prods = useLoad(() => api.listProducts(b.id), [b.id]);
  const custs = useLoad(() => api.listCustomers(b.id), [b.id]);
  const queue = useQueued().filter((q) => q.kind === 'sale' && q.payload.business_id === b.id);
  const [items, setItems] = useState({});
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [cust, setCust] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState(null);
  const [closing, setClosing] = useState(false);
  const [newCust, setNewCust] = useState(false);
  useOn('hm:synced', () => sales.reload());
  useOn('hm:orders', () => sales.reload());

  const picked = Object.values(items);
  const itemsTotal = picked.reduce((s, i) => s + i.price * i.qty, 0);
  const total = itemsTotal + (Number(amount) || 0);
  const fiables = (custs.data || []).filter((c) => c.fiado_ok && !c.blocked);
  const add = (p) => setItems((m) => ({ ...m, [p.id]: { product_id: p.id, name: p.name, price: p.price, qty: (m[p.id]?.qty || 0) + 1 } }));
  const dec = (p) => setItems((m) => { const c = { ...m }; if ((c[p.id]?.qty || 0) <= 1) delete c[p.id]; else c[p.id] = { ...c[p.id], qty: c[p.id].qty - 1 }; return c; });

  const submit = async (e) => {
    e.preventDefault();
    if (!(total > 0)) return toast('Elija productos o escriba un valor', 'err');
    if (method === 'fiado' && !cust) return toast('Para fiar, elija el cliente', 'err');
    const extra = Number(amount) > 0 ? [{ name: concept.trim() || 'Otro', price: Number(amount), qty: 1 }] : [];
    const payload = {
      id: uid(), business_id: b.id, items: [...picked, ...extra], amount: total, method, customer_ref: method === 'fiado' ? cust : null,
      concept: [...picked.map((i) => `${i.qty} × ${i.name}`), ...extra.map((i) => i.name)].join(', ').slice(0, 140), occurred_at: new Date().toISOString(),
    };
    setBusy(true);
    try {
      const r = await saveOrQueue('sale', payload, (p) => api.addSale(p));
      toast(r.queued ? `Venta de ${peso(total)} guardada en el celular: se sube al volver la señal` : `Venta anotada: ${peso(total)}`, 'ok');
      setItems({}); setConcept(''); setAmount(''); setMethod('efectivo'); setCust('');
      if (!r.queued) sales.reload();
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  const list = sales.data || [];
  const valid = list.filter((s) => !s.voided);
  const by = (m) => valid.filter((s) => s.method === m).reduce((t, s) => t + s.amount, 0);
  const avail = (prods.data || []).filter((p) => p.available);

  return (
    <div className="stack">
      <form className="card stack" onSubmit={submit}>
        <h2>Anotar venta</h2>
        {!online && <div className="notice warn small">Sin internet: la venta queda guardada en este celular y se sube sola.</div>}
        {avail.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">Toque los productos vendidos</span>
            <div className="chips" style={{ flexWrap: 'wrap' }}>
              {avail.map((p) => (
                <button type="button" key={p.id} className={'chip' + (items[p.id] ? ' on' : '')} onClick={() => add(p)}>
                  {items[p.id] ? `${items[p.id].qty} × ` : ''}{p.name} · {peso(p.price)}
                </button>
              ))}
            </div>
            {picked.length > 0 && (
              <div className="card soft stack" style={{ gap: 4 }}>
                {picked.map((i) => (
                  <div key={i.product_id} className="row between small" style={{ flexWrap: 'nowrap' }}>
                    <span>{i.qty} × {i.name}</span>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><b className="num">{peso(i.qty * i.price)}</b><button type="button" className="btn ghost sm" onClick={() => dec({ id: i.product_id })} aria-label={`Quitar un ${i.name}`}>−</button></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="two">
          <Field label={avail.length ? 'Otra cosa (opcional)' : 'Qué vendió'}><input className="input" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej.: porción de yuca" /></Field>
          <Field label="Valor"><input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" /></Field>
        </div>
        <div className="row" role="radiogroup" aria-label="Cómo pagó">
          {['efectivo', 'transferencia', 'fiado'].map((m) => <button type="button" key={m} role="radio" aria-checked={method === m} className={'chip' + (method === m ? ' on' : '')} onClick={() => setMethod(m)}>{PAY_SHORT[m]}</button>)}
        </div>
        {method === 'fiado' && (
          <div className="stack" style={{ gap: 6 }}>
            <Field label="¿A quién le fía?" hint={owner ? 'Solo clientes de confianza. Se marcan en «Clientes y fiados».' : 'Solo clientes que el dueño autorizó.'}>
              <select className="input" value={cust} onChange={(e) => setCust(e.target.value)}>
                <option value="">Elija el cliente…</option>
                {fiables.map((c) => <option key={c.customer_ref} value={c.customer_ref}>{c.name}</option>)}
              </select>
            </Field>
            {owner && <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setNewCust(true)}><Icon name="plus" size={16} />Cliente nuevo de confianza</button>}
          </div>
        )}
        <button className="btn big block" disabled={busy}>{busy ? 'Guardando…' : `Anotar venta · ${peso(total)}`}</button>
      </form>

      {owner && (
        <div className="card stack" style={{ gap: 8 }}>
          <b>Hoy en caja</b>
          <p>En caja tiene <b className="num">{peso(by('efectivo'))}</b> en efectivo y <b className="num">{peso(by('transferencia'))}</b> en transferencias. Fiado: <b className="num">{peso(by('fiado'))}</b>.</p>
          <button className="btn mango" style={{ alignSelf: 'flex-start' }} onClick={() => setClosing(true)}><Icon name="lock" size={18} />Cierre de caja</button>
        </div>
      )}

      <h2>{owner ? 'Ventas de hoy' : 'Mis ventas de hoy'}</h2>
      {sales.loading ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hora</th><th>Qué</th><th>Pago</th><th className="r">Valor</th>{owner && <th />}</tr></thead>
            <tbody>
              {queue.map((q) => (
                <tr key={q.payload.id}><td>{hora(q.payload.occurred_at)}</td><td>{q.payload.concept} <span className="badge yellow">Sin subir</span></td><td>{PAY_SHORT[q.payload.method]}</td><td className="r">{peso(q.payload.amount)}</td>{owner && <td />}</tr>
              ))}
              {list.map((s) => (
                <tr key={s.id} className={s.voided ? 'void' : ''}>
                  <td>{hora(s.occurred_at)}</td>
                  <td>{s.concept || '—'} {s.source === 'app' && <span className="badge green">App</span>} {s.customer?.name && <span className="muted small">· {s.customer.name}</span>}{s.voided && <div className="tiny">Anulada: {s.void_reason}</div>}</td>
                  <td>{PAY_SHORT[s.method]}</td>
                  <td className="r">{peso(s.amount)}</td>
                  {owner && <td>{!s.voided && <button className="btn ghost sm" onClick={() => setVoiding(s)}>Anular</button>}</td>}
                </tr>
              ))}
              {!list.length && !queue.length && <tr><td colSpan={5} className="muted">Todavía no hay ventas hoy.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {owner && <p className="tiny muted">Las ventas no se borran ni se editan: se anulan con motivo y queda en el historial quién lo hizo.</p>}
      {voiding && <Confirm title="Anular venta" danger yes="Anular" ask="Motivo" text={`${voiding.concept} · ${peso(voiding.amount)}`} onClose={() => setVoiding(null)}
        onYes={async (r) => { try { await api.voidSale(voiding.id, r); toast('Venta anulada', 'ok'); sales.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
      {closing && <CloseCash b={b} onClose={() => setClosing(false)} />}
      {newCust && <NewCustomer b={b} onClose={() => setNewCust(false)} onSaved={(c) => { custs.reload(); setCust(c.id); setNewCust(false); }} />}
    </div>
  );
}

export function NewCustomer({ b, onClose, onSaved }) {
  const { toast } = useApp();
  const [f, setF] = useState({ name: '', phone: '', fiado_ok: true });
  return (
    <Sheet title="Cliente de confianza" onClose={onClose}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { const c = await api.saveCustomer({ ...f, business_id: b.id }); if (f.fiado_ok) await api.setCustomerFlags(c.id, { fiado_ok: true }); toast('Cliente guardado', 'ok'); onSaved(c); } catch (err) { toast(err.message, 'err'); } }}>
        <Field label="Nombre"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Celular"><input className="input" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <label className="check"><input type="checkbox" checked={f.fiado_ok} onChange={(e) => setF({ ...f, fiado_ok: e.target.checked })} />Se le puede fiar</label>
        <button className="btn block">Guardar</button>
      </form>
    </Sheet>
  );
}

function CloseCash({ b, onClose }) {
  const { toast, profile } = useApp();
  const exp = useLoad(() => api.cashPreview(b.id), [b.id]);
  const [counted, setCounted] = useState('');
  const [signer, setSigner] = useState(profile?.full_name || '');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);
  return (
    <Sheet title="Cierre de caja" onClose={onClose}>
      {done ? (
        <div className="stack">
          <div className={'alert ' + (done.difference === 0 ? 'ok' : done.difference > 0 ? 'info' : 'err')}>
            {done.difference === 0 ? 'La caja cuadra exacto.' : done.difference > 0 ? `Sobran ${peso(done.difference)}.` : `Faltan ${peso(-done.difference)}.`}
          </div>
          <p className="small">Debía haber <b>{peso(done.expected_cash)}</b> y contó <b>{peso(done.counted_cash)}</b>. Firmado por {done.signed_by}. Quedó en el historial.</p>
          <button className="btn" onClick={onClose}>Listo</button>
        </div>
      ) : exp.loading ? <Spinner /> : (
        <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { setDone(await api.closeCash(b.id, counted, signer, note)); toast('Caja cerrada', 'ok'); } catch (err) { toast(err.message, 'err'); } }}>
          <div className="card soft">
            <span className="small muted">Debe tener en efectivo</span>
            <div className="money num">{peso(exp.data)}</div>
            <span className="tiny muted">Ventas en efectivo + abonos de fiados en efectivo − gastos pagados con la caja, de hoy.</span>
          </div>
          <Field label="¿Cuánto tiene realmente?"><input className="input money" inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value.replace(/\D/g, ''))} required autoFocus /></Field>
          <Field label="Firma (nombre de quien cuenta)"><input className="input" value={signer} onChange={(e) => setSigner(e.target.value)} required /></Field>
          <Field label="Observación (opcional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <button className="btn big block mango">Cerrar la caja de hoy</button>
          <p className="tiny muted">Se cierra una vez al día y no se puede cambiar.</p>
        </form>
      )}
    </Sheet>
  );
}

// ---------- GASTOS ----------
function Expenses({ b }) {
  const { toast, online } = useApp();
  const from = new Date(`${addDays(bogotaDay(), -6)}T00:00:00-05:00`).toISOString();
  const list = useLoad(() => api.listExpenses(b.id, { from }), [b.id]);
  const queue = useQueued().filter((q) => q.kind === 'expense' && q.payload.business_id === b.id);
  const [f, setF] = useState({ concept: '', category: GASTO_CATS[0], amount: '', paid_cash: true, receipt_url: '' });
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState(null);
  const [view, setView] = useState(null);
  useOn('hm:synced', () => list.reload());
  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) return toast('Escriba el valor', 'err');
    setBusy(true);
    try {
      const r = await saveOrQueue('expense', { ...f, id: uid(), business_id: b.id, amount: Number(f.amount), occurred_at: new Date().toISOString() }, (p) => api.addExpense(p));
      toast(r.queued ? 'Gasto guardado en el celular: se sube al volver la señal' : `Gasto anotado: ${peso(f.amount)}`, 'ok');
      setF({ concept: '', category: f.category, amount: '', paid_cash: true, receipt_url: '' });
      if (!r.queued) list.reload();
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const today = bogotaDay();
  const items = list.data || [];
  const hoy = items.filter((x) => !x.voided && bogotaDay(x.occurred_at) === today).reduce((t, x) => t + x.amount, 0);
  return (
    <div className="stack">
      <form className="card stack" onSubmit={submit}>
        <h2>Anotar gasto</h2>
        {!online && <div className="notice warn small">Sin internet: el gasto queda guardado en este celular. La foto de la factura súbala cuando vuelva la señal.</div>}
        <Field label="¿Qué compró o pagó?"><input className="input" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} placeholder="Ej.: carne de res" required /></Field>
        <div className="two">
          <Field label="Valor"><input className="input money" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} required /></Field>
          <Field label="Tipo de gasto"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{GASTO_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <label className="check"><input type="checkbox" checked={f.paid_cash} onChange={(e) => setF({ ...f, paid_cash: e.target.checked })} />Lo pagué con la plata de la caja</label>
        {online && <ImageInput label="Foto de la factura (opcional)" value={f.receipt_url} onChange={(v) => setF({ ...f, receipt_url: v })} upload={(file) => api.uploadPrivate(b.id, file)} />}
        <button className="btn mango big block" disabled={busy}>{busy ? 'Guardando…' : 'Anotar gasto'}</button>
      </form>
      <div className="row between"><h2>Últimos 7 días</h2><span className="small">Hoy: <b className="num">{peso(hoy)}</b></span></div>
      {list.loading ? <Spinner /> : list.error ? <div className="notice err">{list.error}</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Día</th><th>Qué</th><th>Tipo</th><th className="r">Valor</th><th /></tr></thead>
            <tbody>
              {queue.map((q) => <tr key={q.payload.id}><td>{fecha(q.payload.occurred_at)}</td><td>{q.payload.concept} <span className="badge yellow">Sin subir</span></td><td>{q.payload.category}</td><td className="r">{peso(q.payload.amount)}</td><td /></tr>)}
              {items.map((x) => (
                <tr key={x.id} className={x.voided ? 'void' : ''}>
                  <td>{fecha(x.occurred_at)}</td>
                  <td>{x.concept}{!x.paid_cash && <span className="muted small"> · no salió de la caja</span>}{x.voided && <div className="tiny">Anulado: {x.void_reason}</div>}</td>
                  <td>{x.category}</td><td className="r">{peso(x.amount)}</td>
                  <td className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                    {x.receipt_url && <button className="btn ghost sm" onClick={() => setView(x)}>Factura</button>}
                    {!x.voided && <button className="btn ghost sm" onClick={() => setVoiding(x)}>Anular</button>}
                  </td>
                </tr>
              ))}
              {!items.length && !queue.length && <tr><td colSpan={5} className="muted">Sin gastos en estos días.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {voiding && <Confirm title="Anular gasto" danger yes="Anular" ask="Motivo" text={`${voiding.concept} · ${peso(voiding.amount)}`} onClose={() => setVoiding(null)}
        onYes={async (r) => { try { await api.voidExpense(voiding.id, r); toast('Gasto anulado', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
      {view && <Sheet title={`Factura · ${view.concept}`} onClose={() => setView(null)}><PrivateImg src={view.receipt_url} alt="Factura" /></Sheet>}
    </div>
  );
}

// ---------- BALANCE ----------
function Balance({ b }) {
  const [period, setPeriod] = useState('semana');
  const today = bogotaDay();
  const range = useMemo(() => (period === 'semana' ? [addDays(today, -6), today] : period === 'mes' ? [addDays(today, -29), today] : [today, today]), [period, today]);
  const bal = useLoad(() => api.balance(b.id, range[0], range[1]), [b.id, range[0], range[1]]);
  const closings = useLoad(() => api.listClosings(b.id), [b.id]);
  const x = bal.data;
  const max = x ? Math.max(1, ...x.serie.map((s) => Math.max(s.ventas, s.gastos))) : 1;
  const label = { hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Últimos 30 días' }[period];
  return (
    <div className="stack">
      <div className="row">{[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']].map(([k, l]) => <button key={k} className={'chip' + (period === k ? ' on' : '')} onClick={() => setPeriod(k)}>{l}</button>)}</div>
      {bal.loading ? <Spinner /> : bal.error ? <div className="notice err">{bal.error}</div> : (
        <>
          <p style={{ fontSize: 18 }}>{label}: entró <b className="num">{peso(x.entradas)}</b>, salió <b className="num">{peso(x.salidas)}</b>, {x.ganancia >= 0 ? 'le quedaron' : 'perdió'} <b className="num" style={{ color: x.ganancia >= 0 ? 'var(--palma)' : 'var(--rojo)' }}>{peso(Math.abs(x.ganancia))}</b>.</p>
          <div className="kpis">
            <div className="kpi"><span>Entró</span><b>{peso(x.entradas)}</b></div>
            <div className="kpi"><span>Salió</span><b>{peso(x.salidas)}</b></div>
            <div className={'kpi ' + (x.ganancia >= 0 ? 'win' : 'loss')}><span>{x.ganancia >= 0 ? 'Le quedó' : 'Perdió'}</span><b>{peso(x.ganancia)}</b></div>
            <div className="kpi"><span>Vendido por HatilloMall</span><b>{peso(x.por_app)}</b></div>
          </div>
          {x.serie.length > 1 && (
            <div className="card stack" style={{ gap: 8 }}>
              <div className="row between"><b>Ventas y gastos por día</b><div className="legend"><span><i style={{ background: 'var(--palma)' }} />Ventas</span><span><i style={{ background: 'var(--mango)' }} />Gastos</span></div></div>
              <div style={{ overflowX: 'auto' }}>
                <div className="bars" style={{ minWidth: x.serie.length > 10 ? x.serie.length * 26 : undefined }} role="img" aria-label={`Ventas y gastos por día, ${label}`}>
                  {x.serie.map((s) => (
                    <div key={s.dia} className={'col' + (x.mejor_dia?.dia === s.dia ? ' best' : '')} title={`${diaCorto(s.dia)}: ventas ${peso(s.ventas)}, gastos ${peso(s.gastos)}`}>
                      <div className="pair"><div className="v" style={{ height: `${(s.ventas / max) * 100}%` }} /><div className="g" style={{ height: `${(s.gastos / max) * 100}%` }} /></div>
                      <small>{x.serie.length > 10 ? s.dia.slice(8) : diaCorto(s.dia)}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="two">
            <div className="card stack" style={{ gap: 6 }}>
              <b>Su mejor día</b>
              {x.mejor_dia ? <p>{diaLargo(x.mejor_dia.dia)}: <b className="num">{peso(x.mejor_dia.ventas)}</b></p> : <p className="muted">Sin ventas.</p>}
              <b style={{ marginTop: 8 }}>Lo que más se vende</b>
              {x.mas_vendidos.length ? x.mas_vendidos.map((p, i) => <div key={p.nombre} className="row between small"><span>{i + 1}. {p.nombre}</span><b className="num">{p.cantidad} vendidos</b></div>) : <p className="muted small">Anote las ventas con productos para verlo.</p>}
            </div>
            <div className="card stack" style={{ gap: 6 }}>
              <b>En qué se fue la plata</b>
              {x.gastos_por_categoria.length ? x.gastos_por_categoria.map((g) => (
                <div key={g.categoria} className="stack" style={{ gap: 4 }}>
                  <div className="row between small"><span>{g.categoria}</span><b className="num">{peso(g.total)}</b></div>
                  <div className="meter"><i style={{ width: `${(g.total / Math.max(1, x.salidas)) * 100}%`, background: 'var(--mango)' }} /></div>
                </div>
              )) : <p className="muted small">Sin gastos.</p>}
            </div>
          </div>
        </>
      )}
      <h2>Cierres de caja</h2>
      {closings.loading ? <Spinner /> : !closings.data?.length ? <p className="muted small">Aún no hay cierres.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Día</th><th className="r">Debía haber</th><th className="r">Contó</th><th className="r">Diferencia</th><th>Firma</th></tr></thead>
            <tbody>{closings.data.map((c) => (
              <tr key={c.id}><td>{diaCorto(c.day)}</td><td className="r">{peso(c.expected_cash)}</td><td className="r">{peso(c.counted_cash)}</td>
                <td className="r" style={{ color: c.difference < 0 ? 'var(--rojo)' : c.difference > 0 ? 'var(--azul)' : 'var(--palma)', fontWeight: 800 }}>{c.difference === 0 ? 'Cuadra' : peso(c.difference)}</td><td>{c.signed_by}{c.note && <div className="tiny muted">{c.note}</div>}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
