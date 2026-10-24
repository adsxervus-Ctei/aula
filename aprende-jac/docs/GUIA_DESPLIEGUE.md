# Guía de despliegue · Aprende JAC · Chimí

Versión 1.0.0 · 24 de octubre de 2026

Esta guía explica cómo publicar la aplicación gratis y, solo si el equipo
investigador lo decide, cómo conectar una base de datos gratuita.

---

## 0. Antes de empezar: ¿hace falta base de datos?

**No.** La aplicación funciona completa sin base de datos y sin servidor:

| Qué guarda | Dónde |
|---|---|
| Avance en las lecciones, guardados, tamaño de letra | En el teléfono (almacenamiento local del navegador) |
| Nombre o apodo, si la persona lo escribe | En el teléfono |
| Evaluaciones SUS (código seudónimo + respuestas) | En el teléfono; se descargan como CSV desde «Equipo investigador» |

Esto respeta el principio de JAC Digital: **nada en la nube**.

La base de datos de la sección 3 es **opcional** y solo sirve si el equipo
investigador quiere reunir las evaluaciones de varios teléfonos en un solo
lugar sin tener que recoger los CSV a mano. Si no lo necesitan, sáltense esa
sección.

---

## 1. Publicar en GitHub Pages (gratis)

GitHub Pages es el mismo servicio donde ya vive JAC Digital.

**Límites del plan gratuito** (documentación oficial de GitHub):
- Sitio publicado de hasta 1 GB (esta app pesa menos de 1 MB sin fotos).
- Ancho de banda de referencia: 100 GB al mes.
- El repositorio debe ser **público** en una cuenta gratuita.
- GitHub prohíbe usar Pages para transacciones sensibles como contraseñas o
  tarjetas. Esta app no maneja ninguna de las dos.

### Paso a paso

1. **Cuenta.** Entre a https://github.com y cree una cuenta (o use la de JAC Digital).
2. **Repositorio.** Toque **+ → New repository**.
   - Nombre: `aprende-jac`
   - Visibilidad: **Public**
   - Marque **Add a README file** y toque **Create repository**.
3. **Subir los archivos.** En el repositorio toque **Add file → Upload files**.
   - Descomprima el ZIP en su computador.
   - Arrastre **el contenido** de la carpeta `aprende-jac` (no la carpeta
     misma): `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll` y las
     carpetas `css`, `js`, `fonts`, `icons`, `img`, `docs`, `supabase`.
   - Si su explorador oculta `.nojekyll`, actívelo con «mostrar archivos
     ocultos». Ese archivo evita que GitHub procese el sitio.
   - Escriba un mensaje como «Versión 1.0.0» y toque **Commit changes**.
4. **Activar Pages.** Vaya a **Settings → Pages**.
   - En **Build and deployment → Source** escoja **Deploy from a branch**.
   - Rama: **main**, carpeta: **/ (root)** y toque **Save**.
5. **Esperar.** En uno o dos minutos aparece arriba el enlace:
   `https://SU-USUARIO.github.io/aprende-jac/`
6. **Probar en un teléfono Android con Chrome.**
   - Abra el enlace con señal.
   - Toque los tres puntos → **Instalar aplicación**. (La app también
     muestra su propio botón «Instalar» en el inicio.)
   - Active el modo avión y abra la app desde el ícono: debe abrir igual.
7. **Probar en iPhone.** Abra el enlace en **Safari** → botón **Compartir** →
   **Agregar a inicio**. En iPhone no existe aviso automático de instalación;
   la app muestra las instrucciones al tocar «Instalar».

### Dominio propio (opcional)

Si la Junta tiene un dominio, en **Settings → Pages → Custom domain** se
escribe y se sigue la guía de GitHub. HTTPS debe quedar activado
(**Enforce HTTPS**): sin HTTPS no hay instalación ni service worker.

---

## 2. Actualizar la aplicación

1. Edite el archivo que necesite. Todo el texto de las lecciones está en
   `js/contenido.js`.
2. **Obligatorio:** abra `sw.js` y suba el número de la primera línea útil:
   `const VERSION = "aprende-jac-v1.0.1";`
   Si no cambia la versión, los teléfonos seguirán mostrando la anterior.
3. Suba los archivos cambiados con **Add file → Upload files** (reemplazan a
   los existentes) y **Commit changes**.
4. Al abrir la app con señal, el teléfono descarga la versión nueva y avisa:
   «Hay una versión nueva. Cierre y abra la aplicación».

---

## 3. Base de datos opcional en Supabase (gratis)

### Qué guarda y qué no

| Sí se envía | Nunca se envía |
|---|---|
| Código seudónimo (P01, P02…) | Nombre o apodo |
| Puntaje SUS y las 10 respuestas | Cédula, celular, correo |
| Porcentaje de avance por taller | Firma, huella, fotos |
| Fecha | Ubicación |

La tabla rechaza cualquier código que no tenga la forma `letras + números`
(por ejemplo, rechaza «Juan Pérez»). Esto se probó antes de entregar.

