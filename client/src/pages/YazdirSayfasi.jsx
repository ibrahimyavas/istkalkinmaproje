import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import { DURAK_TURU, ZORLUK } from '../lib/harita.js';
import { sureYaz, mesafeYazTr, turEtiketi } from '../lib/sunum.js';

const G = 640; // çizim genişliği (SVG birimi)

/** Rota çizimi: sadeleştirilmiş geometri + numaralı duraklar. Harita karosu gerektirmez, baskıda net çıkar. */
function RotaCizimi({ geometri, sinirlar, duraklar }) {
  const [minLon, minLat, maxLon, maxLat] = sinirlar;
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180); // boylam sıkışması
  const genD = Math.max((maxLon - minLon) * k, 1e-6);
  const yukD = Math.max(maxLat - minLat, 1e-6);
  const pay = 36;
  const olcek = Math.min((G - 2 * pay) / genD, 360 / yukD);
  const H = Math.round(yukD * olcek + 2 * pay);
  const xy = ([lon, lat]) => [pay + (lon - minLon) * k * olcek + ((G - 2 * pay) - genD * olcek) / 2, H - pay - (lat - minLat) * olcek];
  const cizgiler = !geometri ? [] : geometri.type === 'LineString' ? [geometri.coordinates] : geometri.coordinates;

  return (
    <svg viewBox={`0 0 ${G} ${H}`} role="img" aria-label="Rota çizimi" className="w-full rounded-[14px] border border-hairline bg-surface-raised">
      {cizgiler.map((c, i) => (
        <polyline key={i} points={c.map((p) => xy(p).join(',')).join(' ')} fill="none" stroke="#C84B26" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {duraklar.map((d) => {
        const [x, y] = xy([d.lon, d.lat]);
        return (
          <g key={d.id}>
            <circle cx={x} cy={y} r="13" fill="#0A2540" stroke="#fff" strokeWidth="3" />
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">{d.sira}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Özet kutuları, rota çizimi ve durak listesi (tek gün ya da tek rota). */
function Bolum({ b, tur }) {
  return (
    <>
      <dl className="my-5 grid grid-cols-4 gap-3">
        {b.ozet.map(([e, d]) => (
          <div key={e} className="rounded-[10px] border border-hairline p-2.5 text-center">
            <dt className="text-[11px] font-semibold text-ink-faint">{e}</dt>
            <dd className="m-0 font-display text-base font-bold text-[#0A2540]">{d}</dd>
          </div>
        ))}
      </dl>

      {b.sadeGeometri && b.sinirlar && (
        <section className="mb-6 break-inside-avoid">
          <RotaCizimi geometri={b.sadeGeometri} sinirlar={b.sinirlar} duraklar={b.aktif.map((d, i) => ({ ...d, sira: i + 1 }))} />
          <p className="mb-0 mt-1 text-[10px] text-ink-faint">
            Çizim ölçeklidir, harita değildir. {b.geometriKaynagi === 'valhalla' ? 'Güzergâh OpenStreetMap verisiyle hesaplandı.' : 'Güzergâh yaklaşıktır.'} Harita verisi © OpenStreetMap katkıcıları.
          </p>
        </section>
      )}

      <ol className="m-0 list-none p-0">
        {b.aktif.map((d, i) => {
          const bacak = tur === 'plan' ? b.bacaklar?.[i] : null;
          return (
            <li key={d.id} className="break-inside-avoid border-b border-hairline py-4 last:border-0">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A2540] text-sm font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 font-display text-lg font-bold text-[#0A2540]">
                    {d.ad} <span className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#C84B26]">{turEtiketi(d)}</span>
                  </h2>
                  {d.anlatim && <p className="mb-0 mt-1.5 italic text-ink-muted">{d.anlatim}</p>}
                  <p className="mb-0 mt-1.5 text-[13px] leading-[21px]">{d.detay?.metin || d.kisa}</p>
                  {d.detay?.ipucu && <p className="mb-0 mt-1.5 text-[12px] text-ink-muted"><strong>İpucu:</strong> {d.detay.ipucu}</p>}
                  <p className="mb-0 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                    {d.ziyaretDk && <span>Ziyaret: ~{d.ziyaretDk} dk</span>}
                    {d.enYakinDurak && <span>Ulaşım: {d.enYakinDurak.ad} ({DURAK_TURU[d.enYakinDurak.tur]}, {mesafeYazTr(d.enYakinDurak.mesafeM)})</span>}
                    {d.enYakinToplanma && <span>Toplanma alanı: {d.enYakinToplanma.ad} ({mesafeYazTr(d.enYakinToplanma.mesafeM)})</span>}
                  </p>
                  {d.engeller?.length > 0 && <p className="mb-0 mt-1 text-[12px] font-semibold text-[#B45309]">Erişilebilirlik: {d.engeller.join(' · ')}</p>}
                  {!d.dogrulandi && <p className="mb-0 mt-1 text-[11px] text-ink-faint">Bu kayıt doğrulanmayı bekliyor.</p>}
                </div>
              </div>
              {bacak && (
                <p className="mb-0 ml-11 mt-3 text-[12px] font-semibold text-ink-muted">
                  ↓ {bacak.tur === 'toplu-tasima'
                    ? (bacak.yakaDegisir ? 'Yaka değişiyor: vapur ya da Marmaray' : 'Toplu taşıma önerilir')
                    : `Yürüyerek ${mesafeYazTr(bacak.mesafeM ?? bacak.tahminiMesafeM)}${bacak.sureDk ? ` · ${bacak.sureDk} dk` : ''}`}
                </p>
              )}
            </li>
          );
        })}
      </ol>

    </>
  );
}

export default function YazdirSayfasi({ tur }) {
  const { id } = useParams();
  const { erisilebilir } = useTercihler();
  const { veri: v, yukleniyor, hata, yenile } = useApi(
    () => (tur === 'plan' ? api.planYazdir(id) : api.rotaYazdir(id, erisilebilir)),
    [id, tur, erisilebilir],
  );
  const [qr, setQr] = useState(null);
  const semtler = useApi(() => api.semtler(), []);
  const cevrimici = `${window.location.origin}/${tur === 'plan' ? 'plan' : 'rota'}/${id}`;

  useEffect(() => {
    QRCode.toDataURL(cevrimici, { margin: 1, width: 220 }).then(setQr).catch(() => {});
  }, [cevrimici]);

  if (yukleniyor) return <Yukleniyor metin="Yazdırma sayfası hazırlanıyor…" />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;

  const baslik = tur !== 'plan' ? v.rota.ad
    : v.gunler ? `${v.gunler.length} günlük şehir rotası` : `${v.duraklar.length} duraklı kişisel rota`;
  const semtAd = (sid) => semtler.veri?.find((s) => s.id === sid)?.ad || sid;
  const bolumOf = (x) => ({
    ...x,
    aktif: x.duraklar.filter((d) => !d.atlanabilir),
    ozet: tur === 'plan'
      ? [['Yürüyüş', mesafeYazTr(x.toplam.yurumeM)], ['Yürüme', sureYaz(x.toplam.yurumeDk)], ['Ziyaret', sureYaz(x.toplam.ziyaretDk)], ['Toplam', sureYaz(x.toplam.tahminiToplamDk)]]
      : [['Yürüyüş', mesafeYazTr(x.mesafeM)], ['Süre', `${x.sureDk} dk`], ['Zorluk', ZORLUK[x.zorluk]?.ad || x.zorluk], ['Merdiven', x.merdivenM != null ? `${x.merdivenM} m` : '—']],
  });

  return (
    <div className="yazdir-sayfa mx-auto max-w-[820px] bg-surface px-6 py-8 text-ink print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={tur === 'plan' ? `/plan/${id}` : `/rota/${id}`} className="inline-flex items-center gap-1 font-semibold"><Simge ad="arrow_back" />Rotaya dön</Link>
        <button type="button" onClick={() => window.print()} className="btn-ana"><Simge ad="print" />Yazdır / PDF olarak kaydet</button>
      </div>

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#0A2540] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#C84B26]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A2540] text-[11px] text-white">404</span>
            Proje 404 · İstanbul {tur === 'plan' ? 'kişisel rota' : 'hikâye rotası'}
          </div>
          <h1 className="mb-0 mt-2 font-display text-3xl font-bold leading-tight text-[#0A2540]">{baslik}</h1>
          {tur !== 'plan' && <p className="mb-0 mt-1 text-ink-muted">{v.semt?.ad} · {v.rota.ozet}</p>}
          {v.erisilebilir && <p className="mb-0 mt-1 text-sm font-semibold text-[#1B8755]">Erişilebilir mod: merdivenli ve dik yokuşlu duraklar çıkarıldı.</p>}
        </div>
        {qr && (
          <figure className="m-0 shrink-0 text-center">
            <img src={qr} alt="Rotanın çevrim içi sürümüne giden QR kod" className="h-24 w-24" />
            <figcaption className="text-[10px] text-ink-faint">Güncel sürüm ve sesli rehber</figcaption>
          </figure>
        )}
      </header>

      {v.gunler ? v.gunler.map((gun) => (
        <section key={gun.gun} className="mt-6 break-before-page first-of-type:break-before-auto">
          <h2 className="mb-0 mt-0 border-b border-[#0A2540] pb-1 font-display text-xl font-bold text-[#0A2540]">
            {gun.gun}. gün <span className="text-sm font-semibold text-ink-muted">· {gun.semtIdler.map(semtAd).join(', ')}</span>
          </h2>
          <Bolum tur={tur} b={bolumOf(gun)} />
        </section>
      )) : <Bolum tur={tur} b={bolumOf(v)} />}

      <footer className="mt-6 border-t-2 border-[#0A2540] pt-3 text-[10px] leading-4 text-ink-faint">
        Proje 404 · {new Date(v.olusturma || Date.now()).toLocaleDateString('tr-TR')} tarihinde yazdırıldı. Acil durumda 112'yi arayın.
        Bazı kayıtlar demo amaçlıdır; ziyaret saatlerini gitmeden kontrol edin. Harita verisi © OpenStreetMap katkıcıları.
      </footer>
    </div>
  );
}
