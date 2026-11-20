// İstanbul konumlarına göre müzik torbaları ve mekana özel "Biz size bunu öneriyoruz" eşleştirmeleri.
// Her eser için YouTube Music, Spotify ve Apple Music bağlantıları muzikService tarafından üretilir.

export const MUZIK_PARCALARI = {
  // ── Fatih / Tarihi Yarımada / Balat ──
  'dede-gulnihal': {
    id: 'dede-gulnihal',
    eser: 'Yine Bir Gülnihal',
    sanatci: 'Hammâmîzâde İsmâil Dede Efendi',
    donem: 'Rast · 19. yy İstanbul',
    not: 'Tarihi Yarımada’nın avluları ve taş sokaklarıyla özdeşleşmiş klasik İstanbul musikisi.',
  },
  'dede-ferahfeza': {
    id: 'dede-ferahfeza',
    eser: 'Ferâhfezâ Mevlevî Âyini',
    sanatci: 'Hammâmîzâde İsmâil Dede Efendi',
    donem: 'Ferâhfezâ · Mevlevî müziği',
    not: 'Dede Efendi’nin en görkemli âyinlerinden; ney ve kudümle dingin bir yürüyüş eşliği.',
  },
  'itri-tekbir': {
    id: 'itri-tekbir',
    eser: 'Segâh Tekbir ve Salât-ı Ümmiye',
    sanatci: 'Buhûrîzâde Mustafa Itrî',
    donem: 'Segâh · 17. yy',
    not: '17. yüzyıl İstanbul’unun en büyük bestekârı Itrî’den zamansız bir kubbe tınısı.',
  },
  'itri-tuti': {
    id: 'itri-tuti',
    eser: 'Tûtî-i Mûcize Gûyem',
    sanatci: 'Buhûrîzâde Mustafa Itrî',
    donem: 'Segâh Yürük Semâi · 17. yy',
    not: 'Fatih ve Sultanahmet çevresinde klasik Osmanlı şiiriyle musikinin buluşması.',
  },
  'itri-nat': {
    id: 'itri-nat',
    eser: 'Rast Nât-ı Mevlânâ',
    sanatci: 'Buhûrîzâde Mustafa Itrî',
    donem: 'Rast · 17. yy',
    not: 'Haliç kıyısı ve Eyüp’ün sakin atmosferine yakışan klasik bir başyapıt.',
  },
  'tanburi-cecen': {
    id: 'tanburi-cecen',
    eser: 'Çeçen Kızı',
    sanatci: 'Tanbûrî Cemil Bey',
    donem: 'Hüseynî · Erken 20. yy',
    not: 'Kapalıçarşı hanlarının ve eski İstanbul çarşılarının temposuna uyan usta işi tanbur icrası.',
  },
  'kantemir-huseyni': {
    id: 'kantemir-huseyni',
    eser: 'Hüseynî Peşrev',
    sanatci: 'Dimitri Kantemir (Kantemiroğlu)',
    donem: 'Hüseynî · 17. yy sonu',
    not: 'Fener’de yaşamış bestekâr ve bilgin Kantemiroğlu’nun Balat–Fener mirasını taşıyan eseri.',
  },

  // ── Beyoğlu / Galata / Pera ──
  'tatyos-gamzedeyim': {
    id: 'tatyos-gamzedeyim',
    eser: 'Gamzedeyim Deva Bulmam',
    sanatci: 'Kemânî Tatyos Efendi',
    donem: 'Uşşak · Geç 19. yy Pera',
    not: 'Beyoğlu ve Galata’nın akşam ışığında yüzyıldır dinlenen eşsiz bir İstanbul şarkısı.',
  },
  'tatyos-rast-pesrev': {
    id: 'tatyos-rast-pesrev',
    eser: 'Rast Peşrev',
    sanatci: 'Kemânî Tatyos Efendi',
    donem: 'Rast · 19. yy',
    not: 'Pera’nın çok kültürlü salonları ve keman geleneğinden zarif bir saz eseri.',
  },
  'bimen-sen': {
    id: 'bimen-sen',
    eser: 'Yüzüm Şen, Hatıram Şen',
    sanatci: 'Bimen Şen',
    donem: 'Hicaz · Erken 20. yy',
    not: 'İstiklal pasajları ve eski Beyoğlu akşamlarının neşeli hafızası.',
  },
  'haci-arif-olmaz': {
    id: 'haci-arif-olmaz',
    eser: 'Olmaz İlaç Sine-i Sad Pareme',
    sanatci: 'Hacı Arif Bey',
    donem: 'Segâh · 19. yy',
    not: 'Şarkı formunun büyük ustasından Pera ve Boğaz yokuşlarına eşlik eden klasik.',
  },
  'refik-fersan-sirto': {
    id: 'refik-fersan-sirto',
    eser: 'Sultânîyegâh Sirto',
    sanatci: 'Refik Fersan',
    donem: 'Sultânîyegâh · 20. yy',
    not: 'Galata’dan Tünel’e yürürken adımlara canlılık katan zarif bir saz eseri.',
  },
  'zeki-muren-simdi': {
    id: 'zeki-muren-simdi',
    eser: 'Şimdi Uzaklardasın',
    sanatci: 'Zeki Müren',
    donem: 'Sûzinâk · 20. yy',
    not: 'Çukurcuma ve Beyoğlu’nun nostaljik 1960–70’ler İstanbul belleği.',
  },

  // ── Beşiktaş / Nişantaşı / Şişli / Boğaz ──
  'crr-lukus-hayat': {
    id: 'crr-lukus-hayat',
    eser: 'Lüküs Hayat (Uvertür)',
    sanatci: 'Cemal Reşit Rey',
    donem: 'Operet · 1933 İstanbul',
    not: 'Beşiktaş, Nişantaşı ve Cumhuriyet dönemi İstanbul sahnelerinin en neşeli teması.',
  },
  'crr-enstantaneler': {
    id: 'crr-enstantaneler',
    eser: 'Enstantaneler (İstanbul’dan İzlenimler)',
    sanatci: 'Cemal Reşit Rey',
    donem: 'Senfonik · 1931',
    not: 'Boğaziçi kıyısından modern şehre uzanan çok sesli İstanbul tablosu.',
  },
  'erkin-kocekce': {
    id: 'erkin-kocekce',
    eser: 'Köçekçe',
    sanatci: 'Ulvi Cemal Erkin',
    donem: 'Orkestra Süiti · 1943',
    not: 'Türk Beşleri’nden Nişantaşı ve Beşiktaş’ın konser salonlarına yakışan enerjik süit.',
  },
  'munir-aziz-istanbul': {
    id: 'munir-aziz-istanbul',
    eser: 'Aziz İstanbul',
    sanatci: 'Münir Nurettin Selçuk',
    donem: 'Hicaz · Yahya Kemal güftesi',
    not: 'Boğaz’a iki yakadan bakarken İstanbul’a yazılmış en ünlü şarkı.',
  },
  'munir-donulmez': {
    id: 'munir-donulmez',
    eser: 'Dönülmez Akşamın Ufkundayız',
    sanatci: 'Münir Nurettin Selçuk',
    donem: 'Segâh · Yahya Kemal güftesi',
    not: 'Bebek, Rumelihisarı ve Aşiyan sırtlarında akşamüstü yürüyüşü için.',
  },

  // ── Üsküdar / Kuzguncuk ──
  'katibim': {
    id: 'katibim',
    eser: 'Kâtibim (Üsküdar’a Gider İken)',
    sanatci: 'İstanbul Türküsü',
    donem: 'Nihavend · Anonim',
    not: 'Üsküdar iskelesinden Salacak’a uzanan en eski ve neşeli İstanbul ezgisi.',
  },
  'dede-ey-but': {
    id: 'dede-ey-but',
    eser: 'Ey Büt-i Nev Edâ',
    sanatci: 'Hammâmîzâde İsmâil Dede Efendi',
    donem: 'Hicaz · 19. yy',
    not: 'Üsküdar’ın tarihi camileri ve sahil yürüyüşüne yakışan klasik bir şarkı.',
  },
  'niyazi-sayin-huzzam': {
    id: 'niyazi-sayin-huzzam',
    eser: 'Hüzzam Ney Taksimi',
    sanatci: 'Niyazi Sayın',
    donem: 'Hüzzam · Üsküdarlı neyzen',
    not: 'Üsküdarlı büyük neyzen Niyazi Sayın’dan Haliç ve Boğaz sularına dingin bir nefes.',
  },
  'ortacgil-benimle': {
    id: 'ortacgil-benimle',
    eser: 'Benimle Oynar mısın?',
    sanatci: 'Bülent Ortaçgil',
    donem: 'Akustik · 1974 İstanbul',
    not: 'Kuzguncuk’un ağaçlı sokakları ve sakin ahşap evleriyle uyumlu akustik klasik.',
  },

  // ── Kadıköy / Moda ──
  'baris-donence': {
    id: 'baris-donence',
    eser: 'Dönence',
    sanatci: 'Barış Manço',
    donem: 'Anadolu Rock · 1981 Moda',
    not: 'Moda’nın simge ismi Barış Manço’nun en derinlikli, zamansız bestesi.',
  },
  'baris-gulpembe': {
    id: 'baris-gulpembe',
    eser: 'Gülpembe',
    sanatci: 'Barış Manço',
    donem: 'Anadolu Rock · 1981',
    not: 'Kadıköy ve Moda sokaklarının hafızasında yaşayan unutulmaz melodi.',
  },
  'munir-kalamis': {
    id: 'munir-kalamis',
    eser: 'Kalamış (Bir Tatlı Huzur)',
    sanatci: 'Münir Nurettin Selçuk',
    donem: 'Nihavend · Behçet Kemal Çağlar',
    not: 'Moda ve Kalamış sahilinde gün batımına eşlik eden efsanevi Anadolu yakası şarkısı.',
  },
  'kizilok-gonul': {
    id: 'kizilok-gonul',
    eser: 'Gönül',
    sanatci: 'Fikret Kızılok',
    donem: 'Akustik · 1970’ler İstanbul',
    not: 'Kadıköy çarşısı ve sahil yürüyüşleri için sıcak, yalın bir İstanbul tınısı.',
  },

  // ── Adalar ──
  'yesari-adalar': {
    id: 'yesari-adalar',
    eser: 'Adalar Sahilinde Bekliyorum',
    sanatci: 'Yesari Asım Arsoy',
    donem: 'Hicaz · 20. yy',
    not: 'Vapur iskelesinden Burgazada ve Adalar kıyılarına uzanan klasik İstanbul şarkısı.',
  },
  'koyuturk-papatya': {
    id: 'koyuturk-papatya',
    eser: 'Papatya',
    sanatci: 'Necdet Koyutürk',
    donem: 'İstanbul Tangosu · 1940’lar',
    not: 'Adalar’ın yazlık köşkleri ve çam kokulu yollarına yakışan zarif bir İstanbul tangosu.',
  },
  'ortacgil-eylul': {
    id: 'ortacgil-eylul',
    eser: 'Eylül Akşamı',
    sanatci: 'Bülent Ortaçgil',
    donem: 'Akustik · İstanbul',
    not: 'Araçsız ada sokaklarında deniz kıyısında yürürken dinlenecek sakin bir parça.',
  },
};

