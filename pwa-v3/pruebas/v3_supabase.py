"""Mesa y Ruta v2 en modo Supabase contra un servidor simulado (auth + PostgREST + storage).
Comprueba la forma de las peticiones y el flujo cliente ↔ negocio."""
import json, sys, uuid, urllib.parse, datetime
from playwright.sync_api import sync_playwright
B = sys.argv[1]
R = []
def ok(n, v=True): R.append((n, bool(v))); print(("OK  " if v else "XX  ") + n, flush=True)
USERS, TOK, REG, PERF, FOTOS, PATCHES = {}, {}, {}, {}, [], []
def now(): return datetime.datetime.now(datetime.UTC).isoformat() + "Z"
def sb(route):
    try: return sb2(route)
    except Exception as e:
        import traceback; print("SB-ERR", route.request.method, route.request.url, repr(e)); route.fulfill(status=500, body="{}")
def sb2(route):
    req = route.request; u = urllib.parse.urlparse(req.url); path = u.path; q = urllib.parse.parse_qs(u.query)
    if "/object/public/" in path: return route.fulfill(status=404, body="")
    assert req.headers.get("apikey") == "sb_publishable_PRUEBA"
    body = json.loads(req.post_data) if "json" in (req.headers.get("content-type") or "") and req.post_data else None
    res = lambda o, st=200: route.fulfill(status=st, content_type="application/json", body=json.dumps(o))
    def sesion(uid, email, md): t = "tok-" + uid; TOK[t] = uid; return {"access_token": t, "refresh_token": "r" + t, "expires_in": 3600, "user": {"id": uid, "email": email, "user_metadata": md}}
    if path == "/auth/v1/signup":
        uid = str(uuid.uuid4()); USERS[body["email"]] = {"id": uid, "pw": body["password"], "md": body.get("data", {})}
        if body["email"] in PERF: PERF[body["email"]]["user_id"] = uid
        return res(sesion(uid, body["email"], body.get("data", {})))
    if path == "/auth/v1/token":
        us = USERS.get(body.get("email"))
        if not us or us["pw"] != body.get("password"): return res({"error_description": "Invalid login credentials"}, 400)
        return res(sesion(us["id"], body["email"], us["md"]))
    uid = TOK.get(req.headers.get("authorization", "").replace("Bearer ", ""))
    if path.startswith("/storage/v1/object/medios/"):
        FOTOS.append(path); return res({"Key": path})
    if path == "/rest/v1/perfiles":
        if req.method == "GET":
            if "user_id" in q: return res([{"rol": f["rol"], "permisos": f["permisos"], "nombre": f["nombre"], "celular": ""} for f in PERF.values() if f.get("user_id") == uid])
            return res(list(PERF.values()))
        if req.method == "POST":
            PERF[body["correo"]] = {**body, "user_id": next((x["id"] for e, x in USERS.items() if e == body["correo"]), None)}; return res([PERF[body["correo"]]], 201)
    if path == "/rest/v1/registros":
        col = q.get("coleccion", ["eq."])[0][3:]
        if req.method == "GET":
            rows = [v for (c, i), v in REG.items() if c == col]
            if "id" in q: rows = [v for v in rows if v["id"] == q["id"][0][3:]]
            return res([{"id": v["id"], "datos": v["datos"]} for v in rows])
        if req.method == "POST":
            assert body["autor"] == uid, "autor distinto"
            k = (body["coleccion"], body["id"]); assert k not in REG, "insert duplicado"
            REG[k] = {**body, "creado": now()}; return route.fulfill(status=201, body="")
        if req.method == "PATCH":
            k = (col, q["id"][0][3:])
            if k not in REG: return res([])
            PATCHES.append(k); REG[k]["datos"] = body["datos"]; return res([{"id": k[1]}])
        if req.method == "DELETE": return route.fulfill(status=204, body="")
    res({"message": "no simulado " + path}, 404)

