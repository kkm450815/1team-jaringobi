import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/UI';
import { useUser, UserSettings } from '../lib/userState';
import { playClickSfx, vibrate } from '../lib/feedback';
import { useEscape } from '../lib/useEscape';

const APP_VERSION = '0.1.0';

// 정적 텍스트 모달 콘텐츠
const LEGAL_DOCS: Record<string, { title: string; body: string }> = {
  terms: {
    title: '이용약관',
    body: '본 서비스는 절약 챌린지 프로토타입입니다.\n· 회원가입·로그인은 데모 단계로 실제 인증을 거치지 않습니다.\n· 사용자가 입력한 데이터는 본인의 브라우저(localStorage)에만 저장됩니다.\n· 서비스 제공자는 데이터 손실에 책임을 지지 않습니다.\n\n정식 출시 시 약관이 업데이트될 예정입니다.',
  },
  privacy: {
    title: '개인정보처리방침',
    body: '· 수집 항목: 닉네임, 인증 사진, 챌린지 진행 상황\n· 저장 위치: 사용자 브라우저 localStorage (서버 전송 없음)\n· 보관 기간: 사용자가 데이터 초기화하기 전까지\n· 제3자 제공: 없음\n\n인증 사진은 카메라 입력 즉시 320px로 다운스케일되어 저장됩니다.',
  },
  license: {
    title: '오픈소스 라이선스',
    body: 'React (MIT)\nReact Router (MIT)\nVite (MIT)\nTailwind CSS (MIT)\n\nGangwonEducationModuche · Pretendard 글꼴\n각각 SIL OL 및 SIL OFL 라이선스를 따릅니다.',
  },
};

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
  const [resetAck, setResetAck] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [legalKey, setLegalKey] = useState<keyof typeof LEGAL_DOCS | null>(null);
  const [modeModal, setModeModal] = useState(false);

  function commitNick() {
    if (!nickDraft.trim()) {
      setNickError('닉네임은 비울 수 없어요');
      setNickDraft(u.nickname);
      setEditingNick(false);
      setTimeout(() => setNickError(null), 2500);
      return;
    }
    u.setNickname(nickDraft);
    setEditingNick(false);
  }

  // 토글 변경 시 즉각 피드백 (사운드/진동) — 토글이 ON 상태로 바뀌고 사용자가 사운드 활성이면 SFX,
  // 진동 활성이면 햅틱
  function handleSettingChange<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    u.setSetting(key, value);
    if (u.settings.sound) playClickSfx();
    if (u.settings.vibration) vibrate(15);
  }

  // boolean 토글 항목용 — bgmVolume(number) 등은 별도 UI 사용
  type BoolKeys = {
    [K in keyof UserSettings]: UserSettings[K] extends boolean ? K : never
  }[keyof UserSettings];
  const settingItem = (key: BoolKeys, label: string, sub?: string) => (
    <Row
      label={label}
      sub={sub}
      right={<Toggle on={u.settings[key]} onChange={(v) => handleSettingChange(key, v)} />}
    />
  );

  useEscape(legalKey !== null, () => setLegalKey(null));
  useEscape(confirmReset, () => setConfirmReset(false));
  useEscape(modeModal, () => setModeModal(false));

  return (
    <main className="min-h-full pb-12">
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/mypage" />
        <h1 className="text-center font-bold text-[18px] tracking-[4px] text-text">설정</h1>
      </header>

      <Section title="프로필">
        {editingNick ? (
          <div className="px-4 py-3 flex items-center gap-2">
            <input
              autoFocus
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value.slice(0, 10))}
              onBlur={commitNick}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNick();
                if (e.key === 'Escape') { setNickDraft(u.nickname); setEditingNick(false); }
              }}
              className="flex-1 bg-bg rounded-xl px-3 py-2 text-[15px] outline-none"
              placeholder="닉네임"
            />
            <button
              onClick={commitNick}
              className="text-accent text-[14px] font-bold"
            >저장</button>
          </div>
        ) : (
          <Row
            label="닉네임"
            sub={nickError ? `⚠ ${nickError}` : u.nickname}
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
        {settingItem('sound', '사운드', '전체 사운드 마스터 — OFF 면 BGM·효과음 모두 무음')}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 w-[90px] shrink-0">
            <p className="text-[15px] font-bold text-text">BGM 볼륨</p>
            <p className="text-[12px] text-text/55 mt-0.5">{u.settings.bgmVolume ?? 60}%</p>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={!u.settings.sound}
            value={u.settings.bgmVolume ?? 60}
            onChange={(e) => u.setSetting('bgmVolume', Number(e.target.value))}
            aria-label="BGM 볼륨"
            className="flex-1 accent-accent disabled:opacity-40"
          />
        </div>
        {settingItem('sfxEnabled', '효과음', '클릭·구매·인증 등 짧은 효과음')}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 w-[90px] shrink-0">
            <p className="text-[15px] font-bold text-text">효과음 볼륨</p>
            <p className="text-[12px] text-text/55 mt-0.5">{u.settings.sfxVolume ?? 80}%</p>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={!u.settings.sound || !(u.settings.sfxEnabled ?? true)}
            value={u.settings.sfxVolume ?? 80}
            onChange={(e) => u.setSetting('sfxVolume', Number(e.target.value))}
            aria-label="효과음 볼륨"
            className="flex-1 accent-accent disabled:opacity-40"
          />
        </div>
        {settingItem('vibration', '진동')}
      </Section>

      <Section title="챌린지 모드">
        <Row
          label={u.goal >= 1_000_000 ? '하드 모드 (100만원)' : '노말 모드 (30만원)'}
          sub={u.day === 1 ? '회차 시작 전이라 변경 가능' : '진행 중이라 변경 시 누적이 그대로 유지돼요'}
          right={<span className="text-accent text-[13px] font-bold">변경</span>}
          onClick={() => setModeModal(true)}
        />
      </Section>

      <Section title="데이터">
        <Row
          label="모든 데이터 초기화"
          sub="닉네임, 사진, 북마크가 사라져요"
          right={<span className="text-danger text-[13px] font-bold">초기화</span>}
          onClick={() => setConfirmReset(true)}
        />
      </Section>

      <Section title="정보">
        <Row label="버전" right={<span className="text-[13px] text-text/60">{APP_VERSION}</span>} />
        <Row label="이용약관" right={<span aria-hidden>›</span>} onClick={() => setLegalKey('terms')} />
        <Row label="개인정보처리방침" right={<span aria-hidden>›</span>} onClick={() => setLegalKey('privacy')} />
        <Row label="오픈소스 라이선스" right={<span aria-hidden>›</span>} onClick={() => setLegalKey('license')} />
      </Section>

      <div className="mx-4 mt-6">
        <button
          onClick={() => nav('/login')}
          className="w-full text-center text-[13px] text-text/55 underline"
        >
          로그아웃
        </button>
      </div>

      {/* 약관/개인정보/라이선스 모달 */}
      {legalKey && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-5"
          onClick={() => setLegalKey(null)}
        >
          <div
            className="w-full max-w-[360px] bg-bg rounded-3xl p-5 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-bold text-text text-center">
              {LEGAL_DOCS[legalKey].title}
            </p>
            <div className="mt-3 overflow-y-auto text-[13px] text-text/80 leading-relaxed whitespace-pre-line">
              {LEGAL_DOCS[legalKey].body}
            </div>
            <button
              onClick={() => setLegalKey(null)}
              className="mt-4 w-full bg-accent text-white font-bold rounded-2xl py-3 active:scale-[.98]"
            >닫기</button>
          </div>
        </div>
      )}

      {/* 초기화 확인 오버레이 */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-7"
          onClick={() => { setConfirmReset(false); setResetAck(false); }}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-5 text-center shadow-2xl border-2 border-danger/30"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[18px] font-bold text-danger">⚠️ 모든 데이터 영구 삭제</p>
            <p className="text-[13px] text-text/80 mt-2 leading-relaxed">
              닉네임, 인증 사진, 챌린지 진행, 북마크, 보유 아이템이<br />
              <span className="font-bold text-danger">모두 사라지며 복구할 수 없어요.</span>
            </p>
            <label className="mt-4 flex items-center justify-center gap-2 text-[13px] text-text/80 cursor-pointer">
              <input
                type="checkbox"
                checked={resetAck}
                onChange={(e) => setResetAck(e.target.checked)}
                className="w-4 h-4 accent-danger"
              />
              <span>위 내용을 이해했고 정말 초기화합니다</span>
            </label>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setConfirmReset(false); setResetAck(false); }}
                className="flex-1 bg-primary/70 text-text font-bold rounded-2xl py-3 active:scale-[.98]"
              >취소</button>
              <button
                onClick={() => {
                  if (!resetAck) return;
                  u.reset();
                  localStorage.removeItem('jaringobi.bookmarks.v1');
                  localStorage.removeItem('jaringobi.posts.v1');
                  setConfirmReset(false);
                  setResetAck(false);
                  nav('/main');
                }}
                disabled={!resetAck}
                className={`flex-1 font-bold rounded-2xl py-3 transition ${
                  resetAck
                    ? 'bg-danger text-white active:scale-[.98]'
                    : 'bg-text/15 text-text/40 cursor-not-allowed'
                }`}
              >초기화</button>
            </div>
          </div>
        </div>
      )}

      {/* 모드 변경 모달 */}
      {modeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-7"
          onClick={() => setModeModal(false)}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center font-bold text-[16px] text-text">챌린지 모드 변경</p>
            <p className="mt-2 text-center text-[12px] text-text/65 leading-relaxed">
              하드 모드는 직접 고른 미션 합계만큼 적립돼요.<br />
              현재 누적/일자/코인은 그대로 유지됩니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => { u.update({ goal: 300_000 }); setModeModal(false); }}
                className={`rounded-2xl py-3 text-[14px] font-bold transition ${
                  u.goal < 1_000_000 ? 'bg-accent text-white' : 'bg-primary/70 text-text'
                }`}
              >
                노말<br /><span className="text-[11px] font-normal opacity-80">30만원</span>
              </button>
              <button
                onClick={() => { u.update({ goal: 1_000_000 }); setModeModal(false); }}
                className={`rounded-2xl py-3 text-[14px] font-bold transition ${
                  u.goal >= 1_000_000 ? 'bg-accent text-white' : 'bg-primary/70 text-text'
                }`}
              >
                하드<br /><span className="text-[11px] font-normal opacity-80">100만원+</span>
              </button>
            </div>
            <button
              onClick={() => setModeModal(false)}
              className="mt-3 w-full bg-text/15 text-text/70 font-bold rounded-2xl py-2.5 text-[13px]"
            >닫기</button>
          </div>
        </div>
      )}
    </main>
  );
}
