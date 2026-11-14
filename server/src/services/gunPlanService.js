// Çok günlü şehir rotası: kullanıcının seçtiği gün sayısına göre mekanları günlere böler.
//
// 1. Aday mekanlar ilgi alanına (mekan türü) ve erişilebilirliğe göre süzülür.
// 2. Hepsi tek bir sıraya dizilir (optimizer.sirala: yaka cezası aynı yakadakileri art arda getirir).
// 3. Sıra, dinamik programlama ile en fazla `gunSayisi` ardışık parçaya bölünür:
//    her gün ≤ GUNLUK_BUTCE_DK (ziyaret + yürüme + toplu taşıma), günler dengeli,
//    bir günde birden çok yaka olması cezalandırılır.
// 4. Sığmıyorsa en düşük öncelikli mekan çıkarılıp yeniden bölünür.
// 5. Her gün planService.planOlustur ile ayrıca sıralanır ve güzergâhı hesaplanır.
import { sirala, ziyaretSuresi, YURUME_KATSAYISI, YURUME_SINIRI_M } from './optimizer.js';
import { planOlustur } from './planService.js';
import { atlanirMi } from './mapService.js';
import { haversine } from '../utils/geo.js';

export const GUN_AZAMI = 5;
export const GUNLUK_BUTCE_DK = 7 * 60;
export const GUNLUK_AZAMI_DURAK = 8;
// İlgi seçilmezse kullanılan türler. Atölyeler önceden kayıt istediği için yalnızca seçilirse gelir.
export const VARSAYILAN_TURLER = ['miras', 'muze', 'carsi', 'edebiyat', 'sahne', 'mekan', 'film'];
export const TURLER = [...VARSAYILAN_TURLER, 'atolye'];

const TEMPO = { normal: 75, erisilebilir: 50 }; // m/dk
const TOPLU_TASIMA_DK = 30;
const YAKA_GECIS_DK = 45;  // vapur / Marmaray
const ADALAR_DK = 100;     // Adalar vapuru, tek yön ve iskele bekleme
const KARMA_YAKA_CEZASI = 300;
const ONCELIK = { miras: 3, muze: 3, carsi: 2, edebiyat: 2, sahne: 2, mekan: 2, atolye: 1.5, film: 1 };

export function oncelik(m) {
  return (ONCELIK[m.tur] ?? 1) + (m.dogrulandi ? 1 : 0) + (m.gorsel ? 0.5 : 0);
}

function bacakDk(a, b, tempo) {
  if (a.yaka && b.yaka && a.yaka !== b.yaka) {
    return a.yaka === 'Adalar' || b.yaka === 'Adalar' ? ADALAR_DK : YAKA_GECIS_DK;
  }
  const m = haversine(a, b) * YURUME_KATSAYISI;
  return m > YURUME_SINIRI_M ? TOPLU_TASIMA_DK : Math.max(1, Math.round(m / tempo));
}

/** Bir günün kaba süresi (dk). Adalar'a gidiliyorsa iskeleden ilk vapur da sayılır. */
export function gunSuresi(dizi, tempo = TEMPO.normal) {
  if (!dizi.length) return 0;
  let dk = dizi.reduce((t, m) => t + ziyaretSuresi(m), 0);
  for (let i = 1; i < dizi.length; i++) dk += bacakDk(dizi[i - 1], dizi[i], tempo);
  if (dizi[0].yaka === 'Adalar') dk += ADALAR_DK;
  return dk;
}

/**
 * Sıralı diziyi en fazla k ardışık güne böler. Amaç: günleri dengelemek
 * (süre kareleri toplamı) ve yaka karışmasını önlemek. Sığmıyorsa null.
 */
