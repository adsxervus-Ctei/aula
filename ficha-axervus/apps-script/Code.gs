/**
 * Ficha Resumen · Axervus (CTeI) — Almacén compartido en una Hoja de Google
 *
 * Se pega en: Hoja de Google → Extensiones → Apps Script.
 * Se publica como: Implementar → Nueva implementación → Aplicación web
 *   - Ejecutar como: Yo (la cuenta del profesor)
 *   - Quién tiene acceso: Cualquier usuario
 *
 * Seguridad: cada petición trae el token de Google del usuario. Aquí se
 * verifica con Google; solo el correo del profesor puede listar y analizar.
 */

// ⚙️ CONFIGURAR: el mismo ID de cliente que pusiste en app.js
const CLIENT_ID = 'PEGA_AQUI_TU_ID_DE_CLIENTE.apps.googleusercontent.com';
// ⚙️ CONFIGURAR: correo del profesor (el mismo de app.js)
const PROFESOR_EMAIL = 'inbox.nativo@gmail.com';
// Envía al estudiante una copia de confirmación de su consolidado.
const ENVIAR_COPIA_ESTUDIANTE = true;

const HOJA = 'Consolidados';
const COLUMNAS = ['Fecha de envío', 'Correo', 'Nombre', 'Secciones completas', 'Datos (JSON)', 'Consolidado (texto)'];

function doGet() {
  return responder({ ok: true, servicio: 'Ficha Resumen Axervus (CTeI)' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const usuario = verificarToken(req.idToken);
    switch (req.accion) {
      case 'estado':
        return responder({ ok: true, aiDisponible: !!claveIA(), esProfesor: usuario.email === PROFESOR_EMAIL.toLowerCase() });
      case 'enviar':
        return responder(enviar(usuario, req.registro));
      case 'listar':
        soloProfesor(usuario);
        return responder({ ok: true, registros: listar() });
      case 'analizarIA':
        soloProfesor(usuario);
        return responder(analizarIA(req));
      default:
        throw new Error('Acción no válida');
    }
  } catch (err) {
    return responder({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Verificación del ingreso con Google ---------- */
function verificarToken(token) {
  if (!token) throw new Error('Falta el inicio de sesión');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Sesión no válida o vencida. Vuelve a ingresar.');
  const d = JSON.parse(r.getContentText());
  if (d.aud !== CLIENT_ID) throw new Error('El ID de cliente no coincide con la configuración.');
  if (String(d.email_verified) !== 'true') throw new Error('El correo de Google no está verificado.');
  if (Number(d.exp) * 1000 < Date.now()) throw new Error('Sesión vencida. Vuelve a ingresar.');
  return { email: String(d.email).toLowerCase(), nombre: d.name || d.email };
}

function soloProfesor(u) {
  if (u.email !== PROFESOR_EMAIL.toLowerCase()) throw new Error('Solo el profesor puede realizar esta acción.');
}

/* ---------- Hoja de cálculo ---------- */
function hoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA);
  if (!h) {
    h = libro.insertSheet(HOJA);
    h.appendRow(COLUMNAS);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  }
  return h;
}

function enviar(usuario, registro) {
  if (!registro || !registro.respuestas) throw new Error('El consolidado llegó vacío.');
  // El correo y el nombre se toman del token verificado, no de lo que envía el navegador.
  registro.email = usuario.email;
  registro.nombre = usuario.nombre;
  registro.fecha = new Date().toISOString();
  const texto = String(registro.texto || '');
  delete registro.texto;
  const json = JSON.stringify(registro);
  if (json.length > 49000) throw new Error('El consolidado es demasiado largo para guardarlo (máximo ~49.000 caracteres).');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const h = hoja();
    const fila = [new Date(), usuario.email, usuario.nombre, registro.completas || 0, json, texto.slice(0, 49000)];
    const correos = h.getLastRow() > 1 ? h.getRange(2, 2, h.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).toLowerCase(); }) : [];
    const i = correos.indexOf(usuario.email);
    if (i >= 0) h.getRange(i + 2, 1, 1, fila.length).setValues([fila]); // Reemplaza el envío anterior
    else h.appendRow(fila);
  } finally {
    lock.releaseLock();
  }

  let correoEnviado = false;
  try {
    MailApp.sendEmail({
      to: PROFESOR_EMAIL,
      replyTo: usuario.email,
      subject: 'Consolidado ficha resumen Axervus (CTeI) — ' + usuario.nombre + ' (' + usuario.email + ')',
      body: texto
    });
    if (ENVIAR_COPIA_ESTUDIANTE) {
      MailApp.sendEmail({ to: usuario.email, subject: 'Copia de tu consolidado — Ficha resumen Axervus (CTeI)', body: texto });
    }
    correoEnviado = true;
  } catch (err) {
    // Se superó la cuota diaria de correos: el consolidado igual quedó guardado en la hoja.
  }
  return { ok: true, fecha: registro.fecha, correoEnviado: correoEnviado };
}

