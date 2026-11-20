import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Route as RouteIcon, ShieldAlert, ChevronRight } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import { DogrulanacakRozet, Etiket } from '../components/common/Rozetler.jsx';
import MekanKarti from '../components/mekan/MekanKarti.jsx';
import SiirKarti from '../components/kultur/SiirKarti.jsx';
import MuzikOneriKarti from '../components/kultur/MuzikOneriKarti.jsx';
import DunBugun from '../components/kultur/DunBugun.jsx';
import EtkinlikKarti from '../components/kultur/EtkinlikKarti.jsx';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));

const ROTA_TURU = { hikaye: 'Hikâye rotası', zanaat: 'Zanaat rotası', edebiyat: 'Edebiyat rotası' };

const FILTRELER = [
  ['hepsi', 'Hepsi'],
  ['atolye', 'Atölyeler'],
  ['miras', 'Tarihi miras'],
  ['film-edebiyat', 'Dizi, film ve edebiyat'],
];

export default function SemtSayfasi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.semt(id), [id]);
  const [filtre, setFiltre] = useState('hepsi');
  const sec = useCallback((mid) => navigate(`/mekan/${mid}`), [navigate]);

  const mekanlar = useMemo(() => {
    if (!veri) return [];
    if (filtre === 'hepsi') return veri.mekanlar;
    if (filtre === 'film-edebiyat') return veri.mekanlar.filter((m) => m.tur === 'film' || m.tur === 'edebiyat');
    if (filtre === 'miras') return veri.mekanlar.filter((m) => ['miras', 'muze', 'carsi', 'sahne'].includes(m.tur));
    return veri.mekanlar.filter((m) => m.tur === filtre);
  }, [veri, filtre]);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  const { semt, rotalar, siirler, muzik, etkinlikler, dunBugun, toplanma } = veri;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <nav aria-label="Konum" className="pt-6 text-sm text-ink-muted">
        <Link to="/" className="hover:text-ink">Semtler</Link> <span aria-hidden="true">/</span> {semt.ad}
      </nav>

      <header className="py-8">
        <p className="eyebrow">{semt.yaka} yakası</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{semt.ad}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{semt.ozet}</p>
      </header>

      <section aria-labelledby="rotalar-baslik">
        <h2 id="rotalar-baslik" className="text-2xl font-bold">Rotalar</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {rotalar.map((r) => (
            <li key={r.id}>
              <Link to={`/rota/${r.id}`} className="kart group flex items-start gap-4 p-5 transition-colors">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-contrast">
                  <RouteIcon size={22} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <Etiket>{ROTA_TURU[r.tur] || r.tur}</Etiket>
                  <span className="mt-2 block font-display text-xl font-bold leading-snug">{r.ad}</span>
                  <span className="mt-1 block text-ink-muted">{r.ozet}</span>
                  <span className="mt-2 block text-xs text-ink-muted">{r.durakSayisi} durak · sesli anlatım</span>
                </span>
                <ChevronRight className="mt-4 text-ink-faint group-hover:text-accent" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mekanlar-baslik" className="pt-12">
        <h2 id="mekanlar-baslik" className="text-2xl font-bold">Mekanlar ve atölyeler</h2>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Mekan filtresi">
          {FILTRELER.map(([v, ad]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filtre === v}
              onClick={() => setFiltre(v)}
              className={filtre === v ? 'btn-ana' : 'btn-ikincil'}
            >
              {ad}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ul className="grid content-start gap-3">
            {mekanlar.map((m) => <li key={m.id}><MekanKarti m={m} /></li>)}
            {mekanlar.length === 0 && <li className="text-ink-muted">Bu filtrede kayıt yok.</li>}
          </ul>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Suspense fallback={<Yukleniyor kutu metin="Harita yükleniyor…" yukseklik="h-[420px]" />}>
              <HaritaGorunumu mekanlar={mekanlar} toplanma={toplanma} onSec={sec} etiket={`${semt.ad} haritası`} />
            </Suspense>
          </div>
        </div>
      </section>

      {muzik && (
        <div className="pt-10">
          <MuzikOneriKarti
            muzik={muzik}
            sorgu={{ semtId: semt.id, bolgeAd: semt.ad }}
          />
        </div>
      )}

      {siirler.length > 0 && (
        <section aria-labelledby="siir-baslik" className="pt-12">
          <h2 id="siir-baslik" className="text-2xl font-bold">Semtin şairleri</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {siirler.map((s) => <SiirKarti key={s.id} siir={s} semtId={semt.id} />)}
          </div>
        </section>
      )}

      {dunBugun.length > 0 && (
        <section aria-labelledby="db-baslik" className="pt-12">
          <h2 id="db-baslik" className="text-2xl font-bold">Dün ve bugün</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {dunBugun.map((c) => <DunBugun key={c.id} cift={c} />)}
          </div>
        </section>
      )}

      {etkinlikler.length > 0 && (
        <section aria-labelledby="etk-baslik" className="pt-12">
          <h2 id="etk-baslik" className="text-2xl font-bold">Bu semtte etkinlikler</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {etkinlikler.map((e) => <EtkinlikKarti key={e.id} e={e} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="guvenlik-baslik" className="pt-12">
        <div className="kart flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
          <ShieldAlert className="shrink-0 text-success" size={28} aria-hidden="true" />
          <div>
            <h2 id="guvenlik-baslik" className="font-body text-lg font-bold">Deprem toplanma alanları</h2>
            <ul className="mt-2 space-y-1">
              {toplanma.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2">
                  {t.ad} <DogrulanacakRozet dogrulandi={t.dogrulandi} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-ink-muted">Resmî ve güncel liste için e-Devlet "Acil Durum Toplanma Alanı Sorgulama" hizmetini kullanın.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
