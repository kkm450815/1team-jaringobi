import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MISSIONS } from '../lib/data';
import { BackButton } from '../components/UI';
import { downscaleImage, useUser } from '../lib/userState';

function iconUrl(key: string) {
  return `/jarin/chall/icon/chall_list_${key}.png`;
}

export default function Camera() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<{ saved: number; coins: number; cycleEnded: boolean } | null>(null);
  const u = useUser();

  // 하드 모드(goal>=100만): picks 합계, 노말: goal/30
  const expectedReward = u.goal >= 1_000_000
    ? u.missionPicks.reduce(
        (sum, id) => sum + (MISSIONS.find((m) => m.id === id)?.amount ?? 0),
        0,
      )
    : Math.round(u.goal / 30);

  const todayMissions = u.missionPicks
    .map((id) => MISSIONS.find((m) => m.id === id))
    .filter((m): m is (typeof MISSIONS)[number] => !!m);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const dataUrl = await downscaleImage(f, 320);
      setPreview(dataUrl);
    } catch {
      // ignore for demo
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!preview || busy) return;
    const r = u.savePhoto(preview);
    setReward({ saved: r.reward, coins: r.coins, cycleEnded: r.cycleEnded });
  }

  function closeRewardAndContinue() {
    setReward(null);
    // 메인으로 돌아가서 자동으로 새 미션 추천 패널 열기
    nav('/main', { state: { autoMissionModal: true } });
  }

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
                <p className="mt-8 text-center text-text/55 text-[13px] leading-relaxed">
                  아직 선택한 미션이 없어요.<br />
                  메인의 ‘오늘의 절약미션’에서 골라주세요.
                </p>
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

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="hidden"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-white text-text border border-text/15 rounded-2xl py-3 font-bold active:scale-[.98]"
          >갤러리에서</button>
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-primary text-text rounded-2xl py-3 font-bold active:scale-[.98]"
          >카메라로</button>
        </div>

        <button
          onClick={submit}
          disabled={!preview || busy}
          className="mt-3 w-full bg-accent text-white font-bold rounded-full py-3.5 text-[15px] active:scale-[.98] disabled:opacity-40"
        >
          {busy ? '준비 중…' : `인증 완료 (+${expectedReward.toLocaleString()}원 / +100P)`}
        </button>

        <p className="mt-3 text-[12px] text-text/60 text-center leading-relaxed">
          저장한 사진은 마이페이지의 RECORD에서 일자별로 확인할 수 있어요.
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
            <button
              onClick={closeRewardAndContinue}
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
