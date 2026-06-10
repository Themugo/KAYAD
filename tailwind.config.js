/** @type {import('tailwindcss').Config} */
// Maps the project's existing CSS-variable design system (defined in
// src/index.css :root) onto Tailwind utility classes, so the components'
// existing className usage (bg-gold, text-text-muted, hidden md:flex, …)
// works at build time without the runtime CDN.
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:           'var(--bg)',
        surface:      'var(--surface)',
        card:         'var(--card)',
        'card-hover': 'var(--card-hover)',
        gold:         'var(--gold)',
        'gold-light': 'var(--gold-light)',
        'gold-dark':  'var(--gold-dark)',
        'gold-muted': 'var(--gold-muted)',
        text:         'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-dim':   'var(--text-dim)',
        success:      'var(--success)',
        danger:       'var(--danger)',
        warning:      'var(--warning)',
        info:         'var(--info)',
        border:       'var(--border)',
        'border-soft':'var(--border-soft)',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        gold:   '0 8px 30px rgba(212,196,168,0.25)',
        'gold-lg': '0 12px 42px rgba(212,196,168,0.4)',
        sm:     '0 4px 20px rgba(0,0,0,0.3)',
        md:     '0 10px 30px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
        xl: '24px',
      },
      keyframes: {
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        pulse: {
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        ping: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
        pulse: 'pulse 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};
