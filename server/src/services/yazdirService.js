// Yazdırılabilir rota çıktısı için yardımcılar: geometriyi SVG çizimine uygun boyuta indirir.
// Koordinatlar GeoJSON sırasıyla [lon, lat].

export const AZAMI_NOKTA = 300;

function dikUzaklik(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Douglas–Peucker (yinelemesiz, uzun hatlarda yığın taşmasın). */
export function douglasPeucker(noktalar, tolerans) {
  if (noktalar.length <= 2) return noktalar.slice();
  const tut = new Uint8Array(noktalar.length);
  tut[0] = 1;
  tut[noktalar.length - 1] = 1;
  const yigin = [[0, noktalar.length - 1]];
  while (yigin.length) {
    const [bas, son] = yigin.pop();
    let enUzak = -1;
    let enMesafe = 0;
    for (let i = bas + 1; i < son; i++) {
      const d = dikUzaklik(noktalar[i], noktalar[bas], noktalar[son]);
      if (d > enMesafe) { enMesafe = d; enUzak = i; }
    }
    if (enUzak !== -1 && enMesafe > tolerans) {
      tut[enUzak] = 1;
      yigin.push([bas, enUzak], [enUzak, son]);
    }
  }
  return noktalar.filter((_, i) => tut[i]);
}

/** Bir çizgiyi en fazla `azami` noktaya indirir (toleransı adım adım artırarak). */
export function sadelestir(noktalar, azami = AZAMI_NOKTA) {
  if (noktalar.length <= azami) return noktalar.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);
  let tol = 0.000005; // ~0,5 m
  let sonuc = noktalar;
  for (let i = 0; i < 20 && sonuc.length > azami; i++) {
    sonuc = douglasPeucker(noktalar, tol);
    tol *= 2;
  }
  if (sonuc.length > azami) {
    // Son çare: eşit örnekleme (uçlar korunur)
    const adim = (sonuc.length - 1) / (azami - 1);
    sonuc = Array.from({ length: azami }, (_, i) => sonuc[Math.round(i * adim)]);
  }
  return sonuc.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);
}

/** LineString / MultiLineString → sadeleştirilmiş aynı tür; toplam nokta bütçesi parçalara bölünür. */
export function sadeGeometri(geometri, azami = AZAMI_NOKTA) {
  if (!geometri) return null;
  if (geometri.type === 'LineString') {
    return { type: 'LineString', coordinates: sadelestir(geometri.coordinates, azami) };
  }
  if (geometri.type === 'MultiLineString') {
    const toplam = geometri.coordinates.reduce((t, c) => t + c.length, 0) || 1;
    return {
      type: 'MultiLineString',
      coordinates: geometri.coordinates.map((c) =>
        sadelestir(c, Math.max(2, Math.floor((azami * c.length) / toplam)))),
    };
  }
  return null;
}

/** Durak ve geometri noktalarını kapsayan sınır kutusu: [minLon, minLat, maxLon, maxLat]. */
export function sinirKutusu(geometri, duraklar = []) {
  const noktalar = [
    ...(geometri?.type === 'LineString' ? geometri.coordinates : []),
    ...(geometri?.type === 'MultiLineString' ? geometri.coordinates.flat() : []),
    ...duraklar.map((d) => [d.lon, d.lat]),
  ];
  if (!noktalar.length) return null;
  const xs = noktalar.map((p) => p[0]);
  const ys = noktalar.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
