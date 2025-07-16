/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // scan ทุกไฟล์ใต้ src
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