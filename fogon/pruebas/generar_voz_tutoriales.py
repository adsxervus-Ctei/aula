"""Voz de los tutoriales v6: Kokoro (Apache-2.0), voz femenina «ef_dora» con fonética
latinoamericana (espeak es-419: seseo), ritmo pausado y tono cercano."""
import json, subprocess, sys, re
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
K = Kokoro('kokoro.onnx', 'voices.bin')
def pronunciar(t):
    t = t.replace('«', '').replace('»', '')
    for a, b in [('la app', 'la aplicación'), ('esta app', 'esta aplicación'), ('La app', 'La aplicación'), ('ticket', 'tiquete'), ('GitHub', 'Guit Jab'), ('Supabase', 'Supabeis'), ('Excel', 'Éxcel'), ('CSV', 'ce, ese, uve'), ('QR', 'cu erre'), ('Bre-B', 'Bré Be'), ('Google', 'Gúgol'), ('Gmail', 'yi meil'), ('PIN', 'pin'), ('WhatsApp', 'guatsap'), ('Actions', 'Ácshons'), ('Settings', 'Sétings'), ('Pages', 'Péiyes'), ('SQL', 'ese cu ele'), ('Run', 'Ron'), ('Admin', 'Ádmin'), ('Edge Functions', 'Edch Fáncshons'), ('online', 'en línea')]:
        t = t.replace(a, b)
    return t
def habla(pid, txt, out, vel=0.94):
    partes = [p for p in re.split(r'(?<=[.!?])\s+', txt) if p.strip()]
    sr = 24000; trozos = [np.zeros(int(sr * .12), dtype=np.float32)]
    for p in partes:
        a, sr = K.create(pronunciar(p), voice='ef_dora', speed=vel, lang='es-419')
        trozos += [a.astype(np.float32), np.zeros(int(sr * .32), dtype=np.float32)]   # respiro entre frases
    a = np.concatenate(trozos); a = a / max(1e-6, np.abs(a).max()) * .9
    sf.write(f'/tmp/{pid}.wav', a, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'/tmp/{pid}.wav', '-af', 'highpass=f=80,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=120,loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', f'{out}/{pid}.mp3'], check=True)
    return round(len(a) / sr, 2)
if __name__ == '__main__':
    OUT = sys.argv[1]
    CLIENTE = [
     ("c01", "¡Hola! Te muestro en un minuto lo fácil que es pedir. Arriba ves las ofertas del día."),
     ("c02", "Toca «Ver el menú». Primero escoges cómo quieres tu pedido. Esta vez, lo pedimos a domicilio."),
     ("c03", "Mueve el mapa hasta que el pin quede sobre tu casa. La app calcula sola la ruta y el valor del domicilio. Luego tocas «Confirmar dirección»."),
     ("c04", "Este es el menú. Desliza el plato a los lados para ver más, o cambia de categoría arriba. Si tocas el plato, ves su detalle."),
     ("c05", "¿Te antojaste? Toca «Agregar al pedido». Aquí puedes quitar ingredientes y escoger cuántos quieres."),
     ("c06", "Ahora las salsas. Te llegan en un recipiente aparte."),
     ("c07", "Y la bebida, bien fría. Tocas «Confirmar»."),
     ("c08", "En el resumen ves todo tu pedido y el total. Con los botones grandes subes o bajas la cantidad."),
     ("c09", "Escoge cómo pagas: efectivo, transferencia o tarjeta. Y tocas «Ver ticket»."),
     ("c10", "Revisa tu ticket y toca «Enviar pedido». ¡Listo! El negocio lo recibe al instante."),
     ("c11", "Aquí sigues tu pedido. Cuando esté listo, la app te avisa con voz, y en el mapa ves por dónde va la moto."),
     ("c12", "Si tienes alguna duda, escríbele al negocio por el chat. ¡Buen provecho!"),
    ]
    NEGOCIO = [
     ("n01", "¡Bienvenido al panel de tu negocio! Desde aquí manejas todo, en el celular, la tableta o el computador."),
     ("n02", "En «Resumen» ves las ventas del día, los gastos y el balance, con la gráfica de las últimas dos semanas."),
     ("n03", "Cuando entra un pedido, suena una alerta. Lo tocas, y ves el detalle y el ticket del cliente."),
     ("n04", "Avanzas el pedido con el botón verde: confirmar, a la cocina, y listo. El cliente recibe el aviso con voz."),
     ("n05", "En «Caja y balance» registras gastos e ingresos. Para abrir y cerrar la caja, se pide la clave del administrador."),
     ("n06", "En «Menú y fotos» cambias precios, subes las fotos de tus platos y creas ofertas."),
     ("n07", "En «Equipo y roles» creas a tus empleados, les das permisos, y generas su carné con código QR."),
     ("n08", "Cuando llegan a trabajar, cada uno escanea su carné en «Asistencia», y queda registrada la hora de entrada."),
     ("n09", "Y cada quince días, la app te recuerda generar el consolidado en Excel. ¡Listo, a vender!"),
    ]
    g = json.load(open(f'{OUT}/guion.json'))
    g['voz'] = 'Kokoro ef_dora con fonética latinoamericana (es-419), Apache-2.0'
    g['pasos'] = [{"id": i, "texto": t, "dur": habla(i, t, OUT)} for i, t in CLIENTE]
    g['negocio'] = [{"id": i, "texto": t, "dur": habla(i, t, OUT)} for i, t in NEGOCIO]
    json.dump(g, open(f'{OUT}/guion.json', 'w'), ensure_ascii=False, indent=1)
    print('cliente', round(sum(p['dur'] for p in g['pasos']), 1), 'negocio', round(sum(p['dur'] for p in g['negocio']), 1))
