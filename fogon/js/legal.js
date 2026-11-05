/* Llena la política de datos con los datos del negocio (js/config.js). */
(function () {
  'use strict';
  const n = (window.CONFIG && window.CONFIG.negocio) || {};
  const pon = (sel, txt) => { if (txt) document.querySelectorAll(sel).forEach(e => { e.textContent = txt; }); };
  pon('[data-negocio]', n.nombre);
  pon('[data-direccion]', n.direccion);
  pon('[data-municipio]', n.municipio);
  const wa = String(n.whatsapp || '').replace(/\D/g, '');
  const partes = [];
  if (n.correo) partes.push('correo ' + n.correo);
  if (wa.length === 10) partes.push('WhatsApp ' + wa.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'));
  if (n.telefono) partes.push('teléfono ' + n.telefono);
  if (partes.length) pon('[data-contacto]', partes.join(' · ') + ', o por el chat de la app');
  if (n.nombre) document.title = 'Política de datos · ' + n.nombre;
})();
