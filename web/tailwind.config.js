/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb", // xanh chủ đạo
        secondary: "#1e293b",
        accent: "#f59e0b",
      },
    },
  },
  plugins: [],
};
