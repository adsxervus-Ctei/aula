"""Narración de los tutoriales (cliente y negocio) con voz latina neutra:
Piper es_MX «claude» (alta calidad, Apache-2.0). La música es la original de la v3."""
import json, subprocess, sys, wave, io
import numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
OUT = sys.argv[1]
V = PiperVoice.load('vits-piper-es_MX-claude-high/es_MX-claude-high.onnx', config_path='vits-piper-es_MX-claude-high/es_MX-claude-high.onnx.json')
CFG = SynthesisConfig(length_scale=1.06, noise_scale=0.6, noise_w_scale=0.7)
CLIENTE = [
 ("c01", "¡Hola! Así de fácil se pide en esta app. Arriba verá las ofertas del día."),
 ("c02", "Toque «Ver el menú». Primero escoja cómo recibe su pedido. Aquí lo pedimos a domicilio."),
 ("c03", "Mueva el mapa hasta que el pin quede sobre su casa. La app calcula la ruta y el valor del domicilio. Luego toque «Confirmar dirección»."),
 ("c04", "Este es el menú. Deslice el plato hacia los lados para ver más, o escoja otra categoría arriba."),
 ("c05", "¿Le gustó? Toque «Agregar al pedido». Puede quitar ingredientes y escoger cuántos quiere."),
 ("c06", "Luego, las salsas. Van en un recipiente aparte."),
 ("c07", "Ahora la bebida, bien fría. Y toque «Confirmar»."),
 ("c08", "En el resumen ve su pedido y el total. Los botones grandes suben o bajan la cantidad."),
 ("c09", "Escoja cómo paga: efectivo, transferencia o tarjeta. Luego toque «Ver ticket»."),
 ("c10", "Revise su ticket y toque «Enviar pedido». ¡Listo! El negocio lo recibe al instante."),
 ("c11", "Aquí sigue su pedido. Cuando esté listo, la app le avisa con voz, y en el mapa ve por dónde va la moto."),
 ("c12", "Si tiene dudas, escríbale al negocio por el chat. ¡Buen provecho!"),
]
NEGOCIO = [
 ("n01", "Bienvenido al panel del negocio. Desde aquí se maneja todo, en el celular, la tableta o el computador."),
 ("n02", "En «Resumen» ve las ventas del día, los gastos y el balance, con la gráfica de las dos últimas semanas."),
 ("n03", "Cuando entra un pedido, suena una alerta. Tóquelo para ver el detalle y el ticket del cliente."),
 ("n04", "Avance el pedido con el botón verde: confirmar, a la cocina y listo. El cliente recibe el aviso con voz."),
 ("n05", "En «Caja y balance» registre los gastos y los ingresos. Abrir y cerrar la caja pide la clave del administrador."),
 ("n06", "En «Menú y fotos» cambia precios, sube las fotos de sus platos y crea ofertas."),
 ("n07", "En «Equipo y roles» crea a sus empleados, les da permisos y genera su carné con código QR."),
 ("n08", "Al llegar a trabajar, cada empleado escanea su carné en «Asistencia», y queda registrada su hora de entrada."),
 ("n09", "Cada quince días la app le recuerda generar el consolidado en Excel. ¡Listo! A vender."),
]
def habla(pid, txt):
    t = txt.replace('«', '').replace('»', '').replace('la app', 'la aplicación').replace('esta app', 'esta aplicación').replace('La app', 'La aplicación').replace('ticket', 'tiquete')
    b = io.BytesIO()
    with wave.open(b, 'wb') as w: V.synthesize_wav(t, w, syn_config=CFG)
    b.seek(0); a, sr = sf.read(b, dtype='float32')
    a = np.concatenate([np.zeros(int(sr * .1)), a, np.zeros(int(sr * .18))]).astype(np.float32)
    sf.write(f'/tmp/{pid}.wav', a, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'/tmp/{pid}.wav', '-af', 'highpass=f=70,equalizer=f=3500:t=q:w=1:g=2,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '56k', f'{OUT}/{pid}.mp3'], check=True)
    return round(len(a) / sr, 2)
g = json.load(open(f'{OUT}/guion.json'))
g['voz'] = 'Piper es_MX claude-high (Apache-2.0)'
g['pasos'] = [{"id": i, "texto": t, "dur": habla(i, t)} for i, t in CLIENTE]
g['negocio'] = [{"id": i, "texto": t, "dur": habla(i, t)} for i, t in NEGOCIO]
json.dump(g, open(f'{OUT}/guion.json', 'w'), ensure_ascii=False, indent=1)
print('cliente', sum(p['dur'] for p in g['pasos']), 'negocio', sum(p['dur'] for p in g['negocio']))
