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
  // ── Klasik İstanbul turu: Eyüp, Beyoğlu ve Boğaz (Kasım 2026) ─────
  // Koordinatlar Vikiveri P625 ya da OSM; açıklamalar Vikipedi maddelerinden özetlendi, erişim bilgisi yok.
  // ── Eyüp–Haliç ─────────────────────────────
  {
    id: 'eyup-sultan-camii', semtId: 'eyup', tur: 'miras', ad: 'Eyüp Sultan Camii',
    lat: 41.04795, lon: 28.93379,
    kisa: 'Fatih Sultan Mehmed\'in 1458\'de Ebu Eyyub el-Ensari\'nin türbesinin yanında yaptırdığı cami; bugünkü yapı III. Selim döneminden.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Avlu düz; kalabalık günlerde yoğun. Yerinde doğrulanacak.' },
    damgaKodu: 'EYS-32', kaynak: 'https://tr.wikipedia.org/wiki/Eyüp_Sultan_Camii', dogrulandi: false, konumKaynagi: 'Vikiveri Q956677 (P625)',
  },
  {
    id: 'mihrisah-valide-sultan-kulliyesi', semtId: 'eyup', tur: 'miras', ad: 'Mihrişah Valide Sultan Külliyesi',
    lat: 41.04856, lon: 28.93469,
    kisa: 'III. Selim\'in annesi Mihrişah Valide Sultan\'ın 1790\'larda yaptırdığı külliye; türbe, sebil ve imaretten oluşur.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'MVS-33', kaynak: 'https://tr.wikipedia.org/wiki/Mihrişah_Valide_Sultan_Külliyesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q111940451 (P625)',
  },
  {
    id: 'zal-mahmud-pasa-camii', semtId: 'eyup', tur: 'miras', ad: 'Zal Mahmud Paşa Camii',
    lat: 41.04478, lon: 28.93582,
    kisa: 'Mimar Sinan\'ın eseri; yamaca farklı seviyelerde oturan iki avlusuyla tanınan 16. yüzyıl külliyesi.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: true, zemin: 'yokus', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'ZMP-34', kaynak: 'https://tr.wikipedia.org/wiki/Zal_Mahmud_Paşa_Camii', dogrulandi: false, konumKaynagi: 'Vikiveri Q1572457 (P625)',
  },
  {
    id: 'pierre-loti-tepesi', semtId: 'eyup', tur: 'mekan', ad: 'Pierre Loti Tepesi',
    lat: 41.05417, lon: 28.93583,
    kisa: 'Adını Fransız yazar Pierre Loti\'den alan tepe ve kahvehane; Haliç\'in en bilinen seyir noktası. Eyüp\'ten teleferikle de çıkılır.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'yokus', not: 'Mezarlık içinden dik bir yokuş; teleferik daha kolay. Yerinde doğrulanacak.' },
    damgaKodu: 'PLT-35', kaynak: 'https://tr.wikipedia.org/wiki/Pierre_Loti_Tepesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q6581129 (P625)',
  },
  {
    id: 'rahmi-koc-muzesi', semtId: 'eyup', tur: 'muze', ad: 'Rahmi M. Koç Müzesi',
    lat: 41.04227, lon: 28.94926,
    kisa: 'Hasköy\'deki tarihi Lengerhane binasında açılan ulaşım, sanayi ve iletişim tarihi müzesi.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'RMK-36', kaynak: 'https://tr.wikipedia.org/wiki/Rahmi_M._Koç_Müzesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q3404565 (P625)', resmiSite: 'https://www.rmk-museum.org.tr',
  },
  {
    id: 'santralistanbul', semtId: 'eyup', tur: 'muze', ad: 'santralistanbul',
    lat: 41.0665, lon: 28.9461,
    kisa: 'Osmanlı\'nın ilk büyük elektrik santrali Silahtarağa\'nın kültür ve eğitim kampüsüne dönüşmüş hâli; Enerji Müzesi burada.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'STR-37', kaynak: 'https://tr.wikipedia.org/wiki/Santralistanbul', dogrulandi: false, konumKaynagi: 'Vikiveri Q2797197 (P625)',
  },
  // ── Beyoğlu–Galata ─────────────────────────────
  {
    id: 'kamondo-merdivenleri', semtId: 'beyoglu', tur: 'miras', ad: 'Kamondo Merdivenleri',
    lat: 41.02397, lon: 28.97378,
    kisa: '19. yüzyılda Kamondo ailesinin yaptırdığı, Bankalar Caddesi\'ni Galata yokuşuna bağlayan kıvrımlı taş merdiven.',
    erisilebilirlik: { rampa: false, asansor: false, wc: null, basamak: true, zemin: 'merdiven', not: 'Yalnızca merdiven. Basamaksız çıkış için Karaköy\'den Tünel füniküleri kullanılabilir.' },
    damgaKodu: 'KMD-38', kaynak: 'https://tr.wikipedia.org/wiki/Kamondo_Merdivenleri', dogrulandi: false, konumKaynagi: 'Vikiveri Q6027749 (P625)',
  },
  {
    id: 'galata-kulesi', semtId: 'beyoglu', tur: 'miras', ad: 'Galata Kulesi',
    lat: 41.02563, lon: 28.97415,
    kisa: '1348\'de Cenevizliler tarafından yapılan taş kule; tepesinden Haliç, Boğaz ve Tarihi Yarımada görünür.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'arnavut', not: 'Çevresi yokuşlu ve Arnavut kaldırımlı. Kule içi erişim yerinde doğrulanacak.' },
    damgaKodu: 'GLT-39', kaynak: 'https://tr.wikipedia.org/wiki/Galata_Kulesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q91274 (P625)', resmiSite: 'https://muze.gov.tr/muze-detay?SectionId=GLT04&DistId=MRK',
  },
  {
    id: 'tunel-funikuler', semtId: 'beyoglu', tur: 'miras', ad: 'Tünel (Karaköy–Beyoğlu)',
    lat: 41.02286, lon: 28.97404,
    kisa: '1875\'ten beri Karaköy ile Beyoğlu arasında çalışan yeraltı füniküleri; dünyanın en eski yeraltı hatlarından biri.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'TNL-40', kaynak: 'https://tr.wikipedia.org/wiki/Tünel_(İstanbul)', dogrulandi: false, konumKaynagi: 'OpenStreetMap (yerel Photon)',
  },
  {
    id: 'galata-mevlevihanesi', semtId: 'beyoglu', tur: 'muze', ad: 'Galata Mevlevihanesi',
    lat: 41.02803, lon: 28.97512,
    kisa: '1491\'de kurulan, İstanbul\'un ilk mevlevihanesi; bugün Mevlevi kültürünü anlatan müze ve semahane.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: null, not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'GMV-41', kaynak: 'https://tr.wikipedia.org/wiki/Galata_Mevlevihanesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q6090478 (P625)', resmiSite: 'https://muze.gov.tr/muze-detay?sectionId=GLT01&distId=MRK',
  },
  {
    id: 'pera-muzesi', semtId: 'beyoglu', tur: 'muze', ad: 'Pera Müzesi',
    lat: 41.03181, lon: 28.97519,
    kisa: 'Suna ve İnan Kıraç Vakfı\'nın 2005\'te açtığı müze; Osman Hamdi Bey\'in Kaplumbağa Terbiyecisi bu koleksiyondadır.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'PRM-42', kaynak: 'https://tr.wikipedia.org/wiki/Pera_Müzesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q1662392 (P625)', resmiSite: 'https://www.peramuzesi.org.tr',
  },
  {
    id: 'masumiyet-muzesi', semtId: 'beyoglu', tur: 'edebiyat', ad: 'Masumiyet Müzesi',
    lat: 41.03087, lon: 28.9798,
    kisa: 'Orhan Pamuk\'un aynı adlı romanıyla birlikte tasarladığı, Çukurcuma\'daki müze.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'yokus', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'MSM-43', kaynak: 'https://tr.wikipedia.org/wiki/Masumiyet_Müzesi', dogrulandi: false, konumKaynagi: 'OpenStreetMap (yerel Photon)',
  },
  {
    id: 'cicek-pasaji', semtId: 'beyoglu', tur: 'carsi', ad: 'Çiçek Pasajı',
    lat: 41.03394, lon: 28.97792,
    kisa: '1876\'da Cité de Péra adıyla yapılan pasaj; bugün meyhane ve restoranlarıyla bilinir.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'CCP-44', kaynak: 'https://tr.wikipedia.org/wiki/Çiçek_Pasajı', dogrulandi: false, konumKaynagi: 'Vikiveri Q595289 (P625)',
  },
  {
    id: 'istiklal-caddesi', semtId: 'beyoglu', tur: 'mekan', ad: 'İstiklal Caddesi',
    lat: 41.03417, lon: 28.97889,
    kisa: 'Osmanlı döneminde Cadde-i Kebir diye anılan, Tünel\'den Taksim\'e uzanan yaya caddesi; nostaljik tramvay hâlâ çalışır.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: false, zemin: 'duz', not: 'Yaya caddesi düz ve geniş; kalabalık saatlerde ilerlemek zor.' },
    damgaKodu: 'IST-45', kaynak: 'https://tr.wikipedia.org/wiki/İstiklal_Caddesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q344348 (P625)',
  },
  {
    id: 'istanbul-modern', semtId: 'beyoglu', tur: 'muze', ad: 'İstanbul Modern',
    lat: 41.026, lon: 28.98294,
    kisa: '2004\'te kurulan modern ve çağdaş sanat müzesi; 2023\'ten beri Karaköy kıyısında Renzo Piano\'nun tasarladığı binada.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'IMD-46', kaynak: 'https://tr.wikipedia.org/wiki/İstanbul_Modern', dogrulandi: false, konumKaynagi: 'Vikiveri Q1463961 (P625)', resmiSite: 'https://www.istanbulmodern.org',
  },
  // ── Beşiktaş–Boğaz ─────────────────────────────
  {
    id: 'dolmabahce-sarayi', semtId: 'bogaz', tur: 'miras', ad: 'Dolmabahçe Sarayı',
    lat: 41.03944, lon: 29.00167,
    kisa: 'Sultan Abdülmecid\'in 1843–1856 arasında yaptırdığı saray; Atatürk 10 Kasım 1938\'de burada hayatını kaybetti.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'DLM-47', kaynak: 'https://tr.wikipedia.org/wiki/Dolmabahçe_Sarayı', dogrulandi: false, konumKaynagi: 'Vikiveri Q274141 (P625)', resmiSite: 'https://www.millisaraylar.gov.tr',
  },
  {
    id: 'deniz-muzesi', semtId: 'bogaz', tur: 'muze', ad: 'İstanbul Deniz Müzesi',
    lat: 41.04167, lon: 29.00556,
    kisa: 'Beşiktaş iskelesinin yanında; saltanat kayıkları ve Türk denizcilik tarihinden eserler.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'DNZ-48', kaynak: 'https://tr.wikipedia.org/wiki/İstanbul_Deniz_Müzesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q11787082 (P625)',
  },
  {
    id: 'ortakoy-camii', semtId: 'bogaz', tur: 'miras', ad: 'Ortaköy Camii (Büyük Mecidiye)',
    lat: 41.04733, lon: 29.02681,
    kisa: 'Sultan Abdülmecid\'in 1850\'lerde Nigoğos Balyan\'a yaptırdığı, köprünün dibinde kıyıya oturan cami.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'ORT-49', kaynak: 'https://tr.wikipedia.org/wiki/Büyük_Mecidiye_Camii', dogrulandi: false, konumKaynagi: 'Vikiveri Q176380 (P625)',
  },
  {
    id: 'bebek-sahili', semtId: 'bogaz', tur: 'mekan', ad: 'Bebek Sahili',
    lat: 41.07584, lon: 29.04379,
    kisa: 'Bebek koyu boyunca iskele ve parktan Rumelihisarı\'na uzanan sahil yürüyüşü.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: false, zemin: 'duz', not: 'Sahil yolu düz; kaldırım yer yer dar. Yerinde doğrulanacak.' },
    damgaKodu: 'BBK-50', kaynak: 'https://tr.wikipedia.org/wiki/Bebek,_Beşiktaş', dogrulandi: false, konumKaynagi: 'OpenStreetMap (yerel Photon)',
  },
  {
    id: 'rumelihisari', semtId: 'bogaz', tur: 'miras', ad: 'Rumelihisarı',
    lat: 41.08472, lon: 29.05611,
    kisa: 'Fatih Sultan Mehmed\'in 1452\'de, İstanbul\'un fethinden önce birkaç ayda yaptırdığı hisar; bugün müze.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: true, zemin: 'yokus', not: 'Hisar içi dik ve basamaklı. Yerinde doğrulanacak.' },
    damgaKodu: 'RMH-51', kaynak: 'https://tr.wikipedia.org/wiki/Rumeli_Hisarı', dogrulandi: false, konumKaynagi: 'Vikiveri Q90801 (P625)',
  },
  {
    id: 'sakip-sabanci-muzesi', semtId: 'bogaz', tur: 'muze', ad: 'Sakıp Sabancı Müzesi',
    lat: 41.09912, lon: 29.0537,
    kisa: 'Emirgan\'daki Atlı Köşk\'te; hat ve resim koleksiyonu ile büyük uluslararası sergileriyle bilinen müze.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'SSM-52', kaynak: 'https://tr.wikipedia.org/wiki/Sakıp_Sabancı_Müzesi', dogrulandi: false, konumKaynagi: 'Vikiveri Q3395851 (P625)', resmiSite: 'https://www.sakipsabancimuzesi.org',
  },
  // ── Kuzguncuk komşusu: Beylerbeyi ─────────────────────────────
  {
    id: 'beylerbeyi-sarayi', semtId: 'kuzguncuk', tur: 'miras', ad: 'Beylerbeyi Sarayı',
    lat: 41.0426, lon: 29.0399,
    kisa: 'Sultan Abdülaziz\'in 1861–1865 arasında yaptırdığı, Boğaz kıyısındaki yazlık saray.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: 'Yerinde doğrulanacak.' },
    damgaKodu: 'BYL-53', kaynak: 'https://tr.wikipedia.org/wiki/Beylerbeyi_Sarayı', dogrulandi: false, konumKaynagi: 'Vikiveri Q794349 (P625)', resmiSite: 'https://www.millisaraylar.gov.tr',
  },
];

// detay: { metin, ipucu } — mekan sayfası ve yazdırma çıktısı için ayrıntılı açıklama
// Kaynak maddesi mekanın kendisini değil bir kişiyi ya da semtin tamamını anlatan kayıtlar:
// Wikipedia görsel yenilemesi bunlara görsel atamaz (wikimediaService.gorselBasligi).
const WIKI_GORSELI_UYGUN_DEGIL = new Set(['baris-manco-evi', 'sait-faik-muzesi', 'kadikoy-carsi', 'moda-sahili', 'aya-yani', 'kalpazankaya', 'bebek-sahili']);

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
