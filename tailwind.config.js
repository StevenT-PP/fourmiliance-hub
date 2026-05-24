/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        fourmiliance: {
          'deep':       '#0F2008',
          'forest':     '#1E4010',
          'mid':        '#2D5A1B',
          'light':      '#4A7A2E',
          'ocre':       '#B87520',
          'ocre-dark':  '#9B6018',
          'ocre-light': '#D4A052',
          'cream':      '#F9F6F0',
          'cream-dark': '#EDE8DF',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        ui:   '8px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)',
        sm:   '0 1px 4px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
}
