import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, hataMesaji } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import Simge from '../components/common/Simge.jsx';
import { yolTarifiUrl, ZANAAT } from '../lib/harita.js';
import { ETKINLIK_TURU as TUR, tarihMetni, ucretMetni, yerMetni } from '../lib/etkinlik.js';

const UZMANLIK = { ...ZANAAT, rehber: 'Kültür rehberi', diger: 'Uzman' };

function KayitFormu({ etkinlik, kalan, onKayit }) {
  const [f, setF] = useState({ ad: '', iletisim: '', kisi: 1, erisilebilirlikIhtiyaci: '', not: '' });
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, tamam: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null, tamam: false });
    try {
      await api.talep({ ...f, kisi: Number(f.kisi), etkinlikId: etkinlik.id });
      setDurum({ gonderiliyor: false, hata: null, tamam: true });
      onKayit();
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), tamam: false });
    }
  };

  if (durum.tamam) {
    return (
      <p role="status" className="m-0 flex items-start gap-2 rounded-[14px] bg-success/10 p-4 font-semibold text-success">
        <Simge ad="check_circle" boyut={20} />Kaydınız alındı. Etkinliği düzenleyen kişi sizinle iletişime geçecek.
      </p>
    );
  }

  return (
    <form onSubmit={gonder} className="grid gap-3" noValidate>
      <div><label htmlFor="k-ad" className="etiket">Adınız</label><input id="k-ad" className="girdi" value={f.ad} onChange={set('ad')} maxLength={80} autoComplete="name" /></div>
      <div><label htmlFor="k-il" className="etiket">E-posta ya da telefon</label><input id="k-il" className="girdi" value={f.iletisim} onChange={set('iletisim')} maxLength={120} autoComplete="email" /></div>
      <div><label htmlFor="k-kisi" className="etiket">Kişi sayısı</label><input id="k-kisi" type="number" min="1" max={Math.max(1, kalan)} className="girdi" value={f.kisi} onChange={set('kisi')} /></div>
      <div><label htmlFor="k-eris" className="etiket">Erişilebilirlik ihtiyacınız (isteğe bağlı)</label><input id="k-eris" className="girdi" value={f.erisilebilirlikIhtiyaci} onChange={set('erisilebilirlikIhtiyaci')} maxLength={300} /></div>
      {durum.hata && <p role="alert" className="m-0 font-semibold text-danger">{durum.hata}</p>}
      <button type="submit" className="btn-ana" disabled={durum.gonderiliyor}><Simge ad="how_to_reg" />{durum.gonderiliyor ? 'Gönderiliyor…' : 'Kayıt ol'}</button>
      <p className="m-0 text-xs text-ink-faint">İletişim bilginizi yalnızca etkinliği düzenleyen kişi görür. Ödeme bu sitede alınmaz.</p>
    </form>
  );
}

