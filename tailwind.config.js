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
        ink: '#3d2817',
        cream: '#f8f5f2',
        brown: '#6b4423',
        moss: '#4a5d3a',
        mist: '#8a8580'
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'listen-pulse': 'listen-pulse 1.4s ease-in-out infinite',
        'speak-wave': 'speak-wave 0.6s ease-in-out infinite',
        'yap-wander': 'yap-wander 38s ease-in-out infinite',
        'yap-breathe': 'yap-breathe 3.6s ease-in-out infinite',
        'yap-wiggle': 'yap-wiggle 0.7s ease-in-out infinite',
        'yap-tilt': 'yap-tilt 1.8s ease-in-out infinite'
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
        },
        'yap-wander': {
          '0%':   { top: '15%', left: '18%' },
          '12%':  { top: '55%', left: '62%' },
          '24%':  { top: '20%', left: '60%' },
          '36%':  { top: '60%', left: '20%' },
          '48%':  { top: '38%', left: '65%' },
          '60%':  { top: '12%', left: '40%' },
          '72%':  { top: '50%', left: '50%' },
          '84%':  { top: '30%', left: '15%' },
          '100%': { top: '15%', left: '18%' }
        },
        'yap-breathe': {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)' },
          '50%':      { transform: 'scale(1.04) rotate(2deg)' }
        },
        'yap-wiggle': {
          '0%, 100%': { transform: 'scale(1, 1) rotate(0deg)' },
          '25%':      { transform: 'scale(1.07, 0.93) rotate(-3deg)' },
          '50%':      { transform: 'scale(0.95, 1.05) rotate(3deg)' },
          '75%':      { transform: 'scale(1.06, 0.94) rotate(-2deg)' }
        },
        'yap-tilt': {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%':      { transform: 'rotate(4deg)' }
        }
      }
    }
  },
  plugins: []
};
