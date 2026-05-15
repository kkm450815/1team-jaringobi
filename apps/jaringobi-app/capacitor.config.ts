import type { CapacitorConfig } from '@capacitor/cli';

// 자린고비 안드로이드 앱 — Capacitor 6.x
// appId 는 Play Console 에 등록할 패키지명. 한 번 정하면 변경 불가에 가까우므로
// 출시 전 확정. 도메인 역순 + 앱 이름 패턴.
const config: CapacitorConfig = {
  appId: 'jaringobi.myapp',
  appName: '자린고비',
  webDir: 'dist',
  // Android 앱이 webview 안에서 https URL 을 직접 로드하는 게 아니라
  // file:// 로 번들된 web 자산을 로드하므로 server.url 은 비워 둠.
  // 만약 라이브 리로드 개발 중이면 임시로 server.url 을 dev 서버로 지정.
  // server: { url: 'http://192.168.x.x:5173', cleartext: true },
  android: {
    // 키보드 올라올 때 contents 가 위로 밀리는 기본 동작 유지
    allowMixedContent: false,
    // 안드로이드 webview 안에서 외부 https 링크 클릭 시 시스템 브라우저로 빼고
    // 자체 도메인 / 자산만 webview 가 처리하도록.
    captureInput: true,
  },
};

export default config;
