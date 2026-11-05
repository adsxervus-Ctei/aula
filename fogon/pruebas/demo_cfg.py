"""Las pruebas usan datos de ejemplo: la app se entrega limpia (sin clientes), así que aquí
se activa el modo de ejemplo solo dentro del navegador de prueba (js/config.js modificado al vuelo)."""
from playwright.sync_api import Browser

_DEMO = "cliente: { nombre: 'Ana Demo', correo: 'cliente@demo.co', clave: 'DEMO-2026', celular: '3000000000' },"

def _cfg(route):
    r = route.fetch()
    t = r.text().replace('datosEjemplo: false,', 'datosEjemplo: true,').replace('cliente: null,', _DEMO)
    route.fulfill(response=r, body=t)

_orig = Browser.new_context
def _nuevo(self, *a, **k):
    c = _orig(self, *a, **k)
    c.route('**/js/config.js', _cfg)
    return c
Browser.new_context = _nuevo
