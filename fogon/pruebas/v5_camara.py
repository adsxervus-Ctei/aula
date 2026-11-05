import sys
from playwright.sync_api import sync_playwright
B, Y4M, COD = sys.argv[1], sys.argv[2], sys.argv[3]
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', f'--use-file-for-fake-video-capture={Y4M}'])
    c = br.new_context(viewport={'width': 1200, 'height': 800}, permissions=['camera'], bypass_csp=True)
    c.add_init_script("sessionStorage.setItem('myr2_inst_sesion','1');localStorage.setItem('myr2_video_negocio','true')")
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_timeout(1500)
    pg.click('#b-ir-negocio'); pg.fill('#ng-correo', 'admin@fogondelrio.co'); pg.fill('#ng-clave', 'FOGON-2026'); pg.click('#f-negocio button[type=submit]'); pg.wait_for_timeout(1500)
    # se crea el empleado con ese código para que la cámara lo encuentre
    pg.evaluate(f"(async()=>{{await N.D.crearEmpleado({{nombre:'Luis Cámara',correo:'cam@x.co',rol:'cocina',permisos:N.ROLES.cocina.permisos,clave:'123456'}}); const u=N.D.personal().find(x=>x.correo==='cam@x.co'); await N.D.actualizarEmpleado(u.id,{{carnet:'{COD}',carnet_vence:'2030-01-01'}});}})()"); pg.wait_for_timeout(500)
    pg.click('.ngNav [data-sec=asistencia]'); pg.wait_for_timeout(400)
    print('BarcodeDetector', pg.evaluate("'BarcodeDetector' in window"), 'jsQR', pg.evaluate("typeof jsQR"))
    pg.click('#as-escanear'); pg.wait_for_timeout(2500)
    print('asistencia', pg.evaluate("N.lista('asistencia').map(r=>r.nombre+' '+r.tipo)")); print('gum', pg.evaluate("navigator.mediaDevices.getUserMedia({video:true}).then(s=>'ok '+s.getVideoTracks()[0].label).catch(e=>'error '+e.name+' '+e.message)"))
    print('escaner abierto', pg.locator('#velo-escaner').count(), pg.evaluate("(()=>{const v=document.querySelector('#velo-escaner video');return v?[v.readyState,v.videoWidth,v.videoHeight,v.paused]:null})()"))
    print('jsQR directo', pg.evaluate("(()=>{const v=document.querySelector('#velo-escaner video'); if(!v) return 'sin video'; const c=document.createElement('canvas'); c.width=v.videoWidth;c.height=v.videoHeight; const x=c.getContext('2d'); x.drawImage(v,0,0); const d=x.getImageData(0,0,c.width,c.height); const r=jsQR(d.data,c.width,c.height); return r? r.data : 'nada'})()"))
    pg.wait_for_timeout(3000)
    t = pg.locator('#velo-asis').inner_text() if pg.locator('#velo-asis').count() else 'SIN RESULTADO'
    print('resultado:', t.replace('\n', ' | ')); print('errores', errs[:3]); br.close()
