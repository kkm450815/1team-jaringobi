import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/auth';

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function SocialButton({
  label, bg = 'bg-white', children, onClick,
}: { label: string; bg?: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-12 h-12 rounded-full ${bg} grid place-items-center shadow-soft active:scale-[.95] transition`}
    >
      {children}
    </button>
  );
}

export default function Login() {
  const nav = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthErr, setOauthErr] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    nav('/mode');
  }

  async function handleGoogle() {
    if (oauthBusy) return;
    setOauthBusy(true);
    setOauthErr(null);
    try {
      // 성공 시 페이지가 Google → Supabase callback → /mode 로 자동 이동.
      // 이 함수는 redirect 직전까지만 동작.
      await signInWithGoogle('/mode');
    } catch (e) {
      console.error('[Login.handleGoogle] 실패', e);
      setOauthErr((e as Error).message ?? '로그인에 실패했어요.');
      setOauthBusy(false);
    }
  }

  return (
    <main className="px-7 pt-14 pb-10 min-h-full flex flex-col bg-bg">
      <h1 className="text-center font-bold text-[28px] tracking-[10px] text-text">자 린 고 비</h1>

      <div className="mt-8 mx-auto w-[140px] h-[140px] bg-primary rounded-[28px] grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="굴비" className="w-[68%] h-[68%] object-contain" />
      </div>

      <form className="mt-12 space-y-3" onSubmit={submit}>
        <input
          type="text"
          placeholder="아이디"
          required
          className="w-full bg-white/70 rounded-full px-5 py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium text-center"
        />

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="비밀번호"
            required
            className="w-full bg-white/70 rounded-full py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium pl-12 pr-12 text-center"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-text/60"
            aria-label="비밀번호 보기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {showPw ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                <>
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.77 19.77 0 0 1-3.17 4.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            </svg>
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-text/80 rounded-full px-5 py-4 text-[15px] font-bold transition active:scale-[.98]"
        >
          로그인
        </button>
      </form>

      <button
        type="button"
        onClick={() => alert('비밀번호 재설정은 곧 지원 예정입니다.')}
        className="mt-5 text-center text-[13px] text-text/70 underline-offset-2 hover:underline"
      >
        비밀번호를 잊으셨나요?
      </button>

      {/* TODO: 임시 데모 접속 — 출시 전 제거 */}
      <button
        type="button"
        onClick={() => nav('/mode')}
        className="mt-3 self-center text-[12px] text-text/55 underline underline-offset-2"
      >
        데모로 접속하기
      </button>

      <div className="mt-auto pt-10">
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-t border-text/20" />
          <span className="text-[12px] text-text/55">소셜 계정으로 로그인</span>
          <hr className="flex-1 border-t border-text/20" />
        </div>
        <div className="mt-4 flex justify-center gap-5">
          <SocialButton label="Google로 로그인" onClick={handleGoogle}>
            <GoogleIcon />
          </SocialButton>
        </div>
        {oauthBusy && (
          <p className="mt-3 text-center text-[12px] text-text/55">로그인 중…</p>
        )}
        {oauthErr && (
          <p className="mt-3 text-center text-[12px] text-pink font-bold" role="alert">
            ⚠ {oauthErr}
          </p>
        )}
      </div>
    </main>
  );
}
