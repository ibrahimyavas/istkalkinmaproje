# Proje 404 — Layouts, Animations & Effects Implementation Plan

> **For the executor:** implement this task-by-task with the executing-plans skill.

**Goal:** Rebuild the Proje 404 view layer (`client/src/pages`, `client/src/components`, tokens) on the Broadsheet design system, borrowing the İPA template's structure (asymmetric planner split, stop timeline, discovery grid), and add a consistent motion system (reveal, menu, swipe deck physics, stamp, before/after), without touching the API, hooks, lib or Tercihler layers.

**Architecture:** Broadsheet's stylesheet is vendored as `client/src/styles/broadsheet.css` and extended in `client/src/index.css` with motion tokens, a dark theme, a large-type scale and the project's layout/component classes. Motion lives in one module (`components/motion/`) that every animated component reads, so `prefers-reduced-motion` collapses everything in one place. Pages are thin: they call the existing hooks and pass plain props into pure view components, which keeps each component testable in jsdom.

**Tech Stack:** React 18 (works on 19), react-router-dom 6, Vite, Tailwind CSS 3.4, Vitest + @testing-library/react + jsdom, @phosphor-icons/react (duotone), MapLibre (existing, untouched).

## Progress

| Status | Count |
|--------|-------|
| 🔴 NOT_STARTED | 22 |
| 🟡 IN_PROGRESS | 0 |
| 🟢 COMPLETED | 0 |
| ⚪ BLOCKED | 0 |

## Ground rules (read once)

- **Untouchable files:** `client/src/services/api.js`, `client/src/hooks/*`, `client/src/lib/*`, `client/src/context/Tercihler.jsx`. If a task seems to need a change there, stop and mark it ⚪ BLOCKED.
- **Each screen must keep:** light and dark themes, 375 px mobile width, 44 px minimum hit targets, full keyboard use, and state shown with an icon and text as well as color. The labels "Doğrulanacak", "Örnek" and "DEMO VERİSİ" must stay visible.
- **Broadsheet rules:** serif everywhere (Source Serif 4); sections are separated by whitespace, never by borders or boxes; `.card` only for discrete listings; cyan (`--color-accent`) is the interactive color, magenta (`--color-accent-2`) the rarer spot color; never both accents in one small component; Phosphor icons in `weight="duotone"`.
- **Motion budget:** state changes 120 ms, enter 200 ms, exit 150 ms, settle 320 ms, fly-out 260 ms, stamp 420 ms. Use only the tokens from Task 2. No animation may run under `prefers-reduced-motion: reduce`.
- Run all commands from `client/`.
- Tasks with a **Step 0** need you to confirm a contract in existing code first. Record anything that differs in `docs/plans/ASSUMPTIONS.md`, then adapt **only the adapter lines named in that task**.

---

### Task 1: Test harness 🔴 NOT_STARTED

**Files:**
- Create: `client/vitest.config.js`
- Create: `client/src/test/env.js`
- Create: `client/src/test/setup.js`
- Create: `client/src/test/smoke.test.jsx`
- Modify: `client/package.json` (scripts + devDependencies)

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `npm test` with smoke test | 1 passed |
| `setReducedMotion(true)` then `matchMedia('(prefers-reduced-motion: reduce)').matches` | `true` |
| `new IntersectionObserver(cb)` then `observers[0].trigger(true)` | `cb` receives entries with `isIntersecting: true` |

**Step 1: Install dependencies**
```bash
npm i -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/dom@^10
npm i @phosphor-icons/react@^2
```
Add to `package.json` → `"scripts"`: `"test": "vitest run", "test:watch": "vitest"`. If `vitest.config.js` already exists, merge the `test` block into it.

**Step 2: Write the failing test (RED)** — `client/src/test/smoke.test.jsx`
```jsx
import { render, screen } from '@testing-library/react';
import { observers, setReducedMotion } from './env';

test('renders into jsdom', () => {
  render(<p>Merhaba</p>);
  expect(screen.getByText('Merhaba')).toBeInTheDocument();
});

test('matchMedia follows setReducedMotion', () => {
  setReducedMotion(true);
  expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
});

test('IntersectionObserver mock can be triggered', () => {
  const cb = vi.fn();
  const io = new IntersectionObserver(cb);
  const el = document.createElement('div');
  io.observe(el);
  observers[0].trigger(true);
  expect(cb.mock.calls[0][0][0]).toMatchObject({ target: el, isIntersecting: true });
});
```

**Step 3: Run it, confirm it fails (verify RED)**
Run: `npx vitest run src/test/smoke.test.jsx`
Expected: FAIL. The `./env` import fails, or the config is missing.

**Step 4: Minimal implementation (GREEN)**

`client/vitest.config.js`
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, css: false, setupFiles: ['./src/test/setup.js'] },
});
```

`client/src/test/env.js`
```js
// Shared mutable test environment. Tests import helpers from here; setup.js wires them onto window.
export const observers = [];
let reduced = false;
export function setReducedMotion(v) { reduced = v; }
export function isReducedMotion() { return reduced; }
export function resetEnv() { reduced = false; observers.length = 0; }

export class MockIntersectionObserver {
  constructor(cb, opts) { this.cb = cb; this.opts = opts; this.els = []; observers.push(this); }
  observe(el) { this.els.push(el); }
  unobserve(el) { this.els = this.els.filter((e) => e !== el); }
  disconnect() { this.els = []; }
  trigger(isIntersecting = true) {
    this.cb(this.els.map((target) => ({ target, isIntersecting })), this);
  }
}
```

`client/src/test/setup.js`
```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MockIntersectionObserver, isReducedMotion, resetEnv } from './env';

window.matchMedia = (query) => ({
  matches: query.includes('prefers-reduced-motion') ? isReducedMotion() : false,
  media: query, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  dispatchEvent() { return false; },
});
window.IntersectionObserver = MockIntersectionObserver;
window.scrollTo = () => {};
// (WHY: jsdom has no PointerEvent; without it fireEvent.pointer* drops clientX)
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  };
}
Element.prototype.setPointerCapture ??= function () {};
Element.prototype.releasePointerCapture ??= function () {};
window.requestAnimationFrame ??= (cb) => setTimeout(() => cb(Date.now()), 16);
window.cancelAnimationFrame ??= (id) => clearTimeout(id);

afterEach(() => { cleanup(); resetEnv(); });
```

**Step 5: Run it, confirm it passes (verify GREEN)**
Run: `npx vitest run src/test/smoke.test.jsx`
Expected: 3 passed, no warnings.

**Step 6: Commit**
```bash
git add vitest.config.js src/test package.json package-lock.json
git commit -m "test: add vitest + testing-library harness with motion/IO mocks"
```

---

### Task 2: Tokens, base CSS and Tailwind mapping 🔴 NOT_STARTED

**Files:**
- Create: `client/src/styles/broadsheet.css` (verbatim copy of `docs/plans/assets/broadsheet.css`)
- Replace: `client/src/index.css`
- Replace: `client/tailwind.config.js`
- Test: `client/src/styles/tokens.test.js`

**Step 0: Confirm the theme attribute.** Open `client/src/context/Tercihler.jsx` and note the names of the theme, large-text and accessible-mode values (expected: `tema` = `'acik'|'koyu'`, `buyukYazi: boolean`, `erisilebilir: boolean`). Task 8 syncs them onto `<html data-tema data-buyuk-yazi data-erisilebilir>`, so the CSS here keys on those attributes and doesn't depend on how the context stores them.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| CSS sources | declare every token in the `required` list |
| CSS sources | contain a `[data-tema="koyu"]` block |
| CSS sources | contain a `prefers-reduced-motion: reduce` block that zeroes `--motion-*` |
| `.btn-icon`, `.btn`, `.chip` | min 44 px (overrides Broadsheet's 36 px) |

**Step 1: Write the failing test (RED)** — `client/src/styles/tokens.test.js`
```js
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = read('./broadsheet.css') + read('../index.css');

const required = [
  '--color-bg', '--color-surface', '--color-text', '--color-accent', '--color-accent-2', '--color-divider',
  '--color-accent-600', '--color-accent-700', '--color-accent-hover', '--color-accent-press', '--color-accent-ink',
  '--font-heading', '--font-body', '--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8',
  '--radius-md', '--shadow-sm', '--shadow-md', '--shadow-lg',
  '--motion-state', '--motion-enter', '--motion-exit', '--motion-settle', '--motion-fly', '--motion-stamp',
  '--ease-out', '--ease-in-out', '--ease-press', '--type-scale', '--page-max',
];

test.each(required)('declares %s', (v) => {
  expect(css).toMatch(new RegExp(`${v}\\s*:`));
});
test('has a dark theme block', () => expect(css).toMatch(/\[data-tema="koyu"\]\s*\{/));
test('zeroes motion under reduced motion', () => {
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*--motion-enter:\s*0ms/);
});
test('raises hit targets to 44px', () => {
  expect(css).toMatch(/\.btn-icon\s*\{[^}]*width:\s*44px/);
  expect(css).toMatch(/\.btn\s*\{[^}]*min-height:\s*44px/);
});
```

**Step 2: Run it, confirm it fails (verify RED)**
Run: `npx vitest run src/styles/tokens.test.js`
Expected: FAIL (ENOENT `broadsheet.css`).

**Step 3: Minimal implementation (GREEN)**

Copy the design-system sheet unchanged:
```bash
mkdir -p src/styles && cp ../docs/plans/assets/broadsheet.css src/styles/broadsheet.css
```

`client/tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-tema="koyu"]'],
  // (WHY: preflight resets h1–h6 sizes and margins, which wipes Broadsheet's type scale; broadsheet.css ships its own reset)
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)', surface: 'var(--color-surface)', ink: 'var(--color-text)',
        accent: { DEFAULT: 'var(--color-accent)', 100: 'var(--color-accent-100)', 600: 'var(--color-accent-600)', 700: 'var(--color-accent-700)' },
        spot: { DEFAULT: 'var(--color-accent-2)', 100: 'var(--color-accent-2-100)', 800: 'var(--color-accent-2-800)' },
        divider: 'var(--color-divider)',
      },
      fontFamily: { serif: ['var(--font-body)'], heading: ['var(--font-heading)'] },
      spacing: { s1: 'var(--space-1)', s2: 'var(--space-2)', s3: 'var(--space-3)', s4: 'var(--space-4)', s6: 'var(--space-6)', s8: 'var(--space-8)' },
      borderRadius: { sm: 'var(--radius-sm)', DEFAULT: 'var(--radius-md)', lg: 'var(--radius-lg)' },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
      transitionDuration: { state: 'var(--motion-state)', enter: 'var(--motion-enter)', exit: 'var(--motion-exit)' },
      transitionTimingFunction: { out: 'var(--ease-out)', press: 'var(--ease-press)' },
      maxWidth: { page: 'var(--page-max)' },
    },
  },
  plugins: [],
};
```

`client/src/index.css`
```css
@import './styles/broadsheet.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-accent-hover: var(--color-accent-600);
    --color-accent-press: var(--color-accent-700);
    --color-accent-ink: var(--color-accent-700); /* accent at body-text size: 4.5:1 on paper */
    --motion-state: 120ms; --motion-enter: 200ms; --motion-exit: 150ms;
    --motion-settle: 320ms; --motion-fly: 260ms; --motion-stamp: 420ms;
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    --ease-press: cubic-bezier(0.34, 1.56, 0.64, 1);
    --type-scale: 1;
    --page-max: 1360px;
    --page-pad: var(--space-4);
    color-scheme: light;
  }
  /* Dark theme: required by the screen inventory. Broadsheet ships light only, so this is derived from its own ramps. */
  [data-tema="koyu"] {
    --color-bg: var(--color-neutral-900);
    --color-surface: var(--color-neutral-800);
    --color-text: var(--color-neutral-100);
    --color-divider: color-mix(in srgb, var(--color-neutral-100) 18%, transparent);
    --color-accent-hover: var(--color-accent-400);
    --color-accent-press: var(--color-accent-300);
    --color-accent-ink: var(--color-accent-300);
    --shadow-sm: 0 0 0 1px color-mix(in srgb, var(--color-neutral-100) 10%, transparent);
    --shadow-md: 0 0 0 1px color-mix(in srgb, var(--color-neutral-100) 12%, transparent), 0 6px 18px rgb(0 0 0 / 0.35);
    --shadow-lg: 0 0 0 1px color-mix(in srgb, var(--color-neutral-100) 14%, transparent), 0 16px 40px rgb(0 0 0 / 0.45);
    color-scheme: dark;
  }
  [data-buyuk-yazi="acik"] { --type-scale: 1.2; }
  @media (min-width: 768px) { :root { --page-pad: var(--space-6); } }

  body { font-size: calc(15px * var(--type-scale)); }
  h1 { font-size: calc(42px * var(--type-scale)); }
  h2 { font-size: calc(32px * var(--type-scale)); }
  h3 { font-size: calc(25px * var(--type-scale)); }
  h4 { font-size: calc(20px * var(--type-scale)); }
  a:hover { color: var(--color-accent-hover); }
  a:active { color: var(--color-accent-press); }
  button { font: inherit; color: inherit; }

  @media (prefers-reduced-motion: reduce) {
    :root { --motion-state: 0ms; --motion-enter: 0ms; --motion-exit: 0ms; --motion-settle: 0ms; --motion-fly: 0ms; --motion-stamp: 0ms; }
    *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 0ms !important; scroll-behavior: auto !important; }
  }
}

