/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // or 'class' if you want manual control
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%, 20%, 40%, 60%, 80%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
          },
          '40%': {
            transform: 'translateY(-6px) scale(1.1)',
            animationTimingFunction: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
          },
          '60%': {
            transform: 'translateY(-3px) scale(1.05)',
            animationTimingFunction: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
          },
          '80%': {
            transform: 'translateY(-1px) scale(1.02)',
            animationTimingFunction: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
          },
          '100%': {
            transform: 'translateY(0) scale(1)',
            animationTimingFunction: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
          },
        },
      },
      scale: {
        '102': '1.02',
        '105': '1.05',
      }
    },
  },
  plugins: [],
}