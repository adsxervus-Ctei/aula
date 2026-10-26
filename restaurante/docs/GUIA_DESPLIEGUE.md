# Mesa y Ruta · guía para publicar la aplicación

Aplicación web instalable (PWA) para asaderos, restaurantes y comidas rápidas.

- **Lo que hace el cliente:** escoge el plato en un carrusel, ajusta la receta, agrega salsas y bebidas, ve el resumen, escoge cómo recibirlo y cómo pagar, y sigue el pedido con chat directo.
- **Lo que hace el negocio:** atiende todo desde `panel.html`.

El negocio del ejemplo, **Fogón del Río**, es ficticio, igual que su menú, sus precios y su dirección.

---

## 1. Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app del cliente. |
| `panel.html` | El panel del negocio: pedidos, estados, chat y QR de mesas. |
| `js/config.js` | **El único archivo que el negocio edita.** Lleva nombre, ubicación, WhatsApp, tarifas, pagos y base de datos. |
| `js/menu.js` | Platos, ingredientes, salsas y bebidas, con sus precios. |
| `js/app.js`, `js/panel.js`, `js/datos.js` | La lógica. No hace falta tocarla. |
| `css/` | Los estilos. |
| `fonts/` | La tipografía Poppins (licencia OFL). |
| `vendor/` | Leaflet 1.9.4 para los mapas y qrcode-generator 1.4.4 para los QR (licencias incluidas). |
| `sw.js` | Hace que la app abra sin señal. Súbale la versión cada vez que cambie algo. |
| `manifest.webmanifest`, `icons/` | Permiten instalarla como aplicación en el teléfono. |
| `supabase/esquema.sql` | Crea la base de datos gratuita (paso 5). |

## 2. Probarla en el computador (5 minutos)

1. Abra una terminal en la carpeta y escriba `python3 -m http.server 8080`.
2. Abra `http://localhost:8080/` para la app del cliente. En **otra pestaña del mismo navegador** abra `http://localhost:8080/panel.html` para el panel. La clave de ejemplo es `FOGON-2026`.
3. Haga un pedido en la app y verá cómo aparece en el panel con un sonido. Cambie el estado o escriba en el chat: el cliente lo ve enseguida.

Así funciona el **modo demostración**: todo queda guardado en ese navegador. Sirve para mostrar y probar. Para que lleguen pedidos de verdad desde otros teléfonos haga el paso 5.

> Si abre `index.html` con doble clic, el mapa y la instalación no funcionan, porque los navegadores exigen una dirección `http://` o `https://`.

## 3. Ajustar los datos del negocio (`js/config.js`)

- **`negocio`:**
  - nombre, lema, ciudad y dirección;
  - **lat/lng**: el punto de salida de los domicilios. En Google Maps, clic derecho sobre el local y se copian las coordenadas;
  - **whatsapp**: 10 dígitos, sin +57.
- **`local.radioMetros`:** a menos de esa distancia del negocio, la app propone «Comer aquí». El valor de ejemplo es 120 m.
- **`domicilio`:** valor base, valor por kilómetro, valor mínimo, distancia máxima y desde qué valor de pedido el domicilio es gratis.
- **`empaquePorPlato`:** se cobra solo en domicilio y para recoger.
- **`pagos.transferencia`:** la **llave Bre-B** del negocio y/o los números de Nequi y Daviplata, más el nombre del titular.
- **`panel.claveHash`:** la huella de la clave del panel en modo demostración. Para cambiar la clave:
  1. Abra la consola del navegador (F12).
  2. Escriba `Datos.sha('MYR|SU-CLAVE-NUEVA').then(console.log)`.
  3. Pegue el resultado en `claveHash`.

Para el menú, edite `js/menu.js`.

- **Precios y textos:** se cambian ahí mismo.
- **Foto de un plato:** póngala en `img/platos/` (cuadrada, 600×600, formato WebP) y agregue `foto: 'img/platos/nombre.webp'` al plato.

## 4. Publicarla gratis en GitHub Pages

