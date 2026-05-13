// 마이페이지·프로필의 작은 캐릭터 박스(aspect-square + overflow-hidden) 에
// 캐릭터와 fit 이미지(옷·악세사리)를 그리는 컴포넌트.
//
// RoomPreview 와 다른 layout (캐릭터가 박스 위쪽에서 시작, h-200% 로 상반신만
// 보임). fit 이미지는 자연 높이를 측정해서 캐릭터 캔버스(458px) 와 같은 비율로
// 그림 → 캔버스가 더 큰 fit (큰 모자/안경) 은 위로 튀어나가 박스 위에서 잘려
// "벗겨지는 느낌" 으로 보임. 작게 강제 축소되어 머리 위로 떨어지지 않음.

import { useState } from 'react';
import { fitSrc } from '../lib/data';

const CHAR_CANVAS_H = 458;     // main_character.png 의 세로 픽셀
const CHAR_HEIGHT_PCT = 200;    // 캐릭터 이미지 h-[200%]
const CHAR_CENTER_PCT = 100;    // top-0 + h-200% 의 세로 중심 = 100%

function ProfileFitImage({ src }: { src: string }) {
  const [naturalH, setNaturalH] = useState<number | null>(null);
  // 자연 높이가 458px(기본 캔버스) 보다 크면 그 비율만큼 더 큰 박스로 그려서
  // 위로 튀어나간 영역이 박스의 overflow-hidden 으로 잘리도록 처리.
  const heightPct = naturalH ? (naturalH / CHAR_CANVAS_H) * CHAR_HEIGHT_PCT : CHAR_HEIGHT_PCT;
  const topPct = CHAR_CENTER_PCT - heightPct / 2;
  return (
    <img
      src={src}
      alt=""
      onLoad={(e) => setNaturalH(e.currentTarget.naturalHeight)}
      className="absolute left-1/2 -translate-x-1/2 w-auto max-w-none object-contain pointer-events-none select-none"
      style={{ height: `${heightPct}%`, top: `${topPct}%` }}
      draggable={false}
    />
  );
}

interface Props {
  characterSrc: string;
  /** 장착된 fit 항목 경로 — '/shop/clothes/' 또는 '/shop/acc/' 만 필터된 상태로 전달 */
  equipped: string[];
  alt?: string;
}

export function ProfileCharacterBox({ characterSrc, equipped, alt = '' }: Props) {
  return (
    <>
      <img
        src={characterSrc}
        alt={alt}
        className="absolute left-1/2 -translate-x-1/2 top-0 h-[200%] w-auto max-w-none pointer-events-none"
        draggable={false}
      />
      {equipped.map((s) => (
        <ProfileFitImage key={s} src={fitSrc(s)} />
      ))}
    </>
  );
}
