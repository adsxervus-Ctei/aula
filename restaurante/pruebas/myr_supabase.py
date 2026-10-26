"""Prueba del modo Supabase con un servidor simulado (auth + REST) en memoria."""
import json, sys, re, uuid, urllib.parse, datetime
from playwright.sync_api import sync_playwright
B = sys.argv[1]
R = []
def ok(n, v=True): R.append((n, bool(v))); print(("OK  " if v else "XX  ") + n, flush=True)
USERS, PED, MSG, PERSONAL = {}, [], [], set()
TOK = {}
def now(): return datetime.datetime.utcnow().isoformat() + "Z"
def sb(route):
    req = route.request; u = urllib.parse.urlparse(req.url); path = u.path; q = urllib.parse.parse_qs(u.query)
    h = req.headers
    assert h.get("apikey") == "sb_publishable_PRUEBA", "falta apikey"
    body = json.loads(req.post_data) if req.post_data else None
    def res(obj, st=200): route.fulfill(status=st, content_type="application/json", body=json.dumps(obj))
    if path == "/auth/v1/signup":
        uid = str(uuid.uuid4()); USERS[body["email"]] = {"id": uid, "pw": body["password"], "md": body.get("data", {})}
        t = "tok-" + uid; TOK[t] = uid
        return res({"access_token": t, "refresh_token": "r" + t, "expires_in": 3600, "user": {"id": uid, "email": body["email"], "user_metadata": body.get("data", {})}})
    if path == "/auth/v1/token":
        us = USERS.get(body.get("email"))
        if not us or us["pw"] != body.get("password"): return res({"error_description": "Invalid login credentials"}, 400)
        t = "tok-" + us["id"]; TOK[t] = us["id"]
        return res({"access_token": t, "refresh_token": "r" + t, "expires_in": 3600, "user": {"id": us["id"], "email": body["email"], "user_metadata": us["md"]}})
    auth = h.get("authorization", "").replace("Bearer ", ""); uid = TOK.get(auth)
    if path.startswith("/rest/v1/"):
        if not uid: return res({"message": "JWT required"}, 401)
        tabla = path.split("/")[-1]; staff = uid in PERSONAL
        def filtro(rows):
            for k, v in q.items():
                if k in ("order", "limit", "select"): continue
                op, val = v[0].split(".", 1)
                rows = [r for r in rows if str(r.get(k)) == val]
            return rows
        if tabla == "personal": return res([{"user_id": uid}] if staff else [])
        if tabla == "pedidos":
            if req.method == "POST":
                assert body["cliente_id"] == uid
                f = {**body, "id": str(uuid.uuid4()), "creado": now()}; PED.append(f); return res([f], 201)
            if req.method == "GET":
                rows = filtro([p for p in PED if staff or p["cliente_id"] == uid]); return res(rows)
            if req.method == "PATCH":
                if not staff: return res([], 200)
                rows = filtro(PED); [r.update(body) for r in rows]; return res(rows)
        if tabla == "mensajes":
            mios = {p["id"] for p in PED if p["cliente_id"] == uid}
            if req.method == "POST":
                if not (staff or body["pedido_id"] in mios): return res({"message": "RLS"}, 403)
                m = {**body, "id": str(uuid.uuid4()), "creado": now()}; MSG.append(m); return res([m], 201)
            rows = filtro([m for m in MSG if staff or m["pedido_id"] in mios]); return res(rows)
    res({"message": "no simulado " + path}, 404)
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(viewport={"width": 390, "height": 844}, locale="es-CO")
    def cfg(route):
        r = route.fetch(); t = r.text().replace("url: '',", "url: 'https://demo.supabase.co',", 1).replace("llave: ''", "llave: 'sb_publishable_PRUEBA'", 1)
        route.fulfill(response=r, body=t)
    ctx.route("**/js/config.js", cfg)
    ctx.route("https://demo.supabase.co/**", sb)
    ctx.add_init_script("localStorage.setItem('myr_modo',JSON.stringify({tipo:'recoger',fuente:'manual'}))")
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_timeout(600)
    ok("modo supabase activo", pg.evaluate("Datos.modo") == "supabase")
    pg.click("#b-ver-menu"); pg.wait_for_timeout(400)
    pg.click("#b-agregar"); pg.click("#b-hoja"); pg.click("#b-hoja"); pg.click("#b-hoja"); pg.wait_for_timeout(500)
    pg.click("#res-pagos [data-pago='efectivo']"); pg.click("#b-pedir"); pg.wait_for_timeout(400)
    for s, v in [("#rg-nombre", "Luis Pérez"), ("#rg-celular", "3109876543"), ("#rg-correo", "luis@ejemplo.co"), ("#rg-clave", "clave123")]: pg.fill(s, v)
    pg.check("#rg-datos"); pg.click("#f-registro button[type=submit]"); pg.wait_for_timeout(700)
    pg.click("#b-pedir"); pg.wait_for_timeout(900)
    ok("pedido guardado en la nube", len(PED) == 1 and pg.locator("#v-pedido").is_visible())
    ok("mensaje del sistema en la nube", len(MSG) == 1)
    pg.click("#b-pd-chat"); pg.wait_for_timeout(500); pg.fill("#ch-txt", "Hola desde la nube"); pg.click("#f-chat button[type=submit]"); pg.wait_for_timeout(500)
    ok("mensaje del cliente en la nube", len(MSG) == 2)
    # personal del negocio
    sid = str(uuid.uuid4()); USERS["cocina@fogon.co"] = {"id": sid, "pw": "personal123", "md": {}}; PERSONAL.add(sid)
    pn = ctx.new_page(); pn.set_viewport_size({"width": 1200, "height": 800}); pn.goto(B + "panel.html"); pn.wait_for_timeout(400)
    pn.fill("#pn-correo", "luis@ejemplo.co"); pn.fill("#pn-clave", "clave123"); pn.click("#f-panel button[type=submit]"); pn.wait_for_timeout(600)
    ok("cliente común no entra al panel", "permiso" in pn.locator("#pn-nota").inner_text())
    pn.fill("#pn-correo", "cocina@fogon.co"); pn.fill("#pn-clave", "personal123"); pn.click("#f-panel button[type=submit]"); pn.wait_for_timeout(800)
    ok("personal ve el pedido", pn.locator("#pn-lista [data-ped]").count() == 1)
    pn.click("#pn-lista [data-ped]"); pn.wait_for_timeout(600)
    pn.click("#pn-detalle [data-estado='confirmado']"); pn.wait_for_timeout(800)
    ok("estado cambiado en la nube", PED[0]["estado"] == "confirmado")
    pg.bring_to_front(); pg.wait_for_timeout(6500)
    ok("cliente ve el estado por sondeo", "Confirmado" in pg.locator("#ch-estado").inner_text())
    ok("sin errores", not errs)
    br.close()
print(json.dumps({"total": len(R), "fallas": [n for n, v in R if not v]}, ensure_ascii=False))
