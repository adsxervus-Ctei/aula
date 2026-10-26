# Mesa y Ruta v2 · Guía de despliegue y uso

Prototipo PWA para restaurantes, asaderos y comidas rápidas de **Hatillo de Loba (Bolívar)**. Negocio de ejemplo: **Fogón del Río** (ficticio).

---

## 1. Probarlo en 2 minutos (modo demostración)

El modo demostración no necesita servidor. Todo se guarda en el navegador (IndexedDB).

1. Suba la carpeta a **GitHub Pages**: repositorio → *Settings → Pages → Deploy from branch → main / root*. También sirve Netlify o Vercel. Se necesita HTTPS para instalar la app, usar la voz y las notificaciones.
2. Abra la dirección desde el celular. La app identifica el equipo y, si se puede instalar, lo recomienda:
   - Android/Chrome: instalación directa.
   - iPhone/Safari: tres pasos con «Compartir → Agregar a inicio».
   - Abierta desde Facebook, Instagram o TikTok: botón «Abrir en Chrome».
3. Cuentas de prueba para el botón **«Soy del negocio»**:

| Rol | Correo | Clave |
|---|---|---|
| Superadministrador | super@mesayruta.co | SUPER-2026 |
| Administrador del negocio | admin@fogondelrio.co | FOGON-2026 |

> ⚠️ **Cambie o elimine estas cuentas** en `js/config.js → cuentasIniciales` antes de usar la app con público.

En modo demostración, varias pestañas del mismo navegador se sincronizan entre sí: puede abrir el cliente en una y el panel en otra. **Para usar varios teléfonos a la vez se necesita Supabase** (sección 3).

---

## 2. Configuración (`js/config.js`)

| Clave | Para qué |
|---|---|
| `negocio` | Nombre, dirección, coordenadas (Hatillo de Loba 8.95861, -74.0808), WhatsApp, horario y políticas que salen en el ticket. |
| `domicilio` | Tarifa base, valor por km, mínimo, distancia máxima, domicilio gratis desde, minutos de preparación. |
| `pagos` | Efectivo, transferencia (llave **Bre-B**, Nequi, Daviplata, titular) y tarjeta (datáfono al entregar). |
| `reservas` | Hora de apertura y cierre, intervalo, capacidad y días de anticipación. |
| `google.clientId` | Ingreso con Gmail (sección 4). |
| `supabase` | URL y llave pública del proyecto (sección 3). |
| `asistente.url` | Función de IA para el chat (sección 5). Vacía: responde el asistente local. |
| `reportes.cadaDias` | Cada cuántos días recuerda el consolidado (15). |

El menú, las salsas, las ocasiones y la publicidad **se editan desde el panel**, sin tocar código. El menú de ejemplo está en `js/catalogo.js`.

---

## 3. Varios teléfonos y computadores: Supabase (plan gratuito)

1. Cree un proyecto en supabase.com.
2. Abra *SQL Editor → New query*, pegue todo `supabase/esquema.sql` y ejecútelo (**Run**). Esto crea:
   - el personal con roles y permisos;
   - una tabla general de registros con seguridad por filas;
   - el depósito público de fotos `medios`.
3. **Primer superadministrador** (el equipo de la plataforma):
   - *Authentication → Users → Add user* (correo y clave);
   - luego, en SQL: `insert into public.perfiles (correo, nombre, rol) values ('su-correo@…', 'Equipo Mesa y Ruta', 'superadmin');`
   - repita estos dos pasos por cada integrante del equipo (por ejemplo, las 11 personas).
4. *Project Settings → API*: copie la **Project URL** y la **publishable/anon key** en `js/config.js → supabase`. Esa llave es pública por diseño; la seguridad la dan las reglas por filas.
5. *Authentication → Providers → Email*: para el piloto puede desactivar «Confirm email»; así el registro entra de una vez.

**Quién crea a quién:**
- El superadministrador crea al administrador del negocio (*Panel → Equipo*).
- El administrador crea a sus empleados: cajero, mesero, cocina o domiciliario, y marca sus permisos.
- Cada persona entra a **«Crear cuenta»** con el mismo correo, pone su clave y luego usa **«Soy del negocio»**.
- Solo un superadministrador puede crear otro superadministrador.

**Sin señal:** tras la primera vez con internet, la persona puede volver a entrar con el mismo correo y su clave. La credencial queda cifrada (hash) en el teléfono. Los pedidos hechos sin señal se envían solos al volver la conexión.

---

## 4. Ingreso con Gmail

1. Entre a console.cloud.google.com, cree un proyecto y vaya a *APIs y servicios → Credenciales → Crear ID de cliente OAuth → Aplicación web*.
2. En *Orígenes autorizados de JavaScript* ponga la dirección de la app (por ejemplo, `https://usuario.github.io`).
3. Copie el ID en `js/config.js → google.clientId`.
4. Si usa Supabase, actívelo también en *Authentication → Providers → Google* con ese mismo ID.

