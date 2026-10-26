# Pruebas automáticas

Requieren Python 3, Playwright (`pip install playwright && playwright install chromium`), Pillow y openpyxl.

Desde la carpeta raíz del proyecto:

```
bash pruebas/correr.sh . 8800 python3 pruebas/v4_flujo.py http://localhost:8800/ salida
bash pruebas/correr.sh . 8801 python3 pruebas/v4_supabase.py http://localhost:8801/
bash pruebas/correr.sh . 8802 python3 pruebas/v4_extra.py http://localhost:8802/ salida
```

- `v4_flujo.py`: recorrido completo, 71 comprobaciones. Cubre tutorial, cliente, reservas, seguimiento con GPS, caja con clave, equipo en celular, ajustes, consolidado, roles y la cuenta demo.
- `v4_supabase.py`: el mismo flujo contra un Supabase simulado (13 comprobaciones).
- `v4_extra.py`: instalación en cada apertura, Admin tras borrar la base, consolidado con «Generar / Más tarde», pagos con QR Bre-B y comprobante, y fotos locales con respaldo (20 comprobaciones).
- `grabar_videos.py`: regenera el video del dueño (requiere ffmpeg).
- `generar_audio_tutorial.py`: regenera la voz y la música del tutorial. Requiere `pip install kokoro-onnx soundfile` y los archivos del modelo `kokoro-v1.0.onnx` y `voices-v1.0.bin`, que se bajan de las versiones publicadas del proyecto kokoro-onnx en GitHub.
