/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        // Warm, earthy brown — the primary identity color
        brown: {
          50: "#F8F1E7",
          100: "#EEDFC8",
          200: "#DCBE97",
          300: "#C79A69",
          400: "#9C6E44",
          500: "#6E4A2E",
          600: "#553A24",
          700: "#432D1C",
          800: "#332215",
          900: "#241810",
          950: "#180F0A",
        },
        // Cream — warm section backgrounds
        cream: {
          50: "#FFFDF9",
          100: "#FBF4E8",
          200: "#F5E9D3",
          300: "#EEDBB8",
        },
        // Pasture green — the accent / action color
        pasture: {
          50: "#EFF6EE",
          100: "#D9EAD6",
          400: "#5C9457",
          500: "#457A41",
          600: "#386534",
          700: "#2C5029",
        },
        // Marigold — used sparingly for small warm highlights
        marigold: {
          400: "#DDA13E",
          500: "#C88A2A",
        },
      },
      fontFamily: {
        display: ["'Tiro Devanagari Hindi'", "serif"],
        sans: ["'Hind'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 10px rgba(36, 24, 16, 0.06)",
        lift: "0 12px 24px -8px rgba(36, 24, 16, 0.22)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      maxWidth: {
        "8xl": "1440px",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "hero-zoom": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.8s ease-out both",
        float: "float 4s ease-in-out infinite",
        "hero-zoom": "hero-zoom 20s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
