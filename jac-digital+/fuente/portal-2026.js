/* ======================================================================
   PORTAL 2026 · ASOJUNTAS San Martín de Loba
   Bienvenida con un carrusel automático de noticias y avisos arriba y,
   abajo, al alcance del pulgar, los botones de cada junta.
   Las noticias del portal viven en el almacenamiento simple del teléfono
   (como la lista de juntas y el logo): no dependen de ninguna junta.
   ====================================================================== */

/* ---------- Iconografía de línea (misma gráfica que la barra inferior) ---------- */
const ICONOS_JUNTA={
  casa:   '<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20.5h18"/>',
  palma:  '<path d="M11.5 21c0-4 .7-7.4 2-10"/><path d="M13.5 11C11.6 8 7.5 7 4.5 8.6c2.2-.2 4.4.4 6 1.8"/><path d="M13.5 11c1-3.3 4.4-5.2 7.6-4.6-2.1.5-4 1.7-5.2 3.3"/><path d="M13.5 11c-2.6-.6-5.4.4-7 2.6"/><path d="M13.5 11c2.7-.2 5.2 1.3 6.3 3.7"/><path d="M13.5 11c.2-2.6-.8-5.2-2.8-6.8"/>',
  canoa:  '<path d="M2.5 13.5h19l-1.8 3.3a2 2 0 0 1-1.8 1.1H6.1a2 2 0 0 1-1.8-1.1z"/><path d="m8.5 13.5 6.5-9"/><path d="M13.6 6.5l2.8 2"/><path d="M3 21c1.5 0 1.5-.9 3-.9s1.5.9 3 .9 1.5-.9 3-.9 1.5.9 3 .9 1.5-.9 3-.9 1.5.9 3 .9"/>',
  arbol:  '<path d="M12 21v-6"/><path d="M8 15h8a4 4 0 0 0 1-7.9A5 5 0 0 0 7.5 6 4 4 0 0 0 8 15z"/><path d="M12 15l-2.5-2.5M12 13.5l2-2"/>',
  espiga: '<path d="M12 21V8"/><path d="M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zM12 8c2-1 3-3 3-5-2 1-3 3-3 5z"/><path d="M12 13c-2-1-3.5-2.5-3.5-4.5 2 .5 3.5 2 3.5 4.5zM12 13c2-1 3.5-2.5 3.5-4.5-2 .5-3.5 2-3.5 4.5z"/><path d="M12 18c-2-1-3.5-2.5-3.5-4.5 2 .5 3.5 2 3.5 4.5zM12 18c2-1 3.5-2.5 3.5-4.5-2 .5-3.5 2-3.5 4.5z"/>',
  iglesia:'<path d="M12 2.5v4M10 4.5h4"/><path d="M6 21V11.5l6-5 6 5V21"/><path d="M10 21v-3.5a2 2 0 0 1 4 0V21"/><path d="M3 21h18"/>',
  escuela:'<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-5h6v5"/><circle cx="12" cy="11" r="1.6"/>',
  tractor:'<circle cx="7" cy="16.5" r="3.5"/><circle cx="18" cy="18" r="2"/><path d="M4 13.5V8h7l2 5h5a2 2 0 0 1 2 2v3"/><path d="M10.5 16.5H16M7 8V5"/>',
  senal:  '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/><path d="m9 14 2 2 4-4.5"/>',
  chat:   '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/>',
  mega:   '<path d="M3 10.5v3a1 1 0 0 0 1 1h2.5l7.5 4.5V5L6.5 9.5H4a1 1 0 0 0-1 1z"/><path d="M17.5 8.5a5 5 0 0 1 0 7"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  ajustes:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
/* Las juntas guardadas antes usaban un emoji como símbolo: se traduce al ícono de línea. */
const EMOJI_ICONO={'🏛️':'casa','🏛':'casa','🌴':'palma','🛶':'canoa','🌳':'arbol','🌾':'espiga','⛪':'iglesia','🏫':'escuela','🚜':'tractor'};
function svgIcono(k,cls){ return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_JUNTA[k]||ICONOS_JUNTA.casa}</svg>`; }
function iconoJunta(simbolo){ return svgIcono(EMOJI_ICONO[simbolo]||(ICONOS_JUNTA[simbolo]?simbolo:'casa')); }
/* Colores sobrios dentro de la paleta: cada junta conserva un tono propio, sin salirse del índigo. */
const COLOR_SOBRIO={'#1B7A3D':'#36347A','#36347A':'#36347A','#0E6E8C':'#33508A','#B8761A':'#4A3F86',
  '#7A3E9D':'#2F4A7A','#B03A48':'#5A3F7A','#2E7D6B':'#2E5A78','#8A5A2B':'#4B4470'};

/* ---------- Noticias del portal ---------- */
const PORTAL_NOTICIAS='jac_portal_noticias';
const NOTICIAS_BASE=[
  {tipo:'Información',titulo:'Bienvenido a ASOJUNTAS',texto:'Las juntas de acción comunal de San Martín de Loba, en un solo lugar.',arte:'casa'},
  {tipo:'Información',titulo:'Funciona sin señal',texto:'Radique solicitudes y consulte las actas de su junta aunque no haya internet.',arte:'senal'},
  {tipo:'Información',titulo:'Atención de su Junta',texto:'Escriba a su junta por WhatsApp desde la aplicación, según los turnos de atención.',arte:'chat'}
];
function leerNoticias(){ try{ const n=JSON.parse(localStorage.getItem(PORTAL_NOTICIAS)||'[]'); return Array.isArray(n)?n:[]; }catch(e){ return []; } }
function guardarNoticias(L){ try{ localStorage.setItem(PORTAL_NOTICIAS,JSON.stringify(L)); return true; }
  catch(e){ avisoSuelto('No cupo en el teléfono. Quite una noticia o use una imagen más liviana.'); return false; } }

const CARRUSEL={i:0,n:0,timer:null,pausa:false,dur:5500};
function pintarCarrusel(){
  const pista=document.getElementById('po-pista'), barras=document.getElementById('po-barras');
  if(!pista) return;
  const propias=leerNoticias();
  const L=propias.length?propias:NOTICIAS_BASE;
  pista.innerHTML=L.map((n,i)=>`
    <article class="poLam${n.img?' conImg':''}" data-i="${i}" aria-roledescription="diapositiva" aria-label="${i+1} de ${L.length}">
      ${n.img?`<img src="${n.img}" alt="" loading="${i?'lazy':'eager'}">`:
        `<div class="poArte" aria-hidden="true"><i></i><i></i>${svgIcono(n.arte||'mega')}</div>`}
      <div class="poTexto"><span class="poChip">${esc(n.tipo||'Aviso')}</span><h3>${esc(n.titulo||'')}</h3>${n.texto?`<p>${esc(n.texto)}</p>`:''}</div>
    </article>`).join('');
  barras.innerHTML=L.map(()=>'<i><b></b></i>').join('');
  CARRUSEL.n=L.length; CARRUSEL.i=0;
  marcarBarras(); programarCarrusel();
  if(!pista.dataset.enganchado){
    pista.dataset.enganchado='1';
    // el dedo manda: al tocar se pausa; al soltar sigue
    const sl=document.getElementById('po-slider');
    sl.addEventListener('pointerdown',()=>{ CARRUSEL.pausa=true; sl.classList.add('pausa'); clearTimeout(CARRUSEL.timer); });
    const seguir=()=>{ if(!CARRUSEL.pausa) return; CARRUSEL.pausa=false; sl.classList.remove('pausa'); programarCarrusel(); };
    sl.addEventListener('pointerup',seguir); sl.addEventListener('pointercancel',seguir); sl.addEventListener('pointerleave',seguir);
    let t; pista.addEventListener('scroll',()=>{ clearTimeout(t); t=setTimeout(()=>{
      const i=Math.round(pista.scrollLeft/pista.clientWidth);
      if(i!==CARRUSEL.i){ CARRUSEL.i=i; marcarBarras(); programarCarrusel(); } },90); },{passive:true});
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) clearTimeout(CARRUSEL.timer); else programarCarrusel(); });
  }
}
function marcarBarras(){
  const B=document.querySelectorAll('#po-barras i');
  B.forEach((b,k)=>{ b.className=k<CARRUSEL.i?'hecha':''; });
  const a=B[CARRUSEL.i]; if(a){ void a.offsetWidth; a.className='activa'; a.style.setProperty('--dur',CARRUSEL.dur+'ms'); }
  document.querySelectorAll('#po-pista .poLam').forEach((l,k)=>l.classList.toggle('activa',k===CARRUSEL.i));
}
function programarCarrusel(){
  clearTimeout(CARRUSEL.timer);
  const portal=document.getElementById('portal');
  if(CARRUSEL.n<2||CARRUSEL.pausa||!portal||portal.classList.contains('oculto')||MOV_REDUCIDO) return;
  CARRUSEL.timer=setTimeout(()=>irDiapositiva(CARRUSEL.i+1),CARRUSEL.dur);
}
function irDiapositiva(i){
  const pista=document.getElementById('po-pista'); if(!pista||!CARRUSEL.n) return;
  CARRUSEL.i=(i+CARRUSEL.n)%CARRUSEL.n;
  pista.scrollTo({left:CARRUSEL.i*pista.clientWidth,behavior:MOV_REDUCIDO||ROBOT?'auto':'smooth'});
  marcarBarras(); programarCarrusel();
}

/* ---------- Panel de juntas (reemplaza la rejilla anterior) ---------- */
function pintarPortal(){
  const L=leerJuntas();
  const logo=localStorage.getItem(PORTAL_LOGO);
  const c=document.getElementById('po-logo');
  if(logo&&c){ c.querySelectorAll('img').forEach(i=>i.remove()); const s=c.querySelector('svg'); if(s) s.style.display='none';
    const im=new Image(); im.src=logo; im.alt='Logo de ASOJUNTAS'; c.insertBefore(im,c.firstChild); }
  document.getElementById('po-juntas').innerHTML=L.map((j,i)=>`
    <button type="button" class="poJunta" data-j="${esc(j.id)}" data-entrar="${esc(j.id)}" style="--i:${i}">
      <span class="ico" data-icono="${esc(j.id)}">${j.foto?`<img src="${j.foto}" alt="">`:iconoJunta(j.icono)}</span>
      <span class="tx"><b>${esc(j.nombre)}</b><span class="lug">${esc(j.lugar||'')}</span></span>
      <span class="est" id="po-est-${esc(j.id)}">—</span>
      <span class="fl">${svgIcono('flecha')}</span>
    </button>`).join('');
  document.querySelectorAll('#po-juntas [data-entrar]').forEach(b=>b.onclick=()=>abrirJunta(b.dataset.entrar,b));
  L.forEach(j=>estadoJunta(j));
  pintarCarrusel();
}
/* Al escoger, el ícono de la junta viaja hasta la pantalla de acceso. */
function abrirJunta(id,boton){
  clearTimeout(CARRUSEL.timer);
  const ico=boton&&boton.querySelector('.ico');
  if(!document.startViewTransition||ROBOT||MOV_REDUCIDO){ entrarJunta(id); return; }
  if(ico) ico.style.viewTransitionName='junta-icono';
  const t=document.startViewTransition(async()=>{ if(ico) ico.style.viewTransitionName=''; await entrarJunta(id); });
  t.finished.finally(()=>{ const a=document.getElementById('acc-ico'); if(a) a.style.viewTransitionName=''; });
}

/* ---------- Acceso: Google, sin señal o registrarse ---------- */
function pantallaAcceso(cual){
  pantallaAccesoOriginal(cual);
  decorarAcceso();
}
function decorarAcceso(){
  const j=JUNTA||{};
  const ico=document.getElementById('acc-ico');
  if(ico){ ico.innerHTML=j.foto?`<img src="${j.foto}" alt="">`:iconoJunta(j.icono);
    ico.style.viewTransitionName='junta-icono'; }
  const n=document.getElementById('acc-junta'); if(n) n.textContent=j.nombre||'JAC Digital';
  const l=document.getElementById('acc-lugar'); if(l) l.textContent=(j.lugar?j.lugar+' · ':'')+'San Martín de Loba';
  const conGoogle=!!(CFG&&CFG.firebase&&CFG.firebase.apiKey);
  // Sin Google configurado, sin señal o en pruebas automáticas, el ingreso con correo y clave queda abierto.
  plegarSinSenal(!conGoogle||!navigator.onLine||ROBOT);
}
function plegarSinSenal(abrir){
  const p=document.getElementById('acc-sinsenal'), b=document.getElementById('b-sin-senal');
  if(!p||!b) return;
  p.classList.toggle('abierto',abrir); b.setAttribute('aria-expanded',abrir);
}

/* ---------- Administración: juntas y noticias del portal ---------- */
function adminJuntas(){
  adminJuntasOriginal();
  const cuerpo=document.getElementById('velo-cuerpo');
  const L=leerNoticias();
  cuerpo.insertAdjacentHTML('beforeend',`
    <h2 style="margin-top:26px">Noticias y avisos del inicio</h2>
    <p class="sub">Pasan solas en la bienvenida, antes de escoger la junta. Hasta 6. Si no hay ninguna, se muestran tres mensajes de presentación.</p>
    <div id="adm-noticias">${L.map((n,i)=>`<div class="grupo" style="cursor:default">
      <div class="av" style="border-radius:12px;overflow:hidden;background:var(--lav);color:var(--ind)">${n.img?`<img src="${n.img}" alt="" style="width:100%;height:100%;object-fit:cover">`:svgIcono('mega')}</div>
      <div class="in"><b>${esc(n.titulo)}</b><div class="ms"><span>${esc(n.tipo)}</span></div></div>
      <div class="ac" style="display:flex;gap:5px">
        ${i?`<button type="button" data-subirn="${i}" aria-label="Subir">↑</button>`:''}
        <button type="button" data-quitan="${i}" aria-label="Quitar">✕</button></div></div>`).join('')}</div>
    ${L.length<6?`<div class="tarjeta" style="margin-top:12px">
      <label for="nn-tipo">Tipo</label>
      <select id="nn-tipo"><option>Noticia</option><option>Aviso</option><option>Información</option><option>Publicidad</option></select>
      <label for="nn-tit">Título <span class="op">(máximo 60 caracteres)</span></label>
      <input id="nn-tit" type="text" maxlength="60" placeholder="Ej.: Jornada de vacunación en Chimí">
      <label for="nn-txt">Texto corto <span class="op">(opcional, máximo 120)</span></label>
      <input id="nn-txt" type="text" maxlength="120" placeholder="Ej.: Sábado 8 a.m. en la sede comunal">
      <label>Imagen <span class="op">(opcional, horizontal)</span></label>
      <button type="button" class="btn g chico" id="b-nn-img" style="width:100%">${svgIcono('camara')} Escoger imagen</button>
      <input type="file" id="in-nn-img" accept="image/*" class="oculto">
      <p class="sub" id="nn-img-nota"></p>
      <button type="button" class="btn" id="b-nn-agregar">Agregar noticia</button>
    </div>`:'<p class="sub">Ya hay 6 noticias: quite una para agregar otra.</p>'}`);
  let img=null;
  const bi=document.getElementById('b-nn-img');
  if(bi){
    bi.onclick=()=>document.getElementById('in-nn-img').click();
    document.getElementById('in-nn-img').onchange=async e=>{
      const f=e.target.files[0]; e.target.value=''; if(!f) return;
      const m=await miniDeFoto(f,1000);
      if(!m.blob){ avisoSuelto('No se pudo leer esa imagen.'); return; }
      img=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(m.blob)});
      document.getElementById('nn-img-nota').textContent='Imagen lista ('+Math.round(m.blob.size/1024)+' KB).';
    };
    document.getElementById('b-nn-agregar').onclick=()=>{
      const titulo=document.getElementById('nn-tit').value.trim();
      if(!titulo){ avisoSuelto('Escriba el título de la noticia.'); return; }
      const N=leerNoticias();
      N.push({id:Date.now().toString(36),tipo:document.getElementById('nn-tipo').value,titulo,
              texto:document.getElementById('nn-txt').value.trim(),img,creada:new Date().toISOString()});
      if(guardarNoticias(N)){ adminJuntas(); pintarCarrusel(); avisoSuelto('Noticia agregada al inicio.'); }
    };
  }
  cuerpo.querySelectorAll('[data-quitan]').forEach(b=>b.onclick=()=>{ const N=leerNoticias(); N.splice(+b.dataset.quitan,1);
    guardarNoticias(N); adminJuntas(); pintarCarrusel(); avisoSuelto('Noticia retirada.'); });
  cuerpo.querySelectorAll('[data-subirn]').forEach(b=>b.onclick=()=>{ const N=leerNoticias(), i=+b.dataset.subirn;
    [N[i-1],N[i]]=[N[i],N[i-1]]; guardarNoticias(N); adminJuntas(); pintarCarrusel(); });
}
function engancharPortal(){
  const b=document.getElementById('b-sin-senal');
  if(b) b.onclick=()=>{ const ab=!document.getElementById('acc-sinsenal').classList.contains('abierto'); plegarSinSenal(ab);
    if(ab) setTimeout(()=>document.getElementById('ac-correo').focus(),250); };
  const v=document.getElementById('b-acc-volver');
  if(v) v.onclick=()=>volverAlPortal();
}