@layer components {
  /* Hit targets: the inventory requires 44px, Broadsheet's defaults are 36px */
  .btn { min-height: 44px; transition: background-color var(--motion-state) var(--ease-out), color var(--motion-state) var(--ease-out), scale var(--motion-state) var(--ease-out); }
  .btn:active:not(:disabled) { scale: 0.98; }
  .btn-primary:hover { background: var(--color-accent-hover); }
  .btn-primary:active { background: var(--color-accent-press); }
  .btn-icon { width: 44px; height: 44px; padding: 0; }

  /* Plate numeral on dark: multiply plates vanish on an ink ground, so fall back to plain figures */
  .cmyk-num { display: inline-block; }
  [data-tema="koyu"] .cmyk-num, [data-tema="koyu"] .cmyk-head { background: transparent; }
  [data-tema="koyu"] .cmyk-num .plate, [data-tema="koyu"] .cmyk-head .plate { display: none; }
  [data-tema="koyu"] .cmyk-num .paper, [data-tema="koyu"] .cmyk-head .paper { color: var(--color-text); text-shadow: none; }

  /* Interactive listing cards */
  .card-interactive { transition: box-shadow var(--motion-enter) var(--ease-out), translate var(--motion-enter) var(--ease-out); }
  .card-interactive:hover { box-shadow: var(--shadow-md); translate: 0 -2px; }
  .card-interactive:active { translate: 0 0; box-shadow: var(--shadow-sm); }
}
```
Later tasks add their own blocks under `@layer components` in this file. Append each one at the end of the components layer.

**Step 4: Run it, confirm it passes (verify GREEN)**
Run: `npx vitest run src/styles/tokens.test.js && npm run build`
Expected: all tests PASS; the build succeeds with no PostCSS errors.

**Step 5: Commit**
```bash
git add src/styles src/index.css tailwind.config.js
git commit -m "feat(ui): adopt Broadsheet tokens, motion tokens, dark + large-type themes"
```

---

### Task 3: Motion module 🔴 NOT_STARTED

**Files:**
- Create: `client/src/components/motion/motion.js`
- Create: `client/src/components/motion/useReducedMotion.js`
- Test: `client/src/components/motion/motion.test.jsx`

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `duration('enter')` | `200` |
| `duration('enter')` under reduced motion | `0` |
| `duration('nope')` | throws `Error` containing `unknown motion key` |
| `useReducedMotion()` under reduced motion | `true` |

**Step 1: Write the failing test (RED)**
```jsx
import { renderHook } from '@testing-library/react';
import { DURATION, duration } from './motion';
import { useReducedMotion } from './useReducedMotion';
import { setReducedMotion } from '../../test/env';

test('returns token durations', () => {
  expect(duration('enter')).toBe(200);
  expect(DURATION.fly).toBe(260);
});
test('collapses to 0 under reduced motion', () => {
  setReducedMotion(true);
  expect(duration('enter')).toBe(0);
});
test('rejects unknown keys', () => {
  expect(() => duration('nope')).toThrow(/unknown motion key/);
});
test('hook reports reduced motion', () => {
  setReducedMotion(true);
  expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
});
```

**Step 2: Verify RED** — `npx vitest run src/components/motion` → FAIL (module not found).

**Step 3: Minimal implementation (GREEN)**

`motion.js`
```js
// Mirrors the --motion-* / --ease-* tokens in index.css. JS-driven animations read from here.
export const DURATION = { state: 120, enter: 200, exit: 150, settle: 320, fly: 260, stamp: 420 };
export const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  press: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};
const QUERY = '(prefers-reduced-motion: reduce)';
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches === true;
}
export function duration(key) {
  if (!(key in DURATION)) throw new Error(`unknown motion key: ${key}`);
  return prefersReducedMotion() ? 0 : DURATION[key];
}
export { QUERY as REDUCED_MOTION_QUERY };
```

`useReducedMotion.js`
```js
import { useEffect, useState } from 'react';
import { REDUCED_MOTION_QUERY, prefersReducedMotion } from './motion';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}
```

**Step 4: Verify GREEN** — `npx vitest run src/components/motion` → 4 passed.

**Step 5: Commit** — `git add src/components/motion && git commit -m "feat(motion): duration/easing tokens and reduced-motion hook"`

---

### Task 4: Reveal (scroll-in) 🔴 NOT_STARTED

**Files:**
- Create: `client/src/components/motion/Reveal.jsx`
- Modify: `client/src/index.css` (append to `@layer components`)
- Test: `client/src/components/motion/Reveal.test.jsx`

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| mount | `data-shown="false"` |
| observer reports intersecting | `data-shown="true"`, observer disconnected |
| reduced motion | `data-shown="true"` on first render, no observer created |
| `as="section" id="x"` | renders `<section id="x">` |

**Step 1: Write the failing test (RED)**
```jsx
import { act, render, screen } from '@testing-library/react';
import { Reveal } from './Reveal';
import { observers, setReducedMotion } from '../../test/env';

