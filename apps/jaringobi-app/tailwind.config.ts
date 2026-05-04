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
        pink: '#F49496',     // 난이도 뱃지·북마크·중립 강조 (위험 X)
        danger: '#C84A4D',   // 위험 행동 (데이터 초기화 등) — 핑크와 분리
        // F75 노란색 토큰화: soft = 비활성/액센트 텍스트, vivid = 액션 burst, hl = 형광펜
        'accent-soft': '#FFFFAD',
        'accent-vivid': '#FFE34D',
        highlight: '#FFF59D',
      },
      fontSize: {
        // F70 타이포그래피 토큰 — h1/h2/h3/body/sm/xs 6단계
        'h1': ['22px', { lineHeight: '1.25', fontWeight: '700' }],
        'h2': ['18px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['16px', { lineHeight: '1.35', fontWeight: '700' }],
        'body': ['14px', { lineHeight: '1.55' }],
        'caption': ['13px', { lineHeight: '1.5' }],
        'mini': ['11px', { lineHeight: '1.4' }],
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
