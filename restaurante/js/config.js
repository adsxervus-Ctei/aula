/* ============================================================
   MESA Y RUTA · configuración del negocio
   Este es el ÚNICO archivo que el negocio necesita editar.
   Después de cambiarlo, suba la versión en sw.js (VERSION).
   ============================================================ */
window.CONFIG = {
  negocio: {
    nombre: 'Fogón del Río',               // nombre de ejemplo (ficticio)
    lema: 'Asadero · comidas rápidas',
    ciudad: 'Mompox, Bolívar',
    direccion: 'Calle de la Albarrada (dirección de ejemplo)',
    // Punto de salida de los domicilios. Para obtenerlo: Google Maps o
    // OpenStreetMap → clic derecho sobre el negocio → copiar coordenadas.
    lat: 9.24195,
    lng: -74.42680,
    // WhatsApp del negocio: 10 dígitos, sin +57 ni espacios. Vacío = no configurado.
    whatsapp: '',
    horario: 'Todos los días · 11:00 a. m. a 10:00 p. m.',
    prefijoPedido: 'FR'                    // los pedidos salen FR-1024-0001…
  },

  // ¿Cuándo se considera que la persona está EN el local?
  local: {
    radioMetros: 120,                      // a menos de esto, la app propone «Comer aquí»
    mesas: 12                              // para los códigos QR del panel
  },

  domicilio: {
    activo: true,
    base: 3000,                            // valor fijo en pesos
    porKm: 1200,                           // + por cada kilómetro de ruta
    minimo: 4000,
    maxKm: 8,                              // más lejos: solo «Recoger»
    gratisDesde: 90000,                    // pedido desde este valor: domicilio gratis (0 = nunca)
    minutosPorKm: 4                        // para estimar el tiempo si no hay ruta
  },

  empaquePorPlato: 1000,                   // se cobra en domicilio y para recoger

  pagos: {
    efectivo: true,
    transferencia: {
      activa: true,
      // Llave Bre-B del negocio (celular, correo, cédula o alfanumérica) y/o Nequi / Daviplata.
      llaveBreB: '',
      nequi: '',
      daviplata: '',
      titular: ''
    },
    datafonoEnLocal: true,                 // tarjeta con datáfono en mesa o caja
    datafonoContraEntrega: true,           // el domiciliario lleva datáfono
    // Pago en línea con tarjeta: requiere pasarela (Wompi, Mercado Pago, ePayco)
    // y una función en servidor para firmar el pago. Ver docs/GUIA_DESPLIEGUE.md.
    pasarelaEnLinea: false
  },

  // Base de datos gratuita para que pedidos y chat lleguen al panel desde
  // cualquier teléfono. Vacío = MODO DEMO (todo queda en este navegador).
  supabase: {
    url: '',                               // https://xxxx.supabase.co
    llave: ''                              // publishable key (sb_publishable_…)
  },

  panel: {
    // Clave del panel del negocio en MODO DEMO: FOGON-2026 (cámbiela).
    // Se guarda solo la huella: sha256('MYR|' + clave).
    claveHash: '7c8f877fa86c5c30937aa719080827309c4de6907c25740e48f5fca98dd78fe3'
  },

  servicios: {
    rutas: 'https://router.project-osrm.org',          // OSRM (servidor demostrativo)
    direcciones: 'https://nominatim.openstreetmap.org', // búsqueda de direcciones
    mosaicos: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  }
};
