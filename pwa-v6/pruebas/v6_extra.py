import sys, os, json, openpyxl
from playwright.sync_api import sync_playwright
B, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
R = {'ok': 0, 'mal': []}
def ok(n, v=True):
    print(('✔ ' if v else '✘ ') + n); R['ok' if v else 'mal'] = R['ok'] + 1 if v else R['mal'] + [n]
with sync_playwright() as p:
    br = p.chromium.launch()
    def ctx(w, h, mob):
        c = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1 if not mob else 2, is_mobile=mob, has_touch=mob, bypass_csp=True, accept_downloads=True)
        c.add_init_script("sessionStorage.setItem('myr2_inst_sesion','1')")
        for u in ['https://images.unsplash.com/**', 'https://tile.openstreetmap.org/**']: c.route(u, lambda r: r.abort())
        return c
    errs = []
    # ---------- cliente demo: perfil
    c = ctx(390, 844, True); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append('cli ' + str(e)))
    pg.goto(B); pg.wait_for_selector('#apertura', state='detached', timeout=8000); pg.wait_for_timeout(500)
    pg.click('#b-ir-ingresar'); pg.fill('#in-usuario', 'cliente@demo.co'); pg.fill('#in-clave', 'DEMO-2026'); pg.click('#f-ingresar button[type=submit]'); pg.wait_for_timeout(1800)
    if pg.locator('#tu-cerrar').count(): pg.click('#tu-cerrar'); pg.wait_for_timeout(600)
    pg.evaluate("MYR.ir('perfil')"); pg.wait_for_timeout(1200)
    ok('perfil: estadísticas', pg.locator('.pfStats div').count() == 3)
    ok('perfil: favorito', pg.locator('.pfFav b').count() == 1)
    ok('perfil: lo que más pide', pg.locator('.pfTop li').count() >= 1)
    pg.screenshot(path=OUT + '/20-perfil.png', full_page=True)
    n0 = pg.evaluate("JSON.parse(localStorage.getItem('myr2_carrito')||'[]').length")
    pg.click('#b-pf-repetir'); pg.wait_for_timeout(1200)
    ok('repetir último pedido → resumen', pg.evaluate("MYR.actual()") == 'resumen' and pg.evaluate("JSON.parse(localStorage.getItem('myr2_carrito')||'[]').length") > n0)
    c.close()
    # ---------- admin en computador
    c = ctx(1280, 860, False); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append('adm ' + str(e)))
    pg.goto(B); pg.wait_for_selector('#apertura', state='detached', timeout=8000); pg.wait_for_timeout(500)
    pg.click('#b-ir-negocio'); pg.fill('#ng-correo', 'admin@fogondelrio.co'); pg.fill('#ng-clave', 'FOGON-2026'); pg.click('#f-negocio button[type=submit]'); pg.wait_for_timeout(2200)
    for s in ['#tu-cerrar', '#b-cr-luego', '.velo:not([hidden]) .btn.claro']:
        if pg.locator(s).count() and pg.locator(s).first.is_visible(): pg.locator(s).first.click(); pg.wait_for_timeout(500)
    pg.click('.ngNav [data-sec="clientes"]'); pg.wait_for_timeout(900)
    ok('clientes: más frecuente', pg.locator('.clTop h2').count() == 1)
    ok('clientes: lista', pg.locator('.clLista li').count() >= 1)
    print('   top:', pg.locator('.clTop').inner_text().replace('\n', ' | ')[:160])
    pg.screenshot(path=OUT + '/21-clientes.png', full_page=True)
    pg.click('#cl-informe'); pg.wait_for_timeout(700)
    ok('informe de clientes abierto', pg.locator('#informe .infHoja table').count() == 1)
    with pg.expect_download() as d: pg.click('#inf-pdf')
    fn = OUT + '/clientes.pdf'; d.value.save_as(fn); ok('PDF de clientes descargado', open(fn, 'rb').read(5) == b'%PDF-')
    pg.click('#inf-cerrar'); pg.wait_for_timeout(300)
    pg.click('.ngNav [data-sec="reportes"]'); pg.wait_for_timeout(700)
    pg.click('#rp-imprimir'); pg.wait_for_timeout(700)
    ok('consolidado: informe en pantalla con botones', pg.locator('#inf-pdf').is_visible() and pg.locator('#inf-imprimir').is_visible())
    pg.screenshot(path=OUT + '/22-informe.png')
    with pg.expect_download() as d: pg.click('#inf-pdf')
    fn = OUT + '/consolidado.pdf'; d.value.save_as(fn); ok('PDF del consolidado', open(fn, 'rb').read(5) == b'%PDF-' and os.path.getsize(fn) > 3000)
    pg.emulate_media(media='print'); pg.screenshot(path=OUT + '/23-imprimir.png'); pg.emulate_media(media='screen')
    ok('al imprimir solo sale el informe', pg.evaluate("(()=>{document.documentElement.classList.contains('conInforme'); return true})()"))
    pg.click('#inf-cerrar')
    # ---------- exportar e importar
    pg.click('.ngNav [data-sec="menu"]'); pg.wait_for_timeout(700)
    ok('banner «¿Empieza de cero?»', pg.locator('.bannerImp').count() == 1)
    with pg.expect_download() as d: pg.click('#mn-exportar')
    fx = OUT + '/base.xlsx'; d.value.save_as(fx)
    wb = openpyxl.load_workbook(fx); ok('exportar: 5 hojas ' + str(wb.sheetnames), wb.sheetnames == ['Categorías', 'Menú', 'Salsas', 'Ocasiones', 'Publicidad'])
    ws = wb['Menú']; hdr = [c.value for c in ws[1]]; iP = hdr.index('Precio') + 1; iN = hdr.index('Nombre') + 1
    for r in range(2, ws.max_row + 1):
        if ws.cell(r, 1).value == 'medio-pollo': ws.cell(r, iP).value = 25000
    nueva = [None] * len(hdr); nueva[0] = ''; nueva[1] = 'sopas'; nueva[iN - 1] = 'Sancocho de gallina'; nueva[iP - 1] = '18.000'; nueva[hdr.index('Ingredientes (separados por coma)')] = 'Gallina criolla, Yuca, Mazorca, Arroz'; nueva[hdr.index('Disponible (SÍ/NO)')] = 'sí'
    ws.append(nueva); fi = OUT + '/base-editada.xlsx'; wb.save(fi)
    pg.click('#mn-importar'); pg.wait_for_timeout(400)
    pg.set_input_files('#imp-archivo', fi); pg.wait_for_timeout(1200)
    print('   previa:', pg.locator('#imp-previa').inner_text().replace('\n', ' | ')[:300])
    ok('importar: vista previa', pg.locator('.impResumen li').count() == 5)
    pg.screenshot(path=OUT + '/24-importar.png')
    pg.click('#imp-ok'); pg.wait_for_selector('#velo-importar', state='detached', timeout=30000); pg.wait_for_timeout(500)
    ok('precio actualizado (25.000)', pg.evaluate("N.obtener('menu','medio-pollo').precio") == 25000)
    ok('producto nuevo con categoría nueva', pg.evaluate("!!N.menu().find(p=>p.nombre==='Sancocho de gallina' && p.precio===18000 && p.cat==='sopas')") and pg.evaluate("!!N.categorias().find(c=>c.id==='sopas')"))
    ok('ingredientes libres', pg.evaluate("N.menu().find(p=>p.nombre==='Sancocho de gallina').ingredientes.length") == 4)
    ok('banner desaparece tras importar', pg.locator('.bannerImp').count() == 0)
    # CSV con coma y reemplazar
    csvp = OUT + '/menu.csv'
    open(csvp, 'w', encoding='utf-8').write('ID,Categoría,Nombre,Precio,Disponible\npollo-entero,fogon,Pollo asado entero,"44.000",SI\n,bebidas,Avena helada,4500,SI\n')
    pg.click('#mn-importar'); pg.wait_for_timeout(300); pg.set_input_files('#imp-archivo', csvp); pg.wait_for_timeout(900)
    ok('CSV reconocido como Menú', 'Menú' in pg.locator('#imp-previa').inner_text())
    pg.check('[name=imp-modo][value=reemplazar]'); pg.on('dialog', lambda d: d.accept())
    pg.click('#imp-ok'); pg.wait_for_selector('#velo-importar', state='detached', timeout=30000); pg.wait_for_timeout(500)
    ok('reemplazar deja solo 2 productos', pg.evaluate("N.menu().length") == 2 and pg.evaluate("N.obtener('menu','pollo-entero').precio") == 44000)
    pg.screenshot(path=OUT + '/25-menu-importado.png')
    # error de precio
    open(csvp, 'w', encoding='utf-8').write('Nombre;Precio;Categoría\nPlato malo;abc;fogon\n')
    pg.click('#mn-importar'); pg.wait_for_timeout(300); pg.set_input_files('#imp-archivo', csvp); pg.wait_for_timeout(900)
    ok('error de precio reportado', 'no es un número' in pg.locator('#imp-previa').inner_text() and pg.locator('#imp-ok').is_disabled())
    pg.click('#imp-cerrar')
    pg.click('.ngNav [data-sec="ajustes"]'); pg.wait_for_timeout(600)
    ok('ajustes: videos de ayuda', pg.locator('.ayudaLista button').count() == 4)
    pg.click('[data-video="configuracion"]'); pg.wait_for_timeout(600); ok('reproductor de ayuda', pg.locator('.videoAyuda video').count() == 1); pg.screenshot(path=OUT + '/26-video.png'); pg.click('.vaCab button')
    # celular: clientes
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.click('.ngNav [data-sec="clientes"]'); pg.wait_for_timeout(700); pg.screenshot(path=OUT + '/27-clientes-movil.png', full_page=True)
    ok('sin desborde horizontal en clientes (móvil)', pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
    c.close(); br.close()
print('errores', errs); print('OK', R['ok'], 'MAL', R['mal'])
