import { useNavigate } from 'react-router-dom';
import { HangingFish } from '../components/UI';

export default function ModeSelect() {
  const nav = useNavigate();
  return (
    <main className="px-6 pt-12 pb-10">
      <div className="flex justify-center"><HangingFish size={56} /></div>
      <h1 className="text-center mt-3 font-bold text-[18px]">모드를 선택해주세요</h1>

      <button
        onClick={() => nav('/main')}
        className="mt-6 w-full rounded-3xl bg-primary text-white py-7 px-5 shadow-soft text-left active:scale-[.99] transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] tracking-[3px] opacity-90">NORMAL MODE</p>
            <p className="font-bold text-[20px] mt-1">30일 / 30만원</p>
            <p className="text-[13px] opacity-90 mt-1">하루 1만원씩 모으는 기본 모드</p>
          </div>
          <img src="/jarin/mode_normal.png" alt="노말" className="w-[110px] h-[110px] object-contain" />
        </div>
        <p className="mt-4 text-[12px] inline-block bg-white/25 rounded-full px-3 py-1">START →</p>
      </button>

      <button
        onClick={() => nav('/main')}
        className="mt-4 w-full rounded-3xl bg-accent text-white py-7 px-5 shadow-soft text-left active:scale-[.99] transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] tracking-[3px] opacity-90">HARD MODE</p>
            <p className="font-bold text-[20px] mt-1">30일 / 100만원</p>
            <p className="text-[13px] opacity-90 mt-1">매일 3~4만원 + 추가 절약 등록</p>
          </div>
          <img src="/jarin/mode_hard.png" alt="하드" className="w-[110px] h-[110px] object-contain" />
        </div>
        <p className="mt-4 text-[12px] inline-block bg-white/25 rounded-full px-3 py-1">START →</p>
      </button>
    </main>
  );
}
