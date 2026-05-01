import { useState } from 'react';
import { EquipSlot, equipSlotOf, fitSrc } from '../lib/data';

// 캐릭터 캔버스/렌더 기준값. 사치품·티셔츠 fit이 캐릭터와 같은 픽셀 스케일로 그려지도록 동기화.
const CHAR_CANVAS_H = 458;
const CHAR_HEIGHT_PCT = 58; // 캐릭터 표시 높이(룸 대비 %)

/**
 * 사치품·티셔츠 같은 캐릭터-정렬 fit 이미지.
 * 자연 캔버스 높이를 읽어 캐릭터와 같은 픽셀 스케일로 렌더 (h % = naturalH/458 * 58).
 * 캔버스 높이가 458 초과면 캐릭터 위/아래로 자연스럽게 뻗어나감.
 */
function CharFitImage({ src }: { src: string }) {
  const [naturalH, setNaturalH] = useState<number | null>(null);
  const heightPct = naturalH ? (naturalH / CHAR_CANVAS_H) * CHAR_HEIGHT_PCT : CHAR_HEIGHT_PCT;
  return (
    <img
      src={src}
      alt=""
      onLoad={(e) => setNaturalH(e.currentTarget.naturalHeight)}
      className="absolute left-1/2 bottom-[18%] -translate-x-1/2 w-auto max-w-none object-contain pointer-events-none select-none"
      style={{ height: `${heightPct}%` }}
      draggable={false}
    />
  );
}

/**
 * 미리보기 룸: 캐릭터 + 장착/미리보기 fit 이미지를 슬롯별 정확한 위치/크기/z-order로 렌더.
 * 슬롯별 동시 1개씩만 표시 (extra가 같은 슬롯이면 equipped 대신 그것을 보여줌).
 */
export function RoomPreview({
  equipped,
  extra = [],
  className = '',
  framed = true,
}: {
  equipped: string[];
  extra?: string[];
  className?: string;
  framed?: boolean;
}) {
  // 슬롯별로 최우선 표시 src 결정 (extra 우선)
  const all = [...equipped, ...extra];
  function pick(slot: EquipSlot): string | undefined {
    let chosen: string | undefined;
    for (const s of all) if (equipSlotOf(s) === slot) chosen = s; // 뒤에 오는게 우선
    return chosen;
  }
  const wall = pick('벽지');
  const lamp = pick('조명');
  const left = pick('소품');
  const right = pick('가구2');
  const front = pick('가구1');
  const clothes = pick('티셔츠');
  const acc = pick('사치품');

  return (
    <section
      className={`relative overflow-hidden ${framed ? 'rounded-2xl shadow-soft' : ''} ${className}`}
    >
      <img
        src="/jarin/main_ room.png"
        alt="미리보기"
        className="w-full h-auto block select-none"
        draggable={false}
      />

      {/* 벽지 - 가장 뒤 (방 배경) */}
      {wall && (
        <img
          src={fitSrc(wall)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      )}

      {/* 소품 - 좌상단 (2.1x), X 10px 왼쪽 */}
      {left && (
        <img
          src={fitSrc(left)}
          alt=""
          className="absolute left-[-2%] top-[34%] h-[24%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}
      {/* 가구2 - 우측 (2.1x), X 10px 오른쪽 + Y 10px 업 */}
      {right && (
        <img
          src={fitSrc(right)}
          alt=""
          className="absolute right-[-1%] top-[32%] h-[49%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}

      {/* 캐릭터 + 옷 + 사치품 (모두 같은 좌표/캐릭터 픽셀 스케일) */}
      <img
        src="/jarin/main_character.png"
        alt="캐릭터"
        className="absolute left-1/2 bottom-[18%] -translate-x-1/2 h-[58%] w-auto object-contain pointer-events-none select-none"
        draggable={false}
      />
      {clothes && <CharFitImage key={clothes} src={fitSrc(clothes)} />}
      {acc && <CharFitImage key={acc} src={fitSrc(acc)} />}

      {/* 가구1 - 좌하단(방 좌측 시작점), 캐릭터보다 앞 (z-10), Y 30px 위로 */}
      {front && (
        <img
          src={fitSrc(front)}
          alt=""
          className="absolute z-10 left-0 bottom-[-2%] h-[31%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}

      {/* 천장 조명 - 상단 중앙 (1.5x) */}
      {lamp && (
        <img
          src={fitSrc(lamp)}
          alt=""
          className="absolute left-1/2 -translate-x-1/2 top-0 h-[20%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}
    </section>
  );
}
