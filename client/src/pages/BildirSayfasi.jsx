import React from 'react';
import { BildirimFormu } from '../components/mekan/Formlar.jsx';
import Simge from '../components/common/Simge.jsx';

/** Sahadan, mekana bağlı olmayan konumlu bildirim (kırık rampa, kapalı kaldırım, tehlikeli geçiş…). */
export default function BildirSayfasi() {
  return (
    <div className="anim-page mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <p className="eyebrow">Sahadan bildir</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Yolda bir engel mi gördün?</h1>
      <p className="mt-2 text-ink-muted">
        Kırık rampa, kapalı kaldırım, çalışmayan asansör… Fotoğrafını çek, konumunu ekle; ekibimiz inceleyip rotaları ve erişilebilirlik bilgilerini güncellesin.
      </p>
      <ul className="mb-6 mt-4 grid gap-2 p-0 text-[13px] text-ink-muted [list-style:none]">
        <li className="flex items-center gap-2"><Simge ad="lock" className="text-success" />Konumun yalnızca yönetim ekibine görünür.</li>
        <li className="flex items-center gap-2"><Simge ad="photo_camera" className="text-success" />Fotoğraftaki konum ve cihaz bilgisi gönderilmeden silinir.</li>
      </ul>
      <div className="panel">
        <BildirimFormu mekan={null} />
      </div>
    </div>
  );
}
