# Pruebas automáticas

Requieren Python 3, Playwright (`pip install playwright && playwright install chromium`) y Pillow, openpyxl.

Desde la carpeta raíz del proyecto:

```
bash pruebas/correr.sh . 8800 python3 pruebas/v2_flujo.py http://localhost:8800/ salida
bash pruebas/correr.sh . 8801 python3 pruebas/v2_supabase.py http://localhost:8801/
```

- `v2_flujo.py`: recorrido completo en modo demostración (41 comprobaciones). Registro, video, menú, ticket, voz, chat, reservas, panel, caja, menú con foto, publicidad, equipo, roles, consolidado Excel y QR.
- `v2_supabase.py`: el mismo flujo contra un Supabase simulado (13 comprobaciones). Revisa INSERT/UPDATE, fotos al depósito, perfiles del equipo y sondeo.
- `grabar_videos.py`: regenera los videos tutoriales de `video/` (requiere ffmpeg).
