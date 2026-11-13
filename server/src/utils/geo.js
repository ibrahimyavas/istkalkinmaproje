const R = 6371000; // Dünya yarıçapı (m)
const rad = (d) => (d * Math.PI) / 180;

/** İki nokta arası kuş uçuşu mesafe (metre). */
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Listeden noktaya en yakın kaydı ve mesafesini döndürür. */
export function nearest(point, items) {
  let best = null;
  for (const item of items) {
    const m = haversine(point, item);
    if (!best || m < best.mesafeM) best = { ...item, mesafeM: Math.round(m) };
  }
  return best;
}
