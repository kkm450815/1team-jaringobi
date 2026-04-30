import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'accent' | 'ghost' | 'pink' | 'white';
type Size = 'md' | 'lg' | 'sm';

const variantCls: Record<Variant, string> = {
  primary: 'bg-primary text-white',
  accent:  'bg-accent text-white',
  pink:    'bg-pink text-white',
  ghost:   'bg-white text-text border border-text/15',
  white:   'bg-white text-text',
};
const sizeCls: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2.5 text-[14px]',
  lg: 'px-5 py-3.5 text-[16px] w-full',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...rest}
      className={`rounded-2xl font-bold transition active:scale-[.98] ${variantCls[variant]} ${sizeCls[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-soft ${className}`}>{children}</div>
  );
}

/* ---------------- Pill / Tag ---------------- */
export function Tag({ children, color = 'pink' }: { children: ReactNode; color?: 'pink' | 'accent' | 'primary' | 'mute' }) {
  const map = {
    pink: 'bg-pink/15 text-pink',
    accent: 'bg-accent/15 text-accent',
    primary: 'bg-primary/25 text-accent',
    mute: 'bg-text/10 text-text/70',
  } as const;
  return <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${map[color]}`}>{children}</span>;
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="bg-bg rounded-3xl p-6 w-full max-w-[320px] text-center shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Hex Badge ---------------- */
export function Hex({ children, locked, active, color = 'primary' }: {
  children: ReactNode; locked?: boolean; active?: boolean; color?: 'primary' | 'accent' | 'pink';
}) {
  const fill = locked ? 'bg-text/40 text-white/70' :
    color === 'accent' ? 'bg-accent text-white' :
    color === 'pink' ? 'bg-pink text-white' : 'bg-primary text-white';
  return (
    <div className="relative">
      <div className={`hex aspect-square w-full grid place-items-center text-[12px] font-bold text-center px-1 ${fill}`}>
        {locked ? '🔒' : children}
      </div>
      {active && (
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          적용 중
        </div>
      )}
    </div>
  );
}

/* ---------------- Page Header (back / title) ---------------- */
export function TopBar({
  back, title, right,
}: { back?: string; title?: ReactNode; right?: ReactNode }) {
  return (
    <header className="px-5 pt-12 pb-3 flex items-center justify-between">
      <div className="w-8">
        {back && (
          <Link to={back} aria-label="뒤로" className="text-[22px] leading-none">‹</Link>
        )}
      </div>
      <h1 className="font-bold text-[16px] flex items-center gap-2">{title}</h1>
      <div className="w-8 text-right">{right}</div>
    </header>
  );
}

/* ---------------- Hanging Fish (밧줄에 묶인 굴비) ---------------- */
export function HangingFish({ size = 60 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="w-px h-3 bg-text/70" />
      <div
        className="rounded-full bg-bg border border-text/30 grid place-items-center"
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.55 }}>🐟</span>
      </div>
    </div>
  );
}
