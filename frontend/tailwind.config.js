/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper:        { DEFAULT: '#F4F1EA', raised: '#FFFFFF', dark: '#1A1A1A', 'dark-raised': '#242424' },
        ink:          { DEFAULT: '#0F172A', muted: '#94A3B8', faint: '#CBD5E1', dark: '#F8FAFC' },
        rule:         { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        accent:       { DEFAULT: '#2563EB', warn: '#DC2626' },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono:  ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'checkmark': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'draw-check': {
          '0%': { 'stroke-dashoffset': '24' },
          '100%': { 'stroke-dashoffset': '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'shake': 'shake 0.4s ease-in-out',
        'checkmark': 'checkmark 0.3s ease-out forwards',
        'pulse-ring': 'pulse-ring 0.6s ease-out forwards',
        'draw-check': 'draw-check 0.3s ease-out 0.15s forwards',
      },
    },
  },
  plugins: [],
}
