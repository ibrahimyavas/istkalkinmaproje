// Toplu taşıma durakları ve deprem toplanma alanları.
// Koordinatlar yaklaşık; asansör bilgileri tahmini. İBB açık verisi ve
// yerinde gözlemle doğrulanacak (`dogrulandi: false`).
//
// tur: 'vapur' | 'marmaray' | 'metro' | 'tramvay' | 'teleferik'

export const duraklar = [
  { id: 'eminonu-iskele', ad: 'Eminönü İskelesi', tur: 'vapur', hatlar: ['Eminönü–Üsküdar', 'Eminönü–Kadıköy'], lat: 41.0176, lon: 28.9737, asansor: false, rampa: true },
  { id: 'sirkeci-marmaray', ad: 'Sirkeci (Marmaray)', tur: 'marmaray', hatlar: ['Marmaray'], lat: 41.0151, lon: 28.9773, asansor: true, rampa: true },
  { id: 'sultanahmet-tramvay', ad: 'Sultanahmet (T1)', tur: 'tramvay', hatlar: ['T1'], lat: 41.0058, lon: 28.9768, asansor: false, rampa: true },
  { id: 'beyazit-tramvay', ad: 'Beyazıt–Kapalıçarşı (T1)', tur: 'tramvay', hatlar: ['T1'], lat: 41.0103, lon: 28.9645, asansor: false, rampa: true },
  { id: 'balat-iskele', ad: 'Balat İskelesi (Haliç)', tur: 'vapur', hatlar: ['Haliç hattı'], lat: 41.03482, lon: 28.94921, asansor: false, rampa: true },
  { id: 'fener-iskele', ad: 'Fener İskelesi (Haliç)', tur: 'vapur', hatlar: ['Haliç hattı'], lat: 41.03095, lon: 28.95262, asansor: false, rampa: true },
  { id: 'eyup-iskele', ad: 'Eyüp İskelesi (Haliç)', tur: 'vapur', hatlar: ['Haliç hattı'], lat: 41.04725, lon: 28.93780, asansor: false, rampa: true },
  { id: 'eyup-teleferik', ad: 'Eyüp–Pierre Loti Teleferiği', tur: 'teleferik', hatlar: ['TF2'], lat: 41.04981, lon: 28.93440, asansor: false, rampa: null },
  { id: 'feshane-tramvay', ad: 'Feshane (T5)', tur: 'tramvay', hatlar: ['T5'], lat: 41.04553, lon: 28.93778, asansor: false, rampa: true },
  { id: 'haskoy-iskele', ad: 'Hasköy İskelesi (Haliç)', tur: 'vapur', hatlar: ['Haliç hattı'], lat: 41.04055, lon: 28.94906, asansor: false, rampa: true },
  { id: 'karakoy-iskele', ad: 'Karaköy İskelesi', tur: 'vapur', hatlar: ['Karaköy–Kadıköy', 'Karaköy–Üsküdar'], lat: 41.02143, lon: 28.97673, asansor: false, rampa: true },
  { id: 'karakoy-tunel', ad: 'Karaköy (F2 Tünel / T1)', tur: 'metro', hatlar: ['F2', 'T1'], lat: 41.02286, lon: 28.97404, asansor: false, rampa: true },
  { id: 'sishane-metro', ad: 'Şişhane (M2)', tur: 'metro', hatlar: ['M2'], lat: 41.02827, lon: 28.97272, asansor: true, rampa: true },
  { id: 'taksim-metro', ad: 'Taksim (M2 / F1)', tur: 'metro', hatlar: ['M2', 'F1'], lat: 41.03805, lon: 28.98555, asansor: true, rampa: true },
  { id: 'kabatas-iskele', ad: 'Kabataş (İskele / T1 / F1)', tur: 'vapur', hatlar: ['Adalar', 'T1', 'F1'], lat: 41.03294, lon: 28.99415, asansor: false, rampa: true },
  { id: 'besiktas-iskele', ad: 'Beşiktaş İskelesi', tur: 'vapur', hatlar: ['Beşiktaş–Kadıköy', 'Beşiktaş–Üsküdar'], lat: 41.04004, lon: 29.00559, asansor: false, rampa: true },
  { id: 'ortakoy-iskele', ad: 'Ortaköy İskelesi', tur: 'vapur', hatlar: ['Boğaz hattı'], lat: 41.04728, lon: 29.02562, asansor: false, rampa: true },
  { id: 'bebek-iskele', ad: 'Bebek İskelesi', tur: 'vapur', hatlar: ['Boğaz hattı'], lat: 41.07635, lon: 29.04443, asansor: false, rampa: true },
  { id: 'rumelihisari-iskele', ad: 'Rumelihisarı İskelesi', tur: 'vapur', hatlar: ['Boğaz hattı'], lat: 41.08812, lon: 29.05692, asansor: false, rampa: true },
  { id: 'beylerbeyi-iskele', ad: 'Beylerbeyi İskelesi', tur: 'vapur', hatlar: ['Boğaz hattı'], lat: 41.04506, lon: 29.04456, asansor: false, rampa: true },
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
  { id: 'ta-eyup-meydan', ad: 'Eyüp Sultan Camii önü meydan', semtId: 'eyup', lat: 41.0476, lon: 28.9347 },
  { id: 'ta-haskoy-sahil', ad: 'Hasköy sahil parkı', semtId: 'eyup', lat: 41.0410, lon: 28.9500 },
  { id: 'ta-taksim', ad: 'Taksim Meydanı ve Gezi Parkı', semtId: 'beyoglu', lat: 41.03783, lon: 28.98502 },
  { id: 'ta-tophane', ad: 'Tophane Parkı çevresi', semtId: 'beyoglu', lat: 41.0268, lon: 28.9815 },
  { id: 'ta-abbasaga', ad: 'Abbasağa Parkı', semtId: 'bogaz', lat: 41.04656, lon: 29.00617 },
  { id: 'ta-bebek-parki', ad: 'Bebek Parkı', semtId: 'bogaz', lat: 41.07584, lon: 29.04379 },
  { id: 'ta-kuzguncuk-bostan', ad: 'Kuzguncuk Bostanı çevresi', semtId: 'kuzguncuk', lat: 41.03478, lon: 29.03178 },
  { id: 'ta-uskudar-meydan', ad: 'Üsküdar Meydanı', semtId: 'uskudar', lat: 41.0262, lon: 29.0150 },
  { id: 'ta-kadikoy-yogurtcu', ad: 'Yoğurtçu Parkı', semtId: 'kadikoy', lat: 40.9843, lon: 29.0336 },
  { id: 'ta-burgaz-iskele', ad: 'Burgazada İskele Meydanı', semtId: 'burgazada', lat: 40.8810, lon: 29.0665 },
].map((t) => ({ ...t, kaynak: 'Örnek — İBB/AFAD toplanma alanı verisiyle değiştirilecek', dogrulandi: false }));
