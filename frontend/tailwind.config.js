/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F63049',  // Primary – Flowa Red (matches logo)
          600: '#E11D48',  // Hover
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },
        accent: {
          400: '#22D3EE',
          500: '#06B6D4',  // Cyan accent
          600: '#0891B2',
        },
        /* Surface colors via CSS variables — auto-switch with theme */
        surface: {
          base:   'var(--surface-base)',
          card:   'var(--surface-card)',
          border: 'var(--surface-border)',
          hover:  'var(--surface-hover)',
          input:  'var(--surface-input)',
        },
        /* Semantic foreground text colors — auto-switch with theme */
        foreground: {
          DEFAULT:   'var(--foreground)',
          secondary: 'var(--foreground-secondary)',
          muted:     'var(--foreground-muted)',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        hero:    ['Inter', 'sans-serif'],
        accent:  ['Caveat', 'cursive'],
        body:    ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
