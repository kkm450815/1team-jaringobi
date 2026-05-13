import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MISSIONS, TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { downscaleImage, isMissionLocked, nextMissionAvailableAt, useUser } from '../lib/userState';
import { playClickSfx, playSuccessSfx, vibrate } from '../lib/feedback';
import { useEscape } from '../lib/useEscape';

function iconUrl(key: string) {
  return `/jarin/chall/icon/chall_list_${key}.png`;
}

export default function Camera() {
  const nav = useNavigate();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [reward, setReward] = useState<{
    saved: number;
    coins: number;
    cycleEnded: boolean;
    newlyEarnedTitles: string[];
  } | null>(null);
  // 회차 완료 시 사진들이 초기화되기 직전의 스냅샷 — 사용자에게 캡처/저장 유도
  const [archive, setArchive] = useState<{
    cycle: number;
    photos: Record<number, string>;
    totalSaved: number;
  } | null>(null);
  const u = useUser();

  // 하드 모드(goal>=100만): 확정된 미션 합계, 노말: goal/30.
  // savePhoto 의 폴백과 일치: confirmed 비어 있으면 picks 합산 (사용자에게 0원 표시 후
  // 실제 보상은 다르게 들어가던 불일치 방지).
  const rewardIds = u.missionConfirmed.length > 0 ? u.missionConfirmed : u.missionPicks;
  const expectedReward = u.goal >= 1_000_000
    ? rewardIds.reduce(
        (sum, id) => sum + (MISSIONS.find((m) => m.id === id)?.amount ?? 0),
        0,
      )
    : Math.round(u.goal / 30);

  const todayMissions = u.missionConfirmed
    .map((id) => MISSIONS.find((m) => m.id === id))
    .filter((m): m is (typeof MISSIONS)[number] => !!m);

  // 오늘의 챌린지를 아직 확정하지 않은 채 카메라 진입(예: 탭바 직접 클릭) → 알림 모달 노출
  const needConfirm = u.missionConfirmed.length === 0 && !preview;
  useEscape(needConfirm, () => nav('/main', { replace: true }));

  // 마지막 인증 후 다음 새벽 4시까지 잠김 — Main 에서 막지만 직접 url 진입 대비.
  const locked = isMissionLocked(u.lastSavedAt) && !preview && !reward;
  const unlockAt = nextMissionAvailableAt(u.lastSavedAt);
  const unlockLabel = unlockAt
    ? `${unlockAt.getMonth() + 1}월 ${unlockAt.getDate()}일 04:00`
    : '';
  useEscape(locked, () => nav('/main', { replace: true }));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setPickError(null);
    try {
      // 줌 모달에서 봐도 너무 흐릿하지 않게 512px 로 (이전 320 → 512). JPEG 0.8.
      const dataUrl = await downscaleImage(f, 512);
      setPreview(dataUrl);
      playClickSfx();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '이미지를 처리하지 못했어요';
      setPickError(`사진 불러오기 실패: ${msg}`);
    } finally {
      setBusy(false);
    }
    // 같은 파일 재선택 가능하도록 input value 비우기
    e.target.value = '';
  }

  function submit() {
    if (!preview || busy) return;
    const r = u.savePhoto(preview);
    setReward({
      saved: r.reward,
      coins: r.coins,
      cycleEnded: r.cycleEnded,
      newlyEarnedTitles: r.newlyEarnedTitles,
    });
    if (r.archive) setArchive(r.archive);
    playSuccessSfx();
    if (u.settings.vibration) vibrate(r.cycleEnded ? [20, 60, 20, 60, 60] : [30, 40, 30]);
  }

  function closeRewardAndContinue() {
    // 회차 완료(archive 있음)면 보상 모달 닫기 → archive 화면 노출
    // 아니면 곧장 마이페이지로 이동
    setReward(null);
    if (!archive) {
      nav('/mypage', { replace: true });
    }
  }

  function closeArchive() {
    setArchive(null);
    nav('/mypage', { replace: true });
  }

  async function shareArchive() {
    if (!archive) return;
    const text = `🎉 자린고비 ${archive.cycle}회차 30일 챌린지 완주!\n` +
      `누적 절약: ${archive.totalSaved.toLocaleString()}원\n` +
      `${u.nickname} 의 자린고비 일기`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: '자린고비', text }); return; } catch { /* cancelled */ }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(text); alert('내용이 클립보드에 복사됐어요'); return; } catch { /* ignore */ }
    }
    alert(text);
  }

  useEscape(reward !== null, closeRewardAndContinue);
  useEscape(archive !== null && reward === null, closeArchive);

  return (
    <main className="min-h-full pb-10">
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/main" />
        <h1 className="text-center font-bold text-[18px] tracking-[3px] text-text">
          {u.day}일차 인증하기
        </h1>
      </header>

      <section className="mx-5">
        <div className="aspect-[3/4] bg-white rounded-2xl shadow-soft overflow-hidden">
          {preview ? (
            <img src={preview} alt="미리보기" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col p-4 overflow-y-auto">
              <p className="text-center font-bold text-[15px] text-text tracking-[2px]">
                오늘의 챌린지
              </p>
              {todayMissions.length === 0 ? (
                <div className="mt-8 text-center text-text/55 text-[13px] leading-relaxed">
                  <p>
                    아직 선택한 미션이 없어요.<br />
                    메인의 ‘오늘의 절약미션’에서 골라주세요.
                  </p>
                  <Link
                    to="/main"
                    className="mt-4 inline-block bg-accent text-white text-[14px] font-bold rounded-full px-5 py-2"
                  >
                    메인으로
                  </Link>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {todayMissions.map((m) => (
                    <li key={m.id} className="bg-bg rounded-2xl px-3 py-2.5 flex items-center gap-3">
                      <img
                        src={iconUrl(m.iconKey)}
                        alt=""
                        className="w-12 h-12 object-contain shrink-0"
                        onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-text leading-tight">{m.title}</p>
                        <p className="text-[13px] font-bold text-text/75 mt-0.5">+{m.amount.toLocaleString()}원</p>
                      </div>
                      <span className="bg-pink text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                        {m.difficulty}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-auto pt-4 text-center text-[12px] text-text/55 leading-relaxed">
                절약 인증 사진을 골라주세요
              </p>
            </div>
          )}
        </div>

        {/* 갤러리: 단순 파일 선택 (capture 미지정 → 모바일에서 갤러리 우선) */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
        {/* 카메라: capture="environment" → 모바일에서 후면 카메라 직접 실행 */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="hidden"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => galleryRef.current?.click()}
            className="bg-white text-text border border-text/15 rounded-2xl py-3 font-bold active:scale-[.98]"
          >갤러리에서</button>
          <button
            onClick={() => cameraRef.current?.click()}
            className="bg-primary text-text rounded-2xl py-3 font-bold active:scale-[.98]"
          >카메라로</button>
        </div>

        {pickError && (
          <p className="mt-2 text-[12px] text-pink text-center" role="alert">
            {pickError}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!preview || busy}
          className="mt-3 w-full bg-accent text-white font-bold rounded-full py-3.5 text-[15px] active:scale-[.98] disabled:opacity-40"
        >
          {busy ? '준비 중…' : `절약 인증하고 +${expectedReward.toLocaleString()}원 받기`}
        </button>

        <p className="mt-3 text-[12px] text-text/60 text-center leading-relaxed">
          저장한 사진은 마이페이지의 RECORD에서 일자별로 확인할 수 있어요.<br />
          ※ 사진 인증을 해야만 다음 일자로 넘어갑니다.
        </p>
      </section>

      {/* 인증 성공 축하 팝업 */}
      {reward && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={closeRewardAndContinue}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-bold text-accent tracking-[2px]">
              CONGRATULATIONS
            </p>
            <p className="mt-2 text-[18px] font-bold text-text">
              {reward.cycleEnded ? '🎉 30일 챌린지 완주!' : '오늘의 챌린지 인증 완료!'}
            </p>
            {reward.cycleEnded && (
              <p className="mt-1 text-[12px] text-text/65 leading-relaxed">
                새 회차가 시작됩니다. 양심 ♥♥♥도 다시 채워졌어요.
              </p>
            )}
            <div className="mt-5 bg-white rounded-2xl py-4 px-3 shadow-soft">
              <p className="text-[12px] text-text/60">오늘 절약한 금액</p>
              <p className="mt-1 text-[26px] font-bold text-text">
                +{reward.saved.toLocaleString()}원
              </p>
              <div className="mt-2 h-px bg-text/10" />
              <p className="mt-2 text-[12px] text-text/60">적립 포인트</p>
              <p className="mt-1 text-[18px] font-bold text-accent">
                +{reward.coins}P
              </p>
            </div>

            {/* 칭호 자동 획득 — savePhoto 가 반환한 newlyEarnedTitles 가 있을 때만 노출 */}
            {reward.newlyEarnedTitles.length > 0 && (
              <div className="mt-3 bg-accent/15 border-2 border-accent/40 rounded-2xl py-3 px-3">
                <p className="text-[12px] font-bold text-accent">🏅 새 칭호 획득!</p>
                <div className="mt-2 space-y-2">
                  {reward.newlyEarnedTitles.map((tid) => {
                    const t = TITLES.find((x) => x.id === tid);
                    if (!t) return null;
                    return (
                      <div key={tid} className="flex items-center gap-2 text-left">
                        <img
                          src={t.img}
                          alt=""
                          className="w-10 h-10 object-contain shrink-0"
                          onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-text leading-tight">{t.name}</p>
                          <p className="text-[11px] text-text/65 mt-0.5 leading-tight">{t.tagline}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={closeRewardAndContinue}
              className="mt-5 w-full bg-accent text-white font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 잠김 상태로 카메라 진입 시 안내 모달 — needConfirm 보다 우선 */}
      {locked && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={() => nav('/main', { replace: true })}
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
              onClick={() => nav('/main', { replace: true })}
              className="mt-5 w-full bg-accent text-white font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
            >
              메인으로 가기
            </button>
          </div>
        </div>
      )}

      {/* 미션 확정 안 한 상태로 카메라 진입 시 안내 모달 */}
      {needConfirm && !locked && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={() => nav('/main', { replace: true })}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[18px] font-bold text-text">잠깐!</p>
            <p className="mt-3 text-[14px] text-text/80 leading-relaxed">
              오늘의 챌린지를 먼저 확정한 뒤<br />
              인증해주세요.
            </p>
            <button
              onClick={() => nav('/main', { replace: true })}
              className="mt-5 w-full bg-accent text-white font-bold rounded-full py-3 text-[15px] active:scale-[.98]"
            >
              메인으로 가기
            </button>
          </div>
        </div>
      )}

      {/* 회차 완주 후 — 사진 사라지기 전 캡처/저장 안내 화면 */}
      {archive && reward === null && (
        <div
          className="fixed inset-0 z-50 bg-black/55 grid place-items-center px-4 py-6 overflow-y-auto"
          onClick={closeArchive}
        >
          <div
            className="w-full max-w-[360px] bg-bg rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-[14px] font-bold text-accent tracking-[2px]">
              🎉 30일 완주 기록
            </p>
            <p className="mt-2 text-center text-[12px] text-text/65 leading-relaxed">
              다음 회차가 시작되면 사진들이 초기화돼요.<br />
              <span className="font-bold text-text">화면을 캡처해 저장</span>해주세요!
            </p>
            <p className="mt-2 text-center text-[11px] text-text/55 leading-relaxed bg-amber-100/60 rounded-lg py-2 px-3">
              💾 잊지 않게 <Link to="/settings" className="font-bold underline text-text/80">설정 → 데이터 백업</Link> 도
              한 번 받아두세요. 다른 기기로 옮기거나 브라우저 캐시가 지워져도 복원 가능해요.
            </p>

            {/* 노트 카드 — 마이페이지와 비슷한 레이아웃 */}
            <div className="mt-4 bg-grid-paper rounded-2xl shadow-soft px-4 pt-4 pb-5 relative">
              <div className="absolute -top-2 left-0 right-0 flex justify-around px-6 pointer-events-none">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full bg-text/20" />
                ))}
              </div>

              <div className="flex items-center gap-3 mt-1">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-soft overflow-hidden relative shrink-0">
                  <img
                    src="/jarin/main_character.png"
                    alt=""
                    className="absolute left-1/2 -translate-x-1/2 top-0 h-[200%] w-auto max-w-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-text truncate">{u.nickname}</p>
                  <p className="text-[11px] text-text/65">자린고비 {archive.cycle}회차 완료</p>
                  <p className="text-[14px] font-bold text-accent mt-0.5">
                    누적 {archive.totalSaved.toLocaleString()}원
                  </p>
                </div>
              </div>

              <h3 className="mt-4 font-bold tracking-[3px] text-[13px] text-text">RECORD</h3>
              <ul className="mt-2 grid grid-cols-6 gap-x-1.5 gap-y-2">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
                  const photo = archive.photos[d];
                  return (
                    <li key={d} className="flex flex-col items-center">
                      <div className={`w-full aspect-square rounded-md overflow-hidden ${photo ? 'bg-white' : 'bg-text/65'}`}>
                        {photo && (
                          <img src={photo} alt={`${d}일차`} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="mt-0.5 text-[10px] font-bold text-text">{d}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={shareArchive}
                className="flex-1 bg-primary/70 text-text font-bold rounded-2xl py-3 text-[14px] active:scale-[.98]"
              >
                공유
              </button>
              <button
                onClick={closeArchive}
                className="flex-1 bg-accent text-white font-bold rounded-2xl py-3 text-[14px] active:scale-[.98]"
              >
                다음 회차로
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
