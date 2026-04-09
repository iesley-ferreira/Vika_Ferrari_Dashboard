import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (Design System Vitale)
        background:              '#fef9f1',
        surface:                 '#ffffff',
        'surface-container':     '#f2ede5',
        'surface-high':          '#ece8e0',
        'surface-low':           '#f8f3eb',
        'surface-dim':           '#ded9d2',
        // Primary (Gold)
        primary:                 '#755b00',
        'primary-container':     '#c9a84c',
        'primary-light':         '#e6c364',
        'primary-fixed':         '#ffe08f',
        // Secondary (Blue-Grey — Produto)
        secondary:               '#406181',
        'secondary-container':   '#b9daff',
        'secondary-light':       '#a8caee',
        // Tertiary (Sage Green — Success)
        tertiary:                '#476647',
        'tertiary-container':    '#92b490',
        'tertiary-light':        '#add0aa',
        // Neutrals
        charcoal:                '#2D2D25',
        'on-surface':            '#1d1c17',
        'on-surface-variant':    '#4d4637',
        outline:                 '#7e7665',
        'outline-variant':       '#d0c5b2',
        // Semantic
        'on-primary':            '#ffffff',
        error:                   '#ba1a1a',
        'error-container':       '#ffdad6',
        'soft-red':              '#A85050',
        'olive-green':           '#5A7A5A',
        // Areas
        comercial:               '#c9a84c',
        produto:                 '#406181',
        // Funcoes
        sdr:                     '#c9a84c',
        seller:                  '#e6c364',
        closer:                  '#755b00',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:  '0.25rem',
        md:  '0.75rem',
        lg:  '1rem',
        xl:  '1.5rem',
      },
      boxShadow: {
        sm:   '0px 4px 8px -2px rgba(45, 45, 37, 0.04)',
        md:   '0px 12px 24px -6px rgba(45, 45, 37, 0.06)',
        lg:   '0px 24px 48px -12px rgba(45, 45, 37, 0.06)',
        gold: '0px 4px 16px -4px rgba(201, 168, 76, 0.3)',
      },
      fontSize: {
        'display-lg':  ['3.5rem',   { lineHeight: '1.1', fontWeight: '700' }],
        'headline-md': ['1.75rem',  { lineHeight: '1.3', fontWeight: '600' }],
        'title-lg':    ['1.375rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-md':     ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label-sm':    ['0.6875rem',{ lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.1em' }],
      },
    },
  },
  plugins: [],
};

export default config;