1. Cree una cuenta en github.com y un repositorio público, por ejemplo `fogon-pedidos`.
2. **Add file → Upload files:** suba **todo el contenido** de la carpeta, no la carpeta misma.
3. **Settings → Pages → Branch: main / (root) → Save.** En uno o dos minutos queda en `https://SU-USUARIO.github.io/fogon-pedidos/`.
4. Abra esa dirección en el teléfono. Chrome ofrecerá **Instalar aplicación**; en iPhone es Compartir → «Agregar a inicio».
5. Cada vez que cambie un archivo, edite `sw.js` y súbale la versión (`myr-v1.0.1`, `myr-v1.0.2`…). Así los teléfonos reciben el cambio.

GitHub Pages sirve con HTTPS, que es obligatorio para la ubicación, la instalación y el modo sin señal.

## 5. Pedidos y chat desde cualquier teléfono (Supabase, plan gratuito)

1. Cree una cuenta en supabase.com y un proyecto nuevo, en la región más cercana (São Paulo o EE. UU.).
2. En **SQL Editor → New query**, pegue todo `supabase/esquema.sql` y pulse **Run**.
3. En **Authentication → Users → Add user**, cree la cuenta del personal (por ejemplo `cocina@su-negocio.co`) con una clave fuerte. Después, en **SQL Editor**, ejecute:
   ```sql
   insert into public.personal (user_id, nombre)
   select id, 'Cocina' from auth.users where email = 'cocina@su-negocio.co';
   ```
4. **Correo de confirmación de los clientes.** En **Authentication → Sign In / Providers → Email** decida si pide confirmar el correo.
   - **Desactivado:** el cliente pide de una vez.
   - **Activado:** recibe un correo antes de su primer pedido. El servicio de correo incluido en Supabase tiene un límite bajo de envíos; para volumen real se conecta un SMTP propio.
5. En **Project Settings → API**, copie la **Project URL** y la **publishable key** (`sb_publishable_…`) y péguelas en `config.js → supabase`.
6. Suba los cambios y la versión nueva de `sw.js`. Desde ese momento:
   - los clientes crean su cuenta con su correo;
   - el panel pide el **correo y la clave del personal**;
   - pedidos y mensajes se guardan en la nube, y el panel los revisa cada 5 segundos.

**Seguridad:**
- La publishable key es pública por diseño.
- Lo que protege los datos son las reglas por filas del esquema: cada cliente ve solo sus pedidos y su chat; solo el personal ve todo y cambia estados.
- No ponga nunca en la app la `secret key` ni la `service_role`.

**Límites del plan gratuito (verificar en supabase.com/pricing):**
- base de datos de 500 MB, suficiente para cientos de miles de pedidos de texto;
- el proyecto se **pausa tras 7 días sin uso** y se reactiva desde el panel de Supabase. Un negocio con pedidos diarios no lo nota.

## 6. ¿En el local o a domicilio? Cómo lo decide la app

1. **Código QR en la mesa (lo más confiable).** En el panel, la pestaña **QR de mesas** genera un código por mesa con la dirección `…/?mesa=7`. Imprímalos (botón Imprimir) y péguelos en las mesas. Quien escanea queda «en el local · mesa 7», sin domicilio ni empaque.
2. **Ubicación del teléfono.** Si el cliente toca «Usar mi ubicación», la app mide la distancia al punto del negocio:
   - **A menos de `radioMetros`** (descontando el margen de error del GPS): propone «Comer aquí».
   - **Más lejos, dentro de `maxKm`:** activa el domicilio solo, calcula la ruta y la tarifa.
   - **Más lejos que `maxKm`:** propone «Recoger».
3. **El cliente siempre decide.** Puede cambiar a Comer aquí / Recoger / Domicilio en el resumen. Si no da permiso de ubicación, escribe su dirección o toca el mapa y mueve el pin hasta su puerta.

El GPS de un teléfono se equivoca entre 5 y 50 m, y más bajo techo. Por eso la ubicación solo *propone* «Comer aquí» y el QR manda.

## 7. Mapas y rutas: servicios gratuitos y sus reglas

