import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/talk',      label: '수다방' },
  { to: '/main',      label: '챌린지' },
  { to: '/camera',    label: '카메라' },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg px-4 pt-4 pb-6 grid grid-cols-3 gap-3 text-[17px]">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to) || (t.to === '/main' && pathname === '/');
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`text-center py-4 rounded-2xl font-bold transition-colors ${
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
