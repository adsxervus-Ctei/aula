document.querySelectorAll('[data-tabs]').forEach(function(g){
  var bs=g.querySelectorAll('.tabs button');
  bs.forEach(function(b){b.addEventListener('click',function(){
    bs.forEach(function(x){x.setAttribute('aria-selected','false');document.getElementById(x.dataset.p).hidden=true});
    b.setAttribute('aria-selected','true');document.getElementById(b.dataset.p).hidden=false;});});
});
var d=document.querySelector('.deck');
if(d){var im=d.querySelectorAll('img'),i=0,lab=d.querySelector('.ctl span');
 function show(k){im[i].hidden=true;i=(k+im.length)%im.length;im[i].hidden=false;lab.textContent='Diapositiva '+(i+1)+' de '+im.length;}
 d.querySelector('.prev').onclick=function(){show(i-1)};d.querySelector('.next').onclick=function(){show(i+1)};}
