# Mesa y Ruta v7 · Guía de configuración

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

Activarlo una sola vez (pasos según la interfaz de GitHub de octubre de 2026):
1. **Subir los archivos.** Si el repositorio está vacío, toque el enlace «uploading an existing file». Si ya tiene archivos, use *Add file → Upload files*. Arrastre todo el contenido del zip (son 93 archivos; GitHub acepta hasta 100 por vez), incluida la carpeta `.github`, y toque **Commit changes**. Si no se sube la carpeta `.github`: *Actions → New workflow → «set up a workflow yourself»*, pegue el contenido de `.github/workflows/publicar.yml` y guárdelo como `publicar.yml`.
2. **Escoger la fuente.** Vaya a *Settings → Pages → Build and deployment → Source* (es una lista desplegable) y escoja **GitHub Actions**. Si dice «Deploy from a branch», cámbiela: con esa opción GitHub publica los archivos tal cual, no baja las fotos y además choca con el flujo de la app. Al escoger GitHub Actions desaparecen los selectores de rama (main / root).
3. **Publicar.** Entre a la pestaña *Actions* y, a la izquierda, a «Publicar la app (con fotos)». Toque **Run workflow ▾**, deje la rama `main` y toque el botón verde **Run workflow**. El flujo también corre solo cada vez que sube un cambio. Cuando sale el chulo verde, el resumen dice cuántas fotos quedaron dentro del sitio.
4. La dirección de la app es `https://SU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/` (por ejemplo, `…github.io/aula/`). Aparece en *Settings → Pages*, en «Your site is live at».

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
4. En «Authorized JavaScript origins» ponga solo `https://SU-USUARIO.github.io`: sin el nombre del repositorio y sin barra al final.
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

## 13. Novedades de la versión 7

**Si la app se queda cargando en el celular.** Abra `https://SU-USUARIO.github.io/SU-REPOSITORIO/?reparar`: borra solo lo guardado en ese teléfono (sesión y copia sin señal) y abre la app limpia; los pedidos en la nube no se pierden. Además:
- Si la apertura tarda más de 12 segundos, salen los botones **Reintentar** y **Reparar la app**.
- Cada llamada a internet tiene tiempo máximo: con señal mala, el pedido queda guardado en el teléfono y se envía solo después, en vez de quedarse pensando.
- La app se actualiza sola en cada publicación (ya no hay que abrirla dos veces).

**Transferencias: solo cuentan cuando se verifican.** Un pedido pagado por transferencia no se suma a las ventas, al balance ni al consolidado hasta que alguien con permiso revisa el comprobante y toca **Marcar pagado**. El Resumen y la Caja muestran «N transferencias por verificar» con su valor, y en Pedidos está el filtro **Por verificar**. Efectivo y tarjeta se cuentan al entregar, como antes.

**Inventario (Admin → Inventario).**
- Para cada plato o porción, bebida y salsa se escribe cuántas hay («Hay»). Vacío = sin control (nunca se agota solo).
- Cada pedido descuenta lo que lleva: platos, salsas (una por plato) y bebidas. Si el pedido se cancela, se devuelve.
- Con 5 o menos (o el número que ponga en «Avisar en») sale el aviso «por agotarse» en el panel, con sonido y notificación: toca reponer para la producción. **Lista para reponer** la descarga en PDF.
- En 0, el cliente lo ve **agotado y en gris** y no lo puede agregar; tampoco puede pedir más de lo que queda.
- El interruptor apaga un producto a mano (también se ve agotado). Las existencias también van en el Excel de «Exportar / Importar base» (columnas «Existencias» y «Avisar en»).
- Con Supabase, vuelva a ejecutar `supabase/esquema.sql` completo una vez: agrega la función que descuenta el inventario y el permiso «Inventario» (el rol Caja lo trae).

**Fotos reales de ingredientes y salsas.** *Menú y fotos → Fotos de ingredientes y salsas*: suba una foto cuadrada por ingrediente (paso 1 del pedido) y por recipiente de salsa (paso 2). Sin foto se ve la ilustración. También se pueden poner por enlace en la hoja «Ingredientes» y en la columna «Foto» de «Salsas» del Excel.

