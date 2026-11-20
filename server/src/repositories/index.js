// Repository katmanı: routes/ ve services/ veriye yalnızca buradan erişir.
//
// DATABASE_URL tanımlıysa Postgres (pg.js), değilse bellek + yerel JSON dosyası (memory.js).
// İki arka uç aynı async arayüzü sağlar. Ortam değişkenleri env.js'te, bu dosyadan
// önce yüklenir (app.js'teki ilk import).
import '../env.js';

const arka = process.env.DATABASE_URL ? await import('./pg.js') : await import('./memory.js');

export const {
  arkaUc, hazirla, sifirla,
  semtRepo, mekanRepo, rotaRepo, durakRepo, toplanmaRepo, siirRepo, etkinlikRepo, dunBugunRepo,
  planRepo, grupRepo, grupMesajRepo, bildirimRepo, talepRepo, olayRepo, ayarRepo, hizRepo, fotoRepo, uzmanRepo, yorumRepo,
} = arka;
