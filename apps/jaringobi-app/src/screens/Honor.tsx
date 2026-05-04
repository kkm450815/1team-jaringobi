// 명예의 전당 — 절약 누적액 랭킹 (시드 + 본인)
// /talk 페이지 우상단 트로피 아이콘 → 이동

import { Link } from 'react-router-dom';
import { TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { TitleIcon } from '../components/TitleIcon';
import { useUser } from '../lib/userState';

const AVATAR = '/jarin/main_mypage.png';

// 시드 사용자 — 실제 백엔드 붙이기 전까지 노출되는 데모 데이터.
// (Supabase 연동 시 profiles 테이블 + saved 컬럼 기반으로 교체)
const SEED: { nick: string; totalSaved: number; titleId: string; cycle: number }[] = [
  { nick: '자린이 7호',   totalSaved: 5_280_000, titleId: 'h11', cycle: 12 },
  { nick: '자린이 12호',  totalSaved: 3_950_000, titleId: 'h10', cycle: 9 },
  { nick: '자린이 88호',  totalSaved: 2_870_000, titleId: 'h9',  cycle: 7 },
  { nick: '자린이 33호',  totalSaved: 1_640_000, titleId: 'h8',  cycle: 5 },
  { nick: '자린이 47호',  totalSaved: 980_000,   titleId: 'h7',  cycle: 4 },
  { nick: '자린이 2호',   totalSaved: 720_000,   titleId: 'h6',  cycle: 3 },
  { nick: '자린이 103호', totalSaved: 480_000,   titleId: 'h3',  cycle: 2 },
  { nick: '자린이 56호',  totalSaved: 320_000,   titleId: 'h2',  cycle: 2 },
  { nick: '자린이 21호',  totalSaved: 180_000,   titleId: 'h1',  cycle: 1 },
  { nick: '자린이 9호',   totalSaved: 90_000,    titleId: 'h0',  cycle: 1 },
];

const RANK_COLORS = ['#F4C430', '#C0C0C0', '#CD7F32']; // 금/은/동

function CrownIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="18" viewBox="0 0 24 20" aria-hidden>
      <path
        d="M2 6 L7 11 L12 3 L17 11 L22 6 L20 17 H4 Z"
        fill={color}
        stroke="#3D3833"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Honor() {
  const u = useUser();

  // 본인을 시드 옆에 끼워넣고 totalSaved 내림차순 정렬
  const me = {
    nick: u.nickname,
    totalSaved: u.totalSaved,
    titleId: u.activeTitleId,
    cycle: u.cycle,
    isMe: true as const,
  };
  const merged = [
    ...SEED.map((s) => ({ ...s, isMe: false as const })),
    me,
  ].sort((a, b) => b.totalSaved - a.totalSaved);

  return (
    <main className="min-h-full pb-10">
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/talk" />
        <div className="flex flex-col items-center gap-2">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt="자린고비"
              className="w-[72px] h-[72px] object-contain"
              draggable={false}
            />
          </Link>
          <h1 className="font-bold text-[18px] tracking-[3px] text-text inline-flex items-center gap-2">
            <span aria-hidden>🏆</span> 명예의 전당
          </h1>
          <p className="text-[12px] text-text/60">절약 누적액 랭킹</p>
        </div>
      </header>

      <ul className="px-5 mt-4 space-y-2">
        {merged.map((r, i) => {
          const rank = i + 1;
          const title = TITLES.find((t) => t.id === r.titleId) ?? TITLES[0];
          const isTop3 = rank <= 3;
          return (
            <li key={`${r.nick}-${i}`}>
              <Link
                to={r.isMe ? '/mypage' : `/profile/${encodeURIComponent(r.nick)}`}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 shadow-soft active:scale-[.99] transition ${
                  r.isMe ? 'bg-accent/15 ring-2 ring-accent/40' : 'bg-white'
                }`}
              >
                <div className="w-9 grid place-items-center shrink-0">
                  {isTop3 ? (
                    <CrownIcon color={RANK_COLORS[rank - 1]} />
                  ) : (
                    <span className="text-[15px] font-bold text-text/55">{rank}</span>
                  )}
                </div>
                <img src={AVATAR} alt="" className="w-10 h-10 rounded-full bg-white object-contain shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-bold text-text truncate">{r.nick}</p>
                    {r.isMe && (
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full shrink-0">나</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <TitleIcon src={title.img} size={16} alt={title.name} />
                    <span className="text-[11px] text-text/65 truncate">{title.name}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-text">{r.totalSaved.toLocaleString()}</p>
                  <p className="text-[11px] text-text/55">{r.cycle}회차</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="px-5 mt-6 text-center text-[11px] text-text/45 leading-relaxed">
        * 백엔드 연동 전까지 노출되는 데모 랭킹입니다.<br />
        실시간 사용자 절약액은 추후 적용될 예정.
      </p>
    </main>
  );
}
