// MODO DEMO: misma interfaz que supabaseApi.js, pero los datos viven en el navegador.
// Sirve para mostrar la plataforma sin crear todavía el proyecto en Supabase.
// Las reglas de permisos imitan las de la base de datos real.

const KEY = 'loba-conecta-demo-v1';
const now = () => new Date().toISOString();
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());

function seed() {
  const U = {
    admin: 'u-admin', sabor: 'u-sabor', tienda: 'u-tienda', drogueria: 'u-drogueria', deposito: 'u-deposito',
    asadero: 'u-asadero', cliente: 'u-cliente', pendiente: 'u-pendiente',
  };
  const users = [
    { id: U.admin, email: 'equipo@lobaconecta.co', password: 'demo1234', full_name: 'Equipo Loba Conecta', phone: '3000000000', role: 'superadmin' },
    { id: U.sabor, email: 'sabor@demo.co', password: 'demo1234', full_name: 'Dueña Sabor Ribereño', phone: '3001112233', role: 'negocio' },
    { id: U.tienda, email: 'tienda@demo.co', password: 'demo1234', full_name: 'Dueño Tienda Central', phone: '3002223344', role: 'negocio' },
    { id: U.drogueria, email: 'drogueria@demo.co', password: 'demo1234', full_name: 'Regente Droguería', phone: '3003334455', role: 'negocio' },
    { id: U.deposito, email: 'deposito@demo.co', password: 'demo1234', full_name: 'Dueño Depósito', phone: '3004445566', role: 'negocio' },
    { id: U.asadero, email: 'asadero@demo.co', password: 'demo1234', full_name: 'Dueño Asadero', phone: '3005556677', role: 'negocio' },
    { id: U.cliente, email: 'cliente@demo.co', password: 'demo1234', full_name: 'María Cliente', phone: '3109998877', role: 'cliente' },
    { id: U.pendiente, email: 'nuevo@demo.co', password: 'demo1234', full_name: 'Dueño Panadería', phone: '3116665544', role: 'cliente' },
  ].map((u) => ({ ...u, active: true, created_at: ago(60 * 24 * 10), last_read_posts_at: ago(60 * 24) }));

  const categories = [
    { id: 1, name: 'Restaurantes', slug: 'restaurantes', sort: 1 },
    { id: 2, name: 'Comercio', slug: 'comercio', sort: 2 },
    { id: 3, name: 'Farmacias', slug: 'farmacias', sort: 3 },
    { id: 4, name: 'Depósitos', slug: 'depositos', sort: 4 },
    { id: 5, name: 'Servicios', slug: 'servicios', sort: 5 },
  ];

  const B = { sabor: 'b-sabor', tienda: 'b-tienda', drogueria: 'b-drogueria', deposito: 'b-deposito', asadero: 'b-asadero', panaderia: 'b-panaderia' };
  const base = { logo_url: '', created_at: ago(60 * 24 * 9) };
  const businesses = [
    { ...base, id: B.sabor, owner_id: U.sabor, category_id: 1, name: 'Sabor Ribereño', description: 'Comida típica del río: bocachico, sancocho y almuerzos caseros.', whatsapp: '3001112233', address: 'Calle principal, frente al parque', hours: 'Lun a sáb · 11:00 a. m. – 3:00 p. m.', delivery: true, delivery_fee: 3000, status: 'aprobado' },
    { ...base, id: B.asadero, owner_id: U.asadero, category_id: 1, name: 'Asadero La Loba', description: 'Pollo asado, carne a la brasa y picadas.', whatsapp: '3005556677', address: 'Salida al puerto', hours: 'Todos los días · 5:00 p. m. – 10:00 p. m.', delivery: true, delivery_fee: 2000, status: 'aprobado' },
    { ...base, id: B.tienda, owner_id: U.tienda, category_id: 2, name: 'Tienda Central', description: 'Víveres, aseo y abarrotes. Aceptamos transferencias.', whatsapp: '3002223344', address: 'Barrio Centro', hours: 'Todos los días · 6:00 a. m. – 9:00 p. m.', delivery: true, delivery_fee: 1000, status: 'aprobado' },
    { ...base, id: B.drogueria, owner_id: U.drogueria, category_id: 3, name: 'Droguería del Pueblo', description: 'Medicamentos, cuidado personal y productos para bebé.', whatsapp: '3003334455', address: 'Calle del comercio', hours: 'Lun a dom · 7:00 a. m. – 9:00 p. m.', delivery: false, delivery_fee: 0, status: 'aprobado' },
    { ...base, id: B.deposito, owner_id: U.deposito, category_id: 4, name: 'Depósito El Mayorista', description: 'Ventas al por mayor para tiendas y restaurantes.', whatsapp: '3004445566', address: 'Entrada del pueblo', hours: 'Lun a sáb · 7:00 a. m. – 5:00 p. m.', delivery: true, delivery_fee: 0, status: 'aprobado' },
    { ...base, id: B.panaderia, owner_id: U.pendiente, category_id: 2, name: 'Panadería Dulce Hogar', description: 'Pan caliente, bollos y tortas por encargo.', whatsapp: '3116665544', address: 'Barrio Nuevo', hours: 'Todos los días · 5:00 a. m. – 8:00 p. m.', delivery: false, delivery_fee: 0, status: 'pendiente', created_at: ago(90) },
  ];

  const p = (business_id, name, price, section, description = '') => ({ id: uuid(), business_id, name, price, section, description, image_url: '', available: true, created_at: ago(60 * 24 * 8) });
  const products = [
    p(B.sabor, 'Bocachico frito', 18000, 'Platos', 'Con arroz de coco, patacón y ensalada'),
    p(B.sabor, 'Almuerzo corriente', 12000, 'Platos', 'Sopa, seco y jugo del día'),
    p(B.sabor, 'Sancocho de gallina', 15000, 'Platos', 'Solo domingos'),
    p(B.sabor, 'Jugo natural', 4000, 'Bebidas', 'Corozo, mango o maracuyá'),
    p(B.asadero, 'Pollo asado entero', 38000, 'Asados', 'Con yuca, papa y bollo'),
    p(B.asadero, '1/4 de pollo', 14000, 'Asados', 'Con yuca y bollo'),
    p(B.asadero, 'Picada para 2', 30000, 'Asados', 'Carne, chorizo, butifarra y patacón'),
    p(B.asadero, 'Gaseosa 1,5 L', 6000, 'Bebidas'),
    p(B.tienda, 'Arroz 1 lb', 2800, 'Granos'),
    p(B.tienda, 'Aceite 1 L', 9500, 'Despensa'),
    p(B.tienda, 'Huevos x 30', 17000, 'Despensa'),
    p(B.tienda, 'Jabón de barra', 2500, 'Aseo'),
    p(B.drogueria, 'Acetaminofén 500 mg x 10', 3500, 'Medicamentos de venta libre'),
    p(B.drogueria, 'Suero oral', 4200, 'Medicamentos de venta libre'),
    p(B.drogueria, 'Pañales etapa 3 x 30', 32000, 'Bebé'),
    p(B.deposito, 'Arroz bulto 50 kg', 210000, 'Granos', 'Precio mayorista'),
    p(B.deposito, 'Aceite caja x 12 L', 105000, 'Despensa', 'Precio mayorista'),
    p(B.deposito, 'Gaseosa paca x 12', 48000, 'Bebidas', 'Precio mayorista'),
  ];

  const posts = [
    { id: uuid(), business_id: null, author_id: U.admin, type: 'aviso', title: 'Bienvenidos a Loba Conecta', body: 'Ya puedes ver los negocios de Hatillo de Loba, sus menús y hacer pedidos desde el celular.', image_url: '', visible: true, created_at: ago(60 * 30) },
    { id: uuid(), business_id: B.sabor, author_id: U.sabor, type: 'menu', title: 'Menú del domingo: sancocho de gallina', body: 'Desde las 11 a. m. Pídelo con domicilio.', image_url: '', visible: true, created_at: ago(60 * 5) },
    { id: uuid(), business_id: B.tienda, author_id: U.tienda, type: 'promocion', title: 'Huevos x 30 a $17.000', body: 'Solo esta semana o hasta agotar existencias.', image_url: '', visible: true, created_at: ago(90) },
    { id: uuid(), business_id: B.drogueria, author_id: U.drogueria, type: 'servicio', title: 'Ahora tomamos la presión arterial', body: 'Servicio gratuito de lunes a viernes en la mañana.', image_url: '', visible: true, created_at: ago(40) },
  ];

  const sabor = products.filter((x) => x.business_id === B.sabor);
  const orders = [
    { id: uuid(), business_id: B.sabor, customer_id: U.cliente, items: [{ product_id: sabor[0].id, name: sabor[0].name, price: sabor[0].price, qty: 1 }, { product_id: sabor[3].id, name: sabor[3].name, price: sabor[3].price, qty: 2 }], total: 18000 + 8000 + 3000, delivery: true, address: 'Barrio Centro, casa azul', note: 'Sin cebolla', payment: 'efectivo', status: 'nuevo', created_at: ago(12) },
    { id: uuid(), business_id: B.sabor, customer_id: U.cliente, items: [{ product_id: sabor[1].id, name: sabor[1].name, price: sabor[1].price, qty: 2 }], total: 24000, delivery: false, address: '', note: '', payment: 'transferencia', status: 'entregado', created_at: ago(60 * 26) },
  ];

  return { users, categories, businesses, products, posts, orders, session: null, push: [] };
}

