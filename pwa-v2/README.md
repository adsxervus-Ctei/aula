# Mesa y Ruta · PWA para restaurantes de Hatillo de Loba (v2)

App web instalable para pedir a domicilio o en la mesa. Incluye reservas, ticket, chat con asistente y un panel del negocio con roles. Negocio de ejemplo: **Fogón del Río** (ficticio).

**Cliente**
- Instalación guiada según el teléfono.
- Registro con Gmail o con correo y clave; funciona sin señal.
- Publicidad arriba y saludo grande.
- Carrusel fotográfico del menú, salsas y bebidas.
- Resumen con botones grandes.
- Pago en efectivo, por transferencia (Bre-B, Nequi, Daviplata) o con tarjeta contra entrega.
- Ticket en imagen para descargar o compartir.
- Mapa con la ruta del domicilio y aviso por voz cuando el pedido está listo.
- Chat con IA y reservas por ocasión.

**Negocio (computador o tableta)**
- Tablero de pedidos y caja diaria de ingresos y egresos.
- Menú con fotos y ofertas; publicidad.
- Reservas y equipo con roles y permisos.
- Consolidado cada 15 días en Excel, CSV o PDF, y QR de mesas.

**Empezar:** lea `docs/GUIA_DESPLIEGUE.md`.

**Estructura de carpetas**

| Carpeta o archivo | Contenido |
|---|---|
| `index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest` | La app |
| `video/` | Tutoriales del cliente y del dueño |
| `supabase/` | Base de datos y función del asistente con IA |
| `vendor/` | Librerías incluidas, cada una con su licencia |
| `pruebas/` | Scripts automáticos |

**Licencias de terceros**
- Leaflet: BSD-2.
- qrcode-generator: MIT.
- fflate: MIT.
- Poppins: OFL.
- Fotos de Unsplash: Licencia Unsplash.
- Mapas: © colaboradores de OpenStreetMap.
