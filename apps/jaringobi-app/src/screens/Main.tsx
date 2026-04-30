import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomTabBar } from '../components/BottomTabBar';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATEGORY_LABEL: Record<MissionCategory, string> = {
  식비: '식비절약',
  여가: '여가절약',
  충동: '충동차단',
  통장: '통장사수',
};

type MissionModal = null | 'recommend' | 'change' | 'review';

function iconUrl(key: string) {
  return `/jarin/chall/icon/chall_list_${key}.png`;
}

export default function Main() {
  const [hearts, setHearts] = useState(3);
  const [showHeartModal, setShowHeartModal] = useState(false);
  const [pendingHeartIdx, setPendingHeartIdx] = useState<number | null>(null);

  const [missionModal, setMissionModal] = useState<MissionModal>(null);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [picks, setPicks] = useState<string[]>(['m2', 'm12', 'm13']);
  const [successes, setSuccesses] = useState<string[]>([]);
  const [changingFor, setChangingFor] = useState<number | null>(null);
  const [filter, setFilter] = useState<MissionCategory>('식비');

  const isConfirmed = confirmed.length > 0;
  const dDay = 30 - confirmed.length;
  const dailyGoal = 10_000;
  const pickedAmount = useMemo(
    () => picks.reduce((sum, id) => sum + (MISSIONS.find((m) => m.id === id)?.amount ?? 0), 0),
    [picks],
  );
  const savedToday = useMemo(
    () => successes.reduce((sum, id) => sum + (MISSIONS.find((m) => m.id === id)?.amount ?? 0), 0),
    [successes],
  );

  function deleteHeart() {
    if (pendingHeartIdx !== null) setHearts((h) => Math.max(0, h - 1));
    setShowHeartModal(false);
    setPendingHeartIdx(null);
  }

  function openMissionModal() {
    setMissionModal(isConfirmed ? 'review' : 'recommend');
  }

  function confirmToday() {
    setConfirmed([...picks]);
    setSuccesses([]);
    setMissionModal(null);
  }

  function toggleSuccess(id: string) {
    setSuccesses((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function completeToday() {
    setConfirmed([]);
    setSuccesses([]);
    setMissionModal(null);
  }

  function pickMission(missionId: string) {
    if (changingFor === null) return;
    setPicks((p) => p.map((id, i) => (i === changingFor ? missionId : id)));
    setChangingFor(null);
    setMissionModal('recommend');
  }

  return (
    <main className="flex flex-col min-h-full pb-0">
      {/* 상단 정보 */}
      <header className="relative px-5 pt-16 flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <button
                key={i}
                disabled={i >= hearts}
                onClick={() => { setPendingHeartIdx(i); setShowHeartModal(true); }}
                className="w-5 h-6 grid place-items-center text-[20px] leading-none transition disabled:opacity-30"
                aria-label={`양심 ${i + 1}`}
              >
                <span className={i < hearts ? 'text-[#F26B6B]' : 'text-text/25'}>♥</span>
              </button>
            ))}
          </div>
          <p className="text-[14px] text-text font-bold">D-{dDay}</p>
        </div>

        <p
          aria-label="오늘의 목표"
          style={{ top: 'calc(64px + (100% - 64px) / 2)' }}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[34px] font-bold leading-none tracking-tight pointer-events-none"
        >
          {dailyGoal.toLocaleString()}
        </p>

        <Link to="/mypage" aria-label="마이페이지" className="flex flex-col items-center gap-0.5">
          <span className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-soft overflow-hidden">
            <img src="/jarin/main_mypage.png" alt="" className="w-9 h-9 object-contain" />
          </span>
          <span className="text-[11px] font-bold text-text">MY</span>
        </Link>
      </header>

      {/* 오늘의 절약미션 버튼 */}
      <section className="px-10 pt-5 pb-3">
        <button
          onClick={openMissionModal}
          className="w-full bg-primary text-text rounded-full px-5 py-3.5 text-[19px] font-bold shadow-soft active:scale-[.98] transition"
        >
          오늘의 절약미션
        </button>
      </section>

      {/* 캐릭터 룸 */}
      <section className="relative w-full">
        <img src="/jarin/main_ room.png" alt="캐릭터 룸" className="w-full h-auto block select-none" draggable={false} />
        <img
          src="/jarin/main_character.png"
          alt="자린고비 캐릭터"
          className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[44%] object-contain pointer-events-none select-none"
          draggable={false}
        />
        <Link
          to="/shop"
          aria-label="상점"
          className="absolute right-4 bottom-4 w-14 h-14 rounded-2xl grid place-items-center bg-white/40 shadow-soft"
        >
          <img src="/jarin/main_shop.png" alt="상점" className="w-9 h-9 object-contain" />
        </Link>
      </section>

      <div className="mt-auto"><BottomTabBar /></div>

      {/* 양심 확인 오버레이 */}
      {showHeartModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex flex-col items-center justify-center px-7"
          onClick={() => { setShowHeartModal(false); setPendingHeartIdx(null); }}
        >
          <div className="w-full max-w-[340px] text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[20px] text-text">당신의 양심 지키시겠습니까?</p>
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
              >취소하기</button>
              <button
                onClick={deleteHeart}
                className="flex-1 max-w-[150px] bg-accent text-white font-bold rounded-2xl py-3 active:scale-[.98]"
              >양심 삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 오늘의 절약 미션 모달 */}
      {missionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-start justify-center px-4 pt-16 pb-4 overflow-y-auto"
          onClick={() => { setMissionModal(null); setChangingFor(null); }}
        >
          <div
            className="bg-primary rounded-[28px] w-full max-w-[340px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 패널 헤더 */}
            {missionModal !== 'change' && (
              <div className="relative h-7 mb-3">
                <p className="text-center font-bold text-[18px] tracking-[2px] text-text">
                  오늘의 절약 미션
                </p>
                <button
                  onClick={() => { setMissionModal(null); setChangingFor(null); }}
                  aria-label="닫기"
                  className="absolute right-0 top-0 text-[20px] leading-none text-text/70 font-bold"
                >×</button>
              </div>
            )}

            {missionModal === 'recommend' && (
              <RecommendPanel
                picks={picks}
                onChange={(idx) => { setChangingFor(idx); setMissionModal('change'); }}
                onConfirm={confirmToday}
              />
            )}

            {missionModal === 'change' && (
              <ChangePanel
                filter={filter}
                onFilter={setFilter}
                onPick={pickMission}
              />
            )}

            {missionModal === 'review' && (
              <ReviewPanel
                picks={confirmed}
                successes={successes}
                onToggle={toggleSuccess}
                savedToday={savedToday}
                dailyGoal={pickedAmount || dailyGoal}
                onComplete={completeToday}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- 추천 패널 ---------- */
function RecommendPanel({
  picks, onChange, onConfirm,
}: { picks: string[]; onChange: (idx: number) => void; onConfirm: () => void }) {
  return (
    <>
      <ul className="space-y-3">
        {picks.map((id, idx) => {
          const m = MISSIONS.find((x) => x.id === id)!;
          return (
            <li key={`${id}-${idx}`} className="bg-bg rounded-2xl px-3 py-3 flex items-center gap-3">
              <img src={iconUrl(m.iconKey)} alt="" className="w-[64px] h-[64px] object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text">{m.title}</p>
                <p className="text-[15px] font-bold text-text/80 mt-1">+{m.amount.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="bg-pink text-white text-[11px] font-bold px-3 py-0.5 rounded-full">
                  {m.difficulty}
                </span>
                <button
                  onClick={() => onChange(idx)}
                  className="text-[11px] text-text/70 font-medium"
                >변경하기 ⟶</button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 bg-bg rounded-2xl p-3">
        <div className="grid grid-cols-3 gap-1">
          {picks.map((id) => {
            const m = MISSIONS.find((x) => x.id === id)!;
            return (
              <div key={id} className="flex flex-col items-center text-center">
                <img src={iconUrl(m.iconKey)} alt="" className="w-[60px] h-[60px] object-contain" />
                <p className="text-[12px] font-bold mt-0.5 leading-tight">{m.title}</p>
                <p className="text-[12px] font-bold text-text/80">+{m.amount.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
        <button
          onClick={onConfirm}
          className="mt-3 w-full bg-accent text-[#FFFFAD] font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
        >
          챌린지 확정하기
        </button>
      </div>
    </>
  );
}

/* ---------- 변경 패널 ---------- */
function ChangePanel({
  filter, onFilter, onPick,
}: { filter: MissionCategory; onFilter: (c: MissionCategory) => void; onPick: (id: string) => void }) {
  const categories: MissionCategory[] = ['식비', '여가', '충동', '통장'];
  const list = MISSIONS.filter((m) => m.category === filter);
  return (
    <>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {categories.map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              onClick={() => onFilter(c)}
              className={`py-1.5 rounded-full text-[12px] font-bold transition ${
                active ? 'bg-accent text-white' : 'bg-white text-text/70'
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          );
        })}
      </div>

      <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {list.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => onPick(m.id)}
              className="w-full bg-bg rounded-2xl px-3 py-3 flex items-center gap-3 text-left active:scale-[.99]"
            >
              <img src={iconUrl(m.iconKey)} alt="" className="w-[64px] h-[64px] object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text">{m.title}</p>
                <p className="text-[15px] font-bold text-text/80 mt-1">+{m.amount.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="bg-pink text-white text-[11px] font-bold px-3 py-0.5 rounded-full">
                  {m.difficulty}
                </span>
                <span className="text-[11px] text-text/70 font-medium">변경하기 ⟶</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- 진행/완료 패널 ---------- */
function ReviewPanel({
  picks, successes, onToggle, savedToday, dailyGoal, onComplete,
}: {
  picks: string[];
  successes: string[];
  onToggle: (id: string) => void;
  savedToday: number;
  dailyGoal: number;
  onComplete: () => void;
}) {
  const ratio = Math.min(1, savedToday / dailyGoal);
  return (
    <>
      <ul className="space-y-3">
        {picks.map((id) => {
          const m = MISSIONS.find((x) => x.id === id)!;
          const done = successes.includes(id);
          return (
            <li key={id} className="bg-bg rounded-2xl px-3 py-3 flex items-center gap-3">
              <img src={iconUrl(m.iconKey)} alt="" className="w-[64px] h-[64px] object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text">{m.title}</p>
                <p className="text-[15px] font-bold text-text/80 mt-1">+{m.amount.toLocaleString()}</p>
              </div>
              <button
                onClick={() => onToggle(id)}
                aria-pressed={done}
                className={`shrink-0 px-5 py-2 rounded-full text-[14px] font-bold transition ${
                  done ? 'bg-pink text-white' : 'bg-pink/40 text-white/90'
                }`}
              >
                성공
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">
        <div className="h-4 bg-white/70 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width]"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[12px] font-bold text-text/80">
          <span>{savedToday.toLocaleString()}</span>
          <span>{dailyGoal.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="mt-4 w-full bg-accent text-[#FFFFAD] font-bold rounded-full py-3.5 text-[16px] active:scale-[.98]"
      >
        챌린지 완료하기
      </button>
    </>
  );
}
