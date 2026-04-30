import { EquipSlot, equipSlotOf, fitSrc } from '../lib/data';

/**
 * 미리보기 룸: 캐릭터 + 장착/미리보기 fit 이미지를 슬롯별 정확한 위치/크기/z-order로 렌더.
 * 슬롯별 동시 1개씩만 표시 (extra가 같은 슬롯이면 equipped 대신 그것을 보여줌).
 */
export function RoomPreview({
  equipped,
  extra = [],
  className = '',
}: {
  equipped: string[];
  extra?: string[];
  className?: string;
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

  // 사치품/티셔츠는 캐릭터와 같은 좌/높이를 사용하되 w-auto로 캔버스 자연 폭 유지
  // (캐릭터보다 넓은 캔버스(예: 도구가 옆으로 뻗는 사치품)도 그대로 렌더)
  const charPosClass =
    'absolute left-1/2 bottom-[18%] -translate-x-1/2 h-[58%] w-auto object-contain pointer-events-none select-none';

  return (
    <section className={`relative rounded-2xl overflow-hidden shadow-soft ${className}`}>
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

      {/* 소품 - 좌상단 (작은 액세서리) — 캔버스 1x */}
      {left && (
        <img
          src={fitSrc(left)}
          alt=""
          className="absolute left-[6%] top-[24%] h-[11%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}
      {/* 가구2 - 우측 캐릭터 어깨 높이 — 캔버스 1x */}
      {right && (
        <img
          src={fitSrc(right)}
          alt=""
          className="absolute right-[5%] top-[28%] h-[23%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}

      {/* 캐릭터 + 옷 + 사치품 (모두 같은 좌표/높이, 캔버스 자연 폭) */}
      <img
        src="/jarin/main_character.png"
        alt="캐릭터"
        className={charPosClass}
        draggable={false}
      />
      {clothes && (
        <img src={fitSrc(clothes)} alt="" className={charPosClass} draggable={false} />
      )}
      {acc && (
        <img src={fitSrc(acc)} alt="" className={charPosClass} draggable={false} />
      )}

      {/* 가구1 - 좌하단(방 좌측 시작점), 캐릭터보다 앞 — 캔버스 1x */}
      {front && (
        <img
          src={fitSrc(front)}
          alt=""
          className="absolute left-0 bottom-[5%] h-[31%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}

      {/* 천장 조명 - 상단 중앙 — 캔버스 1x */}
      {lamp && (
        <img
          src={fitSrc(lamp)}
          alt=""
          className="absolute left-1/2 -translate-x-1/2 top-0 h-[13%] w-auto object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}
    </section>
  );
}
