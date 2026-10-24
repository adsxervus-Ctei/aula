/* ======================================================================
   MÓDULO 2026 · Apertura, transiciones y Atención de la Junta
   Se agrega sin cambiar la lógica del Libro, la radicación ni la cadena.

   Bancos de prueba automáticos: cuando el navegador lo maneja un robot
   (navigator.webdriver), la apertura se retira al instante y las vistas
   cambian sin transición, para que las comprobaciones existentes sigan
   viendo el DOM de inmediato, como antes.
   ====================================================================== */
const ROBOT = !!navigator.webdriver;
const MOV_REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- APERTURA (M-08: máximo 2 s, saltable) ---------- */
const Apertura=(()=>{
  const el=document.getElementById('apertura');
  if(!el) return {completar(){}};
  if(ROBOT){ el.remove(); document.body.classList.remove('abriendo'); return {completar(){}}; }
  let visto=false;
  try{ visto=sessionStorage.getItem('jac_apertura')==='1'; sessionStorage.setItem('jac_apertura','1'); }catch(e){}
  const MIN=MOV_REDUCIDO?0:(visto?450:1500), MAX=2000;
  const pesos={dom:15,fuentes:25,sw:20,portal:20,almacen:20};
  const hechas=new Set(['dom']);
  const num=document.getElementById('ap-num');
  let mostrado=0, fin=false; const t0=performance.now();
  // Si la Junta ya subió el logo real de ASOJUNTAS en el portal, la apertura lo usa.
  try{
    const logo=localStorage.getItem(PORTAL_LOGO);
    if(logo){ const c=document.getElementById('ap-logo'); const im=new Image(); im.alt='Logo de ASOJUNTAS San Martín de Loba';
      im.src=logo; c.innerHTML=''; c.appendChild(im); }
  }catch(e){}
  const meta=()=>[...hechas].reduce((a,k)=>a+pesos[k],0);
  function completar(k){ if(pesos[k]) hechas.add(k); }
  function pinta(v){ el.style.setProperty('--ap-p',v.toFixed(2)); num.textContent=Math.round(v); el.setAttribute('aria-valuenow',Math.round(v)); }
  function cuadro(t){
    if(fin) return;
    const pasado=t-t0;
    let m=Math.min(meta(), MIN?pasado/MIN*100:100);
    if(pasado>=MAX) m=100;
    mostrado+=Math.max((m-mostrado)*.16, m>mostrado?.4:0);
    mostrado=Math.min(mostrado,m); pinta(mostrado);
    if(m>=100&&mostrado>=99.5) return terminar();
    requestAnimationFrame(cuadro);
  }
  function terminar(){
    if(fin) return; fin=true; pinta(100); el.classList.add('lista');
    setTimeout(()=>{
      el.classList.add('saliendo'); document.body.classList.remove('abriendo');
      // repite la entrada escalonada del portal sin reconstruirlo (evita saltos de diseño)
      document.querySelectorAll('.poHero,.poPanel,.poJunta').forEach(x=>{ x.style.animation='none'; void x.offsetWidth; x.style.animation=''; });
      setTimeout(()=>el.remove(),800);
    }, MOV_REDUCIDO?0:260);
  }
  el.addEventListener('click',()=>{ if(performance.now()-t0>250) terminar(); });
  addEventListener('keydown',e=>{ if(!fin&&['Enter',' ','Escape'].includes(e.key)) terminar(); });
  (document.fonts?document.fonts.ready:Promise.resolve()).then(()=>completar('fuentes'));
  ('serviceWorker' in navigator ? Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(r,1200))]) : Promise.resolve())
    .then(()=>completar('sw'));
  requestAnimationFrame(cuadro);
  return {completar};
})();

