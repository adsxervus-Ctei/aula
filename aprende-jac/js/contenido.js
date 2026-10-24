/* =========================================================================
   Aprende JAC · Chimí — Contenido pedagógico
   Todo el texto de la app vive aquí. Para corregir una lección, edite este
   archivo y suba de nuevo la carpeta (y suba la VERSION en sw.js).
   Fuente: Especificación funcional JAC Digital · Chimí (23-oct-2026).
   ========================================================================= */
window.CONTENIDO = {
  bienvenida: [
    {
      foto: "img/bienvenida-1.jpg",
      pie: "Foto: vecinos reunidos en la sede comunal de Chimí",
      titulo: "Bienvenido a Aprende JAC",
      texto: "Aquí aprende, a su ritmo, a usar la aplicación de la Junta. Funciona sin señal."
    },
    {
      foto: "img/bienvenida-2.jpg",
      pie: "Foto: una persona mayor aprendiendo a usar el teléfono",
      titulo: "Escuche cada lección",
      texto: "Toque el botón de la bocina y el teléfono le lee la lección en voz alta."
    },
    {
      foto: "img/bienvenida-3.jpg",
      pie: "Foto: dignatarios firmando el acta de la asamblea",
      titulo: "Aprender la app es aprender la Junta",
      texto: "Quórum, convocatoria, actas y sus datos: lo que la aplicación hace, usted lo entiende."
    }
  ],

  categorias: [
    { id: "radicar", nombre: "Radicar", icono: "doc", taller: "t2" },
    { id: "convocar", nombre: "Convocatoria", icono: "megafono", taller: "t4" },
    { id: "actas", nombre: "Actas", icono: "libro", taller: "t5" }
  ],

  talleres: [
    {
      id: "t1",
      titulo: "Mi teléfono y la aplicación",
      resumen: "Instalar la aplicación, escoger su junta, registrarse y cerrar sesión con seguridad.",
      duracion: "2 horas",
      para: "Todos",
      foto: "img/taller-1.jpg",
      pie: "Foto: taller en la sede comunal",
      lecciones: [
        {
          titulo: "Instalar la aplicación",
          minutos: 15,
          pasos: [
            "Abra el enlace de la aplicación en Chrome, con señal, una sola vez.",
            "Toque los tres puntos de arriba a la derecha y escoja «Instalar aplicación» o «Agregar a la pantalla principal».",
            "Aparece un ícono en su pantalla. Desde ese momento la aplicación abre aunque no haya señal."
          ],
          ojo: "Si su teléfono es un iPhone, se instala desde el botón Compartir de Safari, con «Agregar a inicio»."
        },
        {
          titulo: "Escoger la junta y entrar",
          minutos: 20,
          pasos: [
            "Al abrir, la aplicación muestra el portal con las cinco juntas de ASOCOMUNAL San Martín de Loba.",
            "Toque el nombre de su junta. Cada junta guarda su información aparte, en el teléfono.",
            "Entre con su cuenta. Si cambia de junta, el Libro de Actas se vuelve a bloquear."
          ]
        },
        {
          titulo: "Registrarse y esperar autorización",
          minutos: 30,
          pasos: [
            "Escriba sus datos: nombre, cédula, celular, barrio y correo.",
            "Lea y acepte la autorización de tratamiento de datos. Sin esa autorización no hay registro: así lo manda la ley.",
            "Su cuenta queda en espera. Un administrador de la Junta la autoriza y le asigna un rol."
          ],
          ojo: "Solo el Super Administrador y el Administrador pueden autorizar cuentas."
        },
        {
          titulo: "Cerrar sesión",
          minutos: 10,
          pasos: [
            "Cuando termine, cierre la sesión.",
            "Al cerrar sesión, el Libro de Actas queda bloqueado otra vez.",
            "Si el teléfono es de la Junta y pasa de mano en mano, cerrar sesión siempre es obligatorio."
          ]
        }
      ],
      pregunta: {
        texto: "¿Qué pasa con el Libro de Actas cuando usted cierra sesión?",
        opciones: ["Se borra", "Se vuelve a bloquear", "Se envía al Ministerio"],
        correcta: 1,
        explica: "El Libro se vuelve a bloquear al cerrar sesión y al cambiar de junta. No se borra."
      }
    },
    {
      id: "t2",
      titulo: "Radicar una solicitud",
      resumen: "Qué es un radicado, cómo se pide y cómo se sigue su estado.",
      duracion: "2 horas",
      para: "Todos",
      foto: "img/taller-2.jpg",
      pie: "Foto: un vecino mostrando el número de su radicado",
      lecciones: [
        {
          titulo: "Qué es un radicado",
          minutos: 15,
          pasos: [
            "Radicar es dejar constancia de una solicitud ante la Junta, con fecha y número.",
            "El número sale de la junta activa, por ejemplo JAC-CHIMI-2026-0001.",
            "Ese consecutivo solo sube y nunca se repite: así nadie puede cambiar el orden."
          ]
        },
        {
          titulo: "Radicar paso a paso",
          minutos: 40,
          pasos: [
            "Entre a radicar una solicitud y escriba con claridad qué pide y por qué.",
            "Si tiene evidencia, agréguela. Si el asunto es un lugar, puede marcar el punto en el croquis.",
            "Guarde. La aplicación le entrega el número de radicado: anótelo o tómele foto."
          ],
          ojo: "Si el teléfono se está quedando sin espacio, la aplicación le avisa antes de guardar."
        },
        {
          titulo: "Seguir el estado",
          minutos: 20,
          pasos: [
            "Los dignatarios cambian el estado de la solicitud a medida que avanza.",
            "Con su número de radicado puede preguntar en qué va.",
            "Un radicado es un registro de la Junta; no reemplaza un derecho de petición ante una entidad."
          ]
        }
      ],
      pregunta: {
        texto: "¿Se puede repetir un número de radicado?",
        opciones: ["Sí, cada año", "No, el consecutivo solo sube", "Sí, si se borra la solicitud"],
        correcta: 1,
        explica: "El consecutivo solo sube y nunca se repite."
      }
    },
    {
      id: "t3",
      titulo: "Registrar a un vecino sin teléfono",
      resumen: "Cómo hacer el trámite por otra persona y entregarle su constancia impresa.",
      duracion: "2 horas",
      para: "Dignatarios",
      foto: "img/taller-3.jpg",
      pie: "Foto: entrega de una constancia impresa en mano",
      lecciones: [
        {
          titulo: "Por qué existe este trámite",
          minutos: 10,
          pasos: [
            "En Chimí, seis de cada diez afiliados no tienen teléfono.",
            "Por eso la aplicación permite registrar a un tercero: usted hace el trámite por esa persona.",
            "Este es el trámite que justifica todo el proyecto."
          ]
        },
        {
          titulo: "Hacer el registro por otra persona",
          minutos: 35,
          pasos: [
            "Marque la casilla de registro por un tercero.",
            "Escriba los datos del titular, no los suyos. Revíselos con él en voz alta.",
            "Confirme con el titular que autoriza el tratamiento de sus datos."
          ],
          ojo: "Revise siempre que el nombre y la cédula sean los del vecino y no los de la cuenta con la que usted entró."
        },
        {
          titulo: "La constancia impresa",
          minutos: 20,
          pasos: [
            "El trámite termina en una hoja impresa.",
            "Esa hoja se entrega en mano, porque el titular no tiene dónde consultarla.",
            "Léasela en voz alta antes de entregarla."
          ]
        },
        {
          titulo: "Firma a ruego",
          minutos: 15,
          pasos: [
            "Si el vecino no sabe o no puede firmar, otra persona firma a su ruego.",
            "Quien firma a ruego escribe su nombre y su cédula.",
            "Nunca firme por alguien sin que esa persona esté presente y de acuerdo."
          ]
        }
      ],
      pregunta: {
        texto: "Al registrar a un vecino sin teléfono, ¿qué datos se escriben?",
        opciones: ["Los de quien hace el trámite", "Los del vecino titular", "Los del presidente de la Junta"],
        correcta: 1,
        explica: "Se escriben los datos del titular. La constancia es de él y se le entrega impresa."
      }
    },
    {
      id: "t4",
      titulo: "Convocatoria y quórum",
      resumen: "Cuándo convocar, cuántos deben estar y por qué contar bien a los afiliados.",
      duracion: "2 horas",
      para: "Dignatarios",
      foto: "img/taller-4.jpg",
      pie: "Foto: cartel de convocatoria a la asamblea",
      lecciones: [
        {
          titulo: "La convocatoria",
          minutos: 20,
          pasos: [
            "La asamblea se convoca con 8 a 15 días de antelación.",
            "La aplicación le avisa en pantalla si la fecha no cumple ese plazo.",
            "Una convocatoria fuera de plazo puede tumbar la asamblea."
          ]
        },
        {
          titulo: "Las reglas del quórum",
          minutos: 35,
          pasos: [
            "Para decidir se necesita la mitad más uno de los afiliados.",
            "En segunda convocatoria basta con al menos el 30 %.",
            "Con al menos el 20 % se puede deliberar, pero no decidir. Con menos del 20 % la asamblea no se abre."
          ],
          ojo: "Estas reglas vienen de la Ley 2166 de 2021, artículo 32."
        },
        {
          titulo: "Contar bien a los afiliados",
          minutos: 25,
          pasos: [
            "La aplicación calcula el quórum contra el total de afiliados que se le escribe.",
            "Si ese número está mal, el acta certifica un quórum falso aunque parezca rigurosa.",
            "Antes de cada asamblea, revisen juntos la lista de afiliados."
          ]
        }
      ],
      pregunta: {
        texto: "Si llega menos del 20 % de los afiliados, ¿qué pasa?",
        opciones: ["Se decide igual", "Solo se delibera", "La asamblea no se abre"],
        correcta: 2,
        explica: "Con menos del 20 % la asamblea no se abre."
      }
    },
    {
      id: "t5",
      titulo: "El acta de la asamblea",
      resumen: "Levantar, sellar y corregir el acta, y saber cuál es el libro oficial.",
      duracion: "2 horas",
      para: "Dignatarios",
      foto: "img/taller-5.jpg",
      pie: "Foto: secretario levantando el acta",
      lecciones: [
        {
          titulo: "Levantar el acta",
          minutos: 30,
          pasos: [
            "Durante la asamblea se levanta el acta en la aplicación.",
            "Al Libro de Actas entran el Presidente, el Vicepresidente, el Secretario General, el Tesorero, el Fiscal y los administradores.",
            "Escriba lo que se decidió con palabras claras."
          ]
        },
        {
          titulo: "Sellar el acta",
          minutos: 20,
          pasos: [
            "Sellar el acta es lo único que no tiene reversa en la aplicación.",
            "Antes de sellar, la aplicación revisa que haya espacio en el teléfono.",
            "Lea el acta completa en voz alta antes de sellarla."
          ],
          ojo: "En los talleres se practica con una junta de ensayo y datos inventados. Nunca se sella un acta real para practicar."
        },
        {
          titulo: "Corregir un acta",
          minutos: 20,
          pasos: [
            "Un acta sellada no se edita.",
            "Si tiene un error, se corrige con un acta aclaratoria.",
            "Así queda el rastro de qué se corrigió y cuándo."
          ]
        },
        {
          titulo: "El libro oficial",
          minutos: 15,
          pasos: [
            "La aplicación prepara el libro de actas; no es el libro oficial.",
            "El libro válido se radica en PDF en la herramienta del Ministerio del Interior.",
            "Esto lo establece el Decreto 1501 de 2023."
          ]
        }
      ],
      pregunta: {
        texto: "Encontró un error en un acta ya sellada. ¿Qué hace?",
        opciones: ["La edita", "Hace un acta aclaratoria", "La borra y la repite"],
        correcta: 1,
        explica: "Un acta sellada no se edita: se corrige con un acta aclaratoria."
      }
    },
    {
      id: "t6",
      titulo: "Mis datos y la confianza",
      resumen: "Qué datos guarda la Junta, quién responde por ellos y cómo cuidarlos.",
      duracion: "2 horas",
      para: "Todos",
      foto: "img/taller-6.jpg",
      pie: "Foto: conversación sobre el cuidado de los datos",
      lecciones: [
        {
          titulo: "Qué datos se guardan",
          minutos: 20,
          pasos: [
            "La aplicación guarda nombre, cédula, celular, barrio, correo, firma trazada, foto de la huella, evidencias y coordenadas.",
            "Todo queda dentro del teléfono. Nada va a la nube.",
            "La responsable de esos datos es la Junta, según la Ley 1581 de 2012."
          ]
        },
        {
          titulo: "Su autorización",
          minutos: 15,
          pasos: [
            "Nadie puede registrarlo sin su autorización.",
            "Usted tiene derecho a saber para qué se usan sus datos.",
            "Si tiene dudas, pregunte a la Junta antes de autorizar."
          ]
        },
        {
          titulo: "Cuidar el teléfono de la Junta",
          minutos: 20,
          pasos: [
            "El respaldo y el paquete legal llevan datos de todos: se entregan en mano, nunca por WhatsApp.",
            "No preste su clave. Si la clave de la Junta es la de siempre, pidan cambiarla.",
            "Cierre la sesión cada vez que entregue el teléfono."
          ]
        }
      ],
      pregunta: {
        texto: "¿Cómo se entrega el respaldo de la Junta?",
        opciones: ["Por WhatsApp", "En mano", "Por correo a cualquiera"],
        correcta: 1,
        explica: "El respaldo y el paquete legal mueven datos sensibles y se entregan en mano."
      }
    }
  ],

  glosario: [
    ["Afiliado", "Persona inscrita en la Junta de Acción Comunal."],
    ["Dignatario", "Afiliado elegido para un cargo: presidente, secretario, tesorero, fiscal y otros."],
    ["Convocatoria", "Aviso que llama a la asamblea. Se hace con 8 a 15 días de antelación."],
    ["Quórum", "Número mínimo de afiliados presentes para que la asamblea pueda deliberar o decidir."],
    ["Acta", "Documento que deja escrito lo que pasó y lo que se decidió en una reunión."],
    ["Acta aclaratoria", "Acta que corrige un error de un acta ya sellada, sin editarla."],
    ["Radicado", "Número que recibe una solicitud. Solo sube y nunca se repite."],
    ["Firma a ruego", "Firma que hace otra persona por quien no sabe o no puede firmar, con su nombre y cédula."],
    ["Libro de afiliados", "Lista oficial de los afiliados de la Junta. Contra ella se cuenta el quórum."],
    ["Tratamiento de datos", "Todo lo que se hace con sus datos personales: guardarlos, usarlos, entregarlos."]
  ],

  /* System Usability Scale (Brooke, 1996), adaptada al español para lectura asistida */
  sus: [
    "Creo que me gustaría usar esta aplicación con frecuencia.",
    "La aplicación me pareció más complicada de lo necesario.",
    "La aplicación me pareció fácil de usar.",
    "Creo que necesitaría ayuda de otra persona para poder usarla.",
    "Las partes de la aplicación están bien conectadas entre sí.",
    "La aplicación tiene muchas cosas que no concuerdan.",
    "Creo que la mayoría de la gente aprendería a usarla muy rápido.",
    "La aplicación me pareció muy enredada de usar.",
    "Me sentí seguro usando la aplicación.",
    "Tuve que aprender muchas cosas antes de poder usarla."
  ]
};
