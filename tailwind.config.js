import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        golden: "#D6A323",
        primary: "#D6A323",
        brandBlue: "#2F6BFF",
        surface: "#FFF7EA",
        band: "#FFF7EA",
        accent: "#D6A323",
        ink: "#252238",
        darkInk: "#1F1B5F",
        sidebar: "#FFF7EA",
        sidebarDark: "#F4E7D0",
        sidebarGold: "#D6A323",
        canvas: "#F6F7FB",
        gray: {
          ...colors.gray,
          DEFAULT: "#777487",
        },
        brown: "#9E886A",
        muted: "#777487",
        border: "#EADFCE",
        divider: "#DFCFB7",
        grayBorder: "#EADFCE",
        green: {
          ...colors.green,
          DEFAULT: "#22C55E",
        },
        blue: {
          ...colors.blue,
          DEFAULT: "#3B82F6",
        },
        card: {
          border: "#EADFCE",
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
        "3xl": "1920px",
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