export function bol(dizi, k, tempo = TEMPO.normal) {
  const n = dizi.length;
  if (!n) return [];
  k = Math.min(k, n);
  const maliyet = (i, j) => {
    const parca = dizi.slice(i, j);
    if (parca.length > GUNLUK_AZAMI_DURAK) return Infinity;
    const dk = gunSuresi(parca, tempo);
    if (dk > GUNLUK_BUTCE_DK) return Infinity;
    const yaka = new Set(parca.map((m) => m.yaka)).size;
    return dk * dk + (yaka - 1) * KARMA_YAKA_CEZASI * KARMA_YAKA_CEZASI;
  };
  // en[g][j]: ilk j mekanı g güne bölmenin en düşük maliyeti
  const en = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity));
  const geri = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(-1));
  en[0][0] = 0;
  for (let g = 1; g <= k; g++) {
    for (let j = g; j <= n; j++) {
      for (let i = g - 1; i < j; i++) {
        if (en[g - 1][i] === Infinity) continue;
        const c = maliyet(i, j);
        if (en[g - 1][i] + c < en[g][j]) {
          en[g][j] = en[g - 1][i] + c;
          geri[g][j] = i;
        }
      }
    }
  }
  // Tam k gün dengeli olur ama gerekmiyorsa daha az gün de kabul edilir (en düşük maliyetli).
  let enIyiG = -1;
  for (let g = 1; g <= k; g++) if (en[g][n] < Infinity && (enIyiG < 0 || g === k)) enIyiG = g;
  if (enIyiG < 0) return null;
  const parcalar = [];
  for (let g = enIyiG, j = n; g > 0; g--) {
    const i = geri[g][j];
    parcalar.unshift(dizi.slice(i, j));
    j = i;
  }
  return parcalar;
}

/** Aday mekanları seçer, sıralar ve günlere böler (Valhalla'sız, saf hesap). */
export function gunlereAyir(mekanlar, semtler, { gunSayisi, turler = [], erisilebilir = false }) {
  const tempo = erisilebilir ? TEMPO.erisilebilir : TEMPO.normal;
  const secili = turler.length ? turler : VARSAYILAN_TURLER;
  const yakaOf = (m) => semtler.find((s) => s.id === m.semtId)?.yaka || null;
  const adaylar = mekanlar
    .filter((m) => secili.includes(m.tur) && !(erisilebilir && atlanirMi(m)))
    .map((m) => ({ ...m, yaka: yakaOf(m) }));

  // Hepsi sığıyorsa: tek sıra + dengeli bölme.
  const dizi = sirala(adaylar).map((i) => adaylar[i]);
  const parcalar = bol(dizi, gunSayisi, tempo);
  if (parcalar) return { parcalar, disarida: [], adaySayisi: adaylar.length };

  // Sığmıyorsa: her gün en önemli yerden başlayıp aynı yakada, bütçe dolana kadar
  // "önem / eklenen süre" oranı en yüksek yeri ekle (açık uçlu ekip-gezgin sezgisi).
  const kalan = new Set(adaylar);
  const gunler = [];
  for (let g = 0; g < gunSayisi && kalan.size; g++) {
    const tohum = [...kalan].sort((a, b) => tohumPuani(b, kalan) - tohumPuani(a, kalan))[0];
    let gun = [tohum];
    kalan.delete(tohum);
    for (;;) {
      if (gun.length >= GUNLUK_AZAMI_DURAK) break;
      const simdiki = gunSuresi(gun, tempo);
      let enIyi = null;
      for (const m of kalan) {
        if (m.yaka !== tohum.yaka) continue;
        const ek = enUcuzEkleme(gun, m, tempo);
        if (ek.dk > GUNLUK_BUTCE_DK) continue;
        const oran = oncelik(m) / Math.max(1, ek.dk - simdiki);
        if (!enIyi || oran > enIyi.oran) enIyi = { m, oran, dizi: ek.dizi };
      }
      if (!enIyi) break;
      gun = enIyi.dizi;
      kalan.delete(enIyi.m);
    }
    gunler.push(gun);
  }
  // Seçilenleri tek sıraya dizip dengeli bölmeyi dene; dışarıda kalanları önem sırasıyla
  // geri eklemeyi dene (hafif kalan günler dolsun).
  let alinan = gunler.flat();
  const siraliBol = (list) => {
    const d = sirala(list).map((i) => list[i]);
    return bol(d, gunSayisi, tempo);
  };
  let dengeli = siraliBol(alinan);
  if (dengeli) {
    for (const m of [...kalan].sort((a, b) => oncelik(b) - oncelik(a))) {
      const deneme = siraliBol([...alinan, m]);
      if (deneme) {
        alinan = [...alinan, m];
        dengeli = deneme;
        kalan.delete(m);
      }
    }
    return { parcalar: dengeli, disarida: [...kalan], adaySayisi: adaylar.length };
  }

  // Günleri yaka ve konuma göre mantıklı bir sıraya koy (Avrupa → Anadolu → Adalar gibi).
  const merkezler = gunler.map((gun) => ({
    gun, yaka: gun[0].yaka,
    lat: gun.reduce((t, m) => t + m.lat, 0) / gun.length,
    lon: gun.reduce((t, m) => t + m.lon, 0) / gun.length,
  }));
  const gunSirasi = sirala(merkezler).map((i) => merkezler[i].gun);
  return { parcalar: gunSirasi, disarida: [...kalan], adaySayisi: adaylar.length };
}

