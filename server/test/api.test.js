import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
// Varsayılan: bellek arka ucu. Postgres ile: TEST_DATABASE_URL=... npm run test:pg
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';

const { default: app } = await import('../src/app.js');
const { gosterimMetni, publicSiir } = await import('../src/services/poemService.js');
const { buildRoute, tahminiZorluk } = await import('../src/services/mapService.js');
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

const json = (method, body, headers = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body ? JSON.stringify(body) : undefined,
});

test('korumalı şiirde tam metin asla gösterilmez', () => {
  const siir = { telifDurumu: 'korumali', metin: 'tam metin\nikinci\nüçüncü', alinti: null };
  assert.deepEqual(gosterimMetni(siir), { tip: 'yok', metin: null });
  const alintili = { ...siir, alinti: 'a\nb\nc\nd' };
  assert.deepEqual(gosterimMetni(alintili), { tip: 'alinti', metin: 'a\nb' });
  const pub = publicSiir(alintili);
  assert.equal(pub.metin, undefined);
  assert.equal(pub.alinti, undefined);
});

test('kamu malı şiir tam metin döner', () => {
  assert.equal(gosterimMetni({ telifDurumu: 'kamu-mali', metin: 'x' }).tip, 'tam');
});

test('API şiir yanıtında ham metin alanı yok', async () => {
  const list = await (await fetch(`${base}/siirler`)).json();
  assert.ok(list.length > 0);
  for (const s of list) {
    assert.equal(s.metin, undefined);
    if (s.telifDurumu === 'korumali') assert.notEqual(s.gosterim.tip, 'tam');
  }
});

test('zorluk tahmini zemin bilgisinden çıkar', () => {
  const m = (zemin) => ({ erisilebilirlik: { zemin } });
  assert.equal(tahminiZorluk([m('duz'), m('duz')]), 'kolay');
  assert.equal(tahminiZorluk([m('duz'), m('duz'), m('yokus')]), 'orta');
  assert.equal(tahminiZorluk([m('duz'), m('arnavut')]), 'orta');
  assert.equal(tahminiZorluk([m('yokus'), m('merdiven')]), 'dik');
});

test('erişilebilir mod merdivenli/yokuşlu durakları atlar ve mesafeyi kısaltır', () => {
  const rota = { id: 'yok-boyle-bir-rota', duraklar: [{}, {}, {}] };
  const mekanlar = [
    { id: 'a', lat: 41.0, lon: 29.0, erisilebilirlik: { zemin: 'duz', rampa: true } },
    { id: 'b', lat: 41.01, lon: 29.01, erisilebilirlik: { zemin: 'merdiven', rampa: false } },
    { id: 'c', lat: 41.0, lon: 29.02, erisilebilirlik: { zemin: 'duz', rampa: true } },
  ];
  const ctx = { duraklar: [{ id: 'd', lat: 41, lon: 29 }], toplanma: [{ id: 't', lat: 41, lon: 29 }] };
  const normal = buildRoute(rota, mekanlar, ctx);
  const eris = buildRoute(rota, mekanlar, ctx, { erisilebilir: true });
  assert.equal(normal.geometriKaynagi, 'yaklasik');
  assert.equal(eris.duraklar[1].atlanabilir, true);
  assert.equal(eris.geometri.coordinates.length, 2);
  assert.ok(eris.mesafeM < normal.mesafeM);
  assert.equal(eris.duraklar[0].enYakinToplanma.id, 't');
});

test('rota detayı durak, en yakın toplanma alanı ve olay kaydı döner', async () => {
  const res = await fetch(`${base}/rotalar/balat-hikaye?erisilebilir=1`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.duraklar.length >= 4);
  assert.ok(data.duraklar.every((d) => d.enYakinToplanma && d.enYakinDurak));
  assert.equal(data.erisilebilir, true);
});

test('Valhalla çıktısı varsa rota gerçek geometri ve eğim profiliyle döner', async () => {
  const n = await (await fetch(`${base}/rotalar/kadikoy-sahne`)).json();
  assert.equal(n.geometriKaynagi, 'valhalla');
  assert.ok(n.geometri.coordinates.length > 10);
  assert.ok(n.egimProfili.length > 0);
  const e = await (await fetch(`${base}/rotalar/kadikoy-sahne?erisilebilir=1`)).json();
  assert.equal(e.geometriKaynagi, 'valhalla');
  assert.equal(e.merdivenM, 0);
});

