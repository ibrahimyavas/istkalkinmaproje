// Mekan, atölye, film ve edebiyat kayıtları.
//
// Kurallar (plan: "Demo semtleri"):
// - `kaynak` her kayıtta zorunlu.
// - `dogrulandi: false` olan kayıtlar arayüzde "doğrulanacak" etiketiyle gösterilir.
//   Örnek atölyeler gerçek işletme değildir; başvuru öncesi gerçek ustalarla
//   (izinleri alınarak) değiştirilecek.
// - Koordinatlar yaklaşık; OSM ile doğrulanacak.
//
// erisilebilirlik.zemin: 'duz' | 'arnavut' | 'yokus' | 'merdiven'
// Erişilebilirlik alanları demoda tahmini; yerinde gözlemle doğrulanacak.

import { mekanDetaylari } from './mekanDetaylari.js';
import { mekanGorselleri } from './mekanGorselleri.js';
import { muzeler } from './muzeler.js';

const bilinmiyor = null;

const hamMekanlar = [
  // ── Sultanahmet–Kapalıçarşı ─────────────────────────────
  {
    id: 'ayasofya', semtId: 'sultanahmet', tur: 'miras', ad: 'Ayasofya',
    lat: 41.0086, lon: 28.9802,
    kisa: '537 yılında I. Justinianus döneminde tamamlanan kubbeli yapı; İstanbul\'un simgesi.',
    erisilebilirlik: { rampa: true, asansor: false, wc: true, basamak: false, zemin: 'duz', not: 'Ana giriş katı düz; üst galeriye rampa ile çıkılır.' },
    damgaKodu: 'AYS-01', kaynak: 'https://tr.wikipedia.org/wiki/Ayasofya', dogrulandi: true,
  },
  {
    id: 'sultanahmet-camii', semtId: 'sultanahmet', tur: 'miras', ad: 'Sultanahmet Camii',
    lat: 41.0054, lon: 28.9768,
    kisa: '1609–1616 yılları arasında Mimar Sedefkâr Mehmed Ağa tarafından inşa edildi; iç mekânındaki İznik çinileriyle tanınır.',
    erisilebilirlik: { rampa: true, asansor: false, wc: true, basamak: true, zemin: 'duz', not: 'Ziyaretçi girişinde basamak var; avlu düz.' },
    damgaKodu: 'SAC-02', kaynak: 'https://tr.wikipedia.org/wiki/Sultanahmet_Camii', dogrulandi: true,
  },
  {
    id: 'tiem', semtId: 'sultanahmet', tur: 'muze', ad: 'Türk ve İslam Eserleri Müzesi',
    lat: 41.0063, lon: 28.9752,
    kisa: 'İbrahim Paşa Sarayı\'nda; halı, hat, çini ve ahşap eserlerden oluşan koleksiyon.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: bilinmiyor, wc: true, basamak: true, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'TIE-03', kaynak: 'https://tr.wikipedia.org/wiki/T%C3%BCrk_ve_%C4%B0slam_Eserleri_M%C3%BCzesi', dogrulandi: true,
  },
  {
    id: 'arasta', semtId: 'sultanahmet', tur: 'carsi', ad: 'Arasta Çarşısı',
    lat: 41.0044, lon: 28.9775,
    kisa: 'Sultanahmet Camii külliyesinin bir parçası olan tek sıra dükkânlı tarihi çarşı.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: false, basamak: false, zemin: 'arnavut', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'ARS-04', kaynak: 'https://tr.wikipedia.org/wiki/Arasta_%C3%87ar%C5%9F%C4%B1s%C4%B1', dogrulandi: true,
  },
  {
    id: 'kapalicarsi', semtId: 'sultanahmet', tur: 'carsi', ad: 'Kapalıçarşı',
    lat: 41.0107, lon: 28.9680,
    kisa: '15. yüzyıldan beri süren, dünyanın en eski ve büyük kapalı çarşılarından biri.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: true, basamak: true, zemin: 'yokus', not: 'Bazı kapılarda basamak ve hafif eğim var; yerinde doğrulanacak.' },
    damgaKodu: 'KPC-05', kaynak: 'https://tr.wikipedia.org/wiki/Kapal%C4%B1%C3%A7ar%C5%9F%C4%B1', dogrulandi: true,
  },
  {
    id: 'atolye-ebru-sultanahmet', semtId: 'sultanahmet', tur: 'atolye', zanaat: 'ebru', ad: 'Ebru Atölyesi (örnek kayıt)',
    lat: 41.0049, lon: 28.9781,
    kisa: 'Kitre ile koyulaştırılmış su üzerine boyaların serpilmesiyle yapılan geleneksel ebru sanatı; 1,5 saatlik tanışma atölyesi.',
    deneyim: { sureDk: 90, kapasite: 8, fiyatAraligi: '₺₺' },
    erisilebilirlik: { rampa: false, asansor: false, wc: true, basamak: true, zemin: 'duz', not: 'Örnek kayıt.' },
    damgaKodu: 'EBR-06', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },
  {
    id: 'atolye-bakir-kapalicarsi', semtId: 'sultanahmet', tur: 'atolye', zanaat: 'bakircilik', ad: 'Bakır İşleme Atölyesi (örnek kayıt)',
    lat: 41.0125, lon: 28.9660,
    kisa: 'Kapalıçarşı çevresindeki hanlarda süren dövme bakır ve kalaycılık geleneği.',
    deneyim: { sureDk: 60, kapasite: 4, fiyatAraligi: '₺₺' },
    erisilebilirlik: { rampa: false, asansor: false, wc: false, basamak: true, zemin: 'merdiven', not: 'Han üst katı; örnek kayıt.' },
    damgaKodu: 'BKR-07', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },

  // ── Balat–Fener ─────────────────────────────────────────
  {
    id: 'kariye', semtId: 'balat', tur: 'miras', ad: 'Kariye (Chora)',
    lat: 41.0312, lon: 28.9390,
    kisa: '14. yüzyıl Bizans mozaik ve fresklerinin en iyi korunmuş örneklerine ev sahipliği yapan yapı.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'yokus', not: 'Yokuş üstünde; yerinde doğrulanacak.' },
    damgaKodu: 'KRY-08', kaynak: 'https://tr.wikipedia.org/wiki/Kariye_Camii', dogrulandi: true,
  },
  {
    id: 'ahrida', semtId: 'balat', tur: 'miras', ad: 'Ahrida Sinagogu',
    lat: 41.03291, lon: 28.94552, // OSM
    kisa: 'İstanbul\'un en eski sinagoglarından; 15. yüzyılda Makedonya\'nın Ohri kentinden gelen cemaatçe kurulduğu kabul edilir.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'arnavut', not: 'Ziyaret önceden izinle; yerinde doğrulanacak.' },
    damgaKodu: 'AHR-09', kaynak: 'https://tr.wikipedia.org/wiki/Ahrida_Sinagogu', dogrulandi: true,
  },
  {
    id: 'fener-rum-lisesi', semtId: 'balat', tur: 'miras', ad: 'Fener Rum Lisesi',
    lat: 41.02928, lon: 28.94939, // OSM
    kisa: 'Kırmızı tuğlalı silueti nedeniyle "Kırmızı Mektep" olarak da bilinen tarihi okul binası.',
    erisilebilirlik: { rampa: false, asansor: false, wc: false, basamak: true, zemin: 'yokus', not: 'Dışarıdan izlenir; çevresi dik yokuş.' },
    damgaKodu: 'FRL-10', kaynak: 'https://tr.wikipedia.org/wiki/Fener_Rum_Lisesi', dogrulandi: true,
  },
  {
    id: 'bulgar-kilisesi', semtId: 'balat', tur: 'miras', ad: 'Sveti Stefan Bulgar Kilisesi',
    lat: 41.0316, lon: 28.9516,
    kisa: 'Demir döküm parçaları Viyana\'da üretilip İstanbul\'da birleştirilen, 1898\'de açılan kilise.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'duz', not: 'Sahil yolunda; yerinde doğrulanacak.' },
    damgaKodu: 'BLG-11', kaynak: 'https://tr.wikipedia.org/wiki/Sveti_Stefan_Kilisesi', dogrulandi: true,
  },
  {
    id: 'atolye-sedef-balat', semtId: 'balat', tur: 'atolye', zanaat: 'sedef', ad: 'Sedef Kakma Atölyesi (örnek kayıt)',
    lat: 41.0300, lon: 28.9478,
    kisa: 'Ahşap yüzeye sedef parçalarının kakılmasıyla yapılan Osmanlı süsleme sanatı.',
    deneyim: { sureDk: 120, kapasite: 6, fiyatAraligi: '₺₺₺' },
    erisilebilirlik: { rampa: true, asansor: false, wc: true, basamak: false, zemin: 'arnavut', not: 'Örnek kayıt.' },
    damgaKodu: 'SDF-12', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },
  {
    id: 'film-balat-sokaklari', semtId: 'balat', tur: 'film', ad: 'Balat\'ın renkli sokakları — dizi çekim alanı',
    lat: 41.02983, lon: 28.94773, // OSM (Kiremit Caddesi)
    kisa: 'Balat\'ın renkli cepheli sokakları pek çok yerli dizi ve filmde mekân olarak kullanıldı. Hangi yapımların hangi sokakta çekildiği doğrulanacak.',
    erisilebilirlik: { rampa: false, asansor: false, wc: false, basamak: false, zemin: 'yokus', not: 'Dik ve Arnavut kaldırımlı.' },
    damgaKodu: 'FLM-13', kaynak: 'Doğrulanacak — yapımcı/belediye kaynağı aranacak', dogrulandi: false,
  },

  // ── Kuzguncuk ───────────────────────────────────────────
  {
    id: 'kuzguncuk-icadiye', semtId: 'kuzguncuk', tur: 'miras', ad: 'İcadiye Caddesi',
    lat: 41.0372, lon: 29.0310,
    kisa: 'Ahşap evleri ve küçük dükkânlarıyla Kuzguncuk\'un ana caddesi.',
    erisilebilirlik: { rampa: false, asansor: false, wc: false, basamak: false, zemin: 'yokus', not: 'Sahilden yukarı doğru yükselir.' },
    damgaKodu: 'ICD-14', kaynak: 'https://tr.wikipedia.org/wiki/Kuzguncuk', dogrulandi: true,
  },
  {
    id: 'kuzguncuk-cami-kilise', semtId: 'kuzguncuk', tur: 'miras', ad: 'Kuzguncuk Camii ve Surp Krikor Lusavoriç Kilisesi',
    lat: 41.03673, lon: 29.03041, // OSM (Surp Krikor)
    kisa: 'Bir cami ile bir Ermeni kilisesinin aynı bahçe duvarını paylaştığı, semtin bir arada yaşama simgesi.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'KZC-15', kaynak: 'https://tr.wikipedia.org/wiki/Kuzguncuk', dogrulandi: true,
  },
  {
    id: 'kuzguncuk-bostani', semtId: 'kuzguncuk', tur: 'mekan', ad: 'Kuzguncuk Bostanı',
    lat: 41.03478, lon: 29.03178, // OSM
    kisa: 'Mahalle sakinlerinin sahip çıktığı tarihi bostan; mahalle dayanışmasının yaşayan örneği.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: false, basamak: false, zemin: 'duz', not: 'Toprak zemin; yerinde doğrulanacak.' },
    damgaKodu: 'BST-16', kaynak: 'https://tr.wikipedia.org/wiki/Kuzguncuk', dogrulandi: false,
  },
  {
    id: 'atolye-ahsap-kuzguncuk', semtId: 'kuzguncuk', tur: 'atolye', zanaat: 'ahsap', ad: 'Ahşap Oyma Atölyesi (örnek kayıt)',
    lat: 41.0368, lon: 29.0318,
    kisa: 'Kuzguncuk\'un ahşap ev dokusundan ilham alan oyma ve restorasyon zanaati.',
    deneyim: { sureDk: 120, kapasite: 5, fiyatAraligi: '₺₺' },
    erisilebilirlik: { rampa: true, asansor: false, wc: true, basamak: false, zemin: 'duz', not: 'Örnek kayıt.' },
    damgaKodu: 'AHS-17', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },

  // ── Üsküdar ─────────────────────────────────────────────
  {
    id: 'mihrimah-iskele', semtId: 'uskudar', tur: 'miras', ad: 'Mihrimah Sultan Camii (İskele Camii)',
    lat: 41.0270, lon: 29.0145,
    kisa: 'Mimar Sinan\'ın Kanuni\'nin kızı Mihrimah Sultan için 1548\'de tamamladığı iskele önündeki cami.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: true, basamak: true, zemin: 'duz', not: 'Yüksek bir set üzerinde; basamaklı giriş.' },
    damgaKodu: 'MHR-18', kaynak: 'https://tr.wikipedia.org/wiki/Mihrimah_Sultan_Camii_(%C3%9Csk%C3%BCdar)', dogrulandi: true,
  },
  {
    id: 'semsi-pasa', semtId: 'uskudar', tur: 'miras', ad: 'Şemsi Paşa Camii',
    lat: 41.0260, lon: 29.0090,
    kisa: 'Mimar Sinan\'ın deniz kıyısındaki küçük ölçekli eserlerinden.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'duz', not: 'Sahil yürüyüş yolunda.' },
    damgaKodu: 'SMS-19', kaynak: 'https://tr.wikipedia.org/wiki/%C5%9Eemsi_Pa%C5%9Fa_Camii', dogrulandi: true,
  },
  {
    id: 'kiz-kulesi', semtId: 'uskudar', tur: 'miras', ad: 'Kız Kulesi (Salacak kıyısından)',
    lat: 41.0211, lon: 29.0041,
    kisa: 'Boğaz\'ın girişindeki küçük adacıkta yükselen kule; Salacak sahilinden izlenir.',
    erisilebilirlik: { rampa: true, asansor: false, wc: false, basamak: false, zemin: 'duz', not: 'Sahil yolu düz; kuleye tekne ile geçilir.' },
    damgaKodu: 'KZK-20', kaynak: 'https://tr.wikipedia.org/wiki/K%C4%B1z_Kulesi', dogrulandi: true,
  },
  {
    id: 'atik-valide', semtId: 'uskudar', tur: 'miras', ad: 'Atik Valide Külliyesi',
    lat: 41.0231, lon: 29.0250,
    kisa: 'Nurbanu Sultan için Mimar Sinan\'ın inşa ettiği büyük külliye (16. yüzyıl sonu).',
    erisilebilirlik: { rampa: false, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'yokus', not: 'Tepede; yokuşlu yaklaşım.' },
    damgaKodu: 'ATV-21', kaynak: 'https://tr.wikipedia.org/wiki/Atik_Valide_Sultan_K%C3%BClliyesi', dogrulandi: true,
  },
  {
    id: 'atolye-cini-uskudar', semtId: 'uskudar', tur: 'atolye', zanaat: 'cini', ad: 'Çini Atölyesi (örnek kayıt)',
    lat: 41.0248, lon: 29.0170,
    kisa: 'İznik geleneğindeki lale, karanfil ve rumi motiflerinin el ile boyandığı çini atölyesi.',
    deneyim: { sureDk: 150, kapasite: 10, fiyatAraligi: '₺₺' },
    erisilebilirlik: { rampa: true, asansor: true, wc: true, basamak: false, zemin: 'duz', not: 'Örnek kayıt.' },
    damgaKodu: 'CNI-22', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },
  {
    id: 'atolye-hat-uskudar', semtId: 'uskudar', tur: 'atolye', zanaat: 'hat', ad: 'Hat Sanatı Atölyesi (örnek kayıt)',
    lat: 41.0238, lon: 29.0195,
    kisa: 'Kamış kalem ve is mürekkebiyle temel harf meşki; hat sanatına giriş.',
    deneyim: { sureDk: 90, kapasite: 8, fiyatAraligi: '₺' },
    erisilebilirlik: { rampa: false, asansor: false, wc: true, basamak: true, zemin: 'yokus', not: 'Örnek kayıt.' },
    damgaKodu: 'HAT-23', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },

  // ── Kadıköy–Moda ────────────────────────────────────────
  {
    id: 'kadikoy-carsi', semtId: 'kadikoy', tur: 'carsi', ad: 'Kadıköy Çarşısı',
    lat: 40.9905, lon: 29.0260,
    kisa: 'Balıkçıları, şarküterileri ve sahafları ile yüz yılı aşkın esnaf geleneği süren çarşı.',
    erisilebilirlik: { rampa: true, asansor: false, wc: false, basamak: false, zemin: 'duz', not: 'Yayalaştırılmış sokaklar; kalabalık.' },
    damgaKodu: 'KDC-24', kaynak: 'https://tr.wikipedia.org/wiki/Kad%C4%B1k%C3%B6y', dogrulandi: true,
  },
  {
    id: 'sureyya-operasi', semtId: 'kadikoy', tur: 'sahne', ad: 'Süreyya Operası',
    lat: 40.9887, lon: 29.0300,
    kisa: 'Süreyya İlmen Paşa tarafından yaptırılan ve 1927\'de açılan, Anadolu yakasının ilk opera binalarından.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: bilinmiyor, wc: true, basamak: true, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'SRY-25', kaynak: 'https://tr.wikipedia.org/wiki/S%C3%BCreyya_Operas%C4%B1', dogrulandi: true,
  },
  {
    id: 'baris-manco-evi', semtId: 'kadikoy', tur: 'muze', ad: 'Barış Manço Evi',
    lat: 40.9831, lon: 29.0295,
    kisa: 'Sanatçının Moda\'daki evi; müze olarak ziyarete açık.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'BME-26', kaynak: 'https://tr.wikipedia.org/wiki/Bar%C4%B1%C5%9F_Man%C3%A7o', dogrulandi: true,
  },
  {
    id: 'moda-sahili', semtId: 'kadikoy', tur: 'mekan', ad: 'Moda Sahili',
    lat: 40.9800, lon: 29.0260,
    kisa: 'Deniz kıyısında yürüyüş ve gün batımı noktası.',
    erisilebilirlik: { rampa: true, asansor: false, wc: true, basamak: false, zemin: 'duz', not: 'Sahil yolu düz; çevresindeki sokaklar eğimli.' },
    damgaKodu: 'MDS-27', kaynak: 'https://tr.wikipedia.org/wiki/Moda,_Kad%C4%B1k%C3%B6y', dogrulandi: true,
  },
  {
    id: 'atolye-seramik-moda', semtId: 'kadikoy', tur: 'atolye', zanaat: 'seramik', ad: 'Seramik Atölyesi (örnek kayıt)',
    lat: 40.9850, lon: 29.0280,
    kisa: 'Çark başında çömlek ve el şekillendirme; çağdaş tasarımcılarla zanaat buluşması.',
    deneyim: { sureDk: 120, kapasite: 8, fiyatAraligi: '₺₺' },
    erisilebilirlik: { rampa: true, asansor: false, wc: true, basamak: false, zemin: 'duz', not: 'Örnek kayıt.' },
    damgaKodu: 'SRM-28', kaynak: 'Örnek kayıt — gerçek atölye ile değiştirilecek', dogrulandi: false,
  },

  // ── Burgazada ───────────────────────────────────────────
  {
    id: 'sait-faik-muzesi', semtId: 'burgazada', tur: 'edebiyat', ad: 'Sait Faik Abasıyanık Müzesi',
    lat: 40.8813, lon: 29.0648,
    kisa: 'Öykücü Sait Faik\'in (1906–1954) Burgazada\'daki evi; yazarın eşyaları ve çalışma odası korunuyor.',
    erisilebilirlik: { rampa: false, asansor: false, wc: bilinmiyor, basamak: true, zemin: 'yokus', not: 'İskeleden yokuşla çıkılır.' },
    damgaKodu: 'SFM-29', kaynak: 'https://tr.wikipedia.org/wiki/Sait_Faik_Abas%C4%B1yan%C4%B1k', dogrulandi: true,
  },
  {
    id: 'aya-yani', semtId: 'burgazada', tur: 'miras', ad: 'Aya Yani Kilisesi',
    lat: 40.8806, lon: 29.0670,
    kisa: 'İskeleye yakın, adanın siluetini belirleyen kubbeli Rum Ortodoks kilisesi.',
    erisilebilirlik: { rampa: bilinmiyor, asansor: false, wc: false, basamak: true, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'AYN-30', kaynak: 'https://tr.wikipedia.org/wiki/Burgazada', dogrulandi: false,
  },
  {
    id: 'kalpazankaya', semtId: 'burgazada', tur: 'edebiyat', ad: 'Kalpazankaya',
    lat: 40.8730, lon: 29.0570,
    kisa: 'Sait Faik öykülerinde adı geçen, adanın batısındaki kayalık koy.',
    erisilebilirlik: { rampa: false, asansor: false, wc: false, basamak: false, zemin: 'yokus', not: 'Uzun ve eğimli yürüyüş; tekerlekli sandalyeye uygun değil.' },
    damgaKodu: 'KLP-31', kaynak: 'https://tr.wikipedia.org/wiki/Burgazada', dogrulandi: false,
  },
];

// detay: { metin, ipucu } — mekan sayfası ve yazdırma çıktısı için ayrıntılı açıklama
// Kaynak maddesi mekanın kendisini değil bir kişiyi ya da semtin tamamını anlatan kayıtlar:
// Wikipedia görsel yenilemesi bunlara görsel atamaz (wikimediaService.gorselBasligi).
const WIKI_GORSELI_UYGUN_DEGIL = new Set(['baris-manco-evi', 'sait-faik-muzesi', 'kadikoy-carsi', 'moda-sahili', 'aya-yani', 'kalpazankaya']);

export const mekanlar = [
  ...hamMekanlar.map((m) => ({
    ...m,
    detay: mekanDetaylari[m.id] || null,
    ...(WIKI_GORSELI_UYGUN_DEGIL.has(m.id) ? { gorselMaddesi: null } : {}),
    // Kapak görseli tohumda hazır gelir (canlıda "Fotoğrafları yenile"ye gerek kalmasın).
    ...(mekanGorselleri[m.id] ? { gorsel: mekanGorselleri[m.id] } : {}),
  })),
  // Vikipedi/Vikiveri'den demo semtlerindeki müzeler (scripts/muzeler.js).
  ...muzeler.map((m) => ({ ...m, detay: null, ...(mekanGorselleri[m.id] ? { gorsel: mekanGorselleri[m.id] } : {}) })),
];

export const zanaatlar = {
  ebru: 'Ebru',
  bakircilik: 'Bakırcılık',
  sedef: 'Sedef kakma',
  ahsap: 'Ahşap oyma',
  cini: 'Çini',
  hat: 'Hat sanatı',
  seramik: 'Seramik',
};
