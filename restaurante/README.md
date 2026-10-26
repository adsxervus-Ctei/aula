# Mesa y Ruta · pedidos para asaderos y comidas rápidas

Prototipo funcional de aplicación web instalable (PWA). Negocio de ejemplo: **Fogón del Río** (ficticio).

**Flujo del cliente**
1. Carrusel de platos: gira al deslizar o con las flechas.
2. «Desliza para ver la receta»: hoja de vidrio con los ingredientes.
3. Recipiente de salsas.
4. Bebidas disponibles.
5. Resumen del pedido.
6. Forma de pago: efectivo, transferencia o tarjeta.
7. Registro o ingreso.
8. Pedido con estado en vivo, mapa de la ruta del domicilio y chat directo con el negocio.

**Local o domicilio:** se decide con el QR de la mesa, con la ubicación del teléfono o por elección del cliente. El domicilio se calcula por kilómetro de ruta.

**Panel del negocio** (`panel.html`): pedidos con aviso sonoro, cambio de estado con mensaje automático al cliente, chat, enlace a WhatsApp y QR imprimibles para las mesas.

- **Probar:** `python3 -m http.server 8080` → `http://localhost:8080/` y `http://localhost:8080/panel.html` (clave de ejemplo `FOGON-2026`).
- **Publicar:** ver `docs/GUIA_DESPLIEGUE.md`.

Las ilustraciones de los platos son SVG originales dibujados en código. El diseño reinterpreta el flujo y las animaciones de una referencia de interfaz, con identidad visual propia.

Powered by ACERBUS · Ciencia, Tecnología e Innovación (CTeI).
