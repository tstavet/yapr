/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        oswald: ['Oswald', 'Arial Narrow', 'sans-serif'],
        dmsans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif']
      },
      colors: {
        // The whole palette. Three tokens, by role.
        cream: '#F1EADB', // background tan
        brown: '#6b4423', // headers / wordmarks / primary surface
        ink:   '#5A3A1F', // body text / muted detail
        // Marketing surface mirrors the same three tokens, namespaced so the
        // page can be tuned independently if it ever needs to diverge again.
        marketing: {
          bg:    '#F1EADB',
          brown: '#6b4423',
          ink:   '#5A3A1F'
        }
      },
      animation: {
        'rise': 'rise 1s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'rise-slow': 'rise 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'float': 'float 4.5s ease-in-out infinite',
        'hop': 'hop 1.8s ease-in-out infinite',
        'blip': 'blip 2.4s ease-in-out infinite',
        'bob': 'bob 2.4s ease-in-out infinite'
      },
      keyframes: {
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
