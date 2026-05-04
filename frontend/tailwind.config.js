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
          50:  'rgb(var(--brand-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--brand-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--brand-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--brand-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--brand-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--brand-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--brand-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--brand-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--brand-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--brand-900-rgb) / <alpha-value>)',
        },
        accent: {
          400: 'rgb(var(--accent-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--accent-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--accent-600-rgb) / <alpha-value>)',
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
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        hero:    ['Cormorant Garamond', 'Georgia', 'serif'],
        accent:  ['Caveat', 'cursive'],
        body:    ['Inter', 'sans-serif'],
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
