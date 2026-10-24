"""Construye la versión 2026 de JAC Digital a partir del index.html original.

Uso:  python fuente/construir.py original/index.html index.html

No reescribe la lógica: cambia la paleta, agrega una capa de diseño,
la apertura, las transiciones y la sección Atención, y corrige un error
de señal. Cada inserción usa un ancla única; si un ancla no aparece
exactamente una vez, el script se detiene en vez de adivinar.
"""
import re, sys, pathlib

ORIG, SALIDA = sys.argv[1], sys.argv[2]
AQUI = pathlib.Path(__file__).parent
html = open(ORIG, encoding="utf-8").read()

def una_vez(ancla):
    n = html.count(ancla)
    if n != 1:
        sys.exit(f"Ancla encontrada {n} veces (se esperaba 1): {ancla[:70]!r}")

def reemplazar(ancla, nuevo):
    global html
    una_vez(ancla); html = html.replace(ancla, nuevo)

# ---------------------------------------------------------------- 1. paleta
HEX = {"#1B7A3D": "#36347A", "#146030": "#2A2864", "#0E4722": "#1E1C4F", "#2E9B55": "#5552A8",
       "#E7F4EC": "#ECEBF8", "#F4FAF6": "#F6F6FC", "#BCDFC9": "#D9D7F2", "#13201A": "#1F1E3D",
       "#5E6F63": "#5E5D7E", "#E2E9E3": "#E6E5F3", "#F3F6F3": "#F6F6FC", "#0A3A1C": "#1E1C4F",
       "#9FC9B0": "#B6B3F5", "#0E2A18": "#1E1C4F", "#EAF2EC": "#EEEDF9", "#243A2B": "#2B2A5E",
       "#15241A": "#1C1B45", "#BFD9C8": "#CFCDF5", "#7FC9A3": "#9C9AD6", "#CFE3D5": "#D9D7F2",
       "#C9D4CB": "#CFCDE6", "#EEF2EF": "#EEEDF6", "#FAFBFA": "#F9F9FD", "#F6F8F6": "#F6F6FC",
       "#EDF0EE": "#EEEDF5", "#8FA797": "#9C9AC4", "#AFBCB3": "#B9B8D6", "#8A978D": "#9897B5",
       "#1C2A20": "#1F1E3D"}
for a, b in HEX.items():
    html = re.sub(re.escape(a), b, html, flags=re.I)
RGBA = {"rgba(27,122,61,": "rgba(54,52,122,", "rgba(14,55,30,": "rgba(42,40,100,",
        "rgba(6,20,11,": "rgba(20,19,52,", "rgba(8,30,16,": "rgba(20,19,52,", "rgba(5,25,13,": "rgba(20,19,52,"}
for a, b in RGBA.items():
    html = html.replace(a, b)
html = html.replace('<meta name="theme-color" content="#1E1C4F">', '<meta name="theme-color" content="#36347A">')

# ---------------------------------------------------------------- 1b. fuentes sin bloquear el pintado
# Con señal lenta, la hoja de Google Fonts detenía toda la pantalla. Ahora se
# pinta de inmediato con la letra del sistema y cambia sola cuando llega.
FUENTE = '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">'
reemplazar(FUENTE, FUENTE.replace('rel="stylesheet">', 'rel="stylesheet" media="print" onload="this.media=\'all\'">') +
           '\n<noscript>' + FUENTE + '</noscript>')

# ---------------------------------------------------------------- 1c. nombre de la aplicación instalada
reemplazar('<meta name="apple-mobile-web-app-title" content="JAC Chimí">', '<meta name="apple-mobile-web-app-title" content="ASOJUNTAS">')
reemplazar('<title>JAC Digital · Chimí</title>', '<title>ASOJUNTAS · JAC Digital</title>')

# ---------------------------------------------------------------- 2. capa de diseño
tema = (AQUI / "tema-2026.css").read_text(encoding="utf-8")
reemplazar("</style>\n</head>", "</style>\n<style id=\"tema-2026\">\n" + tema + "</style>\n</head>")

