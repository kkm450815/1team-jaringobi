import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/talk',       label: '수다방' },
  { to: '/challenges', label: '챌린지' },
  { to: '/camera',     label: '카메라' },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg px-4 pt-4 pb-6 grid grid-cols-[1fr_1.6fr_1fr] gap-3 items-center">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to)
          || (t.to === '/challenges' && (pathname === '/main' || pathname === '/'));
        const isChallenge = t.to === '/challenges';
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`text-center rounded-2xl font-bold transition-colors ${
              isChallenge ? 'py-5 text-[20px]' : 'py-3 text-[14px]'
            } ${
              active ? 'bg-accent text-white shadow-soft' : 'bg-primary/60 text-text/80'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
