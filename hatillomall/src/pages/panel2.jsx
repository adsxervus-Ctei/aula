// Sistema del negocio (2): inventario, clientes y fiados, productos, ofertas, empleados, comisión, historial, ajustes
import React, { useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, useOn, Icon, Empty, Spinner, Sheet, Field, Confirm, ImageInput } from '../ui.jsx';
import { peso, timeAgo, fecha, fechaHora, POST_TYPES, waLink, horarioPermitido, bogotaDay, weekStart, addDays, diaCorto, planVigente, diasPlan } from '../lib/format.js';
import { BusinessForm } from './auth.jsx';
import { NewCustomer } from './panel.jsx';
import { IMPULSO_PRECIO, PLAN_PLUS_PRECIO, SUPPORT_WHATSAPP } from '../config.js';

// ---------- INVENTARIO ----------
export function Inventory({ b }) {
  const { toast } = useApp();
  const list = useLoad(() => api.listInventory(b.id), [b.id]);
  const [edit, setEdit] = useState(null);
  const [move, setMove] = useState(null);
  const low = (list.data || []).filter((i) => Number(i.qty) <= Number(i.min_qty));
  return (
    <div className="stack">
      <div className="row between">
        <p className="small muted" style={{ maxWidth: 520 }}>Anote lo que compra (entrada) y lo que gasta (salida). Cuando algo llega al mínimo, le avisamos.</p>
        <button className="btn" onClick={() => setEdit({ business_id: b.id, unit: 'unidades', qty: '', min_qty: '' })}><Icon name="plus" size={18} />Agregar</button>
      </div>
      {low.map((i) => <div key={i.id} className="alert err"><Icon name="box" />Ojo, le queda poca {i.name.toLowerCase()}: {Number(i.qty)} {i.unit}.</div>)}
      {list.loading ? <Spinner /> : !list.data?.length ? <Empty icon="box" title="Aún no hay inventario">Agregue lo que más usa: carne, gaseosa, arroz…</Empty> : (
        <div className="card">
          {list.data.map((i) => {
            const isLow = Number(i.qty) <= Number(i.min_qty);
            return (
              <div key={i.id} className="list-row">
                <div className="grow">
                  <b>{i.name}</b>
                  <span className="small muted">Mínimo: {Number(i.min_qty)} {i.unit}</span>
                </div>
                <span className={'badge ' + (isLow ? 'red' : 'green')} style={{ fontSize: 14 }}>{Number(i.qty)} {i.unit}</span>
                <button className="btn sm" onClick={() => setMove({ item: i, sign: 1 })} aria-label={`Entrada de ${i.name}`}><Icon name="plus" size={18} /></button>
                <button className="btn secondary sm" onClick={() => setMove({ item: i, sign: -1 })} aria-label={`Salida de ${i.name}`}><Icon name="minus" size={18} /></button>
                <button className="icon-btn" style={{ color: 'var(--palma)' }} onClick={() => setEdit(i)} aria-label={`Editar ${i.name}`}><Icon name="edit" /></button>
              </div>
            );
          })}
        </div>
      )}
      {edit && (
        <Sheet title={edit.id ? 'Editar producto de inventario' : 'Nuevo en inventario'} onClose={() => setEdit(null)}>
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { await api.saveInventoryItem(edit); toast('Guardado', 'ok'); setEdit(null); list.reload(); } catch (err) { toast(err.message, 'err'); } }}>
            <Field label="Nombre"><input className="input" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
            <div className="two">
              <Field label="Unidad"><select className="input" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })}>{['unidades', 'kg', 'libras', 'litros', 'bultos', 'pacas', 'cajas'].map((u) => <option key={u}>{u}</option>)}</select></Field>
              <Field label="Avisar cuando queden"><input className="input" inputMode="decimal" value={edit.min_qty} onChange={(e) => setEdit({ ...edit, min_qty: e.target.value })} /></Field>
            </div>
            {!edit.id && <Field label="Cantidad que tiene hoy"><input className="input" inputMode="decimal" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} /></Field>}
            {edit.id && <p className="small muted">La cantidad solo cambia con entradas y salidas, para que quede registro.</p>}
            <button className="btn block">Guardar</button>
          </form>
        </Sheet>
      )}
      {move && <MoveSheet b={b} {...move} onClose={() => setMove(null)} onDone={() => { setMove(null); list.reload(); }} />}
    </div>
  );
}

