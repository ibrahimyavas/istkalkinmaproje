// Toplu taşıma durakları ve deprem toplanma alanları.
// Koordinatlar yaklaşık; asansör bilgileri tahmini. İBB açık verisi ve
// yerinde gözlemle doğrulanacak (`dogrulandi: false`).
//
// tur: 'vapur' | 'marmaray' | 'metro' | 'tramvay'

export const duraklar = [
  { id: 'eminonu-iskele', ad: 'Eminönü İskelesi', tur: 'vapur', hatlar: ['Eminönü–Üsküdar', 'Eminönü–Kadıköy'], lat: 41.0176, lon: 28.9737, asansor: false, rampa: true },
  { id: 'sirkeci-marmaray', ad: 'Sirkeci (Marmaray)', tur: 'marmaray', hatlar: ['Marmaray'], lat: 41.0151, lon: 28.9773, asansor: true, rampa: true },
  { id: 'sultanahmet-tramvay', ad: 'Sultanahmet (T1)', tur: 'tramvay', hatlar: ['T1'], lat: 41.0058, lon: 28.9768, asansor: false, rampa: true },
  { id: 'beyazit-tramvay', ad: 'Beyazıt–Kapalıçarşı (T1)', tur: 'tramvay', hatlar: ['T1'], lat: 41.0103, lon: 28.9645, asansor: false, rampa: true },
  { id: 'balat-iskele', ad: 'Balat İskelesi (Haliç)', tur: 'vapur', hatlar: ['Haliç hattı'], lat: 41.03482, lon: 28.94921, asansor: false, rampa: true },
  { id: 'fener-iskele', ad: 'Fener İskelesi (Haliç)', tur: 'vapur', hatlar: ['Haliç hattı'], lat: 41.03095, lon: 28.95262, asansor: false, rampa: true },
  { id: 'uskudar-iskele', ad: 'Üsküdar İskelesi', tur: 'vapur', hatlar: ['Üsküdar–Eminönü', 'Üsküdar–Karaköy'], lat: 41.0270, lon: 29.0136, asansor: false, rampa: true },
  { id: 'uskudar-marmaray', ad: 'Üsküdar (Marmaray / M5)', tur: 'marmaray', hatlar: ['Marmaray', 'M5'], lat: 41.0255, lon: 29.0150, asansor: true, rampa: true },
  { id: 'kadikoy-iskele', ad: 'Kadıköy İskelesi', tur: 'vapur', hatlar: ['Kadıköy–Eminönü', 'Kadıköy–Karaköy', 'Adalar'], lat: 40.9925, lon: 29.0236, asansor: false, rampa: true },
  { id: 'kadikoy-metro', ad: 'Kadıköy (M4)', tur: 'metro', hatlar: ['M4'], lat: 40.9910, lon: 29.0270, asansor: true, rampa: true },
  { id: 'burgazada-iskele', ad: 'Burgazada İskelesi', tur: 'vapur', hatlar: ['Adalar'], lat: 40.8808, lon: 29.0668, asansor: false, rampa: true },
].map((d) => ({ ...d, kaynak: 'Yaklaşık — İBB açık verisiyle doğrulanacak', dogrulandi: false }));

export const toplanmaAlanlari = [
  { id: 'ta-sultanahmet-meydani', ad: 'Sultanahmet Meydanı', semtId: 'sultanahmet', lat: 41.0062, lon: 28.9760 },
  { id: 'ta-gulhane', ad: 'Gülhane Parkı', semtId: 'sultanahmet', lat: 41.0130, lon: 28.9810 },
  { id: 'ta-balat-sahil', ad: 'Balat Sahil Parkı', semtId: 'balat', lat: 41.0320, lon: 28.9490 },
  { id: 'ta-kuzguncuk-bostan', ad: 'Kuzguncuk Bostanı çevresi', semtId: 'kuzguncuk', lat: 41.03478, lon: 29.03178 },
  { id: 'ta-uskudar-meydan', ad: 'Üsküdar Meydanı', semtId: 'uskudar', lat: 41.0262, lon: 29.0150 },
  { id: 'ta-kadikoy-yogurtcu', ad: 'Yoğurtçu Parkı', semtId: 'kadikoy', lat: 40.9843, lon: 29.0336 },
  { id: 'ta-burgaz-iskele', ad: 'Burgazada İskele Meydanı', semtId: 'burgazada', lat: 40.8810, lon: 29.0665 },
].map((t) => ({ ...t, kaynak: 'Örnek — İBB/AFAD toplanma alanı verisiyle değiştirilecek', dogrulandi: false }));
