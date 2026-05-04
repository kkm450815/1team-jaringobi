import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../components/UI';
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
      <header className="relative pt-10 pb-4">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/main" />
        <div className="flex justify-center">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt="자린고비"
              className="w-[96px] h-[96px] object-contain"
              draggable={false}
            />
          </Link>
        </div>
      </header>

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

      {/* 챌린지 카드 리스트 — 좌측 olive 컨테이너 + 우측 흰 영역 (모서리 둥글게) */}
      <ul className="px-5 mt-4 pb-4 space-y-3">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              className="relative flex items-stretch rounded-[22px] bg-white shadow-soft active:scale-[.99] transition overflow-hidden"
            >
              <div className="w-[96px] grid place-items-center bg-[#ABBCA2] shrink-0">
                <img
                  src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`}
                  alt=""
                  className="w-[72px] h-[72px] object-contain scale-[1.4]"
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
              </div>
              <div className="flex-1 min-w-0 pl-4 pr-3 py-3 pb-7">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[16px] leading-snug text-text truncate break-keep">
                    {m.title}
                  </p>
                  <span className="bg-pink text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                    {m.difficulty}
                  </span>
                </div>
                <p className="text-[13px] text-text/75 leading-relaxed mt-1 line-clamp-2 break-keep">
                  {m.intro}
                </p>
              </div>
              <span className="absolute right-3 bottom-2 text-text/70" aria-hidden>
                <svg width="28" height="12" viewBox="0 0 32 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
