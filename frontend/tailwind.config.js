/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: {
          primary: '#0a0d14',
          secondary: '#0f1218',
          tertiary: '#151820',
          elevated: '#1e2532',
        },
        border: {
          DEFAULT: '#1e2532',
          light: '#374151',
          dark: '#2a3441',
        },
        text: {
          primary: '#ffffff',
          secondary: '#e5e7eb',
          tertiary: '#d1d5db',
          muted: '#9ca3af',
          subtle: '#6b7280',
          disabled: '#4b5563',
        },
        brand: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          light: '#a5b4fc',
        },
      },
    },
  },
  plugins: [],
}
