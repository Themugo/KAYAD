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
        // KAYAD Slate Teal compatibility palette
        charcoal: {
          950: '#0A3340', 900: '#0A3340', 800: '#12576D', 700: '#12576D', 600: '#176B87',
        },
        cream: {
          50: '#F6FAF9', 100: '#EEF7F5', 200: '#DDF4F0', 300: '#BDE5DE', 400: '#91CEC5',
        },
        // Cool white and mint surface containers
        surface: {
          base: '#F6FAF9', dim: '#D7E7E4', bright: '#F6FAF9', lowest: '#FFFFFF',
          low: '#EEF7F5', DEFAULT: '#F6FAF9', high: '#DDF4F0', highest: '#BDE5DE',
        },
        // Canonical KAYAD Slate Teal brand scale
        brand: {
          50: '#F3FAF9', 100: '#DDF4F0', 200: '#BDE5DE', 300: '#91CEC5',
          400: '#5AAFA4', 500: '#2F8F87', 600: '#176B87', 700: '#12576D',
          800: '#0E4655', 900: '#0A3340',
        },
        // Deprecated gold utility names resolve to the original KAYAD Slate Teal palette.
        gold: {
          50: '#F3FAF9', 100: '#DDF4F0', 200: '#BDE5DE', 300: '#91CEC5',
          400: '#5AAFA4', 500: '#2F8F87', 600: '#176B87', 700: '#12576D',
          800: '#0E4655', 900: '#0A3340',
        },
        // Accent aliases from the canonical brand scale
        accent: {
          400: '#5AAFA4', 500: '#176B87', 600: '#12576D',
        },
        warm: {
          100: '#F6FAF9', 200: '#EEF7F5', 300: '#DDF4F0',
          400: '#BDE5DE', 500: '#91CEC5', 600: '#5AAFA4', 700: '#176B87',
        },
        // Semantic colors: status meaning remains distinct; warning/info use the brand palette
        success: '#2F8F87',
        danger: '#EF4444',
        warning: '#176B87',
        info: '#176B87',
      },
      backgroundImage: {
        // Deep Slate Teal overlays for premium, brand-consistent hero surfaces
        'hero-gradient': 'linear-gradient(to right, rgba(10,51,64,0.95) 45%, rgba(10,51,64,0.5) 100%)',
        'dark-gradient': 'linear-gradient(180deg, rgba(10,51,64,0) 0%, rgba(10,51,64,0.85) 100%)',
        // Brand gradient
        'brand-gradient': 'linear-gradient(135deg, #176B87, #12576D)',
        'brand-gradient-light': 'linear-gradient(135deg, #13B8A6, #176B87)',
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(19, 184, 166, 0.25)',
        'brand-lg': '0 8px 30px 0 rgba(19, 184, 166, 0.35)',
        'brand-glow': '0 0 20px rgba(19, 184, 166, 0.3)',
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
        'marquee': 'marquee 28s linear infinite',
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
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
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
