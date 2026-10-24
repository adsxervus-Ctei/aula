# Aprende JAC · Chimí

Aplicación web instalable (PWA) que acompaña la estrategia pedagógica de
alfabetización digital comunitaria de la JAC Central de Chimí
(San Martín de Loba, Bolívar). Enseña, a su ritmo y sin señal, a usar
JAC Digital y los procedimientos de la Junta.

**Publicar:** vea [`docs/GUIA_DESPLIEGUE.md`](docs/GUIA_DESPLIEGUE.md).

## Qué hace

- 6 talleres y 21 lecciones con lectura en voz alta y resaltado del paso que se lee.
- Práctica con retroalimentación al final de cada taller.
- Glosario «Palabras de la Junta» con audio.
- Búsqueda por texto o por voz.
- Avance con barras de progreso, pestañas En curso / Terminados.
- Tamaño de letra ajustable (tres niveles) y lectura automática.
- Evaluación de usabilidad SUS con código seudónimo, exportable a CSV.
- Apertura con el logo de ASOCOMUNAL y contador 0–100 ligado a la carga real (máximo 2 s, se salta tocando).
- Transiciones entre pantallas que se deslizan según la dirección; la foto del taller viaja de la tarjeta al detalle.
- Funciona sin señal después de abrirla una vez.
- Sincronización opcional con Supabase (apagada por defecto).

## Estructura

```
index.html              Estructura y sistema de íconos
manifest.webmanifest    Datos de instalación
sw.js                   Service worker (caché sin señal) — subir VERSION en cada cambio
css/app.css             Diseño (paleta índigo/lavanda, componentes)
js/contenido.js         TODO el texto pedagógico: editar aquí
js/app.js               Lógica, enrutador, voz, instalación, evaluación
js/sync.js              Envío opcional a Supabase
js/config.js            Llaves de Supabase (vacías = todo local)
fonts/                  Poppins (licencia OFL, incluida)
icons/                  Íconos PNG y capturas para la instalación
img/                    Fotos (ver img/LEAME.txt)
supabase/esquema.sql    Tabla y seguridad, solo si se usa base de datos
.nojekyll               Evita el procesamiento de GitHub Pages
```

## Tecnología

HTML, CSS y JavaScript sin dependencias ni paso de compilación, como JAC
Digital. APIs del navegador: Service Worker y Cache Storage, Web App
Manifest, Web Speech (síntesis y reconocimiento), View Transitions,
Storage (persistencia), Vibration. Todas degradan sin romper la app si el
teléfono no las tiene.

## Licencias

Código y contenido: de la JAC Central de Chimí. Fuente Poppins: SIL Open
Font License 1.1 (`fonts/OFL-Poppins.txt`).
