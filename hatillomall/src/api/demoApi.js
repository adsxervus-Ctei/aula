// MODO DEMO: misma interfaz que supabaseApi.js; los datos viven en este navegador.
// Imita las reglas de la base de datos real (permisos, precios, comisión, historial).
import { bogotaDay, addDays, weekStart, uid as newId } from '../lib/format.js';
import { USER_DOMAIN } from '../config.js';

const KEY = 'hatillomall-demo-v1';
const now = () => new Date().toISOString();
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const atDay = (day, hh, mm = 0) => new Date(`${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-05:00`).toISOString();
const clone = (v) => JSON.parse(JSON.stringify(v));
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 90));

function seed() {
  const today = bogotaDay();
  const U = { equipo: 'u-equipo', juan: 'u-juan', cajero: 'u-cajero', carlos: 'u-carlos', maria: 'u-maria', tienda: 'u-tienda', drog: 'u-drog', depo: 'u-depo', arepas: 'u-arepas', papel: 'u-papel' };
  const mk = (id, email, full_name, phone, role, extra = {}) => ({ id, email, username: null, full_name, phone, role, active: true, accepts_marketing: true, created_at: ago(60 * 24 * 20), last_read_posts_at: ago(60 * 24 * 2), password: 'demo1234', ...extra });
  const users = [
    mk(U.equipo, 'equipo@hatillomall.co', 'Equipo HatilloMall', '3000000000', 'superadmin'),
    mk(U.juan, 'juan@demo.co', 'Juan Ríos', '3001112233', 'negocio'),
    mk(U.cajero, `rancho-cajero@${USER_DOMAIN}`, 'Pedro Cajero', '3009998877', 'cliente', { username: 'rancho-cajero' }),
    mk(U.carlos, 'cliente@demo.co', 'Carlos Pérez', '3104445566', 'cliente'),
    mk(U.maria, 'maria@demo.co', 'María Gómez', '3127778899', 'cliente'),
    mk(U.tienda, 'tienda@demo.co', 'Rosa Martínez', '3002223344', 'negocio'),
    mk(U.drog, 'drogueria@demo.co', 'Luis Carrascal', '3003334455', 'negocio'),
    mk(U.depo, 'deposito@demo.co', 'Alberto Barrios', '3004445566', 'negocio'),
    mk(U.arepas, 'arepas@demo.co', 'Doña Ana', '3005556677', 'negocio'),
    mk(U.papel, 'papeleria@demo.co', 'Jaime Ortiz', '3116665544', 'cliente'),
  ];
  const categories = [
    { id: 1, name: 'Restaurantes', slug: 'restaurantes', target: 29, sort: 1 },
    { id: 2, name: 'Comercio', slug: 'comercio', target: 39, sort: 2 },
    { id: 3, name: 'Farmacias', slug: 'farmacias', target: 3, sort: 3 },
    { id: 4, name: 'Depósitos', slug: 'depositos', target: 3, sort: 4 },
  ];
  const zn = ['Hatillo de Loba (cabecera)', 'La Victoria', 'San Miguel', 'Juana Sánchez', 'La Ribona', 'Las Brisas', 'Cerro de las Aguadas', 'Pueblo Nuevo', 'Gualí', 'El Pozón', 'Las Palmas'];
  const zones = zn.map((name, i) => ({ id: i + 1, name, kind: i === 0 ? 'cabecera' : 'corregimiento', default_fee: i === 0 ? 4000 : 8000, sort: i + 1 }));

  const B = { rancho: 'b-rancho', tienda: 'b-tienda', drog: 'b-drog', depo: 'b-depo', arepas: 'b-arepas', papel: 'b-papel' };
  const base = { logo_url: '', cover_url: '', breb_qr_url: '', created_at: ago(60 * 24 * 18), legal_name: '', id_number: '', notify_address: '', commission_rate: 0.1, table_hold_minutes: 15 };
  const plus15 = addDays(today, 12);
  const businesses = [
    { ...base, id: B.rancho, owner_id: U.juan, category_id: 1, name: 'Rancho Costeño', description: 'Asados de carne de res, cerdo y pollo a la brasa, con yuca, ensalada y bollo.', whatsapp: '3001112233', address: 'Calle Principal, frente al parque', hours: 'Todos los días · 11 a. m. – 9 p. m.', delivery: true, pickup: true, dine_in: true, prep_minutes: 25, breb_key: '@ranchocosteno', breb_holder: 'Juan Ríos', allow_fiado: true, legal_name: 'Juan Ríos', id_number: 'C.C. de ejemplo', notify_address: 'Calle Principal, Hatillo de Loba', plan: 'plus', plan_until: plus15, status: 'aprobado' },
    { ...base, id: B.tienda, owner_id: U.tienda, category_id: 2, name: 'Tienda La Esquina', description: 'Víveres, aseo, granos y gaseosas. Hacemos domicilio en el pueblo.', whatsapp: '3002223344', address: 'Barrio Centro', hours: 'Todos los días · 6 a. m. – 9 p. m.', delivery: true, pickup: true, dine_in: false, prep_minutes: 15, breb_key: '3002223344', breb_holder: 'Rosa Martínez', allow_fiado: true, plan: 'plus', plan_until: null, status: 'aprobado' },
    { ...base, id: B.drog, owner_id: U.drog, category_id: 3, name: 'Droguería San Rafael', description: 'Medicamentos de venta libre, cuidado personal y productos para bebé.', whatsapp: '3003334455', address: 'Calle del Comercio', hours: 'Lun a sáb · 7 a. m. – 9 p. m.', delivery: false, pickup: true, dine_in: false, prep_minutes: 10, breb_key: '', breb_holder: '', allow_fiado: false, plan: 'vitrina', plan_until: null, status: 'aprobado' },
    { ...base, id: B.depo, owner_id: U.depo, category_id: 4, name: 'Depósito El Puerto', description: 'Ventas al por mayor para tiendas y restaurantes: arroz, aceite, gaseosas por paca.', whatsapp: '3004445566', address: 'Salida al puerto', hours: 'Lun a sáb · 7 a. m. – 5 p. m.', delivery: true, pickup: true, dine_in: false, prep_minutes: 40, breb_key: '3004445566', breb_holder: 'Alberto Barrios', allow_fiado: true, plan: 'plus', plan_until: null, status: 'aprobado' },
    { ...base, id: B.arepas, owner_id: U.arepas, category_id: 1, name: 'Arepas Doña Ana', description: 'Arepa de huevo, carimañolas y empanadas desde las 5 de la mañana.', whatsapp: '3005556677', address: 'Barrio Nuevo', hours: 'Todos los días · 5 a. m. – 11 a. m.', delivery: false, pickup: true, dine_in: false, prep_minutes: 15, breb_key: '', breb_holder: '', allow_fiado: false, plan: 'vitrina', plan_until: null, status: 'aprobado' },
    { ...base, id: B.papel, owner_id: U.papel, category_id: 2, name: 'Papelería El Estudiante', description: 'Útiles escolares, fotocopias e impresiones.', whatsapp: '3116665544', address: 'Frente al colegio', hours: 'Lun a sáb · 7 a. m. – 6 p. m.', delivery: false, pickup: true, dine_in: false, prep_minutes: 20, breb_key: '', breb_holder: '', allow_fiado: false, plan: 'vitrina', plan_until: null, status: 'pendiente', created_at: ago(120) },
  ];
  const business_zones = [
    { business_id: B.rancho, zone_id: 1, fee: 4000 }, { business_id: B.rancho, zone_id: 2, fee: 8000 }, { business_id: B.rancho, zone_id: 3, fee: 8000 },
    { business_id: B.tienda, zone_id: 1, fee: 3000 },
    { business_id: B.depo, zone_id: 1, fee: 0 }, { business_id: B.depo, zone_id: 2, fee: 10000 }, { business_id: B.depo, zone_id: 3, fee: 10000 }, { business_id: B.depo, zone_id: 4, fee: 12000 },
  ];
  const staff = [{ id: 's-cajero', business_id: B.rancho, user_id: U.cajero, title: 'Cajero', active: true, created_at: ago(60 * 24 * 15) }];
  const P = (business_id, name, price, section, description = '') => ({ id: 'p-' + name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-'), business_id, name, price, section, description, image_url: '', available: true, created_at: ago(60 * 24 * 17) });
  const products = [
    P(B.rancho, 'Asado Especial', 25000, 'Asados', 'Carne de res asada, con yuca, ensalada y gaseosa'),
    P(B.rancho, 'Pollo asado (1/2)', 22000, 'Asados', 'Con papa, yuca y bollo'),
    P(B.rancho, 'Mojarra frita', 28000, 'Pescados', 'Con arroz de coco, patacón y ensalada'),
    P(B.rancho, 'Bandeja de cerdo', 24000, 'Asados', 'Costilla de cerdo, yuca y ensalada'),
    P(B.rancho, 'Porción de yuca', 4000, 'Acompañantes'),
    P(B.rancho, 'Gaseosa 400 ml', 3000, 'Bebidas'),
    P(B.rancho, 'Jugo natural', 4000, 'Bebidas', 'Corozo, mango o maracuyá'),
    P(B.tienda, 'Arroz 1 lb', 2800, 'Granos'), P(B.tienda, 'Aceite 1 L', 9500, 'Despensa'), P(B.tienda, 'Huevos x 30', 17000, 'Despensa'), P(B.tienda, 'Jabón de barra', 2500, 'Aseo'), P(B.tienda, 'Gaseosa 1,5 L', 6000, 'Bebidas'),
    P(B.drog, 'Acetaminofén 500 mg x 10', 3500, 'Venta libre'), P(B.drog, 'Suero oral', 4200, 'Venta libre'), P(B.drog, 'Pañales etapa 3 x 30', 32000, 'Bebé'),
    P(B.depo, 'Arroz bulto 50 kg', 210000, 'Granos', 'Precio mayorista'), P(B.depo, 'Aceite caja x 12 L', 105000, 'Despensa', 'Precio mayorista'), P(B.depo, 'Gaseosa paca x 12', 48000, 'Bebidas', 'Precio mayorista'),
    P(B.arepas, 'Arepa de huevo', 3000, 'Fritos'), P(B.arepas, 'Carimañola', 2500, 'Fritos'), P(B.arepas, 'Empanada', 1500, 'Fritos'),
  ];
  const prod = (n) => products.find((p) => p.name === n);
  const business_customers = [
    { id: 'c-carlos', business_id: B.rancho, customer_id: U.carlos, name: 'Carlos Pérez', phone: '3104445566', fiado_ok: false, blocked: false, note: '', created_at: ago(60 * 24 * 10) },
    { id: 'c-maria', business_id: B.rancho, customer_id: U.maria, name: 'María Gómez', phone: '3127778899', fiado_ok: true, blocked: false, note: 'Paga los viernes', created_at: ago(60 * 24 * 12) },
    { id: 'c-jose', business_id: B.rancho, customer_id: null, name: 'José (mototaxi)', phone: '3205550000', fiado_ok: true, blocked: false, note: '', created_at: ago(60 * 24 * 9) },
  ];

  // Historial de ejemplo de Rancho Costeño: 14 días de ventas y gastos
  const sales = [], expenses = [], fiado_moves = [], orders = [], order_messages = [], audit_log = [];
  let num = 120;
  const plates = ['Asado Especial', 'Asado Especial', 'Pollo asado (1/2)', 'Mojarra frita', 'Bandeja de cerdo', 'Asado Especial'];
  for (let d = 13; d >= 1; d--) {
    const day = addDays(today, -d);
    const dow = new Date(day + 'T12:00:00Z').getUTCDay();
    const n = dow === 6 ? 16 : dow === 0 ? 13 : 8 + (d % 4);
    for (let i = 0; i < n; i++) {
      const pl = prod(plates[(i + d) % plates.length]);
      const qty = 1 + ((i + d) % 3 === 0 ? 1 : 0);
      const isApp = i % 3 === 0;
      const method = i % 5 === 0 ? 'transferencia' : 'efectivo';
      const t = atDay(day, 11 + Math.floor(i * 9 / n), (i * 17) % 60);
      const items = [{ product_id: pl.id, name: pl.name, price: pl.price, qty }];
      let order_id = null;
      if (isApp) {
        const o = { id: newId(), number: num++, business_id: B.rancho, customer_id: i % 2 ? U.carlos : U.maria, mode: i % 2 ? 'domicilio' : 'recoger', zone_id: i % 2 ? 1 : null, address: i % 2 ? 'Barrio Centro' : '', people: null, reserve_at: null, items, subtotal: pl.price * qty, delivery_fee: i % 2 ? 4000 : 0, total: pl.price * qty + (i % 2 ? 4000 : 0), payment: method, proof_url: '', note: '', status: 'entregado', eta_minutes: null, commission_rate: 0.1, commission: Math.round(pl.price * qty * 0.1), accepted_at: t, delivered_at: t, created_at: t };
        orders.push(o); order_id = o.id;
      }
      sales.push({ id: newId(), business_id: B.rancho, order_id, source: isApp ? 'app' : 'local', concept: isApp ? `Pedido #${num - 1}` : pl.name, items, amount: pl.price * qty, method, customer_ref: null, occurred_at: t, created_by: isApp ? null : U.cajero, created_at: t, voided: false, voided_by: null, voided_at: null, void_reason: '' });
    }
    expenses.push({ id: newId(), business_id: B.rancho, concept: 'Carne de res', category: 'Insumos', amount: 70000 + (d % 3) * 10000, paid_cash: true, receipt_url: '', occurred_at: atDay(day, 8), created_by: U.juan, created_at: atDay(day, 8), voided: false, voided_by: null, voided_at: null, void_reason: '' });
    expenses.push({ id: newId(), business_id: B.rancho, concept: 'Yuca, verduras y gaseosas', category: 'Insumos', amount: 35000, paid_cash: true, receipt_url: '', occurred_at: atDay(day, 9), created_by: U.juan, created_at: atDay(day, 9), voided: false, voided_by: null, voided_at: null, void_reason: '' });
    if (dow === 6) expenses.push({ id: newId(), business_id: B.rancho, concept: 'Pago mesero semana', category: 'Nómina', amount: 180000, paid_cash: true, receipt_url: '', occurred_at: atDay(day, 20), created_by: U.juan, created_at: atDay(day, 20), voided: false, voided_by: null, voided_at: null, void_reason: '' });
  }
  // Hoy
  const asado = prod('Asado Especial');
  [['Mojarra frita', 'efectivo', 11, 20], ['Asado Especial', 'transferencia', 12, 5], ['Bandeja de cerdo', 'efectivo', 12, 40]].forEach(([n, m, h, mm]) => {
    const p = prod(n); const t = atDay(today, h, mm);
    if (new Date(t) < new Date()) sales.push({ id: newId(), business_id: B.rancho, order_id: null, source: 'local', concept: p.name, items: [{ product_id: p.id, name: p.name, price: p.price, qty: 1 }], amount: p.price, method: m, customer_ref: null, occurred_at: t, created_by: U.cajero, created_at: t, voided: false, voided_by: null, voided_at: null, void_reason: '' });
  });
  expenses.push({ id: newId(), business_id: B.rancho, concept: 'Carne de res', category: 'Insumos', amount: 80000, paid_cash: true, receipt_url: '', occurred_at: atDay(today, 7, 30) < now() ? atDay(today, 7, 30) : ago(30), created_by: U.juan, created_at: ago(30), voided: false, voided_by: null, voided_at: null, void_reason: '' });
  const sf = { id: newId(), business_id: B.rancho, order_id: null, source: 'local', concept: 'Almuerzo fiado', items: [{ name: 'Asado Especial', price: 25000, qty: 1 }], amount: 25000, method: 'fiado', customer_ref: 'c-maria', occurred_at: atDay(addDays(today, -3), 13), created_by: U.cajero, created_at: atDay(addDays(today, -3), 13), voided: false, voided_by: null, voided_at: null, void_reason: '' };
  sales.push(sf);
  fiado_moves.push({ id: newId(), business_id: B.rancho, customer_ref: 'c-maria', kind: 'cargo', amount: 25000, method: 'efectivo', note: 'Almuerzo fiado', sale_id: sf.id, created_by: U.cajero, created_at: sf.occurred_at });
  fiado_moves.push({ id: newId(), business_id: B.rancho, customer_ref: 'c-maria', kind: 'abono', amount: 10000, method: 'efectivo', note: 'Abono', sale_id: null, created_by: U.juan, created_at: atDay(addDays(today, -1), 18) });
  fiado_moves.push({ id: newId(), business_id: B.rancho, customer_ref: 'c-jose', kind: 'cargo', amount: 15000, method: 'efectivo', note: 'Mojarra fiada', sale_id: null, created_by: U.cajero, created_at: atDay(addDays(today, -5), 19) });

  // Pedido nuevo esperando respuesta (el del documento: Asado Especial a domicilio)
  const o1 = { id: 'o-demo-nuevo', number: num++, business_id: B.rancho, customer_id: U.carlos, mode: 'domicilio', zone_id: 1, address: 'Calle Principal, casa verde de dos pisos', people: null, reserve_at: null, items: [{ product_id: asado.id, name: asado.name, price: 25000, qty: 1, note: '' }], subtotal: 25000, delivery_fee: 4000, total: 29000, payment: 'efectivo', proof_url: '', note: 'Por favor con bastante yuca', status: 'nuevo', eta_minutes: null, commission_rate: 0.1, commission: 2500, accepted_at: null, delivered_at: null, created_at: ago(7) };
  orders.push(o1);
  order_messages.push({ id: newId(), order_id: o1.id, author_id: U.carlos, body: '¿Me le puede echar más yuca?', created_at: ago(6) });

  const inventory_items = [
    { id: 'i-carne', business_id: B.rancho, name: 'Carne de res', unit: 'kg', qty: 1.5, min_qty: 2, created_at: ago(60 * 24 * 15) },
    { id: 'i-mojarra', business_id: B.rancho, name: 'Mojarra', unit: 'unidades', qty: 12, min_qty: 4, created_at: ago(60 * 24 * 15) },
    { id: 'i-gaseosa', business_id: B.rancho, name: 'Gaseosa 400 ml', unit: 'unidades', qty: 18, min_qty: 12, created_at: ago(60 * 24 * 15) },
    { id: 'i-yuca', business_id: B.rancho, name: 'Yuca', unit: 'kg', qty: 9, min_qty: 3, created_at: ago(60 * 24 * 15) },
  ];
  const inventory_moves = inventory_items.map((it) => ({ id: newId(), item_id: it.id, business_id: B.rancho, delta: it.qty, reason: 'Cantidad inicial', created_by: U.juan, created_at: it.created_at }));
  const cash_closings = [1, 2].map((d) => ({ id: newId(), business_id: B.rancho, day: addDays(today, -d), expected_cash: 162000 - d * 4000, counted_cash: 162000 - d * 4000 - (d === 2 ? 5000 : 0), difference: d === 2 ? -5000 : 0, signed_by: 'Juan Ríos', note: d === 2 ? 'Faltaron $5.000, se revisa con el cajero' : '', created_by: U.juan, created_at: atDay(addDays(today, -d), 21) }));
  cash_closings.forEach((c) => { c.difference = c.counted_cash - c.expected_cash; });

  const posts = [
    { id: 'post-asado', business_id: B.rancho, author_id: U.juan, type: 'oferta', title: 'Asado Especial $25.000', body: 'Asado de carne de res, con yuca, ensalada y gaseosa. Listo en 25 minutos.', price: 25000, product_id: asado.id, image_url: '', visible: true, created_at: ago(90) },
    { id: 'post-huevos', business_id: B.tienda, author_id: U.tienda, type: 'oferta', title: 'Huevos x 30 a $17.000', body: 'Solo esta semana o hasta agotar existencias.', price: 17000, product_id: null, image_url: '', visible: true, created_at: ago(60 * 5) },
    { id: 'post-gaseosa', business_id: B.depo, author_id: U.depo, type: 'producto', title: 'Llegó gaseosa por paca', body: 'Paca x 12 a $48.000 para tiendas y restaurantes.', price: 48000, product_id: null, image_url: '', visible: true, created_at: ago(60 * 20) },
    { id: 'post-aviso', business_id: null, author_id: U.equipo, type: 'aviso', title: 'Bienvenidos a HatilloMall', body: 'Todos los negocios de Hatillo de Loba en una sola app. Pida a domicilio, aparte su mesa o pase a recoger.', price: null, product_id: null, image_url: '', visible: true, created_at: ago(60 * 30) },
  ];
  const boosts = [
    { id: 'boost-asado', business_id: B.rancho, post_id: 'post-asado', hours: 48, price: 15000, status: 'activo', starts_at: ago(80), ends_at: new Date(Date.now() + (48 * 60 - 80) * 60000).toISOString(), paid: true, requested_by: U.juan, approved_by: U.equipo, created_at: ago(85) },
    { id: 'boost-huevos', business_id: B.tienda, post_id: 'post-huevos', hours: 48, price: 15000, status: 'solicitado', starts_at: null, ends_at: null, paid: false, requested_by: U.tienda, approved_by: null, created_at: ago(60 * 4) },
  ];
  // Liquidación de la semana anterior (pendiente)
  const ws = weekStart(addDays(today, -7));
  const prevOrders = orders.filter((o) => o.status === 'entregado' && bogotaDay(o.delivered_at) >= ws && bogotaDay(o.delivered_at) <= addDays(ws, 6));
  const settlements = prevOrders.length ? [{ id: newId(), business_id: B.rancho, week_start: ws, week_end: addDays(ws, 6), orders_count: prevOrders.length, base_amount: prevOrders.reduce((s, o) => s + o.subtotal, 0), commission_amount: prevOrders.reduce((s, o) => s + o.commission, 0), status: 'pendiente', paid_at: null, paid_method: '', created_at: ago(60 * 24) }] : [];
  audit_log.push({ id: 1, business_id: B.rancho, actor_id: U.juan, actor_name: 'Juan Ríos', action: 'anuló', entity: 'sales', entity_id: 'x', detail: { void_reason: { ahora: 'Se anotó dos veces' }, amount: { ahora: 25000 } }, created_at: ago(60 * 26) });
  audit_log.push({ id: 2, business_id: B.rancho, actor_id: U.juan, actor_name: 'Juan Ríos', action: 'cambió', entity: 'products', entity_id: 'p', detail: { price: { antes: 23000, ahora: 25000 } }, created_at: ago(60 * 50) });

  return { users, categories, zones, businesses, business_zones, staff, products, business_customers, orders, order_messages, sales, expenses, fiado_moves, inventory_items, inventory_moves, cash_closings, audit_log, posts, boosts, settlements, session: null, nextOrder: num, nextAudit: 3 };
}

let db;
function load() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch { /* */ } return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* */ } }
db = load();

