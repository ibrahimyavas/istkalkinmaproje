import React, { useState } from 'react';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';
import Simge from '../../components/common/Simge.jsx';

const DURUMLAR = [['bekliyor', 'Bekleyenler'], ['onaylandi', 'Onaylananlar'], ['reddedildi', 'Reddedilenler']];
const haritaLinki = (k) => `https://www.openstreetmap.org/?mlat=${k.lat}&mlon=${k.lon}#map=18/${k.lat}/${k.lon}`;

function Yenile() {
  const [durum, setDurum] = useState({ calisiyor: false, sonuc: null, hata: null });
  const calistir = async () => {
    setDurum({ calisiyor: true, sonuc: null, hata: null });
    try {
      setDurum({ calisiyor: false, sonuc: await api.admin.fotolariYenile(), hata: null });
    } catch (err) {
      setDurum({ calisiyor: false, sonuc: null, hata: hataMesaji(err) });
    }
  };
  const o = durum.sonuc?.ozet;
  return (
    <section className="panel" aria-labelledby="yenile-baslik">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="yenile-baslik" className="m-0 font-display text-lg font-bold">Fotoğrafları yenile</h2>
          <p className="m-0 text-[13px] text-ink-faint">Mekan kapaklarını Wikipedia/Commons'tan özgür lisanslı görsellerle (yazar ve lisans bilgisiyle) günceller. Elle seçilmiş kapaklar korunur.</p>
        </div>
        <button type="button" className="btn-ana" onClick={calistir} disabled={durum.calisiyor}>
          <Simge ad={durum.calisiyor ? 'progress_activity' : 'sync'} className={durum.calisiyor ? 'animate-spin' : ''} />
          {durum.calisiyor ? 'Yenileniyor…' : 'Fotoğrafları yenile'}
        </button>
      </div>
      {durum.hata && <p role="alert" className="mb-0 mt-3 font-semibold text-danger">{durum.hata}</p>}
      {o && (
        <div className="mt-4" role="status">
          <p className="m-0 font-semibold">{o.guncellendi} güncellendi · {o.atlandi} atlandı · {o.bulunamadi} bulunamadı · {o.hata} hata</p>
          <details className="mt-2 text-[13px]">
            <summary className="cursor-pointer font-semibold text-accent">Ayrıntılı rapor</summary>
            <ul className="mt-2 grid gap-1 p-0 [list-style:none]">
              {durum.sonuc.rapor.map((r) => <li key={r.mekanId}><strong>{r.mekanId}</strong>: {r.durum} — {r.neden}</li>)}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

export default function Fotograflar() {
  const [durum, setDurum] = useState('bekliyor');
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.fotograflar(durum), [durum]);

  const islem = async (fn) => {
    try {
      await fn();
      yenile();
    } catch (err) {
      window.alert(hataMesaji(err));
    }
  };

  return (
    <div className="grid gap-6">
      <Yenile />
      <section aria-labelledby="mod-baslik">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="mod-baslik" className="m-0 font-display text-lg font-bold">Ziyaretçi fotoğrafları</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Durum">
            {DURUMLAR.map(([d, ad]) => (
              <button key={d} type="button" aria-pressed={durum === d} onClick={() => setDurum(d)} className={durum === d ? 'cip-acik' : 'cip-kapali'}>{ad}</button>
            ))}
          </div>
        </div>
        {yukleniyor && <Yukleniyor />}
        {hata && <HataKutusu metin={hata} yenile={yenile} />}
        {veri && veri.length === 0 && <p className="text-ink-faint">Bu durumda fotoğraf yok.</p>}
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {(veri || []).map((f) => (
            <li key={f.id} className="kart overflow-hidden">
              <img src={f.url} alt={f.aciklama || 'Ziyaretçi fotoğrafı'} className="aspect-[4/3] w-full bg-surface-raised object-cover" loading="lazy" />
              <div className="grid gap-1 p-3 text-[13px]">
                <p className="m-0 font-semibold text-heading">{f.mekanId || 'Mekansız (bildirim)'}</p>
                {f.aciklama && <p className="m-0">{f.aciklama}</p>}
                <p className="m-0 text-xs text-ink-faint">{f.ad || 'Anonim'} · {new Date(f.tarih).toLocaleString('tr-TR')} · {Math.round(f.boyut / 1024)} KB</p>
                {f.konum && <a href={haritaLinki(f.konum)} target="_blank" rel="noreferrer" className="text-xs font-semibold"><Simge ad="location_on" boyut={14} />Konumu haritada aç</a>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.durum !== 'onaylandi' && <button type="button" className="btn-ana min-h-[36px] px-3" onClick={() => islem(() => api.admin.fotoDurum(f.id, 'onaylandi'))}>Onayla</button>}
                  {f.durum !== 'reddedildi' && <button type="button" className="btn-ikincil min-h-[36px] px-3" onClick={() => islem(() => api.admin.fotoDurum(f.id, 'reddedildi'))}>Reddet</button>}
                  {f.mekanId && <button type="button" className="btn-ikincil min-h-[36px] px-3" onClick={() => islem(() => api.admin.fotoKapak(f.id))}>Kapak yap</button>}
                  <button type="button" aria-label="Fotoğrafı sil" className="btn-ikincil min-h-[36px] px-3 text-danger" onClick={() => window.confirm('Fotoğraf kalıcı olarak silinsin mi?') && islem(() => api.admin.fotoSil(f.id))}><Simge ad="delete" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
