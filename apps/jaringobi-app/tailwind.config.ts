import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F6EEDE',
        primary: '#ABBCA2',
        accent: '#617C53',
        text: '#514C44',
        pink: '#F49496',
      },
      fontFamily: {
        sans: ['GangwonEducationModuche', 'Pretendard', 'Apple SD Gothic Neo', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '20px' },
      boxShadow: {
        soft: '0 6px 20px rgba(81,76,68,0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config;
