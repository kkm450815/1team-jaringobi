import { memo, useCallback, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackButton } from '../components/UI';
import { useBookmarks } from '../lib/useBookmarks';
import { useTalkPosts } from '../lib/useTalkPosts';
import { useTalkRooms } from '../lib/useTalkRooms';
import { useUser } from '../lib/userState';
import { newId } from '../lib/ids';
import { playClickSfx, playSuccessSfx, playDeniedSfx } from '../lib/feedback';

const AVATAR = '/jarin/main_mypage.png';
// DB 제약(body_len: 1..500) 과 동일하게 클라이언트에서도 막아 사용자가
// 알지 못한 채 insert 실패 토스트 받는 일 방지
const MAX_BODY_LEN = 500;

/**
 * 입력창 — **비제어(uncontrolled)** ref 기반.
 *
 * 안드로이드 WebView 에서 타이핑이 느린 원인은 키 입력마다 React state 가 갱신되며
 * 컴포넌트가 재렌더되기 때문. value 를 React 가 관리하지 않으면 키 입력은 순수 브라우저
 * 네이티브 속도로 동작.
 *
 * - value/onChange 제거 → textarea 가 DOM 자체 상태로만 동작
 * - maxLength HTML 속성으로 길이 제한 (DB 제약과 동일)
 * - 제출/취소 시 ref.value 직접 읽고 비움
 * - 글자 카운트 표시는 키 입력 100ms 디바운스로 가끔만 갱신 (타이핑 방해 X)
 */
