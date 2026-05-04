import { Link } from 'react-router-dom';
import { TALK_ROOMS } from '../lib/data';
import { BackButton } from '../components/UI';

export default function TalkList() {
  return (
    <main className="min-h-full flex flex-col">
      <header className="relative pt-10 pb-4">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/main" />
        <div className="flex justify-center">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt=""
              className="w-[96px] h-[96px] object-contain"
              draggable={false}
            />
          </Link>
        </div>
        <Link
          to="/honor"
          aria-label="명예의 전당"
          className="absolute right-4 top-11 w-10 h-10 grid place-items-center rounded-full bg-white shadow-soft active:scale-[.95] transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#F4C430" stroke="#3D3833" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
            <path d="M6 4h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
            <path d="M3 5h3v3a3 3 0 0 0 3 3" fill="none" />
            <path d="M21 5h-3v3a3 3 0 0 1-3 3" fill="none" />
            <path d="M9 16h6v3H9z" />
            <path d="M7 19h10v2H7z" />
          </svg>
        </Link>
      </header>

      <ul className="px-5 pb-4 space-y-3">
        {TALK_ROOMS.map((r) => (
          <li key={r.id}>
            <Link
              to={`/talk/${r.id}`}
              aria-label={`${r.title} 수다방 입장`}
              className="relative block rounded-[22px] px-4 py-3 shadow-soft active:scale-[.99] transition"
              style={{ background: r.bg }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={r.icon}
                  alt={`${r.title} 아이콘`}
                  className="w-[88px] h-[88px] ml-3 object-contain shrink-0 scale-[1.4]"
                  draggable={false}
                />
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                  <p className="font-bold text-[20px] leading-snug text-text text-center">
                    {r.title}
                  </p>
                  <p className="font-bold text-[18px] leading-snug text-text/80 mt-0.5">
                    수다방
                  </p>
                </div>
              </div>
              <p className="absolute right-4 bottom-2 text-[15px] text-text/70 font-medium">
                바로가기 <span aria-hidden>⟶</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>

    </main>
  );
}