export default function EtkinlikSayfasi() {
  const { id } = useParams();
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.etkinlik(id), [id]);
  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  const { etkinlik: e, mekan, uzman, kontenjan, kayitEngeli } = veri;
  const ucret = ucretMetni(e);
  // Konumu bilinen dış mekan (müze vb.) için yol tarifi; uygulamadaki mekanlar kendi sayfasından.
  const disYer = !mekan && e.lat && e.lon ? { ad: e.mekanAd, lat: e.lat, lon: e.lon } : null;

  return (
    <div className="anim-page mx-auto w-full max-w-sayfa flex-1 px-4 py-8 sm:px-8">
      <nav aria-label="Konum" className="text-[13px] text-ink-faint"><Link to="/etkinlikler">Etkinlikler</Link> <span aria-hidden="true">/</span> {e.baslik}</nav>
      <div className="mt-4 flex flex-wrap items-start gap-8">
        <section className="flex min-w-0 flex-[7_1_480px] flex-col gap-6">
          <div className="panel">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{TUR[e.tur] || e.tur}</span>
              {e.erisilebilir && <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success"><Simge ad="accessible" boyut={14} />Erişilebilir</span>}
              {e.ornek && <span className="rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">Örnek etkinlik</span>}
              {e.arsiv && <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-ink-muted">Geçmiş etkinlik · {e.festival}</span>}
              {e.durum === 'iptal' && <span className="rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">İptal edildi</span>}
            </div>
            <h1 className="mb-0 mt-2 font-display text-3xl font-bold leading-tight">{e.baslik}</h1>
            {e.aciklama && <p className="mb-0 mt-3 whitespace-pre-line text-[15px] leading-[26px]">{e.aciklama}</p>}
            <dl className="mb-0 mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['event', 'Ne zaman', tarihMetni(e, true)],
                ['schedule', 'Süre', e.sureDk ? `${e.sureDk} dakika` : '—'],
                ['payments', 'Ücret', ucret],
                ['place', 'Yer', yerMetni(e, mekan) + (e.adres ? ` · ${e.adres}` : '')],
              ].map(([s, et, d]) => (
                <div key={et} className="flex items-start gap-3 rounded-[14px] border border-hairline bg-surface-raised p-3">
                  <Simge ad={s} boyut={20} className="text-accent" />
                  <div><dt className="text-[11px] font-semibold text-ink-faint">{et}</dt><dd className="m-0 font-semibold text-heading">{d}</dd></div>
                </div>
              ))}
            </dl>
            {e.kaynak && (
              <p className="mb-0 mt-4 text-[13px] text-ink-muted">
                Kaynak: <a href={e.kaynak} target="_blank" rel="noreferrer" className="font-semibold">{e.arsiv ? 'festival sayfası' : 'kurumun sitesi'}</a>
                {e.sonKontrol && ` · son kontrol ${new Date(e.sonKontrol).toLocaleDateString('tr-TR')}`}
                {e.gercek && !e.dogrulandi && ' · tarih ve yer gitmeden kaynaktan doğrulanmalı'}
              </p>
            )}
            {disYer && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={yolTarifiUrl(null, disYer, 'transit')} target="_blank" rel="noreferrer" className="btn-ikincil"><Simge ad="directions_transit" />Yol tarifi</a>
              </div>
            )}
            {mekan && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/mekan/${mekan.id}`} className="btn-ikincil"><Simge ad="info" />Mekan sayfası</Link>
                <a href={yolTarifiUrl(null, mekan, 'transit')} target="_blank" rel="noreferrer" className="btn-ikincil"><Simge ad="directions_transit" />Yol tarifi</a>
              </div>
            )}
          </div>
          {uzman && (
            <div className="panel flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-fill text-on-fill"><Simge ad="workspace_premium" boyut={26} /></span>
              <div>
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[.06em] text-accent">Düzenleyen uzman</p>
                <p className="m-0 font-display text-base font-bold text-heading">{uzman.ad}</p>
                <p className="m-0 text-[13px] text-ink-faint">{UZMANLIK[uzman.uzmanlik] || uzman.uzmanlik}{uzman.atolyeAdi ? ` · ${uzman.atolyeAdi}` : ''}</p>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-[5_1_320px] flex-col gap-4 rounded-[20px] border border-hairline bg-surface p-6 shadow-xs lg:sticky lg:top-24">
          <h2 className="baslik-nokta m-0 font-display text-xl font-semibold">Kayıt</h2>
          {kontenjan && (
            <div>
              <div className="flex justify-between text-[13px] font-semibold"><span>{kontenjan.dolu} / {kontenjan.toplam} kişi</span><span className="text-success">{kontenjan.kalan} yer kaldı</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-valuemin={0} aria-valuemax={kontenjan.toplam} aria-valuenow={kontenjan.dolu} aria-label="Doluluk">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (kontenjan.dolu / Math.max(1, kontenjan.toplam)) * 100)}%` }} />
              </div>
            </div>
          )}
          {kayitEngeli ? (
            <div className="grid gap-3">
              <p className="m-0 rounded-[14px] border border-dashed border-hairline p-4 text-center font-semibold text-ink-muted">{kayitEngeli}</p>
              {e.gercek && e.kaynak && !e.arsiv && (
                <a href={e.kaynak} target="_blank" rel="noreferrer" className="btn-ana justify-center"><Simge ad="open_in_new" />Kurumun sayfasına git</a>
              )}
            </div>
          ) : (
            <KayitFormu etkinlik={e} kalan={kontenjan?.kalan ?? 20} onKayit={yenile} />
          )}
        </aside>
      </div>
    </div>
  );
}
