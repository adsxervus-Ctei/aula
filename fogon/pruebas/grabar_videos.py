"""Graba los videos tutoriales (cliente y negocio) recorriendo la app real.
Uso: python grabar_videos.py http://localhost:PUERTO/ carpeta_salida"""
import sys, os, json, shutil, glob, time
from playwright.sync_api import sync_playwright
B, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CAPA = r"""
(()=>{ if (window.__capa) return; window.__capa = 1;
const st = document.createElement('style'); st.textContent = `
#tuto-sub{position:fixed;left:50%;top:68px;pointer-events:none;transform:translateX(-50%);z-index:9999;width:min(92%,560px);background:rgba(20,16,14,.92);color:#fff;border-radius:20px;padding:12px 16px 12px 14px;display:flex;gap:12px;align-items:center;font:600 16px/1.3 Poppins,system-ui;box-shadow:0 12px 30px rgba(0,0,0,.35);transition:opacity .3s,transform .4s cubic-bezier(.22,.8,.25,1)}
#tuto-sub b{flex:none;width:34px;height:34px;border-radius:12px;background:linear-gradient(145deg,#E2572B,#F2A23A);display:grid;place-items:center;font-size:16px}
#tuto-sub small{display:block;font-weight:400;font-size:13px;opacity:.8;margin-top:2px}
#tuto-sub.oculto{opacity:0;transform:translate(-50%,-20px)}
#tuto-dedo{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(226,87,43,.9);z-index:10000;pointer-events:none;transition:transform .15s;box-shadow:0 4px 14px rgba(0,0,0,.25);left:-100px;top:-100px}
#tuto-dedo.toca{transform:scale(.7)}
.tuto-onda{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #F2A23A;z-index:9998;pointer-events:none;animation:tutoOnda .6s ease-out forwards}
@keyframes tutoOnda{to{transform:scale(2.4);opacity:0}}
#tuto-tarjeta{position:fixed;inset:0;z-index:10001;background:radial-gradient(circle at 50% 35%,#3A2E27,#1E1A17 65%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px;font-family:Poppins,system-ui;transition:opacity .5s}
#tuto-tarjeta .l{width:84px;height:84px;border-radius:28px;background:linear-gradient(145deg,#E2572B,#F2A23A);display:grid;place-items:center;box-shadow:0 16px 40px rgba(226,87,43,.45)}
#tuto-tarjeta h1{font-size:28px;margin:0;line-height:1.15} #tuto-tarjeta p{margin:0;opacity:.8;font-size:15px}
`; document.head.append(st);
const sub = document.createElement('div'); sub.id = 'tuto-sub'; sub.className = 'oculto'; document.body.append(sub);
const dedo = document.createElement('div'); dedo.id = 'tuto-dedo'; document.body.append(dedo);
addEventListener('mousemove', e => { dedo.style.left = e.clientX + 'px'; dedo.style.top = e.clientY + 'px'; }, true);
addEventListener('mousedown', e => { dedo.classList.add('toca'); const o = document.createElement('div'); o.className = 'tuto-onda'; o.style.left = e.clientX + 'px'; o.style.top = e.clientY + 'px'; document.body.append(o); setTimeout(() => o.remove(), 700); }, true);
addEventListener('mouseup', () => dedo.classList.remove('toca'), true);
window.tutoSub = (n, t, s) => { sub.innerHTML = n ? `<b>${n}</b><span>${t}${s ? `<small>${s}</small>` : ''}</span>` : `<span>${t}</span>`; sub.classList.remove('oculto'); };
window.tutoTarjeta = (titulo, texto) => { let c = document.getElementById('tuto-tarjeta'); if (!c) { c = document.createElement('div'); c.id = 'tuto-tarjeta'; document.body.append(c); } c.style.opacity = 1; c.innerHTML = `<div class="l"><svg viewBox="0 0 24 24" width="44" height="44"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.5 1 2.4 2 2.8C11 8.5 11 5.5 12 3z" fill="#fff"/></svg></div><h1>${titulo}</h1><p>${texto}</p>`; };
window.tutoQuitarTarjeta = () => { const c = document.getElementById('tuto-tarjeta'); if (c) { c.style.opacity = 0; setTimeout(() => c.remove(), 500); } };
})();
"""
def mover(pg, sel, pasos=12):
    pg.locator(sel).first.scroll_into_view_if_needed(); bb = pg.locator(sel).first.bounding_box(); x, y = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
    pg.mouse.move(x, y, steps=pasos); return x, y
