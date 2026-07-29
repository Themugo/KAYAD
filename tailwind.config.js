/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Playfair Display', 'Georgia', 'sans-serif'],
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
        // NEW: KAYAD Navy palette (from new frontend)
        navy: {
          50: '#F0F4F9',
          100: '#E1E9F3',
          200: '#C3D3E7',
          300: '#A5BDDC',
          400: '#6A92C5',
          500: '#3067AF',
          600: '#255190',
          700: '#1E3063', // KAYAD Brand Light Navy
          800: '#17244B',
          900: '#0F1833',
        },
        beige: {
          50: '#FAF7F2',
          100: '#F6F1E8', // KAYAD Page Background
          200: '#ECE3D4',
          300: '#E2D5C0',
          400: '#CDBA98',
          500: '#B89F70',
        },
        amber: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
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
        'card': '0 2px 8px -1px rgba(30, 48, 99, 0.06), 0 1px 4px -1px rgba(30, 48, 99, 0.04)',
        'card-hover': '0 12px 24px -4px rgba(30, 48, 99, 0.12), 0 4px 8px -2px rgba(30, 48, 99, 0.06)',
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
        'bounce-short': 'bounce-short 1s ease-in-out infinite',
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
        'bounce-short': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
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