const YAKIN_M = 2000;
function tohumPuani(m, kalan) {
  let komsu = 0;
  for (const n of kalan) if (n !== m && n.yaka === m.yaka && haversine(m, n) < YAKIN_M) komsu += oncelik(n);
  return oncelik(m) + 0.25 * komsu;
}

/** m'yi günün sırasında en az süre ekleyecek yere koyar. */
function enUcuzEkleme(gun, m, tempo) {
  let en = null;
  for (let i = 0; i <= gun.length; i++) {
    const dizi = [...gun.slice(0, i), m, ...gun.slice(i)];
    const dk = gunSuresi(dizi, tempo);
    if (!en || dk < en.dk) en = { dk, dizi };
  }
  return en;
}

export async function cokGunluPlanOlustur(mekanlar, baglam, { gunSayisi, turler = [], erisilebilir = false }) {
  const { parcalar, disarida, adaySayisi } = gunlereAyir(mekanlar, baglam.semtler, { gunSayisi, turler, erisilebilir });
  const gunler = [];
  for (const [i, parca] of parcalar.entries()) {
    const p = await planOlustur(parca, baglam, { erisilebilir });
    gunler.push({
      gun: i + 1,
      semtIdler: [...new Set(p.duraklar.map((d) => d.semtId))],
      yakalar: [...new Set(parca.map((m) => m.yaka).filter(Boolean))],
      ...p,
    });
  }

  // Birleşik alanlar: grup sayfası ve eski istemciler planı tek liste olarak okuyabilsin.
  const duraklar = gunler.flatMap((g) => g.duraklar.map((d) => ({ ...d, gun: g.gun })));
  const bacaklar = gunler.flatMap((g, gi) => {
    const sonraki = gunler[gi + 1];
    const son = g.duraklar[g.duraklar.length - 1];
    return sonraki ? [...g.bacaklar, { neredenId: son.id, nereyeId: sonraki.duraklar[0].id, tur: 'gun-sonu' }] : g.bacaklar;
  });
  const topla = (alan) => gunler.reduce((t, g) => t + g.toplam[alan], 0);

  return {
    tur: 'cok-gunlu',
    erisilebilir,
    istenenGun: gunSayisi,
    turler: turler.length ? turler : VARSAYILAN_TURLER,
    adaySayisi,
    gunler,
    disarida: disarida.map(({ id, ad, semtId, tur }) => ({ id, ad, semtId, tur })),
    duraklar,
    bacaklar,
    geometri: { type: 'MultiLineString', coordinates: gunler.flatMap((g) => g.geometri.coordinates) },
    geometriKaynagi: gunler.length && gunler.every((g) => g.geometriKaynagi === 'valhalla') ? 'valhalla' : 'yaklasik',
    toplam: {
      gun: gunler.length,
      durak: duraklar.length,
      yurumeM: topla('yurumeM'),
      yurumeDk: topla('yurumeDk'),
      ziyaretDk: topla('ziyaretDk'),
      topluTasimaBacak: topla('topluTasimaBacak'),
      tahminiToplamDk: topla('tahminiToplamDk'),
    },
  };
}
