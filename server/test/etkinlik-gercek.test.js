import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-parola';
process.env.SESSION_SECRET = 'test-gizli';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.VALHALLA_URL = '';

const { default: app } = await import('../src/app.js');
const { surenMi } = await import('../src/routes/public.js');
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

const al = async (yol) => (await fetch(`${base}${yol}`)).json();

test('sürüyor mu: bitişi gelmemiş sergi sürer, bitişsiz ama notlu sergi sürer, geçmiş etkinlik sürmez', () => {
  const simdi = Date.parse('2026-11-14T12:00:00+03:00');
  assert.equal(surenMi({ baslangic: '2026-09-01T10:00:00+03:00', bitis: '2027-01-31T18:00:00+03:00' }, simdi), true);
  assert.equal(surenMi({ baslangic: '2026-09-01T10:00:00+03:00', bitis: '2026-11-01T18:00:00+03:00' }, simdi), false);
  assert.equal(surenMi({ baslangic: '2026-06-09T10:00:00+03:00', bitis: null, bitisNotu: 'Devam ediyor' }, simdi), true);
  assert.equal(surenMi({ baslangic: '2026-10-01T00:00:00+03:00' }, simdi), false);
});

test('takvim: süren sergiler kaynak bağlantısıyla gelir', async () => {
  const liste = await al('/etkinlikler');
  assert.ok(liste.some((e) => e.tur === 'sergi' && e.gercek && e.kaynak));
});

test('gerçek etkinliğe bu sitede kayıt alınmaz', async () => {
  const d = await al('/etkinlikler/sergi-manuel-citak');
  assert.match(d.kayitEngeli, /sona erdi|düzenleyicinin sitesinde/);
  const y = await fetch(`${base}/talepler`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ etkinlikId: 'sergi-manuel-citak', ad: 'Test', iletisim: 'test@ornek.com', kisi: 1 }),
  });
  assert.equal(y.status, 409);
});

test('veri: festival kayıtları yok; Vikipedi müzeleri kaynak ve Vikiveri kimliğiyle geliyor', async () => {
  const mekanlar = await al('/mekanlar');
  assert.ok(mekanlar.every((m) => !m.id.startsWith('lezzet-') && m.tur !== 'lezzet'));
  const muzeler = mekanlar.filter((m) => m.id.startsWith('muze-'));
  assert.ok(muzeler.length >= 15);
  assert.ok(muzeler.every((m) => m.kaynak.startsWith('https://tr.wikipedia.org/wiki/') && /^Q\d+$/.test(m.wikidata) && m.dogrulandi === false));
  const etkinlikler = await al('/etkinlikler');
  assert.ok(etkinlikler.every((e) => !e.id.startsWith('kyf-')));
});
