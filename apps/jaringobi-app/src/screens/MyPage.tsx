import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fitSrc, getTitleProgress, Title, TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { TitleIcon } from '../components/TitleIcon';
import { useUser } from '../lib/userState';
import { useEscape } from '../lib/useEscape';

const MAX_NICK = 10;

export default function MyPage() {
  const u = useUser();
  const [editing, setEditing] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [titleModal, setTitleModal] = useState(false);
  const [detailTitleId, setDetailTitleId] = useState<string | null>(null);

  function commitNick() {
    if (!nickDraft.trim()) {
      setNickError('닉네임은 비울 수 없어요');
      setNickDraft(u.nickname);
      setEditing(false);
      setTimeout(() => setNickError(null), 2500);
      return;
    }
    u.setNickname(nickDraft);
    setEditing(false);
  }

  const activeTitle = TITLES.find((t) => t.id === u.activeTitleId) ?? TITLES[0];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  function closeTitleModal() {
    setTitleModal(false);
    setDetailTitleId(null);
  }
  useEscape(titleModal, () => {
    if (detailTitleId !== null) setDetailTitleId(null);
    else closeTitleModal();
  });

  const titleCtx = {
    missionWinDays: u.missionWinDays,
    totalSaveCount: u.totalSaveCount,
    cycle: u.cycle,
  };
  const detailTitle = detailTitleId
    ? TITLES.find((t) => t.id === detailTitleId) ?? null
    : null;

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
              {nickError && (
                <p className="mt-1 text-[11px] text-pink font-bold" role="alert">
                  ⚠ {nickError}
                </p>
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
            <span aria-hidden>{u.ownedTitles.includes(u.activeTitleId) ? '🏅' : '🔒'}</span>
            {u.ownedTitles.includes(u.activeTitleId) ? activeTitle.name : '칭호 미획득'}
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

      {/* 칭호 모달 — 그리드 / 상세 두 화면 */}
      {titleModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-5"
          onClick={closeTitleModal}
        >
          {detailTitle ? (
            <TitleDetail
              title={detailTitle}
              owned={u.ownedTitles.includes(detailTitle.id)}
              active={u.activeTitleId === detailTitle.id}
              ctx={titleCtx}
              onActivate={() => {
                u.update({ activeTitleId: detailTitle.id });
                setDetailTitleId(null);
              }}
              onBackToGrid={() => setDetailTitleId(null)}
              onClose={closeTitleModal}
            />
          ) : (
            <TitleGrid
              activeTitleId={u.activeTitleId}
              ownedIds={u.ownedTitles}
              onPick={(id) => setDetailTitleId(id)}
              onClose={closeTitleModal}
            />
          )}
        </div>
      )}
    </main>
  );
}

