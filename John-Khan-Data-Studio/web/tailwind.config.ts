import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        'paper-deep': 'rgb(var(--paper-deep) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-muted': 'rgb(var(--card-muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        seal: 'rgb(var(--seal) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        pine: 'rgb(var(--pine) / <alpha-value>)',
        indigo: 'rgb(var(--indigo) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Microsoft YaHei',
          'PingFang SC',
          'Hiragino Sans GB',
          'sans-serif',
        ],
        serif: [
          'Noto Serif SC',
          'Source Han Serif SC',
          'Songti SC',
          'SimSun',
          'Georgia',
          'serif',
        ],
        mono: ['JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(28 25 20 / 0.04), 0 18px 40px -28px rgb(28 25 20 / 0.35)',
        lift: '0 2px 4px rgb(28 25 20 / 0.05), 0 26px 60px -32px rgb(28 25 20 / 0.45)',
      },
      borderRadius: {
        card: '1.125rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
