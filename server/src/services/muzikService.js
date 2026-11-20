// Konuma göre müzik önerisi servisi:
// - Seçili mekanlarda birebir "Biz size bunu öneriyoruz" eşleştirmesi döner.
// - Bölge (ilçe / semt / yaka / İstanbul) görünümlerinde ilgili kültürel torbadan rastgele seçer.
// - Her parça için YouTube Music, Spotify ve Apple Music bağlantılarını üretir.

import { BOLGE_TORBASI, MEKAN_OZEL_MUZIK, MUZIK_PARCALARI } from '../data/muzikler.js';

export function linkleriUret(parca) {
  const sorgu = `${parca.sanatci} ${parca.eser}`;
  const enc = encodeURIComponent(sorgu);
  return {
    youtubeMusic: parca.youtubeMusicUrl || `https://music.youtube.com/search?q=${enc}`,
    spotify: parca.spotifyUrl || `https://open.spotify.com/search/${enc}`,
    appleMusic: parca.appleMusicUrl || `https://music.apple.com/tr/search?term=${enc}`,
  };
}

function parcaCiktisi(parca, ek = {}) {
  return {
    id: parca.id,
    eser: parca.eser,
    sanatci: parca.sanatci,
    donem: parca.donem,
    not: ek.neden || parca.not,
    ozel: Boolean(ek.ozel),
    etiket: ek.etiket || 'Müzik önerisi',
    havuzBoyutu: ek.havuzBoyutu ?? 1,
    linkler: linkleriUret(parca),
  };
}

function havuzSec({ ilce, semtId, yaka }) {
  if (ilce && BOLGE_TORBASI[ilce]?.length) return BOLGE_TORBASI[ilce];
  if (semtId && BOLGE_TORBASI[semtId]?.length) return BOLGE_TORBASI[semtId];
  if (yaka && BOLGE_TORBASI[yaka]?.length) return BOLGE_TORBASI[yaka];
  return BOLGE_TORBASI.istanbul;
}

function torbadanSec(ids, haricId) {
  const gecerli = ids.map((id) => MUZIK_PARCALARI[id]).filter(Boolean);
  if (!gecerli.length) return null;
  const adaylar = haricId && gecerli.length > 1 ? gecerli.filter((p) => p.id !== haricId) : gecerli;
  const secilen = adaylar[Math.floor(Math.random() * adaylar.length)];
  return { parca: secilen, havuzBoyutu: gecerli.length };
}

/** İlçe, semt, yaka veya İstanbul torbasından rastgele müzik önerir. */
export function bolgeIcinMuzik({ ilce, semtId, yaka, bolgeAd, haric } = {}) {
  const havuz = havuzSec({ ilce, semtId, yaka });
  const secim = torbadanSec(havuz, haric);
  if (!secim) return null;
  const etiket = bolgeAd ? `${bolgeAd} için müzik önerisi` : 'İstanbul için müzik önerisi';
  return parcaCiktisi(secim.parca, {
    ozel: false,
    etiket,
    havuzBoyutu: secim.havuzBoyutu,
  });
}

/**
 * Bir mekan için müzik önerisi üretir.
 * - `torbadan: true` değilse ve mekanın özel eşleştirmesi varsa "Biz size bunu öneriyoruz" döner.
 * - Aksi halde mekanın ilçesi / semti torbasından rastgele önerir.
 */
export function mekanIcinMuzik(mekan, { ilce, ilceAd, yaka, haric, torbadan = false } = {}) {
  if (!torbadan && mekan?.id && MEKAN_OZEL_MUZIK[mekan.id]) {
    const ozel = MEKAN_OZEL_MUZIK[mekan.id];
    const parca = MUZIK_PARCALARI[ozel.parcaId];
    if (parca) {
      const havuz = havuzSec({ ilce, semtId: mekan.semtId, yaka });
      return parcaCiktisi(parca, {
        ozel: true,
        etiket: 'Biz size bunu öneriyoruz',
        neden: ozel.neden,
        havuzBoyutu: havuz.length,
      });
    }
  }
  return bolgeIcinMuzik({
    ilce,
    semtId: mekan?.semtId,
    yaka,
    bolgeAd: ilceAd || mekan?.ad,
    haric,
  });
}
