/* =========================================================================
   Aprende JAC · Chimí — Aplicación
   Sin dependencias, sin paso de compilación. Enrutador por #hash.
   ========================================================================= */
(function () {
  "use strict";

  const C = window.CONTENIDO;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const app = $("#app");
  const nav = $("#nav");

  /* ------------------------------------------------------------------ *
   * Estado guardado en el teléfono (localStorage, con respaldo en memoria)
   * ------------------------------------------------------------------ */
  const CLAVE = "aprendeJac.v1";
  const inicial = () => ({
    vioBienvenida: false,
    nombre: "",
    progreso: {},          // { t1: [0,2], ... } índices de lecciones hechas
    practica: {},          // { t1: true } práctica respondida bien
    favoritos: [],
    ajustes: { letra: 0, leerAuto: false },
    resultados: []         // evaluaciones (escala SUS) con código seudónimo
  });
  let E;
  try { E = Object.assign(inicial(), JSON.parse(localStorage.getItem(CLAVE) || "{}")); }
  catch (e) { E = inicial(); }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(E)); }
    catch (e) { aviso("No se pudo guardar: el teléfono puede estar sin espacio."); }
  }

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const ico = (id, cls = "") => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const taller = (id) => C.talleres.find((t) => t.id === id);
  const hechas = (id) => E.progreso[id] || [];
  const pct = (t) => Math.round((hechas(t.id).length / t.lecciones.length) * 100);
  const iniciales = (n) => (n || "Vecino").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const colores = ["lila", "rosa", "durazno", "menta"];
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function aviso(txt) {
    const t = $("#toast");
    t.textContent = txt; t.hidden = false;
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => (t.hidden = true), 2800);
  }

  function vibrar(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  /* Fotos: si el archivo existe en /img se muestra; si no, queda el marcador */
  function foto(src, pie, cls = "") {
    return `<div class="foto ${cls}" data-src="${esc(src)}" role="img" aria-label="${esc(pie)}">
      <div class="marcador">${ico("foto")}<span>${esc(pie)}</span></div></div>`;
  }
  /* img/fotos.json lista las fotos que existen: así no se piden archivos
     ausentes (cero errores 404) y el marcador queda hasta que se agreguen. */
  let fotosDisponibles = null;
  const listaFotos = fetch("img/fotos.json").then((r) => (r.ok ? r.json() : [])).catch(() => [])
    .then((l) => { fotosDisponibles = new Set((Array.isArray(l) ? l : []).map((n) => "img/" + n)); cargarFotos(); });
  const fotosOk = new Set(), fotosFaltan = new Set();
  function cargarFotos() {
    if (!fotosDisponibles) return; // se reintenta cuando llegue la lista
    $$(".foto[data-src]").forEach((el) => {
      const src = el.dataset.src;
      el.removeAttribute("data-src");
      if (!fotosDisponibles.has(src)) return;
      const poner = () => { el.style.backgroundImage = `url("${src}")`; el.classList.add("cargada"); };
      if (fotosOk.has(src)) return poner();
      if (fotosFaltan.has(src)) return;
      const img = new Image();
      img.onload = () => { fotosOk.add(src); poner(); };
      img.onerror = () => fotosFaltan.add(src);
      img.src = src;
    });
  }

  /* ------------------------------------------------------------------ *
   * Lectura en voz alta (Web Speech API · speechSynthesis)
   * ------------------------------------------------------------------ */
  const Voz = (() => {
    const ok = "speechSynthesis" in window;
    let voz = null, botonActivo = null;
    function elegir() {
      if (!ok) return;
      const vs = speechSynthesis.getVoices();
      voz = ["es-CO", "es-419", "es-US", "es-MX", "es-ES"].map((l) => vs.find((v) => v.lang.replace("_", "-") === l)).find(Boolean)
        || vs.find((v) => v.lang.toLowerCase().startsWith("es")) || null;
    }
    if (ok) { elegir(); speechSynthesis.onvoiceschanged = elegir; }
    function parar() {
      if (!ok) return;
      speechSynthesis.cancel();
      if (botonActivo) { botonActivo.setAttribute("aria-pressed", "false"); actualizarBoton(botonActivo, false); }
      $$(".leyendo").forEach((x) => x.classList.remove("leyendo"));
      botonActivo = null;
    }
    function actualizarBoton(b, on) {
      const u = b.querySelector("use"); if (u) u.setAttribute("href", on ? "#i-pausa" : "#i-bocina");
      const s = b.querySelector(".lbl"); if (s) s.textContent = on ? "Detener" : (b.dataset.lbl || "Escuchar");
    }
    /* partes: [{texto, el}] — resalta cada parte mientras la lee */
    function leer(partes, boton) {
      if (!ok) { aviso("Este teléfono no tiene lectura en voz alta."); return; }
      if (botonActivo === boton) { parar(); return; }
      parar();
      botonActivo = boton || null;
      if (boton) { boton.setAttribute("aria-pressed", "true"); actualizarBoton(boton, true); }
      partes.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p.texto);
        u.lang = voz ? voz.lang : "es-CO"; if (voz) u.voice = voz;
        u.rate = 0.92;
        u.onstart = () => { $$(".leyendo").forEach((x) => x.classList.remove("leyendo")); p.el && p.el.classList.add("leyendo"); };
        if (i === partes.length - 1) u.onend = () => parar();
        speechSynthesis.speak(u);
      });
    }
    return { ok, leer, parar };
  })();

  /* ------------------------------------------------------------------ *
   * Instalación (beforeinstallprompt en Android/Chrome, guía en iPhone)
   * ------------------------------------------------------------------ */
  let promptInstalar = null;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); promptInstalar = e; refrescarSiVista(["inicio", "perfil"]); });
  addEventListener("appinstalled", () => { promptInstalar = null; aviso("Aplicación instalada"); refrescarSiVista(["inicio", "perfil"]); });
  const puedeInstalar = () => !instalada() && (promptInstalar || esIOS);

  async function instalar() {
    if (promptInstalar) {
      promptInstalar.prompt();
      await promptInstalar.userChoice.catch(() => {});
      promptInstalar = null;
      return;
    }
    hoja(`<h2 id="hoja-titulo">Instalar en iPhone</h2>
      <ol><li>Abra esta página en <strong>Safari</strong>.</li>
      <li>Toque el botón <strong>Compartir</strong> (cuadro con flecha hacia arriba).</li>
      <li>Escoja <strong>Agregar a inicio</strong> y luego <strong>Agregar</strong>.</li></ol>
      <p>En iPhone, abra la aplicación al menos una vez por semana para que no se borre lo guardado.</p>
      <div style="margin-top:18px"><button class="boton" data-cerrar>Entendido</button></div>`);
  }

  /* ------------------------------------------------------------------ *
   * Hoja inferior (diálogo)
   * ------------------------------------------------------------------ */
  let focoPrevio = null;
  function hoja(html) {
    const h = $("#hoja");
    focoPrevio = document.activeElement;
    h.innerHTML = `<div class="hoja-caja">${html}</div>`;
    h.hidden = false;
    const f = h.querySelector("button, input, a"); f && f.focus();
  }
  function cerrarHoja() { const h = $("#hoja"); h.hidden = true; h.innerHTML = ""; focoPrevio && focoPrevio.focus && focoPrevio.focus(); }
  $("#hoja").addEventListener("click", (e) => { if (e.target.id === "hoja" || e.target.closest("[data-cerrar]")) cerrarHoja(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#hoja").hidden) cerrarHoja(); });

  /* ------------------------------------------------------------------ *
   * Vistas
   * ------------------------------------------------------------------ */
  const Vistas = {};

  /* --- Bienvenida (3 pantallas) --- */
  Vistas.bienvenida = (p) => {
    const i = Math.min(Math.max(parseInt(p.get("p") || "0", 10), 0), C.bienvenida.length - 1);
    const b = C.bienvenida[i];
    const ultima = i === C.bienvenida.length - 1;
    return { sinNav: true, html: `
      <section class="bienvenida">
        <div class="hero">
          <div class="barra">
            ${i > 0 ? `<a class="boton-circulo" href="#/bienvenida?p=${i - 1}" aria-label="Anterior">${ico("atras")}</a>` : `<span></span>`}
            <button class="saltar-intro" data-accion="terminar-intro">Saltar</button>
          </div>
          ${foto(b.foto, b.pie)}
        </div>
        <div class="bienvenida-cuerpo">
          <div class="puntos" role="img" aria-label="Paso ${i + 1} de ${C.bienvenida.length}">${C.bienvenida.map((_, k) => `<span class="${k === i ? "activo" : ""}"></span>`).join("")}</div>
          <h1>${esc(b.titulo)}</h1>
          <p>${esc(b.texto)}</p>
          <div class="acciones">
            ${ultima
              ? `<button class="boton" data-accion="terminar-intro">Empezar ${ico("adelante")}</button>`
              : `<a class="boton" href="#/bienvenida?p=${i + 1}">Siguiente ${ico("adelante")}</a>`}
          </div>
        </div>
      </section>` };
  };

  /* --- Inicio --- */
  Vistas.inicio = () => {
    const nombre = E.nombre ? esc(E.nombre.split(" ")[0]) : "vecino";
    const enCurso = C.talleres.filter((t) => pct(t) > 0 && pct(t) < 100);
    return { html: `
      <section class="hero">
        <div class="saludo">
          <div class="avatar">${esc(iniciales(E.nombre))}</div>
          <p class="saludo-txt">Hola, ${nombre}</p>
          <a class="boton-circulo" href="#/ayuda" aria-label="Palabras de la Junta">${ico("ayuda")}</a>
        </div>
        <h1>Aprenda a usar la app de su Junta</h1>
        <form class="buscador" role="search" data-accion="buscar">
          ${ico("buscar")}
          <input id="q" type="search" placeholder="Buscar un tema" aria-label="Buscar un tema" autocomplete="off" enterkeyhint="search">
          <button type="button" class="mic" data-accion="dictar" aria-label="Buscar hablando" ${("webkitSpeechRecognition" in window || "SpeechRecognition" in window) ? "" : "hidden"}>${ico("mic")}</button>
        </form>
      </section>

      <div class="categorias">
        ${C.categorias.map((c, k) => `<a class="categoria" href="#/taller/${c.taller}">
          <span class="burbuja ${colores[k]}">${ico(c.icono)}</span>${esc(c.nombre)}</a>`).join("")}
      </div>

      <div id="resultados" class="resultados" hidden></div>

      <div id="portada">
        ${puedeInstalar() ? `<div class="seccion"><div class="tarjeta-aviso">
          <span class="burbuja lila">${ico("instalar")}</span>
          <div class="cuerpo"><strong>Instale la aplicación</strong><small>Queda en su pantalla y abre sin señal.</small></div>
          <button class="boton chico" data-accion="instalar">Instalar</button></div></div>` : ""}

        ${enCurso.length ? `<div class="seccion">
          <div class="seccion-cab"><h2>Siga donde iba</h2></div>
          ${filaTaller(enCurso[0])}</div>` : ""}

        <div class="seccion">
          <div class="seccion-cab"><h2>Talleres</h2><a href="#/talleres">Ver todos</a></div>
          <div class="carrusel">
            ${C.talleres.map((t) => `<div class="tarjeta-taller">
              <a href="#/taller/${t.id}" class="enlace-tarjeta">${foto(t.foto, t.pie)}</a>
              <div class="pie-tarjeta"><a href="#/taller/${t.id}" class="enlace-tarjeta"><h3>${esc(t.titulo)}</h3><small>${t.lecciones.length} lecciones · ${esc(t.duracion)}</small></a>
              <button class="corazon" data-accion="favorito" data-id="${t.id}" aria-pressed="${E.favoritos.includes(t.id)}" aria-label="Guardar ${esc(t.titulo)}">${ico("corazon")}</button></div>
            </div>`).join("")}
          </div>
        </div>
      </div>` };
  };

  function filaTaller(t) {
    const p = pct(t);
    return `<a class="fila-taller" href="#/taller/${t.id}">
      ${foto(t.foto, t.pie)}
      <div class="cuerpo"><h3>${esc(t.titulo)}</h3>
        <div class="quien">${ico("grupo")}<span>${esc(t.para)}</span></div>
        <div class="progreso-txt"><span>${hechas(t.id).length}/${t.lecciones.length} lecciones</span><span>${p}%</span></div>
        <div class="progreso"><span style="--p:${p}%"></span></div>
      </div></a>`;
  }

  /* --- Mis talleres (En curso / Terminados) --- */
  Vistas.talleres = (p) => {
    const tab = p.get("tab") === "terminados" ? "terminados" : "curso";
    const lista = C.talleres.filter((t) => (tab === "terminados" ? pct(t) === 100 : pct(t) < 100));
    return { html: `
      <header class="barra-sup">
        <div class="avatar" style="width:40px;height:40px;font-size:.85rem">${esc(iniciales(E.nombre))}</div>
        <h1>Mis talleres</h1><span class="hueco"></span>
      </header>
      <div class="segmentado" role="tablist">
        <button role="tab" aria-selected="${tab === "curso"}" data-ir="#/talleres">En curso</button>
        <button role="tab" aria-selected="${tab === "terminados"}" data-ir="#/talleres?tab=terminados">Terminados</button>
      </div>
      <div class="lista">
        ${lista.length ? lista.map(filaTaller).join("") : `<p class="vacio">${tab === "terminados" ? "Todavía no ha terminado ningún taller. ¡Vamos con el primero!" : "¡Terminó todos los talleres!"}</p>`}
      </div>` };
  };

  /* --- Detalle de un taller --- */
  Vistas.taller = (p, id) => {
    const t = taller(id); if (!t) return Vistas.noEncontrado();
    const tab = p.get("tab") || "lecciones";
    const min = t.lecciones.reduce((a, l) => a + l.minutos, 0);
    const siguiente = t.lecciones.findIndex((_, i) => !hechas(t.id).includes(i));
    const sig = siguiente === -1 ? 0 : siguiente;
    const fav = E.favoritos.includes(t.id);
    let cuerpo = "";
    if (tab === "lecciones") {
      cuerpo = `<div class="lecciones">${t.lecciones.map((l, i) => {
        const h = hechas(t.id).includes(i);
        return `<a class="leccion-item ${h ? "hecha" : ""}" href="#/leccion/${t.id}/${i}">
          <span class="leccion-num">${i + 1}</span>
          <div><h3>${esc(l.titulo)}</h3><small>${l.minutos} min${h ? " · hecha" : ""}</small></div>
          <span class="play">${h ? ico("check") : ico("play")}</span></a>`;
      }).join("")}</div>`;
    } else if (tab === "practicar") {
      const q = t.pregunta;
      cuerpo = `<div class="pregunta"><p>${esc(q.texto)}</p>
        <div class="opciones">${q.opciones.map((o, i) => `<button class="opcion" data-accion="responder" data-t="${t.id}" data-i="${i}">${esc(o)}</button>`).join("")}</div>
        <div id="explica"></div></div>`;
    } else {
      cuerpo = `<p class="resumen">${esc(t.resumen)}</p>
        <div class="nota" style="margin-top:14px">Duración total: ${esc(t.duracion)} de taller presencial, con ${min} minutos de lecciones para repasar en el teléfono.</div>`;
    }
    return { html: `
      <header class="barra-sup">
        <a class="boton-circulo claro" href="#/talleres" aria-label="Volver">${ico("atras")}</a>
        <h1>Detalle del taller</h1>
        <button class="boton-circulo claro" data-accion="favorito" data-id="${t.id}" aria-pressed="${fav}" aria-label="Guardar">${ico("corazon", fav ? "relleno" : "")}</button>
      </header>
      <section class="detalle">
        ${foto(t.foto, t.pie, "grande")}
        <h2>${esc(t.titulo)}</h2>
        <div class="datos">
          <div class="dato"><span class="burbuja">${ico("reloj")}</span><div><small>Duración</small><strong>${esc(t.duracion)}</strong></div></div>
          <div class="dato"><span class="burbuja">${ico("grupo")}</span><div><small>Para</small><strong>${esc(t.para)}</strong></div></div>
        </div>
        <p class="resumen">${esc(t.resumen)}</p>
        <div class="pestanas" role="tablist">
          ${[["lecciones", "Lecciones"], ["practicar", "Practicar"], ["acerca", "Acerca del taller"]].map(([k, n]) =>
            `<button role="tab" aria-selected="${tab === k}" data-ir="#/taller/${t.id}?tab=${k}">${n}</button>`).join("")}
        </div>
        ${cuerpo}
        <div class="pie-fijo"><div class="fila-botones">
          <span class="boton secundario precio" aria-label="Progreso">${pct(t)}%</span>
          <a class="boton" href="#/leccion/${t.id}/${sig}">${pct(t) === 100 ? "Repasar" : pct(t) > 0 ? "Seguir" : "Empezar"} ${ico("adelante")}</a>
        </div></div>
      </section>` };
  };

  /* --- Lección --- */
  Vistas.leccion = (p, id, n) => {
    const t = taller(id); const i = parseInt(n, 10);
    const l = t && t.lecciones[i]; if (!l) return Vistas.noEncontrado();
    const hecha = hechas(t.id).includes(i);
    const ultima = i === t.lecciones.length - 1;
    return { sinNav: true, html: `
      <header class="barra-sup">
        <a class="boton-circulo claro" href="#/taller/${t.id}" aria-label="Volver al taller">${ico("atras")}</a>
        <h1>Lección ${i + 1} de ${t.lecciones.length}</h1><span class="hueco"></span>
      </header>
      <article class="leccion">
        <span class="etiqueta">${esc(t.titulo)}</span>
        <h2 id="titulo-leccion">${esc(l.titulo)}</h2>
        <div class="progreso"><span style="--p:${Math.round(((i + 1) / t.lecciones.length) * 100)}%"></span></div>
        <button class="boton secundario escuchar" data-accion="escuchar" data-lbl="Escuchar la lección" aria-pressed="false">${ico("bocina")}<span class="lbl">Escuchar la lección</span></button>
        <ol class="pasos">${l.pasos.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${l.ojo ? `<div class="ojo" data-ojo>${ico("estrella")}<span>${esc(l.ojo)}</span></div>` : ""}
        <div class="pila" style="margin-top:24px">
          <button class="boton" data-accion="hecha" data-t="${t.id}" data-i="${i}">${hecha ? "Ya la hice · siguiente" : "Ya lo entendí"} ${ico(ultima ? "check" : "adelante")}</button>
          ${i > 0 ? `<a class="boton secundario" href="#/leccion/${t.id}/${i - 1}">${ico("atras")} Lección anterior</a>` : ""}
        </div>
      </article>`, despues: () => { if (E.ajustes.leerAuto) setTimeout(() => $("[data-accion=escuchar]")?.click(), 400); } };
  };

  /* --- Palabras (glosario) --- */
  Vistas.ayuda = () => ({ html: `
    <header class="barra-sup"><span class="hueco"></span><h1>Palabras de la Junta</h1><span class="hueco"></span></header>
    <div class="lista">
      <p class="nota">Toque la bocina para escuchar cada palabra y su significado.</p>
      ${C.glosario.map(([t, d], k) => `<div class="termino">
        <span class="burbuja ${colores[k % 4]}" style="width:40px;height:40px">${ico("libro")}</span>
        <div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>
        <button class="boton-circulo claro" data-accion="leer-termino" data-k="${k}" data-lbl="" aria-pressed="false" aria-label="Escuchar ${esc(t)}">${ico("bocina")}</button>
      </div>`).join("")}
    </div>` });

  /* --- Perfil --- */
  Vistas.perfil = () => {
    const total = C.talleres.reduce((a, t) => a + t.lecciones.length, 0);
    const listas = C.talleres.reduce((a, t) => a + hechas(t.id).length, 0);
    return { html: `
      <section class="hero perfil-hero">
        <div class="barra"><a class="boton-circulo" href="#/inicio" aria-label="Volver">${ico("atras")}</a><h1>Perfil</h1><span class="hueco" style="width:44px"></span></div>
      </section>
      <div class="perfil-cabeza">
        <div class="avatar grande">${esc(iniciales(E.nombre))}
          <button class="editar" data-accion="nombre" aria-label="Cambiar nombre">${ico("letra")}</button></div>
        <h2>${E.nombre ? esc(E.nombre) : "Vecino de Chimí"}</h2>
        <p>${listas} de ${total} lecciones · ${C.talleres.filter((t) => pct(t) === 100).length} talleres terminados</p>
      </div>
      <div class="menu">
        <div class="menu-item"><span class="burbuja rosa">${ico("letra")}</span><span class="txt">Tamaño de la letra</span>
          <div class="tamanos" role="group" aria-label="Tamaño de la letra">${["A", "A+", "A++"].map((x, k) => `<button data-accion="letra" data-v="${k}" aria-pressed="${E.ajustes.letra === k}">${x}</button>`).join("")}</div></div>
        <div class="menu-item"><span class="burbuja lila">${ico("bocina")}</span><span class="txt">Leer las lecciones solas<small>Al abrir una lección, se lee en voz alta</small></span>
          <button class="interruptor" role="switch" aria-checked="${E.ajustes.leerAuto}" data-accion="leer-auto" aria-label="Leer las lecciones solas"></button></div>
        ${puedeInstalar() ? `<button class="menu-item" data-accion="instalar"><span class="burbuja durazno">${ico("instalar")}</span><span class="txt">Instalar la aplicación</span>${ico("chevron")}</button>` : ""}
        <a class="menu-item" href="#/evaluar"><span class="burbuja menta">${ico("estrella")}</span><span class="txt">Opine sobre la aplicación<small>Diez preguntas cortas</small></span>${ico("chevron")}</a>
        <button class="menu-item" data-accion="privacidad"><span class="burbuja">${ico("escudo")}</span><span class="txt">Sus datos en esta aplicación</span>${ico("chevron")}</button>
        <a class="menu-item" href="#/investigador"><span class="burbuja lila">${ico("grafica")}</span><span class="txt">Equipo investigador<small>Resultados y exportación</small></span>${ico("chevron")}</a>
        <button class="menu-item" data-accion="borrar"><span class="burbuja alerta">${ico("basura")}</span><span class="txt">Borrar mi progreso</span>${ico("chevron")}</button>
      </div>` };
  };

  /* --- Evaluación (System Usability Scale) --- */
  let respuestasSUS = [];
  Vistas.evaluar = () => {
    respuestasSUS = new Array(C.sus.length).fill(null);
    return { sinNav: true, html: `
      <header class="barra-sup"><a class="boton-circulo claro" href="#/perfil" aria-label="Volver">${ico("atras")}</a><h1>Opine sobre la app</h1><span class="hueco"></span></header>
      <form class="lista" data-accion="enviar-sus" novalidate>
        <p class="nota">No hay respuestas buenas ni malas. Se evalúa la aplicación, no a usted. 1 es «muy en desacuerdo» y 5 es «muy de acuerdo».</p>
        <div class="campo"><label for="codigo">Código de participante</label>
          <input id="codigo" required pattern="[A-Za-z]{1,3}[0-9]{1,3}" placeholder="Ej.: P07" maxlength="6" autocomplete="off" autocapitalize="characters">
          <small>Lo entrega el equipo investigador. No escriba su nombre ni su cédula.</small></div>
        ${C.sus.map((q, k) => `<div class="item-sus">
          <div class="cab"><span class="num">${k + 1}.</span><p id="sus-${k}">${esc(q)}</p>
            <button type="button" class="boton-circulo claro" data-accion="leer-sus" data-k="${k}" data-lbl="" aria-pressed="false" aria-label="Escuchar la pregunta ${k + 1}">${ico("bocina")}</button></div>
          <div class="escala" role="group" aria-labelledby="sus-${k}">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-accion="sus" data-k="${k}" data-v="${v}" aria-pressed="false">${v}</button>`).join("")}</div>
          <div class="escala-ley"><span>Muy en desacuerdo</span><span>Muy de acuerdo</span></div>
        </div>`).join("")}
        <button class="boton" type="submit">Enviar mis respuestas ${ico("check")}</button>
      </form>` };
  };

  /* --- Panel del equipo investigador --- */
  Vistas.investigador = () => {
    const R = E.resultados;
    const prom = R.length ? (R.reduce((a, r) => a + r.puntaje, 0) / R.length).toFixed(1) : "—";
    return { html: `
      <header class="barra-sup"><a class="boton-circulo claro" href="#/perfil" aria-label="Volver">${ico("atras")}</a><h1>Equipo investigador</h1><span class="hueco"></span></header>
      <div class="lista">
        <div class="tarjeta-aviso"><span class="burbuja lila">${ico("grafica")}</span>
          <div class="cuerpo"><strong>${R.length} ${R.length === 1 ? "evaluación" : "evaluaciones"} en este teléfono</strong><small>Puntaje SUS promedio: ${prom} (escala 0–100; 68 es el promedio de referencia)</small></div></div>
        ${R.length ? `<table class="tabla"><thead><tr><th>Código</th><th>SUS</th><th>Fecha</th><th>Nube</th></tr></thead><tbody>
          ${R.map((r) => `<tr><td>${esc(r.codigo)}</td><td>${r.puntaje}</td><td>${new Date(r.fecha).toLocaleDateString("es-CO")}</td>
          <td>${Sync.activo() ? `<span class="pildora ${r.enviado ? "ok" : "pend"}">${r.enviado ? "enviado" : "pendiente"}</span>` : "—"}</td></tr>`).join("")}
          </tbody></table>` : `<p class="vacio">Aún no hay evaluaciones.</p>`}
        <button class="boton" data-accion="exportar" ${R.length ? "" : "disabled"}>${ico("instalar")} Descargar resultados (CSV)</button>
        ${Sync.activo() ? `<button class="boton secundario" data-accion="sincronizar">${ico("nube")} Enviar pendientes a la base de datos</button>` : ""}
        <p class="nota">${Sync.activo()
          ? "La sincronización está activa: solo se envían el código, el puntaje, las respuestas y el avance. Nunca nombres ni cédulas."
          : "La sincronización está apagada: todo queda en este teléfono. Para activarla, vea la guía de despliegue (docs/GUIA_DESPLIEGUE.md)."}</p>
      </div>` };
  };

  Vistas.noEncontrado = () => ({ html: `<div class="vacio" style="padding-top:80px"><p>No encontramos esa pantalla.</p><p style="margin-top:16px"><a class="boton chico" href="#/inicio">Ir al inicio</a></p></div>` });

  /* ------------------------------------------------------------------ *
   * Enrutador
   * ------------------------------------------------------------------ */
  let rutaActual = "";
  function parsear() {
    const h = location.hash.replace(/^#\/?/, "") || (E.vioBienvenida ? "inicio" : "bienvenida");
    const [camino, qs] = h.split("?");
    const partes = camino.split("/").filter(Boolean);
    return { nombre: partes[0] || "inicio", args: partes.slice(1), params: new URLSearchParams(qs || "") };
  }

  /* Profundidad de cada pantalla: decide si la transición avanza, vuelve o es lateral */
  const NIVEL = { bienvenida: 0, inicio: 1, talleres: 1, ayuda: 1, perfil: 1, taller: 2, evaluar: 2, investigador: 2, leccion: 3 };
  let rutaPrev = null;
  function direccion(a, b) {
    if (!a) return "lado";
    if (a.nombre === b.nombre) {
      if (a.nombre === "bienvenida") return +(b.params.get("p") || 0) >= +(a.params.get("p") || 0) ? "adelante" : "atras";
      if (a.nombre === "leccion" && a.args[0] === b.args[0]) return +b.args[1] >= +a.args[1] ? "adelante" : "atras";
      return "lado";
    }
    const na = NIVEL[a.nombre] ?? 1, nb = NIVEL[b.nombre] ?? 1;
    return nb > na ? "adelante" : nb < na ? "atras" : "lado";
  }
  /* Elemento compartido: la foto del taller viaja entre la lista y el detalle */
  function nombrarFotoTaller(id) {
    const enlace = $$(`a[href="#/taller/${id}"]`, app).find((a) => a.querySelector(".foto") || a.closest(".tarjeta-taller, .fila-taller"));
    const f = enlace && (enlace.querySelector(".foto") || enlace.closest(".tarjeta-taller")?.querySelector(".foto"));
    if (f) f.style.viewTransitionName = "foto-taller";
  }
  function limpiarNombres() { $$("[style*='view-transition-name']", app).forEach((x) => (x.style.viewTransitionName = "")); }

  function pintar() {
    Voz.parar();
    if (!$("#hoja").hidden) cerrarHoja();
    const r = parsear();
    if (!E.vioBienvenida && r.nombre !== "bienvenida") { location.replace("#/bienvenida"); return; }
    const vista = Vistas[r.nombre] || Vistas.noEncontrado;
    const v = vista(r.params, ...r.args);
    const prev = rutaPrev;
    rutaPrev = r;
    const dir = direccion(prev, r);
    const deTallerALista = prev && prev.nombre === "taller" && ["talleres", "inicio"].includes(r.nombre);
    const deListaATaller = prev && ["talleres", "inicio"].includes(prev.nombre) && r.nombre === "taller";
    if (deListaATaller) nombrarFotoTaller(r.args[0]);
    const cambio = () => {
      if (deListaATaller) limpiarNombres();
      app.innerHTML = `<div class="vista">${v.html}</div>`;
      app.classList.toggle("sin-nav", !!v.sinNav);
      nav.hidden = !!v.sinNav;
      const marcar = ["inicio", "talleres", "ayuda", "perfil"].includes(r.nombre) ? r.nombre : (r.nombre === "taller" ? "talleres" : "");
      $$("a", nav).forEach((a) => a.dataset.ruta === marcar ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
      cargarFotos();
      if (r.nombre !== rutaActual.split("?")[0]) window.scrollTo(0, 0);
      rutaActual = r.nombre;
      v.despues && v.despues();
      const h1 = $("h1, h2", app); if (h1) document.title = h1.textContent.trim() + " · Aprende JAC";
      if (deListaATaller) { const g = $(".foto.grande", app); if (g) g.style.viewTransitionName = "foto-taller"; }
      if (deTallerALista) nombrarFotoTaller(prev.args[0]);
    };
    if (document.startViewTransition && !reducido && app.innerHTML && !document.body.classList.contains("abriendo")) {
      document.documentElement.dataset.dir = dir;
      if (deTallerALista) { const g = $(".foto.grande", app); if (g) g.style.viewTransitionName = "foto-taller"; }
      const vt = document.startViewTransition(cambio);
      vt.finished.finally(() => { limpiarNombres(); delete document.documentElement.dataset.dir; });
    } else cambio();
  }
  function refrescarSiVista(nombres) { if (nombres.includes(parsear().nombre)) pintar(); }
  addEventListener("hashchange", pintar);

  /* ------------------------------------------------------------------ *
   * Acciones (delegación de eventos)
   * ------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const ir = e.target.closest("[data-ir]");
    if (ir) { location.hash = ir.dataset.ir; return; }
    const b = e.target.closest("[data-accion]");
    if (!b || b.tagName === "FORM") return;
    const a = b.dataset.accion;

    if (a === "terminar-intro") {
      E.vioBienvenida = true; guardar();
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      location.hash = "#/inicio";
    }
    else if (a === "favorito") {
      e.preventDefault(); e.stopPropagation();
      const id = b.dataset.id;
      E.favoritos = E.favoritos.includes(id) ? E.favoritos.filter((x) => x !== id) : [...E.favoritos, id];
      guardar();
      const on = E.favoritos.includes(id);
      b.setAttribute("aria-pressed", on); const s = b.querySelector(".ico"); s && s.classList.toggle("relleno", on && b.classList.contains("boton-circulo"));
      aviso(on ? "Guardado en sus talleres" : "Quitado de guardados");
    }
    else if (a === "instalar") instalar();
    else if (a === "dictar") dictar(b);
    else if (a === "escuchar") {
      const partes = [{ texto: $("#titulo-leccion").textContent, el: null }]
        .concat($$(".pasos li").map((li, k) => ({ texto: `Paso ${k + 1}. ${li.textContent}`, el: li })));
      const ojo = $("[data-ojo]"); if (ojo) partes.push({ texto: "Ojo. " + ojo.textContent, el: ojo });
      Voz.leer(partes, b);
    }
    else if (a === "leer-termino") { const [t, d] = C.glosario[+b.dataset.k]; Voz.leer([{ texto: `${t}. ${d}`, el: b.closest(".termino") }], b); }
    else if (a === "leer-sus") Voz.leer([{ texto: C.sus[+b.dataset.k], el: b.closest(".item-sus") }], b);
    else if (a === "hecha") {
      const id = b.dataset.t, i = +b.dataset.i, t = taller(id);
      const lista = new Set(hechas(id)); const nueva = !lista.has(i); lista.add(i);
      E.progreso[id] = [...lista].sort((x, y) => x - y); guardar();
      if (nueva) vibrar(30);
      if (i < t.lecciones.length - 1) location.hash = `#/leccion/${id}/${i + 1}`;
      else { aviso(pct(t) === 100 ? "¡Terminó el taller! Ahora practique." : "Lección guardada"); location.hash = `#/taller/${id}?tab=practicar`; }
    }
    else if (a === "responder") {
      const t = taller(b.dataset.t), i = +b.dataset.i, q = t.pregunta;
      $$(".opcion").forEach((o, k) => { o.disabled = true; if (k === q.correcta) o.classList.add("bien"); });
      if (i !== q.correcta) b.classList.add("mal"); else { E.practica[t.id] = true; guardar(); vibrar([20, 40, 20]); }
      $("#explica").innerHTML = `<div class="explica"><strong>${i === q.correcta ? "¡Muy bien!" : "Casi."}</strong> ${esc(q.explica)}</div>`;
      $("#explica .explica").scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "nearest" });
    }
    else if (a === "letra") { E.ajustes.letra = +b.dataset.v; guardar(); aplicarAjustes(); pintar(); }
    else if (a === "leer-auto") { E.ajustes.leerAuto = !E.ajustes.leerAuto; guardar(); b.setAttribute("aria-checked", E.ajustes.leerAuto); }
    else if (a === "nombre") {
      hoja(`<h2 id="hoja-titulo">¿Cómo quiere que lo llamemos?</h2>
        <form data-accion="guardar-nombre" class="pila" style="margin-top:12px">
          <div class="campo"><label for="nombre">Su nombre o apodo</label><input id="nombre" maxlength="40" value="${esc(E.nombre)}" autocomplete="given-name"><small>Solo se guarda en este teléfono.</small></div>
          <button class="boton" type="submit">Guardar</button></form>`);
    }
    else if (a === "privacidad") {
      hoja(`<h2 id="hoja-titulo">Sus datos en esta aplicación</h2>
        <ol><li>Esta aplicación de aprendizaje solo guarda su avance, su nombre o apodo (si lo escribe) y sus opiniones.</li>
        <li>Todo queda en este teléfono. No pide cédula, firma, huella ni fotos suyas.</li>
        <li>Las prácticas se hacen con datos inventados, nunca con los suyos.</li>
        <li>Puede borrar su progreso cuando quiera desde el Perfil.</li></ol>
        <button class="boton" data-cerrar>Entendido</button>`);
    }
    else if (a === "borrar") {
      hoja(`<h2 id="hoja-titulo">¿Borrar su progreso?</h2><p>Se borran sus lecciones hechas, sus guardados y su nombre en este teléfono. Las evaluaciones del equipo investigador se conservan.</p>
        <div class="pila" style="margin-top:18px"><button class="boton peligro" data-accion="confirmar-borrar">Sí, borrar</button><button class="boton secundario" data-cerrar>Cancelar</button></div>`);
    }
    else if (a === "confirmar-borrar") {
      const res = E.resultados; E = inicial(); E.vioBienvenida = true; E.resultados = res; guardar(); aplicarAjustes(); cerrarHoja(); aviso("Progreso borrado"); pintar();
    }
    else if (a === "sus") {
      const k = +b.dataset.k; respuestasSUS[k] = +b.dataset.v;
      $$("button", b.parentElement).forEach((x) => x.setAttribute("aria-pressed", x === b));
    }
    else if (a === "exportar") exportarCSV();
    else if (a === "sincronizar") sincronizar(true);
  });

  document.addEventListener("submit", (e) => {
    const f = e.target; const a = f.dataset.accion; if (!a) return;
    e.preventDefault();
    if (a === "buscar") { const q = $("#q"); q && q.blur(); }
    else if (a === "guardar-nombre") { E.nombre = $("#nombre").value.trim().slice(0, 40); guardar(); cerrarHoja(); pintar(); }
    else if (a === "enviar-sus") {
      const cod = $("#codigo");
      if (!cod.checkValidity()) { aviso("Escriba un código válido, por ejemplo P07."); cod.focus(); return; }
      const falta = respuestasSUS.findIndex((x) => x === null);
      if (falta !== -1) { aviso(`Falta responder la pregunta ${falta + 1}.`); $(`#sus-${falta}`).scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      /* Puntaje SUS: impares (v-1), pares (5-v), suma × 2,5 */
      const puntaje = respuestasSUS.reduce((a, v, k) => a + (k % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5;
      const progreso = Object.fromEntries(C.talleres.map((t) => [t.id, pct(t)]));
      E.resultados.push({ id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), codigo: cod.value.trim().toUpperCase(), puntaje, respuestas: respuestasSUS.slice(), progreso, fecha: new Date().toISOString(), enviado: false });
      guardar(); vibrar([20, 40, 20]);
      location.hash = "#/perfil";
      setTimeout(() => hoja(`<h2 id="hoja-titulo">¡Gracias!</h2><p>Sus respuestas quedaron guardadas. Nos ayudan a mejorar la aplicación para toda la comunidad.</p><div style="margin-top:18px"><button class="boton" data-cerrar>Volver</button></div>`), 120);
      sincronizar(false);
    }
  });

  /* Búsqueda en vivo */
  document.addEventListener("input", (e) => { if (e.target.id === "q") buscar(e.target.value); });
  function buscar(q) {
    const caja = $("#resultados"), portada = $("#portada"); if (!caja) return;
    const n = norm(q.trim());
    if (n.length < 2) { caja.hidden = true; portada.hidden = false; return; }
    const res = [];
    C.talleres.forEach((t) => {
      if (norm(t.titulo + " " + t.resumen).includes(n)) res.push({ href: `#/taller/${t.id}`, sub: "Taller", txt: t.titulo, ico: "talleres" });
      t.lecciones.forEach((l, i) => { if (norm(l.titulo + " " + l.pasos.join(" ") + " " + (l.ojo || "")).includes(n)) res.push({ href: `#/leccion/${t.id}/${i}`, sub: t.titulo, txt: l.titulo, ico: "play" }); });
    });
    C.glosario.forEach(([t, d]) => { if (norm(t + " " + d).includes(n)) res.push({ href: "#/ayuda", sub: "Palabra", txt: t, ico: "libro" }); });
    portada.hidden = true; caja.hidden = false;
    caja.innerHTML = res.length
      ? res.slice(0, 12).map((r, k) => `<a class="resultado" href="${r.href}"><span class="burbuja ${colores[k % 4]}" style="width:38px;height:38px">${ico(r.ico)}</span><div><small>${esc(r.sub)}</small><strong>${esc(r.txt)}</strong></div></a>`).join("")
      : `<p class="vacio">No encontramos «${esc(q)}». Pruebe con otra palabra, como «acta» o «quórum».</p>`;
  }

  /* Dictado por voz para buscar (necesita señal en la mayoría de teléfonos) */
  function dictar(b) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (!navigator.onLine) { aviso("Para buscar hablando se necesita señal. Escriba la palabra."); return; }
    const r = new SR(); r.lang = "es-CO"; r.interimResults = false; r.maxAlternatives = 1;
    b.classList.add("escuchando"); b.setAttribute("aria-label", "Escuchando…");
    r.onresult = (ev) => { const q = $("#q"); q.value = ev.results[0][0].transcript; buscar(q.value); };
    r.onerror = () => aviso("No le entendimos. Intente de nuevo o escriba.");
    r.onend = () => { b.classList.remove("escuchando"); b.setAttribute("aria-label", "Buscar hablando"); };
    try { r.start(); } catch (e) { b.classList.remove("escuchando"); }
  }

  function exportarCSV() {
    const cab = ["id", "codigo", "puntaje_sus", ...C.sus.map((_, k) => "p" + (k + 1)), ...C.talleres.map((t) => "avance_" + t.id), "fecha"];
    const filas = E.resultados.map((r) => [r.id, r.codigo, r.puntaje, ...r.respuestas, ...C.talleres.map((t) => r.progreso[t.id] ?? 0), r.fecha]);
    const csv = "﻿" + [cab, ...filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `resultados_sus_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function sincronizar(manual) {
    if (!Sync.activo()) return;
    if (!navigator.onLine) { manual && aviso("Sin señal. Se enviará cuando vuelva."); return; }
    const n = await Sync.sincronizar(E.resultados); guardar();
    if (manual) aviso(n ? `Se enviaron ${n} evaluaciones.` : "No había nada pendiente o no se pudo enviar.");
    refrescarSiVista(["investigador"]);
  }

  /* ------------------------------------------------------------------ *
   * Señal, ajustes y arranque
   * ------------------------------------------------------------------ */
  function estadoRed() { $("#banner").hidden = navigator.onLine; }
  addEventListener("online", () => { estadoRed(); sincronizar(false); });
  addEventListener("offline", estadoRed);
  function aplicarAjustes() { document.documentElement.dataset.letra = String(E.ajustes.letra || 0); }

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const nuevo = reg.installing;
          nuevo && nuevo.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) aviso("Hay una versión nueva. Cierre y abra la aplicación.");
          });
        });
      }).catch(() => {});
    });
  }

  /* ------------------------------------------------------------------ *
   * Apertura: el contador sube con la carga REAL (fuentes, service
   * worker, lista de fotos y primer pintado), nunca pasa de 2 s y se
   * salta tocando. En visitas repetidas de la misma sesión es corta.
   * ------------------------------------------------------------------ */
  const Apertura = (() => {
    const el = $("#apertura");
    if (!el) return { completar() {} };
    let visto = false;
    try { visto = sessionStorage.getItem("aprendeJac.apertura") === "1"; sessionStorage.setItem("aprendeJac.apertura", "1"); } catch (e) {}
    const MIN = reducido ? 0 : (visto ? 450 : 1500), MAX = 2000;
    const pesos = { dom: 15, fuentes: 30, sw: 20, fotos: 15, pintado: 20 };
    const hechas = new Set(["dom"]);
    const num = $("#ap-num");
    let mostrado = 0, t0 = performance.now(), fin = false;
    const objetivo = () => [...hechas].reduce((a, k) => a + pesos[k], 0);
    function completar(k) { if (pesos[k]) hechas.add(k); }
    function pintarAvance(v) {
      el.style.setProperty("--ap-p", v.toFixed(2));
      num.textContent = Math.round(v);
      el.setAttribute("aria-valuenow", Math.round(v));
    }
    function cuadro(t) {
      if (fin) return;
      const pasado = t - t0;
      let meta = Math.min(objetivo(), MIN ? (pasado / MIN) * 100 : 100);
      if (pasado >= MAX) meta = 100;
      mostrado += Math.max((meta - mostrado) * 0.16, meta > mostrado ? 0.4 : 0);
      mostrado = Math.min(mostrado, meta);
      pintarAvance(mostrado);
      if (meta >= 100 && mostrado >= 99.5) return terminar();
      requestAnimationFrame(cuadro);
    }
    function terminar() {
      if (fin) return; fin = true;
      pintarAvance(100);
      el.classList.add("lista");
      setTimeout(() => {
        el.classList.add("saliendo");
        document.body.classList.remove("abriendo");
        document.body.classList.add("revelando");
        setTimeout(() => el.remove(), 800);
        setTimeout(() => document.body.classList.remove("revelando"), 1400);
      }, reducido ? 0 : 260);
    }
    el.addEventListener("click", () => { if (performance.now() - t0 > 250) { hechas.add("fuentes"); hechas.add("sw"); hechas.add("fotos"); hechas.add("pintado"); terminar(); } });
    addEventListener("keydown", (e) => { if (!fin && (e.key === "Enter" || e.key === " " || e.key === "Escape")) terminar(); });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => completar("fuentes"));
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    ("serviceWorker" in navigator ? Promise.race([navigator.serviceWorker.ready, espera(1200)]) : Promise.resolve()).then(() => completar("sw"));
    listaFotos.then(() => {
      completar("fotos");
      if (fotosDisponibles && fotosDisponibles.has("img/logo-asocomunal.png")) {
        const img = new Image(); img.alt = "Logo de ASOCOMUNAL San Martín de Loba";
        img.onload = () => { const c = $("#ap-logo"); if (c) { c.innerHTML = ""; c.appendChild(img); } };
        img.src = "img/logo-asocomunal.png";
      }
    });
    requestAnimationFrame(cuadro);
    return { completar };
  })();

  aplicarAjustes();
  estadoRed();
  pintar();
  Apertura.completar("pintado");
  sincronizar(false);
})();
