// 닉네임 입력 단계 — Login/ModeSelect 후 메인 진입 전에 닉을 정함.
// 이미 기본값('자린이')이 아닌 닉을 가졌으면 자동으로 메인으로 (Settings에서 재진입 가능 위해 force prop 없음).

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useUser } from '../lib/userState';
import { playSuccessSfx } from '../lib/feedback';

const MAX_NICK = 10;

export default function NickSetup() {
  const nav = useNavigate();
  const u = useUser();
  const [draft, setDraft] = useState(u.nickname === '자린이' ? '' : u.nickname);
  const [error, setError] = useState<string | null>(null);

  // 이미 닉을 정한 사용자가 직접 URL 진입했으면 메인으로
  if (u.nickname && u.nickname !== '자린이') {
    return <Navigate to="/main" replace />;
  }

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('닉네임을 입력해주세요');
      return;
    }
    if (trimmed.length < 2) {
      setError('닉네임은 2자 이상이어야 해요');
      return;
    }
    u.setNickname(trimmed);
    playSuccessSfx();
    nav('/main', { replace: true });
  }

  return (
    <main className="min-h-full px-6 pt-12 pb-10 flex flex-col">
      <div className="flex justify-center">
        <img
          src="/jarin/logo_nobg.png"
          alt="자린고비"
          className="w-[88px] h-[88px] object-contain"
          draggable={false}
        />
      </div>

      <h1 className="mt-8 text-center font-bold text-[22px] text-text">반가워요!</h1>
      <p className="mt-2 text-center text-[14px] text-text/70 leading-relaxed">
        수다방·랭킹에서 보일 닉네임을<br />
        정해주세요
      </p>

      <div className="mt-8">
        <input
          autoFocus
          value={draft}
          onChange={(e) => { setDraft(e.target.value.slice(0, MAX_NICK)); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="예: 절약왕"
          className="w-full bg-white rounded-2xl px-4 py-3.5 text-[16px] text-text outline-none shadow-soft text-center"
        />
        <p className="mt-2 text-[11px] text-text/55 text-center">
          최대 10자 · 마이페이지에서 언제든 변경 가능
        </p>
        {error && (
          <p className="mt-2 text-[12px] text-pink font-bold text-center" role="alert">
            ⚠ {error}
          </p>
        )}
      </div>

      <button
        onClick={submit}
        disabled={!draft.trim()}
        className={`mt-8 w-full rounded-full py-3.5 text-[15px] font-bold transition ${
          draft.trim()
            ? 'bg-accent text-white active:scale-[.98]'
            : 'bg-text/15 text-text/40 cursor-not-allowed'
        }`}
      >
        시작하기
      </button>
    </main>
  );
}
