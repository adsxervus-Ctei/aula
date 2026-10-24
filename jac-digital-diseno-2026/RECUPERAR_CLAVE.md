# Recuperar la clave del Super Administrador por correo

JAC Digital no tiene servidor propio, así que no puede enviar correos por sí sola. Para que «¿Olvidó la clave? Recuperarla por correo» funcione se usa **EmailJS**, un servicio que envía correos desde la aplicación.

- **Costo:** su plan gratuito permite unos **200 correos al mes y 2 plantillas**, según un resumen de terceros verificado en octubre de 2026. Confírmelo en emailjs.com.
- **Configuración:** se hace una sola vez, antes de que alguien olvide la clave.

## Cómo funciona

1. En el candado del portal: **¿Olvidó la clave?** → la persona escribe su correo.
2. La aplicación revisa que ese correo sea de un Super Administrador registrado en ese teléfono. Si no lo es, no envía nada.
3. Genera un código de 6 dígitos y lo manda a ese correo. En el teléfono queda solo la huella del código, no el código.
4. La persona escribe el código y su clave nueva dos veces.
   - El código vence a los **15 minutos**.
   - Admite **5 intentos**.
5. La clave nueva queda en todas las juntas de ese teléfono donde ese correo es Super Administrador. Sirve en el candado y al entrar a la junta.

Se necesita señal para enviar el código.

## Paso a paso para activarlo

1. **Cuenta.** Entre a https://www.emailjs.com y cree una cuenta gratuita. Lo ideal es con el Gmail de la Junta.
2. **Servicio de correo.** *Email Services → Add New Service → Gmail* y conecte el Gmail de la Junta. Copie el **Service ID** (empieza por `service_`).
3. **Plantilla.** *Email Templates → Create New Template*:
   - **To Email:** `{{to_email}}`
   - **Subject:** `Código para recuperar su clave · ASOJUNTAS`
   - **Content:**
     ```
     Hola {{nombre}}:

     Su código para cambiar la clave de Super Administrador en {{junta}} es:

     {{codigo}}

     Vence a las {{vence}}. Si usted no lo pidió, ignore este correo:
     nadie puede cambiar la clave sin este código.
     ```
   - Guarde y copie el **Template ID** (empieza por `template_`).
4. **Llave pública.** *Account → General → Public Key*. Cópiela.
5. **Restringir el uso (muy recomendado).** En la configuración de seguridad de EmailJS, deje como origen permitido solo la dirección de la aplicación, por ejemplo `https://SU-USUARIO.github.io`. Así nadie más puede usar su cuenta desde otra página. Si EmailJS lo ofrece, active también el límite de envíos.
6. **Poner los tres datos en la aplicación.** Hay dos formas:
   - **En todos los teléfonos (recomendada):** abra `index.html`, busque `const CORREO_RECUPERACION` y llene:
     ```js
     const CORREO_RECUPERACION={servicio:'service_xxxxxxx',plantilla:'template_xxxxxxx',llave:'xxxxxxxxxxxxxxxx'};
     ```
     Suba el archivo a GitHub y cambie el número de versión en `sw.js` (`jac-chimi-v7`, etc.).
   - **Solo en un teléfono:** candado → clave → *Correo para recuperar la clave* → llenar y guardar.
7. **Probar.** Candado → ¿Olvidó la clave? → su correo. Debe llegar el código en menos de un minuto; revise también la carpeta de spam.

## Lo que hay que saber

- **La llave pública de EmailJS es pública por diseño.** La protección real son el origen permitido del paso 5 y que la plantilla solo diga lo necesario.
- **Si alguien tiene el teléfono y además acceso al correo del Super Administrador, puede cambiar la clave.** Por eso el correo debe ser de uso personal o de la Junta, con su propia clave fuerte.
- **Sin EmailJS configurado,** la opción lo dice claramente y no envía nada.
- **Segundo Super Administrador.** La forma más sencilla de no quedar bloqueados es tener dos en cada junta (máximo dos). Si uno olvida su clave, el otro sigue entrando.
