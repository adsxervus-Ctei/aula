/* ============================================================
   MESA Y RUTA · configuración del negocio (Hatillo de Loba)
   Es el ÚNICO archivo de código que el negocio necesita editar.
   El menú, las fotos, la publicidad, los empleados y los precios
   se cambian desde el panel del negocio, sin tocar código.
   Después de cambiar este archivo, suba VERSION en sw.js.
   ============================================================ */
window.CONFIG = {
  negocio: {
    id: 'fogon-del-rio',
    nombre: 'Fogón del Río',                  // nombre de ejemplo (ficticio)
    lema: 'Asadero · comida costeña · comidas rápidas',
    municipio: 'Hatillo de Loba, Bolívar',
    direccion: 'Cl. 7 #8-2, Hatillo de Loba, Bolívar',
    // Punto de salida de los domicilios. Ajuste a la puerta del negocio:
    // Google Maps → clic derecho sobre el local → copiar coordenadas.  
     
    lat: 8.957648102800887,
    lng: -74.07715808167755,
    whatsapp: '3004693145',                   // 10 dígitos, sin +57 (también se cambia en Admin → Ajustes)
    telefono: '',
    nit: '',                                  // si el negocio lo tiene, sale en el ticket
    horario: 'Todos los días · 11:00 a. m. a 10:00 p. m.',
    prefijoPedido: 'FR',
    politicas: [
      'Precios en pesos colombianos con impuestos incluidos.',
      'Este ticket es un comprobante de pedido y no reemplaza la factura electrónica de venta.',
      'Por tratarse de alimentos perecederos no aplica el derecho de retracto (Ley 1480 de 2011, art. 47).',
      'Reclamos y cambios: por el chat de la app o en caja, el mismo día del pedido.',
      'Sus datos se tratan según la Ley 1581 de 2012; puede consultarlos o borrarlos desde su perfil.'
    ]
  },

  local: { radioMetros: 120, mesas: 12 },

  domicilio: {
    activo: true,
    base: 2000, porKm: 1000, minimo: 3000,
    maxKm: 6,
    gratisDesde: 80000,                       // 0 = nunca gratis
    minutosPorKm: 4,
    minutosPreparacion: 20
  },

  empaquePorPlato: 1000,

  pagos: {
    efectivo: true,
    transferencia: { activa: true, llaveBreB: '', nequi: '', daviplata: '', titular: '', qrBreB: '' },
    // Enlace de pago en línea de su pasarela (Wompi, Bold, Mercado Pago, ePayco…). Vacío = no se muestra.
    // También se cambia en Admin → QR y ajustes.
    enlacePago: '',
    datafonoEnLocal: true,
    datafonoContraEntrega: true,
    pasarelaEnLinea: false                    // requiere pasarela + función en servidor (ver guía)
  },

  reservas: {
    activa: true,
    apertura: '11:00', cierre: '21:00', intervaloMin: 60,
    capacidadPorTurno: 30, anticipacionDias: 30, maxPersonas: 40
  },

  // Inicio de sesión con Google: cree un «ID de cliente OAuth» tipo Web en
  // Google Cloud y péguelo aquí. Vacío = el botón pide el correo de Gmail.
  google: { clientId: '893450739343-8mdd9qktkcei0eea3eim1u49e9fd00ce.apps.googleusercontent.com' },

  // Base de datos en la nube (Supabase). Vacío = MODO DEMO en este navegador.
  supabase: { url: 'https://qlsoktatjhaihagozzrg.supabase.co', llave: 'sb_publishable_yu69Jk-hZ8CVAwckDDNfYA_El4Xkym2' },

  // Asistente del chat con inteligencia artificial (opcional): dirección de la
  // función en servidor (supabase/functions/asistente). Vacío = asistente local.
  asistente: { url: '' },

  // Cuentas iniciales del MODO DEMO (cámbielas). Solo se guarda la huella:
  // sha256('MYR-U|' + correo + '|' + clave)
  cuentasIniciales: [
    { rol: 'superadmin', nombre: 'Equipo Mesa y Ruta', correo: 'super@mesayruta.co',
      claveHash: '006ead6903a2e5bb63150efd32b247f507bfe76091029cc4c037a4b898ba3b99' },   // SUPER-2026
    { rol: 'admin', nombre: 'Administración Fogón del Río', correo: 'admin@fogondelrio.co',
      claveHash: '79341c218814132a538891da61fb60349db024f21f5e1de6d29508f28e923ad4' }    // FOGON-2026
  ],

  // Solo MODO DEMO: datos para explorar la app. Bórrelos desde Admin → Ajustes
  // («Borrar datos de ejemplo») o ponga datosEjemplo: false antes de publicar.
  demo: {
    datosEjemplo: true,
    cliente: { nombre: 'Ana Demo', correo: 'cliente@demo.co', clave: 'DEMO-2026', celular: '3000000000' },
    claveCaja: '1234'                         // clave de caja de ejemplo: cámbiela en Admin → Ajustes
  },

  reportes: { cadaDias: 15 },

  // Asistencia con el carné: hora de entrada por defecto (cada persona puede tener su turno)
  // y minutos de gracia antes de marcar «tarde».
  asistencia: { horaEntrada: '10:00', toleranciaMin: 10 },

  servicios: {
    rutas: 'https://router.project-osrm.org',
    direcciones: 'https://nominatim.openstreetmap.org',
    mosaicos: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    fotos: 'https://images.unsplash.com/'
  }
};
