# LobaMall v7 · Entrega

## Segunda entrega (6 nov. 2026): entrada a la app, punto de venta por categoría y mesas con QR

**Nuevo**
1. **Entrada completa:**
   - La ficha de instalación tipo Play Store sale **de primero**, con tamaño real (0,3 MB comprimida), versión, 6 pantallazos nuevos, descripción, novedades y **"¿Dónde va a quedar?"** según el aparato (celular Android, iPhone, Windows, Mac).
   - Si ya está instalada: **"Ya tienes LobaMall instalada · ABRIR APP"**.
   - Al abrir la app: **elegir el municipio** (Hatillo, San Martín o Barranco), como Mercado Libre pide el país. Luego **"¿Cómo vas a usar LobaMall?"**: cliente, negocio o domiciliario.
2. **Punto de venta** en todos los negocios, con lo propio de cada tipo (ver `CATEGORIAS-Y-CAJA.md`).
3. **Mesas con QR de un solo uso** para billar (chicos o tiempo, jugadores, extras, factura por jugador) y para restaurantes y asaderos (comensales, comanda, cuenta dividida).
4. Los 5 negocios nuevos ya existen en el servidor (`billar`, `billar-cajero` como mesera, `barberia`, `taller`, `ropa`, `agro`; clave 1234).
5. El servidor ahora envía la app **comprimida** (gzip), que pesa menos de la mitad.

**Archivos nuevos:** `api/mesas.mjs`, `api/migraciones/004_mesas.sql`, `js/lm-mesas.js`, `js/lm-pos.js`, `js/lm-entrada.js`, `CATEGORIAS-Y-CAJA.md`.
**Modificados:** `js/app.js` (ganchos de entrada, ficha v7, cerveza por unidad), `servidor.mjs`, `api/semilla.mjs`, `api/rutas.mjs`, `js/lm-api.js`, `js/lm-inventario.js`, `js/lm-tipos.js`, `css/lobamall.css`, `index.html`, `sw.js`, `manifest.webmanifest`, `icons/screens/*.jpg` y las pruebas.

**Pruebas:** tienda **29/29**, API **22/22** (incluye mesa de billar y mesa de restaurante), navegador **19/19**. En navegador se probó:
- Mesa de billar con 3 celulares: el QR **se decodificó** y lleva a la mesa; los jugadores ven el chico y los extras en vivo; un pedido hecho desde el celular espera a que la mesera lo acepte.
- Al cerrar, "paga uno solo"; si escanean el código usado, sale "ya se usó"; al reabrir la mesa sale un código diferente.
- Punto de venta en tienda (lector y cambio), comidas rápidas (turno), droguería (fórmula) y ropa (talla).
- Entrada completa con municipio y rol.

**Límite honesto:** ningún navegador deja que una página web **abra a la fuerza** la app instalada. "ABRIR APP" la intenta abrir; si el navegador la abre en otra pestaña, la app funciona igual ahí, y la pantalla explica dónde está el ícono. La detección de "ya está instalada" funciona en Chrome y Edge con el dominio real (`related_applications` apunta a `https://lobamall.com/manifest.webmanifest`: cámbialo si usas otro dominio).

**Logos de los municipios:** son **provisionales**, dibujados para la app. Para usar los escudos oficiales, pon `img/municipios/hatillo.png`, `sanmartin.png` y `barranco.png`: la app los usa sola. Pide permiso a cada alcaldía para usarlos.

---

# Primera entrega

Base: **HatilloMall v6** (prototipo funcional). No se reconstruyó: se agregó de forma incremental.
Nuevo nombre: **LobaMall** (lobamall.com) para Hatillo, San Martín y Barranco de Loba.

---

## 1. Auditoría (Paso 0)

1. **Stack:** HTML + CSS + JavaScript sin frameworks, en un solo `js/app.js` (420 KB, un IIFE). PWA con `sw.js` y `manifest`. Servidor Node de 35 líneas que solo entregaba archivos.
2. **Base de datos: no había.** Todo vivía en `localStorage` (clave `hatillomall-4-demo`). Dos celulares no compartían nada.
3. **Autenticación:** simulada en el navegador, clave fija `1234`; Google en modo simulado.
4. **Roles reales:** cliente, dueño y cajero. **No existían**: admin, botón [NECESITO REPARTIDOR], Barranco de Loba, servicios con turno, ni tablas `users/pedidos/pagos` (el prompt los daba por hechos).
5. **Pedidos:** objeto `S.orders` con estados por pasos y una simulación que los hace avanzar solos.
6. **Hosting previsto:** Netlify (estático). Pruebas: 29 con Playwright, todas pasaban.
7. **Reutilicé:** toda la tienda, el panel, el checkout, los estados del pedido, los estilos (variables de color), los íconos, el sistema de hojas (`sheet`), el `toast`, el service worker, el servidor Node y las pruebas.
8. **Decisión clave:** el rol repartidor exige cosas que el navegador solo no puede dar (aceptación atómica entre celulares, validar en el servidor, avisos). Siguiendo la ruta que ya traía el README v6, agregué **una API en el mismo `servidor.mjs` + PostgreSQL**. Sin React ni frameworks: 2 dependencias (`pg` y `web-push`).

