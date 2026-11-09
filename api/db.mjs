// Lainec · conexión a PostgreSQL y migraciones
import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DIR_MIG = fileURLToPath(new URL('./migraciones/', import.meta.url));

// Los montos y conteos vienen como bigint/numeric: los pasamos a número de JS
pg.types.setTypeParser(20, v => Number(v));     // int8
pg.types.setTypeParser(1700, v => Number(v));   // numeric

let pool = null;

export function conectar(url = process.env.DATABASE_URL) {
  if (!url) return null;
  if (pool) return pool;
  const ssl = /sslmode=require|neon\.tech|supabase\.co|render\.com/.test(url) ? { rejectUnauthorized: false } : undefined;
  pool = new pg.Pool({ connectionString: url, max: Number(process.env.DB_MAX_CONEXIONES) || 10, ssl });
  pool.on('error', e => console.error('[db] error en conexión inactiva:', e.message));
  return pool;
}
export const hayDB = () => !!pool;
export async function cerrar() { if (pool) { await pool.end(); pool = null; } }

export const q = (texto, params) => pool.query(texto, params);
export const uno = async (texto, params) => (await pool.query(texto, params)).rows[0] || null;
export const filas = async (texto, params) => (await pool.query(texto, params)).rows;

// Transacción: fn recibe un cliente con .q / .uno / .filas
export async function tx(fn) {
  const c = await pool.connect();
  const h = {
    q: (t, p) => c.query(t, p),
    uno: async (t, p) => (await c.query(t, p)).rows[0] || null,
    filas: async (t, p) => (await c.query(t, p)).rows
  };
  try {
    await c.query('begin');
    const r = await fn(h);
    await c.query('commit');
    return r;
  } catch (e) {
    try { await c.query('rollback'); } catch {}
    throw e;
  } finally {
    c.release();
  }
}

// Aplica en orden los .sql que falten. Nunca borra datos: cada archivo usa IF NOT EXISTS.
export async function migrar({ silencioso = false } = {}) {
  await q(`create table if not exists schema_migraciones (version text primary key, aplicada timestamptz not null default now())`);
  const hechas = new Set((await filas('select version from schema_migraciones')).map(r => r.version));
  const archivos = (await readdir(DIR_MIG)).filter(f => f.endsWith('.sql')).sort();
  const aplicadas = [];
  for (const f of archivos) {
    if (hechas.has(f)) continue;
    const sql = await readFile(DIR_MIG + f, 'utf8');
    await tx(async c => {
      await c.q(sql);
      await c.q('insert into schema_migraciones(version) values ($1)', [f]);
    });
    aplicadas.push(f);
    if (!silencioso) console.log('[db] migración aplicada:', f);
  }
  return aplicadas;
}

export async function config(clave, porDefecto) {
  const r = await uno('select valor from configuracion where clave=$1', [clave]);
  return r ? r.valor : porDefecto;
}
