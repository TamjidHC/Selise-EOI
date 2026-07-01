/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#741B47',
          dark: '#5a1436',
          light: '#fdf0f4',
        },
      },
    },
  },
  plugins: [],
}
