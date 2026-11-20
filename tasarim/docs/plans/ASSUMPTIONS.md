# Assumptions — Layouts, Animations & Effects plan

No codebase was connected when this plan was written. Every entry below is a guess about existing code, and the executor confirms it in the task's Step 0.

> **Durum (20 Kasım 2026, kodla karşılaştırıldı):** Bu plan uygulanmadı; proje başka bir tasarım yönüyle (Claude Design "Proje 404 Preview v2": lacivert `#0A2540` + kiremit `#C84B26`, Plus Jakarta Sans + Inter) ilerledi. Güncel tokenlar `client/DESIGN.md`'de. Aşağıdaki varsayımların durumu:
> - **A-001 DOĞRULANDI** (yığın kısmı): React 18, react-router-dom, Vite, Tailwind 3.4. "Test aracı yok" varsayımı **YANLIŞ**: Vitest 3 kurulu (`client/src/__tests__/`).
> - **A-002, A-003, A-004, A-009 GEÇERSİZ:** Broadsheet tasarım sistemi kodda kullanılmıyor; `corePlugins.preflight` kapatılmadı. Koyu tema `html.dark` sınıfıyla çalışıyor; dokunma hedefleri zaten 44 px.
> - **A-006, A-007 GEÇERSİZ:** `pages/Kesfet.jsx` yok; Keşfet ekranı `pages/KesfetSayfasi.jsx` + `components/kesfet/`.
> - **A-005, A-008, A-010:** plan uygulanmadığı için kapsam dışı.

## A-001 | gap-fill | OPEN
Stack assumed: React 18, react-router-dom 6, Vite, Tailwind 3.4. No test runner exists yet.
Alternatives: Jest (swap `vi` → `jest`), Tailwind 4 (config moves into CSS `@theme`).
Why: `client/tailwind.config.js` and `client/src/hooks/` in the inventory point to Vite + Tailwind 3.

## A-002 | contradiction | OPEN
The screen inventory requires a dark theme, but Broadsheet ships only a light ground.
Chosen: derive dark tokens from Broadsheet's own neutral and accent ramps under `[data-tema="koyu"]`. The `.cmyk-num` / `.cmyk-head` plates fall back to plain figures there.
Alternatives: light only (fails the inventory), or a separate dark design system.

## A-003 | contradiction | OPEN
Broadsheet's `.btn-icon` is 36 px; the inventory requires 44 px hit targets.
Chosen: override to 44 px in `index.css`. `.btn`, `.chip` and `.nav-link` also get `min-height: 44px`.

## A-004 | gap-fill | OPEN
Tailwind preflight is disabled (`corePlugins.preflight: false`) because it resets the Broadsheet heading scale.
Alternatives: keep preflight and re-declare h1–h6 in `@layer base`.
Risk: existing views that rely on preflight's list/button resets may shift. Check during Task 22.

## A-005 | gap-fill | OPEN
`Tercihler` values assumed: `tema` ('acik'|'koyu'), `buyukYazi` (bool), `erisilebilir` (bool). `usePreferenceAttributes` (view layer) mirrors them onto `<html>` data attributes, so the context stays untouched.

## A-006 | gap-fill | OPEN
`useKesfet` assumed: `kartlar` is the remaining queue with `kartlar[0]` on top, `karar('begen'|'gec')` acts on the top card, and `geriAl()` restores the last card to the front. Loading and error flags are assumed as `yukleniyor` / `hata`.
Only the `// ADAPTER` lines in `pages/Kesfet.jsx` change if any of these differ.

## A-007 | gap-fill | OPEN
Route building assumed to be `api.planOlustur(ids) → { id }`, followed by navigation to `/plan/:id`.

## A-008 | gap-fill | OPEN
Card, plan, stop and leg field names are assumed (listed in Tasks 13, 17 and 18).

## A-009 | gap-fill | OPEN
Structure from the İPA template, visuals from Broadsheet. The İPA navy/terracotta palette and Plus Jakarta/Inter fonts are not carried over, because the Broadsheet design system is the binding visual reference for this project.

## A-010 | gap-fill | OPEN
New view-only helpers (`useReducedMotion`, `usePreferenceAttributes`) live under `components/`, not `hooks/`, so the protected logic folder stays untouched.
