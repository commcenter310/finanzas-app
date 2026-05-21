/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef1ff',
          100: '#dde4ff',
          200: '#c5d0f0',
          300: '#9aaef0',
          400: '#6b87e8',
          500: '#4663dd',
          600: '#2e47cc',
          700: '#1a3faa',
          800: '#0d2570',
          900: '#0a1d5a',
        },
        necesidad: '#2563eb',
        deseo:     '#f59e0b',
        ahorro:    '#10b981',
      },
      fontFamily: {
        sans:  ['Plus Jakarta Sans', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

