// 칭호 아이콘 — TITLES.img 의 PNG 이미지를 사용. locked 시 grayscale + 투명도.
// 이미지가 없거나 로드 실패하면 빈 자리로 표시 (visibility:hidden).

interface Props {
  src: string;
  size?: number;
  locked?: boolean;
  alt?: string;
}

export function TitleIcon({ src, size = 48, locked = false, alt = '' }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`object-contain transition ${locked ? 'grayscale opacity-50' : ''}`}
      style={{ width: size, height: size }}
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  );
}
