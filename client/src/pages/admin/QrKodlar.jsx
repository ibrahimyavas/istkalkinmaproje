import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';

/** Her mekan için /damga/:kod adresine giden yazdırılabilir QR kodlar. */
export default function QrKodlar() {
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.liste('mekanlar'), []);
  const [kodlar, setKodlar] = useState({});
  const kok = window.location.origin;

  useEffect(() => {
    if (!veri) return;
    Promise.all(
      veri
        .filter((m) => m.damgaKodu)
        .map(async (m) => [m.id, await QRCode.toDataURL(`${kok}/damga/${m.damgaKodu}`, { margin: 1, width: 240 })]),
    ).then((list) => setKodlar(Object.fromEntries(list)));
  }, [veri, kok]);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-ink-muted">QR kodlar <span className="font-mono">{kok}</span> adresine göre üretilir; canlı adreste yeniden yazdırın.</p>
        <button type="button" className="btn-ana" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Yazdır</button>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {veri.filter((m) => m.damgaKodu).map((m) => (
          <li key={m.id} className="kart break-inside-avoid p-3 text-center">
            {kodlar[m.id] ? <img src={kodlar[m.id]} alt={`${m.ad} damga QR kodu`} className="mx-auto w-full max-w-[180px] bg-white p-1" /> : <div className="aspect-square" />}
            <p className="mt-2 text-sm font-semibold leading-snug">{m.ad}</p>
            <p className="font-mono text-xs text-ink-muted">{m.damgaKodu}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
