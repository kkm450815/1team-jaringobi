import { ReactNode } from 'react';

/**
 * iPhone-14 너비(393px)에 맞춘 고정 폰 프레임.
 * 데스크톱 미리보기에선 어두운 배경 위 폰 모양으로 보이고,
 * 실제 모바일에선 풀스크린으로 채워집니다.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full flex md:items-center md:justify-center bg-[#514C44]">
      <div
        className="
          relative bg-bg text-text
          w-full md:w-[393px] md:h-[852px]
          md:rounded-[44px] md:shadow-[0_30px_80px_rgba(0,0,0,0.45)]
          md:border-[10px] md:border-[#1a1a1a]
          overflow-hidden
        "
        style={{ minHeight: '100dvh' }}
      >
        <div className="h-full overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
}
