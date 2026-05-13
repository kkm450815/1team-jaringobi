import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BottomTabBar } from '../components/BottomTabBar';
import { CloseButton } from '../components/UI';
import { RoomPreview } from '../components/RoomPreview';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { TutorialOverlay, TutorialStep } from '../components/TutorialOverlay';
import { MISSIONS, MissionCategory } from '../lib/data';
import { isMissionLocked, nextMissionAvailableAt, useUser } from '../lib/userState';
import { playClickSfx, playHitSfx, playLoseSfx, playSuccessSfx, vibrate } from '../lib/feedback';
import { useEscape } from '../lib/useEscape';

const CATEGORY_LABEL: Record<MissionCategory, string> = {
  식비: '식비절약',
  여가: '여가절약',
  충동: '충동차단',
  통장: '통장사수',
};

// 첫 진입 코치마크. 각 step 의 targetSelector 는 Main.tsx / BottomTabBar.tsx
// 의 data-tutorial 어트리뷰트와 매칭. 단계 추가/순서 변경 시 자유.
const MAIN_TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetSelector: '[data-tutorial="hearts"]',
    text: '양심 ♥ 은 본인이 직접 깎는 거예요. 다 깎으면 모은 포인트가 절반이 되지만 챌린지는 계속 진행할 수 있어요. 당신의 양심에 맡깁니다!',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="totalSaved"]',
    text: '30일간 모은 절약 금액. 매일 미션 인증할 때마다 늘어나요.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="mypage"]',
    text: '마이페이지에서 이름·칭호·인증샷 캘린더를 확인할 수 있어요. 수다방의 프로필을 통해 다른 사용자들도 내 페이지를 볼 수 있어요.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="room"]',
    text: '여기가 내 방. 모은 포인트로 자린이의 옷을 사거나 방을 꾸밀 수 있어요.',
    placement: 'top',
  },
  {
    targetSelector: '[data-tutorial="shop"]',
    text: '상점에서는 인게임 포인트로 자린이의 옷이나 방을 꾸밀 상품을 구매할 수 있어요. 산 아이템은 옷장에서 착용하면 캐릭터에 적용돼요.',
    placement: 'top',
  },
  {
    targetSelector: '[data-tutorial="missionButton"]',
    text: '매일 절약 미션을 1개 골라서 인증 사진을 올리면 보상이 적립돼요. 미션은 새벽 4시에 초기화돼요.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="tab-challenges"]',
    text: '가운데 [챌린지] 탭이 메인 화면이에요. 챌린지 목록과 인증샷 가이드를 확인할 수 있어요.',
    placement: 'top',
  },
  {
    targetSelector: '[data-tutorial="tab-talk"]',
    text: '[수다방] 에서는 다른 사용자들과 짠테크 정보를 자유롭게 나눌 수 있어요.',
    placement: 'top',
  },
  {
    targetSelector: '[data-tutorial="tab-camera"]',
    text: '[카메라] 탭에서 매일 챌린지 인증샷을 올려요. 인증해야 보상이 적립돼요.',
    placement: 'top',
  },
];

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

  // BGM 은 App 레벨 BgmController 가 전역 관리

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
    playHitSfx();
    if (u.settings.vibration) vibrate(30);
  }
  useEffect(() => {
    if (!hit) return;
    const t = setTimeout(() => setHit(null), 350);
    return () => clearTimeout(t);
  }, [hit?.tick]);
  // 떨떠름 표정(cry_cha)은 누적 20회 도달 후 5초만 유지 → hitCount 0으로 리셋
  const isCrying = hitCount >= 20;
  useEffect(() => {
    if (!isCrying) return;
    const t = setTimeout(() => setHitCount(0), 5000);
    return () => clearTimeout(t);
  }, [isCrying]);

  // 양심 0개 도달 → 안내 팝업 노출 (차감/복구 예정값만 미리 보여줌).
  // '다시 시작하기' 클릭 시점에 실제 코인 차감 + 양심 복구가 일어남 (인과 명시).
  // 회차당 1회만 적용 — lastZeroPenaltyCycle 로 무한 반복 차단.
  const [zeroPenalty, setZeroPenalty] = useState<{ lost: number; remain: number } | null>(null);
  useEffect(() => {
    const alreadyApplied = u.lastZeroPenaltyCycle === u.cycle;
    if (u.hearts === 0 && !zeroPenalty && !alreadyApplied) {
      const lost = Math.floor(u.coins * 0.5);
      const remain = u.coins - lost;
      setZeroPenalty({ lost, remain });
      playLoseSfx();
      if (u.settings.vibration) vibrate([20, 60, 20, 60, 60]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u.hearts]);

  function applyZeroPenalty() {
    if (!zeroPenalty) return;
    u.update({ coins: zeroPenalty.remain, lastZeroPenaltyCycle: u.cycle });
    u.restoreHearts();
    setZeroPenalty(null);
  }
  useEscape(zeroPenalty !== null, applyZeroPenalty);

  const [missionModal, setMissionModal] = useState<MissionModal>(null);
  const picks = u.missionPicks;
  const confirmed = u.missionConfirmed;
  const successes = u.missionSuccesses;
  const setPicks = (v: string[] | ((prev: string[]) => string[])) =>
    u.setMissionPicks(typeof v === 'function' ? v(u.missionPicks) : v);
  const [changingFor, setChangingFor] = useState<number | null>(null);
  const [filter, setFilter] = useState<MissionCategory>('식비');

  const isConfirmed = confirmed.length > 0;

  // 미션 lock — 마지막 인증 후 다음 새벽 4시까지 새 미션 시작 불가.
  // 1분마다 재평가해서 4시 도래하면 자동 해제.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const locked = isMissionLocked(u.lastSavedAt, now);
  const unlockAt = nextMissionAvailableAt(u.lastSavedAt);
  const unlockLabel = unlockAt
    ? `${unlockAt.getMonth() + 1}월 ${unlockAt.getDate()}일 04:00`
    : '';
  const [showLockInfo, setShowLockInfo] = useState(false);
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
      playLoseSfx();
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
    playSuccessSfx();
    if (u.settings.vibration) vibrate([20, 30, 20]);
    setMissionModal(null);
  }

  function toggleSuccess(idx: number) {
    u.toggleMissionSuccess(idx);
    playClickSfx();
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
    playClickSfx();
  }

  // ESC로 모달 닫기 (양심 / 미션)
  useEscape(showHeartModal, () => { setShowHeartModal(false); setPendingHeartIdx(null); });
  useEscape(missionModal !== null, () => { setMissionModal(null); setChangingFor(null); });
  useEscape(showLockInfo, () => setShowLockInfo(false));

  // 튜토리얼 — 첫 진입 시 1회 노출. tutorialSeen 플래그로 재진입 차단.
  // 노출되는 즉시 tutorialSeen=true 저장 (중간에 닫아도 다음 방문엔 안 뜸).
  // Settings 에서 "다시 보기" 누르면 false 로 리셋되어 다음 /main 진입 시 재실행.
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    if (!u.tutorialSeen) {
      setShowTutorial(true);
      u.update({ tutorialSeen: true });
    }
  }, [u.tutorialSeen]);
  function finishTutorial() {
    setShowTutorial(false);
  }
  function openHelp() {
    // 사용자가 우상단 ? 버튼 클릭 — 튜토리얼 즉시 재실행
    setShowTutorial(true);
    playClickSfx();
  }

  return (
    <main className="relative flex flex-col min-h-full pb-0">
      {/* 상단 정보 */}
      <header className="relative px-5 pt-9 flex items-center justify-between gap-3">
        {/* 우측 상단 도움말 (?) 버튼 — 튜토리얼 재시작. settings.showHelpButton 으로 토글 */}
        {(u.settings.showHelpButton ?? true) && (
          <button
            type="button"
            onClick={openHelp}
            aria-label="도움말 — 튜토리얼 다시 보기"
            className="absolute top-2 right-3 w-7 h-7 grid place-items-center rounded-full bg-white/70 text-text/55 text-[13px] font-bold shadow-soft active:scale-[.95]"
          >?</button>
        )}

        <div className="flex flex-col items-center gap-1">
          <div data-tutorial="hearts" className="flex gap-0">
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
          data-tutorial="totalSaved"
          aria-label="누적 저축액"
          style={{ top: 'calc(36px + (100% - 36px) / 2)' }}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[34px] font-bold leading-none tracking-tight pointer-events-none"
        >
          {u.totalSaved.toLocaleString()}
        </p>

        <Link to="/mypage" data-tutorial="mypage" aria-label="마이페이지" className="flex flex-col items-center gap-0.5">
          <span className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-soft overflow-hidden">
            <img src="/jarin/main_mypage.png" alt="" className="w-9 h-9 object-contain" />
          </span>
          <span className="text-[11px] font-bold text-text">MY</span>
        </Link>
      </header>

      {/* 공지/이벤트 배너 — 활성 공지가 있을 때만 노출 */}
      <AnnouncementBanner />

      {/* 오늘의 절약미션 버튼 — 잠김 상태에선 '인증 완료' 표시 + 04:00 초기화 안내.
          위/아래 패딩을 줄여 미션 버튼은 살짝, 캐릭터 룸은 더 많이 위로 올림. */}
      <section className="px-10 pt-5 pb-2">
        <button
          data-tutorial="missionButton"
          onClick={locked ? () => setShowLockInfo(true) : openMissionModal}
          className={`w-full rounded-full px-5 py-3.5 text-[19px] font-bold shadow-soft active:scale-[.98] transition ${
            locked
              ? 'bg-accent/30 text-text/70 ring-2 ring-accent/30'
              : isConfirmed
                ? 'bg-accent text-accent-soft ring-2 ring-accent/40'
                : 'bg-primary text-text'
          }`}
        >
          {locked
            ? '✓ 오늘 미션 인증 완료'
            : isConfirmed
              ? '✓ 오늘의 절약미션 (진행 중)'
              : '오늘의 절약미션'}
        </button>
        {locked && (
          <p className="mt-2 text-center text-[12px] text-text/55 leading-relaxed">
            다음 미션은 <span className="font-bold text-text/75">{unlockLabel}</span> 에 초기화돼요
          </p>
        )}
      </section>

      {/* 캐릭터 룸 (옷장에서 장착한 것 자동 반영) */}
      <div ref={roomRef} data-tutorial="room" className="relative w-full mt-2">
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
          // 위치 잡는 wrapper(translate -50%,-50%) 와 애니메이션 wrapper(scale/rotate)
          // 를 분리. 단일 element 로 두면 animate-hit-pop 의 transform 이 inline
          // translate 를 override 해서 폭발이 좌상단 기준으로 그려져 살짝 우-하단
          // 으로 밀려 보이는 버그가 있었음. 이중 wrapper 로 두 transform 이 충돌 X.
          <div
            key={hit.tick}
            className="absolute z-20 pointer-events-none"
            style={{ left: hit.x, top: hit.y, transform: 'translate(-50%, -50%)' }}
            aria-hidden
          >
            <div className="animate-hit-pop">
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
          </div>
        )}
        <Link
          to="/shop"
          data-tutorial="shop"
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
            <div className="relative h-7 mb-3">
              {missionModal === 'change' && (
                <button
                  type="button"
                  onClick={() => { setChangingFor(null); setMissionModal('recommend'); }}
                  aria-label="추천으로 돌아가기"
                  className="absolute left-0 top-0 w-9 h-9 grid place-items-center text-text/70"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="15 6 9 12 15 18" />
                  </svg>
                </button>
              )}
              <p className="text-center font-bold text-[18px] tracking-[2px] text-text">
                {missionModal === 'change' ? '미션 변경' : '오늘의 절약 미션'}
              </p>
              <CloseButton
                onClick={() => { setMissionModal(null); setChangingFor(null); }}
                className="absolute right-0 top-0"
              />
            </div>

            {missionModal === 'recommend' && (
              <RecommendPanel
                picks={picks}
                onChange={(idx) => { setChangingFor(idx); setMissionModal('change'); playClickSfx(); }}
                onConfirm={confirmToday}
              />
            )}

            {missionModal === 'change' && (
              <ChangePanel
                filter={filter}
                onFilter={(c) => { setFilter(c); playClickSfx(); }}
                onPick={pickMission}
                onCancel={() => { setChangingFor(null); setMissionModal('recommend'); }}
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

      {/* 양심 0개 도달 — 안내 팝업 (확인 클릭 시 실제 차감 + 양심 복구) */}
      {zeroPenalty && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={applyZeroPenalty}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-6 text-center shadow-2xl border-2 border-pink/30"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[18px] font-bold text-pink">💔 양심을 모두 잃었어요</p>
            <p className="mt-3 text-[14px] text-text/85 leading-relaxed">
              돈 모으기 힘들죠?<br />
              아래 코인을 돌려놓고 다시 시작해요.
            </p>
            <div className="mt-4 bg-white rounded-2xl px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text/55">차감 예정 코인</span>
                <span className="font-bold text-pink text-[15px]">−{zeroPenalty.lost.toLocaleString()}P</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span className="text-text/55">남을 코인</span>
                <span className="font-bold text-text text-[15px]">{zeroPenalty.remain.toLocaleString()}P</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-text/65">확인하면 양심 ♥♥♥ 이 다시 채워져요</p>
            <button
              onClick={applyZeroPenalty}
              className="mt-4 w-full bg-accent text-white font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
            >
              다시 시작하기
            </button>
          </div>
        </div>
      )}

      {/* 코치마크 튜토리얼 — 첫 진입 시 1회. 다른 모달들 위에 표시 */}
      {showTutorial && (
        <TutorialOverlay
          steps={MAIN_TUTORIAL_STEPS}
          onFinish={finishTutorial}
        />
      )}

      {/* 미션 잠김 안내 팝업 — '오늘 미션 인증 완료' 버튼 클릭 시 */}
      {showLockInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={() => setShowLockInfo(false)}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[18px] font-bold text-text">오늘 미션 인증 완료 ✓</p>
            <p className="mt-3 text-[14px] text-text/80 leading-relaxed">
              하루 한 번만 인증할 수 있어요.<br />
              다음 미션은 <span className="font-bold text-text">{unlockLabel}</span> 에<br />
              초기화돼요.
            </p>
            <button
              onClick={() => setShowLockInfo(false)}
              className="mt-5 w-full bg-accent text-white font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
            >
              확인
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
          const m = MISSIONS.find((x) => x.id === id);
          if (!m) return null; // admin 이 삭제한 미션 등 — 안전 폴백
          return (
            <li key={`${id}-${idx}`} className="bg-bg rounded-2xl px-3 py-3 flex items-center gap-3">
              <img src={iconUrl(m.iconKey)} alt="" className="w-[64px] h-[64px] object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text">{m.title}</p>
                <p className="text-[15px] font-bold text-text/80 mt-1">+{m.amount.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-4 shrink-0">
                <span className="bg-pink text-white text-[11px] font-bold px-3 py-0.5 rounded-full">
                  {m.difficulty}
                </span>
                <button
                  onClick={() => onChange(idx)}
                  className="text-[14px] text-text/80 font-bold"
                >변경하기 ⟶</button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 bg-bg rounded-2xl p-3">
        <div className="grid grid-cols-3 gap-1">
          {picks.map((id) => {
            const m = MISSIONS.find((x) => x.id === id);
            if (!m) return null;
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
          className="mt-3 w-full bg-accent text-accent-soft font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
        >
          챌린지 확정하기
        </button>
      </div>
    </>
  );
}

/* ---------- 변경 패널 ---------- */
function ChangePanel({
  filter, onFilter, onPick, onCancel,
}: {
  filter: MissionCategory;
  onFilter: (c: MissionCategory) => void;
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
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
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2 thin-scrollbar">
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
                <div className="flex flex-col items-end gap-4 shrink-0">
                  <span className="bg-pink text-white text-[11px] font-bold px-3 py-0.5 rounded-full">
                    {m.difficulty}
                  </span>
                  <span className="text-[14px] text-text/80 font-bold">변경하기 ⟶</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-3 w-full bg-primary/70 text-text font-bold rounded-full py-2.5 text-[13px] active:scale-[.98]"
      >
        변경 안 하고 돌아가기
      </button>
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
          const m = MISSIONS.find((x) => x.id === id);
          if (!m) return null;
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
            ? 'bg-text/15 text-text/40 cursor-not-allowed'
            : 'bg-accent text-accent-soft active:scale-[.98]'
        }`}
      >
        {successes.length === 0 ? '성공한 미션을 1개 이상 체크해주세요' : '챌린지 완료하기'}
      </button>
    </>
  );
}
