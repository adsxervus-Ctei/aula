(function(){
document.documentElement.classList.remove('no-js');
var r=document.documentElement;
try{var t=localStorage.getItem('tema');if(t)r.setAttribute('data-theme',t);}catch(e){}
var bt=document.querySelector('.tema');
if(bt)bt.addEventListener('click',function(){var dark=r.getAttribute('data-theme')==='dark'||(!r.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches);var n=dark?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('tema',n)}catch(e){}});
var bg=document.querySelector('.burger'),nv=document.querySelector('.nav');
if(bg)bg.addEventListener('click',function(){var a=nv.classList.toggle('abierto');bg.setAttribute('aria-expanded',a)});
var pr=document.querySelector('.prog');
function onS(){var h=document.documentElement;var p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);if(pr)pr.style.width=(p*100)+'%';}
addEventListener('scroll',onS,{passive:true});onS();
var red=matchMedia('(prefers-reduced-motion: reduce)').matches;
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vis');io.unobserve(e.target);var c=e.target.querySelectorAll('[data-cuenta]');c.forEach(cuenta);if(e.target.hasAttribute('data-cuenta'))cuenta(e.target);}})},{threshold:.12}):null;
document.querySelectorAll('.rev').forEach(function(el){if(io&&!red)io.observe(el);else{el.classList.add('vis');}});
function cuenta(el){if(el._ok)return;el._ok=1;var fin=parseFloat(el.getAttribute('data-cuenta')),dec=+(el.getAttribute('data-dec')||0),suf=el.getAttribute('data-suf')||'';if(red){return;}var t0=null;function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1100);k=1-Math.pow(1-k,3);el.textContent=(fin*k).toFixed(dec).replace('.',',')+suf;if(k<1)requestAnimationFrame(f);}requestAnimationFrame(f);}
document.querySelectorAll('[data-tabs]').forEach(function(g){var bs=g.querySelectorAll('[role=tab]');bs.forEach(function(b,i){b.addEventListener('click',function(){sel(i)});b.addEventListener('keydown',function(e){if(e.key==='ArrowRight')sel((i+1)%bs.length),bs[(i+1)%bs.length].focus();if(e.key==='ArrowLeft')sel((i-1+bs.length)%bs.length),bs[(i-1+bs.length)%bs.length].focus();});});function sel(i){bs.forEach(function(x,j){x.setAttribute('aria-selected',j===i);x.tabIndex=j===i?0:-1;document.getElementById(x.getAttribute('aria-controls')).hidden=j!==i;});}});
var ind=document.querySelector('.indice');
if(ind&&io){var ls=ind.querySelectorAll('a'),mp={};ls.forEach(function(a){mp[a.getAttribute('href').slice(1)]=a});var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){ls.forEach(function(a){a.classList.remove('on')});var a=mp[e.target.id];if(a){a.classList.add('on');}}})},{rootMargin:'-30% 0px -60% 0px'});document.querySelectorAll('.conindice section[id]').forEach(function(s){so.observe(s)});}
document.querySelectorAll('.chart').forEach(function(ch){var tip=ch.querySelector('.tip');ch.querySelectorAll('[data-tip]').forEach(function(b){function sh(e){var r=ch.getBoundingClientRect(),bb=b.getBoundingClientRect();tip.textContent=b.getAttribute('data-tip');tip.style.left=(bb.left+bb.width/2-r.left)+'px';tip.style.top=(bb.top-r.top)+'px';tip.classList.add('on');}b.addEventListener('mouseenter',sh);b.addEventListener('focus',sh);b.addEventListener('click',sh);b.addEventListener('mouseleave',function(){tip.classList.remove('on')});b.addEventListener('blur',function(){tip.classList.remove('on')});});});
/* fichas en ventana emergente */
function abrirM(id,desde){var d=document.getElementById(id);if(!d)return;if(desde){desde.classList.remove('cerrando');desde.close();}
 if(typeof d.showModal==='function'){d.showModal();}else{d.setAttribute('open','');}document.body.classList.add('con-modal');var c=d.querySelector('.cerrar');if(c)c.focus();}
function cerrarM(d){if(red){d.close();return;}d.classList.add('cerrando');setTimeout(function(){d.classList.remove('cerrando');d.close();},200);}
document.querySelectorAll('[data-modal]').forEach(function(b){b.addEventListener('click',function(){abrirM(b.getAttribute('data-modal'))})});
document.querySelectorAll('dialog.modal').forEach(function(d){
 d.addEventListener('close',function(){document.body.classList.remove('con-modal');var o=document.querySelector('[data-modal="'+d.id+'"]');if(o&&!document.querySelector('dialog.modal[open]'))o.focus();});
 d.addEventListener('cancel',function(e){e.preventDefault();cerrarM(d)});
 d.addEventListener('click',function(e){if(e.target===d)cerrarM(d)});
 d.querySelector('.cerrar').addEventListener('click',function(){cerrarM(d)});
 d.querySelectorAll('[data-ir]').forEach(function(b){b.addEventListener('click',function(){abrirM(b.getAttribute('data-ir'),d)})});
});
/* transición entre páginas: View Transitions nativa o cortina de respaldo */
var vtNativa=('onpagereveal' in window);
if(!vtNativa&&!red){var cor=document.createElement('div');cor.className='cortina';cor.setAttribute('aria-hidden','true');document.body.appendChild(cor);
 document.body.classList.add('entrando');setTimeout(function(){document.body.classList.remove('entrando')},700);
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||a.target==='_blank')return;var h=a.getAttribute('href');
  if(!/^[\w-]+\.html(#.*)?$/.test(h))return;if(h.split('#')[0]===location.pathname.split('/').pop())return;e.preventDefault();document.body.classList.add('saliendo');setTimeout(function(){location.href=h},330);});
 addEventListener('pageshow',function(e){if(e.persisted)document.body.classList.remove('saliendo')});}
var v=document.querySelector('.visor');
if(v){var im=v.querySelectorAll('.pista img'),i=0,n=im.length,lab=v.querySelector('.cnt'),pts=v.querySelector('.puntos');
 for(var k=0;k<n;k++){(function(k){var d=document.createElement('button');d.setAttribute('aria-label','Ir a la diapositiva '+(k+1));d.addEventListener('click',function(){ir(k)});pts.appendChild(d);})(k);}
 function ir(k){i=(k+n)%n;im.forEach(function(x,j){x.style.transform='translateX('+((j-i)*100)+'%)';x.setAttribute('aria-hidden',j!==i);});lab.textContent=(i+1)+' / '+n;pts.querySelectorAll('button').forEach(function(d,j){d.setAttribute('aria-current',j===i)});}
 v.querySelector('.ant').addEventListener('click',function(){ir(i-1)});v.querySelector('.sig').addEventListener('click',function(){ir(i+1)});
 v.addEventListener('keydown',function(e){if(e.key==='ArrowRight')ir(i+1);if(e.key==='ArrowLeft')ir(i-1);});
 var x0=null;var p=v.querySelector('.pista');p.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});p.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)ir(i+(dx<0?1:-1));x0=null;});
 im.forEach(function(x){x.hidden=false;});ir(0);}
})();
