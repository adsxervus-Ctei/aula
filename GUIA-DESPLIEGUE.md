# LobaMall v7 · Guía de despliegue (paso a paso)

> Yo no puedo publicar por ti ni darte un enlace: los pasos de abajo los haces tú en cada servicio.
> Lo que sí probé está en `ENTREGA.md` → "Qué probé y qué no".

La v6 se podía publicar en Netlify porque era solo HTML. **La v7 necesita un servidor Node.js y una base PostgreSQL**
(los repartidores, el admin y los QR entre celulares viven allí). Ruta gratis recomendada:

| Pieza | Servicio | Costo |
|---|---|---|
| Base de datos PostgreSQL | **Neon** (neon.tech) o Supabase | Plan gratis |
| Servidor Node.js (app + API) | **Render** (render.com) → Web Service | Plan gratis (ver advertencia) |
| Dominio lobamall.com | El registrador donde lo compres | Pago anual |

⚠️ **Advertencia del plan gratis de Render:** el servidor se duerme tras ~15 minutos sin visitas y tarda unos 50 segundos en despertar.
Para pruebas está bien; para operar con repartidores reales usa el plan pago más barato (Starter), que no se duerme.
Si se duerme, los avisos push y el vencimiento de ofertas se detienen mientras duerme.

---

## Paso 1 · Subir el código a GitHub
1. Descomprime `lobamall-v7.zip`.
2. Súbelo a tu repositorio (el mismo de HatilloMall, en una rama nueva `v7`, o uno nuevo).
3. Verifica que **no** subiste `node_modules/` ni ningún `.env` (el `.gitignore` ya los excluye).

## Paso 2 · Crear la base de datos (Neon)
1. Entra a https://neon.tech → crea una cuenta → **New project** → nombre `lobamall`, región **US East** (la más cercana con plan gratis).
2. Copia la **connection string** (empieza por `postgres://` y termina en `?sslmode=require`).
3. No hace falta crear tablas: el servidor aplica las migraciones solo al arrancar (`api/migraciones/*.sql`). No borran datos.

## Paso 3 · Generar las llaves de los avisos (una sola vez, en tu computador)
```bash
npm install
npm run llaves-push
```
Copia las dos líneas `VAPID_PUBLICA=…` y `VAPID_PRIVADA=…`. Guárdalas en un lugar seguro: si las cambias, los celulares deben volver a activar los avisos.

## Paso 4 · Crear el servidor (Render)
1. https://render.com → **New → Web Service** → conecta tu repositorio de GitHub.
2. Configura:
   - **Runtime:** Node · **Build command:** `npm install --omit=dev` · **Start command:** `npm start`
   - **Health check path:** `/api/estado`
3. En **Environment** agrega (ver `.env.ejemplo`):
   - `DATABASE_URL` = la de Neon
   - `NODE_ENV` = `production`
   - `VAPID_PUBLICA`, `VAPID_PRIVADA`, `VAPID_CONTACTO`
   - `DB_MAX_CONEXIONES` = `5`
4. **Create Web Service**. En los registros (Logs) debes ver: `API y base de datos: activas.`
5. Abre `https://TU-SERVICIO.onrender.com/api/estado` → debe responder `{"ok":true,"db":true,"push":true,…}`.

## Paso 5 · Datos de prueba (solo si quieres la demostración)
La semilla crea cuentas con clave `1234`. **No la corras en la base real de producción.** Para una base de pruebas:
```bash
DATABASE_URL="la-de-neon-de-PRUEBAS" npm run semilla
```
Cuentas: `admin`, `equipo`, `rancho`, `rancho-cajero`, `drogueria`, `danto` (aprobado), `yeison` (pendiente), `kelly` (rechazado), `maria`, `juan`.

