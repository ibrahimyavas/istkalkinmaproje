import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Stamp } from 'lucide-react';
import { api, hataMesaji } from '../services/api.js';
import { damgaEkle, damgalariOku, ROZET_ESIGI } from '../lib/pasaport.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';

/** QR kodun açtığı sayfa: /damga/:kod */
export default function DamgaSayfasi() {
  const { kod } = useParams();
  const [durum, setDurum] = useState({ yukleniyor: true });
  const calisti = useRef(false);

  useEffect(() => {
    if (calisti.current) return; // StrictMode çift çalıştırmasında iki kez damgalama
    calisti.current = true;
    api
      .damga(kod)
      .then(({ mekan, semt }) => {
        const yeni = damgaEkle({ mekanId: mekan.id, mekanAd: mekan.ad, semtId: semt.id, semtAd: semt.ad });
        const semtteki = damgalariOku().filter((d) => d.semtId === semt.id).length;
        setDurum({ mekan, semt, yeni, semtteki });
      })
      .catch((err) => setDurum({ hata: hataMesaji(err) }));
  }, [kod]);

  if (durum.yukleniyor) return <Yukleniyor metin="Damga kontrol ediliyor…" />;
  if (durum.hata) return <HataKutusu metin={durum.hata} />;

  const { mekan, semt, yeni, semtteki } = durum;
  const rozet = yeni && semtteki === ROZET_ESIGI;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <motion.div
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="mx-auto grid h-36 w-36 place-items-center rounded-full border-4 border-lale text-lale"
        aria-hidden="true"
      >
        <Stamp size={56} />
      </motion.div>
      <h1 className="mt-6 text-3xl font-bold" role="status">
        {yeni ? 'Damga eklendi!' : 'Bu damga zaten pasaportunuzda'}
      </h1>
      <p className="mt-2 text-lg">{mekan.ad}</p>
      <p className="text-ink-muted">{semt.ad}</p>
      {rozet && <p className="mt-4 rounded-xl bg-accent-soft p-3 font-semibold text-accent">Tebrikler, {semt.ad} rozetini kazandınız!</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/pasaport" className="btn-ana">Pasaportuma git</Link>
        <Link to={`/mekan/${mekan.id}`} className="btn-ikincil">Mekan sayfası</Link>
      </div>
    </div>
  );
}
