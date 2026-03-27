/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { geo: ['var(--font-geo)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
