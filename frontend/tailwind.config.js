/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#e0e0e0',
        backgroundDark: '#1e293b',
        softShadowLight: '#ffffff',
        softShadowDark: '#bebebe',
        softShadowLightDark: '#334155',
        softShadowDarkDark: '#0f172a',
        primary: {
          DEFAULT: '#3b82f6',
          600: '#2563eb',
          800: '#1e40af',
        },
        secondary: '#10b981',
        accent: '#f59e0b',
        success: {
          DEFAULT: '#10b981',
          600: '#059669'
        },
        warning: {
          DEFAULT: '#f59e0b',
          600: '#d97706'
        },
        error: {
          DEFAULT: '#ef4444',
          400: '#f87171',
          600: '#dc2626',
        },
        info: {
          DEFAULT: '#3b82f6',
          600: '#2563eb'
        }
      },
      boxShadow: {
        neomorphism: '8px 8px 16px #bebebe, -8px -8px 16px #ffffff',
        neomorphismDark: '8px 8px 16px #0f172a, -8px -8px 16px #334155',
        neomorphismHover: '12px 12px 20px #bebebe, -12px -12px 20px #ffffff',
        neomorphismHoverDark: '12px 12px 20px #0f172a, -12px -12px 20px #334155',
        neomorphismInset: 'inset 8px 8px 16px #bebebe, inset -8px -8px 16px #ffffff',
        neomorphismInsetDark: 'inset 4px 4px 8px #0f172a, inset -4px -4px 8px #334155',
        'neomorphism-light': '8px 8px 16px #bebebe, -8px -8px 16px #ffffff',
        'neomorphism-dark': '8px 8px 16px #0f172a, -8px -8px 16px #334155',
        'neomorphism-hover-light': '12px 12px 20px #bebebe, -12px -12px 20px #ffffff',
        'neomorphism-hover-dark': '12px 12px 20px #0f172a, -12px -12px 20px #334155',
        'neomorphism-inset-light': 'inset 8px 8px 16px #bebebe, inset -8px -8px 16px #ffffff',
        'neomorphism-inset-dark': 'inset 4px 4px 8px #0f172a, inset -4px -4px 8px #334155',
      }
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['Space Grotesk', 'sans-serif']
    }
  },
  plugins: [],
}
