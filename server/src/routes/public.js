import { Router } from 'express';
import {
  semtRepo, mekanRepo, rotaRepo, durakRepo, toplanmaRepo, siirRepo,
  etkinlikRepo, dunBugunRepo, bildirimRepo, talepRepo, olayRepo, fotoRepo, uzmanRepo,
} from '../repositories/index.js';
import { buildRoute } from '../services/mapService.js';
import { publicSiir } from '../services/poemService.js';
import { publicFoto, konumCoz } from '../services/fotoService.js';
import { sadeGeometri, sinirKutusu } from '../services/yazdirService.js';
import { nearest } from '../utils/geo.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const metin = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (res, hata) => res.status(400).json({ hata });

async function context() {
  const [duraklar, toplanma] = await Promise.all([durakRepo.list(), toplanmaRepo.list()]);
  return { duraklar, toplanma };
}

const siirlerFor = async ({ semtId, mekanId }) =>
  (await siirRepo.list())
    .filter((s) => (semtId && s.semtIdler?.includes(semtId)) || (mekanId && s.mekanIdler?.includes(mekanId)))
    .map(publicSiir);

const yaklasanEtkinlikler = (list) =>
  list
    .filter((e) => e.durum !== 'iptal' && new Date(e.baslangic) >= new Date(Date.now() - 6 * 3600e3))
    .sort((a, b) => a.baslangic.localeCompare(b.baslangic));

// Herkese açık bildirim: konum ve yakın mekan önerisi (iç not) çıkarılır.
const publicBildirim = ({ konum, enYakinMekan, ...rest }) => rest;

/** Etkinliğe gelmiş, iptal edilmemiş taleplerdeki toplam kişi. */
async function doluKontenjan(etkinlikId) {
  const talepler = await talepRepo.list({ etkinlikId });
  return talepler.filter((t) => t.durum !== 'iptal').reduce((top, t) => top + (t.kisi || 1), 0);
}

/** Uzmanın herkese açık özeti (iletişim bilgisi yok). */
const uzmanOzeti = (u) => (u ? { id: u.id, ad: u.ad, uzmanlik: u.uzmanlik, atolyeAdi: u.atolyeAdi } : null);

r.get('/saglik', (req, res) => res.json({ durum: 'ok', servis: 'Proje 404', zaman: new Date().toISOString() }));

r.get('/semtler', wrap(async (req, res) => {
  const [semtler, mekanlar, rotalar] = await Promise.all([semtRepo.list(), mekanRepo.list(), rotaRepo.list()]);
  res.json(semtler.map((s) => ({
    ...s,
    mekanSayisi: mekanlar.filter((m) => m.semtId === s.id).length,
    atolyeSayisi: mekanlar.filter((m) => m.semtId === s.id && m.tur === 'atolye').length,
    rotaSayisi: rotalar.filter((x) => x.semtId === s.id).length,
  })));
}));

r.get('/semtler/:id', wrap(async (req, res) => {
  const semt = await semtRepo.get(req.params.id);
  if (!semt) return res.status(404).json({ hata: 'Semt bulunamadı' });
  const [mekanlar, rotalar, etkinlikler, dunBugun, toplanma] = await Promise.all([
    mekanRepo.list({ semtId: semt.id }),
    rotaRepo.list({ semtId: semt.id }),
    etkinlikRepo.list({ semtId: semt.id }),
    dunBugunRepo.list({ semtId: semt.id }),
    toplanmaRepo.list({ semtId: semt.id }),
  ]);
  res.json({
    semt,
    mekanlar,
    rotalar: rotalar.map(({ duraklar, ...rest }) => ({ ...rest, durakSayisi: duraklar.length })),
    siirler: await siirlerFor({ semtId: semt.id }),
    etkinlikler: yaklasanEtkinlikler(etkinlikler),
    dunBugun,
    toplanma,
  });
}));

r.get('/harita', wrap(async (req, res) => {
  const [semtler, mekanlar, duraklar, toplanma] = await Promise.all([
    semtRepo.list(), mekanRepo.list(), durakRepo.list(), toplanmaRepo.list(),
  ]);
  res.json({ semtler, mekanlar, duraklar, toplanma });
}));

