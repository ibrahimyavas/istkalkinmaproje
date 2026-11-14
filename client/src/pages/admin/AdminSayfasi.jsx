import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BarChart3, Inbox, ClipboardList, FileText, QrCode, Settings, LogOut, KeyRound, Users, Camera, BadgeCheck, Star } from 'lucide-react';
import Fotograflar from './Fotograflar.jsx';
import Yorumlar from './Yorumlar.jsx';
import Uzmanlar from './Uzmanlar.jsx';
import clsx from 'clsx';
import { api, hataMesaji } from '../../services/api.js';
import Yukleniyor from '../../components/common/Yukleniyor.jsx';
import Gostergeler from './Gostergeler.jsx';
import { Bildirimler, Talepler, Gruplar } from './Gelenler.jsx';
import Icerik from './Icerik.jsx';
import QrKodlar from './QrKodlar.jsx';
import Ayarlar from './Ayarlar.jsx';

const SEKMELER = [
  { to: 'gostergeler', ad: 'Etki göstergeleri', ikon: BarChart3 },
  { to: 'bildirimler', ad: 'Bildirimler', ikon: Inbox },
  { to: 'talepler', ad: 'Atölye talepleri', ikon: ClipboardList },
  { to: 'gruplar', ad: 'Gruplar', ikon: Users },
  { to: 'yorumlar', ad: 'Yorumlar', ikon: Star },
  { to: 'fotograflar', ad: 'Fotoğraflar', ikon: Camera },
  { to: 'uzmanlar', ad: 'Uzmanlar', ikon: BadgeCheck },
  { to: 'icerik', ad: 'İçerik', ikon: FileText },
  { to: 'qr', ad: 'QR kodlar', ikon: QrCode },
  { to: 'ayarlar', ad: 'Ayarlar', ikon: Settings },
];

function Giris({ onGiris }) {
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState(null);
  const gonder = async (e) => {
    e.preventDefault();
    setHata(null);
    try {
      await api.admin.giris(parola);
      onGiris();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };
  return (
    <form onSubmit={gonder} className="kart mx-auto mt-16 max-w-sm p-6">
      <KeyRound className="text-accent" aria-hidden="true" />
      <h1 className="mt-3 text-2xl font-bold">Yönetim paneli</h1>
      <label htmlFor="parola" className="etiket mt-5">Parola</label>
      <input id="parola" type="password" className="girdi" value={parola} onChange={(e) => setParola(e.target.value)} autoComplete="current-password" />
      {hata && <p role="alert" className="mt-2 font-semibold text-danger">{hata}</p>}
      <button type="submit" className="btn-ana mt-5 w-full">Giriş yap</button>
    </form>
  );
}

export default function AdminSayfasi() {
  const [oturum, setOturum] = useState(null);

  const kontrol = () => api.admin.oturum().then((o) => setOturum(o.girisYapildi)).catch(() => setOturum(false));
  useEffect(() => {
    kontrol();
  }, []);

  if (oturum === null) return <Yukleniyor />;
  if (!oturum) return <Giris onGiris={kontrol} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Yönetim paneli</h1>
        <button type="button" className="btn-ikincil" onClick={() => api.admin.cikis().then(() => setOturum(false))}>
          <LogOut size={16} aria-hidden="true" /> Çıkış
        </button>
      </div>
      <nav aria-label="Yönetim sekmeleri" className="mt-6 flex gap-1 overflow-x-auto border-b border-hairline">
        {SEKMELER.map(({ to, ad, ikon: Ikon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 font-semibold', isActive ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink')
            }
          >
            <Ikon size={16} aria-hidden="true" /> {ad}
          </NavLink>
        ))}
      </nav>
      <div className="pt-6">
        <Routes>
          <Route index element={<Navigate to="gostergeler" replace />} />
          <Route path="gostergeler" element={<Gostergeler />} />
          <Route path="bildirimler" element={<Bildirimler />} />
          <Route path="talepler" element={<Talepler />} />
          <Route path="gruplar" element={<Gruplar />} />
          <Route path="yorumlar" element={<Yorumlar />} />
          <Route path="fotograflar" element={<Fotograflar />} />
          <Route path="uzmanlar" element={<Uzmanlar />} />
          <Route path="icerik" element={<Icerik />} />
          <Route path="qr" element={<QrKodlar />} />
          <Route path="ayarlar" element={<Ayarlar />} />
        </Routes>
      </div>
    </div>
  );
}
