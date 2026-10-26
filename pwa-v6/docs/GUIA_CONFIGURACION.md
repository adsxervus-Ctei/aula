# Mesa y Ruta v6 · Guía de configuración

Copia de la guía publicada en Claude (26 de octubre de 2026). La guía anterior, con el detalle de cada función, está en `GUIA_DESPLIEGUE.md`.

## 1. Qué queda público en GitHub

Todo lo que está dentro del zip queda a la vista de cualquier persona si el repositorio es público. Con GitHub Pages gratis, el repositorio tiene que ser público.

| Qué | ¿Se ve en GitHub? | Comentario |
| --- | --- | --- |
| Código de la app, guías (`docs/`), pruebas (`pruebas/`), base de datos (`supabase/esquema.sql`) | Sí | Es normal; no tiene secretos |
| `js/config.js` (WhatsApp, coordenadas, llaves de pago que ponga ahí) | Sí | Ponga las llaves de pago desde *Admin → QR y ajustes*, no en este archivo |
| Cuentas demo (correo + huella de la clave) | Sí, la huella | Las claves de ejemplo están en esta guía: cámbielas antes de abrir al público |
| Llave publicable de Supabase (`sb_publishable_…`) | Sí | Es pública por diseño; la seguridad la dan las reglas por filas |
| Llave secreta de Supabase, llave de la IA (`sk-ant-…`), llave privada de la pasarela | **Nunca** | Van solo como «secretos» en Supabase |
| Pedidos, clientes, caja, reservas | No | Viven en el navegador (modo demo) o en Supabase |

**Para publicar:**
- En el repositorio, borre los archivos anteriores y suba todo el contenido del zip (no la carpeta, su contenido), incluida la carpeta oculta `.github`.
- En el celular, abra la app dos veces: la primera baja la versión nueva y la segunda ya la usa.

Si prefiere que el código no se vea:
- GitHub Pages con repositorio privado exige un plan de pago.
- Netlify o Cloudflare Pages conectados a un repositorio privado son gratis.

## 2. Cuentas y acceso de Admin

| Para | Dónde entra | Correo | Clave |
| --- | --- | --- | --- |
| Cliente con historial | «Ya tengo cuenta» | cliente@demo.co | DEMO-2026 |
| Administrador del negocio | Botón **Admin** | admin@fogondelrio.co | FOGON-2026 |
| Superadministrador | Botón **Admin** | super@mesayruta.co | SUPER-2026 |
| Clave de caja | Al abrir o cerrar caja | — | 1234 |

**Lo que se corrigió:**
- Si el navegador borraba los datos locales, las cuentas de Admin no se volvían a crear. Ahora se revisan en cada apertura y se recrean si faltan.
- El correo acepta mayúsculas y la clave ignora un espacio al final.

Si ya entró como cliente: *Perfil → «¿Trabaja en el negocio? Entrar como Admin»*.

## 3. Instalación

La hoja de instalación sale **cada vez que se abre la app**, también en computador.

| Situación | Qué muestra la app |
| --- | --- |
| Abierta desde el ícono instalado | Aviso «App instalada en su equipo» |
| En el navegador con la app ya instalada | «Ya está instalada en su equipo: ábrala desde el ícono» |
| Android con Chrome, Edge o Samsung | Botón **Instalar**, o los pasos del menú ⋮ (el botón aparece solo apenas el navegador lo habilita) |
| iPhone o iPad | Compartir → «Agregar a inicio» → Agregar |
| Computador con Chrome o Edge | Ícono ⊕ de la barra de direcciones |
| Dentro de Facebook, Instagram o TikTok | «Abrir en Chrome» |

## 4. Fotos del menú

Las fotos no salían porque el celular no lograba descargarlas de Unsplash. Ahora GitHub las baja al propio sitio (`img/fotos`) cada vez que se publica.

Activarlo una sola vez:
1. Suba el zip v5 completo, incluida la carpeta oculta `.github`. Si no la puede subir: en GitHub, *Actions → New workflow → «set up a workflow yourself»*, pegue el contenido de `.github/workflows/publicar.yml` y guárdelo como `publicar.yml`.
2. *Settings → Pages → Build and deployment → Source*: **GitHub Actions**.
3. *Actions → «Publicar la app (con fotos)» → Run workflow*. El resumen dice cuántas fotos quedaron dentro del sitio.

Para comprobarlo, use *Admin → QR y ajustes → Revisar fotos*.

Para poner fotos propias: *Admin → Menú y fotos → Editar → Subir foto*.

## 5. Supabase (todos los celulares conectados)

