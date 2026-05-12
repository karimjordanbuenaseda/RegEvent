import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#81A6C6',
          accent: '#AACDDC',
          card: '#F3E3D0',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
