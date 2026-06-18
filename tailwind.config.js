/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#000000',
        elevated: '#121212',
        highlight: '#1a1a1a',
        surface: '#242424',
        'surface-h': '#2a2a2a',
        input: '#2a2a2a',
        'input-h': '#3a3a3a',
        green: {
          DEFAULT: '#1db954',
          hover: '#1ed760',
          press: '#169c46',
        },
        text1: '#ffffff',
        text2: '#b3b3b3',
        text3: '#727272',
        text4: '#535353',
        border: '#282828',
      },
      fontFamily: {
        ui: ['CircularStd', 'Circular', 'system-ui', '-apple-system', 'sans-serif'],
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
