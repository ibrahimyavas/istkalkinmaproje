// Fotoğraf yükleme doğrulaması ve gizlilik temizliği.
//
// - Yalnızca JPEG kabul edilir (istemci her görseli tarayıcıda yeniden boyutlandırıp JPEG'e çevirir).
// - EXIF/XMP (APP1–APP15) ve yorum (COM) bölümleri silinir: GPS konumu, cihaz bilgisi ve
//   çekim tarihi dosyada kalmaz. Konum yalnızca kullanıcı açıkça paylaşırsa ayrı alanda tutulur.

export const AZAMI_BAYT = 1_500_000; // sıkıştırılmış JPEG için yeterli (istemci ~1600 px'e küçültür)

// İstanbul il sınırını kapsayan kutu (konum doğrulaması)
const ISTANBUL = { minLat: 40.79, maxLat: 41.6, minLon: 27.95, maxLon: 29.95 };

/** data:image/jpeg;base64,... → Buffer; geçersizse { hata } */
export function dataUrlCoz(dataUrl) {
  if (typeof dataUrl !== 'string') return { hata: 'Fotoğraf bulunamadı' };
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { hata: 'Yalnızca JPEG fotoğraf yüklenebilir' };
  const buffer = Buffer.from(m[1], 'base64');
  if (buffer.length > AZAMI_BAYT) return { hata: 'Fotoğraf çok büyük (en fazla 1,5 MB)' };
  if (buffer.length < 100 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return { hata: 'Dosya geçerli bir JPEG değil' };
  return { buffer };
}

/** JPEG'den APP1–APP15 ve COM bölümlerini çıkarır (görüntü verisine dokunmaz). */
export function jpegMetaVeriSil(buf) {
  const parcalar = [buf.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) break; // beklenmeyen yapı: kalanı olduğu gibi bırak
    const isaret = buf[i + 1];
    if (isaret === 0xda) {
      // SOS: buradan sonrası sıkıştırılmış görüntü verisi
      parcalar.push(buf.subarray(i));
      return Buffer.concat(parcalar);
    }
    const uzunluk = buf.readUInt16BE(i + 2);
    const son = i + 2 + uzunluk;
    if (son > buf.length) break;
    const sil = (isaret >= 0xe1 && isaret <= 0xef) || isaret === 0xfe;
    if (!sil) parcalar.push(buf.subarray(i, son));
    i = son;
  }
  parcalar.push(buf.subarray(i));
  return Buffer.concat(parcalar);
}

/** İsteğe bağlı konum: İstanbul içinde olmalı. Geçersizse null. */
export function konumCoz(k) {
  if (!k || typeof k !== 'object') return null;
  const lat = Number(k.lat);
  const lon = Number(k.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < ISTANBUL.minLat || lat > ISTANBUL.maxLat || lon < ISTANBUL.minLon || lon > ISTANBUL.maxLon) return null;
  const dogruluk = Number(k.dogruluk);
  return {
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
    dogrulukM: Number.isFinite(dogruluk) ? Math.round(dogruluk) : null,
  };
}

/** Herkese açık fotoğraf görünümü: konum ve iç alanlar çıkarılır. */
export function publicFoto(f) {
  return { id: f.id, mekanId: f.mekanId, aciklama: f.aciklama, ad: f.ad, tarih: f.tarih, url: `/api/fotograflar/${f.id}/dosya` };
}
