import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, hataMesaji } from '../../services/api.js';
import { grupAnahtari } from '../../lib/yerel.js';
import Simge from '../common/Simge.jsx';

const RUMUZ_KEY = 'p404_sohbet_rumuz';

function saatMetni(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function gunMetni(iso) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

/**
 * Grup etkinlikleri için canlı yenilenen sohbet alanı.
 * Hem GrupSayfasi hem de EtkinliklerSayfasi (takvim) içinde kullanılır.
 */
export default function GrupSohbet({ grupId, baslik, iptal = false, kompakt = false }) {
  const [mesajlar, setMesajlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  const [rumuz, setRumuz] = useState(() => {
    try {
      return localStorage.getItem(RUMUZ_KEY) || '';
    } catch {
      return '';
    }
  });
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [formHata, setFormHata] = useState(null);
  const listeRef = useRef(null);

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true);
    try {
      const list = await api.grupMesajlar(grupId);
      setMesajlar(Array.isArray(list) ? list : []);
      setHata(null);
    } catch (err) {
      if (!sessiz) setHata(hataMesaji(err));
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, [grupId]);

  useEffect(() => {
    yukle(false);
    const id = setInterval(() => yukle(true), 8000);
    return () => clearInterval(id);
  }, [yukle]);

  useEffect(() => {
    const el = listeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mesajlar.length]);

  const gonder = async (e) => {
    e.preventDefault();
    setFormHata(null);
    const r = rumuz.trim();
    const m = metin.trim();
    if (r.length < 2) {
      setFormHata('Mesaj yazmak için en az 2 harfli bir rumuz girin.');
      return;
    }
    if (!m) return;
    setGonderiliyor(true);
    try {
      try {
        localStorage.setItem(RUMUZ_KEY, r);
      } catch {
        /* yok say */
      }
      const yeni = await api.grupMesajGonder(grupId, { rumuz: r, metin: m }, grupAnahtari(grupId));
      setMesajlar((prev) => [...prev, yeni]);
      setMetin('');
    } catch (err) {
      setFormHata(hataMesaji(err));
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <section
      aria-label={`${baslik || 'Grup'} sohbeti`}
      className="kart flex flex-col overflow-hidden border border-hairline"
    >
      <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/12 text-accent">
            <Simge ad="forum" boyut={18} />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 truncate font-display text-[15px] font-bold text-heading">
              Grup sohbeti{baslik ? ` · ${baslik}` : ''}
            </h3>
            <p className="m-0 text-[11.5px] text-ink-faint">
              Buluşma saati, hava durumu ve rota notları için
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => yukle(true)}
          title="Mesajları yenile"
          aria-label="Mesajları yenile"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-heading/[.06] text-ink-muted hover:bg-accent-soft hover:text-heading"
        >
          <Simge ad="refresh" boyut={16} />
        </button>
      </header>

      <div
        ref={listeRef}
        className={`atlas-scroll flex-1 space-y-2.5 px-4 py-3 ${kompakt ? 'max-h-[280px] min-h-[180px]' : 'max-h-[360px] min-h-[220px]'}`}
      >
        {yukleniyor ? (
          <p className="py-6 text-center text-sm text-ink-faint">Sohbet yükleniyor…</p>
        ) : hata ? (
          <p className="py-6 text-center text-sm text-danger">{hata}</p>
        ) : mesajlar.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">
            Henüz mesaj yok. Buluşma için ilk notu siz bırakın!
          </p>
        ) : (
          mesajlar.map((m) => (
            <div key={m.id} className="rounded-[12px] bg-surface-raised px-3.5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="flex items-center gap-1.5 font-display font-bold text-heading">
                  {m.rumuz}
                  {m.yoneticiMi && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-body text-[10px] font-semibold text-accent">
                      Düzenleyen
                    </span>
                  )}
                </span>
                <time dateTime={m.tarih} className="text-[11px] text-ink-faint">
                  {gunMetni(m.tarih)} · {saatMetni(m.tarih)}
                </time>
              </div>
              <p className="mb-0 mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                {m.metin}
              </p>
            </div>
          ))
        )}
      </div>

      {iptal ? (
        <p className="m-0 border-t border-hairline px-4 py-3 text-center text-xs text-ink-faint">
          Bu grup iptal edildiği için yeni mesaj gönderilemez.
        </p>
      ) : (
        <form onSubmit={gonder} className="border-t border-hairline bg-surface-raised/60 p-3" noValidate>
          <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
            <input
              type="text"
              value={rumuz}
              onChange={(e) => setRumuz(e.target.value)}
              maxLength={30}
              placeholder="Rumuzun"
              aria-label="Rumuzun"
              className="girdi !min-h-[40px] !py-1.5 text-[13px]"
            />
            <input
              type="text"
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              maxLength={500}
              placeholder="Mesaj yaz… (ör. İskele önünde buluşalım)"
              aria-label="Mesajın"
              className="girdi !min-h-[40px] !py-1.5 text-[13px]"
            />
            <button
              type="submit"
              disabled={gonderiliyor || !metin.trim()}
              className="btn-ana !min-h-[40px] !px-4 text-[13px]"
            >
              <Simge ad="send" boyut={16} />
              <span>Gönder</span>
            </button>
          </div>
          {formHata && (
            <p role="alert" className="mb-0 mt-1.5 text-xs font-semibold text-danger">
              {formHata}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
