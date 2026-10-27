'use strict';

/* =====================================================================
   ⚙️  CONFIGURACIÓN — VALORES QUE DEBE DEFINIR EL RESPONSABLE
   ===================================================================== */

// ⚙️ CONFIGURAR (1): ID de cliente OAuth 2.0 de Google (tipo "Aplicación web").
//    Se obtiene en Google Cloud Console → APIs y servicios → Credenciales.
//    Mientras conserve el texto "PEGA_AQUI", la app funciona en MODO DE PRUEBA.
const GOOGLE_CLIENT_ID = '143893074511-kagc4fm1kmrqfufu4kfomcq371hphro4.apps.googleusercontent.com';

// ⚙️ CONFIGURAR (2): correo del profesor. Recibe los consolidados y es la
//    ÚNICA cuenta que puede entrar por "Inicio del profesor".
const PROFESOR_EMAIL = 'prod.axv@gmail.com';

// ⚙️ CONFIGURAR (3): URL de la aplicación web de Google Apps Script
//    (almacén compartido en una Hoja de Google). Termina en /exec.
//    Sin ella, el estudiante envía por su correo (mailto) y el profesor
//    no puede ver los consolidados en su panel.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweLnOaYRVBgl35Xo_K8nI6hSbvbNuWEp_E7aU2reuP9NXeicjEnx8kgsENRsSDcXy9/exec';

// Datos que se muestran en pantalla (puede ajustarlos si cambian).
const PROFESOR_NOMBRE = 'Rosembergth Castro Cervantes';
const PROFESOR_CARGO = 'Docente Investigador y Director de Proyectos de Emprendimiento y Proyección Sociocultural';
const ENTIDAD = 'Axervus (CTeI)';
const ENTIDAD_LARGA = 'Axervus (CTeI), Ciencia, Tecnología e Innovación';

/* ===================================================================== */

const MODO_PRUEBA = GOOGLE_CLIENT_ID.includes('PEGA_AQUI');
const SERVIDOR_LISTO = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(APPS_SCRIPT_URL);
const USAR_SERVIDOR = SERVIDOR_LISTO && !MODO_PRUEBA;
const VERSION_DATOS = 'v1';

/* =====================================================================
   CONTENIDO DE LA FICHA (tomado de Ficha_Resumen_Proyecto_.docx)
   Las secciones 7 (Cronograma), 9 (Presupuesto) y el Anexo (Prototipo)
   NO las desarrolla el estudiante: las genera el profesor.
   ===================================================================== */

const RE = (s) => new RegExp(s, 'iu');

const SECCIONES = [
  {
    id: 'resumen', num: '1', titulo: 'Resumen de la propuesta', limite: 200,
    ficha: '(Máximo de 200 palabras).',
    punto: 'Sintetiza en un solo párrafo de qué se trata el proyecto.',
    guia: [
      'Escribe un solo bloque de texto continuo, sin viñetas ni subtítulos.',
      'Empieza presentando el problema o la necesidad que da origen al proyecto.',
      'Indica el propósito principal de la propuesta.',
      'Explica en una o dos frases cómo se desarrollará (enfoque, participantes, estrategia).',
      'Cierra con los resultados, productos o el impacto que esperas.',
      'Revisa que no pase de 200 palabras.'
    ],
    campos: [{
      id: 'texto', etiqueta: 'Resumen de la propuesta', alto: 'grande', rango: [120, 200],
      ayuda: 'Un párrafo que cuente el proyecto completo de forma breve.',
      criterios: [
        { t: 'Presenta el problema o la necesidad', re: RE('problem|necesidad|dificultad|situaci[oó]n|carencia|falta de') },
        { t: 'Indica el propósito u objetivo', re: RE('prop[oó]sito|objetivo|busca|pretende|propone|tiene como fin') },
        { t: 'Menciona cómo se desarrollará (metodología o estrategia)', re: RE('metodolog|enfoque|estrategia|mediante|a trav[eé]s de|investigaci[oó]n') },
        { t: 'Describe el contexto o los participantes', re: RE('estudiantes|docentes|comunidad|instituci[oó]n|poblaci[oó]n|participantes|regi[oó]n|municipio') },
        { t: 'Señala resultados, productos o impacto esperado', re: RE('resultado|producto|impacto|contribu|aporte|espera|beneficio') }
      ]
    }],
    claves: ['propuesta', 'problema', 'necesidad', 'propósito', 'estrategia', 'metodología', 'participantes', 'resultados esperados', 'impacto', 'innovación', 'pertinencia', ENTIDAD],
    frases: [
      'El presente proyecto propone ',
      'Esta propuesta surge de la necesidad de ',
      'El propósito principal es ',
      'Para lograrlo, se desarrollará una investigación de enfoque ',
      'Participarán ',
      'Se espera que los resultados contribuyan a '
    ]
  },
  {
    id: 'antecedentes', num: '2', titulo: 'Antecedentes y Justificación', limite: 500,
    ficha: `(Máximo de 500 palabras; señalar los desarrollos previos dentro y fuera de ${ENTIDAD}, situaciones y evidencias que llevaron a la conclusión de la necesidad y conveniencia del proyecto).`,
    punto: `Desarrollos previos dentro y fuera de ${ENTIDAD}, y las evidencias que muestran que el proyecto es necesario y conveniente.`,
    guia: [
      'Divide la sección en dos partes: Antecedentes y Justificación.',
      `En Antecedentes, presenta los desarrollos previos: primero los realizados dentro de ${ENTIDAD} y luego los de fuera (otras instituciones, nacionales e internacionales).`,
      'De cada antecedente indica quién lo hizo, en qué año, qué hizo y qué aporta a tu proyecto.',
      'En Justificación, describe las situaciones y evidencias (observaciones, datos, resultados) que muestran el problema.',
      'Concluye explicando por qué el proyecto es necesario y conveniente, y a quién beneficia.',
      'Entre las dos partes no deben pasar de 500 palabras.'
    ],
    campos: [
      {
        id: 'antecedentes', etiqueta: 'Antecedentes', alto: 'medio', rango: [180, 300],
        ayuda: 'Desarrollos previos relacionados con tu proyecto.',
        criterios: [
          { t: 'Menciona estudios, proyectos o experiencias previas', re: RE('estudio|investigaci[oó]n|proyecto|experiencia|trabajo|tesis|desarrollo') },
          { t: 'Cita autores o años', re: RE('\\(?\\b(19|20)\\d{2}\\b\\)?|seg[uú]n|autor') },
          { t: `Incluye desarrollos dentro de ${ENTIDAD}`, re: RE('axervus|ctei|dentro de la (instituci[oó]n|entidad)') },
          { t: 'Incluye desarrollos fuera (nacionales o internacionales)', re: RE('nacional|internacional|colombia|latinoam[eé]rica|otr[oa]s? (pa[ií]s|instituci|universidad)|universidad|mundo') },
          { t: 'Explica qué aporta cada antecedente a tu proyecto', re: RE('aport|evidenci|demostr|permit|concluy|mostr|encontr') }
        ]
      },
      {
        id: 'justificacion', etiqueta: 'Justificación', alto: 'medio', rango: [120, 250],
        ayuda: 'Situaciones y evidencias que muestran la necesidad y conveniencia del proyecto.',
        criterios: [
          { t: 'Describe situaciones o evidencias observadas', re: RE('evidenci|observ|dato|cifra|resultado|diagn[oó]stico|situaci[oó]n|se ha (visto|notado|identificado)') },
          { t: 'Explica la necesidad del proyecto', re: RE('necesidad|necesario|requiere|urge|es fundamental') },
          { t: 'Explica la conveniencia o pertinencia', re: RE('convenien|pertinen|importan|relevan|oportun|valor') },
          { t: 'Indica quiénes se benefician', re: RE('benefici|estudiantes|comunidad|docentes|poblaci[oó]n|familias') }
        ]
      }
    ],
    claves: ['antecedente', 'desarrollo previo', 'investigación previa', 'evidencia', 'diagnóstico', 'necesidad', 'conveniencia', 'pertinencia', 'beneficiarios', 'contexto local', 'ámbito nacional', 'ámbito internacional', ENTIDAD],
    frases: [
      `Dentro de ${ENTIDAD}, se identificó el trabajo de `,
      'A nivel nacional, ',
      'En el ámbito internacional, ',
      'Este antecedente aporta al proyecto ',
      'En el contexto actual se ha evidenciado que ',
      'Por estas razones, el proyecto es necesario porque ',
      'Su conveniencia radica en '
    ]
  },
  {
    id: 'problema', num: '3', titulo: 'Problema de Investigación', limite: 200,
    ficha: '(Máximo de 200 palabras; planteamiento del problema de investigación y su sistematización a través de la pregunta problema).',
    punto: 'Planteamiento del problema, la pregunta problema y su sistematización.',
    guia: [
      'Empieza por el planteamiento: describe la situación problemática tal como ocurre hoy en tu contexto.',
      'Menciona a quiénes afecta, sus posibles causas y sus consecuencias.',
      'Formula una sola pregunta problema, clara y entre signos ¿ ?, que recoja lo central del planteamiento.',
      'En la sistematización, desglosa la pregunta problema en preguntas más específicas (una por línea).',
      'Las tres partes juntas no deben pasar de 200 palabras.'
    ],
    campos: [
      {
        id: 'planteamiento', etiqueta: 'Planteamiento del problema', alto: 'medio', rango: [70, 150],
        ayuda: 'La situación problemática, a quién afecta, sus causas y consecuencias.',
        criterios: [
          { t: 'Describe la situación problemática actual', re: RE('actualmente|hoy|se presenta|se evidencia|situaci[oó]n|problem') },
          { t: 'Ubica el contexto o la población afectada', re: RE('estudiantes|docentes|comunidad|instituci[oó]n|municipio|regi[oó]n|poblaci[oó]n|grado') },
          { t: 'Señala causas', re: RE('causa|debido a|porque|origen|factor|falta de') },
          { t: 'Señala consecuencias o efectos', re: RE('consecuencia|efecto|genera|provoca|afecta|ocasiona|impide') }
        ]
      },
      {
        id: 'pregunta', etiqueta: 'Pregunta problema', alto: 'bajo', rango: [8, 40],
        ayuda: 'Una sola pregunta, entre signos ¿ ?',
        extra: (t) => {
          const preguntas = (t.match(/\?/g) || []).length;
          return [
            { ok: /¿[^?]+\?/.test(t), t: 'Está escrita entre signos ¿ ?' },
            { ok: preguntas === 1, t: 'Es una sola pregunta' },
            { ok: RE('¿\\s*(c[oó]mo|qu[eé]|de qu[eé] (manera|forma)|en qu[eé] medida|cu[aá]l|cu[aá]les|por qu[eé]|hasta qu[eé])').test(t), t: 'Inicia con un interrogativo (¿Cómo…?, ¿De qué manera…?, ¿En qué medida…?)' }
          ];
        }
      },
      {
        id: 'sistematizacion', etiqueta: 'Sistematización', alto: 'bajo2', rango: [20, 80], lista: true,
        ayuda: 'Preguntas específicas que desglosan la pregunta problema (una por línea).',
        extra: (t) => {
          const n = (t.match(/¿[^?]+\?/g) || []).length;
          return [
            { ok: n >= 2, t: 'Incluye al menos 2 preguntas específicas' },
            { ok: n > 0 && (t.match(/\?/g) || []).length === n, t: 'Cada pregunta está entre signos ¿ ?' }
          ];
        }
      }
    ],
    claves: ['situación problemática', 'causas', 'consecuencias', 'población afectada', 'pregunta problema', 'sistematización', 'de qué manera', 'en qué medida', 'incidencia', 'factores'],
    frases: [
      'Actualmente, en ',
      'Esta situación se debe, entre otras causas, a ',
      'Como consecuencia, ',
      '¿De qué manera ',
      '¿En qué medida ',
      '¿Cuáles son '
    ]
  },
  {
    id: 'objetivos', num: '4', titulo: 'Objetivo General y Objetivos Específicos', limite: null,
    ficha: '',
    punto: 'Un objetivo general y los objetivos específicos que permiten lograrlo.',
    guia: [
      'El objetivo general responde a la pregunta problema: dice qué se quiere lograr con el proyecto.',
      'Redáctalo en una sola oración que empiece con un verbo en infinitivo (por ejemplo: analizar, diseñar, fortalecer).',
      'Los objetivos específicos son los pasos para lograr el general; escribe uno por línea (se recomiendan entre 3 y 5).',
      'Cada objetivo específico empieza con un verbo en infinitivo y debe poder cumplirse y verificarse.',
      'Ordénalos en la secuencia en que se realizarán.'
    ],
    campos: [
      {
        id: 'general', etiqueta: 'Objetivo General', alto: 'bajo', rango: [12, 45],
        ayuda: 'Una oración que empieza con un verbo en infinitivo.',
        extra: (t) => {
          const oraciones = t.split(/[.;]\s+/).filter(s => contarPalabras(s) > 2).length;
          return [
            { ok: empiezaInfinitivo(t), t: 'Empieza con un verbo en infinitivo' },
            { ok: oraciones <= 1, t: 'Es una sola oración' },
            { ok: RE('mediante|a trav[eé]s de|para|en (los|las|el|la)|con').test(t), t: 'Indica el cómo, el para qué o en quiénes' }
          ];
        }
      },
      {
        id: 'especificos', etiqueta: 'Objetivos específicos', alto: 'medio', rango: [25, 150], lista: true,
        ayuda: 'Un objetivo por línea, cada uno con verbo en infinitivo.',
        extra: (t) => {
          const items = lineas(t);
          const conVerbo = items.filter(empiezaInfinitivo).length;
          return [
            { ok: items.length >= 3 && items.length <= 5, t: `Tiene entre 3 y 5 objetivos (${items.length} escritos)` },
            { ok: items.length > 0 && conVerbo === items.length, t: `Todos empiezan con verbo en infinitivo (${conVerbo} de ${items.length})` }
          ];
        }
      }
    ],
    claves: ['analizar', 'diagnosticar', 'identificar', 'caracterizar', 'diseñar', 'desarrollar', 'implementar', 'aplicar', 'fortalecer', 'evaluar', 'validar', 'determinar', 'describir', 'proponer'],
    frases: [
      'Fortalecer ',
      'Diagnosticar ',
      'Diseñar una estrategia ',
      'Implementar ',
      'Evaluar el impacto de ',
      'mediante ',
      'en los estudiantes de '
    ]
  },
  {
    id: 'metodologia', num: '5', titulo: 'Metodología', limite: 400,
    ficha: '(Máximo 400 palabras).',
    punto: 'Cómo se realizará la investigación, con quiénes y con qué instrumentos.',
    guia: [
      'Indica el enfoque de la investigación (cualitativo, cuantitativo o mixto) y explica por qué.',
      'Señala el tipo o diseño de investigación (por ejemplo: investigación acción, descriptiva, estudio de caso).',
      'Describe la población y la muestra o los participantes.',
      'Nombra las técnicas e instrumentos para recoger información (encuestas, entrevistas, observación, etc.).',
      'Explica las fases o etapas del proceso en orden.',
      'Indica cómo vas a analizar la información recogida. No pases de 400 palabras.'
    ],
    campos: [{
      id: 'texto', etiqueta: 'Metodología', alto: 'grande', rango: [220, 400],
      ayuda: 'Enfoque, tipo, población, instrumentos, fases y análisis.',
      criterios: [
        { t: 'Define el enfoque (cualitativo, cuantitativo o mixto)', re: RE('cualitativ|cuantitativ|mixt') },
        { t: 'Indica el tipo o diseño de investigación', re: RE('investigaci[oó]n[- ]acci[oó]n|descriptiv|explicativ|exploratori|correlacional|estudio de caso|etnogr[aá]f|experimental|dise[nñ]o') },
        { t: 'Describe la población, muestra o participantes', re: RE('poblaci[oó]n|muestra|participantes|estudiantes|docentes') },
        { t: 'Nombra técnicas e instrumentos', re: RE('encuesta|entrevista|observaci[oó]n|cuestionario|diario de campo|grupo focal|instrumento|prueba|test|r[uú]brica') },
        { t: 'Explica fases o etapas del proceso', re: RE('fase|etapa|momento|primer[oa]?|segund[oa]|luego|finalmente') },
        { t: 'Explica cómo se analizará la información', re: RE('an[aá]lisis|analiz|triangulaci[oó]n|categor|estad[ií]stic|interpret') }
      ]
    }],
    claves: ['enfoque cualitativo', 'enfoque cuantitativo', 'enfoque mixto', 'investigación acción', 'población', 'muestra', 'instrumentos', 'encuesta', 'entrevista', 'observación', 'fases', 'triangulación', 'análisis de la información'],
    frases: [
      'La investigación se enmarca en un enfoque ',
      'El tipo de investigación es ',
      'La población está conformada por ',
      'La muestra corresponde a ',
      'Para la recolección de información se utilizarán ',
      'El proceso se desarrollará en las siguientes fases: ',
      'La información se analizará mediante '
    ]
  },
  {
    id: 'etica', num: '6', titulo: 'Consideraciones Éticas de la Investigación', limite: null,
    ficha: '',
    punto: 'Cómo se protege a los participantes y su información.',
    guia: [
      'Explica cómo se informará a los participantes y cómo darán su consentimiento informado.',
      'Si participan menores de edad, indica que se pedirá el asentimiento del menor y el permiso de su acudiente.',
      'Explica cómo se protegerán la confidencialidad y los datos personales (Ley 1581 de 2012 en Colombia).',
      'Aclara que la participación es voluntaria y que pueden retirarse cuando lo deseen.',
      'Menciona los riesgos y beneficios para los participantes y cómo se devolverán los resultados.'
    ],
    campos: [{
      id: 'texto', etiqueta: 'Consideraciones éticas', alto: 'grande', rango: [80, 300],
      ayuda: 'Consentimiento, confidencialidad, voluntariedad, riesgos y beneficios.',
      criterios: [
        { t: 'Incluye el consentimiento informado', re: RE('consentimiento') },
        { t: 'Considera a menores de edad (asentimiento o acudientes)', re: RE('asentimiento|acudiente|padres de familia|menores de edad|representante legal') },
        { t: 'Protege la confidencialidad o el anonimato', re: RE('confidencial|anonimato|an[oó]nim|privacidad|reserva') },
        { t: 'Menciona el tratamiento de datos personales', re: RE('datos personales|1581|habeas data|protecci[oó]n de datos') },
        { t: 'Aclara que la participación es voluntaria', re: RE('voluntari|retirarse|libre decisi[oó]n') },
        { t: 'Menciona riesgos, beneficios o devolución de resultados', re: RE('riesgo|benefici|devoluci[oó]n|socializ') }
      ]
    }],
    claves: ['consentimiento informado', 'asentimiento', 'acudientes', 'confidencialidad', 'anonimato', 'datos personales', 'Ley 1581 de 2012', 'participación voluntaria', 'riesgo mínimo', 'beneficios', 'devolución de resultados'],
    frases: [
      'Antes de iniciar, se socializará el proyecto con ',
      'Se solicitará el consentimiento informado de ',
      'En el caso de los menores de edad, ',
      'La información recolectada será tratada de manera confidencial ',
      'La participación será voluntaria y ',
      'Los resultados se socializarán con '
    ]
  },
  {
    id: 'impacto', num: '8', titulo: 'Impacto y productos esperados', limite: 200,
    ficha: `(Máximo de 200 palabras; debe precisarse el impacto dentro y fuera de ${ENTIDAD}, el aporte al campo de estudio y a la sociedad en general. Precisar los productos que se esperan obtener de la Investigación).`,
    punto: `Impacto dentro y fuera de ${ENTIDAD}, aporte al campo de estudio y a la sociedad, y productos esperados.`,
    guia: [
      `Describe el impacto dentro de ${ENTIDAD}.`,
      'Describe el impacto fuera: en la comunidad, la región o el país.',
      'Explica el aporte al campo de estudio (qué conocimiento nuevo deja).',
      'Explica el aporte a la sociedad en general.',
      'En el campo de productos, escribe uno por línea (por ejemplo: prototipo, guía, artículo, ponencia).',
      'Las dos partes juntas no deben pasar de 200 palabras.'
    ],
    campos: [
      {
        id: 'impacto', etiqueta: 'Impacto', alto: 'medio', rango: [60, 140],
        ayuda: 'Impacto dentro y fuera, aporte al campo de estudio y a la sociedad.',
        criterios: [
          { t: `Precisa el impacto dentro de ${ENTIDAD}`, re: RE('axervus|ctei|dentro de') },
          { t: 'Precisa el impacto fuera (comunidad, región, país)', re: RE('fuera de|comunidad|regi[oó]n|municipio|pa[ií]s|departamento|externo') },
          { t: 'Explica el aporte al campo de estudio', re: RE('campo de estudio|conocimiento|disciplina|educaci[oó]n|investigaci[oó]n|aporte te[oó]rico') },
          { t: 'Explica el aporte a la sociedad', re: RE('sociedad|social|ciudadan|calidad de vida|desarrollo') }
        ]
      },
      {
        id: 'productos', etiqueta: 'Productos esperados', alto: 'bajo2', rango: [10, 80], lista: true,
        ayuda: 'Un producto por línea.',
        criterios: [
          { t: 'Nombra productos concretos', re: RE('prototipo|gu[ií]a|art[ií]culo|ponencia|cartilla|software|aplicaci[oó]n|plataforma|informe|manual|video|recurso|secuencia|libro|cap[ií]tulo|p[oó]ster') }
        ],
        extra: (t) => [{ ok: lineas(t).length >= 2, t: `Lista al menos 2 productos (${lineas(t).length} escritos)` }]
      }
    ],
    claves: ['impacto institucional', 'impacto social', 'impacto regional', 'aporte al campo de estudio', 'apropiación social del conocimiento', 'transferencia', 'productos', 'prototipo', 'artículo', 'ponencia', 'guía didáctica'],
    frases: [
      `Dentro de ${ENTIDAD}, el proyecto permitirá `,
      'Fuera de la entidad, el impacto se verá reflejado en ',
      'Al campo de estudio, aporta ',
      'Para la sociedad, ',
      'Prototipo de ',
      'Artículo de divulgación sobre ',
      'Ponencia en '
    ]
  },
  {
    id: 'referencias', num: '10', titulo: 'Referencias', limite: null,
    ficha: '',
    punto: 'Las fuentes que consultaste, en formato APA.',
    guia: [
      'Escribe una referencia por línea.',
      'Usa el formato APA (7.ª edición): Apellido, Inicial. (Año). Título del trabajo. Fuente o editorial. Enlace o DOI.',
      'Incluye todas las fuentes que mencionaste en antecedentes, justificación y metodología.',
      'Ordénalas alfabéticamente por el apellido del primer autor.'
    ],
    campos: [{
      id: 'texto', etiqueta: 'Referencias', alto: 'grande', rango: [15, 900], lista: true,
      ayuda: 'Una referencia por línea, en formato APA.',
      extra: (t) => {
        const items = lineas(t);
        const conAnio = items.filter(r => /\((19|20)\d{2}[a-z]?\)|\(s\.\s?f\.\)/i.test(r)).length;
        const orden = items.map(r => normalizar(r)).every((r, i, a) => i === 0 || a[i - 1] <= r);
        return [
          { ok: items.length >= 3, t: `Incluye varias fuentes (${items.length} escritas)` },
          { ok: items.length > 0 && conAnio === items.length, t: `Cada referencia tiene el año entre paréntesis (${conAnio} de ${items.length})` },
          { ok: items.length > 1 && orden, t: 'Están en orden alfabético' }
        ];
      }
    }],
    claves: ['(Año).', 'Recuperado de', 'https://doi.org/', 'Editorial', 'Revista', 'Ministerio de Educación Nacional', 'Tesis de maestría', 'Universidad'],
    frases: [
      'Apellido, A. A. (Año). Título del libro. Editorial.',
      'Apellido, A. A. (Año). Título del artículo. Nombre de la Revista, volumen(número), páginas. https://doi.org/',
      'Apellido, A. A. (Año). Título de la tesis [Tesis de maestría, Universidad]. Repositorio. URL'
    ]
  }
];

