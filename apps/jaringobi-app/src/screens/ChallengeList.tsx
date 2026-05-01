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
                active ? 'bg-[#FFFFAD] text-text' : 'bg-primary/40 text-text/70'
              }`}
            >
              {CAT_LABEL[c]}
            </button>
          );
        })}
      </div>

      {/* 챌린지 카드 리스트 */}
      <ul className="px-5 mt-4 space-y-3">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              className="relative flex items-stretch bg-white rounded-2xl shadow-soft overflow-hidden active:scale-[.99] transition"
            >
              {/* 아이콘 영역 */}
              <div className="w-[128px] grid place-items-center bg-[#ABBCA2] shrink-0">
                <img
                  src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`}
                  alt=""
                  className="w-[88px] h-[88px] object-contain"
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
              </div>

              {/* 텍스트 영역 */}
              <div className="flex-1 p-4 min-w-0 pr-16">
                <p className="text-[20pt] font-bold text-[#514C44] leading-tight">
                  {m.title}
                </p>
                <p className="mt-2 text-[16pt] text-[#514C44] leading-snug line-clamp-2">
                  {m.intro}
                </p>
              </div>

              {/* 난이도 뱃지 (우상단) */}
              <span
                className="absolute bg-pink text-white text-[12px] font-bold px-3 py-1 rounded-full"
                style={{ top: '12px', right: '12px' }}
              >
                {m.difficulty}
              </span>

              {/* 바로가기 화살표 (우하단) */}
              <span
                className="absolute text-text/70"
                style={{ bottom: '12px', right: '12px' }}
                aria-hidden
              >
                <svg width="32" height="14" viewBox="0 0 32 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" y1="7" x2="28" y2="7" />
                  <polyline points="22 2 30 7 22 12" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
