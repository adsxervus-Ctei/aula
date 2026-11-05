export const peso = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(Number(n) || 0)).toLocaleString('es-CO');

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
export const hora = (d) => new Date(d).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
export const fecha = (d) => new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
export const fechaHora = (d) => `${fecha(d)} · ${hora(d)}`;

// Día en Hatillo de Loba (UTC−5), sin depender de la zona del celular
export function bogotaDay(d = new Date()) {
  const t = new Date(new Date(d).getTime() - 5 * 3600e3);
  return t.toISOString().slice(0, 10);
}
export function addDays(day, n) {
  const t = new Date(day + 'T12:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
export function weekStart(day) {
  const t = new Date(day + 'T12:00:00Z');
  const dow = (t.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(day, -dow);
}
export const diaCorto = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
export const diaLargo = (day) => { const t = new Date(day + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); return t.charAt(0).toUpperCase() + t.slice(1); };

export const MODE = {
  domicilio: { label: 'Domicilio', short: 'Domicilio', icon: 'truck', help: 'Le llega a su casa' },
  mesa: { label: 'Voy a comer allá', short: 'Comer allá', icon: 'table', help: 'Le apartan la mesa' },
  recoger: { label: 'Paso a recoger', short: 'Recoger', icon: 'bag', help: 'Le avisan cuando esté listo' },
};
export const PAY = {
  efectivo: 'Efectivo al recibir',
  transferencia: 'Transferencia (Nequi, Daviplata, Bre-B)',
  fiado: 'Fiado registrado',
};
export const PAY_SHORT = { efectivo: 'Efectivo', transferencia: 'Transferencia', fiado: 'Fiado' };

export const STATUS = {
  nuevo: 'Pedido recibido',
  aceptado: 'Aceptado',
  preparando: 'Preparando',
  listo: 'Listo para recoger',
  en_camino: 'En camino',
  entregado: 'Entregado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};
export const STATUS_TONE = { nuevo: 'yellow', aceptado: 'blue', preparando: 'blue', listo: 'green', en_camino: 'blue', entregado: 'green', rechazado: 'red', cancelado: 'red' };
// Pasos que ve el cliente según la modalidad
export const STEPS = {
  domicilio: ['nuevo', 'aceptado', 'preparando', 'en_camino', 'entregado'],
  recoger: ['nuevo', 'aceptado', 'preparando', 'listo', 'entregado'],
  mesa: ['nuevo', 'aceptado', 'preparando', 'entregado'],
};
// Siguiente acción del negocio
export function nextActions(o) {
  const fin = o.mode === 'domicilio' ? 'en_camino' : o.mode === 'recoger' ? 'listo' : 'entregado';
  switch (o.status) {
    case 'nuevo': return [['aceptado', 'ACEPTAR'], ['rechazado', 'RECHAZAR']];
    case 'aceptado': return [['preparando', 'Empezar a preparar']];
    case 'preparando': return fin === 'entregado' ? [['entregado', 'Servido y pagado']] : [[fin, o.mode === 'domicilio' ? 'Salió el domicilio' : 'Está listo']];
    case 'listo': case 'en_camino': return [['entregado', 'Entregado y pagado']];
    default: return [];
  }
}
export const isOpen = (o) => !['entregado', 'rechazado', 'cancelado'].includes(o.status);

export const POST_TYPES = { oferta: 'Oferta', menu: 'Menú nuevo', producto: 'Producto nuevo', servicio: 'Servicio nuevo', aviso: 'Aviso' };
export const GASTO_CATS = ['Insumos', 'Nómina', 'Servicios (luz, agua, gas)', 'Arriendo', 'Transporte', 'Mantenimiento', 'Otros'];

export function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('57') && d.length === 12) return d;
  if (d.length === 10) return '57' + d;
  return d;
}
export const waLink = (phone, text) => (waNumber(phone) ? `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}` : '');
export const telLink = (phone) => (String(phone || '').replace(/\D/g, '') ? `tel:+${waNumber(phone)}` : '');

export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
}));

// Planes y horario de mensajes (Ley 2300 de 2023: lun–vie 7 a. m.–7 p. m., sáb 8 a. m.–3 p. m., sin domingos ni festivos)
export function horarioPermitido(d = new Date()) {
  const t = new Date(d.getTime() - 5 * 3600e3);
  const dow = t.getUTCDay(), h = t.getUTCHours();
  if (dow === 0) return false;
  if (dow === 6) return h >= 8 && h < 15;
  return h >= 7 && h < 19;
}

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';

export function planVigente(b) {
  if (!b || b.plan !== 'plus') return false;
  return !b.plan_until || b.plan_until >= bogotaDay();
}
export function diasPlan(b) {
  if (!b?.plan_until) return null;
  return Math.round((new Date(b.plan_until + 'T12:00:00Z') - new Date(bogotaDay() + 'T12:00:00Z')) / 864e5);
}
