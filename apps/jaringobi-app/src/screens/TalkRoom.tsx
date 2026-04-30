import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ME_NICK, TALK_POSTS, TALK_ROOMS, TalkPost } from '../lib/data';
import { useBookmarks } from '../lib/useBookmarks';

const AVATAR = '/jarin/main_mypage.png';

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden>
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
      {/* 상단바 */}
      <header className="relative pt-8 pb-2">
        <Link
          to="/talk"
          aria-label="뒤로"
          className="absolute left-4 top-8 text-[26px] leading-none text-text/80 px-2"
        >
          ‹
        </Link>
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-[2px] h-5 bg-[#8a6b3a]/60" />
            <img
              src="/jarin/logo_nobg.png"
              alt={room.title}
              className="w-[80px] h-[80px] object-contain -mt-2"
              draggable={false}
            />
          </div>
        </div>
        <Link
          to="/bookmarks"
          aria-label="북마크 보관함"
          className="absolute right-4 top-8 p-1"
        >
          <BookmarkIcon filled />
        </Link>
      </header>

      {/* 입력 영역 */}
      <section className="px-5 pt-3">
        <div className="flex items-start gap-3">
          <img src={AVATAR} alt="" className="w-9 h-9 rounded-full bg-white object-contain shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-text">{ME_NICK}</p>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="하고 싶은 말이 있나요?"
              className="mt-1 w-full resize-none bg-transparent outline-none text-[13px] text-text placeholder:text-text/40"
            />
          </div>
          {input.trim() && (
            <button
              onClick={send}
              className="text-accent text-[13px] font-bold whitespace-nowrap pt-1"
            >
              올리기
            </button>
          )}
        </div>
      </section>

      <hr className="mx-5 mt-3 border-t border-text/20" />

      {/* 게시물 리스트 */}
      <ul className="px-5 mt-3 space-y-5">
        {posts.map((p) => {
          const marked = has(p.id);
          return (
            <li key={p.id} className="flex items-start gap-3">
              <img src={AVATAR} alt="" className="w-9 h-9 rounded-full bg-white object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-text">{p.nick}</p>
                <p className="text-[13px] mt-1 leading-relaxed text-text/90 whitespace-pre-wrap">
                  {p.body}
                </p>
              </div>
              <button
                onClick={() => toggle(p.id)}
                aria-label={marked ? '북마크 해제' : '북마크'}
                aria-pressed={marked}
                className="p-1 -m-1 shrink-0"
              >
                <BookmarkIcon filled={marked} />
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