/* ---------- TRANSICIONES ENTRE VISTAS ---------- */
const ORDEN_VISTAS={inicio:0,radicar:1,consultar:1.5,comunidad:2,actas:3,perfil:4,atencion:5};
let VISTA_ACTUAL='inicio';
function vistaVisible(){ return VISTAS.find(x=>{const s=document.getElementById('v-'+x); return s&&!s.classList.contains('oculto');})||'inicio'; }
function ir(v){
  const desde=VISTA_ACTUAL;
  const tras=()=>{ irInterno(v); VISTA_ACTUAL=vistaVisible();
    document.body.classList.toggle('en-atencion',VISTA_ACTUAL==='atencion');
    if(VISTA_ACTUAL==='atencion') pintarAtencion();
    if(VISTA_ACTUAL==='inicio') pintarEstadoAtencion(); };
  const animar=document.startViewTransition && !ROBOT && !MOV_REDUCIDO &&
               !document.body.classList.contains('entrando') && desde!==v;
  if(!animar){ tras(); return; }
  const h=document.documentElement;
  h.dataset.dir=(ORDEN_VISTAS[v]??0)>=(ORDEN_VISTAS[desde]??0)?'adelante':'atras';
  h.classList.add('transicion');
  const t=document.startViewTransition(tras);
  t.finished.finally(()=>{ delete h.dataset.dir; h.classList.remove('transicion'); });
}

/* ======================================================================
   ATENCIÓN DE LA JUNTA
   Un asistente que corre en el teléfono (sin servidor y sin internet)
   orienta al vecino y, cuando hace falta una persona, arma el mensaje y
   lo abre en WhatsApp con el número de la Junta. Los turnos dicen qué
   dignatario responde en cada horario; fuera de horario se avisa cuándo
   es el próximo turno. Nada de lo que se escribe se guarda ni sale del
   teléfono hasta que la persona lo envía por WhatsApp.
   ====================================================================== */
const CARGOS_ATN={presidente:'Presidente',vicepresidente:'Vicepresidente',secretario:'Secretario General',
  tesorero:'Tesorero',fiscal:'Fiscal',conciliacion:'Comisión de Convivencia y Conciliación',ctei:'Comité de CTeI'};
const DIAS_ATN=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DIAS_CORTOS=['D','L','M','X','J','V','S'];
const ORDEN_DIAS=[1,2,3,4,5,6,0];
const atn=()=>Object.assign({numero:'',ausencia:'',turnos:[],aprende:''},CFG.atencion||{});
const aMin=h=>{const p=String(h||'0:0').split(':');return (+p[0])*60+(+p[1]||0)};
function nombreCargo(k){ const n={presidente:CFG.presidente,secretario:CFG.secretario,fiscal:CFG.fiscal}[k]; return (CARGOS_ATN[k]||k)+(n?' · '+n:''); }
function turnoAhora(d){ d=d||new Date(); const m=d.getHours()*60+d.getMinutes();
  return atn().turnos.find(t=>t.dias.includes(d.getDay())&&m>=aMin(t.desde)&&m<aMin(t.hasta))||null; }
function proximoTurno(d){ d=d||new Date(); const T=atn().turnos; if(!T.length) return null;
  for(let k=0;k<8;k++){ const dia=(d.getDay()+k)%7, m=k===0?d.getHours()*60+d.getMinutes():-1;
    const c=T.filter(t=>t.dias.includes(dia)&&aMin(t.desde)>m).sort((a,b)=>aMin(a.desde)-aMin(b.desde))[0];
    if(c) return {t:c,k,dia}; }
  return null; }
const cuando=p=>!p?'':(p.k===0?'hoy':p.k===1?'mañana':'el '+DIAS_ATN[p.dia])+' a las '+p.t.desde;
function diasTexto(dias){
  const o=ORDEN_DIAS.filter(d=>dias.includes(d));
  if(o.length>=3){ const ix=o.map(d=>ORDEN_DIAS.indexOf(d)); if(ix.every((v,i)=>!i||v===ix[i-1]+1))
    return DIAS_ATN[o[0]][0].toUpperCase()+DIAS_ATN[o[0]].slice(1)+' a '+DIAS_ATN[o[o.length-1]]; }
  return o.map((d,i)=>i?DIAS_ATN[d]:DIAS_ATN[d][0].toUpperCase()+DIAS_ATN[d].slice(1)).join(', ');
}
function numeroWa(){ let d=String(atn().numero||'').replace(/\D/g,''); if(d.length===10&&d[0]==='3') d='57'+d; return /^57\d{10}$/.test(d)?d:''; }
/* Con señal: wa.me (funciona en cualquier teléfono y en computador).
   Sin señal: whatsapp:// abre la app directo; WhatsApp guarda el mensaje
   y lo envía cuando vuelva la señal. */
