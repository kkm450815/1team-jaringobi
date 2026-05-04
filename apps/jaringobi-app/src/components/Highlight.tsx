// 인라인 형광펜 마크업 — `**키워드**` 형태를 <mark>로 변환.
// 예: "매일 **4,000원**짜리 카페" → "매일 [4,000원]짜리 카페"
// 텍스트 안에 별 두 개로 감싼 부분이 강조됨. 이스케이프 필요 없음.

interface Props {
  text: string;
  className?: string;
}

const HIGHLIGHT_CLASS = 'bg-[#FFF59D] text-text px-0.5 rounded-[3px]';

export function Highlight({ text, className }: Props) {
  // **...** 패턴을 split. 짝수 인덱스는 일반 텍스트, 홀수는 강조 대상.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={HIGHLIGHT_CLASS}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
