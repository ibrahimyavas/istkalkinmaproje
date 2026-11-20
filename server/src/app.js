import './env.js'; // ilk import olmalı: .env diğer modüllerden önce yüklensin
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import sosyalRoutes from './routes/sosyal.js';
import fotografRoutes from './routes/fotograf.js';
import uzmanRoutes from './routes/uzman.js';
import yorumRoutes from './routes/yorum.js';
import atlasRoutes from './routes/atlas.js';
import vapurRoutes from './routes/vapur.js';
import { arkaUc, hazirla } from './repositories/index.js';

const uretim = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

if (!process.env.SESSION_SECRET) {
  console.warn(
    uretim
      ? '[proje-404] SESSION_SECRET tanımlı değil: yönetim paneline giriş kapalı. Vercel ortam değişkenlerine ekleyin.'
      : '[proje-404] SESSION_SECRET tanımlı değil; geçici bir anahtar kullanılıyor (sunucu yeniden başlayınca admin oturumu düşer).',
  );
}
if (uretim && arkaUc !== 'postgres') {
  console.warn('[proje-404] DATABASE_URL tanımlı değil: kayıtlar bellekte tutuluyor ve sunucu örnekleri arasında paylaşılmıyor.');
}
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser(secret));
// Fotoğraf yükleme kendi gövde sınırını (3 MB) kullanır; genel 200 KB sınırı onu atlar.
const genelGovde = express.json({ limit: '200kb' });
app.use((req, res, next) => (req.method === 'POST' && req.path === '/api/fotograflar' ? next() : genelGovde(req, res, next)));

app.set('trust proxy', 1); // Vercel arkasında gerçek istemci IP'si (hız sınırı için)

// Veritabanı şeması ve tohum veri: her sunucu örneğinde ilk istekte bir kez.
app.use('/api', (req, res, next) => {
  hazirla().then(() => next(), (err) => {
    console.error('[proje-404] veritabanı hazırlanamadı:', err.message);
    res.status(503).json({ hata: 'Hizmet geçici olarak kullanılamıyor. Lütfen biraz sonra tekrar deneyin.' });
  });
});

app.use('/api/admin', adminRoutes);
app.use('/api/uzman', uzmanRoutes);
app.use('/api', fotografRoutes);
app.use('/api', yorumRoutes);
app.use('/api', atlasRoutes);
app.use('/api', vapurRoutes);
app.use('/api', sosyalRoutes);
app.use('/api', publicRoutes);

app.use('/api', (req, res) => res.status(404).json({ hata: 'Bulunamadı' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) console.error(err);
  res.status(err.status || 500).json({ hata: err.status ? err.message : 'Sunucu hatası' });
});

export default app;
