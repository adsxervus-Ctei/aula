// ============================================================
// MESA Y RUTA · asistente del chat con inteligencia artificial
// Función en servidor (Supabase Edge Function). La llave del modelo
// queda guardada como secreto en el servidor, nunca en la app.
// Despliegue:
//   supabase functions deploy asistente --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Luego, en js/config.js: asistente.url = 'https://<proyecto>.functions.supabase.co/asistente'
// ============================================================
const CORS = {
  'Access-Control-Allow-Origin': '*',            // en producción: la dirección de su app
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MODELO = Deno.env.get('MODELO') ?? 'claude-haiku-5-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { pregunta, pedido, negocio, historial } = await req.json();
    if (!pregunta || String(pregunta).length > 500) return Response.json({ error: 'pregunta inválida' }, { status: 400, headers: CORS });
    const sistema = `Eres el asistente del chat de ${negocio?.nombre ?? 'un restaurante'} (${negocio?.direccion ?? ''}; horario: ${negocio?.horario ?? ''}).
Respondes en español de Colombia, con frases cortas y amables, SOLO sobre el pedido del cliente con estos datos:
${JSON.stringify(pedido)}
Reglas:
- Usa "minutosRestantes" para decir cuánto falta. No inventes tiempos, precios ni productos.
- Cambios, cancelaciones, reclamos o cualquier cosa que no puedas resolver con los datos: di que una persona del negocio responde por este chat y termina tu respuesta con la marca [PERSONA].
- No pidas datos de tarjetas ni claves. No hables de otros clientes.`;
    const mensajes = [...(historial ?? []).slice(-8).map((m: { de: string; texto: string }) => ({ role: m.de === 'cliente' ? 'user' : 'assistant', content: m.texto })), { role: 'user', content: pregunta }]
      .filter((m, i, a) => i === 0 || m.role !== a[i - 1].role);   // la API pide turnos alternos
    if (mensajes[0]?.role !== 'user') mensajes.shift();
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELO, max_tokens: 300, system: sistema, messages: mensajes }),
    });
    const j = await r.json();
    let texto: string = j?.content?.[0]?.text ?? '';
    const persona = texto.includes('[PERSONA]');
    texto = texto.replace('[PERSONA]', '').trim();
    if (!texto) throw new Error('sin respuesta');
    return Response.json({ respuesta: texto, persona }, { headers: CORS });
  } catch (_e) {
    return Response.json({ error: 'no disponible' }, { status: 502, headers: CORS });   // la app usa entonces el asistente local
  }
});
