// 칭호 아이콘 — title.iconKey 기반 인라인 SVG. 색은 currentColor 사용.
// 미획득 시 부모에서 text-text/40 등으로 톤 다운.

interface Props {
  iconKey: string;
  size?: number;
}

const wrap = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function TitleIcon({ iconKey, size = 48 }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', ...wrap };

  switch (iconKey) {
    // 홈 바리스타 — 머그컵 + 김
    case 'coffee':
      return (
        <svg {...common}>
          <path d="M16 8c0 3 2 3 2 6M22 8c0 3 2 3 2 6M28 8c0 3 2 3 2 6" />
          <path d="M10 18h22v12c0 5-4 8-8 8h-6c-4 0-8-3-8-8z" fill="currentColor" stroke="none" />
          <path d="M32 22c4 0 7 2 7 6s-3 6-7 6" />
        </svg>
      );

    // 편의점 미식가 — 삼각김밥 (삼각형 + 김 띠)
    case 'cvs':
      return (
        <svg {...common}>
          <path d="M24 8 L40 36 H8 Z" fill="currentColor" stroke="currentColor" />
          <path d="M14 28 H34 V34 H14 Z" fill="#FAF7EE" stroke="none" />
        </svg>
      );

    // 방구석 선비 — 집
    case 'friend':
      return (
        <svg {...common}>
          <path d="M8 24 L24 10 L40 24 V40 H8 Z" fill="currentColor" stroke="currentColor" />
          <rect x="20" y="28" width="8" height="12" fill="#FAF7EE" stroke="none" />
        </svg>
      );

    // 동네 몸짱 — 덤벨
    case 'gym':
      return (
        <svg {...common} strokeWidth={2.6}>
          <rect x="4" y="19" width="5" height="10" rx="1" fill="currentColor" />
          <rect x="39" y="19" width="5" height="10" rx="1" fill="currentColor" />
          <rect x="9" y="21.5" width="4" height="5" fill="currentColor" />
          <rect x="35" y="21.5" width="4" height="5" fill="currentColor" />
          <line x1="13" y1="24" x2="35" y2="24" />
        </svg>
      );

    // 문화 한량 — 음표
    case 'culture':
      return (
        <svg {...common}>
          <path d="M20 34 V12 L36 8 V30" />
          <ellipse cx="16" cy="34" rx="5" ry="4" fill="currentColor" />
          <ellipse cx="32" cy="30" rx="5" ry="4" fill="currentColor" />
          <line x1="20" y1="16" x2="36" y2="12" />
        </svg>
      );

    // 연금술사 — 렌치
    case 'repair':
      return (
        <svg {...common}>
          <path d="M30 6 a10 10 0 0 0 -8 14 L8 34 v6 h6 L28 26 a10 10 0 0 0 14 -8 l-7 7 l-7 -7 z" fill="currentColor" stroke="currentColor" />
        </svg>
      );

    // 현금술사 — 돈주머니 (₩)
    case 'save':
      return (
        <svg {...common}>
          <path d="M18 12 H30 L34 18 C40 26 36 40 24 40 C12 40 8 26 14 18 Z" fill="currentColor" stroke="currentColor" />
          <path d="M20 8 H28 L30 12 H18 Z" fill="currentColor" stroke="currentColor" />
          <text x="24" y="32" textAnchor="middle" fontSize="13" fontWeight="900" fill="#FAF7EE" stroke="none">₩</text>
        </svg>
      );

    // 디지털 폐지왕 — 휴대폰 + 신호
    case 'phone':
      return (
        <svg {...common}>
          <rect x="14" y="6" width="20" height="36" rx="3" fill="currentColor" stroke="currentColor" />
          <rect x="17" y="11" width="14" height="22" rx="1" fill="#FAF7EE" stroke="none" />
          <circle cx="24" cy="38" r="1.4" fill="#FAF7EE" stroke="none" />
          <path d="M21 17 L27 23 L31 19" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      );

    // 배달 킬러 — 배달박스 + X
    case 'delivery':
      return (
        <svg {...common}>
          <path d="M8 16 L24 8 L40 16 L40 36 L24 44 L8 36 Z" fill="currentColor" stroke="currentColor" />
          <path d="M8 16 L24 24 L40 16" stroke="#FAF7EE" fill="none" />
          <line x1="24" y1="24" x2="24" y2="44" stroke="#FAF7EE" />
          <line x1="16" y1="20" x2="22" y2="23" stroke="#FAF7EE" strokeWidth="2.2" />
          <line x1="14" y1="10" x2="34" y2="22" stroke="#E96B6E" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="34" y1="10" x2="14" y2="22" stroke="#E96B6E" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );

    // 인내의 화신 — 쇼핑백 + 금지선
    case 'shopping':
      return (
        <svg {...common}>
          <path d="M12 18 H36 L34 42 H14 Z" fill="currentColor" stroke="currentColor" />
          <path d="M18 18 V14 A6 6 0 0 1 30 14 V18" />
          <line x1="10" y1="10" x2="38" y2="38" stroke="#E96B6E" strokeWidth="3.2" />
        </svg>
      );

    // 자린고비 — 줄에 매달린 생선
    case 'zero':
      return (
        <svg {...common}>
          <line x1="24" y1="4" x2="24" y2="14" />
          <path d="M24 14 Q24 17 21 18" fill="none" />
          <path d="M12 28 Q12 21 22 21 H32 L40 28 L32 35 H22 Q12 35 12 28 Z" fill="currentColor" stroke="currentColor" />
          <path d="M32 21 L40 16 V28 Z" fill="currentColor" stroke="currentColor" />
          <path d="M32 35 L40 40 V28 Z" fill="currentColor" stroke="currentColor" />
          <circle cx="17" cy="27" r="1.4" fill="#FAF7EE" stroke="none" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="14" />
        </svg>
      );
  }
}
