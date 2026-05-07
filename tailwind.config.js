/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Geist', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#0a0a0a',
        cream: '#f8f5f2',
        brown: '#6b4423',
        moss: '#4a5d3a',
        mist: '#8a8580'
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'listen-pulse': 'listen-pulse 1.4s ease-in-out infinite',
        'speak-wave': 'speak-wave 0.6s ease-in-out infinite'
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.05)', opacity: '1' }
        },
        'listen-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.15)', opacity: '1' }
        },
        'speak-wave': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' }
        }
      }
    }
  },
  plugins: []
};
