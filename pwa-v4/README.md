# Mesa y Ruta · PWA para restaurantes de Hatillo de Loba (v4)

App web instalable para pedir a domicilio o en la mesa. Incluye reservas, ticket, chat con asistente y un panel del negocio con roles. Negocio de ejemplo: **Fogón del Río** (ficticio).

**Cliente**
- Instalación con hoja tipo tienda de aplicaciones: ícono, datos y capturas con las fotos del menú.
- Tutorial a pantalla completa con voz, música y subtítulos, sobre la app real.
- Registro con Gmail o con correo y clave; funciona sin señal.
- Publicidad arriba y saludo grande.
- Carrusel fotográfico del menú, salsas y bebidas.
- Resumen con botones grandes.
- Pago en efectivo, por transferencia (Bre-B, Nequi, Daviplata) o con tarjeta contra entrega.
- Ticket en imagen para descargar o compartir.
- Mapa con pin fijo para marcar la casa, o dirección escrita sin mapa.
- La moto en el mapa y el tiempo que falta (GPS del domiciliario o estimado).
- Aviso por voz cuando el pedido está listo.
- Chat con IA.
- Reservas en carrusel de ocasiones, pantalla de confirmación y «Mis reservas» (próximas y anteriores).

**Negocio (computador o tableta)**
- Tablero de pedidos y caja diaria de ingresos y egresos, con apertura y cierre protegidos por clave.
- WhatsApp y llaves de pago editables.
- Menú con fotos y ofertas; publicidad.
- Reservas y equipo con roles y permisos.
- Consolidado cada 15 días en Excel, CSV o PDF, y QR de mesas.

**Empezar:** lea `docs/GUIA_CONFIGURACION_v4.md`.

**Estructura de carpetas**

| Carpeta o archivo | Contenido |
|---|---|
| `index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest` | La app |
| `audio/tutorial/` | Voz y música del tutorial del cliente |
| `video/` | Video del dueño |
| `supabase/` | Base de datos y función del asistente con IA |
| `vendor/` | Librerías incluidas, cada una con su licencia |
| `pruebas/` | Scripts automáticos |

**Licencias de terceros**
- Leaflet: BSD-2.
- qrcode-generator: MIT.
- fflate: MIT.
- Poppins: OFL.
- Fotos de Unsplash: Licencia Unsplash.
- Voz del tutorial: Kokoro (Apache 2.0).
- Música: original.
- Mapas: © colaboradores de OpenStreetMap.
