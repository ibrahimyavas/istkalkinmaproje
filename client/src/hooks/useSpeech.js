import { useCallback, useEffect, useRef, useState } from 'react';

// Tarayıcının yerleşik konuşma sentezi (Web Speech API) ile sesli rehber.
// Ücretsiz ve servis gerektirmez; Türkçe ses yoksa tarayıcının varsayılanı kullanılır.
export function useSpeech() {
  const destek = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [konusanId, setKonusanId] = useState(null);
  const kuyruk = useRef([]);

  const durdur = useCallback(() => {
    if (!destek) return;
    kuyruk.current = [];
    window.speechSynthesis.cancel();
    setKonusanId(null);
  }, [destek]);

  useEffect(() => durdur, [durdur]);

  const sesSec = () => {
    const sesler = window.speechSynthesis.getVoices();
    return sesler.find((s) => s.lang?.toLowerCase().startsWith('tr')) || null;
  };

  const oynat = useCallback((ogeler) => {
    if (!ogeler.length) {
      setKonusanId(null);
      return;
    }
    const [ilk, ...kalan] = ogeler;
    kuyruk.current = kalan;
    const u = new SpeechSynthesisUtterance(ilk.metin);
    u.lang = 'tr-TR';
    u.rate = 0.95;
    const ses = sesSec();
    if (ses) u.voice = ses;
    u.onend = () => oynat(kuyruk.current);
    u.onerror = () => setKonusanId(null);
    setKonusanId(ilk.id);
    window.speechSynthesis.speak(u);
  }, []);

  /** Tek metni ya da [{id, metin}] dizisini sırayla okur. */
  const oku = useCallback(
    (ogeler) => {
      if (!destek) return;
      window.speechSynthesis.cancel();
      oynat(Array.isArray(ogeler) ? ogeler : [ogeler]);
    },
    [destek, oynat],
  );

  return { destek, oku, durdur, konusanId };
}