### Límites del plan gratuito (página oficial de precios de Supabase)

- 2 proyectos activos, 500 MB de base de datos por proyecto.
- 5 GB de transferencia al mes.
- **El proyecto se pausa tras 7 días sin actividad.** Antes de cada jornada
  de evaluación, entre al panel y reactívelo si aparece pausado. Mientras está
  pausado, la app guarda las evaluaciones en el teléfono y las envía después.
- Para 12 participantes, el uso real queda muy por debajo de esos límites.

### Paso a paso

1. **Cuenta.** Entre a https://supabase.com → **Start your project** →
   inicie sesión con GitHub (la misma cuenta del paso 1).
2. **Proyecto.** **New project**:
   - Nombre: `aprende-jac`
   - Contraseña de la base: genere una fuerte y guárdela fuera del teléfono
     de la Junta. La app no la usa.
   - Región: la más cercana a Colombia que ofrezca el panel
     (por ejemplo, São Paulo).
   - Plan: **Free**. Toque **Create new project** y espere a que termine.
3. **Crear la tabla.** Menú **SQL Editor → New query**. Abra el archivo
   `supabase/esquema.sql`, copie **todo**, péguelo y toque **Run**.
   Debe decir *Success*. Esto crea la tabla `resultados`, activa la seguridad
   por fila y deja a la app con permiso **solo para insertar**.
4. **Copiar las llaves.** Menú **Project Settings → API Keys** (en algunos
   paneles aparece como **Data API**):
   - **Project URL**: algo como `https://abcdefghij.supabase.co`
   - **Publishable key**: empieza por `sb_publishable_`
   - **No copie nunca la secret key** (`sb_secret_…`) ni la `service_role`.
     Esas llaves no van en la app.
   - Si su proyecto solo muestra la llave antigua **anon** (empieza por
     `eyJ`), también funciona. Supabase anunció retirarlas a finales de 2026,
     así que prefiera la publishable.
5. **Configurar la app.** Abra `js/config.js` y llene:
   ```js
   supabaseUrl: "https://abcdefghij.supabase.co",
   supabaseAnonKey: "sb_publishable_xxxxxxxxxxxx",
   ```
6. **Publicar el cambio.** Suba la versión en `sw.js` (paso 2 de la sección 2)
   y suba `js/config.js` y `sw.js` a GitHub.
7. **Probar.**
   - En la app: **Perfil → Opine sobre la aplicación**, use el código `T01`
     y responda las 10 preguntas.
   - En Supabase: **Table Editor → resultados**. Debe aparecer la fila.
   - En la app: **Perfil → Equipo investigador** muestra «enviado».
   - Borre la fila de prueba desde el Table Editor.
8. **Ver resultados.** En **SQL Editor** ejecute
   `select * from resumen_sus;` para ver el promedio por junta, o exporte la
   tabla desde **Table Editor → Export → CSV**.

### Por qué es seguro publicar la llave publishable

La llave publishable es pública por diseño: cualquiera que abra la app puede
verla. La protección real está en la base de datos: la política de seguridad
solo permite **insertar** filas con la forma correcta. Con esa llave nadie
puede leer, cambiar ni borrar los resultados. Probado así:

| Acción con la llave de la app | Resultado |
|---|---|
| Insertar una evaluación válida | permitido |
| Leer la tabla o el resumen | bloqueado |
| Editar o borrar filas | bloqueado |
| Insertar un nombre como código | rechazado |

---

## 4. Lista de verificación antes de usarla con la comunidad

- [ ] El enlace abre con `https://`.
- [ ] En Android aparece «Instalar aplicación».
- [ ] Con el teléfono en modo avión, la app abre y muestra «Sin señal. Todo
      sigue funcionando».
- [ ] La lectura en voz alta suena en español en los teléfonos de la Junta.
      (Si no, en Android: Ajustes → Sistema → Idiomas → Salida de texto a voz
      → descargar el paquete de español.)
- [ ] Las fotos de `img/` tienen autorización escrita de las personas que
      aparecen.
- [ ] Si se usa Supabase: el proyecto está activo (no pausado) el día de la
      evaluación.
- [ ] El equipo descargó el CSV de cada teléfono como respaldo.

---

## 5. Compatibilidad comprobada y límites conocidos

| Función | Android + Chrome | iPhone + Safari |
|---|---|---|
| Instalar | Aviso automático y botón propio | Manual: Compartir → Agregar a inicio |
| Abrir sin señal | Sí | Sí |
| Lectura en voz alta | Sí (voz del sistema) | Sí (voz del sistema) |
| Buscar hablando | Sí, **necesita señal** | Depende de la versión; se oculta si no existe |
| Conservar lo guardado | Se pide almacenamiento persistente | Safari borra lo guardado si la app pasa **7 días sin abrirse** |
| Envío en segundo plano | No se usa | No existe |

Por el límite de iPhone, si algún participante usa iPhone, pídale abrir la
app al menos una vez por semana y descarguen su CSV al terminar cada sesión.
