// Uzmanlar (usta, atölye sahibi, rehber): başvuru, giriş ve kendi etkinliklerini yönetme.
//
// Akış: başvuru ('basvuru') → admin onayı ('onayli', tek seferlik erişim anahtarı üretilir
// ve admine bir kez gösterilir; admin anahtarı uzmana kendisi iletir) → uzman anahtarla giriş
// yapar → kendi etkinliklerini (atölye, yürüyüş…) açar, düzenler, iptal eder ve kayıtları görür.
// Sunucuda anahtarın kendisi değil yalnızca SHA-256 özeti saklanır.
import crypto from 'node:crypto';
import { Router } from 'express';
import { uzmanRepo, mekanRepo, etkinlikRepo, talepRepo, olayRepo } from '../repositories/index.js';
import { anahtarOzeti } from '../services/grupService.js';
import { hizSiniri } from '../middleware/hizSiniri.js';
import {
  requireUzman, uzmanOturumAc, uzmanOturumKapat, uzmanGirisiAcik, cerezUzmanId,
} from '../middleware/uzmanAuth.js';
import { zanaatlar } from '../data/mekanlar.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const metin = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (res, hata, kod = 400) => res.status(kod).json({ hata });

export const ETKINLIK_TURLERI = ['atolye', 'yuruyus', 'konser', 'edebiyat', 'soylesi', 'sergi', 'tiyatro', 'festival'];
const AZAMI_GUN = 180;

