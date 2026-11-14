// Bellek arka ucu (DATABASE_URL yokken): yerel demo ve testler. Postgres arka ucu
// (pg.js) aynı dışa aktarımları aynı imzalarla sağlar; seçim repositories/index.js'te.
import crypto from 'node:crypto';
import { getState, persist, resetState } from './store.js';

export const arkaUc = 'bellek';
export async function hazirla() {}
export async function sifirla() {
  resetState();
}

const newId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;

function matches(item, filter = {}) {
  return Object.entries(filter).every(([k, v]) => v === undefined || v === '' || item[k] === v);
}

/** CRUD destekli koleksiyon. `editable` false ise yalnızca okuma. */
function collection(name, { prefix = name, editable = true } = {}) {
  const items = () => getState()[name];
  const repo = {
    async list(filter) {
      return items().filter((i) => matches(i, filter));
    },
    async get(id) {
      return items().find((i) => i.id === id) || null;
    },
  };
  if (!editable) return repo;
  return {
    ...repo,
    async create(data) {
      const item = { ...data, id: data.id || newId(prefix) };
      if (items().some((i) => i.id === item.id)) throw Object.assign(new Error('Bu kimlik zaten var'), { status: 409 });
      items().push(item);
      persist();
      return item;
    },
    async update(id, patch) {
      const item = items().find((i) => i.id === id);
      if (!item) return null;
      Object.assign(item, patch, { id });
      persist();
      return item;
    },
    async remove(id) {
      const list = items();
      const idx = list.findIndex((i) => i.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      persist();
      return true;
    },
  };
}

export const semtRepo = collection('semtler', { editable: false });
export const yorumRepo = collection('yorumlar', { prefix: 'yorum' });
export const mekanRepo = {
  ...collection('mekanlar', { prefix: 'mekan' }),
  async getByDamgaKodu(kod) {
    const k = String(kod || '').trim().toUpperCase();
    return getState().mekanlar.find((m) => m.damgaKodu === k) || null;
  },
};
export const rotaRepo = collection('rotalar', { prefix: 'rota' });
export const durakRepo = collection('duraklar', { editable: false });
export const toplanmaRepo = collection('toplanma', { editable: false });
export const siirRepo = collection('siirler', { prefix: 'siir' });
export const etkinlikRepo = collection('etkinlikler', { prefix: 'etkinlik' });
export const dunBugunRepo = collection('dunBugun', { prefix: 'db' });

export const planRepo = {
  async create(veri) {
    const item = { ...veri, id: newId('plan'), olusturma: new Date().toISOString() };
    getState().planlar.push(item);
    persist();
    return item;
  },
  async get(id) {
    return getState().planlar.find((p) => p.id === id) || null;
  },
};

export const grupRepo = {
  ...collection('gruplar', { prefix: 'grup' }),
  async create(veri) {
    const item = { ...veri, id: newId('grup'), durum: 'aktif', katilimcilar: [], olusturma: new Date().toISOString() };
    getState().gruplar.push(item);
    persist();
    return item;
  },
  /** `kontrol(grup)` bir hata metni dönerse katılım eklenmez ve 409 fırlatılır. */
  async katilimEkle(id, katilim, kontrol = () => null) {
    const g = getState().gruplar.find((x) => x.id === id);
    if (!g) return null;
    const engel = kontrol(g);
    if (engel) throw Object.assign(new Error(engel), { status: 409 });
    const k ={ ...katilim, id: newId('katilim'), tarih: new Date().toISOString() };
    g.katilimcilar.push(k);
    persist();
    return k;
  },
  async katilimSil(id, katilimId) {
    const g = getState().gruplar.find((x) => x.id === id);
    if (!g) return false;
    const once = g.katilimcilar.length;
    g.katilimcilar = g.katilimcilar.filter((k) => k.id !== katilimId);
    persist();
    return g.katilimcilar.length < once;
  },
};

export const bildirimRepo = {
  ...collection('bildirimler', { prefix: 'bildirim' }),
  async create(data) {
    const item = { ...data, id: newId('bildirim'), durum: 'bekliyor', tarih: new Date().toISOString() };
    getState().bildirimler.push(item);
    persist();
    return item;
  },
};

export const talepRepo = {
  ...collection('talepler', { prefix: 'talep' }),
  async create(data) {
    const item = { ...data, id: newId('talep'), durum: 'yeni', tarih: new Date().toISOString() };
    getState().talepler.push(item);
    persist();
    return item;
  },
};

export const olayRepo = {
  async record(tip, veri = {}) {
    const item = { tip, ...veri, tarih: new Date().toISOString() };
    getState().olaylar.push(item);
    persist();
    return item;
  },
  async list() {
    return getState().olaylar;
  },
};

export const fotoRepo = {
  ...collection('fotograflar', { prefix: 'foto' }),
  async create(meta, { mime, buffer }) {
    const s = getState();
    const item = { ...meta, id: newId('foto'), boyut: buffer.length, tarih: new Date().toISOString() };
    s.fotograflar.push(item);
    s.fotoDosyalari[item.id] = { mime, base64: buffer.toString('base64') };
    persist();
    return item;
  },
  async dosya(id) {
    const d = getState().fotoDosyalari[id];
    return d ? { mime: d.mime, buffer: Buffer.from(d.base64, 'base64') } : null;
  },
  async remove(id) {
    const s = getState();
    const idx = s.fotograflar.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    s.fotograflar.splice(idx, 1);
    delete s.fotoDosyalari[id];
    persist();
    return true;
  },
};

export const uzmanRepo = {
  ...collection('uzmanlar', { prefix: 'uzman' }),
  async create(veri) {
    const item = { ...veri, id: newId('uzman'), durum: 'basvuru', tarih: new Date().toISOString() };
    getState().uzmanlar.push(item);
    persist();
    return item;
  },
};

// İstek sınırı sayacı: penceredeki istek sayısını (bu istek dahil) döner.
const hizKayit = new Map();
export const hizRepo = {
  async sayacArtir(anahtar, pencereMs) {
    const simdi = Date.now();
    const list = (hizKayit.get(anahtar) || []).filter((t) => simdi - t < pencereMs);
    list.push(simdi);
    hizKayit.set(anahtar, list);
    return list.length;
  },
};

export const ayarRepo = {
  async get() {
    return getState().ayarlar;
  },
  async set(patch) {
    const s = getState();
    s.ayarlar = {
      ai: { ...s.ayarlar.ai, ...(patch.ai || {}) },
      here: { ...s.ayarlar.here, ...(patch.here || {}) },
    };
    persist();
    return s.ayarlar;
  },
};
