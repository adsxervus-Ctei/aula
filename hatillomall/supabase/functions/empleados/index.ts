// HatilloMall · Función "empleados": el dueño crea cajeros con usuario y clave
// (ej.: "rancho-cajero"), y les cambia la clave si la olvidan.
// La llave de servicio vive SOLO aquí, nunca en la app.
// Despliegue: supabase functions deploy empleados
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
// Mismo dominio que usa la app para convertir un usuario en correo interno
const DOMINIO = 'usuarios.hatillomall.co';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: u } = await userClient.auth.getUser();
  const me = u?.user;
  if (!me) return json({ error: 'Sesión no válida' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // deno-lint-ignore no-explicit-any
  let b: any;
  try { b = await req.json(); } catch { return json({ error: 'Cuerpo inválido' }, 400); }
  const { data: prof } = await admin.from('profiles').select('role, active').eq('id', me.id).maybeSingle();
  const isSuper = prof?.role === 'superadmin' && prof?.active;
  const ownsBusiness = async (bid: string) => {
    const { data } = await admin.from('businesses').select('owner_id').eq('id', bid).maybeSingle();
    return isSuper || data?.owner_id === me.id;
  };
  const passOk = (p: string) => typeof p === 'string' && p.length >= 6 && p.length <= 72;

  if (b.action === 'crear') {
    const username = String(b.username || '').trim().toLowerCase();
    const fullName = String(b.full_name || '').trim();
    if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(username)) return json({ error: 'El usuario debe tener de 3 a 31 letras, números o guiones, sin espacios' }, 400);
    if (fullName.length < 3) return json({ error: 'Escriba el nombre del empleado' }, 400);
    if (!passOk(b.password)) return json({ error: 'La clave debe tener al menos 6 caracteres' }, 400);
    if (!b.business_id || !(await ownsBusiness(b.business_id))) return json({ error: 'No autorizado' }, 403);
    const { data: exists } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (exists) return json({ error: 'Ese usuario ya existe. Elija otro.' }, 409);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${username}@${DOMINIO}`, password: b.password, email_confirm: true,
      user_metadata: { full_name: fullName, username, phone: String(b.phone || '') },
    });
    if (error || !created.user) return json({ error: error?.message ?? 'No se pudo crear' }, 400);
    const { error: e2 } = await admin.from('staff').insert({ business_id: b.business_id, user_id: created.user.id, title: String(b.title || 'Cajero').slice(0, 40) });
    if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: e2.message }, 400); }
    return json({ ok: true, username });
  }

  if (b.action === 'clave') {
    const { data: st } = await admin.from('staff').select('business_id, user_id').eq('id', b.staff_id).maybeSingle();
    if (!st || !(await ownsBusiness(st.business_id))) return json({ error: 'No autorizado' }, 403);
    if (!passOk(b.password)) return json({ error: 'La clave debe tener al menos 6 caracteres' }, 400);
    const { error } = await admin.auth.admin.updateUserById(st.user_id, { password: b.password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (b.action === 'retirar') {
    // Desactiva al empleado y le cierra el acceso (no se borra: queda en el historial)
    const { data: st } = await admin.from('staff').select('id, business_id, user_id').eq('id', b.staff_id).maybeSingle();
    if (!st || !(await ownsBusiness(st.business_id))) return json({ error: 'No autorizado' }, 403);
    await admin.from('staff').update({ active: false }).eq('id', st.id);
    await admin.auth.admin.updateUserById(st.user_id, { ban_duration: '876000h' });
    return json({ ok: true });
  }

  return json({ error: 'Acción no válida' }, 400);
});
