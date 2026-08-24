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
    },
  },
  plugins: [],
}
