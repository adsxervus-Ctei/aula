/* ======================================================================
   INVITACIÓN A INSTALAR · aparece al terminar la apertura, antes del portal
   Lo que el navegador permite (y lo que no), según la documentación de Chrome:
   - El botón de instalación directa (beforeinstallprompt) solo existe después
     de que la persona toca la página y lleva 30 s en ella. Mientras tanto se
     muestran los pasos del menú; si el botón directo llega con la ventana
     abierta, la ventana cambia sola a «Instalar ahora».
   - En el celular, una página NO puede abrir la app instalada ni cerrar su
     pestaña: se muestra dónde quedó el ícono para abrirla desde ahí.
     En computador, Chrome pasa solo a la ventana de la app.
   - Si la app ya está instalada y se abre en el navegador, se avisa.
   ====================================================================== */
const InvitarInstalar=(()=>{
  const esIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const esAndroid=/android/i.test(navigator.userAgent);
  const esMovil=esIOS||esAndroid;
  const enApp=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches||navigator.standalone===true;
  let caja=null, estado='';
  const ICONO=`<img src="icono-192.png" alt="" class="inIco">`;
  const SVG={
    menu:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    compartir:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>',
    mas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    instalar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };
  /* Pantalla de inicio ilustrada: el ícono de ASOJUNTAS llega a su lugar */
  const telefono=(resaltar)=>`<div class="inTel${resaltar?' resalta':''}" aria-hidden="true">
      <div class="inPantalla">
        ${Array.from({length:11},(_,k)=>`<i style="--k:${k}"></i>`).join('')}
        <span class="inApp">${ICONO}<b>ASOJUNTAS</b></span>
      </div></div>`;
  function pintar(e){
    estado=e;
    const directo=!!PROMPT_INSTALL;
    let html='';
    if(e==='invitar'){
      html=`${telefono(false)}
        <h2 id="in-tit">Lleve ASOJUNTAS en su celular</h2>
        <p>Instálela como aplicación: queda con su ícono en la pantalla de inicio, abre más rápido y funciona sin señal.</p>
        <button type="button" class="btn" data-in="instalar">${SVG.instalar} Instalar aplicación</button>
        <button type="button" class="inSeguir" data-in="seguir">Seguir sin instalar</button>`;
    } else if(e==='pasos'){
      const pasos = esIOS
        ? [[SVG.compartir,'Toque <b>Compartir</b>, abajo en Safari.'],[SVG.mas,'Escoja <b>Agregar a inicio</b>.'],[SVG.ok,'Toque <b>Agregar</b>. El ícono queda en su pantalla.']]
        : esAndroid
        ? [[SVG.menu,'Toque los <b>tres puntos</b> de arriba a la derecha.'],[SVG.instalar,'Escoja <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.'],[SVG.ok,'Confirme con <b>Instalar</b>.']]
        : [[SVG.instalar,'Toque el ícono <b>Instalar</b> en la barra de direcciones, a la derecha.'],[SVG.menu,'O abra el menú del navegador y escoja <b>Instalar ASOJUNTAS</b>.'],[SVG.ok,'Confirme con <b>Instalar</b>.']];
      html=`<h2 id="in-tit">Así se instala</h2>
        ${esIOS&&!/safari/i.test(navigator.userAgent.replace(/crios|fxios|edgios/ig,''))?'<p class="inNota">En iPhone se instala desde <b>Safari</b>. Abra esta misma dirección en Safari.</p>':''}
        <ol class="inPasos">${pasos.map(([ic,t],k)=>`<li style="--k:${k}"><span>${ic}</span><p>${t}</p></li>`).join('')}</ol>
        ${!esIOS?`<p class="inNota" id="in-espera">${directo?'':'<span class="inGira"></span> En unos segundos puede aparecer aquí un botón para instalar con un solo toque.'}</p>`:''}
        ${directo?`<button type="button" class="btn" data-in="instalar">${SVG.instalar} Instalar ahora</button>`:''}
        <button type="button" class="inSeguir" data-in="seguir">Seguir sin instalar</button>`;
    } else if(e==='listo'){
      html=`${telefono(true)}
        <h2 id="in-tit">¡Listo! ASOJUNTAS quedó instalada</h2>
        <p>${esMovil?'Su ícono quedó en la <b>pantalla de inicio</b> del celular, como en el dibujo. Ciérrela aquí y ábrala desde el ícono: así entra a la aplicación.':'La aplicación se abre en su propia ventana. También queda en el menú de aplicaciones del computador.'}</p>
        ${esAndroid?'<p class="inNota">Si no la ve en la pantalla de inicio, búsquela en el <b>cajón de aplicaciones</b> con el nombre ASOJUNTAS. Puede tardar unos segundos en aparecer.</p>':''}
        <button type="button" class="btn" data-in="seguir">Entendido</button>`;
    } else if(e==='ya'){
      html=`${telefono(true)}
        <h2 id="in-tit">Ya tiene la aplicación</h2>
        <p>ASOJUNTAS ya está instalada en este celular. Ábrala desde su ícono en la pantalla de inicio para usarla como aplicación.</p>
        <button type="button" class="btn" data-in="seguir">Seguir en el navegador</button>`;
    }
    caja.querySelector('.inCaja').innerHTML=html;
    caja.querySelector('.inCaja').classList.remove('cambia'); void caja.offsetWidth; caja.querySelector('.inCaja').classList.add('cambia');
    const b=caja.querySelector('.btn'); if(b) b.focus({preventScroll:true});
  }
  async function instalar(){
    if(!PROMPT_INSTALL){ pintar('pasos'); return; }
    const p=PROMPT_INSTALL;
    p.prompt();
    let r=null; try{ r=await p.userChoice; }catch(e){}
    PROMPT_INSTALL=null;
    const b=document.getElementById('b-instalar'); if(b) b.classList.add('oculto');
    if(r&&r.outcome==='accepted') pintar('listo'); else pintar('invitar');
  }
  function cerrar(){
    if(!caja) return;
    caja.classList.add('saliendo');
    try{ sessionStorage.setItem('jac_invito','1'); }catch(e){}
    setTimeout(()=>{ caja&&caja.remove(); caja=null; },380);
  }
  async function yaInstalada(){
    try{ if(navigator.getInstalledRelatedApps){ const L=await navigator.getInstalledRelatedApps(); return L.some(a=>a.platform==='webapp'); } }catch(e){}
    return false;
  }
  async function mostrar(){
    if(ROBOT||enApp()) return;
    try{ if(sessionStorage.getItem('jac_invito')==='1') return; }catch(e){}
    caja=document.createElement('div');
    caja.className='inVelo'; caja.setAttribute('role','dialog'); caja.setAttribute('aria-modal','true'); caja.setAttribute('aria-labelledby','in-tit');
    caja.innerHTML='<div class="inCaja"></div>';
    document.body.appendChild(caja);
    caja.addEventListener('click',e=>{ const a=e.target.closest('[data-in]'); if(!a) return;
      if(a.dataset.in==='instalar') instalar(); else cerrar(); });
    pintar(await yaInstalada()?'ya':'invitar');
  }
  // Si el botón directo llega con la ventana abierta en «pasos», se ofrece al instante.
  addEventListener('beforeinstallprompt',()=>{ if(caja&&estado==='pasos') setTimeout(()=>pintar('pasos'),0); });
  // Instalada por cualquier vía (también desde el menú del navegador): se muestra dónde quedó.
  addEventListener('appinstalled',()=>{ if(caja) pintar('listo'); });
  return {mostrar};
})();
