/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ეს უნდა იყოს 'class' რომ Tailwind-მა იცოდეს რომ dark: modifier იმუშავოს
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS variable-based colors (theme-aware)
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-card': 'var(--bg-card)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        'border': 'var(--border)',
        'border-light': 'var(--border-light)',
        
        // Copper colors (theme-independent)
        copper: {
          DEFAULT: 'var(--copper)',
          light: 'var(--copper-light)',
          dark: 'var(--copper-dark)',
        },
        
        // Amber (theme-independent)
        amber: {
          DEFAULT: '#FFBF00',
          light: '#FFD700',
        },
        
        // Status colors (theme-independent)
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: '#3498DB',
        
        // Legacy/explicit colors (fallback)
        'dark-beer': '#1A1208',
        dark: {
          900: '#0D0D0D',
          800: '#141414',
          700: '#1E1E1E',
          600: '#2A2A2A',
          500: '#3A3A3A',
        },
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
  safelist: [
    // Phase color gradients - ensure they're included in CSS
    'bg-gradient-to-r',
    // Slate
    'from-slate-500', 'to-slate-400', 'from-slate-600', 'to-slate-700',
    // Amber
    'from-amber-500', 'to-orange-500', 'to-orange-600', 'to-yellow-500',
    // Orange
    'from-orange-500', 'to-red-500', 'from-orange-600', 'to-red-600',
    // Yellow
    'from-yellow-500', 'to-amber-500', 'from-yellow-600', 'to-amber-600',
    // Green
    'from-green-500', 'to-emerald-500', 'to-emerald-400', 'to-emerald-600',
    // Emerald
    'from-emerald-500', 'to-green-600', 'to-teal-500',
    // Teal
    'from-teal-500', 'to-cyan-500', 'from-teal-600', 'to-cyan-600',
    // Cyan
    'from-cyan-500', 'to-blue-500', 'from-cyan-600', 'to-blue-600', 'to-cyan-400',
    // Blue
    'from-blue-500', 'to-cyan-600', 'from-blue-600', 'to-blue-400', 'to-indigo-500',
    // Indigo
    'from-indigo-500', 'to-purple-500', 'from-indigo-600', 'to-indigo-600',
    // Purple
    'from-purple-500', 'to-violet-500', 'from-purple-600', 'to-violet-600',
    // Violet
    'from-violet-500', 'to-purple-600',
    // Pink
    'from-pink-500', 'to-rose-500', 'from-pink-600', 'to-rose-600',
    // Red
    'from-red-500', 'to-orange-500', 'to-red-600', 'from-red-600', 'to-red-400',
    // Gray
    'from-gray-500', 'to-slate-500', 'from-gray-600', 'to-gray-400',
    // Utilities
    'animate-pulse',
    'opacity-60', 'opacity-70',
    // Border colors for badges
    'border-amber-400/50', 'border-orange-400/50', 'border-yellow-400/50',
    'border-green-400/50', 'border-emerald-400/50', 'border-teal-400/50',
    'border-cyan-400/50', 'border-blue-400/50', 'border-indigo-400/50',
    'border-purple-400/50', 'border-violet-400/50', 'border-pink-400/50',
    'border-red-400/50', 'border-gray-400/50', 'border-slate-400/50',
    'border-slate-400', 'border-dashed',
  ],
}