## 2. Supuestos (decisiones tomadas sin preguntar)

| # | Supuesto | Por qué |
|---|---|---|
| 1 | Se agregó API Node + PostgreSQL en vez de seguir solo con `localStorage` | Sin servidor no hay aceptación atómica, ni validación de permisos, ni avisos entre celulares |
| 2 | PostgreSQL, no Supabase | Se puede probar completo aquí y desplegar gratis (Neon). Los permisos por fila se validan en el servidor (no hay RLS: la base solo la toca la API) |
| 3 | Las tablas "existentes" (`usuarios`, `pedidos`, `pagos`, `calificaciones`) se crean con `IF NOT EXISTS` en `001_base.sql` | No existían en SQL. Si ya estuvieran, no se tocan |
| 4 | Pedidos viejos quedan con `origen = 'lobamall'` | En v6 todo pedido venía por la app; las ventas de mostrador iban a la caja |
| 5 | La tienda, el panel y el cliente siguen en `localStorage`; el servidor se usa en los puntos de integración | Era la instrucción: no cambiar el comportamiento existente |
| 6 | Un repartidor lleva **un domicilio a la vez** | Es una moto; simplifica el bloqueo de modo. Se cambia quitando un índice |
| 7 | **Fiado:** el domicilio lo cubre el **negocio** (le paga al repartidor y cobra producto + domicilio en la cuenta del cliente) | El negocio es quien decide fiar |
| 8 | **Efectivo:** el repartidor cobra producto + domicilio, se queda su domicilio y le debe el resto al negocio. **Nequi:** el cliente le paga todo al negocio y el negocio le debe el domicilio al repartidor | Una sola "caja del repartidor" con saldo + o − por negocio |
| 9 | Si el negocio **sube el valor**, la diferencia la pone el negocio | El cliente ya pagó la tarifa normal |
| 10 | Si el negocio cancela con el repartidor ya en camino, se le reconoce el domicilio | Hizo el viaje |
| 11 | El cliente solo cancela antes de que el repartidor recoja | Después debe llamar al negocio |
| 12 | Al entrar, el repartidor aprobado arranca en modo trabajo; al recargar se respeta el modo guardado en el servidor | Las dos reglas del prompt juntas |
| 13 | Coordenadas de Hatillo, San Martín y Barranco tomadas de Wikipedia; **Chimí sin coordenadas** (usa 6 km de referencia, editable) | No encontré una fuente confiable para Chimí |
| 14 | Fotos (cédula, pase, evidencias, productos) guardadas en la base, comprimidas en el celular | Evita otro servicio; a escala de La Loba alcanza. Ver pendientes |
| 15 | Los 5 negocios nuevos y sus herramientas guardan sus datos en el navegador (como el resto del panel v6) | Coherente con el prototipo |

## 3. Plan por fases (ejecutado completo)

1. **Datos y API** — migraciones, autenticación real, rol repartidor, ofertas atómicas, tiempo real, push, vencimiento, caja, Nequi manual, calificaciones, comisión por origen.
2. **Pantallas del repartidor** — registro con fotos y Habeas Data, "en revisión", tablero de trabajo, modo dual, entrega con foto, mapa, ganancias.
3. **Admin** — aprobación, tarifas por zona, reglas, cajas, comisiones, domicilios, fotos pendientes.
4. **Integración negocio/cliente** — [NECESITO REPARTIDOR], sección Domicilios, pedidos entre celulares, seguimiento real para el cliente.
5. **Tu pedido extra** — 5 tipos de negocio nuevos con su herramienta propia, e inventario con foto, QR, etiquetas y escáner.
6. **Pruebas y documentación.**

## 4. Archivos nuevos y modificados

