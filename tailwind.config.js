/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Geist', 'system-ui', 'sans-serif'],
        oswald: ['Oswald', 'Arial Narrow', 'sans-serif'],
        dmsans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif']
      },
      colors: {
        ink: '#3d2817',
        cream: '#f8f5f2',
        brown: '#6b4423',
        moss: '#4a5d3a',
        mist: '#8a8580',
        marketing: {
          bg: '#F1EADB',
          'bg-alt': '#EDE4D1',
          brown: '#6b4423',
          'brown-deep': '#4a2f18',
          'brown-soft': '#8a6440',
          ink: '#2a1a0d',
          muted: '#8a7560',
          card: '#ffffff'
        }
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'listen-pulse': 'listen-pulse 1.4s ease-in-out infinite',
        'speak-wave': 'speak-wave 0.6s ease-in-out infinite',
        'rise': 'rise 1s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'rise-slow': 'rise 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'float': 'float 4.5s ease-in-out infinite',
        'hop': 'hop 1.8s ease-in-out infinite',
        'blip': 'blip 2.4s ease-in-out infinite',
        'bob': 'bob 2.4s ease-in-out infinite'
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
        rise: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-3deg)' },
          '50%': { transform: 'translateY(-14px) rotate(3deg)' }
        },
        hop: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        blip: {
          '0%, 60%, 100%': { opacity: '0', transform: 'translateX(0) scale(0.6)' },
          '20%, 40%': { opacity: '0.85', transform: 'translateX(-6px) scale(1)' }
        },
        bob: {
          '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
          '50%': { transform: 'translateX(-50%) translateY(6px)' }
        }
      }
    }
  },
  plugins: []
};
