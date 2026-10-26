/* ============================================================
   MESA Y RUTA · generador de Excel (.xlsx) sin dependencias pesadas
   Arma el libro con varias hojas (encabezado en negrita, columnas con
   ancho, formato de pesos y de fecha) y lo comprime con fflate.
   ============================================================ */
(function () {
  'use strict';
  const xml = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26 | 0; } return s; };
  // estilos: 0 normal · 1 encabezado · 2 pesos · 3 fecha · 4 título · 5 pesos en negrita
  const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E1A17"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  const fechaSerial = d => (d.getTime() - d.getTimezoneOffset() * 60000) / 86400000 + 25569;
  function celda(ref, v, tipo, estiloForzado) {
    if (v === null || v === undefined || v === '') return '';
    if (tipo === 'pesos' || tipo === 'numero') { const n = Number(v); if (!isFinite(n)) return ''; return `<c r="${ref}"${tipo === 'pesos' || estiloForzado ? ` s="${estiloForzado || 2}"` : ''}><v>${n}</v></c>`; }
    if (tipo === 'fecha') { const d = v instanceof Date ? v : new Date(v); if (isNaN(d)) return ''; return `<c r="${ref}" s="3"><v>${fechaSerial(d)}</v></c>`; }
    return `<c r="${ref}" t="inlineStr"${estiloForzado ? ` s="${estiloForzado}"` : ''}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }
  function hoja(h) {
    let filas = '', r = 1;
    if (h.titulo) { filas += `<row r="${r}">${celda('A' + r, h.titulo, 'texto', 4)}</row>`; r++; if (h.subtitulo) { filas += `<row r="${r}">${celda('A' + r, h.subtitulo, 'texto')}</row>`; r++; } r++; }
    filas += `<row r="${r}">${h.columnas.map((c, k) => celda(col(k) + r, c.titulo, 'texto', 1)).join('')}</row>`; const enc = r; r++;
    for (const f of h.filas) { filas += `<row r="${r}">${f.map((v, k) => celda(col(k) + r, v, (h.columnas[k] || {}).tipo || 'texto', f.negrita && (h.columnas[k] || {}).tipo === 'pesos' ? 5 : 0)).join('')}</row>`; r++; }
    const anchos = `<cols>${h.columnas.map((c, k) => `<col min="${k + 1}" max="${k + 1}" width="${c.ancho || 16}" customWidth="1"/>`).join('')}</cols>`;
    const congelar = `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${enc}" topLeftCell="A${enc + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${congelar}${anchos}<sheetData>${filas}</sheetData>${h.filas.length ? `<autoFilter ref="A${enc}:${col(h.columnas.length - 1)}${enc + h.filas.length}"/>` : ''}</worksheet>`;
  }
  function crear(hojas) {
    const enc = new TextEncoder(), f = {};
    const nombre = s => s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    f['[Content_Types].xml'] = enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((h, k) => `<Override PartName="/xl/worksheets/sheet${k + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    f['_rels/.rels'] = enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
    f['docProps/core.xml'] = enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Consolidado de ventas</dc:title><dc:creator>Mesa y Ruta</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`);
    f['xl/workbook.xml'] = enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h, k) => `<sheet name="${xml(nombre(h.nombre))}" sheetId="${k + 1}" r:id="rId${k + 1}"/>`).join('')}</sheets></workbook>`);
    f['xl/_rels/workbook.xml.rels'] = enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((h, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${k + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    f['xl/styles.xml'] = enc.encode(ESTILOS);
    hojas.forEach((h, k) => { f[`xl/worksheets/sheet${k + 1}.xml`] = enc.encode(hoja(h)); });
    const zip = window.fflate.zipSync(f, { level: 6 });
    return new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function csv(h) {
    const q = v => { const s = v === null || v === undefined ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + [h.columnas.map(c => q(c.titulo)).join(';'), ...h.filas.map(f => f.map(q).join(';'))].join('\r\n');
  }
  window.XLSX_MYR = { crear, csv };
})();
