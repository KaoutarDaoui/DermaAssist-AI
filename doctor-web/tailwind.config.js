/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          500: "#0F6E56",
          600: "#0A5A47",
          700: "#053D37",
        },
      },
    },
  },
  plugins: [],
};
