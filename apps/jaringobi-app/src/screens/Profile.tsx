// 다른 사용자(혹은 본인)의 프로필 보기 페이지. /profile/:nick
// 본인이면 마이페이지로 redirect. 캐릭터 박스 클릭 시에만 방(RoomPreview)이 모달로 노출.

import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fitSrc, TITLES } from '../lib/data';
import { profilesRepo, PublicProfile } from '../lib/profilesRepo';
import { BackButton } from '../components/UI';
import { RoomPreview } from '../components/RoomPreview';
import { TitleIcon } from '../components/TitleIcon';
import { useEscape } from '../lib/useEscape';
import { useUser } from '../lib/userState';

export default function Profile() {
  const { nick: rawNick } = useParams();
  const nick = decodeURIComponent(rawNick ?? '');
  const u = useUser();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [roomOpen, setRoomOpen] = useState(false);
  useEscape(roomOpen, () => setRoomOpen(false));

  useEffect(() => {
    let cancelled = false;
    profilesRepo
      .getByNick(nick)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => { if (!cancelled) setProfile(null); });
    return () => { cancelled = true; };
  }, [nick]);

  // 본인이면 본인 마이페이지로 (Settings 등에서 닉네임을 바꿨어도 정확히 비교)
  if (nick === u.nickname) return <Navigate to="/mypage" replace />;

  if (profile === undefined) {
    return (
      <main className="min-h-full grid place-items-center text-text/55 text-[13px]">
        불러오는 중…
      </main>
    );
  }
  if (profile === null) {
    return (
      <main className="min-h-full grid place-items-center text-text/55 text-[13px]">
        존재하지 않는 사용자
      </main>
    );
  }

  const activeTitle = TITLES.find((t) => t.id === profile.activeTitleId) ?? TITLES[0];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const equippedAcc = profile.equipped.filter(
    (s) => s.startsWith('/shop/clothes/') || s.startsWith('/shop/acc/'),
  );

  return (
    <main className="min-h-full pb-10">
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/talk" />
        <div className="flex justify-center">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt="자린고비"
              className="w-[72px] h-[72px] object-contain"
              draggable={false}
            />
          </Link>
        </div>
      </header>

      <section className="mx-4 bg-grid-paper rounded-[18px] shadow-soft px-4 pt-3 pb-6 relative">
        <div className="absolute -top-2 left-0 right-0 flex justify-around px-6 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-full bg-text/20" />
          ))}
        </div>

        <div className="grid grid-cols-[140px_1fr] gap-4 items-start mt-3">
          <button
            onClick={() => setRoomOpen(true)}
            aria-label={`${profile.nickname} 방 보기`}
            className="aspect-square bg-white rounded-2xl shadow-soft overflow-hidden relative active:scale-[.98] transition"
          >
            <img
              src="/jarin/main_character.png"
              alt={`${profile.nickname} 캐릭터`}
              className="absolute left-1/2 -translate-x-1/2 top-0 h-[200%] w-auto max-w-none pointer-events-none"
              draggable={false}
            />
            {equippedAcc.map((s) => (
              <img
                key={s}
                src={fitSrc(s)}
                alt=""
                className="absolute left-1/2 -translate-x-1/2 top-0 h-[200%] w-auto max-w-none pointer-events-none"
                draggable={false}
              />
            ))}
            <span className="absolute right-1.5 bottom-1.5 bg-text/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              방 보기
            </span>
          </button>
          <div>
            <p className="text-[14px] font-bold text-text">
              30일 챌린지 {profile.day}일차
            </p>
            <div className="mt-2 inline-block bg-primary/70 rounded-full px-5 py-1.5 text-[16px] font-bold text-text">
              {profile.nickname}
            </div>
            <p className="mt-3 text-[15px] font-bold text-text">
              {profile.totalSaved.toLocaleString()}
              <span className="text-text/60"> / {profile.goal.toLocaleString()}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <TitleIcon src={activeTitle.img} size={32} alt={activeTitle.name} />
              <span className="text-[13px] font-bold text-text">{activeTitle.name}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] text-text/55">읽기 전용 프로필</span>
          <span className="text-[14px] font-bold text-text">챌린지 {profile.cycle}회차</span>
        </div>

        <div className="mt-5">
          <h3 className="font-bold tracking-[3px] text-[15px] text-text">RECORD</h3>
          <ul className="mt-2 grid grid-cols-6 gap-x-2 gap-y-3">
            {days.map((d) => (
              <li key={d} className="flex flex-col items-center">
                <div className="w-full aspect-square rounded-md bg-text/65" />
                <span className="mt-1 text-[12px] font-bold text-text">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 캐릭터 방 모달 */}
      {roomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 grid place-items-center px-5"
          onClick={() => setRoomOpen(false)}
        >
          <div
            className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <p className="text-center font-bold text-[16px] text-text">
                {profile.nickname} 의 방
              </p>
              <button
                onClick={() => setRoomOpen(false)}
                aria-label="닫기"
                className="absolute right-0 top-0 w-9 h-9 grid place-items-center text-[24px] leading-none text-text/70 font-bold"
              >×</button>
            </div>
            <div className="mt-4">
              <RoomPreview equipped={profile.equipped} className="mx-auto w-full" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
