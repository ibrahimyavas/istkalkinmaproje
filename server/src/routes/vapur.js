import { Router } from 'express';
import { VAPUR_ROTALARI, VAPUR_SILUETLERI } from '../data/vapurRotalari.js';
import { mekanRepo } from '../repositories/index.js';
import { bolgeIcinMuzik } from '../services/muzikService.js';

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const cevirTaraf = (t) => (t === 'sol' ? 'sag' : t === 'sag' ? 'sol' : t);

/** Bir vapur rotasını seçilen yöne (gidis | donus) göre sıralı siluetlerle üretir. */
export async function vapurRotasiDetay(id, yon = 'gidis') {
  const rota = VAPUR_ROTALARI.find((x) => x.id === id);
  if (!rota) return null;

  const donus = yon === 'donus';
  const iskeleler = donus
    ? [...rota.iskeleler].reverse().map((i) => ({ ...i, dk: Math.max(0, rota.sureDk - i.dk) }))
    : rota.iskeleler;
  const cizgi = donus ? [...rota.cizgi].reverse() : rota.cizgi;
  const sirali = donus ? [...rota.siluetSirasi].reverse() : rota.siluetSirasi;

  const mekanlar = await mekanRepo.list();
  const mekanById = new Map(mekanlar.map((m) => [m.id, m]));

  const siluetler = sirali
    .map((item, idx) => {
      const s = VAPUR_SILUETLERI[item.id];
      if (!s) return null;
      const mekan = s.mekanId ? mekanById.get(s.mekanId) : null;
      const taraf = donus ? cevirTaraf(item.tarafGidis) : item.tarafGidis;
      const dk = donus ? Math.max(1, rota.sureDk - item.dk) : item.dk;
      return {
        sira: idx + 1,
        id: s.id,
        ad: s.ad,
        yaka: s.yaka,
        taraf,
        tarafEtiketi: taraf === 'sol' ? 'Sol (İskele)' : 'Sağ (Sancak)',
        dk,
        yapimYili: s.yapimYili,
        lat: s.lat,
        lon: s.lon,
        bugun: s.bugun,
        gecmis: s.gecmis,
        siluetIpucu: s.siluetIpucu,
        mekanId: mekan?.id || null,
        gezilebilir: Boolean(mekan),
        gorsel: mekan?.gorsel || null,
        damgaKodu: mekan?.damgaKodu || null,
      };
    })
    .filter(Boolean);

  const muzik = bolgeIcinMuzik({
    ilce: rota.id === 'halic-hatti' ? 'eyupsultan' : rota.id === 'iki-yaka-siluet' ? 'uskudar' : 'besiktas',
    bolgeAd: rota.ad,
  });

  return {
    id: rota.id,
    ad: rota.ad,
    altBaslik: rota.altBaslik,
    yon: donus ? 'donus' : 'gidis',
    yonAd: donus ? rota.donusAd : rota.gidisAd,
    gidisAd: rota.gidisAd,
    donusAd: rota.donusAd,
    ozet: rota.ozet,
    sureDk: rota.sureDk,
    mesafeKm: rota.mesafeKm,
    oturmaIpucu: donus ? rota.oturmaIpucuDonus : rota.oturmaIpucuGidis,
    iskeleler,
    cizgi,
    siluetler,
    gezilebilirSayisi: siluetler.filter((s) => s.gezilebilir).length,
    muzik,
  };
}

r.get('/vapur/rotalar', wrap(async (req, res) => {
  const mekanlar = await mekanRepo.list();
  const mekanIds = new Set(mekanlar.map((m) => m.id));
  res.json(
    VAPUR_ROTALARI.map((x) => ({
      id: x.id,
      ad: x.ad,
      altBaslik: x.altBaslik,
      gidisAd: x.gidisAd,
      donusAd: x.donusAd,
      ozet: x.ozet,
      sureDk: x.sureDk,
      mesafeKm: x.mesafeKm,
      iskeleSayisi: x.iskeleler.length,
      siluetSayisi: x.siluetSirasi.length,
      gezilebilirSayisi: x.siluetSirasi.filter((s) => {
        const ref = VAPUR_SILUETLERI[s.id];
        return ref?.mekanId && mekanIds.has(ref.mekanId);
      }).length,
    })),
  );
}));

r.get('/vapur/rotalar/:id', wrap(async (req, res) => {
  const yon = req.query.yon === 'donus' ? 'donus' : 'gidis';
  const detay = await vapurRotasiDetay(req.params.id, yon);
  if (!detay) return res.status(404).json({ hata: 'Vapur rotası bulunamadı' });
  res.json(detay);
}));

export default r;