1. Cree un proyecto en supabase.com.
2. *SQL Editor*: pegue y ejecute `supabase/esquema.sql`.
3. *Authentication → Users → Add user*: cree cada superadministrador. Luego, por cada uno: `insert into public.perfiles (correo, nombre, rol) values ('correo@...', 'Nombre', 'superadmin');`
4. *Project Settings → API Keys* (o el botón **Connect**): copie la URL del proyecto y la llave publicable (`sb_publishable_…`) en `js/config.js → supabase`. La llave secreta nunca va en la app.
5. Para el piloto, apague «Confirm email» en *Authentication → Providers → Email*.

## 6. Google (Gmail)

1. Entre a console.cloud.google.com y cree un proyecto.
2. En *Google Auth Platform*: llene **Branding** (nombre y correo de la app) y en **Audience** escoja Externo y publíquela.
3. *Clients → Create client → Web application*.
4. En «Orígenes autorizados de JavaScript» ponga `https://SU-USUARIO.github.io`.
5. Copie el ID de cliente en `js/config.js → google.clientId`.
6. Con Supabase: active el proveedor Google con el mismo ID y su secreto.

## 7. Asistente del chat

El asistente local ya funciona, sin configurar nada. Para usar IA real (con costo por uso):
1. Cree una llave en console.anthropic.com.
2. En Supabase: *Edge Functions → Via Editor*, cree la función `asistente` con `supabase/functions/asistente/index.ts` y apague «Verify JWT».
3. En *Secrets*, agregue `ANTHROPIC_API_KEY`.
4. Copie la URL de la función en `js/config.js → asistente.url`.

## 8. Pagos

- **Bre-B:** registre la llave del negocio en su banco (Bre-B → Registrar llave) y descargue el QR. Luego, en *Admin → QR y ajustes*, ponga la llave, el titular y suba el QR.
- **Comprobante:** el cliente sube la captura en *Su pedido*. El negocio la ve en el detalle del pedido y toca «Marcar pagado».
- **Pago en línea:** cree en su pasarela (Wompi, Bold, Mercado Pago, ePayco) un link de pago reutilizable con monto abierto y péguelo en *Enlace de pago en línea*. El cobro automático con el monto exacto requiere integrar la pasarela en el servidor.

## 9. Consolidado cada 15 días

Al entrar como Admin sale una ventana con tres botones:
- **Generar ahora (Excel):** descarga el consolidado (8 hojas, incluida la asistencia) y marca el corte.
- **Más tarde: mañana** o **En 3 días:** pospone el aviso.

Con el panel abierto en segundo plano llega una notificación con **Generar ahora** y **Más tarde**.

## 10. Carné del personal y asistencia

**Hacer el carné:**
1. En *Admin → Equipo y roles → Editar*, suba la foto y llene cargo, documento, RH y hora de entrada.
2. Toque **Carné**: se crea el código (por ejemplo `MYR-S5TE6R33`), con vigencia de un año.
3. Descárguelo o imprímalo en tamaño tarjeta (54 × 86 mm).

**Verificar el carné:**
- Al escanear el QR con cualquier celular se abre la app y dice si el carné es válido, está vencido, está desactivado o no se reconoce.
- Si un carné se pierde, toque «Generar código nuevo»: el anterior deja de servir.

**Marcar la asistencia:**
- Deje un celular o tableta en la entrada con *Admin → Asistencia* abierta (permiso «Tomar asistencia»).
- Cada persona escanea su carné al llegar (entrada) y al irse (salida). La app la saluda por su nombre y dice si llegó a tiempo o tarde.
- Si no hay cámara, se escribe el código.

**Ajustes y registros:**
- La hora de entrada y la tolerancia por defecto están en `js/config.js → asistencia`; cada persona puede tener su propio turno.
- Los registros salen en la hoja «Asistencia» del consolidado.
- Con Supabase, el carné se verifica desde cualquier celular. En modo demostración, solo en el equipo donde se creó.

## 11. Tutoriales con voz y música

**Cuándo salen solos:**
- **Cliente:** al crear la cuenta, y otra vez la primera vez que abre la app instalada.
- **Panel del negocio:** la primera vez que entra cualquier persona del personal, y otra vez en la app instalada.

**Dónde verlos después:**
- Cliente: *Perfil → Ver el tutorial*.
- Personal: el botón ▶ del panel.

Usan voz femenina latinoamericana (Kokoro, ef_dora con fonética es-419), en tono cercano, con música original y subtítulos. En el menú, el tutorial ya muestra el toque al plato para ver el detalle.

