import { useNavigate } from 'react-router-dom';
import { useUser } from '../lib/userState';

function ModeCard({
  variant, image, alt, amount, onClick,
}: {
  variant: 'normal' | 'hard';
  image: string;
  alt: string;
  amount: string;
  onClick: () => void;
}) {
  const isHard = variant === 'hard';
  const bg = isHard ? 'bg-accent' : 'bg-primary';
  const labelColor = isHard ? 'text-[#FFFFAD]' : 'text-text/70';
  const textColor = isHard ? 'text-[#FFFFAD]' : 'text-text/85';
  const label = isHard ? 'HARD MODE' : 'NORMAL MODE';

  return (
    <button
      onClick={onClick}
      className={`w-full ${bg} rounded-2xl shadow-soft px-5 pt-5 pb-6 active:scale-[.99] transition`}
    >
      <p className={`text-center text-[22px] tracking-[4px] font-semibold ${labelColor}`}>
        {label}
      </p>
      <div className="mt-4 grid grid-cols-[1fr_1fr] items-center gap-2">
        <div className="flex justify-center">
          <img src={image} alt={alt} className="w-[120px] h-[120px] object-contain" draggable={false} />
        </div>
        <div className={`flex flex-col items-center gap-2 text-[26px] font-medium leading-tight whitespace-nowrap ${textColor}`}>
          <span>30일간</span>
          <span>{amount} 아끼기</span>
          <span className="tracking-[2px]">START</span>
        </div>
      </div>
    </button>
  );
}

export default function ModeSelect() {
  const nav = useNavigate();
  const u = useUser();

  function start(goal: number) {
    u.update({ goal });
    nav('/main');
  }

  return (
    <main className="px-6 pt-10 pb-10">
      <div className="flex justify-center">
        <img
          src="/jarin/logo_nobg.png"
          alt="자린고비"
          className="w-[88px] h-[88px] object-contain"
          draggable={false}
        />
      </div>

      <div className="mt-8 space-y-5">
        <ModeCard
          variant="normal"
          image="/jarin/mode_normal.png"
          alt="노말 모드"
          amount="30만원"
          onClick={() => start(300_000)}
        />
        <ModeCard
          variant="hard"
          image="/jarin/mode_hard.png"
          alt="하드 모드"
          amount="100만원"
          onClick={() => start(1_000_000)}
        />
      </div>
    </main>
  );
}
