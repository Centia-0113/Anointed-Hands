/** Anointed Hands brand palette: blush & rose pinks with warm gold accents */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: {
          50: "#fff7fa",
          100: "#fdeef3",
          200: "#fad5e2",
          300: "#f5b0c8",
          400: "#ec7fa6",
          500: "#cf2a6a",
          600: "#b00048", // primary – raspberry from the logo wordmark
          700: "#8f003b",
          800: "#6e0a33",
          900: "#4a0d29", // deep plum-rose for text & footer
        },
        gold: {
          50: "#fdf9ec",
          100: "#f8eecb",
          200: "#f0dc97",
          300: "#e6c766",
          400: "#d9b143",
          500: "#c9a227", // primary gold
          600: "#a8841c",
          700: "#856717",
        },
      },
      fontFamily: {
        elegant: ['"Cormorant Garamond"', "Georgia", "Garamond", "serif"],
        body: ["Lato", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(194, 24, 91, 0.25)",
        gold: "0 10px 30px -12px rgba(201, 162, 39, 0.45)",
      },
    },
  },
  plugins: [],
};
