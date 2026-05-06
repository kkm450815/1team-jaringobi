import { Link } from 'react-router-dom';
import { TALK_ROOMS } from '../lib/data';
import { BackButton } from '../components/UI';
import { useBookmarks } from '../lib/useBookmarks';
import { useTalkPosts } from '../lib/useTalkPosts';
import { useUser } from '../lib/userState';
import { playClickSfx } from '../lib/feedback';

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

export default function Bookmarks() {
  const { has, toggle } = useBookmarks();
  const u = useUser();
  const { posts } = useTalkPosts();
  const items = posts.filter((p) => has(p.id));

  return (
    <main className="min-h-full pb-10">
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/talk" />
        <h1 className="text-center font-bold text-[18px] tracking-[4px]">북마크 보관함</h1>
      </header>

      {items.length === 0 ? (
        <div className="px-8 mt-16 text-center">
          <p className="text-[14px] text-text/60">아직 저장한 글이 없어요.</p>
          <p className="text-[12px] text-text/40 mt-1">수다방에서 마음에 드는 글에 북마크를 눌러보세요.</p>
        </div>
      ) : (
        <ul className="px-5 mt-3 space-y-5">
          {items.map((p) => {
            const room = TALK_ROOMS.find((r) => r.id === p.roomId);
            return (
              <li key={p.id} className="flex items-start gap-3">
                <Link
                  to={`/profile/${encodeURIComponent(p.nick)}`}
                  aria-label={`${p.nick} 프로필 보기`}
                  className="shrink-0"
                >
                  <img src={AVATAR} alt="" className="w-9 h-9 rounded-full bg-white object-contain" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${encodeURIComponent(p.nick)}`} className="text-[13px] font-bold text-text active:opacity-80">
                      {p.nick}
                    </Link>
                    {room && (
                      <Link
                        to={`/talk/${room.id}`}
                        className="text-[11px] font-bold text-text/80 px-2 py-0.5 rounded-full"
                        style={{ background: room.bg }}
                      >
                        #{room.title}
                      </Link>
                    )}
                  </div>
                  <p className="text-[13px] mt-1 leading-relaxed text-text/90 whitespace-pre-wrap">
                    {p.body}
                  </p>
                </div>
                <button
                  onClick={() => { toggle(p.id); if (u.settings.sound) playClickSfx(); }}
                  aria-label="북마크 해제"
                  className="p-1 -m-1 shrink-0"
                >
                  <BookmarkIcon filled />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
