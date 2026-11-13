// Postgres arka ucu (Neon, Vercel Postgres ya da infra/docker-compose.yml'deki yerel Postgres).
//
// Şema: içerik ve kullanıcı kayıtları `kayitlar` tablosunda koleksiyon başına JSONB belge
// olarak tutulur. Bu, bellek arka ucuyla birebir aynı davranışı (ve admin panelindeki
// serbest JSON düzenlemeyi) korur. Raporlama gerektiren veriler ayrı tablolardadır.
//
// Tablolar ve tohum veri ilk istekte otomatik oluşturulur (hazirla). Tohum veri koddaki
// TOHUM_SURUMU değiştiğinde yeniden uygulanır; yalnızca EKSİK kayıtlar eklenir, admin
// panelinde yapılan düzenlemeler ezilmez.
import crypto from 'node:crypto';
import pg from 'pg';
import { seedState } from './store.js';

export const arkaUc = 'postgres';

// Kod içindeki tohum veri (data/*.js) değişince artırın.
export const TOHUM_SURUMU = '2026-11-14.3';

const KOLEKSIYONLAR = [
  'semtler', 'mekanlar', 'rotalar', 'duraklar', 'toplanma', 'siirler', 'etkinlikler',
  'dunBugun', 'gruplar', 'planlar', 'bildirimler', 'talepler', 'fotograflar', 'uzmanlar',
];

let havuz;
function pool() {
  if (!havuz) {
    havuz = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // Sunucusuz ortamda her örnek az bağlantı tutar (Neon'un havuzlu adresiyle kullanın).
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    havuz.on('error', (err) => console.error('[pg] havuz hatası:', err.message));
  }
  return havuz;
}

const q = (text, params) => pool().query(text, params);

