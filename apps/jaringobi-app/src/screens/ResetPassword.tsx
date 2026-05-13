// 비밀번호 재설정 — 메일 링크에서 도착. URL 의 access_token/refresh_token 또는
// type=recovery 토큰을 Supabase JS 가 자동으로 읽어 임시 세션을 만들어준다.
// 그 임시 세션 위에서 updateUser({ password }) 호출.

import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../lib/auth';
import { getSupabase } from '../lib/supabase';
import { playSuccessSfx } from '../lib/feedback';

export default function ResetPassword() {
  const nav = useNavigate();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);

  // Supabase JS 가 detectSessionInUrl 로 access_token 을 자동 처리.
  // 임시 세션이 잡혔는지 확인. 없으면 잘못된 링크.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setReady(false); return; }
    sb.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pw1 !== pw2) {
      setErr('두 비밀번호가 일치하지 않아요.');
      return;
    }
    if (pw1.length < 6) {
      setErr('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await updatePassword(pw1);
      playSuccessSfx();
      // 비번 바뀐 직후엔 보안상 새 세션이 필요하므로 로그인 화면으로
      const sb = getSupabase();
      if (sb) await sb.auth.signOut();
      alert('비밀번호가 변경됐어요. 새 비밀번호로 다시 로그인해 주세요.');
      nav('/login', { replace: true });
    } catch (e) {
      setErr((e as Error).message ?? '변경에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (ready === null) {
    return (
      <main className="px-7 pt-20 min-h-full bg-bg text-center">
        <p className="text-[14px] text-text/55">확인 중…</p>
      </main>
    );
  }
  if (ready === false) {
    return (
      <main className="px-7 pt-16 min-h-full bg-bg text-center flex flex-col">
        <h1 className="font-bold text-[18px] text-text">잘못된 링크예요</h1>
        <p className="mt-3 text-[13px] text-text/70 leading-relaxed">
          비밀번호 재설정 링크가 만료됐거나 유효하지 않아요.<br />
          처음부터 다시 시도해 주세요.
        </p>
        <button
          onClick={() => nav('/forgot-password', { replace: true })}
          className="mt-6 mx-auto w-full max-w-[260px] bg-primary text-text font-bold rounded-full py-4 text-[15px] active:scale-[.98]"
        >
          비밀번호 찾기로
        </button>
      </main>
    );
  }

  return (
    <main className="px-7 pt-12 pb-10 min-h-full bg-bg flex flex-col">
      <h1 className="text-center font-bold text-[20px] tracking-[6px] text-text">새 비밀번호</h1>

      <div className="mt-10 mx-auto w-[100px] h-[100px] bg-primary rounded-[24px] grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="" className="w-[64%] h-[64%] object-contain" />
      </div>

      <p className="mt-8 text-center text-[13px] text-text/70 leading-relaxed">
        앞으로 사용할 새 비밀번호를 입력해 주세요.<br />
        (6자 이상)
      </p>

      <form className="mt-6 space-y-3" onSubmit={submit}>
        <input
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="새 비밀번호"
          required
          minLength={6}
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          className="w-full bg-white/70 rounded-full px-5 py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium text-center"
        />
        <input
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="새 비밀번호 확인"
          required
          minLength={6}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="w-full bg-white/70 rounded-full px-5 py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium text-center"
        />

        <label className="flex items-center gap-2 justify-center text-[12px] text-text/65">
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
            className="w-4 h-4"
          />
          비밀번호 보기
        </label>

        {err && (
          <p className="text-[12px] text-pink font-bold text-center px-2" role="alert">
            ⚠ {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-text/80 rounded-full px-5 py-4 text-[15px] font-bold transition active:scale-[.98] disabled:opacity-50"
        >
          {busy ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </main>
  );
}