test('durak dizisi değişirse eskimiş Valhalla geometrisi kullanılmaz', () => {
  const rota = { id: 'kadikoy-sahne', duraklar: [{}, {}] };
  const mekanlar = [
    { id: 'kadikoy-carsi', lat: 40.99, lon: 29.026, erisilebilirlik: { zemin: 'duz' } },
    { id: 'moda-sahili', lat: 40.98, lon: 29.026, erisilebilirlik: { zemin: 'duz' } },
  ];
  const r = buildRoute(rota, mekanlar, { duraklar: [], toplanma: [] });
  assert.equal(r.geometriKaynagi, 'yaklasik');
});

test('damga: geçerli kod mekanı döner, geçersiz kod 404', async () => {
  const ok = await fetch(`${base}/damga`, json('POST', { kod: 'ays-01' }));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).mekan.id, 'ayasofya');
  const no = await fetch(`${base}/damga`, json('POST', { kod: 'YOK-99' }));
  assert.equal(no.status, 404);
});

test('atölye talebi doğrulanır', async () => {
  const bos = await fetch(`${base}/talepler`, json('POST', { mekanId: 'atolye-cini-uskudar' }));
  assert.equal(bos.status, 400);
  const atolyeDegil = await fetch(`${base}/talepler`, json('POST', { mekanId: 'ayasofya', ad: 'A', iletisim: 'a@b.c', kisi: 2 }));
  assert.equal(atolyeDegil.status, 400);
  const ok = await fetch(`${base}/talepler`, json('POST', { mekanId: 'atolye-cini-uskudar', ad: 'Ayşe', iletisim: 'ayse@example.com', kisi: 2 }));
  assert.equal(ok.status, 201);
});

test('admin uçları oturumsuz 401, girişten sonra erişilebilir; anahtar maskelenir', async () => {
  assert.equal((await fetch(`${base}/admin/gostergeler`)).status, 401);
  assert.equal((await fetch(`${base}/admin/giris`, json('POST', { parola: 'yanlis' }))).status, 401);

  const giris = await fetch(`${base}/admin/giris`, json('POST', { parola: 'test-parola' }));
  assert.equal(giris.status, 200);
  const cookie = giris.headers.get('set-cookie').split(';')[0];

  const g = await fetch(`${base}/admin/gostergeler`, { headers: { cookie } });
  assert.equal(g.status, 200);
  const body = await g.json();
  assert.equal(body.demo.demo, true);
  assert.equal(body.gercek.demo, undefined);
  assert.ok(body.gercek.atolyeTalebi >= 1);

  await fetch(`${base}/admin/ayarlar`, json('PUT', { ai: { saglayici: 'anthropic', apiAnahtari: 'sk-gizli-1234' } }, { cookie }));
  const ayar = await (await fetch(`${base}/admin/ayarlar`, { headers: { cookie } })).json();
  assert.equal(ayar.ai.anahtarIpucu, '••••1234');
  assert.ok(!JSON.stringify(ayar).includes('sk-gizli'));
});

test('bildirim yalnızca admin onayından sonra mekan sayfasında görünür', async () => {
  const giris = await fetch(`${base}/admin/giris`, json('POST', { parola: 'test-parola' }));
  const cookie = giris.headers.get('set-cookie').split(';')[0];
  const created = await (await fetch(`${base}/bildirimler`, json('POST', { tur: 'erisilebilirlik', metin: 'Rampa kırık, girilemiyor.', mekanId: 'ayasofya' }))).json();

  let mekan = await (await fetch(`${base}/mekanlar/ayasofya`)).json();
  assert.equal(mekan.bildirimler.length, 0);

  await fetch(`${base}/admin/bildirimler/${created.id}`, json('PATCH', { durum: 'onaylandi' }, { cookie }));
  mekan = await (await fetch(`${base}/mekanlar/ayasofya`)).json();
  assert.equal(mekan.bildirimler.length, 1);
});
