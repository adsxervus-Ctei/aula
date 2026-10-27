/* ============================================================
   MESA Y RUTA · informe en pantalla con botones de PDF
   Muestra las tablas dentro de la app (no en una ventana aparte, que
   los celulares bloquean) y ofrece: Descargar PDF, Imprimir,
   Compartir y Cerrar. El PDF se arma en el propio teléfono con jsPDF
   (licencia MIT), que se carga solo cuando se necesita.
   ============================================================ */
(function () {
  'use strict';
  const N = window.N, U = N.U, C = window.CONFIG;
  const { esc, pesos } = U;
  let cargando = null;
  function script(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.append(s); }); }
  function cargarPDF() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
    return cargando || (cargando = script('vendor/jspdf.umd.min.js').then(() => script('vendor/jspdf.plugin.autotable.min.js')));
  }
  const valor = (v, tipo) => v === '' || v === null || v === undefined ? '' : tipo === 'pesos' && typeof v === 'string' && !/^-?\d+$/.test(v) ? v : tipo === 'pesos' && typeof v === 'string' ? v : tipo === 'pesos' ? pesos(v) : tipo === 'fecha' ? new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : String(v);
  function cargarImg(src) { return new Promise(res => { if (!src) return res(null); const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }

  async function crearPDF(o) {
    await cargarPDF();
    const doc = new window.jspdf.jsPDF({ orientation: o.vertical ? 'portrait' : 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    // encabezado con el logo del negocio (si lo subió)
    let x = 40; const logo = await cargarImg(N.logoURL && N.logoURL());
    if (logo) { try { const cv = document.createElement('canvas'); cv.width = cv.height = 160; cv.getContext('2d').drawImage(logo, 0, 0, 160, 160); doc.addImage(cv.toDataURL('image/png'), 'PNG', 40, 28, 40, 40); x = 92; } catch (e) { /* logo de otro dominio */ } }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(30, 26, 23); doc.text(o.titulo, x, 48);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(107, 97, 89); doc.text(o.subtitulo || '', x, 64);
    let y = 88;
    for (const h of o.hojas) {
      if (!h.filas.length) continue;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 26, 23);
      if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 48; }
      doc.text(h.nombre, 40, y);
      doc.autoTable({
        startY: y + 8, margin: { left: 40, right: 40 },
        head: [h.columnas.map(c => c.titulo)],
        body: h.filas.map(f => f.map((v, k) => valor(v, (h.columnas[k] || {}).tipo))),
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 26, 23], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 245, 241] },
        columnStyles: Object.fromEntries(h.columnas.map((c, k) => [k, c.tipo === 'pesos' || c.tipo === 'numero' ? { halign: 'right' } : {}])),
        didParseCell: d => { if (d.section === 'body' && h.filas[d.row.index] && h.filas[d.row.index].negrita) d.cell.styles.fontStyle = 'bold'; }
      });
      y = doc.lastAutoTable.finalY + 28;
    }
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`${C.negocio.nombre} · Mesa y Ruta · Powered by AXERVUS CTeI · página ${i} de ${n}`, W / 2, doc.internal.pageSize.getHeight() - 18, { align: 'center' }); }
    return doc.output('blob');
  }

  function bajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); }

  function abrir(o) {
    cerrar();
    const v = document.createElement('div'); v.className = 'informeVelo'; v.id = 'informe'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', o.titulo);
    v.innerHTML = `<div class="infBarra"><button class="redondo" type="button" id="inf-cerrar" aria-label="Cerrar"><svg aria-hidden="true"><use href="#i-cerrar"/></svg></button>
        <div class="infBotones"><button class="btn oro" type="button" id="inf-pdf"><svg aria-hidden="true"><use href="#i-descargar"/></svg> Guardar PDF</button>
        <button class="btn claro" type="button" id="inf-imprimir"><svg aria-hidden="true"><use href="#i-ticket"/></svg> Imprimir</button>
        <button class="btn claro" type="button" id="inf-compartir"><svg aria-hidden="true"><use href="#i-compartir"/></svg> Compartir</button></div></div>
      <div class="infHoja" id="inf-hoja"><header><span class="logoMini marca"><svg aria-hidden="true"><use href="#i-llama"/></svg></span><div><h1>${esc(o.titulo)}</h1><p>${esc(o.subtitulo || '')}</p></div></header>
        ${o.hojas.filter(h => h.filas.length).map(h => `<h2>${esc(h.nombre)}</h2><div class="infTabla"><table><thead><tr>${h.columnas.map(c => `<th>${esc(c.titulo)}</th>`).join('')}</tr></thead><tbody>${h.filas.map(f => `<tr${f.negrita ? ' class="infNeg"' : ''}>${f.map((x, k) => `<td class="${['pesos', 'numero'].includes((h.columnas[k] || {}).tipo) ? 'n' : ''}">${esc(valor(x, (h.columnas[k] || {}).tipo))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}
        <p class="infPie">${esc(C.negocio.nombre)} · Mesa y Ruta · Powered by AXERVUS CTeI</p></div>
      <p class="nota infNota" id="inf-nota" role="status"></p>`;
    document.body.append(v); document.documentElement.classList.add('conInforme');
    const nota = t => { v.querySelector('#inf-nota').textContent = t; };
    const nombre = (o.archivo || 'informe') + '.pdf';
    let blob = null; const pdf = async () => { if (!blob) { nota('Preparando el PDF…'); blob = await crearPDF(o); nota(''); } return blob; };
    v.querySelector('#inf-cerrar').onclick = cerrar;
    v.querySelector('#inf-pdf').onclick = async () => { try { bajar(await pdf(), nombre); nota('PDF guardado en Descargas: ' + nombre); } catch (e) { nota('No se pudo crear el PDF: ' + e.message); } };
    v.querySelector('#inf-imprimir').onclick = () => { try { window.print(); } catch (e) { nota('Este navegador no deja imprimir: use «Guardar PDF» y ábralo.'); } };
    const bc = v.querySelector('#inf-compartir');
    if (!navigator.canShare) bc.hidden = true;
    bc.onclick = async () => {
      try { const f = new File([await pdf()], nombre, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: o.titulo });
        else { bajar(f, nombre); nota('Su teléfono no permite compartir archivos: se guardó en Descargas.'); }
      } catch (e) { if (e.name !== 'AbortError') nota('No se pudo compartir: ' + e.message); }
    };
    document.addEventListener('keydown', esc_);
    v.querySelector('#inf-pdf').focus();
    return v;
  }
  function esc_(e) { if (e.key === 'Escape') cerrar(); }
  function cerrar() { const v = document.getElementById('informe'); if (v) v.remove(); document.documentElement.classList.remove('conInforme'); document.removeEventListener('keydown', esc_); }
  window.INFORME = { abrir, cerrar, crearPDF, cargarPDF };
})();
