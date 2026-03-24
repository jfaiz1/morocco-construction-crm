/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C', 500: '#FF8C42', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12' },
        morocco: { red: '#C1272D', green: '#006233' }
      }
    }
  },
  plugins: []
};