const L = { auth: new Set(), posts: new Set(), orders: new Set(), msgs: new Set() };
const emit = (k, v) => L[k].forEach((fn) => { try { fn(v); } catch { /* */ } });

const me = () => db.users.find((u) => u.id === db.session);
const isSuper = () => me()?.role === 'superadmin' && me()?.active;
const owns = (b) => db.businesses.some((x) => x.id === b && x.owner_id === db.session);
const worksAt = (b) => db.staff.some((s) => s.business_id === b && s.user_id === db.session && s.active) && me()?.active;
const member = (b) => owns(b) || worksAt(b);
const biz = (b) => db.businesses.find((x) => x.id === b);
const approved = (b) => biz(b)?.status === 'aprobado';
const hasPlus = (b) => { const x = biz(b); return !!x && x.plan === 'plus' && (!x.plan_until || x.plan_until >= bogotaDay()); };
const deny = (m = 'No tiene permiso para hacer esto.') => { throw new Error(m); };
const needUser = () => { if (!me()) deny('Debe iniciar sesión.'); };
const pub = (u) => { const { password: _p, ...r } = u; return r; };
const cat = (b) => db.categories.find((c) => c.id === b.category_id);
const withBiz = (b) => b && ({ ...b, category: cat(b), zones: db.business_zones.filter((z) => z.business_id === b.id).map((z) => { const zz = db.zones.find((x) => x.id === z.zone_id); return { zone_id: z.zone_id, fee: z.fee, name: zz?.name, kind: zz?.kind, sort: zz?.sort }; }).sort((a, c) => a.sort - c.sort) });
const day = (t) => bogotaDay(t);
function audit(bid, action, entity, entity_id, detail) {
  db.audit_log.push({ id: db.nextAudit++, business_id: bid, actor_id: db.session, actor_name: me()?.full_name || 'Sistema', action, entity, entity_id, detail, created_at: now() });
}
const bizLite = (id) => { const b = biz(id); return b ? { id: b.id, name: b.name, logo_url: b.logo_url, prep_minutes: b.prep_minutes } : null; };

