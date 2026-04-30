import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/UI';

export default function Login() {
  const nav = useNavigate();
  const [showPw, setShowPw] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    nav('/mode');
  }

  return (
    <main className="px-7 pt-14 pb-10 min-h-full flex flex-col">
      <h1 className="text-center font-bold text-[28px] tracking-[10px]">자 린 고 비</h1>

      <div className="mt-6 mx-auto w-full max-w-[260px] aspect-square bg-primary rounded-3xl grid place-items-center shadow-soft">
        <img src="/jarin/logo_nobg.png" alt="굴비" className="w-[60%] h-[60%] object-contain" />
      </div>

      <form className="mt-7 space-y-3" onSubmit={submit}>
        <input
          type="email"
          placeholder="이메일"
          required
          className="w-full bg-white rounded-full px-5 py-3.5 outline-none placeholder:text-text/40"
        />
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="비밀번호"
            required
            className="w-full bg-white rounded-full px-5 py-3.5 outline-none placeholder:text-text/40 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text/60 text-[18px]"
            aria-label="비밀번호 보기"
          >
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
        <Button type="submit" variant="primary" size="lg">로그인</Button>
      </form>

      <button className="mt-3 text-center text-[13px] text-text/60 underline">
        비밀번호를 잊으셨나요?
      </button>

      <div className="mt-auto pt-8">
        <p className="text-center text-[12px] text-text/50 mb-3">소셜 계정으로 빠르게</p>
        <div className="flex justify-center gap-3">
          <button className="w-12 h-12 rounded-full bg-[#FEE500] grid place-items-center font-bold">K</button>
          <button className="w-12 h-12 rounded-full bg-white grid place-items-center font-bold">G</button>
          <button className="w-12 h-12 rounded-full bg-black text-white grid place-items-center font-bold">A</button>
        </div>
      </div>
    </main>
  );
}
