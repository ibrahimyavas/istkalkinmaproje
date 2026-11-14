import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import { simgeOf, turEtiketi, erisimOzeti, yakaEtiketi, SEMT_SIMGE } from '../lib/sunum.js';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));

const EASE = 'cubic-bezier(.16,1,.3,1)';
// Fotoğrafı olmayan mekanlar yalnızca yedek olarak kullanılır.
const ONE_CIKAN_YEDEK = ['atolye-ebru-sultanahmet', 'kuzguncuk-cami-kilise', 'sait-faik-muzesi', 'atolye-cini-uskudar'];

/** Öne çıkanlar: kapak fotoğrafı olan mekanlardan her semtten biri, en fazla 4; eksik kalırsa yedekler. */
function oneCikanlar(mekanlar, adet = 4) {
  const secilen = [];
  const semtler = new Set();
  for (const m of mekanlar) {
    if (secilen.length >= adet) break;
    if (m.gorsel?.url && !semtler.has(m.semtId)) {
      secilen.push(m);
      semtler.add(m.semtId);
    }
  }
  for (const id of ONE_CIKAN_YEDEK) {
    if (secilen.length >= adet) break;
    const m = mekanlar.find((x) => x.id === id);
    if (m && !secilen.includes(m)) secilen.push(m);
  }
  return secilen;
}
const HERO_SEMT = ['sultanahmet', 'balat', 'kadikoy', 'uskudar'];
// Haftanın rotası: rota uç noktası her çağrıda görüntüleme olayı kaydettiği için burada
// rota adı listeden, duraklar mekan verisinden okunur.
const HAFTANIN_ROTASI = { id: 'uskudar-sinan', duraklar: ['kiz-kulesi', 'mihrimah-iskele', 'atik-valide'] };
const KATMANLAR = [['mekan', 'Mekanlar'], ['atolye', 'Atölyeler'], ['durak', 'Duraklar'], ['toplanma', 'Toplanma alanları']];

/** Başlıktaki kelime kelime yükselen animasyon. */
function Kelime({ children, gecikme }) {
  return (
    <span className="inline-block overflow-hidden pb-[.08em] align-top" style={{ marginBottom: '-.08em' }}>
      <span className="inline-block" style={{ animation: `word-up 640ms ${EASE} ${gecikme}ms both` }}>{children}</span>
    </span>
  );
}

function Yukselen({ gecikme = 0, sure = 520, className, children, as: Tag = 'div' }) {
  return <Tag className={className} style={{ animation: `rise ${sure}ms ${EASE} ${gecikme}ms both` }}>{children}</Tag>;
}

