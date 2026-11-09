# Lainec v7 · Tecnologías y complementos

## A. Tecnologías del prototipo (lo que hay en esta carpeta)

| # | Tecnología | Dónde se usa | Para qué |
|---|-----------|--------------|----------|
| 1 | **HTML5** | `index.html` | Estructura de la tienda, cabecera, barra inferior y capas (carrito, modales) |
| 2 | **CSS3** | `css/estilos.css` | Diseño con la paleta de Mercado Libre: variables (`--sol`, `--fucsia`, `--tinta`…), Grid, Flexbox, diseño adaptable a celular |
| 3 | **CSS View Transitions** | `css/estilos.css` + `js/app.js` | Transición suave al cambiar de página |
| 4 | **CSS Scroll-driven animations** | clase `.rv` | Las tarjetas aparecen al bajar la página |
| 5 | **JavaScript (ES2020), sin frameworks** | `js/app.js` | Ruteo por `#`, carrito, cuentas, panel del dueño, postventa, Toño, clips, cupones |
| 6 | **SVG** | íconos, plato, QR, mapa | Gráficos livianos que se ven nítidos en cualquier pantalla |
| 7 | **Canvas 2D** | confeti | Celebración al confirmar el pedido |
| 8 | **Web Animations API** | "vuelo" al carrito | Animación del producto hacia el carrito |
| 9 | **localStorage** | estado de la demo | Guardar pedidos, ofertas, sesión y billetera en el navegador |
| 10 | **Service Worker + Cache API** | `sw.js` | Que la app abra sin internet (apagón o datos caídos) |
| 11 | **Web App Manifest (PWA)** | `manifest.webmanifest`, `icons/` | Instalar Lainec como app en el celular y el computador |
| 12 | **Google Fonts – Figtree** | `index.html` | Tipografía redonda parecida a la de Mercado Libre |
| 13 | **Node.js 18+** | `servidor.mjs` | Servidor local sin dependencias (`npm start`) |
| 14 | **Playwright** | `tests/pruebas.mjs` | 17 pruebas automáticas en un navegador Chromium |

## B. Funciones que simulan tecnologías del mercado actual

| Función en Lainec | Referente del mercado | Cómo está hecho en el prototipo |
|------------------------|----------------------|---------------------------------|
| Toño, asistente de compras con IA | MAGO de Mercado Libre, compra agéntica | Reglas en JS que entienden presupuesto, zona y tipo de producto |
| Resumen de opiniones con IA | Resúmenes de reseñas de Mercado Libre | Palabras clave de las reseñas → ventajas y desventajas |
| Lainec Pago (saldo, QR, llave Bre-B) | Mercado Pago, Bre-B del Banco de la República | Saldo y movimientos simulados, QR dibujado en SVG |
| Clips de negocios | Clips de Mercado Libre, historias | Visor con barras de avance, pausa al mantener presionado |
| ⚡RÁPIDO, "Llega hoy" | Sello FULL de Mercado Libre | Calculado con el tiempo de preparación y la zona |
| Reputación del vendedor | Termómetro de Mercado Libre | Barra de 5 colores según la calificación |
| Compra protegida y reclamos | Compra protegida de Mercado Libre | Reclamo desde el pedido → el dueño repone, devuelve o descuenta |
| Mapa del domiciliario | Seguimiento en vivo de apps de domicilios | SVG con la moto animada por la ruta |
| Modo sin señal | Apps "offline-first" | Cola de pedidos y ventas que se sube al volver la señal |

## C. Complementos y herramientas para trabajar el proyecto

| Herramienta | Para qué | Costo |
|-------------|----------|-------|
| Visual Studio Code | Abrir y editar `index.html`, `estilos.css`, `app.js` | Gratis |
| Extensión **Live Server** (VS Code) | Alternativa a `npm start`: clic derecho → *Open with Live Server* | Gratis |
| Google Chrome + DevTools | Ver la app en modo celular (`F12` → ícono de celular) | Gratis |
| **Lighthouse** (en Chrome DevTools) | Medir velocidad, accesibilidad y si cumple como PWA | Gratis |
| Git + GitHub | Guardar versiones y trabajar en equipo (los 11 integrantes) | Gratis |
| Netlify Drop / Vercel | Publicar el prototipo con un link https | Gratis |
| Figma | Diseñar pantallas nuevas antes de programarlas | Gratis (plan básico) |

