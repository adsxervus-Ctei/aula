// Lainec · Canal WhatsApp (Fase 3, OPCIONAL, NO ACTIVO)
// Requiere la API de WhatsApp Business (Cloud API de Meta): tiene costo por conversación,
// plantillas aprobadas y verificación del negocio. Por eso aquí solo queda la interfaz.
//
// Para activarlo en el futuro:
//   1. Crear la app en developers.facebook.com, agregar WhatsApp y verificar el número.
//   2. Aprobar una plantilla, por ejemplo "nueva_oferta_domicilio" con variables {{1}} valor y {{2}} negocio.
//   3. Definir WHATSAPP_TOKEN y WHATSAPP_NUMERO_ID en el entorno.
//   4. Implementar enviar() con un POST a https://graph.facebook.com/v20.0/{NUMERO_ID}/messages.
// El despachador (notificaciones.mjs) ya llama a este adaptador; mientras no esté activo, no hace nada.

export const whatsappActivo = () => false;

export async function enviarWhatsApp({ telefono, plantilla, variables }) {
  void telefono; void plantilla; void variables;
  return { ok: false, motivo: 'WhatsApp no está configurado (fase 3)' };
}
