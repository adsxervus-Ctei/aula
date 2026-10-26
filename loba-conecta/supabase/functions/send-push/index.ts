// =====================================================================
// LOBA CONECTA · Función "send-push"
// Envía notificaciones al celular (Web Push) cuando:
//   - un negocio o el equipo publica algo nuevo   -> a TODOS los suscritos
//   - un cliente hace un pedido                    -> al dueño del negocio
//   - el negocio cambia el estado de un pedido     -> al cliente
// Se despliega con:  supabase functions deploy send-push
// Secretos necesarios (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:correo)
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya existen.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const TYPE_LABEL: Record<string, string> = {
  menu: 'Nuevo menú',
  promocion: 'Nueva promoción',
  servicio: 'Nuevo servicio',
  producto: 'Nuevo producto',
  aviso: 'Aviso',
};

const STATUS_LABEL: Record<string, string> = {
  aceptado: 'fue aceptado',
  preparando: 'se está preparando',
  enviado: 'va en camino',
  entregado: 'fue entregado',
  cancelado: 'fue cancelado',
};

const peso = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:lobaconecta@example.com';
  if (!vapidPublic || !vapidPrivate) return json({ error: 'Faltan las llaves VAPID' }, 500);
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // ¿Quién llama? (se valida su sesión)
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'Sesión no válida' }, 401);

  const admin = createClient(url, service);
  let body: { kind?: string; id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Cuerpo inválido' }, 400); }
  const { kind, id } = body;
  if (!kind || !id) return json({ error: 'Faltan datos' }, 400);

  let targets: string[] | 'all' = [];
  let exclude: string | null = null;
  let payload: Record<string, string> = {};

  if (kind === 'post') {
    const { data: post } = await admin.from('posts')
      .select('id, title, body, type, author_id, visible, business_id, businesses(name, status)')
      .eq('id', id).maybeSingle();
    if (!post || post.author_id !== user.id) return json({ error: 'Publicación no encontrada' }, 404);
    // deno-lint-ignore no-explicit-any
    const biz: any = post.businesses;
    if (!post.visible || (post.business_id && biz?.status !== 'aprobado')) return json({ sent: 0 });
    // Solo se notifica una vez por publicación
    const { data: claimed } = await admin.from('posts')
      .update({ pushed_at: new Date().toISOString() })
      .eq('id', id).is('pushed_at', null).select('id');
    if (!claimed?.length) return json({ sent: 0, reason: 'ya notificada' });
    targets = 'all';
    exclude = user.id;
    const who = biz?.name ?? 'Loba Conecta';
    payload = {
      title: `${TYPE_LABEL[post.type] ?? 'Novedad'} · ${who}`,
      body: post.title + (post.body ? ` — ${post.body.slice(0, 90)}` : ''),
      url: `#/novedades`,
      tag: `post-${post.id}`,
    };
  } else if (kind === 'order') {
    const { data: order } = await admin.from('orders')
      .select('id, total, customer_id, business_id, businesses(owner_id, name)')
      .eq('id', id).maybeSingle();
    if (!order || order.customer_id !== user.id) return json({ error: 'Pedido no encontrado' }, 404);
    const { data: claimed } = await admin.from('orders')
      .update({ pushed_at: new Date().toISOString() })
      .eq('id', id).is('pushed_at', null).select('id');
    if (!claimed?.length) return json({ sent: 0, reason: 'ya notificado' });
    // deno-lint-ignore no-explicit-any
    const biz: any = order.businesses;
    targets = [biz.owner_id];
    payload = {
      title: `Nuevo pedido · ${peso(order.total)}`,
      body: `Tienes un pedido nuevo en ${biz.name}. Ábrelo para aceptarlo.`,
      url: `#/panel/pedidos`,
      tag: `order-${order.id}`,
    };
  } else if (kind === 'order_status') {
    const { data: order } = await admin.from('orders')
      .select('id, status, customer_id, businesses(owner_id, name)')
      .eq('id', id).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const biz: any = order?.businesses;
    if (!order || biz?.owner_id !== user.id) return json({ error: 'Pedido no encontrado' }, 404);
    if (!STATUS_LABEL[order.status]) return json({ sent: 0 });
    targets = [order.customer_id];
    payload = {
      title: `Tu pedido ${STATUS_LABEL[order.status]}`,
      body: `${biz.name} actualizó tu pedido.`,
      url: `#/pedidos`,
      tag: `order-${order.id}-${order.status}`,
    };
  } else {
    return json({ error: 'Tipo no válido' }, 400);
  }

  // Suscripciones destino
  let q = admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
  if (targets !== 'all') q = q.in('user_id', targets);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const list = (subs ?? []).filter((s) => s.user_id !== exclude);
  let sent = 0;
  const dead: string[] = [];
  const message = JSON.stringify(payload);

  // Envío en lotes de 50 para no saturar
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    await Promise.all(batch.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (e) {
        // deno-lint-ignore no-explicit-any
        const code = (e as any)?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // suscripción vencida
      }
    }));
  }
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);

  return json({ sent, removed: dead.length });
});
