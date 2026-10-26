"""Genera la narración del tutorial (Kokoro, voz ef_dora) y la música de fondo original."""
import json, subprocess, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
OUT = sys.argv[1]
PASOS = [
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
k = Kokoro('kokoro.onnx', 'voices.bin')
guion = {"voz": "ef_dora", "pasos": []}
for pid, txt in PASOS:
    a, sr = k.create(txt.replace('«', '').replace('»', '').replace('la app', 'la aplicación').replace('esta app', 'esta aplicación').replace('ticket', 'tiquete').replace('La app', 'La aplicación'), voice='ef_dora', speed=1.0, lang='es')
    a = np.concatenate([np.zeros(int(sr * .08)), a, np.zeros(int(sr * .15))]).astype(np.float32)
    a = a / max(1e-6, np.abs(a).max()) * 0.89
    sf.write(f'/tmp/{pid}.wav', a, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'/tmp/{pid}.wav', '-af', 'highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '56k', f'{OUT}/{pid}.mp3'], check=True)
    guion["pasos"].append({"id": pid, "texto": txt, "dur": round(len(a) / sr, 2)})
    print(pid, round(len(a) / sr, 2))

# ---------- música original: marimba, bajo, maracas y colchón (100 BPM, 16 compases)
SR = 44100; BPM = 100; beat = 60 / BPM; bars = 16; N = int(SR * beat * 4 * bars)
L = np.zeros(N); Rr = np.zeros(N)
def nota(m): return 440 * 2 ** ((m - 69) / 12)
def pon(buf, x, t, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g
def marimba(f, d=0.9):
    t = np.arange(int(SR * d)) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + .35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22) + .12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 50)) * (1 - np.exp(-t * 900))
def bajo(f, d=.5):
    t = np.arange(int(SR * d)) / SR
    return (np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 4.5) * (1 - np.exp(-t * 300))
def maraca(d=.07, seed=0):
    r = np.random.default_rng(seed); n = r.standard_normal(int(SR * d)); n = np.diff(n, prepend=0)  # brillante
    t = np.arange(len(n)) / SR; return n * np.exp(-t * 60) * .5
def colchon(fs, d):
    t = np.arange(int(SR * d)) / SR; env = np.minimum(1, t / .8) * np.minimum(1, (d - t) / .8)
    return sum(np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.003 * t) for f in fs) * env / len(fs)
acordes = [(60, [60, 64, 67, 72]), (55, [59, 62, 67, 71]), (57, [57, 60, 64, 69]), (53, [57, 60, 65, 69])]   # C G Am F
patron = [0, 2, 1, 3, 2, 1, 3, 2]                     # arpegio en corcheas
for b in range(bars):
    raiz, ac = acordes[b % 4]; t0 = b * 4 * beat
    for k8, idx in enumerate(patron):
        if b % 8 >= 4 and k8 in (5,):             # variación
            idx = 3
        f = nota(ac[idx] + 12); x = marimba(f) * (.30 if k8 % 2 == 0 else .22)
        pon(L, x, t0 + k8 * beat / 2, .9); pon(Rr, x, t0 + k8 * beat / 2 + .012, .75)
    for tb, dur in ((0, .55), (1.5, .3), (2, .55), (3.5, .3)):       # bajo con aire de cumbia
        x = bajo(nota(raiz - 24 + (7 if tb == 2 else 0)), dur) * .55; pon(L, x, t0 + tb * beat); pon(Rr, x, t0 + tb * beat)
    for k16 in range(16):
        g = .16 if k16 % 4 == 2 else .07
        x = maraca(seed=b * 16 + k16) * g; pon(L, x, t0 + k16 * beat / 4, .8); pon(Rr, x, t0 + k16 * beat / 4 + .004, 1.0)
    x = colchon([nota(m) for m in ac[:3]], 4 * beat) * .06; pon(L, x, t0); pon(Rr, x, t0)
mix = np.stack([L, Rr], 1); mix = mix / np.abs(mix).max() * .8
sf.write('/tmp/musica.wav', mix.astype(np.float32), SR)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/musica.wav', '-af', 'loudnorm=I=-20:TP=-2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', f'{OUT}/musica.mp3'], check=True)
guion["musica"] = {"archivo": "musica.mp3", "dur": round(N / SR, 2), "autor": "Música original generada para Mesa y Ruta (sin derechos de terceros)"}
json.dump(guion, open(f'{OUT}/guion.json', 'w'), ensure_ascii=False, indent=1)
print('total voz', sum(p['dur'] for p in guion['pasos']))
