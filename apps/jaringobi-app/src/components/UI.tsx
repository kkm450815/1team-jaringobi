import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/* ---------------- BackButton (히스토리 뒤로가기) ---------------- */
export function BackButton({
  className = '',
  fallback = '/main',
  to,
}: {
  className?: string;
  fallback?: string;
  /** 지정 시 history 무시하고 무조건 이 경로로 이동. 화면 흐름을 강제하고 싶을 때 사용. */
  to?: string;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  // react-router v6: 초기 진입(직접 URL/새로고침)이면 key === 'default'.
  // 그 외에는 nav 거친 상태이므로 history 뒤로가기 가능.
  const hasHistory = loc.key !== 'default';
  return (
    <button
      type="button"
      onClick={() => {
        if (to) { nav(to); return; }
        if (hasHistory) nav(-1);
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

/* ---------------- CloseButton (모달 우상단 X 통일) ---------------- */
export function CloseButton({
  onClick,
  className = '',
  ariaLabel = '닫기',
}: {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-9 h-9 grid place-items-center text-[24px] leading-none text-text/70 font-bold ${className}`}
    >
      ×
    </button>
  );
}
