import React, { useState } from 'react';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';
import Simge from '../../components/common/Simge.jsx';
import { ZANAAT } from '../../lib/harita.js';

const UZMANLIK = { ...ZANAAT, rehber: 'Kültür rehberi', diger: 'Diğer' };
const DURUM = {
  basvuru: ['Başvuru', 'bg-warning/10 text-warning'],
  onayli: ['Onaylı', 'bg-success/10 text-success'],
  askida: ['Askıda', 'bg-surface-raised text-ink-muted'],
  reddedildi: ['Reddedildi', 'bg-danger/10 text-danger'],
};

/** Uzman başvuruları: onaylanınca tek seferlik erişim anahtarı üretilir; admin uzmana kendisi iletir. */
export default function Uzmanlar() {
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.uzmanlar(), []);
  const [anahtar, setAnahtar] = useState(null); // { ad, erisimAnahtari }

  const onayla = async (u) => {
    const yeniden = u.durum === 'onayli';
    if (yeniden && !window.confirm(`${u.ad} için yeni anahtar üretilsin mi? Eski anahtar geçersiz olur.`)) return;
    try {
      const s = await api.admin.uzmanOnayla(u.id);
      setAnahtar({ ad: u.ad, erisimAnahtari: s.erisimAnahtari, iletisim: u.iletisim });
      yenile();
    } catch (err) {
      window.alert(hataMesaji(err));
    }
  };
  const durumDegis = async (u, d) => {
    await api.admin.uzmanDurum(u.id, d);
    yenile();
  };

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;

  return (
    <div className="grid gap-4">
      {anahtar && (
        <div role="alert" className="rounded-[14px] border-2 border-success bg-success/10 p-4">
          <p className="m-0 font-semibold text-success">{anahtar.ad} onaylandı. Erişim anahtarı yalnızca şimdi gösteriliyor:</p>
          <code className="mt-2 block select-all break-all rounded-lg bg-surface p-3 font-mono text-sm text-ink">{anahtar.erisimAnahtari}</code>
          <p className="mb-0 mt-2 text-[13px] text-ink-muted">Anahtarı uzmana güvenli bir kanaldan iletin ({anahtar.iletisim}). Uzman /uzman sayfasından bu anahtarla giriş yapar.</p>
          <button type="button" className="btn-ikincil mt-3" onClick={() => setAnahtar(null)}>Kopyaladım, kapat</button>
        </div>
      )}
      {veri.length === 0 && <p className="text-ink-faint">Henüz başvuru yok.</p>}
      <ul className="m-0 grid list-none gap-3 p-0">
        {veri.map((u) => {
          const [ad, renk] = DURUM[u.durum] || [u.durum, ''];
          return (
            <li key={u.id} className="kart p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold text-heading">{u.ad}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${renk}`}>{ad}</span>
                <span className="text-xs text-ink-faint">{UZMANLIK[u.uzmanlik] || u.uzmanlik} · {u.atolyeAdi} · {u.iletisim}</span>
              </div>
              {u.aciklama && <p className="mb-0 mt-2 text-[13px]">{u.aciklama}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {u.durum !== 'onayli' && u.durum !== 'reddedildi' && <button type="button" className="btn-ana min-h-[36px]" onClick={() => onayla(u)}><Simge ad="verified" />Onayla ve anahtar üret</button>}
                {u.durum === 'onayli' && <button type="button" className="btn-ikincil min-h-[36px]" onClick={() => onayla(u)}><Simge ad="key" />Yeni anahtar</button>}
                {u.durum === 'onayli' && <button type="button" className="btn-ikincil min-h-[36px]" onClick={() => durumDegis(u, 'askida')}>Askıya al</button>}
                {u.durum === 'askida' && <button type="button" className="btn-ikincil min-h-[36px]" onClick={() => durumDegis(u, 'onayli')}>Yeniden etkinleştir</button>}
                {u.durum === 'basvuru' && <button type="button" className="btn-ikincil min-h-[36px] text-danger" onClick={() => durumDegis(u, 'reddedildi')}>Reddet</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