const basvuruSiniri = hizSiniri({ ad: 'uzman-basvuru', pencereMs: 3600e3, azami: 3, mesaj: 'Bir saatte en fazla 3 başvuru yapılabilir.' });
const girisSiniri = hizSiniri({ ad: 'uzman-giris', pencereMs: 900e3, azami: 10, mesaj: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' });

/** Uzmanın kendine dönük görünümü (anahtar özeti çıkarılır). */
export const uzmanGorunumu = ({ anahtarOzeti: _o, ...u }) => u;

// ── Başvuru ──────────────────────────────────────────────
r.post('/basvuru', basvuruSiniri, wrap(async (req, res) => {
  const b = req.body || {};
  const ad = metin(b.ad, 80);
  const uzmanlik = metin(b.uzmanlik, 40);
  const atolyeAdi = metin(b.atolyeAdi, 100);
  const iletisim = metin(b.iletisim, 120);
  const aciklama = metin(b.aciklama, 1000);
  if (ad.length < 2) return bad(res, 'Ad en az 2 karakter olmalı');
  if (!zanaatlar[uzmanlik] && uzmanlik !== 'rehber' && uzmanlik !== 'diger') return bad(res, 'Uzmanlık alanı geçersiz');
  if (!iletisim) return bad(res, 'E-posta veya telefon gerekli');
  if (aciklama.length < 20) return bad(res, 'Kendinizi ve çalışmanızı biraz daha ayrıntılı anlatın (en az 20 karakter)');
  if (b.kurallarKabul !== true) return bad(res, 'Uzman kurallarını kabul etmelisiniz');
  let mekanId = null;
  if (b.mekanId) {
    const m = await mekanRepo.get(b.mekanId);
    if (!m) return bad(res, 'Mekan bulunamadı');
    mekanId = m.id;
  }
  const u = await uzmanRepo.create({ ad, uzmanlik, atolyeAdi, iletisim, aciklama, mekanId });
  await olayRepo.record('uzman_basvuru', { uzmanId: u.id });
  res.status(201).json({ id: u.id, durum: u.durum });
}));

// ── Oturum ───────────────────────────────────────────────
r.post('/giris', girisSiniri, wrap(async (req, res) => {
  if (!uzmanGirisiAcik()) return bad(res, 'Uzman girişi kapalı: SESSION_SECRET tanımlanmalı.', 503);
  const anahtar = metin(req.body?.anahtar, 200);
  if (!anahtar) return bad(res, 'Erişim anahtarı gerekli');
  const ozet = Buffer.from(anahtarOzeti(anahtar));
  const onayli = await uzmanRepo.list({ durum: 'onayli' });
  const uzman = onayli.find((u) => {
    if (!u.anahtarOzeti) return false;
    const b = Buffer.from(u.anahtarOzeti);
    return b.length === ozet.length && crypto.timingSafeEqual(b, ozet);
  });
  if (!uzman) return bad(res, 'Erişim anahtarı geçersiz', 401);
  uzmanOturumAc(res, uzman.id);
  res.json({ uzman: uzmanGorunumu(uzman) });
}));

r.post('/cikis', (req, res) => {
  uzmanOturumKapat(res);
  res.json({ ok: true });
});

r.get('/oturum', wrap(async (req, res) => {
  const id = cerezUzmanId(req);
  const u = id ? await uzmanRepo.get(id) : null;
  res.json({ girisYapildi: Boolean(u && u.durum === 'onayli') });
}));

r.get('/ben', requireUzman, (req, res) => res.json(uzmanGorunumu(req.uzman)));

// ── Etkinlikler ──────────────────────────────────────────
/** Etkinlik girdisini doğrular. `kismi` true ise yalnızca gönderilen alanlar denetlenir. */
async function etkinlikGirdisi(b, { kismi = false } = {}) {
  const v = {};
  const var_ = (k) => !kismi || b[k] !== undefined;

  if (var_('baslik')) {
    v.baslik = metin(b.baslik, 100);
    if (v.baslik.length < 5) return { hata: 'Başlık en az 5 karakter olmalı' };
  }
  if (var_('tur')) {
    if (!ETKINLIK_TURLERI.includes(b.tur)) return { hata: 'Etkinlik türü geçersiz' };
    v.tur = b.tur;
  }
  if (var_('aciklama')) {
    v.aciklama = metin(b.aciklama, 2000);
    if (v.aciklama.length < 20) return { hata: 'Açıklama en az 20 karakter olmalı' };
  }
  if (var_('baslangic')) {
    const t = new Date(b.baslangic);
    if (Number.isNaN(t.getTime()) || t < new Date()) return { hata: 'Gelecekte bir tarih ve saat seçin' };
    if (t - Date.now() > AZAMI_GUN * 864e5) return { hata: `En fazla ${AZAMI_GUN} gün sonrası için etkinlik açılabilir` };
    v.baslangic = t.toISOString();
  }
  if (var_('sureDk')) {
    const s = Number(b.sureDk);
    if (!Number.isInteger(s) || s < 15 || s > 720) return { hata: 'Süre 15–720 dakika arası olmalı' };
    v.sureDk = s;
  }
  if (var_('kapasite')) {
    const k = Number(b.kapasite);
    if (!Number.isInteger(k) || k < 1 || k > 50) return { hata: 'Kontenjan 1–50 arası olmalı' };
    v.kapasite = k;
  }
  if (var_('ucret')) v.ucret = metin(b.ucret, 60) || 'Ücretsiz';
  if (var_('erisilebilir')) v.erisilebilir = Boolean(b.erisilebilir);
  if (var_('mekanId') || var_('konumAd')) {
    if (b.mekanId) {
      const m = await mekanRepo.get(b.mekanId);
      if (!m) return { hata: 'Mekan bulunamadı' };
      Object.assign(v, { mekanId: m.id, semtId: m.semtId, konumAd: null });
    } else {
      const konumAd = metin(b.konumAd, 160);
      if (!kismi && konumAd.length < 5) return { hata: 'Bir mekan seçin ya da buluşma yerini yazın' };
      if (konumAd) Object.assign(v, { mekanId: null, semtId: metin(b.semtId, 40) || null, konumAd });
    }
  }
  if (v.ucret !== undefined || !kismi) v.ucretsiz = !v.ucret || /^ücretsiz$/i.test(v.ucret);
  return { veri: v };
}

async function kendiEtkinligi(req, res) {
  const e = await etkinlikRepo.get(req.params.id);
  if (!e || e.uzmanId !== req.uzman.id) {
    bad(res, 'Etkinlik bulunamadı', 404); // başkasının etkinliğinin varlığı da açığa çıkmasın
    return null;
  }
  return e;
}

r.get('/etkinlikler', requireUzman, wrap(async (req, res) => {
  const list = await etkinlikRepo.list({ uzmanId: req.uzman.id });
  res.json(list.sort((a, b) => b.baslangic.localeCompare(a.baslangic)));
}));

r.post('/etkinlikler', requireUzman, wrap(async (req, res) => {
  const { hata, veri } = await etkinlikGirdisi(req.body || {});
  if (hata) return bad(res, hata);
  const e = await etkinlikRepo.create({
    ...veri,
    uzmanId: req.uzman.id,
    durum: 'yayinda',
    ornek: false,
    olusturma: new Date().toISOString(),
  });
  await olayRepo.record('etkinlik_olusturma', { etkinlikId: e.id, uzmanId: req.uzman.id });
  res.status(201).json(e);
}));

r.put('/etkinlikler/:id', requireUzman, wrap(async (req, res) => {
  const e = await kendiEtkinligi(req, res);
  if (!e) return;
  if (e.durum === 'iptal') return bad(res, 'İptal edilmiş etkinlik düzenlenemez', 409);
  const { hata, veri } = await etkinlikGirdisi(req.body || {}, { kismi: true });
  if (hata) return bad(res, hata);
  res.json(await etkinlikRepo.update(e.id, { ...veri, guncelleme: new Date().toISOString() }));
}));

r.post('/etkinlikler/:id/iptal', requireUzman, wrap(async (req, res) => {
  const e = await kendiEtkinligi(req, res);
  if (!e) return;
  res.json(await etkinlikRepo.update(e.id, { durum: 'iptal', iptalTarihi: new Date().toISOString() }));
}));

// Kendi etkinliklerine gelen kayıtlar (iletişim bilgisi dahil — uzman katılımcılara ulaşabilsin).
r.get('/katilimlar', requireUzman, wrap(async (req, res) => {
  const etkinlikler = await etkinlikRepo.list({ uzmanId: req.uzman.id });
  const idler = new Set(etkinlikler.map((e) => e.id));
  const talepler = (await talepRepo.list()).filter((t) => idler.has(t.etkinlikId));
  res.json(talepler
    .map((t) => ({ ...t, etkinlikBaslik: etkinlikler.find((e) => e.id === t.etkinlikId)?.baslik }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih)));
}));

export default r;
