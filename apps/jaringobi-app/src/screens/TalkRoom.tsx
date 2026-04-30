import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ME_NICK, TALK_POSTS, TALK_ROOMS, TalkPost } from '../lib/data';
import { useBookmarks } from '../lib/useBookmarks';

const AVATAR = '/jarin/main_mypage.png';

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
  const seed = useMemo(() => TALK_POSTS.filter((p) => p.roomId === room.id), [room.id]);

  const [posts, setPosts] = useState<TalkPost[]>(seed);
  const [input, setInput] = useState('');
  const { has, toggle } = useBookmarks();

  function send() {
    const body = input.trim();
    if (!body) return;
    setPosts((p) => [
      { id: crypto.randomUUID(), roomId: room.id, nick: ME_NICK, body },
      ...p,
    ]);
    setInput('');
  }

  return (
    <main className="min-h-full pb-10">
      {/* 상단 고정 영역: 헤더 + 입력 + 구분선 */}
      <div className="sticky top-0 z-10 bg-bg">
        <header className="relative pt-10 pb-4">
          <Link
            to="/talk"
            aria-label="뒤로"
            className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-[48px] leading-none text-text/80"
          >
            ‹
          </Link>
          <div className="flex justify-center">
            <img
              src="/jarin/logo_nobg.png"
              alt={room.title}
              className="w-[96px] h-[96px] object-contain"
              draggable={false}
            />
          </div>
          <Link
            to="/bookmarks"
            aria-label="북마크 보관함"
            className="absolute right-4 top-10 p-1"
          >
            <BookmarkIcon filled size={34} />
          </Link>
        </header>

        {/* 입력 영역 */}
        <section className="px-5 pt-4">
          <div className="flex items-start gap-3">
            <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-bold text-text">{ME_NICK}</p>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="하고 싶은 말이 있나요?"
                className="mt-1.5 w-full resize-none bg-transparent outline-none text-[15px] text-text placeholder:text-text/40"
              />
            </div>
            {input.trim() && (
              <button
                onClick={send}
                className="text-accent text-[14px] font-bold whitespace-nowrap pt-1"
              >
                올리기
              </button>
            )}
          </div>
        </section>

        <hr className="mx-5 mt-4 border-t border-text/20" />
      </div>

      {/* 게시물 리스트 (스크롤 대상) */}
      <ul className="px-5 mt-6 space-y-8">
        {posts.map((p) => {
          const marked = has(p.id);
          return (
            <li key={p.id} className="flex items-start gap-3">
              <img src={AVATAR} alt="" className="w-11 h-11 rounded-full bg-white object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text">{p.nick}</p>
                <p className="text-[15px] mt-1.5 leading-relaxed text-text/90 whitespace-pre-wrap">
                  {p.body}
                </p>
              </div>
              <button
                onClick={() => toggle(p.id)}
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
    </main>
  );
}
