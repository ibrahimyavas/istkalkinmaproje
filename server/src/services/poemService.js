// Şiirin arayüzde nasıl gösterileceğine karar verir (telif kuralı).
// Korumalı bir eserin `metin` alanı yanlışlıkla doldurulmuş olsa bile tam
// metin ASLA istemciye gönderilmez.

const ALINTI_AZAMI_SATIR = 2;

export function gosterimMetni(siir) {
  if (siir.telifDurumu === 'kamu-mali' && siir.metin) {
    return { tip: 'tam', metin: siir.metin };
  }
  if (siir.telifDurumu === 'korumali' && siir.alinti) {
    const kisa = String(siir.alinti).split('\n').slice(0, ALINTI_AZAMI_SATIR).join('\n');
    return { tip: 'alinti', metin: kisa };
  }
  return { tip: 'yok', metin: null };
}

/** İstemciye giden güvenli şiir nesnesi (`metin` ve `alinti` ham alanları çıkarılır). */
export function publicSiir(siir) {
  const { metin, alinti, ...rest } = siir;
  return { ...rest, gosterim: gosterimMetni(siir) };
}
