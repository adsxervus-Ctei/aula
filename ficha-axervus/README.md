# Ficha Resumen del Proyecto · Axervus (CTeI)

Aplicación web de una sola página para que cada estudiante desarrolle, desde su propia cuenta de Gmail, las secciones de la **ficha resumen del proyecto de investigación** de **Axervus (CTeI), Ciencia, Tecnología e Innovación**, y la envíe a su profesor. Todos trabajan sobre **el mismo proyecto**, pero cada uno argumenta con sus palabras y desde su punto de vista.

El profesor (**Rosembergth Castro Cervantes**, Docente Investigador y Director de Proyectos de Emprendimiento y Proyección Sociocultural) entra por **“Inicio del profesor”**. Desde ahí ve todos los consolidados y, con un botón, analiza las respuestas, escoge lo mejor de cada estudiante en cada sección y genera la **ficha final**: con **cronograma**, **presupuesto** y **anexo del prototipo de interfaz**. La puede ver en pantalla y descargarla en **Word** y en **PDF**.

---

## Contenido del repositorio

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la página. |
| `styles.css` | Diseño adaptable a computador, tablet y celular. |
| `app.js` | Toda la lógica: ingreso con Google, voz, dictado, asistente, envío y panel del profesor. |
| `apps-script/Code.gs` | Almacén compartido en una Hoja de Google. Se pega en Apps Script; **no** lo usa GitHub Pages. |
| `README.md` | Este instructivo. |

## Qué hace

**Estudiante**
1. Ingresa con Gmail (Google Identity Services); la app lee su nombre.
2. Ve un mensaje de bienvenida en pantalla con su nombre.
3. Ve un repaso de lo que debe desarrollar en la semana.
4. Desarrolla las 8 secciones que le corresponden según la ficha: 1. Resumen · 2. Antecedentes y Justificación · 3. Problema de Investigación · 4. Objetivos · 5. Metodología · 6. Consideraciones Éticas · 8. Impacto y productos esperados · 10. Referencias. En cada sección tiene las instrucciones, un área de texto amplia, **dictado por voz**, un **asistente** de sinónimos, palabras clave y conectores (con reglas propias, sin API de pago) y una revisión en vivo. Al pulsar **Siguiente**, la respuesta se guarda (en `localStorage`, asociada a su correo) y aparece la marca ✓.
5. Ve una lista de verificación de cada sección y pulsa **“Enviar consolidado al profesor”**.

**Profesor**
1. Entra por “Inicio del profesor”. Solo funciona con el correo configurado.
2. Ve la lista de consolidados recibidos y puede abrir cada uno.
3. Completa el encabezado de la ficha: título, línea, semillero y fecha. Los proponentes se llenan solos con los nombres de los estudiantes.
4. Pulsa **“Analizar y generar ficha final”**. El análisis:
   - evalúa cada parte de cada estudiante: extensión, elementos que pide la ficha, claridad y vocabulario;
   - detecta respuestas casi idénticas entre estudiantes;
   - escoge la mejor respuesta por parte y respeta los límites de palabras al combinar;
   - une las referencias de todos sin duplicados;
   - propone **7. Cronograma**, **9. Presupuesto** y el **Anexo: prototipo de interfaz** (una pantalla por objetivo específico). Con el consolidado final y en la socialización de todos los entregables, el profesor diseña, elabora y explica de qué manera se hacen esos puntos.
   - incluye el **prototipo como rubro externo** del presupuesto («Servicios técnicos externos (prototipo)»: diseño UX/UI, desarrollo y alojamiento), porque su elaboración requiere servicios técnicos especializados que no hacen parte de la redacción de la ficha.
5. Puede cambiar la respuesta escogida, editar los textos, el cronograma y el presupuesto, y reemplazar pantallas del prototipo con imágenes propias.
6. Ve la vista previa y descarga en **Word (.docx)** o **PDF**.

---

## Los valores que debe configurar

Están marcados con `⚙️ CONFIGURAR` al inicio de `app.js`:

```js
const GOOGLE_CLIENT_ID = 'PEGA_AQUI_TU_ID_DE_CLIENTE.apps.googleusercontent.com'; // (1)
const PROFESOR_EMAIL  = 'prod.axv@gmail.com';                                 // (2)
const APPS_SCRIPT_URL = 'PEGA_AQUI_LA_URL_DE_APPS_SCRIPT';                        // (3)
```

