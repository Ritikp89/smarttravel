/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf6ef',
        cream: '#f3ecdf',
        sand: '#e6dbc7',
        ink: '#221f1b',
        soot: '#5c554c',
        stone: '#9a9188',
        clay: {
          50: '#fdf3ee',
          100: '#f9e2d6',
          200: '#f2c2ab',
          300: '#e99a77',
          400: '#dc6f45',
          500: '#c9532a',
          600: '#b04322',
          700: '#8f351d',
        },
        moss: {
          50: '#f1f5ee',
          100: '#dde8d6',
          300: '#9fb894',
          500: '#5d7d52',
          600: '#4a6541',
          700: '#3b5134',
        },
        sky: {
          100: '#e1ecf5',
          300: '#a8c6df',
          500: '#6a9cc4',
        },
        butter: '#f3d68a',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(34,31,27,0.04), 0 8px 24px -12px rgba(34,31,27,0.18)',
        lift: '0 2px 4px rgba(34,31,27,0.06), 0 16px 40px -16px rgba(34,31,27,0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        rise: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