// Íconos lineales de las tarjetas del repaso.
const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONOS = {
  resumen: ic('<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>'),
  antecedentes: ic('<path d="M4 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z"/>'),
  problema: ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5h.01"/>'),
  objetivos: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
  metodologia: ic('<path d="M4 6h16M4 12h10M4 18h6"/><circle cx="18" cy="16" r="3"/><path d="m20.5 18.5 2 2"/>'),
  etica: ic('<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  impacto: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  referencias: ic('<path d="M7 4h11v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h6"/>')
};

// Sinónimos y alternativas de expresión para escritura académica (sin API externa).
const SINONIMOS = {
  'problema': ['dificultad', 'situación problemática', 'necesidad', 'limitación', 'falencia'],
  'necesidad': ['requerimiento', 'carencia', 'demanda', 'urgencia'],
  'importante': ['relevante', 'pertinente', 'fundamental', 'significativo', 'esencial'],
  'importancia': ['relevancia', 'pertinencia', 'valor', 'trascendencia'],
  'mejorar': ['fortalecer', 'optimizar', 'potenciar', 'cualificar', 'favorecer'],
  'ayudar': ['contribuir', 'favorecer', 'apoyar', 'aportar', 'facilitar'],
  'ayuda': ['apoyo', 'aporte', 'contribución', 'acompañamiento'],
  'usar': ['emplear', 'utilizar', 'aplicar', 'implementar', 'hacer uso de'],
  'utilizar': ['emplear', 'aplicar', 'implementar', 'aprovechar'],
  'uso': ['empleo', 'aplicación', 'apropiación', 'aprovechamiento'],
  'hacer': ['realizar', 'desarrollar', 'llevar a cabo', 'ejecutar', 'elaborar'],
  'mostrar': ['evidenciar', 'demostrar', 'señalar', 'presentar', 'revelar'],
  'muestra': ['evidencia', 'señala', 'demuestra', 'revela'],
  'decir': ['afirmar', 'señalar', 'plantear', 'sostener', 'expresar'],
  'dice': ['afirma', 'señala', 'plantea', 'sostiene', 'expresa'],
  'estudiantes': ['educandos', 'aprendices', 'población estudiantil', 'jóvenes participantes'],
  'estudiante': ['educando', 'aprendiz', 'participante'],
  'docentes': ['profesores', 'maestros', 'educadores', 'cuerpo docente'],
  'docente': ['profesor', 'maestro', 'educador', 'orientador'],
  'comunidad': ['población', 'contexto local', 'territorio', 'entorno'],
  'aprendizaje': ['proceso formativo', 'apropiación del conocimiento', 'construcción de saberes'],
  'enseñanza': ['proceso pedagógico', 'práctica educativa', 'mediación pedagógica'],
  'estrategia': ['propuesta', 'plan de acción', 'ruta metodológica', 'alternativa'],
  'herramienta': ['recurso', 'instrumento', 'medio', 'apoyo'],
  'herramientas': ['recursos', 'instrumentos', 'medios', 'apoyos'],
  'tecnología': ['herramientas digitales', 'TIC', 'recursos tecnológicos', 'medios digitales'],
  'tecnologías': ['herramientas digitales', 'TIC', 'recursos tecnológicos'],
  'proyecto': ['propuesta', 'iniciativa', 'investigación', 'trabajo'],
  'investigación': ['estudio', 'indagación', 'proyecto', 'trabajo investigativo'],
  'resultado': ['hallazgo', 'logro', 'producto', 'efecto'],
  'resultados': ['hallazgos', 'logros', 'productos', 'efectos'],
  'objetivo': ['propósito', 'meta', 'fin', 'intención'],
  'analizar': ['examinar', 'estudiar', 'interpretar', 'valorar', 'revisar'],
  'identificar': ['reconocer', 'detectar', 'determinar', 'establecer'],
  'desarrollar': ['implementar', 'ejecutar', 'llevar a cabo', 'construir', 'elaborar'],
  'implementar': ['aplicar', 'poner en marcha', 'ejecutar', 'desarrollar'],
  'evaluar': ['valorar', 'medir', 'determinar', 'verificar', 'estimar'],
  'diseñar': ['construir', 'elaborar', 'formular', 'estructurar', 'proponer'],
  'aplicar': ['implementar', 'emplear', 'ejecutar', 'poner en práctica'],
  'proponer': ['plantear', 'formular', 'sugerir', 'presentar'],
  'permitir': ['posibilitar', 'facilitar', 'favorecer', 'hacer posible'],
  'permite': ['posibilita', 'facilita', 'favorece', 'hace posible'],
  'lograr': ['alcanzar', 'conseguir', 'obtener', 'consolidar'],
  'cambio': ['transformación', 'modificación', 'avance', 'mejora'],
  'impacto': ['incidencia', 'efecto', 'repercusión', 'alcance'],
  'beneficio': ['aporte', 'ventaja', 'provecho', 'contribución'],
  'situación': ['contexto', 'realidad', 'condición', 'escenario'],
  'dificultad': ['limitación', 'obstáculo', 'problema', 'barrera'],
  'dificultades': ['limitaciones', 'obstáculos', 'barreras', 'falencias'],
  'falta': ['carencia', 'ausencia', 'escasez', 'insuficiencia'],
  'bajo': ['deficiente', 'limitado', 'insuficiente', 'reducido'],
  'grande': ['amplio', 'considerable', 'significativo', 'notable'],
  'muchos': ['numerosos', 'diversos', 'gran parte de', 'un número significativo de'],
  'mucho': ['considerablemente', 'en gran medida', 'notablemente'],
  'poco': ['escaso', 'limitado', 'reducido', 'insuficiente'],
  'pocos': ['escasos', 'limitados', 'contados'],
  'bueno': ['adecuado', 'pertinente', 'favorable', 'positivo', 'apropiado'],
  'buena': ['adecuada', 'pertinente', 'favorable', 'positiva', 'apropiada'],
  'malo': ['inadecuado', 'deficiente', 'desfavorable', 'negativo'],
  'mala': ['inadecuada', 'deficiente', 'desfavorable', 'negativa'],
  'también': ['asimismo', 'igualmente', 'de igual manera', 'además'],
  'además': ['asimismo', 'por otra parte', 'adicionalmente', 'de igual forma'],
  'pero': ['sin embargo', 'no obstante', 'aunque', 'por el contrario'],
  'porque': ['debido a que', 'ya que', 'dado que', 'puesto que'],
  'entonces': ['por lo tanto', 'en consecuencia', 'por consiguiente', 'de este modo'],
  'plantear': ['formular', 'proponer', 'exponer', 'presentar'],
  'buscar': ['pretender', 'procurar', 'orientarse a', 'tener como propósito'],
  'busca': ['pretende', 'procura', 'se orienta a', 'tiene como propósito'],
  'conocer': ['comprender', 'identificar', 'reconocer', 'indagar'],
  'información': ['datos', 'evidencias', 'insumos', 'hallazgos'],
  'datos': ['información', 'evidencias', 'registros', 'cifras'],
  'proceso': ['procedimiento', 'ruta', 'desarrollo', 'secuencia'],
  'forma': ['manera', 'modo', 'mecanismo', 'vía'],
  'manera': ['forma', 'modo', 'mecanismo', 'vía'],
  'nivel': ['grado', 'medida', 'estado', 'desempeño'],
  'aspecto': ['elemento', 'factor', 'componente', 'dimensión'],
  'aspectos': ['elementos', 'factores', 'componentes', 'dimensiones'],
  'cosa': ['elemento', 'aspecto', 'factor', 'situación'],
  'cosas': ['elementos', 'aspectos', 'factores', 'situaciones'],
  'tema': ['asunto', 'temática', 'objeto de estudio', 'eje'],
  'contexto': ['entorno', 'escenario', 'realidad', 'territorio'],
  'región': ['territorio', 'subregión', 'zona', 'entorno'],
  'institución': ['establecimiento educativo', 'entidad', 'organización', 'plantel'],
  'participantes': ['actores', 'población participante', 'sujetos de la investigación', 'involucrados'],
  'fortalecer': ['consolidar', 'potenciar', 'robustecer', 'mejorar'],
  'promover': ['impulsar', 'fomentar', 'propiciar', 'estimular'],
  'generar': ['producir', 'propiciar', 'crear', 'originar'],
  'crear': ['diseñar', 'construir', 'elaborar', 'generar'],
  'trabajo': ['labor', 'proceso', 'estudio', 'propuesta'],
  'innovación': ['transformación', 'novedad', 'propuesta innovadora', 'renovación'],
  'innovador': ['novedoso', 'original', 'transformador', 'pionero'],
  'necesario': ['indispensable', 'pertinente', 'requerido', 'imprescindible'],
  'conveniente': ['pertinente', 'oportuno', 'adecuado', 'favorable'],
  'evidencia': ['muestra', 'prueba', 'indicio', 'constancia'],
  'evidencias': ['pruebas', 'indicios', 'registros', 'hallazgos'],
  'muy': ['altamente', 'notablemente', 'significativamente', 'considerablemente'],
  'algo': ['un aspecto', 'un elemento', 'cierto factor'],
  'tener': ['contar con', 'disponer de', 'poseer'],
  'tiene': ['cuenta con', 'dispone de', 'posee', 'presenta'],
  'ver': ['observar', 'analizar', 'evidenciar', 'examinar'],
  'pensar': ['considerar', 'reflexionar', 'plantear', 'estimar'],
  'creo': ['considero', 'se considera', 'se estima', 'se plantea'],
  'gente': ['personas', 'población', 'comunidad', 'habitantes'],
  'niños': ['estudiantes', 'menores', 'niñas y niños', 'población infantil'],
  'jóvenes': ['estudiantes', 'adolescentes', 'población juvenil'],
  'escuela': ['institución educativa', 'establecimiento educativo', 'plantel'],
  'colegio': ['institución educativa', 'establecimiento educativo', 'plantel'],
  'clase': ['sesión', 'encuentro pedagógico', 'espacio de aprendizaje'],
  'clases': ['sesiones', 'encuentros pedagógicos', 'espacios de aprendizaje'],
  'aporte': ['contribución', 'beneficio', 'valor agregado'],
  'aportar': ['contribuir', 'favorecer', 'enriquecer'],
  'producto': ['resultado', 'entregable', 'desarrollo'],
  'productos': ['resultados', 'entregables', 'desarrollos'],
  'metodología': ['ruta metodológica', 'diseño metodológico', 'procedimiento'],
  'encuesta': ['cuestionario', 'instrumento de recolección', 'sondeo'],
  'entrevista': ['diálogo semiestructurado', 'conversación guiada', 'instrumento cualitativo'],
  'social': ['comunitario', 'colectivo', 'ciudadano'],
  'desarrollo': ['avance', 'progreso', 'crecimiento', 'evolución'],
  'actividad': ['acción', 'tarea', 'experiencia', 'práctica'],
  'actividades': ['acciones', 'tareas', 'experiencias', 'prácticas']
};

const PALABRAS_VAGAS = ['cosa', 'cosas', 'algo', 'bastante', 'demasiado', 'etc', 'etcétera', 'chévere', 'súper', 'super', 'bacano'];

const CONECTORES = [
  { grupo: 'Para iniciar', lista: ['En primer lugar, ', 'Para comenzar, ', 'En el contexto de ', 'Con respecto a '] },
  { grupo: 'Para agregar ideas', lista: ['Además, ', 'Asimismo, ', 'De igual manera, ', 'Por otra parte, '] },
  { grupo: 'Para contrastar', lista: ['Sin embargo, ', 'No obstante, ', 'Por el contrario, ', 'A pesar de '] },
  { grupo: 'Causa y consecuencia', lista: ['Debido a ', 'Por esta razón, ', 'Por lo tanto, ', 'En consecuencia, ', 'Dado que '] },
  { grupo: 'Para dar ejemplos', lista: ['Por ejemplo, ', 'Es el caso de ', 'Como se evidencia en '] },
  { grupo: 'Para concluir', lista: ['En síntesis, ', 'En conclusión, ', 'Finalmente, ', 'De este modo, '] }
];

const STOP = new Set(('para como esta este estos estas esto pero porque desde donde cuando sobre entre hacia hasta segun sino tambien cual cuales quien quienes cuyo cuya todo todos toda todas otro otros otra otras mismo misma mismos mismas muy mas menos cada debe deben puede pueden siendo sido seran sera estan estar esta tiene tienen tener hacer hace hacen ser son fue fueron haya han hemos habia ademas mediante parte manera forma traves dentro fuera aqui alli ello ella ellos ellas nuestro nuestra nuestros nuestras sus suyo suya les nos que del las los una uno unos unas por con sin sus al el la lo de en y o u a e se su es le ya no si asi tan tanto cuanto aun durante luego antes despues bien').split(' '));

/* =====================================================================
   UTILIDADES
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PALABRA_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const contarPalabras = (t) => (String(t || '').match(PALABRA_RE) || []).length;
const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lineas = (t) => String(t || '').split(/\n+/).map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)-]|[a-zA-Z][.)])\s*/, '').trim()).filter((l) => contarPalabras(l) > 0);
const empiezaInfinitivo = (t) => {
  const primera = (String(t || '').replace(/^\s*(?:[-•*·]|\d+[.)-]|[a-zA-Z][.)])\s*/, '').match(/\p{L}+/u) || [''])[0];
  return /^\p{L}{2,}(ar|er|ir|ír)(se|lo|la|los|las)?$/iu.test(primera);
};
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fechaLarga = (d) => new Date(d).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
const slug = (s) => normalizar(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'proyecto';
const recortar = (s, n) => { s = String(s || '').trim(); if (s.length <= n) return s; const c = s.slice(0, n); return c.slice(0, c.lastIndexOf(' ') > n * 0.6 ? c.lastIndexOf(' ') : n).replace(/[,;:.]$/, '') + '…'; };
const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// localStorage protegido: si el navegador lo bloquea, la app sigue funcionando.
const almacen = {
  leer(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const sesionAlmacen = {
  leer() { try { return JSON.parse(sessionStorage.getItem('axervus.sesion') || 'null'); } catch { return null; } },
  guardar(v) { try { v ? sessionStorage.setItem('axervus.sesion', JSON.stringify(v)) : sessionStorage.removeItem('axervus.sesion'); } catch { /* sin almacenamiento */ } }
};

function avisar(msg, tipo = 'info', ms = 4200) {
  const el = $('#aviso-flotante');
  el.textContent = msg;
  el.className = 'aviso-flotante visible ' + tipo;
  clearTimeout(avisar._t);
  avisar._t = setTimeout(() => { el.className = 'aviso-flotante'; }, ms);
}

function mostrarVista(id) {
  $$('.vista').forEach((v) => { v.hidden = v.id !== id; });
  document.body.dataset.vista = id;
  window.scrollTo({ top: 0 });
  marcarMenu();
}

function abrirModal(titulo, html) {
  $('#modal-titulo').textContent = titulo;
  $('#modal-cuerpo').innerHTML = html;
  $('#modal').hidden = false;
}
function cerrarModal() { $('#modal').hidden = true; }

const scriptsCargados = {};
function cargarScript(src) {
  if (!scriptsCargados[src]) {
    scriptsCargados[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res;
      s.onerror = () => { delete scriptsCargados[src]; rej(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  return scriptsCargados[src];
}
const LIB_DOCX = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js';
const LIB_PDF = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* =====================================================================
   SESIÓN E INGRESO CON GOOGLE
   ===================================================================== */

let sesion = null;          // { rol, email, nombre, foto, idToken, exp }
let rolElegido = 'estudiante';
let resolverReingreso = null;

function decodificarJWT(token) {
  const base = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base + '==='.slice((base.length + 3) % 4));
  const json = decodeURIComponent(Array.from(bin, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
  return JSON.parse(json);
}

const tokenVigente = () => MODO_PRUEBA || (sesion && sesion.exp - 60000 > Date.now());

async function iniciarGoogle() {
  await cargarScript('https://accounts.google.com/gsi/client');
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (r) => alRecibirCredencial(r.credential),
    ux_mode: 'popup',
    auto_select: false
  });
  dibujarBotonGoogle('google-boton');
}

function dibujarBotonGoogle(id) {
  const ancho = Math.min(360, ($('#' + id).clientWidth || 320));
  google.accounts.id.renderButton(document.getElementById(id), {
    theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es', width: ancho
  });
}

function alRecibirCredencial(credencial) {
  const p = decodificarJWT(credencial);
  const email = String(p.email || '').toLowerCase();
  // Reingreso tras vencimiento del token: misma cuenta, nuevo token.
  if (resolverReingreso) {
    if (sesion && email === sesion.email) {
      sesion.idToken = credencial; sesion.exp = p.exp * 1000; sesionAlmacen.guardar(sesion);
      $('#reingreso').hidden = true;
      const r = resolverReingreso; resolverReingreso = null; r.resolve();
    } else {
      avisar('Ingresa con la misma cuenta: ' + sesion.email, 'error');
    }
    return;
  }
  if (rolElegido === 'profesor' && email !== PROFESOR_EMAIL.toLowerCase()) {
    mostrarErrorIngreso(`Esta cuenta (${email}) no está autorizada como profesor. El inicio del profesor es solo para ${PROFESOR_EMAIL}.`);
    return;
  }
  iniciarSesion({ rol: rolElegido, email, nombre: p.name || p.given_name || email, foto: p.picture || '', idToken: credencial, exp: p.exp * 1000 });
}

function mostrarErrorIngreso(msg) {
  const e = $('#ingreso-error'); e.textContent = msg; e.hidden = false;
}

function pedirReingreso() {
  return new Promise((resolve, reject) => {
    resolverReingreso = { resolve, reject };
    $('#reingreso').hidden = false;
    dibujarBotonGoogle('google-boton-reingreso');
  });
}

function iniciarSesion(datos) {
  sesion = datos;
  sesionAlmacen.guardar(sesion);
  $('#usuario-zona').hidden = false;
  $('#btn-salir').hidden = false;
  $('#usuario-nombre').textContent = sesion.nombre;
  $('#usuario-rol').textContent = sesion.rol === 'profesor' ? 'Profesor' : 'Estudiante';
  $('#usuario-inicial').textContent = (sesion.nombre || '?').trim().charAt(0).toUpperCase();
  const foto = $('#usuario-foto');
  if (sesion.foto) { foto.src = sesion.foto; foto.hidden = false; $('#usuario-inicial').hidden = true; } else { foto.hidden = true; $('#usuario-inicial').hidden = false; }
  pintarMenu();
  if (sesion.rol === 'profesor') abrirPanelProfesor();
  else abrirEstudiante();
}

/* ---------- Menú de la cabecera según el rol ---------- */
function pintarMenu() {
  const rol = sesion ? sesion.rol : 'ingreso';
  const items = {
    ingreso: [['Inicio', () => window.scrollTo({ top: 0, behavior: 'smooth' }), 'v-ingreso'], ['Cómo funciona', () => $('#beneficios').scrollIntoView({ behavior: 'smooth' })], ['Inicio del profesor', () => { $('.rol-tab[data-rol="profesor"]').click(); $('#ingreso-tarjeta').scrollIntoView({ behavior: 'smooth', block: 'center' }); }]],
    estudiante: [['Bienvenida', () => abrirEstudiante(), 'v-bienvenida'], ['Repaso', () => abrirRepaso(), 'v-repaso'], ['Mi ficha', () => abrirTrabajo(estado.indice || 0), 'v-trabajo'], ['Consolidado', () => abrirConsolidado(), 'v-consolidado']],
    profesor: [['Consolidados', () => $('#tarjeta-consolidados').scrollIntoView({ behavior: 'smooth' })], ['Encabezado', () => $('#tarjeta-encabezado').scrollIntoView({ behavior: 'smooth' })], ['Análisis', () => $('#tarjeta-analisis').scrollIntoView({ behavior: 'smooth' })], ['Vista previa', () => { const t = $('#tarjeta-vista'); (t.hidden ? $('#tarjeta-analisis') : t).scrollIntoView({ behavior: 'smooth' }); }]]
  }[rol];
  const menu = $('#menu');
  menu.innerHTML = items.map(([t, , v], i) => `<button type="button" class="menu-item" data-i="${i}" ${v ? `data-vista="${v}"` : ''}>${esc(t)}</button>`).join('');
  $$('.menu-item', menu).forEach((b) => b.addEventListener('click', () => { document.body.classList.remove('menu-abierto'); $('#btn-menu').setAttribute('aria-expanded', 'false'); items[+b.dataset.i][1](); }));
  marcarMenu();
}
function marcarMenu() {
  const v = document.body.dataset.vista;
  $$('#menu .menu-item').forEach((b) => b.classList.toggle('activo', !!b.dataset.vista && b.dataset.vista === v));
}

function cerrarSesion() {
  detenerDictado();
  try { if (!MODO_PRUEBA && window.google) google.accounts.id.disableAutoSelect(); } catch { /* nada */ }
  sesion = null; sesionAlmacen.guardar(null);
  $('#usuario-zona').hidden = true;
  $('#btn-salir').hidden = true;
  mostrarVista('v-ingreso');
  pintarMenu();
}

function prepararIngreso() {
  $$('.rol-tab').forEach((b) => b.addEventListener('click', () => {
    rolElegido = b.dataset.rol;
    $$('.rol-tab').forEach((x) => { x.classList.toggle('activo', x === b); x.setAttribute('aria-selected', x === b); });
    $('#ingreso-ayuda').textContent = rolElegido === 'profesor'
      ? `Ingreso exclusivo para ${PROFESOR_NOMBRE} (${PROFESOR_EMAIL}).`
      : 'Ingresa con tu cuenta de Gmail para desarrollar tu ficha.';
    $('#ingreso-error').hidden = true;
    if (MODO_PRUEBA && rolElegido === 'profesor') { $('#demo-correo').value = PROFESOR_EMAIL; $('#demo-nombre').value = PROFESOR_NOMBRE; }
    else if (MODO_PRUEBA && $('#demo-correo').value === PROFESOR_EMAIL) { $('#demo-correo').value = ''; $('#demo-nombre').value = ''; }
  }));

  if (MODO_PRUEBA) {
    $('#google-boton').hidden = true;
    $('#form-demo').hidden = false;
    $('#form-demo').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const email = $('#demo-correo').value.trim().toLowerCase();
      const nombre = $('#demo-nombre').value.trim();
      if (!email || !nombre) return;
      if (rolElegido === 'profesor' && email !== PROFESOR_EMAIL.toLowerCase()) {
        mostrarErrorIngreso(`El inicio del profesor es solo para ${PROFESOR_EMAIL}.`); return;
      }
      iniciarSesion({ rol: rolElegido, email, nombre, foto: '', idToken: 'demo', exp: Date.now() + 864e5 });
    });
  } else {
    iniciarGoogle().catch(() => mostrarErrorIngreso('No se pudo cargar el ingreso de Google. Revisa tu conexión a internet y recarga la página.'));
  }

  $('#btn-salir').addEventListener('click', cerrarSesion);
  $('#btn-menu').addEventListener('click', () => {
    const abierto = document.body.classList.toggle('menu-abierto');
    $('#btn-menu').setAttribute('aria-expanded', abierto);
  });
  $('#logo-inicio').addEventListener('click', (e) => {
    e.preventDefault();
    if (!sesion) window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (sesion.rol === 'profesor') window.scrollTo({ top: 0, behavior: 'smooth' });
    else abrirEstudiante();
  });
  $('#info-correo').textContent = PROFESOR_EMAIL;
  $('#pie-profesor').textContent = `${PROFESOR_NOMBRE} · ${PROFESOR_CARGO}`;
  pintarMenu();
  $('#reingreso-cancelar').addEventListener('click', () => {
    $('#reingreso').hidden = true;
    if (resolverReingreso) { resolverReingreso.reject(new Error('Ingreso cancelado')); resolverReingreso = null; }
  });
  $('#modal-cerrar').addEventListener('click', cerrarModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
}

/* =====================================================================
   COMUNICACIÓN CON EL ALMACÉN (Apps Script o modo de prueba local)
   ===================================================================== */

async function api(accion, datos = {}) {
  if (!USAR_SERVIDOR) return apiLocal(accion, datos);
  if (!tokenVigente()) await pedirReingreso();
  // text/plain evita la verificación previa CORS que Apps Script no admite.
  const r = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, idToken: sesion.idToken, ...datos })
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Error del servidor');
  return j;
}

// Simula el servidor en este navegador (solo modo de prueba o sin Apps Script).
function apiLocal(accion, datos) {
  const clave = 'axervus.servidor-local.' + VERSION_DATOS;
  const db = almacen.leer(clave, { registros: {} });
  if (accion === 'enviar') {
    db.registros[sesion.email] = { ...datos.registro, fecha: new Date().toISOString() };
    if (!almacen.guardar(clave, db)) throw new Error('No hay espacio de almacenamiento en este navegador.');
    return Promise.resolve({ ok: true, local: true, fecha: db.registros[sesion.email].fecha });
  }
  if (accion === 'listar') return Promise.resolve({ ok: true, registros: Object.values(db.registros), local: true });
  if (accion === 'estado') return Promise.resolve({ ok: true, aiDisponible: false, local: true });
  return Promise.reject(new Error('Acción no disponible sin servidor'));
}

/* =====================================================================
   ESTUDIANTE — estado guardado por correo
   ===================================================================== */

let estado = null;
let indiceActual = 0;
let campoActivo = null;

const claveEstado = () => `axervus.ficha.${VERSION_DATOS}.${sesion.email}`;

function cargarEstado() {
  const base = { respuestas: {}, hechas: {}, meta: {}, etapa: 'repaso', indice: 0, enviadoEn: null };
  estado = Object.assign(base, almacen.leer(claveEstado(), {}));
  SECCIONES.forEach((s) => {
    estado.respuestas[s.id] = estado.respuestas[s.id] || {};
    estado.meta[s.id] = Object.assign({ dictado: false, asistente: 0, guardadoEn: null }, estado.meta[s.id]);
  });
}
function guardarEstado() {
  if (!almacen.guardar(claveEstado(), estado)) avisar('No se pudo guardar en este navegador (almacenamiento bloqueado o lleno).', 'error');
}
let temporizadorGuardado = null;
const guardarPronto = () => { clearTimeout(temporizadorGuardado); temporizadorGuardado = setTimeout(guardarEstado, 500); };

const totalSeccion = (sec, resp = estado.respuestas[sec.id]) => sec.campos.reduce((n, c) => n + contarPalabras(resp?.[c.id]), 0);

function validarSeccion(sec, resp = estado.respuestas[sec.id]) {
  const vacios = sec.campos.filter((c) => contarPalabras(resp?.[c.id]) === 0).map((c) => c.etiqueta);
  const total = totalSeccion(sec, resp);
  const excede = sec.limite && total > sec.limite;
  return { ok: !vacios.length && !excede, vacios, total, excede };
}

function abrirEstudiante() {
  cargarEstado();
  const nombre = sesion.nombre;
  $('#bienvenida-texto').textContent = `Bienvenido, ${nombre}, a la ficha resumen de tu proyecto de investigación con ${ENTIDAD_LARGA}.`;
  const hechas = SECCIONES.filter((s) => estado.hechas[s.id]).length;
  $('#bienvenida-progreso').textContent = hechas
    ? `Llevas ${hechas} de ${SECCIONES.length} secciones guardadas.${estado.enviadoEn ? ' Ya enviaste tu consolidado el ' + fechaLarga(estado.enviadoEn) + '.' : ''}`
    : `Vas a desarrollar ${SECCIONES.length} secciones de la ficha.`;
  mostrarVista('v-bienvenida');
}

function prepararEstudiante() {
  $('#btn-continuar-bienvenida').addEventListener('click', () => {
    if (estado.etapa === 'trabajo') abrirTrabajo(estado.indice || 0);
    else if (estado.etapa === 'consolidado') abrirConsolidado();
    else abrirRepaso();
  });
  $('#btn-empezar').addEventListener('click', () => {
    const pendiente = SECCIONES.findIndex((s) => !estado.hechas[s.id]);
    abrirTrabajo(pendiente < 0 ? 0 : pendiente);
  });
  $('#btn-volver-editar').addEventListener('click', () => abrirTrabajo(0));
  $('#btn-enviar').addEventListener('click', enviarConsolidado);
  $('#btn-asistente-movil').addEventListener('click', () => {
    const abierto = document.body.classList.toggle('asistente-abierto');
    $('#btn-asistente-movil').setAttribute('aria-expanded', abierto);
  });
}

/* ---------- 3. Repaso inicial ---------- */
function abrirRepaso() {
  estado.etapa = 'repaso'; guardarEstado();
  $('#repaso-lista').innerHTML = SECCIONES.map((s, i) => `
    <article class="curso ${estado.hechas[s.id] ? 'hecha' : ''}">
      <div class="curso-portada tono-${i % 4}">
        <span class="curso-insignia">${s.limite ? `Máx. ${s.limite} palabras` : 'Sin límite'}</span>
        <span class="curso-numero" aria-hidden="true">${esc(s.num)}</span>
        <span class="curso-icono" aria-hidden="true">${ICONOS[s.id] || ''}</span>
      </div>
      <div class="curso-cuerpo">
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.punto)}</p>
        <div class="curso-meta">
          <span>▤ ${s.campos.length > 1 ? `${s.campos.length} partes` : 'Un bloque'}</span>
          <span>✎ ${s.guia.length} pasos guía</span>
        </div>
      </div>
      <div class="curso-pie">
        <span class="curso-autor"><span class="mini-avatar">${esc((sesion.nombre || '?').charAt(0))}</span>Sección ${esc(s.num)}</span>
        <span class="curso-estado">${estado.hechas[s.id] ? '✓ Guardada' : 'Pendiente'}</span>
      </div>
    </article>`).join('');
  $('#repaso-profesor').innerHTML = `
    <p><strong>No te corresponden: 7. Cronograma, 9. Presupuesto y el Anexo (Prototipo de interfaz de la estrategia).</strong></p>
    <p>Con el consolidado final y en la socialización de todos los entregables, el profesor diseña, elabora y explica de qué manera se hacen esos puntos que faltan.</p>
    <p><strong>Sobre el prototipo:</strong> se desarrolla de manera externa, porque su diseño, programación y alojamiento requieren servicios técnicos especializados que no hacen parte del trabajo de redacción de la ficha. Por eso su costo se incluye en el presupuesto como un rubro externo.</p>`;
  mostrarVista('v-repaso');
}

/* ---------- 4. Desarrollo por secciones ---------- */
function abrirTrabajo(i) {
  detenerDictado();
  indiceActual = Math.max(0, Math.min(SECCIONES.length - 1, i));
  estado.etapa = 'trabajo'; estado.indice = indiceActual; guardarEstado();
  mostrarVista('v-trabajo');
  pintarPasos();
  pintarEditor();
  pintarAsistente();
  window.scrollTo({ top: 0 });
}

function pintarPasos() {
  const hechas = SECCIONES.filter((s) => estado.hechas[s.id]).length;
  $('#pasos').innerHTML = `
    <div class="pasos-progreso"><span>${hechas} de ${SECCIONES.length} guardadas</span><div class="barra-progreso"><i style="width:${(hechas / SECCIONES.length) * 100}%"></i></div></div>
    <ol>${SECCIONES.map((s, i) => `
      <li><button type="button" class="paso ${i === indiceActual ? 'actual' : ''} ${estado.hechas[s.id] ? 'hecha' : ''}" data-i="${i}" ${i === indiceActual ? 'aria-current="step"' : ''}>
        <span class="paso-num">${estado.hechas[s.id] ? '✓' : esc(s.num)}</span>
        <span class="paso-titulo">${esc(s.titulo)}</span>
      </button></li>`).join('')}
    </ol>`;
  $$('#pasos .paso').forEach((b) => b.addEventListener('click', () => abrirTrabajo(+b.dataset.i)));
  const actual = $('#pasos .paso.actual'); actual?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
}

function pintarEditor() {
  const sec = SECCIONES[indiceActual];
  const resp = estado.respuestas[sec.id];
  const ultimo = indiceActual === SECCIONES.length - 1;
  $('#editor').innerHTML = `
    <header class="editor-cabeza">
      <p class="etiqueta">Sección ${indiceActual + 1} de ${SECCIONES.length}</p>
      <h2><span class="num-seccion">${esc(sec.num)}.</span> ${esc(sec.titulo)}</h2>
    </header>
    <div class="instrucciones">
      <div class="instruccion-ficha">
        <p class="etiqueta">Lo que pide la ficha</p>
        <p><strong>${esc(sec.num)}. ${esc(sec.titulo)}:</strong> ${esc(sec.ficha || sec.punto)}</p>
      </div>
      <details class="guia" open>
        <summary>Cómo organizar y redactar tu argumento</summary>
        <ol>${sec.guia.map((g) => `<li>${esc(g)}</li>`).join('')}</ol>
        <p class="nota">Escribe con tus propias palabras y desde tu punto de vista. Tu profesor comparará los argumentos de todo el grupo.</p>
      </details>
    </div>
    <div class="campos">
      ${sec.campos.map((c) => `
        <div class="campo">
          <div class="campo-cabeza">
            <label for="campo-${c.id}">${esc(c.etiqueta)}</label>
            <button type="button" class="btn btn-mic" data-campo="${c.id}" aria-pressed="false">🎙️ Dictar</button>
          </div>
          <p class="campo-ayuda">${esc(c.ayuda)}</p>
          <textarea id="campo-${c.id}" class="campo-texto alto-${c.alto}" data-campo="${c.id}" spellcheck="true" lang="es">${esc(resp[c.id] || '')}</textarea>
          <p class="interino" data-interino="${c.id}" aria-live="polite"></p>
          <p class="contador-campo" data-contador="${c.id}"></p>
        </div>`).join('')}
    </div>
    <div class="limite" id="limite"></div>
    <footer class="editor-pie">
      <button type="button" id="btn-anterior" class="btn btn-secundario" ${indiceActual === 0 ? 'disabled' : ''}>← Anterior</button>
      <button type="button" id="btn-siguiente" class="btn btn-primario btn-grande">${ultimo ? 'Guardar y ver consolidado ✓' : 'Siguiente →'}</button>
    </footer>
    <div id="sello" class="sello" hidden><span>✓</span><p>Sección guardada</p></div>`;

  $$('#editor .campo-texto').forEach((ta) => {
    ajustarAlto(ta);
    ta.addEventListener('input', () => {
      estado.respuestas[sec.id][ta.dataset.campo] = ta.value;
      ajustarAlto(ta);
      actualizarContadores();
      guardarPronto();
      actualizarRevisionPronto();
    });
    ta.addEventListener('focus', () => { campoActivo = ta; });
    ta.addEventListener('select', () => buscarSeleccion(ta));
    ta.addEventListener('mouseup', () => buscarSeleccion(ta));
    ta.addEventListener('keyup', (e) => { if (e.shiftKey) buscarSeleccion(ta); });
  });
  campoActivo = $('#editor .campo-texto');
  $$('#editor .btn-mic').forEach((b) => b.addEventListener('click', () => alternarDictado($('#campo-' + b.dataset.campo), b)));
  $('#btn-anterior').addEventListener('click', () => abrirTrabajo(indiceActual - 1));
  $('#btn-siguiente').addEventListener('click', siguienteSeccion);
  if (!SR) $$('#editor .btn-mic').forEach((b) => { b.title = 'Tu navegador no admite dictado por voz. Usa Chrome o Edge.'; b.classList.add('no-disponible'); });
  actualizarContadores();
}

function ajustarAlto(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 4 + 'px';
}

function actualizarContadores() {
  const sec = SECCIONES[indiceActual];
  const resp = estado.respuestas[sec.id];
  sec.campos.forEach((c) => {
    const n = contarPalabras(resp[c.id]);
    const el = $(`[data-contador="${c.id}"]`);
    if (el) el.textContent = `${n} palabra${n === 1 ? '' : 's'}`;
  });
  const total = totalSeccion(sec);
  const lim = $('#limite');
  if (sec.limite) {
    const pct = Math.min(100, (total / sec.limite) * 100);
    lim.className = 'limite' + (total > sec.limite ? ' excede' : pct > 85 ? ' cerca' : '');
    lim.innerHTML = `<div class="limite-texto"><span>${total} / ${sec.limite} palabras${sec.campos.length > 1 ? ' (sumando todas las partes)' : ''}</span>${total > sec.limite ? `<strong>Te pasaste por ${total - sec.limite}</strong>` : ''}</div><div class="barra-progreso"><i style="width:${pct}%"></i></div>`;
  } else {
    lim.className = 'limite';
    lim.innerHTML = `<div class="limite-texto"><span>${total} palabras · esta sección no tiene límite</span></div>`;
  }
}

function siguienteSeccion() {
  const sec = SECCIONES[indiceActual];
  $$('#editor .campo-texto').forEach((ta) => { estado.respuestas[sec.id][ta.dataset.campo] = ta.value; });
  const v = validarSeccion(sec);
  if (v.vacios.length) { avisar('Completa: ' + v.vacios.join(', ') + '.', 'error'); $('#editor .campo-texto:placeholder-shown, #editor .campo-texto')?.focus(); return; }
  if (v.excede) { avisar(`La ficha permite máximo ${sec.limite} palabras. Tienes ${v.total}; reduce ${v.total - sec.limite}.`, 'error', 6000); return; }
  detenerDictado();
  estado.hechas[sec.id] = true;
  estado.meta[sec.id].guardadoEn = new Date().toISOString();
  guardarEstado();
  const sello = $('#sello'); sello.hidden = false;
  pintarPasos();
  setTimeout(() => {
    sello.hidden = true;
    if (indiceActual < SECCIONES.length - 1) abrirTrabajo(indiceActual + 1);
    else abrirConsolidado();
  }, 950);
}

/* ---------- Dictado por voz (SpeechRecognition) ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let dictado = { rec: null, campo: null, boton: null, activo: false };

function alternarDictado(ta, boton) {
  if (dictado.activo && dictado.campo === ta) { detenerDictado(); return; }
  detenerDictado();
  if (!SR) { avisar('Tu navegador no admite dictado por voz. Usa Google Chrome o Microsoft Edge.', 'error', 6000); return; }
  const rec = new SR();
  rec.lang = 'es-CO';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (ev) => {
    let interino = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) insertarDictado(ta, r[0].transcript);
      else interino += r[0].transcript;
    }
    const p = $(`[data-interino="${ta.dataset.campo}"]`);
    if (p) p.textContent = interino ? '… ' + interino : '';
  };
  rec.onerror = (ev) => {
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { avisar('Permite el uso del micrófono en el navegador para dictar.', 'error', 6000); dictado.activo = false; }
    else if (ev.error === 'network') { avisar('El dictado necesita conexión a internet.', 'error'); dictado.activo = false; }
    else if (ev.error === 'audio-capture') { avisar('No se encontró un micrófono.', 'error'); dictado.activo = false; }
  };
  // Chrome detiene el reconocimiento tras silencios: se reinicia mientras siga activo.
  rec.onend = () => {
    if (dictado.activo && dictado.rec === rec) { try { rec.start(); } catch { detenerDictado(); } }
    else marcarBotonMic(boton, false);
  };
  dictado = { rec, campo: ta, boton, activo: true };
  try { rec.start(); } catch { avisar('No se pudo iniciar el dictado.', 'error'); return; }
  marcarBotonMic(boton, true);
  const sec = SECCIONES[indiceActual];
  estado.meta[sec.id].dictado = true; guardarPronto();
  ta.focus();
}

function marcarBotonMic(b, activo) {
  if (!b) return;
  b.classList.toggle('grabando', activo);
  b.setAttribute('aria-pressed', activo);
  b.textContent = activo ? '⏹ Detener dictado' : '🎙️ Dictar';
}

function detenerDictado() {
  if (!dictado.rec) return;
  dictado.activo = false;
  try { dictado.rec.stop(); } catch { /* ya detenido */ }
  marcarBotonMic(dictado.boton, false);
  $$('.interino').forEach((p) => { p.textContent = ''; });
  dictado = { rec: null, campo: null, boton: null, activo: false };
}

// Comandos de puntuación por voz: "coma", "punto seguido", "punto y aparte", etc.
function aplicarComandos(t) {
  return (' ' + t + ' ')
    .replace(/\s(punto y aparte|nuevo párrafo)\s/gi, '.\n')
    .replace(/\s(nueva línea|nuevo renglón)\s/gi, '\n')
    .replace(/\s(punto seguido|punto final)\s/gi, '. ')
    .replace(/\spunto y coma\s/gi, '; ')
    .replace(/\sdos puntos\s/gi, ': ')
    .replace(/\scoma\s/gi, ', ')
    .replace(/\s(abrir pregunta|abre pregunta|abrir interrogación)\s/gi, ' ¿')
    .replace(/\s(cerrar pregunta|cierra pregunta|cerrar interrogación)\s/gi, '? ')
    .replace(/\s+([.,;:?])/g, '$1')
    .replace(/¿\s+/g, '¿')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function insertarDictado(ta, transcripcion) {
  let texto = aplicarComandos(transcripcion);
  if (!texto) return;
  const ini = ta.selectionStart ?? ta.value.length;
  const fin = ta.selectionEnd ?? ini;
  const antes = ta.value.slice(0, ini);
  const despues = ta.value.slice(fin);
  const previo = antes.replace(/[ \t]+$/, '');
  const ultimo = previo.slice(-1);
  if (!previo || /[.!?\n]/.test(ultimo)) texto = capitalizar(texto);
  const sep = antes && !/[\s¿(]$/.test(antes) && !/^[.,;:?]/.test(texto) ? ' ' : '';
  ta.value = antes + sep + texto + despues;
  const pos = (antes + sep + texto).length;
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------- Asistente de redacción (reglas locales, sin API) ---------- */
const INDICE_SIN = new Map(Object.entries(SINONIMOS).map(([k, v]) => [normalizar(k), { palabra: k, lista: v }]));

function buscarSinonimos(palabra) {
  const n = normalizar(palabra).trim();
  if (!n) return null;
  if (INDICE_SIN.has(n)) return INDICE_SIN.get(n);
  for (const suf of ['es', 's']) if (n.endsWith(suf) && INDICE_SIN.has(n.slice(0, -suf.length))) return INDICE_SIN.get(n.slice(0, -suf.length));
  if (n.endsWith('a') && INDICE_SIN.has(n.slice(0, -1) + 'o')) return INDICE_SIN.get(n.slice(0, -1) + 'o');
  return null;
}

function pintarAsistente() {
  const sec = SECCIONES[indiceActual];
  $('#asistente').innerHTML = `
    <div class="asistente-cabeza">
      <h3>💡 Asistente de redacción</h3>
      <button type="button" class="btn btn-sutil cerrar-asistente" aria-label="Cerrar asistente">✕</button>
    </div>
    <section class="bloque">
      <h4>Revisión de tu sección</h4>
      <ul id="revision" class="revision"></ul>
    </section>
    <section class="bloque">
      <h4>Sinónimos</h4>
      <p class="nota">Selecciona una palabra en tu texto o escríbela aquí.</p>
      <form id="form-sinonimo" class="buscador"><input id="buscar-sinonimo" type="search" placeholder="Ej.: mejorar" aria-label="Buscar sinónimo"><button class="btn btn-secundario" type="submit">Buscar</button></form>
      <div id="resultado-sinonimos" class="chips"></div>
      <div id="repetidas"></div>
    </section>
    <section class="bloque">
      <h4>Palabras clave de esta sección</h4>
      <div class="chips">${sec.claves.map((c) => `<button type="button" class="chip" data-insertar="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    </section>
    <section class="bloque">
      <h4>Formas de empezar</h4>
      <div class="frases">${sec.frases.map((f) => `<button type="button" class="frase" data-insertar="${esc(f)}">${esc(f.trim())}…</button>`).join('')}</div>
    </section>
    <section class="bloque">
      <h4>Conectores</h4>
      ${CONECTORES.map((g) => `<details><summary>${esc(g.grupo)}</summary><div class="chips">${g.lista.map((c) => `<button type="button" class="chip" data-insertar="${esc(c)}">${esc(c.trim())}</button>`).join('')}</div></details>`).join('')}
    </section>
    ${SR ? `<section class="bloque"><h4>Comandos de dictado</h4><p class="nota">Di <em>"coma"</em>, <em>"punto seguido"</em>, <em>"punto y aparte"</em>, <em>"dos puntos"</em>, <em>"abrir pregunta"</em> y <em>"cerrar pregunta"</em>. Revisa siempre el texto reconocido.</p></section>` : `<section class="bloque"><p class="aviso aviso-alerta">Tu navegador no admite dictado por voz. Para dictar, usa Google Chrome o Microsoft Edge.</p></section>`}
  `;
  $('#asistente .cerrar-asistente').addEventListener('click', () => document.body.classList.remove('asistente-abierto'));
  $('#asistente').addEventListener('click', (e) => {
    const b = e.target.closest('[data-insertar]');
    if (b) insertarTexto(b.dataset.insertar);
    const s = e.target.closest('[data-reemplazar]');
    if (s) reemplazarSeleccion(s.dataset.reemplazar);
    const r = e.target.closest('[data-repetida]');
    if (r) seleccionarSiguiente(r.dataset.repetida);
  });
  $('#form-sinonimo').addEventListener('submit', (e) => { e.preventDefault(); mostrarSinonimos($('#buscar-sinonimo').value, false); });
  actualizarRevision();
}

function insertarTexto(t) {
  const ta = campoActivo || $('#editor .campo-texto');
  if (!ta) return;
  const ini = ta.selectionStart ?? ta.value.length, fin = ta.selectionEnd ?? ini;
  const antes = ta.value.slice(0, ini);
  let txt = t;
  if (!antes.trim() || /[.!?\n]\s*$/.test(antes)) txt = capitalizar(txt);
  const sep = antes && !/[\s¿(]$/.test(antes) ? ' ' : '';
  ta.value = antes + sep + txt + ta.value.slice(fin);
  const pos = (antes + sep + txt).length;
  ta.focus(); ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  contarUsoAsistente();
}

function contarUsoAsistente() {
  const sec = SECCIONES[indiceActual];
  estado.meta[sec.id].asistente = (estado.meta[sec.id].asistente || 0) + 1;
  guardarPronto();
}

function buscarSeleccion(ta) {
  const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
  if (sel && contarPalabras(sel) <= 3 && sel.length < 40) {
    $('#buscar-sinonimo').value = sel;
    mostrarSinonimos(sel, true);
  }
}

function mostrarSinonimos(palabra, desdeSeleccion) {
  const cont = $('#resultado-sinonimos');
  const r = buscarSinonimos(palabra);
  if (!palabra.trim()) { cont.innerHTML = ''; return; }
  if (!r) { cont.innerHTML = `<p class="nota">No hay sugerencias para “${esc(palabra)}”. Prueba con la forma básica de la palabra (por ejemplo, “mejorar” en vez de “mejoraron”).</p>`; return; }
  const accion = desdeSeleccion ? 'data-reemplazar' : 'data-insertar';
  cont.innerHTML = `<p class="nota">${desdeSeleccion ? 'Pulsa una opción para reemplazar' : 'Pulsa para insertar'} “${esc(palabra)}”. Ajusta género y número si hace falta.</p>` +
    r.lista.map((s) => `<button type="button" class="chip chip-sin" ${accion}="${esc(s)}">${esc(s)}</button>`).join('');
}

function reemplazarSeleccion(nueva) {
  const ta = campoActivo;
  if (!ta) return;
  const ini = ta.selectionStart, fin = ta.selectionEnd;
  if (ini === fin) { insertarTexto(nueva); return; }
  const original = ta.value.slice(ini, fin);
  const txt = /^\p{Lu}/u.test(original) ? capitalizar(nueva) : nueva;
  ta.value = ta.value.slice(0, ini) + txt + ta.value.slice(fin);
  ta.focus(); ta.setSelectionRange(ini, ini + txt.length);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  contarUsoAsistente();
}

// Selecciona la siguiente aparición de una palabra repetida para cambiarla.
function seleccionarSiguiente(palabraNorm) {
  const tas = $$('#editor .campo-texto');
  const re = new RegExp(PALABRA_RE.source, 'gu');
  const inicioTa = tas.indexOf(campoActivo);
  for (let vuelta = 0; vuelta < tas.length * 2; vuelta++) {
    const ta = tas[(Math.max(0, inicioTa) + Math.floor(vuelta / 2)) % tas.length];
    const desde = vuelta === 0 && ta === campoActivo ? ta.selectionEnd : 0;
    re.lastIndex = 0; let m;
    while ((m = re.exec(ta.value))) {
      if (m.index >= desde && normalizar(m[0]) === palabraNorm) {
        campoActivo = ta; ta.focus(); ta.setSelectionRange(m.index, m.index + m[0].length);
        $('#buscar-sinonimo').value = m[0]; mostrarSinonimos(m[0], true);
        return;
      }
    }
  }
}

let temporizadorRevision = null;
const actualizarRevisionPronto = () => { clearTimeout(temporizadorRevision); temporizadorRevision = setTimeout(actualizarRevision, 350); };

function actualizarRevision() {
  const sec = SECCIONES[indiceActual];
  const resp = estado.respuestas[sec.id];
  const items = [];
  const v = validarSeccion(sec);
  if (sec.limite) items.push({ ok: !v.excede && v.total > 0, t: `Extensión: ${v.total} de ${sec.limite} palabras` });
  sec.campos.forEach((c) => {
    const t = resp[c.id] || '';
    const pref = sec.campos.length > 1 ? c.etiqueta + ': ' : '';
    if (!contarPalabras(t)) { items.push({ ok: false, t: pref + 'aún está vacío' }); return; }
    (c.criterios || []).forEach((k) => items.push({ ok: k.re.test(t), t: pref + k.t }));
    (c.extra ? c.extra(t) : []).forEach((k) => items.push({ ok: k.ok, t: pref + k.t }));
  });
  const todo = sec.campos.map((c) => resp[c.id] || '').join('\n');
  const vagas = (todo.match(PALABRA_RE) || []).filter((w) => PALABRAS_VAGAS.includes(normalizar(w)));
  if (vagas.length) items.push({ ok: false, t: `Evita palabras poco precisas: ${[...new Set(vagas.map((w) => w.toLowerCase()))].join(', ')}` });
  if (/\b(yo|me|mi|mis)\b/i.test(todo) && sec.id !== 'referencias') items.push({ ok: false, aviso: true, t: 'Prefiere la redacción impersonal (“se propone”, “se busca”) en lugar de la primera persona.' });
  $('#revision').innerHTML = items.map((i) => `<li class="${i.ok ? 'ok' : i.aviso ? 'aviso' : 'falta'}">${i.ok ? '✓' : '○'} ${esc(i.t)}</li>`).join('') || '<li>Escribe para ver la revisión.</li>';

  const a = analizarTexto(todo);
  const rep = a.repetidas.filter(([w]) => INDICE_SIN.has(w) || buscarSinonimos(w)).slice(0, 6);
  $('#repetidas').innerHTML = rep.length
    ? `<p class="nota"><strong>Palabras que repites mucho</strong> (pulsa para ubicarlas y cambiarlas):</p><div class="chips">${rep.map(([w, n]) => `<button type="button" class="chip chip-rep" data-repetida="${esc(w)}">${esc(w)} ×${n}</button>`).join('')}</div>`
    : '';
}

/* ---------- 5. Consolidado y lista de verificación ---------- */
function checklistSeccion(sec, resp, meta) {
  const v = validarSeccion(sec, resp);
  const items = [];
  items.push({ ok: v.ok, t: sec.limite ? `Escribiste ${v.total} palabras (máximo ${sec.limite})` : `Escribiste ${v.total} palabras` });
  if (sec.campos.length > 1) items.push({ ok: !v.vacios.length, t: 'Desarrollaste: ' + sec.campos.map((c) => `${c.etiqueta} ${contarPalabras(resp[c.id]) ? '✓' : '✗'}`).join(' · ') });
  sec.campos.forEach((c) => (c.extra ? c.extra(resp[c.id] || '') : []).forEach((k) => items.push({ ok: k.ok, t: k.t, opcional: true })));
  const crit = sec.campos.flatMap((c) => (c.criterios || []).map((k) => k.re.test(resp[c.id] || '')));
  if (crit.length) items.push({ ok: crit.filter(Boolean).length >= Math.ceil(crit.length * 0.6), t: `Cubriste ${crit.filter(Boolean).length} de ${crit.length} elementos que pide la sección`, opcional: true });
  if (meta?.dictado) items.push({ ok: true, t: 'Usaste el dictado por voz', opcional: true });
  if (meta?.asistente) items.push({ ok: true, t: `Usaste el asistente ${meta.asistente} ${meta.asistente === 1 ? 'vez' : 'veces'}`, opcional: true });
  if (meta?.guardadoEn) items.push({ ok: true, t: 'Guardada el ' + fechaLarga(meta.guardadoEn), opcional: true });
  return { completa: !!v.ok, items };
}

function abrirConsolidado() {
  detenerDictado();
  estado.etapa = 'consolidado'; guardarEstado();
  const listas = SECCIONES.map((s) => ({ s, c: checklistSeccion(s, estado.respuestas[s.id], estado.meta[s.id]), hecha: !!estado.hechas[s.id] }));
  const completas = listas.filter((x) => x.hecha && x.c.completa).length;
  $('#consolidado-intro').textContent = completas === SECCIONES.length
    ? `¡Muy bien, ${sesion.nombre}! Completaste las ${SECCIONES.length} secciones. Revisa la lista y envía tu consolidado.`
    : `Llevas ${completas} de ${SECCIONES.length} secciones completas. Termina las pendientes para poder enviar.`;
  $('#checklist').innerHTML = listas.map(({ s, c, hecha }, i) => `
    <article class="check-seccion ${hecha && c.completa ? 'completa' : 'pendiente'}">
      <header>
        <span class="check-icono">${hecha && c.completa ? '✓' : '!'}</span>
        <h3>${esc(s.num)}. ${esc(s.titulo)}</h3>
        <button type="button" class="btn btn-sutil" data-ir="${i}">${hecha && c.completa ? 'Revisar' : 'Completar'}</button>
      </header>
      <ul>${c.items.map((it) => `<li class="${it.ok ? 'ok' : it.opcional ? 'sugerencia' : 'falta'}">${it.ok ? '✓' : it.opcional ? '○' : '✗'} ${esc(it.t)}</li>`).join('')}</ul>
    </article>`).join('');
  $$('#checklist [data-ir]').forEach((b) => b.addEventListener('click', () => abrirTrabajo(+b.dataset.ir)));
  $('#envio-profesor').innerHTML = `<strong>${esc(PROFESOR_NOMBRE)}</strong><br><span>${esc(PROFESOR_CARGO)}</span><br><span class="nota">${esc(PROFESOR_EMAIL)}</span>`;
  const btn = $('#btn-enviar');
  btn.disabled = completas !== SECCIONES.length;
  btn.textContent = estado.enviadoEn ? 'Enviar de nuevo (actualizar)' : 'Enviar consolidado al profesor';
  $('#envio-estado').innerHTML = estado.enviadoEn ? `✓ Enviado el ${esc(fechaLarga(estado.enviadoEn))}. Si haces cambios, puedes enviarlo de nuevo; se reemplaza el envío anterior.` : '';
  mostrarVista('v-consolidado');
}

function textoConsolidado(reg) {
  const L = [];
  L.push('FICHA RESUMEN DEL PROYECTO — CONSOLIDADO DEL ESTUDIANTE');
  L.push(ENTIDAD_LARGA);
  L.push('');
  L.push('Estudiante: ' + reg.nombre);
  L.push('Correo: ' + reg.email);
  L.push('Fecha: ' + fechaLarga(reg.fecha || Date.now()));
  L.push('Profesor: ' + PROFESOR_NOMBRE);
  SECCIONES.forEach((s) => {
    const r = reg.respuestas[s.id] || {};
    L.push('', '────────────────────────────────────────');
    L.push(`${s.num}. ${s.titulo.toUpperCase()} (${totalSeccion(s, r)} palabras${s.limite ? ' / máx. ' + s.limite : ''})`);
    s.campos.forEach((c) => {
      if (s.campos.length > 1) L.push('', c.etiqueta + ':');
      L.push((r[c.id] || '').trim());
    });
  });
  L.push('', '────────────────────────────────────────', 'LISTA DE VERIFICACIÓN');
  SECCIONES.forEach((s) => {
    const c = checklistSeccion(s, reg.respuestas[s.id] || {}, reg.meta?.[s.id]);
    L.push(`${c.completa ? '[✓]' : '[ ]'} ${s.num}. ${s.titulo}`);
    c.items.forEach((i) => L.push(`    ${i.ok ? '✓' : '·'} ${i.t}`));
  });
  return L.join('\n');
}

async function enviarConsolidado() {
  const btn = $('#btn-enviar');
  const estadoEnvio = $('#envio-estado');
  const registro = {
    email: sesion.email, nombre: sesion.nombre, fecha: new Date().toISOString(),
    completas: SECCIONES.filter((s) => estado.hechas[s.id]).length,
    respuestas: estado.respuestas, meta: estado.meta
  };
  registro.texto = textoConsolidado(registro);
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    if (!USAR_SERVIDOR && !MODO_PRUEBA) throw new Error('sin-servidor');
    const r = await api('enviar', { registro });
    estado.enviadoEn = r.fecha || registro.fecha; guardarEstado();
    estadoEnvio.innerHTML = r.local
      ? `✓ Guardado en modo de prueba (solo en este navegador). Para enviarlo también por correo, <a href="#" id="enlace-mailto">abre tu correo aquí</a>.`
      : `✓ Tu consolidado llegó a ${esc(PROFESOR_NOMBRE)}${r.correoEnviado ? ' y se le notificó por correo' : ''}. Fecha: ${esc(fechaLarga(estado.enviadoEn))}.`;
    $('#enlace-mailto')?.addEventListener('click', (e) => { e.preventDefault(); abrirMailto(registro); });
    avisar('Consolidado enviado ✓', 'ok');
  } catch (err) {
    if (err.message === 'Ingreso cancelado') { estadoEnvio.textContent = 'Envío cancelado.'; }
    else {
      // Respaldo: el estudiante lo envía desde su propio cliente de correo.
      abrirMailto(registro);
      estado.enviadoEn = registro.fecha; guardarEstado();
      estadoEnvio.innerHTML = `Se abrió tu aplicación de correo con el consolidado dirigido a ${esc(PROFESOR_EMAIL)}. <strong>Pulsa “Enviar” en tu correo</strong> para completar el envío.${err.message !== 'sin-servidor' ? ' (No fue posible usar el envío automático: ' + esc(err.message) + ')' : ''}`;
    }
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar de nuevo (actualizar)';
  }
}

function abrirMailto(registro) {
  const asunto = `Consolidado ficha resumen ${ENTIDAD} — ${registro.nombre} (${registro.email})`;
  let cuerpo = registro.texto;
  // Algunos clientes de correo cortan los enlaces mailto largos: se copia al portapapeles como respaldo.
  try { navigator.clipboard?.writeText(registro.texto); } catch { /* sin portapapeles */ }
  if (encodeURIComponent(cuerpo).length > 12000) {
    cuerpo = `Profesor ${PROFESOR_NOMBRE}:\n\nAdjunto mi consolidado de la ficha resumen. El texto completo quedó copiado en el portapapeles: pégalo aquí debajo (Ctrl+V) antes de enviar.\n\nEstudiante: ${registro.nombre}\nCorreo: ${registro.email}\n\n`;
    avisar('El consolidado se copió al portapapeles. Pégalo en el correo antes de enviar.', 'info', 8000);
  }
  window.location.href = `mailto:${PROFESOR_EMAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

/* =====================================================================
   PROFESOR — panel, análisis y ficha final
   ===================================================================== */

let registros = [];
let prof = null;               // estado del profesor (guardado localmente)
let servidorInfo = { aiDisponible: false };
let imagenesPrototipo = [];    // PNG en base64 generados para cada pantalla

const claveProf = () => `axervus.profesor.${VERSION_DATOS}.${sesion.email}`;
const guardarProf = () => { if (!almacen.guardar(claveProf(), prof)) avisar('No se pudo guardar el trabajo del profesor en este navegador.', 'error'); };

const CAMPOS_ENCABEZADO = [
  { id: 'facultad', etiqueta: 'Facultad, Programa/ Semillero de Investigación', tipo: 'text', def: ENTIDAD_LARGA },
  { id: 'fecha', etiqueta: 'Fecha de entrega a Comité Focal', tipo: 'date', def: '' },
  { id: 'titulo', etiqueta: 'Título del Proyecto', tipo: 'text', def: '', ancho: true },
  { id: 'proponentes', etiqueta: 'Proponentes del proyecto', tipo: 'textarea', def: '', ancho: true, ayuda: 'Se llena con los nombres de los estudiantes que enviaron su consolidado. Puedes editarlo.' },
  { id: 'tipo', etiqueta: 'Tipo de Proyecto', tipo: 'select', opciones: ['Aplicado', 'Básico'], def: 'Aplicado' },
  { id: 'linea', etiqueta: 'Línea Institucional de Investigación a la que pertenece', tipo: 'text', def: '' },
  { id: 'grupo', etiqueta: 'Grupo de Investigación al que se vincularía', tipo: 'text', def: 'GIEEP' },
  { id: 'semillero', etiqueta: 'Semillero de Investigación (aplica para los estudiantes en categoría de MASTER vinculados a un semillero activo)', tipo: 'text', def: '', ancho: true }
];

async function abrirPanelProfesor() {
  prof = Object.assign({ encabezado: {}, proponentesEditado: false, analisis: null, textos: {}, selecciones: {}, cronograma: null, presupuesto: null, prototipo: null, autoria: true }, almacen.leer(claveProf(), {}));
  CAMPOS_ENCABEZADO.forEach((c) => { if (prof.encabezado[c.id] === undefined) prof.encabezado[c.id] = c.def; });
  $('#profesor-saludo').textContent = `Bienvenido, ${sesion.nombre}`;
  $('#profesor-cargo').textContent = `${PROFESOR_CARGO} · ${ENTIDAD_LARGA}`;
  mostrarVista('v-profesor');
  pintarEncabezadoForm();
  if (!USAR_SERVIDOR) {
    $('#lista-consolidados').innerHTML = `<p class="aviso ${MODO_PRUEBA ? 'aviso-info' : 'aviso-alerta'}">${MODO_PRUEBA
      ? '<strong>Modo de prueba:</strong> aquí aparecen los consolidados enviados desde este mismo navegador. Con Google y Apps Script configurados, verás los de todos los estudiantes.'
      : '<strong>Falta configurar APPS_SCRIPT_URL en app.js.</strong> Sin ese almacén compartido, los consolidados solo te llegan por correo y no se pueden ver aquí.'}</p>`;
  }
  try { servidorInfo = await api('estado'); } catch { servidorInfo = { aiDisponible: false }; }
  $('#btn-analizar').textContent = servidorInfo.aiDisponible ? '🤖 Analizar con IA y generar ficha final' : '🤖 Analizar y generar ficha final';
  await cargarRegistros();
  if (prof.analisis) await pintarTodoFinal();
}

function prepararProfesor() {
  $('#btn-actualizar').addEventListener('click', cargarRegistros);
  $('#btn-analizar').addEventListener('click', analizarYGenerar);
  $('#btn-fila-cronograma').addEventListener('click', () => { prof.cronograma.push({ fase: prof.cronograma.at(-1)?.fase || 'Fase', actividad: 'Nueva actividad', inicio: 16, fin: 17 }); guardarProf(); pintarCronogramaEditor(); pintarVistaPrevia(); });
  $('#btn-fila-presupuesto').addEventListener('click', () => { prof.presupuesto.directos.push({ rubro: 'Nuevo rubro', descripcion: '', cantidad: 1, unitario: 0, fuente: FUENTES[0] }); guardarProf(); pintarPresupuestoEditor(); pintarVistaPrevia(); });
  $('#btn-regenerar-prototipo').addEventListener('click', async () => { prof.prototipo = generarPrototipo(prof.textos, prof.encabezado.titulo); guardarProf(); await prepararImagenesPrototipo(); pintarPrototipoEditor(); pintarVistaPrevia(); });
  $('#btn-word').addEventListener('click', descargarWord);
  $('#btn-pdf').addEventListener('click', descargarPDF);
}

async function cargarRegistros() {
  const cont = $('#lista-consolidados');
  const aviso = USAR_SERVIDOR ? '' : cont.querySelector('.aviso')?.outerHTML || '';
  cont.innerHTML = aviso + '<p class="nota">Cargando consolidados…</p>';
  try {
    const r = await api('listar');
    registros = (r.registros || []).filter((x) => x && x.respuestas).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  } catch (e) {
    cont.innerHTML = aviso + `<p class="aviso aviso-error">No se pudieron cargar los consolidados: ${esc(e.message)}</p>`;
    return;
  }
  $('#total-consolidados').textContent = registros.length;
  pintarIndicadores();
  if (!prof.proponentesEditado) {
    prof.encabezado.proponentes = registros.map((r) => r.nombre).join('\n');
    const ta = $('#enc-proponentes'); if (ta) ta.value = prof.encabezado.proponentes;
    guardarProf();
  }
  if (!registros.length) { cont.innerHTML = aviso + '<p class="vacio">Aún no hay consolidados. Aparecerán aquí cuando los estudiantes los envíen.</p>'; return; }
  cont.innerHTML = aviso + `
    <table class="tabla">
      <thead><tr><th>Estudiante</th><th>Correo</th><th>Enviado</th><th>Secciones</th><th>Palabras</th><th></th></tr></thead>
      <tbody>${registros.map((r, i) => {
        const completas = SECCIONES.filter((s) => validarSeccion(s, r.respuestas[s.id] || {}).ok).length;
        const palabras = SECCIONES.reduce((n, s) => n + totalSeccion(s, r.respuestas[s.id] || {}), 0);
        return `<tr>
          <td data-t="Estudiante"><strong>${esc(r.nombre)}</strong></td>
          <td data-t="Correo">${esc(r.email)}</td>
          <td data-t="Enviado">${esc(r.fecha ? fechaLarga(r.fecha) : '—')}</td>
          <td data-t="Secciones"><span class="pildora ${completas === SECCIONES.length ? 'ok' : 'alerta'}">${completas}/${SECCIONES.length}</span></td>
          <td data-t="Palabras">${palabras}</td>
          <td><button type="button" class="btn btn-sutil" data-ver="${i}">Ver consolidado</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  $$('[data-ver]').forEach((b) => b.addEventListener('click', () => verConsolidado(registros[+b.dataset.ver])));
}

// Indicadores tipo "categoría" en la parte superior del panel del profesor.
function pintarIndicadores() {
  const completos = registros.filter((r) => SECCIONES.every((s) => validarSeccion(s, r.respuestas[s.id] || {}).ok)).length;
  const palabras = registros.length ? Math.round(registros.reduce((n, r) => n + SECCIONES.reduce((m, s) => m + totalSeccion(s, r.respuestas[s.id] || {}), 0), 0) / registros.length) : 0;
  const datos = [
    ['Consolidados recibidos', registros.length, ic('<path d="M4 4h16v12H5.2L4 17.5z"/><path d="M8 9h8M8 12h5"/>')],
    ['Fichas completas', `${completos}/${registros.length}`, ic('<path d="m5 12 4 4 10-10"/>')],
    ['Palabras por estudiante', palabras, ic('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>')],
    ['Secciones por ficha', SECCIONES.length, ic('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>')]
  ];
  $('#profesor-indicadores').innerHTML = datos.map(([t, v, i], k) => `<div class="indicador ${k === 0 ? 'activo' : ''}"><span class="indicador-icono">${i}</span><div><strong>${esc(String(v))}</strong><small>${esc(t)}</small></div></div>`).join('');
}

function verConsolidado(r) {
  abrirModal(`${r.nombre} · ${r.email}`, SECCIONES.map((s) => {
    const resp = r.respuestas[s.id] || {};
    return `<section class="modal-seccion"><h4>${esc(s.num)}. ${esc(s.titulo)} <span class="nota">(${totalSeccion(s, resp)} palabras${s.limite ? ' / máx. ' + s.limite : ''})</span></h4>
      ${s.campos.map((c) => `${s.campos.length > 1 ? `<p class="etiqueta">${esc(c.etiqueta)}</p>` : ''}<p class="texto-pre">${esc(resp[c.id] || '—')}</p>`).join('')}</section>`;
  }).join(''));
}

function pintarEncabezadoForm() {
  $('#form-encabezado').innerHTML = CAMPOS_ENCABEZADO.map((c) => {
    const v = esc(prof.encabezado[c.id] || '');
    let control;
    if (c.tipo === 'textarea') control = `<textarea id="enc-${c.id}" rows="3">${v}</textarea>`;
    else if (c.tipo === 'select') control = `<select id="enc-${c.id}">${c.opciones.map((o) => `<option ${o === prof.encabezado[c.id] ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    else control = `<input id="enc-${c.id}" type="${c.tipo}" value="${v}">`;
    return `<label class="${c.ancho ? 'ancho' : ''}">${esc(c.etiqueta)}${control}${c.ayuda ? `<small>${esc(c.ayuda)}</small>` : ''}</label>`;
  }).join('');
  CAMPOS_ENCABEZADO.forEach((c) => {
    $('#enc-' + c.id).addEventListener('input', (e) => {
      prof.encabezado[c.id] = e.target.value;
      if (c.id === 'proponentes') prof.proponentesEditado = true;
      guardarProf();
      if (prof.analisis) pintarVistaPronto();
    });
  });
}

/* ---------- Motor de análisis local (reglas) ---------- */
function analizarTexto(t) {
  const palabras = String(t || '').match(PALABRA_RE) || [];
  const oraciones = String(t || '').split(/[.!?\n]+/).filter((s) => contarPalabras(s) > 2);
  const contenido = palabras.map(normalizar).filter((w) => w.length > 3 && !STOP.has(w));
  const freq = {};
  contenido.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  return {
    n: palabras.length,
    oraciones: oraciones.length,
    ttr: contenido.length ? new Set(contenido).size / contenido.length : 0,
    repetidas: Object.entries(freq).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]),
    promOracion: oraciones.length ? palabras.length / oraciones.length : palabras.length
  };
}

function evaluarCampo(campo, texto) {
  const a = analizarTexto(texto);
  if (!a.n) return { puntaje: 0, palabras: 0, razones: [{ ok: false, t: 'Sin respuesta' }] };
  const [min, max] = campo.rango;
  const ext = a.n < min ? a.n / min : a.n <= max ? 1 : Math.max(0, 1 - ((a.n - max) / max) * 1.5);
  const crit = (campo.criterios || []).map((c) => ({ ok: c.re.test(texto), t: c.t }));
  const extra = campo.extra ? campo.extra(texto) : [];
  const cob = crit.length ? crit.filter((c) => c.ok).length / crit.length : 1;
  const cumple = extra.length ? extra.filter((c) => c.ok).length / extra.length : 1;
  const lex = campo.lista ? 1 : a.ttr >= 0.75 ? 1 : a.ttr <= 0.4 ? 0.2 : 0.2 + ((a.ttr - 0.4) / 0.35) * 0.8;
  const orac = campo.lista || a.n < 25 ? 1 : a.promOracion >= 10 && a.promOracion <= 32 ? 1 : a.promOracion < 10 ? 0.6 : Math.max(0.3, 1 - (a.promOracion - 32) / 40);
  const puntaje = Math.round(100 * (0.22 * ext + 0.38 * cob + 0.18 * cumple + 0.12 * lex + 0.10 * orac));
  const razones = [...crit, ...extra];
  if (a.n < min) razones.push({ ok: false, t: `Extensión corta (${a.n} palabras)` });
  else if (a.n > max) razones.push({ ok: false, t: `Extensión larga (${a.n} palabras)` });
  else razones.push({ ok: true, t: `Extensión adecuada (${a.n} palabras)` });
  if (!campo.lista && a.n >= 25) {
    if (a.ttr >= 0.65) razones.push({ ok: true, t: 'Vocabulario variado' });
    else razones.push({ ok: false, t: 'Repite muchas palabras' });
    if (a.promOracion > 40) razones.push({ ok: false, t: 'Oraciones muy largas' });
  }
  return { puntaje, palabras: a.n, razones };
}

function tejas(t) { // tríos de palabras para detectar textos casi iguales
  const w = (String(t).match(PALABRA_RE) || []).map(normalizar);
  const s = new Set();
  for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]);
  return s;
}
function similitud(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0; a.forEach((x) => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}

function analizarLocal(regs) {
  const resultado = { campos: {}, alertas: [], fecha: new Date().toISOString(), modo: 'reglas' };
  SECCIONES.forEach((sec) => {
    sec.campos.forEach((campo) => {
      const clave = `${sec.id}.${campo.id}`;
      const lista = regs.map((r) => {
        const texto = (r.respuestas[sec.id] || {})[campo.id] || '';
        return { email: r.email, nombre: r.nombre, texto, tejas: tejas(texto), ...evaluarCampo(campo, texto) };
      });
      // Penaliza respuestas casi idénticas entre estudiantes (copia).
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const s = similitud(lista[i].tejas, lista[j].tejas);
          if (s > 0.5 && lista[i].palabras > 15) {
            [lista[i], lista[j]].forEach((x, k) => {
              const otro = k ? lista[i] : lista[j];
              x.puntaje = Math.max(0, x.puntaje - 15);
              x.razones.push({ ok: false, t: `Muy similar a la respuesta de ${otro.nombre} (${Math.round(s * 100)}%)` });
            });
            resultado.alertas.push(`${sec.num}. ${sec.titulo} — ${campo.etiqueta}: ${lista[i].nombre} y ${lista[j].nombre} tienen respuestas muy parecidas (${Math.round(s * 100)}%).`);
          }
        }
      }
      lista.forEach((x) => delete x.tejas);
      lista.sort((a, b) => b.puntaje - a.puntaje);
      resultado.campos[clave] = { ranking: lista, elegido: lista[0]?.palabras ? lista[0].email : null };
    });
    // Si la combinación de partes de distintos estudiantes supera el límite, busca la mejor que sí cumpla.
    if (sec.limite && sec.campos.length > 1) {
      const listas = sec.campos.map((c) => resultado.campos[`${sec.id}.${c.id}`].ranking.filter((x) => x.palabras).slice(0, 8));
      if (listas.every((l) => l.length)) {
        let mejor = null;
        const recorrer = (k, elegidos, puntos, palabras) => {
          if (palabras > sec.limite) return;
          if (k === listas.length) { if (!mejor || puntos > mejor.puntos) mejor = { elegidos: [...elegidos], puntos }; return; }
          for (const x of listas[k]) { elegidos.push(x); recorrer(k + 1, elegidos, puntos + x.puntaje, palabras + x.palabras); elegidos.pop(); }
        };
        recorrer(0, [], 0, 0);
        if (mejor) sec.campos.forEach((c, k) => { resultado.campos[`${sec.id}.${c.id}`].elegido = mejor.elegidos[k].email; });
        else resultado.alertas.push(`${sec.num}. ${sec.titulo}: ninguna combinación cumple el máximo de ${sec.limite} palabras; edita el texto final.`);
      }
    }
  });
  return resultado;
}

// Referencias: une las de todos los estudiantes, sin duplicados y en orden alfabético.
function unirReferencias(regs) {
  const vistas = new Map();
  regs.forEach((r) => lineas((r.respuestas.referencias || {}).texto).forEach((ref) => {
    const k = normalizar(ref).replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (k.length > 10 && !vistas.has(k)) vistas.set(k, ref);
  }));
  return [...vistas.values()].sort((a, b) => normalizar(a).localeCompare(normalizar(b))).join('\n');
}

function textosDesdeSelecciones() {
  const textos = {};
  SECCIONES.forEach((sec) => sec.campos.forEach((c) => {
    const k = `${sec.id}.${c.id}`;
    const el = prof.analisis.campos[k]?.ranking.find((x) => x.email === prof.selecciones[k]);
    textos[k] = el ? el.texto.trim() : '';
  }));
  textos['referencias.texto'] = unirReferencias(registros);
  return textos;
}

async function analizarYGenerar() {
  if (!registros.length) { avisar('Aún no hay consolidados para analizar.', 'error'); return; }
  const btn = $('#btn-analizar');
  const prog = $('#analisis-progreso');
  btn.disabled = true;
  prog.hidden = false;
  const pasos = [];
  const paso = async (t) => { pasos.push(t); prog.innerHTML = pasos.map((p, i) => `<p class="${i === pasos.length - 1 ? 'activo' : 'hecho'}">${i === pasos.length - 1 ? '⏳' : '✓'} ${esc(p)}</p>`).join(''); await new Promise((r) => setTimeout(r, 260)); };
  try {
    await paso(`Leyendo ${registros.length} consolidado${registros.length === 1 ? '' : 's'}`);
    await paso('Evaluando cada sección: extensión, elementos que pide la ficha, claridad y vocabulario');
    const analisis = analizarLocal(registros);
    let ia = null;
    if (servidorInfo.aiDisponible) {
      await paso('Analizando a profundidad con IA (puede tardar hasta un minuto)');
      try {
        const r = await api('analizarIA', { consolidados: registros.map((x) => ({ email: x.email, nombre: x.nombre, respuestas: x.respuestas })), secciones: SECCIONES.map((s) => ({ id: s.id, num: s.num, titulo: s.titulo, limite: s.limite, ficha: s.ficha, campos: s.campos.map((c) => ({ id: c.id, etiqueta: c.etiqueta })) })) });
        ia = r.resultado || null;
      } catch (e) { avisar('La IA no respondió; se usó el análisis automático. (' + e.message + ')', 'error', 7000); }
    }
    prof.analisis = analisis;
    prof.selecciones = {};
    Object.entries(analisis.campos).forEach(([k, v]) => { prof.selecciones[k] = v.elegido; });
    prof.razonesIA = {};
    if (ia?.selecciones) {
      Object.entries(ia.selecciones).forEach(([k, v]) => {
        if (analisis.campos[k]?.ranking.some((x) => x.email === v.email && x.palabras)) { prof.selecciones[k] = v.email; prof.razonesIA[k] = v.razon || ''; }
      });
      analisis.modo = 'ia';
    }
    await paso('Escogiendo lo mejor de cada estudiante en cada sección');
    prof.textos = textosDesdeSelecciones();
    await paso('Generando el cronograma (7)');
    prof.cronograma = validarCronogramaIA(ia?.cronograma) || generarCronograma(prof.textos);
    await paso('Generando el presupuesto (9)');
    prof.presupuesto = validarPresupuestoIA(ia?.presupuesto) || generarPresupuesto(prof.textos, registros.length);
    await paso('Generando el anexo: prototipo de interfaz de la estrategia');
    prof.prototipo = generarPrototipo(prof.textos, prof.encabezado.titulo, ia?.prototipo);
    guardarProf();
    await paso('Armando la vista previa de la ficha final');
    await pintarTodoFinal();
    pasos.push('Ficha final lista'); prog.innerHTML = pasos.map((p) => `<p class="hecho">✓ ${esc(p)}</p>`).join('');
    setTimeout(() => { prog.hidden = true; }, 2500);
    $('#tarjeta-vista').scrollIntoView({ behavior: 'smooth', block: 'start' });
    avisar('Ficha final generada ✓', 'ok');
  } catch (e) {
    console.error(e);
    prog.innerHTML = `<p class="aviso aviso-error">No se pudo completar el análisis: ${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
  }
}

async function pintarTodoFinal() {
  pintarAnalisis();
  ['#tarjeta-cronograma', '#tarjeta-presupuesto', '#tarjeta-prototipo', '#tarjeta-vista'].forEach((s) => { $(s).hidden = false; });
  pintarCronogramaEditor();
  pintarPresupuestoEditor();
  await prepararImagenesPrototipo();
  pintarPrototipoEditor();
  pintarVistaPrevia();
}

function pintarAnalisis() {
  const a = prof.analisis;
  const cont = $('#analisis-resultado');
  cont.innerHTML = `
    <p class="nota">Análisis del ${esc(fechaLarga(a.fecha))} · ${a.modo === 'ia' ? 'con IA' : 'automático por reglas'} · ${registros.length} estudiante(s). Para cada parte se escogió la respuesta mejor evaluada; puedes cambiarla o editar el texto final.</p>
    ${a.alertas.length ? `<details class="aviso aviso-alerta"><summary><strong>${a.alertas.length} alerta${a.alertas.length === 1 ? '' : 's'}</strong> (respuestas muy parecidas entre estudiantes o límites de palabras). Pulsa para ver.</summary><ul>${a.alertas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
    ${SECCIONES.map((sec) => {
      const total = sec.campos.reduce((n, c) => n + contarPalabras(prof.textos[`${sec.id}.${c.id}`]), 0);
      return `<details class="analisis-seccion">
        <summary><span>${esc(sec.num)}. ${esc(sec.titulo)}</span><span class="pildora ${sec.limite && total > sec.limite ? 'error' : 'ok'}">${total}${sec.limite ? ' / ' + sec.limite : ''} palabras</span></summary>
        ${sec.campos.map((c) => {
          const k = `${sec.id}.${c.id}`;
          const info = a.campos[k];
          const elegido = info.ranking.find((x) => x.email === prof.selecciones[k]);
          const esRef = k === 'referencias.texto';
          return `<div class="analisis-campo">
            <div class="analisis-campo-cabeza">
              <h4>${esc(c.etiqueta)}</h4>
              ${esRef ? '<span class="nota">Se integran las referencias de todos los estudiantes, sin duplicados.</span>' : `
              <label class="selector-autor">Respuesta escogida
                <select data-sel="${k}">${info.ranking.map((x) => `<option value="${esc(x.email)}" ${x.email === prof.selecciones[k] ? 'selected' : ''} ${x.palabras ? '' : 'disabled'}>${esc(x.nombre)} — ${x.puntaje} pts</option>`).join('')}</select>
              </label>`}
            </div>
            ${!esRef && elegido ? `<ul class="razones">${elegido.razones.map((r) => `<li class="${r.ok ? 'ok' : 'falta'}">${r.ok ? '✓' : '○'} ${esc(r.t)}</li>`).join('')}</ul>` : ''}
            ${prof.razonesIA?.[k] ? `<p class="nota"><strong>IA:</strong> ${esc(prof.razonesIA[k])}</p>` : ''}
            <label class="texto-final">Texto final (editable)
              <textarea data-texto="${k}" rows="${Math.min(14, Math.max(3, Math.ceil(contarPalabras(prof.textos[k]) / 14)))}">${esc(prof.textos[k] || '')}</textarea>
            </label>
            ${!esRef ? `<details class="ranking"><summary>Ver evaluación de todos (${info.ranking.length})</summary><ol>${info.ranking.map((x) => `<li><strong>${esc(x.nombre)}</strong> — ${x.puntaje} pts · ${x.palabras} palabras<br><span class="nota">${x.razones.filter((r) => !r.ok).map((r) => esc(r.t)).join(' · ') || 'Cumple todos los criterios'}</span></li>`).join('')}</ol></details>` : ''}
          </div>`;
        }).join('')}
      </details>`;
    }).join('')}
    <label class="check-linea"><input type="checkbox" id="chk-autoria" ${prof.autoria ? 'checked' : ''}> Incluir en la ficha final la tabla de autoría (qué estudiante aportó cada parte)</label>`;
  $$('[data-sel]', cont).forEach((s) => s.addEventListener('change', () => {
    const k = s.dataset.sel;
    prof.selecciones[k] = s.value;
    const el = prof.analisis.campos[k].ranking.find((x) => x.email === s.value);
    prof.textos[k] = el ? el.texto.trim() : '';
    guardarProf(); pintarAnalisis(); pintarVistaPrevia();
  }));
  $$('[data-texto]', cont).forEach((t) => t.addEventListener('input', () => { prof.textos[t.dataset.texto] = t.value; guardarProf(); pintarVistaPronto(); }));
  $('#chk-autoria').addEventListener('change', (e) => { prof.autoria = e.target.checked; guardarProf(); pintarVistaPrevia(); });
}

/* ---------- 7. Cronograma ---------- */
const SEMANAS = 32; // Trabajo de Grado I y II: 4 meses × 4 semanas cada uno
const etiquetaSemana = (i) => `${i < 16 ? 'TG I' : 'TG II'} · Mes ${Math.floor((i % 16) / 4) + 1} · Sem ${(i % 4) + 1}`;

function generarCronograma(textos) {
  const met = normalizar(textos['metodologia.texto']);
  const instrumentos = ['encuesta', 'entrevista', 'observacion', 'grupo focal', 'cuestionario', 'diario de campo', 'prueba', 'rubrica'].filter((x) => met.includes(x));
  const objetivos = lineas(textos['objetivos.especificos']).slice(0, 5);
  const filas = [
    { fase: 'Fase 1. Fundamentación', actividad: 'Revisión documental y construcción de antecedentes', inicio: 0, fin: 3 },
    { fase: 'Fase 1. Fundamentación', actividad: 'Formulación del problema, la pregunta y los objetivos', inicio: 2, fin: 5 },
    { fase: 'Fase 2. Diseño metodológico', actividad: 'Definición del enfoque, la población y la muestra', inicio: 5, fin: 7 },
    { fase: 'Fase 2. Diseño metodológico', actividad: 'Diseño y validación de instrumentos' + (instrumentos.length ? ` (${instrumentos.join(', ').replace('observacion', 'observación').replace('rubrica', 'rúbrica')})` : ''), inicio: 7, fin: 10 },
    { fase: 'Fase 2. Diseño metodológico', actividad: 'Gestión de consentimientos informados y aval ético', inicio: 9, fin: 11 },
    { fase: 'Fase 2. Diseño metodológico', actividad: 'Ajustes y entrega de la ficha resumen al Comité Focal', inicio: 12, fin: 15 },
    { fase: 'Fase 3. Ejecución', actividad: 'Aplicación de instrumentos y recolección de información', inicio: 16, fin: 19 }
  ];
  if (objetivos.length) {
    const tramo = Math.max(3, Math.ceil(12 / objetivos.length));
    objetivos.forEach((o, i) => {
      const inicio = 16 + Math.floor((i * 12) / objetivos.length);
      filas.push({ fase: 'Fase 3. Ejecución', actividad: `OE${i + 1}: ${recortar(o.replace(/\.$/, ''), 110)}`, inicio, fin: Math.min(27, inicio + tramo) });
    });
  } else {
    filas.push({ fase: 'Fase 3. Ejecución', actividad: 'Implementación de la estrategia', inicio: 18, fin: 27 });
  }
  filas.push(
    { fase: 'Fase 3. Ejecución', actividad: 'Seguimiento al desarrollo externo del prototipo de interfaz de la estrategia', inicio: 18, fin: 25 },
    { fase: 'Fase 4. Análisis y resultados', actividad: 'Análisis e interpretación de la información', inicio: 24, fin: 27 },
    { fase: 'Fase 4. Análisis y resultados', actividad: 'Redacción del informe final', inicio: 26, fin: 29 },
    { fase: 'Fase 4. Análisis y resultados', actividad: 'Socialización de resultados y entrega de productos', inicio: 30, fin: 31 }
  );
  return filas;
}

function validarCronogramaIA(c) {
  if (!Array.isArray(c) || c.length < 4) return null;
  const filas = c.map((f) => ({ fase: String(f.fase || '').slice(0, 80), actividad: String(f.actividad || '').slice(0, 160), inicio: Math.max(0, Math.min(31, parseInt(f.inicio, 10))), fin: Math.max(0, Math.min(31, parseInt(f.fin, 10))) }))
    .filter((f) => f.actividad && Number.isFinite(f.inicio) && Number.isFinite(f.fin) && f.fin >= f.inicio);
  return filas.length >= 4 ? filas : null;
}

function pintarCronogramaEditor() {
  const opciones = (sel) => Array.from({ length: SEMANAS }, (_, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${etiquetaSemana(i)}</option>`).join('');
  $('#editor-cronograma').innerHTML = `
    <table class="tabla tabla-editable">
      <thead><tr><th>Fase</th><th>Actividad</th><th>Inicia</th><th>Termina</th><th></th></tr></thead>
      <tbody>${prof.cronograma.map((f, i) => `<tr>
        <td data-t="Fase"><input data-cr="${i}" data-k="fase" value="${esc(f.fase)}"></td>
        <td data-t="Actividad"><textarea data-cr="${i}" data-k="actividad" rows="2">${esc(f.actividad)}</textarea></td>
        <td data-t="Inicia"><select data-cr="${i}" data-k="inicio">${opciones(f.inicio)}</select></td>
        <td data-t="Termina"><select data-cr="${i}" data-k="fin">${opciones(f.fin)}</select></td>
        <td><button type="button" class="btn btn-sutil" data-borrar-cr="${i}" aria-label="Eliminar actividad">🗑</button></td>
      </tr>`).join('')}</tbody>
    </table>`;
  $$('[data-cr]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
    const f = prof.cronograma[+el.dataset.cr];
    const k = el.dataset.k;
    f[k] = k === 'inicio' || k === 'fin' ? +el.value : el.value;
    if (f.fin < f.inicio) { if (k === 'inicio') f.fin = f.inicio; else f.inicio = f.fin; pintarCronogramaEditor(); }
    guardarProf(); pintarVistaPronto();
  }));
  $$('[data-borrar-cr]').forEach((b) => b.addEventListener('click', () => { prof.cronograma.splice(+b.dataset.borrarCr, 1); guardarProf(); pintarCronogramaEditor(); pintarVistaPrevia(); }));
}

/* ---------- 9. Presupuesto ---------- */
const FUENTES = [`${ENTIDAD}`, 'Recursos propios (proponentes)', 'Contrapartida institucional (en especie)'];
const RUBRO_EXTERNO = 'Servicios técnicos externos (prototipo)';
const RUBROS_PROTOTIPO = [
  { rubro: RUBRO_EXTERNO, descripcion: 'Diseño de la interfaz (UX/UI) del prototipo de la estrategia', cantidad: 1, unitario: 1500000, fuente: FUENTES[0] },
  { rubro: RUBRO_EXTERNO, descripcion: 'Desarrollo, programación y pruebas del prototipo de la estrategia', cantidad: 1, unitario: 2500000, fuente: FUENTES[0] },
  { rubro: RUBRO_EXTERNO, descripcion: 'Alojamiento web y dominio del prototipo (1 año)', cantidad: 1, unitario: 350000, fuente: FUENTES[0] }
];
const NOTA_PROTOTIPO = `El prototipo de interfaz de la estrategia (Anexo) se desarrolla de manera externa, porque su diseño, programación y alojamiento requieren servicios técnicos especializados que no hacen parte del trabajo académico de redacción de la ficha. Por eso sus costos se incluyen en el rubro «${RUBRO_EXTERNO}».`;

function generarPresupuesto(textos, nProponentes) {
  const todo = normalizar(Object.values(textos).join(' '));
  const tiene = (...p) => p.some((x) => todo.includes(x));
  const d = [];
  d.push({ rubro: 'Personal', descripcion: `Dedicación de ${nProponentes || 1} proponente(s) (4 h/semana × 32 semanas)`, cantidad: (nProponentes || 1) * 128, unitario: 25000, fuente: FUENTES[2] });
  if (tiene('encuesta', 'cuestionario', 'instrumento', 'entrevista', 'prueba', 'rubrica', 'consentimiento'))
    d.push({ rubro: 'Materiales e insumos', descripcion: 'Papelería e impresión de instrumentos y consentimientos informados', cantidad: 1, unitario: 250000, fuente: FUENTES[1] });
  // El prototipo se desarrolla de manera externa: sus costos van en un rubro propio.
  d.push(...RUBROS_PROTOTIPO.map((r) => ({ ...r })));
  d.push({ rubro: 'Conectividad', descripcion: 'Plan de datos e internet para el trabajo de campo (8 meses)', cantidad: 8, unitario: 60000, fuente: FUENTES[1] });
  if (tiene('campo', 'rural', 'vereda', 'corregimiento', 'comunidad', 'visita', 'desplaz', 'municipio'))
    d.push({ rubro: 'Salidas de campo', descripcion: 'Transporte para visitas a la institución o la comunidad', cantidad: 8, unitario: 60000, fuente: FUENTES[1] });
  if (tiene('taller', 'grupo focal', 'socializ', 'encuentro', 'sesion'))
    d.push({ rubro: 'Refrigerios', descripcion: 'Refrigerios para talleres y sesiones con participantes', cantidad: 120, unitario: 8000, fuente: FUENTES[0] });
  d.push({ rubro: 'Material bibliográfico', descripcion: 'Acceso a libros, artículos y bases de datos', cantidad: 1, unitario: 200000, fuente: FUENTES[1] });
  d.push({ rubro: 'Divulgación', descripcion: 'Socialización de resultados: piezas impresas y participación en evento académico', cantidad: 1, unitario: 400000, fuente: FUENTES[0] });
  return {
    directos: d,
    indirectos: [
      { rubro: 'Administración y gestión del proyecto', porcentaje: 10, fuente: FUENTES[2] },
      { rubro: 'Uso de equipos e infraestructura institucional', porcentaje: 5, fuente: FUENTES[2] }
    ]
  };
}

function validarPresupuestoIA(p) {
  if (!p || !Array.isArray(p.directos) || !p.directos.length) return null;
  const fuente = (f) => FUENTES.find((x) => normalizar(x).startsWith(normalizar(f).slice(0, 8))) || FUENTES[0];
  const directos = p.directos.map((x) => ({ rubro: String(x.rubro || ''), descripcion: String(x.descripcion || ''), cantidad: +x.cantidad || 1, unitario: Math.max(0, Math.round(+x.unitario || +x.valorUnitario || 0)), fuente: fuente(x.fuente || '') }));
  // Garantiza el rubro externo del prototipo aunque la IA no lo incluya.
  if (!directos.some((x) => /prototipo/i.test(x.rubro + ' ' + x.descripcion))) directos.push(...RUBROS_PROTOTIPO.map((r) => ({ ...r })));
  return {
    directos,
    indirectos: (Array.isArray(p.indirectos) ? p.indirectos : []).map((x) => ({ rubro: String(x.rubro || ''), porcentaje: Math.max(0, Math.min(50, +x.porcentaje || 0)), fuente: fuente(x.fuente || '') }))
  };
}

function totalesPresupuesto(p) {
  const directos = p.directos.map((x) => ({ ...x, total: Math.round((+x.cantidad || 0) * (+x.unitario || 0)) }));
  const subDirectos = directos.reduce((n, x) => n + x.total, 0);
  const indirectos = p.indirectos.map((x) => ({ ...x, total: Math.round(subDirectos * (+x.porcentaje || 0) / 100) }));
  const subIndirectos = indirectos.reduce((n, x) => n + x.total, 0);
  const total = subDirectos + subIndirectos;
  const porFuente = FUENTES.map((f) => {
    const dir = directos.filter((x) => x.fuente === f).reduce((n, x) => n + x.total, 0);
    const ind = indirectos.filter((x) => x.fuente === f).reduce((n, x) => n + x.total, 0);
    return { fuente: f, directos: dir, indirectos: ind, total: dir + ind, pct: total ? ((dir + ind) / total) * 100 : 0 };
  }).filter((x) => x.total > 0);
  return { directos, indirectos, subDirectos, subIndirectos, total, porFuente };
}

function pintarPresupuestoEditor() {
  const p = prof.presupuesto;
  const t = totalesPresupuesto(p);
  const selFuente = (attr, val) => `<select ${attr}>${FUENTES.map((f) => `<option ${f === val ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>`;
  $('#editor-presupuesto').innerHTML = `
    <h4>9.1 Gastos directos</h4>
    <div class="tabla-scroll"><table class="tabla tabla-editable">
      <thead><tr><th>Rubro</th><th>Descripción</th><th>Cantidad</th><th>Valor unitario (COP)</th><th>Fuente</th><th>Total</th><th></th></tr></thead>
      <tbody>${t.directos.map((x, i) => `<tr>
        <td data-t="Rubro"><input data-pd="${i}" data-k="rubro" value="${esc(x.rubro)}"></td>
        <td data-t="Descripción"><textarea data-pd="${i}" data-k="descripcion" rows="2">${esc(x.descripcion)}</textarea></td>
        <td data-t="Cantidad"><input data-pd="${i}" data-k="cantidad" type="number" min="0" step="1" value="${x.cantidad}"></td>
        <td data-t="Valor unitario"><input data-pd="${i}" data-k="unitario" type="number" min="0" step="1000" value="${x.unitario}"></td>
        <td data-t="Fuente">${selFuente(`data-pd="${i}" data-k="fuente"`, x.fuente)}</td>
        <td data-t="Total" class="num" data-total-d="${i}">${pesos.format(x.total)}</td>
        <td><button type="button" class="btn btn-sutil" data-borrar-pd="${i}" aria-label="Eliminar">🗑</button></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="5">Subtotal gastos directos</th><th class="num" id="sub-directos">${pesos.format(t.subDirectos)}</th><th></th></tr></tfoot>
    </table></div>
    <h4>9.2 Gastos indirectos <span class="nota">(porcentaje sobre los gastos directos)</span></h4>
    <div class="tabla-scroll"><table class="tabla tabla-editable">
      <thead><tr><th>Rubro</th><th>% sobre directos</th><th>Fuente</th><th>Total</th></tr></thead>
      <tbody>${t.indirectos.map((x, i) => `<tr>
        <td data-t="Rubro"><input data-pi="${i}" data-k="rubro" value="${esc(x.rubro)}"></td>
        <td data-t="%"><input data-pi="${i}" data-k="porcentaje" type="number" min="0" max="50" step="0.5" value="${x.porcentaje}"></td>
        <td data-t="Fuente">${selFuente(`data-pi="${i}" data-k="fuente"`, x.fuente)}</td>
        <td data-t="Total" class="num" data-total-i="${i}">${pesos.format(x.total)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="3">Subtotal gastos indirectos</th><th class="num" id="sub-indirectos">${pesos.format(t.subIndirectos)}</th></tr></tfoot>
    </table></div>
    <h4>9.3 Resumen por fuente de financiación</h4>
    <div class="tabla-scroll" id="resumen-fuentes"></div>`;
  actualizarTotalesPresupuesto();
  // Solo se actualizan los totales (no toda la tabla) para no perder el foco al escribir.
  const cambiar = (lista, el) => {
    const x = lista[+(el.dataset.pd ?? el.dataset.pi)];
    const k = el.dataset.k;
    x[k] = ['cantidad', 'unitario', 'porcentaje'].includes(k) ? Math.max(0, +el.value || 0) : el.value;
    guardarProf();
    actualizarTotalesPresupuesto();
    pintarVistaPronto();
  };
  $$('[data-pd]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => cambiar(prof.presupuesto.directos, el)));
  $$('[data-pi]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => cambiar(prof.presupuesto.indirectos, el)));
  $$('[data-borrar-pd]').forEach((b) => b.addEventListener('click', () => { prof.presupuesto.directos.splice(+b.dataset.borrarPd, 1); guardarProf(); pintarPresupuestoEditor(); pintarVistaPrevia(); }));
}

function actualizarTotalesPresupuesto() {
  const t = totalesPresupuesto(prof.presupuesto);
  t.directos.forEach((x, i) => { const c = $(`[data-total-d="${i}"]`); if (c) c.textContent = pesos.format(x.total); });
  t.indirectos.forEach((x, i) => { const c = $(`[data-total-i="${i}"]`); if (c) c.textContent = pesos.format(x.total); });
  if ($('#sub-directos')) $('#sub-directos').textContent = pesos.format(t.subDirectos);
  if ($('#sub-indirectos')) $('#sub-indirectos').textContent = pesos.format(t.subIndirectos);
  const r = $('#resumen-fuentes');
  if (r) r.innerHTML = `<table class="tabla">
      <thead><tr><th>Fuente</th><th>Directos</th><th>Indirectos</th><th>Total</th><th>%</th></tr></thead>
      <tbody>${t.porFuente.map((f) => `<tr><td data-t="Fuente">${esc(f.fuente)}</td><td data-t="Directos" class="num">${pesos.format(f.directos)}</td><td data-t="Indirectos" class="num">${pesos.format(f.indirectos)}</td><td data-t="Total" class="num">${pesos.format(f.total)}</td><td data-t="%" class="num">${f.pct.toFixed(1)}%</td></tr>`).join('')}</tbody>
      <tfoot><tr><th>Total del proyecto</th><th class="num">${pesos.format(t.subDirectos)}</th><th class="num">${pesos.format(t.subIndirectos)}</th><th class="num">${pesos.format(t.total)}</th><th class="num">100%</th></tr></tfoot>
    </table>`;
}

/* ---------- Anexo: prototipo de interfaz de la estrategia ---------- */
const NOMBRE_VERBO = { diagnosticar: 'Diagnóstico', identificar: 'Identificación', caracterizar: 'Caracterización', describir: 'Descripción', reconocer: 'Reconocimiento', indagar: 'Indagación', analizar: 'Análisis', disenar: 'Diseño', desarrollar: 'Desarrollo', implementar: 'Implementación', aplicar: 'Aplicación', crear: 'Creación', construir: 'Construcción', elaborar: 'Elaboración', fortalecer: 'Fortalecimiento', promover: 'Promoción', proponer: 'Propuesta', establecer: 'Establecimiento', evaluar: 'Evaluación', validar: 'Validación', medir: 'Medición', determinar: 'Determinación', valorar: 'Valoración', comparar: 'Comparación', socializar: 'Socialización', fomentar: 'Fomento', integrar: 'Integración', estructurar: 'Estructuración', explorar: 'Exploración', potenciar: 'Potenciación', mejorar: 'Mejoramiento', formular: 'Formulación', sistematizar: 'Sistematización', verificar: 'Verificación', examinar: 'Examen', definir: 'Definición', contribuir: 'Contribución', generar: 'Generación', vincular: 'Vinculación' };
const TIPO_VERBO = (v) => /diagnostic|identific|caracteriz|describ|reconoc|indag|explor|defin/.test(v) ? 'formulario'
  : /evalu|valid|medi|determin|valor|compar|verific|analiz|exami/.test(v) ? 'evaluacion'
    : /disen|desarroll|implement|aplic|crea|constru|elabor|fortalec|promov|foment|integr|potenci|mejor|gener/.test(v) ? 'actividades' : 'contenido';

function generarPrototipo(textos, titulo, sugeridoIA) {
  const objetivos = lineas(textos['objetivos.especificos']).slice(0, 5);
  const preguntas = (String(textos['problema.sistematizacion'] || '').match(/¿[^?]+\?/g) || []).slice(0, 4);
  const productos = lineas(textos['impacto.productos']).slice(0, 5);
  const resumen = String(textos['resumen.texto'] || '').split(/(?<=[.!?])\s+/)[0] || '';
  const modulos = objetivos.map((o, i) => {
    const verbo = normalizar((o.match(/\p{L}+/u) || [''])[0]);
    const nombre = NOMBRE_VERBO[verbo] || `Módulo ${i + 1}`;
    return { verbo, nombre, objetivo: o.replace(/\.$/, ''), tipo: TIPO_VERBO(verbo) };
  });
  const nav = ['Inicio', ...modulos.map((m) => m.nombre), 'Resultados'];
  const pantallas = [{
    tipo: 'inicio', titulo: 'Pantalla de inicio de la estrategia',
    descripcion: `Presenta la estrategia y da acceso a sus ${modulos.length || ''} módulos. ${resumen ? 'Mensaje principal: «' + recortar(resumen, 160) + '»' : ''}`.trim(),
    datos: { lema: recortar(resumen, 120), items: modulos.map((m) => m.nombre) }
  }];
  modulos.forEach((m, i) => {
    const desc = {
      formulario: 'Recoge información de los participantes mediante un formulario guiado, a partir de las preguntas de la sistematización.',
      evaluacion: 'Muestra indicadores y gráficos para seguir el avance y valorar los resultados.',
      actividades: 'Organiza las actividades del módulo en tarjetas con su progreso.',
      contenido: 'Reúne los contenidos y recursos del módulo.'
    }[m.tipo];
    pantallas.push({
      tipo: m.tipo, titulo: `Módulo ${i + 1}: ${m.nombre}`,
      descripcion: `Corresponde al objetivo específico ${i + 1}: «${recortar(m.objetivo, 170)}». ${desc}`,
      datos: { objetivo: m.objetivo, items: m.tipo === 'formulario' ? (preguntas.length ? preguntas : ['Pregunta 1 del instrumento', 'Pregunta 2 del instrumento', 'Pregunta 3 del instrumento']) : [] }
    });
  });
  pantallas.push({
    tipo: 'resultados', titulo: 'Resultados y productos',
    descripcion: 'Reúne los productos esperados del proyecto y permite descargarlos o consultarlos.',
    datos: { items: productos.length ? productos : ['Producto 1', 'Producto 2'] }
  });
  // Si la IA sugirió descripciones, se usan con el mismo orden de pantallas.
  if (Array.isArray(sugeridoIA)) sugeridoIA.forEach((s, i) => { if (pantallas[i] && s?.descripcion) pantallas[i].descripcion = String(s.descripcion).slice(0, 500); });
  return { nav, pantallas, tituloProyecto: titulo || '' };
}

function envolverSVG(texto, max, x, y, alto, attrs) {
  const palabras = String(texto || '').split(/\s+/);
  const filas = []; let f = '';
  palabras.forEach((w) => { if ((f + ' ' + w).trim().length > max) { if (f) filas.push(f); f = w; } else f = (f + ' ' + w).trim(); });
  if (f) filas.push(f);
  return `<text x="${x}" y="${y}" ${attrs}>${filas.slice(0, 4).map((l, i) => `<tspan x="${x}" dy="${i ? alto : 0}">${esc(i === 3 && filas.length > 4 ? l + '…' : l)}</tspan>`).join('')}</text>`;
}

function svgPantalla(p, nav, tituloProyecto, n) {
  const W = 960, H = 600, F = 'font-family="Arial, Helvetica, sans-serif"';
  const activo = p.tipo === 'inicio' ? 0 : p.tipo === 'resultados' ? nav.length - 1 : n;
  let cuerpo = '';
  const x0 = 250, y0 = 150;
  if (p.tipo === 'inicio') {
    cuerpo += envolverSVG(tituloProyecto || 'Estrategia del proyecto', 38, x0, y0, 30, `${F} font-size="24" font-weight="700" fill="#0b1d45"`);
    cuerpo += envolverSVG(p.datos.lema || 'Una estrategia para aprender, crear y transformar.', 70, x0, y0 + 80, 20, `${F} font-size="14" fill="#4d5b70"`);
    (p.datos.items.length ? p.datos.items : ['Módulo 1', 'Módulo 2', 'Módulo 3']).slice(0, 5).forEach((m, i) => {
      const cx = x0 + (i % 3) * 230, cy = 330 + Math.floor(i / 3) * 110;
      cuerpo += `<rect x="${cx}" y="${cy}" width="210" height="92" rx="12" fill="#ffffff" stroke="#d6e0f2"/><circle cx="${cx + 30}" cy="${cy + 32}" r="14" fill="#0d5ef4" opacity=".15"/><text x="${cx + 30}" y="${cy + 37}" text-anchor="middle" ${F} font-size="13" font-weight="700" fill="#0d5ef4">${i + 1}</text>${envolverSVG(m, 22, cx + 54, cy + 36, 17, `${F} font-size="14" font-weight="700" fill="#0b1d45"`)}<text x="${cx + 18}" y="${cy + 76}" ${F} font-size="12" fill="#0d5ef4">Entrar →</text>`;
    });
  } else {
    cuerpo += `<text x="${x0}" y="${y0 - 10}" ${F} font-size="13" fill="#0d5ef4" font-weight="700">${esc(p.titulo.split(':')[0].toUpperCase())}</text>`;
    cuerpo += envolverSVG(p.titulo.split(':').slice(1).join(':').trim() || p.titulo, 40, x0, y0 + 20, 28, `${F} font-size="22" font-weight="700" fill="#0b1d45"`);
    if (p.datos.objetivo) cuerpo += envolverSVG(p.datos.objetivo, 88, x0, y0 + 60, 18, `${F} font-size="13" fill="#4d5b70"`);
    const yb = 290;
    if (p.tipo === 'formulario') {
      p.datos.items.slice(0, 3).forEach((q, i) => {
        const y = yb + i * 90;
        cuerpo += envolverSVG(q, 86, x0, y, 17, `${F} font-size="13" font-weight="700" fill="#0b1d45"`);
        ['Siempre', 'A veces', 'Nunca'].forEach((o, k) => { cuerpo += `<circle cx="${x0 + 8 + k * 120}" cy="${y + 40}" r="7" fill="#fff" stroke="#0d5ef4" stroke-width="2"/><text x="${x0 + 22 + k * 120}" y="${y + 45}" ${F} font-size="12" fill="#4d5b70">${o}</text>`; });
      });
      cuerpo += `<rect x="${W - 210}" y="${H - 70}" width="170" height="40" rx="20" fill="#0d5ef4"/><text x="${W - 125}" y="${H - 45}" text-anchor="middle" ${F} font-size="14" font-weight="700" fill="#fff">Enviar respuestas</text>`;
    } else if (p.tipo === 'evaluacion') {
      ['Participantes', 'Avance', 'Logro'].forEach((k, i) => { const cx = x0 + i * 230; cuerpo += `<rect x="${cx}" y="${yb}" width="210" height="80" rx="12" fill="#fff" stroke="#d6e0f2"/><text x="${cx + 18}" y="${yb + 30}" ${F} font-size="12" fill="#4d5b70">${k}</text><rect x="${cx + 18}" y="${yb + 46}" width="${[120, 150, 90][i]}" height="14" rx="7" fill="#0d5ef4" opacity=".8"/>`; });
      [60, 95, 75, 130, 110, 150].forEach((h, i) => { cuerpo += `<rect x="${x0 + 20 + i * 100}" y="${H - 50 - h}" width="56" height="${h}" rx="6" fill="${i % 2 ? '#f2a516' : '#0d5ef4'}" opacity=".85"/>`; });
      cuerpo += `<line x1="${x0}" y1="${H - 50}" x2="${W - 40}" y2="${H - 50}" stroke="#d6e0f2"/>`;
    } else if (p.tipo === 'actividades') {
      ['Actividad 1', 'Actividad 2', 'Actividad 3', 'Actividad 4'].forEach((k, i) => { const cx = x0 + (i % 2) * 345, cy = yb + Math.floor(i / 2) * 120; cuerpo += `<rect x="${cx}" y="${cy}" width="325" height="100" rx="12" fill="#fff" stroke="#d6e0f2"/><rect x="${cx + 16}" y="${cy + 16}" width="44" height="44" rx="10" fill="#f2a516" opacity=".25"/><text x="${cx + 76}" y="${cy + 36}" ${F} font-size="14" font-weight="700" fill="#0b1d45">${k}</text><text x="${cx + 76}" y="${cy + 56}" ${F} font-size="12" fill="#4d5b70">Recurso, instrucciones y entrega</text><rect x="${cx + 16}" y="${cy + 76}" width="293" height="8" rx="4" fill="#e6eeee"/><rect x="${cx + 16}" y="${cy + 76}" width="${[230, 160, 90, 30][i]}" height="8" rx="4" fill="#0d5ef4"/>`; });
    } else if (p.tipo === 'resultados' || p.tipo === 'contenido') {
      const items = p.tipo === 'resultados' ? p.datos.items : ['Contenido 1', 'Contenido 2', 'Contenido 3', 'Contenido 4'];
      items.slice(0, 5).forEach((k, i) => { const y = (p.tipo === 'resultados' ? 190 : yb) + i * 64; cuerpo += `<rect x="${x0}" y="${y}" width="${W - x0 - 40}" height="52" rx="10" fill="#fff" stroke="#d6e0f2"/><circle cx="${x0 + 26}" cy="${y + 26}" r="12" fill="#1f9d55" opacity=".18"/><text x="${x0 + 26}" y="${y + 31}" text-anchor="middle" ${F} font-size="13" font-weight="700" fill="#1f9d55">✓</text>${envolverSVG(recortar(k, 80), 80, x0 + 50, y + 31, 16, `${F} font-size="13" fill="#0b1d45"`)}<text x="${W - 60}" y="${y + 31}" text-anchor="end" ${F} font-size="12" fill="#0d5ef4">Ver ↓</text>`; });
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" rx="14" fill="#f2f6ff"/>
    <rect width="${W}" height="36" rx="14" fill="#dde7fb"/><rect y="20" width="${W}" height="16" fill="#dde7fb"/>
    <circle cx="22" cy="18" r="6" fill="#ef6b5b"/><circle cx="42" cy="18" r="6" fill="#f2b540"/><circle cx="62" cy="18" r="6" fill="#3fbf6f"/>
    <rect x="90" y="9" width="420" height="18" rx="9" fill="#fff"/><text x="104" y="22" ${F} font-size="11" fill="#6b8187">axervus.app/estrategia</text>
    <rect x="0" y="36" width="220" height="${H - 36}" fill="#0b1d45"/>
    <rect x="20" y="56" width="32" height="32" rx="8" fill="#f2a516"/><text x="36" y="77" text-anchor="middle" ${F} font-size="13" font-weight="700" fill="#0b1d45">Ax</text>
    <text x="62" y="70" ${F} font-size="12" font-weight="700" fill="#fff">Axervus (CTeI)</text><text x="62" y="85" ${F} font-size="10" fill="#9fb8bd">Estrategia</text>
    ${nav.slice(0, 8).map((m, i) => `<rect x="12" y="${112 + i * 44}" width="196" height="36" rx="8" fill="${i === activo ? '#0d5ef4' : 'transparent'}"/><text x="28" y="${135 + i * 44}" ${F} font-size="13" fill="${i === activo ? '#fff' : '#c7d8db'}">${esc(recortar(m, 24))}</text>`).join('')}
    <rect x="${W - 150}" y="52" width="110" height="30" rx="15" fill="#fff" stroke="#d6e0f2"/><text x="${W - 95}" y="72" text-anchor="middle" ${F} font-size="12" fill="#4d5b70">Mi perfil</text>
    ${cuerpo}
  </svg>`;
}

function svgAPng(svg, w = 960, h = 600, escala = 1.5) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w * escala; c.height = h * escala;
      const ctx = c.getContext('2d');
      ctx.scale(escala, escala); ctx.drawImage(img, 0, 0, w, h);
      res(c.toDataURL('image/png'));
    };
    img.onerror = () => rej(new Error('No se pudo dibujar el prototipo'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

async function prepararImagenesPrototipo() {
  const pr = prof.prototipo;
  imagenesPrototipo = [];
  let modulo = 0;
  for (const p of pr.pantallas) {
    if (p.tipo !== 'inicio' && p.tipo !== 'resultados') modulo++;
    if (p.imagenPropia) { imagenesPrototipo.push(p.imagenPropia); continue; }
    try { imagenesPrototipo.push(await svgAPng(svgPantalla(p, pr.nav, prof.encabezado.titulo || pr.tituloProyecto, modulo))); }
    catch { imagenesPrototipo.push(null); }
  }
}

function pintarPrototipoEditor() {
  $('#editor-prototipo').innerHTML = prof.prototipo.pantallas.map((p, i) => `
    <figure class="prototipo-item">
      ${imagenesPrototipo[i] ? `<img src="${imagenesPrototipo[i]}" alt="${esc(p.titulo)}">` : '<div class="vacio">Sin imagen</div>'}
      <figcaption>
        <input data-pt="${i}" data-k="titulo" value="${esc(p.titulo)}" aria-label="Título de la figura">
        <textarea data-pt="${i}" data-k="descripcion" rows="3" aria-label="Descripción">${esc(p.descripcion)}</textarea>
        <div class="acciones">
          <label class="btn btn-sutil">📷 Usar imagen propia<input type="file" accept="image/*" data-img="${i}" hidden></label>
          ${p.imagenPropia ? `<button type="button" class="btn btn-sutil" data-quitar-img="${i}">Volver al prototipo generado</button>` : ''}
        </div>
      </figcaption>
    </figure>`).join('');
  $$('[data-pt]').forEach((el) => el.addEventListener('input', async () => {
    prof.prototipo.pantallas[+el.dataset.pt][el.dataset.k] = el.value; guardarProf(); pintarVistaPronto();
  }));
  $$('[data-img]').forEach((inp) => inp.addEventListener('change', () => {
    const f = inp.files[0]; if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      // Se normaliza a PNG de máximo 1440 px para Word y PDF.
      const img = new Image();
      img.onload = async () => {
        const esc2 = Math.min(1, 1440 / img.width);
        const c = document.createElement('canvas'); c.width = img.width * esc2; c.height = img.height * esc2;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        prof.prototipo.pantallas[+inp.dataset.img].imagenPropia = c.toDataURL('image/jpeg', 0.88);
        if (!almacen.guardar(claveProf(), prof)) avisar('La imagen es grande: se usará ahora, pero no quedará guardada al recargar.', 'info', 6000);
        await prepararImagenesPrototipo(); pintarPrototipoEditor(); pintarVistaPrevia();
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(f);
  }));
  $$('[data-quitar-img]').forEach((b) => b.addEventListener('click', async () => { delete prof.prototipo.pantallas[+b.dataset.quitarImg].imagenPropia; guardarProf(); await prepararImagenesPrototipo(); pintarPrototipoEditor(); pintarVistaPrevia(); }));
}

/* ---------- Vista previa de la ficha final ---------- */
let temporizadorVista = null;
const pintarVistaPronto = () => { clearTimeout(temporizadorVista); temporizadorVista = setTimeout(pintarVistaPrevia, 400); };

function fechaFicha(v) { if (!v) return '____ / ____ / ______'; const [a, m, d] = v.split('-'); return `${d} / ${m} / ${a}`; }

function autoria() {
  const filas = [];
  SECCIONES.forEach((sec) => sec.campos.forEach((c) => {
    const k = `${sec.id}.${c.id}`;
    if (k === 'referencias.texto') { filas.push([`${sec.num}. ${sec.titulo}`, 'Integración de las referencias de todos los estudiantes']); return; }
    const sel = prof.analisis.campos[k]?.ranking.find((x) => x.email === prof.selecciones[k]);
    filas.push([`${sec.num}. ${sec.titulo}${sec.campos.length > 1 ? ' — ' + c.etiqueta : ''}`, sel ? sel.nombre : '—']);
  }));
  return filas;
}

function htmlParrafos(t) { return lineasParrafo(t).map((p) => `<p>${esc(p)}</p>`).join('') || '<p class="vacio-doc">—</p>'; }
function lineasParrafo(t) { return String(t || '').split(/\n+/).map((s) => s.trim()).filter(Boolean); }

function pintarVistaPrevia() {
  if (!prof?.analisis) return;
  const e = prof.encabezado, T = prof.textos;
  const sec = Object.fromEntries(SECCIONES.map((s) => [s.id, s]));
  const pres = totalesPresupuesto(prof.presupuesto);
  const cab = (s, extra = '') => `<h3>${esc(s.num)}. ${esc(s.titulo)}:${s.ficha ? ` <span class="instr">${esc(s.ficha)}</span>` : ''}${extra}</h3>`;
  // Agrupa filas consecutivas con la misma fase para combinar la celda.
  const grupos = [];
  prof.cronograma.forEach((f) => { const g = grupos.at(-1); if (g && g.fase === f.fase) g.filas.push(f); else grupos.push({ fase: f.fase, filas: [f] }); });

  $('#vista-previa').innerHTML = `
    <table class="doc-tabla doc-encabezado">
      <tr><td><strong>Facultad, Programa/ Semillero de Investigación:</strong><br>${esc(e.facultad)}</td><td class="col-fecha"><strong>Fecha de entrega a Comité Focal:</strong><br>${esc(fechaFicha(e.fecha))}</td></tr>
      <tr><td colspan="2"><strong>Título del Proyecto:</strong> ${esc(e.titulo) || '<span class="vacio-doc">(sin título)</span>'}</td></tr>
      <tr><td colspan="2"><strong>Proponentes del proyecto:</strong> ${esc(lineasParrafo(e.proponentes).join(', '))}</td></tr>
      <tr><td colspan="2"><strong>Tipo de Proyecto:</strong> Básico ( ${e.tipo === 'Básico' ? 'X' : ' '} ) &nbsp; Aplicado ( ${e.tipo === 'Aplicado' ? 'X' : ' '} )</td></tr>
      <tr><td colspan="2"><strong>Línea Institucional de Investigación a la que pertenece:</strong> ${esc(e.linea)}</td></tr>
      <tr><td colspan="2"><strong>Grupo de Investigación al que se vincularía:</strong> ${esc(e.grupo)}</td></tr>
      <tr><td colspan="2"><strong>Semillero de Investigación (aplica para los estudiantes en categoría de MASTER vinculados a un semillero activo):</strong> ${esc(e.semillero)}</td></tr>
    </table>

    <section class="doc-sec">${cab(sec.resumen)}${htmlParrafos(T['resumen.texto'])}</section>
    <section class="doc-sec">${cab(sec.antecedentes)}<h4>Antecedentes</h4>${htmlParrafos(T['antecedentes.antecedentes'])}<h4>Justificación</h4>${htmlParrafos(T['antecedentes.justificacion'])}</section>
    <section class="doc-sec">${cab(sec.problema)}${htmlParrafos(T['problema.planteamiento'])}<p><strong>Pregunta problema:</strong> ${esc(T['problema.pregunta'])}</p><p><strong>Sistematización:</strong></p><ul>${lineas(T['problema.sistematizacion']).map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>
    <section class="doc-sec">${cab(sec.objetivos)}<h4>Objetivo General</h4>${htmlParrafos(T['objetivos.general'])}<h4>Objetivos específicos</h4><ol>${lineas(T['objetivos.especificos']).map((l) => `<li>${esc(l)}</li>`).join('')}</ol></section>
    <section class="doc-sec">${cab(sec.metodologia)}${htmlParrafos(T['metodologia.texto'])}</section>
    <section class="doc-sec">${cab(sec.etica)}${htmlParrafos(T['etica.texto'])}</section>

    <section class="doc-sec doc-cronograma">
      <h3>7. Cronograma:</h3>
      <table class="doc-tabla crono">
        <colgroup><col class="c-fase"><col class="c-act">${'<col class="c-sem">'.repeat(SEMANAS)}</colgroup>
        <tr><th colspan="2" rowspan="2">DESCRIPCIÓN GENERAL</th><th colspan="16">TRABAJO DE GRADO I</th><th colspan="16">TRABAJO DE GRADO II</th></tr>
        <tr>${Array.from({ length: 8 }, (_, i) => `<th colspan="4">MES ${(i % 4) + 1}</th>`).join('')}</tr>
        <tr><th>FASE</th><th>ACTIVIDAD</th>${Array.from({ length: SEMANAS }, (_, i) => `<th class="sem">${(i % 4) + 1}</th>`).join('')}</tr>
        ${grupos.map((g) => g.filas.map((f, j) => `<tr>${j === 0 ? `<td rowspan="${g.filas.length}" class="fase">${esc(g.fase)}</td>` : ''}<td class="act">${esc(f.actividad)}</td>${Array.from({ length: SEMANAS }, (_, i) => `<td class="${i >= f.inicio && i <= f.fin ? 'on' : ''}"></td>`).join('')}</tr>`).join('')).join('')}
        <tr><td colspan="${SEMANAS + 2}" class="convenciones"><strong>Convenciones:</strong> <span class="muestra-on"></span> Semana de ejecución de la actividad · TG: Trabajo de Grado · Cada mes se divide en 4 semanas.</td></tr>
      </table>
    </section>

    <section class="doc-sec">${cab(sec.impacto)}${htmlParrafos(T['impacto.impacto'])}<p><strong>Productos esperados:</strong></p><ul>${lineas(T['impacto.productos']).map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>

    <section class="doc-sec">
      <h3>9. Presupuesto (directo, indirecto y fuentes de financiación):</h3>
      <h4>9.1 Gastos directos</h4>
      <table class="doc-tabla"><tr><th>Rubro</th><th>Descripción</th><th>Cant.</th><th>Valor unitario</th><th>Fuente</th><th>Total</th></tr>
        ${pres.directos.map((x) => `<tr><td>${esc(x.rubro)}</td><td>${esc(x.descripcion)}</td><td class="num">${x.cantidad}</td><td class="num">${pesos.format(x.unitario)}</td><td>${esc(x.fuente)}</td><td class="num">${pesos.format(x.total)}</td></tr>`).join('')}
        <tr class="tot"><td colspan="5">Subtotal gastos directos</td><td class="num">${pesos.format(pres.subDirectos)}</td></tr></table>
      <h4>9.2 Gastos indirectos</h4>
      <table class="doc-tabla"><tr><th>Rubro</th><th>% sobre directos</th><th>Fuente</th><th>Total</th></tr>
        ${pres.indirectos.map((x) => `<tr><td>${esc(x.rubro)}</td><td class="num">${x.porcentaje}%</td><td>${esc(x.fuente)}</td><td class="num">${pesos.format(x.total)}</td></tr>`).join('')}
        <tr class="tot"><td colspan="3">Subtotal gastos indirectos</td><td class="num">${pesos.format(pres.subIndirectos)}</td></tr></table>
      <h4>9.3 Resumen por fuente de financiación</h4>
      <table class="doc-tabla"><tr><th>Fuente</th><th>Directos</th><th>Indirectos</th><th>Total</th><th>%</th></tr>
        ${pres.porFuente.map((f) => `<tr><td>${esc(f.fuente)}</td><td class="num">${pesos.format(f.directos)}</td><td class="num">${pesos.format(f.indirectos)}</td><td class="num">${pesos.format(f.total)}</td><td class="num">${f.pct.toFixed(1)}%</td></tr>`).join('')}
        <tr class="tot"><td>Total del proyecto</td><td class="num">${pesos.format(pres.subDirectos)}</td><td class="num">${pesos.format(pres.subIndirectos)}</td><td class="num">${pesos.format(pres.total)}</td><td class="num">100%</td></tr></table>
      <p class="nota-doc"><strong>Nota sobre el prototipo:</strong> ${esc(NOTA_PROTOTIPO)}</p>
    </section>

    <section class="doc-sec">${cab(sec.referencias)}<div class="referencias">${lineas(T['referencias.texto']).map((l) => `<p>${esc(l)}</p>`).join('') || '<p class="vacio-doc">—</p>'}</div></section>

    <section class="doc-sec doc-anexo">
      <h3>ANEXO. PROTOTIPO DE INTERFAZ DE LA ESTRATEGIA</h3>
      <p class="nota-doc">Pantallas de referencia para el desarrollo externo del prototipo (ver rubro «${esc(RUBRO_EXTERNO)}» en el presupuesto).</p>
      ${prof.prototipo.pantallas.map((p, i) => `<figure class="avoid-break">${imagenesPrototipo[i] ? `<img src="${imagenesPrototipo[i]}" alt="">` : ''}<figcaption><strong>Figura ${i + 1}. ${esc(p.titulo)}.</strong> ${esc(p.descripcion)}</figcaption></figure>`).join('')}
    </section>

    ${prof.autoria ? `<section class="doc-sec avoid-break"><h3>Autoría de los aportes por sección</h3><p class="instr">Consolidado elaborado por ${esc(PROFESOR_NOMBRE)}, ${esc(PROFESOR_CARGO)}, a partir de las fichas desarrolladas por los estudiantes.</p><table class="doc-tabla"><tr><th>Sección</th><th>Aporte escogido de</th></tr>${autoria().map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table></section>` : ''}
  `;
}

/* ---------- Descarga en PDF ---------- */
async function descargarPDF() {
  const btn = $('#btn-pdf'); btn.disabled = true; btn.textContent = 'Generando PDF…';
  try {
    await cargarScript(LIB_PDF);
    // Copia con ancho fijo (sin insertarla en la página: html2pdf la ubica por su cuenta),
    // para que el PDF sea igual en celular y en computador.
    const copia = $('#vista-previa').cloneNode(true);
    copia.id = 'pdf-copia'; copia.classList.add('modo-pdf');
    await window.html2pdf().set({
      margin: [12, 10, 12, 10],
      filename: `Ficha_Resumen_Final_${slug(prof.encabezado.titulo)}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      // scrollX/scrollY en 0: sin esto el PDF sale en blanco si la página está desplazada.
      html2canvas: { scale: 1.6, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'figure', '.avoid-break', 'h3', 'h4'] }
    }).from(copia).save();
    avisar('PDF descargado ✓', 'ok');
  } catch (e) {
    console.error(e);
    avisar('No se pudo generar el PDF directamente. Se abrirá la impresión: elige “Guardar como PDF”.', 'error', 7000);
    setTimeout(() => window.print(), 600);
  } finally { btn.disabled = false; btn.textContent = '⬇ Descargar PDF'; }
}

/* ---------- Descarga en Word (.docx) ---------- */
async function descargarWord() {
  const btn = $('#btn-word'); btn.disabled = true; btn.textContent = 'Generando Word…';
  try {
    await cargarScript(LIB_DOCX);
    const D = window.docx;
    const blob = await D.Packer.toBlob(construirDocx(D));
    descargarBlob(blob, `Ficha_Resumen_Final_${slug(prof.encabezado.titulo)}.docx`);
    avisar('Documento Word descargado ✓', 'ok');
  } catch (e) {
    console.error(e);
    avisar('No se pudo generar el Word: ' + e.message, 'error', 7000);
  } finally { btn.disabled = false; btn.textContent = '⬇ Descargar Word'; }
}

function construirDocx(D) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, ImageRun, PageOrientation, AlignmentType, VerticalAlign, BorderStyle } = D;
  const e = prof.encabezado, T = prof.textos;
  const sec = Object.fromEntries(SECCIONES.map((s) => [s.id, s]));
  const pres = totalesPresupuesto(prof.presupuesto);
  const TEAL = '0D5EF4', CLARO = 'E8F0FF';
  const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color });
  const par = (hijos, o = {}) => new Paragraph({ children: Array.isArray(hijos) ? hijos : [run(hijos, o)], spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 }, alignment: o.align || (o.justificar ? AlignmentType.JUSTIFIED : undefined), indent: o.indent, bullet: o.bullet, numbering: o.numbering, keepNext: o.keepNext });
  const parrafos = (t) => { const l = lineasParrafo(t); return l.length ? l.map((x) => par(x, { justificar: true })) : [par('—')]; };
  const titulo = (s) => par([run(`${s.num}. ${s.titulo}: `, { bold: true, size: 22 }), ...(s.ficha ? [run(s.ficha, { italics: true, size: 18, color: '4D5B70' })] : [])], { before: 240, after: 120, keepNext: true });
  const subt = (t) => par([run(t, { bold: true })], { before: 120, keepNext: true });
  const lista = (t, numerada) => { const l = lineas(t); return l.length ? l.map((x, i) => par([run((numerada ? `${i + 1}. ` : '• ') + x)], { indent: { left: 360, hanging: 260 } })) : [par('—')]; };
  const celda = (contenido, o = {}) => new TableCell({
    children: Array.isArray(contenido) ? contenido : [par(typeof contenido === 'string' ? [run(contenido, o)] : [contenido], { after: 40, align: o.align })],
    columnSpan: o.span, rowSpan: o.rowSpan, verticalAlign: o.valign || VerticalAlign.CENTER,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: o.m ?? 60, bottom: o.m ?? 60, left: o.m ?? 80, right: o.m ?? 80 },
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined
  });
  const tabla = (filas, anchos) => new Table({ rows: filas, width: { size: anchos ? anchos.reduce((a, b) => a + b, 0) : 100, type: anchos ? WidthType.DXA : WidthType.PERCENTAGE }, columnWidths: anchos });
  const fila = (celdas, o = {}) => new TableRow({ children: celdas, tableHeader: o.header, cantSplit: true });
  const cabTabla = (txt) => celda(txt, { bold: true, fill: CLARO, size: 18 });
  const c18 = (t, o = {}) => celda(t, { size: 18, ...o });

  // Encabezado
  const marcar = (v) => (e.tipo === v ? 'X' : '  ');
  const encabezado = tabla([
    fila([celda([par([run('Facultad, Programa/ Semillero de Investigación:', { bold: true })], { after: 40 }), par(e.facultad, { after: 40 })], { w: 6900 }), celda([par([run('Fecha de entrega a Comité Focal:', { bold: true })], { after: 40 }), par(fechaFicha(e.fecha), { after: 40 })], { w: 3300 })]),
    fila([celda([par([run('Título del Proyecto: ', { bold: true }), run(e.titulo)], { after: 40 })], { span: 2 })]),
    fila([celda([par([run('Proponentes del proyecto: ', { bold: true }), run(lineasParrafo(e.proponentes).join(', '))], { after: 40 })], { span: 2 })]),
    fila([celda([par([run('Tipo de Proyecto: ', { bold: true }), run(`Básico ( ${marcar('Básico')} )    Aplicado ( ${marcar('Aplicado')} )`)], { after: 40 })], { span: 2 })]),
    fila([celda([par([run('Línea Institucional de Investigación a la que pertenece: ', { bold: true }), run(e.linea)], { after: 40 })], { span: 2 })]),
    fila([celda([par([run('Grupo de Investigación al que se vincularía: ', { bold: true }), run(e.grupo)], { after: 40 })], { span: 2 })]),
    fila([celda([par([run('Semillero de Investigación (aplica para los estudiantes en categoría de MASTER vinculados a un semillero activo): ', { bold: true }), run(e.semillero)], { after: 40 })], { span: 2 })])
  ], [6900, 3300]);

  const parte1 = [
    encabezado,
    titulo(sec.resumen), ...parrafos(T['resumen.texto']),
    titulo(sec.antecedentes), subt('Antecedentes'), ...parrafos(T['antecedentes.antecedentes']), subt('Justificación'), ...parrafos(T['antecedentes.justificacion']),
    titulo(sec.problema), ...parrafos(T['problema.planteamiento']),
    par([run('Pregunta problema: ', { bold: true }), run(T['problema.pregunta'])]),
    subt('Sistematización:'), ...lista(T['problema.sistematizacion']),
    titulo(sec.objetivos), subt('Objetivo General'), ...parrafos(T['objetivos.general']), subt('Objetivos específicos'), ...lista(T['objetivos.especificos'], true),
    titulo(sec.metodologia), ...parrafos(T['metodologia.texto']),
    titulo(sec.etica), ...parrafos(T['etica.texto'])
  ];

  // Cronograma en página horizontal
  const WF = 1700, WA = 3500, WS = 287;
  const anchosCrono = [WF, WA, ...Array(SEMANAS).fill(WS)];
  const thc = (t, o = {}) => celda(t, { bold: true, fill: CLARO, size: 14, align: AlignmentType.CENTER, m: 20, ...o });
  const filasCrono = [
    fila([thc('DESCRIPCIÓN GENERAL', { span: 2, rowSpan: 2 }), thc('TRABAJO DE GRADO I', { span: 16 }), thc('TRABAJO DE GRADO II', { span: 16 })], { header: true }),
    fila(Array.from({ length: 8 }, (_, i) => thc(`MES ${(i % 4) + 1}`, { span: 4 })), { header: true }),
    fila([thc('FASE'), thc('ACTIVIDAD'), ...Array.from({ length: SEMANAS }, (_, i) => thc(String((i % 4) + 1)))], { header: true })
  ];
  const grupos = [];
  prof.cronograma.forEach((f) => { const g = grupos.at(-1); if (g && g.fase === f.fase) g.filas.push(f); else grupos.push({ fase: f.fase, filas: [f] }); });
  grupos.forEach((g) => g.filas.forEach((f, j) => {
    const celdas = [];
    if (j === 0) celdas.push(celda(g.fase, { size: 15, bold: true, rowSpan: g.filas.length, m: 40 }));
    celdas.push(celda(f.actividad, { size: 15, m: 40 }));
    for (let i = 0; i < SEMANAS; i++) celdas.push(celda('', { fill: i >= f.inicio && i <= f.fin ? TEAL : undefined, m: 10 }));
    filasCrono.push(fila(celdas));
  }));
  filasCrono.push(fila([celda([par([run('Convenciones: ', { bold: true, size: 16 }), run('■', { color: TEAL, size: 16 }), run(' Semana de ejecución de la actividad · TG: Trabajo de Grado · Cada mes se divide en 4 semanas.', { size: 16 })], { after: 20 })], { span: SEMANAS + 2 })]));
  const cronograma = [par([run('7. Cronograma:', { bold: true, size: 22 })], { after: 120 }), tabla(filasCrono, anchosCrono)];

  // Presupuesto
  const presupuesto = [
    par([run('9. Presupuesto (directo, indirecto y fuentes de financiación):', { bold: true, size: 22 })], { before: 240, keepNext: true }),
    subt('9.1 Gastos directos'),
    tabla([
      fila([cabTabla('Rubro'), cabTabla('Descripción'), cabTabla('Cant.'), cabTabla('Valor unitario'), cabTabla('Fuente'), cabTabla('Total')], { header: true }),
      ...pres.directos.map((x) => fila([c18(x.rubro), c18(x.descripcion), c18(String(x.cantidad), { align: AlignmentType.RIGHT }), c18(pesos.format(x.unitario), { align: AlignmentType.RIGHT }), c18(x.fuente), c18(pesos.format(x.total), { align: AlignmentType.RIGHT })])),
      fila([c18('Subtotal gastos directos', { bold: true, span: 5, fill: CLARO }), c18(pesos.format(pres.subDirectos), { bold: true, align: AlignmentType.RIGHT, fill: CLARO })])
    ], [1500, 3000, 700, 1500, 1900, 1600]),
    subt('9.2 Gastos indirectos'),
    tabla([
      fila([cabTabla('Rubro'), cabTabla('% sobre directos'), cabTabla('Fuente'), cabTabla('Total')], { header: true }),
      ...pres.indirectos.map((x) => fila([c18(x.rubro), c18(x.porcentaje + '%', { align: AlignmentType.RIGHT }), c18(x.fuente), c18(pesos.format(x.total), { align: AlignmentType.RIGHT })])),
      fila([c18('Subtotal gastos indirectos', { bold: true, span: 3, fill: CLARO }), c18(pesos.format(pres.subIndirectos), { bold: true, align: AlignmentType.RIGHT, fill: CLARO })])
    ], [4000, 1600, 2800, 1800]),
    subt('9.3 Resumen por fuente de financiación'),
    tabla([
      fila([cabTabla('Fuente'), cabTabla('Directos'), cabTabla('Indirectos'), cabTabla('Total'), cabTabla('%')], { header: true }),
      ...pres.porFuente.map((f) => fila([c18(f.fuente), c18(pesos.format(f.directos), { align: AlignmentType.RIGHT }), c18(pesos.format(f.indirectos), { align: AlignmentType.RIGHT }), c18(pesos.format(f.total), { align: AlignmentType.RIGHT }), c18(f.pct.toFixed(1) + '%', { align: AlignmentType.RIGHT })])),
      fila([c18('Total del proyecto', { bold: true, fill: CLARO }), c18(pesos.format(pres.subDirectos), { bold: true, align: AlignmentType.RIGHT, fill: CLARO }), c18(pesos.format(pres.subIndirectos), { bold: true, align: AlignmentType.RIGHT, fill: CLARO }), c18(pesos.format(pres.total), { bold: true, align: AlignmentType.RIGHT, fill: CLARO }), c18('100%', { bold: true, align: AlignmentType.RIGHT, fill: CLARO })])
    ], [3400, 1800, 1700, 1900, 1400]),
    par([run('Nota sobre el prototipo: ', { bold: true, size: 18 }), run(NOTA_PROTOTIPO, { size: 18 })], { before: 120, justificar: true })
  ];

  const datosImagen = (url) => { const b = atob(url.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const anexo = [
    par([run('ANEXO. PROTOTIPO DE INTERFAZ DE LA ESTRATEGIA', { bold: true, size: 22 })], { before: 240, after: 80, keepNext: true }),
    par([run(`Pantallas de referencia para el desarrollo externo del prototipo (ver rubro «${RUBRO_EXTERNO}» en el presupuesto).`, { italics: true, size: 18, color: '4D5B70' })], { after: 160, keepNext: true })
  ];
  prof.prototipo.pantallas.forEach((p, i) => {
    const img = imagenesPrototipo[i];
    if (img) {
      const proporcion = p.imagenPropia ? null : 600 / 960;
      anexo.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({ data: datosImagen(img), transformation: { width: 600, height: proporcion ? 600 * proporcion : 400 } })] }));
    }
    anexo.push(par([run(`Figura ${i + 1}. ${p.titulo}. `, { bold: true, size: 18 }), run(p.descripcion, { size: 18 })], { after: 280, justificar: true }));
  });

  const final = [
    titulo(sec.impacto), ...parrafos(T['impacto.impacto']), subt('Productos esperados:'), ...lista(T['impacto.productos']),
    ...presupuesto,
    titulo(sec.referencias), ...lineas(T['referencias.texto']).map((r) => par(r, { indent: { left: 720, hanging: 720 } })),
    ...anexo
  ];
  if (prof.autoria) {
    final.push(par([run('Autoría de los aportes por sección', { bold: true, size: 22 })], { before: 240 }));
    final.push(par(`Consolidado elaborado por ${PROFESOR_NOMBRE}, ${PROFESOR_CARGO}, a partir de las fichas desarrolladas por los estudiantes.`, { size: 18, italics: true }));
    final.push(tabla([fila([cabTabla('Sección'), cabTabla('Aporte escogido de')], { header: true }), ...autoria().map(([a, b]) => fila([c18(a), c18(b)]))], [6200, 4000]));
  }

  const margen = { top: 1000, bottom: 1000, left: 1000, right: 1000 };
  return new Document({
    creator: PROFESOR_NOMBRE,
    title: 'Ficha resumen del proyecto — ' + (e.titulo || ENTIDAD),
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [
      { properties: { page: { margin: margen } }, children: parte1 },
      { properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: cronograma },
      { properties: { page: { margin: margen } }, children: final }
    ]
  });
}

/* =====================================================================
   ARRANQUE
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  document.body.dataset.vista = 'v-ingreso';
  prepararIngreso();
  prepararEstudiante();
  prepararProfesor();
  // Recupera la sesión si se recarga la página mientras el token sigue vigente.
  const guardada = sesionAlmacen.leer();
  if (guardada && (MODO_PRUEBA ? guardada.idToken === 'demo' : guardada.exp - 60000 > Date.now())) {
    rolElegido = guardada.rol;
    iniciarSesion(guardada);
  }
});
