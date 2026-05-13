// 비밀번호 찾기 — 이메일 입력 → Supabase 가 recovery 메일 발송 → 사용자가
// 메일 링크 클릭 → /reset-password 로 이동해 새 비번 설정.

import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../lib/auth';
import { BackButton } from '../components/UI';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await requestPasswordReset(email);
      setSentTo(email.trim());
    } catch (e) {
      const raw = (e as Error).message ?? '발송에 실패했어요.';
      setErr(friendlyResetError(raw));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-7 pt-10 pb-10 min-h-full flex flex-col bg-bg">
      <header className="relative">
        <BackButton className="absolute left-[-12px] top-0 w-12 h-12 grid place-items-center text-text/80" fallback="/login" />
        <h1 className="text-center font-bold text-[20px] tracking-[6px] text-text">비밀번호 찾기</h1>
      </header>

      <div className="mt-12 mx-auto w-[100px] h-[100px] bg-primary rounded-[24px] grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="" className="w-[64%] h-[64%] object-contain" />
      </div>

      {sentTo ? (
        <div className="mt-10 text-center">
          <p className="text-[15px] font-bold text-text">📩 메일을 보냈어요</p>
          <p className="mt-3 text-[13px] text-text/70 leading-relaxed bg-amber-100/60 rounded-2xl py-3 px-4">
            <span className="font-bold text-text">{sentTo}</span> 로<br />
            비밀번호 재설정 링크를 보냈어요.<br />
            메일을 열어 <span className="font-bold">"비밀번호 재설정"</span> 링크를 눌러주세요.
          </p>
          <p className="mt-4 text-[12px] text-text/55 leading-relaxed">
            메일이 안 보이면 스팸함도 확인해 보세요.<br />
            5분 이상 지났는데도 안 오면 이메일을 다시 확인해 주세요.
          </p>
          <button
            onClick={() => nav('/login')}
            className="mt-6 w-full bg-primary text-text font-bold rounded-full py-4 text-[15px] active:scale-[.98]"
          >
            로그인 화면으로
          </button>
        </div>
      ) : (
        <>
          <p className="mt-10 text-center text-[13px] text-text/70 leading-relaxed">
            가입한 이메일을 입력하시면<br />
            비밀번호 재설정 링크를 보내드려요.
          </p>

          <form className="mt-6 space-y-3" onSubmit={submit}>
            <input
              type="email"
              autoComplete="email"
              placeholder="이메일"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/70 rounded-full px-5 py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium text-center"
            />

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
              {busy ? '발송 중…' : '재설정 메일 보내기'}
            </button>
          </form>

          <Link
            to="/login"
            className="mt-4 self-center text-[12px] text-text/55 underline underline-offset-2"
          >
            로그인 화면으로 돌아가기
          </Link>
        </>
      )}
    </main>
  );
}

function friendlyResetError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) {
    return '너무 자주 시도했어요. 1~2분 후 다시 시도해 주세요.';
  }
  if (m.includes('user not found') || m.includes('not found')) {
    return '해당 이메일로 가입된 계정이 없어요.';
  }
  return raw;
}
