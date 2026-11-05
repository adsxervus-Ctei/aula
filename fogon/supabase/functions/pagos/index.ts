// ============================================================
// MESA Y RUTA · pagos en línea con Wompi (Nequi, Daviplata, PSE, tarjeta, Bancolombia)
// Función en servidor (Supabase Edge Function). Hace dos cosas:
//  1) «firma»: arma el pago de un pedido (referencia, valor exacto y firma de integridad)
//     para abrir el checkout de Wompi. Con Nequi, al cliente le llega la notificación
//     a su app con el valor; con Daviplata, un código por mensaje de texto.
//  2) «evento»: recibe el aviso de Wompi cuando el pago se aprueba, revisa la firma del
//     evento y marca el pedido como PAGADO. Así la venta entra sola al balance.
// Despliegue (Supabase → Edge Functions → Deploy a new function → Via Editor):
//   nombre: pagos · pegue este archivo · apague «Verify JWT» (Wompi no manda sesión)
// Secretos (Edge Functions → Secrets):
//   WOMPI_LLAVE_PUBLICA = pub_prod_...        (comercios.wompi.co → Desarrolladores)
//   WOMPI_INTEGRIDAD    = prod_integrity_...  (Desarrolladores → Secretos para integración técnica)
//   WOMPI_EVENTOS       = prod_events_...     (mismo lugar)
//   WOMPI_PRUEBAS       = 1                    (opcional: usar el ambiente de pruebas)
// En Wompi → Desarrolladores → «URL de eventos»: https://<proyecto>.functions.supabase.co/pagos
// En la app: Admin → QR y ajustes → «Función de pagos en línea»: la misma dirección.
// ============================================================
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SB = Deno.env.get('SUPABASE_URL')!;
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: CORS });

async function sha256(t: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function db(ruta: string, op: RequestInit = {}) {
  const r = await fetch(`${SB}/rest/v1/${ruta}`, { ...op, headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(op.headers ?? {}) } });
  if (!r.ok) throw new Error(`base de datos: ${r.status} ${await r.text()}`);
  return r.status === 204 ? [] : r.json();
}
async function usuario(token: string) {
  const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: ANON || SERVICIO, Authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}
async function esPersonal(uid: string) {
  const f = await db(`perfiles?user_id=eq.${uid}&inactivo=eq.false&select=rol,permisos`);
  return f.length && (['admin', 'superadmin'].includes(f[0].rol) || (f[0].permisos ?? []).includes('pedidos.pago'));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const cuerpo = await req.json();

    // ---------- 2) evento de Wompi: pago aprobado → pedido pagado
    if (cuerpo.event) {
      const sig = cuerpo.signature ?? {}, datos = cuerpo.data ?? {};
      const valor = (ruta: string) => ruta.split('.').reduce((o: any, k: string) => (o == null ? o : o[k]), datos);
      const cadena = (sig.properties ?? []).map((p: string) => String(valor(p) ?? '')).join('') + String(cuerpo.timestamp ?? '') + (Deno.env.get('WOMPI_EVENTOS') ?? '');
      if (!sig.checksum || (await sha256(cadena)).toLowerCase() !== String(sig.checksum).toLowerCase()) return json({ ok: false, motivo: 'firma inválida' }, 200);
      const tx = datos.transaction;
      if (cuerpo.event !== 'transaction.updated' || !tx?.reference) return json({ ok: true });
      const [fila] = await db(`registros?coleccion=eq.pedidos&datos->pago->>referencia=eq.${encodeURIComponent(tx.reference)}&select=id,datos`);
      if (!fila) return json({ ok: true, motivo: 'pedido no encontrado' });
      const p = fila.datos, esperado = Math.round(p.totales.total) * 100;
      const pago = { ...p.pago, wompi: { id: tx.id, estado: tx.status, metodo: tx.payment_method_type ?? '', en: new Date().toISOString() } };
      if (tx.status === 'APPROVED' && Number(tx.amount_in_cents) === esperado && p.pago?.estado !== 'pagado') {
        Object.assign(pago, { estado: 'pagado', pagadoEn: new Date().toISOString(), cobradoPor: 'Pago en línea (Wompi)' });
      }
      const ahora = new Date().toISOString();
      await db(`registros?coleccion=eq.pedidos&id=eq.${encodeURIComponent(fila.id)}`, { method: 'PATCH', body: JSON.stringify({ datos: { ...p, pago, actualizado: ahora }, actualizado: ahora }) });
      if (pago.estado === 'pagado' && p.pago?.estado !== 'pagado') {
        const id = crypto.randomUUID();
        await db('registros', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ coleccion: 'mensajes', id, autor: null, datos: { id, pedido: fila.id, de: 'sistema', texto: `Pago en línea aprobado por ${(Number(tx.amount_in_cents) / 100).toLocaleString('es-CO')} pesos. ¡Gracias!`, creado: ahora, actualizado: ahora } }) });
      }
      return json({ ok: true });
    }

    // ---------- 1) firma: arma el pago de un pedido
    if (cuerpo.accion === 'firma') {
      const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
      const u = token && await usuario(token);
      if (!u?.id) return json({ error: 'Inicie sesión para pagar.' }, 401);
      const [fila] = await db(`registros?coleccion=eq.pedidos&id=eq.${encodeURIComponent(cuerpo.pedido)}&select=id,autor,datos`);
      if (!fila) return json({ error: 'No encontramos el pedido.' }, 404);
      if (fila.autor !== u.id && !(await esPersonal(u.id))) return json({ error: 'Ese pedido no es suyo.' }, 403);
      const p = fila.datos;
      if (p.pago?.estado === 'pagado') return json({ error: 'Este pedido ya está pagado.' }, 409);
      if (p.estado === 'cancelado') return json({ error: 'El pedido está cancelado.' }, 409);
      const llave = Deno.env.get('WOMPI_LLAVE_PUBLICA'), integridad = Deno.env.get('WOMPI_INTEGRIDAD');
      if (!llave || !integridad) return json({ error: 'El pago en línea no está configurado.' }, 503);
      const centavos = Math.round(p.totales.total) * 100, referencia = `${p.codigo}-${Date.now().toString(36).toUpperCase()}`;
      const firma = await sha256(`${referencia}${centavos}COP${integridad}`);
      const ahora = new Date().toISOString();
      const pago = { ...p.pago, referencia, referencias: [...(p.pago?.referencias ?? []), referencia].slice(-10) };
      await db(`registros?coleccion=eq.pedidos&id=eq.${encodeURIComponent(fila.id)}`, { method: 'PATCH', body: JSON.stringify({ datos: { ...p, pago, actualizado: ahora }, actualizado: ahora }) });
      const pruebas = Deno.env.get('WOMPI_PRUEBAS') === '1';
      return json({ checkout: 'https://checkout.wompi.co/p/', llavePublica: llave, referencia, centavos, moneda: 'COP', firma, pruebas });
    }
    return json({ error: 'acción desconocida' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'No se pudo procesar el pago.' }, 500);
  }
});