**Pasos del pedido.** Paso 1: verificar ingredientes (quitar o poner). Paso 2: salsas en recipientes aparte. Paso 3: bebida. Paso 4: resumen y modo de pago. Al enviar: «¡Gracias por su selección, (nombre)! En breve nos estaremos comunicando con usted».

**Pago por transferencia en el celular del cliente.** Cada medio (Bre-B, Nequi, Daviplata) sale con **Copiar**, **Abrir la app** (en Android; si no abre, lleva a la tienda donde aparece «Abrir») y, para Bre-B, **Guardar QR** para pagarlo desde la galería en la app del banco. Una página web no puede abrir Nequi o Daviplata con el valor ya escrito ni enviarles la notificación: eso solo lo hace una pasarela.

**Pago en línea con Wompi (opcional, recomendado).** Con Wompi, al cliente le llega la notificación a su Nequi con el valor exacto (Daviplata con código por SMS, PSE, botón Bancolombia, tarjeta) y el pago se confirma **solo**: el pedido queda «pagado» y entra al balance sin revisar comprobantes.
1. Cree la cuenta de comercio en comercios.wompi.co (persona natural o empresa) y espere la aprobación.
2. En *Desarrolladores* copie la **llave pública** (`pub_prod_…`) y, en *Secretos para integración técnica*, el **secreto de integridad** y el **secreto de eventos**.
3. En Supabase: *Edge Functions → Deploy a new function → Via Editor*, nombre `pagos`, pegue `supabase/functions/pagos/index.ts` y apague **Verify JWT**. En *Secrets* agregue `WOMPI_LLAVE_PUBLICA`, `WOMPI_INTEGRIDAD` y `WOMPI_EVENTOS`.
4. En Wompi → *Desarrolladores* → **URL de eventos**: `https://SU-PROYECTO.functions.supabase.co/pagos`.
5. En la app: *Admin → QR y ajustes → Función de pagos en línea*: la misma dirección. Guarde.
6. Pruebe con las llaves de pruebas (`pub_test_…`, y el secreto `WOMPI_PRUEBAS = 1`) antes de pasar a producción.
Wompi cobra una comisión por transacción según su plan; revísela antes de activarlo.

**Menú del panel.** En computador, el botón **☰** deja el menú solo con íconos para ganar ancho; al pasar el mouse se abre encima; otro clic en ☰ lo deja fijo. En tableta arranca con íconos. En celular hay una barra abajo con Resumen, Pedidos, Caja, Inventario y **Más** (todas las secciones en cuadrícula, el tutorial y cerrar sesión).

**App limpia.** El zip ya no trae clientes ni pedidos de ejemplo: solo las cuentas del negocio. En Supabase, para borrar los clientes y pedidos de prueba, ejecute `supabase/limpiar_datos_de_prueba.sql` (revise primero el conteo de la parte 1). Conserva el menú, los ajustes y el equipo.

## 14. Antes de abrir al público

- [ ] Pages con GitHub Actions y fotos revisadas.
- [ ] Coordenadas, WhatsApp, Bre-B, QR y enlace de pago.
- [ ] Supabase y equipo creado.
- [ ] Clave de caja cambiada; cuentas y datos de ejemplo borrados.
- [ ] Menú importado o editado, y logo e íconos subidos.
- [ ] Prueba con dos celulares (el pedido del celular debe salir en el computador).
- [ ] Existencias cargadas en Inventario (o vacías = sin control).
- [ ] `limpiar_datos_de_prueba.sql` ejecutado: sin clientes ni pedidos de prueba.

**Notas legales:**
- El ticket no reemplaza la factura electrónica (DIAN).
- Ley 1581 de 2012: publique la política de datos.
- Ley 1480 de 2011: estatuto del consumidor.
- Ley 2300 de 2023: horarios para mensajes promocionales.
