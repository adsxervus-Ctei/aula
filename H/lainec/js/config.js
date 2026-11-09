/* Lainec · configuración
   Para activar "Continuar con Google" de verdad:
   1. Entra a https://console.cloud.google.com → APIs y servicios → Credenciales.
   2. Crear credenciales → ID de cliente de OAuth → Aplicación web.
   3. En "Orígenes autorizados de JavaScript" pon tu dominio publicado, por ejemplo https://hatillomall.netlify.app
      (y http://localhost:8080 para probar en tu computador).
   4. Copia el ID (termina en .apps.googleusercontent.com) y pégalo abajo.
   Mientras esté vacío, el botón funciona en modo simulado. */
window.HM_CONFIG = {
  googleClientId: ''
};
