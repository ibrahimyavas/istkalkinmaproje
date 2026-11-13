import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import AnaSayfa from './pages/AnaSayfa.jsx';
import Yukleniyor from './components/common/Yukleniyor.jsx';

// Harita ve grafik kütüphaneleri ağır; ilk açılışı hızlı tutmak için tembel yüklenir.
const SemtSayfasi = lazy(() => import('./pages/SemtSayfasi.jsx'));
const RotaSayfasi = lazy(() => import('./pages/RotaSayfasi.jsx'));
const MekanSayfasi = lazy(() => import('./pages/MekanSayfasi.jsx'));
const AtolyelerSayfasi = lazy(() => import('./pages/AtolyelerSayfasi.jsx'));
const EtkinliklerSayfasi = lazy(() => import('./pages/EtkinliklerSayfasi.jsx'));
const EtkinlikSayfasi = lazy(() => import('./pages/EtkinlikSayfasi.jsx'));
const PasaportSayfasi = lazy(() => import('./pages/PasaportSayfasi.jsx'));
const DamgaSayfasi = lazy(() => import('./pages/DamgaSayfasi.jsx'));
const KesfetSayfasi = lazy(() => import('./pages/KesfetSayfasi.jsx'));
const PlanSayfasi = lazy(() => import('./pages/PlanSayfasi.jsx'));
const GruplarSayfasi = lazy(() => import('./pages/GruplarSayfasi.jsx'));
const GrupAcSayfasi = lazy(() => import('./pages/GrupAcSayfasi.jsx'));
const GrupSayfasi = lazy(() => import('./pages/GrupSayfasi.jsx'));
const BildirSayfasi = lazy(() => import('./pages/BildirSayfasi.jsx'));
const YazdirSayfasi = lazy(() => import('./pages/YazdirSayfasi.jsx'));
const UzmanSayfasi = lazy(() => import('./pages/uzman/UzmanSayfasi.jsx'));
const AdminSayfasi = lazy(() => import('./pages/admin/AdminSayfasi.jsx'));
const BulunamadiSayfasi = lazy(() => import('./pages/BulunamadiSayfasi.jsx'));

export default function App() {
  // Yazdırma sayfaları menü ve alt bilgi olmadan, sade gösterilir.
  const yazdir = useLocation().pathname.endsWith('/yazdir');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#icerik" className="btn-ana sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">
        İçeriğe geç
      </a>
      {!yazdir && <Navbar />}
      <main id="icerik" className="flex-1">
        <Suspense fallback={<Yukleniyor />}>
          <Routes>
            <Route path="/" element={<AnaSayfa />} />
            <Route path="/semt/:id" element={<SemtSayfasi />} />
            <Route path="/rota/:id" element={<RotaSayfasi />} />
            <Route path="/rota/:id/yazdir" element={<YazdirSayfasi tur="rota" />} />
            <Route path="/mekan/:id" element={<MekanSayfasi />} />
            <Route path="/atolyeler" element={<AtolyelerSayfasi />} />
            <Route path="/etkinlikler" element={<EtkinliklerSayfasi />} />
            <Route path="/etkinlik/:id" element={<EtkinlikSayfasi />} />
            <Route path="/pasaport" element={<PasaportSayfasi />} />
            <Route path="/damga/:kod" element={<DamgaSayfasi />} />
            <Route path="/kesfet" element={<KesfetSayfasi />} />
            <Route path="/plan/:id" element={<PlanSayfasi />} />
            <Route path="/plan/:id/yazdir" element={<YazdirSayfasi tur="plan" />} />
            <Route path="/gruplar" element={<GruplarSayfasi />} />
            <Route path="/gruplar/yeni" element={<GrupAcSayfasi />} />
            <Route path="/grup/:id" element={<GrupSayfasi />} />
            <Route path="/bildir" element={<BildirSayfasi />} />
            <Route path="/uzman/*" element={<UzmanSayfasi />} />
            <Route path="/admin/*" element={<AdminSayfasi />} />
            <Route path="*" element={<BulunamadiSayfasi />} />
          </Routes>
        </Suspense>
      </main>
      {!yazdir && <Footer />}
    </div>
  );
}
