// Güncel sergiler: kurumların kendi resmî sitelerinden 14 Kasım 2026'da elle derlendi.
//
// Kurallar (docs/DEVIR-NOTU.md 5.6):
// - Yalnızca olgusal alanlar: sergi adı, tarihleri, mekan ve kaynak bağlantısı. Kurumun
//   tanıtım metni ya da görseli alınmaz.
// - Ücret ve erişilebilirlik bilinmiyorsa null (arayüz "bilgi yok" der; tahmin edilmez).
// - Sergiler sık değişir: başvuru öncesi (4 Aralık) yeniden kontrol edilmeli. `sonKontrol`
//   tarihi her kayıtta. Bitişi geçen sergi takvimden kendiliğinden düşer.
// - Arter'in sitesi içeriği tarayıcıda yüklediği için buraya alınamadı; elle eklenebilir.
// - Koordinatlar OSM'den (yerel Photon); Yapı Kredi Kültür Sanat için Galatasaray'daki
//   bina konumu yaklaşık girildi.

const SON_KONTROL = '2026-11-14';

const MEKANLAR = {
  istanbulModern: { mekanAd: 'İstanbul Modern', adres: 'Kılıçali Paşa, Tophane İskele Cd., Beyoğlu', lat: 41.02591, lon: 28.98281 },
  pera: { mekanAd: 'Pera Müzesi', adres: 'Meşrutiyet Cd., Tepebaşı, Beyoğlu', lat: 41.0318, lon: 28.9752 },
  saltBeyoglu: { mekanAd: 'Salt Beyoğlu', adres: 'İstiklal Cd., Beyoğlu', lat: 41.03207, lon: 28.9761 },
  saltGalata: { mekanAd: 'Salt Galata', adres: 'Bankalar Cd., Karaköy, Beyoğlu', lat: 41.02381, lon: 28.97346 },
  yky: { mekanAd: 'Yapı Kredi Kültür Sanat', adres: 'İstiklal Cd., Galatasaray, Beyoğlu', lat: 41.03422, lon: 28.97788 },
  sakip: { mekanAd: 'Sakıp Sabancı Müzesi', adres: 'Emirgan, Sarıyer', lat: 41.10602, lon: 29.05563 },
  mesher: { mekanAd: 'Meşher', adres: 'İstiklal Cd., Beyoğlu', lat: 41.03044, lon: 28.97575 },
  borusan: { mekanAd: 'Borusan Contemporary (Perili Köşk)', adres: 'Baltalimanı Hisar Cd., Rumelihisarı, Sarıyer', lat: 41.08907, lon: 29.05656 },
};

const sergi = (id, baslik, baslangic, bitis, mekan, kaynak, ek = {}) => ({
  id: `sergi-${id}`,
  baslik,
  tur: 'sergi',
  baslangic: `${baslangic}T10:00:00+03:00`,
  bitis: bitis ? `${bitis}T18:00:00+03:00` : null,
  tumGun: true,
  ...MEKANLAR[mekan],
  semtId: null,
  mekanId: null,
  ucretsiz: null,
  erisilebilir: null,
  kaynak,
  sonKontrol: SON_KONTROL,
  gercek: true,
  dogrulandi: false,
  ornek: false,
  ...ek,
});

export const sergiler = [
  sergi('ayni-mavinin-altinda', 'Aynı Mavinin Altında', '2026-09-08', null, 'istanbulModern',
    'https://www.istanbulmodern.org/sergi/ayni-mavinin-altinda', { bitisNotu: '2027 boyunca sürüyor (kesin bitiş tarihi sitede yok)' }),
  sergi('manuel-citak', 'Manuel Çıtak: Kendine Ait Bir Ada', '2026-11-05', '2027-05-23', 'istanbulModern',
    'https://www.istanbulmodern.org/sergi/manuel-citak-kendine-ait-bir-ada'),
  sergi('cumhuriyetin-kamera-arkasi', 'Cumhuriyetin Kamera Arkası', '2026-09-29', '2027-03-28', 'pera',
    'https://www.peramuzesi.org.tr/sergi'),
  sergi('frank-bowling', 'Frank Bowling: Yaratım ve Yıkım', '2026-09-29', '2027-01-31', 'pera',
    'https://www.peramuzesi.org.tr/sergi'),
  sergi('denizasiri-ozer-kabas', 'Denizaşırı: Özer Kabaş ve Zamanları', '2026-09-16', '2027-03-14', 'saltBeyoglu',
    'https://saltonline.org/tr/sergi-denizasiri-ozer-kabas-ve-zamanlari-3085'),
  sergi('saltta-15-yil-afisler', 'Salt’ta 15 Yıl: Sergi Afişleri', '2026-09-16', '2026-12-27', 'saltBeyoglu',
    'https://saltonline.org/tr/salt-ta-15-yil-sergi-afisleri-3091'),
  sergi('isi-olmayan-giremez', 'İşi Olmayan Giremez', '2026-10-17', '2027-02-14', 'saltGalata',
    'https://saltonline.org/tr/sergi-isi-olmayan-giremez-3107'),
  sergi('yuzyilin-izleri', 'Yüzyılın İzleri: Koç Topluluğu ve Sanat', '2026-04-08', '2026-11-29', 'yky',
    'https://sanat.ykykultur.com.tr/sergiler/yuzyilin-izleri-koc-toplulugu-ve-sanat'),
  sergi('yoko-ono', 'Yoko Ono: İçses ve İçyapı', '2026-06-25', '2026-12-27', 'sakip',
    'https://www.sakipsabancimuzesi.org/tr/sergiler'),
  sergi('karalamalar-meskler', 'Karalamalar, Meşkler', '2026-06-09', null, 'sakip',
    'https://www.sakipsabancimuzesi.org/tr/sergiler', { bitisNotu: 'Devam ediyor (bitiş tarihi açıklanmadı)' }),
  sergi('seyahat-sanati', 'Seyahat Sanatı: Sadberk Hanım Müzesi ve Ömer Koç Koleksiyonlarından', '2026-05-08', '2027-05-23', 'mesher',
    'https://mesher.org/sergiler/'),
  sergi('zaman-mekan-geometri', 'Zaman Mekân Geometri', '2026-09-19', '2027-08-15', 'borusan',
    'https://www.borusancontemporary.com/tr/sergiler'),
  sergi('perili-haunted', 'Perili | Haunted (koleksiyon sergisi)', '2026-09-19', '2027-08-15', 'borusan',
    'https://www.borusancontemporary.com/tr/sergiler'),
];
