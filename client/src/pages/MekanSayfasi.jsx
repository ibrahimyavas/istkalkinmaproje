import React, { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Users, ShieldAlert, ExternalLink, Stamp, MessageSquare } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import { DogrulanacakRozet, Etiket, ErisilebilirlikListesi } from '../components/common/Rozetler.jsx';
import { TalepFormu, BildirimFormu } from '../components/mekan/Formlar.jsx';
import SiirKarti from '../components/kultur/SiirKarti.jsx';
import EtkinlikKarti from '../components/kultur/EtkinlikKarti.jsx';
import Simge from '../components/common/Simge.jsx';
import { FotoEkleFormu } from '../components/foto/FotoAlanlari.jsx';
import YorumBolumu from '../components/mekan/Yorumlar.jsx';
import { MEKAN_TURU, ZANAAT, DURAK_TURU, mesafeYaz, yolTarifiUrl } from '../lib/harita.js';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));

const BILDIRIM_TURU = { erisilebilirlik: 'Erişilebilirlik', yorum: 'Yorum', hata: 'Düzeltme' };

export default function MekanSayfasi() {
  const { id } = useParams();
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.mekan(id), [id]);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  const { mekan: m, semt, siirler, etkinlikler, bildirimler, enYakinDurak, enYakinToplanma, fotograflar = [] } = veri;
  const kaynakLink = m.kaynak?.startsWith('http');

  return (
    <div className="mx-auto max-w-5xl px-4">
      <nav aria-label="Konum" className="pt-6 text-sm text-ink-muted">
        <Link to="/" className="hover:text-ink">Semtler</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/semt/${semt.id}`} className="hover:text-ink">{semt.ad}</Link> <span aria-hidden="true">/</span> {m.ad}
      </nav>

      <header className="py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Etiket>{m.tur === 'atolye' && m.zanaat ? `${ZANAAT[m.zanaat]} atölyesi` : MEKAN_TURU[m.tur]}</Etiket>
          <DogrulanacakRozet dogrulandi={m.dogrulandi} />
        </div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{m.ad}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{m.kisa}</p>
        <p className="mt-2 text-sm text-ink-muted">
          Kaynak:{' '}
          {kaynakLink ? (
            <a href={m.kaynak} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
              bağlantı <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : (
            m.kaynak
          )}
        </p>
      </header>

      {(m.gorsel?.url || m.detay) && (
        <div className="mb-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
          {m.gorsel?.url && (
            <figure className="m-0 overflow-hidden rounded-[20px] border border-hairline bg-surface shadow-xs">
              <img src={m.gorsel.url} alt={m.ad} className="aspect-[4/3] w-full object-cover" />
              <figcaption className="px-4 py-2 text-[11px] text-ink-faint">
                {m.gorsel.tur === 'wikimedia' ? (
                  <>
                    Fotoğraf: {m.gorsel.yazar} ·{' '}
                    {m.gorsel.lisansUrl ? <a href={m.gorsel.lisansUrl} target="_blank" rel="noreferrer">{m.gorsel.lisans}</a> : m.gorsel.lisans} ·{' '}
                    <a href={m.gorsel.kaynakUrl} target="_blank" rel="noreferrer">Wikimedia Commons</a>
                  </>
                ) : (
                  <>Fotoğraf: {m.gorsel.yazar || 'Ziyaretçi'} · {m.gorsel.lisans}</>
                )}
              </figcaption>
            </figure>
          )}
          {m.detay && (
            <section aria-labelledby="detay-baslik" className="panel">
              <h2 id="detay-baslik" className="baslik-nokta m-0 font-display text-xl font-semibold leading-7">Hikâyesi</h2>
              <p className="mb-0 mt-3 text-[15px] leading-[26px] text-ink">{m.detay.metin}</p>
              {m.detay.ipucu && (
                <p className="mb-0 mt-4 flex items-start gap-2 rounded-[10px] bg-surface-raised p-3 text-[13px] text-ink-muted">
                  <Simge ad="tips_and_updates" className="mt-0.5 text-accent" />{m.detay.ipucu}
                </p>
              )}
            </section>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="eris-baslik" className="kart p-5">
          <h2 id="eris-baslik" className="font-body text-lg font-bold">Erişilebilirlik</h2>
          <div className="mt-3"><ErisilebilirlikListesi e={m.erisilebilirlik} /></div>
        </section>

        <section aria-labelledby="ulasim-baslik" className="kart p-5">
          <h2 id="ulasim-baslik" className="font-body text-lg font-bold">Ulaşım ve güvenlik</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {enYakinDurak && (
              <div>
                <dt className="font-semibold">En yakın durak</dt>
                <dd className="text-ink-muted">
                  {enYakinDurak.ad} ({DURAK_TURU[enYakinDurak.tur]}) — {mesafeYaz(enYakinDurak.mesafeM)}
                  {enYakinDurak.asansor ? ' · asansörlü' : ''}
                </dd>
              </div>
            )}
            {enYakinToplanma && (
              <div>
                <dt className="flex items-center gap-1.5 font-semibold"><ShieldAlert size={14} className="text-success" aria-hidden="true" /> Deprem toplanma alanı</dt>
                <dd className="text-ink-muted">{enYakinToplanma.ad} — {mesafeYaz(enYakinToplanma.mesafeM)} <DogrulanacakRozet dogrulandi={enYakinToplanma.dogrulandi} /></dd>
              </div>
            )}
          </dl>
          <a href={yolTarifiUrl(null, m, 'transit')} target="_blank" rel="noreferrer" className="btn-ikincil mt-4">
            Toplu taşımayla yol tarifi <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>
      </div>

      <div className="mt-6">
        <Suspense fallback={<Yukleniyor metin="Harita yükleniyor…" />}>
          <HaritaGorunumu
            mekanlar={[m]}
            duraklar={enYakinDurak ? [enYakinDurak] : []}
            toplanma={enYakinToplanma ? [enYakinToplanma] : []}
            yukseklik="h-[300px]"
            etiket={`${m.ad} konumu`}
          />
        </Suspense>
      </div>

      {m.tur === 'atolye' && (
        <section aria-labelledby="talep-baslik" className="kart mt-6 p-5 sm:p-6">
          <h2 id="talep-baslik" className="text-2xl font-bold">Atölye deneyimi talep et</h2>
          {m.deneyim && (
            <p className="mt-2 flex flex-wrap gap-4 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5"><Clock size={14} aria-hidden="true" /> {m.deneyim.sureDk} dakika</span>
              <span className="flex items-center gap-1.5"><Users size={14} aria-hidden="true" /> En fazla {m.deneyim.kapasite} kişi</span>
              <span>Ücret: {m.deneyim.fiyatAraligi}</span>
            </p>
          )}
          {!m.dogrulandi && (
            <p className="mt-2 text-sm text-warning">Bu atölye örnek kayıttır; demo talepleri gerçek bir ustaya iletilmez.</p>
          )}
          <div className="mt-5"><TalepFormu mekan={m} /></div>
        </section>
      )}

      {siirler.length > 0 && (
        <section className="mt-6 grid gap-4" aria-label="Bu mekanla ilgili şiirler">
          {siirler.map((s) => <SiirKarti key={s.id} siir={s} semtId={semt.id} />)}
        </section>
      )}

      {etkinlikler.length > 0 && (
        <section aria-labelledby="m-etk" className="mt-10">
          <h2 id="m-etk" className="text-2xl font-bold">Etkinlikler</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{etkinlikler.map((e) => <EtkinlikKarti key={e.id} e={e} />)}</div>
        </section>
      )}

      <YorumBolumu mekan={m} />

      <section aria-labelledby="galeri-baslik" className="mt-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 id="galeri-baslik" className="m-0 font-display text-xl font-semibold leading-7">Ziyaretçi fotoğrafları</h2>
          {fotograflar.length === 0 ? (
            <p className="text-ink-faint">Henüz fotoğraf yok. İlk fotoğrafı siz ekleyin.</p>
          ) : (
            <ul className="mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
              {fotograflar.map((f) => (
                <li key={f.id}>
                  <figure className="m-0 overflow-hidden rounded-[14px] border border-hairline bg-surface">
                    <img src={f.url} alt={f.aciklama || `${m.ad} ziyaretçi fotoğrafı`} loading="lazy" className="aspect-square w-full object-cover" />
                    <figcaption className="px-2.5 py-1.5 text-[11px] text-ink-faint">{f.aciklama ? `${f.aciklama} · ` : ''}{f.ad || 'Ziyaretçi'}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h3 className="m-0 font-display text-base font-bold">Fotoğraf ekle</h3>
          <p className="mb-4 mt-1 text-[13px] text-ink-faint">Fotoğraflar incelendikten sonra yayınlanır. Konum bilgisi otomatik olarak silinir.</p>
          <FotoEkleFormu mekanId={m.id} />
        </div>
      </section>

      <section aria-labelledby="ziyaretci-baslik" className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 id="ziyaretci-baslik" className="flex items-center gap-2 text-2xl font-bold"><MessageSquare size={22} aria-hidden="true" /> Ziyaretçi bildirimleri</h2>
          {bildirimler.length === 0 ? (
            <p className="mt-3 text-ink-muted">Henüz onaylanmış bildirim yok.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {bildirimler.map((b) => (
                <li key={b.id} className="kart p-4">
                  <Etiket>{BILDIRIM_TURU[b.tur]}</Etiket>
                  <p className="mt-2">{b.metin}</p>
                  <p className="mt-1 text-xs text-ink-muted">{b.ad} · {new Date(b.tarih).toLocaleDateString('tr-TR')}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-raised p-4 text-sm">
            <Stamp size={18} className="shrink-0 text-accent" aria-hidden="true" />
            Bu mekandaki QR kodu okutarak semt pasaportunuza damga ekleyebilirsiniz.
          </p>
        </div>
        <div className="kart p-5">
          <h3 className="font-body text-lg font-bold">Bir şey mi fark ettiniz?</h3>
          <p className="mb-4 mt-1 text-sm text-ink-muted">Bildiriminiz incelendikten sonra yayınlanır.</p>
          <BildirimFormu mekan={m} />
        </div>
      </section>
    </div>
  );
}