**Nuevos**
- `api/db.mjs`, `api/auth.mjs`, `api/rutas.mjs`, `api/tiempo-real.mjs`, `api/notificaciones.mjs`, `api/geo.mjs`, `api/semilla.mjs`
- `api/canales/webpush.mjs`, `api/canales/whatsapp.mjs` (adaptador fase 3, apagado)
- `api/migraciones/001_base.sql`, `002_repartidor.sql`, `003_inventario_qr.sql`
- `js/lm-api.js`, `js/lm-repartidor.js`, `js/lm-admin.js`, `js/lm-negocio.js`, `js/lm-tipos.js`, `js/lm-inventario.js`
- `js/vendor/qrcode.min.js` (MIT), `js/vendor/jsQR.min.js` (Apache 2.0, se carga solo al escanear), `js/vendor/leaflet/` (BSD), `js/vendor/LICENCIAS.md`
- `css/lobamall.css`, `privacidad.html`, `.env.ejemplo`, `GUIA-DESPLIEGUE.md`, `ENTREGA.md`
- `tests/api/api.test.mjs` (20 pruebas), `tests/pruebas-v7.mjs` (17 pruebas)

**Modificados**
- `servidor.mjs` — API + solo publica archivos de la app (antes publicaba `package.json`, `tests/`, todo).
- `js/app.js` — cambios mínimos y marcados con "LobaMall v7": puntos de integración (`EXT`), 5 categorías, 5 negocios, 19 productos, Barranco de Loba, logo provisional, foto del inventario en la tienda, marca LobaMall. La llave de `localStorage` no cambió (no se pierden datos de la demo).
- `index.html`, `manifest.webmanifest`, `sw.js` (push + nunca guarda la API), `package.json`, `tests/pruebas.mjs` (12 → 17 negocios).

## 5. Lo que preguntaste: ¿las opciones del dueño cambian según el negocio?

**Tienes razón, pero solo en parte.** El 70 % del panel es igual para todos y debe seguir igual (así el equipo capacita una sola vez):
tablero, caja, gastos, balance, productos, **inventario con foto y QR**, promociones, clientes y fiados, reseñas, empleados y configuración.
Lo que cambia es **la herramienta principal de trabajo**, porque cada negocio cobra distinto:

| Tipo | Cómo cobra | Herramienta propia (nueva) |
|---|---|---|
| Restaurante, comidas rápidas | Por plato, con domicilio | Pedidos + Domicilios (ya existía) |
| **Billar y juegos** | Por **tiempo** de mesa + consumo | **Mesas y cuentas**: cronómetro por mesa, consumo, cobrar → caja |
| **Barbería y belleza** | Por **servicio con hora** | **Turnos del día**: agenda, estilista, a domicilio (+$5.000), recordatorio por WhatsApp, lo que gana cada estilista. No usa repartidores |
| **Taller de motos** | Repuestos + mano de obra | **Órdenes de servicio**: placa, falla, estados, repuestos que salen del inventario, aviso por WhatsApp, **historial por placa** |
| **Ropa y calzado** | Por prenda, **talla y color** | **Tallas y apartados**: inventario por talla, apartado con abonos, vence a 30 días |
| **Agro y veterinaria** | Por unidad, **lote/vencimiento**, a granel | **Lotes y vencimientos**: alerta de lo que vence, bloquea lo vencido, venta por kilo |
| Ferretería / depósito | Producto pesado, flete | Atributos referencia/medida; fiado apagado por defecto (ya existía) |

El menú del panel se arma solo según el tipo (`LM.TIPOS` en `js/lm-tipos.js`). Al crear un producto, el asistente pide los datos propios del tipo (talla y color en ropa; lote, vencimiento y registro ICA en agro; INVIMA en droguería).

## 6. Inventario con foto profesional y QR: sí es posible, y quedó así

1. **Agregar producto (asistente de 3 pasos):** datos y **dónde está en el local** → foto profesional (lista de chequeo del montaje: fondo blanco, luz, centrado) o "la toma el equipo después" → se crea el **código** (`RC-0012`) y el **QR**.
2. **Fotos pendientes:** el equipo de LobaMall entra con su cuenta (`equipo`) y ve todos los productos sin foto de todos los negocios.
3. **Al terminar el inventario:** "Seleccionar las que faltan" → **Imprimir** en hoja carta (21 por hoja) o rollo térmico 50 × 30 mm. Cada etiqueta trae **QR + código de barras 128 + código escrito + precio + lugar**.
4. **Cómo se lee:**
   - **Cámara normal del celular** (sin instalar nada): abre la ficha del producto.
   - **Escáner de la app** (celular, tablet o **cámara USB** en el computador).
   - **Lector USB tipo pistola:** sí, funciona como un teclado. Uno barato de línea roja lee las **barras**; uno 2D lee el QR. No hay que abrir nada: se dispara en cualquier pantalla. Si el lector está configurado en inglés y Windows en español (escribe `RC'0012`), la app lo corrige sola.
   - **Buscador:** escribe el código, el nombre, la categoría o el lugar.
