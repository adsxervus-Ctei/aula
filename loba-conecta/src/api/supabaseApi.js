// Conexión real con Supabase (base de datos, usuarios, imágenes, tiempo real)
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO } from '../config.js';

// En modo demo no se crea el cliente (no hay URL)
const sb = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const must = ({ data, error }) => {
  if (error) throw new Error(translate(error.message));
  return data;
};

function translate(msg = '') {
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Debes confirmar tu correo. Revisa tu bandeja de entrada.';
  if (/User already registered/i.test(msg)) return 'Ese correo ya está registrado. Inicia sesión.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/row-level security/i.test(msg)) return 'No tienes permiso para hacer esto.';
  return msg;
}

async function uid() {
  const { data } = await sb.auth.getSession();
  return data.session?.user?.id || null;
}

export const api = {
  demo: false,

  // ---------- Sesión ----------
  async getSession() {
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    return u ? { user: { id: u.id, email: u.email } } : null;
  },
  onAuthChange(cb) {
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      cb(session?.user ? { user: { id: session.user.id, email: session.user.email } } : null);
    });
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, full_name, phone }) {
    const data = must(await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name, phone }, emailRedirectTo: location.origin + location.pathname },
    }));
    return { needsConfirmation: !data.session };
  },
  async signIn({ email, password }) {
    must(await sb.auth.signInWithPassword({ email: email.trim(), password }));
  },
  async signOut() { await sb.auth.signOut(); },
  async resetPassword(email) {
    must(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname + '#/perfil' }));
  },
  async updatePassword(password) { must(await sb.auth.updateUser({ password })); },

  // ---------- Perfil ----------
  async getMyProfile() {
    const id = await uid();
    if (!id) return null;
    return must(await sb.from('profiles').select('*').eq('id', id).maybeSingle());
  },
  async updateMyProfile({ full_name, phone }) {
    const id = await uid();
    must(await sb.from('profiles').update({ full_name, phone }).eq('id', id));
  },

  // ---------- Categorías ----------
  async listCategories() {
    return must(await sb.from('categories').select('*').order('sort'));
  },
  async saveCategory(c) {
    if (c.id) return must(await sb.from('categories').update({ name: c.name, slug: c.slug, sort: c.sort }).eq('id', c.id));
    return must(await sb.from('categories').insert({ name: c.name, slug: c.slug, sort: c.sort || 99 }));
  },

  // ---------- Negocios ----------
  async listBusinesses({ categoryId, q } = {}) {
    let query = sb.from('businesses').select('*, category:categories(name, slug)').eq('status', 'aprobado').order('name');
    if (categoryId) query = query.eq('category_id', categoryId);
    if (q) query = query.ilike('name', `%${q}%`);
    return must(await query);
  },
  async getBusiness(id) {
    return must(await sb.from('businesses').select('*, category:categories(name, slug)').eq('id', id).maybeSingle());
  },
  async getMyBusiness() {
    const id = await uid();
    if (!id) return null;
    return must(await sb.from('businesses').select('*, category:categories(name, slug)').eq('owner_id', id).order('created_at').limit(1).maybeSingle());
  },
  async saveMyBusiness(b) {
    const row = {
      name: b.name, category_id: Number(b.category_id), description: b.description, whatsapp: b.whatsapp,
      address: b.address, hours: b.hours, logo_url: b.logo_url, delivery: !!b.delivery, delivery_fee: Number(b.delivery_fee) || 0,
    };
    if (b.id) return must(await sb.from('businesses').update(row).eq('id', b.id).select().single());
    row.owner_id = await uid();
    return must(await sb.from('businesses').insert(row).select().single());
  },
  async adminListBusinesses() {
    return must(await sb.from('businesses')
      .select('*, category:categories(name), owner:profiles!businesses_owner_id_fkey(full_name, email, phone)')
      .order('created_at', { ascending: false }));
  },
  async adminSetBusinessStatus(id, status) {
    must(await sb.from('businesses').update({ status }).eq('id', id));
  },

  // ---------- Productos ----------
  async listProducts(businessId) {
    return must(await sb.from('products').select('*').eq('business_id', businessId).order('section').order('name'));
  },
  async saveProduct(p) {
    const row = {
      business_id: p.business_id, name: p.name, description: p.description, price: Number(p.price) || 0,
      image_url: p.image_url, section: p.section || 'General', available: p.available !== false,
    };
    if (p.id) return must(await sb.from('products').update(row).eq('id', p.id).select().single());
    return must(await sb.from('products').insert(row).select().single());
  },
  async deleteProduct(id) { must(await sb.from('products').delete().eq('id', id)); },

  // ---------- Publicaciones ----------
  async listPosts({ limit = 50, businessId } = {}) {
    let q = sb.from('posts').select('*, business:businesses(id, name, logo_url)').eq('visible', true)
      .order('created_at', { ascending: false }).limit(limit);
    if (businessId) q = q.eq('business_id', businessId);
    return must(await q);
  },
  async listMyBusinessPosts(businessId) {
    return must(await sb.from('posts').select('*').eq('business_id', businessId).order('created_at', { ascending: false }));
  },
  async createPost(p) {
    const post = must(await sb.from('posts').insert({
      business_id: p.business_id || null, type: p.type, title: p.title, body: p.body, image_url: p.image_url,
    }).select().single());
    const push = await this.notify('post', post.id);
    return { post, push };
  },
  async adminListPosts() {
    return must(await sb.from('posts').select('*, business:businesses(name)').order('created_at', { ascending: false }).limit(200));
  },
  async setPostVisible(id, visible) { must(await sb.from('posts').update({ visible }).eq('id', id)); },
  async deletePost(id) { must(await sb.from('posts').delete().eq('id', id)); },
  async unreadCount() {
    if (!(await uid())) return 0;
    return must(await sb.rpc('unread_posts_count')) || 0;
  },
  async markRead() { if (await uid()) must(await sb.rpc('mark_posts_read')); },
  onNewPost(cb) {
    const ch = sb.channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        let post = payload.new;
        if (post.business_id) {
          const { data } = await sb.from('businesses').select('id, name, logo_url').eq('id', post.business_id).maybeSingle();
          post = { ...post, business: data };
        }
        cb(post);
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  },

  // ---------- Pedidos ----------
  async createOrder(o) {
    const order = must(await sb.from('orders').insert({
      business_id: o.business_id, items: o.items, delivery: !!o.delivery, address: o.address || '',
      note: o.note || '', payment: o.payment || 'efectivo',
    }).select().single());
    await this.notify('order', order.id);
    return order;
  },
  async listMyOrders() {
    const id = await uid();
    return must(await sb.from('orders').select('*, business:businesses(id, name, whatsapp)')
      .eq('customer_id', id).order('created_at', { ascending: false }));
  },
  async listBusinessOrders(businessId) {
    return must(await sb.from('orders').select('*, customer:profiles!orders_customer_id_fkey(full_name, phone)')
      .eq('business_id', businessId).order('created_at', { ascending: false }).limit(200));
  },
  async updateOrderStatus(id, status) {
    must(await sb.from('orders').update({ status }).eq('id', id));
    await this.notify('order_status', id);
  },
  async cancelMyOrder(id) { must(await sb.from('orders').update({ status: 'cancelado' }).eq('id', id)); },
  onOrdersChange(filter, cb) {
    const ch = sb.channel('orders-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter }, (payload) => cb(payload))
      .subscribe();
    return () => sb.removeChannel(ch);
  },

  // ---------- Superadministrador ----------
  async adminListUsers() {
    return must(await sb.from('profiles').select('*').order('created_at', { ascending: false }));
  },
  async adminUpdateUser(id, changes) { must(await sb.from('profiles').update(changes).eq('id', id)); },
  async platformStats() { return must(await sb.rpc('platform_stats')); },

  // ---------- Imágenes ----------
  async uploadImage(file) {
    const id = await uid();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    must(await sb.storage.from('imagenes').upload(path, file, { cacheControl: '31536000', upsert: false }));
    return sb.storage.from('imagenes').getPublicUrl(path).data.publicUrl;
  },

  // ---------- Notificaciones push ----------
  async savePushSubscription(sub) {
    const id = await uid();
    const j = sub.toJSON();
    must(await sb.from('push_subscriptions').upsert(
      { user_id: id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: 'endpoint' },
    ));
  },
  async deletePushSubscription(endpoint) {
    await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
  },
  async notify(kind, id) {
    try {
      const { data, error } = await sb.functions.invoke('send-push', { body: { kind, id } });
      if (error) return { sent: 0, error: error.message };
      return data;
    } catch (e) {
      return { sent: 0, error: e.message };
    }
  },
};