# ---------------------------------------------------------------- 3. apertura
APERTURA = '''<body class="entrando abriendo">

<!-- ============ APERTURA · ASOJUNTAS San Martín de Loba (M-08) ============ -->
<div id="apertura" role="progressbar" aria-label="Abriendo JAC Digital · ASOJUNTAS San Martín de Loba" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
  <div class="apOrbe o1"></div><div class="apOrbe o2"></div><div class="apOrbe o3"></div>
  <div class="apCentro">
    <div class="apAnillo">
      <svg class="apAro" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="pista"/><circle cx="60" cy="60" r="54" class="avance"/></svg>
      <div class="apLogo" id="ap-logo">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="45" fill="#fff" opacity=".14"/>
          <circle cx="48" cy="48" r="45" fill="none" stroke="#fff" stroke-width="2.5"/>
          <path class="casa" d="M48 20 L72 40 h-7v24H31V40h-7Z" fill="#fff"/>
          <circle cx="48" cy="45" r="6" fill="#36347A"/>
          <path d="M37 62c0-6 5-11 11-11s11 5 11 11Z" fill="#36347A"/>
          <path class="linea" d="M20 76h56" stroke="#F2C14E" stroke-width="5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
    <div class="apNum"><span id="ap-num">0</span><small>%</small></div>
    <div class="apNombre" aria-hidden="true"><b>ASOJUNTAS</b><span>San Martín de Loba · Bolívar</span><i>Asociación de Juntas de Acción Comunal</i></div>
  </div>
  <p class="apPie"><b>JAC Digital</b> · Toque para continuar</p>
</div>
'''
reemplazar('<body class="entrando">', APERTURA)

# ---------------------------------------------------------------- 4. inicio: estado de atención y Aprende JAC
INICIO = '''<button type="button" class="atnTarjeta" id="b-ir-atencion">
    <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg><i id="atn-ini-punto"></i></span>
    <span class="tx"><b id="atn-ini-tit">Atención de la Junta</b><span id="atn-ini-sub">Pregunte, radique o escriba a la Junta</span></span>
    <span class="fl">›</span>
  </button>
  <a class="btnAncho oculto" id="b-aprende" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="m9 10 2 2 4-4"/></svg>
    <span class="c2">Aprenda a usar la aplicación<span>Talleres y lecciones con audio, sin señal</span></span>
  </a>

  <!-- TABLERO DE ANUNCIOS COMUNITARIOS -->'''
reemplazar("<!-- TABLERO DE ANUNCIOS COMUNITARIOS -->", INICIO)

# ---------------------------------------------------------------- 5. vista Atención
ATENCION = '''<!-- ============ VISTA: ATENCIÓN DE LA JUNTA ============ -->
<section class="vista oculto" id="v-atencion" aria-label="Atención de la Junta">
  <div class="atnCab">
    <button type="button" class="atras" id="b-atn-volver" aria-label="Volver al inicio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
    <div class="atnAv" aria-hidden="true">JAC<i id="atn-av-punto"></i></div>
    <div class="atnTit"><b>Atención de la Junta</b><span id="atn-estado">—</span></div>
    <button type="button" class="atnWa" id="atn-wa" aria-label="Abrir el WhatsApp de la Junta"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg></button>
  </div>
  <p class="atnPriv"><span aria-hidden="true">🔒</span><span>La charla se guarda solo en este teléfono y en su cuenta, para seguir donde quedó y darle resúmenes. A la Junta solo le llega lo que usted envíe por WhatsApp. No envíe su cédula ni fotos de documentos por chat. <button type="button" class="atnBorrar" id="b-atn-borrar">Borrar mi conversación</button></span></p>
  <div class="atnHilo" id="atn-hilo" aria-live="polite"></div>
  <div class="atnChips" id="atn-chips"></div>
  <form class="atnEscribir" id="f-atn" autocomplete="off">
    <input id="atn-txt" type="text" placeholder="Escriba aquí su mensaje" aria-label="Mensaje" maxlength="600" enterkeyhint="send">
    <button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4 3.4 10l12.6 2-12.6 2z"/></svg></button>
  </form>
</section>

</main>'''
reemplazar("</main>", ATENCION)

