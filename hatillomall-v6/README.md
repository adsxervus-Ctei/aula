# HatilloMall v6 · Prototipo navegable

Marketplace + sistema de negocios para **Hatillo de Loba, Chimí y San Martín de Loba** (Bolívar).
Prototipo funcional en estilo Mercado Libre: 12 negocios de ejemplo, cuenta de cliente, panel del dueño,
postventa, asistente con IA simulada (Toño), billetera HatilloPago y modo sin señal.

Powered by **AXERVUS CTeI**

## Novedades de la versión 6

- **Ficha de instalación tipo tienda de apps**: al abrir el link en el navegador aparece una ficha con ícono, desarrollador, tamaño real (0,6 MB), versión, 6 pantallazos, descripción, novedades, seguridad de datos e información de la app. Botones **Instalar** y **Cerrar**. Si la cierran, no vuelve a salir en 3 días.
  - En Android con Chrome, "Instalar" abre la instalación real. Además, el manifiesto ya trae descripción y pantallazos, así que Chrome muestra su propia ficha ampliada.
  - En iPhone muestra los 3 pasos de Safari (Compartir → Agregar a inicio).
  - Al terminar, muestra una pantalla de inicio animada que señala dónde quedó el ícono. *Ningún navegador permite saltar a la pantalla de inicio del celular; esto es lo más cercano que deja la web.*
- **Entrada obligatoria en la app instalada**: cuando se abre desde el ícono, pide entrar como cliente o negocio, crear cuenta o **Continuar con Google**.
  - Google funciona en modo simulado hasta que pegues tu ID de cliente en `js/config.js` (los pasos están en ese archivo).
- **Tutorial narrado** al entrar por primera vez: un video animado de 7 u 8 escenas, distinto para cliente, dueño y cajero, con subtítulos.
  - La voz es la del propio celular o computador, en este orden: **Colombia → México → Latinoamérica**. En Edge y Windows hay voces naturales de Colombia (Salomé, Gonzalo); en Android, la voz latina de Google; en iPhone, Paulina (México). No descarga audio: no gasta datos.
  - Se puede pausar, adelantar o saltar, y volver a ver desde *Mi cuenta* o desde el panel (botón **Tutorial**).

## Novedades de la versión 5

- **12 marcas con concepto 2026**: cada negocio tiene logo SVG animado, paleta, tipografía y concepto. Míralas en la sección **Marcas del pueblo** (`#marcas`).
- **Dueños ficticios** con avatar ilustrado de libre uso (Notionists, CC0). El dueño puede cambiarlo por su foto real o esconderlo y dejar solo el logo: *Panel → Configuración → Foto del dueño*.
- **Fotos reales de stock**: catálogo verificado en `fotos/CATALOGO.md`. Se descargan con `npm run fotos` (ver abajo).
- **Animaciones**: transición que desliza hacia el lado correcto al cambiar de categoría, barra de progreso de lectura, parallax en el carrusel, títulos y tarjetas que entran al bajar, y logos que se mueven al pasar el mouse.
- **Categorías en el celular**: chips con ícono fijos arriba, subcategorías, **deslizar a los lados para cambiar de categoría**, y "Filtrar / Ordenar" en una barra al alcance del pulgar que abre hojas desde abajo.
- **Corrección**: en las páginas de categoría los filtros se borraban al redibujar la pantalla. Ya quedan.

### Bajar las fotos reales (en tu computador, con internet)
```bash
npm run fotos
```
Descarga 20 fotos para 25 productos en `img/productos/` y crea `img/productos/CREDITOS.md`.
Recarga la app y se ven en tarjetas, ficha y ofertas. Luego publica la carpeta (Netlify Drop) y salen en el link.

---

## 1. Qué trae esta carpeta

```
hatillomall-v4/
├── index.html              ← la página principal (ábrela para ver la app)
├── css/estilos.css         ← todo el diseño (paleta Mercado Libre)
├── js/app.js               ← toda la lógica: tienda, cuentas, panel, Toño, postventa
├── manifest.webmanifest    ← datos para instalarla como app (PWA), con descripción y pantallazos
├── js/config.js            ← aquí va el ID de cliente de Google
├── icons/screens/          ← 6 pantallazos para la ficha de instalación
├── sw.js                   ← service worker: guarda la app para abrir sin internet
├── icons/                  ← íconos de la app (SVG y PNG 192/512)
├── servidor.mjs            ← servidor local sin dependencias (Node.js)
├── package.json            ← comandos: npm start, npm test
├── fotos/catalogo.json     ← fotos de stock verificadas por producto
├── fotos/CATALOGO.md       ← la misma lista, para leer, con estado de licencia
├── fotos/descargar-fotos.mjs ← descarga las fotos (npm run fotos)
├── img/productos/          ← aquí quedan las fotos descargadas
├── tests/pruebas.mjs       ← 29 pruebas automáticas (Playwright)
├── tests/reporte.txt       ← resultado de la última corrida
├── tests/capturas/         ← pantallazos que toman las pruebas
├── TECNOLOGIAS.md          ← listado de tecnologías y complementos
└── README.md               ← esta guía
```

## 2. Requisitos

| Para…                         | Necesitas                                                  |
|-------------------------------|------------------------------------------------------------|
| Solo mirar la app             | Google Chrome o Edge (cualquier computador o celular)      |
| Servidor local y modo offline | **Node.js 18 o más nuevo** → https://nodejs.org (versión LTS) |
| Pruebas automáticas           | Node.js + `npm install` + `npm run instalar-navegador`     |
| Editar el código              | Visual Studio Code (recomendado)                           |

## 3. Paso a paso

