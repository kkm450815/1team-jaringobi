import { Link } from 'react-router-dom';
import { HangingFish } from '../components/UI';
import { BottomTabBar } from '../components/BottomTabBar';
import { TALK_ROOMS } from '../lib/data';

export default function TalkList() {
  return (
    <main className="min-h-full flex flex-col">
      <header className="px-5 pt-12 flex items-center justify-center gap-3">
        <span className="flex-1 h-px bg-text/20" />
        <HangingFish size={42} />
        <span className="flex-1 h-px bg-text/20" />
      </header>
      <p className="text-center mt-1 font-bold tracking-[6px]">수 다 방</p>

      <ul className="px-5 mt-5 space-y-3">
        {TALK_ROOMS.map((r) => (
          <li key={r.id}>
            <Link
              to={`/talk/${r.id}`}
              className="block rounded-2xl p-4 shadow-soft active:scale-[.99] transition"
              style={{ background: r.bg }}
            >
              <div className="flex items-center gap-3">
                <img src={r.icon} alt="" className="w-14 h-14 object-contain" />
                <div className="flex-1">
                  <p className="font-bold">{r.title}</p>
                  <p className="text-[12px] text-text/60 mt-0.5">매일 새로운 꿀팁이 올라와요</p>
                </div>
                <span className="text-[18px] text-text/70">→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto"><BottomTabBar /></div>
    </main>
  );
}
