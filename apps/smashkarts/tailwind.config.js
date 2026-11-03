/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0a',
        coal: '#141412',
        plate: '#1d1d1a',
        line: '#33332d',
        bone: '#f2ecdd',
        ash: '#a8a293',
        signal: '#ff5a1f',
        warning: '#ffc233',
        toxic: '#9ef01a',
        steel: '#6f7d8c',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
}
