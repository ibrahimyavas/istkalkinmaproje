// Ziyaretçi fotoğraf yükleme ve fotoğraf dosyası sunumu.
// Yüklenen her fotoğraf 'bekliyor' durumunda başlar; yalnızca admin onayından sonra
// herkese açık olur. Konum (paylaşıldıysa) hiçbir zaman herkese açık yanıtta yer almaz.
import express, { Router } from 'express';
import { mekanRepo, fotoRepo, olayRepo } from '../repositories/index.js';
import { dataUrlCoz, jpegMetaVeriSil, konumCoz } from '../services/fotoService.js';
import { hizSiniri } from '../middleware/hizSiniri.js';
import { adminMi } from '../middleware/adminAuth.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const metin = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (res, hata, kod = 400) => res.status(kod).json({ hata });

// Base64 JPEG (1,5 MB) JSON içinde ~2 MB eder; genel 200 KB sınırı bu uçta geçerli değil.
const buyukGovde = express.json({ limit: '3mb' });
const yuklemeSiniri = hizSiniri({ ad: 'foto', pencereMs: 3600e3, azami: 10, mesaj: 'Bir saatte en fazla 10 fotoğraf yüklenebilir.' });

r.post('/fotograflar', buyukGovde, yuklemeSiniri, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.izin !== true) return bad(res, 'Fotoğrafın size ait olduğunu ve yayınlanmasına izin verdiğinizi onaylayın');
  const { hata, buffer } = dataUrlCoz(b.dosya);
  if (hata) return bad(res, hata);

  let mekan = null;
  if (b.mekanId) {
    mekan = await mekanRepo.get(b.mekanId);
    if (!mekan) return bad(res, 'Mekan bulunamadı');
  }
  const konum = b.konum ? konumCoz(b.konum) : null;
  if (b.konum && !konum) return bad(res, 'Konum İstanbul sınırları içinde değil ya da geçersiz');

  const temiz = jpegMetaVeriSil(buffer);
  const foto = await fotoRepo.create(
    {
      mekanId: mekan?.id || null,
      semtId: mekan?.semtId || null,
      aciklama: metin(b.aciklama, 300),
      ad: metin(b.ad, 60) || 'Ziyaretçi',
      konum, // yalnızca adminde görünür
      durum: 'bekliyor',
    },
    { mime: 'image/jpeg', buffer: temiz },
  );
  await olayRepo.record('foto_yukleme', { mekanId: foto.mekanId, semtId: foto.semtId });
  res.status(201).json({ id: foto.id, durum: foto.durum });
}));

r.get('/fotograflar/:id/dosya', wrap(async (req, res) => {
  const foto = await fotoRepo.get(req.params.id);
  const admin = adminMi(req);
  // Onaysız fotoğrafın varlığı da açığa çıkmasın: 404.
  if (!foto || (foto.durum !== 'onaylandi' && !admin)) return bad(res, 'Fotoğraf bulunamadı', 404);
  const dosya = await fotoRepo.dosya(foto.id);
  if (!dosya) return bad(res, 'Fotoğraf bulunamadı', 404);
  res.set('Content-Type', dosya.mime);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', foto.durum === 'onaylandi' ? 'public, max-age=86400' : 'private, no-store');
  res.send(dosya.buffer);
}));

export default r;
