// Ziyaretçi yorumları ve puanları.
// Her yorum 'bekliyor' durumunda başlar, yalnızca admin onayından sonra görünür.
// Şikâyet eşiği aşılan yorum yeniden incelemeye düşer (yayından kalkar).
import { Router } from 'express';
import { mekanRepo, fotoRepo, olayRepo, yorumRepo } from '../repositories/index.js';
import { hizSiniri } from '../middleware/hizSiniri.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, hata, kod = 400) => res.status(kod).json({ hata });
const metin = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+\n/g, '\n').slice(0, max) : '');

export const SIKAYET_ESIGI = 3;
export const SIKAYET_NEDENLERI = ['hakaret', 'spam', 'yanlis-bilgi', 'kisisel-bilgi', 'diger'];

const yorumSiniri = hizSiniri({ ad: 'yorum', pencereMs: 3600e3, azami: 5, mesaj: 'Bir saatte en fazla 5 yorum gönderilebilir.' });
const sikayetSiniri = hizSiniri({ ad: 'yorum-sikayet', pencereMs: 3600e3, azami: 20 });

/** Herkese açık görünüm: iç alanlar (şikâyetler, inceleme) gizlenir. */
export function publicYorum(y, foto) {
  return {
    id: y.id,
    mekanId: y.mekanId,
    rumuz: y.rumuz,
    puan: y.puan,
    metin: y.metin,
    tarih: y.tarih,
    foto: foto?.durum === 'onaylandi' ? { id: foto.id, url: `/api/fotograflar/${foto.id}/dosya` } : null,
  };
}

/** Onaylı yorumların ortalaması ve 1–5 dağılımı. */
export function puanOzeti(yorumlar) {
  const dagilim = [0, 0, 0, 0, 0];
  for (const y of yorumlar) dagilim[y.puan - 1] += 1;
  const sayi = yorumlar.length;
  const ortalama = sayi ? Math.round((yorumlar.reduce((t, y) => t + y.puan, 0) / sayi) * 10) / 10 : null;
  return { sayi, ortalama, dagilim };
}

export function yorumGirdisi(b = {}) {
  const puan = Number(b.puan);
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) return { hata: 'Puan 1 ile 5 arasında olmalı' };
  const rumuz = metin(b.rumuz, 30);
  if (rumuz.length < 2) return { hata: 'Rumuz en az 2 karakter olmalı' };
  const govde = metin(b.metin, 1000);
  if (govde.length < 10) return { hata: 'Yorum en az 10 karakter olmalı' };
  // Kişisel bilgi paylaşımını caydır: e-posta ve telefon numarası kabul edilmez.
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(govde) || /(\+?90|0)?\s*5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/.test(govde)) {
    return { hata: 'Yoruma e-posta ya da telefon numarası yazmayın' };
  }
  return { veri: { puan, rumuz, metin: govde } };
}

r.get('/mekanlar/:id/yorumlar', wrap(async (req, res) => {
  const list = (await yorumRepo.list({ mekanId: req.params.id, durum: 'onaylandi' }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  const fotolar = await Promise.all(list.map((y) => (y.fotoId ? fotoRepo.get(y.fotoId) : null)));
  res.json({ ozet: puanOzeti(list), yorumlar: list.map((y, i) => publicYorum(y, fotolar[i])) });
}));

r.post('/mekanlar/:id/yorumlar', yorumSiniri, wrap(async (req, res) => {
  const b = req.body || {};
  // Bal küpü: insanlar görmez, botlar doldurur. Sessizce kabul edilmiş gibi yanıt verilir.
  if (typeof b.web === 'string' && b.web.trim()) return res.status(201).json({ id: null, durum: 'bekliyor' });
  const mekan = await mekanRepo.get(req.params.id);
  if (!mekan) return bad(res, 'Mekan bulunamadı', 404);
  if (b.kurallarKabul !== true) return bad(res, 'Yorum kurallarını kabul etmelisiniz');
  const { hata, veri } = yorumGirdisi(b);
  if (hata) return bad(res, hata);

  let fotoId = null;
  if (b.fotoId) {
    // Fotoğraf önce /api/fotograflar ile bu mekana yüklenmiş olmalı (onay yorumla birlikte verilir).
    const foto = await fotoRepo.get(String(b.fotoId));
    if (!foto || foto.mekanId !== mekan.id) return bad(res, 'Fotoğraf bulunamadı');
    fotoId = foto.id;
  }
  const y = await yorumRepo.create({
    ...veri,
    mekanId: mekan.id,
    semtId: mekan.semtId,
    fotoId,
    durum: 'bekliyor',
    sikayetler: [],
    tarih: new Date().toISOString(),
  });
  await olayRepo.record('yorum_gonderme', { mekanId: mekan.id, puan: veri.puan });
  res.status(201).json({ id: y.id, durum: y.durum });
}));

r.post('/yorumlar/:id/sikayet', sikayetSiniri, wrap(async (req, res) => {
  const y = await yorumRepo.get(req.params.id);
  if (!y || y.durum !== 'onaylandi') return bad(res, 'Yorum bulunamadı', 404);
  const neden = SIKAYET_NEDENLERI.includes(req.body?.neden) ? req.body.neden : 'diger';
  const sikayetler = [...(y.sikayetler || []), { neden, tarih: new Date().toISOString() }];
  // Eşik aşılınca yorum yayından kalkar, admin yeniden inceler.
  const durum = sikayetler.length >= SIKAYET_ESIGI ? 'bekliyor' : y.durum;
  await yorumRepo.update(y.id, { sikayetler, durum });
  await olayRepo.record('yorum_sikayet', { yorumId: y.id, neden });
  res.json({ ok: true });
}));

export default r;
