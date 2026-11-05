import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api/index.js';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// ---------- Rutas por hash: #/ruta/param?x=1 ----------
export function parseHash() {
  const raw = (location.hash || '#/').slice(1);
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, query: Object.fromEntries(new URLSearchParams(qs || '')), path: '/' + parts.join('/') };
}
export function useRoute() {
  const [r, setR] = useState(parseHash());
  useEffect(() => {
    const on = () => { setR(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (to) => { location.hash = to; };

// ---------- Iconos de trazo ----------
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  store: 'M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  bag: 'M6 7h12l1 13H5L6 7zM9 7a3 3 0 016 0',
  user: 'M20 21a8 8 0 10-16 0M12 13a5 5 0 100-10 5 5 0 000 10z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12l5 5L20 7',
  x: 'M18 6L6 18M6 6l12 12',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z',
  chat: 'M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  truck: 'M1 4h14v12H1zM15 9h4l3 3v4h-7M5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  table: 'M3 9h18M5 9v11M19 9v11M8 9V5h8v4M8 20v-6h8v6',
  megaphone: 'M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8M19 5a9 9 0 010 14',
  bolt: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  cash: 'M2 6h20v12H2zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9v.01M18 15v.01',
  receipt: 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  history: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l4 2',
  percent: 'M19 5L5 19M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  image: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 9a1 1 0 100-2 1 1 0 000 2z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeoff: 'M17.9 17.9A10 10 0 0112 20c-7 0-11-8-11-8a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M1 1l22 22',
  wifioff: 'M1 1l22 22M16.7 11.1A11 11 0 0119 12.6M5 12.6a11 11 0 015.2-2.5M10.7 5.1A16 16 0 0122.6 9M1.4 9a16 16 0 014.3-2.6M8.5 16.1a6 6 0 017 0M12 20h.01',
  food: 'M3 11h18M5 11a7 7 0 0014 0M12 4v3M8 5l1 2M16 5l-1 2M4 19h16',
  pill: 'M10.5 20.5a5 5 0 01-7-7l10-10a5 5 0 017 7zM8.5 8.5l7 7',
  warehouse: 'M3 21V8l9-5 9 5v13M7 21v-8h10v8M7 17h10',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
};
export function Icon({ name, size = 22, label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <path d={P[name] || P.home} />
    </svg>
  );
}
export const CAT_ICON = { restaurantes: 'food', comercio: 'store', farmacias: 'pill', depositos: 'warehouse' };

export function Logo() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#F5A524" />
      <path d="M14 26l4-10h28l4 10" fill="none" stroke="#1C1A17" strokeWidth="4" strokeLinejoin="round" />
      <path d="M14 26h36v4a6 6 0 01-12 0 6 6 0 01-12 0 6 6 0 01-12 0z" fill="#0B6B4A" />
      <path d="M17 34v14h30V34" fill="none" stroke="#1C1A17" strokeWidth="4" strokeLinejoin="round" />
      <path d="M28 48v-8h8v8" fill="none" stroke="#1C1A17" strokeWidth="4" />
    </svg>
  );
}

export function Avatar({ name = '', url, lg }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
  return <div className={'avatar' + (lg ? ' lg' : '')}>{url ? <img src={url} alt="" /> : ini}</div>;
}

export function Field({ label, hint, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

// Grupo de botones con título (no usar <label> alrededor de botones)
export function Group({ label, children }) {
  return <div className="field" role="group" aria-label={label}><span>{label}</span>{children}</div>;
}

export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="sheet-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between" style={{ flexWrap: 'nowrap' }}>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" style={{ color: 'var(--muted)' }}><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon = 'store', title, children }) {
  return <div className="empty"><Icon name={icon} size={40} /><b style={{ color: 'var(--ink)' }}>{title}</b>{children}</div>;
}
export const Spinner = () => <div className="spinner" role="status" aria-label="Cargando" />;

export function useLoad(fn, deps = []) {
  const [s, setS] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setS((x) => ({ ...x, loading: x.data == null, error: null }));
    fn().then((data) => alive && setS({ loading: false, data, error: null }))
      .catch((e) => alive && setS({ loading: false, data: null, error: e.message || String(e) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...s, reload: () => setTick((t) => t + 1), setData: (d) => setS((x) => ({ ...x, data: typeof d === 'function' ? d(x.data) : d })) };
}

// Escucha un evento interno de la app (pedidos nuevos, ofertas…) y recarga
export function useOn(event, fn) {
  useEffect(() => {
    window.addEventListener(event, fn);
    return () => window.removeEventListener(event, fn);
  });
}

export function ImageInput({ value, onChange, label = 'Foto', upload }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('El archivo debe ser una imagen', 'err');
    if (f.size > 12 * 1024 * 1024) return toast('La imagen debe pesar menos de 12 MB', 'err');
    setBusy(true);
    try { onChange(await (upload || api.uploadImage.bind(api))(f)); } catch (err) { toast(err.message, 'err'); }
    setBusy(false); e.target.value = '';
  };
  return (
    <div className="field">
      <span>{label}</span>
      <div className="img-input">
        {value ? <PrivateImg className="prev" src={value} /> : <div className="prev"><Icon name="image" /></div>}
        <div className="row">
          <label className="btn secondary sm" style={{ cursor: 'pointer' }}>
            {busy ? 'Subiendo…' : value ? 'Cambiar' : 'Tomar o subir foto'}
            <input type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" disabled={busy} />
          </label>
          {value && <button type="button" className="btn ghost sm" onClick={() => onChange('')}>Quitar</button>}
        </div>
      </div>
    </div>
  );
}

// Imagen guardada en el depósito privado (comprobantes, facturas): pide un enlace temporal
export function PrivateImg({ src, className, alt = '' }) {
  const [url, setUrl] = useState(/^(https?:|data:)/.test(src || '') ? src : '');
  useEffect(() => { let a = true; if (src && !/^(https?:|data:)/.test(src)) api.signedUrl(src).then((u) => a && setUrl(u)); else setUrl(src || ''); return () => { a = false; }; }, [src]);
  return url ? <img className={className} src={url} alt={alt} /> : <div className={className} />;
}

// Confirmación dentro de la página (sin ventanas del navegador)
export function Confirm({ title = 'Confirmar', text, onYes, onClose, yes = 'Sí, continuar', danger, ask }) {
  const [v, setV] = useState('');
  return (
    <Sheet title={title} onClose={onClose}>
      <p>{text}</p>
      {ask && <Field label={ask}><input className="input" value={v} onChange={(e) => setV(e.target.value)} autoFocus /></Field>}
      <div className="row">
        <button className={'btn ' + (danger ? 'red' : '')} disabled={ask && v.trim().length < 3} onClick={() => { onYes(v.trim()); onClose(); }}>{yes}</button>
        <button className="btn secondary" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  );
}

export function CopyText({ text, label }) {
  const { toast } = useApp();
  return (
    <div className="copy">
      <b className="mono">{text}</b>
      <button type="button" className="btn ghost sm" aria-label={`Copiar ${label || text}`} onClick={async () => {
        try { await navigator.clipboard.writeText(text); toast('Copiado', 'ok'); } catch { toast('Mantenga presionado el texto para copiarlo'); }
      }}><Icon name="copy" size={18} />Copiar</button>
    </div>
  );
}
