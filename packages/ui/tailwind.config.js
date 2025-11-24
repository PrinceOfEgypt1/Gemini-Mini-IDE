/** @type {import('tailwindcss').Config} */
export default {
  // Habilita a troca manual via classe 'dark' no elemento HTML
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      // Mapeamento direto para quem prefere usar classes utilitárias do Tailwind
      // ex: bg-app, text-primary
      colors: {
        app: 'var(--bg-app)',
        panel: 'var(--bg-panel)',
        'panel-hover': 'var(--bg-panel-hover)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        brand: {
          DEFAULT: 'var(--brand-primary)',
          hover: 'var(--brand-hover)',
        }
      }
    },
  },
  plugins: [],
}
