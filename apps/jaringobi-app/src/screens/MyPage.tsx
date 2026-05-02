import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fitSrc, TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { useUser } from '../lib/userState';

const MAX_NICK = 10;

export default function MyPage() {
  const u = useUser();
  const [editing, setEditing] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);
  const [titleModal, setTitleModal] = useState(false);

  function commitNick() {
    u.setNickname(nickDraft);
    setEditing(false);
  }

  const activeTitle = TITLES.find((t) => t.id === u.activeTitleId) ?? TITLES[0];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  async function handleShare() {
    const text = `자린고비 ${u.cycle}회차 ${u.day}일차\n` +
      `누적 절약: ${u.totalSaved.toLocaleString()}원 / 목표: ${u.goal.toLocaleString()}원\n` +
      `보유 코인: ${u.coins.toLocaleString()}P`;
    const data: ShareData = { title: '자린고비', text };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // 사용자가 공유를 취소했거나 실패 → 클립보드로 폴백
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert('내용이 클립보드에 복사됐어요');
        return;
      } catch {
        // ignore
      }
    }
    alert(text);
  }

  return (
    <main className="min-h-full pb-10">
      {/* 상단바 */}
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/main" />
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
          <button
            onClick={handleShare}
            aria-label="공유"
            className="w-7 h-7 grid place-items-center text-text/70 active:scale-[.95] transition"
          >
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
            {/* 캐릭터 + 장착 fit을 메인/상점과 동일한 캔버스 비율로 그려 어깨선까지 보이게 */}
            <img
              src="/jarin/main_character.png"
              alt={`${u.nickname} 캐릭터`}
              className="absolute left-1/2 -translate-x-1/2 top-0 h-[200%] w-auto max-w-none"
              draggable={false}
            />
            {u.equipped
              .filter((s) => s.startsWith('/shop/clothes/') || s.startsWith('/shop/acc/'))
              .map((s) => (
                <img
                  key={s}
                  src={fitSrc(s)}
                  alt=""
                  className="absolute left-1/2 -translate-x-1/2 top-0 h-[200%] w-auto max-w-none pointer-events-none"
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
              <Link to="/wardrobe" aria-label="옷장" className="p-1">
                <img
                  src="/jarin/wardrobe_icon.png"
                  alt="옷장"
                  className="w-7 h-7 object-contain"
                  draggable={false}
                />
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 라벨들 */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setTitleModal(true)}
            className="bg-primary/70 rounded-full px-3 py-1 text-[12px] font-bold text-text inline-flex items-center gap-1.5 active:scale-[.98]"
            aria-label="칭호 변경"
          >
            <span aria-hidden>🏅</span> {activeTitle.name}
          </button>
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

      {/* 칭호 변경 모달 */}
      {titleModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={() => setTitleModal(false)}
        >
          <div
            className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center font-bold text-[16px] text-text">칭호 선택</p>
            <p className="text-center text-[12px] text-text/55 mt-1">
              획득한 칭호 중 하나를 골라 프로필에 표시
            </p>
            <ul className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {TITLES.map((t) => {
                const active = t.id === u.activeTitleId;
                return (
                  <li key={t.id}>
                    <button
                      disabled={!t.got}
                      onClick={() => {
                        u.update({ activeTitleId: t.id });
                        setTitleModal(false);
                      }}
                      className={`w-full flex items-center gap-2 rounded-2xl px-4 py-2.5 text-left transition ${
                        active
                          ? 'bg-accent text-[#FFFFAD] font-bold'
                          : t.got
                            ? 'bg-white text-text active:scale-[.98]'
                            : 'bg-text/10 text-text/35 cursor-not-allowed'
                      }`}
                    >
                      <span aria-hidden>{t.got ? '🏅' : '🔒'}</span>
                      <span className="flex-1">{t.name}</span>
                      {active && <span className="text-[12px] font-bold">사용 중</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => setTitleModal(false)}
              className="mt-4 w-full bg-primary/70 text-text font-bold rounded-2xl py-3 active:scale-[.98]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
