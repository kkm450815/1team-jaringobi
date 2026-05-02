import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/* ---------------- BackButton (히스토리 뒤로가기) ---------------- */
export function BackButton({
  className = '',
  fallback = '/main',
}: {
  className?: string;
  fallback?: string;
}) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        // 히스토리가 없으면 fallback 경로로
        const state = window.history.state as { idx?: number } | null;
        if (state && (state.idx ?? 0) > 0) nav(-1);
        else nav(fallback);
      }}
      aria-label="뒤로"
      className={className || 'w-14 h-14 grid place-items-center text-text/80 -ml-2'}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="15 6 9 12 15 18" />
      </svg>
    </button>
  );
}

/* ---------------- Pill / Tag ---------------- */
export function Tag({
  children,
  color = 'pink',
}: {
  children: ReactNode;
  color?: 'pink' | 'accent' | 'primary' | 'mute';
}) {
  const map = {
    pink: 'bg-pink/15 text-pink',
    accent: 'bg-accent/15 text-accent',
    primary: 'bg-primary/25 text-accent',
    mute: 'bg-text/10 text-text/70',
  } as const;
  return (
    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${map[color]}`}>
      {children}
    </span>
  );
}

/* ---------------- Page Header (back / title) ---------------- */
export function TopBar({
  back,
  title,
  right,
}: {
  back?: string;
  title?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="px-5 pt-10 pb-3 flex items-center justify-between">
      <div className="w-14">{back && <BackButton fallback={back} />}</div>
      <h1 className="font-bold text-[16px] flex items-center gap-2">{title}</h1>
      <div className="w-14 text-right">{right}</div>
    </header>
  );
}
