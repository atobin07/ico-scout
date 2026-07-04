import type { Config } from 'tailwindcss';

/**
 * CallCatch — "Dispatch Console" design system.
 * Dark, dense, information-rich. Single blue accent (signal),
 * live green reserved for primary CTA + active call states,
 * monospace (IBM Plex Mono) for all numbers, stats, and timestamps.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#060B14',
        navy: '#0C1525',
        'navy-mid': '#111E30',
        border: '#1A2D44',
        'border-2': '#243D58',
        signal: '#1B54E8',
        sky: '#4FA3FF',
        live: '#00D97E',
        warn: '#F5A623',
        danger: '#E24B4A',
        'ink-1': '#E8F0FF',
        'ink-2': '#7A9ABE',
        'ink-3': '#3A5A7A',
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderColor: {
        DEFAULT: '#1A2D44',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(0, 217, 126, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 0 6px rgba(0, 217, 126, 0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(2)', opacity: '0' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        typing: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 1.6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
        typing: 'typing 0.35s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
