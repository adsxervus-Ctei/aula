import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/index.js';
import { useApp, useLoad, useOn, Icon, Empty, Spinner, Confirm, Group, PrivateImg, CopyText } from '../ui.jsx';
import { peso, hora, fechaHora, MODE, PAY, STATUS, STATUS_TONE, STEPS, nextActions, isOpen, waLink, telLink } from '../lib/format.js';

const SIN_RESPUESTA_MIN = 5;

export function OrderPage({ id }) {
  const { profile, work, toast } = useApp();
  const o = useLoad(() => api.getOrder(id), [id]);
  const msgs = useLoad(() => api.listMessages(id), [id]);
  const [text, setText] = useState('');
  const [eta, setEta] = useState('');
  const [reject, setReject] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const chatRef = useRef(null);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  useOn('hm:orders', (e) => { if (e.detail?.new?.id === id) o.reload(); });
  useOn('hm:my-orders', (e) => { if (e.detail?.new?.id === id) o.reload(); });
  useEffect(() => api.onMessages(id, (m) => msgs.setData((l) => ((l || []).some((x) => x.id === m.id) ? l : [...(l || []), m]))), [id]); // eslint-disable-line
  useEffect(() => { chatRef.current?.scrollTo(0, 99999); }, [msgs.data]);

  if (o.loading) return <Spinner />;
  const order = o.data;
  if (!order) return <Empty icon="bag" title="No encontramos este pedido">Puede que no tenga acceso a él.<a className="btn secondary" href="#/pedidos">Mis pedidos</a></Empty>;

  const isMember = work?.business?.id === order.business_id || profile?.role === 'superadmin';
  const isCustomer = order.customer_id === profile?.id;
  const b = order.business;
  const steps = STEPS[order.mode];
  const at = steps.indexOf(order.status);
  const open = isOpen(order);
  const list = msgs.data || [];
  const last = list[list.length - 1];
  const minsSince = (t) => (Date.now() - new Date(t).getTime()) / 60000;
  const unanswered = isCustomer && open && ((order.status === 'nuevo' && minsSince(order.created_at) >= SIN_RESPUESTA_MIN)
    || (last && last.author_id === profile?.id && minsSince(last.created_at) >= SIN_RESPUESTA_MIN));

  const setStatus = async (st) => {
    setBusy(true);
    try { await api.updateOrderStatus(order.id, st, st === 'aceptado' ? eta || b.prep_minutes : null); toast(`Pedido #${order.number}: ${STATUS[st]}`, 'ok'); o.reload(); }
    catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  const send = async (e) => {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText('');
    try { const m = await api.sendMessage(order.id, body); msgs.setData((l) => ((l || []).some((x) => x.id === m.id) ? l : [...(l || []), m])); }
    catch (err) { toast(err.message, 'err'); setText(body); }
  };
  const uploadProof = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { await api.attachProof(order.id, order.business_id, f); toast('Comprobante enviado al negocio', 'ok'); o.reload(); } catch (err) { toast(err.message, 'err'); }
  };

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <a href={isMember ? '#/panel/pedidos' : '#/pedidos'} className="btn ghost sm" style={{ alignSelf: 'flex-start' }}><Icon name="back" size={18} />{isMember ? 'Pedidos del negocio' : 'Mis pedidos'}</a>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">{MODE[order.mode].label}</span>
          <h1>Pedido #{order.number}</h1>
          <span className="muted small">{b.name} · {fechaHora(order.created_at)}</span>
        </div>
        <span className={'badge ' + STATUS_TONE[order.status]} style={{ fontSize: 14, padding: '6px 12px' }}>{STATUS[order.status]}</span>
      </div>

      {at >= 0 && (
        <div className="timeline" aria-label={`Estado: ${STATUS[order.status]}`}>
          {steps.map((s, i) => <div key={s} className={i <= at ? 'on' : ''}><i />{STATUS[s]}</div>)}
        </div>
      )}
      {order.status === 'aceptado' && order.eta_minutes && isCustomer && <div className="notice">{b.name} aceptó su pedido. Tiempo estimado: {order.eta_minutes} minutos.</div>}

      {unanswered && (
        <div className="card stack" style={{ borderColor: 'var(--mango)', borderWidth: 2, gap: 8 }}>
          <b>¿Sin respuesta? Llame al negocio</b>
          <span className="small muted">Pasaron más de {SIN_RESPUESTA_MIN} minutos sin respuesta.</span>
          <div className="row">
            {telLink(b.whatsapp) && <a className="btn mango" href={telLink(b.whatsapp)}><Icon name="phone" size={18} />LLAMAR AL NEGOCIO</a>}
            <a className="btn secondary" href={waLink(b.whatsapp, `Hola ${b.name}, hice el pedido #${order.number} en HatilloMall. ¿Lo recibieron?`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={18} />WhatsApp</a>
          </div>
          <span className="small">Número: <b className="num">{b.whatsapp}</b></span>
        </div>
      )}

      {isMember && open && (
        <section className="card stack" style={{ gap: 10, borderColor: order.status === 'nuevo' ? 'var(--mango)' : 'var(--line)', borderWidth: order.status === 'nuevo' ? 2 : 1 }}>
          {order.status === 'nuevo' && (
            <Group label="¿En cuánto está listo?">
              <div className="chips">{[15, 25, 40, 60].map((m) => <button key={m} type="button" className={'chip' + (Number(eta || b.prep_minutes) === m ? ' on' : '')} onClick={() => setEta(m)}>{m} min</button>)}</div>
            </Group>
          )}
          <div className="row">
            {nextActions(order).map(([st, label]) => st === 'rechazado'
              ? <button key={st} className="btn danger big" disabled={busy} onClick={() => setReject(true)}>{label}</button>
              : <button key={st} className={'btn big ' + (st === 'aceptado' ? '' : 'mango')} disabled={busy} onClick={() => setStatus(st)}>{label}</button>)}
          </div>
          {order.status !== 'nuevo' && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setCancel(true)}>Cancelar pedido</button>}
        </section>
      )}

      <section className="card stack" style={{ gap: 6 }}>
        {order.items.map((i, k) => (
          <div key={k} className="row between" style={{ flexWrap: 'nowrap' }}><span>{i.qty} × {i.name}{i.note ? <span className="muted small"> · {i.note}</span> : null}</span><b className="num">{peso(i.qty * i.price)}</b></div>
        ))}
        {order.delivery_fee > 0 && <div className="row between small"><span>Domicilio · {order.zone?.name}</span><b className="num">{peso(order.delivery_fee)}</b></div>}
        <div className="divider" />
        <div className="row between"><b>Total</b><b className="price" style={{ fontSize: 20 }}>{peso(order.total)}</b></div>
        <div className="small muted">Pago: {PAY[order.payment]}</div>
        {order.mode === 'domicilio' && <div className="small"><Icon name="pin" size={16} /> {order.zone?.name} · {order.address}</div>}
        {order.mode === 'mesa' && <div className="small"><Icon name="table" size={16} /> Mesa para {order.people} · {fechaHora(order.reserve_at)} (se guarda {b.table_hold_minutes} min)</div>}
        {order.mode === 'recoger' && <div className="small"><Icon name="bag" size={16} /> Recoger en {b.address || 'el local'}</div>}
        {order.note && <div className="notice small">Nota: {order.note}</div>}
        {isMember && order.customer && (
          <div className="row small" style={{ marginTop: 4 }}>
            <b>{order.customer.full_name}</b>
            {order.customer.phone && <a href={waLink(order.customer.phone, `Hola ${order.customer.full_name}, le escribimos de ${b.name} por su pedido #${order.number}.`)} target="_blank" rel="noopener noreferrer">{order.customer.phone}</a>}
          </div>
        )}
        {isMember && <div className="tiny muted">Comisión HatilloMall de este pedido: {peso(order.commission)} ({Math.round(order.commission_rate * 100)} % de los productos, sin el domicilio). Se cobra solo si se entrega.</div>}
      </section>

      {order.payment === 'transferencia' && (
        <section className="card stack" style={{ gap: 8 }}>
          <b>Pago por transferencia</b>
          {isCustomer && b.breb_key && <><span className="small">Llave Bre-B de {b.breb_holder || b.name}:</span><CopyText text={b.breb_key} label="llave" />{b.breb_qr_url && <img className="qr" src={b.breb_qr_url} alt="Código QR para pagar" />}</>}
          {order.proof_url ? <><span className="small">Comprobante:</span><PrivateImg src={order.proof_url} className="qr" alt="Comprobante de pago" /></> : <span className="small muted">Aún no hay comprobante.</span>}
          {isCustomer && open && <label className="btn secondary sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>{order.proof_url ? 'Cambiar pantallazo' : 'Adjuntar pantallazo'}<input type="file" accept="image/*" className="sr-only" onChange={uploadProof} /></label>}
        </section>
      )}

      <section className="card stack" style={{ gap: 10 }}>
        <b>Chat del pedido</b>
        <div className="chat" ref={chatRef} aria-live="polite">
          {list.length === 0 && <span className="small muted">Escriba aquí cualquier detalle del pedido.</span>}
          {list.map((m) => (
            <div key={m.id} className={'msg ' + (m.author_id === profile?.id ? 'mine' : 'theirs')}>
              {m.body}<small>{m.author_id === order.customer_id ? (isCustomer ? 'Usted' : order.customer?.full_name || 'Cliente') : b.name} · {hora(m.created_at)}</small>
            </div>
          ))}
        </div>
        {open && (isCustomer || isMember) ? (
          <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={send}>
            <label className="sr-only" htmlFor="chat-in">Mensaje</label>
            <input id="chat-in" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={isCustomer ? '¿Me le echa más yuca?' : 'Listo, ya va con extra yuca'} maxLength={500} />
            <button className="btn" aria-label="Enviar">Enviar</button>
          </form>
        ) : <span className="small muted">El chat se cierra cuando el pedido termina.</span>}
      </section>

      {isCustomer && order.status === 'nuevo' && <button className="btn danger" onClick={() => setCancel(true)}>Cancelar pedido</button>}
      {!open && isCustomer && <a className="btn secondary" href={`#/negocio/${b.id}`}>Volver a pedir en {b.name}</a>}

      {reject && <Confirm title="Rechazar pedido" danger yes="Rechazar" ask="Motivo (el cliente lo verá)" text="Cuéntele al cliente por qué no puede atenderlo."
        onClose={() => setReject(false)} onYes={async (why) => { try { await api.sendMessage(order.id, `Pedido rechazado: ${why}`); } catch { /* */ } setStatus('rechazado'); }} />}
      {cancel && <Confirm title="Cancelar pedido" danger yes="Sí, cancelar" text={`¿Cancelar el pedido #${order.number}?`} onClose={() => setCancel(false)}
        onYes={async () => { try { if (isMember) await api.updateOrderStatus(order.id, 'cancelado'); else await api.cancelMyOrder(order.id); toast('Pedido cancelado', 'ok'); o.reload(); } catch (e) { toast(e.message, 'err'); } }} />}
    </div>
  );
}
