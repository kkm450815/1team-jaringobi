import { Link, useSearchParams } from 'react-router-dom';
import { BackButton } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

// **키워드** 마커를 단순 텍스트로 변환 — 리스트 카드에서는 형광펜 미적용
function stripMarks(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];
const CAT_LABEL: Record<MissionCategory, string> = {
  식비: '식비절약',
  여가: '여가절약',
  충동: '충동차단',
  통장: '통장사수',
};

function isCategory(v: string | null): v is MissionCategory {
  return v === '식비' || v === '여가' || v === '충동' || v === '통장';
}

// 아이콘별 표시 사이즈 — 각 PNG가 내부 콘텐츠 크기·여백이 달라서 시각 사이즈 균일화 위해
// 빈 공간이 많은 아이콘은 더 크게(120 등), 꽉 찬 아이콘은 작게(80~88)로 매핑.
const ICON_SCALE: Record<string, string> = {
  cvs: 'w-[120px] h-[120px]',
  phone: 'w-[110px] h-[110px]',
  gifticon: 'w-[108px] h-[108px]',
  save: 'w-[100px] h-[100px]',
  leisure: 'w-[100px] h-[100px]',
  library: 'w-[96px] h-[96px]',
  shopping: 'w-[96px] h-[96px]',
  hair: 'w-[96px] h-[96px]',
  taxi: 'w-[96px] h-[96px]',
  dinner: 'w-[96px] h-[96px]',
  culture: 'w-[96px] h-[96px]',
  // default: 'w-[88px] h-[88px]' — coffee, friend, carrot, repair, alba, zero,
  // delivery, drink, receipe 등 이미 꽉 찬 아이콘들
};

export default function ChallengeList() {
  // 카테고리를 URL 쿼리에 보존 → 상세 뒤로가기 시 같은 카테고리로 복귀
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get('cat');
  const cat: MissionCategory = isCategory(rawCat) ? rawCat : '식비';
  const setCat = (c: MissionCategory) => setSearchParams({ cat: c }, { replace: true });
  // 난이도 쉬움 → 보통 → 어려움 순으로 정렬
  const DIFF_ORDER: Record<string, number> = { '쉬움': 0, '보통': 1, '어려움': 2 };
  const items = MISSIONS
    .filter((m) => m.category === cat)
    .slice()
    .sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 9) - (DIFF_ORDER[b.difficulty] ?? 9));

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

      {/* 챌린지 카드 리스트 — 모든 카드 동일 높이, 텍스트 영역 좁혀 줄바꿈 유도 */}
      <ul className="px-5 mt-4 pb-4 space-y-3">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              className="relative flex items-stretch h-[104px] rounded-[22px] bg-white shadow-soft active:scale-[.99] transition overflow-hidden"
            >
              <div className="w-[104px] grid place-items-center bg-[#ABBCA2] shrink-0 overflow-hidden">
                <img
                  src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`}
                  alt=""
                  className={`object-contain ${ICON_SCALE[m.iconKey] ?? 'w-[88px] h-[88px]'}`}
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
              </div>
              <div className="flex-1 min-w-0 pl-4 pr-3 py-3 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[16px] leading-snug text-text truncate break-keep">
                    {m.title}
                  </p>
                  <span className="bg-pink text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                    {m.difficulty}
                  </span>
                </div>
                <p className="text-[13px] text-text/75 leading-relaxed mt-1 line-clamp-2 break-keep pr-10">
                  {stripMarks(m.intro)}
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
