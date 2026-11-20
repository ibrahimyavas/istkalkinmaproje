import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Accessibility, Clock, Footprints, Mountain, Volume2, Square, Ship, TrainFront, TramFront,
  ShieldAlert, ExternalLink, Info, AlertTriangle, Users, Printer,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useSpeech } from '../hooks/useSpeech.js';
import { useTercihler } from '../context/Tercihler.jsx';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import { DogrulanacakRozet } from '../components/common/Rozetler.jsx';
import SiirKarti from '../components/kultur/SiirKarti.jsx';
import RotaLinkleri from '../components/harita/RotaLinkleri.jsx';
import { mesafeYaz, yolTarifiUrl, ZORLUK, DURAK_TURU } from '../lib/harita.js';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));
const EgimProfili = lazy(() => import('../components/harita/EgimProfili.jsx'));

const DURAK_IKON = { vapur: Ship, marmaray: TrainFront, metro: TrainFront, tramvay: TramFront };

function Ozet({ ikon: Ikon, etiket, deger }) {
  return (
    <div className="kart flex items-center gap-3 p-4">
      <Ikon size={22} className="text-accent" aria-hidden="true" />
      <div>
        <p className="eyebrow">{etiket}</p>
        <p className="font-semibold">{deger}</p>
      </div>
    </div>
  );
}

