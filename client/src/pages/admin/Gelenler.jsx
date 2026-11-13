import React from 'react';
import { Check, X } from 'lucide-react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';
import { Etiket } from '../../components/common/Rozetler.jsx';

const tarih = (iso) => new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
const BILDIRIM_TURU = { erisilebilirlik: 'Erişilebilirlik', yorum: 'Yorum', hata: 'Yanlış bilgi', grup: 'Grup şikâyeti' };
const DURUM_RENK = { bekliyor: 'bg-warning/15 text-warning', onaylandi: 'bg-success/15 text-success', reddedildi: 'bg-danger/15 text-danger' };

export function Bildirimler() {
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.bildirimler(), []);
  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  if (!veri.length) return <p className="text-ink-muted">Henüz bildirim yok.</p>;

  const degistir = (id, durum) => api.admin.bildirimDurum(id, durum).then(yenile);

  return (
    <ul className="space-y-3">
      {veri.map((b) => (
        <li key={b.id} className="kart p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Etiket>{BILDIRIM_TURU[b.tur]}</Etiket>
            <Etiket className={DURUM_RENK[b.durum]}>{b.durum}</Etiket>
            <span className="text-xs text-ink-muted">{tarih(b.tarih)} · {b.ad} · {b.grupId ? `grup: ${b.grupId}` : b.mekanId || 'genel'}</span>
          </div>
          <p className="mt-2">{b.metin}</p>
          {(b.konum || b.enYakinMekan || b.fotoIdler?.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {b.konum && <a href={`https://www.openstreetmap.org/?mlat=${b.konum.lat}&mlon=${b.konum.lon}#map=18/${b.konum.lat}/${b.konum.lon}`} target="_blank" rel="noreferrer" className="font-semibold">Konumu haritada aç (±{b.konum.dogrulukM ?? '?'} m)</a>}
              {b.enYakinMekan && <span className="text-ink-faint">En yakın mekan: {b.enYakinMekan.ad || b.enYakinMekan.id}</span>}
              {(b.fotoIdler || []).map((id) => <a key={id} href={`/api/fotograflar/${id}/dosya`} target="_blank" rel="noreferrer"><img src={`/api/fotograflar/${id}/dosya`} alt="Bildirim fotoğrafı" className="h-16 w-20 rounded-md border border-hairline object-cover" /></a>)}
            </div>
          )}
          {b.durum === 'bekliyor' && (
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-ana py-1.5 text-sm" onClick={() => degistir(b.id, 'onaylandi')}><Check size={14} aria-hidden="true" /> Onayla ve yayınla</button>
              <button type="button" className="btn-ikincil py-1.5 text-sm" onClick={() => degistir(b.id, 'reddedildi')}><X size={14} aria-hidden="true" /> Reddet</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const GRUP_DURUM = { aktif: 'bg-success/15 text-success', iptal: 'bg-warning/15 text-warning', kaldirildi: 'bg-danger/15 text-danger' };

/** Gezinti grupları moderasyonu. Admin iletişim bilgilerini görebilir (şikâyet incelemesi için). */
export function Gruplar() {
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.gruplar(), []);
  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  if (!veri.length) return <p className="text-ink-muted">Henüz grup yok.</p>;
  const degistir = (id, durum) => api.admin.grupDurum(id, durum).then(yenile);

  return (
    <ul className="space-y-3">
      {veri.map((g) => (
        <li key={g.id} className="kart p-4">
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/grup/${g.id}`} className="font-semibold hover:underline">{g.baslik}</a>
            <Etiket className={GRUP_DURUM[g.durum]}>{g.durum}</Etiket>
            {g.ornek && <Etiket className="bg-warning/15 text-warning">örnek</Etiket>}
            <span className="text-xs text-ink-muted">{tarih(g.baslangic)} · {g.katilimcilar.length + 1}/{g.kapasite} · açan: {g.rumuz} · {g.rotaId || g.planId}</span>
          </div>
          {g.aciklama && <p className="mt-2 text-sm">{g.aciklama}</p>}
          <div className="mt-3 flex gap-2">
            {g.durum !== 'kaldirildi' && <button type="button" className="btn-ikincil py-1.5 text-sm text-danger" onClick={() => degistir(g.id, 'kaldirildi')}><X size={14} aria-hidden="true" /> Kaldır</button>}
            {g.durum !== 'aktif' && <button type="button" className="btn-ikincil py-1.5 text-sm" onClick={() => degistir(g.id, 'aktif')}><Check size={14} aria-hidden="true" /> Yeniden yayınla</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}

const TALEP_DURUM =[['yeni', 'Yeni'], ['iletildi', 'Atölyeye iletildi'], ['tamamlandi', 'Tamamlandı'], ['iptal', 'İptal']];

export function Talepler() {
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.talepler(), []);
  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  if (!veri.length) return <p className="text-ink-muted">Henüz atölye talebi yok.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-hairline text-ink-muted">
          <tr>
            <th className="py-2 pr-3">Tarih</th><th className="pr-3">Atölye</th><th className="pr-3">Kişi</th>
            <th className="pr-3">Ad / iletişim</th><th className="pr-3">Erişilebilirlik ihtiyacı</th><th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {veri.map((t) => (
            <tr key={t.id} className="border-b border-hairline align-top">
              <td className="py-3 pr-3">{tarih(t.tarih)}{t.tarihTercihi && <div className="text-xs text-ink-muted">Tercih: {t.tarihTercihi}</div>}</td>
              <td className="pr-3">{t.mekanId}</td>
              <td className="pr-3">{t.kisi}</td>
              <td className="pr-3">{t.ad}<div className="text-xs text-ink-muted">{t.iletisim}</div></td>
              <td className="pr-3">{t.erisilebilirlikIhtiyaci || '—'}</td>
              <td>
                <label className="sr-only" htmlFor={`d-${t.id}`}>Durum</label>
                <select id={`d-${t.id}`} className="girdi min-h-0 py-1.5" value={t.durum} onChange={(e) => api.admin.talepDurum(t.id, e.target.value).then(yenile)}>
                  {TALEP_DURUM.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
