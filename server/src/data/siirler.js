// Şiir katmanı.
//
// Telif kuralı (FSEK: yazarın ölüm yılının bitiminden itibaren 70 yıl):
// - telifDurumu 'kamu-mali'  → tam metin gösterilebilir.
// - telifDurumu 'korumali'   → yalnızca `alinti` (kısa) + kaynak bağlantısı;
//   `metin` alanı BOŞ bırakılır. Tam metin, hak sahibinin yazılı izniyle eklenir.
// Arayüz hangi metnin gösterileceğine `poemService.gosterimMetni` ile karar verir.
//
// `metinDogrulandi: false` → metin basılı bir baskıdan satır satır doğrulanacak.
// Bu bir hukuki görüş değildir.

export const siirler = [
  {
    id: 'orhan-veli-istanbulu-dinliyorum',
    sair: 'Orhan Veli Kanık',
    sairOlum: 1950,
    baslik: 'İstanbul\'u Dinliyorum',
    yil: 1947,
    semtIdler: ['sultanahmet'],
    mekanIdler: ['kapalicarsi'],
    telifDurumu: 'kamu-mali',
    metin: [
      'İstanbul\'u dinliyorum, gözlerim kapalı',
      'Önce hafiften bir rüzgâr esiyor;',
      'Yavaş yavaş sallanıyor',
      'Yapraklar, ağaçlarda;',
      'Uzaklarda, çok uzaklarda,',
      'Sucuların hiç durmayan çıngırakları',
      'İstanbul\'u dinliyorum, gözlerim kapalı.',
      '',
      'İstanbul\'u dinliyorum, gözlerim kapalı;',
      'Kuşlar geçiyor, derken;',
      'Yükseklerden, sürü sürü, çığlık çığlık.',
      'Ağlar çekiliyor dalyanlarda;',
      'Bir kadının suya değiyor ayakları;',
      'İstanbul\'u dinliyorum, gözlerim kapalı.',
      '',
      'İstanbul\'u dinliyorum, gözlerim kapalı;',
      'Serin serin Kapalıçarşı',
      'Cıvıl cıvıl Mahmutpaşa',
      'Güvercin dolu avlular',
      'Çekiç sesleri geliyor doklardan',
      'Güzelim bahar rüzgârında ter kokuları;',
      'İstanbul\'u dinliyorum, gözlerim kapalı.',
    ].join('\n'),
    notlar: 'Şiirin ilk üç bölümü. Tamamı ve noktalama basılı baskıdan doğrulanacak.',
    metinDogrulandi: false,
    kaynak: 'https://tr.wikipedia.org/wiki/Orhan_Veli_Kan%C4%B1k',
  },
  {
    id: 'yahya-kemal-uskudar',
    sair: 'Yahya Kemal Beyatlı',
    sairOlum: 1958,
    baslik: 'Üsküdar ve Çamlıca şiirleri',
    yil: null,
    semtIdler: ['uskudar'],
    mekanIdler: ['atik-valide'],
    telifDurumu: 'korumali',
    metin: null,
    alinti: null,
    notlar: 'Yahya Kemal\'in eserleri 2028 sonuna kadar telif koruması altında. Tam metin için hak sahibinden izin alınacak; izne kadar yalnızca şair, eser adı ve kaynak gösterilir.',
    metinDogrulandi: false,
    kaynak: 'https://tr.wikipedia.org/wiki/Yahya_Kemal_Beyatl%C4%B1',
  },
  {
    id: 'sait-faik-burgaz',
    sair: 'Sait Faik Abasıyanık',
    sairOlum: 1954,
    baslik: 'Burgazada öyküleri (düzyazı)',
    yil: null,
    semtIdler: ['burgazada'],
    mekanIdler: ['sait-faik-muzesi', 'kalpazankaya'],
    telifDurumu: 'kamu-mali',
    metin: null,
    notlar: 'Sait Faik\'in eserleri 2025\'ten beri kamu malı. Adayla ilgili öyküden seçilecek bölüm basılı baskıdan aktarılacak.',
    metinDogrulandi: false,
    kaynak: 'https://tr.wikipedia.org/wiki/Sait_Faik_Abas%C4%B1yan%C4%B1k',
  },
];
