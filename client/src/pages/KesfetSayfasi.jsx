import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, hataMesaji } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useKesfet } from '../hooks/useKesfet.js';
import { useTercihler } from '../context/Tercihler.jsx';
import { sonPlanKaydet } from '../lib/yerel.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import { simgeOf, turEtiketi, erisimOzeti, ziyaretDk, sureYaz, TUR_GRUPLARI } from '../lib/sunum.js';

const AZAMI = 15;
const ESIK = 120; // px
const azHareket = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Cip({ acik, onClick, children }) {
  return (
    <button type="button" aria-pressed={acik} onClick={onClick} className={acik ? 'cip-acik' : 'cip-kapali'}>
      {acik && <Simge ad="check" boyut={16} />}
      {children}
    </button>
  );
}

function KartGorseli({ m, buyuk, children }) {
  return (
    <div className="relative h-[55%] shrink-0 overflow-hidden rounded-[14px] bg-navy text-white/35 grid place-items-center">
      {m.gorsel?.url ? <img src={m.gorsel.url} alt="" draggable="false" className="absolute inset-0 h-full w-full object-cover" /> : <Simge ad={simgeOf(m)} boyut={buyuk ? 52 : 44} />}
      {children}
    </div>
  );
}

/** Tasarımdaki kaydırılabilir kart: işaretçi olaylarıyla sürükleme, fiske ve yaylanma. */
function Deste({ kartlar, semtOf, onKarar, geriAlSinyali, onGeriAl, geriAlinabilir }) {
  const [dx, setDx] = useState(0);
  const [faz, setFaz] = useState('idle'); // idle | drag | out | none | settle
  const mesgul = useRef(false);
  const baslangic = useRef(null);
  const zamanlayici = useRef(null);
  const ust = kartlar[0];

  const firlat = useCallback((yon) => {
    if (!ust || mesgul.current) return;
    mesgul.current = true;
    setFaz('out');
    setDx(yon === 'begen' ? 640 : -640);
    zamanlayici.current = setTimeout(() => {
      onKarar(ust, yon);
      setDx(0);
      setFaz('none');
      mesgul.current = false;
    }, azHareket() ? 0 : 260);
  }, [ust, onKarar]);

  // Geri alınan kart geldiği yönden yaylanarak döner.
  useEffect(() => {
    if (!geriAlSinyali) return;
    if (azHareket()) return;
    setFaz('none');
    setDx(geriAlSinyali.karar === 'begen' ? 560 : -560);
    requestAnimationFrame(() => requestAnimationFrame(() => { setFaz('settle'); setDx(0); }));
  }, [geriAlSinyali]);

  useEffect(() => {
    const tus = (e) => {
      if (e.target?.closest?.('input,textarea,select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); firlat('begen'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); firlat('gec'); }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [firlat]);

  useEffect(() => () => clearTimeout(zamanlayici.current), []);

  if (!ust) return null;
  const alt1 = kartlar[1];
  const gecis = faz === 'drag' || faz === 'none' ? 'none'
    : faz === 'out' ? 'transform 260ms cubic-bezier(0.65,0,0.35,1), opacity 260ms cubic-bezier(0.65,0,0.35,1)'
      : 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)';
  const aci = Math.max(-12, Math.min(12, dx / 20));
  const damgaOpak = Math.min(1, Math.abs(dx) / ESIK);
  const semt = semtOf(ust.semtId);
  const e = erisimOzeti(ust.erisilebilirlik);
  const damga = 'absolute top-7 z-[2] pointer-events-none rounded-[10px] border-[3px] border-current bg-surface px-3 py-1 font-display text-[26px] font-bold tracking-[.06em]';

  return (
    <>
      <div className="relative aspect-[3/4]">
        {kartlar.length > 2 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[20px] bg-surface opacity-60" style={{ transform: 'scale(.92) translateY(26px)' }} />
        )}
        {alt1 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] bg-surface p-4" style={{ transform: 'scale(.96) translateY(13px)' }}>
            <KartGorseli m={alt1} />
            <p className="mt-3.5 font-display text-xl font-bold text-heading">{alt1.ad}</p>
          </div>
        )}
        <article
          aria-label={ust.ad}
          onPointerDown={(ev) => {
            if (mesgul.current) return;
            ev.currentTarget.setPointerCapture?.(ev.pointerId);
            baslangic.current = { x: ev.clientX, t: Date.now() };
            setFaz('drag');
          }}
          onPointerMove={(ev) => { if (baslangic.current) setDx(ev.clientX - baslangic.current.x); }}
          onPointerUp={(ev) => {
            if (!baslangic.current) return;
            const d = ev.clientX - baslangic.current.x;
            const hiz = d / Math.max(Date.now() - baslangic.current.t, 16);
            baslangic.current = null;
            const fiske = Math.abs(d) >= 40 && Math.abs(hiz) >= 0.6 && Math.sign(hiz) === Math.sign(d);
            if (Math.abs(d) >= ESIK || fiske) firlat(d > 0 ? 'begen' : 'gec');
            else { setFaz('settle'); setDx(0); }
          }}
          onPointerCancel={() => { baslangic.current = null; setFaz('settle'); setDx(0); }}
          className="absolute inset-0 flex select-none flex-col overflow-hidden rounded-[20px] bg-surface p-4 shadow-md"
          style={{
            touchAction: 'pan-y',
            cursor: faz === 'drag' ? 'grabbing' : 'grab',
            transform: `translateX(${dx}px) rotate(${aci}deg)`,
            transition: gecis,
            opacity: faz === 'out' ? 0 : 1,
          }}
        >
          <span aria-hidden="true" className={`${damga} left-7 text-success`} style={{ transform: 'rotate(-12deg)', opacity: dx > 0 ? damgaOpak : 0 }}>GİDERİM</span>
          <span aria-hidden="true" className={`${damga} right-7 text-accent`} style={{ transform: 'rotate(12deg)', opacity: dx < 0 ? damgaOpak : 0 }}>GEÇ</span>
          <KartGorseli m={ust} buyuk>
            <span className="absolute left-2.5 top-2.5 rounded-md bg-navy/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">{semt?.ad} · {semt?.yaka}</span>
            {!ust.dogrulandi && (
              <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-0.5 rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-navy">
                <Simge ad="help" boyut={13} className="text-accent" />Doğrulanacak
              </span>
            )}
          </KartGorseli>
          <div className="mt-3.5 flex items-baseline justify-between gap-2">
            <h2 className="m-0 font-display text-xl font-bold leading-7">{ust.ad}</h2>
            <span className="whitespace-nowrap text-[13px] font-bold text-accent">{turEtiketi(ust)}</span>
          </div>
          <p className="mt-1 line-clamp-4 flex-1 text-ink-faint">{ust.kisa}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 text-xs font-semibold">
            {ust.tur === 'atolye' && ust.deneyim?.sureDk && (
              <span className="inline-flex items-center gap-1 text-heading"><Simge ad="schedule" boyut={16} />{ust.deneyim.sureDk} dk atölye</span>
            )}
            <span className={`inline-flex items-center gap-1 ${e.uyari ? 'text-accent' : 'text-success'}`}><Simge ad={e.uyari ? 'warning' : 'accessible'} boyut={16} />{e.metin}</span>
          </div>
        </article>
      </div>
      <div role="group" aria-label="Kararın" className="mt-5 grid grid-cols-[1fr_auto_1fr] gap-2">
        <button type="button" onClick={() => firlat('gec')} className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-[10px] bg-surface text-sm font-semibold text-ink transition hover:bg-surface-raised active:scale-[.98]">
          <Simge ad="close" boyut={22} />Geç
        </button>
        <button type="button" onClick={onGeriAl} disabled={!geriAlinabilir} className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-[10px] bg-heading/[.07] px-4 text-sm font-semibold text-heading hover:bg-fill/[.08] disabled:cursor-not-allowed disabled:opacity-[.45]">
          <Simge ad="undo" boyut={20} />Geri al
        </button>
        <button type="button" onClick={() => firlat('begen')} className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-[10px] bg-accent text-sm font-semibold text-white transition hover:brightness-105 active:scale-[.98]" style={{ boxShadow: '0 1px 3px rgb(var(--accent) / .3)' }}>
          <Simge ad="favorite" boyut={22} />Giderim
        </button>
      </div>
      <p className="sr-only" aria-live="polite">Şu anki kart: {ust.ad}</p>
    </>
  );
}

export default function KesfetSayfasi() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { erisilebilir } = useTercihler();
  const semtler = useApi(() => api.semtler(), []);
  const [semtIdler, setSemtIdler] = useState(() => (params.get('semt') ? [params.get('semt')] : []));
  const [turGruplari, setTurGruplari] = useState([]);
  const filtre = useMemo(
    () => ({ semtIdler, turler: turGruplari.flatMap((g) => TUR_GRUPLARI[g].turler), erisilebilir }),
    [semtIdler, turGruplari, erisilebilir],
  );
  const k = useKesfet(filtre);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [geriAlSinyali, setGeriAlSinyali] = useState(null);

  const semtOf = useCallback((id) => semtler.veri?.find((s) => s.id === id), [semtler.veri]);
  const degistir = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const geriAl = () => {
    if (!k.sonKarar) return;
    setGeriAlSinyali({ ...k.sonKarar, t: Date.now() });
    k.geriAl();
  };

  const n = k.begenilenIdler.length;
  const ziyaret = k.begenilenler.reduce((t, m) => t + ziyaretDk(m), 0);
  const semtSayisi = new Set(k.begenilenler.map((m) => m.semtId)).size;
  const yapilamaz = n < 2 || n > AZAMI || olusturuluyor;
  const ipucu = n < 2 ? `Rota için en az 2 yer seç (${n}/2).` : n > AZAMI ? `En fazla ${AZAMI} yer seçebilirsin; ${n - AZAMI} yeri çıkar.` : `${n} yer seçildi, rotan hazırlanabilir.`;

  const rotaOlustur = async () => {
    setHata(null);
    setOlusturuluyor(true);
    try {
      const plan = await api.planOlustur({ mekanIdler: k.begenilenIdler, erisilebilir });
      sonPlanKaydet(plan.id);
      navigate(`/plan/${plan.id}`);
    } catch (e) {
      setHata(hataMesaji(e));
      setOlusturuluyor(false);
    }
  };

  return (
    <div className="anim-page mx-auto w-full max-w-sayfa flex-1 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-start gap-8">
        <section className="flex min-w-0 flex-[7_1_480px] flex-col gap-6">
          <div className="panel">
            <h1 className="m-0 font-display text-xl font-semibold leading-7">Sağa kaydır, gideceğin yerleri topla</h1>
            <p className="mb-3 mt-0 text-ink-faint">Beğendiğin yerlerden yürüyüş rotanı biz çıkaralım</p>
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="min-w-[40px] text-[11px] font-semibold text-ink-faint">Semt:</span>
              {(semtler.veri || []).map((s) => (
                <Cip key={s.id} acik={semtIdler.includes(s.id)} onClick={() => degistir(semtIdler, setSemtIdler, s.id)}>{s.ad}</Cip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="min-w-[40px] text-[11px] font-semibold text-ink-faint">Tür:</span>
              {Object.entries(TUR_GRUPLARI).map(([g, { ad }]) => (
                <Cip key={g} acik={turGruplari.includes(g)} onClick={() => degistir(turGruplari, setTurGruplari, g)}>{ad}</Cip>
              ))}
            </div>
            {erisilebilir && (
              <p className="mb-0 mt-3 flex items-center gap-1.5 rounded-[10px] bg-success/10 px-3 py-2 text-[13px] font-medium text-success">
                <Simge ad="accessible" />Erişilebilir mod açık: merdivenli ve dik yokuşlu yerler gösterilmiyor.
              </p>
            )}
          </div>

          {k.yukleniyor && <Yukleniyor />}
          {k.hata && <HataKutusu metin={k.hata} />}
          {!k.yukleniyor && !k.hata && (k.kartlar.length ? (
            <div className="mx-auto grid w-full max-w-[480px] gap-4">
              <Deste kartlar={k.kartlar} semtOf={semtOf} onKarar={k.karar} geriAlSinyali={geriAlSinyali} onGeriAl={geriAl} geriAlinabilir={k.geriAlinabilir} />
              <p className="m-0 text-center text-xs text-ink-faint">Kartı sürükle ya da klavyede ← geç, → giderim · {k.kartlar.length} kart kaldı</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-[20px] bg-surface px-6 py-10 text-center">
              <Simge ad="style" boyut={40} className="text-ink-faint" />
              <p className="m-0 font-display text-xl font-bold text-heading">Deste bitti</p>
              <p className="m-0 max-w-[44ch] text-ink-faint">Bu filtrelerle gösterilecek yer kalmadı. Filtreleri genişletebilir ya da desteyi yeniden karıştırabilirsin.</p>
              <button type="button" onClick={k.sifirla} className="btn-ikincil mt-2">Desteyi baştan karıştır</button>
            </div>
          ))}
        </section>

        <aside aria-labelledby="sec-baslik" className="flex min-w-0 flex-[5_1_340px] flex-col gap-5 rounded-[20px] bg-surface p-6 lg:sticky lg:top-24">
          <div className="pb-4">
            <h2 id="sec-baslik" className="baslik-nokta m-0 font-display text-xl font-semibold leading-7">Gideceğim yerler</h2>
            <p className="mb-0 mt-0.5 text-ink-faint">En az 2, en fazla {AZAMI} yer seçebilirsin</p>
          </div>
          <div className="grid grid-cols-3 rounded-[14px] bg-surface-raised p-3 text-center">
            <div><span className="block text-[11px] font-semibold text-ink-faint">Seçilen yer</span><span className="font-display text-base font-bold text-heading">{n}</span></div>
            <div><span className="block text-[11px] font-semibold text-ink-faint">Ziyaret süresi</span><span className="font-display text-base font-bold text-heading">{n ? sureYaz(ziyaret) : '—'}</span></div>
            <div><span className="block text-[11px] font-semibold text-ink-faint">Semt</span><span className="font-display text-base font-bold text-success">{semtSayisi}</span></div>
          </div>
          {n === 0 && (
            <div className="rounded-[14px] bg-heading/[.04] p-5 text-center">
              <p className="m-0 font-display text-[15px] font-semibold text-heading">Henüz seçim yok</p>
              <p className="mb-0 mt-0.5 text-[13px] text-ink-faint">Beğendiğin kartı sağa kaydır; burada birikir.</p>
            </div>
          )}
          {n > 0 && (
            <ol className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-2 p-0">
              {k.begenilenler.map((m, i) => (
                <li key={m.id} className="anim-item flex items-center gap-3 rounded-[14px] bg-surface-raised py-2 pl-3 pr-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill text-[11px] font-bold text-on-fill">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-semibold text-heading">{m.ad}</span>
                    <span className="block text-xs text-ink-faint">{semtOf(m.semtId)?.ad} · {turEtiketi(m)}</span>
                  </span>
                  <button type="button" aria-label={`${m.ad} listeden çıkar`} onClick={() => k.cikar(m.id)} className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-faint hover:bg-accent/10 hover:text-accent">
                    <Simge ad="close" />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div>
            <p id="sec-ipucu" aria-live="polite" className="mb-2 mt-0 text-xs text-ink-faint">{hata || ipucu}</p>
            <button type="button" disabled={yapilamaz} aria-busy={olusturuluyor} aria-describedby="sec-ipucu" onClick={rotaOlustur} className="btn-ana min-h-[48px] w-full text-sm">
              <Simge ad={olusturuluyor ? 'progress_activity' : 'route'} className={olusturuluyor ? 'animate-spin' : ''} />
              {olusturuluyor ? 'Rota hesaplanıyor…' : 'Rotamı oluştur'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