### Opción A · Mirarla ya (sin instalar nada)
1. Descomprime `hatillomall-v4.zip`.
2. Abre la carpeta y haz doble clic en **`index.html`**.
3. Se abre en el navegador. Todo funciona, menos la instalación como app y el modo sin internet real
   (esos dos necesitan servidor, Opción B).

### Opción B · Correrla con servidor local (recomendada)
1. Instala Node.js (LTS) desde https://nodejs.org.
2. Abre una terminal **dentro de la carpeta** `hatillomall-v4`
   (en Windows: clic derecho en la carpeta → *Abrir en Terminal*).
3. Escribe:
   ```bash
   npm start
   ```
4. Abre en Chrome: **http://localhost:8080**
5. Para detenerlo: `Ctrl + C` en la terminal.

> Para verla en tu celular desde el mismo wifi: averigua la IP del computador (`ipconfig` en Windows)
> y abre `http://TU-IP:8080` en el celular.

### Opción C · Publicarla en internet (gratis)
- **Netlify Drop** (la más fácil): entra a https://app.netlify.com/drop y arrastra la carpeta
  `hatillomall-v4`. Te da un link `https://algo.netlify.app` listo para compartir.
- **Vercel**: `npx vercel` dentro de la carpeta, o sube la carpeta a GitHub e impórtala en vercel.com.
- **GitHub Pages**: sube la carpeta a un repositorio → Settings → Pages → rama `main`.

Con el link publicado (https) ya se puede **instalar como app** en el celular:
Chrome → menú ⋮ → *Agregar a pantalla de inicio*.

## 4. Cuentas de demostración (clave de todas: `1234`)

| Usuario          | Rol      | Qué ve                                                        |
|------------------|----------|---------------------------------------------------------------|
| `maria`          | Cliente  | Pedidos, seguimiento, fiados, favoritos, HatilloPago          |
| `rancho`         | Dueño    | Panel completo de Rancho Costeño                              |
| `rancho-cajero`  | Cajero   | Solo Pedidos y Caja (no ve la ganancia)                       |
| `drogueria`, `jugos`, `estanque`, `arepas`… | Dueño | Panel de cada uno de los 12 negocios      |

El botón **"Reiniciar la demostración"** (pie de página) borra los cambios y vuelve a los datos de ejemplo.

## 5. Qué probar (recorrido sugerido)

1. Portada → clips de los negocios → ofertas del día.
2. Buscador: escribe "moj" y entra a la ficha de la mojarra.
3. "Enviar a" → cambia la zona a Chimí y mira cómo cambian los tiempos y el domicilio.
4. Toño (botón morado) → "almuerzo por menos de 20 mil en Chimí" → **Pídelo por mí**.
5. Entra como `maria`, confirma el pedido y mira el seguimiento, el chat ("más yuca") y el mapa.
6. Cupones → activa CHIMI10 → pide en Rancho Costeño: se aplica solo.
7. Mi cuenta → HatilloPago → Pagar con QR, copiar llave Bre-B.
8. Botón **Con señal / Sin señal** → pide algo sin señal → vuelve la señal → se envía solo.
9. Sal y entra como `rancho` → acepta el pedido #127, publica una oferta con foto, haz cierre de caja.
10. Entra como `rancho-cajero` y compara lo que ve.

## 6. Pruebas automáticas

```bash
npm install                  # instala Playwright (una sola vez)
npm run instalar-navegador   # descarga Chromium para las pruebas (una sola vez)
npm test                     # corre las 29 pruebas
```
Resultado de la última corrida: **29 de 29 pruebas pasaron** (ver `tests/reporte.txt`).

Qué revisan: carga sin errores, manifiesto e íconos, service worker y apertura sin internet,
celular sin desplazamiento lateral, buscador, ficha, carrito, compra completa con avance de estados,
cupón, pago con HatilloPago, asistente Toño, cola sin señal, tablero del dueño, aceptar pedido,
publicar oferta, permisos del cajero y eliminar usuario.

## 7. Limitaciones de este prototipo (léelas antes de mostrarlo)

- **No hay servidor ni base de datos**: los datos se guardan en el navegador de quien lo usa
  (`localStorage`). Dos celulares no ven los mismos pedidos. El cliente y el dueño se "hablan"
  solo dentro del mismo navegador.
- **Toño y los resúmenes con IA son simulados** con reglas dentro de la página. En producción se
  conectan a un modelo de IA real.
- **El QR y la llave Bre-B son de muestra.** No mueven dinero.
- Los 12 negocios, productos, personas y teléfonos son **de ejemplo**, salvo Rancho Costeño
  y las cifras del resumen ejecutivo.
- La fuente Figtree se descarga de Google Fonts; sin internet se usa una fuente del sistema.

## 8. De prototipo a producto (ruta recomendada en el resumen ejecutivo)

| Hoy en el prototipo              | En producción                                        |
|----------------------------------|------------------------------------------------------|
| `localStorage`                   | Supabase (PostgreSQL) + tiempo real                  |
| Usuarios de demostración         | Supabase Auth (roles dueño / cajero / cliente)       |
| Fotos en el navegador            | Supabase Storage o Cloudinary                        |
| HTML + JS sin framework          | Next.js + React + Tailwind (misma interfaz)          |
| Servidor local / Netlify         | Vercel + dominio hatillomall.com                     |
| Toño con reglas                  | API de un modelo de IA                               |
| Pagos simulados                  | Wompi (Nequi, PSE, Bre-B) cuando haya volumen        |
| Avisos dentro de la app          | OneSignal (push) + WhatsApp Cloud API                |
| Mapa dibujado                    | Leaflet + OpenStreetMap                              |
