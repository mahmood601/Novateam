/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'brown': '#693800',

        // Dark colors
        'header': '#191919',
        'dark-hover': '#444',

      }
    }
  },
  plugins: []
};
