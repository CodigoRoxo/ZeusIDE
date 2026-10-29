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
        zeus: {
          bg: 'var(--zeus-bg)',
          surface: 'var(--zeus-surface)',
          panel: 'var(--zeus-panel)',
          border: 'var(--zeus-border)',
          hover: 'var(--zeus-hover)',
          active: 'var(--zeus-active)',
          muted: 'var(--zeus-muted)',
          text: 'var(--zeus-text)',
          purple: '#9333ea',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
