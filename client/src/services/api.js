import axios from 'axios';

const http = axios.create({ baseURL: '/api', timeout: 20000, withCredentials: true });

const data = (p) => p.then((r) => r.data);

/** Sunucunun Türkçe hata mesajını okunur hale getirir. */
export function hataMesaji(err) {
  return err?.response?.data?.hata || 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
}

export const api = {
  atlasOzet: () => data(http.get('/atlas/ozet')),
  atlasListe: (params) => data(http.get('/atlas/liste', { params })),
  atlasAra: (q) => data(http.get('/atlas/ara', { params: { q } })),
  muzikOner: (params) => data(http.get('/muzik/oner', { params })),
  vapurRotalari: () => data(http.get('/vapur/rotalar')),
  vapurRotasi: (id, yon = 'gidis') => data(http.get(`/vapur/rotalar/${id}`, { params: { yon } })),
  semtler: () => data(http.get('/semtler')),
  semt: (id) => data(http.get(`/semtler/${id}`)),
  harita: () => data(http.get('/harita')),
  mekanlar: (params) => data(http.get('/mekanlar', { params })),
  mekan: (id) => data(http.get(`/mekanlar/${id}`)),
  rota: (id, erisilebilir) => data(http.get(`/rotalar/${id}`, { params: { erisilebilir: erisilebilir ? 1 : 0 } })),
  rotalar: (params) => data(http.get('/rotalar', { params })),
  etkinlikler: (params) => data(http.get('/etkinlikler', { params })),
  damga: (kod) => data(http.post('/damga', { kod })),
  talep: (body) => data(http.post('/talepler', body)),
  bildirim: (body) => data(http.post('/bildirimler', body)),
  olay: (body) => http.post('/olay', body).catch(() => {}), // ölçüm hatası kullanıcıyı etkilemesin

  kesfet: ({ semtIdler = [], turler = [], erisilebilir = false } = {}) =>
    data(http.get('/kesfet', { params: { semtIdler: semtIdler.join(','), turler: turler.join(','), erisilebilir: erisilebilir ? 1 : 0 } })),
  kesfetOlay: (mekanId, karar) => http.post('/kesfet/olay', { mekanId, karar }).catch(() => {}),
  planOlustur: (body) => data(http.post('/plan', body)),
  planGunluk: (body) => data(http.post('/plan/gunluk', body, { timeout: 60000 })),
  plan: (id) => data(http.get(`/plan/${id}`)),

  gruplar: (params) => data(http.get('/gruplar', { params })),
  grup: (id) => data(http.get(`/gruplar/${id}`)),
  grupAc: (body) => data(http.post('/gruplar', body)),
  grubaKatil: (id, body) => data(http.post(`/gruplar/${id}/katil`, body)),
  gruptanAyril: (id, katilimId) => data(http.post(`/gruplar/${id}/ayril`, { katilimId })),
  grupYonetim: (id, anahtar) => data(http.get(`/gruplar/${id}/yonetim`, { headers: { 'X-Yonetim-Anahtari': anahtar } })),
  grupIptal: (id, anahtar) => data(http.post(`/gruplar/${id}/iptal`, {}, { headers: { 'X-Yonetim-Anahtari': anahtar } })),
  grupMesajlar: (id) => data(http.get(`/gruplar/${id}/mesajlar`)),
  grupMesajGonder: (id, body, anahtar) =>
    data(http.post(`/gruplar/${id}/mesajlar`, body, anahtar ? { headers: { 'X-Yonetim-Anahtari': anahtar } } : undefined)),

  yorumlar: (mekanId) => data(http.get(`/mekanlar/${mekanId}/yorumlar`)),
  yorumGonder: (mekanId, body) => data(http.post(`/mekanlar/${mekanId}/yorumlar`, body)),
  yorumSikayet: (id, neden) => data(http.post(`/yorumlar/${id}/sikayet`, { neden })),
  fotoYukle: (body) => data(http.post('/fotograflar', body, { timeout: 60000 })),
  rotaYazdir: (id, erisilebilir) => data(http.get(`/rotalar/${id}/yazdir`, { params: { erisilebilir: erisilebilir ? 1 : 0 } })),
  planYazdir: (id) => data(http.get(`/plan/${id}/yazdir`)),
  etkinlik: (id) => data(http.get(`/etkinlikler/${id}`)),

  uzman: {
    basvuru: (body) => data(http.post('/uzman/basvuru', body)),
    giris: (anahtar) => data(http.post('/uzman/giris', { anahtar })),
    cikis: () => data(http.post('/uzman/cikis')),
    oturum: () => data(http.get('/uzman/oturum')),
    ben: () => data(http.get('/uzman/ben')),
    etkinlikler: () => data(http.get('/uzman/etkinlikler')),
    etkinlikOlustur: (body) => data(http.post('/uzman/etkinlikler', body)),
    etkinlikGuncelle: (id, body) => data(http.put(`/uzman/etkinlikler/${id}`, body)),
    etkinlikIptal: (id) => data(http.post(`/uzman/etkinlikler/${id}/iptal`)),
    katilimlar: () => data(http.get('/uzman/katilimlar')),
  },

  admin: {
    fotograflar: (durum) => data(http.get('/admin/fotograflar', { params: { durum } })),
    fotoDurum: (id, durum) => data(http.patch(`/admin/fotograflar/${id}`, { durum })),
    fotoSil: (id) => data(http.delete(`/admin/fotograflar/${id}`)),
    yorumlar: (durum) => data(http.get('/admin/yorumlar', { params: { durum } })),
    yorumDurum: (id, durum) => data(http.patch(`/admin/yorumlar/${id}`, { durum })),
    yorumSil: (id) => data(http.delete(`/admin/yorumlar/${id}`)),
    fotoKapak: (id) => data(http.post(`/admin/fotograflar/${id}/kapak`)),
    fotolariYenile: () => data(http.post('/admin/fotograflar/yenile', {}, { timeout: 60000 })),
    uzmanlar: () => data(http.get('/admin/uzmanlar')),
    uzmanOnayla: (id) => data(http.post(`/admin/uzmanlar/${id}/onayla`)),
    uzmanDurum: (id, durum) => data(http.patch(`/admin/uzmanlar/${id}`, { durum })),
    oturum: () => data(http.get('/admin/oturum')),
    giris: (parola) => data(http.post('/admin/giris', { parola })),
    cikis: () => data(http.post('/admin/cikis')),
    gostergeler: () => data(http.get('/admin/gostergeler')),
    bildirimler: () => data(http.get('/admin/bildirimler')),
    bildirimDurum: (id, durum) => data(http.patch(`/admin/bildirimler/${id}`, { durum })),
    talepler: () => data(http.get('/admin/talepler')),
    talepDurum: (id, durum) => data(http.patch(`/admin/talepler/${id}`, { durum })),
    gruplar: () => data(http.get('/admin/gruplar')),
    grupDurum: (id, durum) => data(http.patch(`/admin/gruplar/${id}`, { durum })),
    ayarlar: () => data(http.get('/admin/ayarlar')),
    ayarKaydet: (body) => data(http.put('/admin/ayarlar', body)),
    liste: (k) => data(http.get(`/admin/${k}`)),
    olustur: (k, body) => data(http.post(`/admin/${k}`, body)),
    guncelle: (k, id, body) => data(http.put(`/admin/${k}/${id}`, body)),
    sil: (k, id) => data(http.delete(`/admin/${k}/${id}`)),
  },
};