Sin `clientId`, el botón de Gmail lleva al registro con correo y clave.

---

## 5. Chat con inteligencia artificial

- **Por defecto**, el chat lo responde un **asistente local** que funciona sin internet. Responde:
  - el estado del pedido y cuánto falta;
  - el horario y el domicilio;
  - los medios de pago.
  
  Cuando no sabe o el cliente pide una persona, avisa al negocio. El panel muestra ese chat como «Pide persona».
- **Para IA real** (modelo Claude de Anthropic):
  ```
  supabase functions deploy asistente --no-verify-jwt
  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
  ```
  Luego ponga en `asistente.url` la dirección `https://<proyecto>.functions.supabase.co/asistente`.
  - La llave queda en el servidor, nunca en la app.
  - Si la función falla, la app vuelve sola al asistente local.
  - El uso de la API tiene costo por consumo.

---

## 6. Qué hace cada rol

| Sección del panel | Admin / Super | Cajero | Mesero | Cocina | Domiciliario |
|---|---|---|---|---|---|
| Resumen | ✔ | ✔ | ✔ | ✔ | ✔ |
| Pedidos (tablero, estados, ticket, chat) | ✔ | ✔ | ✔ | ver y estado | ver, estado y cobro |
| Caja (ingresos, egresos, cierre del día) | ✔ | ✔ | — | — | — |
| Menú (fotos, ofertas, disponibilidad) | ✔ | — | — | — | — |
| Publicidad (anuncios de la parte de arriba) | ✔ | — | — | — | — |
| Reservas | ✔ | ✔ | ✔ | — | — |
| Equipo (roles y permisos) | ✔ | — | — | — | — |
| Reportes (consolidado de 15 días) | ✔ | — | — | — | — |

Los permisos de cada empleado se pueden ajustar uno por uno en *Equipo*.

**Consolidado cada 15 días.** El panel muestra un aviso cuando se cumple el plazo. El botón genera un **Excel con 7 hojas**:
- Resumen
- Ventas
- Detalle
- Ingresos
- Egresos
- Cierres
- Por producto

También hay CSV, versión para imprimir o guardar en PDF y el paquete de tickets.

**QR de mesa.** En *Ajustes → QR de mesas* se imprimen los códigos. Al escanearlos, el pedido queda marcado «a la mesa N».

---

## 7. Fotos del menú

- Las fotos de ejemplo vienen de **Unsplash**, con licencia libre para uso comercial y sin atribución obligatoria. Se cargan desde internet y el teléfono las guarda para verlas sin señal.
- Se eligieron por su descripción. **Revise que cada foto corresponda al plato.** Lo ideal es reemplazarlas por **fotos reales de las preparaciones del negocio**.
- Para cambiar una foto: *Panel → Menú → Editar → Subir foto*. Se reduce sola a 1000 px en formato WebP.
- Si una foto no carga, la app muestra una ilustración del plato.

---

## 8. Notas legales (Colombia)

- **Ticket:** es un comprobante del pedido. **No reemplaza la factura electrónica** (DIAN), si el negocio está obligado a expedirla.
- **Datos personales:** Ley 1581 de 2012. El registro pide autorización expresa, y el cliente puede borrar su cuenta y sus pedidos desde *Perfil*. Publique la política de tratamiento del negocio.
- **Consumidor:** Ley 1480 de 2011. El ticket muestra precio total, medio de pago y políticas. El derecho de retracto no aplica a alimentos perecederos (art. 47).
- **Publicidad:** las ofertas deben indicar condiciones y vigencia. Si envía promociones por WhatsApp, respete la Ley 2300 de 2023: solo a quien lo autorizó, de lunes a viernes de 7 a. m. a 7 p. m. y sábados de 8 a. m. a 3 p. m.; nunca domingos ni festivos.
- **Emprendimiento:** Ley 2069 de 2020.
- **Pagos:** la app no procesa tarjetas en línea. La tarjeta se cobra con datáfono al entregar, y la transferencia se verifica manualmente («Marcar pagado»).

---

## 9. Voz, notificaciones y videos

- Cuando el pedido pasa a **«Listo»** o **«En camino»**, el teléfono del cliente:
  - lo **anuncia por voz** («Ana, su pedido ya está listo…»);
  - suena, vibra y muestra una notificación.
  
  Esto funciona **mientras la app esté abierta o en segundo plano reciente**. Para avisos con la app totalmente cerrada se necesita *Web Push* con un servidor; queda como mejora futura.
- **Video tutorial** (`video/`): uno para el cliente y otro para el dueño. Salen solo la primera vez; se pueden repetir desde *Perfil* o desde el panel. En los videos los platos aparecen como ilustraciones, porque se grabaron sin acceso a las fotos.

---

## 10. Pruebas

En la carpeta `pruebas/` están los scripts automáticos (Python + Playwright). Ver `pruebas/LEAME.md`.
