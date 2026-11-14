import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.VALHALLA_URL = '';

const { default: app } = await import('../src/app.js');
const { yorumGirdisi, puanOzeti, SIKAYET_ESIGI } = await import('../src/routes/yorum.js');
const { sifirla } = await import('../src/repositories/index.js');

let server;
let base;
let cerez;
before(async () => {
  await sifirla();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  const giris = await fetch(`${base}/admin/giris`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parola: 'test-parola' }) });
  cerez = giris.headers.get('set-cookie').split(';')[0];
});
after(() => server.close());

const istek = (yol, { method = 'GET', body, admin = false } = {}) => fetch(`${base}${yol}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(admin ? { Cookie: cerez } : {}) },
  body: body && JSON.stringify(body),
});

const gecerli = { puan: 5, rumuz: 'Gezgin', metin: 'Kubbenin altında durmak çok etkileyiciydi.', kurallarKabul: true };

test('yorum girdisi doğrulanır', () => {
  assert.ok(yorumGirdisi(gecerli).veri);
  assert.match(yorumGirdisi({ ...gecerli, puan: 6 }).hata, /Puan/);
  assert.match(yorumGirdisi({ ...gecerli, puan: 3.5 }).hata, /Puan/);
  assert.match(yorumGirdisi({ ...gecerli, rumuz: 'a' }).hata, /Rumuz/);
  assert.match(yorumGirdisi({ ...gecerli, metin: 'kısa' }).hata, /10 karakter/);
  assert.match(yorumGirdisi({ ...gecerli, metin: 'Bana yazın: ali@ornek.com lütfen' }).hata, /e-posta/);
  assert.match(yorumGirdisi({ ...gecerli, metin: 'Arayın 0532 123 45 67 bilgi için' }).hata, /telefon/);
});

test('puan özeti', () => {
  assert.deepEqual(puanOzeti([]), { sayi: 0, ortalama: null, dagilim: [0, 0, 0, 0, 0] });
  assert.deepEqual(puanOzeti([{ puan: 5 }, { puan: 4 }, { puan: 4 }]), { sayi: 3, ortalama: 4.3, dagilim: [0, 0, 0, 2, 1] });
});

test('yorum: gönder → onaysızken görünmez → admin onayı → ortalamada görünür → şikâyetle düşer', async () => {
  const y = await istek('/mekanlar/ayasofya/yorumlar', { method: 'POST', body: gecerli });
  assert.equal(y.status, 201);
  const { id, durum } = await y.json();
  assert.equal(durum, 'bekliyor');

  let liste = await (await istek('/mekanlar/ayasofya/yorumlar')).json();
  assert.equal(liste.yorumlar.length, 0);

  assert.equal((await istek(`/admin/yorumlar/${id}`, { method: 'PATCH', body: { durum: 'onaylandi' } })).status, 401);
  assert.equal((await istek(`/admin/yorumlar/${id}`, { method: 'PATCH', body: { durum: 'onaylandi' }, admin: true })).status, 200);

  liste = await (await istek('/mekanlar/ayasofya/yorumlar')).json();
  assert.equal(liste.yorumlar.length, 1);
  assert.equal(liste.ozet.ortalama, 5);
  assert.equal(liste.yorumlar[0].sikayetler, undefined); // iç alanlar gizli

  for (let i = 0; i < SIKAYET_ESIGI; i++) {
    assert.equal((await istek(`/yorumlar/${id}/sikayet`, { method: 'POST', body: { neden: 'spam' } })).status, 200);
  }
  liste = await (await istek('/mekanlar/ayasofya/yorumlar')).json();
  assert.equal(liste.yorumlar.length, 0);
  const admin = await (await istek('/admin/yorumlar?durum=bekliyor', { admin: true })).json();
  assert.equal(admin.find((x) => x.id === id).sikayetler.length, SIKAYET_ESIGI);
});

test('yorum: kurallar, mekan ve bal küpü kontrolleri', async () => {
  assert.equal((await istek('/mekanlar/ayasofya/yorumlar', { method: 'POST', body: { ...gecerli, kurallarKabul: false } })).status, 400);
  assert.equal((await istek('/mekanlar/yok-boyle/yorumlar', { method: 'POST', body: gecerli })).status, 404);
  assert.equal((await istek('/mekanlar/ayasofya/yorumlar', { method: 'POST', body: { ...gecerli, fotoId: 'foto-yok' } })).status, 400);
  const bot = await (await istek('/mekanlar/ayasofya/yorumlar', { method: 'POST', body: { ...gecerli, web: 'http://spam' } })).json();
  assert.equal(bot.id, null);
  const admin = await (await istek('/admin/yorumlar', { admin: true })).json();
  assert.ok(admin.every((y) => y.rumuz === 'Gezgin' && !y.web));
  assert.equal(admin.length, 1); // bal küpüne düşen kaydedilmedi
});