r.get('/mekanlar', wrap(async (req, res) => {
  const { semtId, tur, zanaat } = req.query;
  res.json(await mekanRepo.list({ semtId, tur, zanaat }));
}));

r.get('/mekanlar/:id', wrap(async (req, res) => {
  const mekan = await mekanRepo.get(req.params.id);
  if (!mekan) return res.status(404).json({ hata: 'Mekan bulunamadı' });
  const ctx = await context();
  const [semt, etkinlikler, bildirimler, fotograflar] = await Promise.all([
    semtRepo.get(mekan.semtId),
    etkinlikRepo.list({ mekanId: mekan.id }),
    bildirimRepo.list({ mekanId: mekan.id, durum: 'onaylandi' }),
    fotoRepo.list({ mekanId: mekan.id, durum: 'onaylandi' }),
  ]);
  res.json({
    mekan,
    semt,
    siirler: await siirlerFor({ mekanId: mekan.id }),
    etkinlikler: yaklasanEtkinlikler(etkinlikler),
    bildirimler: bildirimler.map(publicBildirim),
    fotograflar: fotograflar.map(publicFoto),
    enYakinDurak: nearest(mekan, ctx.duraklar),
    enYakinToplanma: nearest(mekan, ctx.toplanma),
  });
}));

r.get('/rotalar', wrap(async (req, res) => {
  const { semtId, tur } = req.query;
  const list = await rotaRepo.list({ semtId, tur });
  res.json(list.map(({ duraklar, ...rest }) => ({ ...rest, durakSayisi: duraklar.length })));
}));

r.get('/rotalar/:id', wrap(async (req, res) => {
  const rota = await rotaRepo.get(req.params.id);
  if (!rota) return res.status(404).json({ hata: 'Rota bulunamadı' });
  const erisilebilir = req.query.erisilebilir === '1';
  const mekanlar = (await Promise.all(rota.duraklar.map((d) => mekanRepo.get(d.mekanId)))).filter(Boolean);
  const [semt, ctx] = await Promise.all([semtRepo.get(rota.semtId), context()]);
  const hesap = buildRoute(rota, mekanlar, ctx, { erisilebilir });
  await olayRepo.record('rota_goruntuleme', { rotaId: rota.id, semtId: rota.semtId, erisilebilir });
  const { duraklar, ...rotaBilgi } = rota;
  res.json({ rota: rotaBilgi, semt, erisilebilir, ...hesap, siirler: await siirlerFor({ semtId: rota.semtId }) });
}));

// Rotanın yazdırılabilir çıktısı: ayrıntılı açıklamalar + SVG için sadeleştirilmiş geometri.
r.get('/rotalar/:id/yazdir', wrap(async (req, res) => {
  const rota = await rotaRepo.get(req.params.id);
  if (!rota) return res.status(404).json({ hata: 'Rota bulunamadı' });
  const erisilebilir = req.query.erisilebilir === '1';
  const mekanlar = (await Promise.all(rota.duraklar.map((d) => mekanRepo.get(d.mekanId)))).filter(Boolean);
  const [semt, ctx] = await Promise.all([semtRepo.get(rota.semtId), context()]);
  const h = buildRoute(rota, mekanlar, ctx, { erisilebilir });
  await olayRepo.record('rota_yazdirma', { rotaId: rota.id, semtId: rota.semtId });
  const { duraklar, ...rotaBilgi } = rota;
  res.json({
    tur: 'rota',
    rota: rotaBilgi,
    semt,
    erisilebilir,
    geometriKaynagi: h.geometriKaynagi,
    mesafeM: h.mesafeM,
    sureDk: h.sureDk,
    zorluk: h.zorluk,
    egimOzeti: h.egimOzeti ?? null,
    merdivenM: h.merdivenM ?? null,
    sadeGeometri: sadeGeometri(h.geometri),
    sinirlar: sinirKutusu(h.geometri, h.duraklar),
    duraklar: h.duraklar.map((d) => ({
      id: d.id, sira: d.sira, ad: d.ad, tur: d.tur, zanaat: d.zanaat || null, lat: d.lat, lon: d.lon,
      kisa: d.kisa, detay: d.detay || null, anlatim: d.anlatim,
      erisilebilirlik: d.erisilebilirlik, engeller: d.engeller, atlanabilir: d.atlanabilir,
      enYakinDurak: d.enYakinDurak, enYakinToplanma: d.enYakinToplanma,
      kaynak: d.kaynak, dogrulandi: d.dogrulandi,
    })),
    siirler: await siirlerFor({ semtId: rota.semtId }),
    olusturma: new Date().toISOString(),
  });
}));

