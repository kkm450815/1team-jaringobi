import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser, UserSettings } from '../lib/userState';

const APP_VERSION = '0.1.0';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-text/25'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function Row({
  label, sub, right, onClick,
}: { label: string; sub?: string; right?: React.ReactNode; onClick?: () => void }) {
  const Tag: 'button' | 'div' = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left ${
        onClick ? 'active:bg-text/5 transition-colors' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-text">{label}</p>
        {sub && <p className="text-[12px] text-text/55 mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0 text-text/50">{right}</div>
    </Tag>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="px-5 text-[12px] font-bold text-text/55 tracking-wider mb-2">{title}</h3>
      <div className="mx-4 bg-white rounded-2xl shadow-soft divide-y divide-text/10 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const u = useUser();
  const nav = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);

  const settingItem = (key: keyof UserSettings, label: string, sub?: string) => (
    <Row
      label={label}
      sub={sub}
      right={<Toggle on={u.settings[key]} onChange={(v) => u.setSetting(key, v)} />}
    />
  );

  return (
    <main className="min-h-full pb-12">
      <header className="relative pt-10 pb-3">
        <Link
          to="/mypage"
          aria-label="뒤로"
          className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-[48px] leading-none text-text/80"
        >‹</Link>
        <h1 className="text-center font-bold text-[18px] tracking-[4px] text-text">설정</h1>
      </header>

      <Section title="프로필">
        {editingNick ? (
          <div className="px-4 py-3 flex items-center gap-2">
            <input
              autoFocus
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value.slice(0, 10))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { u.setNickname(nickDraft); setEditingNick(false); }
                if (e.key === 'Escape') { setNickDraft(u.nickname); setEditingNick(false); }
              }}
              className="flex-1 bg-bg rounded-xl px-3 py-2 text-[15px] outline-none"
              placeholder="닉네임"
            />
            <button
              onClick={() => { u.setNickname(nickDraft); setEditingNick(false); }}
              className="text-accent text-[14px] font-bold"
            >저장</button>
          </div>
        ) : (
          <Row
            label="닉네임"
            sub={u.nickname}
            right={<span aria-hidden>›</span>}
            onClick={() => { setNickDraft(u.nickname); setEditingNick(true); }}
          />
        )}
      </Section>

      <Section title="알림">
        {settingItem('notifyChallenge', '챌린지 알림', '인증 시간을 매일 알려드려요')}
        {settingItem('notifyHeart', '양심 알림', '양심이 깎이려 할 때 알려드려요')}
      </Section>

      <Section title="피드백">
        {settingItem('sound', '사운드')}
        {settingItem('vibration', '진동')}
      </Section>

      <Section title="데이터">
        <Row
          label="모든 데이터 초기화"
          sub="닉네임, 사진, 북마크가 사라져요"
          right={<span className="text-pink text-[13px] font-bold">초기화</span>}
          onClick={() => setConfirmReset(true)}
        />
      </Section>

      <Section title="정보">
        <Row label="버전" right={<span className="text-[13px] text-text/60">{APP_VERSION}</span>} />
        <Row label="이용약관" right={<span aria-hidden>›</span>} onClick={() => {}} />
        <Row label="개인정보처리방침" right={<span aria-hidden>›</span>} onClick={() => {}} />
        <Row label="오픈소스 라이선스" right={<span aria-hidden>›</span>} onClick={() => {}} />
      </Section>

      <div className="mx-4 mt-6">
        <button
          onClick={() => nav('/login')}
          className="w-full text-center text-[13px] text-text/55 underline"
        >
          로그아웃
        </button>
      </div>

      {/* 초기화 확인 오버레이 */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-7"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-bold text-text">정말 모든 데이터를 초기화할까요?</p>
            <p className="text-[12px] text-text/60 mt-1">이 작업은 되돌릴 수 없어요.</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 bg-primary/70 text-text font-bold rounded-2xl py-3 active:scale-[.98]"
              >취소</button>
              <button
                onClick={() => {
                  u.reset();
                  localStorage.removeItem('jaringobi.bookmarks.v1');
                  setConfirmReset(false);
                  nav('/main');
                }}
                className="flex-1 bg-pink text-white font-bold rounded-2xl py-3 active:scale-[.98]"
              >초기화</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
