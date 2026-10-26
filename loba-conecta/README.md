# Loba Conecta · Hatillo de Loba

Plataforma web (instalable en el celular) para los negocios de Hatillo de Loba: los vecinos ven negocios, menús, productos y promociones, hacen pedidos y reciben avisos de cada novedad. Los dueños administran su negocio y el equipo del proyecto supervisa todo.

| Rol | Quién | Qué puede hacer |
|---|---|---|
| **Cliente** | Cualquier vecino que se registra | Ver negocios y novedades, pedir, seguir sus pedidos, activar notificaciones |
| **Administrador (negocio)** | El dueño de cada negocio | Registrar su negocio, cargar productos/menú, publicar novedades, atender pedidos |
| **Superadministrador** | El equipo del proyecto | Aprobar o suspender negocios, gestionar usuarios y roles, moderar publicaciones, avisos generales, estadísticas |

## Cómo funcionan las publicaciones y los avisos

1. Un negocio **aprobado** publica (nuevo menú, promoción, servicio o producto). El equipo puede publicar **avisos generales**.
2. **Todos** la ven en *Novedades*, incluso visitantes sin cuenta.
3. Los usuarios con sesión abierta reciben un aviso **al instante** dentro de la app y la campana muestra el número de novedades sin leer.
4. Quien activó las notificaciones recibe un **aviso en el celular aunque tenga la app cerrada** (Web Push).
5. Cada publicación se notifica **una sola vez**. El dueño recibe aviso de cada pedido nuevo y el cliente de cada cambio de estado.

> **iPhone:** las notificaciones solo funcionan si el usuario agrega la app a su pantalla de inicio (Compartir → "Agregar a inicio", iOS 16.4 o superior). En Android con Chrome funcionan directamente.

## Tecnología

