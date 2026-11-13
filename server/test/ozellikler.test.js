import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
// Varsayılan: bellek arka ucu. Postgres ile: TEST_DATABASE_URL=... npm run test:pg
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.VALHALLA_URL = '';

const { default: app } = await import('../src/app.js');
const { sifirla } = await import('../src/repositories/index.js');
const { jpegMetaVeriSil, dataUrlCoz, konumCoz } = await import('../src/services/fotoService.js');
const { gorselleriYenile, wikiBasligi } = await import('../src/services/wikimediaService.js');
const { sadelestir } = await import('../src/services/yazdirService.js');

let server;
let base;
before(async () => {
  await sifirla();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const istek = (yol, { method = 'GET', body, cookie, headers = {} } = {}) =>
  fetch(`${base}${yol}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
const cerez = (res, ad) => res.headers.getSetCookie().find((c) => c.startsWith(`${ad}=`))?.split(';')[0];
const gelecek = (gun = 5) => new Date(Date.now() + gun * 864e5).toISOString();

async function adminCerezi() {
  const res = await istek('/admin/giris', { method: 'POST', body: { parola: 'test-parola' } });
  return cerez(res, 'p404_admin');
}

// Küçük sahte JPEG: SOI, APP0 (JFIF), APP1 (EXIF + "GPS"), COM, SOS + veri, EOI
function sahteJpeg() {
  const bolum = (isaret, icerik) => {
    const veri = Buffer.from(icerik);
    const b = Buffer.alloc(4);
    b[0] = 0xff; b[1] = isaret; b.writeUInt16BE(veri.length + 2, 2);
    return Buffer.concat([b, veri]);
  };
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    bolum(0xe0, 'JFIF\0\x01\x01\0\0\x01\0\x01\0\0'),
    bolum(0xe1, 'Exif\0\0GPS-41.0365-29.0318-GIZLI'),
    bolum(0xfe, 'yorum: cihaz bilgisi'),
    Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x00]),
    Buffer.alloc(200, 0x55),
    Buffer.from([0xff, 0xd9]),
  ]);
}
const dataUrl = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;

// Wikipedia/Commons toplu sorgularını taklit eder: `titles` parametresindeki her başlığa yanıt verir.
// Küçük harfle başlayan başlıklar, gerçek API gibi "normalized" eşlemesiyle büyük harfe çevrilir.
// Adında "Telifli" geçen dosyalar özgür olmayan lisansla döner.
function sahteWikimedia(istekler = []) {
  return async (url) => {
    istekler.push(url);
    const basliklar = new URL(url).searchParams.get('titles').split('|');
    const normalized = [];
    const buyut = (t) => {
      const [on, ...kalan] = t.startsWith('File:') ? ['File:', t.slice(5)] : ['', t];
      const ad = kalan.join('');
      const yeni = on + ad.charAt(0).toLocaleUpperCase('tr') + ad.slice(1);
      if (yeni !== t) normalized.push({ from: t, to: yeni });
      return yeni;
    };
    let pages;
    if (url.includes('tr.wikipedia.org')) {
      pages = basliklar.map(buyut).map((t) => ({ title: t, pageimage: `${t.replace(/ /g, '_')}.jpg` }));
    } else {
      pages = basliklar.map(buyut).map((t) => ({
        title: t,
        imageinfo: [{
          thumburl: 'https://upload.example/x.jpg',
          descriptionurl: 'https://commons.example/x',
          extmetadata: {
            LicenseShortName: { value: t.includes('Telifli') ? 'Fair use' : 'CC BY-SA 4.0' },
            Artist: { value: '<a href="#">Foto <b>Grafçı</b></a>' },
          },
        }],
      }));
    }
    return { ok: true, status: 200, json: async () => ({ query: { normalized, pages } }) };
  };
}

test('JPEG meta verisi (EXIF/GPS ve yorum) silinir, görüntü verisi korunur', () => {
  const ham = sahteJpeg();
  const temiz = jpegMetaVeriSil(ham);
  assert.ok(ham.includes('GPS-41.0365'));
  assert.ok(!temiz.includes('GPS-41.0365'));
  assert.ok(!temiz.includes('cihaz bilgisi'));
  assert.ok(temiz.includes('JFIF'));
  assert.equal(temiz[0], 0xff);
  assert.equal(temiz[1], 0xd8);
  assert.ok(temiz.includes(Buffer.alloc(200, 0x55)));
});

test('yalnızca JPEG kabul edilir; konum İstanbul dışındaysa reddedilir', () => {
  assert.ok(dataUrlCoz('data:image/png;base64,AAAA').hata);
  assert.ok(dataUrlCoz(dataUrl(Buffer.alloc(300, 1))).hata); // JPEG imzası yok
  assert.ok(dataUrlCoz(dataUrl(sahteJpeg())).buffer);
  assert.equal(konumCoz({ lat: 39.92, lon: 32.85 }), null); // Ankara
  assert.deepEqual(konumCoz({ lat: 41.0365123, lon: 29.0318, dogruluk: 12.4 }), { lat: 41.036512, lon: 29.0318, dogrulukM: 12 });
});

test('fotoğraf: yükle → onaysızken 404 → admin onayı → mekan yanıtında görünür, konum gizli kalır', async () => {
  const izinsiz = await istek('/fotograflar', { method: 'POST', body: { mekanId: 'kuzguncuk-bostani', dosya: dataUrl(sahteJpeg()) } });
  assert.equal(izinsiz.status, 400);

  const yukle = await istek('/fotograflar', {
    method: 'POST',
    body: { mekanId: 'kuzguncuk-bostani', aciklama: 'Hasat günü', ad: 'Ece', dosya: dataUrl(sahteJpeg()), izin: true, konum: { lat: 41.0348, lon: 29.0318 } },
  });
  assert.equal(yukle.status, 201);
  const { id } = await yukle.json();

  assert.equal((await istek(`/fotograflar/${id}/dosya`)).status, 404);
  let mekan = await (await istek('/mekanlar/kuzguncuk-bostani')).json();
  assert.equal(mekan.fotograflar.length, 0);

  const cookie = await adminCerezi();
  const adminDosya = await istek(`/fotograflar/${id}/dosya`, { cookie });
  assert.equal(adminDosya.status, 200);
  assert.equal(adminDosya.headers.get('cache-control'), 'private, no-store');
  const bayt = Buffer.from(await adminDosya.arrayBuffer());
  assert.ok(!bayt.includes('GPS-41.0365'), 'saklanan dosyada EXIF kalmamalı');

  const bekleyen = await (await istek('/admin/fotograflar?durum=bekliyor', { cookie })).json();
  assert.equal(bekleyen.find((f) => f.id === id).konum.lat, 41.0348);

  assert.equal((await istek(`/admin/fotograflar/${id}`, { method: 'PATCH', body: { durum: 'onaylandi' }, cookie })).status, 200);
  const acik = await istek(`/fotograflar/${id}/dosya`);
  assert.equal(acik.status, 200);
  assert.match(acik.headers.get('cache-control'), /public/);

  mekan = await (await istek('/mekanlar/kuzguncuk-bostani')).json();
  assert.equal(mekan.fotograflar.length, 1);
  assert.equal(mekan.fotograflar[0].aciklama, 'Hasat günü');
  assert.equal(mekan.fotograflar[0].konum, undefined);

  const kapak = await (await istek(`/admin/fotograflar/${id}/kapak`, { method: 'POST', cookie })).json();
  assert.equal(kapak.gorsel.tur, 'yukleme');
  assert.equal(kapak.gorsel.fotoId, id);
});

test('konumlu bildirim: mekansızken konum zorunlu, yakın mekan önerilir, konum herkese açık değil', async () => {
  const konumsuz = await istek('/bildirimler', { method: 'POST', body: { tur: 'erisilebilirlik', metin: 'Rampa kırık, geçilemiyor.' } });
  assert.equal(konumsuz.status, 400);

  const f = await (await istek('/fotograflar', { method: 'POST', body: { dosya: dataUrl(sahteJpeg()), izin: true } })).json();
  const res = await istek('/bildirimler', {
    method: 'POST',
    body: { tur: 'erisilebilirlik', metin: 'Kaldırım rampası kırık.', konum: { lat: 41.0368, lon: 29.0318 }, fotoIdler: [f.id] },
  });
  assert.equal(res.status, 201);
  const { id } = await res.json();

  const cookie = await adminCerezi();
  const b = (await (await istek('/admin/bildirimler', { cookie })).json()).find((x) => x.id === id);
  assert.equal(b.konum.lat, 41.0368);
  assert.deepEqual(b.fotoIdler, [f.id]);
  assert.ok(b.enYakinMekan?.id);

  // Mekana bağlı onaylı bildirimde konum yanıttan çıkarılır
  const mb = await (await istek('/bildirimler', { method: 'POST', body: { tur: 'yorum', metin: 'Çok güzel bir yer.', mekanId: 'ayasofya', konum: { lat: 41.0086, lon: 28.9802 } } })).json();
  await istek(`/admin/bildirimler/${mb.id}`, { method: 'PATCH', body: { durum: 'onaylandi' }, cookie });
  const mekan = await (await istek('/mekanlar/ayasofya')).json();
  assert.ok(mekan.bildirimler.length >= 1);
  assert.ok(mekan.bildirimler.every((x) => x.konum === undefined));
});

test('Wikimedia: paylaşılan madde atlanır, özgür olmayan lisans reddedilir, elle kapak korunur', async () => {
  assert.equal(wikiBasligi('https://tr.wikipedia.org/wiki/Kız_Kulesi'), 'Kız Kulesi');
  const mekanlar = [
    { id: 'a', kaynak: 'https://tr.wikipedia.org/wiki/Ayasofya' },
    { id: 'b', kaynak: 'https://tr.wikipedia.org/wiki/Kuzguncuk' },
    { id: 'c', kaynak: 'https://tr.wikipedia.org/wiki/Kuzguncuk' },
    { id: 'd', kaynak: 'https://tr.wikipedia.org/wiki/Telifli_Yapi' },
    { id: 'e', kaynak: 'https://tr.wikipedia.org/wiki/Elle', gorsel: { tur: 'yukleme' } },
    { id: 'f', kaynak: 'Örnek kayıt' },
  ];
  const istekler = [];
  const guncellenen = {};
  const rapor = await gorselleriYenile(mekanlar, async (id, patch) => { guncellenen[id] = patch; }, sahteWikimedia(istekler));
  const durum = Object.fromEntries(rapor.map((r) => [r.mekanId, r.durum]));
  assert.deepEqual(durum, { a: 'guncellendi', b: 'atlandi', c: 'atlandi', d: 'bulunamadi', e: 'atlandi', f: 'atlandi' });
  assert.equal(guncellenen.a.gorsel.yazar, 'Foto Grafçı');
  assert.equal(guncellenen.a.gorsel.lisans, 'CC BY-SA 4.0');
  assert.equal(guncellenen.a.gorsel.dosya, 'Ayasofya.jpg');
  // Toplu istek: madde başına değil, toplam 2 istek (bir Wikipedia, bir Commons)
  assert.equal(istekler.length, 2);
});

test('Wikimedia: gorselMaddesi null olan mekan atlanır ve eski görseli temizlenir; FAL kabul edilir', async () => {
  const guncellenen = {};
  const temel = sahteWikimedia();
  const falFetch = async (url) => {
    const res = await temel(url);
    if (!url.includes('commons')) return res;
    const veri = await res.json();
    for (const p of veri.query.pages) p.imageinfo[0].extmetadata.LicenseShortName.value = 'FAL';
    return { ok: true, status: 200, json: async () => veri };
  };
  const rapor = await gorselleriYenile(
    [
      { id: 'kisi', kaynak: 'https://tr.wikipedia.org/wiki/Barış_Manço', gorselMaddesi: null, gorsel: { tur: 'wikimedia', url: 'portre.jpg' } },
      { id: 'yapi', kaynak: 'https://tr.wikipedia.org/wiki/Sveti_Stefan_Kilisesi' },
    ],
    async (id, patch) => { guncellenen[id] = patch; },
    falFetch,
  );
  assert.equal(rapor[0].durum, 'atlandi');
  assert.match(rapor[0].neden, /önceki görsel kaldırıldı/);
  assert.deepEqual(guncellenen.kisi, { gorsel: null });
  assert.equal(rapor[1].durum, 'guncellendi');
  assert.equal(guncellenen.yapi.gorsel.lisans, 'FAL');
});

test('Wikimedia: 429 gelirse bekleyip yeniden dener; başlık eşlemesi (normalized) izlenir', async () => {
  const istekler = [];
  const temel = sahteWikimedia(istekler);
  let ilk = true;
  const fetchFn = async (url) => {
    if (ilk) { ilk = false; return { ok: false, status: 429, headers: { get: () => '1' } }; }
    return temel(url);
  };
  const beklemeler = [];
  const rapor = await gorselleriYenile(
    [{ id: 'a', kaynak: 'https://tr.wikipedia.org/wiki/kız_kulesi' }],
    async () => {},
    { fetchFn, bekleme: async (ms) => beklemeler.push(ms) },
  );
  assert.equal(rapor[0].durum, 'guncellendi', rapor[0].neden);
  assert.deepEqual(beklemeler, [1000]);
});

test('yazdırma: rota ve plan çıktısında ayrıntılı açıklama ve sade geometri var', async () => {
  const rota = await (await istek('/rotalar/kadikoy-sahne/yazdir')).json();
  assert.equal(rota.tur, 'rota');
  assert.ok(rota.duraklar.every((d) => d.detay?.metin));
  assert.ok(rota.sadeGeometri.coordinates.length <= 300);
  assert.equal(rota.sinirlar.length, 4);

  const plan = await (await istek('/plan', { method: 'POST', body: { mekanIdler: ['ayasofya', 'arasta', 'tiem'] } })).json();
  const py = await (await istek(`/plan/${plan.id}/yazdir`)).json();
  assert.equal(py.duraklar.length, 3);
  assert.ok(py.duraklar.every((d) => d.detay?.metin));
  assert.equal(py.sadeGeometri.type, 'MultiLineString');

  const uzun = Array.from({ length: 2000 }, (_, i) => [29 + i * 1e-5, 41 + Math.sin(i / 50) * 1e-3]);
  const sade = sadelestir(uzun, 300);
  assert.ok(sade.length <= 300 && sade.length > 10);
  assert.deepEqual(sade[0], uzun[0]);
});

test('uzman: başvuru → onay → giriş → etkinlik; başka uzman düzenleyemez; askıya alınınca oturum düşer', async () => {
  const basvuru = (ad) => istek('/uzman/basvuru', {
    method: 'POST',
    body: { ad, uzmanlik: 'cini', atolyeAdi: `${ad} Çini`, iletisim: `${ad}@example.com`, aciklama: 'Yirmi yıldır İznik çinisi üzerine çalışıyorum.', kurallarKabul: true },
  });
  assert.equal((await istek('/uzman/basvuru', { method: 'POST', body: { ad: 'X', uzmanlik: 'yok' } })).status, 400);
  const u1 = await (await basvuru('usta1')).json();
  const u2 = await (await basvuru('usta2')).json();
  assert.equal(u1.durum, 'basvuru');

  // Onaysız uzman giriş yapamaz
  assert.equal((await istek('/uzman/giris', { method: 'POST', body: { anahtar: 'tahmin' } })).status, 401);

  const admin = await adminCerezi();
  const onay1 = await (await istek(`/admin/uzmanlar/${u1.id}/onayla`, { method: 'POST', cookie: admin })).json();
  const onay2 = await (await istek(`/admin/uzmanlar/${u2.id}/onayla`, { method: 'POST', cookie: admin })).json();
  assert.ok(onay1.erisimAnahtari);
  assert.equal(onay1.uzman.anahtarOzeti, undefined);
  const liste = await (await istek('/admin/uzmanlar', { cookie: admin })).json();
  assert.ok(liste.every((u) => u.anahtarOzeti === undefined));

  const giris = async (anahtar) => cerez(await istek('/uzman/giris', { method: 'POST', body: { anahtar } }), 'p404_uzman');
  const c1 = await giris(onay1.erisimAnahtari);
  const c2 = await giris(onay2.erisimAnahtari);
  assert.ok(c1 && c2);
  assert.equal((await (await istek('/uzman/ben', { cookie: c1 })).json()).ad, 'usta1');

  const eksik = await istek('/uzman/etkinlikler', { method: 'POST', cookie: c1, body: { baslik: 'Çini', tur: 'atolye' } });
  assert.equal(eksik.status, 400);
  const olustur = await istek('/uzman/etkinlikler', {
    method: 'POST', cookie: c1,
    body: { baslik: 'Lale motifli çini boyama', tur: 'atolye', aciklama: 'Başlangıç seviyesi; malzemeler dahil, eserler pişirilip teslim edilir.', baslangic: gelecek(), sureDk: 150, kapasite: 3, ucret: '750 TL', mekanId: 'atolye-cini-uskudar', erisilebilir: true },
  });
  assert.equal(olustur.status, 201);
  const e = await olustur.json();
  assert.equal(e.uzmanId, u1.id);
  assert.equal(e.durum, 'yayinda');

  // Başka uzman düzenleyemez ve iptal edemez (varlığı da açığa çıkmaz)
  assert.equal((await istek(`/uzman/etkinlikler/${e.id}`, { method: 'PUT', cookie: c2, body: { baslik: 'Ele geçirildi' } })).status, 404);
  assert.equal((await istek(`/uzman/etkinlikler/${e.id}/iptal`, { method: 'POST', cookie: c2 })).status, 404);
  const duz = await (await istek(`/uzman/etkinlikler/${e.id}`, { method: 'PUT', cookie: c1, body: { kapasite: 2 } })).json();
  assert.equal(duz.kapasite, 2);
  assert.equal(duz.baslik, 'Lale motifli çini boyama');

  // Herkese açık listede ve ayrıntıda görünür (uzman iletişimi olmadan)
  const detay = await (await istek(`/etkinlikler/${e.id}`)).json();
  assert.equal(detay.uzman.ad, 'usta1');
  assert.equal(detay.uzman.iletisim, undefined);
  assert.deepEqual(detay.kontenjan, { toplam: 2, dolu: 0, kalan: 2 });

  // Askıya alınan uzmanın oturumu hemen geçersiz
  await istek(`/admin/uzmanlar/${u2.id}`, { method: 'PATCH', cookie: admin, body: { durum: 'askida' } });
  assert.equal((await istek('/uzman/ben', { cookie: c2 })).status, 401);
});

test('etkinlik kaydı: kontenjan aşılamaz, uzman kayıtları görür, iptal edilen listeden çıkar', async () => {
  const admin = await adminCerezi();
  const u = await (await istek('/uzman/basvuru', {
    method: 'POST',
    body: { ad: 'rehber1', uzmanlik: 'rehber', iletisim: 'r@example.com', aciklama: 'Balat ve Fener\'de on yıldır yürüyüş rehberliği yapıyorum.', kurallarKabul: true },
  })).json();
  const { erisimAnahtari } = await (await istek(`/admin/uzmanlar/${u.id}/onayla`, { method: 'POST', cookie: admin })).json();
  const c = cerez(await istek('/uzman/giris', { method: 'POST', body: { anahtar: erisimAnahtari } }), 'p404_uzman');
  const e = await (await istek('/uzman/etkinlikler', {
    method: 'POST', cookie: c,
    body: { baslik: 'Balat fotoğraf yürüyüşü', tur: 'yuruyus', aciklama: 'İki saatlik, fotoğraf molalı mahalle yürüyüşü.', baslangic: gelecek(3), sureDk: 120, kapasite: 3, ucret: 'Ücretsiz', konumAd: 'Balat İskelesi önü' },
  })).json();
  assert.equal(e.ucretsiz, true);

  const kayit = (kisi) => istek('/talepler', { method: 'POST', body: { etkinlikId: e.id, ad: 'Katılımcı', iletisim: 'k@example.com', kisi } });
  assert.equal((await kayit(2)).status, 201);
  assert.equal((await kayit(2)).status, 409);
  assert.equal((await kayit(1)).status, 201);
  const detay = await (await istek(`/etkinlikler/${e.id}`)).json();
  assert.equal(detay.kontenjan.kalan, 0);
  assert.equal(detay.kayitEngeli, 'Kontenjan doldu');

  const katilimlar = await (await istek('/uzman/katilimlar', { cookie: c })).json();
  assert.equal(katilimlar.length, 2);
  assert.equal(katilimlar[0].iletisim, 'k@example.com');

  await istek(`/uzman/etkinlikler/${e.id}/iptal`, { method: 'POST', cookie: c });
  const liste = await (await istek('/etkinlikler')).json();
  assert.ok(!liste.some((x) => x.id === e.id));
  assert.equal((await kayit(1)).status, 409);

  const g = await (await istek('/admin/gostergeler', { cookie: admin })).json();
  assert.ok(g.gercek.uzmanBasvuru >= 1);
  assert.ok(g.gercek.etkinlikKaydi >= 2);
  assert.ok(typeof g.gercek.fotoYukleme === 'number');
});
