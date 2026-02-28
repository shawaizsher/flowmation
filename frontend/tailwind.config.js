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
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',  // Primary – Vivid Violet
          600: '#7C3AED',  // Hover
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
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