## D. Tecnologías para la versión real (según el resumen ejecutivo)

| Capa | Tecnología |
|------|-----------|
| Interfaz | Next.js + React + Tailwind CSS + PWA |
| Base de datos y tiempo real | Supabase (PostgreSQL + Realtime) |
| Usuarios y roles | Supabase Auth |
| Fotos | Supabase Storage / Cloudinary |
| Hosting | Vercel + dominio hatillomall.com |
| Pagos | Wompi (Nequi, PSE, Bre-B) |
| Notificaciones | OneSignal + WhatsApp Cloud API |
| Mapas | Leaflet + OpenStreetMap |
| Sin internet | Service Workers + IndexedDB |
| Asistente Toño | API de un modelo de IA |

## E. Nuevo en la versión 5

| Elemento | Tecnología / fuente | Licencia |
|---|---|---|
| Logos de los 12 negocios | SVG propio, animado con CSS (morph-marks) | Del proyecto |
| Tendencias de marca 2026 | Vistaprint, ManyPixels, Kittl | Referencia |
| Avatares de dueños ficticios | DiceBear + estilo Notionists (Zoish) | CC0 1.0 |
| Fotos de productos | Unsplash, verificadas una por una | Licencia Unsplash |
| Tipografías de marca | Fraunces, Lilita One, Bricolage Grotesque, Silkscreen (Google Fonts) | SIL Open Font License |
| Transición entre categorías | View Transitions API con dirección | Navegador |
| Animaciones al bajar | CSS scroll-driven animations (`animation-timeline`) | Navegador |
| Deslizar entre categorías | Pointer Events | Navegador |

## F. Nuevo en la versión 6

| Elemento | Tecnología | Nota |
|---|---|---|
| Botón Instalar | Evento `beforeinstallprompt` + `appinstalled` | Android y computador con Chrome o Edge |
| Ficha ampliada de Chrome | Manifiesto con `description` y `screenshots` | Chrome la muestra sola en Android |
| Instalar en iPhone | Guía de Safari (Agregar a inicio) | Apple no permite un botón de instalar |
| Abrir como app | `display-mode: standalone` + `start_url` con `?app=1` | Activa la entrada obligatoria |
| Continuar con Google | Google Identity Services (`accounts.google.com/gsi/client`) | Requiere ID de cliente OAuth en `js/config.js` |
| Tutorial narrado | Web Speech API (`speechSynthesis`) con voz es-CO → es-MX → es-US | Usa las voces del dispositivo, sin descargar audio |
| Escenas del tutorial | HTML + animaciones CSS | Sin archivos de video |

## G. Nuevo en la versión 7 (Lainec)

| Elemento | Tecnología | Nota |
|---|---|---|
| API y servidor | Node.js 20+ (`node:http`, sin framework) | Mismo `servidor.mjs` de antes |
| Base de datos | PostgreSQL + `pg` | Migraciones SQL en `api/migraciones/` |
| Claves | `scrypt` de `node:crypto` | Sin dependencias |
| Tiempo real | Server-Sent Events (SSE) | Reconexión automática |
| Avisos con la app cerrada | Web Push + VAPID (`web-push`) | Requiere HTTPS |
| WhatsApp | Adaptador vacío (fase 3) | No activo |
| Distancia y tiempo | Haversine × 1,3 a 25 km/h | Sin servicios de pago |
| Mapa | Leaflet 1.9.4 + OpenStreetMap | Se carga solo con domicilio en curso |
| Código QR | qrcode-generator 1.4.4 (MIT) | Sin internet |
| Código de barras | Code 128 propio (verificado contra JsBarcode) | Para lectores USB baratos |
| Lectura de QR | `BarcodeDetector` del navegador; jsQR 1.4.0 de respaldo | jsQR se descarga solo al escanear |
| Fotos | Canvas: se comprimen en el celular | 1000 px repartidor, 800 px evidencia, 1400 px producto |
| Pruebas | `node:test` (API) + Playwright (navegador) | 20 + 17 pruebas nuevas |
