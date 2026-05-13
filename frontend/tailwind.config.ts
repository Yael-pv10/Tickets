import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0A0A12',
          50: '#1A1A26',
          100: '#14141F',
          200: '#1E1E2E',
          300: '#2A2A3D',
          400: '#3A3A4F',
        },
        cream: {
          DEFAULT: '#F5EFE0',
          dim: '#C7BCAA',
          mute: '#8B7E70',
        },
        gold: {
          DEFAULT: '#E8B14B',
          deep: '#B88A2D',
          dim: '#C99837',
          glow: '#F4CB6E',
        },
        curtain: {
          DEFAULT: '#8C2937',
          deep: '#5E1A24',
        },
        sage: {
          DEFAULT: '#7FB39E',
          deep: '#4E8770',
        },
        ember: {
          DEFAULT: '#D08B5C',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        marquee: '0.4em',
        wider2: '0.18em',
      },
      boxShadow: {
        'gold-glow': '0 0 0 1px rgba(232, 177, 75, 0.35), 0 8px 32px -8px rgba(232, 177, 75, 0.5)',
        'stage': '0 -40px 80px -20px rgba(232, 177, 75, 0.18)',
        'ticket': '0 24px 60px -20px rgba(0, 0, 0, 0.7), 0 2px 0 0 rgba(232, 177, 75, 0.2) inset',
        'inset-line': 'inset 0 -1px 0 rgba(245, 239, 224, 0.08)',
      },
      keyframes: {
        'shimmer': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232, 177, 75, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(232, 177, 75, 0)' },
        },
        'curtain-rise': {
          '0%': { transform: 'scaleY(1)', transformOrigin: 'top' },
          '100%': { transform: 'scaleY(0)', transformOrigin: 'top' },
        },
      },
      animation: {
        shimmer: 'shimmer 4s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'pulse-soft': 'pulse-soft 2s ease-out infinite',
      },
      backgroundImage: {
        'stage-light': 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232, 177, 75, 0.16) 0%, rgba(232, 177, 75, 0.04) 35%, transparent 70%)',
        'curtain-flow': 'linear-gradient(180deg, #14141F 0%, #0A0A12 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
