# Pruebas automáticas

Requieren Python 3, Playwright (`pip install playwright && playwright install chromium`), Pillow y openpyxl.

Desde la carpeta raíz del proyecto:

```
bash pruebas/correr.sh . 8800 python3 pruebas/v3_flujo.py http://localhost:8800/ salida
bash pruebas/correr.sh . 8801 python3 pruebas/v3_supabase.py http://localhost:8801/
bash pruebas/correr.sh . 8802 python3 pruebas/v3_extra.py http://localhost:8802/ salida
```

- `v3_flujo.py`: recorrido completo, 71 comprobaciones. Cubre tutorial, cliente, reservas, seguimiento con GPS, caja con clave, equipo en celular, ajustes, consolidado, roles y la cuenta demo.
- `v3_supabase.py`: el mismo flujo contra un Supabase simulado (13 comprobaciones).
- `v3_extra.py`: pantalla de avisos, mapa con pin al centro y dirección sin mapa.
- `grabar_videos.py`: regenera el video del dueño (requiere ffmpeg).
- `generar_audio_tutorial.py`: regenera la voz y la música del tutorial. Requiere `pip install kokoro-onnx soundfile` y los archivos del modelo `kokoro-v1.0.onnx` y `voices-v1.0.bin`, que se bajan de las versiones publicadas del proyecto kokoro-onnx en GitHub.
