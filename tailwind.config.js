/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — Finni Iris (violet)
        primary: {
          50:  'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
        },
        // Finance classifications
        necesidad: 'var(--necesidad)',
        deseo:     'var(--deseo)',
        ahorro:    'var(--ahorro)',
        // Surfaces
        'bg-app':    'var(--bg-app)',
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        // Foreground / text
        'fg-1': 'var(--fg-1)',
        'fg-2': 'var(--fg-2)',
        'fg-3': 'var(--fg-3)',
        'fg-4': 'var(--fg-4)',
        // Status
        positive: 'var(--positive)',
        negative: 'var(--negative)',
        warning:  'var(--warning)',
        // Border
        border:   'var(--border)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'finni-sm':      'var(--shadow-sm)',
        'finni-md':      'var(--shadow-md)',
        'finni-lg':      'var(--shadow-lg)',
        'finni-xl':      'var(--shadow-xl)',
        'finni-primary': 'var(--shadow-primary)',
        'finni-ahorro':  'var(--shadow-ahorro)',
        'ring-focus':    'var(--ring-focus)',
      },
    },
  },
  plugins: [],
}
