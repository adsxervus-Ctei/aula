import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api/index.js';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// ---------- Router por hash: #/ruta/param?x=1 ----------
export function parseHash() {
  const raw = (location.hash || '#/').slice(1);
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, query, path: '/' + parts.join('/') };
}
export function useRoute() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
export const go = (to) => { location.hash = to; };

// ---------- Iconos (trazo, heredan color) ----------
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  store: 'M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  bag: 'M6 7h12l1 13H5L6 7zM9 7a3 3 0 016 0',
  user: 'M20 21a8 8 0 10-16 0M12 13a5 5 0 100-10 5 5 0 000 10z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 7',
  x: 'M18 6L6 18M6 6l12 12',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z',
  chat: 'M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  truck: 'M1 4h14v12H1zM15 9h4l3 3v4h-7M5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  megaphone: 'M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8M19 5a9 9 0 010 14',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  image: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 9a1 1 0 100-2 1 1 0 000 2z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeoff: 'M17.9 17.9A10 10 0 0112 20c-7 0-11-8-11-8a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M1 1l22 22',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
};
export function Icon({ name, size = 22, label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <path d={P[name] || P.home} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg className="brand-mark" viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#155E70" />
      <path d="M256 92c-70 0-126 55-126 124 0 92 126 204 126 204s126-112 126-204c0-69-56-124-126-124z" fill="#C2510F" />
      <circle cx="256" cy="214" r="54" fill="#fff" />
    </svg>
  );
}

export function Avatar({ name = '', url, lg }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
  return <div className={'avatar' + (lg ? ' lg' : '')}>{url ? <img src={url} alt="" /> : ini}</div>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
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
        <div className="row between">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" style={{ color: 'var(--muted)' }}><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon = 'store', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={40} />
      <b style={{ color: 'var(--ink)' }}>{title}</b>
      {children}
    </div>
  );
}

export const Spinner = () => <div className="spinner" role="status" aria-label="Cargando" />;

// Carga datos asíncronos con estado de error
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((e) => alive && setState({ loading: false, data: null, error: e.message || String(e) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1), setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

export function ImageInput({ value, onChange, label = 'Imagen' }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('El archivo debe ser una imagen', 'err');
    if (f.size > 5 * 1024 * 1024) return toast('La imagen debe pesar menos de 5 MB', 'err');
    setBusy(true);
    try { onChange(await api.uploadImage(f)); } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
    e.target.value = '';
  };
  return (
    <div className="field">
      <span>{label}</span>
      <div className="img-input">
        {value ? <img className="prev" src={value} alt="Vista previa" /> : <div className="prev"><Icon name="image" /></div>}
        <div className="row">
          <label className="btn secondary sm" style={{ cursor: 'pointer' }}>
            {busy ? 'Subiendo…' : value ? 'Cambiar' : 'Subir foto'}
            <input type="file" accept="image/*" onChange={pick} className="sr-only" disabled={busy} />
          </label>
          {value && <button type="button" className="btn ghost sm" onClick={() => onChange('')}>Quitar</button>}
        </div>
      </div>
    </div>
  );
}

export function Confirm({ text, onYes, onClose, yes = 'Sí, continuar', danger }) {
  return (
    <Sheet title="Confirmar" onClose={onClose}>
      <p>{text}</p>
      <div className="row">
        <button className={'btn ' + (danger ? 'danger' : '')} onClick={() => { onYes(); onClose(); }}>{yes}</button>
        <button className="btn secondary" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  );
}
