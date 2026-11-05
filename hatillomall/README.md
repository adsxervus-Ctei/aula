# HatilloMall · Hatillo de Loba, Bolívar

Marketplace y sistema de negocios en una sola app web instalable (PWA). El cliente ve todos los negocios del pueblo y pide a domicilio, aparta mesa o pasa a recoger. El dueño lleva ventas, gastos, ganancia, inventario y fiados sin cuaderno. El equipo de HatilloMall aprueba negocios, activa planes e Impulsos y liquida la comisión.

Meta del censo del equipo: **74 negocios** (39 de comercio, 29 restaurantes, 3 farmacias, 3 depósitos). La app muestra al equipo cuántos van vinculados por sector.

## Quién ve qué

| Rol | Entra con | Qué puede hacer |
|---|---|---|
| **Cliente** | correo y clave | Ver negocios y ofertas, pedir en 3 modalidades, pagar en efectivo, por transferencia (Bre-B, Nequi, Daviplata) o fiado si el negocio lo autorizó, chatear dentro del pedido, seguir el estado |
| **Dueño** (plan PLUS) | correo y clave | Tablero del día, pedidos con alarma, caja, gastos con foto, balance, inventario, clientes y fiados, productos, ofertas e Impulso, empleados, comisión, historial, ajustes |
| **Dueño** (plan Vitrina, gratis) | correo y clave | Aparece con foto, productos y WhatsApp. No recibe pedidos ni usa el sistema |
| **Cajero** | usuario (ej. `rancho-cajero`) y clave | Solo «Anotar venta» y «Pedidos». No ve ganancia, gastos, inventario ni historial, y no anula ventas |
| **Equipo** (superadministrador) | correo y clave | Cobertura de los 74 negocios, aprobar o suspender, planes y comisión, Impulsos, liquidaciones, usuarios, zonas, avisos |

## Reglas que garantiza la base de datos (no solo la pantalla)

- **Precios, domicilio y comisión los calcula la base de datos.** El cliente no puede cambiar un precio. La comisión es el 10 % de los productos, nunca del domicilio.
- **Comisión solo por pedidos de la app entregados.** Una venta anotada a mano en la caja nunca cuenta como venta por app.
- **Plan Vitrina:** no recibe pedidos ni publica ofertas. **PLUS** con fecha de vencimiento (prueba de 15 días, luego mensual).
- **Nadie borra ventas ni gastos.** Solo el dueño los anula, con motivo, y queda quién y cuándo.
- **Historial inmutable:** ventas, gastos, fiados, inventario, cierres, productos, empleados, clientes, Impulsos, liquidaciones, cambios de estado de pedidos y del negocio. Nadie lo edita ni lo borra desde la app.
- **Fiado:** solo a clientes que el dueño marcó de confianza. El cajero no puede autorizarlos. Las deudas solo nacen de una venta fiada.
- **Inventario:** la cantidad solo cambia con entradas y salidas registradas.
- **Cierre de caja:** la base calcula el efectivo esperado; se cierra una vez al día, con firma.
- **Impulso:** el negocio lo pide; solo el equipo lo activa (48 horas, $15.000) y avisa a todos.
- **Archivos privados:** los comprobantes de pago y las facturas solo los ven quien los subió, el dueño del negocio y el equipo.
- **Sin internet:** ventas y gastos se guardan en el celular y se suben solos al volver la señal, sin duplicarse.

`supabase/test-seguridad.mjs` comprueba 93 de estas reglas sobre PostgreSQL real. `supabase/prueba-navegador.py` recorre la app completa con cada rol en un navegador (60 comprobaciones, incluida la prueba de apagón).

## Tecnología

| Parte | Herramienta | Costo |
|---|---|---|
| App | React + Vite, PWA (se instala desde el navegador) | — |
| Base de datos, usuarios, archivos, tiempo real | Supabase (PostgreSQL) | Gratis para el piloto; Pro US$25/mes para operar sin pausas |
| Hosting | **Cloudflare Pages** (su plan gratis permite uso comercial) | Gratis |
| Notificaciones al celular | Web Push propio (función `send-push`) | Gratis |
| Cobros | QR y llave Bre-B de cada negocio; el dinero va directo al negocio | Gratis |

> No use Vercel Hobby ni GitHub Pages para HatilloMall: sus condiciones no permiten uso comercial.

```
hatillomall/
├── index.html, vite.config.js, package.json, .env.example
├── public/            manifest, íconos, sw.js (notificaciones y apertura sin señal), _headers
├── src/
│   ├── api/           supabaseApi.js (real) · demoApi.js (demo) · index.js
│   ├── lib/           format.js · offline.js (cola sin internet) · media.js (fotos y alarma) · push.js
│   ├── pages/         client.jsx · order.jsx · auth.jsx · panel.jsx · panel2.jsx · admin.jsx
│   └── App.jsx, ui.jsx, styles.css
└── supabase/
    ├── schema.sql                      base de datos completa
    ├── functions/send-push/index.ts    notificaciones
    ├── functions/empleados/index.ts    crear cajeros con usuario y clave
    ├── test-seguridad.mjs              93 pruebas de reglas y permisos
    └── prueba-navegador.py             60 pruebas de punta a punta
```

