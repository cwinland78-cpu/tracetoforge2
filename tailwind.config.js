/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#E8650A',
        'brand-light': '#FF8534',
        surface: {
          DEFAULT: '#131318',
          light: '#1C1C24',
          lighter: '#2A2A35',
        },
        bg: '#0A0A0F',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
