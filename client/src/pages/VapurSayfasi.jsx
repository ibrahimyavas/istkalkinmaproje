import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useSpeech } from '../hooks/useSpeech.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import MuzikOneriKarti from '../components/kultur/MuzikOneriKarti.jsx';
import { VAPUR_RENK } from '../lib/vapurRenkleri.js';

const VapurHaritasi = lazy(() => import('../components/harita/VapurHaritasi.jsx'));

const VARSAYILAN_HAT = 'uzun-bogaz';

export default function VapurSayfasi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const hatId = id || VARSAYILAN_HAT;
  const yon = params.get('yon') === 'donus' ? 'donus' : 'gidis';

  const rotalarReq = useApi(() => api.vapurRotalari(), []);
  const detayReq = useApi(() => api.vapurRotasi(hatId, yon), [hatId, yon]);
  const { destek, oku, durdur, konusanId } = useSpeech();

  const [filtre, setFiltre] = useState('hepsi'); // 'hepsi' | 'sol' | 'sag' | 'gezilebilir'
  const [aktifId, setAktifId] = useState(null);

  useEffect(() => {
    setAktifId(null);
    durdur();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hatId, yon]);

  const siluetler = useMemo(() => {
    const tum = detayReq.veri?.siluetler || [];
    if (filtre === 'sol') return tum.filter((s) => s.taraf === 'sol');
    if (filtre === 'sag') return tum.filter((s) => s.taraf === 'sag');
    if (filtre === 'gezilebilir') return tum.filter((s) => s.gezilebilir);
    return tum;
  }, [detayReq.veri, filtre]);

  const yonDegistir = (yeniYon) => {
    const next = new URLSearchParams(params);
    if (yeniYon === 'donus') next.set('yon', 'donus');
    else next.delete('yon');
    setParams(next, { preventScrollReset: true });
  };

  const hatSec = (yeniId) => {
    navigate(`/vapur/${yeniId}`);
  };

  const haritadanSec = (sid) => {
    setAktifId(sid);
    document.getElementById(`siluet-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const hepsiniDinle = () => {
    if (konusanId) return durdur();
    oku(
      siluetler.map((s) => ({
        id: s.id,
        metin: `${s.sira}. siluet, yaklaşık ${s.dk}. dakika, ${s.tarafEtiketi} tarafında: ${s.ad}. ${s.siluetIpucu} Geçmişte: ${s.gecmis}`,
      })),
    );
  };

  if (rotalarReq.yukleniyor && !rotalarReq.veri) return <Yukleniyor metin="Boğaz vapur rotaları yükleniyor…" />;
  if (rotalarReq.hata) return <HataKutusu metin={rotalarReq.hata} yenile={rotalarReq.yenile} />;

  const rotalar = rotalarReq.veri || [];
  const d = detayReq.veri;

  return (
    <div className="anim-page mx-auto w-full max-w-sayfa flex-1 px-4 py-8 sm:px-8">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Simge ad="directions_boat" boyut={16} /> Boğaz ve Haliç deniz rotaları
        </p>
        <h1 className="m-0 mt-2 font-display text-3xl font-bold tracking-[-.03em] text-heading sm:text-5xl">
          Vapurdan İstanbul silueti
        </h1>
        <p className="mb-0 mt-3 text-lg leading-7 text-ink-muted">
          Bineceğiniz vapuru ve yönü seçin; iskele ve sancak tarafında sırayla karşınıza çıkacak tarihî yapıları, geçmişte ne olarak kullanıldıklarını ve gezilebilir olanları adım adım takip edin.
        </p>
      </header>

      {/* 1. Vapur hattı seçimi (her vapur kendi başına bağımsız rota) */}
      <section aria-label="Vapur hattı seçin" className="mt-7">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rotalar.map((r) => {
            const secili = r.id === hatId;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={secili}
                onClick={() => hatSec(r.id)}
                className={`flex flex-col rounded-[16px] border p-4 text-left transition-colors ${
                  secili
                    ? 'border-accent bg-surface shadow-md ring-1 ring-accent/35'
                    : 'border-hairline bg-surface hover:border-accent/50 hover:bg-accent-soft'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
                      secili ? 'bg-accent text-white' : 'bg-heading/[.07] text-heading'
                    }`}
                  >
                    <Simge ad="directions_boat" boyut={20} />
                  </span>
                  <span className="rounded-full bg-heading/[.07] px-2.5 py-0.5 text-[11.5px] font-semibold text-heading">
                    ~{r.sureDk} dk
                  </span>
                </div>
                <span className="mt-3 font-display text-[16px] font-bold leading-snug text-heading">
                  {r.ad}
                </span>
                <span className="mt-0.5 text-[12.5px] font-medium text-accent">{r.altBaslik}</span>
                <span className="mt-2 text-[12px] text-ink-muted">
                  {r.siluetSayisi} siluet · {r.gezilebilirSayisi} gezilebilir
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {detayReq.hata && (
        <div className="mt-6">
          <HataKutusu metin={detayReq.hata} yenile={detayReq.yenile} />
        </div>
      )}

      {d && (
        <div className="mt-8 space-y-6">
          {/* 2. Seçili vapur rotası başlığı + Yön değiştirici (Gidiş ↔ Dönüş) */}
          <section className="panel border border-hairline">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-accent">
                  <span>{d.altBaslik}</span>
                  <span>·</span>
                  <span>{d.sureDk} dk</span>
                  <span>·</span>
                  <span>{d.mesafeKm} km</span>
                  <span>·</span>
                  <span>{d.siluetler.length} yapı</span>
                </div>
                <h2 className="m-0 mt-1 font-display text-2xl font-bold text-heading sm:text-3xl">
                  {d.ad}
                </h2>
                <p className="mb-0 mt-2 text-[15px] text-ink-muted">{d.ozet}</p>
              </div>

              {destek && (
                <button
                  type="button"
                  onClick={hepsiniDinle}
                  aria-pressed={Boolean(konusanId)}
                  className={konusanId ? 'btn-ana shrink-0' : 'btn-ikincil shrink-0'}
                >
                  <Simge ad={konusanId ? 'stop' : 'volume_up'} boyut={18} />
                  {konusanId ? 'Sesli rehberi durdur' : 'Güverte sesli rehberi'}
                </button>
              )}
            </div>

            {/* Yön seçimi: Gidiş vs Dönüş (sıralama ve Sol/Sağ otomatik döner) */}
            <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Vapur yönü">
              <span className="mr-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-faint">Yön:</span>
              <button
                type="button"
                aria-pressed={yon === 'gidis'}
                onClick={() => yonDegistir('gidis')}
                className={yon === 'gidis' ? 'cip-acik' : 'cip-kapali'}
              >
                <Simge ad="arrow_forward" boyut={16} /> {d.gidisAd}
              </button>
              <button
                type="button"
                aria-pressed={yon === 'donus'}
                onClick={() => yonDegistir('donus')}
                className={yon === 'donus' ? 'cip-acik' : 'cip-kapali'}
              >
                <Simge ad="swap_horiz" boyut={16} /> {d.donusAd}
              </button>
            </div>

            {/* İskele sırası */}
            <div className="mt-4 flex flex-wrap items-center gap-y-2 rounded-[14px] bg-surface-raised px-4 py-3 text-[13px]">
              <span className="mr-2 font-semibold text-heading">İskeleler:</span>
              {d.iskeleler.map((isk, idx) => (
                <React.Fragment key={isk.ad}>
                  {idx > 0 && <span className="mx-1.5 text-ink-faint" aria-hidden="true">→</span>}
                  <span className="inline-flex items-center gap-1 font-medium text-ink">
                    {isk.ad}
                    <span className="text-[11.5px] text-ink-faint">({isk.dk}. dk)</span>
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Güverte oturma ipucu */}
            <p className="mb-0 mt-3 flex items-start gap-2 text-[13.5px] text-ink-muted">
              <Simge ad="tips_and_updates" boyut={18} className="mt-0.5 shrink-0 text-accent" />
              <span>
                <strong className="text-heading">Güverte ipucu:</strong> {d.oturmaIpucu}
              </span>
            </p>
          </section>

          {/* 3. Harita + Kronolojik Siluet Akışı */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
              <Suspense fallback={<Yukleniyor kutu metin="Vapur haritası yükleniyor…" yukseklik="h-[420px]" />}>
                <VapurHaritasi
                  cizgi={d.cizgi}
                  iskeleler={d.iskeleler}
                  siluetler={siluetler}
                  aktifId={aktifId}
                  onSec={haritadanSec}
                  etiket={`${d.ad} (${d.yonAd}) haritası`}
                />
              </Suspense>

              {d.muzik && (
                <MuzikOneriKarti
                  muzik={d.muzik}
                  sorgu={{
                    ilce: d.id === 'halic-hatti' ? 'eyupsultan' : d.id === 'iki-yaka-siluet' ? 'uskudar' : 'besiktas',
                    bolgeAd: d.ad,
                  }}
                />
              )}
            </div>

            <section aria-label="Vapurdan görülen yapılar" className="lg:col-span-7">
              {/* Taraf / gezilebilir filtre çipleri */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Siluet filtresi">
                  {[
                    ['hepsi', `Tümü (${d.siluetler.length})`],
                    ['sol', `Sol · İskele (${d.siluetler.filter((s) => s.taraf === 'sol').length})`],
                    ['sag', `Sağ · Sancak (${d.siluetler.filter((s) => s.taraf === 'sag').length})`],
                    ['gezilebilir', `Gezilebilir (${d.gezilebilirSayisi})`],
                  ].map(([k, ad]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={filtre === k}
                      onClick={() => setFiltre(k)}
                      className={`inline-flex min-h-[34px] items-center rounded-full px-3 text-[12.5px] transition-colors ${
                        filtre === k
                          ? 'bg-fill font-semibold text-on-fill'
                          : 'bg-heading/[.07] font-medium text-ink hover:bg-accent-soft'
                      }`}
                    >
                      {ad}
                    </button>
                  ))}
                </div>
              </div>

              <ol className="m-0 grid list-none gap-3.5 p-0">
                {siluetler.map((s) => {
                  const secili = aktifId === s.id;
                  const solMu = s.taraf === 'sol';
                  const konusuyor = konusanId === s.id;
                  return (
                    <li key={`${yon}-${s.id}`} id={`siluet-${s.id}`}>
                      <article
                        onClick={() => setAktifId(s.id)}
                        className={`kart cursor-pointer border p-4 transition-colors sm:p-5 ${
                          secili ? 'border-accent ring-1 ring-accent/35' : 'border-hairline hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                              style={{ background: solMu ? VAPUR_RENK.sol : VAPUR_RENK.sag }}
                            >
                              {s.sira}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                                  style={{ background: solMu ? VAPUR_RENK.sol : VAPUR_RENK.sag }}
                                >
                                  {s.tarafEtiketi}
                                </span>
                                <span className="rounded-full bg-heading/[.07] px-2 py-0.5 text-[11px] font-semibold text-heading">
                                  ~{s.dk}. dk
                                </span>
                                <span className="text-[11.5px] text-ink-faint">
                                  {s.yaka} · {s.yapimYili}
                                </span>
                              </div>
                              <h3 className="m-0 mt-1.5 font-display text-lg font-bold leading-snug text-heading">
                                {s.ad}
                              </h3>
                            </div>
                          </div>

                          {s.gorsel?.url && (
                            <img
                              src={s.gorsel.url}
                              alt=""
                              loading="lazy"
                              className="hidden h-16 w-20 shrink-0 rounded-[10px] object-cover sm:block"
                            />
                          )}
                        </div>

                        <dl className="mb-0 mt-3.5 grid gap-2.5 text-[13.5px] leading-relaxed">
                          <div className="rounded-[10px] bg-surface-raised px-3 py-2">
                            <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-faint">
                              Bugün ne?
                            </dt>
                            <dd className="m-0 mt-0.5 text-ink">{s.bugun}</dd>
                          </div>
                          <div className="rounded-[10px] bg-surface-raised px-3 py-2">
                            <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-accent">
                              Geçmişte ne olarak kullanıldı?
                            </dt>
                            <dd className="m-0 mt-0.5 text-ink">{s.gecmis}</dd>
                          </div>
                          <div className="flex items-start gap-1.5 text-[13px] text-ink-muted">
                            <Simge ad="visibility" boyut={16} className="mt-0.5 shrink-0 text-ink-faint" />
                            <span>
                              <strong className="text-heading">Vapurdan nasıl tanırsın?</strong> {s.siluetIpucu}
                            </span>
                          </div>
                        </dl>

                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                          {s.gezilebilir && s.mekanId && (
                            <Link
                              to={`/mekan/${s.mekanId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-accent/12 px-3.5 text-[12.5px] font-semibold text-accent no-underline transition-colors hover:bg-accent hover:text-white"
                            >
                              <Simge ad="place" boyut={15} />
                              Gezilebilir mekan · Detaya git
                              <Simge ad="arrow_forward" boyut={14} />
                            </Link>
                          )}
                          {destek && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (konusuyor) return durdur();
                                oku([
                                  {
                                    id: s.id,
                                    metin: `${s.ad}. ${s.tarafEtiketi} tarafında. ${s.siluetIpucu} Geçmişte: ${s.gecmis}`,
                                  },
                                ]);
                              }}
                              className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-heading/[.07] px-3 text-[12px] font-semibold text-ink hover:bg-accent-soft hover:text-heading"
                            >
                              <Simge ad={konusuyor ? 'stop' : 'volume_up'} boyut={15} />
                              {konusuyor ? 'Durdur' : 'Dinle'}
                            </button>
                          )}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
