import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { getBgm } from './lib/bgm';
import { useUser } from './lib/userState';
import Splash from './screens/Splash';
import Login from './screens/Login';
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

// 전역 BGM 컨트롤러 — 사용자 sound 토글 + bgmVolume 변화에 반응.
// 첫 사용자 인터랙션 후 자동 시작 (브라우저 autoplay 정책).
function BgmController() {
  const u = useUser();
  useEffect(() => {
    const bgm = getBgm();
    bgm.setVolumePercent(u.settings.bgmVolume ?? 60);
    function tryStart() {
      if (u.settings.sound) {
        bgm.setVolumePercent(u.settings.bgmVolume ?? 60);
        bgm.start();
      }
      window.removeEventListener('pointerdown', tryStart);
    }
    if (u.settings.sound) {
      bgm.setVolumePercent(u.settings.bgmVolume ?? 60);
      // 이미 한 번이라도 사용자 클릭이 있었으면 시도, 아니면 첫 클릭 대기
      bgm.start();
      window.addEventListener('pointerdown', tryStart, { once: true });
    } else {
      bgm.stop();
    }
    return () => {
      window.removeEventListener('pointerdown', tryStart);
    };
  }, [u.settings.sound, u.settings.bgmVolume]);
  return null;
}

export default function App() {
  return (
    <PhoneFrame>
      <BgmController />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
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
