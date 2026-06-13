import type { Config } from 'tailwindcss';

/**
 * NOW palette — dark, warm, premium. Amber/gold is the signature NOW accent.
 * Category colors are intentionally vivid so bubbles read clearly on a dark map.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm near-black backgrounds (stone-tinted, not pure grey).
        ink: {
          900: '#0c0a09',
          800: '#1c1917',
          700: '#292524',
        },
        // The NOW signature accent.
        now: {
          DEFAULT: '#f59e0b',
          soft: '#fbbf24',
          deep: '#b45309',
          glow: 'rgba(245, 158, 11, 0.55)',
        },
        category: {
          nightlife: '#a855f7',
          music: '#ec4899',
          sports: '#22c55e',
          culture: '#38bdf8',
          food: '#fb923c',
          civic: '#f43f5e',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 40px rgba(0, 0, 0, 0.45)',
        bubble: '0 6px 24px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '0.9' },
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
        'ping-slow': 'ping-slow 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
