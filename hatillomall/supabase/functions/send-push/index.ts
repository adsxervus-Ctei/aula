// HatilloMall · Función "send-push": avisos al celular (Web Push)
//  post         oferta o aviso nuevo            -> a todos los suscritos
//  boost        Impulso activado por el equipo  -> a todos los suscritos
//  order        pedido nuevo                    -> dueño y cajeros del negocio
//  order_status cambio de estado                -> cliente
//  message      mensaje en el chat del pedido   -> la otra parte
// Despliegue: supabase functions deploy send-push
// Secretos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:correo)
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const peso = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const ESTADO: Record<string, string> = {
  aceptado: 'fue aceptado', preparando: 'se está preparando', listo: 'está listo para recoger',
  en_camino: 'va en camino', entregado: 'fue entregado', rechazado: 'fue rechazado', cancelado: 'fue cancelado',
};
const TIPO: Record<string, string> = { oferta: 'Oferta', menu: 'Menú nuevo', producto: 'Producto nuevo', servicio: 'Servicio nuevo', aviso: 'Aviso' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return json({ error: 'Faltan las llaves VAPID' }, 500);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hatillomall@example.com', pub, priv);

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: u } = await userClient.auth.getUser();
  const me = u?.user;
  if (!me) return json({ error: 'Sesión no válida' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let body: { kind?: string; id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Cuerpo inválido' }, 400); }
  const { kind, id } = body;
  if (!kind || !id) return json({ error: 'Faltan datos' }, 400);

  const { data: prof } = await admin.from('profiles').select('role').eq('id', me.id).maybeSingle();
  const isSuper = prof?.role === 'superadmin';
  const memberIds = async (bid: string) => {
    const { data: b } = await admin.from('businesses').select('owner_id').eq('id', bid).maybeSingle();
    const { data: st } = await admin.from('staff').select('user_id').eq('business_id', bid).eq('active', true);
    return [b?.owner_id, ...(st ?? []).map((s) => s.user_id)].filter(Boolean) as string[];
  };
  // Marca el aviso como enviado una sola vez
  const claim = async (table: string) => {
    const { data } = await admin.from(table).update({ pushed_at: new Date().toISOString() }).eq('id', id).is('pushed_at', null).select('id');
    return !!data?.length;
  };

  let targets: string[] | 'all' = [];
  let payload: Record<string, string> = {};

  if (kind === 'post') {
    const { data: p } = await admin.from('posts').select('id, title, type, price, author_id, visible, business_id, businesses(name, status)').eq('id', id).maybeSingle();
    if (!p || p.author_id !== me.id) return json({ error: 'No encontrada' }, 404);
    // deno-lint-ignore no-explicit-any
    const b: any = p.businesses;
    if (!p.visible || (p.business_id && b?.status !== 'aprobado')) return json({ sent: 0 });
    if (!(await claim('posts'))) return json({ sent: 0, reason: 'ya enviada' });
    targets = 'all';
    payload = { title: `${TIPO[p.type] ?? 'Novedad'} · ${b?.name ?? 'HatilloMall'}`, body: p.title + (p.price ? ` · ${peso(p.price)}` : ''), url: '#/ofertas', tag: `post-${p.id}` };
  } else if (kind === 'boost') {
    if (!isSuper) return json({ error: 'No autorizado' }, 403);
    const { data: bo } = await admin.from('boosts').select('id, status, posts(title, price), businesses(name)').eq('id', id).maybeSingle();
    if (!bo || bo.status !== 'activo') return json({ sent: 0 });
    if (!(await claim('boosts'))) return json({ sent: 0, reason: 'ya enviado' });
    // deno-lint-ignore no-explicit-any
    const po: any = bo.posts, b: any = bo.businesses;
    targets = 'all';
    payload = { title: `Oferta del día · ${b?.name}`, body: po?.title + (po?.price ? ` · ${peso(po.price)}` : ''), url: '#/', tag: `boost-${bo.id}` };
  } else if (kind === 'order') {
    const { data: o } = await admin.from('orders').select('id, number, total, mode, customer_id, business_id, businesses(name)').eq('id', id).maybeSingle();
    if (!o || o.customer_id !== me.id) return json({ error: 'No encontrado' }, 404);
    if (!(await claim('orders'))) return json({ sent: 0, reason: 'ya enviado' });
    const modo: Record<string, string> = { domicilio: 'DOMICILIO', mesa: 'MESA', recoger: 'RECOGER' };
    targets = await memberIds(o.business_id);
    payload = { title: `¡Nuevo pedido #${o.number}! · ${peso(o.total)}`, body: `${modo[o.mode]} · Ábrelo para aceptar o rechazar`, url: `#/pedido/${o.id}`, tag: `order-${o.id}` };
  } else if (kind === 'order_status') {
    const { data: o } = await admin.from('orders').select('id, number, status, customer_id, business_id, businesses(name)').eq('id', id).maybeSingle();
    if (!o || !(await memberIds(o.business_id)).includes(me.id)) return json({ error: 'No encontrado' }, 404);
    if (!ESTADO[o.status]) return json({ sent: 0 });
    // deno-lint-ignore no-explicit-any
    const b: any = o.businesses;
    targets = [o.customer_id];
    payload = { title: `Tu pedido #${o.number} ${ESTADO[o.status]}`, body: b?.name ?? '', url: `#/pedido/${o.id}`, tag: `order-${o.id}-${o.status}` };
  } else if (kind === 'message') {
    const { data: m } = await admin.from('order_messages').select('id, body, author_id, order_id, orders(id, number, customer_id, business_id)').eq('id', id).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const o: any = m?.orders;
    if (!m || m.author_id !== me.id || !o) return json({ error: 'No encontrado' }, 404);
    const members = await memberIds(o.business_id);
    targets = me.id === o.customer_id ? members : [o.customer_id];
    payload = { title: `Mensaje · pedido #${o.number}`, body: m.body.slice(0, 120), url: `#/pedido/${o.id}`, tag: `msg-${o.id}` };
  } else {
    return json({ error: 'Tipo no válido' }, 400);
  }

  let q = admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
  if (targets !== 'all') q = q.in('user_id', targets.length ? targets : ['00000000-0000-0000-0000-000000000000']);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);
  const list = (subs ?? []).filter((s) => s.user_id !== me.id);
  const msg = JSON.stringify(payload);
  let sent = 0; const dead: string[] = [];
  for (let i = 0; i < list.length; i += 50) {
    await Promise.all(list.slice(i, i + 50).map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 86400 }); sent++; }
      // deno-lint-ignore no-explicit-any
      catch (e) { const c = (e as any)?.statusCode; if (c === 404 || c === 410) dead.push(s.id); }
    }));
  }
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
  return json({ sent, removed: dead.length });
});