r.get('/etkinlikler', wrap(async (req, res) => {
  const { semtId, tur } = req.query;
  const list = yaklasanEtkinlikler(await etkinlikRepo.list({ semtId, tur }));
  const [mekanlar, uzmanlar] = await Promise.all([mekanRepo.list(), uzmanRepo.list()]);
  res.json(list.map((e) => ({
    ...e,
    mekan: mekanlar.find((m) => m.id === e.mekanId) || null,
    uzman: uzmanOzeti(uzmanlar.find((u) => u.id === e.uzmanId)),
  })));
}));

r.get('/etkinlikler/:id', wrap(async (req, res) => {
  const e = await etkinlikRepo.get(req.params.id);
  if (!e) return res.status(404).json({ hata: 'Etkinlik bulunamadı' });
  const [mekan, uzman, dolu] = await Promise.all([
    e.mekanId ? mekanRepo.get(e.mekanId) : null,
    e.uzmanId ? uzmanRepo.get(e.uzmanId) : null,
    doluKontenjan(e.id),
  ]);
  const gecmis = new Date(e.baslangic) < new Date();
  res.json({
    etkinlik: e,
    mekan,
    uzman: uzmanOzeti(uzman),
    kontenjan: e.kapasite ? { toplam: e.kapasite, dolu, kalan: Math.max(0, e.kapasite - dolu) } : null,
    kayitEngeli: e.durum === 'iptal' ? 'Bu etkinlik iptal edildi'
      : gecmis ? 'Bu etkinlik sona erdi'
        : e.kapasite && dolu >= e.kapasite ? 'Kontenjan doldu' : null,
  });
}));

r.get('/siirler', wrap(async (req, res) => {
  res.json((await siirRepo.list()).map(publicSiir));
}));

r.post('/damga', wrap(async (req, res) => {
  const mekan = await mekanRepo.getByDamgaKodu(req.body?.kod);
  if (!mekan) return res.status(404).json({ hata: 'Geçersiz damga kodu' });
  const semt = await semtRepo.get(mekan.semtId);
  await olayRepo.record('damga', { mekanId: mekan.id, semtId: mekan.semtId });
  res.json({ mekan, semt });
}));

// Atölye deneyim talebi (mekanId) ya da tarihli etkinliğe kayıt (etkinlikId).
r.post('/talepler', wrap(async (req, res) => {
  const b = req.body || {};
  const ad = metin(b.ad, 80);
  const iletisim = metin(b.iletisim, 120);
  const kisi = Number(b.kisi);
  if (!ad) return bad(res, 'Ad gerekli');
  if (!iletisim) return bad(res, 'E-posta veya telefon gerekli');
  if (!Number.isInteger(kisi) || kisi < 1 || kisi > 20) return bad(res, 'Kişi sayısı 1–20 arası olmalı');
  const ortak = {
    ad, iletisim, kisi,
    erisilebilirlikIhtiyaci: metin(b.erisilebilirlikIhtiyaci, 300),
    not: metin(b.not, 500),
  };

  if (b.etkinlikId) {
    const e = await etkinlikRepo.get(b.etkinlikId);
    if (!e) return bad(res, 'Etkinlik bulunamadı');
    if (e.durum === 'iptal') return res.status(409).json({ hata: 'Bu etkinlik iptal edildi' });
    if (new Date(e.baslangic) < new Date()) return res.status(409).json({ hata: 'Bu etkinlik sona erdi' });
    // Not: kontenjan kontrolü iki ayrı sorgu; demo ölçeğinde yeterli. Yoğun kullanımda
    // gruplardaki gibi kilitli kayıtla yapılmalı.
    if (e.kapasite && (await doluKontenjan(e.id)) + kisi > e.kapasite) {
      return res.status(409).json({ hata: 'Bu etkinlikte yeterli kontenjan kalmadı' });
    }
    const talep = await talepRepo.create({
      ...ortak, etkinlikId: e.id, uzmanId: e.uzmanId || null, mekanId: e.mekanId || null, semtId: e.semtId || null,
    });
    await olayRepo.record('etkinlik_kaydi', { etkinlikId: e.id, semtId: e.semtId || null });
    return res.status(201).json({ id: talep.id, durum: talep.durum });
  }

  const mekan = await mekanRepo.get(b.mekanId);
  if (!mekan || mekan.tur !== 'atolye') return bad(res, 'Geçerli bir atölye seçin');
  const talep = await talepRepo.create({
    ...ortak, mekanId: mekan.id, semtId: mekan.semtId, tarihTercihi: metin(b.tarihTercihi, 40),
  });
  await olayRepo.record('atolye_talebi', { mekanId: mekan.id, semtId: mekan.semtId });
  res.status(201).json({ id: talep.id, durum: talep.durum });
}));

