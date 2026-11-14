import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.VALHALLA_URL = '';

const { default: app } = await import('../src/app.js');
const { bol, gunSuresi, GUNLUK_BUTCE_DK } = await import('../src/services/gunPlanService.js');
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

const post = (yol, body) =>
  fetch(`${base}${yol}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('günlere bölme: yakalar ayrı günlere düşer', () => {
  const m = (id, yaka, lon) => ({ id, yaka, lat: 41, lon, tur: 'miras' });
  const dizi = [m('a1', 'Avrupa', 28.97), m('a2', 'Avrupa', 28.975), m('a3', 'Avrupa', 28.98), m('b1', 'Anadolu', 29.02), m('b2', 'Anadolu', 29.025)];
  const parcalar = bol(dizi, 2);
  assert.equal(parcalar.length, 2);
  assert.deepEqual(parcalar.map((p) => p.map((x) => x.id).join(',')), ['a1,a2,a3', 'b1,b2']);
});

test('günlere bölme: sığmayan dizi için null döner', () => {
  const dizi = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, yaka: 'Avrupa', lat: 41, lon: 28.9 + i * 0.03, tur: 'muze' }));
  assert.equal(bol(dizi, 1), null);
});

test('çok günlü plan: günler bütçeyi aşmaz, tüm duraklar bir güne ait', async () => {
  const yanit = await post('/plan/gunluk', { gunSayisi: 3 });
  assert.equal(yanit.status, 201);
  const p = await yanit.json();
  assert.equal(p.tur, 'cok-gunlu');
  assert.ok(p.gunler.length >= 1 && p.gunler.length <= 3);
  for (const g of p.gunler) {
    assert.ok(g.duraklar.length >= 1);
    assert.ok(gunSuresi(g.duraklar.map((d) => ({ ...d, yaka: g.yakalar[0] }))) <= GUNLUK_BUTCE_DK + 60);
  }
  assert.equal(p.duraklar.length, p.gunler.reduce((t, g) => t + g.duraklar.length, 0));
  assert.equal(p.bacaklar.length, p.duraklar.length - 1);
  // Atölyeler seçilmedikçe gelmez
  assert.ok(p.duraklar.every((d) => d.tur !== 'atolye'));

  const geri = await (await fetch(`${base}/plan/${p.id}`)).json();
  assert.equal(geri.gunler.length, p.gunler.length);
  const yazdir = await (await fetch(`${base}/plan/${p.id}/yazdir`)).json();
  assert.equal(yazdir.gunler.length, p.gunler.length);
});

test('çok günlü plan: tek gün sığmayanları dışarıda bırakır, erişilebilir modda engelliler çıkar', async () => {
  const p = await (await post('/plan/gunluk', { gunSayisi: 1, erisilebilir: true })).json();
  assert.equal(p.gunler.length, 1);
  assert.ok(p.disarida.length > 0);
  assert.ok(p.duraklar.every((d) => !d.erisilebilirlikUyarisi));
});

test('çok günlü plan: girdi doğrulanır', async () => {
  assert.equal((await post('/plan/gunluk', { gunSayisi: 0 })).status, 400);
  assert.equal((await post('/plan/gunluk', { gunSayisi: 9 })).status, 400);
  assert.equal((await post('/plan/gunluk', { gunSayisi: 2, ilgiler: ['uzay'] })).status, 400);
  const p = await (await post('/plan/gunluk', { gunSayisi: 2, ilgiler: ['atolye'] })).json();
  assert.ok(p.duraklar.every((d) => d.tur === 'atolye'));
});
