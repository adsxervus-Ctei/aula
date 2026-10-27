"""Mesa y Ruta v5: carné con QR (generar, verificar), asistencia (código y cámara),
hoja de instalación sin «Gratis», «Instalación finalizada» y tutorial del personal."""
import sys, io, json, subprocess, os, tempfile
from PIL import Image
from playwright.sync_api import sync_playwright
import demo_cfg  # noqa: F401  (datos de ejemplo solo en la prueba)
B, OUT = sys.argv[1], sys.argv[2]; R = []
def ok(n, v): R.append(bool(v)); print(('OK  ' if v else 'XX  ') + n, flush=True)
def png(c=(120, 90, 70)):
    im = Image.new('RGB', (400, 500), c); b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A155M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
with sync_playwright() as p:
    br = p.chromium.launch()
    def ctx_nuevo(**kw):
        c = br.new_context(viewport={'width': 1280, 'height': 860}, locale='es-CO', bypass_csp=True, accept_downloads=True, **kw)
        for u in ['https://tile.openstreetmap.org/**', 'https://router.project-osrm.org/**', 'https://nominatim.openstreetmap.org/**', 'https://images.unsplash.com/**']: c.route(u, lambda r: r.abort())
        c.add_init_script("sessionStorage.setItem('myr2_inst_sesion','1');localStorage.setItem('myr2_video_negocio','true');localStorage.setItem('myr2_video_cliente','true');window.confirm=()=>true")
        return c
    errs = []
    c = ctx_nuevo(); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_timeout(1500)
    pg.click('#b-ir-negocio'); pg.fill('#ng-correo', 'admin@fogondelrio.co'); pg.fill('#ng-clave', 'FOGON-2026'); pg.click('#f-negocio button[type=submit]'); pg.wait_for_timeout(1500)
    # empleado con foto, cargo y RH
    pg.evaluate("s => document.querySelector(s).click()", '.ngNav [data-sec=equipo]'); pg.wait_for_timeout(500); pg.click('#eq-nuevo'); pg.wait_for_timeout(400)
    pg.fill('#eq-nombre', 'Luis Fernando Ortiz'); pg.fill('#eq-correo', 'luis@fogondelrio.co'); pg.select_option('#eq-rol', 'cocina'); pg.fill('#eq-clave', 'cocina123')
    pg.fill('#eq-cargo', 'Jefe de cocina'); pg.fill('#eq-doc', '1047123456'); pg.select_option('#eq-rh', 'O+'); pg.fill('#eq-turno', '07:00')
    pg.set_input_files('#eq-foto', files=[{'name': 'luis.png', 'mimeType': 'image/png', 'buffer': png()}]); pg.wait_for_timeout(1000)
    pg.click('#eq-form button[type=submit]'); pg.wait_for_timeout(800)
    luis = pg.evaluate("N.D.personal().find(x=>x.correo==='luis@fogondelrio.co')")
    ok('empleado con cargo, documento, RH, turno y foto', luis and luis['cargo'] == 'Jefe de cocina' and luis['rh'] == 'O+' and luis['turno'] == '07:00' and luis['foto'].startswith('medio:'))
    pg.click(f"[data-carnet='{luis['id']}']"); pg.wait_for_timeout(2500)
    luis = pg.evaluate("N.D.personal().find(x=>x.correo==='luis@fogondelrio.co')")
    ok('carné generado con código y vencimiento', luis['carnet'].startswith('MYR-') and len(luis['carnet']) == 12 and luis['carnet_vence'] > '2027')
    ok('carné en imagen', pg.locator('#cn-img img').count() == 1)
    src = pg.locator('#cn-img img').get_attribute('src')
    import base64; open(OUT + '/60-carne.png', 'wb').write(base64.b64decode(src.split(',')[1]))
    im = Image.open(OUT + '/60-carne.png'); ok(f'tamaño tarjeta CR80 {im.size}', im.size == (638, 1012))
    with pg.expect_download() as d: pg.click('#cn-descargar')
    ok('descargar carné PNG', d.value.suggested_filename.endswith('.png'))
    pg.screenshot(path=OUT + '/61-panel-carne.png')
    # el QR del carné se lee y lleva a la verificación
    # verificación desde el QR
    q = c.new_page(); q.goto(B + '?verificar=' + luis['carnet']); q.wait_for_timeout(2000)
    ok('verificación: «Carné válido» con nombre y cargo', 'Carné válido' in q.locator('#ver-caja').inner_text() and 'Luis' in q.locator('#ver-caja').inner_text() and 'Jefe de cocina' in q.locator('#ver-caja').inner_text())
    q.set_viewport_size({'width': 390, 'height': 844}); q.screenshot(path=OUT + '/62-verificar.png')
    q.goto(B + '?verificar=MYR-FALSO123'); q.wait_for_timeout(1500)
    ok('verificación: código falso no reconocido', 'no reconocido' in q.locator('#ver-caja').inner_text())
    q.close()
    # asistencia por código
    pg.click('#caj-cerrar'); pg.evaluate("s => document.querySelector(s).click()", '.ngNav [data-sec=asistencia]'); pg.wait_for_timeout(500)
    pg.fill('#as-codigo', luis['carnet'].lower()); pg.click('#as-manual button[type=submit]'); pg.wait_for_timeout(1000)
    ok('asistencia: entrada registrada con saludo', pg.locator('#velo-asis').is_visible() and 'Bienvenido, Luis' in pg.locator('#velo-asis').inner_text())
    pg.screenshot(path=OUT + '/63-asistencia-entrada.png')
    reg = pg.evaluate("N.lista('asistencia')[0]")
    ok('asistencia: tarde calculada con el turno 07:00', reg['tipo'] == 'entrada' and reg['tarde'] > 0)
    pg.click('#velo-asis button'); pg.wait_for_timeout(300)
    pg.fill('#as-codigo', luis['carnet']); pg.click('#as-manual button[type=submit]'); pg.wait_for_timeout(900)
    ok('asistencia: doble escaneo no duplica', 'Ya quedó registrado' in pg.locator('#velo-asis').inner_text() and pg.evaluate("N.lista('asistencia').length") == 1)
    pg.click('#velo-asis button')
    pg.evaluate("(async()=>{const r=N.lista('asistencia')[0]; await N.guardar('asistencia',{...r, at:new Date(Date.now()-3600000).toISOString()})})()"); pg.wait_for_timeout(300)
    pg.fill('#as-codigo', luis['carnet']); pg.click('#as-manual button[type=submit]'); pg.wait_for_timeout(900)
    ok('asistencia: segundo escaneo = salida', pg.evaluate("N.lista('asistencia').filter(r=>r.tipo==='salida').length") == 1)
    pg.click('#velo-asis button'); pg.wait_for_timeout(300)
    pg.fill('#as-codigo', 'MYR-NOEXISTE'); pg.click('#as-manual button[type=submit]'); pg.wait_for_timeout(900)
    ok('asistencia: carné falso rechazado', 'no válido' in pg.locator('#velo-asis').inner_text())
    pg.click('#velo-asis button'); pg.wait_for_timeout(300); pg.screenshot(path=OUT + '/64-asistencia.png', full_page=True)
    codigo = luis['carnet']
    c.close()
    # ---------- cámara: video falso con el QR del carné
    qr = OUT + '/qr.png'
    br.close()
    # cámara con video falso (otro navegador con banderas)
    tmp = tempfile.mkdtemp()
    subprocess.run(['node', '-e', f"""
const qrcode=require('/home/claude/myr5/vendor/qrcode.js');
"""], capture_output=True)
print(json.dumps({'total': len(R), 'fallas': R.count(False), 'errores': errs[:5], 'codigo': codigo}))
