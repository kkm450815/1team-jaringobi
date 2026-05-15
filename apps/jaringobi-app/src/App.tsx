import { useEffect, useRef, useState } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { isLocalStorageAvailable } from './lib/storage';
import { ensureAnonymousSession } from './lib/auth';
import { loadCustomShopItems, startCustomShopItemsRealtime } from './lib/customShopItems';
import Admin from './screens/Admin';
import { unlockAudio } from './lib/audio';
import { getBgm } from './lib/bgm';
import { setSfxEnabled, setSfxVolume } from './lib/feedback';
import { useUser } from './lib/userState';
import { reconcileNotifications, requestNotificationPermission } from './lib/notifications';
import Splash from './screens/Splash';
import Login from './screens/Login';
import ForgotPassword from './screens/ForgotPassword';
import ResetPassword from './screens/ResetPassword';
import ModeSelect from './screens/ModeSelect';
import NickSetup from './screens/NickSetup';
import Main from './screens/Main';
import Wardrobe from './screens/Wardrobe';
import Shop from './screens/Shop';
import TalkList from './screens/TalkList';
import TalkRoom from './screens/TalkRoom';
import Honor from './screens/Honor';
import ChallengeList from './screens/ChallengeList';
import ChallengeDetail from './screens/ChallengeDetail';
import MyPage from './screens/MyPage';
import Profile from './screens/Profile';
import Camera from './screens/Camera';
import ScreenIndex from './screens/ScreenIndex';
import Bookmarks from './screens/Bookmarks';
import Settings from './screens/Settings';

// 전역 BGM 컨트롤러
// - sound 토글 변경 시에만 start/stop (재시작 방지)
// - bgmVolume 변경은 setVolumePercent 만 호출 → 끊김 없이 볼륨만 조절
// - 첫 사용자 인터랙션 후 자동 시작 (브라우저 autoplay 정책)
function BgmController() {
  const u = useUser();
  // sound 토글 — start/stop
  useEffect(() => {
    const bgm = getBgm();
    function tryStart() {
      if (u.settings.sound) bgm.start();
      window.removeEventListener('pointerdown', tryStart);
    }
    if (u.settings.sound) {
      bgm.start();
      window.addEventListener('pointerdown', tryStart, { once: true });
    } else {
      bgm.stop();
    }
    return () => {
      window.removeEventListener('pointerdown', tryStart);
    };
  }, [u.settings.sound]);

  // BGM 볼륨만 변경 — 끊김 없이 페이드
  useEffect(() => {
    getBgm().setVolumePercent(u.settings.bgmVolume ?? 60);
  }, [u.settings.bgmVolume]);

  // SFX — sfxEnabled / sfxVolume 만 반영. sound 마스터(BGM 토글) 와는 독립
  // → BGM 끈 상태에서도 효과음만 들을 수 있음
  useEffect(() => {
    setSfxEnabled(u.settings.sfxEnabled ?? true);
    setSfxVolume(u.settings.sfxVolume ?? 80);
  }, [u.settings.sfxEnabled, u.settings.sfxVolume]);

  return null;
}

