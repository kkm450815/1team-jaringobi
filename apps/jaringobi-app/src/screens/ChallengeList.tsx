import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];
const CAT_LABEL: Record<MissionCategory, string> = {
  식비: '식비절약',
  여가: '여가절약',
  충동: '충동차단',
  통장: '통장사수',
};

// 카테고리별 카드 배경색 (수다방 리스트와 같은 톤 팔레트)
const CAT_BG: Record<MissionCategory, string> = {
  식비: '#D8E6CF',
  여가: '#D7D5EC',
  충동: '#F3CFD2',
  통장: '#CFE2EA',
};

export default function ChallengeList() {
  const [cat, setCat] = useState<MissionCategory>('식비');
  const items = MISSIONS.filter((m) => m.category === cat);

  return (
    <main className="min-h-full pb-12">
      <TopBar back="/main" title="" />

      {/* 카테고리 필터 */}
      <div className="px-5 grid grid-cols-4 gap-2">
        {CATS.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex items-center justify-center text-center py-2 rounded-full text-[13px] font-bold transition-colors ${
                active ? 'bg-accent text-[#FFFFAD]' : 'bg-primary/40 text-text/70'
              }`}
            >
              {CAT_LABEL[c]}
            </button>
          );
        })}
      </div>

      {/* 챌린지 카드 리스트 — 수다방 리스트와 동일 구조/사이즈 */}
      <ul className="px-5 mt-4 pb-4 space-y-3">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              aria-label={`${m.title} 챌린지 상세`}
              className="relative block rounded-[22px] px-4 py-3 shadow-soft active:scale-[.99] transition"
              style={{ background: CAT_BG[m.category] }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`}
                  alt={`${m.title} 아이콘`}
                  className="w-[88px] h-[88px] ml-3 object-contain shrink-0 scale-[1.4]"
                  draggable={false}
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                  <p className="font-bold text-[20px] leading-snug text-text text-center">
                    {m.title}
                  </p>
                  <p className="font-bold text-[18px] leading-snug text-text/80 mt-0.5">
                    챌린지
                  </p>
                </div>
              </div>

              {/* 난이도 뱃지 (우상단) */}
              <span className="absolute top-3 right-3 bg-pink text-white text-[12px] font-bold px-3 py-1 rounded-full">
                {m.difficulty}
              </span>

              <p className="absolute right-4 bottom-2 text-[15px] text-text/70 font-medium">
                바로가기 <span aria-hidden>⟶</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
