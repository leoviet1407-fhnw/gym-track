/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        bg: "#0a0a0b",
        surface: "#141417",
        surface2: "#1d1d21",
        border: "#2a2a2f",
        text: "#f5f5f7",
        muted: "#8a8a92",
        accent: "#ff3d3d",
        accent2: "#ffd84d",
        success: "#4ade80",
      },
    },
  },
  plugins: [],
};
