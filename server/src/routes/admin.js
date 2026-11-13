import { Router } from 'express';
import {
  semtRepo, mekanRepo, rotaRepo, siirRepo, etkinlikRepo, dunBugunRepo,
  bildirimRepo, talepRepo, olayRepo, ayarRepo, grupRepo, fotoRepo, uzmanRepo,
} from '../repositories/index.js';
import { yonetimGrup, anahtarUret, anahtarOzeti } from '../services/grupService.js';
import { gorselleriYenile } from '../services/wikimediaService.js';
import { uzmanGorunumu } from './uzman.js';
import { requireAdmin, parolaDogruMu, oturumAc, oturumKapat, COOKIE } from '../middleware/adminAuth.js';
import { summarize, demoOrnek } from '../services/indicatorService.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

r.post('/giris', (req, res) => {
  const uretim = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  if (!process.env.ADMIN_PASSWORD || (uretim && !process.env.SESSION_SECRET)) {
    return res.status(503).json({ hata: 'Yönetim girişi kapalı: ADMIN_PASSWORD ve SESSION_SECRET ortam değişkenleri tanımlanmalı.' });
  }
  if (!parolaDogruMu(req.body?.parola)) return res.status(401).json({ hata: 'Parola hatalı' });
  oturumAc(res);
  res.json({ ok: true });
});

r.post('/cikis', (req, res) => {
  oturumKapat(res);
  res.json({ ok: true });
});

r.get('/oturum', (req, res) => {
  const bitis = Number(req.signedCookies?.[COOKIE]);
  res.json({ girisYapildi: Boolean(bitis && bitis > Date.now()) });
});

r.use(requireAdmin);

// İçerik koleksiyonları için genel CRUD.
const KOLEKSIYONLAR = {
  mekanlar: mekanRepo,
  rotalar: rotaRepo,
  siirler: siirRepo,
  etkinlikler: etkinlikRepo,
  dunbugun: dunBugunRepo,
};

function repoOf(req, res) {
  const repo = KOLEKSIYONLAR[req.params.koleksiyon];
  if (!repo) res.status(404).json({ hata: 'Bilinmeyen koleksiyon' });
  return repo;
}

// Not: aşağıdaki /:koleksiyon rotalarından ÖNCE tanımlanmalı.
r.get('/bildirimler', wrap(async (req, res) => {
  res.json((await bildirimRepo.list()).slice().reverse());
}));

r.patch('/bildirimler/:id', wrap(async (req, res) => {
  const durum = req.body?.durum;
  if (!['onaylandi', 'reddedildi', 'bekliyor'].includes(durum)) return res.status(400).json({ hata: 'Durum geçersiz' });
  const item = await bildirimRepo.update(req.params.id, { durum });
  if (!item) return res.status(404).json({ hata: 'Bulunamadı' });
  res.json(item);
}));

r.get('/talepler', wrap(async (req, res) => {
  res.json((await talepRepo.list()).slice().reverse());
}));

r.patch('/talepler/:id', wrap(async (req, res) => {
  const durum = req.body?.durum;
  if (!['yeni', 'iletildi', 'tamamlandi', 'iptal'].includes(durum)) return res.status(400).json({ hata: 'Durum geçersiz' });
  const item = await talepRepo.update(req.params.id, { durum });
  if (!item) return res.status(404).json({ hata: 'Bulunamadı' });
  res.json(item);
}));

r.get('/gruplar', wrap(async (req, res) => {
  const list = await grupRepo.list();
  res.json(list.map(yonetimGrup).sort((a, b) => b.olusturma.localeCompare(a.olusturma)));
}));

r.patch('/gruplar/:id', wrap(async (req, res) => {
  const durum = req.body?.durum;
  if (!['aktif', 'iptal', 'kaldirildi'].includes(durum)) return res.status(400).json({ hata: 'Durum geçersiz' });
  const g = await grupRepo.update(req.params.id, { durum });
  if (!g) return res.status(404).json({ hata: 'Bulunamadı' });
  res.json(yonetimGrup(g));
}));

// ── Fotoğraflar ─────────────────────────────────────────
r.get('/fotograflar', wrap(async (req, res) => {
  const durum = typeof req.query.durum === 'string' ? req.query.durum : undefined;
  const list = await fotoRepo.list({ durum });
  res.json(list
    .map((f) => ({ ...f, url: `/api/fotograflar/${f.id}/dosya` }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih)));
}));

r.patch('/fotograflar/:id', wrap(async (req, res) => {
  const durum = req.body?.durum;
  if (!['onaylandi', 'reddedildi', 'bekliyor'].includes(durum)) return res.status(400).json({ hata: 'Durum geçersiz' });
  const f = await fotoRepo.update(req.params.id, { durum, inceleme: new Date().toISOString() });
  if (!f) return res.status(404).json({ hata: 'Bulunamadı' });
  res.json(f);
}));

r.delete('/fotograflar/:id', wrap(async (req, res) => {
  if (!(await fotoRepo.remove(req.params.id))) return res.status(404).json({ hata: 'Bulunamadı' });
  res.status(204).end();
}));

// Onaylı bir ziyaretçi fotoğrafını mekanın kapak görseli yapar (Wikimedia yenilemesi bunu ezmez).
r.post('/fotograflar/:id/kapak', wrap(async (req, res) => {
  const f = await fotoRepo.get(req.params.id);
  if (!f) return res.status(404).json({ hata: 'Bulunamadı' });
  if (!f.mekanId) return res.status(400).json({ hata: 'Bu fotoğraf bir mekana bağlı değil' });
  if (f.durum !== 'onaylandi') await fotoRepo.update(f.id, { durum: 'onaylandi', inceleme: new Date().toISOString() });
  const gorsel = {
    tur: 'yukleme',
    fotoId: f.id,
    url: `/api/fotograflar/${f.id}/dosya`,
    yazar: f.ad,
    lisans: 'Kullanıcı yüklemesi (izinli)',
    guncelleme: new Date().toISOString(),
  };
  const m = await mekanRepo.update(f.mekanId, { gorsel });
  if (!m) return res.status(404).json({ hata: 'Mekan bulunamadı' });
  res.json(m);
}));

