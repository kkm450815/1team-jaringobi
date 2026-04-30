import { Link } from 'react-router-dom';
import { BottomTabBar } from '../components/BottomTabBar';
import { TALK_ROOMS } from '../lib/data';

export default function TalkList() {
  return (
    <main className="min-h-full flex flex-col">
      {/* 매달린 굴비 헤더 */}
      <header className="pt-10 pb-4 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-[2px] h-7 bg-[#8a6b3a]/60" />
          <img
            src="/jarin/logo_nobg.png"
            alt=""
            className="w-[120px] h-[120px] object-contain -mt-3"
            draggable={false}
          />
        </div>
      </header>

      <ul className="px-5 pb-6 space-y-4">
        {TALK_ROOMS.map((r) => (
          <li key={r.id}>
            <Link
              to={`/talk/${r.id}`}
              className="block rounded-[22px] px-4 py-5 shadow-soft active:scale-[.99] transition"
              style={{ background: r.bg }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={r.icon}
                  alt=""
                  className="w-[88px] h-[88px] object-contain shrink-0"
                  draggable={false}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-center font-bold text-[20px] leading-tight text-text">
                    {r.title}
                  </p>
                  <p className="text-center font-bold text-[20px] leading-tight text-text">
                    수다방
                  </p>
                  <p className="mt-3 text-right text-[12px] text-text/70 font-medium pr-1">
                    바로가기 <span aria-hidden>⟶</span>
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto"><BottomTabBar /></div>
    </main>
  );
}
