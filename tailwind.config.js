/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1a1a1d',
        'surface-2': '#222225',
        border: '#2a2a2e',
        accent: '#4fce82',
        'accent-soft': '#aafbb2',
        info: '#0a84d7',
        danger: '#e5484d',
        warning: '#f5a623',
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
