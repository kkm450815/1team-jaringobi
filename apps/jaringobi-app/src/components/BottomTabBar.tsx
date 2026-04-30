import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/talk',      label: '수다방' },
  { to: '/main',      label: '챌린지' },
  { to: '/camera',    label: '카메라' },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg border-t border-text/10 px-3 pt-2 pb-3 flex items-center justify-around text-[14px]">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to) || (t.to === '/main' && pathname === '/');
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              active ? 'text-white bg-accent font-bold' : 'text-text/70'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
