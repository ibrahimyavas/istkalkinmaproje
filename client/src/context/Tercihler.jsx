import React, { createContext, useContext, useEffect, useState } from 'react';

// Kullanıcı tercihleri: tema, büyük yazı ve erişilebilir rota modu.
// Tarayıcıda saklanır; erişilemezse (gizli pencere vb.) varsayılanlarla çalışır.
const Ctx = createContext(null);

function oku(anahtar, varsayilan) {
  try {
    const v = localStorage.getItem(anahtar);
    return v === null ? varsayilan : v;
  } catch {
    return varsayilan;
  }
}
function yaz(anahtar, deger) {
  try {
    localStorage.setItem(anahtar, deger);
  } catch {
    /* yok say */
  }
}

export function TercihProvider({ children }) {
  const [tema, setTema] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const [buyukYazi, setBuyukYazi] = useState(() => oku('p404_buyuk_yazi', '0') === '1');
  const [erisilebilir, setErisilebilir] = useState(() => oku('p404_erisilebilir', '0') === '1');

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('light', 'dark');
    el.classList.add(tema);
    yaz('p404_tema', tema);
  }, [tema]);

  useEffect(() => {
    document.documentElement.classList.toggle('buyuk-yazi', buyukYazi);
    yaz('p404_buyuk_yazi', buyukYazi ? '1' : '0');
  }, [buyukYazi]);

  useEffect(() => {
    yaz('p404_erisilebilir', erisilebilir ? '1' : '0');
  }, [erisilebilir]);

  const value = {
    tema,
    temaDegistir: () => setTema((t) => (t === 'dark' ? 'light' : 'dark')),
    buyukYazi,
    setBuyukYazi,
    erisilebilir,
    setErisilebilir,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTercihler() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTercihler TercihProvider içinde kullanılmalı');
  return v;
}
