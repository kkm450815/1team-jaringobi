import { Link } from 'react-router-dom';

const SCREENS = [
  { to: '/',           label: 'Splash' },
  { to: '/login',      label: 'Login' },
  { to: '/mode',       label: 'Mode Select' },
  { to: '/main',       label: 'Main (Home)' },
  { to: '/shop',       label: 'Shop' },
  { to: '/wardrobe',   label: 'Wardrobe' },
  { to: '/talk',       label: 'Talk List' },
  { to: '/talk/t1',    label: 'Talk Room' },
  { to: '/challenges', label: 'Challenge List' },
  { to: '/challenges/m1', label: 'Challenge Detail' },
  { to: '/mypage',     label: 'My Page' },
  { to: '/camera',     label: 'Camera' },
];

export default function ScreenIndex() {
  return (
    <main className="min-h-full p-6">
      <h1 className="font-bold text-[20px] mb-4">자린고비 화면 인덱스</h1>
      <p className="text-[12px] text-text/60 mb-4">
        피그마 디자인 기준 12개 화면 + 모달 5종. 각 화면은 모바일 폭(393px)을 기준으로 설계되었습니다.
      </p>
      <ul className="space-y-2">
        {SCREENS.map((s) => (
          <li key={s.to}>
            <Link
              to={s.to}
              className="block bg-white rounded-xl px-4 py-3 shadow-soft active:scale-[.99]"
            >
              <span className="font-bold">{s.label}</span>
              <span className="ml-2 text-text/40 text-[12px]">{s.to}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
