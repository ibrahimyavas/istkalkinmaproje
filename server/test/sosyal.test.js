import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
// Varsayılan: bellek arka ucu. Postgres ile: TEST_DATABASE_URL=... npm run test:pg
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.VALHALLA_URL = ''; // testler canlı Valhalla'ya bağlı olmasın

const { default: app } = await import('../src/app.js');
const { sirala, bacaklar } = await import('../src/services/optimizer.js');
const { grupGirdisi } = await import('../src/services/grupService.js');
const { polyline6Coz } = await import('../src/services/valhallaService.js');
const { sifirla } = await import('../src/repositories/index.js');

let server;
let base;
before(async () => {
  await sifirla();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const post = (yol, body, headers = {}) =>
  fetch(`${base}${yol}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

const gelecek = (gun = 3) => new Date(Date.now() + gun * 864e5).toISOString();

test('optimizer: karışık sırayı düz bir hatta dizer', () => {
  const p = (id, lon) => ({ id, lat: 41, lon, yaka: 'Avrupa' });
  const noktalar = [p('c', 29.02), p('a', 29.0), p('d', 29.03), p('b', 29.01)];
  const sira = sirala(noktalar).map((i) => noktalar[i].id).join('');
  assert.ok(sira === 'abcd' || sira === 'dcba', sira);
});

test('optimizer: aynı yakadaki duraklar art arda gelir', () => {
  const noktalar = [
    { id: 'avr1', lat: 41.008, lon: 28.978, yaka: 'Avrupa' },
    { id: 'and1', lat: 41.026, lon: 29.015, yaka: 'Anadolu' },
    { id: 'avr2', lat: 41.029, lon: 28.948, yaka: 'Avrupa' },
    { id: 'and2', lat: 40.988, lon: 29.027, yaka: 'Anadolu' },
  ];
  const sirali = sirala(noktalar).map((i) => noktalar[i]);
  const gecis = bacaklar(sirali).filter((b) => b.yakaDegisir).length;
  assert.equal(gecis, 1);
  assert.equal(bacaklar(sirali).find((b) => b.yakaDegisir).tur, 'toplu-tasima');
});

test('optimizer: sabit başlangıç korunur', () => {
  const p = (id, lon) => ({ id, lat: 41, lon, yaka: 'Avrupa' });
  const noktalar = [p('a', 29.0), p('b', 29.01), p('c', 29.02)];
  assert.equal(noktalar[sirala(noktalar, { baslangicId: 'b' })[0]].id, 'b');
});

test('polyline6 çözücü', () => {
  // Valhalla belgelerindeki örnek değil; kodla-çöz turu: tek nokta (41, 29)
  const kodla = (v) => {
    let s = v < 0 ? ~(v << 1) : v << 1;
    let o = '';
    while (s >= 0x20) { o += String.fromCharCode((0x20 | (s & 0x1f)) + 63); s >>= 5; }
    return o + String.fromCharCode(s + 63);
  };
  assert.deepEqual(polyline6Coz(kodla(41e6) + kodla(29e6)), [[29, 41]]);
});

test('keşfet: erişilebilir filtre merdivenli/yokuşlu yerleri çıkarır ve semtleri karıştırır', async () => {
  const tum = await (await fetch(`${base}/kesfet`)).json();
  const eris = await (await fetch(`${base}/kesfet?erisilebilir=1`)).json();
  assert.ok(eris.length < tum.length);
  assert.ok(eris.every((m) => !['merdiven', 'yokus'].includes(m.erisilebilirlik.zemin)));
  assert.notEqual(tum[0].semtId, tum[1].semtId);
});

test('plan: seçilen yerleri sıralar, yaka geçişini toplu taşıma olarak işaretler', async () => {
  const res = await post('/plan', { mekanIdler: ['kadikoy-carsi', 'ayasofya', 'moda-sahili', 'kapalicarsi'] });
  assert.equal(res.status, 201);
  const p = await res.json();
  assert.equal(p.duraklar.length, 4);
  assert.equal(p.bacaklar.filter((b) => b.tur === 'toplu-tasima').length, 1);
  assert.equal(p.geometri.type, 'MultiLineString');
  assert.equal(p.geometriKaynagi, 'yaklasik');
  assert.ok(p.toplam.ziyaretDk > 0);
  const tekrar = await (await fetch(`${base}/plan/${p.id}`)).json();
  assert.equal(tekrar.id, p.id);
});

test('plan: en az 2 yer gerekli', async () => {
  assert.equal((await post('/plan', { mekanIdler: ['ayasofya'] })).status, 400);
});

test('grup girdisi doğrulanır', () => {
  const temel = { baslik: 'Balat yürüyüşü', rumuz: 'ali', kapasite: 5, baslangic: gelecek(), rotaId: 'balat-hikaye' };
  assert.ok(grupGirdisi(temel).veri);
  assert.ok(grupGirdisi({ ...temel, baslangic: '2020-01-01' }).hata);
  assert.ok(grupGirdisi({ ...temel, kapasite: 1 }).hata);
  assert.ok(grupGirdisi({ ...temel, rotaId: null }).hata);
});

test('grup: aç, katıl, dolunca reddet; iletişim yalnızca yönetim anahtarıyla görünür', async () => {
  const ac = await post('/gruplar', {
    baslik: 'Kuzguncuk akşam yürüyüşü', rumuz: 'organizator', kapasite: 2,
    baslangic: gelecek(), rotaId: 'kuzguncuk-hikaye', kurallarKabul: true,
  });
  assert.equal(ac.status, 201);
  const { grup, yonetimAnahtari } = await ac.json();
  assert.ok(yonetimAnahtari);
  assert.equal(grup.yonetimOzeti, undefined);

  const kurallarsiz = await post(`/gruplar/${grup.id}/katil`, { rumuz: 'misafir' });
  assert.equal(kurallarsiz.status, 400);

  const katil = await post(`/gruplar/${grup.id}/katil`, { rumuz: 'misafir', iletisim: 'misafir@example.com', kurallarKabul: true });
  assert.equal(katil.status, 201);

  const dolu = await post(`/gruplar/${grup.id}/katil`, { rumuz: 'ucuncu', kurallarKabul: true });
  assert.equal(dolu.status, 409);

  const acik = await (await fetch(`${base}/gruplar/${grup.id}`)).json();
  assert.ok(!JSON.stringify(acik).includes('misafir@example.com'));
  assert.deepEqual(acik.grup.katilimcilar, ['organizator', 'misafir']);
  assert.equal(acik.bulusma.id, 'kuzguncuk-cami-kilise');

  assert.equal((await fetch(`${base}/gruplar/${grup.id}/yonetim`, { headers: { 'X-Yonetim-Anahtari': 'yanlis' } })).status, 403);
  const yon = await (await fetch(`${base}/gruplar/${grup.id}/yonetim`, { headers: { 'X-Yonetim-Anahtari': yonetimAnahtari } })).json();
  assert.equal(yon.katilimcilar[0].iletisim, 'misafir@example.com');

  assert.equal((await post(`/gruplar/${grup.id}/iptal`, {}, { 'X-Yonetim-Anahtari': yonetimAnahtari })).status, 200);
  const liste = await (await fetch(`${base}/gruplar`)).json();
  assert.ok(!liste.some((g) => g.id === grup.id));
});

test('kişisel plandan grup açılabilir', async () => {
  const p = await (await post('/plan', { mekanIdler: ['ayasofya', 'arasta', 'tiem'] })).json();
  const ac = await post('/gruplar', { baslik: 'Yarımada mini tur', rumuz: 'gezgin', kapasite: 4, baslangic: gelecek(5), planId: p.id, kurallarKabul: true });
  assert.equal(ac.status, 201);
  const { grup } = await ac.json();
  const d = await (await fetch(`${base}/gruplar/${grup.id}`)).json();
  assert.equal(d.rota.tur, 'plan');
  assert.equal(d.rota.duraklar.length, 3);
});

test('aynı anda gelen katılımlar kapasiteyi aşamaz', async () => {
  const { grup } = await (await post('/gruplar', {
    baslik: 'Eşzamanlılık testi', rumuz: 'acan', kapasite: 3,
    baslangic: gelecek(), rotaId: 'kuzguncuk-hikaye', kurallarKabul: true,
  })).json();
  const sonuclar = await Promise.all(
    Array.from({ length: 6 }, (_, i) => post(`/gruplar/${grup.id}/katil`, { rumuz: `kisi${i}`, kurallarKabul: true })),
  );
  const kodlar = sonuclar.map((r) => r.status);
  assert.equal(kodlar.filter((k) => k === 201).length, 2, kodlar.join(','));
  assert.equal(kodlar.filter((k) => k === 409).length, 4, kodlar.join(','));
  const d = await (await fetch(`${base}/gruplar/${grup.id}`)).json();
  assert.equal(d.grup.katilimciSayisi, 3);
});
