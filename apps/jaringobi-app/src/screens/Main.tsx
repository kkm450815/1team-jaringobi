import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, Tag } from '../components/UI';
import { BottomTabBar } from '../components/BottomTabBar';
import { MISSIONS, MissionCategory } from '../lib/data';

export default function Main() {
  const [hearts, setHearts] = useState(3);
  const [showHeartModal, setShowHeartModal] = useState(false);
  const [pendingHeartIdx, setPendingHeartIdx] = useState<number | null>(null);

  const [showMissionSetup, setShowMissionSetup] = useState(false);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [picks, setPicks] = useState<string[]>(['m1', 'm6', 'm12']);
  const [changingFor, setChangingFor] = useState<number | null>(null); // 변경 모달 대상 슬롯
  const [filter, setFilter] = useState<MissionCategory>('식비');

  const dDay = 30 - confirmed.length;
  const dailyGoal = 10_000;
  const saved = confirmed.length === 0 ? dailyGoal : confirmed.length * dailyGoal;

  function deleteHeart() {
    if (pendingHeartIdx !== null) setHearts((h) => Math.max(0, h - 1));
    setShowHeartModal(false);
    setPendingHeartIdx(null);
  }

  function confirmToday() {
    setConfirmed((c) => Array.from(new Set([...c, ...picks])));
    setShowMissionSetup(false);
  }

  return (
    <main className="flex flex-col min-h-full pb-0">
      {/* 상단 정보 */}
      <header className="px-5 pt-10 grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <div className="flex flex-col">
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <button
                key={i}
                disabled={i >= hearts}
                onClick={() => { setPendingHeartIdx(i); setShowHeartModal(true); }}
                className="w-7 h-7 grid place-items-center text-[26px] leading-none transition disabled:opacity-30"
                aria-label={`양심 ${i + 1}`}
              >
                <span className={i < hearts ? 'text-[#F26B6B] drop-shadow-[0_2px_0_rgba(0,0,0,0.04)]' : 'text-text/25'}>
                  ♥
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[16px] text-text font-bold">D-{dDay}</p>
        </div>

        <p className="text-center text-[34px] font-bold leading-none tracking-tight pt-2">
          {saved.toLocaleString()}
        </p>

        <Link to="/mypage" aria-label="마이페이지"
              className="flex flex-col items-center gap-0.5">
          <span className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-soft overflow-hidden">
            <img src="/jarin/main_mypage.png" alt="" className="w-9 h-9 object-contain" />
          </span>
          <span className="text-[11px] font-bold text-text">MY</span>
        </Link>
      </header>

      {/* 오늘의 절약 미션 */}
      <section className="px-10 pt-4 pb-3">
        {confirmed.length === 0 ? (
          <button
            onClick={() => setShowMissionSetup(true)}
            className="w-full bg-primary text-text rounded-full px-5 py-3.5 text-[15px] font-bold shadow-soft active:scale-[.98] transition"
          >
            오늘의 절약미션
          </button>
        ) : null}
      </section>

      {/* 캐릭터 룸 */}
      <section className="relative w-full">
        <img src="/jarin/main_ room.png" alt="캐릭터 룸" className="w-full h-auto block select-none" draggable={false} />
        {/* 매달린 굴비 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center pointer-events-none">
          <div className="w-[2px] h-16 bg-[#8a6b3a]/60" />
          <img src="/jarin/logo_nobg.png" alt="굴비" className="w-[120px] h-[120px] object-contain -mt-6" />
        </div>
        {/* 메인 캐릭터 */}
        <img
          src="/jarin/main_character.png"
          alt="자린고비 캐릭터"
          className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[44%] object-contain pointer-events-none select-none"
          draggable={false}
        />
        {/* 상점 진입 */}
        <Link to="/shop" aria-label="상점"
              className="absolute right-4 bottom-4 w-14 h-14 rounded-2xl grid place-items-center bg-white shadow-soft">
          <img src="/jarin/main_shop.png" alt="상점" className="w-9 h-9 object-contain" />
        </Link>
      </section>

      {/* 진행 중 챌린지 (오늘의 미션 확정 후) */}
      <section className="px-5 pt-3 pb-3">
        {confirmed.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold">오늘의 챌린지</p>
              <Tag color="accent">진행 중</Tag>
            </div>
            <ul className="space-y-2">
              {picks.map((id) => {
                const m = MISSIONS.find((x) => x.id === id)!;
                return (
                  <li key={id} className="flex items-center gap-3 bg-bg rounded-xl px-3 py-2">
                    <img src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`} alt="" className="w-9 h-9 object-contain" />
                    <span className="flex-1 text-[13px] font-bold">{m.title}</span>
                    <span className="text-[12px] font-bold text-accent">+{m.amount.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => { setHearts((h) => Math.max(0, h - 1)); }}>양심 깎기</Button>
              <Link to="/camera"><Button variant="accent" className="w-full">카메라로 인증 →</Button></Link>
            </div>
          </div>
        )}
      </section>

      {/* 하단 탭 */}
      <div className="mt-auto"><BottomTabBar /></div>

      {/* 양심 확인 오버레이 */}
      {showHeartModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex flex-col items-center justify-center px-7"
          onClick={() => { setShowHeartModal(false); setPendingHeartIdx(null); }}
        >
          <div className="w-full max-w-[340px] text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[20px] text-text drop-shadow-sm">당신의 양심 지키시겠습니까?</p>

            <div className="mt-7 flex justify-center items-center gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <svg key={i} viewBox="0 0 32 30" className="w-[72px] h-[68px]" aria-hidden>
                  <path
                    d="M16 27.5 C 6 21 1.5 14.5 1.5 9 C 1.5 4.6 5 1.5 9 1.5 C 12 1.5 14.5 3.2 16 5.6 C 17.5 3.2 20 1.5 23 1.5 C 27 1.5 30.5 4.6 30.5 9 C 30.5 14.5 26 21 16 27.5 Z"
                    fill="#F49496"
                  />
                </svg>
              ))}
            </div>

            <div className="mt-8 flex gap-3 justify-center">
              <button
                onClick={() => { setShowHeartModal(false); setPendingHeartIdx(null); }}
                className="flex-1 max-w-[150px] bg-primary/70 text-text font-bold rounded-2xl py-3 active:scale-[.98]"
              >
                취소하기
              </button>
              <button
                onClick={deleteHeart}
                className="flex-1 max-w-[150px] bg-accent text-white font-bold rounded-2xl py-3 active:scale-[.98]"
              >
                양심 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 오늘의 절약미션 세팅 팝업 */}
      <Modal open={showMissionSetup && changingFor === null} onClose={() => setShowMissionSetup(false)}>
        <p className="font-bold">오늘의 절약 미션</p>
        <p className="text-[12px] text-text/60 mt-1">3개를 모아 1만원 목표를 채워주세요</p>
        <ul className="mt-4 space-y-2 text-left">
          {picks.map((id, idx) => {
            const m = MISSIONS.find((x) => x.id === id)!;
            return (
              <li key={id} className="flex items-center gap-2 bg-white rounded-xl p-2.5">
                <img src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`} alt="" className="w-9 h-9 object-contain" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold leading-tight">{m.title}</p>
                  <div className="flex gap-1 mt-1 items-center">
                    <Tag color="pink">{m.difficulty}</Tag>
                    <span className="text-[11px] text-text/60">{m.amount.toLocaleString()}원</span>
                  </div>
                </div>
                <button
                  onClick={() => setChangingFor(idx)}
                  className="text-[11px] text-accent font-bold underline"
                >변경 →</button>
              </li>
            );
          })}
        </ul>
        <Button variant="accent" size="lg" className="mt-4" onClick={confirmToday}>챌린지 확정하기</Button>
      </Modal>

      {/* 변경 팝업 (카테고리 선택 후 대체 미션) */}
      <Modal open={changingFor !== null} onClose={() => setChangingFor(null)}>
        <p className="font-bold mb-3">미션 변경</p>
        <div className="flex gap-2 justify-center mb-3 flex-wrap">
          {(['식비','여가','충동','통장'] as MissionCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-[12px] font-bold ${filter === c ? 'bg-accent text-white' : 'bg-white text-text/70'}`}
            >{c}</button>
          ))}
        </div>
        <ul className="max-h-[260px] overflow-y-auto space-y-1.5 text-left">
          {MISSIONS.filter((m) => m.category === filter).map((m) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  setPicks((p) => p.map((id, i) => i === changingFor ? m.id : id));
                  setChangingFor(null);
                }}
                className="w-full flex items-center gap-2 bg-white rounded-xl p-2.5 text-left active:scale-[.99]"
              >
                <img src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`} alt="" className="w-8 h-8 object-contain" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold leading-tight">{m.title}</p>
                  <div className="flex gap-1 mt-0.5">
                    <Tag color="pink">{m.difficulty}</Tag>
                    <span className="text-[11px] text-text/60">{m.amount.toLocaleString()}원</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </main>
  );
}