test('hidden until it intersects', () => {
  render(<Reveal>Merhaba</Reveal>);
  const el = screen.getByText('Merhaba');
  expect(el).toHaveAttribute('data-shown', 'false');
  act(() => observers[0].trigger(true));
  expect(el).toHaveAttribute('data-shown', 'true');
  expect(observers[0].els).toHaveLength(0);
});
test('shown immediately under reduced motion', () => {
  setReducedMotion(true);
  render(<Reveal>Merhaba</Reveal>);
  expect(screen.getByText('Merhaba')).toHaveAttribute('data-shown', 'true');
  expect(observers).toHaveLength(0);
});
test('renders the requested element and passes props', () => {
  const { container } = render(<Reveal as="section" id="x" className="extra">a</Reveal>);
  const s = container.querySelector('section#x');
  expect(s).toHaveClass('reveal', 'extra');
});
```

**Step 2: Verify RED** — `npx vitest run src/components/motion/Reveal.test.jsx` → FAIL.

**Step 3: Minimal implementation (GREEN)**
```jsx
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function Reveal({ as: Tag = 'div', delay = 0, className, style, children, ...rest }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced);
  useEffect(() => {
    if (reduced) { setShown(true); return undefined; }
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setShown(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);
  return (
    <Tag ref={ref} data-shown={String(shown)}
      className={['reveal', className].filter(Boolean).join(' ')}
      style={{ ...style, '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
```
CSS (append):
```css
  .reveal { opacity: 0; translate: 0 12px;
    transition: opacity var(--motion-enter) var(--ease-out) var(--reveal-delay, 0ms),
                translate calc(var(--motion-enter) * 1.6) var(--ease-out) var(--reveal-delay, 0ms); }
  .reveal[data-shown="true"] { opacity: 1; translate: 0 0; }
  @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; translate: none; } }
```

**Step 4: Verify GREEN** → 3 passed.

**Step 5: Commit** — `git commit -am "feat(motion): Reveal on-scroll entrance" && git add src/components/motion/Reveal* && git commit --amend --no-edit`

---

### Task 5: Layout primitives (PageWrap, Section, Split, Masthead) 🔴 NOT_STARTED

İPA structure → Broadsheet: the İPA hero, planner and discovery split become `Split` (asymmetric 7/5, 5/7 or 8/4, with an optional sticky side). İPA's card-wrapped sections become `Section`, which is whitespace-separated with a flush-left kicker and heading. The civic alert bar becomes the front page's `Masthead`: a thick-thin rule pair around a dateline rail.

**Files:**
- Create: `client/src/components/layout/Layout.jsx`
- Modify: `client/src/index.css`
- Test: `client/src/components/layout/Layout.test.jsx`

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `<Section id="semtler" kicker="6 semt" title="Semtler">` | `<section id="semtler" aria-labelledby="semtler-baslik">` + `h2#semtler-baslik` "Semtler" + kicker text |
| `<Split ratio="7-5">` with 2 children | element with `data-ratio="7-5"`, 2 child columns |
| `<Split ratio="3-9">` | throws `Error` containing `unknown ratio` |
| `<Masthead items={['13 Kasım 2026','İstanbul']}/>` | items in order; separators `aria-hidden` |

**Step 1: Write the failing test (RED)**
```jsx
import { render, screen } from '@testing-library/react';
import { Masthead, PageWrap, Section, Split } from './Layout';

test('Section links heading and kicker', () => {
  render(<Section id="semtler" kicker="6 semt" title="Semtler"><p>içerik</p></Section>);
  const region = screen.getByRole('region', { name: 'Semtler' });
  expect(region).toHaveAttribute('id', 'semtler');
  expect(screen.getByRole('heading', { level: 2, name: 'Semtler' })).toHaveAttribute('id', 'semtler-baslik');
  expect(screen.getByText('6 semt')).toBeInTheDocument();
});
test('Split exposes its ratio', () => {
  const { container } = render(<Split ratio="7-5"><div>a</div><div>b</div></Split>);
  const s = container.firstChild;
  expect(s).toHaveAttribute('data-ratio', '7-5');
  expect(s.children).toHaveLength(2);
});
test('Split rejects unknown ratios', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<Split ratio="3-9"><div /><div /></Split>)).toThrow(/unknown ratio/);
});
test('Masthead prints items in order with hidden separators', () => {
  const { container } = render(<Masthead items={['13 Kasım 2026', 'İstanbul']} />);
  expect(container.textContent).toMatch(/13 Kasım 2026.*İstanbul/);
  container.querySelectorAll('.dateline-sep').forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'));
});
test('PageWrap renders children', () => {
  render(<PageWrap>x</PageWrap>);
  expect(screen.getByText('x')).toHaveClass('page-wrap');
});
```

**Step 2: Verify RED** → FAIL.

**Step 3: Minimal implementation (GREEN)**
```jsx
import { Fragment } from 'react';
import { Reveal } from '../motion/Reveal';

const RATIOS = ['7-5', '5-7', '8-4'];

export function PageWrap({ as: Tag = 'div', className, children, ...rest }) {
  return <Tag className={['page-wrap', className].filter(Boolean).join(' ')} {...rest}>{children}</Tag>;
}

export function Section({ id, kicker, title, aside, children }) {
  const hid = `${id}-baslik`;
  return (
    <Reveal as="section" id={id} aria-labelledby={hid} className="section">
      <header className="section-head">
        <div>
          {kicker && <p className="kicker">{kicker}</p>}
          <h2 id={hid}>{title}</h2>
        </div>
        {aside && <div className="section-aside">{aside}</div>}
      </header>
      {children}
    </Reveal>
  );
}

export function Split({ ratio = '7-5', sticky = false, className, children }) {
  if (!RATIOS.includes(ratio)) throw new Error(`Split: unknown ratio "${ratio}"`);
  return (
    <div className={['split', className].filter(Boolean).join(' ')} data-ratio={ratio} data-sticky={String(sticky)}>
      {children}
    </div>
  );
}

export function Masthead({ items }) {
  return (
    <div className="masthead page-wrap">
      <div className="rule-pair" aria-hidden="true" />
      <p className="dateline">
        {items.map((it, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="dateline-sep" aria-hidden="true">·</span>}
            <span>{it}</span>
          </Fragment>
        ))}
      </p>
      <div className="rule-pair rule-pair-flip" aria-hidden="true" />
    </div>
  );
}
```
CSS (append):
```css
  .page-wrap { max-width: var(--page-max); margin-inline: auto; padding-inline: var(--page-pad); }
  .section { margin-top: calc(var(--space-8) * 2); }
  .section-head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-6); max-width: 72ch; }
  .section-head h2 { margin: 0; text-wrap: balance; }
  .kicker { margin: 0 0 var(--space-1); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-accent-ink); }
  .split { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-8); align-items: start; }
  @media (min-width: 1100px) {
    .split[data-ratio="7-5"] { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
    .split[data-ratio="5-7"] { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); }
    .split[data-ratio="8-4"] { grid-template-columns: minmax(0, 8fr) minmax(0, 4fr); }
    .split[data-sticky="true"] > :last-child { position: sticky; top: var(--space-8); }
  }
  /* Front-page furniture: the only place Broadsheet prints rules */
  .masthead { padding-top: var(--space-3); }
  .rule-pair { height: 6px; border-top: 3px solid var(--color-text); border-bottom: 1px solid var(--color-text); }
  .rule-pair-flip { border-top-width: 1px; border-bottom-width: 3px; }
  .dateline { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: 0; padding-block: var(--space-2); font-size: 13px; letter-spacing: 0.04em; }
  .listing-grid { display: grid; gap: var(--space-6); grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }
```

**Step 4: Verify GREEN** → 5 passed.

**Step 5: Commit** — `git add src/components/layout src/index.css && git commit -m "feat(layout): PageWrap, Section, Split, Masthead"`

---

### Task 6: Chip + ChipGroup 🔴 NOT_STARTED

**Files:**
- Create: `client/src/components/ui/Chip.jsx`
- Modify: `client/src/index.css`
- Test: `client/src/components/ui/Chip.test.jsx`

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `pressed={true}` | `aria-pressed="true"` + a check icon (state not only by color) |
| click on unpressed option in `ChipGroup value={[]}` | `onChange(['kadikoy'])` |
| click on pressed option `value={['kadikoy']}` | `onChange([])` |
| `ChipGroup legend="Semt"` | `group` named "Semt" |

**Step 1: Write the failing test (RED)**
```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { Chip, ChipGroup } from './Chip';

const opts = [{ value: 'kadikoy', label: 'Kadıköy' }, { value: 'fatih', label: 'Fatih' }];

test('pressed chip shows a check icon', () => {
  const { container } = render(<Chip pressed onToggle={() => {}}>Kadıköy</Chip>);
  expect(screen.getByRole('button', { name: 'Kadıköy' })).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('svg')).not.toBeNull();
});
test('group toggles values on', () => {
  const onChange = vi.fn();
  render(<ChipGroup legend="Semt" options={opts} value={[]} onChange={onChange} />);
  expect(screen.getByRole('group', { name: 'Semt' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Kadıköy' }));
  expect(onChange).toHaveBeenCalledWith(['kadikoy']);
});
test('group toggles values off', () => {
  const onChange = vi.fn();
  render(<ChipGroup legend="Semt" options={opts} value={['kadikoy']} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Kadıköy' }));
  expect(onChange).toHaveBeenCalledWith([]);
});
```

**Step 2: Verify RED** → FAIL.

**Step 3: Minimal implementation (GREEN)**
```jsx
import { Check } from '@phosphor-icons/react';

export function Chip({ pressed = false, onToggle, children }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onToggle}>
      {pressed && <Check weight="duotone" size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ChipGroup({ legend, options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="chip-group">
      <legend>{legend}</legend>
      <div className="chips">
        {options.map((o) => (
          <Chip key={o.value} pressed={value.includes(o.value)} onToggle={() => toggle(o.value)}>{o.label}</Chip>
        ))}
      </div>
    </fieldset>
  );
}
```
CSS (append):
```css
  .chip-group { border: 0; margin: 0; padding: 0; min-width: 0; }
  .chip-group legend { padding: 0; margin-bottom: var(--space-2); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
  .chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 var(--space-3);
    font-size: 14px; cursor: pointer; background: transparent; color: var(--color-text);
    border: 1px solid var(--color-divider); border-radius: var(--radius-md);
    transition: background-color var(--motion-state) var(--ease-out), color var(--motion-state) var(--ease-out); }
  .chip:hover { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
  .chip[aria-pressed="true"] { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-bg); }
  .chip[aria-pressed="true"]:hover { background: var(--color-accent-hover); }
  .chip:active { background: var(--color-accent-press); color: var(--color-bg); }
```

**Step 4: Verify GREEN** → 3 passed. **Step 5: Commit** — `feat(ui): Chip and ChipGroup filter controls`

---

### Task 7: State views (Loading / Error / Empty) 🔴 NOT_STARTED

**Files:**
- Create: `client/src/components/ui/States.jsx`
- Modify: `client/src/index.css`
- Test: `client/src/components/ui/States.test.jsx`

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `<LoadingState label="Kartlar hazırlanıyor"/>` | `role="status"` with text "Kartlar hazırlanıyor…" |
| `<ErrorState message="x" onRetry={fn}/>` | `role="alert"`, warning icon, "Tekrar dene" calls `fn` |
| `<ErrorState message="x"/>` | no retry button |
| `<EmptyState title="Deste bitti" action={<button>Baştan</button>}/>` | title + action rendered |

**Step 1: Write the failing test (RED)**
```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { EmptyState, ErrorState, LoadingState } from './States';

test('loading announces politely', () => {
  render(<LoadingState label="Kartlar hazırlanıyor" />);
  expect(screen.getByRole('status')).toHaveTextContent('Kartlar hazırlanıyor…');
});
test('error offers retry', () => {
  const onRetry = vi.fn();
  const { container } = render(<ErrorState message="Kartlar yüklenemedi." onRetry={onRetry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Kartlar yüklenemedi.');
  expect(container.querySelector('svg')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
  expect(onRetry).toHaveBeenCalledOnce();
});
test('error without retry has no button', () => {
  render(<ErrorState message="x" />);
  expect(screen.queryByRole('button')).toBeNull();
});
test('empty renders title and action', () => {
  render(<EmptyState title="Deste bitti" action={<button>Baştan</button>} />);
  expect(screen.getByText('Deste bitti')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Baştan' })).toBeInTheDocument();
});
```

**Step 2: Verify RED** → FAIL.

**Step 3: Minimal implementation (GREEN)**
```jsx
import { Warning } from '@phosphor-icons/react';

export function LoadingState({ label = 'Yükleniyor', lines = 3 }) {
  return (
    <div role="status" aria-live="polite" className="state">
      <p className="state-label">{label}…</p>
      <div className="ink-lines" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => <span key={i} className="ink-line" style={{ '--i': i }} />)}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="state">
      <p className="state-title"><Warning weight="duotone" size={22} aria-hidden="true" /><span>Bir sorun çıktı</span></p>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Tekrar dene</button>}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {body && <p className="text-muted">{body}</p>}
      {action}
    </div>
  );
}
```
CSS (append):
```css
  .state { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); padding-block: var(--space-8); max-width: 48ch; }
  .state-title { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-family: var(--font-heading); font-weight: var(--font-heading-weight); font-size: calc(20px * var(--type-scale)); }
  .state-label { margin: 0; font-style: italic; }
  .ink-lines { display: grid; gap: var(--space-2); width: min(100%, 420px); }
  .ink-line { height: 10px; border-radius: var(--radius-sm); background: var(--color-text); opacity: 0.08;
    animation: ink-pulse 1.4s var(--ease-in-out) calc(var(--i) * 120ms) infinite alternate; }
  .ink-line:nth-child(3n) { width: 62%; }
  @keyframes ink-pulse { to { opacity: 0.18; } }
```

**Step 4: Verify GREEN** → 4 passed. **Step 5: Commit** — `feat(ui): loading, error and empty states`

---

### Task 8: App shell — Header, mobile menu, preference sync, page transition 🔴 NOT_STARTED

**Files:**
- Create: `client/src/components/shell/Header.jsx`
- Create: `client/src/components/shell/AppShell.jsx`
- Create: `client/src/components/shell/usePreferenceAttributes.js`
- Modify: `client/src/index.css`
- Modify: the router's root layout (Step 0)
- Test: `client/src/components/shell/Shell.test.jsx`

**Step 0:** Find the root layout. Search the router file for the `/` route, e.g. `grep -rn "createBrowserRouter\|<Routes" src`. Note the name of the existing preference toggle UI (accessible mode, large text, theme), probably in `src/components/`, and the exact keys `useTercihler()` returns.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| route `/kesfet` | "Keşfet" link has `aria-current="page"` |
| click menu button | `aria-expanded="true"`, panel `data-open="true"`, label "Menüyü kapat" |
| Escape while open | closed, focus back on menu button |
| route change while open | closed |
| `usePreferenceAttributes({tema:'koyu', buyukYazi:true, erisilebilir:false})` | `<html data-tema="koyu" data-buyuk-yazi="acik" data-erisilebilir="kapali">` |
| AppShell | skip link `href="#icerik"`; `main#icerik[tabindex="-1"]` |

**Step 1: Write the failing test (RED)**
```jsx
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { AppShell } from './AppShell';
import { usePreferenceAttributes } from './usePreferenceAttributes';

const renderHeader = (path = '/kesfet') =>
  render(<MemoryRouter initialEntries={[path]}><Header actions={<button>Tema</button>} /></MemoryRouter>);

test('marks the current page', () => {
  renderHeader();
  screen.getAllByRole('link', { name: 'Keşfet' }).forEach((l) => expect(l).toHaveAttribute('aria-current', 'page'));
});
test('opens and closes the mobile menu with Escape', () => {
  renderHeader();
  const btn = screen.getByRole('button', { name: 'Menüyü aç' });
  fireEvent.click(btn);
  expect(btn).toHaveAttribute('aria-expanded', 'true');
  expect(btn).toHaveAccessibleName('Menüyü kapat');
  expect(document.getElementById(btn.getAttribute('aria-controls'))).toHaveAttribute('data-open', 'true');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(btn).toHaveAttribute('aria-expanded', 'false');
  expect(document.activeElement).toBe(btn);
});
test('closes on route change', () => {
  let nav;
  const Grab = () => { nav = useNavigate(); return null; };
  render(<MemoryRouter initialEntries={['/']}><Header actions={null} /><Grab /></MemoryRouter>);
  const btn = screen.getByRole('button', { name: 'Menüyü aç' });
  fireEvent.click(btn);
  act(() => nav('/gruplar'));
  expect(btn).toHaveAttribute('aria-expanded', 'false');
});
test('syncs preferences onto <html>', () => {
  renderHook(() => usePreferenceAttributes({ tema: 'koyu', buyukYazi: true, erisilebilir: false }));
  const d = document.documentElement.dataset;
  expect([d.tema, d.buyukYazi, d.erisilebilir]).toEqual(['koyu', 'acik', 'kapali']);
});
test('shell has skip link and focusable main', () => {
  render(<MemoryRouter><AppShell actions={null}><p>sayfa</p></AppShell></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'İçeriğe geç' })).toHaveAttribute('href', '#icerik');
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
});
```

**Step 2: Verify RED** → FAIL.

**Step 3: Minimal implementation (GREEN)**

`Header.jsx`
```jsx
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';

export const NAV = [
  { to: { pathname: '/', hash: '#semtler' }, label: 'Semtler', plain: true }, // (WHY: a hash link on "/" would always read as active)
  { to: '/kesfet', label: 'Keşfet' },
  { to: '/gruplar', label: 'Gruplar' },
  { to: '/atolyeler', label: 'Atölyeler' },
  { to: '/etkinlikler', label: 'Etkinlikler' },
  { to: '/pasaport', label: 'Pasaportum' },
];

function NavItems({ className }) {
  return (
    <ul className={className}>
      {NAV.map((n) => (
        <li key={n.label}>
          {n.plain ? <Link to={n.to} className="nav-link">{n.label}</Link>
            : <NavLink to={n.to} className="nav-link">{n.label}</NavLink>}
        </li>
      ))}
    </ul>
  );
}

export function Header({ actions }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const panel = useRef(null);
  const panelId = useId();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { if (panel.current) panel.current.inert = !open; }, [open]); // (WHY: property works on React 18 and 19; the attribute differs)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="page-wrap nav">
        <Link to="/" className="nav-brand">Proje 404</Link>
        <nav aria-label="Ana menü" className="nav-desktop"><NavItems className="nav-list" /></nav>
        <div className="nav-actions">{actions}</div>
        <button ref={btn} type="button" className="btn btn-icon btn-secondary nav-toggle"
          aria-expanded={open} aria-controls={panelId} aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
          onClick={() => setOpen((o) => !o)}>
          {open ? <X weight="duotone" size={22} /> : <List weight="duotone" size={22} />}
        </button>
      </div>
      <div ref={panel} id={panelId} className="mobile-menu" data-open={String(open)}>
        <div><nav aria-label="Mobil menü" className="page-wrap"><NavItems className="nav-list-mobile" /></nav></div>
      </div>
    </header>
  );
}
```

`usePreferenceAttributes.js`
```js
import { useEffect } from 'react';

export function usePreferenceAttributes({ tema, buyukYazi, erisilebilir }) {
  useEffect(() => {
    const d = document.documentElement.dataset;
    d.tema = tema === 'koyu' ? 'koyu' : 'acik';
    d.buyukYazi = buyukYazi ? 'acik' : 'kapali';
    d.erisilebilir = erisilebilir ? 'acik' : 'kapali';
  }, [tema, buyukYazi, erisilebilir]);
}
```

`AppShell.jsx`
```jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell({ actions, children }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <a href="#icerik" className="skip-link">İçeriğe geç</a>
      <Header actions={actions} />
      <main id="icerik" tabIndex={-1} key={pathname} className="page-enter">{children}</main>
      <Footer />
    </>
  );
}
```
Task 9 creates `Footer.jsx`. Until then, create a stub: `export function Footer() { return <footer />; }`.

CSS (append):
```css
  .site-header { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, var(--color-bg) 94%, transparent); backdrop-filter: blur(8px); }
  .nav { padding-inline: var(--page-pad); }
  .nav-desktop { display: none; }
  .nav-list, .nav-list-mobile { list-style: none; margin: 0; padding: 0; display: flex; gap: var(--space-1); }
  .nav-list-mobile { flex-direction: column; padding-bottom: var(--space-4); }
  .nav-link { display: inline-flex; align-items: center; min-height: 44px; padding-inline: var(--space-2); font-size: 15px;
    transition: color var(--motion-state) var(--ease-out); }
  .nav-link[aria-current="page"] { color: var(--color-accent); text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 2px; }
  .nav-actions { display: flex; gap: var(--space-1); }
  @media (min-width: 1024px) { .nav-desktop { display: block; } .nav-toggle, .mobile-menu { display: none; } }
  /* height animation without measuring: grid rows 0fr → 1fr */
  .mobile-menu { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--motion-exit) var(--ease-out); }
  .mobile-menu > div { overflow: hidden; }
  .mobile-menu[data-open="true"] { grid-template-rows: 1fr; transition-duration: var(--motion-enter); }
  .skip-link { position: absolute; left: var(--space-2); top: -100px; z-index: 50; padding: var(--space-2) var(--space-3); background: var(--color-accent); color: var(--color-bg); }
  .skip-link:focus-visible { top: var(--space-2); }
  .page-enter { animation: page-in var(--motion-settle) var(--ease-out) both; }
  .page-enter:focus { outline: none; }
  @keyframes page-in { from { opacity: 0; translate: 0 6px; } }
```

**Wire it** (in the root layout from Step 0; adapter lines only):
```jsx
import { Outlet } from 'react-router-dom';
import { AppShell } from '../components/shell/AppShell';
import { usePreferenceAttributes } from '../components/shell/usePreferenceAttributes';
import { useTercihler } from '../context/Tercihler';
// <ExistingPreferenceToggles/> = the toggle UI you found in Step 0

export default function RootLayout() {
  const t = useTercihler();
  usePreferenceAttributes({ tema: t.tema, buyukYazi: t.buyukYazi, erisilebilir: t.erisilebilir });
  return <AppShell actions={<ExistingPreferenceToggles />}><Outlet /></AppShell>;
}
```
Each toggle must be a ≥44 px `.btn btn-icon btn-ghost` with an `aria-pressed` state and a text label (visible, or `aria-label`).

**Step 4: Verify GREEN** — `npx vitest run src/components/shell` → 5 passed. Then `npm run dev`. Check at 375 px that the menu slides open and closed, Tab reaches every link, and the skip link appears on first Tab.

**Step 5: Commit** — `feat(shell): header, animated mobile menu, page transition, preference sync`

---

### Task 9: Footer 🔴 NOT_STARTED

**Files:** Replace the stub `client/src/components/shell/Footer.jsx`. Test: `client/src/components/shell/Footer.test.jsx`

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| render | "DEMO VERİSİ" visible; link "OpenStreetMap katkıcıları" → `https://www.openstreetmap.org/copyright`; link "Yönetim" → `/admin` |

**Step 1: Write the failing test (RED)**
```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer';

test('carries demo notice, OSM attribution and admin link', () => {
  render(<MemoryRouter><Footer /></MemoryRouter>);
  expect(screen.getByText('DEMO VERİSİ')).toBeVisible();
  expect(screen.getByRole('link', { name: 'OpenStreetMap katkıcıları' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  expect(screen.getByRole('link', { name: 'Yönetim' })).toHaveAttribute('href', '/admin');
});
```
**Step 2: Verify RED** → FAIL. **Step 3 (GREEN):**
```jsx
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer page-wrap">
      <p className="footer-demo"><span className="tag tag-accent-2">DEMO VERİSİ</span>
        <span>İçeriklerin bir kısmı örnektir; “Doğrulanacak” işaretli bilgiler henüz teyit edilmedi.</span></p>
      <p className="text-muted">Harita verisi © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap katkıcıları</a></p>
      <p><Link to="/admin">Yönetim</Link></p>
    </footer>
  );
}
```
CSS (append): `.site-footer { margin-top: calc(var(--space-8) * 3); padding-block: var(--space-8); display: grid; gap: var(--space-2); font-size: 14px; } .footer-demo { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }`

**Step 4: Verify GREEN** → 1 passed. **Step 5: Commit** — `feat(shell): footer with demo notice and OSM attribution`

---

### Task 10: PrintImage (halftone imagery + type-led fallback) 🔴 NOT_STARTED

**Files:** Create `client/src/components/ui/PrintImage.jsx`; modify `index.css`; test `PrintImage.test.jsx`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `src="a.jpg" alt="Moda"` | `figure.halftone > img[alt="Moda"][loading="lazy"]` |
| no `src`, `label="Atölye"` | `role="img"` named "Atölye" with an icon; no `<img>` |

**Step 1 (RED):**
```jsx
import { render, screen } from '@testing-library/react';
import { PrintImage } from './PrintImage';

test('prints a photo with the halftone screen', () => {
  const { container } = render(<PrintImage src="a.jpg" alt="Moda" />);
  expect(container.querySelector('figure')).toHaveClass('halftone');
  expect(screen.getByRole('img', { name: 'Moda' })).toHaveAttribute('loading', 'lazy');
});
test('falls back to an icon plate without a src', () => {
  const { container } = render(<PrintImage label="Atölye" />);
  expect(screen.getByRole('img', { name: 'Atölye' })).toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { MapPin } from '@phosphor-icons/react';

export function PrintImage({ src, alt = '', label, ratio = '4 / 3', icon: Icon = MapPin }) {
  if (!src) {
    return (
      <div className="print-image print-image-empty" style={{ aspectRatio: ratio }} role="img" aria-label={label ?? alt}>
        <Icon weight="duotone" size={44} aria-hidden="true" />
      </div>
    );
  }
  return (
    <figure className="print-image halftone" style={{ aspectRatio: ratio }}>
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </figure>
  );
}
```
CSS (append):
```css
  .print-image { position: relative; width: 100%; overflow: hidden; border-radius: var(--radius-md); background: var(--color-surface); }
  .print-image img { width: 100%; height: 100%; object-fit: cover; transition: scale var(--motion-settle) var(--ease-out); }
  .card-interactive:hover .print-image img { scale: 1.03; }
  .print-image-empty { display: grid; place-items: center; color: var(--color-accent); }
```
**Step 4:** Verify GREEN → 2 passed. **Step 5:** Commit `feat(ui): PrintImage with halftone and icon fallback`

---

### Task 11: Swipe physics (pure functions) 🔴 NOT_STARTED

**Files:** Create `client/src/components/kesfet/swipePhysics.js`; test `swipePhysics.test.js`.

**Behavioral contract:**
| Call | Expected |
|------|----------|
| `decide(0, 0)` | `null` |
| `decide(119, 0)` | `null` |
| `decide(120, 0)` | `'giderim'` |
| `decide(-120, 0)` | `'gec'` |
| `decide(50, 0.8)` | `'giderim'` (flick) |
| `decide(-50, -0.8)` | `'gec'` (flick) |
| `decide(30, 2)` | `null` (flick needs ≥ 40 px travel) |
| `decide(50, -0.8)` | `null` (velocity against travel) |
| `rotation(0)`, `rotation(100)`, `rotation(400)`, `rotation(-400)` | `0`, `5`, `12`, `-12` |
| `stampOpacity(0)`, `(60)`, `(120)`, `(-240)` | `0`, `0.5`, `1`, `1` |
| `flyOutX('giderim', 400)`, `flyOutX('gec', 400)` | `600`, `-600` |

**Step 1 (RED):**
```js
import { decide, flyOutX, rotation, stampOpacity, THRESHOLD } from './swipePhysics';

test('threshold is 120px', () => expect(THRESHOLD).toBe(120));
test.each([
  [0, 0, null], [119, 0, null], [120, 0, 'giderim'], [-120, 0, 'gec'],
  [50, 0.8, 'giderim'], [-50, -0.8, 'gec'], [30, 2, null], [50, -0.8, null],
])('decide(%d, %d) → %s', (dx, vx, out) => expect(decide(dx, vx)).toBe(out));
test.each([[0, 0], [100, 5], [400, 12], [-400, -12]])('rotation(%d) → %d', (dx, deg) => expect(rotation(dx)).toBe(deg));
test.each([[0, 0], [60, 0.5], [120, 1], [-240, 1]])('stampOpacity(%d) → %d', (dx, o) => expect(stampOpacity(dx)).toBe(o));
test('flyOutX clears the card fully', () => {
  expect(flyOutX('giderim', 400)).toBe(600);
  expect(flyOutX('gec', 400)).toBe(-600);
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```js
export const THRESHOLD = 120; // px, from the screen inventory
const FLICK_VELOCITY = 0.6;   // px/ms
const FLICK_MIN_TRAVEL = 40;  // px (WHY: stops a jittery tap from counting as a flick)
const MAX_ROTATION = 12;      // deg

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dirOf = (n) => (n > 0 ? 'giderim' : 'gec');

export function decide(dx, vx = 0) {
  if (Math.abs(dx) >= THRESHOLD) return dirOf(dx);
  const flick = Math.abs(dx) >= FLICK_MIN_TRAVEL && Math.abs(vx) >= FLICK_VELOCITY && Math.sign(vx) === Math.sign(dx);
  return flick ? dirOf(dx) : null;
}
export const rotation = (dx) => clamp(dx / 20, -MAX_ROTATION, MAX_ROTATION);
export const stampOpacity = (dx) => clamp(Math.abs(dx) / THRESHOLD, 0, 1);
export const flyOutX = (dir, width) => (dir === 'giderim' ? 1 : -1) * width * 1.5;
```
**Step 4:** Verify GREEN → all passed. **Step 5:** Commit `feat(kesfet): swipe decision physics`

---

### Task 12: SwipeCard (drag, fling, stamps, undo entrance) 🔴 NOT_STARTED

**Files:** Create `client/src/components/kesfet/SwipeCard.jsx`; modify `index.css`; test `SwipeCard.test.jsx`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| drag +150 px | `onDecide('giderim')` after `DURATION.fly` ms, not before |
| drag +50 px slowly (500 ms) | no decision; transform resets to `translateX(0px) rotate(0deg)` |
| drag move to +60 px | GİDERİM stamp opacity `0.5`; GEÇ stamp `0` |
| `ref.fling('gec')` | `onDecide('gec')` after fly-out |
| `fling` called twice | `onDecide` called once |
| reduced motion + `fling('giderim')` | `onDecide` called synchronously |
| `enterFrom="gec"` (undo) | first frame offscreen left, then settles to 0 |

**Step 1 (RED):**
```jsx
import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SwipeCard } from './SwipeCard';
import { DURATION } from '../motion/motion';
import { setReducedMotion } from '../../test/env';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (props = {}) => {
  const onDecide = vi.fn();
  const ref = createRef();
  render(<SwipeCard ref={ref} label="Moda" onDecide={onDecide} {...props}>içerik</SwipeCard>);
  return { onDecide, ref, card: screen.getByRole('article', { name: 'Moda' }) };
};
const drag = (card, dx, ms = 500) => {
  fireEvent.pointerDown(card, { clientX: 0, pointerId: 1 });
  act(() => vi.advanceTimersByTime(ms));
  fireEvent.pointerMove(card, { clientX: dx, pointerId: 1 });
  fireEvent.pointerUp(card, { clientX: dx, pointerId: 1 });
};

test('past threshold flies out then decides', () => {
  const { card, onDecide } = setup();
  drag(card, 150);
  expect(onDecide).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(DURATION.fly));
  expect(onDecide).toHaveBeenCalledWith('giderim');
});
test('short slow drag springs back', () => {
  const { card, onDecide } = setup();
  drag(card, 50);
  expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
  act(() => vi.advanceTimersByTime(1000));
  expect(onDecide).not.toHaveBeenCalled();
});
test('stamp fades in with travel', () => {
  const { card } = setup();
  fireEvent.pointerDown(card, { clientX: 0, pointerId: 1 });
  fireEvent.pointerMove(card, { clientX: 60, pointerId: 1 });
  expect(screen.getByText('GİDERİM').style.opacity).toBe('0.5');
  expect(screen.getByText('GEÇ').style.opacity).toBe('0');
});
test('fling via ref decides once', () => {
  const { ref, onDecide } = setup();
  act(() => { ref.current.fling('gec'); ref.current.fling('gec'); });
  act(() => vi.advanceTimersByTime(DURATION.fly));
  expect(onDecide).toHaveBeenCalledTimes(1);
  expect(onDecide).toHaveBeenCalledWith('gec');
});
test('reduced motion decides immediately', () => {
  setReducedMotion(true);
  const { ref, onDecide } = setup();
  act(() => ref.current.fling('giderim'));
  expect(onDecide).toHaveBeenCalledWith('giderim');
});
test('undo entrance starts offscreen and settles', () => {
  const { card } = setup({ enterFrom: 'gec' });
  expect(card.style.transform).toMatch(/^translateX\(-540px\)/);
  act(() => vi.advanceTimersByTime(20));
  expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { decide, flyOutX, rotation, stampOpacity } from './swipePhysics';
import { DURATION, EASE, duration } from '../motion/motion';
import { useReducedMotion } from '../motion/useReducedMotion';

const FALLBACK_WIDTH = 360; // (WHY: jsdom and first paint report offsetWidth 0)

export const SwipeCard = forwardRef(function SwipeCard({ label, onDecide, enterFrom = null, children }, ref) {
  const el = useRef(null);
  const start = useRef(null);
  const decided = useRef(false);
  const reduced = useReducedMotion();
  const [dx, setDx] = useState(() => (enterFrom && !reduced ? flyOutX(enterFrom, FALLBACK_WIDTH) : 0));
  const [phase, setPhase] = useState('idle'); // idle | drag | settle | out

  useEffect(() => {
    if (!enterFrom || reduced) return undefined;
    const id = requestAnimationFrame(() => { setPhase('settle'); setDx(0); });
    return () => cancelAnimationFrame(id);
  }, [enterFrom, reduced]);

  const fling = useCallback((dir) => {
    if (decided.current) return;
    decided.current = true;
    if (reduced) { onDecide(dir); return; }
    setPhase('out');
    setDx(flyOutX(dir, el.current?.offsetWidth || FALLBACK_WIDTH));
    window.setTimeout(() => onDecide(dir), DURATION.fly);
  }, [onDecide, reduced]);
  useImperativeHandle(ref, () => ({ fling }), [fling]);

  const onPointerDown = (e) => {
    if (decided.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, t: Date.now() };
    setPhase('drag');
  };
  const onPointerMove = (e) => { if (start.current) setDx(e.clientX - start.current.x); };
  const onPointerUp = (e) => {
    if (!start.current) return;
    const travel = e.clientX - start.current.x;
    const dt = Math.max(Date.now() - start.current.t, 16); // (MEASURED, gesture duration ms; floor avoids divide-by-zero)
    start.current = null;
    const dir = decide(travel, travel / dt);
    if (dir) fling(dir);
    else { setPhase('settle'); setDx(0); }
  };

  const transition = phase === 'drag' ? 'none'
    : phase === 'out' ? `transform ${duration('fly')}ms ${EASE.inOut}, opacity ${duration('fly')}ms ${EASE.inOut}`
    : `transform ${duration('settle')}ms ${EASE.press}`;

  return (
    <article ref={el} aria-label={label} className="swipe-card card elev-md" data-phase={phase}
      style={{ transform: `translateX(${dx}px) rotate(${rotation(dx)}deg)`, transition, opacity: phase === 'out' ? 0 : 1 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <span className="stamp stamp-giderim" aria-hidden="true" style={{ opacity: dx > 0 ? stampOpacity(dx) : 0 }}>GİDERİM</span>
      <span className="stamp stamp-gec" aria-hidden="true" style={{ opacity: dx < 0 ? stampOpacity(dx) : 0 }}>GEÇ</span>
      {children}
    </article>
  );
});
```
CSS (append):
```css
  .swipe-card { position: absolute; inset: 0; touch-action: pan-y; user-select: none; cursor: grab; will-change: transform;
    animation: deck-promote var(--motion-settle) var(--ease-out); }
  .swipe-card[data-phase="drag"] { cursor: grabbing; }
  @keyframes deck-promote { from { scale: 0.96; translate: 0 12px; } }
  /* Rubber stamps: double-ruled like a press mark; text is the state, color only reinforces it */
  .stamp { position: absolute; top: var(--space-4); z-index: 2; padding: 4px 12px; pointer-events: none;
    font-family: var(--font-heading); font-weight: var(--font-heading-weight); font-size: 28px; letter-spacing: 0.08em;
    border: 4px double currentColor; border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-bg) 70%, transparent); }
  .stamp-giderim { left: var(--space-4); color: var(--color-accent-ink); rotate: -12deg; }
  .stamp-gec { right: var(--space-4); color: var(--color-text); rotate: 12deg; }
```
**Step 4:** Verify GREEN → 6 passed. **Step 5:** Commit `feat(kesfet): draggable SwipeCard with stamps, fling and undo entrance`

---

### Task 13: KesfetCardBody + KesfetDeck 🔴 NOT_STARTED

**Files:** Create `client/src/components/kesfet/KesfetDeck.jsx`; modify `index.css`; test `KesfetDeck.test.jsx`.

Card shape used below (confirm in Task 15 Step 0): `{ id, ad, tur, turEtiketi, semt, aciklama, dogrulanacak, atolyeSuresiDk, erisilebilirlikOzeti, gorsel }`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| 3 cards | top card is an `article` named after `cards[0].ad`; 2 under-cards `aria-hidden` |
| press → | `onDecide('giderim')` after fly-out |
| press ← while focus is in an `<input>` | nothing |
| click "Geç" | `onDecide('gec')` after fly-out |
| `canUndo={false}` | "Geri al" disabled |
| `cards=[]` | "Deste bitti" + "Desteyi baştan karıştır" calls `onReset` |
| `status="yukleniyor"` / `"hata"` | LoadingState / ErrorState with retry |
| `dogrulanacak: true` | "Doğrulanacak" tag visible |

**Step 1 (RED):**
```jsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { KesfetDeck } from './KesfetDeck';
import { DURATION } from '../motion/motion';

const card = (id, extra = {}) => ({ id, ad: `Yer ${id}`, tur: 'atolye', turEtiketi: 'Atölye', semt: 'Kadıköy', aciklama: 'Kısa', dogrulanacak: false, ...extra });
const base = { onDecide: vi.fn(), onUndo: vi.fn(), canUndo: true, onRetry: vi.fn(), onReset: vi.fn() };
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('stacks the top card over two hidden cards', () => {
  const { container } = render(<KesfetDeck {...base} cards={[card(1), card(2), card(3), card(4)]} />);
  expect(screen.getByRole('article', { name: 'Yer 1' })).toBeInTheDocument();
  expect(container.querySelectorAll('.deck-under[aria-hidden="true"]')).toHaveLength(2);
});
test('arrow keys decide', () => {
  const onDecide = vi.fn();
  render(<KesfetDeck {...base} onDecide={onDecide} cards={[card(1)]} />);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  act(() => vi.advanceTimersByTime(DURATION.fly));
  expect(onDecide).toHaveBeenCalledWith('giderim');
});
test('arrow keys are ignored inside inputs', () => {
  const onDecide = vi.fn();
  render(<><input aria-label="ara" /><KesfetDeck {...base} onDecide={onDecide} cards={[card(1)]} /></>);
  fireEvent.keyDown(screen.getByLabelText('ara'), { key: 'ArrowLeft' });
  act(() => vi.advanceTimersByTime(DURATION.fly));
  expect(onDecide).not.toHaveBeenCalled();
});
test('Geç button flings left', () => {
  const onDecide = vi.fn();
  render(<KesfetDeck {...base} onDecide={onDecide} cards={[card(1)]} />);
  fireEvent.click(screen.getByRole('button', { name: /Geç/ }));
  act(() => vi.advanceTimersByTime(DURATION.fly));
  expect(onDecide).toHaveBeenCalledWith('gec');
});
test('undo disabled when nothing to undo', () => {
  render(<KesfetDeck {...base} canUndo={false} cards={[card(1)]} />);
  expect(screen.getByRole('button', { name: /Geri al/ })).toBeDisabled();
});
test('empty deck offers reset', () => {
  const onReset = vi.fn();
  render(<KesfetDeck {...base} onReset={onReset} cards={[]} />);
  expect(screen.getByText('Deste bitti')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Desteyi baştan karıştır' }));
  expect(onReset).toHaveBeenCalledOnce();
});
test('loading and error states', () => {
  const { rerender } = render(<KesfetDeck {...base} status="yukleniyor" cards={[]} />);
  expect(screen.getByRole('status')).toHaveTextContent('Kartlar hazırlanıyor…');
  rerender(<KesfetDeck {...base} status="hata" cards={[]} />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
test('shows the Doğrulanacak badge', () => {
  render(<KesfetDeck {...base} cards={[card(1, { dogrulanacak: true })]} />);
  expect(screen.getAllByText('Doğrulanacak')[0]).toBeVisible();
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { useEffect, useRef } from 'react';
import { ArrowCounterClockwise, Clock, Heart, Wheelchair, X } from '@phosphor-icons/react';
import { SwipeCard } from './SwipeCard';
import { PrintImage } from '../ui/PrintImage';
import { EmptyState, ErrorState, LoadingState } from '../ui/States';

export function KesfetCardBody({ kart }) {
  return (
    <>
      <PrintImage src={kart.gorsel?.src} alt={kart.gorsel?.alt ?? kart.ad} label={kart.turEtiketi} ratio="16 / 10" />
      <div className="kesfet-tags">
        <span className="tag tag-accent">{kart.turEtiketi}</span>
        <span className="tag tag-neutral">{kart.semt}</span>
        {kart.dogrulanacak && <span className="tag tag-outline">Doğrulanacak</span>}
      </div>
      <h3 className="kesfet-title">{kart.ad}</h3>
      <p className="card-body">{kart.aciklama}</p>
      <div className="card-meta kesfet-meta">
        {kart.atolyeSuresiDk && <span><Clock weight="duotone" aria-hidden="true" /> {kart.atolyeSuresiDk} dk atölye</span>}
        {kart.erisilebilirlikOzeti && <span><Wheelchair weight="duotone" aria-hidden="true" /> {kart.erisilebilirlikOzeti}</span>}
      </div>
    </>
  );
}

const isTyping = (t) => t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]');

export function KesfetDeck({ cards, status = 'hazir', onDecide, onUndo, canUndo, undoFrom = null, onRetry, onReset }) {
  const top = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e.target)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); top.current?.fling('giderim'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); top.current?.fling('gec'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (status === 'yukleniyor') return <LoadingState label="Kartlar hazırlanıyor" />;
  if (status === 'hata') return <ErrorState message="Kartlar yüklenemedi." onRetry={onRetry} />;
  if (cards.length === 0) {
    return <EmptyState title="Deste bitti" body="Bu filtrelerle gösterilecek yer kalmadı. Filtreleri genişletebilir ya da desteyi yeniden karıştırabilirsin."
      action={<button type="button" className="btn btn-secondary" onClick={onReset}>Desteyi baştan karıştır</button>} />;
  }

  const visible = cards.slice(0, 3);
  return (
    <div className="deck">
      <div className="deck-stack">
        {visible.map((kart, i) => (i === 0
          ? <SwipeCard key={kart.id} ref={top} label={kart.ad} enterFrom={undoFrom} onDecide={onDecide}><KesfetCardBody kart={kart} /></SwipeCard>
          : <div key={kart.id} className="deck-under card" data-depth={i} aria-hidden="true"><KesfetCardBody kart={kart} /></div>
        )).reverse()}
      </div>
      <div className="deck-actions" role="group" aria-label="Kararın">
        <button type="button" className="btn btn-secondary deck-btn" onClick={() => top.current?.fling('gec')}><X weight="duotone" size={22} aria-hidden="true" /> Geç</button>
        <button type="button" className="btn btn-ghost deck-btn" onClick={onUndo} disabled={!canUndo}><ArrowCounterClockwise weight="duotone" size={22} aria-hidden="true" /> Geri al</button>
        <button type="button" className="btn btn-primary deck-btn" onClick={() => top.current?.fling('giderim')}><Heart weight="duotone" size={22} aria-hidden="true" /> Giderim</button>
      </div>
      <p className="text-muted deck-hint">Klavyede ← geç, → giderim.</p>
    </div>
  );
}
```
CSS (append):
```css
  .deck { display: grid; gap: var(--space-4); max-width: 460px; }
  .deck-stack { position: relative; aspect-ratio: 3 / 4; }
  .deck-under { position: absolute; inset: 0; pointer-events: none; transition: scale var(--motion-settle) var(--ease-out), translate var(--motion-settle) var(--ease-out); }
  .deck-under[data-depth="1"] { scale: 0.96; translate: 0 12px; }
  .deck-under[data-depth="2"] { scale: 0.92; translate: 0 24px; opacity: 0.6; }
  .deck-actions { display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--space-2); }
  .deck-btn { min-height: 52px; }
  .deck-hint { margin: 0; font-size: 13px; }
  .kesfet-tags { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .kesfet-title { margin: 0; font-size: calc(22px * var(--type-scale)); }
  .kesfet-meta { flex-wrap: wrap; gap: var(--space-3); font-size: 13px; }
  .kesfet-meta span { display: inline-flex; align-items: center; gap: 4px; }
  @media (max-width: 480px) { .deck-stack { aspect-ratio: 3 / 4.4; } }
```
**Step 4:** Verify GREEN → 8 passed. **Step 5:** Commit `feat(kesfet): deck view with stacked cards, actions, keyboard and states`

---

### Task 14: SelectionPanel ("Gideceğim yerler") 🔴 NOT_STARTED

**Files:** Create `client/src/components/kesfet/SelectionPanel.jsx`; modify `index.css`; test `SelectionPanel.test.jsx`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| 0 items | "Henüz seçim yok"; build disabled |
| 1 item | build disabled; hint "Rota için en az 2 yer seç (1/2)." |
| 2 items | build enabled; hint "2 yer seçildi." |
| 16 items | build disabled; hint contains "1 yeri çıkar" |
| `building` | button text "Rota hesaplanıyor…", disabled, `aria-busy="true"` |
| click remove on "Yer 1" | `onRemove(1)` |

**Step 1 (RED):**
```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectionPanel } from './SelectionPanel';

const items = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, ad: `Yer ${i + 1}`, semt: 'Fatih' }));
const btn = () => screen.getByRole('button', { name: /Rotamı oluştur|Rota hesaplanıyor/ });

test('empty', () => { render(<SelectionPanel items={[]} onRemove={vi.fn()} onBuild={vi.fn()} />); expect(screen.getByText('Henüz seçim yok')).toBeInTheDocument(); expect(btn()).toBeDisabled(); });
test('one item', () => { render(<SelectionPanel items={items(1)} onRemove={vi.fn()} onBuild={vi.fn()} />); expect(btn()).toBeDisabled(); expect(screen.getByText('Rota için en az 2 yer seç (1/2).')).toBeInTheDocument(); });
test('two items', () => { const onBuild = vi.fn(); render(<SelectionPanel items={items(2)} onRemove={vi.fn()} onBuild={onBuild} />); fireEvent.click(btn()); expect(onBuild).toHaveBeenCalledOnce(); expect(screen.getByText('2 yer seçildi.')).toBeInTheDocument(); });
test('over max', () => { render(<SelectionPanel items={items(16)} onRemove={vi.fn()} onBuild={vi.fn()} />); expect(btn()).toBeDisabled(); expect(screen.getByText(/1 yeri çıkar/)).toBeInTheDocument(); });
test('building', () => { render(<SelectionPanel items={items(3)} building onRemove={vi.fn()} onBuild={vi.fn()} />); expect(btn()).toHaveTextContent('Rota hesaplanıyor…'); expect(btn()).toBeDisabled(); expect(btn()).toHaveAttribute('aria-busy', 'true'); });
test('remove', () => { const onRemove = vi.fn(); render(<SelectionPanel items={items(2)} onRemove={onRemove} onBuild={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: 'Yer 1 listeden çıkar' })); expect(onRemove).toHaveBeenCalledWith(1); });
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { X } from '@phosphor-icons/react';
import { EmptyState } from '../ui/States';

export const MIN_STOPS = 2;
export const MAX_STOPS = 15;

export function SelectionPanel({ items, onRemove, onBuild, building = false }) {
  const n = items.length;
  const canBuild = n >= MIN_STOPS && n <= MAX_STOPS && !building;
  const hint = n < MIN_STOPS ? `Rota için en az ${MIN_STOPS} yer seç (${n}/${MIN_STOPS}).`
    : n > MAX_STOPS ? `En fazla ${MAX_STOPS} yer seçebilirsin; ${n - MAX_STOPS} yeri çıkar.`
    : `${n} yer seçildi.`;
  return (
    <aside className="selection" aria-labelledby="secimler-baslik">
      <h2 id="secimler-baslik" className="selection-title">Gideceğim yerler</h2>
      {n === 0
        ? <EmptyState title="Henüz seçim yok" body="Beğendiğin kartı sağa kaydır; burada birikir." />
        : (
          <ol className="selection-list">
            {items.map((k) => (
              <li key={k.id} className="selection-item">
                <span className="selection-name">{k.ad}<span className="text-muted"> · {k.semt}</span></span>
                <button type="button" className="btn btn-icon btn-ghost" aria-label={`${k.ad} listeden çıkar`} onClick={() => onRemove(k.id)}>
                  <X weight="duotone" size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      <p id="secimler-ipucu" className="text-muted selection-hint" aria-live="polite">{hint}</p>
      <button type="button" className="btn btn-primary btn-block" disabled={!canBuild} aria-busy={building}
        aria-describedby="secimler-ipucu" onClick={onBuild}>
        {building ? 'Rota hesaplanıyor…' : 'Rotamı oluştur'}
      </button>
    </aside>
  );
}
```
CSS (append):
```css
  .selection-title { font-size: calc(25px * var(--type-scale)); }
  .selection-list { list-style: decimal-leading-zero; margin: 0; padding-left: 2.2em; display: grid; gap: var(--space-1); }
  .selection-item { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
    animation: item-in var(--motion-enter) var(--ease-out) both; }
  .selection-name { font-size: 16px; }
  .selection-hint { margin: var(--space-3) 0 0; font-size: 13px; }
  @keyframes item-in { from { opacity: 0; translate: -8px 0; } }
```
**Step 4:** Verify GREEN → 6 passed. **Step 5:** Commit `feat(kesfet): selection panel with 2–15 stop guard`

---

### Task 15: Keşfet page wiring 🔴 NOT_STARTED

**Files:** Replace `client/src/pages/Kesfet.jsx` (or the file mapped to `/kesfet`). Test: `client/src/pages/Kesfet.test.jsx`.

**Step 0: Confirm contracts.** Read `src/hooks/useKesfet.js` and `src/services/api.js`, then fill in this table in `ASSUMPTIONS.md`:
| Plan expects | Look for |
|---|---|
| `useKesfet(filtre)` → `kartlar` (remaining, in order), `begenilenler`, `karar(yon)`, `geriAl()`, `cikar(id)`, `sifirla()` | exact `karar` argument values (assumed `'begen'`/`'gec'`) |
| loading / error flags | assumed `yukleniyor`, `hata`; else derive from `useApi` |
| filter shape | assumed `{ semtler: string[], turler: string[] }` |
| route-building call | assumed `api.planOlustur(ids)` → `{ id }` |
| `useTercihler().erisilebilir` | boolean |

Only the lines marked `// ADAPTER` may change to match.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| hook returns 2 cards | deck + SelectionPanel + 2 ChipGroups ("Semt", "Tür") render |
| deck decides `giderim` | `karar('begen')` called |
| undo | `geriAl()` called; restored card enters from the side it left |
| accessible mode on | note "Erişilebilir mod açık" visible |
| build succeeds | navigate to `/plan/:id` |
| build fails | `role="alert"` "Rota oluşturulamadı" |

**Step 1 (RED):**
```jsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Kesfet from './Kesfet';
import { DURATION } from '../components/motion/motion';

const hook = { kartlar: [], begenilenler: [], karar: vi.fn(), geriAl: vi.fn(), cikar: vi.fn(), sifirla: vi.fn(), yukleniyor: false, hata: null };
vi.mock('../hooks/useKesfet', () => ({ useKesfet: () => hook }));
vi.mock('../context/Tercihler', () => ({ useTercihler: () => ({ erisilebilir: true }) }));
vi.mock('../services/api', () => ({ api: { planOlustur: vi.fn(async () => ({ id: 'p1' })) } }));

const k = (id) => ({ id, ad: `Yer ${id}`, tur: 'tarihi', turEtiketi: 'Tarihi miras', semt: 'Fatih' });
const renderPage = () => render(
  <MemoryRouter initialEntries={['/kesfet']}>
    <Routes><Route path="/kesfet" element={<Kesfet />} /><Route path="/plan/:id" element={<p>plan sayfası</p>} /></Routes>
  </MemoryRouter>);

beforeEach(() => { Object.assign(hook, { kartlar: [k(1), k(2)], begenilenler: [k(3), k(4)] }); vi.clearAllMocks(); });

test('renders deck, filters, panel and the accessible-mode note', () => {
  renderPage();
  expect(screen.getByRole('article', { name: 'Yer 1' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Semt' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Tür' })).toBeInTheDocument();
  expect(screen.getByText(/Erişilebilir mod açık/)).toBeInTheDocument();
});
test('maps giderim to karar("begen")', () => {
  vi.useFakeTimers();
  renderPage();
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  act(() => vi.advanceTimersByTime(DURATION.fly));
  expect(hook.karar).toHaveBeenCalledWith('begen');
  vi.useRealTimers();
});
test('build navigates to the plan', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Rotamı oluştur' }));
  expect(await screen.findByText('plan sayfası')).toBeInTheDocument();
});
test('build failure shows an alert', async () => {
  const { api } = await import('../services/api');
  api.planOlustur.mockRejectedValueOnce(new Error('x'));
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Rotamı oluştur' }));
  expect(await screen.findByText('Rota oluşturulamadı. Biraz sonra tekrar dene.')).toBeInTheDocument();
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wheelchair } from '@phosphor-icons/react';
import { useKesfet } from '../hooks/useKesfet';
import { useTercihler } from '../context/Tercihler';
import { api } from '../services/api';
import { PageWrap, Split } from '../components/layout/Layout';
import { ChipGroup } from '../components/ui/Chip';
import { KesfetDeck } from '../components/kesfet/KesfetDeck';
import { SelectionPanel } from '../components/kesfet/SelectionPanel';

const uniq = (list, key, label) => [...new Map(list.map((x) => [x[key], { value: x[key], label: x[label] }])).values()];

export default function Kesfet() {
  const [filtre, setFiltre] = useState({ semtler: [], turler: [] });   // ADAPTER: filter shape
  const k = useKesfet(filtre);
  const { erisilebilir } = useTercihler();                              // ADAPTER
  const navigate = useNavigate();
  const history = useRef([]);
  const [undoFrom, setUndoFrom] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  // (WHY: options come from the first unfiltered load, so filtering never removes a chip the user may want to turn back on)
  const options = useRef(null);
  if (!options.current && k.kartlar.length) {
    options.current = { semt: uniq(k.kartlar, 'semt', 'semt'), tur: uniq(k.kartlar, 'tur', 'turEtiketi') };
  }

  const onDecide = (dir) => { history.current.push(dir); setUndoFrom(null); k.karar(dir === 'giderim' ? 'begen' : 'gec'); }; // ADAPTER: karar args
  const onUndo = () => { const last = history.current.pop(); if (!last) return; setUndoFrom(last); k.geriAl(); };
  const onBuild = async () => {
    setBuilding(true); setBuildError(null);
    try {
      const plan = await api.planOlustur(k.begenilenler.map((b) => b.id));  // ADAPTER: route call
      navigate(`/plan/${plan.id}`);
    } catch {
      setBuildError('Rota oluşturulamadı. Biraz sonra tekrar dene.');
      setBuilding(false);
    }
  };
  const status = k.yukleniyor ? 'yukleniyor' : k.hata ? 'hata' : 'hazir';  // ADAPTER

  return (
    <PageWrap className="kesfet-page">
      <header className="page-head">
        <p className="kicker">Keşfet</p>
        <h1>Sağa kaydır, gideceğin yerleri topla</h1>
        <p className="lede">Beğendiğin yerlerden yürüyüş rotanı biz çıkaralım.</p>
      </header>
      <div className="kesfet-filters">
        <ChipGroup legend="Semt" options={options.current?.semt ?? []} value={filtre.semtler} onChange={(semtler) => setFiltre((f) => ({ ...f, semtler }))} />
        <ChipGroup legend="Tür" options={options.current?.tur ?? []} value={filtre.turler} onChange={(turler) => setFiltre((f) => ({ ...f, turler }))} />
        {erisilebilir && (
          <p className="a11y-note"><Wheelchair weight="duotone" size={20} aria-hidden="true" />
            <span>Erişilebilir mod açık: merdivenli ve dik yokuşlu yerler gösterilmiyor.</span></p>
        )}
      </div>
      <Split ratio="7-5" sticky>
        <KesfetDeck cards={k.kartlar} status={status} onDecide={onDecide} onUndo={onUndo}
          canUndo={history.current.length > 0} undoFrom={undoFrom} onRetry={() => k.sifirla()} onReset={() => k.sifirla()} />
        <div>
          <SelectionPanel items={k.begenilenler} onRemove={k.cikar} onBuild={onBuild} building={building} />
          {buildError && <p role="alert" className="form-error">{buildError}</p>}
        </div>
      </Split>
    </PageWrap>
  );
}
```
CSS (append):
```css
  .page-head { padding-top: var(--space-8); margin-bottom: var(--space-6); max-width: 60ch; }
  .page-head h1 { text-wrap: balance; }
  .lede { font-size: calc(18px * var(--type-scale)); line-height: 1.5; text-wrap: pretty; }
  .kesfet-filters { display: grid; gap: var(--space-4); margin-bottom: var(--space-8); }
  .a11y-note { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-style: italic; }
  .form-error { color: var(--color-accent-2-700); margin-top: var(--space-2); }
  [data-tema="koyu"] .form-error { color: var(--color-accent-2-300); }
```
**Step 4:** Verify GREEN → 4 passed. Manual check at 375 px: the deck sits above the panel, the thumb can reach the action row, and a vertical page scroll still works on the card (`touch-action: pan-y`).

**Step 5:** Commit `feat(kesfet): wire deck, filters and selection to useKesfet`

---

### Task 16: PlateText + SummaryFigures 🔴 NOT_STARTED

**Files:** Create `client/src/components/ui/PlateText.jsx`, `client/src/components/ui/SummaryFigures.jsx`, `client/src/components/ui/format.js`; modify `index.css`; test `client/src/components/ui/Figures.test.jsx`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| `<PlateText>5</PlateText>` | `.cmyk-num` with one `.paper` "5" and three `aria-hidden` plates |
| `<PlateText variant="head">` | class `cmyk-head` |
| `formatSure(45)`, `formatSure(135)`, `formatSure(120)` | `"45 dk"`, `"2 sa 15 dk"`, `"2 sa"` |
| `formatMesafe(350)`, `formatMesafe(4200)` | `"350 m"`, `"4,2 km"` |
| `SummaryFigures items=[{label:'Yürüyüş', value:'4,2 km'}]` | `<dl>` with `dt` "Yürüyüş" and `dd` "4,2 km" |

**Step 1 (RED):**
```jsx
import { render, screen } from '@testing-library/react';
import { PlateText } from './PlateText';
import { SummaryFigures } from './SummaryFigures';
import { formatMesafe, formatSure } from './format';

test('plate numeral prints once for AT, three plates hidden', () => {
  const { container } = render(<PlateText>5</PlateText>);
  expect(container.querySelector('.cmyk-num .paper')).toHaveTextContent('5');
  const plates = container.querySelectorAll('.plate');
  expect(plates).toHaveLength(3);
  plates.forEach((p) => expect(p).toHaveAttribute('aria-hidden', 'true'));
});
test('head variant', () => {
  const { container } = render(<PlateText variant="head">Başlık</PlateText>);
  expect(container.firstChild).toHaveClass('cmyk-head');
});
test.each([[45, '45 dk'], [135, '2 sa 15 dk'], [120, '2 sa']])('formatSure(%d)', (m, s) => expect(formatSure(m)).toBe(s));
test.each([[350, '350 m'], [4200, '4,2 km']])('formatMesafe(%d)', (m, s) => expect(formatMesafe(m)).toBe(s));
test('summary figures as a definition list', () => {
  render(<SummaryFigures items={[{ label: 'Yürüyüş', value: '4,2 km' }]} />);
  expect(screen.getByRole('term')).toHaveTextContent('Yürüyüş');
  expect(screen.getByRole('definition')).toHaveTextContent('4,2 km');
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**

`format.js`
```js
export function formatSure(dk) {
  const h = Math.floor(dk / 60); const m = Math.round(dk % 60);
  if (!h) return `${m} dk`;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}
export function formatMesafe(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}
```
`PlateText.jsx`
```jsx
export function PlateText({ variant = 'num', children }) {
  return (
    <span className={variant === 'head' ? 'cmyk-head' : 'cmyk-num'}>
      <span className="paper">{children}</span>
      {['c', 'm', 'y'].map((p) => <span key={p} className={`plate plate-${p}`} aria-hidden="true">{children}</span>)}
    </span>
  );
}
```
`SummaryFigures.jsx`
```jsx
export function SummaryFigures({ items }) {
  return (
    <dl className="figures">
      {items.map((it) => (
        <div key={it.label} className="figure"><dt>{it.label}</dt><dd>{it.value}</dd></div>
      ))}
    </dl>
  );
}
```
CSS (append):
```css
  /* Figures are type, not boxes */
  .figures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6) var(--space-4); margin: 0; }
  @media (min-width: 768px) { .figures { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .figure dt { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 65%, transparent); }
  .figure dd { margin: var(--space-1) 0 0; font-family: var(--font-heading); font-weight: var(--font-heading-weight);
    font-size: calc(30px * var(--type-scale)); line-height: 1.1; font-variant-numeric: tabular-nums; }
```
**Step 4:** Verify GREEN → 7 passed. **Step 5:** Commit `feat(ui): plate numeral, summary figures, tr-TR formatters`

---

### Task 17: StopTimeline + LegRow 🔴 NOT_STARTED

This is the İPA itinerary timeline restated in Broadsheet: numbered stops on a hairline spine, with leg rows between them. Stops stagger in with `Reveal`.

**Files:** Create `client/src/components/rota/StopTimeline.jsx`; modify `index.css`; test `StopTimeline.test.jsx`.

Data (confirm in Task 18 Step 0): `stops[i] = { id, ad, ziyaretDk, enYakinDurak, toplanmaAlani, erisimUyarisi?, atlandi? }`, `legs[i]` connects stop i → i+1: `{ tur: 'yuru'|'yaka'|'uzak', metre, dakika, tarifUrl? }`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| 3 stops, 2 legs | `ol` with 3 `li`; headings "Durak 1: …" (prefix visually hidden) |
| leg `yuru` 350 m, 4 dk | "Yürü 350 m · 4 dk" with a walk icon |
| leg `yaka` | "Yaka değişiyor: vapur/Marmaray" + link "Yol tarifi" (`target=_blank`, `rel` includes `noopener`) |
| leg `uzak` | "Uzak: toplu taşıma önerilir" + link |
| stop with `erisimUyarisi` | warning icon + text |
| stop `atlandi: true` | `data-skipped="true"` + text "Erişilebilir modda atlandı" |

**Step 1 (RED):**
```jsx
import { render, screen, within } from '@testing-library/react';
import { StopTimeline } from './StopTimeline';

const stops = [
  { id: 'a', ad: 'Ayasofya', ziyaretDk: 90, enYakinDurak: 'T1 Sultanahmet', toplanmaAlani: 'Sultanahmet Meydanı', erisimUyarisi: 'Girişte 4 basamak' },
  { id: 'b', ad: 'Yerebatan', ziyaretDk: 60, enYakinDurak: 'T1 Sultanahmet', toplanmaAlani: 'Sultanahmet Meydanı', atlandi: true },
  { id: 'c', ad: 'Moda', ziyaretDk: 120, enYakinDurak: 'Kadıköy İskelesi', toplanmaAlani: 'Moda Parkı' },
];
const legs = [{ tur: 'yuru', metre: 350, dakika: 4 }, { tur: 'yaka', tarifUrl: 'https://example.org/t' }];

test('renders an ordered list of stops', () => {
  render(<StopTimeline stops={stops} legs={legs} />);
  const items = within(screen.getByRole('list', { name: 'Duraklar' })).getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Durak 1: Ayasofya' })).toBeInTheDocument();
});
test('walk leg', () => { render(<StopTimeline stops={stops} legs={legs} />); expect(screen.getByText('Yürü 350 m · 4 dk')).toBeInTheDocument(); });
test('shore-change leg links directions', () => {
  render(<StopTimeline stops={stops} legs={legs} />);
  expect(screen.getByText('Yaka değişiyor: vapur/Marmaray')).toBeInTheDocument();
  const a = screen.getByRole('link', { name: /Yol tarifi/ });
  expect(a).toHaveAttribute('target', '_blank');
  expect(a.getAttribute('rel')).toMatch(/noopener/);
});
test('far leg', () => {
  render(<StopTimeline stops={stops.slice(0, 2)} legs={[{ tur: 'uzak', tarifUrl: '#' }]} />);
  expect(screen.getByText('Uzak: toplu taşıma önerilir')).toBeInTheDocument();
});
test('accessibility warning and skipped stop', () => {
  const { container } = render(<StopTimeline stops={stops} legs={legs} />);
  expect(screen.getByText('Girişte 4 basamak')).toBeInTheDocument();
  expect(container.querySelector('[data-skipped="true"]')).toHaveTextContent('Erişilebilir modda atlandı');
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { ArrowSquareOut, Boat, PersonSimpleWalk, Train, Warning } from '@phosphor-icons/react';
import { Reveal } from '../motion/Reveal';
import { formatMesafe } from '../ui/format';

const LEG_TEXT = { yaka: 'Yaka değişiyor: vapur/Marmaray', uzak: 'Uzak: toplu taşıma önerilir' };

export function LegRow({ leg }) {
  if (leg.tur === 'yuru') {
    return <p className="leg"><PersonSimpleWalk weight="duotone" size={20} aria-hidden="true" /><span>Yürü {formatMesafe(leg.metre)} · {leg.dakika} dk</span></p>;
  }
  const Icon = leg.tur === 'yaka' ? Boat : Train;
  return (
    <p className="leg leg-transit">
      <Icon weight="duotone" size={20} aria-hidden="true" /><span>{LEG_TEXT[leg.tur]}</span>
      {leg.tarifUrl && (
        <a href={leg.tarifUrl} target="_blank" rel="noopener noreferrer" className="leg-link">
          Yol tarifi<ArrowSquareOut weight="duotone" size={16} aria-hidden="true" /><span className="sr-only"> (yeni sekmede açılır)</span>
        </a>
      )}
    </p>
  );
}

export function StopTimeline({ stops, legs = [] }) {
  return (
    <ol className="timeline" aria-label="Duraklar">
      {stops.map((s, i) => (
        <li key={s.id} className="stop" data-skipped={String(Boolean(s.atlandi))}>
          <Reveal className="stop-inner" delay={Math.min(i * 60, 300)}>
            <span className="stop-num" aria-hidden="true">{i + 1}</span>
            <div className="stop-body">
              <h3 className="stop-title"><span className="sr-only">Durak {i + 1}: </span>{s.ad}</h3>
              <p className="stop-meta">{s.ziyaretDk} dk ziyaret · En yakın durak: {s.enYakinDurak} · Toplanma alanı: {s.toplanmaAlani}</p>
              {s.erisimUyarisi && <p className="stop-warn"><Warning weight="duotone" size={18} aria-hidden="true" /><span>{s.erisimUyarisi}</span></p>}
              {s.atlandi && <p className="stop-skip">Erişilebilir modda atlandı</p>}
            </div>
          </Reveal>
          {legs[i] && i < stops.length - 1 && <LegRow leg={legs[i]} />}
        </li>
      ))}
    </ol>
  );
}
```
CSS (append):
```css
  .timeline { list-style: none; margin: 0; padding: 0; position: relative; }
  /* the spine is diagram ink, not page structure */
  .timeline::before { content: ""; position: absolute; left: 21px; top: 22px; bottom: 22px; width: 1px; background: var(--color-divider); }
  .stop { position: relative; }
  .stop-inner { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: var(--space-3); }
  .stop-num { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
    background: var(--color-bg); border: 1px solid var(--color-text);
    font-family: var(--font-heading); font-weight: var(--font-heading-weight); font-size: 18px; font-variant-numeric: tabular-nums; }
  .stop-title { margin: 8px 0 var(--space-1); font-size: calc(22px * var(--type-scale)); }
  .stop-meta { margin: 0; font-size: 14px; color: color-mix(in srgb, var(--color-text) 72%, transparent); }
  .stop-warn { display: flex; gap: var(--space-1); align-items: center; margin: var(--space-2) 0 0; font-size: 14px; color: var(--color-accent-2-700); }
  [data-tema="koyu"] .stop-warn { color: var(--color-accent-2-300); }
  .stop-skip { margin: var(--space-1) 0 0; font-style: italic; font-size: 13px; }
  .stop[data-skipped="true"] .stop-inner { opacity: 0.45; }
  .leg { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0; padding: var(--space-3) 0 var(--space-3) calc(44px + var(--space-3)); font-size: 14px; font-style: italic; }
  .leg-transit { color: var(--color-accent-ink); }
  .leg-link { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; font-style: normal; }
```
**Step 4:** Verify GREEN → 5 passed. **Step 5:** Commit `feat(rota): stop timeline with walk/transit leg rows`

---

### Task 18: Kişisel rota page (`/plan/:id`) 🔴 NOT_STARTED

**Files:** Modify the page mapped to `/plan/:id` (e.g. `client/src/pages/Plan.jsx`). Test: `client/src/pages/Plan.test.jsx`.

**Step 0:** Read the current page. Record in `ASSUMPTIONS.md` how it loads the plan (assumed `useApi(() => api.plan(id), [id])` → `{ data, yukleniyor, hata }`). Also record the plan fields (assumed `{ id, duraklar, bacaklar, ozet: { yuruyusMetre, yurumeDk, ziyaretDk, toplamDk }, kaynak: 'valhalla'|'yaklasik' }`) and the name of the map component it already renders. Keep the map component, the share logic and the "Grup aç" link exactly as they are, and move them into the slots below.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| plan with 5 stops | `h1` accessible name "5 duraklı rotan hazır" |
| `ozet` | 4 figures: Yürüyüş mesafesi, Yürüme süresi, Ziyaret süresi, Tahmini toplam |
| `kaynak: 'valhalla'` | note mentions "Valhalla" |
| `kaynak: 'yaklasik'` | note says "Yaklaşık güzergâh" |
| loading / error | LoadingState / ErrorState |

**Step 1 (RED):**
```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Plan from './Plan';

const state = { data: null, yukleniyor: false, hata: null };
vi.mock('../hooks/useApi', () => ({ useApi: () => state }));
vi.mock('../services/api', () => ({ api: { plan: vi.fn() } }));
const stop = (i) => ({ id: String(i), ad: `D${i}`, ziyaretDk: 30, enYakinDurak: 'x', toplanmaAlani: 'y' });
const plan = (kaynak) => ({ id: 'p1', kaynak, duraklar: [1, 2, 3, 4, 5].map(stop), bacaklar: [],
  ozet: { yuruyusMetre: 4200, yurumeDk: 55, ziyaretDk: 150, toplamDk: 205 } });
const renderAt = () => render(<MemoryRouter initialEntries={['/plan/p1']}><Routes><Route path="/plan/:id" element={<Plan />} /></Routes></MemoryRouter>);

test('headline and figures', () => {
  Object.assign(state, { data: plan('valhalla'), yukleniyor: false, hata: null });
  renderAt();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('5 duraklı rotan hazır');
  ['Yürüyüş mesafesi', 'Yürüme süresi', 'Ziyaret süresi', 'Tahmini toplam'].forEach((l) => expect(screen.getByText(l)).toBeInTheDocument());
  expect(screen.getByText('4,2 km')).toBeInTheDocument();
  expect(screen.getByText('3 sa 25 dk')).toBeInTheDocument();
  expect(screen.getByText(/Valhalla/)).toBeInTheDocument();
});
test('approximate source note', () => {
  Object.assign(state, { data: plan('yaklasik') });
  renderAt();
  expect(screen.getByText(/Yaklaşık güzergâh/)).toBeInTheDocument();
});
test('loading', () => {
  Object.assign(state, { data: null, yukleniyor: true });
  renderAt();
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { PageWrap, Section, Split } from '../components/layout/Layout';
import { PlateText } from '../components/ui/PlateText';
import { SummaryFigures } from '../components/ui/SummaryFigures';
import { StopTimeline } from '../components/rota/StopTimeline';
import { ErrorState, LoadingState } from '../components/ui/States';
import { formatMesafe, formatSure } from '../components/ui/format';
// import <ExistingPlanMap/>, <ExistingPlanActions/> found in Step 0

export default function Plan() {
  const { id } = useParams();
  const { data: plan, yukleniyor, hata } = useApi(() => api.plan(id), [id]); // ADAPTER
  if (yukleniyor) return <PageWrap><LoadingState label="Rotan hazırlanıyor" /></PageWrap>;
  if (hata || !plan) return <PageWrap><ErrorState message="Rota bulunamadı ya da yüklenemedi." onRetry={() => window.location.reload()} /></PageWrap>;

  const o = plan.ozet;
  return (
    <PageWrap>
      <header className="page-head plan-head">
        <p className="kicker">Kişisel rota</p>
        <h1 className="plan-title"><PlateText>{plan.duraklar.length}</PlateText> duraklı rotan hazır</h1>
        {/* <ExistingPlanActions plan={plan} />: Grup aç · Paylaş · Seçimlerimi düzenle */}
      </header>
      <SummaryFigures items={[
        { label: 'Yürüyüş mesafesi', value: formatMesafe(o.yuruyusMetre) },
        { label: 'Yürüme süresi', value: formatSure(o.yurumeDk) },
        { label: 'Ziyaret süresi', value: formatSure(o.ziyaretDk) },
        { label: 'Tahmini toplam', value: formatSure(o.toplamDk) },
      ]} />
      <p className="source-note text-muted">
        {plan.kaynak === 'valhalla'
          ? 'Güzergâh, Valhalla ile yaya yol ağı üzerinden hesaplandı.'
          : 'Yaklaşık güzergâh: gerçek yürüme yolu daha uzun olabilir.'}
      </p>
      <Section id="duraklar" title="Duraklar">
        <Split ratio="5-7" sticky>
          <StopTimeline stops={plan.duraklar} legs={plan.bacaklar} />
          <div className="map-slot">{/* <ExistingPlanMap plan={plan} /> */}</div>
        </Split>
      </Section>
    </PageWrap>
  );
}
```
In the split, the timeline goes left and the map right (sticky on wide screens), as in İPA's planner. On mobile the map stacks under the list. If you want it first on mobile, add `.map-slot { order: -1 }` below 1100 px. CSS (append):
```css
  .plan-title { font-size: calc(36px * var(--type-scale)); text-wrap: balance; }
  @media (min-width: 768px) { .plan-title { font-size: calc(56px * var(--type-scale)); } }
  .plan-title .cmyk-num { vertical-align: baseline; }
  .source-note { margin-top: var(--space-4); font-style: italic; font-size: 14px; }
  .map-slot { min-height: 360px; border-radius: var(--radius-md); overflow: hidden; }
  @media (min-width: 1100px) { .map-slot { height: calc(100vh - var(--space-8) * 2); } }
```
**Step 4:** Verify GREEN → 3 passed, then check in the browser. The map must keep its OSM attribution control.

**Step 5:** Commit `feat(plan): plate-numeral headline, figures, timeline + sticky map split`

---

### Task 19: Dün–Bugün slider 🔴 NOT_STARTED

**Files:** Create `client/src/components/semt/DunBugun.jsx`; modify `index.css`; test `DunBugun.test.jsx`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| mount | range value 50; `aria-valuetext="%50 dün, %50 bugün"`; `--pos: 50%` |
| change to 70 | `--pos: 70%`; valuetext "%70 dün, %30 bugün" |
| labels | "Dün" and "Bugün" are text, not color |

**Step 1 (RED):**
```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { DunBugun } from './DunBugun';

const props = { dun: { src: 'd.jpg', alt: 'Moda 1950', yil: 1950 }, bugun: { src: 'b.jpg', alt: 'Moda bugün' }, baslik: 'Moda İskelesi' };
test('starts centered', () => {
  const { container } = render(<DunBugun {...props} />);
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '%50 dün, %50 bugün');
  expect(container.querySelector('figure').style.getPropertyValue('--pos')).toBe('50%');
});
test('moves with the slider', () => {
  const { container } = render(<DunBugun {...props} />);
  fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
  expect(container.querySelector('figure').style.getPropertyValue('--pos')).toBe('70%');
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '%70 dün, %30 bugün');
});
test('labels are text', () => {
  render(<DunBugun {...props} />);
  expect(screen.getByText('Dün · 1950')).toBeInTheDocument();
  expect(screen.getByText('Bugün')).toBeInTheDocument();
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { useId, useState } from 'react';

export function DunBugun({ dun, bugun, baslik }) {
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <figure className="dun-bugun" style={{ '--pos': `${pos}%` }}>
      <div className="db-frame">
        <img className="db-img" src={bugun.src} alt={bugun.alt} />
        <img className="db-img db-dun" src={dun.src} alt={dun.alt} />
        <span className="db-handle" aria-hidden="true" />
        <span className="db-label db-label-dun">{dun.yil ? `Dün · ${dun.yil}` : 'Dün'}</span>
        <span className="db-label db-label-bugun">Bugün</span>
        <label htmlFor={id} className="sr-only">Dün ile bugün arasında kaydır</label>
        <input id={id} className="db-range" type="range" min="0" max="100" step="1" value={pos}
          onChange={(e) => setPos(Number(e.target.value))} aria-valuetext={`%${pos} dün, %${100 - pos} bugün`} />
      </div>
      {baslik && <figcaption>{baslik}</figcaption>}
    </figure>
  );
}
```
CSS (append):
```css
  .db-frame { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: var(--radius-md); background: var(--color-surface); }
  .db-frame:has(.db-range:focus-visible) { outline: 2px solid var(--color-accent); outline-offset: 2px; }
  .db-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .db-dun { clip-path: inset(0 calc(100% - var(--pos)) 0 0); filter: grayscale(1) contrast(1.1) sepia(0.15); }
  .db-handle { position: absolute; top: 0; bottom: 0; left: var(--pos); width: 2px; translate: -1px 0; background: var(--color-bg); box-shadow: 0 0 0 1px var(--color-text); pointer-events: none; }
  .db-label { position: absolute; top: var(--space-2); padding: 2px 8px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; background: var(--color-bg); color: var(--color-text); pointer-events: none; }
  .db-label-dun { left: var(--space-2); }
  .db-label-bugun { right: var(--space-2); }
  /* the native range covers the frame: drag anywhere, arrow keys built in */
  .db-range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
```
**Step 4:** Verify GREEN → 3 passed. **Step 5:** Commit `feat(semt): accessible dün–bugün before/after slider`

---

### Task 20: StampMark (Damga) 🔴 NOT_STARTED

**Files:** Create `client/src/components/pasaport/StampMark.jsx`; modify `index.css`; test `StampMark.test.jsx`. Then mount it in the `/damga/:kod` page's success branch (`<StampMark semt={...} tarih={new Date()} rozet={...} />`).

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| mount | `role="status"` empty; filled after `DURATION.stamp` ms with "Kadıköy damgan pasaportuna basıldı." |
| `rozet` | message "Rozet kazandın: Kadıköy semtinde iki damga topladın." |
| reduced motion | `data-motion="off"`; message filled at 0 ms |

**Step 1 (RED):**
```jsx
import { act, render, screen } from '@testing-library/react';
import { StampMark } from './StampMark';
import { DURATION } from '../motion/motion';
import { setReducedMotion } from '../../test/env';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const tarih = new Date(2026, 10, 13);

test('announces after the press lands', () => {
  render(<StampMark semt="Kadıköy" tarih={tarih} />);
  expect(screen.getByRole('status')).toHaveTextContent('');
  act(() => vi.advanceTimersByTime(DURATION.stamp));
  expect(screen.getByRole('status')).toHaveTextContent('Kadıköy damgan pasaportuna basıldı.');
});
test('badge message', () => {
  render(<StampMark semt="Kadıköy" tarih={tarih} rozet />);
  act(() => vi.advanceTimersByTime(DURATION.stamp));
  expect(screen.getByRole('status')).toHaveTextContent('Rozet kazandın: Kadıköy semtinde iki damga topladın.');
});
test('reduced motion', () => {
  setReducedMotion(true);
  const { container } = render(<StampMark semt="Kadıköy" tarih={tarih} />);
  act(() => vi.advanceTimersByTime(0));
  expect(container.firstChild).toHaveAttribute('data-motion', 'off');
  expect(screen.getByRole('status')).toHaveTextContent('Kadıköy damgan');
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { useEffect, useState } from 'react';
import { DURATION } from '../motion/motion';
import { useReducedMotion } from '../motion/useReducedMotion';

const fmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

export function StampMark({ semt, tarih, rozet = false }) {
  const reduced = useReducedMotion();
  const [msg, setMsg] = useState('');
  const text = rozet ? `Rozet kazandın: ${semt} semtinde iki damga topladın.` : `${semt} damgan pasaportuna basıldı.`;
  // (WHY: live regions ignore content present at mount; filling after the press also syncs voice with the visual)
  useEffect(() => {
    const t = setTimeout(() => setMsg(text), reduced ? 0 : DURATION.stamp);
    return () => clearTimeout(t);
  }, [text, reduced]);
  return (
    <div className="damga" data-motion={reduced ? 'off' : 'on'}>
      <div className="damga-mark halftone" aria-hidden="true">
        <span className="damga-kicker">Proje 404</span>
        <span className="damga-semt">{semt}</span>
        <span className="damga-tarih">{fmt.format(tarih)}</span>
      </div>
      <p role="status" className="damga-msg">{msg}</p>
    </div>
  );
}
```
CSS (append):
```css
  .damga { display: grid; justify-items: start; gap: var(--space-4); padding-block: var(--space-8); }
  /* magenta: the rare spot ink, used here and almost nowhere else */
  .damga-mark { display: grid; place-content: center; text-align: center; gap: 2px; width: 220px; aspect-ratio: 1;
    border: 6px double var(--color-accent-2); border-radius: 50%; color: var(--color-accent-2); rotate: -8deg; }
  .damga-kicker { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
  .damga-semt { font-family: var(--font-heading); font-weight: var(--font-heading-weight); font-size: 30px; line-height: 1; }
  .damga-tarih { font-size: 13px; letter-spacing: 0.08em; }
  .damga[data-motion="on"] .damga-mark { animation: damga-bas var(--motion-stamp) var(--ease-press) both; }
  .damga[data-motion="on"] .damga-msg { animation: page-in var(--motion-enter) var(--ease-out) var(--motion-stamp) both; }
  .damga-msg { margin: 0; font-size: calc(20px * var(--type-scale)); font-family: var(--font-heading); }
  @keyframes damga-bas {
    0%   { opacity: 0; scale: 1.6; rotate: -2deg; }
    60%  { opacity: 1; scale: 0.94; rotate: -9deg; }
    100% { opacity: 1; scale: 1; rotate: -8deg; }
  }
```
**Step 4:** Verify GREEN → 3 passed. **Step 5:** Commit `feat(pasaport): stamp press animation with live announcement`

---

### Task 21: Ana sayfa composition 🔴 NOT_STARTED

The page puts the masthead first, then a hero split (İPA hero: copy left, image right), then whitespace-separated sections. **Only the wrappers change.** Keep every existing data component (featured cards, district cards, map, events) and its props exactly as it is.

**Files:** Create `client/src/components/home/FrontHero.jsx`; modify the `/` page; test `FrontHero.test.jsx`.

**Behavioral contract:**
| Input | Expected output |
|-------|-----------------|
| FrontHero | `h1` present; primary link "Keşfetmeye başla" → `/kesfet`; secondary "Semtlere göz at" → `/#semtler` |
| no image | PrintImage fallback renders (no broken `<img>`) |

**Step 1 (RED):**
```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FrontHero } from './FrontHero';

test('hero actions', () => {
  render(<MemoryRouter><FrontHero /></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Keşfetmeye başla' })).toHaveAttribute('href', '/kesfet');
  expect(screen.getByRole('link', { name: 'Semtlere göz at' })).toHaveAttribute('href', '/#semtler');
});
```
**Step 2:** Verify RED. **Step 3 (GREEN):**
```jsx
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { Split } from '../layout/Layout';
import { PlateText } from '../ui/PlateText';
import { PrintImage } from '../ui/PrintImage';

export function FrontHero({ image }) {
  return (
    <Split ratio="7-5" className="hero">
      <div className="hero-copy">
        <h1 className="hero-title"><PlateText variant="head">İstanbul’u semt semt, durak durak keşfet</PlateText></h1>
        <p className="lede">Atölyeleri, hikâye rotalarını ve deprem toplanma alanlarını tek yerde gör; beğendiğin yerlerden yürüyüş rotanı çıkar.</p>
        <div className="hero-actions">
          <Link to="/kesfet" className="btn btn-primary">Keşfetmeye başla<ArrowRight weight="duotone" size={18} aria-hidden="true" /></Link>
          <Link to={{ pathname: '/', hash: '#semtler' }} className="btn btn-secondary">Semtlere göz at</Link>
        </div>
      </div>
      <PrintImage src={image?.src} alt={image?.alt} label="İstanbul" ratio="4 / 5" />
    </Split>
  );
}
```
Page skeleton (`/` page; replace only the outer layout):
```jsx
const tarih = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
return (
  <>
    <Masthead items={[tarih, 'İstanbul', <span className="tag tag-accent-2">DEMO VERİSİ</span>]} />
    <PageWrap>
      <FrontHero image={/* existing hero image if any */ undefined} />
      <Section id="one-cikanlar" kicker="Bu hafta" title="Öne çıkanlar"><div className="listing-grid">{/* existing 4 featured cards */}</div></Section>
      <Section id="semtler" kicker="6 semt" title="Semtler"><div className="listing-grid">{/* existing 6 district cards */}</div></Section>
      <Section id="harita" title="Şehir haritası">{/* existing map with its layer toggles */}</Section>
      <Section id="etkinlikler" kicker="Yaklaşan" title="Etkinlikler">{/* existing 3 events */}</Section>
    </PageWrap>
  </>
);
```
Every existing listing card gets `className="card card-interactive"`. Its kicker becomes `.card-kicker`, its title `.card-title` and its counts `.card-meta`, and any "Örnek"/"Doğrulanacak" tag stays.

CSS (append):
```css
  .hero { padding-top: var(--space-8); align-items: center; }
  .hero-title { font-size: calc(40px * var(--type-scale)); line-height: 1.05; letter-spacing: -0.02em; text-wrap: balance; }
  @media (min-width: 768px) { .hero-title { font-size: calc(72px * var(--type-scale)); } }
  .hero-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }
  #semtler { scroll-margin-top: calc(var(--space-8) * 2); }
```
**Step 4:** Verify GREEN → 1 passed, and all earlier tests still green (`npm test`).

**Step 5:** Commit `feat(home): masthead, plate-headline hero, whitespace sections`

---

### Task 22: Full verification 🔴 NOT_STARTED

**Step 1:** `npm test`. Expected: every suite passes, 0 failures, no React act() warnings.

**Step 2:** `npm run build`. Expected: success with no CSS warnings.

**Step 3:** Run `npm run dev` and check each item below on `/`, `/kesfet` and `/plan/:id`, at both 375 px and 1440 px. Record ✅/❌ in the PR description:
- [ ] Light and dark themes: no invisible text; plate numerals fall back to plain figures in dark.
- [ ] Large text: headings and body scale, nothing clips at 375 px.
- [ ] Keyboard only: skip link, menu, chips, deck (←/→), undo, panel remove, build, timeline links, slider arrows.
- [ ] macOS "Reduce motion" (or DevTools → Rendering → emulate `prefers-reduced-motion`): no reveal, fly-out, stamp or page transitions, and decisions still apply instantly.
- [ ] Swipe on a touch device: a vertical page scroll over the card still works; a 120 px horizontal drag decides.
- [ ] Every hit target ≥ 44 px (DevTools → inspect `.btn-icon`, `.chip`, `.nav-link`, `.leg-link`).
- [ ] "DEMO VERİSİ", "Doğrulanacak" and "Örnek" labels visible wherever the data has them.
- [ ] OSM attribution in the footer and on every map.
- [ ] No boxes or dividers used as page structure; `.card` only on listings and deck cards.

**Step 4:** Commit any fixes, then mark this plan's tasks 🟢 and update the Progress table.

---

## Out of scope for this plan (follow-up plan)

The same primitives apply. Each item below needs its own Step 0 contract check, so it gets a follow-up plan:
- **Gruplar / Grup aç / Grup sayfası:** `Section` + `listing-grid` of `.card card-interactive`; the form as `.field` + `.input` + `.seg`; the one-time admin key in a `.dialog`.
- **Semt:** `Section` per block; `ChipGroup` place filters; `DunBugun`; poem cards as an italic pull quote.
- **Hikâye rotası:** `SummaryFigures` (3 items), `StopTimeline` with `atlandi`, and an elevation chart in the `Split` end column.
- **Mekan, Atölyeler, Etkinlikler, Pasaport, Yönetim:** reuse `.table` for admin lists and the states from Task 7.
