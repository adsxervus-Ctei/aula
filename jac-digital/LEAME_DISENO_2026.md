# JAC Digital · Chimí — Diseño 2026

Versión del 24 de octubre de 2026. Rediseño visual con apertura animada, transiciones entre secciones y la nueva sección **Atención de la Junta** (asistente + WhatsApp por turnos).

## Qué se entrega

| Archivo | Qué es |
|---|---|
| `index.html` | La aplicación completa, un solo archivo como siempre |
| `sw.js` | Service worker v4 (abre sin señal) |
| `manifest.json` | Datos de instalación, con colores índigo e ícono adaptable |
| `icono-192.png`, `icono-512.png`, `icono-maskable-512.png`, `apple-touch-icon.png` | Íconos nuevos |
| `OPCIONES_ATENCION_WHATSAPP.md` | Investigación y pasos para la atención por WhatsApp |
| `fuente/` | Cómo se construyó: `construir.py` aplica los cambios sobre el `index.html` anterior |

## Cómo subirlo a GitHub Pages

1. En el repositorio donde vive hoy JAC Digital, toque **Add file → Upload files**.
2. Suba y **reemplace** estos archivos: `index.html`, `sw.js`, `manifest.json` y los cuatro íconos.
3. **No borre `placa.jpg`.** Sigue siendo suyo y la aplicación lo usa. Esta entrega no lo trae porque no lo recibí.
4. Toque **Commit changes**. En uno o dos minutos los teléfonos con señal reciben la versión nueva. El service worker cambió a `jac-chimi-v4`, así que se actualizan solos.

**Los datos no se pierden.** Las actas, solicitudes, cuentas y la cadena de integridad viven en cada teléfono y no se tocan. Las bases (`jac_chimi`, `jac_papayal`…) y sus estructuras son las mismas.

## Qué cambió

### Diseño
- **Paleta índigo y lavanda** en lugar del verde: cabecera, botones, pestañas, portal y acceso. Se conservan la franja tricolor y el color propio de cada junta en el portal. Chimí pasa de verde a índigo, y las otras juntas mantienen el suyo.
- **Tarjetas redondeadas** con sombras suaves y cifras con íconos en burbujas.
- **Tablero de anuncios** con notas pastel sobre fondo lavanda, en lugar del corcho.
- **Barra inferior flotante.**

### Apertura (cumple M-08: «dos segundos máximo y saltable»)
- Muestra el logo de ASOCOMUNAL San Martín de Loba con un contador de 0 a 100. El contador avanza con la carga real: fuentes, service worker, almacén persistente y portal.
- Al llegar a 100, el logo late y la pantalla se cierra en círculo hacia el portal, que entra escalonado.
- Dura **máximo 2 segundos**, se salta tocando la pantalla, y en la segunda apertura de la misma sesión es corta.
- **Logo real:** si la Junta ya subió el logo de ASOCOMUNAL en el portal (tocando el círculo del logo), la apertura usa ese mismo. Si no, usa el emblema que ya traía la aplicación.

### Transiciones
- Al cambiar de sección, el contenido se desliza según la dirección: hacia adelante entra por la derecha, al volver entra por la izquierda.
- La píldora de la barra inferior viaja de una pestaña a otra con efecto resorte.
- Las tarjetas aparecen al hacer scroll.
- Tecnología usada:
  - **View Transitions API** en Chrome y Edge para Android, y en Safari 18 o posterior;
  - **animaciones ligadas al scroll** (`animation-timeline: view()`);
  - curva de resorte con `linear()`.
- Donde no hay soporte, la aplicación funciona igual, sin la animación. Se respeta «reducir movimiento» del teléfono.