# ---------------------------------------------------------------- 6. botón flotante
FAB = '''<button type="button" class="fabChat" id="b-chat" aria-label="Atención de la Junta">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>
  <i class="fabPunto" id="fab-punto"></i>
</button>

<div id="aviso" role="status" aria-live="polite"></div>'''
reemplazar('<div id="aviso" role="status" aria-live="polite"></div>', FAB)

# ---------------------------------------------------------------- 7. configuración en Libro → Junta
i = html.index('<form id="f-conf" class="tarjeta">')
j = html.index("</form>", i) + len("</form>")
CONF = '''
      <div class="tarjeta" id="conf-atencion">
        <h3>💬 Atención por WhatsApp</h3>
        <p class="sub">El número que verá la comunidad y los turnos de quién responde en cada horario. El asistente de la aplicación los usa para decirle al vecino quién atiende ahora o cuándo es el próximo turno.</p>
        <label for="g-wa">Número de WhatsApp de la Junta <span class="op">(celular colombiano de 10 dígitos)</span></label>
        <input id="g-wa" type="tel" inputmode="tel" placeholder="Ej.: 300 123 4567">
        <label for="g-wa-aus">Mensaje fuera de horario <span class="op">(opcional)</span></label>
        <textarea id="g-wa-aus" maxlength="300" placeholder="Ej.: Gracias por escribir. La Junta responde en su próximo turno."></textarea>
        <h3 style="margin-top:18px">Turnos de atención</h3>
        <p class="sub">Un turno es un cargo, unos días y un horario. Use los cargos que la Junta haya acordado.</p>
        <div id="turnos"></div>
        <div class="fila">
          <button type="button" class="btn g chico" id="b-turno-add">➕ Agregar turno</button>
          <button type="button" class="btn gris chico" id="b-turno-ej">Cargar un horario de ejemplo</button>
        </div>
        <label for="g-aprende">Enlace de Aprende JAC <span class="op">(opcional; aparece en Inicio)</span></label>
        <input id="g-aprende" type="url" inputmode="url" placeholder="https://usuario.github.io/aprende-jac/">
        <button type="button" class="btn" id="b-guardar-atn">💾 Guardar atención</button>
        <p class="sub" style="margin-top:10px">Recomendado: use <b>WhatsApp Business</b> (gratis) en ese número y active el horario comercial y el mensaje de ausencia con los mismos horarios.</p>
      </div>'''
html = html[:j] + CONF + html[j:]


# ---------------------------------------------------------------- 7b. portal ASOJUNTAS y acceso
i = html.index('<!-- ============ PORTAL · ASOCOMUNAL SAN MARTÍN DE LOBA ============ -->')
j = html.index('<!-- ============ ACCESO · REGISTRO Y AUTORIZACIÓN ============ -->')
PORTAL = """<!-- ============ PORTAL · ASOJUNTAS SAN MARTÍN DE LOBA ============ -->
<div id="portal">
  <div class="poHero">
    <button type="button" class="poIb" id="b-admin-juntas" aria-label="Acceso del Super Administrador">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/></svg>
    </button>
    <div class="poCentro">
      <div class="poLogo" id="po-logo" role="img" aria-label="ASOJUNTAS San Martín de Loba">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="45" fill="#fff" opacity=".14"/>
          <circle cx="48" cy="48" r="45" fill="none" stroke="#fff" stroke-width="3"/>
          <path d="M48 20 L72 40 h-7v24H31V40h-7Z" fill="#fff"/>
          <circle cx="48" cy="45" r="6" fill="#36347A"/>
          <path d="M37 62c0-6 5-11 11-11s11 5 11 11Z" fill="#36347A"/>
          <path d="M20 76h56" stroke="#F2C14E" stroke-width="5" stroke-linecap="round"/>
        </svg>
      </div>
      <input type="file" id="in-logo" accept="image/*" class="oculto">
      <div class="poMarca"><b>ASOJUNTAS</b><span>San Martín de Loba · Bolívar</span></div>
    </div>
    <div class="poSlider" id="po-slider" role="region" aria-roledescription="carrusel" aria-label="Noticias y avisos">
      <div class="poBarras" id="po-barras" aria-hidden="true"></div>
      <div class="poPista" id="po-pista" aria-live="off"></div>
    </div>
  </div>

  <div class="poPanel">
    <div class="poAgarre" aria-hidden="true"></div>
    <div class="poPanelCab"><h2>Escoja su Junta</h2><p>Toque la junta a la que pertenece para entrar.</p></div>
    <div id="po-juntas" class="poLista"></div>
    <p class="poNota">Cada junta guarda su información por separado en este teléfono. Entrar a una no da acceso a las otras.</p>
  </div>
</div>

"""
html = html[:i] + PORTAL + html[j:]

