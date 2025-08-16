/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'kanit': ['var(--font-kanit)', 'sans-serif'],
      },
      fontSize: {
        // Kanit font sizes based on specifications
        'kanit-34': ['34px', { lineHeight: '1.2', fontWeight: '400' }], // Kanit 34 Regular (หัวข้อใหญ่สุด)
        'kanit-24': ['24px', { lineHeight: '1.3', fontWeight: '400' }], // Kanit 24 Regular (หัวข้อกลาง/หนวดกบี/Brain Bang)
        'kanit-24-light': ['24px', { lineHeight: '1.3', fontWeight: '300' }], // Kanit 24 Light (Button)
        'kanit-18': ['18px', { lineHeight: '1.4', fontWeight: '300' }], // Kanit 18 Light (ช่องพิมพ์ข้อความ)
        'kanit-18-content': ['18px', { lineHeight: '1.4', fontWeight: '300' }], // Kanit 18 Light (ข้อความ***)
        'kanit-16': ['16px', { lineHeight: '1.4', fontWeight: '400' }], // Kanit 16 Regular (ชื่อผลงาน)
        'kanit-16-light': ['16px', { lineHeight: '1.4', fontWeight: '300' }], // Kanit 16 Light (ข้อมูลต่างๆ/ช่องค้นหา)
      },
      colors: {
        orangeBrand: "#F26A21",
        yellowBrand: "#F2D90E",
        cyanBrand: "#59C8DD",
        blueBrand: "#312F8E",
        pinkBrand: "#BE1C7E",
      },
      keyframes: {
        arrowBounceFade: {
          '0%, 100%': { transform: 'translateX(0)', opacity: '1' },
          '50%': { transform: 'translateX(-10px)', opacity: '0' },
        },
      },
      animation: {
        'arrow': 'arrowBounceFade 1.8s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