1. **ID de cliente de Google**: lo obtiene en el paso 3.
2. **Correo del profesor**: ya está puesto (`prod.axv@gmail.com`).
3. **URL de Apps Script**: es el almacén compartido; sin ella el profesor no podría ver los consolidados de todos. La obtiene en el paso 4.

En `apps-script/Code.gs` se repiten `CLIENT_ID` y `PROFESOR_EMAIL`, con los mismos valores.

> **Modo de prueba:** mientras `GOOGLE_CLIENT_ID` conserve el texto `PEGA_AQUI`, la app pide nombre y correo en lugar de Google, y guarda todo en el mismo navegador. Sirve para probarla completa (estudiantes y profesor) antes de configurar.

---

## Paso 1. Crear el repositorio en GitHub

1. Entre a <https://github.com> con su cuenta (o créela).
2. Pulse **New** (o el botón **+** → **New repository**).
3. En **Repository name** escriba, por ejemplo, `ficha-axervus`.
4. Marque **Public**. GitHub Pages es gratuito para repositorios públicos.
5. Pulse **Create repository**.

## Paso 2. Subir los archivos y activar GitHub Pages

1. En el repositorio nuevo pulse **uploading an existing file** (o **Add file → Upload files**).
2. Arrastre `index.html`, `styles.css`, `app.js`, `README.md` y la carpeta `apps-script`.
3. Escriba un mensaje (por ejemplo, “Primera versión”) y pulse **Commit changes**.
4. Vaya a **Settings** (Configuración) → **Pages**, en el menú izquierdo.
5. En **Build and deployment → Source** elija **Deploy from a branch**.
6. En **Branch** elija `main` y la carpeta `/ (root)`. Pulse **Save**.
7. Espere 1 o 2 minutos y recargue la página. Arriba aparecerá la dirección del sitio, por ejemplo:
   `https://SU-USUARIO.github.io/ficha-axervus/`
   **Copie esa dirección**: la necesita en el paso 3.

## Paso 3. Crear el ID de cliente OAuth 2.0 en Google Cloud Console

1. Entre a <https://console.cloud.google.com/> con la cuenta del profesor (o la cuenta responsable).
2. Arriba, en el selector de proyectos, pulse **Nuevo proyecto**. Póngale un nombre (por ejemplo, `Ficha Axervus`) y pulse **Crear**. Asegúrese de que quede seleccionado.
3. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth** (o **Google Auth Platform → Branding**):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `Ficha Resumen Axervus (CTeI)`; correo de asistencia: el del profesor.
   - Guarde.
   - En **Público / Audience**, pulse **Publicar app** (pasar a “En producción”) para que cualquier estudiante con Gmail pueda ingresar. La app solo pide nombre, correo y foto, que no requieren verificación de Google.
4. Menú ☰ → **APIs y servicios** → **Credenciales** → **+ Crear credenciales** → **ID de cliente de OAuth**.
5. Tipo de aplicación: **Aplicación web**. Nombre: `Ficha Axervus web`.
6. En **Orígenes autorizados de JavaScript** pulse **+ Agregar URI** y escriba **solo el origen** de GitHub Pages, sin la carpeta y sin barra final:
   `https://SU-USUARIO.github.io`
   (Opcional, para probar en su computador: `http://localhost:8000` y `http://localhost`.)
7. Pulse **Crear** y copie el **ID de cliente**. Termina en `.apps.googleusercontent.com`.
8. En GitHub abra `app.js` → ícono del lápiz (**Edit**) → reemplace el valor de `GOOGLE_CLIENT_ID` por su ID → **Commit changes**.

> Si al ingresar aparece “Error 400: origin_mismatch”, el origen del punto 6 no coincide exactamente con la dirección del sitio. Los cambios de Google pueden tardar unos minutos en aplicarse.

## Paso 4. Crear el almacén compartido con Google Apps Script