i = html.index('    <div class="accLogo">')
j = html.index('    <!-- 2 · REGISTRO -->')
ACCESO = """    <button type="button" class="accVolver" id="b-acc-volver">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      Escoger otra junta</button>
    <div class="accLogo">
      <div class="accIco" id="acc-ico" aria-hidden="true"></div>
      <b id="acc-junta">JAC Digital</b>
      <span id="acc-lugar">San Martín de Loba</span>
    </div>

    <!-- 1 · ENTRAR: Google, sin señal o registrarse -->
    <div class="accTarjeta" id="acc-entrar">
      <h2>Bienvenido</h2>
      <p class="intro">Escoja cómo quiere entrar.</p>
      <button type="button" class="btn goog" id="b-google">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45 24.3c0-1.6-.1-2.8-.4-4H24v7.4h12c-.2 2-1.5 5-4.4 7l6.7 5.2c4-3.7 6.7-9.1 6.7-15.6z"/>
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41 15.4 46 24 46z"/>
          <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9z"/>
          <path fill="#EA4335" d="M24 10.8c3.2 0 6 1.1 8.2 3.2l6.1-6.1C34.9 4.3 29.9 2 24 2 15.4 2 8 7 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/></svg>
        Iniciar sesión con Google
      </button>
      <p class="sub" id="goog-nota" style="text-align:center;margin-top:8px"></p>
      <button type="button" class="btn sec accOpcion" id="b-sin-senal" aria-expanded="false" aria-controls="acc-sinsenal">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.5a15 15 0 0 1 6-3.2M12 5a15 15 0 0 1 10 3.5M5 12.5a10 10 0 0 1 4-2.2M15.5 10.6A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 5.5-1M12 20h.01M3 3l18 18"/></svg>
        <span class="c2">Entrar sin señal<span>Con el correo y la clave de su cuenta</span></span>
        <svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="accPliegue" id="acc-sinsenal"><div>
        <label for="ac-correo">Correo electrónico</label>
        <input id="ac-correo" type="email" inputmode="email" autocomplete="username" placeholder="sunombre@gmail.com">
        <label for="ac-clave">Clave</label>
        <input id="ac-clave" type="password" autocomplete="current-password" placeholder="••••••••">
        <button type="button" class="btn" id="b-ingresar">Ingresar</button>
      </div></div>
      <p class="sub" id="acc-nota" style="margin-top:12px;text-align:center"></p>
      <div class="sep">¿Primera vez en la aplicación?</div>
      <button type="button" class="btn g" id="b-ir-registro">Registrarse</button>
    </div>

"""
html = html[:i] + ACCESO + html[j:]
html = html.replace("ASOCOMUNAL", "ASOJUNTAS")
# El acceso queda oculto hasta escoger una junta (pantallaAcceso lo muestra). Antes estaba
# montado detrás del portal desde el arranque y sus movimientos contaban como saltos de diseño.
reemplazar('<div id="acceso">', '<div id="acceso" class="oculto">')

