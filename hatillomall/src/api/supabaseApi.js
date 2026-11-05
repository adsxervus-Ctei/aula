// Conexión real con Supabase (base de datos, usuarios, archivos y tiempo real)
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO, USER_DOMAIN } from '../config.js';
import { compressImage } from '../lib/media.js';

const sb = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

function translate(msg = '') {
  if (/Invalid login credentials/i.test(msg)) return 'Usuario, correo o clave incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Debe confirmar su correo. Revise su bandeja de entrada.';
  if (/User already registered/i.test(msg)) return 'Ese correo ya está registrado. Entre con su clave.';
  if (/Password should be at least/i.test(msg)) return 'La clave debe tener al menos 6 caracteres.';
  if (/row-level security|permission denied/i.test(msg)) return 'No tiene permiso para hacer esto.';
  if (/duplicate key/i.test(msg)) return 'Ese registro ya existe.';
  return msg;
}
const must = ({ data, error }) => { if (error) throw new Error(translate(error.message)); return data; };
async function uid() { const { data } = await sb.auth.getSession(); return data.session?.user?.id || null; }
const loginToEmail = (login) => {
  const l = String(login || '').trim().toLowerCase();
  return l.includes('@') ? l : `${l}@${USER_DOMAIN}`;
};
const BIZ = '*, category:categories(id, name, slug), zones:business_zones(zone_id, fee, zone:zones(name, kind, sort))';
const flatZones = (b) => b && ({ ...b, zones: (b.zones || []).map((z) => ({ zone_id: z.zone_id, fee: z.fee, name: z.zone?.name, kind: z.zone?.kind, sort: z.zone?.sort })).sort((a, c) => a.sort - c.sort) });
const ext = (f) => (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

export const api = {
  demo: false,

  // ---------- Sesión ----------
  async getSession() { const { data } = await sb.auth.getSession(); const u = data.session?.user; return u ? { user: { id: u.id, email: u.email } } : null; },
  onAuthChange(cb) {
    const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user ? { user: { id: s.user.id, email: s.user.email } } : null));
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, full_name, phone, accepts_marketing }) {
    const data = must(await sb.auth.signUp({ email: email.trim(), password, options: { data: { full_name, phone, accepts_marketing: !!accepts_marketing }, emailRedirectTo: location.origin + location.pathname } }));
    return { needsConfirmation: !data.session };
  },
  async signIn({ login, password }) { must(await sb.auth.signInWithPassword({ email: loginToEmail(login), password })); },
  async signOut() { await sb.auth.signOut(); },
  async resetPassword(email) { must(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname + '#/perfil' })); },
  async updatePassword(password) { must(await sb.auth.updateUser({ password })); },
  async getMyProfile() { const id = await uid(); return id ? must(await sb.from('profiles').select('*').eq('id', id).maybeSingle()) : null; },
  async updateMyProfile(p) { must(await sb.from('profiles').update({ full_name: p.full_name, phone: p.phone, accepts_marketing: !!p.accepts_marketing }).eq('id', await uid())); },

  // ---------- Catálogos ----------
  async listCategories() { return must(await sb.from('categories').select('*').order('sort')); },
  async listZones() { return must(await sb.from('zones').select('*').order('sort')); },

  // ---------- Negocios ----------
  async listBusinesses({ categoryId, q } = {}) {
    let query = sb.from('businesses').select(BIZ).eq('status', 'aprobado').order('name');
    if (categoryId) query = query.eq('category_id', categoryId);
    if (q) query = query.ilike('name', `%${q}%`);
    return must(await query).map(flatZones);
  },
  async getBusiness(id) { return flatZones(must(await sb.from('businesses').select(BIZ).eq('id', id).maybeSingle())); },
  async getMyWork() {
    const id = await uid(); if (!id) return null;
    const own = must(await sb.from('businesses').select(BIZ).eq('owner_id', id).order('created_at').limit(1).maybeSingle());
    if (own) return { role: 'owner', business: flatZones(own) };
    const st = must(await sb.from('staff').select('id, title, business_id').eq('user_id', id).eq('active', true).limit(1).maybeSingle());
    if (st) return { role: 'cajero', staff: st, business: flatZones(must(await sb.from('businesses').select(BIZ).eq('id', st.business_id).maybeSingle())) };
    return null;
  },
  async saveMyBusiness(b) {
    const row = {
      name: b.name, category_id: Number(b.category_id), description: b.description || '', whatsapp: b.whatsapp || '', address: b.address || '',
      hours: b.hours || '', logo_url: b.logo_url || '', cover_url: b.cover_url || '', delivery: !!b.delivery, pickup: !!b.pickup, dine_in: !!b.dine_in,
      prep_minutes: Number(b.prep_minutes) || 25, table_hold_minutes: Number(b.table_hold_minutes) || 15, breb_key: b.breb_key || '', breb_holder: b.breb_holder || '',
      breb_qr_url: b.breb_qr_url || '', allow_fiado: !!b.allow_fiado, legal_name: b.legal_name || '', id_number: b.id_number || '', notify_address: b.notify_address || '',
    };
    if (b.id) return must(await sb.from('businesses').update(row).eq('id', b.id).select().single());
    return must(await sb.from('businesses').insert({ ...row, owner_id: await uid() }).select().single());
  },
  async saveBusinessZones(bid, rows) {
    must(await sb.from('business_zones').delete().eq('business_id', bid));
    if (rows.length) must(await sb.from('business_zones').insert(rows.map((r) => ({ business_id: bid, zone_id: r.zone_id, fee: Number(r.fee) || 0 }))));
  },

  // ---------- Productos ----------
  async listProducts(bid) { return must(await sb.from('products').select('*').eq('business_id', bid).order('section').order('name')); },
  async saveProduct(p) {
    const row = { business_id: p.business_id, name: p.name, description: p.description || '', price: Number(p.price) || 0, image_url: p.image_url || '', section: p.section || 'General', available: p.available !== false };
    if (p.id) return must(await sb.from('products').update(row).eq('id', p.id).select().single());
    return must(await sb.from('products').insert(row).select().single());
  },
  async deleteProduct(id) { must(await sb.from('products').delete().eq('id', id)); },

  // ---------- Ofertas, Impulsos, novedades ----------
  async listPosts({ limit = 40, businessId } = {}) {
    let q = sb.from('posts').select('*, business:businesses(id, name, logo_url, prep_minutes)').eq('visible', true).order('created_at', { ascending: false }).limit(limit);
    if (businessId) q = q.eq('business_id', businessId);
    return must(await q);
  },
  async listFeatured() {
    return must(await sb.from('boosts').select('*, post:posts(*), business:businesses(id, name, logo_url, prep_minutes)')
      .eq('status', 'activo').gt('ends_at', new Date().toISOString()).order('starts_at', { ascending: false }));
  },
  async createPost(p) {
    const post = must(await sb.from('posts').insert({ business_id: p.business_id || null, type: p.type, title: p.title, body: p.body || '', price: p.price ? Number(p.price) : null, image_url: p.image_url || '' }).select().single());
    return { post, push: await this.notify('post', post.id) };
  },
  async listMyPosts(bid) { return must(await sb.from('posts').select('*').eq('business_id', bid).order('created_at', { ascending: false })); },
  async setPostVisible(id, visible) { must(await sb.from('posts').update({ visible }).eq('id', id)); },
  async deletePost(id) { must(await sb.from('posts').delete().eq('id', id)); },
  async requestBoost(bid, postId) { return must(await sb.from('boosts').insert({ business_id: bid, post_id: postId }).select().single()); },
  async listMyBoosts(bid) { return must(await sb.from('boosts').select('*').eq('business_id', bid).order('created_at', { ascending: false })); },
  async unreadCount() { if (!(await uid())) return 0; return must(await sb.rpc('unread_posts_count')) || 0; },
  async markRead() { if (await uid()) must(await sb.rpc('mark_posts_read')); },
  onNewPost(cb) {
    const ch = sb.channel('posts-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async ({ new: p }) => {
        if (p.business_id) { const { data } = await sb.from('businesses').select('id, name, logo_url').eq('id', p.business_id).maybeSingle(); p.business = data; }
        cb(p);
      }).subscribe();
    return () => sb.removeChannel(ch);
  },

  // ---------- Pedidos ----------
  async createOrder(o) {
    const order = must(await sb.from('orders').insert({
      business_id: o.business_id, mode: o.mode, zone_id: o.zone_id || null, address: o.address || '', people: o.people || null,
      reserve_at: o.reserve_at || null, items: o.items, payment: o.payment, note: o.note || '',
    }).select().single());
    if (o.proofFile) { try { await this.attachProof(order.id, order.business_id, o.proofFile); } catch { /* lo puede subir después */ } }
    await this.notify('order', order.id);
    return order;
  },
  async getOrder(id) {
    const o = must(await sb.from('orders').select('*, business:businesses(id, name, whatsapp, owner_id, breb_key, breb_holder, breb_qr_url, prep_minutes, table_hold_minutes, address), zone:zones(name)').eq('id', id).maybeSingle());
    if (!o) return null;
    const { data: c } = await sb.from('profiles').select('full_name, phone').eq('id', o.customer_id).maybeSingle();
    return { ...o, customer: c || null };
  },
  async listMyOrders() { return must(await sb.from('orders').select('*, business:businesses(id, name)').eq('customer_id', await uid()).order('created_at', { ascending: false }).limit(60)); },
  async listBusinessOrders(bid) { return must(await sb.from('orders').select('*, customer:profiles!orders_customer_id_fkey(full_name, phone), zone:zones(name)').eq('business_id', bid).order('created_at', { ascending: false }).limit(150)); },
  async updateOrderStatus(id, status, eta) {
    const ch = { status }; if (eta) ch.eta_minutes = Number(eta);
    must(await sb.from('orders').update(ch).eq('id', id));
    await this.notify('order_status', id);
  },
  async cancelMyOrder(id) { must(await sb.from('orders').update({ status: 'cancelado' }).eq('id', id)); },
  async attachProof(orderId, bid, file) {
    const path = await this.uploadPrivate(bid, file);
    must(await sb.from('orders').update({ proof_url: path }).eq('id', orderId));
    return path;
  },
  async listMessages(orderId) { return must(await sb.from('order_messages').select('*').eq('order_id', orderId).order('created_at')); },
  async sendMessage(orderId, body) {
    const m = must(await sb.from('order_messages').insert({ order_id: orderId, body }).select().single());
    this.notify('message', m.id);
    return m;
  },
  onOrdersChange(filter, cb) {
    const ch = sb.channel('orders-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter }, cb).subscribe();
    return () => sb.removeChannel(ch);
  },
  onMessages(orderId, cb) {
    const ch = sb.channel('msg-' + orderId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` }, ({ new: m }) => cb(m)).subscribe();
    return () => sb.removeChannel(ch);
  },

  // ---------- Sistema del negocio ----------
  async dashboard(bid) { return must(await sb.rpc('business_dashboard', { b: bid })); },
  async balance(bid, d1, d2) { return must(await sb.rpc('business_balance', { b: bid, d1, d2 })); },
  async listSales(bid, { from, to } = {}) {
    let q = sb.from('sales').select('*, customer:business_customers(name)').eq('business_id', bid).order('occurred_at', { ascending: false }).limit(300);
    if (from) q = q.gte('occurred_at', from); if (to) q = q.lt('occurred_at', to);
    return must(await q);
  },
  async addSale(s) {
    const { error } = await sb.from('sales').insert({ id: s.id, business_id: s.business_id, concept: s.concept || '', items: s.items || [], amount: Number(s.amount),
      method: s.method, customer_ref: s.customer_ref || null, occurred_at: s.occurred_at });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(translate(error.message)); // repetida = ya estaba guardada
  },
  async voidSale(id, reason) { must(await sb.from('sales').update({ voided: true, void_reason: reason }).eq('id', id)); },
  async listExpenses(bid, { from, to } = {}) {
    let q = sb.from('expenses').select('*').eq('business_id', bid).order('occurred_at', { ascending: false }).limit(300);
    if (from) q = q.gte('occurred_at', from); if (to) q = q.lt('occurred_at', to);
    return must(await q);
  },
  async addExpense(e) {
    const { error } = await sb.from('expenses').insert({ id: e.id, business_id: e.business_id, concept: e.concept, category: e.category, amount: Number(e.amount),
      paid_cash: e.paid_cash !== false, receipt_url: e.receipt_url || '', occurred_at: e.occurred_at });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(translate(error.message));
  },
  async voidExpense(id, reason) { must(await sb.from('expenses').update({ voided: true, void_reason: reason }).eq('id', id)); },
  async cashPreview(bid) { return must(await sb.rpc('cash_preview', { b: bid })); },
  async closeCash(bid, counted, signer, note) { return must(await sb.rpc('close_cash', { b: bid, counted: Number(counted), signer, obs: note || '' })); },
  async listClosings(bid) { return must(await sb.from('cash_closings').select('*').eq('business_id', bid).order('day', { ascending: false }).limit(30)); },
  async listInventory(bid) { return must(await sb.from('inventory_items').select('*').eq('business_id', bid).order('name')); },
  async saveInventoryItem(it) {
    const row = { business_id: it.business_id, name: it.name, unit: it.unit || 'unidades', min_qty: Number(it.min_qty) || 0 };
    const saved = it.id ? must(await sb.from('inventory_items').update(row).eq('id', it.id).select().single()) : must(await sb.from('inventory_items').insert(row).select().single());
    if (!it.id && Number(it.qty) > 0) await this.moveInventory(saved.id, it.business_id, Number(it.qty), 'Cantidad inicial');
    return saved;
  },
  async moveInventory(itemId, bid, delta, reason) { must(await sb.from('inventory_moves').insert({ item_id: itemId, business_id: bid, delta: Number(delta), reason })); },
  async listCustomers(bid, { balances } = {}) {
    if (balances) return must(await sb.rpc('fiado_balances', { b: bid }));
    return must(await sb.from('business_customers').select('id, name, phone, fiado_ok, blocked, customer_id').eq('business_id', bid).order('name')).map((c) => ({ ...c, customer_ref: c.id }));
  },
  async saveCustomer(c) {
    const row = { business_id: c.business_id, name: c.name, phone: c.phone || '', fiado_ok: !!c.fiado_ok, blocked: !!c.blocked, note: c.note || '' };
    if (c.id) return must(await sb.from('business_customers').update(row).eq('id', c.id).select().single());
    return must(await sb.from('business_customers').insert(row).select().single());
  },
  async setCustomerFlags(id, flags) { must(await sb.from('business_customers').update(flags).eq('id', id)); },
  async addAbono(bid, customerRef, amount, method, note) { must(await sb.from('fiado_moves').insert({ business_id: bid, customer_ref: customerRef, kind: 'abono', amount: Number(amount), method, note: note || 'Abono' })); },
  async listFiadoMoves(customerRef) { return must(await sb.from('fiado_moves').select('*').eq('customer_ref', customerRef).order('created_at', { ascending: false })); },
  async listStaff(bid) { return must(await sb.from('staff').select('*, user:profiles(full_name, username, phone)').eq('business_id', bid).order('created_at')); },
  async staffAction(body) {
    const { data, error } = await sb.functions.invoke('empleados', { body });
    if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch { /* */ } throw new Error(translate(msg)); }
    if (data?.error) throw new Error(data.error);
    return data;
  },
  async createStaff(s) { return this.staffAction({ action: 'crear', ...s }); },
  async resetStaffPassword(staffId, password) { return this.staffAction({ action: 'clave', staff_id: staffId, password }); },
  async retireStaff(staffId) { return this.staffAction({ action: 'retirar', staff_id: staffId }); },
  async listAudit(bid) { return must(await sb.from('audit_log').select('*').eq('business_id', bid).order('id', { ascending: false }).limit(200)); },
  async listSettlements(bid) { return must(await sb.from('settlements').select('*').eq('business_id', bid).order('week_start', { ascending: false })); },

  // ---------- Equipo HatilloMall ----------
  async platformStats() { return must(await sb.rpc('platform_stats')); },
  async adminListBusinesses() {
    return must(await sb.from('businesses').select('*, category:categories(name), owner:profiles!businesses_owner_id_fkey(full_name, email, phone)').order('created_at', { ascending: false }));
  },
  async adminUpdateBusiness(id, changes) { must(await sb.from('businesses').update(changes).eq('id', id)); },
  async adminListBoosts() { return must(await sb.from('boosts').select('*, post:posts(title, price), business:businesses(name, whatsapp)').order('created_at', { ascending: false }).limit(100)); },
  async adminSetBoost(id, changes) {
    must(await sb.from('boosts').update(changes).eq('id', id));
    if (changes.status === 'activo') return this.notify('boost', id);
    return null;
  },
  async generateSettlements(week) { return must(await sb.rpc('generate_settlements', { p_week: week })); },
  async adminListSettlements() { return must(await sb.from('settlements').select('*, business:businesses(name, whatsapp)').order('week_start', { ascending: false }).limit(200)); },
  async markSettlementPaid(id, method) { must(await sb.from('settlements').update({ status: 'pagado', paid_at: new Date().toISOString(), paid_method: method }).eq('id', id)); },
  async adminListUsers() { return must(await sb.from('profiles').select('*').order('created_at', { ascending: false })); },
  async adminUpdateUser(id, changes) { must(await sb.from('profiles').update(changes).eq('id', id)); },
  async adminSaveZone(z) { must(await sb.from('zones').update({ default_fee: Number(z.default_fee) || 0 }).eq('id', z.id)); },
  async adminListPosts() { return must(await sb.from('posts').select('*, business:businesses(name)').order('created_at', { ascending: false }).limit(200)); },

  // ---------- Archivos ----------
  async uploadImage(file) {
    const f = await compressImage(file);
    const path = `${await uid()}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    must(await sb.storage.from('imagenes').upload(path, f, { cacheControl: '31536000', contentType: 'image/jpeg' }));
    return sb.storage.from('imagenes').getPublicUrl(path).data.publicUrl;
  },
  async uploadPrivate(bid, file) {
    const f = file.type.startsWith('image/') ? await compressImage(file, 1400, 0.82) : file;
    const path = `${bid}/${await uid()}/${Date.now()}.${f.type === 'image/jpeg' ? 'jpg' : ext(file)}`;
    must(await sb.storage.from('privado').upload(path, f, { contentType: f.type }));
    return path;
  },
  async signedUrl(path) {
    if (!path) return '';
    if (/^(https?:|data:)/.test(path)) return path;
    const { data } = await sb.storage.from('privado').createSignedUrl(path, 600);
    return data?.signedUrl || '';
  },

  // ---------- Notificaciones ----------
  async savePushSubscription(sub) {
    const j = sub.toJSON();
    must(await sb.from('push_subscriptions').upsert({ user_id: await uid(), endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' }));
  },
  async deletePushSubscription(endpoint) { await sb.from('push_subscriptions').delete().eq('endpoint', endpoint); },
  async notify(kind, id) {
    try { const { data, error } = await sb.functions.invoke('send-push', { body: { kind, id } }); return error ? { sent: 0, error: error.message } : data; }
    catch (e) { return { sent: 0, error: e.message }; }
  },
};
