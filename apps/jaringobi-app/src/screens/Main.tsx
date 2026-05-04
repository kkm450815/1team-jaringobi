import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BottomTabBar } from '../components/BottomTabBar';
import { RoomPreview } from '../components/RoomPreview';
import { MISSIONS, MissionCategory } from '../lib/data';
import { useUser } from '../lib/userState';
import { playLoseSfx, vibrate } from '../lib/feedback';
import { useEscape } from '../lib/useEscape';

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
  const u = useUser();
  const nav = useNavigate();
  const location = useLocation();

  // 카메라 인증 완료 후 자동으로 새 미션 추천 패널 열기
  useEffect(() => {
    const state = location.state as { autoMissionModal?: boolean } | null;
    if (state?.autoMissionModal) {
      setMissionModal('recommend');
      // 한 번만 트리거되도록 history state 정리
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hearts = u.hearts;
  const [showHeartModal, setShowHeartModal] = useState(false);
  const [pendingHeartIdx, setPendingHeartIdx] = useState<number | null>(null);

  // 캐릭터 클릭 시 잠깐 찡그린 표정 + 클릭한 위치에 팡 버스트 표시 (350ms)
  // 누적 hitCount >= 20 이면 평상시 표정이 cry_cha(떨떠름)로 바뀜
  const roomRef = useRef<HTMLDivElement>(null);
  const HIT_COLORS = ['#FFE34D', '#F49496', '#7BC256', '#7AC8E8', '#C49AE8', '#FFA94D', '#F47CC8'];
  const [hit, setHit] = useState<{ x: number; y: number; tick: number; color: string } | null>(null);
  const [hitCount, setHitCount] = useState(0);
  function hitCharacter(e: React.MouseEvent) {
    const root = roomRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const color = HIT_COLORS[Math.floor(Math.random() * HIT_COLORS.length)];
    setHit({ x, y, tick: (hit?.tick ?? 0) + 1, color });
    setHitCount((c) => c + 1);
    if (u.settings.sound) playLoseSfx();
    if (u.settings.vibration) vibrate(20);
  }
  useEffect(() => {
    if (!hit) return;
    const t = setTimeout(() => setHit(null), 350);
    return () => clearTimeout(t);
  }, [hit?.tick]);

  // 양심 0개 도달 시 코인 50% 차감 + 안내 팝업, 닫으면 양심 3개로 복구
  const [zeroPenalty, setZeroPenalty] = useState<{ lost: number; remain: number } | null>(null);
  useEffect(() => {
    if (u.hearts === 0 && !zeroPenalty) {
      const lost = Math.floor(u.coins * 0.5);
      const remain = u.coins - lost;
      setZeroPenalty({ lost, remain });
      u.update({ coins: remain });
      if (u.settings.sound) playLoseSfx();
      if (u.settings.vibration) vibrate([20, 60, 20, 60, 60]);
    }
  // hearts/coins 변경 시에만 트리거 (반복 트리거 방지 위해 zeroPenalty 의존성 포함)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u.hearts]);

  function closeZeroPenalty() {
    setZeroPenalty(null);
    u.restoreHearts(); // 양심 3개 복구
  }
  useEscape(zeroPenalty !== null, closeZeroPenalty);

  const [missionModal, setMissionModal] = useState<MissionModal>(null);
  const picks = u.missionPicks;
  const confirmed = u.missionConfirmed;
  const successes = u.missionSuccesses;
  const setPicks = (v: string[] | ((prev: string[]) => string[])) =>
    u.setMissionPicks(typeof v === 'function' ? v(u.missionPicks) : v);
  const [changingFor, setChangingFor] = useState<number | null>(null);
  const [filter, setFilter] = useState<MissionCategory>('식비');

  const isConfirmed = confirmed.length > 0;
  // D-day: 30일 챌린지의 남은 일수. day=1이면 D-30, day=30이면 D-1, 회차 종료 후 day=1로 리셋되며 다시 D-30
  const dDay = Math.max(0, 31 - u.day);
  const dailyGoal = 10_000;
  const pickedAmount = useMemo(
    () => picks.reduce((sum, id) => sum + (MISSIONS.find((m) => m.id === id)?.amount ?? 0), 0),
    [picks],
  );
  const savedToday = useMemo(
    () => successes.reduce((sum, idx) => sum + (MISSIONS.find((m) => m.id === confirmed[idx])?.amount ?? 0), 0),
    [successes, confirmed],
  );

  function deleteHeart() {
    if (pendingHeartIdx !== null) {
      u.loseHeart();
      if (u.settings.sound) playLoseSfx();
      if (u.settings.vibration) vibrate([15, 50, 25]);
    }
    setShowHeartModal(false);
    setPendingHeartIdx(null);
  }

  function openMissionModal() {
    setMissionModal(isConfirmed ? 'review' : 'recommend');
  }

  function confirmToday() {
    u.confirmMission();
    setMissionModal(null);
  }

  function toggleSuccess(idx: number) {
    u.toggleMissionSuccess(idx);
  }

  function completeToday() {
    // savePhoto에서 자동 리셋되므로 여기서는 reset 호출 안 함
    // 미션 진행 상태(missionConfirmed/Successes)는 카메라 인증 후 해제
    setMissionModal(null);
    nav('/camera');
  }

  function pickMission(missionId: string) {
    if (changingFor === null) return;
    setPicks((p) => p.map((id, i) => (i === changingFor ? missionId : id)));
    setChangingFor(null);
    setMissionModal('recommend');
  }

  // ESC로 모달 닫기 (양심 / 미션)
  useEscape(showHeartModal, () => { setShowHeartModal(false); setPendingHeartIdx(null); });
  useEscape(missionModal !== null, () => { setMissionModal(null); setChangingFor(null); });

  return (
    <main className="flex flex-col min-h-full pb-0">
      {/* 상단 정보 */}
      <header className="relative px-5 pt-9 flex items-center justify-between gap-3">
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
          <p className="text-[18px] text-text font-bold">D-{dDay}</p>
        </div>

        <p
          aria-label="누적 저축액"
          style={{ top: 'calc(36px + (100% - 36px) / 2)' }}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[34px] font-bold leading-none tracking-tight pointer-events-none"
        >
          {u.totalSaved.toLocaleString()}
        </p>

        <Link to="/mypage" aria-label="마이페이지" className="flex flex-col items-center gap-0.5">
          <span className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-soft overflow-hidden">
            <img src="/jarin/main_mypage.png" alt="" className="w-9 h-9 object-contain" />
          </span>
          <span className="text-[11px] font-bold text-text">MY</span>
        </Link>
      </header>

      {/* 오늘의 절약미션 버튼 */}
      <section className="px-10 pt-8 pb-8">
        <button
          onClick={openMissionModal}
          className={`w-full rounded-full px-5 py-3.5 text-[19px] font-bold shadow-soft active:scale-[.98] transition ${
            isConfirmed
              ? 'bg-accent text-[#FFFFAD] ring-2 ring-accent/40'
              : 'bg-primary text-text'
          }`}
        >
          {isConfirmed ? '✓ 오늘의 절약미션 (진행 중)' : '오늘의 절약미션'}
        </button>
      </section>

      {/* 캐릭터 룸 (옷장에서 장착한 것 자동 반영) */}
      <div ref={roomRef} className="relative w-full mt-2">
        <RoomPreview
          equipped={u.equipped}
          framed={false}
          characterSrc={
            hit
              ? '/jarin/action_character.png'
              : hitCount >= 20
                ? '/jarin/cry_cha.png'
                : '/jarin/main_character.png'
          }
          onCharacterClick={hitCharacter}
        />
        {hit && (
          <div
            key={hit.tick}
            className="absolute z-20 pointer-events-none animate-hit-pop"
            style={{ left: hit.x, top: hit.y, transform: 'translate(-50%, -50%)' }}
            aria-hidden
          >
            <svg width="56" height="56" viewBox="0 0 120 120">
              <polygon
                points="60,4 70,30 96,18 84,44 116,52 88,64 108,90 78,82 84,114 60,92 36,114 42,82 12,90 32,64 4,52 36,44 24,18 50,30"
                fill={hit.color}
                stroke="#3D3833"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <Link
          to="/shop"
          aria-label="상점"
          className="absolute right-4 bottom-4 w-14 h-14 rounded-2xl grid place-items-center bg-bg shadow-soft"
        >
          <img src="/jarin/main_shop.png" alt="상점" className="w-10 h-10 object-contain" />
        </Link>
      </div>

      <div className="mt-auto"><BottomTabBar /></div>

      {/* 양심 확인 오버레이 */}
      {showHeartModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex flex-col items-center justify-center px-7"
          onClick={() => { setShowHeartModal(false); setPendingHeartIdx(null); }}
        >
          <div className="w-full max-w-[340px] text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[20px] text-white">당신의 양심 지키시겠습니까?</p>
            <p className="mt-2 text-[13px] text-white/75">
              삭제하면 ♥ {Math.max(0, hearts - 1)}개만 남아요
            </p>
            <div className="mt-5 flex justify-center items-center gap-5">
              {Array.from({ length: 3 }).map((_, i) => {
                const isAlive = i < hearts;
                const isDeleting = pendingHeartIdx !== null && i === pendingHeartIdx;
                const fillColor = isDeleting ? '#C0BDB7' : isAlive ? '#F49496' : '#E5E1D9';
                return (
                  <div key={i} className="relative">
                    <svg viewBox="0 0 32 30" className="w-[72px] h-[68px]" aria-hidden>
                      <path
                        d="M16 27.5 C 6 21 1.5 14.5 1.5 9 C 1.5 4.6 5 1.5 9 1.5 C 12 1.5 14.5 3.2 16 5.6 C 17.5 3.2 20 1.5 23 1.5 C 27 1.5 30.5 4.6 30.5 9 C 30.5 14.5 26 21 16 27.5 Z"
                        fill={fillColor}
                      />
                    </svg>
                    {isDeleting && (
                      <span
                        className="absolute inset-0 grid place-items-center text-[40px] font-black text-white"
                        aria-label="삭제 표시"
                      >×</span>
                    )}
                  </div>
                );
              })}
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
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-4 py-6 overflow-y-auto"
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

      {/* 양심 0개 도달 — 코인 50% 차감 + 안내 팝업 */}
      {zeroPenalty && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={closeZeroPenalty}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-6 text-center shadow-2xl border-2 border-pink/30"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[18px] font-bold text-pink">💔 양심을 모두 잃었어요</p>
            <p className="mt-3 text-[14px] text-text/85 leading-relaxed">
              돈 모으기 힘들죠?<br />
              다시 화이팅!
            </p>
            <div className="mt-4 bg-white rounded-2xl px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text/55">차감된 코인</span>
                <span className="font-bold text-pink text-[15px]">−{zeroPenalty.lost.toLocaleString()}P</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span className="text-text/55">남은 코인</span>
                <span className="font-bold text-text text-[15px]">{zeroPenalty.remain.toLocaleString()}P</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-text/65">양심 ♥♥♥ 이 다시 채워졌어요</p>
            <button
              onClick={closeZeroPenalty}
              className="mt-4 w-full bg-accent text-white font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
            >
              다시 시작하기
            </button>
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

      {list.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-text/55 leading-relaxed">
          이 카테고리에는 아직 미션이 없어요.<br />
          다른 카테고리를 선택해 보세요.
        </p>
      ) : (
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {list.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onPick(m.id)}
                className="w-full bg-bg rounded-2xl px-3 py-3 flex items-center gap-3 text-left active:scale-[.99]"
              >
                <img src={iconUrl(m.iconKey)} alt={`${m.title} 아이콘`} className="w-[64px] h-[64px] object-contain shrink-0" />
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
      )}
    </>
  );
}

/* ---------- 진행/완료 패널 ---------- */
function ReviewPanel({
  picks, successes, onToggle, savedToday, dailyGoal, onComplete,
}: {
  picks: string[];
  successes: number[];
  onToggle: (idx: number) => void;
  savedToday: number;
  dailyGoal: number;
  onComplete: () => void;
}) {
  const ratio = Math.min(1, savedToday / dailyGoal);
  // F42: 성공 토글 후 3초 동안만 "취소" 링크 노출. 그 외엔 버튼 클릭 무시(실수 방지).
  const [recentToggleIdx, setRecentToggleIdx] = useState<number | null>(null);
  useEffect(() => {
    if (recentToggleIdx === null) return;
    const t = setTimeout(() => setRecentToggleIdx(null), 3000);
    return () => clearTimeout(t);
  }, [recentToggleIdx]);

  function handleSuccessClick(idx: number, done: boolean) {
    if (done) {
      // 이미 성공 처리된 항목은 3초 안에만 취소 가능 (실수 방지)
      if (recentToggleIdx === idx) {
        onToggle(idx);
        setRecentToggleIdx(null);
      }
      return;
    }
    onToggle(idx);
    setRecentToggleIdx(idx);
  }

  return (
    <>
      <ul className="space-y-3">
        {picks.map((id, idx) => {
          const m = MISSIONS.find((x) => x.id === id)!;
          const done = successes.includes(idx);
          const showUndo = done && recentToggleIdx === idx;
          return (
            <li key={`${id}-${idx}`} className="bg-bg rounded-2xl px-3 py-3 flex items-center gap-3">
              <img src={iconUrl(m.iconKey)} alt="" className="w-[64px] h-[64px] object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text">{m.title}</p>
                <p className="text-[15px] font-bold text-text/80 mt-1">+{m.amount.toLocaleString()}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <button
                  onClick={() => handleSuccessClick(idx, done)}
                  aria-pressed={done}
                  className={`px-5 py-2 rounded-full text-[14px] font-bold transition ${
                    done ? 'bg-pink text-white' : 'bg-pink/40 text-white/90'
                  }`}
                >
                  {done ? '✓ 성공' : '성공'}
                </button>
                {showUndo && (
                  <button
                    onClick={() => handleSuccessClick(idx, done)}
                    className="text-[11px] text-text/60 underline"
                  >
                    취소
                  </button>
                )}
              </div>
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
        disabled={successes.length === 0}
        className={`mt-4 w-full font-bold rounded-full py-3.5 text-[16px] transition ${
          successes.length === 0
            ? 'bg-text/20 text-text/50 cursor-not-allowed'
            : 'bg-accent text-[#FFFFAD] active:scale-[.98]'
        }`}
      >
        {successes.length === 0 ? '성공한 미션을 1개 이상 체크해주세요' : '챌린지 완료하기'}
      </button>
    </>
  );
}