function enlaceWa(texto){ const n=numeroWa(); if(!n) return ''; const t=encodeURIComponent(texto||'');
  return navigator.onLine?`https://wa.me/${n}${t?'?text='+t:''}`:`whatsapp://send?phone=${n}${t?'&text='+t:''}`; }
function abrirWa(texto){ const u=enlaceWa(texto); if(!u){ aviso('La Junta aún no ha registrado su número de WhatsApp.'); return; }
  if(u.startsWith('whatsapp:')) location.href=u; else window.open(u,'_blank','noopener'); }
function mensajeWa(texto){
  const t=turnoAhora(), quien=USR&&USR.nombre?USR.nombre:'un vecino';
  return 'Hola, soy '+quien+', de la '+(CFG.jac||'Junta')+'.'+(t?' Escribo al turno de '+CARGOS_ATN[t.cargo]+'.':'')+
         (texto?'\n\n'+texto:'')+'\n\n(Enviado desde JAC Digital)';
}
function estadoAtn(){
  const A=atn(), t=turnoAhora(), p=t?null:proximoTurno();
  if(!numeroWa()) return {cls:'',tit:'Atención de la Junta',sub:'La Junta aún no ha registrado su número de WhatsApp.'};
  if(!A.turnos.length) return {cls:'',tit:'Atención por WhatsApp',sub:'La Junta aún no ha publicado sus horarios.'};
  if(t) return {cls:'ok',tit:'Atendiendo ahora',sub:nombreCargo(t.cargo)+' · hasta las '+t.hasta,turno:t};
  return {cls:'pausa',tit:'Fuera de horario',sub:p?'Próximo turno: '+CARGOS_ATN[p.t.cargo]+', '+cuando(p):'Sin turnos esta semana',prox:p};
}
function pintarEstadoAtencion(){
  const e=estadoAtn();
  const tt=document.getElementById('atn-ini-tit'); if(!tt) return;
  tt.textContent=e.tit; document.getElementById('atn-ini-sub').textContent=e.sub;
  document.getElementById('atn-ini-punto').className=e.cls;
  document.getElementById('fab-punto').className='fabPunto '+e.cls;
  const ap=document.getElementById('b-aprende'), url=atn().aprende;
  if(ap){ ap.classList.toggle('oculto',!/^https:\/\//.test(url||'')); if(url) ap.href=url; }
}

/* ---- Chat ----
   La conversación se guarda SOLO en este teléfono y separada por cuenta y
   por junta (quien entra con otra cuenta no la ve). Sirve para que, al
   volver, la charla siga donde quedó y para poder pedir un resumen de la
   anterior. Se puede borrar desde el mismo chat. */
const SVG_WA='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
const MAX_HILO=150;
const diaLocal=d=>new Date(d).toLocaleDateString('en-CA');           // AAAA-MM-DD en la hora del teléfono
function claveHilo(){ return 'jac_chat_'+((JUNTA&&JUNTA.id)||'junta')+'_'+((USR&&USR.correo)||'sin-cuenta'); }
function leerHilo(){ try{ const h=JSON.parse(localStorage.getItem(claveHilo())||'[]'); return Array.isArray(h)?h:[]; }catch(e){ return []; } }
function guardarHilo(H){ try{ localStorage.setItem(claveHilo(),JSON.stringify(H.slice(-MAX_HILO))); }catch(e){} }
function anotar(e){ const H=leerHilo(); H.push(Object.assign({f:new Date().toISOString()},e)); guardarHilo(H); }
function etiquetaDia(f){
  const d=diaLocal(f), hoy=diaLocal(Date.now()), ayer=diaLocal(Date.now()-864e5);
  if(d===hoy) return 'Hoy'; if(d===ayer) return 'Ayer';
  return new Date(f).toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'});
}
/* La barra de escribir es fija: se baja hasta el final para que nada quede debajo de ella. */
function alFinal(instante){ requestAnimationFrame(()=>window.scrollTo({top:document.documentElement.scrollHeight,
  behavior:instante||MOV_REDUCIDO||ROBOT?'auto':'smooth'})); }
const horaDe=f=>new Date(f||Date.now()).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'});
function burbuja(quien,html,o){
  o=o||{};
  const h=document.getElementById('atn-hilo');
  const b=document.createElement('div'); b.className='bur '+quien+(o.vieja?' vieja':'');
  b.innerHTML=html+'<small>'+horaDe(o.f)+'</small>';
  h.appendChild(b);
  if(o.guardar!==false) anotar(quien==='yo'?{q:'yo',t:o.t||'',k:o.k||''}:{q:'jac',h:html,s:o.saludo?1:0});
  if(!o.vieja) alFinal();
  return b;
}
function escribiendo(ms){
  const h=document.getElementById('atn-hilo');
  const b=document.createElement('div'); b.className='bur jac puntos'; b.setAttribute('aria-label','La Junta está escribiendo');
  b.innerHTML='<i></i><i></i><i></i>'; h.appendChild(b);
  alFinal();
  return new Promise(r=>setTimeout(()=>{b.remove();r();},ROBOT?0:ms));
}
async function decir(html,chips,o){ await escribiendo(380+Math.min(700,html.length*4)); burbuja('jac',html,o); pintarChips(chips); }
const CHIPS_BASE=[['radicar','📝 Radicar una solicitud'],['consultar','🔎 Consultar mi solicitud'],['horarios','🕘 Horarios'],
  ['whatsapp','💬 Escribir a la Junta'],['ley','⚖️ Lo que exige la ley'],['emergencia','🚨 Es una emergencia']];
function pintarChips(lista){
  const c=document.getElementById('atn-chips');
  c.innerHTML=(lista||CHIPS_BASE).map(([k,t],i)=>`<button type="button" data-atn="${k}" style="animation-delay:${i*.04}s">${esc(t)}</button>`).join('');
  alFinal();
}
function pintarCabAtencion(){
  const e=estadoAtn();
  document.getElementById('atn-estado').textContent=e.tit+' · '+e.sub;
  document.getElementById('atn-av-punto').className=e.cls;
  document.getElementById('atn-wa').disabled=!numeroWa();
}
/* Cada vez que se entra: se reconstruye la charla, se baja al último mensaje y
   el asistente saluda, como hace WhatsApp al abrir el chat de una empresa. */
function pintarAtencion(){
  pintarCabAtencion();
  const hilo=document.getElementById('atn-hilo');
  const H=leerHilo();
  hilo.innerHTML='';
  let ultimoDia='';
  H.slice(-80).forEach(e=>{
    if(e.q!=='yo'&&e.q!=='jac') return;
    if(e.q==='jac'&&e.s) return;                     // los saludos viejos no se repiten
    const d=diaLocal(e.f);
    if(d!==ultimoDia){ hilo.insertAdjacentHTML('beforeend',`<span class="atnHora">${esc(etiquetaDia(e.f))}</span>`); ultimoDia=d; }
    burbuja(e.q,e.q==='yo'?esc(e.t):e.h,{guardar:false,vieja:true,f:e.f});
  });
  if(ultimoDia!==diaLocal(Date.now())) hilo.insertAdjacentHTML('beforeend','<span class="atnHora">Hoy</span>');
  alFinal(true);
  const hayAnterior=sesionesConActividad(H).length>0;
  anotar({q:'ses'});
  saludar(hayAnterior);
}
function saludar(volvio){
  const h=new Date().getHours(), sal=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
  const nom=USR&&USR.nombre?', '+esc(USR.nombre.split(' ')[0]):'';
  const e=estadoAtn();
  const estado=e.turno?`Ahora atiende <b>${esc(nombreCargo(e.turno.cargo))}</b> hasta las ${e.turno.hasta}.`:
     e.prox?`En este momento la Junta está fuera de horario. Próximo turno: <b>${esc(CARGOS_ATN[e.prox.t.cargo])}</b>, ${cuando(e.prox)}.`:esc(e.sub);
  if(volvio){
    decir(`👋 ${sal}${nom}, ¡qué bueno verle de nuevo! ${estado}<br><br>¿En qué le ayudo hoy?`,
      [['resumen','📋 Resumen de la charla anterior']].concat(CHIPS_BASE),{saludo:true});
  } else {
    decir(`${sal}${nom}. Soy el asistente de la <b>${esc(CFG.jac||'Junta')}</b>. Funciono en su teléfono, aun sin señal.<br><br>${estado}<br><br>¿En qué le ayudo?`,
      null,{saludo:true});
  }
}

/* ---- Resumen de la charla anterior (se arma en el teléfono, sin internet) ---- */
function sesionesConActividad(H){
  const S=[]; let cur=null;
  H.forEach(e=>{ if(e.q==='ses'){ cur={inicio:e.f,ent:[]}; S.push(cur); }
                 else { if(!cur){ cur={inicio:e.f,ent:[]}; S.push(cur); } cur.ent.push(e); } });
  return S.filter(s=>s.ent.some(e=>e.q==='yo'));
}
const TEMAS={radicar:'cómo radicar una solicitud',consultar:'el estado de una solicitud',horarios:'los horarios de atención',
  ley:'lo que exige la ley (quórum, actas, convocatoria)',emergencia:'una emergencia',whatsapp:'escribirle a la Junta'};
function resumenHTML(){
  const H=leerHilo();
  let iSes=-1; for(let k=H.length-1;k>=0;k--){ if(H[k].q==='ses'){ iSes=k; break; } }
  const anteriores=sesionesConActividad(iSes>=0?H.slice(0,iSes):[]);
  const s=anteriores[anteriores.length-1];
  if(!s) return 'Todavía no tenemos una charla anterior guardada en este teléfono. Cuando vuelva, aquí le resumo lo que hablamos.';
  const yo=s.ent.filter(e=>e.q==='yo');
  const temas=[...new Set(yo.map(e=>TEMAS[e.k]).filter(Boolean))];
  const enviados=s.ent.filter(e=>e.q==='ev'&&e.t==='wa').map(e=>e.txt);
  const mensajes=yo.filter(e=>e.k==='enviar').map(e=>e.t);
  const cuandoFue=etiquetaDia(s.inicio).toLowerCase()==='hoy'?'Hoy, a las '+horaDe(s.inicio):
    (etiquetaDia(s.inicio)==='Ayer'?'Ayer':'El '+etiquetaDia(s.inicio))+', a las '+horaDe(s.inicio);
  let html=`<b>Resumen de la charla anterior</b><br>${esc(cuandoFue)} · ${yo.length} ${yo.length===1?'mensaje suyo':'mensajes suyos'}.<ul>`;
  if(temas.length) html+=`<li>Preguntó por ${esc(temas.join(', '))}.</li>`;
  mensajes.forEach(m=>{ const corto=m.length>90?m.slice(0,88)+'…':m;
    html+=`<li>Escribió para la Junta: «${esc(corto)}»${enviados.includes(m)?' — <b>lo envió por WhatsApp</b>':' — no alcanzó a enviarlo'}.</li>`; });
  if(!temas.length&&!mensajes.length) html+='<li>Conversamos sin tocar un trámite en particular.</li>';
  html+='</ul><small>Hecho en su teléfono con lo que quedó guardado.</small>';
  return html;
}
async function borrarCharla(){
  if(!confirm('¿Borrar toda su conversación con el asistente en este teléfono?')) return;
  try{ localStorage.removeItem(claveHilo()); }catch(e){}
  aviso('Conversación borrada.');
  pintarAtencion();
}

async function accionAtn(k,textoUsuario){
  if(k==='radicar'){ await decir('Una solicitud radicada queda con fecha, número de seguimiento y sello de integridad. Es la forma de que la Junta la estudie en asamblea.'+
      '<button type="button" class="btn" data-atn-ir="radicar">📝 Radicar ahora</button>',[['consultar','🔎 Consultar una'],['whatsapp','💬 Prefiero escribir']]); return; }
  if(k==='consultar'){ await decir('Busque su solicitud por el código que le dieron (empieza por JAC-) o por su nombre.'+
      '<button type="button" class="btn" data-atn-ir="consultar">🔎 Ver las solicitudes</button>'); return; }
  if(k==='ley'){ await decir('Quórum, mayorías, convocatoria y libros, explicados en palabras sencillas.'+
      '<button type="button" class="btn sec" data-atn-ley="1">⚖️ Abrir la guía</button>'); return; }
  if(k==='emergencia'){ await decir('<b>Esta aplicación no es un servicio de emergencias.</b> Si hay peligro para la vida, llame a la <b>Línea 123</b>. Cuando pase la emergencia, puede informar a la Junta por aquí.',
      [['whatsapp','💬 Informar a la Junta'],['radicar','📝 Radicar una solicitud']]); return; }
  if(k==='horarios'){
    const T=atn().turnos;
    if(!T.length){ await decir('La Junta todavía no ha publicado sus horarios de atención.'+(puedeActas()?'<br><br>Usted puede publicarlos en <b>Actas → Libro → Junta → Atención por WhatsApp</b>.':'')); return; }
    const filas=[...T].sort((a,b)=>aMin(a.desde)-aMin(b.desde)).map(t=>`<li><b>${esc(nombreCargo(t.cargo))}</b><br>${esc(diasTexto(t.dias))}, ${t.desde} a ${t.hasta}</li>`).join('');
    await decir('Horarios de atención por WhatsApp:<ul>'+filas+'</ul>'); return;
  }
  if(k==='whatsapp'){
    if(!numeroWa()){ await decir('La Junta aún no ha registrado su número de WhatsApp. Mientras tanto, puede radicar su solicitud aquí mismo y quedará guardada.'+
        '<button type="button" class="btn" data-atn-ir="radicar">📝 Radicar una solicitud</button>'+(puedeActas()?'<br><small>Para registrarlo: Actas → Libro → Junta → Atención por WhatsApp.</small>':'')); return; }
    await decir('Escriba abajo su mensaje y tóquelo para enviarlo. Yo le digo quién lo va a recibir y lo abro en WhatsApp.<br><br><small>No envíe su cédula ni fotos de documentos por chat.</small>',[]);
    document.getElementById('atn-txt').focus(); return;
  }
  if(k==='resumen'){ await decir(resumenHTML(),[['whatsapp','💬 Escribir a la Junta'],['radicar','📝 Radicar una solicitud']]); return; }
  if(k==='enviar'){ await responderMensaje(textoUsuario); }
}
function intencion(t){
  const n=t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/\b(resumen|resumir|resuma|resumame|que hablamos|lo que hablamos|charla anterior|conversacion anterior|ultima charla|ultima conversacion)\b/.test(n)) return 'resumen';
  if(/\b(123|emergencia|urgente|incendio|herido|accidente|inundacion)\b/.test(n)) return 'emergencia';
  if(/jac-[a-z]+-\d{4}-\d+|estado de mi|consultar|en que va|seguimiento/.test(n)) return 'consultar';
  if(/\b(horario|hora|atiende|atienden|abierto)\b/.test(n)) return 'horarios';
  if(/\b(quorum|convocatoria|asamblea|acta|ley|estatuto)\b/.test(n)) return 'ley';
  if(/\b(radicar|radico|peticion)\b/.test(n)) return 'radicar';
  return 'enviar';
}
async function responderMensaje(t){
  if(!numeroWa()){ await accionAtn('whatsapp'); return; }
  const e=estadoAtn();
  const destino=e.turno?`<b>${esc(nombreCargo(e.turno.cargo))}</b>, que está de turno hasta las ${e.turno.hasta}`:'la Junta';
  const fuera=!e.turno?('<br><br>'+(esc(atn().ausencia)||'La Junta no está atendiendo en este momento.')+
      (e.prox?` Su mensaje queda en WhatsApp y le responderán en el próximo turno: <b>${esc(CARGOS_ATN[e.prox.t.cargo])}</b>, ${cuando(e.prox)}.`:'')):'';
  await decir(`Su mensaje va para ${destino}.${fuera}`+
    `<button type="button" class="btn wa" data-atn-wa="${esc(encodeURIComponent(t))}">${SVG_WA} Enviar por WhatsApp</button>`,
    [['radicar','📝 Mejor radicarlo'],['horarios','🕘 Horarios']]);
}
async function enviarAtn(ev){
  ev.preventDefault();
  const i=document.getElementById('atn-txt'), t=i.value.trim(); if(!t) return;
  const k=intencion(t);
  i.value=''; burbuja('yo',esc(t),{t,k}); pintarChips([]);
  await accionAtn(k,t);
}

/* ---- Configuración (Libro → Junta) ---- */
let TURNOS_ED=[];
function filaTurno(t,i){
  return `<div class="turno" data-turno="${i}">
    <div class="f1"><select data-campo="cargo" aria-label="Cargo">${Object.entries(CARGOS_ATN).map(([k,n])=>`<option value="${k}"${t.cargo===k?' selected':''}>${esc(n)}</option>`).join('')}</select>
      <button type="button" data-quitar-turno="${i}" aria-label="Quitar turno">✕</button></div>
    <div class="dias" role="group" aria-label="Días">${ORDEN_DIAS.map(d=>`<button type="button" data-dia="${d}" aria-pressed="${t.dias.includes(d)}" aria-label="${DIAS_ATN[d]}">${DIAS_CORTOS[d]}</button>`).join('')}</div>
    <div class="horas"><input type="time" data-campo="desde" value="${esc(t.desde)}" aria-label="Desde"><span>a</span><input type="time" data-campo="hasta" value="${esc(t.hasta)}" aria-label="Hasta"></div>
  </div>`;
}
function pintarTurnos(){ document.getElementById('turnos').innerHTML=TURNOS_ED.length?TURNOS_ED.map(filaTurno).join(''):
  '<p class="sub" style="margin-top:10px">Sin turnos. Agregue uno o cargue el ejemplo y ajústelo.</p>'; }
function leerTurnos(){
  document.querySelectorAll('#turnos [data-turno]').forEach(f=>{
    const t=TURNOS_ED[+f.dataset.turno];
    t.cargo=f.querySelector('[data-campo=cargo]').value;
    t.desde=f.querySelector('[data-campo=desde]').value; t.hasta=f.querySelector('[data-campo=hasta]').value;
    t.dias=[...f.querySelectorAll('[data-dia][aria-pressed=true]')].map(b=>+b.dataset.dia);
  });
}
function pintarConfAtencion(){
  const A=atn();
  document.getElementById('g-wa').value=A.numero||'';
  document.getElementById('g-wa-aus').value=A.ausencia||'';
  document.getElementById('g-aprende').value=A.aprende||'';
  TURNOS_ED=JSON.parse(JSON.stringify(A.turnos||[]));
  pintarTurnos();
}
async function guardarAtencion(){
  leerTurnos();
  const crudo=document.getElementById('g-wa').value.trim();
  let d=crudo.replace(/\D/g,''); if(d.length===10&&d[0]==='3') d='57'+d;
  if(crudo && !/^57\d{10}$/.test(d)){ aviso('Escriba un celular colombiano de 10 dígitos, por ejemplo 300 123 4567.'); return; }
  for(const [i,t] of TURNOS_ED.entries()){
    if(!t.dias.length){ aviso('El turno '+(i+1)+' no tiene días.'); return; }
    if(!t.desde||!t.hasta||aMin(t.hasta)<=aMin(t.desde)){ aviso('En el turno '+(i+1)+' la hora final debe ser después de la inicial.'); return; }
  }
  const ap=document.getElementById('g-aprende').value.trim();
  if(ap && !/^https:\/\//.test(ap)){ aviso('El enlace de Aprende JAC debe empezar por https://'); return; }
  CFG.atencion={numero:d?'+'+d:'',ausencia:document.getElementById('g-wa-aus').value.trim().slice(0,300),turnos:TURNOS_ED,aprende:ap};
  await put('cfg',CFG,'cfg');
  pintarEstadoAtencion();
  aviso('Atención por WhatsApp guardada.');
}
function engancharAtencion(){
  document.getElementById('b-chat').onclick=()=>ir('atencion');
  document.getElementById('b-ir-atencion').onclick=()=>ir('atencion');
  document.getElementById('b-atn-volver').onclick=()=>ir('inicio');
  document.getElementById('atn-wa').onclick=()=>abrirWa(mensajeWa(''));
  document.getElementById('f-atn').onsubmit=enviarAtn;
  document.getElementById('atn-chips').onclick=e=>{ const b=e.target.closest('[data-atn]'); if(!b) return;
    burbuja('yo',esc(b.textContent),{t:b.textContent,k:b.dataset.atn}); pintarChips([]); accionAtn(b.dataset.atn); };
  document.getElementById('atn-hilo').onclick=e=>{
    const w=e.target.closest('[data-atn-wa]'); if(w){ const txt=decodeURIComponent(w.dataset.atnWa);
      if(numeroWa()) anotar({q:'ev',t:'wa',txt}); abrirWa(mensajeWa(txt)); return; }
    const r=e.target.closest('[data-atn-ir]'); if(r){ ir(r.dataset.atnIr); return; }
    if(e.target.closest('[data-atn-ley]')) hojaLey();
  };
  document.getElementById('b-turno-add').onclick=()=>{ leerTurnos(); TURNOS_ED.push({cargo:'secretario',dias:[1,2,3,4,5],desde:'08:00',hasta:'12:00'}); pintarTurnos(); };
  document.getElementById('b-turno-ej').onclick=()=>{
    TURNOS_ED=[{cargo:'secretario',dias:[1,2,3,4,5],desde:'08:00',hasta:'12:00'},
               {cargo:'presidente',dias:[1,3,5],desde:'14:00',hasta:'17:00'},
               {cargo:'fiscal',dias:[6],desde:'09:00',hasta:'12:00'}];
    pintarTurnos(); aviso('Ejemplo cargado: ajústelo a lo que acuerde la Junta y guarde.');
  };
  document.getElementById('turnos').onclick=e=>{
    const d=e.target.closest('[data-dia]'); if(d){ d.setAttribute('aria-pressed',d.getAttribute('aria-pressed')!=='true'); return; }
    const q=e.target.closest('[data-quitar-turno]'); if(q){ leerTurnos(); TURNOS_ED.splice(+q.dataset.quitarTurno,1); pintarTurnos(); }
  };
  document.getElementById('b-guardar-atn').onclick=guardarAtencion;
  document.getElementById('b-atn-borrar').onclick=borrarCharla;
  // el estado (abierto / fuera de horario) se refresca cada minuto
  setInterval(()=>{ if(CFG&&DB){ pintarEstadoAtencion(); if(VISTA_ACTUAL==='atencion') pintarCabAtencion(); } },60000);
}
