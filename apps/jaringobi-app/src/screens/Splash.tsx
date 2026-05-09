import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const USER_KEY = 'jaringobi.user.v1';
const DEFAULT_NICK = '자린이';

/** localStorage 에 닉네임이 저장된 사용자(=가입 완료) 인지 검사. */
function hasSavedAccount(): boolean {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { nickname?: unknown };
    return typeof parsed.nickname === 'string'
      && parsed.nickname.length > 0
      && parsed.nickname !== DEFAULT_NICK;
  } catch {
    return false;
  }
}

export default function Splash() {
  const nav = useNavigate();
  useEffect(() => {
    // 저장된 사용자 → /main 으로 직행. 신규 → /login.
    const target = hasSavedAccount() ? '/main' : '/login';
    const t = setTimeout(() => nav(target, { replace: true }), 1400);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <main className="h-full grid place-items-center bg-bg">
      <div className="w-[110px] h-[110px] bg-primary rounded-3xl grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="자린고비 로고" className="w-[68%] h-[68%] object-contain" />
      </div>
    </main>
  );
}
