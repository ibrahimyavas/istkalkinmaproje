import { test, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';

const { sifirla, grupMesajRepo } = await import('../src/repositories/index.js');
const { atlasOzet, atlasListe, atlasAra, konumCozumle } = await import('../src/services/atlasService.js');
const { bolgeIcinMuzik, mekanIcinMuzik } = await import('../src/services/muzikService.js');
const { vapurRotasiDetay } = await import('../src/routes/vapur.js');

before(async () => {
  await sifirla();
});

test('konumCozumle İstanbul içi ve kıyı noktalarını doğru ilçe ve mahalleye eşler', () => {
  const ayasofya = konumCozumle({ lat: 41.0086, lon: 28.9802 });
  assert.equal(ayasofya.yaka, 'avrupa');
  assert.equal(ayasofya.ilce, 'fatih');
  assert.equal(ayasofya.mahalle, 'cankurtaran');

  const kizKulesi = konumCozumle({ lat: 41.0211, lon: 29.0041 });
  assert.equal(kizKulesi.yaka, 'anadolu');
  assert.equal(kizKulesi.ilce, 'uskudar');
  assert.ok(kizKulesi.mahalle);
});

test('atlasOzet 39 ilçeyi, yakaları ve dominant türleri döner', async () => {
  const d = await atlasOzet();
  assert.equal(Object.keys(d.ilceler).length, 39);
  assert.ok(d.toplam >= 80);
  assert.equal(d.yakalar.avrupa.n + d.yakalar.anadolu.n, d.toplam);
  assert.ok(d.ilceler.fatih.n >= 20);
  assert.ok(Object.keys(d.ilceler.fatih.mahalleler).length > 0);
  assert.ok(Array.isArray(d.ilceler.fatih.dom) && d.ilceler.fatih.dom.length > 0);
  assert.equal(d.bogazOdak.length, 4);
  assert.ok(d.kopruler.length >= 7);
  assert.ok(d.kopruler.some((k) => k.id === '15-temmuz'));
  assert.ok(d.simgeler.length >= 15);
  assert.ok(d.simgeler.some((s) => s.id === 'ayasofya' && Number.isFinite(s.x)));
  assert.ok(d.suYollari?.bogazAkis?.startsWith('M'));
});

test('atlasListe yaka, ilçe, mahalle, tür, rozet ve erişilebilirlik filtrelerini uygular', async () => {
  const ist = await atlasListe();
  assert.equal(ist.seviye, 'istanbul');
  assert.ok(ist.gruplar.length > 0);
  assert.ok(ist.altBolgeler.length > 0);

  const avrupa = await atlasListe({ yaka: 'avrupa' });
  assert.equal(avrupa.seviye, 'yaka');
  assert.equal(avrupa.baslik, 'Avrupa Yakası');
  assert.ok(avrupa.mekanlar.every((m) => m.ilce !== 'kadikoy' && m.ilce !== 'uskudar'));

  const fatih = await atlasListe({ ilce: 'fatih' });
  assert.equal(fatih.seviye, 'ilce');
  assert.equal(fatih.baslik, 'Fatih');
  assert.ok(fatih.altBolgeler.some((m) => m.slug === 'balat'));

  const balat = await atlasListe({ ilce: 'fatih', mahalle: 'balat' });
  assert.equal(balat.seviye, 'mahalle');
  assert.equal(balat.baslik, 'Balat');
  assert.ok(balat.mekanlar.length > 0);

  const fatihMuze = await atlasListe({ ilce: 'fatih', tur: 'muze' });
  assert.ok(fatihMuze.mekanlar.length > 0);
  assert.ok(fatihMuze.mekanlar.every((m) => m.tur === 'muze'));

  const eris = await atlasListe({ ilce: 'fatih', rozet: 'erisilebilir' });
  assert.ok(eris.mekanlar.every((m) => m.erisilebilir === true));

  const simgeler = await atlasListe({ rozet: 'simge' });
  assert.ok(simgeler.mekanlar.length >= 15);
  assert.ok(simgeler.mekanlar.some((m) => m.id === 'ayasofya'));

  const yok = await atlasListe({ ilce: 'olmayan-ilce' });
  assert.equal(yok, null);
});

test('atlasAra Türkçe karakter katlamasıyla mekan ve zanaat arar', async () => {
  const res1 = await atlasAra('ayasofya');
  assert.ok(res1.some((m) => m.id === 'ayasofya'));

  const res2 = await atlasAra('ebru');
  assert.ok(res2.some((m) => m.zanaat === 'ebru' || /ebru/i.test(m.ad)));

  const kisa = await atlasAra('a');
  assert.deepEqual(kisa, []);
});

test('konuma göre müzik torbası ve mekana özel öneriler 3 platform linkiyle döner', async () => {
  const fatih1 = bolgeIcinMuzik({ ilce: 'fatih', bolgeAd: 'Fatih' });
  assert.equal(fatih1.ozel, false);
  assert.ok(fatih1.havuzBoyutu >= 4);
  assert.ok(fatih1.linkler.youtubeMusic.startsWith('https://music.youtube.com/'));
  assert.ok(fatih1.linkler.spotify.startsWith('https://open.spotify.com/'));
  assert.ok(fatih1.linkler.appleMusic.startsWith('https://music.apple.com/'));

  // haric parametresi aynı parçayı tekrarlamaz
  const fatih2 = bolgeIcinMuzik({ ilce: 'fatih', bolgeAd: 'Fatih', haric: fatih1.id });
  assert.notEqual(fatih2.id, fatih1.id);

  // Beyoğlu ve Beşiktaş torbaları
  const beyoglu = bolgeIcinMuzik({ ilce: 'beyoglu', bolgeAd: 'Beyoğlu' });
  assert.ok(beyoglu.eser && beyoglu.sanatci);
  const besiktas = bolgeIcinMuzik({ ilce: 'besiktas', bolgeAd: 'Beşiktaş' });
  assert.ok(besiktas.eser && besiktas.sanatci);

  // Özel birebir mekan eşleştirmesi ("Biz size bunu öneriyoruz")
  const galata = mekanIcinMuzik({ id: 'galata-kulesi', semtId: 'beyoglu', ad: 'Galata Kulesi' }, { ilce: 'beyoglu', ilceAd: 'Beyoğlu' });
  assert.equal(galata.ozel, true);
  assert.equal(galata.etiket, 'Biz size bunu öneriyoruz');
  assert.match(galata.sanatci, /Tatyos/);

  // torbadan: true verilince özel mekan için de bölgenin torbasından rastgele döner
  const galataTorba = mekanIcinMuzik({ id: 'galata-kulesi', semtId: 'beyoglu', ad: 'Galata Kulesi' }, { ilce: 'beyoglu', ilceAd: 'Beyoğlu', haric: galata.id, torbadan: true });
  assert.equal(galataTorba.ozel, false);
  assert.notEqual(galataTorba.id, galata.id);

  // atlasListe otomatik müzik önerisi içerir
  const fatihListe = await atlasListe({ ilce: 'fatih' });
  assert.ok(fatihListe.muzik?.linkler?.spotify);
});

test('grupMesajRepo örnek grup sohbetini listeler ve yeni mesaj kaydeder', async () => {
  const once = await grupMesajRepo.list({ grupId: 'grup-ornek-balat' });
  assert.ok(once.length >= 2);
  const yeni = await grupMesajRepo.create({
    grupId: 'grup-ornek-balat',
    rumuz: 'test_gezgin',
    metin: 'Saat 10:00’da oradayım!',
    yoneticiMi: false,
  });
  assert.ok(yeni.id && yeni.tarih);
  const sonra = await grupMesajRepo.list({ grupId: 'grup-ornek-balat' });
  assert.equal(sonra.length, once.length + 1);
});

test('vapurRotasiDetay yön değişince sırayı tersine çevirir, Sol/Sağ tarafını döndürür ve yeni mekanları bağlar', async () => {
  const gidis = await vapurRotasiDetay('uzun-bogaz', 'gidis');
  const donus = await vapurRotasiDetay('uzun-bogaz', 'donus');
  assert.ok(gidis && donus);
  assert.equal(gidis.siluetler[0].id, donus.siluetler[donus.siluetler.length - 1].id);
  assert.equal(gidis.siluetler[0].taraf, 'sol');
  assert.equal(donus.siluetler[donus.siluetler.length - 1].taraf, 'sag');

  // Yeni eklenen gezilebilir Boğaz yapıları (Küçüksu Kasrı, Anadolu Hisarı, Yoros) veritabanına bağlı
  const kucuksu = gidis.siluetler.find((s) => s.id === 'kucuksu-kasri');
  assert.equal(kucuksu.gezilebilir, true);
  assert.equal(kucuksu.mekanId, 'kucuksu-kasri');

  // Beykoz artık atlasta da görünür
  const oz = await atlasOzet();
  assert.ok(oz.ilceler.beykoz.n >= 4);
});
