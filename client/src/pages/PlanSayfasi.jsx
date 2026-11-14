import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import { DURAK_TURU, yolTarifiUrl } from '../lib/harita.js';
import { sureYaz, mesafeYazTr, saatYaz } from '../lib/sunum.js';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));

const BASLANGIC_DK = 9 * 60 + 30; // 09:30
const TOPLU_TASIMA_DK = 30;       // sunucudaki tahminle aynı
const UYARI = /Dik|Merdiven|basamak/;

/** Durakları saatli satırlara çevirir (tasarımdaki zaman çizelgesi). */
function satirlar(p) {
  let saat = BASLANGIC_DK;
  return p.duraklar.map((d, i) => {
    const satir = { ...d, saat: saatYaz(saat) };
    saat += d.ziyaretDk;
    const b = p.bacaklar[i];
    if (b) {
      if (b.tur === 'yurume') {
        const m = b.mesafeM ?? b.tahminiMesafeM;
        const dk = b.sureDk ?? Math.max(1, Math.round(m / 75));
        saat += dk;
        satir.bacak = { simge: 'directions_walk', metin: `Yürü ${mesafeYazTr(m)} · ${dk} dk`, toplu: false };
      } else {
        saat += TOPLU_TASIMA_DK;
        satir.bacak = b.yakaDegisir
          ? { simge: 'directions_boat', metin: 'Yaka değişiyor: vapur/Marmaray', toplu: true }
          : { simge: 'train', metin: 'Uzak: toplu taşıma önerilir', toplu: true };
      }
      satir.sonraki = p.duraklar[i + 1];
    }
    saat = Math.round(saat / 5) * 5;
    satir.uyari = d.engeller?.filter((x) => UYARI.test(x)) || [];
    return satir;
  });
}

