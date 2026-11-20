// Örnek gezinti grupları (demo görünümü için). `ornek: true` olanlar arayüzde
// "Örnek grup" etiketiyle gösterilir; yönetim anahtarları yoktur, yalnızca admin yönetir.
export const ornekGruplar = [
  {
    id: 'grup-ornek-balat',
    baslik: 'Cumartesi sabahı Balat yürüyüşü',
    aciklama: 'Sakin tempoda, fotoğraf molalarıyla. Sonunda Kariye\'nin önünde çay.',
    rumuz: 'haliç_gezgini',
    kapasite: 8,
    baslangic: '2026-11-21T10:00:00+03:00',
    dil: 'tr-en',
    erisilebilir: false,
    rotaId: 'balat-hikaye',
    planId: null,
    durum: 'aktif',
    ornek: true,
    olusturma: '2026-11-10T09:00:00.000Z',
    yonetimOzeti: null,
    katilimcilar: [
      { id: 'k-ornek-1', rumuz: 'deniz_k', iletisim: '', tarih: '2026-11-11T09:00:00.000Z' },
      { id: 'k-ornek-2', rumuz: 'backpack_lena', iletisim: '', tarih: '2026-11-12T09:00:00.000Z' },
    ],
  },
  {
    id: 'grup-ornek-kadikoy',
    baslik: 'Erişilebilir Kadıköy–Moda turu',
    aciklama: 'Tekerlekli sandalye ve bebek arabasıyla da katılınabilir; merdivensiz güzergâh.',
    rumuz: 'moda_sakini',
    kapasite: 6,
    baslangic: '2026-11-22T14:00:00+03:00',
    dil: 'tr',
    erisilebilir: true,
    rotaId: 'kadikoy-sahne',
    planId: null,
    durum: 'aktif',
    ornek: true,
    olusturma: '2026-11-10T12:00:00.000Z',
    yonetimOzeti: null,
    katilimcilar: [{ id: 'k-ornek-3', rumuz: 'ayse_t', iletisim: '', tarih: '2026-11-12T10:00:00.000Z' }],
  },
];

export const ornekGrupMesajlar = [
  {
    id: 'gm-ornek-1',
    grupId: 'grup-ornek-balat',
    rumuz: 'haliç_gezgini',
    metin: 'Merhaba! Cumartesi 10:00’da Sveti Stefan Bulgar Kilisesi’nin bahçe kapısı önünde buluşuyoruz.',
    yoneticiMi: true,
    tarih: '2026-11-19T16:15:00.000Z',
  },
  {
    id: 'gm-ornek-2',
    grupId: 'grup-ornek-balat',
    rumuz: 'deniz_k',
    metin: 'Harika, fotoğraf makinesini getiriyorum. Hava serin görünüyor, hırka alalım.',
    yoneticiMi: false,
    tarih: '2026-11-19T18:40:00.000Z',
  },
  {
    id: 'gm-ornek-3',
    grupId: 'grup-ornek-kadikoy',
    rumuz: 'moda_sakini',
    metin: 'Kadıköy vapur iskelesinden düz güzergâhla ilerleyeceğiz, 14:00’te görüşmek üzere!',
    yoneticiMi: true,
    tarih: '2026-11-20T09:30:00.000Z',
  },
];
