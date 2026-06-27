/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        race: {
          dark:    '#FFF8EA',
          panel:   '#FFFCF4',
          border:  '#E6D8BF',
          swim:    '#0284C7',
          bike:    '#EA580C',
          run:     '#16A34A',
          gym:     '#A78BFA',
          brick:   '#FB923C',
          accent:  '#0284C7',
          muted:   '#7A6B5B',
          danger:  '#F87171',
          success: '#16A34A',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
