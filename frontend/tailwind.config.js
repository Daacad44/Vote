/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#10316b",
        accent: "#ffb703",
      },
    },
  },
  plugins: [],
};
