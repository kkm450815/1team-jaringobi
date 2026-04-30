import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];
const TIPS: Record<string, string> = {
  cvs: '편의점, 한 달이면 10만원이 우습게 빠집니다',
  coffee: '하루 한 잔 카페, 한 달이면 12만원',
  delivery: '배달 끊으면 한 달 평균 18만원 절약',
  receipe: '집밥 + 도시락이면 식비 절반',
  dinner: '저녁 한 끼 굶기로 시작하는 다이어트 + 절약',
  culture: '문화비 한 달에 두 번이면 충분',
  drink: '술자리 한 번 빠지면 3만원',
  hair: '미용실 한 달 미루기',
  library: '도서관 = 무료 카페 + 무료 헬스장',
  shopping: '충동구매는 24시간 룰',
  phone: '약정 만료 후에도 그대로? 통신비 점검',
  taxi: '심야 택시 대신 새벽 첫차',
  gifticon: '기프티콘 자제',
  save: '잔돈은 무조건 저금통',
  carrot: '안 쓰는 물건 = 현금',
  alba: '주말 알바 한 번이면 5만원',
  zero: '하루 무지출 챌린지',
  repair: '간단 수리는 유튜브로',
  friend: '친구찬스 활용하기',
  leisure: '비싼 레저는 다음 달',
};

export default function ChallengeList() {
  const [cat, setCat] = useState<MissionCategory>('식비');
  const items = MISSIONS.filter((m) => m.category === cat);

  return (
    <main className="min-h-full pb-12">
      <TopBar back="/main" title="챌린지 정보" />

      <div className="px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap ${
              cat === c ? 'bg-accent text-white' : 'bg-white text-text/70'
            }`}
          >{c} 절약</button>
        ))}
      </div>

      <ul className="px-5 mt-4 space-y-2.5">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              className="flex items-stretch bg-white rounded-2xl shadow-soft overflow-hidden active:scale-[.99] transition"
            >
              <div className="w-20 grid place-items-center bg-accent">
                <img src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`} alt="" className="w-12 h-12 object-contain" />
              </div>
              <div className="flex-1 p-3">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{m.title}</p>
                  <Tag color="pink">{m.difficulty}</Tag>
                </div>
                <p className="text-[12px] text-text/60 mt-1 line-clamp-2">{TIPS[m.iconKey]}</p>
                <p className="text-[12px] text-accent font-bold mt-1.5">바로가기 →</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