export default function RotaSayfasi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { erisilebilir, setErisilebilir } = useTercihler();
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.rota(id, erisilebilir), [id, erisilebilir]);
  const { destek, oku, durdur, konusanId } = useSpeech();
  const sec = useCallback((mid) => navigate(`/mekan/${mid}`), [navigate]);

  // Harita verisi yalnızca rota değişince yeniden hesaplanır (sesli rehber
  // durumu değiştikçe haritanın yeniden ortalanmaması için).
  const harita = useMemo(() => {
    if (!veri) return null;
    const aktifler = veri.duraklar.filter((d) => !d.atlanabilir);
    const tekil = (list) => [...new Map(list.filter(Boolean).map((x) => [x.id, x])).values()];
    return {
      mekanlar: aktifler.map((d, i) => ({ ...d, sira: i + 1 })),
      toplanma: tekil(aktifler.map((d) => d.enYakinToplanma)),
      duraklar: tekil(aktifler.map((d) => d.enYakinDurak)),
    };
  }, [veri]);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;

  const { rota, semt, duraklar, siirler } = veri;
  const aktif = duraklar.filter((d) => !d.atlanabilir);
  const zorluk = ZORLUK[veri.zorluk] || ZORLUK.orta;

  const hepsiniOku = () => {
    if (konusanId) return durdur();
    oku(aktif.map((d) => ({ id: d.id, metin: `${d.sira}. durak, ${d.ad}. ${d.anlatim}` })));
    api.olay({ tip: 'sesli_rehber', semtId: semt.id, rotaId: rota.id });
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <nav aria-label="Konum" className="pt-6 text-sm text-ink-muted">
        <Link to="/" className="hover:text-ink">Semtler</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/semt/${semt.id}`} className="hover:text-ink">{semt.ad}</Link> <span aria-hidden="true">/</span> Rota
      </nav>

      <header className="py-8">
        <p className="eyebrow">{semt.ad}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{rota.ad}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{rota.ozet}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={erisilebilir}
            onClick={() => setErisilebilir(!erisilebilir)}
            className={erisilebilir ? 'btn-ana' : 'btn-ikincil'}
          >
            <Accessibility size={18} aria-hidden="true" />
            Erişilebilir mod {erisilebilir ? 'açık' : 'kapalı'}
          </button>
          <Link to={`/rota/${rota.id}/yazdir`} className="btn-ikincil">
            <Printer size={18} aria-hidden="true" /> Yazdır
          </Link>
          <Link to={`/gruplar/yeni?rotaId=${rota.id}`} className="btn-ikincil">
            <Users size={18} aria-hidden="true" /> Birlikte yürüyelim: grup aç
          </Link>
          {destek && (
            <button type="button" onClick={hepsiniOku} className="btn-ikincil" aria-pressed={Boolean(konusanId)}>
              {konusanId ? <Square size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
              {konusanId ? 'Sesli rehberi durdur' : 'Sesli rehberi başlat'}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Ozet ikon={Footprints} etiket="Yürüyüş" deger={`${mesafeYaz(veri.mesafeM)} · ${aktif.length} durak`} />
        <Ozet ikon={Clock} etiket="Tahmini süre" deger={`${veri.sureDk} dk yürüme`} />
        <Ozet ikon={Mountain} etiket="Zorluk" deger={`${zorluk.ad} — ${zorluk.aciklama}`} />
      </div>

      {aktif.length > 0 && (
        <div className="mt-4">
          <RotaLinkleri duraklar={aktif} baslik="Rotayı navigasyon uygulamasında aç" />
        </div>
      )}

      {veri.geometriKaynagi === 'yaklasik' && aktif.length >= 2 && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Haritadaki kesikli çizgi duraklar arası yaklaşık güzergâhtır; mesafe ve süre tahminidir.
        </p>
      )}
      {veri.geometriKaynagi === 'valhalla' && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Güzergâh, eğim ve merdiven bilgisi kendi rota sunucumuzda (Valhalla, OpenStreetMap verisi) hesaplandı
          {erisilebilir ? '; erişilebilir modda merdivenden ve yokuştan kaçınan yol seçildi' : ''}.
          {veri.merdivenM > 0 && ` Bu güzergâhta yaklaşık ${veri.merdivenM} m merdiven var.`}
        </p>
      )}
      {aktif.length < 2 && (
        <p role="note" className="mt-3 flex items-start gap-2 rounded-xl border-2 border-warning bg-warning/10 p-3 text-sm font-semibold text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Bu rota erişilebilir modda önerilmiyor: durakların çoğu dik yokuş ya da merdivenle ulaşılan yerlerde.
        </p>
      )}

      {veri.egimProfili && (
        <div className="mt-4">
          <Suspense fallback={null}>
            <EgimProfili profil={veri.egimProfili} ozet={veri.egimOzeti} merdivenM={veri.merdivenM} />
          </Suspense>
        </div>
      )}

      {erisilebilir && duraklar.some((d) => d.atlanabilir) && (
        <p role="note" className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-sm text-ink">
          <Accessibility size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          Erişilebilir modda merdivenli ya da dik yokuşlu {duraklar.filter((d) => d.atlanabilir).length} durak rotadan çıkarıldı. Bu durakları listede soluk olarak görebilirsiniz.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<Yukleniyor kutu metin="Harita yükleniyor…" yukseklik="h-[360px] lg:h-[520px]" />}>
            <HaritaGorunumu
              mekanlar={harita.mekanlar}
              toplanma={harita.toplanma}
              duraklar={harita.duraklar}
              rota={veri}
              numarali
              onSec={sec}
              yukseklik="h-[360px] lg:h-[520px]"
              etiket={`${rota.ad} rota haritası`}
            />
          </Suspense>
        </div>

        <ol className="relative space-y-4" aria-label="Rota durakları">
          {duraklar.map((d, i) => {
            const onceki = aktif[aktif.indexOf(d) - 1];
            const DIkon = DURAK_IKON[d.enYakinDurak?.tur] || TrainFront;
            return (
              <li key={d.id} className={clsx('kart p-5', d.atlanabilir && 'opacity-60', konusanId === d.id && 'border-accent ring-2 ring-accent/30')}>
                <div className="flex items-start gap-3">
                  <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold', d.atlanabilir ? 'bg-surface-raised text-ink-muted' : 'bg-accent text-accent-contrast')}>
                    {d.atlanabilir ? '–' : aktif.indexOf(d) + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/mekan/${d.id}`} className="font-display text-lg font-bold underline-offset-4 hover:underline">{d.ad}</Link>
                      <DogrulanacakRozet dogrulandi={d.dogrulandi} />
                    </div>
                    {d.atlanabilir && <p className="mt-1 text-sm font-semibold">Erişilebilir modda atlandı</p>}
                    <p className="mt-2">{d.anlatim}</p>

                    {d.engeller.length > 0 && (
                      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-warning">
                        <AlertTriangle size={14} aria-hidden="true" />
                        {d.engeller.join(' · ')}
                      </p>
                    )}

                    <dl className="mt-3 grid gap-1 text-sm text-ink-muted">
                      {d.enYakinDurak && (
                        <div className="flex items-center gap-2">
                          <DIkon size={14} aria-hidden="true" />
                          <dt className="sr-only">En yakın durak</dt>
                          <dd>
                            {d.enYakinDurak.ad} ({DURAK_TURU[d.enYakinDurak.tur]}) — {mesafeYaz(d.enYakinDurak.mesafeM)}
                            {d.enYakinDurak.asansor ? ' · asansörlü' : ''}
                          </dd>
                        </div>
                      )}
                      {d.enYakinToplanma && (
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={14} aria-hidden="true" />
                          <dt className="sr-only">En yakın deprem toplanma alanı</dt>
                          <dd>Toplanma alanı: {d.enYakinToplanma.ad} — {mesafeYaz(d.enYakinToplanma.mesafeM)}</dd>
                        </div>
                      )}
                    </dl>

                    {!d.atlanabilir && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {destek && (
                          <button
                            type="button"
                            className="btn-ikincil py-1.5 text-sm"
                            onClick={() => (konusanId === d.id ? durdur() : oku({ id: d.id, metin: `${d.ad}. ${d.anlatim}` }))}
                          >
                            {konusanId === d.id ? <Square size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
                            {konusanId === d.id ? 'Durdur' : 'Dinle'}
                          </button>
                        )}
                        <a
                          href={yolTarifiUrl(onceki, d, 'walking')}
                          target="_blank" rel="noreferrer"
                          className="btn-ikincil py-1.5 text-sm"
                        >
                          Yol tarifi <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {i === 0 && d.enYakinDurak && (
                  <a href={yolTarifiUrl(null, d, 'transit')} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent underline-offset-4 hover:underline">
                    Başlangıca toplu taşımayla git <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {siirler.length > 0 && (
        <section aria-labelledby="rota-siir" className="pt-12">
          <h2 id="rota-siir" className="text-2xl font-bold">Yolda okunacak</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {siirler.map((s) => <SiirKarti key={s.id} siir={s} semtId={semt.id} />)}
          </div>
        </section>
      )}
    </div>
  );
}
