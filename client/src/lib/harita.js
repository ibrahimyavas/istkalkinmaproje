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

export const DURAK_TURU = { vapur: 'Vapur', marmaray: 'Marmaray', metro: 'Metro', tramvay: 'Tramvay' };
