import React, { useEffect, useState } from 'react';
import { api } from '../api/index.js';
import { DEMO, TOWN, PLAN_PLUS_PRECIO } from '../config.js';
import { useApp, useLoad, Field, Icon, Spinner, ImageInput, go } from '../ui.jsx';
import { emailOk, peso, planVigente, diasPlan } from '../lib/format.js';
import { pushStatus, enablePush, disablePush, pushSupport } from '../lib/push.js';

function Password({ value, onChange, auto = 'current-password', id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} required minLength={6} />
      <button type="button" className="icon-btn" style={{ color: 'var(--muted)' }} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar clave' : 'Mostrar clave'}><Icon name={show ? 'eyeoff' : 'eye'} /></button>
    </div>
  );
}

const DEMO_USERS = [
  ['Equipo HatilloMall', 'equipo@hatillomall.co'],
  ['Don Juan · Rancho Costeño', 'juan@demo.co'],
  ['Cajero del Rancho', 'rancho-cajero'],
  ['Cliente', 'cliente@demo.co'],
  ['Cliente de confianza (fiado)', 'maria@demo.co'],
];

export function Login() {
  const { toast, route, session } = useApp();
  const [login, setLogin] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const back = route.query.volver || '#/';
  useEffect(() => { if (session) go(back); }, [session]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (forgot) {
        if (!login.includes('@')) { toast('Los cajeros piden la clave nueva al dueño del negocio. Escriba su correo.', 'err'); setBusy(false); return; }
        await api.resetPassword(login); toast('Le enviamos un correo para crear una clave nueva', 'ok'); setForgot(false);
      } else { await api.signIn({ login, password: pw }); toast('¡Bienvenido!', 'ok'); go(back); }
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  return (
    <div className="auth-box stack">
      <h1>{forgot ? 'Recuperar clave' : 'Entrar'}</h1>
      <form className="stack card" onSubmit={submit}>
        <Field label={forgot ? 'Correo' : 'Correo o usuario'} hint={forgot ? '' : 'Los cajeros entran con su usuario, por ejemplo: rancho-cajero'}>
          <input id="login" className="input" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </Field>
        {!forgot && <Field label="Clave"><Password value={pw} onChange={setPw} id="pw" /></Field>}
        <button className="btn block big" disabled={busy}>{busy ? 'Un momento…' : forgot ? 'Enviar correo' : 'Entrar'}</button>
        <button type="button" className="btn ghost sm" onClick={() => setForgot(!forgot)}>{forgot ? 'Volver' : 'Olvidé mi clave'}</button>
      </form>
      <p className="muted" style={{ textAlign: 'center' }}>¿No tiene cuenta? <a href={`#/registro?volver=${encodeURIComponent(back)}`}>Regístrese gratis</a></p>
      {DEMO && (
        <div className="card soft stack" style={{ gap: 8 }}>
          <b>Cuentas de prueba · clave demo1234</b>
          <div className="row" style={{ gap: 6 }}>
            {DEMO_USERS.map(([label, l]) => <button key={l} type="button" className="chip" onClick={() => { setLogin(l); setPw('demo1234'); }}>{label}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function Register() {
  const { toast, route } = useApp();
  const [f, setF] = useState({ full_name: '', phone: '', email: '', password: '' });
  const [ok, setOk] = useState(false);
  const [mkt, setMkt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f.full_name.trim().length < 3) return toast('Escriba su nombre completo', 'err');
    if (!/^\d{10}$/.test(f.phone.replace(/\D/g, ''))) return toast('El celular debe tener 10 dígitos', 'err');
    if (!emailOk(f.email)) return toast('Revise el correo', 'err');
    if (!ok) return toast('Debe autorizar el tratamiento de datos para crear la cuenta', 'err');
    setBusy(true);
    try {
      const r = await api.signUp({ ...f, phone: f.phone.replace(/\D/g, ''), accepts_marketing: mkt });
      if (r.needsConfirmation) setSent(true);
      else { toast('¡Cuenta creada!', 'ok'); go(route.query.negocio ? '#/perfil?negocio=1' : route.query.volver || '#/'); }
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  if (sent) return (
    <div className="auth-box stack">
      <h1>Revise su correo</h1>
      <div className="notice">Le enviamos un enlace a <b>{f.email}</b> para confirmar la cuenta. Después vuelva y entre con su clave.</div>
      <a className="btn" href="#/entrar">Ir a entrar</a>
    </div>
  );
  return (
    <div className="auth-box stack">
      <h1>Crear cuenta</h1>
      <p className="muted">Gratis. Para pedir a los negocios de {TOWN} y enterarse de sus ofertas.</p>
      <form className="stack card" onSubmit={submit}>
        <Field label="Nombre completo"><input className="input" value={f.full_name} onChange={set('full_name')} autoComplete="name" required /></Field>
        <Field label="Celular" hint="El negocio lo usa para confirmar su pedido."><input className="input" inputMode="numeric" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="3001234567" required /></Field>
        <Field label="Correo"><input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
        <Field label="Clave" hint="Mínimo 6 caracteres."><Password value={f.password} onChange={(v) => setF({ ...f, password: v })} auto="new-password" id="pw-new" /></Field>
        <label className="check small" style={{ alignItems: 'flex-start', fontWeight: 500 }}>
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ marginTop: 2 }} />
          <span>Autorizo a HatilloMall a tratar mis datos (nombre, celular, correo y pedidos) para gestionar mis pedidos con los negocios, según la Ley 1581 de 2012. Puedo pedir que los corrijan o borren cuando quiera.</span>
        </label>
        <label className="check small" style={{ alignItems: 'flex-start', fontWeight: 500 }}>
          <input type="checkbox" checked={mkt} onChange={(e) => setMkt(e.target.checked)} style={{ marginTop: 2 }} />
          <span>Opcional: acepto recibir ofertas de los negocios por WhatsApp, en los horarios que permite la Ley 2300 de 2023.</span>
        </label>
        <button className="btn block big" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="muted" style={{ textAlign: 'center' }}>¿Ya tiene cuenta? <a href="#/entrar">Entrar</a></p>
    </div>
  );
}

// Formulario del negocio: registro y ajustes
export function BusinessForm({ initial, onSaved, submitLabel = 'Guardar', registering }) {
  const { toast } = useApp();
  const cats = useLoad(() => api.listCategories());
  const [f, setF] = useState(() => ({
    name: '', category_id: '', description: '', whatsapp: '', address: '', hours: '', logo_url: '', delivery: false, pickup: true, dine_in: false,
    prep_minutes: 25, table_hold_minutes: 15, breb_key: '', breb_holder: '', breb_qr_url: '', allow_fiado: false, legal_name: '', id_number: '', notify_address: '', ...initial,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.category_id) return toast('Elija el sector', 'err');
    if (f.whatsapp && !/^\d{10}$/.test(f.whatsapp.replace(/\D/g, ''))) return toast('El WhatsApp debe tener 10 dígitos', 'err');
    if (!f.delivery && !f.pickup && !f.dine_in) return toast('Elija al menos una forma de entregar', 'err');
    setBusy(true);
    try { onSaved?.(await api.saveMyBusiness({ ...f, whatsapp: f.whatsapp.replace(/\D/g, '') })); } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  return (
    <form className="stack" onSubmit={submit}>
      <h3>El negocio</h3>
      <Field label="Nombre del negocio"><input className="input" value={f.name} onChange={set('name')} required /></Field>
      <Field label="Sector">
        <select className="input" value={f.category_id} onChange={set('category_id')} required>
          <option value="">Elija uno…</option>
          {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Descripción" hint="Qué vende y qué lo hace especial."><textarea className="input" value={f.description} onChange={set('description')} maxLength={300} /></Field>
      <ImageInput label="Logo o foto del negocio" value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />
      <div className="two">
        <Field label="WhatsApp del negocio"><input className="input" inputMode="numeric" value={f.whatsapp} onChange={set('whatsapp')} placeholder="3001234567" required /></Field>
        <Field label="Horario"><input className="input" value={f.hours} onChange={set('hours')} placeholder="Lun a sáb · 11 a. m. – 9 p. m." /></Field>
      </div>
      <Field label="Dirección"><input className="input" value={f.address} onChange={set('address')} placeholder="Barrio, calle, referencia" /></Field>

      <h3>Cómo entrega</h3>
      <label className="check"><input type="checkbox" checked={!!f.delivery} onChange={set('delivery')} />Domicilio <span className="muted small">(las tarifas por zona se ponen en Ajustes)</span></label>
      <label className="check"><input type="checkbox" checked={!!f.dine_in} onChange={set('dine_in')} />Comer allá (apartar mesa)</label>
      <label className="check"><input type="checkbox" checked={!!f.pickup} onChange={set('pickup')} />Pasar a recoger</label>
      <div className="two">
        <Field label="Minutos para tener listo un pedido"><input className="input" type="number" min="5" max="240" value={f.prep_minutes} onChange={set('prep_minutes')} /></Field>
        {f.dine_in && <Field label="Minutos que guarda la mesa"><input className="input" type="number" min="5" max="120" value={f.table_hold_minutes} onChange={set('table_hold_minutes')} /></Field>}
      </div>

      <h3>Cómo le pagan</h3>
      <p className="small muted">El efectivo siempre está activo. Para transferencias, registre su llave Bre-B en la app de su banco o billetera (Nequi, Daviplata, Bancolombia…): sirve para recibir de cualquier banco.</p>
      <div className="two">
        <Field label="Llave Bre-B (o número Nequi)"><input className="input" value={f.breb_key} onChange={set('breb_key')} placeholder="@minegocio o 3001234567" /></Field>
        <Field label="A nombre de"><input className="input" value={f.breb_holder} onChange={set('breb_holder')} /></Field>
      </div>
      <ImageInput label="Código QR de cobro (opcional)" value={f.breb_qr_url} onChange={(v) => setF({ ...f, breb_qr_url: v })} />
      <label className="check"><input type="checkbox" checked={!!f.allow_fiado} onChange={set('allow_fiado')} />Fiar a clientes de confianza (usted decide a quién en «Clientes»)</label>

      <h3>Datos del vendedor</h3>
      <p className="small muted">La Ley 1480 de 2011 (art. 53) pide que el comprador pueda ver estos datos para hacer un reclamo.</p>
      <Field label="Nombre o razón social"><input className="input" value={f.legal_name} onChange={set('legal_name')} required={registering} /></Field>
      <div className="two">
        <Field label="Cédula o NIT"><input className="input" value={f.id_number} onChange={set('id_number')} required={registering} /></Field>
        <Field label="Dirección para notificaciones"><input className="input" value={f.notify_address} onChange={set('notify_address')} required={registering} /></Field>
      </div>
      <button className="btn block big" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
    </form>
  );
}

export function Profile() {
  const { profile, work, refresh, toast, route, session } = useApp();
  const [f, setF] = useState({ full_name: '', phone: '', accepts_marketing: false });
  const [ps, setPs] = useState('off');
  const [pw, setPw] = useState('');
  const [showBiz, setShowBiz] = useState(!!route.query.negocio);
  useEffect(() => { if (profile) setF({ full_name: profile.full_name, phone: profile.phone, accepts_marketing: !!profile.accepts_marketing }); }, [profile]);
  useEffect(() => { pushStatus().then(setPs).catch(() => setPs('unsupported')); }, []);
  useEffect(() => { if (session === null) go('#/entrar?volver=%23%2Fperfil'); }, [session]);
  if (!profile) return <Spinner />;
  const support = pushSupport();
  const roleLabel = { cliente: 'Cliente', negocio: 'Dueño de negocio', superadmin: 'Equipo HatilloMall' }[profile.role];
  const b = work?.business;

  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <div className="row between"><h1>Mi perfil</h1><span className="badge">{work?.role === 'cajero' ? `${work.staff?.title || 'Cajero'} · ${b?.name}` : roleLabel}</span></div>
      {profile.username && <p className="muted small">Usuario: <b>{profile.username}</b></p>}
      <div className="row">
        {work && <a className="btn" href="#/panel"><Icon name="grid" size={18} />{work.role === 'cajero' ? 'Abrir la caja' : 'Sistema de mi negocio'}</a>}
        {profile.role === 'superadmin' && <a className="btn secondary" href="#/admin"><Icon name="shield" size={18} />Equipo</a>}
        <a className="btn secondary" href="#/pedidos"><Icon name="bag" size={18} />Mis pedidos</a>
      </div>

      <form className="card stack" onSubmit={async (e) => { e.preventDefault(); try { await api.updateMyProfile(f); await refresh(); toast('Datos guardados', 'ok'); } catch (err) { toast(err.message, 'err'); } }}>
        <h2>Mis datos</h2>
        {!profile.username && <p className="small muted">{profile.email}</p>}
        <Field label="Nombre completo"><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></Field>
        <Field label="Celular"><input className="input" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <label className="check small"><input type="checkbox" checked={f.accepts_marketing} onChange={(e) => setF({ ...f, accepts_marketing: e.target.checked })} />Recibir ofertas por WhatsApp</label>
        <button className="btn">Guardar</button>
      </form>

      <section className="card stack">
        <h2>Notificaciones</h2>
        <p className="small muted">Un aviso en este celular cuando cambie su pedido, cuando un negocio publique una oferta{work ? ' y cuando llegue un pedido nuevo a su negocio' : ''}.</p>
        {support.ok
          ? <button className={'btn ' + (ps === 'on' ? 'secondary' : '')} disabled={ps === 'denied'} onClick={async () => {
            try { if (ps === 'on') { await disablePush(); setPs('off'); } else { await enablePush(); setPs('on'); toast('Notificaciones activadas', 'ok'); } } catch (err) { toast(err.message, 'err'); }
          }}>{ps === 'on' ? 'Desactivar en este celular' : ps === 'denied' ? 'Bloqueadas en el navegador' : 'Activar notificaciones'}</button>
          : <div className="notice small">{support.reason}</div>}
      </section>

      {work?.role !== 'cajero' && (
        <section className="card stack">
          <h2>Mi negocio</h2>
          {b ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="row between"><b>{b.name}</b><span className={'badge ' + (b.status === 'aprobado' ? 'green' : b.status === 'pendiente' ? 'yellow' : 'red')}>{b.status}</span></div>
              <span className="small">Plan: <b>{planVigente(b) ? 'PLUS' : 'Vitrina (gratis)'}</b>{planVigente(b) && diasPlan(b) != null ? ` · vence en ${diasPlan(b)} días` : ''}</span>
              {b.status === 'pendiente' && <p className="small muted">El equipo de HatilloMall revisa su negocio. Mientras tanto puede cargar sus productos.</p>}
              <a className="btn" href="#/panel">Abrir el sistema</a>
            </div>
          ) : showBiz ? (
            <BusinessForm registering submitLabel="Enviar para revisión" onSaved={async () => { await refresh(); toast('Negocio enviado. El equipo lo revisará pronto.', 'ok'); go('#/panel'); }} />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              <p className="small">Aparezca gratis en HatilloMall con foto y WhatsApp. Con el plan <b>PLUS ({peso(PLAN_PLUS_PRECIO)} al mes)</b> recibe pedidos por la app, publica ofertas sin límite y lleva caja, gastos, ganancia, inventario y fiados.</p>
              <button className="btn mango" style={{ alignSelf: 'flex-start' }} onClick={() => setShowBiz(true)}>Registrar mi negocio</button>
            </div>
          )}
        </section>
      )}

      <form className="card stack" onSubmit={async (e) => { e.preventDefault(); try { await api.updatePassword(pw); setPw(''); toast('Clave cambiada', 'ok'); } catch (err) { toast(err.message, 'err'); } }}>
        <h2>Cambiar clave</h2>
        <Field label="Clave nueva"><Password value={pw} onChange={setPw} auto="new-password" id="pw-change" /></Field>
        <button className="btn secondary">Cambiar</button>
      </form>
      <button className="btn danger" onClick={async () => { await disablePush().catch(() => {}); await api.signOut(); go('#/'); }}><Icon name="logout" size={18} />Cerrar sesión</button>
      <p className="tiny muted">Para corregir o borrar sus datos, escriba al equipo de HatilloMall.</p>
    </div>
  );
}
