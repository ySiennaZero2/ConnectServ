/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          500: '#3B82F6',
          600: '#1671F9',
          700: '#075FE4',
          800: '#0B3B8F',
          950: '#061B4D',
        },
        navy: '#061B4D',
      },
    },
  },
  plugins: [],
};