reemplazar("function pintarPortal(){", "function pintarPortalOriginal(){")
reemplazar("function adminJuntas(){", "function adminJuntasOriginal(){")
reemplazar("function pantallaAcceso(cual){", "function pantallaAccesoOriginal(cual){")
reemplazar('<div class="av" style="border-radius:12px;overflow:hidden;background:${j.color}22">',
           '<div class="av" style="border-radius:12px;overflow:hidden;background:var(--lav);color:var(--ind)">')
reemplazar("(j.icono||'🏛️')}</div>", "iconoJunta(j.icono)}</div>")
reemplazar('aria-label="Cambiar foto">📷</button>', 'aria-label="Cambiar foto">${svgIcono(\'camara\')}</button>')
reemplazar('<label for="nj-ico">Símbolo</label>', '<label for="nj-ico">Ícono</label>')
reemplazar("<select id=\"nj-ico\"><option>🏛️</option><option>🌴</option><option>🛶</option><option>🌳</option>\n      <option>🌾</option><option>⛪</option><option>🏫</option><option>🚜</option></select>",
           '<select id="nj-ico"><option value="🏛️">Casa comunal</option><option value="🌴">Palma</option><option value="🛶">Canoa y río</option><option value="🌳">Árbol</option>'
           '<option value="🌾">Espiga</option><option value="⛪">Iglesia</option><option value="🏫">Escuela</option><option value="🚜">Tractor</option></select>')
reemplazar("const colores=['#36347A','#0E6E8C','#B8761A','#7A3E9D','#B03A48','#2E7D6B','#8A5A2B'];",
           "const colores=['#36347A','#33508A','#4A3F86','#2F4A7A','#5A3F7A','#2E5A78','#4B4470'];")

# ---------------------------------------------------------------- 8. JavaScript
reemplazar("const VISTAS=['inicio','radicar','consultar','comunidad','actas','perfil'];",
           "const VISTAS=['inicio','radicar','consultar','comunidad','actas','perfil','atencion'];")
reemplazar("function ir(v){", "function irInterno(v){")
reemplazar("  contarNuevas();\n  if(p==='conf'){", "  contarNuevas();\n  if(p==='conf') pintarConfAtencion();\n  if(p==='conf'){")
# Error previo: con el portal abierto (sin junta), un cambio de señal llamaba a la base inexistente.
reemplazar("window.addEventListener('online',pintarFranja);", "window.addEventListener('online',()=>{ if(DB) pintarFranja(); });")
reemplazar("window.addEventListener('offline',pintarFranja);", "window.addEventListener('offline',()=>{ if(DB) pintarFranja(); });")
# El color guardado de Chimí (verde anterior) pasa al índigo del nuevo diseño.
reemplazar('style="--acc:${j.color}"', 'style="--acc:${colorJunta(j.color)}"')
reemplazar("setProperty('--v',j.color)", "setProperty('--v',colorJunta(j.color))")
reemplazar("function leerJuntas(){", "const colorJunta=c=>COLOR_SOBRIO[String(c||'').toUpperCase()]||c;\nfunction leerJuntas(){")

modulo = (AQUI / "modulo-2026.js").read_text(encoding="utf-8") + "\n" + (AQUI / "portal-2026.js").read_text(encoding="utf-8") + "\n" + (AQUI / "instalar-2026.js").read_text(encoding="utf-8")
ARRANQUE = "(async function(){\n  try{\n    enganchar(); pausaFranja(); ondaBotones();\n    pintarPortal();\n    asegurarAlmacen();"
reemplazar(ARRANQUE, modulo + "\n" + "(async function(){\n  try{\n    enganchar(); pausaFranja(); ondaBotones(); engancharAtencion(); engancharPortal();\n    pintarPortal(); Apertura.completar('portal');\n    Promise.resolve(asegurarAlmacen()).finally(()=>Apertura.completar('almacen'));")

open(SALIDA, "w", encoding="utf-8").write(html)
print("ok", len(html), "caracteres")