function MoveSheet({ b, item, sign, onClose, onDone }) {
  const { toast } = useApp();
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState(sign > 0 ? 'Compra' : 'Se usó en ventas');
  return (
    <Sheet title={`${sign > 0 ? 'Entrada' : 'Salida'} · ${item.name}`} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { await api.moveInventory(item.id, b.id, sign * Number(String(qty).replace(',', '.')), reason); toast('Inventario actualizado', 'ok'); onDone(); } catch (err) { toast(err.message, 'err'); } }}>
        <p className="small">Hay {Number(item.qty)} {item.unit}.</p>
        <Field label={`Cantidad (${item.unit})`}><input className="input money" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus /></Field>
        <Field label="Motivo"><select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {(sign > 0 ? ['Compra', 'Devolución', 'Ajuste por conteo'] : ['Se usó en ventas', 'Se dañó o venció', 'Ajuste por conteo', 'Consumo de la casa']).map((r) => <option key={r}>{r}</option>)}
        </select></Field>
        <button className={'btn block big ' + (sign > 0 ? '' : 'mango')}>{sign > 0 ? 'Sumar' : 'Restar'}</button>
      </form>
    </Sheet>
  );
}

// ---------- CLIENTES Y FIADOS ----------
export function Customers({ b }) {
  const { toast } = useApp();
  const list = useLoad(() => api.listCustomers(b.id, { balances: true }), [b.id]);
  const [abono, setAbono] = useState(null);
  const [hist, setHist] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [q, setQ] = useState('');
  const rows = (list.data || []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  const total = (list.data || []).reduce((t, c) => t + Math.max(0, c.saldo), 0);
  const flag = async (c, k) => { try { await api.setCustomerFlags(c.customer_ref, { [k]: !c[k] }); list.reload(); } catch (e) { toast(e.message, 'err'); } };
  const okHour = horarioPermitido();
  return (
    <div className="stack">
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="kpi"><span>Le deben en total</span><b>{peso(total)}</b></div>
        <div className="kpi"><span>Clientes con deuda</span><b>{(list.data || []).filter((c) => c.saldo > 0).length}</b></div>
      </div>
      {!b.allow_fiado && <div className="notice warn small">El fiado está apagado. Actívelo en Ajustes para que los clientes de confianza puedan pedir fiado por la app.</div>}
      <div className="row between">
        <div className="search" style={{ flex: 1, minWidth: 200 }}><Icon name="search" /><label className="sr-only" htmlFor="cq">Buscar cliente</label><input id="cq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" /></div>
        <button className="btn" onClick={() => setNuevo(true)}><Icon name="plus" size={18} />Cliente</button>
      </div>
      {list.loading ? <Spinner /> : !rows.length ? <Empty icon="users" title="Aún no hay clientes">Los que piden por la app aparecen aquí solos.</Empty> : (
        <div className="card">
          {rows.map((c) => (
            <div key={c.customer_ref} className="list-row" style={{ flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 160 }}>
                <b>{c.name}{c.blocked && <span className="badge red" style={{ marginLeft: 6 }}>Bloqueado</span>}</b>
                <span className="small muted">{c.phone || 'Sin celular'}{c.ultimo ? ` · último movimiento ${timeAgo(c.ultimo)}` : ''}</span>
              </div>
              <b className="num" style={{ color: c.saldo > 0 ? 'var(--rojo)' : 'var(--palma)' }}>{c.saldo > 0 ? `Debe ${peso(c.saldo)}` : 'Al día'}</b>
              <div className="row" style={{ gap: 6, width: '100%' }}>
                <label className="check small" style={{ minHeight: 36 }}><input type="checkbox" checked={c.fiado_ok} onChange={() => flag(c, 'fiado_ok')} />Fiarle</label>
                <label className="check small" style={{ minHeight: 36 }}><input type="checkbox" checked={c.blocked} onChange={() => flag(c, 'blocked')} />Bloquear</label>
                {c.saldo > 0 && <button className="btn sm" onClick={() => setAbono(c)}>Abono</button>}
                <button className="btn ghost sm" onClick={() => setHist(c)}>Movimientos</button>
                {c.phone && c.saldo > 0 && (okHour
                  ? <a className="btn ghost sm" href={waLink(c.phone, `Hola ${c.name}, le saluda ${b.name}. Le recordamos su saldo pendiente de ${peso(c.saldo)}. ¡Gracias!`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} />Recordar</a>
                  : <span className="tiny muted">Recordatorios en horario permitido</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="tiny muted">Los recordatorios de cobro solo se envían lunes a viernes de 7 a. m. a 7 p. m. y sábados de 8 a. m. a 3 p. m., nunca domingos ni festivos (Ley 2300 de 2023). Las deudas solo nacen de una venta fiada y no se borran.</p>
      {abono && <AbonoSheet b={b} c={abono} onClose={() => setAbono(null)} onDone={() => { setAbono(null); list.reload(); }} />}
      {hist && <FiadoHistory c={hist} onClose={() => setHist(null)} />}
      {nuevo && <NewCustomer b={b} onClose={() => setNuevo(false)} onSaved={() => { setNuevo(false); list.reload(); }} />}
    </div>
  );
}

function AbonoSheet({ b, c, onClose, onDone }) {
  const { toast } = useApp();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  return (
    <Sheet title={`Abono de ${c.name}`} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { await api.addAbono(b.id, c.customer_ref, amount, method, 'Abono'); toast('Abono registrado', 'ok'); onDone(); } catch (err) { toast(err.message, 'err'); } }}>
        <p>Debe <b>{peso(c.saldo)}</b>.</p>
        <Field label="Valor del abono"><input className="input money" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} required autoFocus /></Field>
        <div className="row">{['efectivo', 'transferencia'].map((m) => <button type="button" key={m} className={'chip' + (method === m ? ' on' : '')} onClick={() => setMethod(m)}>{m === 'efectivo' ? 'Efectivo' : 'Transferencia'}</button>)}</div>
        <button className="btn big block">Registrar abono</button>
      </form>
    </Sheet>
  );
}

function FiadoHistory({ c, onClose }) {
  const l = useLoad(() => api.listFiadoMoves(c.customer_ref), [c.customer_ref]);
  return (
    <Sheet title={`Movimientos · ${c.name}`} onClose={onClose}>
      {l.loading ? <Spinner /> : !l.data?.length ? <p className="muted">Sin movimientos.</p> : l.data.map((m) => (
        <div key={m.id} className="list-row">
          <div className="grow"><b>{m.kind === 'cargo' ? 'Fió' : 'Abonó'}</b><span className="small muted">{m.note} · {fechaHora(m.created_at)}</span></div>
          <b className="num" style={{ color: m.kind === 'cargo' ? 'var(--rojo)' : 'var(--palma)' }}>{m.kind === 'cargo' ? '+' : '−'}{peso(m.amount)}</b>
        </div>
      ))}
    </Sheet>
  );
}

// ---------- PRODUCTOS ----------
export function Products({ b }) {
  const { toast } = useApp();
  const list = useLoad(() => api.listProducts(b.id), [b.id]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const toggle = async (p) => { try { await api.saveProduct({ ...p, available: !p.available }); list.reload(); } catch (e) { toast(e.message, 'err'); } };
  return (
    <div className="stack">
      <div className="row between">
        <p className="small muted">{list.data?.length || 0} productos. Los agotados no se muestran a los clientes.</p>
        <button className="btn" onClick={() => setEdit({ business_id: b.id, available: true, section: b.category?.slug === 'restaurantes' ? 'Platos' : 'General' })}><Icon name="plus" size={18} />Agregar</button>
      </div>
      {b.category?.slug === 'farmacias' && <div className="notice info small">Publique solo productos de venta libre. Los medicamentos con fórmula médica no se venden por la app.</div>}
      {list.loading ? <Spinner /> : !list.data?.length ? <Empty title="Agregue su primer producto o plato" /> : (
        <div className="card">
          {list.data.map((p) => (
            <div key={p.id} className="product">
              {p.image_url ? <img className="thumb" src={p.image_url} alt="" /> : null}
              <div className="info"><b>{p.name}</b><span className="small muted">{p.section}{p.description ? ` · ${p.description}` : ''}</span>
                <div className="row" style={{ gap: 6 }}><span className="price">{peso(p.price)}</span>{!p.available && <span className="badge gray">Agotado</span>}</div></div>
              <div className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
                <button className="icon-btn" style={{ color: 'var(--palma)' }} onClick={() => toggle(p)} aria-label={p.available ? `Marcar ${p.name} agotado` : `Marcar ${p.name} disponible`}><Icon name={p.available ? 'eye' : 'eyeoff'} /></button>
                <button className="icon-btn" style={{ color: 'var(--palma)' }} onClick={() => setEdit(p)} aria-label={`Editar ${p.name}`}><Icon name="edit" /></button>
                <button className="icon-btn" style={{ color: 'var(--rojo)' }} onClick={() => setDel(p)} aria-label={`Eliminar ${p.name}`}><Icon name="trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <Sheet title={edit.id ? 'Editar producto' : 'Nuevo producto'} onClose={() => setEdit(null)}>
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { await api.saveProduct(edit); toast('Producto guardado', 'ok'); setEdit(null); list.reload(); } catch (err) { toast(err.message, 'err'); } }}>
            <Field label="Nombre"><input className="input" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
            <div className="two">
              <Field label="Precio"><input className="input" inputMode="numeric" value={edit.price ?? ''} onChange={(e) => setEdit({ ...edit, price: e.target.value.replace(/\D/g, '') })} required /></Field>
              <Field label="Sección"><input className="input" value={edit.section || ''} onChange={(e) => setEdit({ ...edit, section: e.target.value })} /></Field>
            </div>
            <Field label="Descripción (opcional)"><input className="input" value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength={160} /></Field>
            <ImageInput label="Foto (opcional)" value={edit.image_url} onChange={(v) => setEdit({ ...edit, image_url: v })} />
            <label className="check"><input type="checkbox" checked={edit.available !== false} onChange={(e) => setEdit({ ...edit, available: e.target.checked })} />Disponible</label>
            <button className="btn block">Guardar</button>
          </form>
        </Sheet>
      )}
      {del && <Confirm danger yes="Eliminar" text={`¿Eliminar "${del.name}"? Queda registrado en el historial.`} onClose={() => setDel(null)} onYes={async () => { try { await api.deleteProduct(del.id); list.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}

// ---------- OFERTAS E IMPULSO ----------
export function Offers({ b }) {
  const { toast } = useApp();
  const mine = useLoad(() => api.listMyPosts(b.id), [b.id]);
  const boosts = useLoad(() => api.listMyBoosts(b.id), [b.id]);
  const [f, setF] = useState({ type: 'oferta', title: '', price: '', body: '', image_url: '' });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [ask, setAsk] = useState(null);
  const ok = b.status === 'aprobado';
  const boostOf = (pid) => (boosts.data || []).find((x) => x.post_id === pid && (x.status === 'solicitado' || (x.status === 'activo' && x.ends_at > new Date().toISOString())));
  return (
    <div className="stack">
      <form className="card stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { const r = await api.createPost({ ...f, business_id: b.id }); setRes(r.push); setF({ ...f, title: '', price: '', body: '', image_url: '' }); mine.reload(); toast('Publicada para todos', 'ok'); }
        catch (err) { toast(err.message, 'err'); }
        setBusy(false);
      }}>
        <h2>Publicar oferta de hoy</h2>
        {!ok && <div className="notice warn small">Podrá publicar cuando el equipo apruebe su negocio.</div>}
        <div className="chips">{['oferta', 'menu', 'producto', 'servicio'].map((t) => <button type="button" key={t} className={'chip' + (f.type === t ? ' on' : '')} onClick={() => setF({ ...f, type: t })}>{POST_TYPES[t]}</button>)}</div>
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={90} required placeholder="Ej.: Asado especial $25.000" /></Field>
        <div className="two">
          <Field label="Precio (opcional)"><input className="input" inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Detalle (opcional)"><input className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={300} placeholder="Con yuca, ensalada y gaseosa" /></Field>
        </div>
        <ImageInput label="Foto" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
        <button className="btn mango big block" disabled={busy || !ok}><Icon name="megaphone" size={18} />{busy ? 'Publicando…' : 'PUBLICAR'}</button>
        {res && <div className="notice small">{res.demo ? `Publicada. En la app real, ${res.sent} personas recibirían el aviso.` : res.error ? 'Publicada. Todos la ven en Ofertas; el aviso al celular no salió (revise la función de notificaciones).' : `Publicada. Aviso enviado a ${res.sent} celulares.`}</div>}
      </form>
      <div className="card soft stack" style={{ gap: 6 }}>
        <b><Icon name="bolt" size={18} /> Impulso: {peso(IMPULSO_PRECIO)} por 48 horas</b>
        <p className="small">Su oferta sale de primera en el inicio de HatilloMall y les llega un aviso a todos. Publicar es gratis con el plan PLUS; el Impulso es solo cuando quiere vender mucho. El equipo lo activa al recibir el pago.</p>
      </div>
      <h2>Mis publicaciones</h2>
      {mine.loading ? <Spinner /> : !mine.data?.length ? <Empty icon="megaphone" title="Aún no ha publicado" /> : mine.data.map((p) => {
        const bo = boostOf(p.id);
        return (
          <div key={p.id} className="card row between">
            <div className="stack" style={{ gap: 4, minWidth: 0 }}>
              <div className="row" style={{ gap: 6 }}><span className="badge mango">{POST_TYPES[p.type]}</span><span className="small muted">{timeAgo(p.created_at)}</span>{!p.visible && <span className="badge gray">Oculta</span>}
                {bo && <span className={'badge ' + (bo.status === 'activo' ? 'ink' : 'yellow')}>{bo.status === 'activo' ? `Impulso hasta ${fechaHora(bo.ends_at)}` : 'Impulso solicitado'}</span>}</div>
              <b>{p.title}</b>{p.price ? <span className="price">{peso(p.price)}</span> : null}
            </div>
            <div className="row" style={{ gap: 4 }}>
              {!bo && p.visible && <button className="btn mango sm" onClick={() => setAsk(p)}><Icon name="bolt" size={16} />Impulsar</button>}
              <button className="btn ghost sm" onClick={async () => { await api.setPostVisible(p.id, !p.visible); mine.reload(); }}>{p.visible ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </div>
        );
      })}
      {ask && <Confirm title="Pedir Impulso" yes={`Pedir Impulso · ${peso(IMPULSO_PRECIO)}`} text={`"${ask.title}" saldrá de primera 48 horas y les llegará a todos. El equipo de HatilloMall le confirma el pago (efectivo o Nequi) y lo activa.`}
        onClose={() => setAsk(null)} onYes={async () => { try { await api.requestBoost(b.id, ask.id); toast('Impulso solicitado. El equipo lo activa al recibir el pago.', 'ok'); boosts.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}

// ---------- EMPLEADOS ----------
export function Staff({ b }) {
  const { toast } = useApp();
  const list = useLoad(() => api.listStaff(b.id), [b.id]);
  const slug = b.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-')[0] || 'negocio';
  const [f, setF] = useState(null);
  const [pw, setPw] = useState(null);
  const [out, setOut] = useState(null);
  return (
    <div className="stack">
      <div className="card soft stack" style={{ gap: 6 }}>
        <b>Usted ve todo. El cajero solo ve «Anotar venta» y «Pedidos».</b>
        <p className="small">No ve la ganancia, los gastos, el inventario ni el historial, y no puede anular ventas. Cada venta queda con el nombre de quien la anotó.</p>
      </div>
      <div className="row between"><h2>Empleados</h2><button className="btn" onClick={() => setF({ username: `${slug}-cajero`, full_name: '', password: '', title: 'Cajero' })}><Icon name="plus" size={18} />Nuevo empleado</button></div>
      {list.loading ? <Spinner /> : !list.data?.length ? <Empty icon="users" title="Aún no tiene empleados en la app" /> : (
        <div className="card">
          {list.data.map((s) => (
            <div key={s.id} className="list-row" style={{ flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 160 }}><b>{s.user?.full_name}</b><span className="small muted">{s.title} · usuario <b>{s.user?.username}</b></span></div>
              {s.active ? <span className="badge green">Activo</span> : <span className="badge gray">Retirado</span>}
              {s.active && <><button className="btn ghost sm" onClick={() => setPw({ s, value: '' })}>Cambiar clave</button><button className="btn danger sm" onClick={() => setOut(s)}>Retirar</button></>}
            </div>
          ))}
        </div>
      )}
      {f && (
        <Sheet title="Nuevo empleado" onClose={() => setF(null)}>
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { const r = await api.createStaff({ ...f, business_id: b.id }); toast(`Listo: entra con el usuario ${r.username}`, 'ok'); setF(null); list.reload(); } catch (err) { toast(err.message, 'err'); } }}>
            <Field label="Nombre"><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></Field>
            <Field label="Usuario para entrar" hint="Sin espacios. Ej.: rancho-cajero"><input className="input" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') })} autoCapitalize="none" required /></Field>
            <Field label="Clave" hint="Mínimo 6 caracteres. Désela en persona."><input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} /></Field>
            <Field label="Cargo"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <button className="btn block">Crear empleado</button>
          </form>
        </Sheet>
      )}
      {pw && (
        <Sheet title={`Clave nueva · ${pw.s.user?.full_name}`} onClose={() => setPw(null)}>
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); try { await api.resetStaffPassword(pw.s.id, pw.value); toast('Clave cambiada', 'ok'); setPw(null); } catch (err) { toast(err.message, 'err'); } }}>
            <Field label="Clave nueva"><input className="input" value={pw.value} onChange={(e) => setPw({ ...pw, value: e.target.value })} required minLength={6} /></Field>
            <button className="btn block">Cambiar</button>
          </form>
        </Sheet>
      )}
      {out && <Confirm danger yes="Retirar" text={`${out.user?.full_name} ya no podrá entrar. Sus ventas quedan en el historial.`} onClose={() => setOut(null)} onYes={async () => { try { await api.retireStaff(out.id); toast('Empleado retirado', 'ok'); list.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}

// ---------- COMISIÓN ----------
export function Commission({ b }) {
  const orders = useLoad(() => api.listBusinessOrders(b.id), [b.id]);
  const sets = useLoad(() => api.listSettlements(b.id), [b.id]);
  useOn('hm:orders', () => orders.reload());
  const ws = weekStart(bogotaDay());
  const week = (orders.data || []).filter((o) => o.status === 'entregado' && bogotaDay(o.delivered_at) >= ws);
  const com = week.reduce((t, o) => t + o.commission, 0);
  const base = week.reduce((t, o) => t + o.subtotal, 0);
  const rate = Math.round(Number(b.commission_rate) * 100);
  return (
    <div className="stack">
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>
        <div className="kpi"><span>Pedidos por la app esta semana</span><b>{week.length}</b></div>
        <div className="kpi"><span>Vendido por la app</span><b>{peso(base)}</b></div>
        <div className="kpi win"><span>Comisión ({rate} %)</span><b>{peso(com)}</b></div>
      </div>
      <div className="card stack" style={{ gap: 8 }}>
        <b>La regla</b>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Pedido hecho <b>por HatilloMall</b> y entregado: {rate} % de los productos, sea cliente nuevo o de siempre.</li>
          <li>El domicilio no paga comisión.</li>
          <li>Ventas en el local, por su WhatsApp o por llamada, anotadas en la caja: <b>0 %</b>.</li>
          <li>Pedidos rechazados o cancelados: 0 %.</li>
          <li>El plan PLUS ({peso(PLAN_PLUS_PRECIO)} al mes) es por la herramienta; la comisión, por los clientes que llegan por la app.</li>
        </ul>
        <p className="small muted">Cada domingo el equipo le envía la liquidación de la semana con el detalle de cada pedido.</p>
      </div>
      <h2>Pedidos de esta semana</h2>
      {orders.loading ? <Spinner /> : !week.length ? <p className="muted small">Aún no hay pedidos entregados esta semana.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Pedido</th><th>Día</th><th className="r">Productos</th><th className="r">Comisión</th></tr></thead>
          <tbody>{week.map((o) => <tr key={o.id}><td>#{o.number}</td><td>{fecha(o.delivered_at)}</td><td className="r">{peso(o.subtotal)}</td><td className="r">{peso(o.commission)}</td></tr>)}</tbody>
        </table></div>
      )}
      <h2>Liquidaciones</h2>
      {sets.loading ? <Spinner /> : !sets.data?.length ? <p className="muted small">Aún no hay liquidaciones.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Semana</th><th className="r">Pedidos</th><th className="r">Comisión</th><th>Estado</th></tr></thead>
          <tbody>{sets.data.map((s) => <tr key={s.id}><td>{diaCorto(s.week_start)} – {diaCorto(s.week_end)}</td><td className="r">{s.orders_count}</td><td className="r">{peso(s.commission_amount)}</td>
            <td>{s.status === 'pagado' ? <span className="badge green">Pagada · {s.paid_method}</span> : <span className="badge yellow">Pendiente</span>}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

// ---------- HISTORIAL ----------
const ENT = { sales: 'venta', expenses: 'gasto', fiado_moves: 'fiado', inventory_moves: 'inventario', cash_closings: 'cierre de caja', products: 'producto', staff: 'empleado', business_customers: 'cliente', boosts: 'impulso', settlements: 'liquidación', orders: 'pedido', businesses: 'negocio' };
const FIELD = { amount: 'valor', price: 'precio', concept: 'concepto', name: 'nombre', status: 'estado', void_reason: 'motivo', method: 'pago', fiado_ok: 'fiado', blocked: 'bloqueado', active: 'activo', delta: 'cantidad', reason: 'motivo', item: 'producto', expected_cash: 'debía haber', counted_cash: 'contó', difference: 'diferencia', signed_by: 'firma', number: 'pedido', plan: 'plan', plan_until: 'plan hasta', commission_rate: 'comisión', paid: 'pagado', paid_method: 'forma de pago', kind: 'tipo', usuario: 'usuario', nombre: 'nombre', available: 'disponible' };
const SHOW = new Set(Object.keys(FIELD));
const fmt = (k, v) => (v == null ? '—' : typeof v === 'boolean' ? (v ? 'sí' : 'no') : ['amount', 'price', 'expected_cash', 'counted_cash', 'difference'].includes(k) ? peso(v) : String(v));
export function History({ b }) {
  const l = useLoad(() => api.listAudit(b.id), [b.id]);
  return (
    <div className="stack">
      <p className="small muted">Todo lo que se crea, cambia o anula queda aquí con nombre y hora. Nadie lo puede borrar, ni siquiera el dueño.</p>
      {l.loading ? <Spinner /> : !l.data?.length ? <Empty icon="history" title="Aún no hay movimientos" /> : (
        <div className="card">
          {l.data.map((a) => {
            const det = Object.entries(a.detail || {}).filter(([k]) => SHOW.has(k)).slice(0, 5);
            return (
              <div key={a.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className={'badge ' + (a.action === 'anuló' || a.action === 'borró' ? 'red' : a.action === 'creó' ? 'green' : 'blue')}>{a.action}</span>
                <div className="grow">
                  <span><b>{a.actor_name}</b> {a.action} {ENT[a.entity] || a.entity}</span>
                  <span className="small muted">{det.map(([k, v]) => (v && typeof v === 'object' && ('antes' in v || 'ahora' in v)
                    ? ('antes' in v ? `${FIELD[k]}: ${fmt(k, v.antes)} → ${fmt(k, v.ahora)}` : `${FIELD[k]}: ${fmt(k, v.ahora)}`)
                    : `${FIELD[k]}: ${fmt(k, v)}`)).join(' · ')}</span>
                  <span className="tiny muted">{fechaHora(a.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- AJUSTES ----------
export function Settings({ b }) {
  const { refresh, toast } = useApp();
  const zones = useLoad(() => api.listZones());
  const [rows, setRows] = useState(() => Object.fromEntries((b.zones || []).map((z) => [z.zone_id, z.fee])));
  const days = diasPlan(b);
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="card soft stack" style={{ gap: 6 }}>
        <b>Plan {planVigente(b) ? 'PLUS' : 'Vitrina (gratis)'}</b>
        <span className="small">{planVigente(b) ? (days != null ? `Vigente hasta ${diaCorto(b.plan_until)} (${days} días).` : 'Vigente.') : 'Aparece con foto y WhatsApp. Para recibir pedidos y usar el sistema, pida el plan PLUS al equipo.'}</span>
        <span className="small">Comisión por pedidos de la app: {Math.round(Number(b.commission_rate) * 100)} %.</span>
        {SUPPORT_WHATSAPP && <a className="btn secondary sm" style={{ alignSelf: 'flex-start' }} href={waLink(SUPPORT_WHATSAPP, `Hola, soy de ${b.name} en HatilloMall.`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} />Hablar con el equipo</a>}
      </div>
      {b.delivery && (
        <section className="card stack">
          <h2>Domicilios por zona</h2>
          <p className="small muted">Marque a dónde lleva y cuánto cobra. El valor del domicilio no paga comisión.</p>
          {zones.loading ? <Spinner /> : (zones.data || []).map((z) => {
            const on = rows[z.id] != null;
            return (
              <div key={z.id} className="row between" style={{ flexWrap: 'nowrap' }}>
                <label className="check" style={{ flex: 1 }}><input type="checkbox" checked={on} onChange={(e) => setRows((r) => { const c = { ...r }; if (e.target.checked) c[z.id] = z.default_fee; else delete c[z.id]; return c; })} />{z.name}</label>
                {on && <input className="input" style={{ width: 120 }} inputMode="numeric" aria-label={`Domicilio a ${z.name}`} value={rows[z.id]} onChange={(e) => setRows((r) => ({ ...r, [z.id]: e.target.value.replace(/\D/g, '') }))} />}
              </div>
            );
          })}
          <button className="btn" onClick={async () => { try { await api.saveBusinessZones(b.id, Object.entries(rows).map(([zone_id, fee]) => ({ zone_id: Number(zone_id), fee: Number(fee) || 0 }))); await refresh(); toast('Zonas guardadas', 'ok'); } catch (e) { toast(e.message, 'err'); } }}>Guardar zonas</button>
        </section>
      )}
      <section className="card">
        <BusinessForm initial={{ ...b, category_id: String(b.category_id) }} onSaved={async () => { await refresh(); toast('Datos guardados', 'ok'); }} />
      </section>
    </div>
  );
}
