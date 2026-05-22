import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        golden: "#FFBB00",
        primary: "#CE9F2D",
        surface: "#FAF6EE",
        band: "#f7efde",
        accent: "#a76616",
        ink: "#2E2E2E",
        darkInk: "#484555",
        gray: {
          ...colors.gray,
          DEFAULT: "#A6A6A6",
        },
        brown: "#9E886A",
        muted: "#3f3f3f",
        border: "#e7dfd1",
        divider: "#cfc5b5",
        grayBorder: "#E0E0E0",
        green: {
          ...colors.green,
          DEFAULT: "#45C500",
        },
        blue: {
          ...colors.blue,
          DEFAULT: "#222178",
        },
        card: {
          border: "#CE9F2D",
        },
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        inter: ["Inter"],
      },
      fontSize: {
        paragraph: ["18px", "28px"],
      },
      fontWeight: {
        medium: 500,
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        custom: "12px",
        full: "9999px",
      },
      screens: {
        xs: "320px",
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      spacing: {
        128: "32rem",
        144: "36rem",
        160: "40rem",
      },
      keyframes: {
        "slide-fade-in": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-fade-out": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-20px)", opacity: "0" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-100%)", opacity: "0" },
        },
      },
      animation: {
        "slide-fade-in": "slide-fade-in 0.3s ease-out forwards",
        "slide-fade-out": "slide-fade-out 0.3s ease-in forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-in forwards",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".hide-scrollbar": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".hide-scrollbar::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};
