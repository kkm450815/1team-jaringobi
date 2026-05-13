# Capacitor 안드로이드 빌드 / Play Store 배포 가이드

이 문서는 자린고비 웹앱(React + Vite)을 Capacitor 로 감싸 안드로이드 APK / AAB 로
빌드하고 구글 플레이에 올리는 전체 절차를 설명합니다.

작업 디렉토리: `apps/jaringobi-app`

---

## 1. 사전 준비 (한 번만)

### 1-1. 로컬 도구 설치
- **Node.js 18+**
- **Java 17 (JDK)** — Android Gradle Plugin 8.x 가 요구.
  ```bash
  # macOS
  brew install --cask temurin@17
  # 또는 SDKMAN: sdk install java 17.0.13-tem
  ```
- **Android Studio** (https://developer.android.com/studio)
  - SDK Manager 에서 **Android SDK Platform 34**, **Android SDK Build-Tools 34**, **Android SDK Command-line Tools** 설치
  - 환경변수
    ```bash
    export ANDROID_HOME=$HOME/Library/Android/sdk         # macOS
    # export ANDROID_HOME=$HOME/Android/Sdk               # Linux
    export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
    ```

### 1-2. 프로젝트 의존성 설치
```bash
cd apps/jaringobi-app
npm install
```

---

## 2. 빌드 흐름 개요

```
React 소스
  │  npm run build:capacitor   (VITE_CAPACITOR=1 → 상대 경로 './' 빌드)
  ▼
dist/                          (정적 웹 자산)
  │  npx cap sync android      (dist → android/app/src/main/assets/public/)
  ▼
android/                       (Gradle 프로젝트)
  │  ./gradlew bundleRelease   (서명된 AAB)
  ▼
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 3. 디버그 APK (개발/테스트용)

```bash
cd apps/jaringobi-app
npm run android:debug
```
- 결과물: `android/app/build/outputs/apk/debug/app-debug.apk`
- 그냥 휴대폰에 보내거나 `adb install` 로 설치 가능. 서명 불필요.

---

## 4. 릴리스 서명 키 만들기 (한 번만)

```bash
cd apps/jaringobi-app/android/app
keytool -genkey -v -keystore release.keystore \
  -alias jaringobi \
  -keyalg RSA -keysize 2048 -validity 10000
```
- 비밀번호 2개(키스토어 / 키), 이름·소속 입력
- `release.keystore` 가 생성됨
- **이 파일과 비밀번호는 잃어버리면 끝** — 같은 앱을 절대 다시 못 올림. 백업 필수 (1Password/Bitwarden 같은 곳)

### 4-1. keystore.properties 작성

```bash
cd apps/jaringobi-app/android
cp keystore.properties.example keystore.properties
# keystore.properties 를 열고 storePassword/keyPassword 채우기
```

`keystore.properties` 와 `release.keystore` 는 .gitignore 에 의해 commit 되지 않음. 정상.

---

## 5. 릴리스 AAB 빌드 (Play Store 업로드용)

```bash
cd apps/jaringobi-app
npm run android:release
```
- 결과물: `android/app/build/outputs/bundle/release/app-release.aab`
- 이 파일을 구글 플레이 콘솔에 업로드.

---

## 6. 앱 아이콘 / 스플래시 (선택)

기본 안드로이드 아이콘으로 빌드는 됩니다만 출시 전엔 교체 권장.

가장 빠른 방법: `@capacitor/assets` 로 자동 생성.
```bash
cd apps/jaringobi-app
npm install -D @capacitor/assets

# 1024x1024 정사각 logo.png 와 2732x2732 splash.png 를 assets/ 에 두고:
mkdir -p assets
# assets/icon-only.png (1024×1024), assets/splash.png (2732×2732), assets/splash-dark.png (옵션)

npx capacitor-assets generate --android
npm run cap:sync
```

---

## 7. 버전 올리기

Play 콘솔은 **versionCode** 가 매번 증가해야 같은 트랙 업로드를 받아줌.

`android/app/build.gradle`:
```gradle
defaultConfig {
    ...
    versionCode 1      // 정수. 새 빌드마다 +1
    versionName "1.0"  // 사용자에게 보이는 문자열. 1.0.1 등 SemVer 권장
}
```

---

## 8. 구글 플레이 콘솔 등록 (요약)

1. https://play.google.com/console — 개발자 계정 ($25 일회성)
2. **앱 만들기** → 이름 "자린고비", 무료, 앱·게임 분류
3. **앱 콘텐츠** 모두 채우기
   - 콘텐츠 등급, 광고 포함 여부, 데이터 안전(개인정보 처리)
   - 타겟 연령층, 정부 앱 여부 (모두 아니오)
   - 개인정보처리방침 URL — 앱 내 Settings 의 약관 화면 외에 **공개 웹 URL 필요**
4. **메인 스토어 등록정보**
   - 짧은 설명(80자), 자세한 설명, 그래픽 자산
     - 앱 아이콘 512×512 PNG
     - 피처 그래픽 1024×500
     - 스크린샷 최소 2장 (휴대전화 320~3840px)
5. **프로덕션** → 새 버전 만들기 → 위의 `app-release.aab` 업로드
6. 검토 제출. 최초 심사 1-7일 소요.

> 처음에는 **내부 테스트 트랙** 으로 본인 계정만 추가해서 설치 가능 여부부터
> 확인 권장. 메뉴: 테스트 → 내부 테스트.

---

## 9. 흔한 트러블슈팅

### 빌드 중 흰 화면
- `vite.config.ts` 의 base 가 `'./'` 인지 확인 (`VITE_CAPACITOR=1` 환경변수)
- `npm run build:capacitor` 로 빌드했는지 (그냥 `npm run build` 는 절대경로 `/` 라 webview 에서 깨짐)

### Supabase Anon 키 노출
- 클라이언트 번들에 들어가는 게 정상 (RLS 로 보호). Service role 키만 절대 임포트 금지.

### Google OAuth 가 안드로이드 webview 에서 막힘
- Capacitor 의 기본 webview 는 `intent://` 등 외부 앱 호출을 막아 OAuth redirect 가 깨질 수 있음.
- 해결: `@capacitor/browser` 플러그인 + `signInWithGoogle` 호출 전에 `Browser.open({ url })` 로 시스템 브라우저에서 OAuth 열기. (이메일/비밀번호 로그인은 그대로 작동)

### Storage 업로드 / 카메라
- `@capacitor/camera`, `@capacitor/filesystem` 플러그인 추가 필요할 수 있음. 일단 현재 코드는 `<input type="file" capture="environment">` 를 사용 — Capacitor webview 에서도 동작.

### Android SDK 가 안 잡힘
- `android/local.properties` 에 `sdk.dir=...` 가 자동 생성됐는지 확인. 없으면 직접 작성:
  ```
  sdk.dir=/Users/yourname/Library/Android/sdk
  ```

---

## 10. CI/CD (참고)

GitHub Actions 로 자동 AAB 빌드하려면 keystore 와 비밀번호를 **Secrets** 으로:
- `ANDROID_KEYSTORE_BASE64` — `base64 -i release.keystore` 결과
- `ANDROID_STORE_PASSWORD` / `ANDROID_KEY_PASSWORD` / `ANDROID_KEY_ALIAS`

워크플로우에서 base64 디코드 → `release.keystore` 복원 → `keystore.properties` 동적 생성 → `./gradlew bundleRelease`.

(필요해지면 별도 워크플로우 추가 예정.)
