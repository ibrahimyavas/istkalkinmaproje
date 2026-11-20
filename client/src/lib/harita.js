// Harita yardımcıları. Yön tarifi bağlantısı Yula'nın mapResolver.js
// dosyasındaki getDirectionsMapsUrl'den uyarlandı.

// Harita stili. Yerelde kendi altyapımız (infra/: PMTiles + İznik stili) kullanılır:
// client/.env.development.local → VITE_HARITA_STIL=http://localhost:8080/harita-stili.json
// Ayar yoksa (ör. Vercel demosu) OpenFreeMap'e (ücretsiz, OSM tabanlı) düşülür.
export const HARITA_STILI =
  import.meta.env.VITE_HARITA_STIL || 'https://tiles.openfreemap.org/styles/positron';

// Durak numaraları için yazı tipi; stilin glyph sunucusunda bulunmalı.
// Kendi stilimizde "Noto Sans Medium", OpenFreeMap'te "Noto Sans Bold" var.
export const HARITA_YAZI_TIPI = import.meta.env.VITE_HARITA_YAZI_TIPI || 'Noto Sans Bold';

export const ISTANBUL_MERKEZ = [29.0, 41.02];

const nokta = (p) => `${Number(p.lat).toFixed(6)},${Number(p.lon).toFixed(6)}`;

export function yolTarifiUrl(nereden, nereye, mod = 'walking') {
  const travelmode = mod === 'transit' ? 'transit' : 'walking';
  const origin = nereden ? `&origin=${nokta(nereden)}` : '';
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${nokta(nereye)}&travelmode=${travelmode}`;
}

function gecerliDuraklar(duraklar = []) {
  return duraklar.filter((d) => Number.isFinite(Number(d?.lat)) && Number.isFinite(Number(d?.lon)));
}

/** Çok duraklı Google Maps rota bağlantısı (başlangıç → ara duraklar → bitiş). */
export function googleMapsRotaUrl(duraklar = [], mod = 'walking') {
  const pts = gecerliDuraklar(duraklar);
  if (!pts.length) return null;
  const travelmode = mod === 'transit' ? 'transit' : 'walking';
  if (pts.length === 1) return yolTarifiUrl(null, pts[0], travelmode);
  const origin = nokta(pts[0]);
  const destination = nokta(pts[pts.length - 1]);
  // Google Maps API=1 en fazla 9 ara durağı güvenle destekler.
  const orta = pts.slice(1, -1).slice(0, 9);
  const wp = orta.length ? `&waypoints=${orta.map(nokta).join('|')}` : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${wp}&travelmode=${travelmode}`;
}

/** Çok duraklı Yandex Maps rota bağlantısı (~ ile ayrılmış duraklar). */
export function yandexMapsRotaUrl(duraklar = [], mod = 'walking') {
  const pts = gecerliDuraklar(duraklar);
  if (!pts.length) return null;
  const rtt = mod === 'transit' ? 'mt' : 'pd';
  if (pts.length === 1) {
    return `https://yandex.com.tr/maps/?pt=${Number(pts[0].lon).toFixed(6)},${Number(pts[0].lat).toFixed(6)}&z=16&l=map`;
  }
  const rtext = pts.map(nokta).join('~');
  return `https://yandex.com.tr/maps/?rtext=${rtext}&rtt=${rtt}`;
}

/** Çok duraklı Apple Maps rota bağlantısı. */
export function appleMapsRotaUrl(duraklar = [], mod = 'walking') {
  const pts = gecerliDuraklar(duraklar);
  if (!pts.length) return null;
  const dirflg = mod === 'transit' ? 'r' : 'w';
  if (pts.length === 1) {
    return `https://maps.apple.com/?daddr=${nokta(pts[0])}&dirflg=${dirflg}`;
  }
  const saddr = nokta(pts[0]);
  const daddr = pts.slice(1).map(nokta).join('+to:');
  return `https://maps.apple.com/?saddr=${saddr}&daddr=${daddr}&dirflg=${dirflg}`;
}

export function mesafeYaz(m) {
  if (m == null) return '';
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export const ZORLUK = {
  kolay: { ad: 'Kolay', aciklama: 'Düz ya da hafif eğimli (en fazla %6)' },
  orta: { ad: 'Orta', aciklama: 'Yer yer yokuş (en fazla %12)' },
  dik: { ad: 'Dik', aciklama: 'Yer yer %12\'yi aşan yokuşlar' },
};

export const MEKAN_TURU = {
  miras: 'Tarihi miras',
  muze: 'Müze',
  carsi: 'Çarşı',
  atolye: 'Zanaat atölyesi',
  film: 'Dizi / film',
  edebiyat: 'Edebiyat',
  sahne: 'Sahne',
  mekan: 'Mekan',
};

export const ZANAAT = {
  ebru: 'Ebru',
  bakircilik: 'Bakırcılık',
  sedef: 'Sedef kakma',
  ahsap: 'Ahşap oyma',
  cini: 'Çini',
  hat: 'Hat sanatı',
  seramik: 'Seramik',
};

export const DURAK_TURU = { vapur: 'Vapur', marmaray: 'Marmaray', metro: 'Metro', tramvay: 'Tramvay', teleferik: 'Teleferik' };
