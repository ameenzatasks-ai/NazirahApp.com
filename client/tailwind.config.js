/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#0F4C3A',
          cream: '#FAF7F0',
          gold: '#C49A2A',
        },
        status: {
          black: '#1C1C1E',
          red: '#E24B4A',
          amber: '#F59E0B',
          green: '#22C55E',
          yellow: '#EAB308',
        },
        dark: {
          card: '#111111',
          row: '#0d0d0d',
          grid: '#1a1f2e',
          square: '#2a2f3e',
        },
      },
      fontFamily: {
        amiri: ['Amiri', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        'slide-up': 'slideUp 0.3s ease-out both',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