Después de instalar sale la pantalla «Instalación finalizada», con los pasos para abrir la app desde el ícono. El navegador no puede cerrarse ni abrir la app solo; en computador, Chrome sí la abre.

## 12. Novedades de la versión 6

**Diseño:** inicio, menú y resumen en negro con dorado. En el menú, el resplandor cambia de color con cada plato, se asoman los platos vecinos y, al tocar el plato, este se corre a la derecha y aparece el detalle (etiquetas, nombre, descripción, precio grande y botón dorado). En el resumen, el plato se va a la izquierda. Las imágenes de receta, salsas y bebidas son más grandes. Si el teléfono pide «reducir movimiento», las animaciones se apagan.

**Logo:** *Admin → QR y ajustes → Subir logo* (PNG cuadrado, mínimo 512 × 512, fondo transparente). Sale en toda la app, el ticket, el carné y el informe PDF. Para el ícono de la app instalada: **Íconos para el botón de la app (.zip)** y suba a GitHub la carpeta `icons` del zip, reemplazando la anterior. Luego suba `VERSION` en `sw.js`.

**Perfil del cliente:** pedidos, total gastado, cada cuánto pide, su plato favorito, lo que más pide y **Repetir mi último pedido**.

**Clientes frecuentes (Admin → Clientes):** el cliente más frecuente, segmentos (fieles, frecuentes, nuevos, por recuperar), gasto, promedio, frecuencia, último pedido y plato favorito. Desde ahí se arma una oferta por WhatsApp con el % de descuento y la fecha límite, y la lista se descarga en PDF o Excel. La app avisa cuando está fuera del horario permitido por la Ley 2300 de 2023 (lunes a viernes de 7 a. m. a 7 p. m. y sábados de 8 a. m. a 3 p. m.; nunca domingos ni festivos). Envíe ofertas solo a quien aceptó recibirlas.

**Informe PDF:** *Consolidado → Ver informe · PDF e imprimir* abre el informe dentro de la app con los botones **Guardar PDF**, **Imprimir**, **Compartir** (en celular) y cerrar. Antes se abría en una ventana aparte sin botones, que los celulares bloquean.

**Importar y exportar la base (Admin → Menú y fotos):**
- **Exportar base** descarga un Excel con 5 hojas: Categorías, Menú, Salsas, Ocasiones y Publicidad. Es el mismo formato que se importa.
- **Importar Excel o CSV:** primero muestra una vista previa (filas nuevas, filas que actualizan y errores, como un precio que no es número). Luego se escoge **Agregar y actualizar** (no borra nada) o **Reemplazar** (deja solo lo del archivo; ideal al empezar de cero).
- La columna **ID** decide: igual = se actualiza; vacía = se crea un producto nuevo. Ingredientes y ocasiones van separados por coma. Disponible y Especialidad: SÍ o NO. Si el menú usa una categoría que no existe, se crea.
- Acepta `.xlsx` y `.csv` (separado por punto y coma o por coma, UTF-8). El `.xls` antiguo no: guárdelo como `.xlsx`.
- Mientras el menú sea el de ejemplo, la sección muestra «¿Empieza de cero? Importar mi menú».

**Videos de ayuda con voz (Admin → QR y ajustes → Videos de ayuda):** «Configurar toda la plataforma» y «Importar y actualizar la base». También están en la carpeta `video` del zip. Las pantallas de GitHub, Supabase y Google en el video son ilustraciones; las de la app son capturas reales.

**¿Por qué un pedido hecho en el celular no sale en el computador?** Sin Supabase, la app está en *modo demostración*: cada navegador guarda sus propios datos y no se comunica con los demás. Al poner la URL y la llave de Supabase en `js/config.js`, todos los equipos comparten pedidos, caja, clientes y menú. En *Perfil*, la línea «Datos» dice en qué modo está.

## 13. Antes de abrir al público

- [ ] Pages con GitHub Actions y fotos revisadas.
- [ ] Coordenadas, WhatsApp, Bre-B, QR y enlace de pago.
- [ ] Supabase y equipo creado.
- [ ] Clave de caja cambiada; cuentas y datos de ejemplo borrados.
- [ ] Menú importado o editado, y logo e íconos subidos.
- [ ] Prueba con dos celulares (el pedido del celular debe salir en el computador).

**Notas legales:**
- El ticket no reemplaza la factura electrónica (DIAN).
- Ley 1581 de 2012: publique la política de datos.
- Ley 1480 de 2011: estatuto del consumidor.
- Ley 2300 de 2023: horarios para mensajes promocionales.
