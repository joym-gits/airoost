/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          dark: '#0f0f23'
        },
        accent: {
          DEFAULT: '#e94560',
          light: '#ff6b6b',
          dark: '#c73e54'
        }
      }
    }
  },
  plugins: []
}
