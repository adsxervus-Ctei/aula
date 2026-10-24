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
  persona:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M19 4v4M17 6h4"/>',
  correo:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>',
  candado:'<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/>',
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
  // Por ahora el logo es la iconografía de ASOJUNTAS (emblema dibujado), no una imagen subida.
  const c=document.getElementById('po-logo');
  if(c){ c.querySelectorAll('img').forEach(i=>i.remove()); const sv=c.querySelector('svg'); if(sv) sv.style.display=''; }
  const heroP=document.querySelector('.poHero'); if(heroP) heroP.classList.remove('conLogo');
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
  clearTimeout(CARRUSEL.timer); ADMIN_PORTAL=false;
  const ico=boton&&boton.querySelector('.ico');
  if(!document.startViewTransition||ROBOT||MOV_REDUCIDO){ entrarJunta(id); return; }
  if(ico) ico.style.viewTransitionName='junta-icono';
  const t=document.startViewTransition(async()=>{ if(ico) ico.style.viewTransitionName=''; await entrarJunta(id); });
  t.finished.finally(()=>{ const a=document.getElementById('acc-ico'); if(a) a.style.viewTransitionName=''; });
}

/* ---------- Acceso: Google, sin señal o registrarse ---------- */
let TEXTOS_PRIMERO=null;   // textos originales de «Primer arranque», para restaurarlos
function pantallaAcceso(cual){
  pantallaAccesoOriginal(cual);
  const t=document.getElementById('acc-primero');
  if(t){ if(!TEXTOS_PRIMERO) TEXTOS_PRIMERO=[t.querySelector('h2').textContent,t.querySelector('.intro').textContent];
    t.querySelector('h2').textContent=TEXTOS_PRIMERO[0]; t.querySelector('.intro').textContent=TEXTOS_PRIMERO[1]; }
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

/* ---------- Acceso del Super Administrador al portal ----------
   Solo pide la clave. Se compara con las cuentas de Super Administrador ya
   creadas en las juntas de este teléfono (la misma huella de clave que usa
   el ingreso), así que no hay una clave nueva que recordar ni que filtrar. */
let ADMIN_PORTAL=false, FALLOS_PORTAL=0, BLOQUEO_PORTAL=0;
function superAdminsDelTelefono(){
  return Promise.all(leerJuntas().map(j=>new Promise(ok=>{
    let req; try{ req=indexedDB.open('jac_'+j.id); }catch(e){ ok([]); return; }
    req.onerror=()=>ok([]);
    req.onsuccess=()=>{ const d=req.result;
      if(!d.objectStoreNames.contains('usuarios')){ d.close(); ok([]); return; }
      try{ const g=d.transaction('usuarios','readonly').objectStore('usuarios').getAll();
        g.onsuccess=()=>{ d.close(); ok((g.result||[]).filter(u=>u.rol==='superadmin'&&u.estado==='aprobado'&&u.clave)); };
        g.onerror=()=>{ d.close(); ok([]); };
      }catch(e){ d.close(); ok([]); } };
  }))).then(L=>L.flat());
}
function pedirClavePortal(){
  document.getElementById('velo-cuerpo').innerHTML=`
    <div class="pcIco" aria-hidden="true">${svgIcono('candado')}</div>
    <h2 style="text-align:center">Acceso del Super Administrador</h2>
    <p class="sub" style="text-align:center">Para cambiar las noticias, los avisos y las juntas del inicio.</p>
    <label for="pc-clave">Clave</label>
    <input id="pc-clave" type="password" autocomplete="current-password" placeholder="••••••••">
    <button type="button" class="btn" id="b-pc-entrar">Entrar</button>
    <p class="sub" id="pc-nota" style="text-align:center;margin-top:10px"></p>
    <button type="button" class="pcOlvido" id="b-pc-olvido">¿Olvidó la clave? Recuperarla por correo</button>
    <div class="sep">¿Todavía no hay Super Administrador?</div>
    <button type="button" class="btn g" id="b-pc-registrar">${svgIcono('persona')} Registrar Super Administrador</button>`;
  document.getElementById('velo').classList.remove('oculto');
  const i=document.getElementById('pc-clave'); setTimeout(()=>i.focus(),250);
  document.getElementById('b-pc-entrar').onclick=entrarPortal;
  document.getElementById('b-pc-olvido').onclick=recuperarPaso1;
  document.getElementById('b-pc-registrar').onclick=registrarSAPortal;
  i.onkeydown=e=>{ if(e.key==='Enter') entrarPortal(); };
}
async function entrarPortal(){
  const n=document.getElementById('pc-nota'), clave=document.getElementById('pc-clave').value;
  if(Date.now()<BLOQUEO_PORTAL){ n.innerHTML='<span class="chip am">Espere</span> Demasiados intentos. Pruebe en '+Math.ceil((BLOQUEO_PORTAL-Date.now())/1000)+' s.'; return; }
  if(!clave){ n.innerHTML='<span class="chip ro">Escriba la clave</span>'; return; }
  const SA=await superAdminsDelTelefono();
  if(!SA.length){ n.innerHTML='<span class="chip am">Sin Super Administrador</span> En este teléfono todavía no hay ninguno. Toque «Registrar Super Administrador».'; return; }
  if(SA.some(u=>u.clave===claveHash(u.correo,clave))){
    ADMIN_PORTAL=true; FALLOS_PORTAL=0; adminJuntas(); avisoSuelto('Modo de administración del inicio.'); return;
  }
  FALLOS_PORTAL++; document.getElementById('pc-clave').value='';
  if(FALLOS_PORTAL>=3){ BLOQUEO_PORTAL=Date.now()+30000; FALLOS_PORTAL=0; }
  n.innerHTML='<span class="chip ro">Clave incorrecta</span>';
}

/* ---------- Administración: juntas y noticias del portal ---------- */
function adminJuntas(){
  if(!ADMIN_PORTAL){ pedirClavePortal(); return; }
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
  // Correo de recuperación (EmailJS) y salida del modo de administración
  const C=configCorreo();
  cuerpo.insertAdjacentHTML('beforeend',`
    <h2 style="margin-top:26px">Correo para recuperar la clave</h2>
    <p class="sub">Con estos tres datos de una cuenta gratuita de <b>EmailJS</b>, «¿Olvidó la clave?» envía un código al correo del Super Administrador. Vea la guía «RECUPERAR_CLAVE.md».</p>
    <label for="ce-serv">Service ID</label><input id="ce-serv" type="text" value="${esc(C.servicio)}" placeholder="service_xxxxxxx" autocomplete="off">
    <label for="ce-plan">Template ID</label><input id="ce-plan" type="text" value="${esc(C.plantilla)}" placeholder="template_xxxxxxx" autocomplete="off">
    <label for="ce-llave">Public Key</label><input id="ce-llave" type="text" value="${esc(C.llave)}" placeholder="xxxxxxxxxxxxxxxx" autocomplete="off">
    <button type="button" class="btn g" id="b-ce-guardar">Guardar el correo de recuperación</button>
    <button type="button" class="btn gris" id="b-adm-salir" style="margin-top:22px">${svgIcono('candado')} Salir del modo de administración</button>`);
  document.getElementById('b-ce-guardar').onclick=()=>{
    const v={servicio:document.getElementById('ce-serv').value.trim(),plantilla:document.getElementById('ce-plan').value.trim(),llave:document.getElementById('ce-llave').value.trim()};
    try{ localStorage.setItem('jac_portal_correo',JSON.stringify(v)); avisoSuelto(v.servicio&&v.plantilla&&v.llave?'Recuperación por correo activada.':'Datos guardados (incompletos: falta alguno).'); }catch(e){ avisoSuelto('No se pudo guardar.'); }
  };
  document.getElementById('b-adm-salir').onclick=()=>{ ADMIN_PORTAL=false; cerrarVelo(); avisoSuelto('Salió del modo de administración.'); };
  cuerpo.querySelectorAll('[data-quitan]').forEach(b=>b.onclick=()=>{ const N=leerNoticias(); N.splice(+b.dataset.quitan,1);
    guardarNoticias(N); adminJuntas(); pintarCarrusel(); avisoSuelto('Noticia retirada.'); });
  cuerpo.querySelectorAll('[data-subirn]').forEach(b=>b.onclick=()=>{ const N=leerNoticias(), i=+b.dataset.subirn;
    [N[i-1],N[i]]=[N[i],N[i-1]]; guardarNoticias(N); adminJuntas(); pintarCarrusel(); });
}
function engancharPortal(){
  const ad=document.getElementById('b-admin-juntas');
  if(ad) ad.onclick=()=>ADMIN_PORTAL?adminJuntas():pedirClavePortal();
  const lg=document.getElementById('po-logo');
  if(lg){ lg.onclick=null; lg.onkeydown=null; lg.removeAttribute('tabindex'); lg.setAttribute('role','img'); }
  const b=document.getElementById('b-sin-senal');
  if(b) b.onclick=()=>{ const ab=!document.getElementById('acc-sinsenal').classList.contains('abierto'); plegarSinSenal(ab);
    if(ab) setTimeout(()=>document.getElementById('ac-correo').focus(),250); };
  const v=document.getElementById('b-acc-volver');
  if(v) v.onclick=()=>volverAlPortal();
}


/* ======================================================================
   REGISTRAR SUPER ADMINISTRADOR desde el portal
   Cada junta puede tener hasta 2 (M-20: así una clave olvidada o una
   persona ausente no bloquean la Junta). Registrar uno exige la clave de
   la Junta, igual que el primer arranque.
   ====================================================================== */
const MAX_SA=2;
function superAdminsDeJunta(id){
  return new Promise(ok=>{
    let req; try{ req=indexedDB.open('jac_'+id); }catch(e){ ok([]); return; }
    req.onerror=()=>ok([]);
    req.onsuccess=()=>{ const d=req.result;
      if(!d.objectStoreNames.contains('usuarios')){ d.close(); ok([]); return; }
      try{ const g=d.transaction('usuarios','readonly').objectStore('usuarios').getAll();
        g.onsuccess=()=>{ d.close(); ok((g.result||[]).filter(u=>u.rol==='superadmin')); };
        g.onerror=()=>{ d.close(); ok([]); };
      }catch(e){ d.close(); ok([]); } };
  });
}
async function registrarSAPortal(){
  const L=leerJuntas();
  const cuentas=await Promise.all(L.map(j=>superAdminsDeJunta(j.id)));
  document.getElementById('velo-cuerpo').innerHTML=`
    <div class="pcIco" aria-hidden="true">${svgIcono('persona')}</div>
    <h2 style="text-align:center">Registrar Super Administrador</h2>
    <p class="sub" style="text-align:center">Escoja la junta. Necesitará la <b>clave de la Junta</b>. Cada junta puede tener hasta ${MAX_SA} Super Administradores.</p>
    <div class="pcJuntas">${L.map((j,i)=>{ const n=cuentas[i].length, lleno=n>=MAX_SA;
      return `<button type="button" class="pcJunta" data-rsa="${esc(j.id)}" ${lleno?'disabled':''}>
        <span class="ico">${iconoJunta(j.icono)}</span>
        <span class="tx"><b>${esc(j.nombre)}</b><span>${n===0?'Sin Super Administrador':n+' de '+MAX_SA+' Super Administradores'}</span></span>
        <span class="fl">${lleno?'Completo':svgIcono('flecha')}</span></button>`; }).join('')}</div>`;
  document.getElementById('velo').classList.remove('oculto');
  document.querySelectorAll('[data-rsa]').forEach(b=>b.onclick=()=>iniciarRegistroSA(b.dataset.rsa));
}
async function iniciarRegistroSA(id){
  const n=(await superAdminsDeJunta(id)).length;
  if(n>=MAX_SA){ avisoSuelto('Esa junta ya tiene '+MAX_SA+' Super Administradores.'); return; }
  cerrarVelo(); ADMIN_PORTAL=false;
  await entrarJunta(id);
  if(USR){ avisoSuelto('Hay una sesión abierta en esta junta. Cierre sesión para registrar otro Super Administrador.'); return; }
  pantallaAcceso('primero');
  const t=document.getElementById('acc-primero');
  t.querySelector('h2').textContent = n===0 ? 'Primer Super Administrador' : 'Segundo Super Administrador';
  t.querySelector('.intro').textContent = n===0
    ? 'Esta junta todavía no tiene Super Administrador. Escriba la clave de la Junta para crear la cuenta del Comité de CTeI.'
    : 'Esta junta ya tiene un Super Administrador. Con la clave de la Junta puede registrar el segundo (máximo '+MAX_SA+').';
}
/* El primer arranque original crea Super Administrador sin mirar cuántos hay: se limita a 2. */
async function crearSuperAdmin(){
  const SA=(await todos('usuarios')).filter(u=>u.rol==='superadmin');
  if(SA.length>=MAX_SA){ document.getElementById('pr-nota').innerHTML='<span class="chip am">Completo</span> Esta junta ya tiene '+MAX_SA+' Super Administradores.'; return; }
  return crearSuperAdminOriginal();
}

/* ======================================================================
   RECUPERAR LA CLAVE POR CORREO
   La app no tiene servidor: el correo sale por EmailJS (gratis hasta 200
   correos al mes). El código de 6 dígitos se genera en el teléfono, se
   guarda solo su huella, vence a los 15 minutos y admite 5 intentos.
   Solo se envía al correo de un Super Administrador registrado aquí.
   ====================================================================== */
/* Quien publica la app puede dejar los datos de EmailJS escritos aquí (sirven
   en todos los teléfonos); el Super Administrador también puede ponerlos
   desde el modo de administración del portal (sirven en ese teléfono). */
const CORREO_RECUPERACION={servicio:'',plantilla:'',llave:''};
function configCorreo(){
  let c={}; try{ c=JSON.parse(localStorage.getItem('jac_portal_correo')||'{}')||{}; }catch(e){}
  return {servicio:c.servicio||CORREO_RECUPERACION.servicio, plantilla:c.plantilla||CORREO_RECUPERACION.plantilla, llave:c.llave||CORREO_RECUPERACION.llave};
}
const correoActivo=()=>{ const c=configCorreo(); return !!(c.servicio&&c.plantilla&&c.llave); };
const ocultarCorreo=c=>c.replace(/^(.{2})[^@]*(@.*)$/,(m,a,b)=>a+'•••'+b);
let RECUP=null;   // {correo, huella, vence, intentos}
function recuperarPaso1(){
  document.getElementById('velo-cuerpo').innerHTML=`
    <div class="pcIco" aria-hidden="true">${svgIcono('correo')}</div>
    <h2 style="text-align:center">Recuperar la clave</h2>
    <p class="sub" style="text-align:center">Escriba el correo con el que registró la cuenta de Super Administrador. Le enviaremos un código de 6 dígitos.</p>
    ${correoActivo()?'':'<p class="offl"><b>Todavía no está activado.</b> Para que esta opción funcione, quien publica la aplicación o un Super Administrador debe poner los datos de EmailJS (guía «RECUPERAR_CLAVE.md»).</p>'}
    <label for="rc-correo">Correo del Super Administrador</label>
    <input id="rc-correo" type="email" inputmode="email" autocomplete="email" placeholder="sunombre@gmail.com">
    <button type="button" class="btn" id="b-rc-enviar">${svgIcono('correo')} Enviar el código</button>
    <p class="sub" id="rc-nota" style="text-align:center;margin-top:10px"></p>
    <button type="button" class="pcOlvido" id="b-rc-volver">Volver</button>`;
  document.getElementById('velo').classList.remove('oculto');
  document.getElementById('b-rc-enviar').onclick=enviarCodigo;
  document.getElementById('b-rc-volver').onclick=pedirClavePortal;
  setTimeout(()=>document.getElementById('rc-correo').focus(),250);
}
async function enviarCodigo(){
  const n=document.getElementById('rc-nota'), b=document.getElementById('b-rc-enviar');
  const correo=normCorreo(document.getElementById('rc-correo').value);
  if(!correoOk(correo)){ n.innerHTML='<span class="chip ro">Escriba un correo válido</span>'; return; }
  if(!correoActivo()){ n.innerHTML='<span class="chip am">No activado</span> Falta configurar el envío de correos (EmailJS).'; return; }
  if(!navigator.onLine){ n.innerHTML='<span class="chip am">Sin señal</span> Para enviar el código se necesita internet.'; return; }
  const SA=(await superAdminsDelTelefono()).filter(u=>u.correo===correo);
  if(!SA.length){ n.innerHTML='<span class="chip ro">No encontrado</span> Ese correo no es de un Super Administrador registrado en este teléfono.'; return; }
  const a=new Uint32Array(1); crypto.getRandomValues(a);
  const codigo=String(a[0]%1000000).padStart(6,'0');
  const vence=Date.now()+15*60000;
  const c=configCorreo();
  b.disabled=true; b.innerHTML='<span class="cargando"></span> Enviando…';
  try{
    const r=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({service_id:c.servicio,template_id:c.plantilla,user_id:c.llave,template_params:{
        to_email:correo, codigo, nombre:SA[0].nombre||'', junta:'ASOJUNTAS · San Martín de Loba',
        vence:new Date(vence).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'})}})});
    if(!r.ok) throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,120));
  }catch(e){
    b.disabled=false; b.innerHTML=svgIcono('correo')+' Enviar el código';
    n.innerHTML='<span class="chip ro">No se pudo enviar</span> '+esc(String(e.message||e)); return;
  }
  RECUP={correo, huella:sha256('RECUP|'+correo+'|'+codigo), vence, intentos:0};
  recuperarPaso2();
}
function recuperarPaso2(){
  document.getElementById('velo-cuerpo').innerHTML=`
    <div class="pcIco" aria-hidden="true">${svgIcono('correo')}</div>
    <h2 style="text-align:center">Revise su correo</h2>
    <p class="sub" style="text-align:center">Enviamos un código de 6 dígitos a <b>${esc(ocultarCorreo(RECUP.correo))}</b>. Vence en 15 minutos. Revise también la carpeta de spam.</p>
    <label for="rc-cod">Código</label>
    <input id="rc-cod" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" class="pcCodigo">
    <label for="rc-c1">Clave nueva <span class="op">(mínimo 6 caracteres)</span></label>
    <input id="rc-c1" type="password" autocomplete="new-password">
    <label for="rc-c2">Repita la clave nueva</label>
    <input id="rc-c2" type="password" autocomplete="new-password">
    <button type="button" class="btn" id="b-rc-cambiar">Cambiar la clave</button>
    <p class="sub" id="rc-nota" style="text-align:center;margin-top:10px"></p>
    <button type="button" class="pcOlvido" id="b-rc-otra">Enviar otro código</button>`;
  document.getElementById('b-rc-cambiar').onclick=cambiarClaveRecuperada;
  document.getElementById('b-rc-otra').onclick=recuperarPaso1;
  setTimeout(()=>document.getElementById('rc-cod').focus(),250);
}
async function cambiarClaveRecuperada(){
  const n=document.getElementById('rc-nota');
  if(!RECUP||Date.now()>RECUP.vence){ n.innerHTML='<span class="chip ro">Código vencido</span> Pida otro código.'; RECUP=null; return; }
  const cod=document.getElementById('rc-cod').value.replace(/\D/g,'');
  const c1=document.getElementById('rc-c1').value, c2=document.getElementById('rc-c2').value;
  if(c1.length<6){ n.innerHTML='<span class="chip ro">La clave debe tener al menos 6 caracteres</span>'; return; }
  if(c1!==c2){ n.innerHTML='<span class="chip ro">Las dos claves no coinciden</span>'; return; }
  if(sha256('RECUP|'+RECUP.correo+'|'+cod)!==RECUP.huella){
    RECUP.intentos++;
    if(RECUP.intentos>=5){ RECUP=null; n.innerHTML='<span class="chip ro">Demasiados intentos</span> Pida otro código.'; return; }
    n.innerHTML='<span class="chip ro">Código incorrecto</span> Le quedan '+(5-RECUP.intentos)+' intentos.'; return;
  }
  // Cambia la clave en todas las juntas de este teléfono donde ese correo es Super Administrador
  const correo=RECUP.correo, huellaNueva=claveHash(correo,c1);
  let cambiadas=0;
  for(const j of leerJuntas()){
    cambiadas+=await new Promise(ok=>{
      let req; try{ req=indexedDB.open('jac_'+j.id); }catch(e){ ok(0); return; }
      req.onerror=()=>ok(0);
      req.onsuccess=()=>{ const d=req.result;
        if(!d.objectStoreNames.contains('usuarios')){ d.close(); ok(0); return; }
        try{ const st=d.transaction('usuarios','readwrite').objectStore('usuarios'); const g=st.getAll();
          g.onsuccess=()=>{ const u=(g.result||[]).find(x=>x.correo===correo&&x.rol==='superadmin');
            if(!u){ d.close(); ok(0); return; }
            u.clave=huellaNueva; u.claveRecuperada=new Date().toISOString();
            const pq=st.put(u); pq.onsuccess=()=>{ d.close(); ok(1); }; pq.onerror=()=>{ d.close(); ok(0); }; };
          g.onerror=()=>{ d.close(); ok(0); };
        }catch(e){ d.close(); ok(0); } };
    });
  }
  RECUP=null;
  document.getElementById('velo-cuerpo').innerHTML=`
    <div class="pcIco ok" aria-hidden="true">${svgIcono('candado')}</div>
    <h2 style="text-align:center">Clave cambiada</h2>
    <p class="sub" style="text-align:center">Ya puede entrar con la clave nueva${cambiadas>1?' en las '+cambiadas+' juntas donde es Super Administrador':''}, aquí en el candado y al ingresar a su junta.</p>
    <button type="button" class="btn" id="b-rc-listo">Entrar ahora</button>`;
  document.getElementById('b-rc-listo').onclick=pedirClavePortal;
}

/* ======================================================================
   EMPEZAR DE CERO
   Esta versión arranca limpia. Si en el teléfono quedaron datos de pruebas
   anteriores (cuentas, noticias, logo), se ofrece borrarlos UNA vez, con
   confirmación. En un teléfono nuevo no aparece nada.
   ====================================================================== */
const REINICIO_ID='jac_reinicio_2026-10-24';
const Reinicio={
  async datosPrevios(){
    let noticias=0, logo=false, cuentas=0, bases=[];
    try{ noticias=leerNoticias().length; logo=!!localStorage.getItem(PORTAL_LOGO); }catch(e){}
    try{ if(indexedDB.databases){ bases=(await indexedDB.databases()).map(d=>d.name).filter(n=>/^jac_/.test(n||'')); } }catch(e){}
    if(!bases.length) bases=leerJuntas().map(j=>'jac_'+j.id);
    const U=await superAdminsDelTelefonoTodos();
    cuentas=U.length;
    return {noticias, logo, cuentas, bases};
  },
  async revisar(){
    if(ROBOT) return;
    try{ if(localStorage.getItem(REINICIO_ID)) return; }catch(e){ return; }
    const d=await this.datosPrevios();
    if(!d.noticias&&!d.logo&&!d.cuentas){ try{ localStorage.setItem(REINICIO_ID,'nada'); }catch(e){} return; }
    return new Promise(listo=>{
      const caja=document.createElement('div');
      caja.className='inVelo'; caja.setAttribute('role','dialog'); caja.setAttribute('aria-modal','true'); caja.setAttribute('aria-labelledby','rz-tit');
      const partes=[d.cuentas?d.cuentas+' cuenta(s)':'', d.noticias?d.noticias+' noticia(s)':'', d.logo?'un logo':''].filter(Boolean).join(', ');
      caja.innerHTML=`<div class="inCaja cambia">
        <div class="pcIco" aria-hidden="true">${svgIcono('casa')}</div>
        <h2 id="rz-tit">Esta versión empieza de cero</h2>
        <p>En este teléfono quedaron datos de pruebas anteriores: <b>${esc(partes)}</b>. Para arrancar limpio, se pueden borrar ahora.</p>
        <p class="inNota">Se borra todo lo guardado por la aplicación en este teléfono: cuentas, actas, solicitudes y noticias de todas las juntas. No se puede deshacer.</p>
        <button type="button" class="btn r" data-rz="borrar">Borrar y empezar de cero</button>
        <button type="button" class="inSeguir" data-rz="conservar">Conservar los datos</button></div>`;
      document.body.appendChild(caja);
      caja.addEventListener('click',async e=>{
        const b=e.target.closest('[data-rz]'); if(!b) return;
        if(b.dataset.rz==='conservar'){ try{ localStorage.setItem(REINICIO_ID,'conservado'); }catch(x){} caja.remove(); listo(); return; }
        b.disabled=true; b.innerHTML='<span class="cargando"></span> Borrando…';
        await this.borrarTodo(d.bases);
        try{ localStorage.setItem(REINICIO_ID,'borrado '+new Date().toISOString()); }catch(x){}
        location.reload();
      });
    });
  },
  async borrarTodo(bases){
    try{ DB&&DB.close&&DB.close(); }catch(e){}
    await Promise.all(bases.map(n=>new Promise(ok=>{ try{ const r=indexedDB.deleteDatabase(n); r.onsuccess=r.onerror=r.onblocked=()=>ok(); }catch(e){ ok(); } })));
    try{ Object.keys(localStorage).filter(k=>/^jac_/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(e){}
    try{ sessionStorage.clear(); }catch(e){}
  }
};
/* Cuenta TODAS las cuentas (no solo Super Administradores) para saber si hay datos previos. */
function superAdminsDelTelefonoTodos(){
  return Promise.all(leerJuntas().map(j=>new Promise(ok=>{
    let req; try{ req=indexedDB.open('jac_'+j.id); }catch(e){ ok([]); return; }
    req.onerror=()=>ok([]);
    req.onsuccess=()=>{ const d=req.result;
      if(!d.objectStoreNames.contains('usuarios')){ d.close(); ok([]); return; }
      try{ const g=d.transaction('usuarios','readonly').objectStore('usuarios').getAll();
        g.onsuccess=()=>{ d.close(); ok(g.result||[]); }; g.onerror=()=>{ d.close(); ok([]); };
      }catch(e){ d.close(); ok([]); } };
  }))).then(L=>L.flat());
}