function Hero({ semtler, mekanlar, rota, toplamRota, toplamAtolye }) {
  const navigate = useNavigate();
  // Kayan demo kartı: haftanın rotasından fotoğraflı bir durak (yoksa fotoğraflı herhangi bir mekan).
  const demo = rota?.duraklar.find((m) => m.gorsel?.url) || mekanlar.find((m) => m.gorsel?.url) || mekanlar[0];
  const demoSemt = semtler.find((s) => s.id === demo?.semtId);
  const rotaDuraklari = rota ? rota.duraklar.slice(0, 3) : [];

  return (
    <section className="mb-8 flex flex-wrap overflow-hidden rounded-[20px] border border-hairline bg-surface shadow-xs" style={{ animation: `rise 600ms ${EASE} both` }}>
      <div className="flex min-w-0 flex-[7_1_460px] flex-col justify-between gap-8 p-6 sm:p-8">
        <div>
          <Yukselen gecikme={80} className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fill/[.08] px-2.5 py-1 text-[11px] font-semibold leading-4 text-heading">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-success" style={{ animation: 'ring 1.8s ease-out infinite' }} />
                <span className="relative h-2 w-2 rounded-full bg-success" />
              </span>
              {semtler.length} semt · {toplamRota} hikâye rotası · {toplamAtolye} atölye
            </span>
            <span className="text-[11px] font-semibold text-ink-faint">2026–2027 sezonu</span>
          </Yukselen>
          <h1 aria-label="İstanbul’u semt semt, durak durak keşfet" className="mb-3.5 font-display font-bold leading-[1.15] tracking-[-.9px] text-heading" style={{ fontSize: 'clamp(30px,3.8vw,46px)' }}>
            <span aria-hidden="true" className="block">
              <Kelime gecikme={180}>İstanbul’u</Kelime> <Kelime gecikme={250}>semt</Kelime> <Kelime gecikme={320}>semt,</Kelime>
            </span>
            <span aria-hidden="true" className="block">
              <Kelime gecikme={390}>durak</Kelime> <Kelime gecikme={460}>durak</Kelime>{' '}
              <span className="relative inline-block">
                <Kelime gecikme={530}>keşfet</Kelime>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0.5 h-1.5 origin-left rounded-full bg-accent opacity-85" style={{ animation: `draw 700ms ${EASE} 760ms both` }} />
              </span>
            </span>
          </h1>
          <Yukselen as="p" gecikme={560} className="mb-6 max-w-[640px] text-base leading-[26px] text-ink-muted [text-wrap:pretty]">
            Atölyeleri, hikâye rotalarını ve deprem toplanma alanlarını tek yerde gör. Beğendiğin yerleri sağa kaydır, yürüyüş rotanı biz çıkaralım.
          </Yukselen>
          <Yukselen gecikme={680} className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="mr-1 text-[11px] font-semibold text-ink-faint">Semtten başla:</span>
            {HERO_SEMT.map((id) => semtler.find((s) => s.id === id)).filter(Boolean).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/kesfet?semt=${s.id}`)}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-hairline bg-surface-raised px-3 font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md active:translate-y-0 active:scale-[.98]"
              >
                {s.ad.split('–')[0]}
                <Simge ad="arrow_forward" boyut={16} className="text-accent" />
              </button>
            ))}
          </Yukselen>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-hairline-subtle pt-4 text-xs font-medium">
          <Yukselen as="span" gecikme={820} sure={420} className="inline-flex items-center gap-1.5"><Simge ad="swipe" boyut={16} className="text-accent" />Kaydır, seç, rotan hazır</Yukselen>
          <Yukselen as="span" gecikme={900} sure={420} className="inline-flex items-center gap-1.5"><Simge ad="accessible" boyut={16} className="text-success" />Erişilebilir rota seçeneği</Yukselen>
          <Yukselen as="span" gecikme={980} sure={420} className="inline-flex items-center gap-1.5"><Simge ad="emergency" boyut={16} className="text-heading" />Her durakta toplanma alanı</Yukselen>
        </div>
      </div>

      <div className="relative min-h-[420px] min-w-0 flex-[5_1_340px] overflow-hidden bg-navy text-white">
        <div aria-hidden="true" className="absolute -left-[10%] -top-[10%] h-[120%] w-[120%]" style={{ background: 'radial-gradient(circle at 30% 30%,rgba(200,75,38,.38),transparent 45%),radial-gradient(circle at 75% 70%,rgba(27,135,85,.28),transparent 45%)', animation: 'glow-drift 14s ease-in-out infinite alternate' }} />
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />

        {demo && (
          <div aria-hidden="true" className="absolute left-1/2 top-7 -ml-[100px] h-[236px] w-[200px]" style={{ animation: 'float 5s ease-in-out infinite' }}>
            <div className="absolute inset-0 rounded-2xl border border-white/[.14] bg-white/[.12]" style={{ animation: `demo-under 4.6s ${EASE} infinite` }} />
            <div className="absolute inset-0 flex flex-col gap-2 rounded-2xl bg-white p-2.5 text-[#0F172A] shadow-[0_18px_40px_rgba(0,0,0,.35)]" style={{ animation: `demo-swipe 4.6s ${EASE} infinite` }}>
              <div className="relative grid flex-1 place-items-center overflow-hidden rounded-[10px] bg-[#0A2540] text-white/40">
                {demo.gorsel?.url ? <img src={demo.gorsel.url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <Simge ad={simgeOf(demo)} boyut={36} />}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.04em] text-[#C84B26]">{turEtiketi(demo)} · {demoSemt?.ad}</div>
                <div className="font-display text-sm font-bold leading-tight text-[#0A2540]">{demo.ad}</div>
              </div>
              <span className="absolute left-4 top-[18px] rounded-lg border-2 border-[#1B8755] bg-white px-2 py-0.5 font-display text-[15px] font-bold tracking-[.06em] text-[#1B8755]" style={{ animation: `demo-stamp 4.6s ${EASE} infinite` }}>GİDERİM</span>
            </div>
          </div>
        )}

        {rota && (
          <Link to={`/rota/${rota.id}`} className="absolute inset-0 flex flex-col justify-end p-5 text-white no-underline hover:text-white" style={{ background: 'linear-gradient(to top,rgba(10,37,64,.96) 0%,rgba(10,37,64,.7) 38%,transparent 62%)' }}>
            <Yukselen as="span" gecikme={500} className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#F08A68]">Haftanın rotası</Yukselen>
            <Yukselen as="h2" gecikme={580} className="mb-3.5 mt-0.5 font-display text-xl font-semibold leading-7 text-white">{rota.ad}</Yukselen>
            <Yukselen gecikme={680} className="relative">
              <span className="sr-only">Duraklar: {rotaDuraklari.map((d) => d?.ad).join(', ')}</span>
              <div aria-hidden="true" className="absolute inset-x-1.5 top-1.5 h-0.5 rounded-sm bg-white/[.18]" />
              <div aria-hidden="true" className="absolute inset-x-1.5 top-1.5 h-0.5 origin-left rounded-sm bg-[#F08A68]" style={{ animation: `route-fill 4.6s ${EASE} infinite` }} />
              <div aria-hidden="true" className="relative grid grid-cols-3 text-xs text-white/85">
                {rotaDuraklari.map((d, i) => (
                  <span key={d?.id || i} className={`grid gap-1.5 ${i === 0 ? 'justify-items-start' : i === 1 ? 'justify-items-center text-center' : 'justify-items-end text-right'}`}>
                    <span className="relative h-3.5 w-3.5">
                      <span className="absolute inset-0 rounded-full bg-[#F08A68]" style={{ animation: `ring 2.3s ease-out ${i * 0.8}s infinite` }} />
                      <span className="absolute inset-0 rounded-full bg-[#F08A68] shadow-[0_0_0_3px_#0A2540]" />
                    </span>
                    {d?.ad}
                  </span>
                ))}
              </div>
            </Yukselen>
          </Link>
        )}
      </div>
    </section>
  );
}

function OneCikanKart({ m, semt }) {
  const e = erisimOzeti(m.erisilebilirlik);
  return (
    <Link to={`/mekan/${m.id}`} className="flex flex-col rounded-[14px] border border-hairline bg-surface p-4 text-ink no-underline shadow-xs transition duration-200 hover:border-ink-faint hover:text-ink hover:shadow-md">
      <div className="relative mb-3 grid h-40 place-items-center overflow-hidden rounded-[10px] bg-navy text-white/35">
        {m.gorsel?.url ? <img src={m.gorsel.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <Simge ad={simgeOf(m)} boyut={40} />}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-[#0A2540]/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">{semt?.ad}</span>
        {!m.dogrulandi && <span className="absolute right-2.5 top-2.5 rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#0F172A]">Doğrulanacak</span>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 font-display text-base font-bold leading-6">{m.ad}</h3>
        <span className="whitespace-nowrap text-[11px] font-semibold text-ink-faint">{turEtiketi(m)}</span>
      </div>
      <p className="mt-1 line-clamp-3 flex-1 text-ink-faint">{m.kisa}</p>
      <div className={`mt-4 flex items-center gap-1 border-t border-hairline pt-3 text-[11px] font-semibold ${e.uyari ? 'text-accent' : 'text-success'}`}>
        <Simge ad={e.uyari ? 'warning' : 'accessible'} boyut={16} />{e.metin}
      </div>
    </Link>
  );
}

const ay = (iso) => new Date(iso).toLocaleString('tr-TR', { month: 'short', timeZone: 'Europe/Istanbul' }).replace('.', '');
const gun = (iso) => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', timeZone: 'Europe/Istanbul' });
const saat = (iso) => new Date(iso).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

export default function AnaSayfa() {
  const navigate = useNavigate();
  const semtler = useApi(() => api.semtler(), []);
  const harita = useApi(() => api.harita(), []);
  const rotalar = useApi(() => api.rotalar(), []);
  const etkinlikler = useApi(() => api.etkinlikler(), []);
  const [katmanlar, setKatmanlar] = useState(['mekan', 'atolye', 'durak', 'toplanma']);
  const sec = useCallback((id) => navigate(`/mekan/${id}`), [navigate]);

  const haritaVerisi = useMemo(() => {
    const h = harita.veri;
    if (!h) return null;
    return {
      mekanlar: h.mekanlar.filter((m) => (m.tur === 'atolye' ? katmanlar.includes('atolye') : katmanlar.includes('mekan'))),
      duraklar: katmanlar.includes('durak') ? h.duraklar : [],
      toplanma: katmanlar.includes('toplanma') ? h.toplanma : [],
    };
  }, [harita.veri, katmanlar]);

  if (semtler.yukleniyor || harita.yukleniyor) return <Yukleniyor />;
  if (semtler.hata) return <HataKutusu metin={semtler.hata} yenile={semtler.yenile} />;

  const mekanlar = harita.veri?.mekanlar || [];
  const semtOf = (id) => semtler.veri.find((s) => s.id === id);
  const rotaKaydi = (rotalar.veri || []).find((r) => r.id === HAFTANIN_ROTASI.id);
  const rota = rotaKaydi && { id: rotaKaydi.id, ad: rotaKaydi.ad, duraklar: HAFTANIN_ROTASI.duraklar.map((id) => mekanlar.find((m) => m.id === id)).filter(Boolean) };

  return (
    <div className="anim-page mx-auto w-full max-w-sayfa flex-1 px-4 py-8 sm:px-8">
      <Hero
        semtler={semtler.veri}
        mekanlar={mekanlar}
        rota={rota}
        toplamRota={(rotalar.veri || []).length}
        toplamAtolye={mekanlar.filter((m) => m.tur === 'atolye').length}
      />

      <section aria-labelledby="one-baslik" className="mb-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="one-baslik" className="m-0 font-display text-xl font-semibold leading-7">Öne çıkanlar</h2>
            <p className="m-0 text-ink-faint">Atölyeler, edebiyat durakları ve semtin hikâyeleri</p>
          </div>
          <Link to="/kesfet" className="flex min-h-[44px] items-center text-[13px] font-semibold text-accent">Tümünü keşfet →</Link>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
          {oneCikanlar(mekanlar).map((m) => (
            <OneCikanKart key={m.id} m={m} semt={semtOf(m.semtId)} />
          ))}
        </div>
      </section>

      <section id="semtler" aria-labelledby="semt-baslik" className="mb-12 scroll-mt-24">
        <div className="mb-4">
          <h2 id="semt-baslik" className="m-0 font-display text-xl font-semibold leading-7">Semtler</h2>
          <p className="m-0 text-ink-faint">Bir semt seç, desten o semtle başlasın</p>
        </div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
          {semtler.veri.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/kesfet?semt=${s.id}`)}
              className="flex items-center gap-3.5 rounded-[14px] border border-hairline bg-surface p-4 text-left shadow-xs transition hover:border-accent hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-fill text-on-fill"><Simge ad={SEMT_SIMGE[s.id] || 'location_city'} boyut={24} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[.06em] text-accent">{yakaEtiketi(s.yaka)}</span>
                <span className="block font-display text-lg font-bold leading-6 text-heading">{s.ad}</span>
                <span className="block text-[13px] text-ink-faint">{s.rotaSayisi} rota · {s.atolyeSayisi} atölye · {s.mekanSayisi} durak</span>
              </span>
              <Simge ad="chevron_right" boyut={20} className="text-ink-faint" />
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-8">
        <section aria-labelledby="harita-baslik" className="panel min-w-0 flex-[7_1_480px]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="harita-baslik" className="m-0 font-display text-xl font-semibold leading-7">Şehir haritası</h2>
            <span className="text-xs text-ink-faint">{katmanlar.length ? `${katmanlar.length} katman açık` : 'Tüm katmanlar kapalı'}</span>
          </div>
          <fieldset className="mb-3 min-w-0 border-0 p-0">
            <legend className="sr-only">Harita katmanları</legend>
            <div className="flex flex-wrap gap-2">
              {KATMANLAR.map(([k, ad]) => {
                const acik = katmanlar.includes(k);
                return (
                  <button key={k} type="button" aria-pressed={acik} onClick={() => setKatmanlar(acik ? katmanlar.filter((x) => x !== k) : [...katmanlar, k])} className={acik ? 'cip-acik' : 'cip-kapali'}>
                    {acik && <Simge ad="check" boyut={16} />}{ad}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {haritaVerisi && (
            <Suspense fallback={<Yukleniyor metin="Harita yükleniyor…" />}>
              <HaritaGorunumu {...haritaVerisi} onSec={sec} yukseklik="aspect-video min-h-[260px]" etiket="İstanbul genel haritası" gosterge={false} />
            </Suspense>
          )}
        </section>

        <section aria-labelledby="etk-baslik" className="panel min-w-0 flex-[5_1_320px]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="etk-baslik" className="baslik-nokta m-0 font-display text-xl font-semibold leading-7">Yaklaşan etkinlikler</h2>
            <Link to="/etkinlikler" className="text-[13px] font-semibold">Tümü</Link>
          </div>
          <ol className="m-0 grid list-none gap-3 p-0">
            {(etkinlikler.veri || []).slice(0, 4).map((e) => (
              <li key={e.id}>
                <Link to={`/etkinlik/${e.id}`} className="flex items-start gap-3.5 rounded-[14px] border border-hairline bg-surface-raised p-3.5 text-ink no-underline hover:text-ink">
                  <span className="w-[52px] shrink-0 rounded-[10px] border border-hairline bg-surface py-1.5 text-center">
                    <span className="block font-display text-xl font-bold leading-6 text-heading">{gun(e.baslangic)}</span>
                    <span className="block text-[10px] font-bold uppercase text-accent">{ay(e.baslangic)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15px] font-semibold leading-[22px] text-heading">{e.baslik}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                      <span>{semtOf(e.semtId)?.ad || e.konumAd} · {saat(e.baslangic)}</span>
                      <span className="rounded-md bg-success/10 px-2 py-px text-[11px] font-bold text-success">{e.ucret || (e.ucretsiz ? 'Ücretsiz' : 'Ücretli')}</span>
                      {e.ornek && <span className="text-[11px] font-semibold text-ink-faint">Örnek</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