const BILDIRIM_TURLERI = new Set(['erisilebilirlik', 'yorum', 'hata', 'grup']);

r.post('/bildirimler', wrap(async (req, res) => {
  const b = req.body || {};
  if (!BILDIRIM_TURLERI.has(b.tur)) return bad(res, 'Bildirim türü geçersiz');
  const icerik = metin(b.metin, 1000);
  if (icerik.length < 5) return bad(res, 'Lütfen biraz daha ayrıntı yazın');
  const mekan = b.mekanId ? await mekanRepo.get(b.mekanId) : null;
  if (b.mekanId && !mekan) return bad(res, 'Mekan bulunamadı');
  if (b.tur === 'grup' && !b.grupId) return bad(res, 'Bildirilen grup belirtilmeli');

  // Konum: mekansız (sahadan) bildirimlerde zorunlu. Yalnızca adminde görünür.
  const konum = b.konum ? konumCoz(b.konum) : null;
  if (b.konum && !konum) return bad(res, 'Konum İstanbul sınırları içinde değil ya da geçersiz');
  if (!mekan && b.tur !== 'grup' && !konum) return bad(res, 'Bir mekan seçin ya da konumunuzu paylaşın');

  // Ekli fotoğraflar: önce /api/fotograflar ile yüklenmiş, henüz onaylanmamış olmalı.
  const fotoIdler = Array.isArray(b.fotoIdler) ? [...new Set(b.fotoIdler.map(String))] : [];
  if (fotoIdler.length > 3) return bad(res, 'En fazla 3 fotoğraf eklenebilir');
  for (const id of fotoIdler) {
    const f = await fotoRepo.get(id);
    if (!f || f.durum !== 'bekliyor') return bad(res, 'Ekli fotoğraflardan biri bulunamadı');
  }

  let enYakinMekan = null;
  if (!mekan && konum) {
    const y = nearest(konum, await mekanRepo.list());
    if (y) enYakinMekan = { id: y.id, ad: y.ad, mesafeM: y.mesafeM };
  }

  const item = await bildirimRepo.create({
    tur: b.tur, metin: icerik, ad: metin(b.ad, 80) || 'Anonim',
    mekanId: mekan?.id || null, semtId: mekan?.semtId || null,
    grupId: b.tur === 'grup' ? metin(b.grupId, 60) : null,
    konum, enYakinMekan, fotoIdler,
  });
  for (const id of fotoIdler) await fotoRepo.update(id, { bildirimId: item.id });
  await olayRepo.record('bildirim', { mekanId: item.mekanId, semtId: item.semtId });
  res.status(201).json({ id: item.id, durum: item.durum });
}));

const OLAY_TIPLERI = new Set(['sesli_rehber', 'siir_dinleme', 'dunbugun']);

r.post('/olay', wrap(async (req, res) => {
  const { tip, semtId, rotaId, mekanId } = req.body || {};
  if (!OLAY_TIPLERI.has(tip)) return bad(res, 'Olay tipi geçersiz');
  await olayRepo.record(tip, { semtId: metin(semtId, 40) || null, rotaId: metin(rotaId, 60) || null, mekanId: metin(mekanId, 60) || null });
  res.status(204).end();
}));

export default r;
