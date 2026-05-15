import { FormEvent, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../lib/auth';
import { playSuccessSfx } from '../lib/feedback';

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
  label, bg = 'bg-white', children, onClick, disabled,
}: { label: string; bg?: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${bg} rounded-full px-5 py-3.5 flex items-center justify-center gap-3 shadow-soft text-[15px] font-bold text-text active:scale-[.98] transition disabled:opacity-50`}
    >
      <span className="grid place-items-center">{children}</span>
      <span>{label}</span>
    </button>
  );
}

type Mode = 'login' | 'signup';

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);

  // 비밀 데모 진입 — 타이틀 7번 탭 (3초 내). 관리자/QA 전용.
  // 일반 사용자에겐 노출 안 됨.
  const tapsRef = useRef<number[]>([]);
  function onSecretTap() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 3000), now];
    if (tapsRef.current.length >= 7) {
      tapsRef.current = [];
      nav('/mode');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        await signInWithPassword(email, password);
        // 세션 OK → /mode 로 (신규는 거기서 닉네임 단계까지)
        nav('/mode', { replace: true });
      } else {
        const { needsEmailConfirm } = await signUpWithPassword(email, password);
        if (needsEmailConfirm) {
          // Supabase 콘솔의 "Confirm email" 이 ON 인 경우. 정책상 즉시 로그인 불가.
          // 베타·데모 단계엔 콘솔에서 끄는 걸 권장. (docs/SUPABASE.md 참고)
          setInfo(`${email.trim()} 로 인증 메일을 보냈어요. 메일의 링크를 눌러 확인 후 로그인해 주세요.`);
          setMode('login');
        } else {
          // Confirm email OFF — 가입 즉시 세션 발급, 바로 /mode 로
          playSuccessSfx();
          nav('/mode', { replace: true });
        }
      }
    } catch (e) {
      const raw = (e as Error).message ?? '실패했어요.';
      // Supabase 에러 메시지를 한국어로 가볍게 매핑
      const friendly = friendlyAuthError(raw);
      setErr(friendly);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (oauthBusy) return;
    setOauthBusy(true);
    setErr(null);
    try {
      await signInWithGoogle('/mode');
    } catch (e) {
      console.error('[Login.handleGoogle] 실패', e);
      setErr((e as Error).message ?? '로그인에 실패했어요.');
      setOauthBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErr(null);
    setInfo(null);
  }

  return (
    <main className="px-7 pt-14 pb-10 min-h-full flex flex-col bg-bg">
      {/* 타이틀 — 7번 빠르게 탭 시 데모(/mode) 진입. 관리자·QA 용 숨김 게이트. */}
      <h1
        onClick={onSecretTap}
        className="text-center font-bold text-[28px] tracking-[10px] text-text select-none cursor-default"
      >자 린 고 비</h1>

      <div className="mt-8 mx-auto w-[140px] h-[140px] bg-primary rounded-[28px] grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="굴비" className="w-[68%] h-[68%] object-contain" />
      </div>

      {/* 로그인 / 회원가입 토글 */}
      <div className="mt-10 flex items-center gap-0 bg-white/40 rounded-full p-1 shadow-soft">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 py-2 rounded-full text-[14px] font-bold transition ${
            mode === 'login' ? 'bg-primary text-text shadow-soft' : 'text-text/55'
          }`}
        >로그인</button>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={`flex-1 py-2 rounded-full text-[14px] font-bold transition ${
            mode === 'signup' ? 'bg-primary text-text shadow-soft' : 'text-text/55'
          }`}
        >회원가입</button>
      </div>

      <form className="mt-5 space-y-3" onSubmit={submit}>
        <input
          type="email"
          autoComplete="email"
          placeholder="이메일"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/70 rounded-full px-5 py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium text-center"
        />

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {err && (
          <p className="text-[12px] text-pink font-bold text-center px-2" role="alert">
            ⚠ {err}
          </p>
        )}
        {info && (
          <p className="text-[12px] text-text/70 text-center px-2 leading-relaxed bg-amber-100/60 rounded-2xl py-2">
            📩 {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-text/80 rounded-full px-5 py-4 text-[15px] font-bold transition active:scale-[.98] disabled:opacity-50"
        >
          {busy ? (mode === 'login' ? '로그인 중…' : '가입 중…') : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        {mode === 'login' && (
          <div className="text-center pt-1">
            <Link
              to="/forgot-password"
              className="text-[12px] text-text/55 underline underline-offset-2"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        )}
      </form>

      {/* 소셜 로그인 — 이전엔 mt-auto 로 화면 맨 아래에 작은 아이콘만 두었다가,
          누르기 어려워서 폼 바로 아래로 올리고 큰 풀폭 버튼으로 변경. */}
      <div className="mt-8 pb-10">
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-t border-text/20" />
          <span className="text-[12px] text-text/55">소셜 계정으로 로그인</span>
          <hr className="flex-1 border-t border-text/20" />
        </div>
        <div className="mt-4">
          <SocialButton label="Google로 로그인" onClick={handleGoogle} disabled={oauthBusy}>
            <GoogleIcon />
          </SocialButton>
        </div>
        {oauthBusy && (
          <p className="mt-3 text-center text-[12px] text-text/55">로그인 중…</p>
        )}
      </div>
    </main>
  );
}

/** Supabase 에러 메시지를 사용자 친화적 한국어로 변환 */
function friendlyAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return '이미 가입된 이메일이에요. 로그인 탭으로 진행해 주세요.';
  }
  if (m.includes('email not confirmed')) {
    return '메일 인증이 필요해요. 받은 메일의 링크를 눌러 확인해 주세요.';
  }
  if (m.includes('password should be')) {
    return '비밀번호는 6자 이상이어야 해요.';
  }
  if (m.includes('rate limit')) {
    return '너무 자주 시도했어요. 잠시 후 다시 시도해 주세요.';
  }
  return raw;
}