// İlçe / bölge bazlı rastgele müzik torbaları
export const BOLGE_TORBASI = {
  fatih: ['dede-gulnihal', 'itri-tekbir', 'itri-tuti', 'tanburi-cecen', 'kantemir-huseyni', 'munir-aziz-istanbul'],
  beyoglu: ['tatyos-gamzedeyim', 'tatyos-rast-pesrev', 'bimen-sen', 'haci-arif-olmaz', 'refik-fersan-sirto', 'zeki-muren-simdi'],
  besiktas: ['crr-lukus-hayat', 'crr-enstantaneler', 'erkin-kocekce', 'munir-aziz-istanbul', 'munir-donulmez'],
  sisli: ['crr-lukus-hayat', 'crr-enstantaneler', 'erkin-kocekce', 'bimen-sen'],
  sariyer: ['munir-donulmez', 'crr-enstantaneler', 'munir-aziz-istanbul', 'haci-arif-olmaz'],
  eyupsultan: ['itri-nat', 'niyazi-sayin-huzzam', 'dede-ferahfeza', 'itri-tuti'],
  uskudar: ['katibim', 'niyazi-sayin-huzzam', 'dede-ey-but', 'ortacgil-benimle', 'munir-aziz-istanbul'],
  kadikoy: ['baris-donence', 'baris-gulpembe', 'munir-kalamis', 'ortacgil-benimle', 'kizilok-gonul'],
  adalar: ['yesari-adalar', 'koyuturk-papatya', 'ortacgil-eylul', 'munir-kalamis'],

  // Semt kimlikleri için kısa yollar (SemtSayfasi uyumu)
  sultanahmet: ['dede-gulnihal', 'itri-tekbir', 'itri-tuti', 'tanburi-cecen'],
  balat: ['kantemir-huseyni', 'dede-gulnihal', 'tanburi-cecen', 'niyazi-sayin-huzzam'],
  eyup: ['itri-nat', 'niyazi-sayin-huzzam', 'dede-ferahfeza'],
  bogaz: ['crr-enstantaneler', 'crr-lukus-hayat', 'munir-donulmez', 'munir-aziz-istanbul'],
  kuzguncuk: ['ortacgil-benimle', 'katibim', 'dede-ey-but'],
  burgazada: ['yesari-adalar', 'koyuturk-papatya', 'ortacgil-eylul'],

  // Yaka ve tüm İstanbul yedek torbaları
  avrupa: ['dede-gulnihal', 'itri-tuti', 'tatyos-gamzedeyim', 'crr-lukus-hayat', 'crr-enstantaneler', 'tanburi-cecen', 'munir-aziz-istanbul'],
  anadolu: ['katibim', 'baris-donence', 'munir-kalamis', 'ortacgil-benimle', 'yesari-adalar', 'niyazi-sayin-huzzam'],
  istanbul: [
    'dede-gulnihal', 'itri-tuti', 'tatyos-gamzedeyim', 'crr-lukus-hayat',
    'crr-enstantaneler', 'munir-aziz-istanbul', 'katibim', 'baris-donence', 'yesari-adalar',
  ],
};

