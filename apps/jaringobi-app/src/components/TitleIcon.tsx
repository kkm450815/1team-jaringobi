// 칭호 아이콘 — title.iconKey 기반 컬러 인라인 SVG.
// locked=true 시 grayscale + 투명도로 흑백 처리.

interface Props {
  iconKey: string;
  size?: number;
  locked?: boolean;
}

const SVG_BASE = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function TitleIcon({ iconKey, size = 48, locked = false }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', ...SVG_BASE };
  const lockClass = locked ? 'grayscale opacity-45' : '';

  switch (iconKey) {
    // 초보 절약가 — 새싹 (모든 신규 사용자 기본 보유)
    case 'sprout':
      return (
        <svg {...common} className={lockClass}>
          <path d="M24 40 V22" stroke="#5C8A3E" strokeWidth="3" />
          <path d="M24 26 C18 26 12 22 12 14 C20 14 26 18 26 26 Z" fill="#7BC256" stroke="#4D7A33" strokeWidth="1.5" />
          <path d="M24 22 C30 22 36 18 36 10 C28 10 22 14 22 22 Z" fill="#9DD672" stroke="#4D7A33" strokeWidth="1.5" />
          <path d="M18 40 H30" stroke="#8B6F1A" strokeWidth="3" />
        </svg>
      );

    // 홈 바리스타 — 머그컵 + 김
    case 'coffee':
      return (
        <svg {...common} className={lockClass}>
          <path d="M16 8c0 3 2 3 2 6M22 8c0 3 2 3 2 6M28 8c0 3 2 3 2 6" stroke="#B0B0B0" strokeWidth="2" />
          <path d="M10 18h22v12c0 5-4 8-8 8h-6c-4 0-8-3-8-8z" fill="#9B6B3D" stroke="#5C3A20" strokeWidth="1.6" />
          <path d="M11 18h20v3h-20z" fill="#5C3A20" />
          <path d="M32 22c4 0 7 2 7 6s-3 6-7 6" stroke="#5C3A20" strokeWidth="2.5" />
        </svg>
      );

    // 편의점 미식가 — 삼각김밥
    case 'cvs':
      return (
        <svg {...common} className={lockClass}>
          <path d="M24 8 L40 36 H8 Z" fill="#FAEFD2" stroke="#5C4A36" strokeWidth="1.8" />
          <path d="M14 28 H34 V34 H14 Z" fill="#2D5132" stroke="#1B3220" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="1" fill="#5C4A36" />
          <circle cx="26" cy="22" r="1" fill="#5C4A36" />
        </svg>
      );

    // 방구석 선비 — 집
    case 'friend':
      return (
        <svg {...common} className={lockClass}>
          <path d="M8 24 L24 10 L40 24 V40 H8 Z" fill="#E8C97A" stroke="#5C4A36" strokeWidth="1.6" />
          <path d="M6 24 L24 8 L42 24" stroke="#C25450" strokeWidth="3" fill="none" />
          <path d="M8 24 L40 24 L40 28 L8 28 Z" fill="#A57E45" stroke="none" />
          <rect x="20" y="28" width="8" height="12" fill="#5C3A20" stroke="#3D2615" strokeWidth="1.2" />
          <circle cx="26" cy="34" r="0.8" fill="#E8C97A" />
        </svg>
      );

    // 동네 몸짱 — 덤벨
    case 'gym':
      return (
        <svg {...common} className={lockClass}>
          <rect x="4" y="19" width="5" height="10" rx="1" fill="#3D3833" />
          <rect x="39" y="19" width="5" height="10" rx="1" fill="#3D3833" />
          <rect x="9" y="21.5" width="4" height="5" fill="#5C5C5C" />
          <rect x="35" y="21.5" width="4" height="5" fill="#5C5C5C" />
          <line x1="13" y1="24" x2="35" y2="24" stroke="#7C7C7C" strokeWidth="3.5" />
          <line x1="13" y1="24" x2="35" y2="24" stroke="#B0B0B0" strokeWidth="1.2" />
        </svg>
      );

    // 문화 한량 — 음표
    case 'culture':
      return (
        <svg {...common} className={lockClass}>
          <path d="M20 34 V12 L36 8 V30" stroke="#5B4B95" strokeWidth="3" />
          <ellipse cx="16" cy="34" rx="5" ry="4" fill="#7B5BC2" stroke="#3D3175" strokeWidth="1.4" />
          <ellipse cx="32" cy="30" rx="5" ry="4" fill="#7B5BC2" stroke="#3D3175" strokeWidth="1.4" />
          <line x1="20" y1="16" x2="36" y2="12" stroke="#5B4B95" strokeWidth="2.5" />
        </svg>
      );

    // 연금술사 — 렌치
    case 'repair':
      return (
        <svg {...common} className={lockClass}>
          <path d="M30 6 a10 10 0 0 0 -8 14 L8 34 v6 h6 L28 26 a10 10 0 0 0 14 -8 l-7 7 l-7 -7 z" fill="#B5B5B5" stroke="#5C5C5C" strokeWidth="1.6" />
          <circle cx="11" cy="37" r="1.4" fill="#3D3833" />
        </svg>
      );

    // 현금술사 — 돈주머니 + ₩
    case 'save':
      return (
        <svg {...common} className={lockClass}>
          <path d="M20 8 H28 L30 12 H18 Z" fill="#8B6F1A" stroke="#5C4A0F" strokeWidth="1.4" />
          <path d="M18 12 H30 L34 18 C40 26 36 40 24 40 C12 40 8 26 14 18 Z" fill="#E8AB2A" stroke="#8B6F1A" strokeWidth="1.6" />
          <text x="24" y="32" textAnchor="middle" fontSize="14" fontWeight="900" fill="#FFF7DD" stroke="none">₩</text>
        </svg>
      );

    // 디지털 폐지왕 — 휴대폰 + 신호
    case 'phone':
      return (
        <svg {...common} className={lockClass}>
          <rect x="14" y="6" width="20" height="36" rx="3" fill="#2D3447" stroke="#0F1320" strokeWidth="1.4" />
          <rect x="17" y="11" width="14" height="22" rx="1" fill="#7AC8E8" stroke="none" />
          <circle cx="24" cy="38" r="1.4" fill="#7C8499" stroke="none" />
          <path d="M20 19 L24 23 L29 18" stroke="#33A04C" strokeWidth="2.4" fill="none" />
        </svg>
      );

    // 배달 킬러 — 배달박스 + X
    case 'delivery':
      return (
        <svg {...common} className={lockClass}>
          <path d="M8 16 L24 8 L40 16 L40 36 L24 44 L8 36 Z" fill="#C49260" stroke="#6B4F2C" strokeWidth="1.6" />
          <path d="M8 16 L24 24 L40 16" stroke="#6B4F2C" strokeWidth="1.6" fill="none" />
          <line x1="24" y1="24" x2="24" y2="44" stroke="#6B4F2C" strokeWidth="1.4" />
          <line x1="14" y1="10" x2="34" y2="22" stroke="#E96B6E" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="34" y1="10" x2="14" y2="22" stroke="#E96B6E" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      );

    // 인내의 화신 — 쇼핑백 + 금지선
    case 'shopping':
      return (
        <svg {...common} className={lockClass}>
          <path d="M12 18 H36 L34 42 H14 Z" fill="#F49496" stroke="#A23F42" strokeWidth="1.6" />
          <path d="M18 18 V14 A6 6 0 0 1 30 14 V18" stroke="#A23F42" strokeWidth="2" fill="none" />
          <line x1="10" y1="10" x2="38" y2="38" stroke="#C0392B" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      );

    // 자린고비 — 줄에 매달린 생선
    case 'zero':
      return (
        <svg {...common} className={lockClass}>
          <line x1="24" y1="4" x2="24" y2="14" stroke="#5C4A36" strokeWidth="2" />
          <path d="M24 14 Q24 17 21 18" stroke="#5C4A36" strokeWidth="2" fill="none" />
          <path d="M12 28 Q12 21 22 21 H32 L40 28 L32 35 H22 Q12 35 12 28 Z" fill="#A8B0B5" stroke="#3D3833" strokeWidth="1.6" />
          <path d="M32 21 L40 16 V28 Z" fill="#A8B0B5" stroke="#3D3833" strokeWidth="1.6" />
          <path d="M32 35 L40 40 V28 Z" fill="#A8B0B5" stroke="#3D3833" strokeWidth="1.6" />
          <circle cx="17" cy="27" r="1.5" fill="#3D3833" />
          <path d="M22 24 L26 26 M22 28 L26 28 M22 32 L26 30" stroke="#3D3833" strokeWidth="1" />
        </svg>
      );

    default:
      return (
        <svg {...common} className={lockClass}>
          <circle cx="24" cy="24" r="14" fill="#B5B5B5" />
        </svg>
      );
  }
}
