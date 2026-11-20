import { Router } from 'express';
import { atlasAra, atlasListe, atlasOzet, konumCozumle } from '../services/atlasService.js';
import { bolgeIcinMuzik, mekanIcinMuzik } from '../services/muzikService.js';
import { mekanRepo } from '../repositories/index.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

r.get('/atlas/ozet', wrap(async (req, res) => {
  res.json(await atlasOzet());
}));

r.get('/atlas/liste', wrap(async (req, res) => {
  const { yaka, ilce, mahalle, tur, rozet, erisilebilir } = req.query;
  const sonuc = await atlasListe({
    yaka: yaka || undefined,
    ilce: ilce || undefined,
    mahalle: mahalle || undefined,
    tur: tur || undefined,
    rozet: rozet || undefined,
    erisilebilir: erisilebilir === '1',
  });
  if (!sonuc) return res.status(404).json({ hata: 'Bölge bulunamadı' });
  res.json(sonuc);
}));

r.get('/atlas/ara', wrap(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
  res.json(await atlasAra(q));
}));

r.get('/muzik/oner', wrap(async (req, res) => {
  const { ilce, yaka, semtId, mekanId, bolgeAd, haric, torbadan } = req.query;
  if (mekanId) {
    const mekan = await mekanRepo.get(String(mekanId));
    if (!mekan) return res.status(404).json({ hata: 'Mekan bulunamadı' });
    const konum = konumCozumle(mekan);
    return res.json(
      mekanIcinMuzik(mekan, {
        ilce: konum?.ilce,
        ilceAd: konum?.ilceAd,
        yaka: konum?.yaka,
        haric: haric ? String(haric) : undefined,
        torbadan: torbadan === '1',
      }),
    );
  }
  res.json(
    bolgeIcinMuzik({
      ilce: ilce ? String(ilce) : undefined,
      yaka: yaka ? String(yaka) : undefined,
      semtId: semtId ? String(semtId) : undefined,
      bolgeAd: bolgeAd ? String(bolgeAd).slice(0, 80) : undefined,
      haric: haric ? String(haric) : undefined,
    }),
  );
}));

export default r;