| Servicio | Uso | Regla principal |
|---|---|---|
| Mosaicos de **OpenStreetMap** | El dibujo de las calles | Uso moderado, con atribución visible (la app la muestra). Si el negocio crece, use un proveedor de mosaicos con plan propio. |
| **OSRM** (servidor demostrativo) | Calcular la ruta en moto o carro | Es un servicio *best effort*, sin garantía, y puede retirar el acceso. Permite uso comercial si el producto es de acceso público, sin muro de pago y con atribución. Para volumen alto, monte su propio OSRM o use un servicio pago. |
| **Nominatim** | Buscar la dirección escrita | Máximo 1 consulta por segundo y sin autocompletar. La app solo consulta cuando la persona pulsa «Buscar». |

**Sin señal o si un servicio falla,** la app sigue funcionando:
- calcula la distancia en línea recta × 1,35 y la marca como «aproximada»;
- muestra la ruta sobre un plano simple.

Para cambiar de proveedor, edite las direcciones en `config.js → servicios`.

## 8. Formas de pago

- **Efectivo:** el cliente dice con cuánto paga y la app calcula el cambio. El panel lo muestra para que el domiciliario lleve las vueltas.
- **Transferencia:** muestra la llave Bre-B o el Nequi/Daviplata del negocio con botón «Copiar». El cliente envía el comprobante por el chat y el negocio confirma con el botón rápido «Pago recibido».
- **Tarjeta:**
  - En el local: datáfono en la mesa o en la caja.
  - A domicilio: datáfono contra entrega.
  - **El pago en línea con tarjeta está preparado pero apagado** (`pasarelaEnLinea: false`). Para activarlo hacen falta:
    1. una cuenta en una pasarela (Wompi, Mercado Pago o ePayco), con registro del negocio y comisión por transacción;
    2. una pequeña función en servidor que firme cada cobro con el secreto de integridad. Ese secreto **nunca** va en la app. Se puede hacer con una Edge Function de Supabase.

## 9. Chat y WhatsApp

- **Chat dentro de la app:** queda ligado a cada pedido. El negocio confirma, avisa de productos agotados, envía la llave de pago o dice que el pedido va en camino, y el cliente ve el estado al instante. Cada cambio de estado envía un mensaje automático.
- **WhatsApp:** con `negocio.whatsapp` configurado, el cliente puede enviar el pedido ya armado (con el enlace del mapa) al WhatsApp del negocio. Desde el panel, el negocio puede escribirle al cliente por WhatsApp.
- **Ley 2300 de 2023:** los mensajes publicitarios solo pueden enviarse en sus horarios (lunes a viernes de 7 a. m. a 7 p. m. y sábados de 8 a. m. a 3 p. m.). Las confirmaciones de una operación que el cliente pidió están exceptuadas. Use el chat para el pedido, no para publicidad.

## 10. Datos personales (Ley 1581 de 2012)

- El registro pide autorización expresa para el tratamiento de datos, con su finalidad.
- El cliente puede borrar su cuenta, sus pedidos y su chat desde **Mi perfil**. En la nube se borran sus pedidos y mensajes. La cuenta de acceso la elimina el negocio en Authentication → Users cuando el cliente lo pida.
- El negocio debe tener una política de tratamiento de datos publicada y atender consultas y reclamos.

## 11. Pruebas que se hicieron

| Prueba | Resultado |
|---|---|
| Recorrido completo del cliente y del panel (`myr_flujo.py`), con animaciones y sin ellas | 40/40 en cada modo |
| Modo Supabase contra un servidor simulado (`myr_supabase.py`): registro, pedido, chat, permisos del personal, cambio de estado | 9/9 |
| Lighthouse móvil | Accesibilidad 100, buenas prácticas 100, rendimiento 92–97 |
| Esquema SQL | Sintaxis verificada con el analizador de PostgreSQL (pglast) |

**Lo que falta probar** antes de abrir al público:
- un proyecto Supabase real;
- teléfonos reales de gama baja;
- la ruta real con OSRM y los mosaicos de OpenStreetMap desde Mompox o la ciudad del negocio. En el entorno de pruebas esos servicios estaban bloqueados y se simularon.