---

## Puesta en marcha

Necesita un computador con [Node.js 20 o superior](https://nodejs.org) y cuentas gratuitas en Supabase y Cloudflare, creadas con un correo del proyecto (no personal).

### 1. Base de datos
1. En [supabase.com](https://supabase.com): **New project**, nombre `hatillomall`, región São Paulo. Guarde la contraseña de la base de datos.
2. **SQL Editor → New query**: pegue todo `supabase/schema.sql` → **Run**. Debe decir *Success*. Crea las tablas, las reglas, las 11 zonas de Hatillo de Loba y los 4 sectores con su meta.
3. **Project Settings → API Keys**: copie la **Project URL** y la llave **publishable**. La llave secreta nunca va en la app.

### 2. Ingreso
**Authentication → Sign In / Providers → Email**: actívelo. Para el piloto puede apagar *Confirm email*. Para el lanzamiento, configure un correo propio en **Authentication → Emails → SMTP Settings** (el de Supabase es solo para pruebas). En **Authentication → URL Configuration** ponga la dirección final de la app.

### 3. Llaves de notificaciones
```bash
npx web-push generate-vapid-keys
```

### 4. Funciones del servidor
Despliegue `send-push` y `empleados` (por **Edge Functions → Deploy a new function → Via Editor**, con esos nombres exactos, o con `npx supabase functions deploy <nombre>`). En **Edge Functions → Secrets** agregue `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`mailto:correo-del-equipo@gmail.com`).

### 5. Publicar
```bash
npm install
cp .env.example .env      # llene los 4 valores
npm run build
```
En Cloudflare: **Workers & Pages → Create → Pages → Upload assets**, suba la carpeta `dist`. Luego conecte el dominio (por ejemplo `hatillomall.com`) en **Custom domains**.

### 6. Primer integrante del equipo
Regístrese en la app y ejecute en el **SQL Editor**:
```sql
update public.profiles set role = 'superadmin' where email = 'su-correo@gmail.com';
```
Desde **Equipo → Usuarios** se da el acceso a los demás.

### 7. Primer negocio (Rancho Costeño)
1. Don Juan se registra y en *Perfil → Registrar mi negocio* llena los datos, incluidos los del vendedor (Ley 1480).
2. El equipo lo aprueba y en *Plan y comisión* activa **PLUS · Prueba 15 días**.
3. Don Juan carga productos, marca zonas y tarifas de domicilio en *Ajustes*, registra su llave Bre-B y crea el usuario del cajero en *Empleados*.

### 8. Prueba de humo (dos celulares)
- [ ] Cliente pide un Asado Especial a domicilio → al dueño le suena la alarma y le llega el aviso.
- [ ] El dueño acepta → al cliente le cambia el estado y le llega el aviso.
- [ ] Al entregarlo, la venta aparece en la caja como «App».
- [ ] Apague el wifi y los datos, anote una venta, vuelva a conectar: «Se subieron 1 registro pendiente».
- [ ] El equipo genera la liquidación de la semana.

## Desarrollo
```bash
npm install
npm run dev            # con .env usa Supabase; sin .env, modo demo
npm run build:demo     # demo en un solo archivo: dist-demo/index.html
npm run test:db        # 93 pruebas de la base de datos (necesita: npm i -D @electric-sql/pglite)
python3 supabase/prueba-navegador.py   # 60 pruebas en navegador (necesita Playwright y build:demo)
```

## Cumplimiento (revisar con abogado y contador)
- **Ley 1581 de 2012:** el registro pide autorización de tratamiento de datos. Falta publicar la política de tratamiento y un correo para solicitudes.
- **Ley 1480 de 2011, art. 53:** cada negocio registra nombre o razón social, identificación, dirección y teléfono, visibles para el comprador.
- **Ley 2300 de 2023:** los recordatorios de cobro solo se habilitan en horario permitido y las ofertas por WhatsApp solo a quien las aceptó. Los festivos no se detectan solos: no envíe esos días.
- **Farmacias:** solo venta libre; la app lo recuerda al cliente y al dueño.
- **HatilloMall** no recibe dinero de los clientes: el pago va directo al negocio. La comisión y el plan se facturan aparte (RUT y facturación según el contador).

## Lo que queda para una fase siguiente
Calificaciones de clientes, pagos en línea con pasarela, mapa del domiciliario en vivo, recuperar clave del cajero por WhatsApp y mensajes automáticos con la API oficial de WhatsApp.
