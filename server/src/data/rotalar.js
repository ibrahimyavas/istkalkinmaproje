// Semt hikâye rotaları. `duraklar` sıralı mekan id'leridir; `anlatim` sesli
// rehberin okuyacağı kısa metindir. Rota geometrisi ve eğim profili
// `scripts/build-routes.js` (Valhalla) çıktısından gelir; o dosya yoksa
// mapService duraklar arasında yaklaşık bir çizgi çizer ve bunu belirtir.
//
// tur: 'hikaye' | 'zanaat' | 'edebiyat'

export const rotalar = [
  {
    id: 'yarimada-zanaat',
    semtId: 'sultanahmet',
    tur: 'zanaat',
    ad: 'Çinilerden Çarşıya: Yarımadada Zanaatin İzi',
    ozet: 'Ayasofya\'dan Kapalıçarşı\'ya, İznik çinilerinden bakır ustalarına uzanan bir yürüyüş.',
    duraklar: [
      { mekanId: 'ayasofya', anlatim: 'Yürüyüşe Ayasofya\'nın önünden başlıyoruz. Bin beş yüz yıldır ayakta duran bu kubbe, şehrin bütün ustalarına okul oldu.' },
      { mekanId: 'sultanahmet-camii', anlatim: 'Karşınızdaki cami, iç duvarlarını kaplayan binlerce İznik çinisi yüzünden dünyada Mavi Cami diye anılır. Çinilerdeki lale ve karanfillere dikkat edin; birazdan bir atölyede aynı motifleri göreceğiz.' },
      { mekanId: 'arasta', anlatim: 'Arasta, caminin gelirleri için yapılmış bir çarşıydı. Bugün de el sanatları dükkânları burada sıralanıyor.' },
      { mekanId: 'atolye-ebru-sultanahmet', anlatim: 'Ebru, suyun üzerinde resim yapma sanatıdır. Usta, boyaları fırçayla serper ve desenleri bir kâğıda aktarır. Her ebru tektir; ikincisi yapılamaz.' },
      { mekanId: 'tiem', anlatim: 'İbrahim Paşa Sarayı\'ndaki bu müzede, yüzyıllar boyunca dokunmuş halıları ve hat levhalarını görebilirsiniz.' },
      { mekanId: 'kapalicarsi', anlatim: 'Ve Kapalıçarşı. Orhan Veli\'nin dizesiyle: serin serin Kapalıçarşı. Hanlarda bugün de bakırcılar, kuyumcular ve kalemkârlar çalışıyor.' },
    ],
  },
  {
    id: 'balat-hikaye',
    semtId: 'balat',
    tur: 'hikaye',
    ad: 'Haliç Kıyısında Üç İnanç, Bir Mahalle',
    ozet: 'Bulgar Kilisesi\'nden Kariye\'ye, Balat ve Fener\'in katmanlı tarihine yokuş yukarı bir yolculuk.',
    duraklar: [
      { mekanId: 'bulgar-kilisesi', anlatim: 'Bu kilisenin parçaları Viyana\'da demirden döküldü, gemilerle getirildi ve burada birleştirildi. Bir tür hazır yapı, ama 1898 yılından.' },
      { mekanId: 'fener-rum-lisesi', anlatim: 'Tepedeki kırmızı tuğlalı bina, mahallede Kırmızı Mektep diye anılan Fener Rum Lisesi. Buradan sonra yokuş dikleşiyor.' },
      { mekanId: 'atolye-sedef-balat', anlatim: 'Sedef kakma, deniz kabuklarından kesilen parlak parçaların ahşaba tek tek yerleştirilmesiyle yapılır. Bir sandık haftalarca sürebilir.' },
      { mekanId: 'ahrida', anlatim: 'Ahrida Sinagogu, İstanbul\'un en eski sinagoglarından biri. Adını, cemaatinin geldiği Ohri şehrinden alır.' },
      { mekanId: 'film-balat-sokaklari', anlatim: 'Renkli cepheleriyle bu sokaklar, son yıllarda pek çok dizi ve filmin çekim yeri oldu.' },
      { mekanId: 'kariye', anlatim: 'Rotanın sonunda Kariye. İçindeki mozaikler, Bizans sanatının son büyük döneminden kalma.' },
    ],
  },
  {
    id: 'kuzguncuk-hikaye',
    semtId: 'kuzguncuk',
    tur: 'hikaye',
    ad: 'Kuzguncuk: Aynı Duvarı Paylaşanlar',
    ozet: 'Kısa ve sakin bir mahalle yürüyüşü; ahşap evler, bostan ve yan yana ibadethaneler.',
    duraklar: [
      { mekanId: 'kuzguncuk-cami-kilise', anlatim: 'Burada bir cami ile bir kilise aynı bahçe duvarını paylaşıyor. Kuzguncuk, farklı inançların yüzyıllarca komşu olduğu bir mahalle.' },
      { mekanId: 'kuzguncuk-icadiye', anlatim: 'İcadiye Caddesi boyunca yürürken ahşap evlerin cumbalarına bakın. Pek çoğu ustalar tarafından aslına uygun onarıldı.' },
      { mekanId: 'atolye-ahsap-kuzguncuk', anlatim: 'Bu ahşap evlerin oymaları ve korkulukları, bugün de birkaç ustanın elinde yaşamaya devam ediyor.' },
      { mekanId: 'kuzguncuk-bostani', anlatim: 'Bostan, mahalle sakinlerinin birlikte koruduğu bir yeşil alan. Kuzguncuk\'un dayanışmasının en somut örneği.' },
    ],
  },
  {
    id: 'uskudar-sinan',
    semtId: 'uskudar',
    tur: 'zanaat',
    ad: 'Sinan\'ın Üsküdar\'ı ve Çini Ustaları',
    ozet: 'İskele\'den Atik Valide\'ye, Mimar Sinan eserleri ve çini-hat atölyeleri.',
    duraklar: [
      { mekanId: 'kiz-kulesi', anlatim: 'Salacak kıyısından Kız Kulesi\'ne bakıyoruz. Rotamız buradan iskeleye, oradan da tepeye doğru ilerleyecek.' },
      { mekanId: 'semsi-pasa', anlatim: 'Şemsi Paşa Camii, Mimar Sinan\'ın denize en yakın yaptığı eserlerden biri. Küçük ama çok zarif.' },
      { mekanId: 'mihrimah-iskele', anlatim: 'İskele Camii olarak da bilinen bu yapıyı Sinan, Kanuni Sultan Süleyman\'ın kızı Mihrimah Sultan için yaptı.' },
      { mekanId: 'atolye-cini-uskudar', anlatim: 'Çini atölyesinde, motifler önce kâğıda çizilir, sonra kömür tozuyla karonun üzerine aktarılır ve elle boyanır.' },
      { mekanId: 'atolye-hat-uskudar', anlatim: 'Hat sanatında öğrenci, yıllarca hocasının yazdığı harfleri tekrar ederek meşk eder.' },
      { mekanId: 'atik-valide', anlatim: 'Tepedeki Atik Valide Külliyesi, Sinan\'ın Üsküdar\'daki en büyük eseri. Yokuş zorlu ama avlunun sükûneti buna değer.' },
    ],
  },
  {
    id: 'kadikoy-sahne',
    semtId: 'kadikoy',
    tur: 'hikaye',
    ad: 'Çarşıdan Sahneye: Kadıköy\'ün Sesleri',
    ozet: 'Çarşı esnafından Süreyya Operası\'na, oradan Barış Manço Evi ve Moda sahiline.',
    duraklar: [
      { mekanId: 'kadikoy-carsi', anlatim: 'Kadıköy Çarşısı\'nda yürürken balıkçıların seslerine, sahafların raflarına kulak verin.' },
      { mekanId: 'sureyya-operasi', anlatim: 'Süreyya Operası 1927\'de açıldı. Uzun yıllar sinema olarak kullanıldıktan sonra yeniden sahneye kavuştu.' },
      { mekanId: 'atolye-seramik-moda', anlatim: 'Moda\'daki seramik atölyelerinde geleneksel çömlekçilik çağdaş tasarımla buluşuyor.' },
      { mekanId: 'baris-manco-evi', anlatim: 'Barış Manço\'nun Moda\'daki evi bugün müze. Sahne kostümleri ve plakları burada.' },
      { mekanId: 'moda-sahili', anlatim: 'Rotayı Moda sahilinde, gün batımına karşı bitiriyoruz.' },
    ],
  },
  {
    id: 'burgaz-sait-faik',
    semtId: 'burgazada',
    tur: 'edebiyat',
    ad: 'Sait Faik\'in Adası',
    ozet: 'İskeleden yazarın evine, oradan Kalpazankaya\'ya bir edebiyat yürüyüşü.',
    duraklar: [
      { mekanId: 'aya-yani', anlatim: 'Vapurdan iner inmez sizi Aya Yani Kilisesi\'nin kubbesi karşılıyor.' },
      { mekanId: 'sait-faik-muzesi', anlatim: 'Sait Faik bu evde yaşadı ve yazdı. Öykülerinde adanın balıkçıları, kahvecileri ve denizi hep vardır.' },
      { mekanId: 'kalpazankaya', anlatim: 'Kalpazankaya, yazarın öykülerinde de geçen kayalık koy. Uzun bir yürüyüş, ama denize karşı oturup bir öykü okumak için en güzel yer.' },
    ],
  },
];