const TalkInput = memo(function TalkInput({
  nickname, sending, onSubmit,
}: { nickname: string; sending: boolean; onSubmit: (body: string) => void | Promise<void> }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // 카운트는 가끔만 갱신 (디바운스) — 매 키 입력 setState 막아 타이핑 지연 차단
  const [count, setCount] = useState(0);
  const countTimer = useRef<number | null>(null);
  function scheduleCountUpdate() {
    if (countTimer.current !== null) window.clearTimeout(countTimer.current);
    countTimer.current = window.setTimeout(() => {
      setCount(ref.current?.value.length ?? 0);
      countTimer.current = null;
    }, 120);
  }
  async function doSend() {
    const ta = ref.current;
    if (!ta) return;
    const body = ta.value.trim();
    if (!body) return;
    ta.value = '';
    setCount(0);
    await onSubmit(body);
  }
  return (
    <section className="px-5 pt-4">
      <form onSubmit={(e) => { e.preventDefault(); doSend(); }} className="flex items-start gap-3">
        <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-text">{nickname}</p>
          <textarea
            ref={ref}
            rows={1}
            defaultValue=""
            maxLength={MAX_BODY_LEN}
            placeholder="하고 싶은 말을 입력하세요"
            onInput={scheduleCountUpdate}
            onKeyDown={(e) => {
              const composing =
                (e.nativeEvent as KeyboardEvent).isComposing ||
                (e.nativeEvent as KeyboardEvent).keyCode === 229;
              if (e.key === 'Enter' && !e.shiftKey && !composing) {
                e.preventDefault();
                if ((ref.current?.value ?? '').trim()) doSend();
              }
            }}
            className="mt-1.5 w-full resize-none bg-transparent outline-none text-[15px] text-text placeholder:text-text/40"
          />
          {count > 0 && (
            <p
              className={`mt-0.5 text-[11px] text-right ${
                count >= MAX_BODY_LEN ? 'text-pink font-bold' : 'text-text/45'
              }`}
              aria-live="polite"
            >
              {count} / {MAX_BODY_LEN}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={sending || count === 0}
          className="text-accent text-[14px] font-bold whitespace-nowrap pt-1 disabled:opacity-30"
        >
          {sending ? '올리는 중…' : '올리기'}
        </button>
      </form>
    </section>
  );
});

function BookmarkIcon({ filled, size = 26 }: { filled: boolean; size?: number }) {
  const w = size;
  const h = Math.round((size * 30) / 22);
  return (
    <svg width={w} height={h} viewBox="0 0 22 26" aria-hidden>
      <path
        d="M3 2 H19 A1 1 0 0 1 20 3 V24 L11 18 L2 24 V3 A1 1 0 0 1 3 2 Z"
        fill={filled ? '#E96B6E' : 'none'}
        stroke={filled ? '#E96B6E' : '#514C44'}
        strokeOpacity={filled ? 1 : 0.55}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TalkRoom() {
  const { id } = useParams();
  const { rooms } = useTalkRooms();
  // rooms 가 null(로딩)이면 우선 fallback room 으로 렌더 — useTalkPosts 가 hook
  // 순서를 깨뜨리지 않도록 항상 호출.
  const room = (rooms ?? []).find((r) => r.id === id) ?? {
    id: id ?? '',
    title: '수다방',
    icon: '',
    bg: '#EEEEEE',
    sortOrder: 0,
  };

  const { posts, addPost } = useTalkPosts(room.id);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // 모바일 Safari/Chrome 에서 같은 탭에 onClick 과 form submit 이 동시에 들어오는 경우
  // 중복 insert 가 일어나지 않도록 가드
  const inFlight = useRef(false);
  const { has, toggle } = useBookmarks();
  const u = useUser();

  function showToast(msg: string, ms = 2800) {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }

  // 키 입력마다 부모를 리렌더하면 posts 리스트가 같이 재렌더돼 안드로이드 WebView 가
  // 버벅임 → 입력은 TalkInput 내부 state 로만 유지하고, 제출 시점에만 부모 호출.
  const sendRef = useRef<(body: string) => Promise<void>>();
  sendRef.current = async (body: string) => {
    if (inFlight.current) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    const nick = (u.nickname ?? '').trim() || '익명';
    inFlight.current = true;
    setSending(true);
    const post = { id: newId(), roomId: room.id, nick, body: trimmed };
    const saved = await addPost(post, (err) => {
      const msg =
        (err as { message?: string } | null)?.message ??
        '글을 올리지 못했어요. 잠시 후 다시 시도해 주세요.';
      console.error('[TalkRoom.send] addPost 에러', err);
      showToast(`작성 실패: ${msg}`);
      playDeniedSfx();
    });
    inFlight.current = false;
    setSending(false);
    if (saved) playSuccessSfx();
  };
  const handleSend = useCallback(
    async (body: string) => { await sendRef.current?.(body); },
    [],
  );

  return (
    <main className="min-h-full pb-10">
      {/* 상단 고정 영역: 헤더 + 입력 + 구분선 */}
      <div className="sticky top-0 z-10 bg-bg">
        <header className="relative pt-10 pb-3">
          <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/talk" />
          <div className="flex flex-col items-center gap-2">
            <Link to="/main" aria-label="홈으로">
              <img
                src="/jarin/logo_nobg.png"
                alt={room.title}
                className="w-[72px] h-[72px] object-contain"
                draggable={false}
              />
            </Link>
            <span
              className="px-3 py-1 rounded-full text-[14px] font-bold text-text"
              style={{ background: room.bg }}
            >
              # {room.title}
            </span>
          </div>
          <Link
            to="/bookmarks"
            aria-label="북마크 보관함"
            className="absolute right-4 top-10 p-1"
          >
            <BookmarkIcon filled size={34} />
          </Link>
        </header>

        {/* 입력 영역 — 부모 리렌더 영향 차단을 위해 TalkInput 으로 분리 */}
        <TalkInput nickname={u.nickname || '익명'} sending={sending} onSubmit={handleSend} />

        <hr className="mx-5 mt-4 border-t border-text/20" />
      </div>

      {/* 게시물 리스트 (스크롤 대상) */}
      {posts.length === 0 && (
        <div className="px-5 mt-16 text-center">
          <p className="text-[14px] font-bold text-text/55">아직 글이 없어요</p>
          <p className="mt-2 text-[12px] text-text/40 leading-relaxed">
            첫 번째로 마음을 나눠 보세요.
          </p>
        </div>
      )}
      <ul className="px-5 mt-6 space-y-8">
        {posts.map((p) => {
          const marked = has(p.id);
          return (
            <li key={p.id} className="flex items-start gap-3">
              <Link
                to={`/profile/${encodeURIComponent(p.nick)}`}
                aria-label={`${p.nick} 프로필 보기`}
                className="shrink-0"
              >
                <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${encodeURIComponent(p.nick)}`} className="text-[15px] font-bold text-text active:opacity-80">
                  {p.nick}
                </Link>
                <p className="text-[15px] mt-1.5 leading-relaxed text-text/90 whitespace-pre-wrap">
                  {p.body}
                </p>
              </div>
              <button
                onClick={() => { toggle(p.id); playClickSfx(); }}
                aria-label={marked ? '북마크 해제' : '북마크'}
                aria-pressed={marked}
                className="p-1 -m-1 shrink-0"
              >
                <BookmarkIcon filled={marked} size={26} />
              </button>
            </li>
          );
        })}
      </ul>

      {toast && (
        <div
          role="alert"
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-[88%] bg-text/90 text-white text-[13px] font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-pre-line text-center"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
