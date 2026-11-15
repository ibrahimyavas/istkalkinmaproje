import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import { SEMT_SIMGE, yakaEtiketi } from '../lib/sunum.js';
import { ETKINLIK_TURU, tarihMetni, ucretMetni, yerMetni } from '../lib/etkinlik.js';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));

const EASE = 'cubic-bezier(.16,1,.3,1)';
const GUNLER = [1, 2, 3, 4, 5];
const YAKALAR = ['Avrupa', 'Anadolu', 'Adalar'];
const KAPAK_ID = 'ayasofya';
const KATMANLAR = [['mekan', 'Mekanlar'], ['atolye', 'Atölyeler'], ['durak', 'Duraklar'], ['toplanma', 'Toplanma alanları']];
const GUN_MS = 86400000;

/** Sayfadaki .acil parçalarını görünür olduklarında açar (bir kez). */
function useAcilis(hazir) {
  useEffect(() => {
    if (!hazir || typeof IntersectionObserver === 'undefined') return undefined;
    document.documentElement.classList.add('acilis-hazir');
    const gozcu = new IntersectionObserver((girdiler) => {
      for (const g of girdiler) {
        if (g.isIntersecting) {
          g.target.classList.add('gorundu');
          gozcu.unobserve(g.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.acil:not(.gorundu)').forEach((el) => gozcu.observe(el));
    return () => {
      gozcu.disconnect();
      document.documentElement.classList.remove('acilis-hazir');
    };
  }, [hazir]);
}

const acil = (sira = 0) => ({ className: 'acil', style: { '--gecikme': `${sira * 80}ms` } });

function Yukselen({ gecikme = 0, className, children, as: Tag = 'div' }) {
  return <Tag className={className} style={{ animation: `rise 560ms ${EASE} ${gecikme}ms both` }}>{children}</Tag>;
}

/** Commons görselinin kısa künyesi: yazar · lisans · kaynak. */
function Kunye({ g, className = '' }) {
  if (!g) return null;
  return (
    <span className={className}>
      Fotoğraf: {g.yazar} · {g.lisansUrl ? <a href={g.lisansUrl} target="_blank" rel="noreferrer" className="text-inherit underline">{g.lisans}</a> : g.lisans}
      {g.kaynakUrl && <> · <a href={g.kaynakUrl} target="_blank" rel="noreferrer" className="text-inherit underline">Commons</a></>}
    </span>
  );
}

// ── Kahraman: gün seçici, sihirbaza o gün sayısıyla gider ───────────────
function Hero({ kapak, semtSayisi, mekanSayisi }) {
  const navigate = useNavigate();
  const [gun, setGun] = useState(2);
  const saat = gun * 7;

  return (
    <section aria-labelledby="hero-baslik" className="grid items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col justify-center lg:col-span-6">
        <h1 id="hero-baslik" className="m-0 font-display font-bold leading-[.98] tracking-[-.035em] text-heading [text-wrap:balance]" style={{ fontSize: 'clamp(44px,6.4vw,96px)', animation: `rise 640ms ${EASE} 60ms both` }}>
          İstanbul’u gün gün gez
        </h1>
        <Yukselen as="p" gecikme={180} className="mb-0 mt-6 max-w-[40ch] text-lg leading-7 text-ink">
          {semtSayisi} semtteki {mekanSayisi} durağı kalacağın gün sayısına bölelim; aynı gün yaka değiştirmeden, yürüyerek.
        </Yukselen>

        <Yukselen gecikme={300} className="mt-9">
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-3 font-display text-lg font-semibold text-heading">Kaç günün var?</legend>
            <div className="flex flex-wrap gap-2" role="group">
              {GUNLER.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gun === g}
                  onClick={() => setGun(g)}
                  className={`h-14 w-14 rounded-full font-display text-xl font-bold transition duration-200 active:scale-95 ${gun === g ? 'bg-fill text-on-fill' : 'bg-heading/[.07] text-heading hover:bg-accent-soft'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mb-0 mt-4 text-base text-ink" aria-live="polite">
            {gun === 1 ? 'Tek gün: tek yakada yaklaşık 7 saat.' : `${gun} gün: günde yaklaşık 7 saat, toplam ${saat} saatlik plan.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" onClick={() => navigate(`/rota-sihirbazi?gun=${gun}`)} className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[.98]">
              {gun} günlük rotamı çıkar
              <Simge ad="arrow_forward" boyut={20} />
            </button>
            <Link to="/kesfet" className="inline-flex min-h-[44px] items-center text-base font-semibold text-heading underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
              Yerleri tek tek seç
            </Link>
          </div>
        </Yukselen>
      </div>

      <figure className="m-0 flex flex-col lg:col-span-6">
        <div className="relative min-h-[320px] flex-1 overflow-hidden bg-navy lg:min-h-[560px]">
          {kapak?.gorsel?.url && (
            <img src={kapak.gorsel.url} alt={`${kapak.ad}, Sultanahmet`} className="absolute inset-0 h-full w-full object-cover" style={{ animation: `yavas-yakin 2400ms ${EASE} both` }} />
          )}
        </div>
        <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-ink-faint">
          <Link to={`/mekan/${kapak?.id}`} className="font-semibold text-heading">{kapak?.ad}, Sultanahmet · ilk günün olası durağı</Link>
          <Kunye g={kapak?.gorsel} />
        </figcaption>
      </figure>
    </section>
  );
}

// ── Semtler, yakalarına göre ───────────────────────────────────────────
function SemtSatiri({ s, foto, sira }) {
  return (
    <li {...acil(sira)}>
      <Link to={`/kesfet?semt=${s.id}`} className="group grid grid-cols-[96px_1fr_auto] items-center gap-4 bg-surface p-3 text-ink no-underline transition-colors duration-200 hover:bg-accent-soft hover:text-ink sm:grid-cols-[128px_1fr_auto]">
        <span className="relative block aspect-[4/3] overflow-hidden bg-navy text-white/50">
          {foto?.gorsel?.url
            ? <img src={foto.gorsel.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <span className="absolute inset-0 grid place-items-center"><Simge ad={SEMT_SIMGE[s.id] || 'location_city'} boyut={32} /></span>}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-xl font-bold leading-7 text-heading">{s.ad}</span>
          <span className="block text-[15px] text-ink">{s.mekanSayisi} durak · {s.atolyeSayisi} atölye · {s.rotaSayisi} rota</span>
        </span>
        <Simge ad="arrow_forward" boyut={22} className="text-accent transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </li>
  );
}

function Yakalar({ semtler, mekanlar }) {
  const foto = (id) => mekanlar.find((m) => m.semtId === id && m.gorsel?.url && m.tur !== 'muze') || mekanlar.find((m) => m.semtId === id && m.gorsel?.url);
  return (
    <section id="semtler" aria-labelledby="semt-baslik" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-12">
        <h2 id="semt-baslik" {...acil()} className="acil m-0 font-display font-bold leading-[1.02] tracking-[-.03em] text-heading lg:col-span-5" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
          İki yaka, bir ada
        </h2>
        <p {...acil(1)} className="acil m-0 max-w-[52ch] self-end text-lg leading-7 text-ink lg:col-span-7">
          Rota sihirbazı bir günü tek yakada tutar; vapurla karşıya geçmek ertesi güne kalır. Bir semte dokun, keşfet destesi oradan başlasın.
        </p>
      </div>
      <div className="mt-10 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
        {YAKALAR.map((y) => {
          const liste = semtler.filter((s) => s.yaka === y);
          if (!liste.length) return null;
          return (
            <div key={y}>
              <h3 className="mb-3 mt-0 font-display text-lg font-semibold text-accent">{yakaEtiketi(y)}</h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {liste.map((s, i) => <SemtSatiri key={s.id} s={s} foto={foto(s.id)} sira={i} />)}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Müzeler: lacivert alan, fotoğraf şeridi ───────────────────────────
function Muzeler({ muzeler, semtOf }) {
  const fotolu = muzeler.filter((m) => m.gorsel?.url);
  return (
    <section aria-labelledby="muze-baslik" className="bg-navy py-20 text-white sm:py-28">
      <div className="mx-auto max-w-sayfa px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <h2 id="muze-baslik" {...acil()} className="acil m-0 font-display font-bold leading-[1.02] tracking-[-.03em] text-white lg:col-span-6" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            {muzeler.length} müze, yürüme mesafesinde
          </h2>
          <p {...acil(1)} className="acil m-0 max-w-[52ch] self-end text-lg leading-7 text-white/90 lg:col-span-6">
            Liste Vikipedi’den, konumlar Vikiveri’den geldi. Saat ve bilet için her müzenin kendi sitesine bağlantı var; erişim bilgisi yerinde doğrulanacak.
          </p>
        </div>
      </div>
      <ul className="m-0 mt-12 flex list-none snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:scroll-px-8 sm:px-8 kaydirma-koyu" aria-label="Müzeler">
        {fotolu.map((m, i) => (
          <li key={m.id} {...acil(Math.min(i, 5))} className="acil w-[260px] shrink-0 snap-start sm:w-[300px]">
            <Link to={`/mekan/${m.id}`} className="group block text-white no-underline hover:text-white">
              <span className="relative block aspect-[4/5] overflow-hidden bg-white/10">
                <img src={m.gorsel.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </span>
              <span className="mt-3 block font-display text-lg font-bold leading-6 group-hover:underline">{m.ad}</span>
              <span className="block text-[15px] text-white/80">{semtOf(m.semtId)?.ad}</span>
            </Link>
            <Kunye g={m.gorsel} className="mt-1 block text-xs text-white/60" />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Süren sergiler: bugüne göre kalan gün ─────────────────────────────
function kalanGun(e, simdi) {
  if (!e.bitis) return null;
  return Math.max(0, Math.ceil((new Date(e.bitis).getTime() - simdi) / GUN_MS));
}

function Sergiler({ sergiler }) {
  const simdi = Date.now();
  const sirali = sergiler
    .map((e) => ({ e, kalan: kalanGun(e, simdi) }))
    .sort((a, b) => (a.kalan ?? 1e9) - (b.kalan ?? 1e9));
  const bugun = new Date(simdi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'Europe/Istanbul' });

  return (
    <section aria-labelledby="sergi-baslik">
      <div className="grid gap-6 lg:grid-cols-12">
        <h2 id="sergi-baslik" {...acil()} className="acil m-0 font-display font-bold leading-[1.02] tracking-[-.03em] text-heading lg:col-span-5" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
          Kapanmadan yetiş
        </h2>
        <p {...acil(1)} className="acil m-0 max-w-[52ch] self-end text-lg leading-7 text-ink lg:col-span-7">
          Bugün, {bugun}, açık olan {sergiler.length} sergi; ilk kapanacak olan en üstte. Tarihler kurumların sitelerinden 14 Kasım’da derlendi.
        </p>
      </div>
      <ol className="m-0 mt-10 grid list-none gap-2 p-0">
        {sirali.map(({ e, kalan }, i) => (
          <li key={e.id} {...acil(Math.min(i, 6))}>
            <Link to={`/etkinlik/${e.id}`} className="group grid grid-cols-[88px_1fr] items-center gap-4 bg-surface px-4 py-4 text-ink no-underline transition-colors duration-200 hover:bg-accent-soft hover:text-ink sm:grid-cols-[140px_1fr_auto] sm:gap-6 sm:px-6">
              <span className="leading-none">
                <span className={`block font-display font-bold tracking-[-.03em] ${kalan != null && kalan <= 21 ? 'text-accent' : 'text-heading'}`} style={{ fontSize: kalan == null ? '22px' : 'clamp(36px,4vw,52px)' }}>
                  {kalan == null ? 'Süresiz' : kalan}
                </span>
                <span className="mt-1 block text-[13px] text-ink-muted">{kalan == null ? 'bitiş açıklanmadı' : 'gün kaldı'}</span>
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold leading-6 text-heading">{e.baslik}</span>
                <span className="mt-1 block text-[15px] text-ink">{yerMetni(e)} · {tarihMetni(e)}</span>
              </span>
              <span aria-hidden="true" className="hidden text-accent transition-transform duration-200 group-hover:translate-x-1 sm:block"><Simge ad="arrow_forward" boyut={22} /></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Harita ve yaklaşan etkinlikler ────────────────────────────────────
function HaritaVeTakvim({ harita, etkinlikler, semtOf, onSec }) {
  const [katmanlar, setKatmanlar] = useState(['mekan', 'atolye', 'durak', 'toplanma']);
  const veri = useMemo(() => {
    if (!harita) return null;
    return {
      mekanlar: harita.mekanlar.filter((m) => (m.tur === 'atolye' ? katmanlar.includes('atolye') : katmanlar.includes('mekan'))),
      duraklar: katmanlar.includes('durak') ? harita.duraklar : [],
      toplanma: katmanlar.includes('toplanma') ? harita.toplanma : [],
    };
  }, [harita, katmanlar]);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <section aria-labelledby="harita-baslik" className="min-w-0 lg:col-span-8">
        <h2 id="harita-baslik" {...acil()} className="acil mb-2 mt-0 font-display text-3xl font-bold tracking-[-.02em] text-heading">Şehir haritası</h2>
        <p {...acil(1)} className="acil mb-4 mt-0 text-base text-ink">Her durağın yanında en yakın deprem toplanma alanı da işaretli.</p>
        <fieldset className="mb-4 min-w-0 border-0 p-0">
          <legend className="sr-only">Harita katmanları</legend>
          <div className="flex flex-wrap gap-2">
            {KATMANLAR.map(([k, ad]) => {
              const acik = katmanlar.includes(k);
              return (
                <button key={k} type="button" aria-pressed={acik} onClick={() => setKatmanlar(acik ? katmanlar.filter((x) => x !== k) : [...katmanlar, k])} className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-4 text-sm font-semibold transition-colors duration-200 active:scale-[.98] ${acik ? 'bg-fill text-on-fill' : 'bg-heading/[.07] text-ink hover:bg-accent-soft'}`}>
                  {acik && <Simge ad="check" boyut={16} />}{ad}
                </button>
              );
            })}
          </div>
        </fieldset>
        {veri && (
          <Suspense fallback={<Yukleniyor kutu metin="Harita yükleniyor…" yukseklik="aspect-[4/3] sm:aspect-video min-h-[300px]" />}>
            <HaritaGorunumu {...veri} onSec={onSec} yukseklik="aspect-[4/3] sm:aspect-video min-h-[300px]" etiket="İstanbul genel haritası" gosterge={false} />
          </Suspense>
        )}
      </section>

      <section aria-labelledby="etk-baslik" className="min-w-0 lg:col-span-4">
        <h2 id="etk-baslik" {...acil()} className="acil mb-2 mt-0 font-display text-3xl font-bold tracking-[-.02em] text-heading">Yaklaşan etkinlikler</h2>
        <p {...acil(1)} className="acil mb-4 mt-0 text-base text-ink">Atölye, yürüyüş ve söyleşiler. <span className="font-semibold">Örnek</span> yazanlar demo verisidir.</p>
        <ol className="m-0 grid list-none gap-2 p-0">
          {etkinlikler.slice(0, 5).map((e, i) => (
            <li key={e.id} {...acil(i + 2)}>
              <Link to={`/etkinlik/${e.id}`} className="block bg-surface p-4 text-ink no-underline transition-colors duration-200 hover:bg-accent-soft hover:text-ink">
                <span className="block text-[13px] font-semibold text-accent">{ETKINLIK_TURU[e.tur] || 'Etkinlik'} · {tarihMetni(e)}</span>
                <span className="mt-1 block font-display text-base font-bold leading-6 text-heading">{e.baslik}</span>
                <span className="mt-1 block text-[14px] text-ink">
                  {semtOf(e.semtId)?.ad || yerMetni(e)} · {ucretMetni(e)}{e.ornek && ' · Örnek'}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link to="/etkinlikler" className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-heading underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
          Bütün takvim <Simge ad="arrow_forward" boyut={18} />
        </Link>
      </section>
    </div>
  );
}

export default function AnaSayfa() {
  const navigate = useNavigate();
  const semtler = useApi(() => api.semtler(), []);
  const harita = useApi(() => api.harita(), []);
  const etkinlikler = useApi(() => api.etkinlikler(), []);
  const sec = useCallback((id) => navigate(`/mekan/${id}`), [navigate]);
  const hazir = !semtler.yukleniyor && !harita.yukleniyor && !semtler.hata;
  useAcilis(hazir && !etkinlikler.yukleniyor);

  if (semtler.yukleniyor || harita.yukleniyor) return <Yukleniyor />;
  if (semtler.hata) return <HataKutusu metin={semtler.hata} yenile={semtler.yenile} />;

  const mekanlar = harita.veri?.mekanlar || [];
  const semtOf = (id) => semtler.veri.find((s) => s.id === id);
  const muzeler = mekanlar.filter((m) => m.tur === 'muze');
  const tumEtkinlikler = etkinlikler.veri || [];
  const sergiler = tumEtkinlikler.filter((e) => e.tur === 'sergi' && e.gercek);
  const digerleri = tumEtkinlikler.filter((e) => !(e.tur === 'sergi' && e.gercek));

  return (
    <div className="anim-page flex-1">
      <div className="mx-auto w-full max-w-sayfa px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
        <Hero
          kapak={mekanlar.find((m) => m.id === KAPAK_ID) || mekanlar.find((m) => m.gorsel?.url)}
          semtSayisi={semtler.veri.length}
          mekanSayisi={mekanlar.length}
        />
      </div>
      <div className="bg-surface-raised py-20 sm:py-28">
        <div className="mx-auto max-w-sayfa px-4 sm:px-8">
          <Yakalar semtler={semtler.veri} mekanlar={mekanlar} />
        </div>
      </div>
      {muzeler.length > 0 && <Muzeler muzeler={muzeler} semtOf={semtOf} />}
      {sergiler.length > 0 && (
        <div className="bg-surface-raised py-20 sm:py-28">
          <div className="mx-auto max-w-sayfa px-4 sm:px-8">
            <Sergiler sergiler={sergiler} />
          </div>
        </div>
      )}
      <div className="mx-auto max-w-sayfa px-4 py-20 sm:px-8 sm:py-28">
        <HaritaVeTakvim harita={harita.veri} etkinlikler={digerleri} semtOf={semtOf} onSec={sec} />
      </div>
    </div>
  );
}
