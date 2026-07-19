/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Midnight navy — replaces brownish charcoal throughout
        charcoal: {
          950: '#060D18',
          900: '#0A1626',
          800: '#0D1E33',
          700: '#112440',
          600: '#15294A',
        },
        cream: {
          50:  '#FDFAF5',
          100: '#F7F2E8',
          200: '#EDE7D9',
          300: '#E0D8C8',
          400: '#CEC4B0',
        },
        // Vivid mint-teal — matches image accent ("VEHICLE PROTECTION", stats)
        gold: {
          300: '#80EDD8',
          400: '#2DD9BE',
          500: '#16C4A4',
          600: '#109E85',
          700: '#0C7B68',
        },
        warm: {
          100: '#F5EFE6',
          200: '#E8DFD0',
          300: '#C8BFB0',
          400: '#9A9088',
          500: '#6E6660',
          600: '#4A4540',
          700: '#2E2B28',
        },
      },
      backgroundImage: {
        // Updated to use navy rgba (0A1626 = rgb 10,22,38)
        'hero-gradient': 'linear-gradient(to right, rgba(10,22,38,0.95) 45%, rgba(10,22,38,0.5) 100%)',
        'dark-gradient': 'linear-gradient(180deg, rgba(10,22,38,0) 0%, rgba(10,22,38,0.85) 100%)',
      },
      letterSpacing: {
        widest2: '0.22em',
      },
    },
  },
  plugins: [],
};