1. Con la cuenta del profesor, cree una **Hoja de cálculo de Google** nueva en <https://sheets.new> y llámela `Consolidados Ficha Axervus`.
2. En la hoja: **Extensiones → Apps Script**.
3. Borre el contenido de `Código.gs`, pegue todo el contenido de `apps-script/Code.gs` de este repositorio y reemplace `CLIENT_ID` por el mismo ID de cliente del paso 3. `PROFESOR_EMAIL` ya está configurado.
4. Guarde (ícono de disco).
5. Pulse **Implementar → Nueva implementación**:
   - Ícono del engranaje → **Aplicación web**.
   - **Ejecutar como:** Yo (la cuenta del profesor).
   - **Quién tiene acceso:** **Cualquier usuario**.
   - Pulse **Implementar** y **autorice** los permisos que pide (hoja de cálculo, enviar correo y conectarse a servicios externos para verificar el ingreso). Si aparece “Google no verificó esta app”, pulse **Configuración avanzada → Ir a … (no seguro)**: es su propio script.
6. Copie la **URL de la aplicación web**. Termina en `/exec`.
7. En GitHub edite `app.js`, pegue esa URL en `APPS_SCRIPT_URL` y pulse **Commit changes**.
8. Espere 1 minuto y abra el sitio. Pruebe primero como estudiante y luego entre por “Inicio del profesor”.

> **Si modifica `Code.gs` más adelante:** use **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Así la URL `/exec` se mantiene igual.

**Seguridad:** cada envío lleva el token de ingreso de Google, y el script lo verifica con Google. El nombre y el correo guardados son los de la cuenta verificada, no los que escriba el navegador. Solo el correo del profesor puede listar los consolidados. Si un estudiante envía de nuevo, se reemplaza su envío anterior.

## Paso 5 (opcional). Activar el análisis con IA (Claude)

Por defecto el análisis funciona **sin IA y sin costo**, con reglas propias. Para usar Claude más adelante:

1. Obtenga una clave en <https://console.anthropic.com/>. Es un servicio **de pago por uso**.
2. En Apps Script: **Configuración del proyecto** (engranaje) → **Propiedades de la secuencia de comandos** → **Agregar propiedad**: nombre `ANTHROPIC_API_KEY`, valor: su clave. Guarde.
3. Listo. El botón del profesor cambia a “Analizar con IA y generar ficha final”. La IA escoge las mejores respuestas (sin reescribir a los estudiantes) y propone el cronograma, el presupuesto y las descripciones del prototipo. Si falla, la app usa automáticamente el análisis por reglas.

**La clave nunca va en `app.js`**: GitHub Pages es público y cualquiera podría verla y usarla.

---

## Limitaciones que conviene conocer

- **Envío.** Con Apps Script, el consolidado se guarda en la hoja y se notifica por correo al profesor (y al estudiante, con una copia). Una cuenta de Gmail gratuita puede enviar unos **100 correos al día** desde Apps Script; si se supera ese límite, el consolidado **igual queda guardado** en la hoja y visible en el panel. Si Apps Script no está configurado o falla, la app abre el **cliente de correo del estudiante** (`mailto:`) con el consolidado: el envío depende entonces de que tenga una aplicación de correo configurada y de que pulse “Enviar”. Algunos clientes cortan los mensajes largos; por eso el texto también se copia al portapapeles.
- **Dictado por voz.** Depende de que el navegador admita Web Speech API. **Google Chrome y Microsoft Edge** lo admiten mejor; Firefox no lo tiene, y en Safari es irregular. Requiere internet y permiso de micrófono, y el texto reconocido siempre debe revisarse.
- **Borradores.** Las respuestas en curso se guardan en el navegador y equipo donde se escriben. Si el estudiante cambia de computador antes de enviar, no verá su borrador. Lo enviado sí queda en la hoja del profesor.
- **Sesión de Google.** Dura 1 hora. Si vence, la app pide volver a ingresar antes de enviar, sin perder lo escrito.
- **Análisis automático.** Es una evaluación por reglas (criterios de la ficha, extensión, vocabulario y similitud), no una lectura humana. Por eso el profesor puede cambiar la selección y editar todo antes de descargar.
- **Presupuesto.** Los valores son **de referencia**, generados a partir de la metodología y los productos. Deben revisarse y ajustarse.
- **Prototipo.** Son maquetas de pantallas de referencia generadas a partir de los objetivos específicos, no capturas de una aplicación real; el prototipo real se contrata de manera externa y su costo va en el rubro «Servicios técnicos externos (prototipo)». Las pantallas se pueden reemplazar por imágenes propias.
- **PDF.** Se genera en el navegador. Si falla en algún equipo, la app abre la impresión para “Guardar como PDF”.

## Probar en su computador (opcional)

```bash
cd ficha-axervus
python3 -m http.server 8000
# Abrir http://localhost:8000
```
