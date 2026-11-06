// LobaMall · claves, sesiones y límite de intentos (sin dependencias: node:crypto)
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { q, uno } from './db.mjs';

const DIAS_SESION = 30;
export const COOKIE = 'lm_sesion';

export function hashClave(clave) {
  const sal = randomBytes(16).toString('hex');
  const h = scryptSync(String(clave), sal, 32).toString('hex');
  return `${sal}$${h}`;
}
export function verificarClave(clave, guardada) {
  const [sal, h] = String(guardada || '').split('$');
  if (!sal || !h) return false;
  const a = Buffer.from(h, 'hex');
  const b = scryptSync(String(clave), sal, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
const sha = t => createHash('sha256').update(t).digest('hex');

export async function crearSesion(usuarioId, dispositivo) {
  const token = randomBytes(32).toString('base64url');
  await q(`insert into sesiones(token_hash, usuario_id, expira, dispositivo) values ($1,$2, now() + interval '${DIAS_SESION} days', $3)`,
    [sha(token), usuarioId, String(dispositivo || '').slice(0, 200)]);
  return token;
}
export async function cerrarSesion(token) { if (token) await q('delete from sesiones where token_hash=$1', [sha(token)]); }

export function leerCookies(req) {
  const out = {};
  for (const par of String(req.headers.cookie || '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0) out[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  }
  return out;
}
export function tokenDe(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return leerCookies(req)[COOKIE] || null;
}
export function cookieSesion(token, segura) {
  const base = `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS_SESION * 86400}`;
  return segura ? base + '; Secure' : base;
}
export const cookieBorrar = segura => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${segura ? '; Secure' : ''}`;

export async function usuarioDeToken(token) {
  if (!token) return null;
  return uno(`select u.id, u.telefono, u.usuario, u.nombre, u.roles, u.municipio
                from sesiones s join usuarios u on u.id = s.usuario_id
               where s.token_hash = $1 and s.expira > now() and u.activo`, [sha(token)]);
}

// Límite de intentos en memoria (una sola instancia del servidor; ver Alertas en ENTREGA.md)
const cubetas = new Map();
export function limitar(clave, max, ventanaMs) {
  const ahora = Date.now();
  const lista = (cubetas.get(clave) || []).filter(t => ahora - t < ventanaMs);
  if (lista.length >= max) { cubetas.set(clave, lista); return false; }
  lista.push(ahora);
  cubetas.set(clave, lista);
  return true;
}
export const reiniciarLimites = () => cubetas.clear();
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of cubetas) if (!v.some(t => ahora - t < 3600e3)) cubetas.delete(k);
}, 600e3).unref();

export const soloDigitos = s => String(s || '').replace(/\D/g, '');
