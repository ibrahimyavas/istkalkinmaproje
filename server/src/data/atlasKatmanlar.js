// İstanbul Atlası coğrafi katmanları:
// - Boğaz odağı (Bosphorus perspective) çerçevesi
// - İstanbul köprüleri ve Avrasya Tüneli (gerçek WGS84 koordinatları)
// - İstanbul Boğazı, Haliç, vapur hatları ve deniz etiketleri
// - Öne çıkan İstanbul simgeleri (mekanlar.js kayıt kimliklerine bağlı)

const COS_LAT = Math.cos((41.05 * Math.PI) / 180);
const LON0 = 27.95;
const LAT0 = 41.62;
const SCALE = 1000;

export function projSvg(lon, lat) {
  return [
    Math.round((lon - LON0) * COS_LAT * SCALE * 10) / 10,
    Math.round((LAT0 - lat) * SCALE * 10) / 10,
  ];
}

function ptsToPath(coords) {
  return coords
    .map(([lon, lat], i) => {
      const [x, y] = projSvg(lon, lat);
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join('');
}

// Boğaz Perspektifi: Kuzeyde Yavuz Sultan Selim Köprüsü'nden güneyde Adalar & Moda'ya,
// batıda Eyüp–Haliç–Tarihi Yarımada'dan doğuda Beykoz–Üsküdar–Kadıköy'e.
const [bx1, by1] = projSvg(28.86, 41.225);
const [bx2, by2] = projSvg(29.18, 40.855);
export const BOGAZ_ODAK_BBOX = [
  Math.round(bx1 * 10) / 10,
  Math.round(by1 * 10) / 10,
  Math.round((bx2 - bx1) * 10) / 10,
  Math.round((by2 - by1) * 10) / 10,
];

// MapLibre (OpenStreetMap) için Boğaz odağı [minLon, minLat, maxLon, maxLat]
export const BOGAZ_ODAK_LL = [28.88, 40.94, 29.13, 41.215];

// İstanbul'un başlıca köprüleri ve Boğaz geçişleri
const HAM_KOPRULER = [
  {
    id: '15-temmuz',
    ad: '15 Temmuz Şehitler Köprüsü',
    kisaAd: 'Boğaziçi Köprüsü',
    tip: 'bogaz',
    yil: 1973,
    uzunluk: '1.560 m',
    baglanti: 'Ortaköy ↔ Beylerbeyi',
    ilceler: ['besiktas', 'uskudar'],
    a: [29.0274, 41.0468],
    b: [29.0414, 41.0442],
  },
  {
    id: 'fsm',
    ad: 'Fatih Sultan Mehmet Köprüsü',
    kisaAd: 'FSM Köprüsü',
    tip: 'bogaz',
    yil: 1988,
    uzunluk: '1.510 m',
    baglanti: 'Rumelihisarı ↔ Kavacık',
    ilceler: ['sariyer', 'beykoz'],
    a: [29.0554, 41.0914],
    b: [29.0676, 41.0906],
  },
  {
    id: 'yss',
    ad: 'Yavuz Sultan Selim Köprüsü',
    kisaAd: 'YSS Köprüsü',
    tip: 'bogaz',
    yil: 2016,
    uzunluk: '2.164 m',
    baglanti: 'Garipçe ↔ Poyrazköy',
    ilceler: ['sariyer', 'beykoz'],
    a: [29.1066, 41.2028],
    b: [29.1198, 41.2024],
  },
  {
    id: 'galata',
    ad: 'Galata Köprüsü',
    kisaAd: 'Galata',
    tip: 'halic',
    yil: 1994,
    uzunluk: '490 m',
    baglanti: 'Eminönü ↔ Karaköy',
    ilceler: ['fatih', 'beyoglu'],
    a: [28.9722, 41.0184],
    b: [28.9746, 41.0218],
  },
  {
    id: 'halic-metro',
    ad: 'Haliç Metro Köprüsü',
    kisaAd: 'Haliç Metro',
    tip: 'halic',
    yil: 2014,
    uzunluk: '936 m',
    baglanti: 'Unkapanı ↔ Azapkapı',
    ilceler: ['fatih', 'beyoglu'],
    a: [28.9634, 41.0232],
    b: [28.9672, 41.0273],
  },
  {
    id: 'ataturk',
    ad: 'Atatürk (Unkapanı) Köprüsü',
    kisaAd: 'Atatürk',
    tip: 'halic',
    yil: 1940,
    uzunluk: '477 m',
    baglanti: 'Unkapanı ↔ Şişhane',
    ilceler: ['fatih', 'beyoglu'],
    a: [28.9658, 41.0223],
    b: [28.9693, 41.0258],
  },
  {
    id: 'halic',
    ad: 'Haliç Köprüsü',
    kisaAd: 'Haliç',
    tip: 'halic',
    yil: 1974,
    uzunluk: '995 m',
    baglanti: 'Ayvansaray ↔ Halıcıoğlu',
    ilceler: ['fatih', 'beyoglu'],
    a: [28.9398, 41.0402],
    b: [28.9447, 41.0458],
  },
  {
    id: 'avrasya',
    ad: 'Avrasya Tüneli',
    kisaAd: 'Avrasya Tüneli',
    tip: 'tunel',
    yil: 2016,
    uzunluk: '5,4 km (deniz altı)',
    baglanti: 'Çatladıkapı ↔ Haydarpaşa',
    ilceler: ['fatih', 'uskudar'],
    a: [28.9762, 41.0014],
    b: [29.0195, 41.0022],
  },
];

export const KOPRULER = HAM_KOPRULER.map((k) => {
  const p1 = projSvg(k.a[0], k.a[1]);
  const p2 = projSvg(k.b[0], k.b[1]);
  const mid = [
    Math.round(((p1[0] + p2[0]) / 2) * 10) / 10,
    Math.round(((p1[1] + p2[1]) / 2) * 10) / 10,
  ];
  return {
    id: k.id,
    ad: k.ad,
    kisaAd: k.kisaAd,
    tip: k.tip,
    yil: k.yil,
    uzunluk: k.uzunluk,
    baglanti: k.baglanti,
    ilceler: k.ilceler,
    a: k.a,
    b: k.b,
    p1,
    p2,
    mid,
  };
});

// Boğaz kanalı, Haliç, klasik vapur hatları ve deniz yazıları
export const SU_YOLLARI = {
  bogazAkis: ptsToPath([
    [29.135, 41.245],
    [29.113, 41.203],
    [29.089, 41.175],
    [29.068, 41.150],
    [29.077, 41.124],
    [29.061, 41.091],
    [29.051, 41.073],
    [29.048, 41.059],
    [29.034, 41.045],
    [29.016, 41.033],
    [29.000, 41.022],
    [28.995, 41.008],
    [28.994, 40.985],
    [28.998, 40.950],
  ]),
  halicAkis: ptsToPath([
    [28.993, 41.017],
    [28.973, 41.020],
    [28.960, 41.028],
    [28.947, 41.039],
    [28.940, 41.052],
    [28.946, 41.064],
  ]),
  vapurHatlari: [
    {
      id: 'eminonu-uskudar',
      ad: 'Eminönü ↔ Üsküdar Vapuru',
      coords: [[28.976, 41.017], [28.995, 41.022], [29.012, 41.027]],
      d: ptsToPath([[28.976, 41.017], [28.995, 41.022], [29.012, 41.027]]),
    },
    {
      id: 'karakoy-kadikoy',
      ad: 'Karaköy ↔ Kadıköy Vapuru',
      coords: [[28.979, 41.021], [28.997, 41.008], [29.021, 40.992]],
      d: ptsToPath([[28.979, 41.021], [28.997, 41.008], [29.021, 40.992]]),
    },
    {
      id: 'besiktas-uskudar',
      ad: 'Beşiktaş ↔ Üsküdar Vapuru',
      coords: [[29.007, 41.041], [29.011, 41.034], [29.013, 41.028]],
      d: ptsToPath([[29.007, 41.041], [29.011, 41.034], [29.013, 41.028]]),
    },
    {
      id: 'kadikoy-adalar',
      ad: 'Kadıköy ↔ Adalar Vapuru',
      coords: [[29.021, 40.990], [29.035, 40.945], [29.067, 40.883]],
      d: ptsToPath([[29.021, 40.990], [29.035, 40.945], [29.067, 40.883]]),
    },
  ],
  etiketler: [
    { id: 'bogaz', ad: 'İSTANBUL BOĞAZI', pos: projSvg(29.055, 41.099), aci: -54, boyut: 11 },
    { id: 'halic', ad: 'HALİÇ', pos: projSvg(28.953, 41.035), aci: 36, boyut: 9.5 },
    { id: 'marmara', ad: 'MARMARA DENİZİ', pos: projSvg(28.955, 40.925), aci: 0, boyut: 13 },
    { id: 'karadeniz', ad: 'KARADENİZ', pos: projSvg(29.08, 41.275), aci: 0, boyut: 13 },
  ],
};

// İstanbul'un başlıca simge yapıları (mekanlar.js id'leri, öncelik sırası ve kısa harita etiketleri)
export const SIMGE_LISTESI = [
  { id: 'ayasofya', kisaAd: 'Ayasofya', oncelik: 1 },
  { id: 'galata-kulesi', kisaAd: 'Galata Kulesi', oncelik: 1 },
  { id: 'kiz-kulesi', kisaAd: 'Kız Kulesi', oncelik: 1 },
  { id: 'dolmabahce-sarayi', kisaAd: 'Dolmabahçe', oncelik: 1 },
  { id: 'rumelihisari', kisaAd: 'Rumelihisarı', oncelik: 1 },
  { id: 'ortakoy-camii', kisaAd: 'Ortaköy', oncelik: 1 },
  { id: 'beylerbeyi-sarayi', kisaAd: 'Beylerbeyi', oncelik: 1 },
  { id: 'eyup-sultan-camii', kisaAd: 'Eyüp Sultan', oncelik: 1 },
  { id: 'sureyya-operasi', kisaAd: 'Süreyya Operası', oncelik: 1 },
  { id: 'sait-faik-muzesi', kisaAd: 'Burgazada · Sait Faik', oncelik: 1 },
  { id: 'muze-topkapi-sarayi', kisaAd: 'Topkapı Sarayı', oncelik: 1 },
  { id: 'kariye', kisaAd: 'Kariye', oncelik: 1 },
  { id: 'sultanahmet-camii', kisaAd: 'Sultanahmet', oncelik: 2 },
  { id: 'muze-yerebatan-sarnici', kisaAd: 'Yerebatan Sarnıcı', oncelik: 2 },
  { id: 'kapalicarsi', kisaAd: 'Kapalıçarşı', oncelik: 2 },
  { id: 'istanbul-modern', kisaAd: 'İstanbul Modern', oncelik: 2 },
  { id: 'pera-muzesi', kisaAd: 'Pera Müzesi', oncelik: 2 },
  { id: 'mihrimah-iskele', kisaAd: 'Mihrimah Sultan', oncelik: 2 },
  { id: 'bulgar-kilisesi', kisaAd: 'Sveti Stefan', oncelik: 2 },
  { id: 'pierre-loti-tepesi', kisaAd: 'Pierre Loti', oncelik: 2 },
  { id: 'rahmi-koc-muzesi', kisaAd: 'Rahmi Koç Müzesi', oncelik: 2 },
  { id: 'sakip-sabanci-muzesi', kisaAd: 'Sabancı Müzesi', oncelik: 2 },
];

export const SIMGE_ID_SET = new Set(SIMGE_LISTESI.map((s) => s.id));
