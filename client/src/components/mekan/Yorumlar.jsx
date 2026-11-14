import React, { useId, useState } from 'react';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Simge from '../common/Simge.jsx';
import { FotoSecici } from '../foto/FotoAlanlari.jsx';

const SIKAYET = [['hakaret', 'Hakaret ya da nefret söylemi'], ['spam', 'Reklam / spam'], ['yanlis-bilgi', 'Yanlış bilgi'], ['kisisel-bilgi', 'Kişisel bilgi içeriyor'], ['diger', 'Diğer']];

/** Salt okunur yıldız gösterimi; ekran okuyucuya sayı olarak okunur. */
export function Yildizlar({ puan, boyut = 18 }) {
  return (
    <span className="inline-flex items-center text-accent" role="img" aria-label={`5 üzerinden ${puan}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Simge key={i} ad="star" boyut={boyut} className={i <= Math.round(puan) ? '' : 'text-ink-faint/40'} style={{ fontVariationSettings: `'FILL' ${i <= Math.round(puan) ? 1 : 0}` }} />
      ))}
    </span>
  );
}

/** Puan seçimi: gerçek radyo düğmeleri (klavyede ok tuşlarıyla çalışır). */
function PuanSecici({ deger, onDegis }) {
  const ad = useId();
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="etiket">Puanınız</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer">
            <input type="radio" name={ad} value={i} checked={deger === i} onChange={() => onDegis(i)} className="peer sr-only" />
            <span className="flex h-11 w-11 items-center justify-center rounded-lg text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              <Simge ad="star" boyut={30} className={i <= deger ? '' : 'text-ink-faint/50'} style={{ fontVariationSettings: `'FILL' ${i <= deger ? 1 : 0}` }} />
              <span className="sr-only">{i} yıldız</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function YorumFormu({ mekanId }) {
  const [f, setF] = useState({ puan: 0, rumuz: '', metin: '', kurallarKabul: false, web: '' });
  const [foto, setFoto] = useState(null);
  const [fotoIzin, setFotoIzin] = useState(false);
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, tamam: false });

  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null, tamam: false });
    try {
      let fotoId;
      if (foto) {
        // Fotoğraf da bekleyen olarak yüklenir; yorum onaylanınca birlikte yayınlanır.
        fotoId = (await api.fotoYukle({ mekanId, dosya: foto.dataUrl, ad: f.rumuz, izin: fotoIzin })).id;
      }
      await api.yorumGonder(mekanId, { ...f, fotoId });
      setDurum({ gonderiliyor: false, hata: null, tamam: true });
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), tamam: false });
    }
  };

  if (durum.tamam) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-[14px] bg-success/10 p-4 font-semibold text-success">
        <Simge ad="check_circle" boyut={20} />Teşekkürler! Yorumunuz incelendikten sonra yayınlanacak.
      </p>
    );
  }

  const eksik = !f.puan || f.rumuz.trim().length < 2 || f.metin.trim().length < 10 || !f.kurallarKabul || (foto && !fotoIzin);

  return (
    <form onSubmit={gonder} className="grid gap-4" noValidate>
      <PuanSecici deger={f.puan} onDegis={(puan) => setF({ ...f, puan })} />
      <div>
        <label htmlFor="yorum-metin" className="etiket">Yorumunuz</label>
        <textarea id="yorum-metin" className="girdi min-h-[110px]" maxLength={1000} value={f.metin} onChange={(e) => setF({ ...f, metin: e.target.value })} aria-describedby="yorum-metin-ipucu" />
        <p id="yorum-metin-ipucu" className="mb-0 mt-1 text-xs text-ink-faint">En az 10 karakter. Erişim, kalabalık, en iyi saat gibi işe yarar ayrıntılar yazın. E-posta ya da telefon yazmayın.</p>
      </div>
      <div>
        <label htmlFor="yorum-rumuz" className="etiket">Rumuz</label>
        <input id="yorum-rumuz" className="girdi" maxLength={30} value={f.rumuz} onChange={(e) => setF({ ...f, rumuz: e.target.value })} autoComplete="nickname" />
      </div>
      {/* Bal küpü: ekranda ve ekran okuyucuda görünmez. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="yorum-web">Web sitesi</label>
        <input id="yorum-web" tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => setF({ ...f, web: e.target.value })} />
      </div>
      <FotoSecici deger={foto} onDegis={setFoto} />
      {foto && (
        <label className="flex items-start gap-3 text-[13px]">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={fotoIzin} onChange={(e) => setFotoIzin(e.target.checked)} />
          <span>Fotoğrafı ben çektim; yayınlanmasına izin veriyorum. Tanınabilir kişiler varsa onların da izni var.</span>
        </label>
      )}
      <label className="flex items-start gap-3 text-[13px]">
        <input type="checkbox" className="mt-0.5 h-5 w-5" checked={f.kurallarKabul} onChange={(e) => setF({ ...f, kurallarKabul: e.target.checked })} />
        <span>Yorumum kendi deneyimime dayanıyor; hakaret, reklam ve kişisel bilgi içermiyor.</span>
      </label>
      {durum.hata && <p role="alert" className="m-0 font-semibold text-danger">{durum.hata}</p>}
      <div>
        <button type="submit" className="btn-ana" disabled={eksik || durum.gonderiliyor}>
          <Simge ad={durum.gonderiliyor ? 'progress_activity' : 'rate_review'} className={durum.gonderiliyor ? 'animate-spin' : ''} />
          {durum.gonderiliyor ? 'Gönderiliyor…' : 'Yorumu gönder'}
        </button>
      </div>
    </form>
  );
}

function SikayetDugmesi({ id }) {
  const [acik, setAcik] = useState(false);
  const [durum, setDurum] = useState(null);
  const bildir = async (neden) => {
    try {
      await api.yorumSikayet(id, neden);
      setDurum('Bildiriminiz alındı.');
    } catch (err) {
      setDurum(hataMesaji(err));
    }
    setAcik(false);
  };
  if (durum) return <span role="status" className="text-xs text-ink-faint">{durum}</span>;
  return (
    <div className="relative">
      <button type="button" aria-expanded={acik} onClick={() => setAcik(!acik)} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-ink-faint hover:text-accent">
        <Simge ad="flag" boyut={16} />Bildir
      </button>
      {acik && (
        <ul className="absolute right-0 z-10 m-0 mt-1 grid w-56 list-none gap-0.5 rounded-[12px] bg-surface p-1 shadow-md">
          {SIKAYET.map(([k, ad]) => (
            <li key={k}>
              <button type="button" onClick={() => bildir(k)} className="w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface-raised">{ad}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Mekan sayfasındaki yorum ve puan bölümü. */
export default function YorumBolumu({ mekan }) {
  const { veri } = useApi(() => api.yorumlar(mekan.id), [mekan.id]);
  const ozet = veri?.ozet;
  const yorumlar = veri?.yorumlar || [];

  return (
    <section aria-labelledby="yorum-baslik" className="mt-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="yorum-baslik" className="m-0 font-display text-xl font-semibold leading-7">Ziyaretçi yorumları</h2>
          {ozet?.sayi > 0 && (
            <p className="m-0 flex items-center gap-2 text-sm">
              <span className="font-display text-2xl font-bold text-heading">{ozet.ortalama.toLocaleString('tr-TR')}</span>
              <Yildizlar puan={ozet.ortalama} />
              <span className="text-ink-faint">({ozet.sayi} yorum)</span>
            </p>
          )}
        </div>
        {yorumlar.length === 0 ? (
          <p className="text-ink-faint">Henüz yorum yok. Buraya gittiyseniz deneyiminizi ilk siz paylaşın.</p>
        ) : (
          <ul className="m-0 mt-3 grid list-none gap-3 p-0">
            {yorumlar.map((y) => (
              <li key={y.id} className="rounded-[14px] bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Yildizlar puan={y.puan} boyut={16} />
                    <span className="text-[13px] font-semibold text-heading">{y.rumuz}</span>
                    <span className="text-xs text-ink-faint">{new Date(y.tarih).toLocaleDateString('tr-TR')}</span>
                  </span>
                  <SikayetDugmesi id={y.id} />
                </div>
                <p className="mb-0 mt-2 whitespace-pre-line text-[14px] leading-[22px]">{y.metin}</p>
                {y.foto && <img src={y.foto.url} alt={`${y.rumuz} tarafından eklenen fotoğraf`} loading="lazy" className="mt-3 h-36 w-auto max-w-full rounded-[10px] object-cover" />}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="panel">
        <h3 className="m-0 font-display text-base font-bold">Yorum yaz</h3>
        <p className="mb-4 mt-1 text-[13px] text-ink-faint">Yorumlar incelendikten sonra yayınlanır.</p>
        <YorumFormu mekanId={mekan.id} />
      </div>
    </section>
  );
}