5. **La ficha** muestra foto, precio grande, **"Dónde está"**, disponibles y, si quien escanea es del negocio, **VENDER** (queda en la caja).

## 7. Qué probé y qué no

**Probado aquí (PostgreSQL 16 real + Chromium):**
- `npm test`: **29/29** pruebas originales de la tienda siguen pasando.
- `npm run test:api`: **20/20**. Incluye: aceptación simultánea (10 rondas, 2 repartidores, siempre gana uno), no aprobado (403 y sin avisos), modo cliente sin avisos en la app ni push ni tiempo real (filtro del servidor), bloqueo de cambio de modo con entrega en curso, pedido propio rechazado, migración segura con datos viejos, placa/cédula repetidas, Habeas Data, archivos privados, vencimiento sin avisos duplicados, comisión solo por origen LobaMall, caja en efectivo y fiado, Nequi manual, calificaciones.
- `npm run test:v7`: **17/17** en navegador: registro con fotos y aprobación en vivo, oferta en tiempo real, dos repartidores tocando a la vez, flujo con foto, modo cliente tras recargar, pedido entre 3 celulares (cliente, negocio, repartidor) con el mismo número, asistente de producto con QR (**el QR se decodificó con jsQR**), escaneo desde otro celular, lector USB simulado, impresión, los 5 tipos de negocio, botones ≥ 48 px y letra ≥ 18 px, sin desplazamiento lateral.
- Las barras Code 128 dan exactamente lo mismo que JsBarcode. La hoja carta se generó como PDF y salen 3 columnas.

**No probado (no se puede desde aquí):**
- **Web Push real** a un celular (se probó el filtro y el envío con un enviador simulado; falta probarlo con llaves VAPID y un Android).
- Cámara física, lector USB físico, impresora real, GPS real y los mapas de OpenStreetMap (sin internet en la prueba).
- Despliegue en Render/Neon, dominio y HTTPS. Celulares Android de gama baja reales.

## 8. Alertas (riesgos en lo existente o en lo nuevo)

1. **Seguridad del servidor v6:** publicaba cualquier archivo de la carpeta (incluidos `package.json` y `tests/`). Ya corregido con una lista de archivos públicos.
2. **Claves "1234" y usuarios de demostración** siguen en la tienda local. La semilla del servidor se niega a correr en producción.
3. El **pedido entre celulares** solo funciona si el cliente entró con una cuenta que existe en el servidor (las cuentas nuevas de la tienda local todavía no se crean en el servidor).
4. Los **números de pedido** los propone cada celular; el servidor los iguala si están libres, pero con mucho uso simultáneo podrían diferir.
5. El **límite de intentos** está en memoria: con más de un servidor hay que moverlo a la base.
6. **Render gratis se duerme**: los avisos y el vencimiento de ofertas se detienen mientras duerme.
7. **Fotos en la base**: bien para empezar; con miles de productos conviene moverlas a un almacenamiento de archivos.
8. Los **mosaicos de OpenStreetMap** tienen política de uso justo: con mucho tráfico hay que usar un proveedor.
9. Los QR llevan el dominio con que se imprimieron: **imprime en lobamall.com**.
10. `privacidad.html` es un **borrador** con espacios en amarillo (responsable, NIT, correo, plazos). Que lo revise un abogado antes de publicar.
11. Los 5 negocios nuevos tienen **logo provisional**; falta su identidad de marca como los 12 de v5.
12. Los botones "Avisar por WhatsApp" solo abren un enlace `wa.me` (gratis). **La API de WhatsApp no se usa** (fase 3 apagada).

## 9. Pendientes para la siguiente etapa

1. Probar push, cámara, lector e impresora en celulares y equipos reales de La Loba.
2. Pasar a servidor el resto de la tienda (cuentas, catálogo, caja), para que todo sea multi-celular.
3. Que el servidor asigne siempre el número del pedido.
4. Reportes del admin por municipio (ventas totales, impulso/publicidad) y cobro de mensualidades.
5. Fotos en almacenamiento de archivos (Supabase Storage o Cloudflare R2).
6. Identidad de marca de los 5 negocios nuevos y sus fotos profesionales.
7. Clave de 6 dígitos o código por SMS para repartidores.
8. WhatsApp Business (fase 3) cuando haya presupuesto.
