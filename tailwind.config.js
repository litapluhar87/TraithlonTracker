/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        race: {
          dark:    '#0D0F14',
          panel:   '#161A23',
          border:  '#252B38',
          swim:    '#38BDF8',
          bike:    '#F97316',
          run:     '#4ADE80',
          gym:     '#A78BFA',
          brick:   '#FB923C',
          accent:  '#38BDF8',
          muted:   '#6B7280',
          danger:  '#F87171',
          success: '#4ADE80',
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