// Seçili mekanlar için özel "Biz size bunu öneriyoruz" birebir eşleştirmeleri
export const MEKAN_OZEL_MUZIK = {
  'ayasofya': {
    parcaId: 'itri-tekbir',
    neden: 'Bin beş yüz yıllık kubbenin dinginliğine Itrî’nin görkemli Segâh tınısı eşlik etsin.',
  },
  'sultanahmet-camii': {
    parcaId: 'dede-gulnihal',
    neden: 'İznik çinileri ve avlu serinliğiyle klasik İstanbul musikisinin en zarif eseri.',
  },
  'kapalicarsi': {
    parcaId: 'tanburi-cecen',
    neden: 'Hanların ve çarşı sokaklarının ritmine Tanbûrî Cemil Bey’den canlı bir icra.',
  },
  'kariye': {
    parcaId: 'kantemir-huseyni',
    neden: 'Fener–Balat sırtlarının katmanlı tarihine Kantemiroğlu’nun Hüseynî Peşrevi yakışır.',
  },
  'fener-rum-lisesi': {
    parcaId: 'kantemir-huseyni',
    neden: 'Fener’de yaşamış Dimitri Kantemir’in Osmanlı-Rum ortak müzik mirası.',
  },
  'galata-kulesi': {
    parcaId: 'tatyos-gamzedeyim',
    neden: 'Galata ve Pera’nın akşam ışığında kuleye yaklaşırken Kemânî Tatyos Efendi’den.',
  },
  'galata-mevlevihanesi': {
    parcaId: 'dede-ferahfeza',
    neden: '1491’den beri ney sesinin yankılandığı Galata Mevlevihanesi için Dede Efendi’nin âyini.',
  },
  'pera-muzesi': {
    parcaId: 'tatyos-rast-pesrev',
    neden: '19. yüzyıl Pera salon kültürünün zarafetini taşıyan bir saz eseri.',
  },
  'masumiyet-muzesi': {
    parcaId: 'zeki-muren-simdi',
    neden: 'Çukurcuma’da 1970’lerin İstanbul hafızasını taşıyan sokaklarda yürürken.',
  },
  'dolmabahce-sarayi': {
    parcaId: 'crr-enstantaneler',
    neden: 'Boğaz kıyısındaki saraydan modern İstanbul’a uzanan Cemal Reşit Rey senfonisi.',
  },
  'ortakoy-camii': {
    parcaId: 'munir-aziz-istanbul',
    neden: 'Boğaz köprüsü ve su sesi eşliğinde Ortaköy iskelesinde dururken.',
  },
  'rumelihisari': {
    parcaId: 'munir-donulmez',
    neden: 'Boğaz’ın en dar noktasında Aşiyan ve Hisar sırtlarına bakan eşsiz bir klasik.',
  },
  'kiz-kulesi': {
    parcaId: 'katibim',
    neden: 'Salacak kıyısından Kız Kulesi’ne bakarken İstanbul’un en bilinen ezgisi.',
  },
  'kuzguncuk-icadiye': {
    parcaId: 'ortacgil-benimle',
    neden: 'Ahşap evler ve çınar gölgesinde sakin bir Kuzguncuk yürüyüşü için.',
  },
  'baris-manco-evi': {
    parcaId: 'baris-donence',
    neden: 'Moda’daki evini gezerken Barış Manço’nun en zamansız yolculuğu.',
  },
  'sureyya-operasi': {
    parcaId: 'crr-lukus-hayat',
    neden: 'Kadıköy’ün tarihî opera sahnesine Cumhuriyet döneminin en canlı opereti yakışır.',
  },
  'moda-sahili': {
    parcaId: 'munir-kalamis',
    neden: 'Moda ve Kalamış kıyısında gün batımına eşlik eden İstanbul klasiği.',
  },
  'eyup-sultan-camii': {
    parcaId: 'itri-nat',
    neden: 'Haliç’in ucunda Eyüp Sultan avlusunun huzuruna Itrî’nin başyapıtı.',
  },
  'pierre-loti-tepesi': {
    parcaId: 'niyazi-sayin-huzzam',
    neden: 'Haliç manzarasına karşı kahve eşliğinde dingin bir ney taksimi.',
  },
  'sait-faik-muzesi': {
    parcaId: 'yesari-adalar',
    neden: 'Burgazada’nın araçsız sokaklarında Sait Faik’in adasını dinlerken.',
  },
};
