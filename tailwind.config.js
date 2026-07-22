/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        technical: ['Outfit', 'system-ui', 'sans-serif'],
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
        // Surface containers (Stitch Design System)
        surface: {
          base:   '#fcf9f4',
          dim:    '#dcdad5',
          bright: '#fcf9f4',
          lowest: '#ffffff',
          low:    '#f6f3ee',
          DEFAULT:'#f0ede9',
          high:   '#ebe8e3',
          highest:'#e5e2dd',
        },
        // Vivid mint-teal / emerald — main brand color (green)
        brand: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#2DD9BE',
          500: '#16C4A4',   // Primary brand green
          600: '#109E85',
          700: '#0C7B68',
          800: '#065F46',
          900: '#064E3B',
        },
        // Legacy "gold" references mapped to brand (green)
        gold: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#2DD9BE',
          500: '#16C4A4',   // Primary brand green
          600: '#109E85',
          700: '#0C7B68',
          800: '#065F46',
          900: '#064E3B',
        },
        // Accent colors
        accent: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
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
        // Semantic colors
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
      backgroundImage: {
        // Updated to use navy rgba (0A1626 = rgb 10,22,38)
        'hero-gradient': 'linear-gradient(to right, rgba(10,22,38,0.95) 45%, rgba(10,22,38,0.5) 100%)',
        'dark-gradient': 'linear-gradient(180deg, rgba(10,22,38,0) 0%, rgba(10,22,38,0.85) 100%)',
        // Brand gradient
        'brand-gradient': 'linear-gradient(135deg, #16C4A4, #0C7B68)',
        'brand-gradient-light': 'linear-gradient(135deg, #2DD9BE, #16C4A4)',
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(22, 196, 164, 0.25)',
        'brand-lg': '0 8px 30px 0 rgba(22, 196, 164, 0.35)',
        'brand-glow': '0 0 20px rgba(22, 196, 164, 0.3)',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
        xl: '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(22, 196, 164, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(22, 196, 164, 0.5)' },
        },
      },
      letterSpacing: {
        widest2: '0.22em',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
