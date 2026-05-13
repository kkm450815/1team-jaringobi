// 명예의 전당 — 절약 누적액 랭킹.
// profiles 테이블에서 상위 N명을 가져와 본인을 끼워 정렬. 로드 실패/빈 결과면
// 데모 시드 폴백. 시상대(1·2·3위) 와 4위 이하 목록을 분리.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { TitleIcon } from '../components/TitleIcon';
import { useUser } from '../lib/userState';
import { profilesRepo, PublicProfile } from '../lib/profilesRepo';

const AVATAR = '/jarin/main_mypage.png';
const RANK_COLORS = ['#F4C430', '#C0C0C0', '#CD7F32']; // 금/은/동

interface RankEntry {
  nick: string;
  totalSaved: number;
  titleId: string;
  cycle: number;
  isMe: boolean;
}

// DB 미설정·로드 실패·빈 결과 대비 폴백 시드 (5명) — 신규 사용자가 곧 추월할 수 있는 컷.
const FALLBACK_SEED: Omit<RankEntry, 'isMe'>[] = [
  { nick: '절약왕민지',  totalSaved: 850_000, titleId: 'h11', cycle: 4 },
  { nick: '짠돌이서준',  totalSaved: 420_000, titleId: 'h10', cycle: 3 },
  { nick: '알뜰이수아',  totalSaved: 220_000, titleId: 'h8',  cycle: 2 },
  { nick: '무지출지호',  totalSaved: 130_000, titleId: 'h6',  cycle: 1 },
  { nick: '신참자린이',  totalSaved: 40_000,  titleId: 'h1',  cycle: 1 },
];

function profileToEntry(p: PublicProfile): Omit<RankEntry, 'isMe'> {
  return {
    nick: p.nickname,
    totalSaved: p.totalSaved,
    titleId: p.activeTitleId,
    cycle: p.cycle,
  };
}

export default function Honor() {
  const u = useUser();
  const myRowRef = useRef<HTMLLIElement>(null);
  const [others, setOthers] = useState<Omit<RankEntry, 'isMe'>[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 부팅 시 1회 — DB 상위 50명 로드. 실패/빈 결과면 FALLBACK_SEED.
  useEffect(() => {
    let cancelled = false;
    profilesRepo.listTop(50)
      .then((list) => {
        if (cancelled) return;
        const filtered = list.filter((p) => p.nickname !== u.nickname);
        const entries = filtered.length > 0 ? filtered.map(profileToEntry) : FALLBACK_SEED;
        setOthers(entries);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setOthers(FALLBACK_SEED);
        setLoaded(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 본인을 끼워 totalSaved 내림차순 정렬
  const me: RankEntry = {
    nick: u.nickname,
    totalSaved: u.totalSaved,
    titleId: u.activeTitleId,
    cycle: u.cycle,
    isMe: true,
  };
  const merged: RankEntry[] = [
    ...others.map((e) => ({ ...e, isMe: false })),
    me,
  ].sort((a, b) => b.totalSaved - a.totalSaved);

  const myRank = merged.findIndex((r) => r.isMe) + 1;

  useEffect(() => {
    if (myRank > 3 && myRowRef.current) {
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
          <p className="text-[12px] text-text/60">
            절약 누적액 랭킹 · 내 순위 {myRank}위
            {!loaded && ' (불러오는 중…)'}
          </p>
        </div>
      </header>

      {/* 시상대 (1·2·3위) */}
      {merged.length >= 3 && (
        <div className="shrink-0 bg-bg px-5 pt-2 pb-3 shadow-[0_8px_12px_-8px_rgba(81,76,68,0.15)]">
          <div className="grid grid-cols-3 gap-2 items-stretch mt-2">
            {[1, 0, 2].map((idxInTop3) => {
              const r = merged[idxInTop3];
              const rank = idxInTop3 + 1;
              const title = TITLES.find((t) => t.id === r.titleId) ?? TITLES[0];
              const podiumH = rank === 1 ? 'h-[160px]' : 'h-[150px]';
              const bg = rank === 1 ? 'bg-[#FFF7DD]' : rank === 2 ? 'bg-[#F1F1F1]' : 'bg-[#F4E1CC]';
              const ring = rank === 1 ? 'ring-2 ring-[#F4C430]' : '';
              return (
                <Link
                  key={r.nick}
                  to={r.isMe ? '/mypage' : `/profile/${encodeURIComponent(r.nick)}`}
                  state={{ from: '/honor' }}
                  className={`relative flex flex-col items-center rounded-2xl shadow-soft px-2 pt-7 pb-3 ${bg} ${ring} ${podiumH} active:scale-[.98] transition`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="w-9 h-9 rounded-full grid place-items-center shadow" style={{ background: RANK_COLORS[rank - 1] }}>
                      <span className="text-[18px] font-black text-white drop-shadow">{rank}</span>
                    </div>
                  </div>
                  <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain shrink-0" />
                  <p className="mt-1.5 text-[12px] font-bold text-text truncate w-full text-center leading-tight">
                    {r.nick}{r.isMe && <span className="text-accent"> · 나</span>}
                  </p>
                  <div className="mt-1 flex items-center gap-1 justify-center min-w-0 w-full">
                    <TitleIcon src={title.img} size={14} alt={title.name} />
                    <span className="text-[10px] text-text/65 truncate">{title.name}</span>
                  </div>
                  <p className="mt-2 text-[12px] font-bold text-text leading-tight">{r.totalSaved.toLocaleString()}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 4위 이하 — 자체 스크롤. 본인 행에 ref */}
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
      </div>
    </main>
  );
}
