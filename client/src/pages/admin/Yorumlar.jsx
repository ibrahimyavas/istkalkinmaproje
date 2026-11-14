import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';
import Simge from '../../components/common/Simge.jsx';
import { Yildizlar } from '../../components/mekan/Yorumlar.jsx';

const DURUMLAR = [['bekliyor', 'Bekleyenler'], ['onaylandi', 'Onaylananlar'], ['reddedildi', 'Reddedilenler']];
const NEDEN = { hakaret: 'hakaret', spam: 'spam', 'yanlis-bilgi': 'yanlış bilgi', 'kisisel-bilgi': 'kişisel bilgi', diger: 'diğer' };

export default function Yorumlar() {
  const [durum, setDurum] = useState('bekliyor');
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.yorumlar(durum), [durum]);

  const islem = async (fn) => {
    try {
      await fn();
      yenile();
    } catch (err) {
      window.alert(hataMesaji(err));
    }
  };

  return (
    <section aria-labelledby="yorum-mod-baslik">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="yorum-mod-baslik" className="m-0 font-display text-lg font-bold">Ziyaretçi yorumları</h2>
          <p className="m-0 text-[13px] text-ink-faint">Yorumla gelen fotoğraf, yorumla birlikte onaylanır ya da reddedilir. 3 şikâyet alan yorum yayından kalkıp buraya döner.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Durum">
          {DURUMLAR.map(([d, ad]) => (
            <button key={d} type="button" aria-pressed={durum === d} onClick={() => setDurum(d)} className={durum === d ? 'cip-acik' : 'cip-kapali'}>{ad}</button>
          ))}
        </div>
      </div>
      {yukleniyor && <Yukleniyor />}
      {hata && <HataKutusu metin={hata} yenile={yenile} />}
      {veri && veri.length === 0 && <p className="text-ink-faint">Bu durumda yorum yok.</p>}
      <ul className="m-0 grid list-none gap-3 p-0">
        {(veri || []).map((y) => (
          <li key={y.id} className="kart grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="m-0 flex flex-wrap items-center gap-2 text-[13px]">
                <Link to={`/mekan/${y.mekanId}`} className="font-semibold">{y.mekanAd}</Link>
                <Yildizlar puan={y.puan} boyut={16} />
                <span className="text-ink-faint">{y.rumuz} · {new Date(y.tarih).toLocaleString('tr-TR')}</span>
              </p>
              <p className="mb-0 mt-1.5 whitespace-pre-line text-[14px]">{y.metin}</p>
              {y.sikayetler?.length > 0 && (
                <p className="mb-0 mt-1.5 flex items-center gap-1 text-xs font-semibold text-danger">
                  <Simge ad="flag" boyut={16} />{y.sikayetler.length} şikâyet: {y.sikayetler.map((s) => NEDEN[s.neden] || s.neden).join(', ')}
                </p>
              )}
              {y.fotoUrl && <img src={y.fotoUrl} alt="Yorumla gelen fotoğraf" className="mt-2 h-32 w-auto rounded-[10px] border border-hairline object-cover" loading="lazy" />}
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:flex-col">
              {y.durum !== 'onaylandi' && <button type="button" className="btn-ana min-h-[36px] px-3" onClick={() => islem(() => api.admin.yorumDurum(y.id, 'onaylandi'))}>Onayla</button>}
              {y.durum !== 'reddedildi' && <button type="button" className="btn-ikincil min-h-[36px] px-3" onClick={() => islem(() => api.admin.yorumDurum(y.id, 'reddedildi'))}>Reddet</button>}
              <button type="button" aria-label="Yorumu sil" className="btn-ikincil min-h-[36px] px-3 text-danger" onClick={() => window.confirm('Yorum kalıcı olarak silinsin mi?') && islem(() => api.admin.yorumSil(y.id))}><Simge ad="delete" /></button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
