// İsteğe bağlı canlı Valhalla bağlantısı. VALHALLA_URL tanımlı değilse (ör. Vercel demosu)
// hiçbir istek yapılmaz ve çağıran taraf yaklaşık geometriye düşer.
const URL_ = () => process.env.VALHALLA_URL || '';
const ZAMAN_ASIMI_MS = 8000;

// build-routes.js'teki profillerle aynı.
const PROFIL = {
  normal: { costing: 'pedestrian', costing_options: { pedestrian: { use_ferry: 0 } } },
  erisilebilir: {
    costing: 'pedestrian',
    costing_options: { pedestrian: { type: 'foot', use_ferry: 0, step_penalty: 3600, use_hills: 0, max_grade: 8, walking_speed: 4 } },
  },
};

export const valhallaAcik = () => Boolean(URL_());

/** Valhalla polyline6 → [[lon, lat], ...] */
export function polyline6Coz(kodlu) {
  const koordinatlar = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const oku = () => {
    let sonuc = 0;
    let kaydir = 0;
    let b;
    do {
      b = kodlu.charCodeAt(i++) - 63;
      sonuc |= (b & 0x1f) << kaydir;
      kaydir += 5;
    } while (b >= 0x20);
    return sonuc & 1 ? ~(sonuc >> 1) : sonuc >> 1;
  };
  while (i < kodlu.length) {
    lat += oku();
    lon += oku();
    koordinatlar.push([lon / 1e6, lat / 1e6]);
  }
  return koordinatlar;
}

/**
 * Duraklar arası yürüme rotası. Başarısızlıkta null döner (çağıran yaklaşık geometriye düşer).
 * @returns {{ koordinatlar, mesafeM, sureDk } | null}
 */
export async function yurumeRotasi(duraklar, { erisilebilir = false } = {}) {
  if (!valhallaAcik() || duraklar.length < 2) return null;
  try {
    const res = await fetch(`${URL_()}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: duraklar.map((d) => ({ lat: d.lat, lon: d.lon, type: 'break' })),
        ...PROFIL[erisilebilir ? 'erisilebilir' : 'normal'],
        units: 'kilometers',
      }),
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
    if (!res.ok) return null;
    const { trip } = await res.json();
    return {
      koordinatlar: trip.legs.flatMap((l, i) => {
        const k = polyline6Coz(l.shape);
        return i ? k.slice(1) : k;
      }),
      mesafeM: Math.round(trip.summary.length * 1000),
      sureDk: Math.round(trip.summary.time / 60),
      // Ardışık duraklar arası her bacağın gerçek yürüme mesafesi/süresi
      bacaklar: trip.legs.map((l) => ({ mesafeM: Math.round(l.summary.length * 1000), sureDk: Math.round(l.summary.time / 60) })),
    };
  } catch (err) {
    console.warn('[valhalla] ulaşılamadı:', err.message);
    return null;
  }
}
