// Fotoğrafı tarayıcıda küçültüp JPEG'e çevirir. Tuvale yeniden çizildiği için dosyadaki
// EXIF bilgisi (GPS konumu, cihaz, tarih) cihazdan çıkmadan silinir; sunucu da ayrıca siler.
export const AZAMI_KENAR = 1600;
const AZAMI_BAYT = 1_400_000;

function resimYukle(dosya) {
  return new Promise((coz, reddet) => {
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); coz(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reddet(new Error('Görsel okunamadı. JPEG, PNG ya da HEIC dışı bir biçim olabilir.')); };
    img.src = url;
  });
}

/** File → { dataUrl, genislik, yukseklik } (JPEG, en uzun kenar ≤ 1600 px, ≤ ~1,4 MB) */
export async function fotoHazirla(dosya) {
  if (!dosya?.type?.startsWith('image/')) throw new Error('Lütfen bir fotoğraf seçin.');
  const img = await resimYukle(dosya);
  const oran = Math.min(1, AZAMI_KENAR / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * oran);
  const h = Math.round(img.naturalHeight * oran);
  const tuval = document.createElement('canvas');
  tuval.width = w;
  tuval.height = h;
  tuval.getContext('2d').drawImage(img, 0, 0, w, h);
  for (const kalite of [0.82, 0.7, 0.58]) {
    const dataUrl = tuval.toDataURL('image/jpeg', kalite);
    if (dataUrl.length * 0.75 <= AZAMI_BAYT) return { dataUrl, genislik: w, yukseklik: h };
  }
  throw new Error('Fotoğraf çok büyük; daha küçük bir fotoğraf deneyin.');
}

/** Tarayıcı konumu (kullanıcı izin verirse). → { lat, lon, dogruluk } */
export function konumAl() {
  return new Promise((coz, reddet) => {
    if (!navigator.geolocation) return reddet(new Error('Tarayıcınız konum paylaşımını desteklemiyor.'));
    navigator.geolocation.getCurrentPosition(
      (p) => coz({ lat: p.coords.latitude, lon: p.coords.longitude, dogruluk: p.coords.accuracy }),
      (e) => reddet(new Error(e.code === 1 ? 'Konum izni verilmedi.' : 'Konum alınamadı; biraz sonra tekrar deneyin.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
