import { Link } from 'react-router-dom';
import { TALK_ROOMS } from '../lib/data';

export default function TalkList() {
  return (
    <main className="min-h-full flex flex-col">
      <header className="relative pt-10 pb-4">
        <Link
          to="/main"
          aria-label="뒤로"
          className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-[44px] leading-none text-text/80 font-bold"
        >
          ‹
        </Link>
        <div className="flex justify-center">
          <img
            src="/jarin/logo_nobg.png"
            alt=""
            className="w-[96px] h-[96px] object-contain"
            draggable={false}
          />
        </div>
      </header>

      <ul className="px-5 pb-4 space-y-3">
        {TALK_ROOMS.map((r) => (
          <li key={r.id}>
            <Link
              to={`/talk/${r.id}`}
              className="relative block rounded-[22px] px-4 py-3 shadow-soft active:scale-[.99] transition"
              style={{ background: r.bg }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={r.icon}
                  alt=""
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