async function islem(fn) {
  const c = await pool().connect();
  try {
    await c.query('BEGIN');
    const sonuc = await fn(c);
    await c.query('COMMIT');
    return sonuc;
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

const SEMA = `
  CREATE TABLE IF NOT EXISTS kayitlar (
    koleksiyon text NOT NULL,
    id text NOT NULL,
    veri jsonb NOT NULL,
    sira bigserial,
    PRIMARY KEY (koleksiyon, id)
  );
  CREATE INDEX IF NOT EXISTS kayitlar_sira_idx ON kayitlar (koleksiyon, sira);
  CREATE INDEX IF NOT EXISTS kayitlar_damga_idx ON kayitlar ((veri->>'damgaKodu')) WHERE koleksiyon = 'mekanlar';
  CREATE TABLE IF NOT EXISTS olaylar (
    id bigserial PRIMARY KEY,
    tip text NOT NULL,
    veri jsonb NOT NULL DEFAULT '{}',
    tarih timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS olaylar_tip_idx ON olaylar (tip, tarih);
  CREATE TABLE IF NOT EXISTS ayarlar (anahtar text PRIMARY KEY, deger jsonb NOT NULL);
  CREATE TABLE IF NOT EXISTS hiz_siniri (anahtar text NOT NULL, zaman timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS hiz_siniri_idx ON hiz_siniri (anahtar, zaman);
  CREATE TABLE IF NOT EXISTS meta (anahtar text PRIMARY KEY, deger text NOT NULL);
  CREATE TABLE IF NOT EXISTS foto_dosyalari (id text PRIMARY KEY, mime text NOT NULL, veri bytea NOT NULL);
`;

async function tohumla(c) {
  const s = seedState();
  for (const k of KOLEKSIYONLAR) {
    for (const item of s[k] || []) {
      // Kayıt varsa: koddaki yeni alanlar eklenir, kayıtlı (admin düzenlemesi) değerler korunur.
      await c.query(
        `INSERT INTO kayitlar (koleksiyon, id, veri) VALUES ($1, $2, $3)
         ON CONFLICT (koleksiyon, id) DO UPDATE SET veri = EXCLUDED.veri || kayitlar.veri`,
        [k, item.id, item],
      );
    }
  }
  await c.query('INSERT INTO ayarlar (anahtar, deger) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['genel', s.ayarlar]);
  await c.query(
    `INSERT INTO meta (anahtar, deger) VALUES ('tohum_surumu', $1)
     ON CONFLICT (anahtar) DO UPDATE SET deger = EXCLUDED.deger`,
    [TOHUM_SURUMU],
  );
}

let hazirSozu = null;
/** Şemayı ve tohum veriyi bir kez hazırlar (her sunucu örneğinde ilk istekte). */
export function hazirla() {
  if (!hazirSozu) {
    hazirSozu = islem(async (c) => {
      // Aynı anda açılan örnekler birbirini beklesin.
      await c.query('SELECT pg_advisory_xact_lock(404404)');
      await c.query(SEMA);
      const { rows } = await c.query("SELECT deger FROM meta WHERE anahtar = 'tohum_surumu'");
      if (rows[0]?.deger !== TOHUM_SURUMU) await tohumla(c);
    }).catch((err) => {
      hazirSozu = null; // bir sonraki istekte yeniden denensin
      throw err;
    });
  }
  return hazirSozu;
}

/** Testler için: bütün veriyi silip tohum veriyi yeniden yükler. */
export async function sifirla() {
  await hazirla();
  await islem(async (c) => {
    await c.query('TRUNCATE kayitlar, olaylar, ayarlar, hiz_siniri, meta, foto_dosyalari');
    await tohumla(c);
  });
}

const newId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
const matches = (item, filter = {}) =>
  Object.entries(filter).every(([k, v]) => v === undefined || v === '' || item[k] === v);
const cakisma = () => Object.assign(new Error('Bu kimlik zaten var'), { status: 409 });

async function ekle(k, item) {
  const { rowCount } = await q(
    'INSERT INTO kayitlar (koleksiyon, id, veri) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [k, item.id, item],
  );
  if (!rowCount) throw cakisma();
  return item;
}

function collection(k, { prefix = k, editable = true } = {}) {
  const repo = {
    async list(filter) {
      const { rows } = await q('SELECT veri FROM kayitlar WHERE koleksiyon = $1 ORDER BY sira', [k]);
      return rows.map((r) => r.veri).filter((i) => matches(i, filter));
    },
    async get(id) {
      const { rows } = await q('SELECT veri FROM kayitlar WHERE koleksiyon = $1 AND id = $2', [k, String(id ?? '')]);
      return rows[0]?.veri ?? null;
    },
  };
  if (!editable) return repo;
  return {
    ...repo,
    async create(data) {
      return ekle(k, { ...data, id: data.id || newId(prefix) });
    },
    async update(id, patch) {
      // Yüzeysel birleştirme (bellek arka ucundaki Object.assign ile aynı); id değişmez.
      const { rows } = await q(
        `UPDATE kayitlar SET veri = veri || $3::jsonb || jsonb_build_object('id', id)
         WHERE koleksiyon = $1 AND id = $2 RETURNING veri`,
        [k, id, JSON.stringify(patch ?? {})],
      );
      return rows[0]?.veri ?? null;
    },
    async remove(id) {
      const { rowCount } = await q('DELETE FROM kayitlar WHERE koleksiyon = $1 AND id = $2', [k, id]);
      return rowCount > 0;
    },
  };
}

export const semtRepo = collection('semtler', { editable: false });
export const mekanRepo = {
  ...collection('mekanlar', { prefix: 'mekan' }),
  async getByDamgaKodu(kod) {
    const { rows } = await q(
      "SELECT veri FROM kayitlar WHERE koleksiyon = 'mekanlar' AND veri->>'damgaKodu' = $1",
      [String(kod || '').trim().toUpperCase()],
    );
    return rows[0]?.veri ?? null;
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
    return ekle('planlar', { ...veri, id: newId('plan'), olusturma: new Date().toISOString() });
  },
  get: collection('planlar').get,
};

/** Grup satırını kilitleyip değiştirir (eşzamanlı katılımlarda kapasite aşılmasın). */
async function grupKilitle(id, fn) {
  return islem(async (c) => {
    const { rows } = await c.query(
      "SELECT veri FROM kayitlar WHERE koleksiyon = 'gruplar' AND id = $1 FOR UPDATE",
      [id],
    );
    if (!rows[0]) return null;
    const g = rows[0].veri;
    const sonuc = fn(g);
    await c.query("UPDATE kayitlar SET veri = $2 WHERE koleksiyon = 'gruplar' AND id = $1", [id, g]);
    return sonuc;
  });
}

export const grupRepo = {
  ...collection('gruplar', { prefix: 'grup' }),
  async create(veri) {
    return ekle('gruplar', { ...veri, id: newId('grup'), durum: 'aktif', katilimcilar: [], olusturma: new Date().toISOString() });
  },
  /** `kontrol(grup)` bir hata metni dönerse katılım eklenmez ve 409 fırlatılır. */
  async katilimEkle(id, katilim, kontrol = () => null) {
    return grupKilitle(id, (g) => {
      const engel = kontrol(g);
      if (engel) throw Object.assign(new Error(engel), { status: 409 });
      const k = { ...katilim, id: newId('katilim'), tarih: new Date().toISOString() };
      g.katilimcilar = [...(g.katilimcilar || []), k];
      return k;
    });
  },
  async katilimSil(id, katilimId) {
    const sonuc = await grupKilitle(id, (g) => {
      const once = g.katilimcilar.length;
      g.katilimcilar = g.katilimcilar.filter((k) => k.id !== katilimId);
      return g.katilimcilar.length < once;
    });
    return Boolean(sonuc);
  },
};

export const bildirimRepo = {
  ...collection('bildirimler', { prefix: 'bildirim' }),
  async create(data) {
    return ekle('bildirimler', { ...data, id: newId('bildirim'), durum: 'bekliyor', tarih: new Date().toISOString() });
  },
};

export const talepRepo = {
  ...collection('talepler', { prefix: 'talep' }),
  async create(data) {
    return ekle('talepler', { ...data, id: newId('talep'), durum: 'yeni', tarih: new Date().toISOString() });
  },
};

export const olayRepo = {
  async record(tip, veri = {}) {
    const { rows } = await q('INSERT INTO olaylar (tip, veri) VALUES ($1, $2) RETURNING tarih', [tip, veri]);
    return { tip, ...veri, tarih: rows[0].tarih.toISOString() };
  },
  async list() {
    const { rows } = await q('SELECT tip, veri, tarih FROM olaylar ORDER BY id');
    return rows.map((r) => ({ tip: r.tip, ...r.veri, tarih: r.tarih.toISOString() }));
  },
};

// Fotoğraflar: üst veri `kayitlar`da (koleksiyon 'fotograflar'), dosya `foto_dosyalari`nda.
export const fotoRepo = {
  ...collection('fotograflar', { prefix: 'foto' }),
  async create(meta, { mime, buffer }) {
    return islem(async (c) => {
      const item = { ...meta, id: newId('foto'), boyut: buffer.length, tarih: new Date().toISOString() };
      await c.query('INSERT INTO kayitlar (koleksiyon, id, veri) VALUES ($1, $2, $3)', ['fotograflar', item.id, item]);
      await c.query('INSERT INTO foto_dosyalari (id, mime, veri) VALUES ($1, $2, $3)', [item.id, mime, buffer]);
      return item;
    });
  },
  async dosya(id) {
    const { rows } = await q('SELECT mime, veri FROM foto_dosyalari WHERE id = $1', [id]);
    return rows[0] ? { mime: rows[0].mime, buffer: rows[0].veri } : null;
  },
  async remove(id) {
    return islem(async (c) => {
      await c.query('DELETE FROM foto_dosyalari WHERE id = $1', [id]);
      const { rowCount } = await c.query("DELETE FROM kayitlar WHERE koleksiyon = 'fotograflar' AND id = $1", [id]);
      return rowCount > 0;
    });
  },
};

export const uzmanRepo = {
  ...collection('uzmanlar', { prefix: 'uzman' }),
  async create(veri) {
    return ekle('uzmanlar', { ...veri, id: newId('uzman'), durum: 'basvuru', tarih: new Date().toISOString() });
  },
};

export const hizRepo = {
  async sayacArtir(anahtar, pencereMs) {
    const saniye = Math.ceil(pencereMs / 1000);
    return islem(async (c) => {
      await c.query("DELETE FROM hiz_siniri WHERE anahtar = $1 AND zaman < now() - make_interval(secs => $2)", [anahtar, saniye]);
      await c.query('INSERT INTO hiz_siniri (anahtar) VALUES ($1)', [anahtar]);
      const { rows } = await c.query('SELECT count(*)::int AS n FROM hiz_siniri WHERE anahtar = $1', [anahtar]);
      // Ara sıra bütün eski kayıtları temizle.
      if (Math.random() < 0.01) await c.query("DELETE FROM hiz_siniri WHERE zaman < now() - interval '1 day'");
      return rows[0].n;
    });
  },
};

export const ayarRepo = {
  async get() {
    const { rows } = await q("SELECT deger FROM ayarlar WHERE anahtar = 'genel'");
    return rows[0]?.deger ?? seedState().ayarlar;
  },
  async set(patch) {
    const mevcut = await ayarRepo.get();
    const yeni = {
      ai: { ...mevcut.ai, ...(patch.ai || {}) },
      here: { ...mevcut.here, ...(patch.here || {}) },
    };
    await q(
      `INSERT INTO ayarlar (anahtar, deger) VALUES ('genel', $1)
       ON CONFLICT (anahtar) DO UPDATE SET deger = EXCLUDED.deger`,
      [yeni],
    );
    return yeni;
  },
};