// 첫 사용자 클릭으로 공유 AudioContext 를 unlock — BGM·SFX 모두 사용 가능 상태로
function AudioUnlocker() {
  useEffect(() => {
    function onFirstInteraction() {
      unlockAudio();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    }
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, []);
  return null;
}

// 앱 시작 시 1회 — Supabase 익명 sign-in. 사용자에게 보이지 않는 자동 인증.
// 이미 매직 링크 등으로 세션이 있으면 그대로 유지. 활성화 안 됐거나 실패해도
// 앱은 계속 동작 (RLS 가 INSERT 를 막을 뿐).
function AuthBootstrap() {
  useEffect(() => {
    ensureAnonymousSession();
  }, []);
  return null;
}

// 로컬 알림 — 권한 요청(1회) + 설정/완료상태 바뀔 때마다 30 일치 스케줄 reconcile.
// native 가 아니면 notifications.ts 가 알아서 no-op.
//
// 권한 요청 타이밍: /main 도달 시점에 1회만.
// - 신규 사용자: 온보딩(로그인 → 모드 선택 → 닉네임 설정) 끝낸 후 자연스럽게 요청.
//   닉네임 입력 중 OS 알림 권한 팝업이 끼어들어 키보드/포커스 가로채는 문제 방지.
// - 기존 사용자: Splash → /main 자동 진입 → 즉시 요청 (이전과 거의 동일한 타이밍).
function NotificationsBootstrap() {
  const u = useUser();
  const loc = useLocation();
  const askedRef = useRef(false);

  useEffect(() => {
    if (askedRef.current) return;
    if (loc.pathname !== '/main') return;
    askedRef.current = true;
    // 권한 요청 → 허용된 경우에만 reconcile 즉시 1회 더 실행.
    // (앱 부팅 시 reconcile 은 권한 없음 상태에서 일찍 돌면서 등록을 못했을 수
    //  있어, 허용된 직후 한 번 더 스케줄을 깔아 줘야 첫날부터 알림이 동작함.)
    void (async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        await reconcileNotifications(u.settings, u.lastSavedAt);
      }
    })();
    // u.settings/lastSavedAt 은 askedRef 가 한 번만 통과하도록 deps 에서 제외 —
    // 최신값은 클로저 캡처로 충분하고, 두 번 묻지 않는 게 중요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  // 알림 관련 설정 + 마지막 인증 시각이 바뀔 때마다 reconcile.
  // (lastSavedAt 변경 = 챌린지 인증 발생 → 그날 저녁 알림 자동 스킵 반영)
  // 권한 미허용 상태에서는 reconcileNotifications 가 내부에서 silently skip.
  const { notifyMorning, notifyMorningTime, notifyEvening, notifyEveningTime } = u.settings;
  const lastSavedAt = u.lastSavedAt;
  useEffect(() => {
    void reconcileNotifications(u.settings, lastSavedAt);
    // u.settings 객체 참조가 매번 새로 만들어지므로 필요한 필드만 deps 로 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyMorning, notifyMorningTime, notifyEvening, notifyEveningTime, lastSavedAt]);
  return null;
}

// 관리자가 추가한 상점 아이템을 1회 로드하고 Realtime 구독 시작.
function ShopItemsBootstrap() {
  useEffect(() => {
    loadCustomShopItems();
    startCustomShopItemsRealtime();
  }, []);
  return null;
}

// 앱 시작 시 1회 — iOS 프라이빗 모드/저장소 차단 환경 감지 후 사용자 안내.
function StorageGuard() {
  const [warn, setWarn] = useState(false);
  useEffect(() => {
    if (!isLocalStorageAvailable()) setWarn(true);
  }, []);
  if (!warn) return null;
  return (
    <div
      role="alert"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[88%] bg-red-600/95 text-white text-[12px] font-medium px-4 py-2.5 rounded-lg shadow-xl text-center leading-relaxed"
    >
      ⚠ 저장소를 사용할 수 없는 환경이에요.<br />
      Safari 의 시크릿(프라이빗) 모드를 끄거나 일반 브라우저로 다시 열어주세요.
      <button
        onClick={() => setWarn(false)}
        className="ml-3 underline underline-offset-2"
        aria-label="안내 닫기"
      >닫기</button>
    </div>
  );
}

// /admin 은 데스크톱 풀스크린 레이아웃이 필요해 PhoneFrame 을 거치지 않는다.
function AppShell() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith('/admin');

  if (isAdmin) {
    // /admin 은 매직 링크로 직접 로그인하므로 익명 부트스트랩 불필요.
    return (
      <>
        <StorageGuard />
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <PhoneFrame>
      <AuthBootstrap />
      <ShopItemsBootstrap />
      <StorageGuard />
      <AudioUnlocker />
      <BgmController />
      <NotificationsBootstrap />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/mode" element={<ModeSelect />} />
        <Route path="/nickname" element={<NickSetup />} />
        <Route path="/main" element={<Main />} />
        <Route path="/wardrobe" element={<Wardrobe />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/talk" element={<TalkList />} />
        <Route path="/talk/:id" element={<TalkRoom />} />
        <Route path="/honor" element={<Honor />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/challenges" element={<ChallengeList />} />
        <Route path="/challenges/:id" element={<ChallengeDetail />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/profile/:nick" element={<Profile />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/index" element={<ScreenIndex />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PhoneFrame>
  );
}

export default function App() {
  return <AppShell />;
}
