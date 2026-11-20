// Keşfet (kaydırmalı seçim), kişisel rota planı ve gezinti grupları.
import { Router } from 'express';
import {
  semtRepo, mekanRepo, rotaRepo, durakRepo, toplanmaRepo, planRepo, grupRepo, grupMesajRepo, olayRepo,
} from '../repositories/index.js';
import { planOlustur, PLAN_AZAMI_DURAK } from '../services/planService.js';
import { cokGunluPlanOlustur, GUN_AZAMI, TURLER } from '../services/gunPlanService.js';
import {
  grupGirdisi, publicGrup, yonetimGrup, anahtarUret, anahtarOzeti, anahtarDogruMu, katilabilirMi,
} from '../services/grupService.js';
import { atlanirMi } from '../services/mapService.js';
import { hizSiniri } from '../middleware/hizSiniri.js';
import { sadeGeometri, sinirKutusu } from '../services/yazdirService.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, hata, kod = 400) => res.status(kod).json({ hata });
const metin = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const liste = (v) => (typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

const grupSiniri = hizSiniri({ ad: 'grup', pencereMs: 3600e3, azami: 5, mesaj: 'Bir saatte en fazla 5 grup açılabilir.' });
const katilSiniri = hizSiniri({ ad: 'katil', pencereMs: 600e3, azami: 20 });
const mesajSiniri = hizSiniri({ ad: 'grup-mesaj', pencereMs: 600e3, azami: 25, mesaj: 'Çok sık mesaj gönderildi, lütfen biraz bekleyin.' });
const planSiniri = hizSiniri({ ad: 'plan', pencereMs: 60e3, azami: 20 });

// ── Keşfet ───────────────────────────────────────────────
// Kartlar semtler arasında sırayla karıştırılır (tek semtin kartları art arda gelmesin).
r.get('/kesfet', wrap(async (req, res) => {
  const semtIdler = liste(req.query.semtIdler);
  const turler = liste(req.query.turler);
  const erisilebilir = req.query.erisilebilir === '1';
  let list = await mekanRepo.list();
  if (semtIdler.length) list = list.filter((m) => semtIdler.includes(m.semtId));
  if (turler.length) list = list.filter((m) => turler.includes(m.tur));
  if (erisilebilir) list = list.filter((m) => !atlanirMi(m));

  const gruplar = new Map();
  for (const m of list) gruplar.set(m.semtId, [...(gruplar.get(m.semtId) || []), m]);
  const karisik = [];
  for (let i = 0; karisik.length < list.length; i++) {
    for (const g of gruplar.values()) if (g[i]) karisik.push(g[i]);
  }
  res.json(karisik);
}));

r.post('/kesfet/olay', wrap(async (req, res) => {
  const { mekanId, karar } = req.body || {};
  if (!['begen', 'gec'].includes(karar)) return bad(res, 'Karar geçersiz');
  const m = await mekanRepo.get(mekanId);
  if (!m) return bad(res, 'Mekan bulunamadı', 404);
  await olayRepo.record(karar === 'begen' ? 'kesfet_begen' : 'kesfet_gec', { mekanId: m.id, semtId: m.semtId });
  res.status(204).end();
}));

// ── Plan ─────────────────────────────────────────────────
r.post('/plan', planSiniri, wrap(async (req, res) => {
  const b = req.body || {};
  const idler = [...new Set(Array.isArray(b.mekanIdler) ? b.mekanIdler.map(String) : [])];
  if (idler.length < 2) return bad(res, 'Rota için en az 2 yer seçin');
  if (idler.length > PLAN_AZAMI_DURAK) return bad(res, `Bir rotada en fazla ${PLAN_AZAMI_DURAK} yer olabilir`);
  const mekanlar = (await Promise.all(idler.map((id) => mekanRepo.get(id)))).filter(Boolean);
  if (mekanlar.length !== idler.length) return bad(res, 'Seçilen yerlerden biri bulunamadı');

  const [semtler, duraklar, toplanma] = await Promise.all([semtRepo.list(), durakRepo.list(), toplanmaRepo.list()]);
  const hesap = await planOlustur(mekanlar, { semtler, duraklar, toplanma }, {
    erisilebilir: Boolean(b.erisilebilir),
    baslangicId: idler.includes(b.baslangicId) ? b.baslangicId : undefined,
  });
  const plan = await planRepo.create({ secilenIdler: idler, ...hesap });
  await olayRepo.record('plan_olusturma', { planId: plan.id, durak: idler.length, erisilebilir: hesap.erisilebilir });
  res.status(201).json(plan);
}));

// Gün sayısına göre şehir geneli rota (rota sihirbazı).
r.post('/plan/gunluk', planSiniri, wrap(async (req, res) => {
  const b = req.body || {};
  const gunSayisi = Number(b.gunSayisi);
  if (!Number.isInteger(gunSayisi) || gunSayisi < 1 || gunSayisi > GUN_AZAMI) return bad(res, `Gün sayısı 1 ile ${GUN_AZAMI} arasında olmalı`);
  const turler = [...new Set(Array.isArray(b.ilgiler) ? b.ilgiler.map(String) : [])];
  if (turler.some((t) => !TURLER.includes(t))) return bad(res, 'İlgi alanlarından biri geçersiz');

  const [mekanlar, semtler, duraklar, toplanma] = await Promise.all([
    mekanRepo.list(), semtRepo.list(), durakRepo.list(), toplanmaRepo.list(),
  ]);
  const hesap = await cokGunluPlanOlustur(mekanlar, { semtler, duraklar, toplanma }, {
    gunSayisi, turler, erisilebilir: Boolean(b.erisilebilir),
  });
  if (!hesap.gunler.length) return bad(res, 'Bu seçimlerle uygun yer bulunamadı; ilgi alanlarını genişletin');
  const plan = await planRepo.create({ secilenIdler: hesap.duraklar.map((d) => d.id), ...hesap });
  await olayRepo.record('plan_olusturma', { planId: plan.id, durak: hesap.duraklar.length, gun: hesap.gunler.length, erisilebilir: hesap.erisilebilir });
  res.status(201).json(plan);
}));

r.get('/plan/:id', wrap(async (req, res) => {
  const plan = await planRepo.get(req.params.id);
  if (!plan) return bad(res, 'Plan bulunamadı', 404);
  res.json(plan);
}));

// Planın yazdırılabilir çıktısı: duraklara mekan kayıtlarındaki ayrıntılı açıklamalar eklenir.
r.get('/plan/:id/yazdir', wrap(async (req, res) => {
  const plan = await planRepo.get(req.params.id);
  if (!plan) return bad(res, 'Plan bulunamadı', 404);
  const mekanlar = await Promise.all(plan.duraklar.map((d) => mekanRepo.get(d.id)));
  const duraklar = plan.duraklar.map((d, i) => ({
    ...d,
    detay: mekanlar[i]?.detay || null,
    erisilebilirlik: mekanlar[i]?.erisilebilirlik || null,
    kaynak: mekanlar[i]?.kaynak || null,
  }));
  await olayRepo.record('plan_yazdirma', { planId: plan.id });
  // Çok günlü planda her gün kendi çizimi ve bacaklarıyla ayrı sayfada basılır.
  const gunler = plan.gunler?.map((g) => {
    const gd = duraklar.filter((d) => d.gun === g.gun);
    return {
      gun: g.gun,
      semtIdler: g.semtIdler,
      toplam: g.toplam,
      bacaklar: g.bacaklar,
      geometriKaynagi: g.geometriKaynagi,
      sadeGeometri: sadeGeometri(g.geometri),
      sinirlar: sinirKutusu(g.geometri, gd),
      duraklar: gd,
    };
  }) || null;
  res.json({
    tur: 'plan',
    gunler,
    plan: { id: plan.id, olusturma: plan.olusturma, erisilebilir: plan.erisilebilir },
    toplam: plan.toplam,
    bacaklar: plan.bacaklar,
    geometriKaynagi: plan.geometriKaynagi,
    sadeGeometri: sadeGeometri(plan.geometri),
    sinirlar: sinirKutusu(plan.geometri, duraklar),
    duraklar,
    olusturma: new Date().toISOString(),
  });
}));

// ── Gruplar ──────────────────────────────────────────────
async function rotaOzeti(g) {
  if (g.planId) {
    const p = await planRepo.get(g.planId);
    if (!p) return null;
    return { tur: 'plan', id: p.id, ad: `${p.duraklar.length} duraklı kişisel rota`, duraklar: p.duraklar.map(({ id, ad, semtId, lat, lon }) => ({ id, ad, semtId, lat, lon })) };
  }
  const rota = await rotaRepo.get(g.rotaId);
  if (!rota) return null;
  const mekanlar = (await Promise.all(rota.duraklar.map((d) => mekanRepo.get(d.mekanId)))).filter(Boolean);
  return { tur: 'rota', id: rota.id, ad: rota.ad, duraklar: mekanlar.map(({ id, ad, semtId, lat, lon }) => ({ id, ad, semtId, lat, lon })) };
}

r.get('/gruplar', wrap(async (req, res) => {
  const simdi = Date.now() - 3 * 3600e3;
  const list = (await grupRepo.list())
    .filter((g) => g.durum === 'aktif' && new Date(g.baslangic).getTime() >= simdi)
    .sort((a, b) => a.baslangic.localeCompare(b.baslangic));
  const tumMesajlar = await grupMesajRepo.list();
  const mesajSay = new Map();
  for (const m of tumMesajlar) mesajSay.set(m.grupId, (mesajSay.get(m.grupId) || 0) + 1);
  const sonuc = [];
  for (const g of list) {
    const rota = await rotaOzeti(g);
    if (req.query.semtId && !rota?.duraklar.some((d) => d.semtId === req.query.semtId)) continue;
    if (req.query.rotaId && g.rotaId !== req.query.rotaId) continue;
    sonuc.push({
      ...publicGrup(g),
      mesajSayisi: mesajSay.get(g.id) || 0,
      rota: rota && { tur: rota.tur, id: rota.id, ad: rota.ad, bulusma: rota.duraklar[0], duraklar: rota.duraklar },
    });
  }
  res.json(sonuc);
}));

r.get('/gruplar/:id', wrap(async (req, res) => {
  const g = await grupRepo.get(req.params.id);
  if (!g || g.durum === 'kaldirildi') return bad(res, 'Grup bulunamadı', 404); // moderasyonla kaldırılanlar gizli
  const rota = await rotaOzeti(g);
  res.json({ grup: publicGrup(g), rota, bulusma: rota?.duraklar[0] || null, katilimEngeli: katilabilirMi(g) });
}));

r.post('/gruplar', grupSiniri, wrap(async (req, res) => {
  const { hata, veri } = grupGirdisi(req.body || {});
  if (hata) return bad(res, hata);
  if (veri.planId && !(await planRepo.get(veri.planId))) return bad(res, 'Plan bulunamadı');
  if (veri.rotaId && !(await rotaRepo.get(veri.rotaId))) return bad(res, 'Rota bulunamadı');
  if (req.body.kurallarKabul !== true) return bad(res, 'Topluluk kurallarını kabul etmelisiniz');
  const anahtar = anahtarUret();
  const g = await grupRepo.create({ ...veri, yonetimOzeti: anahtarOzeti(anahtar), ornek: false });
  await olayRepo.record('grup_olusturma', { grupId: g.id });
  // Yönetim anahtarı yalnızca bu yanıtta, bir kez gönderilir.
  res.status(201).json({ grup: publicGrup(g), yonetimAnahtari: anahtar });
}));

r.post('/gruplar/:id/katil', katilSiniri, wrap(async (req, res) => {
  const g = await grupRepo.get(req.params.id);
  if (!g) return bad(res, 'Grup bulunamadı', 404);
  const engel = katilabilirMi(g);
  if (engel) return bad(res, engel, 409);
  const b = req.body || {};
  const rumuz = metin(b.rumuz, 30);
  if (rumuz.length < 2) return bad(res, 'Rumuz en az 2 karakter olmalı');
  if (b.kurallarKabul !== true) return bad(res, 'Topluluk kurallarını kabul etmelisiniz');
  // Kapasite, kilitli kayıt üzerinde yeniden kontrol edilir (eşzamanlı katılımlar için).
  const k = await grupRepo.katilimEkle(g.id, { rumuz, iletisim: metin(b.iletisim, 120) }, (guncel) => katilabilirMi(guncel));
  await olayRepo.record('gruba_katilim', { grupId: g.id });
  res.status(201).json({ katilimId: k.id, grup: publicGrup(await grupRepo.get(g.id)) });
}));

r.post('/gruplar/:id/ayril', wrap(async (req, res) => {
  const ok = await grupRepo.katilimSil(req.params.id, metin(req.body?.katilimId, 60));
  if (!ok) return bad(res, 'Katılım bulunamadı', 404);
  res.json({ grup: publicGrup(await grupRepo.get(req.params.id)) });
}));

// Yönetim: anahtar `X-Yonetim-Anahtari` başlığıyla gelir (URL'de değil).
async function yonetici(req, res) {
  const g = await grupRepo.get(req.params.id);
  if (!g) return bad(res, 'Grup bulunamadı', 404) && null;
  if (!anahtarDogruMu(g, req.get('X-Yonetim-Anahtari'))) return bad(res, 'Yönetim anahtarı geçersiz', 403) && null;
  return g;
}

r.get('/gruplar/:id/yonetim', wrap(async (req, res) => {
  const g = await yonetici(req, res);
  if (g) res.json(yonetimGrup(g));
}));

r.post('/gruplar/:id/iptal', wrap(async (req, res) => {
  const g = await yonetici(req, res);
  if (!g) return;
  await grupRepo.update(g.id, { durum: 'iptal' });
  res.json({ ok: true });
}));

// ── Grup sohbeti ─────────────────────────────────────────
r.get('/gruplar/:id/mesajlar', wrap(async (req, res) => {
  const g = await grupRepo.get(req.params.id);
  if (!g || g.durum === 'kaldirildi') return bad(res, 'Grup bulunamadı', 404);
  const mesajlar = (await grupMesajRepo.list({ grupId: g.id }))
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .slice(-100)
    .map(({ id, grupId, rumuz, metin: yazi, yoneticiMi, tarih }) => ({
      id, grupId, rumuz, metin: yazi, yoneticiMi: Boolean(yoneticiMi), tarih,
    }));
  res.json(mesajlar);
}));

r.post('/gruplar/:id/mesajlar', mesajSiniri, wrap(async (req, res) => {
  const g = await grupRepo.get(req.params.id);
  if (!g || g.durum === 'kaldirildi') return bad(res, 'Grup bulunamadı', 404);
  if (g.durum !== 'aktif') return bad(res, 'İptal edilmiş gruba mesaj gönderilemez', 409);
  const b = req.body || {};
  const rumuz = metin(b.rumuz, 30);
  if (rumuz.length < 2) return bad(res, 'Rumuz en az 2 karakter olmalı');
  const yazi = typeof b.metin === 'string' ? b.metin.trim().replace(/\s+\n/g, '\n').slice(0, 500) : '';
  if (yazi.length < 1) return bad(res, 'Mesaj boş olamaz');
  const yoneticiMi = anahtarDogruMu(g, req.get('X-Yonetim-Anahtari'));
  const m = await grupMesajRepo.create({ grupId: g.id, rumuz, metin: yazi, yoneticiMi });
  res.status(201).json(m);
}));

export default r;
