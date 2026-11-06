// LobaMall · distancia y tiempo estimados, sin servicios de pago.
// Fórmula de Haversine (línea recta) × 1,3 para aproximar las calles y trochas,
// a la velocidad promedio de una moto (configurable, 25 km/h por defecto) + 3 minutos de recogida.
export function haversineKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const FACTOR_VIA = 1.3;

// origen y destino: {lat, lng} o null. refKm: distancia de referencia de la zona si faltan coordenadas.
export function estimar(origen, destino, { refKm = null, kmh = 25 } = {}) {
  let km;
  if (origen && destino && isFinite(origen.lat) && isFinite(destino.lat) && origen.lat != null && destino.lat != null) {
    km = haversineKm(origen, destino) * FACTOR_VIA;
  } else if (refKm != null) km = Number(refKm);
  else km = 1.5; // dentro del pueblo, cuando no hay nada más que usar
  km = Math.max(0.3, Math.round(km * 10) / 10);
  const minutos = Math.max(4, Math.round(km / kmh * 60 + 3));
  return { km, minutos };
}
export const textoDistancia = (km, min) => `${String(km).replace('.', ',')} km — ${min} minutos`;
