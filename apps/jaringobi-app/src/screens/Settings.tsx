import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/UI';
import { useUser, UserSettings } from '../lib/userState';
import { playClickSfx, vibrate } from '../lib/feedback';
import { useEscape } from '../lib/useEscape';
import { signOut } from '../lib/auth';

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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [legalKey, setLegalKey] = useState<keyof typeof LEGAL_DOCS | null>(null);
  const [modeModal, setModeModal] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // 데이터 백업 — 관련 localStorage 키 모두 JSON으로 묶어 다운로드
  function exportBackup() {
    const keys = ['jaringobi.user.v1', 'jaringobi.posts.v1', 'jaringobi.bookmarks.v1', 'jaringobi.lastCat'];
    const data: Record<string, string | null> = { _exportedAt: new Date().toISOString() };
    for (const k of keys) data[k] = localStorage.getItem(k);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dt = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `jaringobi-backup-${dt}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text) as Record<string, string | null>;
      if (!data['jaringobi.user.v1']) {
        setImportMsg('자린고비 백업 파일이 아닙니다');
        setTimeout(() => setImportMsg(null), 3000);
        return;
      }
      const keys = ['jaringobi.user.v1', 'jaringobi.posts.v1', 'jaringobi.bookmarks.v1', 'jaringobi.lastCat'];
      for (const k of keys) {
        const v = data[k];
        if (v == null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      }
      setImportMsg('복원 완료! 새로고침합니다…');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setImportMsg('파일을 읽을 수 없습니다');
      setTimeout(() => setImportMsg(null), 3000);
    }
  }

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
    playClickSfx();
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
  useEscape(confirmLogout, () => setConfirmLogout(false));

  async function doLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(); // Supabase 세션 정리 (no-op if 미설정)
    } catch (e) {
      console.warn('[Settings.doLogout] signOut 실패', e);
    }
    u.reset(); // localStorage user 데이터 초기화 → tutorialSeen 도 false 로
    setConfirmLogout(false);
    nav('/login', { replace: true });
  }
  useEscape(modeModal, () => setModeModal(false));

  return (
    <main className="min-h-full pb-12">
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/mypage" />
        <h1 className="text-center font-bold text-[18px] tracking-[4px] text-text">설정</h1>
      </header>

      {/* 공식 인스타 — 문의 & 팔로우 유도 */}
      <a
        href="https://www.instagram.com/4poor_project?igsh=emJ1YjR3eGk5Z2tr&utm_source=qr"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 mx-4 block bg-gradient-to-tr from-[#FDE7BD] via-[#F8B6CF] to-[#A8B5F2] rounded-2xl shadow-soft p-4 active:scale-[.99] transition"
      >
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/90 grid place-items-center shrink-0">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1f1d1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.7" fill="#1f1d1a" stroke="none" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-text leading-tight">@4poor_project</p>
            <p className="text-[12px] text-text/75 mt-1 leading-relaxed">
              문의·피드백은 인스타 DM 으로!<br />
              팔로우 해주시면 큰 힘이 돼요 🐟
            </p>
          </div>
          <span className="shrink-0 text-text/55 text-[18px]" aria-hidden>›</span>
        </div>
      </a>

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
      </Section>

      <Section title="피드백">
        {settingItem('sound', '배경 음악(BGM)', '메인·수다방 등에서 흐르는 음악')}
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
            disabled={!(u.settings.sfxEnabled ?? true)}
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

      <Section title="도움말">
        <Row
          label="튜토리얼 다시 보기"
          sub="메인 화면 사용법을 단계별로 다시 안내받아요"
          right={<span className="text-accent text-[13px] font-bold">시작</span>}
          onClick={() => {
            u.update({ tutorialSeen: false });
            nav('/main');
          }}
        />
        {settingItem(
          'showHelpButton',
          '메인 ? 버튼 표시',
          '끄면 메인 우상단의 도움말(?) 버튼이 숨겨져요',
        )}
      </Section>

      <Section title="데이터">
        <Row
          label="데이터 내보내기"
          sub="JSON 파일로 백업 — 재설치 후에도 복원 가능"
          right={<span className="text-accent text-[13px] font-bold">백업</span>}
          onClick={exportBackup}
        />
        <Row
          label="데이터 가져오기"
          sub="백업 파일을 선택해 복원"
          right={<span className="text-accent text-[13px] font-bold">복원</span>}
          onClick={() => importInputRef.current?.click()}
        />
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={onImportFile}
          className="hidden"
        />
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
          onClick={() => setConfirmLogout(true)}
          className="w-full text-center text-[13px] text-text/55 underline"
        >
          로그아웃
        </button>
      </div>

      {/* 로그아웃 확인 모달 — 닉네임·진행상황 보존되지 않으니 명시 */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-7"
          onClick={() => { if (!loggingOut) setConfirmLogout(false); }}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[18px] font-bold text-text">로그아웃 할까요?</p>
            <p className="mt-3 text-[13px] text-text/75 leading-relaxed">
              로컬에 저장된 닉네임·진행상황·코인이 모두 사라져요.<br />
              필요하면 먼저 데이터 백업을 받아두세요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="flex-1 bg-black/5 hover:bg-black/10 text-text font-bold rounded-full py-3 text-[14px]"
              >취소</button>
              <button
                onClick={doLogout}
                disabled={loggingOut}
                className="flex-1 bg-danger text-white font-bold rounded-full py-3 text-[14px] disabled:opacity-50"
              >{loggingOut ? '로그아웃 중…' : '로그아웃'}</button>
            </div>
          </div>
        </div>
      )}

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
            <div className="mt-3 overflow-y-auto thin-scrollbar text-[13px] text-text/80 leading-relaxed whitespace-pre-line">
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
                onClick={() => { u.update({ goal: 300_000 }); playClickSfx(); setModeModal(false); }}
                className={`rounded-2xl py-3 text-[14px] font-bold transition ${
                  u.goal < 1_000_000 ? 'bg-accent text-white' : 'bg-primary/70 text-text'
                }`}
              >
                노말<br /><span className="text-[11px] font-normal opacity-80">30만원</span>
              </button>
              <button
                onClick={() => { u.update({ goal: 1_000_000 }); playClickSfx(); setModeModal(false); }}
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

      {/* 백업/복원 토스트 */}
      {importMsg && (
        <div className="fixed inset-x-0 bottom-8 z-40 grid place-items-center pointer-events-none" aria-live="polite">
          <div className="pointer-events-auto bg-text/90 text-bg rounded-2xl px-4 py-2.5 shadow-2xl text-[13px] font-bold">
            {importMsg}
          </div>
        </div>
      )}
    </main>
  );
}
