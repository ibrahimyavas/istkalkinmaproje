import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const renk = (v) => `rgb(var(--${v}))`;

/** Rotanın yükseklik profili (Valhalla /height çıktısı). */
export default function EgimProfili({ profil, ozet, merdivenM }) {
  if (!profil?.length) return null;
  const veri = profil.map((p) => ({ km: +(p.mesafeM / 1000).toFixed(2), m: p.yukseklikM }));
  // Kıyıda yükseklik verisi (SRTM) deniz seviyesinin biraz altını gösterebilir.
  const enAlt = Math.max(0, Math.min(...veri.map((v) => v.m)));
  const enUst = Math.max(...veri.map((v) => v.m));

  return (
    <section className="kart p-4" aria-labelledby="egim-baslik">
      <h2 id="egim-baslik" className="font-body text-lg font-bold">Yükseklik profili</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {enAlt.toFixed(0)} m ile {enUst.toFixed(0)} m arası
        {ozet && <> · toplam çıkış {ozet.toplamCikisM} m · en dik kesit %{ozet.azamiEgimYuzde}</>}
        {merdivenM != null && <> · merdiven {merdivenM} m</>}
      </p>
      <div className="mt-3 h-40" role="img" aria-label={`Yükseklik ${enAlt.toFixed(0)} ile ${enUst.toFixed(0)} metre arasında değişiyor`}>
        <ResponsiveContainer>
          <AreaChart data={veri} margin={{ left: -20, right: 8, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline) / 0.12)" />
            <XAxis dataKey="km" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11, fill: renk('ink-muted') }} unit=" km" />
            <YAxis dataKey="m" tick={{ fontSize: 11, fill: renk('ink-muted') }} unit=" m" domain={[Math.floor(enAlt - 5), Math.ceil(enUst + 5)]} />
            <Tooltip
              formatter={(v) => [`${v} m`, 'Yükseklik']}
              labelFormatter={(km) => `${km} km`}
              contentStyle={{ background: renk('surface'), border: '1px solid rgb(var(--hairline) / 0.2)' }}
            />
            <Area type="monotone" dataKey="m" stroke={renk('accent')} fill={renk('accent')} fillOpacity={0.18} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