function listar() {
  const h = hoja();
  if (h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, 5).getValues().map(function (r) {
    try { return JSON.parse(r[4]); } catch (e) { return null; }
  }).filter(function (x) { return x; });
}

/* ---------- IA opcional (Claude) ----------
 * Desactivada por defecto. Para activarla: Configuración del proyecto →
 * Propiedades de la secuencia de comandos → agregar ANTHROPIC_API_KEY.
 * Opcional: ANTHROPIC_MODEL (por defecto claude-sonnet-5-5).
 * La clave queda oculta aquí; nunca se pone en app.js.
 */
function claveIA() {
  return PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
}

function analizarIA(req) {
  const clave = claveIA();
  if (!clave) throw new Error('La IA no está configurada.');
  const modelo = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_MODEL') || 'claude-sonnet-5-5';
  const instrucciones = [
    'Eres un evaluador académico de proyectos de investigación de Axervus (CTeI), Ciencia, Tecnología e Innovación.',
    'Recibes las respuestas de varios estudiantes a las mismas secciones de una ficha resumen de un único proyecto.',
    'Tareas:',
    '1) Para cada clave "seccion.campo" escoge el correo del estudiante con la mejor respuesta según lo que pide la ficha, claridad, argumentación y pertinencia. No reescribas textos.',
    '2) Propón un cronograma de 32 semanas (0-15 = Trabajo de Grado I, meses 1-4; 16-31 = Trabajo de Grado II, meses 1-4) con fases y actividades coherentes con los objetivos y la metodología escogidos.',
    '3) Propón un presupuesto en pesos colombianos (COP) con gastos directos (rubro, descripcion, cantidad, unitario, fuente) e indirectos como porcentaje de los directos (rubro, porcentaje, fuente). Fuentes válidas: "Axervus (CTeI)", "Recursos propios (proponentes)", "Contrapartida institucional (en especie)". El prototipo de interfaz se desarrolla de manera externa: incluye sus costos (diseño UX/UI, desarrollo y alojamiento) en el rubro "Servicios técnicos externos (prototipo)".',
    '4) Para el anexo, describe en una o dos oraciones cada pantalla del prototipo en este orden: inicio, un módulo por objetivo específico, resultados.',
    'Responde SOLO con JSON válido, sin texto adicional, con esta forma:',
    '{"selecciones":{"resumen.texto":{"email":"...","razon":"..."}},"cronograma":[{"fase":"...","actividad":"...","inicio":0,"fin":3}],"presupuesto":{"directos":[{"rubro":"...","descripcion":"...","cantidad":1,"unitario":0,"fuente":"..."}],"indirectos":[{"rubro":"...","porcentaje":10,"fuente":"..."}]},"prototipo":[{"descripcion":"..."}]}'
  ].join('\n');
  const contenido = JSON.stringify({ secciones: req.secciones, consolidados: req.consolidados });
  const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: modelo, max_tokens: 8000, system: instrucciones, messages: [{ role: 'user', content: contenido }] }),
    muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) throw new Error('La IA respondió con error ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  const datos = JSON.parse(r.getContentText());
  const texto = (datos.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  const limpio = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return { ok: true, resultado: JSON.parse(limpio.slice(limpio.indexOf('{'), limpio.lastIndexOf('}') + 1)) };
}
