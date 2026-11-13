// Tarayıcıda saklanan kişisel veriler (hesap yok). Erişilemezse sessizce varsayılana döner.
const oku = (k, v) => {
  try {
    const x = JSON.parse(localStorage.getItem(k));
    return x ?? v;
  } catch {
    return v;
  }
};
const yaz = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* yok say */
  }
};

// Keşfet seçimleri: { begenilen: [mekanId], gecilen: [mekanId] }
const KESFET = 'p404_kesfet';
export const kesfetOku = () => ({ begenilen: [], gecilen: [], ...oku(KESFET, {}) });
export const kesfetYaz = (v) => yaz(KESFET, v);

// Açtığım grupların yönetim anahtarları: { [grupId]: anahtar }
const ANAHTAR = 'p404_grup_anahtarlari';
export const grupAnahtari = (id) => oku(ANAHTAR, {})[id] || null;
export const grupAnahtariKaydet = (id, a) => yaz(ANAHTAR, { ...oku(ANAHTAR, {}), [id]: a });

// Katıldığım gruplar: { [grupId]: katilimId }
const KATILIM = 'p404_katilimlar';
export const katilimId = (id) => oku(KATILIM, {})[id] || null;
export const katilimKaydet = (id, k) => yaz(KATILIM, { ...oku(KATILIM, {}), [id]: k });
export const katilimSil = (id) => {
  const v = oku(KATILIM, {});
  delete v[id];
  yaz(KATILIM, v);
};

// Son oluşturulan plan
const PLAN = 'p404_son_plan';
export const sonPlan = () => oku(PLAN, null);
export const sonPlanKaydet = (id) => yaz(PLAN, id);