/* ---------- 획득 칭호 그리드 ---------- */
function TitleGrid({
  activeTitleId, ownedIds, onPick, onClose,
}: {
  activeTitleId: string;
  ownedIds: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <p className="text-center font-bold text-[16px] text-text">획득 칭호</p>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-0 top-0 text-text/60 text-[18px] leading-none w-6 h-6 grid place-items-center"
        >
          ×
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4">
        {TITLES.map((t) => {
          const owned = ownedIds.includes(t.id);
          const active = t.id === activeTitleId;
          return (
            <li key={t.id} className="flex flex-col items-center">
              <button
                onClick={() => onPick(t.id)}
                className="relative w-[78px] h-[78px] grid place-items-center rounded-2xl bg-white shadow-soft active:scale-[.98] transition"
                aria-label={`${t.name} ${owned ? '획득' : '미획득'}`}
              >
                {active && (
                  <span className="absolute -top-1.5 -left-1.5 bg-pink text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
                    사용 중
                  </span>
                )}
                <TitleIcon iconKey={t.iconKey} size={50} locked={!owned} />
                {!owned && (
                  <span className="absolute right-1.5 bottom-1.5 text-text/55" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                )}
              </button>
              <span className={`mt-1.5 text-[12px] font-bold text-center ${owned ? 'text-text' : 'text-text/45'}`}>
                {t.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- 칭호 상세 ---------- */
function TitleDetail({
  title, owned, active, ctx, onActivate, onBackToGrid, onClose,
}: {
  title: Title;
  owned: boolean;
  active: boolean;
  ctx: { missionWinDays: Record<string, string[]>; totalSaveCount: number; cycle: number };
  onActivate: () => void;
  onBackToGrid: () => void;
  onClose: () => void;
}) {
  const [lockAlert, setLockAlert] = useState(false);
  const prog = getTitleProgress(title, ctx);
  const totalCur = prog.entries.reduce((s, e) => s + e.cur, 0);
  const totalMax = prog.entries.reduce((s, e) => s + e.max, 0);
  // reqs가 비어있는 기본 칭호(초보 절약가 등)는 항상 100%
  const ratio = prog.entries.length === 0
    ? 1
    : totalMax > 0 ? Math.min(1, totalCur / totalMax) : 0;

  return (
    <div
      className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <p className="text-center font-bold text-[16px] text-text">칭호</p>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-0 top-0 text-text/60 text-[18px] leading-none w-6 h-6 grid place-items-center"
        >
          ×
        </button>
      </div>

      {/* 아이콘 + 이름 + 진행도 */}
      <div className="mt-3 flex items-center gap-3">
        <div className="w-[64px] h-[64px] grid place-items-center rounded-2xl bg-white shadow-soft shrink-0">
          <TitleIcon iconKey={title.iconKey} size={44} locked={!owned} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-text">{title.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[11px] font-bold text-text/55 shrink-0">진행도</span>
            <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width]"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-text/70 shrink-0">{totalCur} / {totalMax}</span>
          </div>
        </div>
      </div>

      {/* 한 줄 설명 */}
      <p className="mt-4 text-center text-[14px] font-bold text-text">{title.tagline}</p>

      {/* 노트 카드 — 획득 방법 + tip */}
      <div className="mt-4 bg-grid-paper rounded-2xl px-4 py-4 shadow-soft">
        <p className="text-[13px] font-bold text-text">획득 방법</p>
        {prog.entries.length === 0 ? (
          <p className="mt-1.5 text-[12px] text-text/80 leading-relaxed">기본 보유 칭호</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {prog.entries.map((e, i) => (
              <li key={i} className="text-[12px] text-text/80 leading-relaxed flex items-start gap-1.5">
                <span className={`shrink-0 ${e.met ? 'text-accent' : 'text-text/40'}`}>{e.met ? '✓' : '·'}</span>
                <span>{e.label} <span className="text-text/55">({e.cur}/{e.max})</span></span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13px] font-bold text-text">tip!</p>
        <p className="mt-1 text-[12px] text-text/80 leading-relaxed">{title.tip}</p>
      </div>

      {/* 하단 버튼 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {owned ? (
          <button
            onClick={onActivate}
            disabled={active}
            className={`rounded-full py-3 text-[14px] font-bold transition ${
              active
                ? 'bg-accent/40 text-text/60 cursor-not-allowed'
                : 'bg-accent text-[#FFFFAD] active:scale-[.98]'
            }`}
          >
            {active ? '사용 중' : '칭호 획득'}
          </button>
        ) : (
          <button
            onClick={() => setLockAlert(true)}
            className="rounded-full py-3 text-[14px] font-bold bg-text/15 text-text/55 active:scale-[.98]"
          >
            칭호 미획득
          </button>
        )}
        <button
          onClick={onBackToGrid}
          className="rounded-full py-3 text-[14px] font-bold bg-accent text-[#FFFFAD] active:scale-[.98]"
        >
          칭호 변경
        </button>
      </div>

      {/* 잠긴 칭호 클릭 시 안내 */}
      {lockAlert && (
        <div
          className="fixed inset-0 z-[60] bg-black/45 grid place-items-center px-7"
          onClick={() => setLockAlert(false)}
        >
          <div
            className="w-full max-w-[300px] bg-bg rounded-3xl p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-bold text-text">아직 획득하지 못한 칭호입니다</p>
            <p className="mt-2 text-[12px] text-text/65 leading-relaxed">
              아래 획득 방법을 모두 만족하면<br />
              자동으로 칭호를 받을 수 있어요.
            </p>
            <button
              onClick={() => setLockAlert(false)}
              className="mt-4 w-full bg-accent text-white font-bold rounded-2xl py-3 text-[14px] active:scale-[.98]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
