// Fotos más livianas para la señal de Hatillo: se reducen a 1000 px antes de subirlas
export function compressImage(file, max = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('El archivo debe ser una imagen'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(new File([b], 'foto.jpg', { type: 'image/jpeg' })) : reject(new Error('No se pudo leer la imagen'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

// Sonido de pedido nuevo (no necesita archivo de audio)
let ctx;
export function ding() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = [880, 1175, 1568][i];
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.16);
      o.connect(g).connect(ctx.destination); o.start(now + t); o.stop(now + t + 0.17);
    });
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch { /* sin audio */ }
}
export function unlockAudio() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { /* */ }
}
