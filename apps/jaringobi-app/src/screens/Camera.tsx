import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { downscaleImage, useUser } from '../lib/userState';

export default function Camera() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const u = useUser();

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
    if (!preview) return;
    u.savePhoto(preview);
    nav('/mypage');
  }

  return (
    <main className="min-h-full pb-10">
      <header className="relative pt-10 pb-3">
        <Link
          to="/main"
          aria-label="뒤로"
          className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-[44px] leading-none text-text/80 font-bold"
        >‹</Link>
        <h1 className="text-center font-bold text-[18px] tracking-[3px] text-text">
          {u.day}일차 인증하기
        </h1>
      </header>

      <section className="mx-5">
        <div className="aspect-[3/4] bg-white rounded-2xl shadow-soft grid place-items-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="미리보기" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-text/50 px-6">
              <p className="text-[44px]">📷</p>
              <p className="text-[13px] mt-2">절약 인증 사진을 골라주세요</p>
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
          {busy ? '준비 중…' : '인증 완료 (+10,000원 / +100P)'}
        </button>

        <p className="mt-3 text-[12px] text-text/60 text-center leading-relaxed">
          저장한 사진은 마이페이지의 RECORD에서 일자별로 확인할 수 있어요.
        </p>
      </section>
    </main>
  );
}
