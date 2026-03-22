import type { Config } from 'tailwindcss';

/**
 * Tailwind Config -- Matches Nexus Dashboard Theme
 *
 * Includes Coinest dark theme colors and brand colors that match the dashboard.
 * NO CUSTOMIZATION NEEDED for colors -- add plugin-specific colors in the extend section.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors (Adverant identity)
        brand: {
          50: '#f5f0fa', 100: '#ede5f5', 200: '#d9c9ea', 300: '#c2a8dc',
          400: '#8B6BAE', 500: '#7a5c9c', 600: '#654b84', 700: '#50396c',
          800: '#3d2b54', 900: '#2b1d3d',
        },

        // Neutral colors (WCAG AA compliant)
        neutral: {
          50: '#f8f9fa', 100: '#f1f3f5', 200: '#e9ecef', 300: '#dee2e6',
          400: '#adb5bd', 500: '#6c757d', 600: '#495057', 700: '#343a40',
          800: '#212529', 900: '#16191d', 950: '#0d1014',
        },

        // Semantic colors
        success: { 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 700: '#15803d' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 700: '#b45309' },
        error: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 700: '#b91c1c' },
        info: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 700: '#1d4ed8' },

        // Coinest (Dashboard Dark Theme)
        coinest: {
          bg: { primary: '#0D0D0D', secondary: '#1A1A1A', tertiary: '#262626' },
          accent: { brown: '#8B7355', beige: '#D4C4A8', cyan: '#8B6BAE' },
          text: { primary: '#FFFFFF', secondary: '#A3A3A3', muted: '#737373' },
          border: '#333333',
        },

        // Flat aliases for backward compatibility
        'coinest-bg-primary': '#0D0D0D',
        'coinest-bg-secondary': '#1A1A1A',
        'coinest-bg-tertiary': '#262626',
        'coinest-border': '#333333',
        'coinest-accent-cyan': '#8B6BAE',
        'coinest-accent-brown': '#8B7355',
        'coinest-text-secondary': '#A3A3A3',
        'coinest-text-muted': '#737373',
        'brand-50': '#f5f0fa', 'brand-100': '#ede5f5', 'brand-200': '#d9c9ea',
        'brand-400': '#8B6BAE', 'brand-500': '#7a5c9c', 'brand-600': '#654b84',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urbanist: ['Urbanist', 'system-ui', 'sans-serif'],
        heading: ['Urbanist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};

export default config;
