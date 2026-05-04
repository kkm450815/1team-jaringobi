import { Route, Routes, Navigate } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import Splash from './screens/Splash';
import Login from './screens/Login';
import ModeSelect from './screens/ModeSelect';
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

export default function App() {
  return (
    <PhoneFrame>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mode" element={<ModeSelect />} />
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
