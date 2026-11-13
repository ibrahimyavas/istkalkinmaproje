import React, { useEffect, useId, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';
import Simge from '../../components/common/Simge.jsx';
import { ZANAAT } from '../../lib/harita.js';

const UZMANLIK = { ...ZANAAT, rehber: 'Kültür rehberi', diger: 'Diğer' };
const ETKINLIK_TURU = { atolye: 'Atölye', yuruyus: 'Yürüyüş', konser: 'Konser', edebiyat: 'Edebiyat', soylesi: 'Söyleşi', sergi: 'Sergi', tiyatro: 'Tiyatro', festival: 'Festival' };
const tarihYaz = (iso) => new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });

function Alan({ etiket, ipucu, children }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="etiket">{etiket}</label>
      {React.cloneElement(children, { id })}
      {ipucu && <p className="mb-0 mt-1 text-xs text-ink-faint">{ipucu}</p>}
    </div>
  );
}

function Basvuru() {
  const mekanlar = useApi(() => api.mekanlar({ tur: 'atolye' }), []);
  const [f, setF] = useState({ ad: '', uzmanlik: 'cini', atolyeAdi: '', mekanId: '', iletisim: '', aciklama: '', kurallarKabul: false });
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, tamam: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null, tamam: false });
    try {
      await api.uzman.basvuru({ ...f, mekanId: f.mekanId || undefined });
      setDurum({ gonderiliyor: false, hata: null, tamam: true });
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), tamam: false });
    }
  };

  if (durum.tamam) {
    return (
      <div className="panel">
        <h1 className="m-0 font-display text-2xl font-bold">Başvurunuz alındı</h1>
        <p className="mb-0 mt-2 text-ink-muted">Ekibimiz başvurunuzu inceledikten sonra size verdiğiniz iletişim bilgisiyle ulaşacak ve panel erişim anahtarınızı iletecek.</p>
      </div>
    );
  }

  return (
    <form onSubmit={gonder} className="panel grid gap-4" noValidate>
      <div>
        <h1 className="m-0 font-display text-2xl font-bold">Uzman başvurusu</h1>
        <p className="mb-0 mt-1 text-ink-muted">Zanaat ustaları, atölye sahipleri ve kültür rehberleri Proje 404'te kendi atölye ve etkinliklerini yayınlayabilir.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Alan etiket="Adınız"><input className="girdi" value={f.ad} onChange={set('ad')} maxLength={80} autoComplete="name" /></Alan>
        <Alan etiket="Uzmanlık alanı">
          <select className="girdi" value={f.uzmanlik} onChange={set('uzmanlik')}>
            {Object.entries(UZMANLIK).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Atölye / kurum adı"><input className="girdi" value={f.atolyeAdi} onChange={set('atolyeAdi')} maxLength={100} /></Alan>
        <Alan etiket="Haritadaki atölyeniz (varsa)">
          <select className="girdi" value={f.mekanId} onChange={set('mekanId')}>
            <option value="">Listede yok</option>
            {(mekanlar.veri || []).map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
          </select>
        </Alan>
        <div className="sm:col-span-2"><Alan etiket="E-posta ya da telefon" ipucu="Yalnızca yönetim ekibi görür."><input className="girdi" value={f.iletisim} onChange={set('iletisim')} maxLength={120} autoComplete="email" /></Alan></div>
        <div className="sm:col-span-2"><Alan etiket="Kendinizi ve atölyenizi anlatın"><textarea className="girdi min-h-[120px]" value={f.aciklama} onChange={set('aciklama')} maxLength={1500} /></Alan></div>
      </div>
      <label className="flex items-start gap-3 text-[13px]">
        <input type="checkbox" className="mt-0.5 h-5 w-5" checked={f.kurallarKabul} onChange={set('kurallarKabul')} />
        <span>Verdiğim bilgilerin doğru olduğunu ve etkinliklerimde katılımcı güvenliğini ve erişilebilirlik bilgilerini doğru paylaşacağımı kabul ediyorum.</span>
      </label>
      {durum.hata && <p role="alert" className="m-0 font-semibold text-danger">{durum.hata}</p>}
      <div><button type="submit" className="btn-ana" disabled={!f.kurallarKabul || durum.gonderiliyor}><Simge ad="send" />{durum.gonderiliyor ? 'Gönderiliyor…' : 'Başvur'}</button></div>
    </form>
  );
}

// datetime-local değeri (yerel saat)
const yerelDeger = (iso) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3 * 864e5);
  if (!iso) d.setHours(14, 0, 0, 0);
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

