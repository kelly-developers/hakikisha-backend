/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#0A864D', // Green
        secondary: '#EF9334', // Orange
        background: '#F9FAFB',
        foreground: '#111827',
        card: '#FFFFFF',
        border: '#E5E7EB',
        muted: '#6B7280',
        accent: '#0A864D',
        action: '#0A864D',
        black: {
          100: '#000',
          200: '#C4C4C4',
          300: '#F3F3F3',
        },
      }, 
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
      },
    },
  },
  plugins: [],
}

