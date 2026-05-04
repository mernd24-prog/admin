/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      animation: {
        road: 'road 1s linear infinite',
      },
      keyframes: {
        road: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '-30px 0' },
        },
      },
    },
  },
  plugins: [],
}