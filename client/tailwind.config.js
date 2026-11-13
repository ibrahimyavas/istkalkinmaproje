/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), raised: v('surface-raised') },
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), faint: v('ink-faint') },
        heading: v('heading'),
        fill: v('fill'),
        'on-fill': v('on-fill'),
        navy: v('navy'),
        accent: { DEFAULT: v('accent'), contrast: v('accent-contrast'), soft: v('accent-soft') },
        lale: v('lale'),
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
      },
      borderColor: {
        hairline: 'rgb(var(--border))',
        'hairline-subtle': 'rgb(var(--border-subtle))',
        'hairline-strong': 'rgb(var(--border-strong))',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        md: 'var(--shadow-md)',
        lift: 'var(--shadow-md)',
      },
      maxWidth: { sayfa: '1360px' },
    },
  },
  plugins: [],
};
