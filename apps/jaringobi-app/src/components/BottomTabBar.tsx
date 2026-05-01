import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/talk',       label: '수다방' },
  { to: '/challenges', label: '챌린지' },
  { to: '/camera',     label: '카메라' },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg px-4 pt-4 pb-6 grid grid-cols-[0.8fr_2fr_0.8fr] gap-3 items-stretch">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to)
          || (t.to === '/challenges' && (pathname === '/main' || pathname === '/'));
        const isChallenge = t.to === '/challenges';
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`flex items-center justify-center text-center py-5 rounded-2xl font-bold transition-colors ${
              isChallenge ? 'text-[20px]' : 'text-[14px]'
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
