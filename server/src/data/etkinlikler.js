// Etkinlik takvimi.
// - `ornek: true` kayıtlar ÖRNEKTİR (gerçek program değildir); arayüzde "Örnek etkinlik" etiketiyle görünür.
// - Gerçek kayıtlar (`gercek: true`): kurumların sitelerinden derlenen güncel sergiler (sergiler.js)
//   ve Kültür Yolu Festivali 2026 arşivi (festivalArsivi.js, `arsiv: true`). Kayıt/bilet kaynakta.
import { sergiler } from './sergiler.js';
import { festivalArsivi } from './festivalArsivi.js';

const ornekEtkinlikler = [
  { id: 'e1', baslik: 'Ebruya Giriş Atölyesi', tur: 'atolye', semtId: 'sultanahmet', mekanId: 'atolye-ebru-sultanahmet', baslangic: '2026-11-21T14:00:00+03:00', ucretsiz: false, erisilebilir: false, ornek: true },
  { id: 'e2', baslik: 'Çini Boyama: Lale Motifi', tur: 'atolye', semtId: 'uskudar', mekanId: 'atolye-cini-uskudar', baslangic: '2026-11-22T11:00:00+03:00', ucretsiz: false, erisilebilir: true, ornek: true },
  { id: 'e3', baslik: 'Balat Mahalle Yürüyüşü (sesli rehberli)', tur: 'yuruyus', semtId: 'balat', mekanId: 'bulgar-kilisesi', baslangic: '2026-11-23T10:30:00+03:00', ucretsiz: true, erisilebilir: false, ornek: true },
  { id: 'e4', baslik: 'Oda Müziği Konseri', tur: 'konser', semtId: 'kadikoy', mekanId: 'sureyya-operasi', baslangic: '2026-11-28T20:00:00+03:00', ucretsiz: false, erisilebilir: true, ornek: true },
  { id: 'e5', baslik: 'Sait Faik Okuma Günü', tur: 'edebiyat', semtId: 'burgazada', mekanId: 'sait-faik-muzesi', baslangic: '2026-11-29T13:00:00+03:00', ucretsiz: true, erisilebilir: false, ornek: true },
  { id: 'e6', baslik: 'Ahşap Restorasyon Sohbeti', tur: 'soylesi', semtId: 'kuzguncuk', mekanId: 'atolye-ahsap-kuzguncuk', baslangic: '2026-12-05T18:30:00+03:00', ucretsiz: true, erisilebilir: true, ornek: true },
  { id: 'e7', baslik: 'Seramik Çark Atölyesi', tur: 'atolye', semtId: 'kadikoy', mekanId: 'atolye-seramik-moda', baslangic: '2026-12-06T15:00:00+03:00', ucretsiz: false, erisilebilir: true, ornek: true },
];

export const etkinlikler = [...ornekEtkinlikler, ...sergiler, ...festivalArsivi];