// Mekan görsellerini Wikipedia/Commons'tan (özgür lisanslı) yeniler.
r.post('/fotograflar/yenile', wrap(async (req, res) => {
  const rapor = await gorselleriYenile(await mekanRepo.list(), (id, patch) => mekanRepo.update(id, patch));
  const sayi = (d) => rapor.filter((x) => x.durum === d).length;
  res.json({
    ozet: { guncellendi: sayi('guncellendi'), atlandi: sayi('atlandi'), bulunamadi: sayi('bulunamadi'), hata: sayi('hata') },
    rapor,
  });
}));

// ── Uzmanlar ────────────────────────────────────────────
r.get('/uzmanlar', wrap(async (req, res) => {
  const list = await uzmanRepo.list();
  res.json(list.map(uzmanGorunumu).sort((a, b) => b.tarih.localeCompare(a.tarih)));
}));

// Onay: tek seferlik erişim anahtarı üretilir; yalnızca özeti saklanır, anahtar bu yanıtta bir kez döner.
// Yeniden çağrılırsa yeni anahtar üretilir (eskisi geçersiz olur) — kaybolan anahtar için.
r.post('/uzmanlar/:id/onayla', wrap(async (req, res) => {
  const u = await uzmanRepo.get(req.params.id);
  if (!u) return res.status(404).json({ hata: 'Bulunamadı' });
  const anahtar = anahtarUret();
  const g = await uzmanRepo.update(u.id, { durum: 'onayli', anahtarOzeti: anahtarOzeti(anahtar), onay: new Date().toISOString() });
  res.json({ uzman: uzmanGorunumu(g), erisimAnahtari: anahtar });
}));

r.patch('/uzmanlar/:id', wrap(async (req, res) => {
  const durum = req.body?.durum;
  if (!['onayli', 'askida', 'reddedildi'].includes(durum)) return res.status(400).json({ hata: 'Durum geçersiz' });
  const u = await uzmanRepo.get(req.params.id);
  if (!u) return res.status(404).json({ hata: 'Bulunamadı' });
  if (durum === 'onayli' && !u.anahtarOzeti) return res.status(400).json({ hata: 'Önce "onayla" ile erişim anahtarı üretin' });
  res.json(uzmanGorunumu(await uzmanRepo.update(u.id, { durum })));
}));

const maskele = (k) => (k ? `••••${String(k).slice(-4)}` : '');

r.get('/ayarlar', wrap(async (req, res) => {
  const a = await ayarRepo.get();
  // API anahtarları istemciye asla açık gönderilmez.
  res.json({
    ai: { saglayici: a.ai.saglayici, model: a.ai.model, anahtarVar: Boolean(a.ai.apiAnahtari), anahtarIpucu: maskele(a.ai.apiAnahtari) },
    here: { anahtarVar: Boolean(a.here.apiAnahtari), anahtarIpucu: maskele(a.here.apiAnahtari) },
  });
}));

r.put('/ayarlar', wrap(async (req, res) => {
  const b = req.body || {};
  const patch = { ai: {}, here: {} };
  if (typeof b.ai?.saglayici === 'string') patch.ai.saglayici = b.ai.saglayici.slice(0, 40);
  if (typeof b.ai?.model === 'string') patch.ai.model = b.ai.model.slice(0, 80);
  // Boş dize gönderilmezse eski anahtar korunur; `null` silmek içindir.
  if (typeof b.ai?.apiAnahtari === 'string' && b.ai.apiAnahtari) patch.ai.apiAnahtari = b.ai.apiAnahtari.slice(0, 300);
  if (b.ai?.apiAnahtari === null) patch.ai.apiAnahtari = '';
  if (typeof b.here?.apiAnahtari === 'string' && b.here.apiAnahtari) patch.here.apiAnahtari = b.here.apiAnahtari.slice(0, 300);
  if (b.here?.apiAnahtari === null) patch.here.apiAnahtari = '';
  await ayarRepo.set(patch);
  res.json({ ok: true });
}));

r.get('/gostergeler', wrap(async (req, res) => {
  const [olaylar, talepler, bildirimler, semtler] = await Promise.all([
    olayRepo.list(), talepRepo.list(), bildirimRepo.list(), semtRepo.list(),
  ]);
  res.json({ gercek: summarize(olaylar, { talepler, bildirimler, semtler }), demo: demoOrnek(semtler) });
}));

r.get('/:koleksiyon', wrap(async (req, res) => {
  const repo = repoOf(req, res);
  if (repo) res.json(await repo.list());
}));

r.post('/:koleksiyon', wrap(async (req, res) => {
  const repo = repoOf(req, res);
  if (!repo) return;
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ hata: 'Gövde gerekli' });
  res.status(201).json(await repo.create(req.body));
}));

r.put('/:koleksiyon/:id', wrap(async (req, res) => {
  const repo = repoOf(req, res);
  if (!repo) return;
  const item = await repo.update(req.params.id, req.body || {});
  if (!item) return res.status(404).json({ hata: 'Bulunamadı' });
  res.json(item);
}));

r.delete('/:koleksiyon/:id', wrap(async (req, res) => {
  const repo = repoOf(req, res);
  if (!repo) return;
  if (!(await repo.remove(req.params.id))) return res.status(404).json({ hata: 'Bulunamadı' });
  res.status(204).end();
}));

export default r;
