/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        copper: {
          DEFAULT: '#B87333',
          light: '#D4956A',
          dark: '#8B5A2B',
        },
        amber: {
          DEFAULT: '#FFBF00',
          light: '#FFD700',
        },
        'dark-beer': '#1A1208',
        bg: {
          primary: '#0D0D0D',
          secondary: '#141414',
          tertiary: '#1A1A1A',
          card: '#1E1E1E',
        },
        border: {
          DEFAULT: '#2A2A2A',
          light: '#3A3A3A',
        },
        success: '#27AE60',
        warning: '#F39C12',
        danger: '#E74C3C',
        info: '#3498DB',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['var(--font-noto-sans-georgian)', 'Source Sans Pro', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-copper': 'linear-gradient(135deg, #B87333, #D4956A)',
        'gradient-amber': 'linear-gradient(135deg, #FFBF00, #FFD700)',
      },
    },
  },
  plugins: [],
}



