import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fitSrc } from '../lib/data';
import { useUser } from '../lib/userState';

const MAX_NICK = 10;

export default function MyPage() {
  const u = useUser();
  const [editing, setEditing] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);

  function commitNick() {
    u.setNickname(nickDraft);
    setEditing(false);
  }

  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <main className="min-h-full pb-10">
      {/* 상단바 */}
      <header className="relative pt-10 pb-3">
        <Link
          to="/main"
          aria-label="뒤로"
          className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-[44px] leading-none text-text/80 font-bold"
        ><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 6 9 12 15 18" /></svg></Link>
        <div className="flex justify-center">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt="자린고비"
              className="w-[72px] h-[72px] object-contain"
              draggable={false}
            />
          </Link>
        </div>
        <Link
          to="/settings"
          aria-label="설정"
          className="absolute right-4 top-11 w-9 h-9 grid place-items-center text-text/80"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </header>

      {/* 노트 카드 */}
      <section className="mx-4 bg-grid-paper rounded-[18px] shadow-soft px-4 pt-3 pb-6 relative">
        {/* 노트 바인딩 구멍 */}
        <div className="absolute -top-2 left-0 right-0 flex justify-around px-6 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-full bg-text/20" />
          ))}
        </div>

        {/* 공유 */}
        <div className="flex justify-end pt-2">
          <button aria-label="공유" className="w-7 h-7 grid place-items-center text-text/70">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v12" />
              <path d="M7 9l5-5 5 5" />
              <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
            </svg>
          </button>
        </div>

        {/* 프로필 영역 */}
        <div className="grid grid-cols-[140px_1fr] gap-4 items-start mt-1">
          <div className="aspect-square bg-white rounded-2xl shadow-soft overflow-hidden relative">
            <img
              src="/jarin/main_character.png"
              alt={`${u.nickname} 캐릭터`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: '50% 12%' }}
              draggable={false}
            />
            {/* 옷장에서 장착한 옷·사치품 합성 (캔버스가 캐릭터와 동일 비율) */}
            {u.equipped
              .filter((s) => s.startsWith('/shop/clothes/') || s.startsWith('/shop/acc/'))
              .map((s) => (
                <img
                  key={s}
                  src={fitSrc(s)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: '50% 12%' }}
                  draggable={false}
                />
              ))}
          </div>
          <div>
            <p className="text-[14px] font-bold text-text">
              거지탈출 {u.day}일차
            </p>
            <div className="mt-2">
              {editing ? (
                <input
                  autoFocus
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value.slice(0, MAX_NICK))}
                  onBlur={commitNick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNick();
                    if (e.key === 'Escape') { setNickDraft(u.nickname); setEditing(false); }
                  }}
                  className="bg-primary/70 rounded-full px-4 py-1.5 text-[16px] font-bold text-text outline-none w-full max-w-[160px] text-center"
                />
              ) : (
                <button
                  onClick={() => { setNickDraft(u.nickname); setEditing(true); }}
                  className="bg-primary/70 rounded-full px-5 py-1.5 text-[16px] font-bold text-text active:scale-[.98]"
                  aria-label="닉네임 편집"
                >
                  {u.nickname}
                </button>
              )}
            </div>
            <p className="mt-3 text-[15px] font-bold text-text">
              {u.totalSaved.toLocaleString()}
              <span className="text-text/60"> / {u.goal.toLocaleString()}</span>
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Link to="/bookmarks" aria-label="북마크 보관함" className="p-1">
                <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden>
                  <path
                    d="M3 2 H19 A1 1 0 0 1 20 3 V24 L11 18 L2 24 V3 A1 1 0 0 1 3 2 Z"
                    fill="#E96B6E"
                  />
                </svg>
              </Link>
              <Link to="/shop" aria-label="상점" className="p-1">
                <span
                  className="inline-grid place-items-center w-7 h-7 rounded-full text-white text-[12px] font-black"
                  style={{ background: 'radial-gradient(circle at 35% 30%, #FFD56A 0%, #E8AB2A 70%)' }}
                >
                  ₩
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 라벨들 */}
        <div className="mt-3 flex items-center justify-between">
          <span className="bg-primary/70 rounded-full px-3 py-1 text-[12px] font-bold text-text inline-flex items-center gap-1.5">
            <span aria-hidden>🏅</span> 편의점 미식가
          </span>
          <span className="text-[14px] font-bold text-text">챌린지 {u.cycle}회차</span>
        </div>

        {/* RECORD */}
        <div className="mt-5">
          <h3 className="font-bold tracking-[3px] text-[15px] text-text">RECORD</h3>
          <ul className="mt-2 grid grid-cols-6 gap-x-2 gap-y-3">
            {days.map((d) => {
              const photo = u.photos[d];
              return (
                <li key={d} className="flex flex-col items-center">
                  <div
                    className={`w-full aspect-square rounded-md overflow-hidden ${
                      photo ? 'bg-white' : 'bg-text/65'
                    }`}
                  >
                    {photo && (
                      <img
                        src={photo}
                        alt={`${d}일차 인증`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="mt-1 text-[12px] font-bold text-text">{d}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
