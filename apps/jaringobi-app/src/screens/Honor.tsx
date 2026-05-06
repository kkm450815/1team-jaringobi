// 명예의 전당 — 절약 누적액 랭킹 (시드 + 본인)
// 1·2·3위는 sticky 로 상단 고정, 4위 이하는 스크롤. 진입 시 본인 위치로 자동 스크롤.

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { TitleIcon } from '../components/TitleIcon';
import { useUser } from '../lib/userState';

const AVATAR = '/jarin/main_mypage.png';

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

export default function Honor() {
  const u = useUser();
  const myRowRef = useRef<HTMLLIElement>(null);

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

  const myRank = merged.findIndex((r) => r.isMe) + 1;

  // 진입 시 본인 위치로 부드럽게 스크롤 (4위 이하일 때만)
  useEffect(() => {
    if (myRank > 3 && myRowRef.current) {
      // 시상대 sticky 높이만큼 보정해 본인 행이 화면 중앙쯤 보이도록
      const t = setTimeout(() => {
        myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [myRank]);

  return (
    <main className="h-full flex flex-col overflow-hidden">
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
          <p className="text-[12px] text-text/60">절약 누적액 랭킹 · 내 순위 {myRank}위</p>
        </div>
      </header>

      {/* 시상대 (1·2·3위) — 상단 고정 (Flex layout 으로 본질적 고정). 4위 이하만 스크롤 */}
      {merged.length >= 3 && (
        <div className="shrink-0 bg-bg px-5 pt-2 pb-3 shadow-[0_8px_12px_-8px_rgba(81,76,68,0.15)]">
          <div className="grid grid-cols-3 gap-2 items-stretch mt-2">
            {[1, 0, 2].map((idxInTop3) => {
              const r = merged[idxInTop3];
              const rank = idxInTop3 + 1;
              const title = TITLES.find((t) => t.id === r.titleId) ?? TITLES[0];
              // 1위만 살짝 크고, 2·3위는 동일 높이로 통일 (콘텐츠 잘림 방지)
              const podiumH = rank === 1 ? 'h-[160px]' : 'h-[150px]';
              const bg = rank === 1 ? 'bg-[#FFF7DD]' : rank === 2 ? 'bg-[#F1F1F1]' : 'bg-[#F4E1CC]';
              const ring = rank === 1 ? 'ring-2 ring-[#F4C430]' : '';
              return (
                <Link
                  key={r.nick}
                  to={r.isMe ? '/mypage' : `/profile/${encodeURIComponent(r.nick)}`}
                  state={{ from: '/honor' }}
                  className={`relative flex flex-col items-center rounded-2xl shadow-soft px-2 pt-5 pb-2 ${bg} ${ring} ${podiumH} active:scale-[.98] transition overflow-hidden`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="w-9 h-9 rounded-full grid place-items-center shadow" style={{ background: RANK_COLORS[rank - 1] }}>
                      <span className="text-[18px] font-black text-white drop-shadow">{rank}</span>
                    </div>
                  </div>
                  <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain shrink-0" />
                  <p className="mt-1 text-[12px] font-bold text-text truncate w-full text-center leading-tight">
                    {r.nick}{r.isMe && <span className="text-accent"> · 나</span>}
                  </p>
                  <div className="mt-1 flex items-center gap-1 justify-center min-w-0 w-full">
                    <TitleIcon src={title.img} size={14} alt={title.name} />
                    <span className="text-[10px] text-text/65 truncate">{title.name}</span>
                  </div>
                  <p className="mt-auto text-[12px] font-bold text-text leading-tight">{r.totalSaved.toLocaleString()}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 4위 이하 — 자체 스크롤 영역. 본인 행에 ref 부여 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 mt-3 pb-6">
      <ul className="space-y-2">
        {merged.slice(3).map((r, i) => {
          const rank = i + 4;
          const title = TITLES.find((t) => t.id === r.titleId) ?? TITLES[0];
          return (
            <li key={`${r.nick}-${rank}`} ref={r.isMe ? myRowRef : undefined}>
              <Link
                to={r.isMe ? '/mypage' : `/profile/${encodeURIComponent(r.nick)}`}
                state={{ from: '/honor' }}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 shadow-soft active:scale-[.99] transition ${
                  r.isMe ? 'bg-accent/15 ring-2 ring-accent/40' : 'bg-white'
                }`}
              >
                <div className="w-9 grid place-items-center shrink-0">
                  <span className="text-[15px] font-bold text-text/55">{rank}</span>
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

      <p className="mt-6 text-center text-[11px] text-text/45 leading-relaxed">
        * 백엔드 연동 전까지 노출되는 데모 랭킹입니다.<br />
        실시간 사용자 절약액은 추후 적용될 예정.
      </p>
      </div>
    </main>
  );
}
