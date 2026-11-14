import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';

const KPI = [
  ['rotaGoruntuleme', 'Rota görüntüleme'],
  ['erisilebilirRota', 'Erişilebilir rota kullanımı'],
  ['sesliRehber', 'Sesli rehber başlatma'],
  ['damga', 'Pasaport damgası'],
  ['atolyeTalebi', 'Atölye talebi'],
  ['onayliBildirim', 'Onaylanan bildirim'],
  ['kesfetBegeni', 'Keşfet: "giderim" kararı'],
  ['planOlusturma', 'Oluşturulan kişisel rota'],
  ['grupOlusturma', 'Açılan gezinti grubu'],
  ['grubaKatilim', 'Gruplara katılım'],
  ['fotoYukleme', 'Yüklenen fotoğraf'],
  ['uzmanBasvuru', 'Uzman başvurusu'],
  ['etkinlikKaydi', 'Etkinlik kaydı'],
];

const renk = (v) => `rgb(var(--${v}))`;

export default function Gostergeler() {
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.gostergeler(), []);
  const [demo, setDemo] = useState(false);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  const g = demo ? veri.demo : veri.gercek;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Veri kaynağı" className="flex gap-1 rounded-xl bg-surface-raised p-1">
          <button type="button" aria-pressed={!demo} onClick={() => setDemo(false)} className={!demo ? 'btn-ana' : 'btn px-4 text-ink-muted'}>Gerçek veri</button>
          <button type="button" aria-pressed={demo} onClick={() => setDemo(true)} className={demo ? 'btn-ana' : 'btn px-4 text-ink-muted'}>Örnek görünüm</button>
        </div>
        <button type="button" className="btn-ikincil" onClick={yenile}>Yenile</button>
      </div>

      {demo && (
        <p role="note" className="mt-4 flex items-start gap-2 rounded-xl border-2 border-warning bg-warning/10 p-3 font-semibold text-warning">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          DEMO VERİSİ — Bu sayılar yalnızca panelin dolu halini göstermek içindir. Başvuruda gerçek veri olarak kullanılmamalıdır.
        </p>
      )}
      {!demo && <p className="mt-4 text-sm text-ink-muted">Bu demo sunucusunda kaydedilen gerçek kullanım verisi.</p>}

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KPI.map(([k, ad]) => (
          <div key={k} className="kart p-4">
            <dt className="eyebrow">{ad}</dt>
            <dd className="mt-2 text-3xl font-bold tabular-nums">{g[k].toLocaleString('tr-TR')}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="kart p-4" aria-labelledby="g-semt">
          <h2 id="g-semt" className="font-body text-lg font-bold">Semtlere göre dağılım</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer>
              <BarChart data={g.semtDagilimi} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline) / 0.12)" />
                <XAxis dataKey="ad" tick={{ fontSize: 11, fill: renk('ink-muted') }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: renk('ink-muted') }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: renk('surface'), border: '1px solid rgb(var(--hairline) / 0.2)' }} />
                <Legend />
                <Bar dataKey="ziyaret" name="Rota görüntüleme" fill={renk('accent')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="damga" name="Damga" fill={renk('lale')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="kart p-4" aria-labelledby="g-gun">
          <h2 id="g-gun" className="font-body text-lg font-bold">Günlük etkileşim</h2>
          <div className="mt-3 h-72">
            {g.gunluk.length === 0 ? (
              <p className="text-ink-muted">Henüz veri yok.</p>
            ) : (
              <ResponsiveContainer>
                <LineChart data={g.gunluk} margin={{ left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline) / 0.12)" />
                  <XAxis dataKey="gun" tick={{ fontSize: 11, fill: renk('ink-muted') }} />
                  <YAxis tick={{ fontSize: 11, fill: renk('ink-muted') }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: renk('surface'), border: '1px solid rgb(var(--hairline) / 0.2)' }} />
                  <Line type="monotone" dataKey="adet" name="Etkileşim" stroke={renk('accent')} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
