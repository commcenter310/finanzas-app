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
        'fg-on-primary': 'var(--fg-on-primary)',
        // Status
        positive: 'var(--positive)',
        negative: 'var(--negative)',
        warning:  'var(--warning)',
        // Border
        border:   'var(--border)',
        // Paletas Tailwind remapeadas a variables (ver "PUENTE" en finni-tokens.css)
        // → las clases gray/red/emerald/amber/blue existentes flipean con el tema
        gray: {
          50:  'var(--tw-gray-50)',  100: 'var(--tw-gray-100)', 200: 'var(--tw-gray-200)',
          300: 'var(--tw-gray-300)', 400: 'var(--tw-gray-400)', 500: 'var(--tw-gray-500)',
          600: 'var(--tw-gray-600)', 700: 'var(--tw-gray-700)', 800: 'var(--tw-gray-800)',
          900: 'var(--tw-gray-900)',
        },
        red: {
          50:  'var(--tw-red-50)',  100: 'var(--tw-red-100)', 200: 'var(--tw-red-200)',
          400: 'var(--tw-red-400)', 500: 'var(--tw-red-500)', 600: 'var(--tw-red-600)',
        },
        emerald: {
          50:  'var(--tw-emerald-50)',  100: 'var(--tw-emerald-100)',
          500: 'var(--tw-emerald-500)', 600: 'var(--tw-emerald-600)',
        },
        amber: {
          50: 'var(--tw-amber-50)', 400: 'var(--tw-amber-400)', 500: 'var(--tw-amber-500)',
        },
        blue: {
          50: 'var(--tw-blue-50)', 500: 'var(--tw-blue-500)',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['Manrope', 'system-ui', 'sans-serif'],
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