def tocar(pg, sel, espera=700):
    print("toca", sel, flush=True)
    x, y = mover(pg, sel); pg.wait_for_timeout(180); pg.mouse.down(); pg.wait_for_timeout(90); pg.mouse.up(); pg.wait_for_timeout(espera)
def sub(pg, n, t, s=""): pg.evaluate("([n,t,s])=>tutoSub(n,t,s)", [n, t, s])

def cliente(p):
    ctx = p.chromium.launch().new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="es-CO",
        record_video_dir=OUT + "/crudo-c", record_video_size={"width": 780, "height": 1688},
        geolocation={"latitude": 8.9500, "longitude": -74.0745, "accuracy": 20}, permissions=["geolocation"])
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false});localStorage.setItem('myr2_video_cliente','true');localStorage.setItem('myr2_instalar_visto','true');window.speechSynthesis&&(speechSynthesis.speak=()=>{});")
    ctx.route("https://images.unsplash.com/**", lambda r: r.abort()); ctx.route("https://tile.openstreetmap.org/**", lambda r: r.abort())
    ctx.route("https://router.project-osrm.org/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"code": "Ok", "routes": [{"distance": 1380, "duration": 260, "geometry": {"type": "LineString", "coordinates": [[-74.0808, 8.95861], [-74.0790, 8.9560], [-74.0765, 8.9528], [-74.0745, 8.95]]}}]})))
    ctx.route("https://nominatim.openstreetmap.org/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"address": {"road": "Calle 5", "house_number": "8-21", "neighbourhood": "El Carmen"}})))
    pg = ctx.new_page(); t0 = time.time()
    pg.goto(B); pg.wait_for_selector("#apertura", state="detached", timeout=8000)
    pg.evaluate(CAPA); pg.evaluate("tutoTarjeta('Así se pide','en Fogón del Río · 40 segundos')")
    pg.evaluate("(async()=>{await N.D.registrar({nombre:'Ana María',correo:'ana@gmail.com',celular:'3001234567',clave:'clave123'});MYR.ir('inicio',{raiz:true});})()")
    pg.wait_for_timeout(1200); inicio = time.time() - t0
    pg.wait_for_timeout(1800); pg.evaluate("tutoQuitarTarjeta()"); pg.wait_for_timeout(600)
    sub(pg, 1, "Abra el menú", "Arriba verá ofertas y novedades"); pg.wait_for_timeout(1600)
    tocar(pg, "#b-ver-menu", 1000)
    sub(pg, 2, "¿Mesa, recoger o domicilio?", "Con su ubicación lo decidimos solos")
    tocar(pg, "#b-md-ubicar", 2400)
    sub(pg, 3, "Deslice para ver los platos", "O use las flechas y las categorías")
    for d in (1, 1, -1, -1):
        bb = pg.locator("#escenario").bounding_box(); cx, cy = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        pg.mouse.move(cx + 90 * d, cy, steps=6); pg.mouse.down(); pg.mouse.move(cx - 90 * d, cy, steps=10); pg.mouse.up(); pg.wait_for_timeout(1000)
    sub(pg, 4, "Ajuste la receta y la cantidad", "Toque un ingrediente para quitarlo")
    tocar(pg, "#b-agregar", 1000); tocar(pg, "#hoja-lista [data-ingr='bollo']", 700); tocar(pg, "#cant-plato [data-cp='1']", 700)
    sub(pg, 5, "Escoja sus salsas", "Van en recipiente aparte")
    tocar(pg, "#b-hoja", 900); tocar(pg, "#hoja-lista [data-salsa='rosada']", 500); tocar(pg, "#hoja-lista [data-salsa='suero']", 700)
    sub(pg, 6, "Agregue bebidas", "Las que quiera")
    tocar(pg, "#b-hoja", 900); tocar(pg, "#hoja-lista [data-beb='limonada-coco'][data-d='1']", 500); tocar(pg, "#hoja-lista [data-beb='limonada-coco'][data-d='1']", 700)
    tocar(pg, "#b-hoja", 1400)
    sub(pg, 7, "Revise su pedido", "Botones grandes para sumar o quitar")
    pg.wait_for_timeout(1200); tocar(pg, "#res-items li [data-d='1']", 900)
    pg.locator("#res-pagos").scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    sub(pg, 8, "Escoja cómo pagar", "Efectivo, transferencia o tarjeta")
    tocar(pg, "#res-pagos [data-pago='efectivo']", 600); pg.fill("#pg-con", "200000"); pg.wait_for_timeout(1200)
    sub(pg, 9, "Vea su ticket y envíe", "Puede descargarlo o compartirlo")
    tocar(pg, "#b-pedir", 2600)
    pg.mouse.wheel(0, 500); pg.wait_for_timeout(900); pg.mouse.wheel(0, -500); pg.wait_for_timeout(500)
    tocar(pg, "#b-tk-enviar", 2400)
    sub(pg, 10, "Siga su pedido", "Le avisamos con voz cuando esté listo"); pg.wait_for_timeout(1400)
    tocar(pg, "#in-encurso .enCurso", 1200)
    tocar(pg, "#b-pd-chat", 900)
    sub(pg, 11, "Pregunte en el chat", "El asistente responde al instante")
    tocar(pg, "#ch-rapidas [data-rapido='¿Cuánto falta para mi pedido?']", 2400)
    pg.evaluate("tutoTarjeta('¡Listo!','Ya sabe pedir. También puede reservar su celebración desde el inicio.')"); pg.wait_for_timeout(2600)
    dur = time.time() - t0
    ruta = pg.video.path(); ctx.close()
    return ruta, inicio, dur

def negocio(p):
    ctx = p.chromium.launch().new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1, locale="es-CO",
        record_video_dir=OUT + "/crudo-n", record_video_size={"width": 1280, "height": 720})
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false});localStorage.setItem('myr2_video_negocio','true');localStorage.setItem('myr2_video_cliente','true');window.confirm=()=>true;window.prompt=(a,b)=>b;")
    ctx.route("https://images.unsplash.com/**", lambda r: r.abort())
    pg = ctx.new_page(); t0 = time.time()
    pg.goto(B); pg.wait_for_selector("#apertura", state="detached", timeout=8000)
    pg.evaluate(CAPA); pg.evaluate("tutoTarjeta('Su negocio en el panel','Pedidos, caja, menú, publicidad, reservas y equipo')")
    # datos de ejemplo: dos clientes con pedidos y una reserva
    pg.evaluate("""(async()=>{
      const mk=async(nombre,correo,items,total,modo,pago,extra={})=>{await N.D.registrar({nombre,correo,celular:'3001112233',clave:'clave123'});
        const p=await N.guardar('pedidos',{codigo:N.codigoPedido(),estado:'recibido',modo,mesa:modo==='local'?'4':null,destino:modo==='domicilio'?{lat:8.95,lng:-74.0745,direccion:'Calle 5 8-21 El Carmen',indicaciones:'Casa azul',km:1.4,min:6}:null,
          items,totales:{platos:total,salsas:0,bebidas:0,empaque:0,domicilio:0,ahorro:0,total},pago:{tipo:pago,estado:'pendiente'},cliente:{nombre,celular:'3001112233',correo},historial:[{estado:'recibido',at:new Date().toISOString()}],enviado:new Date().toISOString(),autor:N.sesion().id,...extra});
        await N.mensaje(p.id,'sistema','Recibimos su pedido '+p.codigo+'.'); return p;};
      await mk('Carlos Pérez','carlos@gmail.com',[{cant:1,nombre:'Picada costeña',detalle:'Salsas: Rosada, Ají picante',total:45000,bebidas:[],salsas:[],quitados:[]}],45000,'local','tarjeta');
      await N.guardar('reservas',{ocasion:'cumpleanos',dia:N.U.hoy(new Date(Date.now()+2*864e5)),hora:'19:00',personas:8,descripcion:'Cumpleaños de mi papá',estado:'solicitada',cliente:{nombre:'Carlos Pérez',celular:'3001112233',correo:'carlos@gmail.com'}});
      N.D.salir(); await N.D.ingresar('admin@fogondelrio.co','FOGON-2026'); MYR.ir('negocio',{raiz:true});})()""")
    pg.wait_for_timeout(2400); pg.evaluate("tutoQuitarTarjeta()"); pg.wait_for_timeout(600)
    sub(pg, 1, "Resumen del día", "Ventas, egresos y balance de un vistazo"); pg.wait_for_timeout(2200)
    # llega un pedido nuevo
    pg.evaluate("""(async()=>{const s=N.sesion();await N.guardar('pedidos',{codigo:N.codigoPedido(),estado:'recibido',modo:'domicilio',destino:{lat:8.95,lng:-74.0745,direccion:'Calle 5 8-21 El Carmen',indicaciones:'Casa azul',km:1.4,min:6},
      items:[{cant:2,nombre:'Pollo asado entero',detalle:'Sin bollo limpio · Salsas: Rosada',total:84000,bebidas:[],salsas:[],quitados:[]},{cant:2,nombre:'Limonada de coco',detalle:'Como viene',total:16000,bebidas:[],salsas:[],quitados:[]}],
      totales:{platos:84000,salsas:0,bebidas:16000,empaque:2000,domicilio:0,ahorro:3500,total:102000},pago:{tipo:'efectivo',conCuanto:150000,cambio:48000,estado:'pendiente'},cliente:{nombre:'Ana María Rangel',celular:'3001234567',correo:'ana@gmail.com'},historial:[{estado:'recibido',at:new Date().toISOString()}],enviado:new Date().toISOString(),autor:'x'});})()""")
    tocar(pg, ".ngNav [data-sec=pedidos]", 1200)
    sub(pg, 2, "Llega un pedido con su ticket", "Suena y se resalta en «Nuevos»"); pg.wait_for_timeout(1500)
    tocar(pg, ".kTarj.nuevo", 2200)
    pg.mouse.move(1100, 500); pg.mouse.wheel(0, 400); pg.wait_for_timeout(900); pg.mouse.wheel(0, -400); pg.wait_for_timeout(400)
    sub(pg, 3, "Confirme, pase a cocina y marque listo", "El cliente recibe un aviso con voz")
    for e in ["confirmado", "preparando", "listo"]: tocar(pg, f"#ng-cajon [data-estado='{e}']", 1100)
    tocar(pg, "#caj-cerrar", 600)
    sub(pg, 4, "Caja y balance", "Registre egresos y cierre la caja del día")
    tocar(pg, ".ngNav [data-sec=caja]", 900)
    tocar(pg, "#cj-desc", 200); pg.keyboard.type("20 pollos al proveedor", delay=25); tocar(pg, "#cj-valor", 200); pg.keyboard.type("240000", delay=40)
    tocar(pg, "#cj-form button[type=submit]", 1400)
    sub(pg, 5, "Menú con fotos y ofertas", "Suba la foto de su preparación y cambie precios")
    tocar(pg, ".ngNav [data-sec=menu]", 1200); tocar(pg, "[data-editar='salchipapa']", 1200)
    tocar(pg, "#pr-oferta", 200); pg.keyboard.type("14000", delay=40); tocar(pg, "#pr-oferta-tx", 200); pg.keyboard.type("Jueves de salchipapa", delay=25)
    tocar(pg, "#pr-form button[type=submit]", 1200)
    sub(pg, 6, "Publicidad del inicio", "Anuncios que ven todos sus clientes")
    tocar(pg, ".ngNav [data-sec=publicidad]", 1800)
    sub(pg, 7, "Reservas", "Confirme celebraciones con un toque")
    tocar(pg, ".ngNav [data-sec=reservas]", 900); tocar(pg, "[data-a='confirmada']", 1200)
    sub(pg, 8, "Equipo y roles", "Cada empleado ve solo lo que le toca")
    tocar(pg, ".ngNav [data-sec=equipo]", 900); tocar(pg, "#eq-nuevo", 900); mover(pg, "#eq-rol"); pg.select_option("#eq-rol", "cocina"); pg.wait_for_timeout(1300); tocar(pg, "#caj-cerrar", 500)
    sub(pg, 9, "Consolidado cada 15 días", "Excel con ventas, ingresos, egresos y clientes")
    tocar(pg, ".ngNav [data-sec=reportes]", 2200)
    pg.evaluate("tutoTarjeta('Todo su negocio, en orden','Mesa y Ruta · Powered by ACERBUS · CTeI')"); pg.wait_for_timeout(2600)
    dur = time.time() - t0
    ruta = pg.video.path(); ctx.close()
    return ruta, 0.6, dur

with sync_playwright() as p:
    c = cliente(p); n = negocio(p)
print(json.dumps({"cliente": c, "negocio": n}))
