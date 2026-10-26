import React, { useEffect, useState } from 'react';
import { api } from '../api/index.js';
import { DEMO, TOWN } from '../config.js';
import { useApp, useLoad, Field, Icon, Spinner, ImageInput, go } from '../ui.jsx';
import { emailOk } from '../lib/format.js';
import { pushStatus, enablePush, disablePush, pushSupport } from '../lib/push.js';

function PasswordInput({ value, onChange, autoComplete = 'current-password', id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={6} />
      <button type="button" className="icon-btn" style={{ color: 'var(--muted)', flex: 'none' }} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <Icon name={show ? 'eyeoff' : 'eye'} />
      </button>
    </div>
  );
}

const DEMO_USERS = [
  ['Equipo (superadmin)', 'equipo@lobaconecta.co'],
  ['Dueña de restaurante', 'sabor@demo.co'],
  ['Cliente', 'cliente@demo.co'],
  ['Negocio pendiente', 'nuevo@demo.co'],
];

export function Login() {
  const { toast, route, session } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const back = route.query.volver || '#/';
  useEffect(() => { if (session) go(back); }, [session]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (forgot) {
        await api.resetPassword(email);
        toast('Te enviamos un correo para crear una nueva contraseña', 'ok');
        setForgot(false);
      } else {
        await api.signIn({ email, password });
        toast('¡Bienvenido!', 'ok');
        go(back);
      }
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  return (
    <div className="auth-box stack">
      <h1>{forgot ? 'Recuperar contraseña' : 'Entrar'}</h1>
      <form className="stack card" onSubmit={submit}>
        <Field label="Correo"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
        {!forgot && <Field label="Contraseña"><PasswordInput value={password} onChange={setPassword} id="pw" /></Field>}
        <button className="btn block" disabled={busy}>{busy ? 'Un momento…' : forgot ? 'Enviar correo' : 'Entrar'}</button>
        <button type="button" className="btn ghost sm" onClick={() => setForgot(!forgot)}>{forgot ? 'Volver a entrar' : 'Olvidé mi contraseña'}</button>
      </form>
      <p className="muted" style={{ textAlign: 'center' }}>¿No tienes cuenta? <a href={`#/registro?volver=${encodeURIComponent(back)}`}>Regístrate gratis</a></p>
      {DEMO && (
        <div className="card soft stack" style={{ gap: 8 }}>
          <b>Cuentas de prueba (contraseña: demo1234)</b>
          <div className="row">
            {DEMO_USERS.map(([label, mail]) => (
              <button key={mail} type="button" className="chip" onClick={() => { setEmail(mail); setPassword('demo1234'); }}>{label}</button>
            ))}
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
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.full_name.trim().length < 3) return toast('Escribe tu nombre completo', 'err');
    if (!/^\d{10}$/.test(f.phone.replace(/\D/g, ''))) return toast('El celular debe tener 10 dígitos', 'err');
    if (!emailOk(f.email)) return toast('Revisa el correo', 'err');
    if (!ok) return toast('Debes aceptar el tratamiento de datos', 'err');
    setBusy(true);
    try {
      const r = await api.signUp({ ...f, phone: f.phone.replace(/\D/g, '') });
      if (r.needsConfirmation) setSent(true);
      else {
        toast('¡Cuenta creada!', 'ok');
        go(route.query.negocio ? '#/perfil?negocio=1' : route.query.volver || '#/');
      }
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  if (sent) return (
    <div className="auth-box stack">
      <h1>Revisa tu correo</h1>
      <div className="notice ok">Te enviamos un enlace a <b>{f.email}</b> para confirmar tu cuenta. Después vuelve y entra con tu contraseña.</div>
      <a className="btn" href="#/entrar">Ir a entrar</a>
    </div>
  );

  return (
    <div className="auth-box stack">
      <h1>Crear cuenta</h1>
      <p className="muted">Gratis. Para pedir a los negocios de {TOWN} y recibir sus novedades.</p>
      <form className="stack card" onSubmit={submit}>
        <Field label="Nombre completo"><input className="input" value={f.full_name} onChange={set('full_name')} autoComplete="name" required /></Field>
        <Field label="Celular" hint="Los negocios lo usan para confirmar tus pedidos."><input className="input" inputMode="numeric" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="3001234567" required /></Field>
        <Field label="Correo"><input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
        <Field label="Contraseña" hint="Mínimo 6 caracteres."><PasswordInput value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" id="pw-new" /></Field>
        <label className="check small" style={{ alignItems: 'flex-start', fontWeight: 500 }}>
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ marginTop: 2 }} />
          <span>Autorizo el tratamiento de mis datos personales (nombre, celular y correo) para gestionar mis pedidos y enviarme novedades, según la Ley 1581 de 2012. Puedo pedir su corrección o eliminación cuando quiera.</span>
        </label>
        <button className="btn block" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="muted" style={{ textAlign: 'center' }}>¿Ya tienes cuenta? <a href="#/entrar">Entrar</a></p>
    </div>
  );
}

// ---------- Formulario de negocio (registro y edición) ----------
export function BusinessForm({ initial, onSaved, submitLabel = 'Guardar' }) {
  const { toast } = useApp();
  const cats = useLoad(() => api.listCategories());
  const [f, setF] = useState(() => ({
    name: '', category_id: '', description: '', whatsapp: '', address: '', hours: '', logo_url: '', delivery: false, delivery_fee: 0, ...initial,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.category_id) return toast('Elige la categoría', 'err');
    if (f.whatsapp && !/^\d{10}$/.test(f.whatsapp.replace(/\D/g, ''))) return toast('El WhatsApp debe tener 10 dígitos', 'err');
    setBusy(true);
    try {
      const saved = await api.saveMyBusiness({ ...f, whatsapp: f.whatsapp.replace(/\D/g, '') });
      onSaved?.(saved);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  return (
    <form className="stack" onSubmit={submit}>
      <Field label="Nombre del negocio"><input className="input" value={f.name} onChange={set('name')} required /></Field>
      <Field label="Categoría">
        <select className="input" value={f.category_id} onChange={set('category_id')} required>
          <option value="">Elige una…</option>
          {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Descripción" hint="Qué vendes y qué te hace especial."><textarea className="input" value={f.description} onChange={set('description')} maxLength={300} /></Field>
      <ImageInput label="Logo o foto del negocio" value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />
      <Field label="WhatsApp del negocio"><input className="input" inputMode="numeric" value={f.whatsapp} onChange={set('whatsapp')} placeholder="3001234567" /></Field>
      <Field label="Dirección"><input className="input" value={f.address} onChange={set('address')} placeholder="Barrio, calle, referencia" /></Field>
      <Field label="Horario"><input className="input" value={f.hours} onChange={set('hours')} placeholder="Lun a sáb · 7:00 a. m. – 8:00 p. m." /></Field>
      <label className="check"><input type="checkbox" checked={!!f.delivery} onChange={set('delivery')} />Hago domicilios</label>
      {f.delivery && <Field label="Costo del domicilio" hint="0 si es gratis"><input className="input" type="number" min="0" step="500" value={f.delivery_fee} onChange={set('delivery_fee')} /></Field>}
      <button className="btn block" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
    </form>
  );
}

// ---------- Perfil ----------
export function Profile() {
  const { profile, myBusiness, setMyBusiness, refreshProfile, toast, route, session } = useApp();
  const [f, setF] = useState({ full_name: '', phone: '' });
  const [ps, setPs] = useState('off');
  const [pw, setPw] = useState('');
  const [showBiz, setShowBiz] = useState(!!route.query.negocio);
  useEffect(() => { if (profile) setF({ full_name: profile.full_name, phone: profile.phone }); }, [profile]);
  useEffect(() => { pushStatus().then(setPs).catch(() => setPs('unsupported')); }, []);
  useEffect(() => { if (session === null) go('#/entrar?volver=%23%2Fperfil'); }, [session]);
  if (!profile) return <Spinner />;

  const save = async (e) => {
    e.preventDefault();
    try { await api.updateMyProfile(f); await refreshProfile(); toast('Datos guardados', 'ok'); } catch (err) { toast(err.message, 'err'); }
  };
  const togglePush = async () => {
    try {
      if (ps === 'on') { await disablePush(); setPs('off'); toast('Notificaciones desactivadas'); }
      else { await enablePush(); setPs('on'); toast('Notificaciones activadas', 'ok'); }
    } catch (err) { toast(err.message, 'err'); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try { await api.updatePassword(pw); setPw(''); toast('Contraseña actualizada', 'ok'); } catch (err) { toast(err.message, 'err'); }
  };
  const logout = async () => { await disablePush().catch(() => {}); await api.signOut(); go('#/'); };
  const roleLabel = { cliente: 'Cliente', negocio: 'Dueño de negocio', superadmin: 'Equipo · Superadministrador' }[profile.role];
  const support = pushSupport();

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="row between">
        <h1>Mi perfil</h1>
        <span className="badge">{roleLabel}</span>
      </div>
      <div className="row">
        {myBusiness && <a className="btn secondary" href="#/panel"><Icon name="grid" size={18} />Panel de mi negocio</a>}
        {profile.role === 'superadmin' && <a className="btn secondary" href="#/admin"><Icon name="shield" size={18} />Administración</a>}
      </div>

      <form className="card stack" onSubmit={save}>
        <h2>Mis datos</h2>
        <p className="small muted">{profile.email}</p>
        <Field label="Nombre completo"><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></Field>
        <Field label="Celular"><input className="input" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <button className="btn">Guardar</button>
      </form>

      <section className="card stack">
        <h2>Notificaciones</h2>
        <p className="small muted">Recibe un aviso en este celular cuando un negocio publique un menú, una promoción o un servicio nuevo, y cuando cambie el estado de tus pedidos.</p>
        {support.ok
          ? <button className={'btn ' + (ps === 'on' ? 'secondary' : '')} onClick={togglePush} disabled={ps === 'denied'}>{ps === 'on' ? 'Desactivar en este celular' : ps === 'denied' ? 'Bloqueadas en el navegador' : 'Activar notificaciones'}</button>
          : <div className="notice small">{support.reason}</div>}
      </section>

      <section className="card stack">
        <h2>Mi negocio</h2>
        {myBusiness ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between"><b>{myBusiness.name}</b>
              <span className={'badge ' + (myBusiness.status === 'aprobado' ? 'green' : myBusiness.status === 'pendiente' ? 'yellow' : 'red')}>{myBusiness.status}</span>
            </div>
            {myBusiness.status === 'pendiente' && <p className="small muted">El equipo de Loba Conecta está revisando tu negocio. Mientras tanto puedes cargar tus productos desde el panel.</p>}
            {myBusiness.status === 'suspendido' && <p className="small muted">Tu negocio está suspendido. Escribe al equipo para revisarlo.</p>}
            <a className="btn" href="#/panel">Abrir panel</a>
          </div>
        ) : showBiz ? (
          <BusinessForm submitLabel="Enviar para aprobación" onSaved={async (b) => { setMyBusiness(b); await refreshProfile(); toast('Negocio enviado. El equipo lo revisará pronto.', 'ok'); go('#/panel'); }} />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <p className="small muted">¿Tienes un negocio en {TOWN}? Regístralo para publicar tu menú o productos y recibir pedidos.</p>
            <button className="btn orange" onClick={() => setShowBiz(true)}>Registrar mi negocio</button>
          </div>
        )}
      </section>

      <form className="card stack" onSubmit={changePw}>
        <h2>Cambiar contraseña</h2>
        <Field label="Nueva contraseña"><PasswordInput value={pw} onChange={setPw} autoComplete="new-password" id="pw-change" /></Field>
        <button className="btn secondary">Cambiar</button>
      </form>

      <button className="btn danger" onClick={logout}><Icon name="logout" size={18} />Cerrar sesión</button>
    </div>
  );
}