let db;
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* sin almacenamiento */ }
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sin almacenamiento */ } }
db = load();

// ---- tiempo real simulado ----
const listeners = { auth: new Set(), posts: new Set(), orders: new Set() };
const emit = (k, v) => listeners[k].forEach((fn) => { try { fn(v); } catch { /* */ } });

const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
const clone = (v) => JSON.parse(JSON.stringify(v));
const me = () => db.users.find((u) => u.id === db.session);
const isSuper = () => me()?.role === 'superadmin' && me()?.active;
const owns = (bid) => db.businesses.some((b) => b.id === bid && b.owner_id === db.session);
const approved = (bid) => db.businesses.some((b) => b.id === bid && b.status === 'aprobado');
const deny = () => { throw new Error('No tienes permiso para hacer esto.'); };
const needUser = () => { if (!me()) throw new Error('Debes iniciar sesión.'); };
const withCat = (b) => ({ ...b, category: db.categories.find((c) => c.id === b.category_id) || null });
const publicUser = (u) => { const { password: _p, ...rest } = u; return rest; };

export const api = {
  demo: true,
  resetDemo() { db = seed(); save(); emit('auth', null); },

  async getSession() { const u = me(); return delay(u ? { user: { id: u.id, email: u.email } } : null); },
  onAuthChange(cb) { listeners.auth.add(cb); return () => listeners.auth.delete(cb); },
  async signUp({ email, password, full_name, phone }) {
    email = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) throw new Error('Ese correo ya está registrado. Inicia sesión.');
    if (String(password).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const u = { id: uuid(), email, password, full_name, phone, role: 'cliente', active: true, created_at: now(), last_read_posts_at: now() };
    db.users.push(u); db.session = u.id; save();
    emit('auth', { user: { id: u.id, email } });
    return delay({ needsConfirmation: false });
  },
  async signIn({ email, password }) {
    const u = db.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('Correo o contraseña incorrectos.');
    if (!u.active) throw new Error('Tu cuenta está desactivada. Escribe al equipo de Loba Conecta.');
    db.session = u.id; save();
    emit('auth', { user: { id: u.id, email: u.email } });
    return delay();
  },
  async signOut() { db.session = null; save(); emit('auth', null); return delay(); },
  async resetPassword() { return delay(); },
  async updatePassword(password) { needUser(); me().password = password; save(); return delay(); },

  async getMyProfile() { const u = me(); return delay(u ? publicUser(clone(u)) : null); },
  async updateMyProfile({ full_name, phone }) { needUser(); Object.assign(me(), { full_name, phone }); save(); return delay(); },

  async listCategories() { return delay(clone(db.categories).sort((a, b) => a.sort - b.sort)); },
  async saveCategory(c) {
    if (!isSuper()) deny();
    if (c.id) Object.assign(db.categories.find((x) => x.id === c.id), { name: c.name, slug: c.slug, sort: Number(c.sort) || 99 });
    else db.categories.push({ id: Math.max(0, ...db.categories.map((x) => x.id)) + 1, name: c.name, slug: c.slug, sort: Number(c.sort) || 99 });
    save(); return delay();
  },

  async listBusinesses({ categoryId, q } = {}) {
    let list = db.businesses.filter((b) => b.status === 'aprobado');
    if (categoryId) list = list.filter((b) => b.category_id === Number(categoryId));
    if (q) list = list.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
    return delay(clone(list.map(withCat)).sort((a, b) => a.name.localeCompare(b.name)));
  },
  async getBusiness(id) {
    const b = db.businesses.find((x) => x.id === id);
    if (!b || (b.status !== 'aprobado' && b.owner_id !== db.session && !isSuper())) return delay(null);
    return delay(clone(withCat(b)));
  },
  async getMyBusiness() {
    const b = db.businesses.find((x) => x.owner_id === db.session);
    return delay(b ? clone(withCat(b)) : null);
  },
  async saveMyBusiness(data) {
    needUser();
    const row = {
      name: data.name, category_id: Number(data.category_id), description: data.description || '', whatsapp: data.whatsapp || '',
      address: data.address || '', hours: data.hours || '', logo_url: data.logo_url || '', delivery: !!data.delivery, delivery_fee: Number(data.delivery_fee) || 0,
    };
    if (data.id) {
      const b = db.businesses.find((x) => x.id === data.id);
      if (!b || (b.owner_id !== db.session && !isSuper())) deny();
      Object.assign(b, row); save(); return delay(clone(b));
    }
    const b = { ...row, id: uuid(), owner_id: db.session, status: 'pendiente', created_at: now() };
    db.businesses.push(b); save(); return delay(clone(b));
  },
  async adminListBusinesses() {
    if (!isSuper()) deny();
    return delay(clone(db.businesses.map((b) => {
      const o = db.users.find((u) => u.id === b.owner_id);
      return { ...withCat(b), owner: o ? { full_name: o.full_name, email: o.email, phone: o.phone } : null };
    })).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async adminSetBusinessStatus(id, status) {
    if (!isSuper()) deny();
    const b = db.businesses.find((x) => x.id === id); b.status = status;
    if (status === 'aprobado') { const o = db.users.find((u) => u.id === b.owner_id); if (o && o.role === 'cliente') o.role = 'negocio'; }
    save(); return delay();
  },

  async listProducts(businessId) {
    if (!approved(businessId) && !owns(businessId) && !isSuper()) return delay([]);
    return delay(clone(db.products.filter((p) => p.business_id === businessId))
      .sort((a, b) => (a.section || '').localeCompare(b.section || '') || a.name.localeCompare(b.name)));
  },
  async saveProduct(p) {
    if (!owns(p.business_id) && !isSuper()) deny();
    const row = { business_id: p.business_id, name: p.name, description: p.description || '', price: Number(p.price) || 0, image_url: p.image_url || '', section: p.section || 'General', available: p.available !== false };
    if (p.id) { const x = db.products.find((y) => y.id === p.id); Object.assign(x, row); save(); return delay(clone(x)); }
    const x = { ...row, id: uuid(), created_at: now() }; db.products.push(x); save(); return delay(clone(x));
  },
  async deleteProduct(id) {
    const x = db.products.find((y) => y.id === id);
    if (!x || (!owns(x.business_id) && !isSuper())) deny();
    db.products = db.products.filter((y) => y.id !== id); save(); return delay();
  },

  async listPosts({ limit = 50, businessId } = {}) {
    let list = db.posts.filter((p) => p.visible && (!p.business_id || approved(p.business_id)));
    if (businessId) list = list.filter((p) => p.business_id === businessId);
    list = list.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
    return delay(clone(list.map((p) => ({ ...p, business: p.business_id ? (({ id, name, logo_url }) => ({ id, name, logo_url }))(db.businesses.find((b) => b.id === p.business_id)) : null }))));
  },
  async listMyBusinessPosts(businessId) {
    if (!owns(businessId) && !isSuper()) deny();
    return delay(clone(db.posts.filter((p) => p.business_id === businessId)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async createPost(p) {
    needUser();
    if (p.business_id) { if (!(owns(p.business_id) && approved(p.business_id)) && !isSuper()) deny(); }
    else if (!isSuper()) throw new Error('Solo el equipo puede publicar avisos generales');
    const post = { id: uuid(), business_id: p.business_id || null, author_id: db.session, type: p.type, title: p.title, body: p.body || '', image_url: p.image_url || '', visible: true, created_at: now() };
    db.posts.push(post); save();
    const business = post.business_id ? (({ id, name, logo_url }) => ({ id, name, logo_url }))(db.businesses.find((b) => b.id === post.business_id)) : null;
    emit('posts', clone({ ...post, business }));
    const recipients = db.users.filter((u) => u.id !== db.session && u.active).length;
    return delay({ post: clone(post), push: { sent: recipients, demo: true } });
  },
  async adminListPosts() {
    if (!isSuper()) deny();
    return delay(clone(db.posts.map((p) => ({ ...p, business: p.business_id ? { name: db.businesses.find((b) => b.id === p.business_id)?.name } : null })))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async setPostVisible(id, visible) {
    const p = db.posts.find((x) => x.id === id);
    if (!p || (!isSuper() && !(p.business_id && owns(p.business_id)))) deny();
    p.visible = visible; save(); return delay();
  },
  async deletePost(id) {
    const p = db.posts.find((x) => x.id === id);
    if (!p || (!isSuper() && !(p.business_id && owns(p.business_id)))) deny();
    db.posts = db.posts.filter((x) => x.id !== id); save(); return delay();
  },
  async unreadCount() {
    const u = me(); if (!u) return 0;
    return db.posts.filter((p) => p.visible && (!p.business_id || approved(p.business_id)) && p.author_id !== u.id && p.created_at > u.last_read_posts_at).length;
  },
  async markRead() { const u = me(); if (u) { u.last_read_posts_at = now(); save(); } },
  onNewPost(cb) { listeners.posts.add(cb); return () => listeners.posts.delete(cb); },

  async createOrder(o) {
    needUser();
    const b = db.businesses.find((x) => x.id === o.business_id);
    if (!b || b.status !== 'aprobado') throw new Error('El negocio no está disponible para pedidos');
    if (!o.items?.length) throw new Error('El pedido no tiene productos');
    const items = o.items.map((it) => {
      const p = db.products.find((x) => x.id === it.product_id && x.business_id === b.id && x.available);
      if (!p) throw new Error('Un producto del pedido ya no está disponible');
      return { product_id: p.id, name: p.name, price: p.price, qty: Math.max(1, Math.min(99, Number(it.qty) || 1)) };
    });
    const delivery = !!o.delivery && b.delivery;
    const total = items.reduce((s, i) => s + i.price * i.qty, 0) + (delivery ? b.delivery_fee : 0);
    const order = { id: uuid(), business_id: b.id, customer_id: db.session, items, total, delivery, address: o.address || '', note: o.note || '', payment: o.payment || 'efectivo', status: 'nuevo', created_at: now() };
    db.orders.push(order); save();
    emit('orders', { eventType: 'INSERT', new: clone(order) });
    return delay(clone(order));
  },
  async listMyOrders() {
    needUser();
    return delay(clone(db.orders.filter((o) => o.customer_id === db.session).map((o) => {
      const b = db.businesses.find((x) => x.id === o.business_id);
      return { ...o, business: { id: b.id, name: b.name, whatsapp: b.whatsapp } };
    })).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async listBusinessOrders(businessId) {
    if (!owns(businessId) && !isSuper()) deny();
    return delay(clone(db.orders.filter((o) => o.business_id === businessId).map((o) => {
      const c = db.users.find((u) => u.id === o.customer_id);
      return { ...o, customer: c ? { full_name: c.full_name, phone: c.phone } : null };
    })).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async updateOrderStatus(id, status) {
    const o = db.orders.find((x) => x.id === id);
    if (!o || (!owns(o.business_id) && !isSuper())) deny();
    o.status = status; save();
    emit('orders', { eventType: 'UPDATE', new: clone(o) });
    return delay();
  },
  async cancelMyOrder(id) {
    const o = db.orders.find((x) => x.id === id);
    if (!o || o.customer_id !== db.session) deny();
    if (o.status !== 'nuevo') throw new Error('El pedido ya está en proceso; escribe al negocio para cancelarlo.');
    o.status = 'cancelado'; save();
    emit('orders', { eventType: 'UPDATE', new: clone(o) });
    return delay();
  },
  onOrdersChange(filter, cb) {
    const [col, , val] = String(filter || '').split(/=|\./);
    const fn = (payload) => { if (!col || payload.new?.[col] === val) cb(payload); };
    listeners.orders.add(fn); return () => listeners.orders.delete(fn);
  },

  async adminListUsers() {
    if (!isSuper()) deny();
    return delay(clone(db.users.map(publicUser)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async adminUpdateUser(id, changes) {
    if (!isSuper()) deny();
    const u = db.users.find((x) => x.id === id);
    if ('role' in changes) u.role = changes.role;
    if ('active' in changes) u.active = changes.active;
    save(); return delay();
  },
  async platformStats() {
    if (!isSuper()) deny();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return delay({
      usuarios: db.users.length,
      clientes: db.users.filter((u) => u.role === 'cliente').length,
      negocios_aprobados: db.businesses.filter((b) => b.status === 'aprobado').length,
      negocios_pendientes: db.businesses.filter((b) => b.status === 'pendiente').length,
      publicaciones: db.posts.length,
      pedidos: db.orders.length,
      pedidos_hoy: db.orders.filter((o) => new Date(o.created_at) >= today).length,
      ventas_entregadas: db.orders.filter((o) => o.status === 'entregado').reduce((s, o) => s + o.total, 0),
      suscritos_push: 0,
    });
  },

  async uploadImage(file) {
    if (file.size > 1.5 * 1024 * 1024) throw new Error('En el modo demo las imágenes deben pesar menos de 1,5 MB.');
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('No se pudo leer la imagen'));
      r.readAsDataURL(file);
    });
  },

  async savePushSubscription() { return delay(); },
  async deletePushSubscription() { return delay(); },
  async notify() { return { sent: 0, demo: true }; },
};