## Paso 6 · Crear el administrador real
En la consola SQL de Neon (cambia los datos):
```sql
-- 1) Crea la cuenta desde la app: entra a /#rep o regístrate como cliente con tu celular y una clave fuerte.
-- 2) Luego dale el rol de admin:
update usuarios set roles = array['admin','cliente'] where telefono = '3XXXXXXXXX';
```
Para el equipo de fotos: `array['equipo','cliente']`. Para conectar un negocio real con su dueño:
```sql
insert into negocios(id, nombre, categoria, municipio, zona_id, direccion, lat, lng, telefono, nequi)
values ('rancho','Rancho Costeño','comida','Hatillo de Loba','hatillo','Calle Principal', 8.95612, -74.07721, '300…', '310…');
insert into negocio_usuarios values ('rancho', (select id from usuarios where telefono='3XXXXXXXXX'), 'dueno');
update usuarios set usuario='rancho', roles = array['negocio','cliente'] where telefono='3XXXXXXXXX';
```
El `id` del negocio debe ser el mismo que usa la tienda (`rancho`, `drogueria`, `billar`…).

## Paso 7 · Tarifas y reglas
Entra a `https://TU-SERVICIO.onrender.com/#admin` → **Tarifas y reglas**:
- Revisa $4.000 (pueblo) y $8.000 (veredas). **Chimí no tiene coordenadas**: pon su latitud/longitud reales o deja los km de referencia.
- Agrega las veredas que falten (La Victoria, Las Brisas…).
- Minutos para que venza una oferta (10 por defecto).

## Paso 8 · Dominio lobamall.com
1. En Render → tu servicio → **Settings → Custom Domains** → agrega `lobamall.com` y `www.lobamall.com`.
2. En tu registrador crea los registros DNS que Render te indique (A/ALIAS y CNAME).
3. Render saca el certificado HTTPS solo. **Sin HTTPS no funcionan la cámara, la ubicación ni los avisos.**
4. Si usas un dominio distinto de lobamall.com, cambia `related_applications` en `manifest.webmanifest` (sirve para detectar que la app ya está instalada).
5. Los QR impresos llevan el dominio con el que se crearon: **imprime las etiquetas cuando ya estés en lobamall.com**, no en la dirección de prueba.

## Paso 9 · Probar en celulares (lista corta)
- [ ] Android con Chrome: abrir lobamall.com → Instalar.
- [ ] Repartidor: registrarse en `/#rep`, el admin lo aprueba, presiona ESTOY CONECTADO, toca **Activar avisos**.
- [ ] Negocio en otro celular: acepta un pedido → NECESITO REPARTIDOR → al repartidor le suena.
- [ ] Cerrar la app del repartidor y publicar otra oferta → debe llegar la notificación del sistema.
- [ ] Imprimir una hoja de etiquetas y escanear una con la **cámara normal** de otro celular.
- [ ] Conectar un lector USB al computador del negocio y disparar a una etiqueta.
- [ ] Billar: la mesera abre una mesa, dos clientes escanean el QR, anota un chico y una cerveza, cierra y cada uno ve lo que paga.

## Correr todo en tu computador (sin nube)
```bash
# 1. PostgreSQL local (o una base de Neon de pruebas)
# 2. En la carpeta del proyecto:
npm install
DATABASE_URL=postgres://usuario:clave@localhost/lobamall npm run semilla
DATABASE_URL=postgres://usuario:clave@localhost/lobamall npm start
# 3. Abre http://localhost:8080
```
En `localhost` la cámara y los avisos funcionan (el navegador lo trata como seguro). Desde otro celular por la IP del wifi **no** (no es HTTPS).

## Pruebas automáticas
```bash
npm test                                                     # 29 pruebas de la tienda (no necesitan base)
TEST_DATABASE_URL=postgres://…/lobamall_test npm run test:api   # 20 pruebas de la API
TEST_DATABASE_URL=postgres://…/lobamall_test npm run test:v7    # 17 pruebas de navegador de lo nuevo
```
`TEST_DATABASE_URL` debe ser una base **solo de pruebas** (el nombre debe contener "test"): las pruebas la borran.
