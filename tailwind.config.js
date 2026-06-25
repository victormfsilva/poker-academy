/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        'surface-1': '#131316',
        'surface-2': '#1c1c21',
        'surface-3': '#26262d',
        border: '#2e2e38',
        'border-strong': '#3a3a47',
        emerald: '#34d399',
        'emerald-soft': 'rgba(52, 211, 153, 0.12)',
        gold: '#f59e0b',
        'gold-soft': 'rgba(245, 158, 11, 0.12)',
        crimson: '#ef4444',
        'crimson-soft': 'rgba(239, 68, 68, 0.10)',
        sapphire: '#3b82f6',
        'sapphire-soft': 'rgba(59, 130, 246, 0.12)',
        'text-primary': '#f4f4f5',
        'text-secondary': '#a1a1aa',
        'text-tertiary': '#71717a',
        'text-muted': '#52525b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
