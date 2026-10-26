import sys
from playwright.sync_api import sync_playwright
B, OUT = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, bypass_csp=True)
    c.add_init_script("sessionStorage.setItem('myr2_inst_sesion','1')")
    for u in ['https://images.unsplash.com/**', 'https://tile.openstreetmap.org/**']: c.route(u, lambda r: r.abort())
    errs = []; pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)+' '+(e.stack or '')[:400]))
    pg.goto(B); pg.wait_for_selector("#apertura", state="detached", timeout=8000); pg.wait_for_timeout(600)
    pg.click("#b-ir-ingresar")
    pg.wait_for_timeout(500)
    for s,v in [("#in-usuario","cliente@demo.co"),("#in-clave","DEMO-2026")]:
        if pg.locator(s).count(): pg.fill(s,v)
    pg.screenshot(path=OUT+'/00.png')
    pg.click("#f-ingresar button[type=submit]"); pg.wait_for_timeout(2000)
    if pg.locator(".tuVelo").count(): pg.click("#tu-cerrar") if pg.locator("#tu-cerrar").count() else pg.click("#tu-continuar"); pg.wait_for_timeout(800)
    pg.screenshot(path=OUT+'/01-inicio.png'); pg.screenshot(path=OUT+'/01b-inicio.png', full_page=True)
    pg.click("#b-ver-menu"); pg.wait_for_timeout(1000)
    if pg.locator("#velo-modo").is_visible(): pg.click("#velo-modo [data-elegir=recoger]"); pg.wait_for_timeout(300); pg.click("#b-md-cerrar") if pg.locator("#b-md-cerrar").is_visible() else None
    pg.wait_for_timeout(2500); pg.screenshot(path=OUT+'/02-menu.png')
    pg.click("#b-sig"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/03-menu2.png')
    pg.click("#plato"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/04-detalle.png')
    pg.click("#b-dt-agregar"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/05-hoja.png')
    for k in range(3):
        if pg.locator("#v-resumen").is_visible(): break
        pg.click("#b-hoja"); pg.wait_for_timeout(1000); pg.screenshot(path=OUT+f'/06-hoja{k}.png')
    pg.wait_for_timeout(800); pg.screenshot(path=OUT+'/07-resumen.png')
    print('errores', errs)
    br.close()
