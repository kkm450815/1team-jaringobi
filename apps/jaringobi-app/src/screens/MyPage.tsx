import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hex, Modal, TopBar } from '../components/UI';
import { TITLES } from '../lib/data';

export default function MyPage() {
  const [showTitles, setShowTitles] = useState(false);
  const day = 12;
  const saved = 120_000;
  const goal = 300_000;

  // 30일 캘린더 (1~12 인증 완료, 12~ 미완료)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <main className="min-h-full bg-grid-paper pb-10">
      <TopBar
        back="/main"
        title=""
        right={
          <div className="flex gap-2 text-[18px]">
            <button aria-label="외부 공유">⍐</button>
            <button aria-label="환경설정">⚙️</button>
          </div>
        }
      />

      {/* 프로필 */}
      <section className="mx-5 grid grid-cols-[120px,1fr] gap-3 items-center">
        <div className="bg-white rounded-2xl shadow-soft aspect-square grid place-items-center p-2 relative">
          <img src="/jarin/main_character.png" alt="캐릭터" className="h-3/4 object-contain" />
          <button
            onClick={() => setShowTitles(true)}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 hex bg-accent text-white text-[10px] font-bold grid place-items-center"
          >홈<br/>바리스타</button>
        </div>
        <div>
          <p className="text-[12px] font-bold text-text/70">거지탈출 {day}일차</p>
          <p className="text-[20px] font-bold mt-1"><span className="hl-pink">자린이</span></p>
          <p className="text-[14px] mt-2">
            <span className="font-bold">{saved.toLocaleString()}</span>
            <span className="text-text/50"> / {goal.toLocaleString()}원</span>
          </p>
          <div className="flex gap-3 mt-2.5 text-[18px]">
            <button aria-label="스크랩 보관함">🔖</button>
            <Link to="/shop" aria-label="상점">🪙</Link>
          </div>
        </div>
      </section>

      {/* 회차 */}
      <section className="mx-5 mt-5">
        <button className="w-full bg-white rounded-xl shadow-soft py-2.5 px-4 text-left text-[13px] font-bold flex items-center justify-between">
          <span>챌린지 1회차 · 2026.04.01 ~ 2026.04.30</span>
          <span className="text-text/40">›</span>
        </button>
      </section>

      {/* RECORD 캘린더 */}
      <section className="mx-5 mt-5">
        <h3 className="font-bold tracking-[3px] text-[14px]">RECORD</h3>
        <div className="mt-2 grid grid-cols-6 gap-1.5 bg-white rounded-2xl p-2.5 shadow-soft">
          {days.map((d) => {
            const done = d <= day;
            return (
              <div
                key={d}
                className={`aspect-square rounded-lg overflow-hidden grid place-items-center text-[10px] font-bold relative ${
                  done ? 'bg-primary text-white' : 'bg-text/15 text-text/40'
                }`}
              >
                <span className="absolute top-0.5 left-1 text-[9px]">{d}</span>
                {done ? <span className="text-[14px]">✓</span> : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 칭호 변경 팝업 */}
      <Modal open={showTitles} onClose={() => setShowTitles(false)}>
        <p className="font-bold mb-3">칭호</p>
        <div className="grid grid-cols-3 gap-3">
          {TITLES.map((t) => (
            <Hex key={t.id} locked={!t.got} active={t.active} color={t.active ? 'accent' : 'primary'}>
              {t.name}
            </Hex>
          ))}
        </div>
      </Modal>
    </main>
  );
}
