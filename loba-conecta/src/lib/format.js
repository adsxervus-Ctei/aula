export const peso = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');

export function timeAgo(date) {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export const POST_TYPES = {
  menu: 'Nuevo menú',
  promocion: 'Promoción',
  servicio: 'Nuevo servicio',
  producto: 'Nuevo producto',
  aviso: 'Aviso',
};

export const ORDER_STATUS = {
  nuevo: 'Nuevo',
  aceptado: 'Aceptado',
  preparando: 'Preparando',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const NEXT_STATUS = {
  nuevo: ['aceptado', 'cancelado'],
  aceptado: ['preparando', 'cancelado'],
  preparando: ['enviado', 'entregado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

// Normaliza un celular colombiano para enlaces de WhatsApp (wa.me/57XXXXXXXXXX)
export function waNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10) return '57' + digits;
  return digits;
}

export function waLink(phone, text) {
  const n = waNumber(phone);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function orderText(order, business) {
  const lines = order.items.map((i) => `• ${i.qty} x ${i.name} — ${peso(i.price * i.qty)}`);
  return [
    `Hola ${business?.name || ''}, hice este pedido en Loba Conecta:`,
    ...lines,
    order.delivery ? `Domicilio a: ${order.address}` : 'Lo recojo en el local',
    order.note ? `Nota: ${order.note}` : '',
    `Pago: ${order.payment === 'transferencia' ? 'Transferencia (Nequi/Daviplata/Bre-B)' : 'Efectivo'}`,
    `Total: ${peso(order.total)}`,
  ].filter(Boolean).join('\n');
}

export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