export const api = {
  demo: true,
  resetDemo() { db = seed(); save(); emit('auth', null); },

  // ---------- Sesión ----------
  async getSession() { const u = me(); return delay(u ? { user: { id: u.id, email: u.email } } : null); },
  onAuthChange(cb) { L.auth.add(cb); return () => L.auth.delete(cb); },
  async signUp({ email, password, full_name, phone, accepts_marketing }) {
    email = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) deny('Ese correo ya está registrado. Entre con su clave.');
    if (String(password).length < 6) deny('La clave debe tener al menos 6 caracteres.');
    const u = { id: newId(), email, username: null, password, full_name, phone, role: 'cliente', active: true, accepts_marketing: !!accepts_marketing, created_at: now(), last_read_posts_at: now() };
    db.users.push(u); db.session = u.id; save(); emit('auth', { user: { id: u.id, email } });
    return delay({ needsConfirmation: false });
  },
  async signIn({ login, password }) {
    const l = String(login).trim().toLowerCase();
    const email = l.includes('@') ? l : `${l}@${USER_DOMAIN}`;
    const u = db.users.find((x) => x.email === email && x.password === password);
    if (!u) deny('Usuario, correo o clave incorrectos.');
    if (!u.active) deny('Esta cuenta está desactivada. Hable con el dueño del negocio o con el equipo.');
    db.session = u.id; save(); emit('auth', { user: { id: u.id, email: u.email } }); return delay();
  },
  async signOut() { db.session = null; save(); emit('auth', null); return delay(); },
  async resetPassword() { return delay(); },
  async updatePassword(pw) { needUser(); me().password = pw; save(); return delay(); },
  async getMyProfile() { const u = me(); return delay(u ? pub(clone(u)) : null); },
  async updateMyProfile(p) { needUser(); Object.assign(me(), { full_name: p.full_name, phone: p.phone, accepts_marketing: !!p.accepts_marketing }); save(); return delay(); },

  // ---------- Catálogos ----------
  async listCategories() { return delay(clone(db.categories).sort((a, b) => a.sort - b.sort)); },
  async listZones() { return delay(clone(db.zones).sort((a, b) => a.sort - b.sort)); },

  // ---------- Negocios ----------
  async listBusinesses({ categoryId, q } = {}) {
    let l = db.businesses.filter((b) => b.status === 'aprobado');
    if (categoryId) l = l.filter((b) => b.category_id === Number(categoryId));
    if (q) l = l.filter((b) => b.name.toLowerCase().includes(String(q).toLowerCase()));
    return delay(clone(l.map(withBiz)).sort((a, b) => a.name.localeCompare(b.name)));
  },
  async getBusiness(id) {
    const b = biz(id);
    if (!b || (b.status !== 'aprobado' && !member(id) && !isSuper())) return delay(null);
    return delay(clone(withBiz(b)));
  },
  async getMyWork() {
    if (!me()) return delay(null);
    const own = db.businesses.find((b) => b.owner_id === db.session);
    if (own) return delay({ role: 'owner', business: clone(withBiz(own)) });
    const st = db.staff.find((s) => s.user_id === db.session && s.active);
    if (st) return delay({ role: 'cajero', staff: clone(st), business: clone(withBiz(biz(st.business_id))) });
    return delay(null);
  },
  async saveMyBusiness(d) {
    needUser();
    const row = {
      name: d.name, category_id: Number(d.category_id), description: d.description || '', whatsapp: d.whatsapp || '', address: d.address || '', hours: d.hours || '',
      logo_url: d.logo_url || '', cover_url: d.cover_url || '', delivery: !!d.delivery, pickup: !!d.pickup, dine_in: !!d.dine_in, prep_minutes: Number(d.prep_minutes) || 25,
      table_hold_minutes: Number(d.table_hold_minutes) || 15, breb_key: d.breb_key || '', breb_holder: d.breb_holder || '', breb_qr_url: d.breb_qr_url || '', allow_fiado: !!d.allow_fiado,
      legal_name: d.legal_name || '', id_number: d.id_number || '', notify_address: d.notify_address || '',
    };
    if (d.id) {
      const b = biz(d.id); if (!b || (!owns(d.id) && !isSuper())) deny();
      Object.assign(b, row); save(); return delay(clone(b));
    }
    const b = { ...row, id: newId(), owner_id: db.session, status: 'pendiente', plan: 'vitrina', plan_until: null, commission_rate: 0.1, created_at: now() };
    db.businesses.push(b); save(); return delay(clone(b));
  },
  async saveBusinessZones(bid, rows) {
    if (!owns(bid) && !isSuper()) deny();
    db.business_zones = db.business_zones.filter((z) => z.business_id !== bid).concat(rows.map((r) => ({ business_id: bid, zone_id: Number(r.zone_id), fee: Number(r.fee) || 0 })));
    save(); return delay();
  },

  // ---------- Productos ----------
  async listProducts(bid) {
    if (!approved(bid) && !member(bid) && !isSuper()) return delay([]);
    return delay(clone(db.products.filter((p) => p.business_id === bid)).sort((a, b) => (a.section || '').localeCompare(b.section || '') || a.name.localeCompare(b.name)));
  },
  async saveProduct(p) {
    if (!owns(p.business_id) && !isSuper()) deny();
    const row = { business_id: p.business_id, name: p.name, description: p.description || '', price: Number(p.price) || 0, image_url: p.image_url || '', section: p.section || 'General', available: p.available !== false };
    if (p.id) {
      const x = db.products.find((y) => y.id === p.id);
      if (x.price !== row.price) audit(p.business_id, 'cambió', 'products', x.id, { name: { ahora: row.name }, price: { antes: x.price, ahora: row.price } });
      Object.assign(x, row); save(); return delay(clone(x));
    }
    const x = { ...row, id: newId(), created_at: now() }; db.products.push(x); audit(p.business_id, 'creó', 'products', x.id, { name: x.name, price: x.price }); save(); return delay(clone(x));
  },
  async deleteProduct(id) {
    const x = db.products.find((y) => y.id === id); if (!x || (!owns(x.business_id) && !isSuper())) deny();
    db.products = db.products.filter((y) => y.id !== id); audit(x.business_id, 'borró', 'products', id, { name: x.name, price: x.price }); save(); return delay();
  },

  // ---------- Ofertas ----------
  async listPosts({ limit = 40, businessId } = {}) {
    let l = db.posts.filter((p) => p.visible && (!p.business_id || approved(p.business_id)));
    if (businessId) l = l.filter((p) => p.business_id === businessId);
    return delay(clone(l.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit).map((p) => ({ ...p, business: p.business_id ? bizLite(p.business_id) : null }))));
  },
  async listFeatured() {
    const t = now();
    return delay(clone(db.boosts.filter((b) => b.status === 'activo' && b.ends_at > t && approved(b.business_id))
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at)).map((b) => ({ ...b, post: db.posts.find((p) => p.id === b.post_id), business: bizLite(b.business_id) }))));
  },
  async createPost(p) {
    needUser();
    if (p.business_id) { if (!isSuper() && !(owns(p.business_id) && approved(p.business_id))) deny(); if (!isSuper() && !hasPlus(p.business_id)) deny('Publicar ofertas es parte del plan PLUS'); }
    else if (!isSuper()) deny('Solo el equipo publica avisos generales');
    const post = { id: newId(), business_id: p.business_id || null, author_id: db.session, type: p.business_id && p.type === 'aviso' ? 'oferta' : p.type, title: p.title, body: p.body || '', price: p.price ? Number(p.price) : null, product_id: null, image_url: p.image_url || '', visible: true, created_at: now() };
    db.posts.push(post); save();
    emit('posts', clone({ ...post, business: post.business_id ? bizLite(post.business_id) : null }));
    return delay({ post: clone(post), push: { sent: db.users.filter((u) => u.id !== db.session && u.active).length, demo: true } });
  },
  async listMyPosts(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.posts.filter((p) => p.business_id === bid)).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
  async setPostVisible(id, visible) { const p = db.posts.find((x) => x.id === id); if (!p || (!isSuper() && !(p.business_id && owns(p.business_id)))) deny(); p.visible = visible; save(); return delay(); },
  async deletePost(id) { const p = db.posts.find((x) => x.id === id); if (!p || (!isSuper() && !(p.business_id && owns(p.business_id)))) deny(); db.posts = db.posts.filter((x) => x.id !== id); db.boosts = db.boosts.filter((b) => b.post_id !== id); save(); return delay(); },
  async requestBoost(bid, postId) {
    if (!owns(bid) && !isSuper()) deny(); if (!hasPlus(bid)) deny('El Impulso es para negocios con plan PLUS');
    if (!db.posts.some((p) => p.id === postId && p.business_id === bid)) deny('La oferta no es de este negocio');
    const b = { id: newId(), business_id: bid, post_id: postId, hours: 48, price: 15000, status: 'solicitado', starts_at: null, ends_at: null, paid: false, requested_by: db.session, approved_by: null, created_at: now() };
    db.boosts.push(b); audit(bid, 'creó', 'boosts', b.id, { status: 'solicitado', price: 15000 }); save(); return delay(clone(b));
  },
  async listMyBoosts(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.boosts.filter((b) => b.business_id === bid))); },
  async unreadCount() { const u = me(); if (!u) return 0; return db.posts.filter((p) => p.visible && (!p.business_id || approved(p.business_id)) && p.author_id !== u.id && p.created_at > u.last_read_posts_at).length; },
  async markRead() { const u = me(); if (u) { u.last_read_posts_at = now(); save(); } },
  onNewPost(cb) { L.posts.add(cb); return () => L.posts.delete(cb); },

  // ---------- Pedidos ----------
  async createOrder(o) {
    needUser();
    const b = biz(o.business_id);
    if (!b || b.status !== 'aprobado' || !hasPlus(b.id)) deny('Este negocio no recibe pedidos por la app. Escríbale por WhatsApp.');
    const cust = db.business_customers.find((c) => c.business_id === b.id && c.customer_id === db.session);
    if (cust?.blocked) deny('No es posible hacer pedidos a este negocio. Comuníquese con él.');
    if (!o.items?.length) deny('El pedido no tiene productos');
    const items = o.items.map((it) => {
      const p = db.products.find((x) => x.id === it.product_id && x.business_id === b.id && x.available);
      if (!p) deny('Un producto del pedido ya no está disponible');
      return { product_id: p.id, name: p.name, price: p.price, qty: Math.max(1, Math.min(99, Number(it.qty) || 1)), note: (it.note || '').slice(0, 120) };
    });
    let fee = 0, zone_id = null, address = '', people = null, reserve_at = null;
    if (o.mode === 'domicilio') {
      if (!b.delivery) deny('Este negocio no hace domicilios');
      const z = db.business_zones.find((x) => x.business_id === b.id && x.zone_id === Number(o.zone_id));
      if (!z) deny('El negocio no lleva domicilios a esa zona');
      if (String(o.address || '').trim().length < 5) deny('Escriba la dirección del domicilio');
      fee = z.fee; zone_id = z.zone_id; address = o.address.trim();
    } else if (o.mode === 'mesa') {
      if (!b.dine_in) deny('Este negocio no aparta mesa');
      const t = new Date(o.reserve_at).getTime();
      if (!o.reserve_at || t < Date.now() - 5 * 60000 || t > Date.now() + 7 * 864e5) deny('Elija una hora válida para la mesa (hasta 7 días)');
      people = Number(o.people) || 2; reserve_at = new Date(o.reserve_at).toISOString();
    } else if (!b.pickup) deny('Este negocio no tiene la opción de recoger');
    if (o.payment === 'fiado' && !(b.allow_fiado && cust?.fiado_ok)) deny('El fiado solo está disponible para clientes de confianza de este negocio');
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const order = { id: newId(), number: db.nextOrder++, business_id: b.id, customer_id: db.session, mode: o.mode, zone_id, address, people, reserve_at, items, subtotal, delivery_fee: fee, total: subtotal + fee, payment: o.payment, proof_url: '', note: o.note || '', status: 'nuevo', eta_minutes: null, commission_rate: b.commission_rate, commission: Math.round(subtotal * b.commission_rate), accepted_at: null, delivered_at: null, created_at: now() };
    if (o.proofFile && o.payment === 'transferencia') { try { order.proof_url = await this.uploadPrivate(b.id, o.proofFile); } catch { /* */ } }
    db.orders.push(order); save();
    emit('orders', { eventType: 'INSERT', new: clone(order) });
    return delay(clone(order));
  },
  async getOrder(id) {
    const o = db.orders.find((x) => x.id === id);
    if (!o || (o.customer_id !== db.session && !member(o.business_id) && !isSuper())) return delay(null);
    const b = biz(o.business_id); const c = db.users.find((u) => u.id === o.customer_id);
    return delay(clone({ ...o, business: { id: b.id, name: b.name, whatsapp: b.whatsapp, owner_id: b.owner_id, breb_key: b.breb_key, breb_holder: b.breb_holder, breb_qr_url: b.breb_qr_url, prep_minutes: b.prep_minutes, table_hold_minutes: b.table_hold_minutes, address: b.address },
      zone: o.zone_id ? { name: db.zones.find((z) => z.id === o.zone_id)?.name } : null, customer: c ? { full_name: c.full_name, phone: c.phone } : null }));
  },
  async listMyOrders() { needUser(); return delay(clone(db.orders.filter((o) => o.customer_id === db.session).map((o) => ({ ...o, business: { id: o.business_id, name: biz(o.business_id)?.name } }))).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
  async listBusinessOrders(bid) {
    if (!member(bid) && !isSuper()) deny();
    return delay(clone(db.orders.filter((o) => o.business_id === bid).map((o) => { const c = db.users.find((u) => u.id === o.customer_id); return { ...o, customer: c ? { full_name: c.full_name, phone: c.phone } : null, zone: o.zone_id ? { name: db.zones.find((z) => z.id === o.zone_id)?.name } : null }; })).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async updateOrderStatus(id, status, eta) {
    const o = db.orders.find((x) => x.id === id);
    if (!o || (!member(o.business_id) && !isSuper())) deny();
    if (['entregado', 'rechazado', 'cancelado'].includes(o.status)) deny('Este pedido ya está cerrado');
    const prev = o.status; o.status = status; if (eta) o.eta_minutes = Number(eta);
    if (status === 'aceptado') o.accepted_at = now();
    if (status === 'entregado') {
      o.delivered_at = now();
      let c = db.business_customers.find((x) => x.business_id === o.business_id && x.customer_id === o.customer_id);
      if (!c) { const u = db.users.find((x) => x.id === o.customer_id); c = { id: newId(), business_id: o.business_id, customer_id: o.customer_id, name: u?.full_name || 'Cliente', phone: u?.phone || '', fiado_ok: false, blocked: false, note: '', created_at: now() }; db.business_customers.push(c); }
      const s = { id: newId(), business_id: o.business_id, order_id: o.id, source: 'app', concept: `Pedido #${o.number}`, items: o.items, amount: o.subtotal, method: o.payment, customer_ref: c.id, occurred_at: now(), created_by: null, created_at: now(), voided: false, voided_by: null, voided_at: null, void_reason: '' };
      db.sales.push(s);
      if (o.payment === 'fiado') db.fiado_moves.push({ id: newId(), business_id: o.business_id, customer_ref: c.id, kind: 'cargo', amount: o.subtotal, method: 'efectivo', note: `Pedido #${o.number}`, sale_id: s.id, created_by: db.session, created_at: now() });
    }
    audit(o.business_id, 'cambió', 'orders', o.id, { status: { antes: prev, ahora: status }, number: { ahora: o.number } });
    save(); emit('orders', { eventType: 'UPDATE', new: clone(o) }); return delay();
  },
  async cancelMyOrder(id) {
    const o = db.orders.find((x) => x.id === id);
    if (!o || o.customer_id !== db.session) deny();
    if (o.status !== 'nuevo') deny('El negocio ya aceptó el pedido. Escríbale por el chat para cancelarlo.');
    o.status = 'cancelado'; save(); emit('orders', { eventType: 'UPDATE', new: clone(o) }); return delay();
  },
  async attachProof(orderId, bid, file) {
    const o = db.orders.find((x) => x.id === orderId); if (!o || o.customer_id !== db.session) deny();
    o.proof_url = await this.uploadPrivate(bid, file); save(); emit('orders', { eventType: 'UPDATE', new: clone(o) }); return o.proof_url;
  },
  async listMessages(orderId) { const o = db.orders.find((x) => x.id === orderId); if (!o || (o.customer_id !== db.session && !member(o.business_id) && !isSuper())) return delay([]); return delay(clone(db.order_messages.filter((m) => m.order_id === orderId)).sort((a, b) => a.created_at.localeCompare(b.created_at))); },
  async sendMessage(orderId, body) {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o || (o.customer_id !== db.session && !member(o.business_id))) deny();
    if (['entregado', 'rechazado', 'cancelado'].includes(o.status)) deny('El pedido ya está cerrado');
    const m = { id: newId(), order_id: orderId, author_id: db.session, body: String(body).slice(0, 500), created_at: now() };
    db.order_messages.push(m); save(); emit('msgs', clone(m)); return delay(clone(m));
  },
  onOrdersChange(filter, cb) {
    const [col, , val] = String(filter || '').split(/=|\./);
    const fn = (p) => { if (!col || p.new?.[col] === val) cb(p); };
    L.orders.add(fn); return () => L.orders.delete(fn);
  },
  onMessages(orderId, cb) { const fn = (m) => m.order_id === orderId && cb(m); L.msgs.add(fn); return () => L.msgs.delete(fn); },

  // ---------- Sistema del negocio ----------
  async dashboard(bid) {
    if (!owns(bid) && !isSuper()) deny();
    const d = bogotaDay(); const S = db.sales.filter((s) => s.business_id === bid && !s.voided && day(s.occurred_at) === d);
    const sum = (l) => l.reduce((t, x) => t + x.amount, 0);
    const ws = weekStart(d);
    return delay({
      dia: d, ventas: sum(S), ventas_efectivo: sum(S.filter((s) => s.method === 'efectivo')), ventas_transferencia: sum(S.filter((s) => s.method === 'transferencia')), ventas_fiado: sum(S.filter((s) => s.method === 'fiado')),
      gastos: sum(db.expenses.filter((e) => e.business_id === bid && !e.voided && day(e.occurred_at) === d)),
      abonos_efectivo: sum(db.fiado_moves.filter((m) => m.business_id === bid && m.kind === 'abono' && m.method === 'efectivo' && !m.sale_id && !m.note.startsWith('Reverso') && day(m.created_at) === d)),
      pedidos_app: db.orders.filter((o) => o.business_id === bid && day(o.created_at) === d && !['rechazado', 'cancelado'].includes(o.status)).length,
      pedidos_pendientes: db.orders.filter((o) => o.business_id === bid && ['nuevo', 'aceptado', 'preparando', 'listo', 'en_camino'].includes(o.status)).length,
      stock_bajo: db.inventory_items.filter((i) => i.business_id === bid && i.qty <= i.min_qty).length,
      fiado_total: db.fiado_moves.filter((m) => m.business_id === bid).reduce((t, m) => t + (m.kind === 'cargo' ? m.amount : -m.amount), 0),
      comision_semana: db.orders.filter((o) => o.business_id === bid && o.status === 'entregado' && day(o.delivered_at) >= ws).reduce((t, o) => t + o.commission, 0),
      cerrada: db.cash_closings.some((c) => c.business_id === bid && c.day === d),
    });
  },
  async balance(bid, d1, d2) {
    if (!owns(bid) && !isSuper()) deny();
    const S = db.sales.filter((s) => s.business_id === bid && !s.voided && day(s.occurred_at) >= d1 && day(s.occurred_at) <= d2);
    const E = db.expenses.filter((e) => e.business_id === bid && !e.voided && day(e.occurred_at) >= d1 && day(e.occurred_at) <= d2);
    const serie = []; for (let dd = d1; dd <= d2; dd = addDays(dd, 1)) serie.push({ dia: dd, ventas: S.filter((s) => day(s.occurred_at) === dd).reduce((t, s) => t + s.amount, 0), gastos: E.filter((e) => day(e.occurred_at) === dd).reduce((t, e) => t + e.amount, 0) });
    const prod = {}; S.forEach((s) => (s.items || []).forEach((i) => { prod[i.name] = (prod[i.name] || 0) + Number(i.qty || 1); }));
    const cats = {}; E.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
    const ent = S.reduce((t, s) => t + s.amount, 0), sal = E.reduce((t, e) => t + e.amount, 0);
    const best = serie.filter((x) => x.ventas > 0).sort((a, b) => b.ventas - a.ventas)[0] || null;
    return delay({ desde: d1, hasta: d2, entradas: ent, salidas: sal, ganancia: ent - sal, por_app: S.filter((s) => s.source === 'app').reduce((t, s) => t + s.amount, 0), serie, mejor_dia: best,
      mas_vendidos: Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad })),
      gastos_por_categoria: Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([categoria, total]) => ({ categoria, total })) });
  },
  async listSales(bid, { from, to } = {}) {
    if (!member(bid) && !isSuper()) deny();
    let l = db.sales.filter((s) => s.business_id === bid && (owns(bid) || isSuper() || s.created_by === db.session));
    if (from) l = l.filter((s) => s.occurred_at >= from); if (to) l = l.filter((s) => s.occurred_at < to);
    return delay(clone(l.map((s) => ({ ...s, customer: s.customer_ref ? { name: db.business_customers.find((c) => c.id === s.customer_ref)?.name } : null }))).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)));
  },
  async addSale(s) {
    if (!(member(s.business_id) && hasPlus(s.business_id)) && !isSuper()) deny();
    if (db.sales.some((x) => x.id === s.id)) return delay(); // ya estaba (reenvío de la cola)
    if (!(Number(s.amount) > 0)) deny('Escriba el valor de la venta');
    if (s.method === 'fiado' && !db.business_customers.some((c) => c.id === s.customer_ref && c.business_id === s.business_id)) deny('Para fiar, elija el cliente');
    let t = s.occurred_at || now(); const ms = new Date(t).getTime(); if (ms > Date.now() + 300000 || ms < Date.now() - 7 * 864e5) t = now();
    const row = { id: s.id || newId(), business_id: s.business_id, order_id: null, source: 'local', concept: s.concept || '', items: s.items || [], amount: Number(s.amount), method: s.method, customer_ref: s.customer_ref || null, occurred_at: t, created_by: db.session, created_at: now(), voided: false, voided_by: null, voided_at: null, void_reason: '' };
    db.sales.push(row);
    if (row.method === 'fiado') db.fiado_moves.push({ id: newId(), business_id: row.business_id, customer_ref: row.customer_ref, kind: 'cargo', amount: row.amount, method: 'efectivo', note: row.concept || 'Venta fiada', sale_id: row.id, created_by: db.session, created_at: now() });
    audit(row.business_id, 'creó', 'sales', row.id, { concept: row.concept, amount: row.amount, method: row.method });
    save(); return delay();
  },
  async voidSale(id, reason) {
    const s = db.sales.find((x) => x.id === id);
    if (!s || (!owns(s.business_id) && !isSuper())) deny('Solo el dueño puede anular ventas');
    if (s.voided) deny('Esta venta ya está anulada');
    if (String(reason || '').trim().length < 3) deny('Escriba el motivo de la anulación');
    Object.assign(s, { voided: true, voided_by: db.session, voided_at: now(), void_reason: reason.trim() });
    if (s.method === 'fiado' && s.customer_ref) db.fiado_moves.push({ id: newId(), business_id: s.business_id, customer_ref: s.customer_ref, kind: 'abono', amount: s.amount, method: 'efectivo', note: 'Reverso por venta anulada: ' + reason, sale_id: null, created_by: db.session, created_at: now() });
    audit(s.business_id, 'anuló', 'sales', s.id, { concept: { ahora: s.concept }, amount: { ahora: s.amount }, void_reason: { ahora: reason } });
    save(); return delay();
  },
  async listExpenses(bid, { from, to } = {}) {
    if (!owns(bid) && !isSuper()) deny();
    let l = db.expenses.filter((e) => e.business_id === bid); if (from) l = l.filter((e) => e.occurred_at >= from); if (to) l = l.filter((e) => e.occurred_at < to);
    return delay(clone(l).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)));
  },
  async addExpense(e) {
    if (!(owns(e.business_id) && hasPlus(e.business_id)) && !isSuper()) deny();
    if (db.expenses.some((x) => x.id === e.id)) return delay();
    if (!(Number(e.amount) > 0)) deny('Escriba el valor del gasto');
    let t = e.occurred_at || now(); const ms = new Date(t).getTime(); if (ms > Date.now() + 300000 || ms < Date.now() - 7 * 864e5) t = now();
    const row = { id: e.id || newId(), business_id: e.business_id, concept: e.concept, category: e.category || 'Insumos', amount: Number(e.amount), paid_cash: e.paid_cash !== false, receipt_url: e.receipt_url || '', occurred_at: t, created_by: db.session, created_at: now(), voided: false, voided_by: null, voided_at: null, void_reason: '' };
    db.expenses.push(row); audit(row.business_id, 'creó', 'expenses', row.id, { concept: row.concept, amount: row.amount }); save(); return delay();
  },
  async voidExpense(id, reason) {
    const e = db.expenses.find((x) => x.id === id); if (!e || (!owns(e.business_id) && !isSuper())) deny();
    if (e.voided) deny('Este gasto ya está anulado'); if (String(reason || '').trim().length < 3) deny('Escriba el motivo de la anulación');
    Object.assign(e, { voided: true, voided_by: db.session, voided_at: now(), void_reason: reason.trim() });
    audit(e.business_id, 'anuló', 'expenses', e.id, { concept: { ahora: e.concept }, amount: { ahora: e.amount }, void_reason: { ahora: reason } }); save(); return delay();
  },
  async cashPreview(bid) {
    if (!owns(bid) && !isSuper()) deny();
    const d = bogotaDay();
    const inc = db.sales.filter((s) => s.business_id === bid && !s.voided && s.method === 'efectivo' && day(s.occurred_at) === d).reduce((t, s) => t + s.amount, 0);
    const ab = db.fiado_moves.filter((m) => m.business_id === bid && m.kind === 'abono' && m.method === 'efectivo' && !m.sale_id && !m.note.startsWith('Reverso') && day(m.created_at) === d).reduce((t, m) => t + m.amount, 0);
    const out = db.expenses.filter((e) => e.business_id === bid && !e.voided && e.paid_cash && day(e.occurred_at) === d).reduce((t, e) => t + e.amount, 0);
    return delay(inc + ab - out);
  },
  async closeCash(bid, counted, signer, note) {
    if (!owns(bid) && !isSuper()) deny('Solo el dueño hace el cierre de caja');
    if (String(signer || '').trim().length < 3) deny('Escriba el nombre de quien firma');
    const d = bogotaDay(); if (db.cash_closings.some((c) => c.business_id === bid && c.day === d)) deny('La caja de hoy ya se cerró');
    const exp = await this.cashPreview(bid);
    const c = { id: newId(), business_id: bid, day: d, expected_cash: exp, counted_cash: Number(counted), difference: Number(counted) - exp, signed_by: signer.trim(), note: note || '', created_by: db.session, created_at: now() };
    db.cash_closings.push(c); audit(bid, 'creó', 'cash_closings', c.id, { expected_cash: exp, counted_cash: c.counted_cash, difference: c.difference, signed_by: c.signed_by }); save(); return delay(clone(c));
  },
  async listClosings(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.cash_closings.filter((c) => c.business_id === bid)).sort((a, b) => b.day.localeCompare(a.day))); },
  async listInventory(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.inventory_items.filter((i) => i.business_id === bid)).sort((a, b) => a.name.localeCompare(b.name))); },
  async saveInventoryItem(it) {
    if (!owns(it.business_id) && !isSuper()) deny();
    if (it.id) { const x = db.inventory_items.find((y) => y.id === it.id); Object.assign(x, { name: it.name, unit: it.unit, min_qty: Number(it.min_qty) || 0 }); save(); return delay(clone(x)); }
    const x = { id: newId(), business_id: it.business_id, name: it.name, unit: it.unit || 'unidades', qty: 0, min_qty: Number(it.min_qty) || 0, created_at: now() };
    db.inventory_items.push(x); save();
    if (Number(it.qty) > 0) await this.moveInventory(x.id, it.business_id, Number(it.qty), 'Cantidad inicial');
    return delay(clone(x));
  },
  async moveInventory(itemId, bid, delta, reason) {
    if (!owns(bid) && !isSuper()) deny();
    const it = db.inventory_items.find((x) => x.id === itemId && x.business_id === bid); if (!it) deny('Producto de inventario no válido');
    if (!Number(delta)) deny('Escriba la cantidad');
    it.qty = Math.round((Number(it.qty) + Number(delta)) * 100) / 100;
    const m = { id: newId(), item_id: itemId, business_id: bid, delta: Number(delta), reason, created_by: db.session, created_at: now() };
    db.inventory_moves.push(m); audit(bid, 'creó', 'inventory_moves', m.id, { item: it.name, delta: m.delta, reason }); save(); return delay();
  },
  async listCustomers(bid, { balances } = {}) {
    if (!member(bid) && !isSuper()) deny();
    const l = db.business_customers.filter((c) => c.business_id === bid);
    if (balances) {
      if (!owns(bid) && !isSuper()) deny();
      return delay(clone(l.map((c) => { const mv = db.fiado_moves.filter((m) => m.customer_ref === c.id); return { customer_ref: c.id, name: c.name, phone: c.phone, fiado_ok: c.fiado_ok, blocked: c.blocked, customer_id: c.customer_id, saldo: mv.reduce((t, m) => t + (m.kind === 'cargo' ? m.amount : -m.amount), 0), ultimo: mv.map((m) => m.created_at).sort().pop() || null }; })).sort((a, b) => b.saldo - a.saldo || a.name.localeCompare(b.name)));
    }
    return delay(clone(l.map((c) => ({ ...c, customer_ref: c.id }))).sort((a, b) => a.name.localeCompare(b.name)));
  },
  async saveCustomer(c) {
    if (!member(c.business_id) && !isSuper()) deny();
    if (c.id) { if (!owns(c.business_id) && !isSuper()) deny(); const x = db.business_customers.find((y) => y.id === c.id); Object.assign(x, { name: c.name, phone: c.phone || '', note: c.note || '' }); save(); return delay(clone(x)); }
    const x = { id: newId(), business_id: c.business_id, customer_id: null, name: c.name, phone: c.phone || '', fiado_ok: owns(c.business_id) ? !!c.fiado_ok : false, blocked: false, note: c.note || '', created_at: now() };
    db.business_customers.push(x); audit(c.business_id, 'creó', 'business_customers', x.id, { name: x.name }); save(); return delay(clone(x));
  },
  async setCustomerFlags(id, flags) {
    const x = db.business_customers.find((y) => y.id === id); if (!x || (!owns(x.business_id) && !isSuper())) deny();
    const det = {}; Object.keys(flags).forEach((k) => { det[k] = { antes: x[k], ahora: flags[k] }; });
    Object.assign(x, flags); audit(x.business_id, 'cambió', 'business_customers', x.id, { name: { ahora: x.name }, ...det }); save(); return delay();
  },
  async addAbono(bid, customerRef, amount, method, note) {
    if (!owns(bid) && !isSuper()) deny(); if (!(Number(amount) > 0)) deny('Escriba el valor del abono');
    const m = { id: newId(), business_id: bid, customer_ref: customerRef, kind: 'abono', amount: Number(amount), method, note: note || 'Abono', sale_id: null, created_by: db.session, created_at: now() };
    db.fiado_moves.push(m); audit(bid, 'creó', 'fiado_moves', m.id, { kind: 'abono', amount: m.amount, method }); save(); return delay();
  },
  async listFiadoMoves(customerRef) { const c = db.business_customers.find((x) => x.id === customerRef); if (!c || (!owns(c.business_id) && !isSuper())) deny(); return delay(clone(db.fiado_moves.filter((m) => m.customer_ref === customerRef)).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
  async listStaff(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.staff.filter((s) => s.business_id === bid).map((s) => { const u = db.users.find((x) => x.id === s.user_id); return { ...s, user: u ? { full_name: u.full_name, username: u.username, phone: u.phone } : null }; }))); },
  async createStaff({ business_id, username, full_name, password, title, phone }) {
    if (!owns(business_id) && !isSuper()) deny();
    const un = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(un)) deny('El usuario debe tener de 3 a 31 letras, números o guiones, sin espacios');
    if (String(full_name || '').trim().length < 3) deny('Escriba el nombre del empleado');
    if (String(password || '').length < 6) deny('La clave debe tener al menos 6 caracteres');
    if (db.users.some((u) => u.username === un)) deny('Ese usuario ya existe. Elija otro.');
    const u = { id: newId(), email: `${un}@${USER_DOMAIN}`, username: un, password, full_name: full_name.trim(), phone: phone || '', role: 'cliente', active: true, accepts_marketing: false, created_at: now(), last_read_posts_at: now() };
    db.users.push(u); const s = { id: newId(), business_id, user_id: u.id, title: title || 'Cajero', active: true, created_at: now() };
    db.staff.push(s); audit(business_id, 'creó', 'staff', s.id, { usuario: un, nombre: u.full_name }); save(); return delay({ ok: true, username: un });
  },
  async resetStaffPassword(staffId, password) {
    const s = db.staff.find((x) => x.id === staffId); if (!s || (!owns(s.business_id) && !isSuper())) deny();
    if (String(password || '').length < 6) deny('La clave debe tener al menos 6 caracteres');
    db.users.find((u) => u.id === s.user_id).password = password; save(); return delay({ ok: true });
  },
  async retireStaff(staffId) {
    const s = db.staff.find((x) => x.id === staffId); if (!s || (!owns(s.business_id) && !isSuper())) deny();
    s.active = false; db.users.find((u) => u.id === s.user_id).active = false;
    audit(s.business_id, 'cambió', 'staff', s.id, { active: { antes: true, ahora: false } }); save(); return delay({ ok: true });
  },
  async listAudit(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.audit_log.filter((a) => a.business_id === bid)).sort((a, b) => b.id - a.id)); },
  async listSettlements(bid) { if (!owns(bid) && !isSuper()) deny(); return delay(clone(db.settlements.filter((s) => s.business_id === bid)).sort((a, b) => b.week_start.localeCompare(a.week_start))); },

  // ---------- Equipo HatilloMall ----------
  async platformStats() {
    if (!isSuper()) deny();
    const m0 = bogotaDay().slice(0, 8) + '01'; const t = bogotaDay();
    const del = db.orders.filter((o) => o.status === 'entregado' && day(o.delivered_at) >= m0);
    return delay({
      usuarios: db.users.length, clientes: db.users.filter((u) => u.role === 'cliente').length,
      negocios_aprobados: db.businesses.filter((b) => b.status === 'aprobado').length, negocios_pendientes: db.businesses.filter((b) => b.status === 'pendiente').length,
      negocios_plus: db.businesses.filter((b) => b.status === 'aprobado' && hasPlus(b.id)).length,
      pedidos_hoy: db.orders.filter((o) => day(o.created_at) === t).length, pedidos_mes: db.orders.filter((o) => day(o.created_at) >= m0).length,
      ventas_app_mes: del.reduce((s, o) => s + o.subtotal, 0), comision_mes: del.reduce((s, o) => s + o.commission, 0),
      comision_por_cobrar: db.settlements.filter((s) => s.status === 'pendiente').reduce((x, s) => x + s.commission_amount, 0),
      impulsos_solicitados: db.boosts.filter((b) => b.status === 'solicitado').length,
      cobertura: db.categories.map((c) => ({ sector: c.name, meta: c.target, vinculados: db.businesses.filter((b) => b.category_id === c.id && b.status === 'aprobado').length })),
      suscritos_push: 0,
    });
  },
  async adminListBusinesses() {
    if (!isSuper()) deny();
    return delay(clone(db.businesses.map((b) => { const o = db.users.find((u) => u.id === b.owner_id); return { ...b, category: cat(b), owner: o ? { full_name: o.full_name, email: o.email, phone: o.phone } : null }; })).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async adminUpdateBusiness(id, ch) {
    if (!isSuper()) deny(); const b = biz(id);
    const det = {}; Object.keys(ch).forEach((k) => { det[k] = { antes: b[k], ahora: ch[k] }; });
    Object.assign(b, ch);
    if (ch.status === 'aprobado') { const o = db.users.find((u) => u.id === b.owner_id); if (o && o.role === 'cliente') o.role = 'negocio'; }
    audit(id, 'cambió', 'businesses', id, det); save(); return delay();
  },
  async adminListBoosts() { if (!isSuper()) deny(); return delay(clone(db.boosts.map((b) => ({ ...b, post: db.posts.find((p) => p.id === b.post_id), business: { name: biz(b.business_id)?.name, whatsapp: biz(b.business_id)?.whatsapp } }))).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
  async adminSetBoost(id, ch) {
    if (!isSuper()) deny(); const b = db.boosts.find((x) => x.id === id);
    if (ch.status === 'activo' && b.status !== 'activo') { b.starts_at = now(); b.ends_at = new Date(Date.now() + b.hours * 3600e3).toISOString(); b.approved_by = db.session; }
    Object.assign(b, ch); audit(b.business_id, 'cambió', 'boosts', id, { status: { ahora: b.status }, paid: { ahora: b.paid } }); save();
    if (ch.status === 'activo') { const p = db.posts.find((x) => x.id === b.post_id); emit('posts', clone({ ...p, id: p.id + '-impulso', business: bizLite(b.business_id), created_at: now() })); return delay({ sent: db.users.length - 1, demo: true }); }
    return delay(null);
  },
  async generateSettlements(week) {
    if (!isSuper()) deny(); const ws = weekStart(week), we = addDays(ws, 6); let n = 0;
    const by = {}; db.orders.filter((o) => o.status === 'entregado' && day(o.delivered_at) >= ws && day(o.delivered_at) <= we).forEach((o) => { (by[o.business_id] ||= []).push(o); });
    Object.entries(by).forEach(([bid, l]) => {
      const ex = db.settlements.find((s) => s.business_id === bid && s.week_start === ws);
      const vals = { orders_count: l.length, base_amount: l.reduce((t, o) => t + o.subtotal, 0), commission_amount: l.reduce((t, o) => t + o.commission, 0) };
      if (ex) { if (ex.status === 'pendiente') Object.assign(ex, vals); } else db.settlements.push({ id: newId(), business_id: bid, week_start: ws, week_end: we, ...vals, status: 'pendiente', paid_at: null, paid_method: '', created_at: now() });
      n++;
    });
    save(); return delay(n);
  },
  async adminListSettlements() { if (!isSuper()) deny(); return delay(clone(db.settlements.map((s) => ({ ...s, business: { name: biz(s.business_id)?.name, whatsapp: biz(s.business_id)?.whatsapp } }))).sort((a, b) => b.week_start.localeCompare(a.week_start))); },
  async markSettlementPaid(id, method) { if (!isSuper()) deny(); const s = db.settlements.find((x) => x.id === id); Object.assign(s, { status: 'pagado', paid_at: now(), paid_method: method }); audit(s.business_id, 'cambió', 'settlements', id, { status: { antes: 'pendiente', ahora: 'pagado' }, paid_method: { ahora: method } }); save(); return delay(); },
  async adminListUsers() { if (!isSuper()) deny(); return delay(clone(db.users.map(pub)).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
  async adminUpdateUser(id, ch) { if (!isSuper()) deny(); const u = db.users.find((x) => x.id === id); if ('role' in ch) u.role = ch.role; if ('active' in ch) u.active = ch.active; save(); return delay(); },
  async adminSaveZone(z) { if (!isSuper()) deny(); db.zones.find((x) => x.id === z.id).default_fee = Number(z.default_fee) || 0; save(); return delay(); },
  async adminListPosts() { if (!isSuper()) deny(); return delay(clone(db.posts.map((p) => ({ ...p, business: p.business_id ? { name: biz(p.business_id)?.name } : null }))).sort((a, b) => b.created_at.localeCompare(a.created_at))); },

  // ---------- Archivos ----------
  async uploadImage(file) {
    const { compressImage } = await import('../lib/media.js');
    const f = await compressImage(file, 700, 0.75);
    if (f.size > 900 * 1024) deny('En el modo demo la foto debe pesar menos de 900 KB.');
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('No se pudo leer la imagen')); r.readAsDataURL(f); });
  },
  async uploadPrivate(_bid, file) { return this.uploadImage(file); },
  async signedUrl(path) { return path || ''; },

  // ---------- Notificaciones ----------
  async savePushSubscription() { return delay(); },
  async deletePushSubscription() { return delay(); },
  async notify() { return { sent: 0, demo: true }; },
};