export default function PlanSayfasi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { veri: p, yukleniyor, hata, yenile } = useApi(() => api.plan(id), [id]);
  const semtler = useApi(() => api.semtler(), []);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [gunIdx, setGunIdx] = useState(0);

  // Çok günlü planda ekrandaki her şey seçili günün verisinden gelir.
  const cokGunlu = Boolean(p?.gunler?.length);
  const g = cokGunlu ? p.gunler[Math.min(gunIdx, p.gunler.length - 1)] : p;

  const harita = useMemo(() => g && {
    mekanlar: g.duraklar,
    toplanma: [...new Map(g.duraklar.map((d) => d.enYakinToplanma).filter(Boolean).map((t) => [t.id, t])).values()],
  }, [g]);

  if (yukleniyor) return <Yukleniyor metin="Rota yükleniyor…" />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;

  const semtAd = (sid) => semtler.veri?.find((s) => s.id === sid)?.ad || sid;
  const planSemtler = [...new Set(p.duraklar.map((d) => semtAd(d.semtId)))].join(', ');
  const rows = satirlar(g);
  const rakamlar = [
    ['Yürüyüş mesafesi', mesafeYazTr(g.toplam.yurumeM)],
    ['Yürüme süresi', sureYaz(g.toplam.yurumeDk)],
    ['Ziyaret süresi', sureYaz(g.toplam.ziyaretDk)],
    ['Tahmini toplam', sureYaz(g.toplam.tahminiToplamDk)],
  ];
  const baslik = cokGunlu
    ? `${p.gunler.length} günlük rotan hazır`
    : `${p.duraklar.length} duraklı rotan hazır`;
  const altBaslik = cokGunlu
    ? `Şehir rotası · ${p.duraklar.length} durak · ${planSemtler}`
    : `Kişisel rota · ${planSemtler}`;
  const grupAc = () => navigate(`/gruplar/yeni?planId=${p.id}`);

  const paylas = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Proje 404 rotam', url });
      else {
        await navigator.clipboard.writeText(url);
        setKopyalandi(true);
        setTimeout(() => setKopyalandi(false), 2000);
      }
    } catch {
      /* kullanıcı vazgeçti */
    }
  };

  const ikonDugme = 'flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-transparent text-ink-faint hover:bg-surface-raised hover:text-heading';

  return (
    <div className="anim-page mx-auto w-full max-w-sayfa flex-1 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-start gap-8">
        <section className="flex min-w-0 flex-[5_1_420px] flex-col gap-6 rounded-[20px] border border-hairline bg-surface p-6 shadow-xs">
          <div className="flex items-start justify-between gap-3 border-b border-hairline pb-4">
            <div>
              <h1 className="baslik-nokta m-0 font-display text-xl font-semibold leading-7">{baslik}</h1>
              <p className="mb-0 mt-0.5 text-ink-faint">{altBaslik}</p>
            </div>
            <div className="flex gap-1.5">
              <button type="button" title={kopyalandi ? 'Bağlantı kopyalandı' : 'Paylaş'} aria-label={kopyalandi ? 'Bağlantı kopyalandı' : 'Paylaş'} onClick={paylas} className={ikonDugme}>
                <Simge ad={kopyalandi ? 'check' : 'share'} />
              </button>
              <button type="button" title="Yazdır" aria-label="Yazdır" onClick={() => navigate(`/plan/${p.id}/yazdir`)} className={ikonDugme}>
                <Simge ad="print" />
              </button>
              <button type="button" title={cokGunlu ? 'Yeni şehir rotası' : 'Seçimlerimi düzenle'} aria-label={cokGunlu ? 'Yeni şehir rotası' : 'Seçimlerimi düzenle'} onClick={() => navigate(cokGunlu ? '/rota-sihirbazi' : '/kesfet')} className={ikonDugme}>
                <Simge ad="edit" />
              </button>
            </div>
          </div>

          {cokGunlu && (
            <div role="tablist" aria-label="Günler" className="-mt-2 flex flex-wrap gap-2">
              {p.gunler.map((gun, i) => {
                const secili = gun === g;
                return (
                  <button
                    key={gun.gun}
                    type="button"
                    role="tab"
                    id={`gun-sekme-${gun.gun}`}
                    aria-selected={secili}
                    aria-controls="gun-paneli"
                    tabIndex={secili ? 0 : -1}
                    onClick={() => setGunIdx(i)}
                    onKeyDown={(e) => {
                      const yon = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                      if (!yon) return;
                      e.preventDefault();
                      const yeni = (i + yon + p.gunler.length) % p.gunler.length;
                      setGunIdx(yeni);
                      document.getElementById(`gun-sekme-${p.gunler[yeni].gun}`)?.focus();
                    }}
                    className={secili ? 'cip-acik flex-col !items-start !gap-0 py-1.5' : 'cip-kapali flex-col !items-start !gap-0 py-1.5'}
                  >
                    <span className="text-[13px] font-bold">{gun.gun}. gün</span>
                    <span className="text-[11px] font-medium opacity-80">{gun.semtIdler.map(semtAd).join(', ')}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div id="gun-paneli" role={cokGunlu ? 'tabpanel' : undefined} aria-labelledby={cokGunlu ? `gun-sekme-${g.gun}` : undefined} className="flex flex-col gap-6">
          <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-hairline-subtle bg-[rgb(var(--border-subtle))] text-center">
            {rakamlar.map(([etiket, deger]) => (
              <div key={etiket} className="bg-surface-raised p-3">
                <dt className="text-[11px] font-semibold text-ink-faint">{etiket}</dt>
                <dd className="m-0 font-display text-base font-bold leading-6 text-heading">{deger}</dd>
              </div>
            ))}
          </dl>
          <p className="-mt-3 mb-0 flex items-center gap-1.5 text-xs text-ink-faint">
            <Simge ad="info" boyut={16} />
            {g.geometriKaynagi === 'valhalla'
              ? `Yürüme yolları kendi rota sunucumuzda hesaplandı${p.erisilebilir ? '; merdiven ve yokuştan kaçınıldı' : ''}.`
              : 'Yaklaşık güzergâh: gerçek yürüme yolu daha uzun olabilir.'}
          </p>

          <ol aria-label="Duraklar" className="relative m-0 list-none p-0">
            {rows.map((s, i) => (
              <li key={s.id} className="relative">
                <div className="anim-page relative flex items-start gap-4" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
                  <span aria-hidden="true" className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-xs font-bold text-on-fill shadow-[0_0_0_4px_rgb(var(--surface))]">{s.sira}</span>
                  <div className="min-w-0 flex-1 rounded-[14px] border border-hairline bg-surface-raised p-3.5 transition-colors hover:border-ink-faint">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[.04em] text-accent">{s.saat} · {semtAd(s.semtId)}</span>
                      <span className="text-[11px] font-semibold text-ink-faint">{s.ziyaretDk} dk</span>
                    </div>
                    <h3 className="m-0 font-display text-base font-semibold leading-6">
                      <span className="sr-only">Durak {s.sira}: </span>
                      <Link to={`/mekan/${s.id}`} className="text-heading no-underline hover:underline">{s.ad}</Link>
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] font-semibold text-ink-faint">
                      {s.enYakinDurak && (
                        <span className="inline-flex items-center gap-1 text-heading">
                          <Simge ad="directions_transit" boyut={14} />{s.enYakinDurak.ad} ({DURAK_TURU[s.enYakinDurak.tur]})
                        </span>
                      )}
                      {s.enYakinToplanma && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Simge ad="emergency" boyut={14} />Toplanma: {s.enYakinToplanma.ad}
                        </span>
                      )}
                    </div>
                    {s.uyari.length > 0 && (
                      <p className="mb-0 mt-2 flex items-center gap-1 text-xs font-semibold text-accent">
                        <Simge ad="warning" boyut={16} />{s.uyari.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                {s.bacak && (
                  <div className="relative flex min-h-[44px] flex-wrap items-center gap-2 py-1.5 pl-[52px] text-xs text-ink-faint">
                    <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-0 w-0.5 bg-[rgb(var(--border))]" />
                    <Simge ad={s.bacak.simge} boyut={16} className={s.bacak.toplu ? 'text-heading' : 'text-success'} />
                    <span className={s.bacak.toplu ? 'font-semibold text-heading' : 'font-medium text-success'}>{s.bacak.metin}</span>
                    {s.bacak.toplu && (
                      <a href={yolTarifiUrl(s, s.sonraki, 'transit')} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-0.5 font-semibold text-accent">
                        Yol tarifi<Simge ad="open_in_new" boyut={14} />
                      </a>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          </div>

          {cokGunlu && p.disarida?.length > 0 && (
            <details className="rounded-[14px] border border-hairline-subtle bg-surface-raised px-4 py-3 text-[13px]">
              <summary className="min-h-[24px] cursor-pointer font-semibold text-heading">
                {p.disarida.length} yer {p.gunler.length} güne sığmadı
              </summary>
              <p className="mb-2 mt-2 text-xs text-ink-faint">Gün sayısını artırırsan bunlar da plana girer:</p>
              <ul className="m-0 flex flex-wrap gap-1.5 p-0">
                {p.disarida.map((m) => (
                  <li key={m.id} className="list-none">
                    <Link to={`/mekan/${m.id}`} className="inline-flex min-h-[32px] items-center rounded-full border border-hairline bg-surface px-3 text-xs font-medium text-ink no-underline hover:border-accent">{m.ad}</Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/kesfet')} className="inline-flex min-h-[44px] flex-[1_1_200px] items-center justify-center gap-2 rounded-lg border border-dashed border-heading/40 bg-transparent text-[13px] font-semibold text-heading hover:bg-fill/[.08]">
              <Simge ad="add_circle" />Başka yer ekle
            </button>
            <button type="button" onClick={grupAc} className="btn-koyu">
              <Simge ad="groups" />Grup aç
            </button>
          </div>
        </section>

        <section aria-label="Rota haritası" className="flex min-w-0 flex-[7_1_480px] flex-col gap-6 lg:sticky lg:top-24">
          <div className="panel">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 font-display text-xl font-semibold leading-7">Rota haritası</h2>
              <span className="flex flex-wrap gap-3 text-[11px] font-semibold text-ink-faint">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-fill" />Durak</span>
                <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3.5 bg-accent" />Yürüme</span>
                <span className="inline-flex items-center gap-1"><Simge ad="emergency" boyut={14} className="text-success" />Toplanma alanı</span>
              </span>
            </div>
            <Suspense fallback={<Yukleniyor metin="Harita yükleniyor…" />}>
              <HaritaGorunumu
                mekanlar={harita.mekanlar}
                toplanma={harita.toplanma}
                rota={g}
                numarali
                gosterge={false}
                yukseklik="h-[min(560px,calc(100vh-220px))] min-h-[340px]"
                etiket="Kişisel rota haritası"
              />
            </Suspense>
          </div>
          <div className="panel flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-[1_1_280px] items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-fill text-on-fill"><Simge ad="groups" boyut={26} /></span>
              <div>
                <h3 className="m-0 font-display text-base font-bold leading-6">Birlikte yürüyelim</h3>
                <p className="m-0 text-ink-faint">Bu rotayla bir gezinti grubu aç; buluşma noktası ilk durak olur.</p>
              </div>
            </div>
            <button type="button" onClick={grupAc} className="btn-ana">Grup aç</button>
          </div>
        </section>
      </div>
    </div>
  );
}
