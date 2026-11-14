// Kişisel rota planı: kullanıcının keşfet ekranında seçtiği mekanları sıralar,
// yürüme bölümlerine ayırır ve (varsa) Valhalla ile gerçek geometri ekler.
import { sirala, bacaklar, ziyaretSuresi } from './optimizer.js';
import { yurumeRotasi } from './valhallaService.js';
import { engeller, atlanirMi } from './mapService.js';
import { haversine, nearest } from '../utils/geo.js';

export const PLAN_AZAMI_DURAK = 15;
const TEMPO = { normal: 75, erisilebilir: 50 }; // m/dk

export async function planOlustur(mekanlar, { semtler, duraklar, toplanma }, { erisilebilir = false, baslangicId, sabitSira = false } = {}) {
  const yakaOf = (m) => semtler.find((s) => s.id === m.semtId)?.yaka || null;
  const noktalar = mekanlar.map((m) => ({ ...m, yaka: yakaOf(m) }));
  // sabitSira: çağıran sırayı kendisi kurduysa (ör. öğle yemeği molası araya yerleştirildiyse) korunur.
  const sira = sabitSira ? noktalar.map((_, i) => i) : sirala(noktalar, { baslangicId });
  const sirali = sira.map((i) => noktalar[i]);
  const bacakList = bacaklar(sirali);

  // Yürüme bölümleri: toplu taşıma bacaklarında bölünür. Her bölüm, içindeki
  // yürüme bacaklarının indekslerini de tutar (gerçek mesafeleri geri yazmak için).
  const bolumler = [[sirali[0]]];
  const bolumBacaklari = [[]];
  bacakList.forEach((b, i) => {
    if (b.tur === 'toplu-tasima') {
      bolumler.push([]);
      bolumBacaklari.push([]);
    } else {
      bolumBacaklari[bolumBacaklari.length - 1].push(i);
    }
    bolumler[bolumler.length - 1].push(sirali[i + 1]);
  });

  const mod = erisilebilir ? 'erisilebilir' : 'normal';
  const segmentler = [];
  for (const [bi, bolum] of bolumler.entries()) {
    if (bolum.length < 2) continue;
    const v = await yurumeRotasi(bolum, { erisilebilir });
    if (v) {
      segmentler.push({ kaynak: 'valhalla', koordinatlar: v.koordinatlar, mesafeM: v.mesafeM, sureDk: v.sureDk });
      bolumBacaklari[bi].forEach((bacakIdx, j) => {
        if (v.bacaklar?.[j]) Object.assign(bacakList[bacakIdx], { mesafeM: v.bacaklar[j].mesafeM, sureDk: v.bacaklar[j].sureDk });
      });
    } else {
      let kus = 0;
      for (let i = 1; i < bolum.length; i++) kus += haversine(bolum[i - 1], bolum[i]);
      const mesafeM = Math.round(kus * 1.3);
      segmentler.push({
        kaynak: 'yaklasik',
        koordinatlar: bolum.map((s) => [s.lon, s.lat]),
        mesafeM,
        sureDk: Math.max(1, Math.round(mesafeM / TEMPO[mod])),
      });
    }
  }

  const ziyaretDk = sirali.reduce((t, m) => t + ziyaretSuresi(m), 0);
  const yurumeM = segmentler.reduce((t, s) => t + s.mesafeM, 0);
  const yurumeDk = segmentler.reduce((t, s) => t + s.sureDk, 0);

  return {
    erisilebilir,
    duraklar: sirali.map((m, i) => ({
      id: m.id,
      ad: m.ad,
      semtId: m.semtId,
      tur: m.tur,
      zanaat: m.zanaat || null,
      kisa: m.kisa,
      lat: m.lat,
      lon: m.lon,
      dogrulandi: m.dogrulandi,
      sira: i + 1,
      ziyaretDk: ziyaretSuresi(m),
      engeller: engeller(m),
      erisilebilirlikUyarisi: erisilebilir && atlanirMi(m),
      enYakinDurak: nearest(m, duraklar),
      enYakinToplanma: nearest(m, toplanma),
    })),
    bacaklar: bacakList,
    geometri: { type: 'MultiLineString', coordinates: segmentler.map((s) => s.koordinatlar) },
    geometriKaynagi: segmentler.length && segmentler.every((s) => s.kaynak === 'valhalla') ? 'valhalla' : 'yaklasik',
    toplam: {
      durak: sirali.length,
      yurumeM,
      yurumeDk,
      ziyaretDk,
      topluTasimaBacak: bacakList.filter((b) => b.tur === 'toplu-tasima').length,
      tahminiToplamDk: yurumeDk + ziyaretDk + bacakList.filter((b) => b.tur === 'toplu-tasima').length * 30,
    },
  };
}
