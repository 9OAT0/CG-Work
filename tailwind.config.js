/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orangeBrand: "#F26A21",
        yellowBrand: "#F2D90E",
        cyanBrand: "#59C8DD",
        blueBrand: "#312F8E",
        pinkBrand: "#BE1C7E",
      },
    },
  },
  plugins: [],
};