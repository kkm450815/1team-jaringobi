// localStorage 접근 가용성 확인 유틸.
//
// iOS Safari 프라이빗 모드, 회사 정책상 storage 차단된 환경 등에서 localStorage
// 가 throw 하거나 quota 0 으로 동작합니다. 우리 앱은 닉네임·진행도 등을 모두
// localStorage 에 저장하므로 이 환경에서는 거의 동작 불가. 사용자에게 한 번
// 안내해서 일반 탭으로 옮기도록 유도.

const PROBE_KEY = '__jaringobi_storage_probe__';

let cachedAvailable: boolean | null = null;

export function isLocalStorageAvailable(): boolean {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    if (typeof localStorage === 'undefined') {
      cachedAvailable = false;
      return false;
    }
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    cachedAvailable = true;
    return true;
  } catch {
    cachedAvailable = false;
    return false;
  }
}