function EtkinlikFormu({ mevcut, mekanlar, onBitti, onVazgec }) {
  const [f, setF] = useState(() => ({
    baslik: mevcut?.baslik || '', tur: mevcut?.tur || 'atolye', aciklama: mevcut?.aciklama || '',
    baslangic: yerelDeger(mevcut?.baslangic), sureDk: mevcut?.sureDk || 90, kapasite: mevcut?.kapasite || 8,
    ucret: mevcut?.ucret || '', mekanId: mevcut?.mekanId || '', konumAd: mevcut?.konumAd || '', erisilebilir: Boolean(mevcut?.erisilebilir),
  }));
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null });
    const govde = {
      ...f, sureDk: Number(f.sureDk), kapasite: Number(f.kapasite), baslangic: new Date(f.baslangic).toISOString(),
      mekanId: f.mekanId || undefined, konumAd: f.mekanId ? undefined : f.konumAd,
    };
    try {
      if (mevcut) await api.uzman.etkinlikGuncelle(mevcut.id, govde);
      else await api.uzman.etkinlikOlustur(govde);
      onBitti();
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err) });
    }
  };

  return (
    <form onSubmit={gonder} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><Alan etiket="Başlık"><input className="girdi" value={f.baslik} onChange={set('baslik')} maxLength={100} placeholder="ör. Lale motifli çini boyama" /></Alan></div>
      <Alan etiket="Tür"><select className="girdi" value={f.tur} onChange={set('tur')}>{Object.entries(ETKINLIK_TURU).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}</select></Alan>
      <Alan etiket="Tarih ve saat"><input className="girdi" type="datetime-local" value={f.baslangic} onChange={set('baslangic')} /></Alan>
      <Alan etiket="Süre (dakika)"><input className="girdi" type="number" min="15" max="720" value={f.sureDk} onChange={set('sureDk')} /></Alan>
      <Alan etiket="Kontenjan"><input className="girdi" type="number" min="1" max="50" value={f.kapasite} onChange={set('kapasite')} /></Alan>
      <Alan etiket="Ücret" ipucu="Boş bırakırsanız ücretsiz görünür."><input className="girdi" value={f.ucret} onChange={set('ucret')} maxLength={40} placeholder="ör. 750 TL" /></Alan>
      <Alan etiket="Yer">
        <select className="girdi" value={f.mekanId} onChange={set('mekanId')}>
          <option value="">Listede olmayan bir yer</option>
          {mekanlar.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
        </select>
      </Alan>
      {!f.mekanId && <div className="sm:col-span-2"><Alan etiket="Yerin adı ve tarifi"><input className="girdi" value={f.konumAd} onChange={set('konumAd')} maxLength={120} placeholder="ör. Balat İskelesi önü" /></Alan></div>}
      <div className="sm:col-span-2"><Alan etiket="Açıklama"><textarea className="girdi min-h-[110px]" value={f.aciklama} onChange={set('aciklama')} maxLength={1500} placeholder="Ne yapılacak, malzemeler dahil mi, kimler için uygun…" /></Alan></div>
      <label className="flex items-center gap-3 font-semibold sm:col-span-2">
        <input type="checkbox" className="h-5 w-5" checked={f.erisilebilir} onChange={set('erisilebilir')} />
        Tekerlekli sandalye ile erişilebilir (basamaksız giriş, uygun WC)
      </label>
      {durum.hata && <p role="alert" className="m-0 font-semibold text-danger sm:col-span-2">{durum.hata}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn-ana" disabled={durum.gonderiliyor}><Simge ad="save" />{mevcut ? 'Kaydet' : 'Yayınla'}</button>
        <button type="button" className="btn-ikincil" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

function Panel({ onCikis }) {
  const ben = useApi(() => api.uzman.ben(), []);
  const etk = useApi(() => api.uzman.etkinlikler(), []);
  const katilim = useApi(() => api.uzman.katilimlar(), []);
  const mekanlar = useApi(() => api.mekanlar(), []);
  const [duzenlenen, setDuzenlenen] = useState(null); // null | 'yeni' | etkinlik

  const yenile = () => { setDuzenlenen(null); etk.yenile(); katilim.yenile(); };
  const iptal = async (e) => {
    if (!window.confirm(`"${e.baslik}" iptal edilsin mi? Kayıtlı katılımcılara sizin haber vermeniz gerekir.`)) return;
    await api.uzman.etkinlikIptal(e.id);
    yenile();
  };

  if (ben.yukleniyor) return <Yukleniyor />;
  if (ben.hata) return <HataKutusu metin={ben.hata} yenile={ben.yenile} />;
  const u = ben.veri.uzman || ben.veri;

  return (
    <div className="grid gap-6">
      <div className="panel flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-fill text-on-fill"><Simge ad="workspace_premium" boyut={26} /></span>
          <div>
            <h1 className="m-0 font-display text-xl font-bold">{u.ad}</h1>
            <p className="m-0 text-ink-faint">{UZMANLIK[u.uzmanlik] || u.uzmanlik} · {u.atolyeAdi}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ana" onClick={() => setDuzenlenen('yeni')}><Simge ad="add" />Yeni etkinlik</button>
          <button type="button" className="btn-ikincil" onClick={onCikis}><Simge ad="logout" />Çıkış</button>
        </div>
      </div>

      {duzenlenen && (
        <section className="panel" aria-labelledby="form-baslik">
          <h2 id="form-baslik" className="mb-4 mt-0 font-display text-lg font-bold">{duzenlenen === 'yeni' ? 'Yeni etkinlik / workshop' : 'Etkinliği düzenle'}</h2>
          <EtkinlikFormu mevcut={duzenlenen === 'yeni' ? null : duzenlenen} mekanlar={mekanlar.veri || []} onBitti={yenile} onVazgec={() => setDuzenlenen(null)} />
        </section>
      )}

      <section aria-labelledby="etk-baslik">
        <h2 id="etk-baslik" className="baslik-nokta mb-3 mt-0 font-display text-xl font-semibold">Etkinliklerim</h2>
        {etk.yukleniyor && <Yukleniyor />}
        {etk.veri && etk.veri.length === 0 && <p className="text-ink-faint">Henüz etkinlik yok. "Yeni etkinlik" ile ilk workshop'unuzu yayınlayın.</p>}
        <ul className="m-0 grid list-none gap-3 p-0">
          {(etk.veri || []).map((e) => (
            <li key={e.id} className="kart flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="m-0 font-display text-base font-bold text-heading">{e.baslik}</p>
                <p className="m-0 text-[13px] text-ink-faint">{tarihYaz(e.baslangic)} · {e.sureDk} dk · {e.kapasite} kişi · {e.ucret || 'Ücretsiz'}</p>
              </div>
              {e.durum === 'iptal' ? (
                <span className="rounded-md bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">İptal edildi</span>
              ) : (
                <div className="flex gap-2">
                  <Link to={`/etkinlik/${e.id}`} className="btn-ikincil">Görüntüle</Link>
                  <button type="button" className="btn-ikincil" onClick={() => setDuzenlenen(e)}><Simge ad="edit" />Düzenle</button>
                  <button type="button" className="btn-ikincil text-danger" onClick={() => iptal(e)}>İptal et</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="kat-baslik">
        <h2 id="kat-baslik" className="baslik-nokta mb-3 mt-0 font-display text-xl font-semibold">Gelen kayıtlar</h2>
        {katilim.veri && katilim.veri.length === 0 && <p className="text-ink-faint">Henüz kayıt yok.</p>}
        {katilim.veri?.length > 0 && (
          <div className="overflow-x-auto rounded-[14px] border border-hairline bg-surface">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-hairline text-ink-faint">
                <tr><th className="p-3">Etkinlik</th><th className="p-3">Ad</th><th className="p-3">İletişim</th><th className="p-3">Kişi</th><th className="p-3">Erişilebilirlik ihtiyacı</th></tr>
              </thead>
              <tbody>
                {katilim.veri.map((k) => (
                  <tr key={k.id} className="border-b border-hairline-subtle last:border-0">
                    <td className="p-3">{k.etkinlikBaslik || k.etkinlikId}</td>
                    <td className="p-3">{k.ad}</td>
                    <td className="p-3">{k.iletisim}</td>
                    <td className="p-3">{k.kisi}</td>
                    <td className="p-3">{k.erisilebilirlikIhtiyaci || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function GirisVeyaPanel() {
  const [oturum, setOturum] = useState(null);
  const [anahtar, setAnahtar] = useState('');
  const [hata, setHata] = useState(null);
  const kontrol = () => api.uzman.oturum().then((o) => setOturum(o.girisYapildi)).catch(() => setOturum(false));
  useEffect(() => { kontrol(); }, []);

  if (oturum === null) return <Yukleniyor />;
  if (oturum) return <Panel onCikis={() => api.uzman.cikis().then(() => setOturum(false))} />;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setHata(null);
          try {
            await api.uzman.giris(anahtar.trim());
            setAnahtar('');
            kontrol();
          } catch (err) {
            setHata(hataMesaji(err));
          }
        }}
      >
        <h1 className="m-0 font-display text-2xl font-bold">Uzman paneli</h1>
        <p className="mb-4 mt-1 text-ink-muted">Onaylı uzmanlar, yönetim ekibinin ilettiği erişim anahtarıyla giriş yapar.</p>
        <label htmlFor="anahtar" className="etiket">Erişim anahtarı</label>
        <input id="anahtar" type="password" autoComplete="off" className="girdi font-mono" value={anahtar} onChange={(e) => setAnahtar(e.target.value)} />
        {hata && <p role="alert" className="mb-0 mt-2 font-semibold text-danger">{hata}</p>}
        <button type="submit" className="btn-ana mt-4 w-full" disabled={!anahtar.trim()}>Giriş yap</button>
      </form>
      <div className="panel">
        <h2 className="m-0 font-display text-lg font-bold">Usta mısınız, atölyeniz mi var?</h2>
        <p className="mb-4 mt-1 text-ink-muted">Başvurun; onaylandıktan sonra kendi workshop ve etkinliklerinizi takvime ekleyip kayıtları buradan takip edin.</p>
        <Link to="/uzman/basvuru" className="btn-koyu">Uzman başvurusu yap</Link>
      </div>
    </div>
  );
}

export default function UzmanSayfasi() {
  return (
    <div className="anim-page mx-auto w-full max-w-sayfa flex-1 px-4 py-8 sm:px-8">
      <Routes>
        <Route index element={<GirisVeyaPanel />} />
        <Route path="basvuru" element={<div className="mx-auto max-w-3xl"><Basvuru /></div>} />
      </Routes>
    </div>
  );
}