with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(viewport={"width": 390, "height": 844}, locale="es-CO")
    def cfg(route):
        r = route.fetch(); t = r.text().replace("supabase: { url: '', llave: '' }", "supabase: { url: 'https://demo.supabase.co', llave: 'sb_publishable_PRUEBA' }")
        assert "demo.supabase.co" in t; route.fulfill(response=r, body=t)
    ctx.route("**/js/config.js", cfg); ctx.route("https://demo.supabase.co/**", sb)
    ctx.route("https://images.unsplash.com/**", lambda r: r.abort())
    ctx.add_init_script("localStorage.setItem('myr2_modo',JSON.stringify({tipo:'recoger',fuente:'manual'}));localStorage.setItem('myr2_video_cliente','true');localStorage.setItem('myr2_video_negocio','true');localStorage.setItem('myr2_instalar_visto','true')")
    errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_timeout(1200)
    ok("modo supabase", pg.evaluate("N.D.modo") == "supabase")
    ok("menú de ejemplo disponible sin nube", pg.evaluate("N.menu().length") > 10)
    pg.click("#b-ir-registro"); pg.wait_for_timeout(500)
    for s, v in [("#rg-nombre", "Luis Pérez"), ("#rg-correo", "luis@gmail.com"), ("#rg-celular", "3109876543"), ("#rg-clave", "clave123")]: pg.fill(s, v)
    pg.check("#rg-datos"); pg.click("#f-registro button[type=submit]"); pg.wait_for_timeout(1000)
    ok("cliente registrado en la nube", "luis@gmail.com" in USERS and pg.locator("#v-inicio").is_visible())
    pg.click("#b-ver-menu"); pg.wait_for_timeout(500)
    pg.click("#cats-menu [data-cat=rapidas]"); pg.wait_for_timeout(400)
    pg.click("#b-agregar"); pg.click("#b-hoja"); pg.click("#b-hoja"); pg.click("#b-hoja"); pg.wait_for_timeout(600)
    pg.click("#res-pagos [data-pago='efectivo']"); pg.click("#b-pedir"); pg.wait_for_timeout(1200); pg.click("#b-tk-enviar"); pg.wait_for_timeout(1200)
    ped = [v for (c, i), v in REG.items() if c == "pedidos"]
    ok("pedido insertado en registros", len(ped) == 1 and ped[0]["datos"]["estado"] == "recibido")
    ok("mensaje del sistema", any(c == "mensajes" for (c, i) in REG))
    # credencial para entrar sin señal
    ok("credencial local para entrar sin señal", pg.evaluate("!!N.obtener('credenciales','luis@gmail.com')"))
    # personal: superadmin creado por SQL y su cuenta
    USERS["super@plataforma.co"] = {"id": str(uuid.uuid4()), "pw": "super123", "md": {}}
    PERF["super@plataforma.co"] = {"correo": "super@plataforma.co", "nombre": "Equipo", "rol": "superadmin", "permisos": [], "user_id": USERS["super@plataforma.co"]["id"]}
    pn = ctx.new_page(); pn.set_viewport_size({"width": 1280, "height": 800}); pn.on("pageerror", lambda e: errs.append("panel " + str(e)))
    pn.goto(B); pn.wait_for_timeout(1000)
    pn.evaluate("N.D.salir()"); pn.reload(); pn.wait_for_timeout(1000)
    pn.click("#b-ir-negocio"); pn.wait_for_timeout(400); pn.fill("#ng-correo", "super@plataforma.co"); pn.fill("#ng-clave", "super123"); pn.click("#f-negocio button[type=submit]"); pn.wait_for_timeout(2500)
    ok("superadmin entra al panel", pn.locator(".ngNav").count() == 1)
    pn.click(".ngNav [data-sec=pedidos]"); pn.wait_for_timeout(700)
    ok("panel trae el pedido de la nube", pn.locator(".kTarj").count() == 1)
    pn.click(".kTarj"); pn.wait_for_timeout(1200)
    pn.click("#ng-cajon [data-estado='confirmado']"); pn.wait_for_timeout(1000)
    ok("estado cambiado con PATCH", ped[0]["datos"]["estado"] == "confirmado" and ("pedidos", ped[0]["id"]) in PATCHES)
    # foto del menú al depósito
    pn.click("#caj-cerrar"); pn.click(".ngNav [data-sec=menu]"); pn.wait_for_timeout(600); pn.click("[data-editar='perro']"); pn.wait_for_timeout(400)
    from PIL import Image; import io
    b = io.BytesIO(); Image.new("RGB", (600, 600), (200, 80, 40)).save(b, "PNG")
    pn.set_input_files("#pr-archivo", files=[{"name": "perro.png", "mimeType": "image/png", "buffer": b.getvalue()}]); pn.wait_for_timeout(1200)
    pn.click("#pr-form button[type=submit]"); pn.wait_for_timeout(800)
    ok("foto subida al depósito medios", len(FOTOS) == 1 and REG[("menu", "perro")]["datos"]["foto"].startswith("https://demo.supabase.co/storage/v1/object/public/medios/"))
    # empleado por correo
    pn.click(".ngNav [data-sec=equipo]"); pn.wait_for_timeout(500); pn.click("#eq-nuevo"); pn.wait_for_timeout(300)
    pn.fill("#eq-nombre", "Marta Caja"); pn.fill("#eq-correo", "marta@gmail.com"); pn.select_option("#eq-rol", "cajero"); pn.click("#eq-form button[type=submit]"); pn.wait_for_timeout(800)
    ok("perfil de empleada creado", "marta@gmail.com" in PERF and PERF["marta@gmail.com"]["rol"] == "cajero")
    # el cliente ve el cambio por sondeo
    pg.bring_to_front(); pg.wait_for_timeout(7000)
    ok("cliente ve «Confirmado» por sondeo", pg.evaluate("N.lista('pedidos')[0].estado") == "confirmado")
    ok("sin errores", not errs)
    if errs: print(errs[:5])
    br.close()
print(json.dumps({"total": len(R), "fallas": [n for n, v in R if not v]}, ensure_ascii=False))
