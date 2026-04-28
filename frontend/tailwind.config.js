/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00ffcc",
          hover: "#33ffdd",
        },
        secondary: "#ff007f",
        accent: "#bc13fe",
        background: "#000000",
        surface: "#0a0a0a",
        error: "#ff3333",
        success: "#00ff66",
        warning: "#ffaa00",
        info: "#0099ff",
      },
      animation: {
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        heartbeat: {
          '0%, 28%, 70%': { transform: 'scale(1)' },
          '14%, 42%': { transform: 'scale(1.15)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
