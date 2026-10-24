# Opciones para la atención por WhatsApp · JAC Digital · Chimí

24 de octubre de 2026 · Investigación para la sección «Atención de la Junta»

## 1. Lo que quedó implementado en la aplicación

| Pieza | Qué hace | Costo |
|---|---|---|
| Asistente local | Saluda, orienta, lleva a Radicar, Consultar, Horarios o la guía de la ley. Funciona sin señal y sin servidor. | $0 |
| Botón de WhatsApp | Abre el chat de la Junta con un mensaje ya escrito, dirigido al cargo de turno. La persona revisa y toca enviar. | $0 |
| Turnos por cargo | La Junta define en **Actas → Libro → Junta → Atención por WhatsApp** qué cargo atiende qué días y a qué horas. | $0 |
| Fuera de horario | El asistente avisa que la Junta no está atendiendo y dice cuál es el próximo turno. El mensaje igual se puede enviar: queda en WhatsApp. | $0 |
| Sin señal | Con señal usa `https://wa.me/…`; sin señal usa `whatsapp://send?…`, que abre la app directo y WhatsApp lo envía cuando vuelve la señal. | $0 |

**Lo que no hace, a propósito:**
- **No es un chat en tiempo real dentro de la app.** La especificación lo descartó (M-12): la comunidad ya usa WhatsApp, y un chat propio exigiría servidor y señal.
- **No guarda conversaciones.** Lo que se escribe en el asistente no se almacena; solo sale si la persona lo envía por WhatsApp.
- **No pide cédula ni documentos** y advierte que no se envíen por chat.
- **No es un servicio de emergencias:** remite a la Línea 123.

## 2. Opciones del lado de la Junta (el teléfono que recibe)

### Opción A · WhatsApp Business (app gratuita) — **recomendada**

Se instala en el celular del número de la Junta.
- **Horario comercial y mensaje de ausencia.** En *Configuración → Herramientas para la empresa → Perfil de la empresa* se definen días y horas. Luego se activa el mensaje de ausencia con la opción «fuera del horario comercial». Así WhatsApp contesta solo cuando nadie está de turno.
- **Mensaje de bienvenida y respuestas rápidas** para preguntas repetidas (horarios, cómo radicar).
- **Varios dignatarios con el mismo número.** La app permite el teléfono principal más cuatro dispositivos vinculados, cinco en total. Cada dignatario de turno responde desde su propio aparato.
- **Límite real: no asigna conversaciones a personas.** Si dos dignatarios contestan a la vez, el vecino recibe dos respuestas. Por eso la aplicación indica en cada mensaje para qué turno es, y conviene acordar que **solo responde quien está de turno**.
- **Costo:** gratis. Los cambios de precios de octubre de 2026 son de la plataforma de pago (opción C), no de esta app.

### Opción B · Canal de WhatsApp para avisos

Para lo que hoy hace la franja informativa (convocatorias, avisos):
- Es gratis, de una sola vía y con varios administradores.
- Los números de quienes lo siguen quedan ocultos.
- Se crea en *WhatsApp → Novedades → Crear canal*.

Sirve para difundir, **no** para atender: los seguidores no pueden responder en el canal.

### Opción C · Plataforma de pago (API de WhatsApp Business) — **no recomendada ahora**

Sirve para bots automáticos y para asignar conversaciones por persona, pero:
- Exige un servidor propio o un proveedor intermediario, lo que va contra el costo cero y el «sin servidor» de JAC Digital.
- Exige verificación de la entidad ante Meta.
- Cobra por mensaje desde el 1 de octubre de 2026: las respuestas son gratis solo hasta 1.000 al mes por número.
- Sus mensajes viajan por servidores de terceros, con implicaciones de tratamiento de datos.

Tendría sentido solo si el volumen de mensajes desborda a los dignatarios.

## 3. Pasos para dejarlo funcionando

1. **Número.** La Junta escoge un celular propio (no el personal de un dignatario) e instala **WhatsApp Business**.
2. **Perfil.** Nombre «JAC Central de Chimí», dirección de la sede y descripción corta.
3. **Turnos.** En la asamblea o en junta directiva se acuerdan los turnos: qué cargo, qué días, qué horas. Conviene dejarlo en acta.
4. **En la app.** En *Actas → Libro → Junta → Atención por WhatsApp*:
   - escribir el número;
   - agregar los turnos acordados (o cargar el ejemplo y ajustarlo);
   - escribir el mensaje fuera de horario;
   - guardar.
5. **En WhatsApp Business.** Poner el **mismo horario** como horario comercial y activar el mensaje de ausencia «fuera del horario comercial».
6. **Dispositivos.** Vincular hasta cuatro teléfonos de los dignatarios de turno (WhatsApp → Dispositivos vinculados).
7. **Repetir en cada teléfono.** Los datos de JAC Digital viven en cada teléfono. El número y los turnos se configuran en el teléfono de la Junta y viajan en el respaldo («Exportar todo» / «Importar todo») a los demás.
8. **Probar.** Abrir la app como vecino, tocar «Escribir a la Junta», enviar un mensaje de prueba y confirmar que llega y que fuera de horario llega el mensaje de ausencia.

## 4. Datos personales

- Los mensajes de WhatsApp que recibe la Junta contienen datos personales. **La responsable de su tratamiento es la Junta** (Ley 1581 de 2012), igual que con la radicación.
- Acordar quién puede leer el chat de la Junta y qué se hace con lo que llega. Un mensaje no reemplaza una solicitud radicada: si pide algo formal, se radica.
- No pedir por chat cédulas, fotos de documentos ni datos de salud.

## Fuentes

- [Enlaces wa.me (formato y mensaje prellenado)](https://bird.com/explained/whatsapp/what-is-a-whatsapp-click-to-chat-link.md)
- [Horario comercial y mensaje de ausencia en WhatsApp Business (Platzi)](https://platzi.com/cursos/whatsapp-for-business/mensajes-de-bienvenida-y-ausencia/)
- [WhatsApp Business con varios usuarios: límites (Sinch)](https://sinch.com/blog/whatsapp-business-multiple-users/)
- [Canales de WhatsApp (Infobip)](https://www.infobip.com/blog/how-to-use-whatsapp-channels-for-your-business)
- [Precios de la plataforma desde el 1 de octubre de 2026 (Voltade, resumen de las tarifas de Meta)](https://voltade.com/blog/whatsapp-replies-stop-being-free-1-october-2026)
