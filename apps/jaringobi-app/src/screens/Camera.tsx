import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TopBar } from '../components/UI';

export default function Camera() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  }

  function submit() {
    // 데모: 실제 구현은 Supabase Storage presigned URL → Edge Fn verify_mission
    nav('/main');
  }

  return (
    <main className="min-h-full pb-10">
      <TopBar back="/main" title="인증하기" />
      <section className="mx-5">
        <div className="aspect-[3/4] bg-white rounded-2xl shadow-soft grid place-items-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="미리보기" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-text/50">
              <p className="text-[40px]">📷</p>
              <p className="text-[12px] mt-2">사진을 선택하면 미리보기가 표시됩니다</p>
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
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>갤러리에서</Button>
          <Button variant="primary" onClick={() => fileRef.current?.click()}>카메라로</Button>
        </div>

        <Button variant="accent" size="lg" className="mt-3" onClick={submit}>
          인증 완료 (+10,000원 / +100P)
        </Button>

        <p className="mt-3 text-[12px] text-text/60 text-center leading-relaxed">
          업로드된 사진의 GPS 정보는 자동 제거되며,<br/>NSFW 자동 검사 후 보상이 지급됩니다.
        </p>
      </section>
    </main>
  );
}
