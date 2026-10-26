# Pruebas automáticas

Requieren Python 3, Playwright (`pip install playwright && playwright install chromium`), Pillow y openpyxl.

Desde la carpeta raíz del proyecto:

```
bash pruebas/correr.sh . 8800 python3 pruebas/v6_flujo.py http://localhost:8800/ salida
bash pruebas/correr.sh . 8801 python3 pruebas/v5_supabase.py http://localhost:8801/
bash pruebas/correr.sh . 8802 python3 pruebas/v5_extra.py http://localhost:8802/ salida
bash pruebas/correr.sh . 8803 python3 pruebas/v4_extra_instalacion_pagos.py http://localhost:8803/ salida
bash pruebas/correr.sh . 8804 python3 pruebas/v6_extra.py http://localhost:8804/ salida
bash pruebas/correr.sh . 8805 python3 pruebas/v6_humo.py http://localhost:8805/ salida
```

| Script | Qué prueba | Comprobaciones |
| --- | --- | --- |
| `v6_flujo.py` | Recorrido completo: tutoriales del cliente y del panel, pedido, reservas, seguimiento con GPS, caja con clave, equipo, ajustes, consolidado de 8 hojas, roles y cuenta demo | 72 |
| `v5_supabase.py` | El mismo flujo contra un Supabase simulado | 13 |
| `v5_extra.py` | Carné (generar, tamaño CR80, verificar original o falso) y asistencia (entrada, salida, doble escaneo, carné falso) | 12 |
| `v4_extra_instalacion_pagos.py` | Instalación, Admin, consolidado «Generar / Más tarde», pagos Bre-B y fotos locales | 20 |
| `v6_extra.py` | Perfil con resumen y «Repetir», clientes frecuentes, informe PDF (clientes y consolidado), exportar e importar Excel y CSV (agregar, reemplazar, errores), videos de ayuda | 24 |
| `v6_humo.py` | Capturas del diseño nuevo: inicio, menú, detalle del plato, receta, salsas, bebidas y resumen | capturas |

`v5_camara.py` prueba el escáner con la cámara. Usa un video falso con el QR del carné: hay que generar un `.y4m` con ffmpeg y pasarlo como argumento.

`generar_voz_tutoriales.py` regenera la voz de los tutoriales con Kokoro (voz `ef_dora`, fonética es-419). Requiere `pip install kokoro-onnx soundfile` y los archivos `kokoro.onnx` y `voices.bin` de las versiones publicadas de kokoro-onnx en GitHub. Uso: `python3 generar_voz_tutoriales.py ../audio/tutorial`.
