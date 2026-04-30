import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav('/login'), 1400);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <main className="h-full grid place-items-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <img src="/jarin/logo.png" alt="자린고비 로고" className="w-[110px] h-[110px] object-contain" />
        <p className="font-bold tracking-widest text-text/80">자 린 고 비</p>
      </div>
    </main>
  );
}
