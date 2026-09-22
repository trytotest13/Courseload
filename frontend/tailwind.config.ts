import type { Config } from 'tailwindcss';

/**
 * The palette started from paper and ink and grew outwards. Warm neutrals keep the
 * screens from looking like every other blue purple dashboard, and the status
 * colours are picked to stay readable on their own tinted backgrounds.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#171A19',
          soft: '#5C6360',
          faint: '#8A918D',
        },
        line: '#E4E0D8',
        primary: {
          DEFAULT: '#0E6B5C',
          dark: '#0A5045',
          tint: '#E6F2EF',
        },
        accent: {
          DEFAULT: '#C8794A',
          tint: '#FBF0E7',
        },
        status: {
          pending: '#A8650C',
          'pending-tint': '#FBF1DC',
          submitted: '#1D5FA8',
          'submitted-tint': '#E8F0FA',
          acknowledged: '#1B7A45',
          'acknowledged-tint': '#E7F4EC',
          overdue: '#A62B2B',
          'overdue-tint': '#FBEAEA',
        },
        course: {
          teal: '#0E6B5C',
          ochre: '#B9722F',
          plum: '#7A3E68',
          moss: '#4F6B2F',
          slate: '#41506B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        micro: ['0.72rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        display: ['2.5rem', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        field: '10px',
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,25,24,.04), 0 8px 24px -12px rgba(20,25,24,.14)',
        lift: '0 2px 4px rgba(20,25,24,.05), 0 18px 32px -16px rgba(20,25,24,.2)',
      },
      maxWidth: {
        page: '1180px',
      },
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(.6)' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'draw-line': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 240ms cubic-bezier(.22,.61,.36,1) both',
        pop: 'pop 320ms cubic-bezier(.22,.61,.36,1) both',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'draw-line': 'draw-line 500ms cubic-bezier(.22,.61,.36,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
