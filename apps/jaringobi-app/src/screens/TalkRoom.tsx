import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TALK_ROOMS } from '../lib/data';
import { BackButton } from '../components/UI';
import { useBookmarks } from '../lib/useBookmarks';
import { useTalkPosts } from '../lib/useTalkPosts';
import { useUser } from '../lib/userState';
import { newId } from '../lib/ids';
import { playClickSfx, playSuccessSfx, playDeniedSfx } from '../lib/feedback';

const AVATAR = '/jarin/main_mypage.png';
// DB 제약(body_len: 1..500) 과 동일하게 클라이언트에서도 막아 사용자가
// 알지 못한 채 insert 실패 토스트 받는 일 방지
const MAX_BODY_LEN = 500;

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
  const room = TALK_ROOMS.find((r) => r.id === id) ?? TALK_ROOMS[0];

  const { posts, addPost } = useTalkPosts(room.id);
  const [input, setInput] = useState('');
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

  async function send() {
    if (inFlight.current) return;
    const body = input.trim();
    if (!body) return;
    const nick = (u.nickname ?? '').trim() || '익명';

    inFlight.current = true;
    setSending(true);
    // 입력은 즉시 비워줌 (사용자 체감 반응성)
    setInput('');

    const post = { id: newId(), roomId: room.id, nick, body };
    const saved = await addPost(post, (err) => {
      const msg =
        (err as { message?: string } | null)?.message ??
        '글을 올리지 못했어요. 잠시 후 다시 시도해 주세요.';
      console.error('[TalkRoom.send] addPost 에러', err);
      showToast(`작성 실패: ${msg}`);
      // 실패 시 입력 복원
      setInput(body);
      playDeniedSfx();
    });
    inFlight.current = false;
    setSending(false);
    if (saved) playSuccessSfx();
  }

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

        {/* 입력 영역 — form 으로 감싸서 모바일 키보드 "전송" 키도 동작 */}
        <section className="px-5 pt-4">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-start gap-3"
          >
            <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-text">{u.nickname || '익명'}</p>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_BODY_LEN))}
                maxLength={MAX_BODY_LEN}
                placeholder="하고 싶은 말이 있나요?"
                className="mt-1.5 w-full resize-none bg-transparent outline-none text-[15px] text-text placeholder:text-text/40"
              />
              {input.length > 0 && (
                <p
                  className={`mt-0.5 text-[11px] text-right ${
                    input.length >= MAX_BODY_LEN ? 'text-pink font-bold' : 'text-text/45'
                  }`}
                  aria-live="polite"
                >
                  {input.length} / {MAX_BODY_LEN}
                </p>
              )}
            </div>
            {input.trim() && (
              <button
                type="submit"
                disabled={sending}
                className="text-accent text-[14px] font-bold whitespace-nowrap pt-1 disabled:opacity-50"
              >
                {sending ? '올리는 중…' : '올리기'}
              </button>
            )}
          </form>
        </section>

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