- **Frontend:** React + Vite, aplicación web progresiva (PWA): se instala como app y abre rápido con poca señal.
- **Backend:** [Supabase](https://supabase.com) — base de datos PostgreSQL, usuarios con correo y contraseña, imágenes, tiempo real y una función para notificaciones.
- **Seguridad:** las reglas viven en la base de datos (Row Level Security), no solo en la pantalla. Ver `supabase/schema.sql`.
- **Modo demo:** sin configurar Supabase, la app arranca con datos de ejemplo guardados en el navegador.

```
loba-conecta/
├── index.html, vite.config.js, package.json
├── public/            manifest, íconos y service worker (sw.js: notificaciones)
├── src/
│   ├── api/           supabaseApi.js (real) · demoApi.js (demo) · index.js (elige)
│   ├── lib/           push.js (notificaciones) · format.js (pesos, fechas, WhatsApp)
│   ├── pages/         client.jsx · auth.jsx · panel.jsx (negocio) · admin.jsx (equipo)
│   ├── App.jsx, ui.jsx, styles.css
└── supabase/
    ├── schema.sql                   tablas, reglas de seguridad, datos iniciales
    ├── functions/send-push/index.ts función de notificaciones
    └── test-seguridad.mjs           52 pruebas de permisos (npm run test:db)
```

---

## Puesta en marcha (paso a paso)

Necesitas: un computador con [Node.js 20 o superior](https://nodejs.org), una cuenta gratuita de Supabase y una de [Netlify](https://netlify.com) (u otro hosting estático). Crea las cuentas a nombre del proyecto, con un correo del equipo.

### 1. Crear la base de datos

1. En Supabase: **New project**. Nombre: `loba-conecta`. Región: la más cercana (por ejemplo, São Paulo o East US). Guarda la contraseña de la base de datos.
2. Abre **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**. Debe terminar sin errores.
3. En **Project Settings → API** copia la **Project URL** y la **anon public key**.

### 2. Configurar el ingreso con usuario y contraseña

En **Authentication → Providers → Email**: deja activado *Email*.

- **Confirmar correo:** se recomienda activarlo. El servicio de correo que trae Supabase por defecto tiene un límite de envíos muy bajo y es para pruebas; para el lanzamiento configura un SMTP propio en **Authentication → SMTP Settings** (por ejemplo, el plan gratuito de Brevo). Durante el piloto puedes desactivar la confirmación.
- En **Authentication → URL Configuration** pon como *Site URL* la dirección final de la app (paso 5).

### 3. Llaves de notificaciones (VAPID)

En la carpeta del proyecto:

```bash
npx web-push generate-vapid-keys
```

Obtienes una **Public Key** y una **Private Key**. La privada **nunca** va en el código.

### 4. Función de notificaciones

**Opción A, desde el navegador:** Supabase → **Edge Functions → Deploy a new function → Via editor**. Nombre exacto: `send-push`. Pega el contenido de `supabase/functions/send-push/index.ts` y despliega.

**Opción B, con terminal:**

```bash
npx supabase login
npx supabase link --project-ref TU_REF
npx supabase functions deploy send-push
```

Después, en **Edge Functions → Secrets** agrega:

| Nombre | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | la llave pública |
| `VAPID_PRIVATE_KEY` | la llave privada |
| `VAPID_SUBJECT` | `mailto:correo-del-equipo@gmail.com` |

### 5. Publicar la app

```bash
npm install
cp .env.example .env      # y llena los 3 valores
npm run build
```

Arrastra la carpeta `dist` a [app.netlify.com/drop](https://app.netlify.com/drop). Netlify te da una dirección con HTTPS (obligatorio para notificaciones e instalación). Luego puedes conectar un dominio propio, por ejemplo `lobaconecta.co`.

### 6. Crear el primer superadministrador

1. Entra a la app publicada y regístrate con tu correo.
2. En Supabase → SQL Editor ejecuta:

```sql
update public.profiles set role = 'superadmin' where email = 'tu-correo@gmail.com';
```

3. Desde ese momento, en **Administración → Usuarios** puedes dar el rol de superadministrador a los demás integrantes del equipo.

### 7. Prueba de humo

- [ ] Registrarse como cliente desde un celular Android y activar notificaciones.
- [ ] Con otra cuenta, registrar un negocio; el superadmin lo aprueba.
- [ ] El negocio carga 3 productos y publica un menú → al cliente le llega el aviso con la app cerrada.
- [ ] El cliente hace un pedido → al negocio le llega el aviso; lo marca "Aceptado" → al cliente le llega el aviso.

---

## Desarrollo local

```bash
npm install
npm run dev           # con .env: usa Supabase; sin .env: modo demo
npm run build:demo    # genera dist-demo/index.html (demo en un solo archivo)
npm run test:db       # 52 pruebas de permisos sobre el esquema
```

## Costos y límites (plan gratuito de Supabase, verificar en supabase.com/pricing)

- 500 MB de base de datos, 1 GB de imágenes, 50.000 usuarios activos al mes y 500.000 ejecuciones de funciones al mes: suficiente para Hatillo de Loba.
- **Un proyecto gratuito se pausa si pasa una semana sin uso.** Con uso diario no ocurre; si se pausa, se reactiva desde el panel. Para operación estable a largo plazo, el plan Pro cuesta US$25 al mes.
- Netlify: plan gratuito suficiente para el piloto.

## Datos personales

El registro exige la autorización de tratamiento de datos (Ley 1581 de 2012). Antes del lanzamiento, el equipo debe publicar su **política de tratamiento de datos** y definir un correo para que los usuarios pidan corrección o eliminación. Los dueños solo ven nombre y celular de quienes les han hecho pedidos.

## Lo que la app NO hace (por diseño)

- No cobra en línea: el pago es en efectivo o transferencia directa al negocio (Nequi, Daviplata, Bre-B). Así no hay comisiones ni intermediarios.
- No emite factura electrónica DIAN: eso se hace con la solución gratuita de la DIAN o un proveedor certificado.
- No recomienda medicamentos: en farmacias, siempre decide el regente.
