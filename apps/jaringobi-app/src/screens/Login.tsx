import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();
  const [showPw, setShowPw] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    nav('/mode');
  }

  return (
    <main className="px-7 pt-14 pb-10 min-h-full flex flex-col bg-bg">
      <h1 className="text-center font-bold text-[28px] tracking-[10px] text-text">자 린 고 비</h1>

      <div className="mt-8 mx-auto w-[140px] h-[140px] bg-primary rounded-[28px] grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="굴비" className="w-[68%] h-[68%] object-contain" />
      </div>

      <form className="mt-12 space-y-3" onSubmit={submit}>
        <button
          type="button"
          className="w-full bg-white/70 rounded-full px-5 py-4 text-[14px] text-text/70 font-medium"
        >
          소셜 계정으로 로그인
        </button>

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="비밀번호"
            required
            className="w-full bg-white/70 rounded-full px-5 py-4 outline-none text-[14px] text-text placeholder:text-text/70 placeholder:font-medium pr-12 text-center"
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

      <hr className="mt-8 border-t border-text/20" />

      <button className="mt-5 text-center text-[13px] text-text/70">
        비밀번호를 잊으셨나요?
      </button>
    </main>
  );
}
