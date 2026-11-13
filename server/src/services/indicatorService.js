// Etki göstergeleri. Gerçek olaylar (bu demoda yapılan ziyaretler, damgalar,
// talepler) ile DEMO VERİSİ kesinlikle ayrı tutulur. Demo verisi yalnızca
// panelin dolu halini göstermek içindir; başvuruda gerçek veri gibi sunulmamalı.

export function summarize(olaylar, { talepler, bildirimler, semtler }) {
  const say = (tip) => olaylar.filter((o) => o.tip === tip).length;
  const semtDagilimi = semtler.map((s) => ({
    semtId: s.id,
    ad: s.ad,
    ziyaret: olaylar.filter((o) => o.semtId === s.id && o.tip === 'rota_goruntuleme').length,
    damga: olaylar.filter((o) => o.semtId === s.id && o.tip === 'damga').length,
  }));

  const gunluk = {};
  for (const o of olaylar) {
    const gun = o.tarih.slice(0, 10);
    gunluk[gun] = (gunluk[gun] || 0) + 1;
  }

  return {
    rotaGoruntuleme: say('rota_goruntuleme'),
    erisilebilirRota: olaylar.filter((o) => o.tip === 'rota_goruntuleme' && o.erisilebilir).length,
    sesliRehber: say('sesli_rehber'),
    damga: say('damga'),
    atolyeTalebi: talepler.length,
    bildirim: bildirimler.length,
    onayliBildirim: bildirimler.filter((b) => b.durum === 'onaylandi').length,
    kesfetBegeni: say('kesfet_begen'),
    planOlusturma: say('plan_olusturma'),
    grupOlusturma: say('grup_olusturma'),
    grubaKatilim: say('gruba_katilim'),
    fotoYukleme: say('foto_yukleme'),
    uzmanBasvuru: say('uzman_basvuru'),
    etkinlikKaydi: say('etkinlik_kaydi'),
    semtDagilimi,
    gunluk: Object.entries(gunluk).sort().map(([gun, adet]) => ({ gun, adet })),
  };
}

/** Panelin dolu görünümü için sabit (rastgele olmayan) örnek veri. */
export function demoOrnek(semtler) {
  const tohum = [412, 268, 157, 233, 341, 96];
  return {
    demo: true,
    rotaGoruntuleme: 1507,
    erisilebilirRota: 388,
    sesliRehber: 642,
    damga: 519,
    atolyeTalebi: 74,
    bildirim: 41,
    onayliBildirim: 29,
    kesfetBegeni: 2864,
    planOlusturma: 431,
    grupOlusturma: 58,
    grubaKatilim: 212,
    fotoYukleme: 187,
    uzmanBasvuru: 23,
    etkinlikKaydi: 346,
    semtDagilimi: semtler.map((s, i) => ({
      semtId: s.id,
      ad: s.ad,
      ziyaret: tohum[i % tohum.length],
      damga: Math.round(tohum[i % tohum.length] * 0.34),
    })),
    gunluk: Array.from({ length: 14 }, (_, i) => ({
      gun: `2026-11-${String(i + 1).padStart(2, '0')}`,
      adet: 60 + ((i * 37) % 55),
    })),
  };
}