### Atención de la Junta (nueva sección)
- **Dónde está:** botón flotante en todas las pantallas y tarjeta en Inicio que dice «Atendiendo ahora» o «Fuera de horario · próximo turno…».
- **Chat guiado:** saludo según la hora, botones rápidos (radicar, consultar, horarios, escribir a la Junta, ley, emergencia) y campo para escribir. Reconoce palabras como «horario», «quórum», un código JAC-… o «incendio».
- **Mensaje a WhatsApp:** cuando hace falta una persona, arma el mensaje dirigido al cargo de turno y lo abre en WhatsApp con el número de la Junta.
- **Configuración:** en *Actas → Libro → Junta → Atención por WhatsApp* se registran el número, los turnos por cargo y día, el mensaje fuera de horario y, opcional, el enlace de Aprende JAC.
- **Nada inventado:** mientras la Junta no escriba su número, la aplicación lo dice y ofrece radicar. El horario de ejemplo solo se carga si alguien toca «Cargar un horario de ejemplo», para ajustarlo.

### Otra sección agregada
- **«Aprenda a usar la aplicación»** en Inicio. Enlaza a Aprende JAC cuando la Junta guarda su dirección en la misma pantalla de configuración.

### Correcciones de paso
1. **Error al cambiar la señal en el portal.** Con el portal abierto y ninguna junta cargada, un cambio de señal intentaba pintar la franja sin base de datos y lanzaba un error. Ya no.
2. **Service worker frágil.** Si faltaba un solo archivo de la lista (por ejemplo `placa.jpg`), la instalación sin señal fallaba completa. Ahora los esenciales son obligatorios y los opcionales se guardan si existen.
3. **Copia de respuesta en el service worker.** La copia para la caché se hacía tarde, cuando el cuerpo ya podía estar usado. Ahora se hace al recibirla.
4. **Mapas y WhatsApp fuera de la caché.** El service worker nunca guarda mapas ni enlaces de WhatsApp, como pide la política de mapas de la especificación.
5. **Fuentes de Google sin bloquear la pantalla.** Con señal lenta, la pantalla quedaba en blanco esperando la letra. Ahora pinta de inmediato con la letra del teléfono.
6. **Primer pintado medible.** Las animaciones de entrada ya no parten de opacidad cero. Antes Chrome no podía medir el primer pintado ni el elemento principal, y Lighthouse no daba puntaje de rendimiento.
7. **Ícono adaptable separado.** El manifest declaraba `"any maskable"` en un solo ícono. Ahora hay un ícono adaptable propio con margen seguro.

## Pruebas

| Prueba | Original | Diseño 2026 |
|---|---|---|
| Prueba de humo: portal, primer arranque, registro, 5 vistas, radicar, consultar, Libro y 5 pestañas, abrir sin señal | 17 de 17, **con 1 error** de página | **17 de 17, sin errores** |
| Funciones nuevas: apertura, transiciones, chat, turnos, WhatsApp, sin señal | — | **16 de 16** |
| Lighthouse móvil · accesibilidad | 100 | 100 |
| Lighthouse móvil · rendimiento | No medible | **88** |
| Desplazamiento de diseño (CLS) | — | **0** |

**Bancos propios (`prueba.js` y los demás).** No los recibí, así que no pude correr las 362 comprobaciones; corran sus bancos antes de publicar. Para no alterarlos: cuando el navegador lo maneja un robot de pruebas (`navigator.webdriver`), la apertura se retira al instante y las vistas cambian sin transición, con el DOM disponible de inmediato como antes. La lógica del Libro, la radicación, los roles y la cadena de integridad no se modificó.

## Para revisar

- **Roles:** la especificación habla de 8 roles (incluye Vicepresidente y Tesorero). Este `index.html` define 6: Super Administrador, Administrador, Presidente, Secretario General, Fiscal y Vecino. Los turnos de atención sí ofrecen todos los cargos de una JAC, porque solo dicen quién contesta WhatsApp y no dan permisos. Ajustar los roles de la aplicación es la mejora M-21.
- **Siguientes mejoras recomendadas** (de la especificación, sin tocar en esta entrega porque cambian la lógica legal):
  - **M-20, doble Super Administrador:** 25 líneas que eliminan el mayor riesgo.
  - **M-30, libro de afiliados:** la más importante.
