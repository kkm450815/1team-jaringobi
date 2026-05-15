# CLAUDE.md — 작업 규칙

이 문서의 규칙은 모든 후속 작업에서 **항상** 지켜야 합니다.

## 작업 흐름 / 커밋 규칙

1. **변경 → 검증 → 커밋 → 푸시**를 한 사이클로 묶어서 진행한다.
2. 커밋 메시지는 한국어로 작성하고 변경 의도와 핵심 내용을 요약한다.
3. **푸시 후 사용자에게 응답할 때 반드시 커밋 해시(짧은 7자)를 명시**한다.
   - 예: `완료 (\`41696fd\`).`
   - 여러 커밋이 있으면 각 해시를 모두 알려준다.
4. 푸시가 실패(원격 앞섬 등)했다면 `git pull --rebase` 후 재시도하고, 최종 푸시된 해시를 알려준다.
5. 커밋만 하고 푸시 안 했을 때도 그 사실을 명확히 말한다 (`로컬 커밋 \`abc1234\`, 푸시 보류`).

## 코드 변경 시 기본 점검

- `npx tsc --noEmit` 으로 타입체크 통과 확인
- 스크린샷이 필요한 UI 변경은 420×900 viewport로 단일 캡처 후 사용자에게 결과 안내
- 룸 미리보기 fit 정렬 로직(`RoomPreview.tsx`의 `CharFitImage`, 캐릭터 중심 정렬)은 사용자 확인 없이 건드리지 않는다.

## 브랜치

- 작업 브랜치: `claude/prepare-new-branch-XcP7M`
- 푸시 명령: `git push origin claude/prepare-new-branch-XcP7M`
- main 브랜치에는 직접 푸시하지 않는다 (PR로만 머지됨).

## 사용자 PC 환경 (Windows)

- 저장소 경로: `C:\Users\Administrator\1team-jaringobi`
- Capacitor/안드로이드 작업 폴더: `C:\Users\Administrator\1team-jaringobi\apps\jaringobi-app`
- 빌드용 CMD 이동 명령(복붙용): `cd /d C:\Users\Administrator\1team-jaringobi\apps\jaringobi-app`
- 안드로이드 빌드/배포 관련 CMD 명령을 안내할 때는 항상 위 경로를 기준으로 작성한다. 예시 경로(`C:\dev\...` 등)로 대체 금지.

## 현재 안드로이드 버전 (Play Console)

- 정의 위치: `apps/jaringobi-app/android/app/build.gradle` 의 `versionCode` / `versionName`
- **현재 값**: `versionCode 8` / `versionName "1.0.5"` (2026-05-15)
  - 1.0.5 내용: 로컬 푸시 알림 신규 (아침 챌린지 등록 / 저녁 완료 인증 자동 안내, 설정에서 시간·ON/OFF 개별 조정)
- 과거 이력:
  - vCode 7 / 1.0.4 — 비공개 테스트 업로드용 (vCode 6 재사용 불가로 7 점프)
  - vCode 6 / 1.0.4 — 내부 테스트로 업로드됨 → 재사용 불가
  - vCode 5 / 1.0.3 — 사운드/레이아웃/공유/닉네임/타이핑 7개 개선
  - vCode 4 / 1.0.3 — 옛날 main 에서 빌드돼 변경사항 미반영인 채로 Play Console 에 업로드된 이력 있음 (재사용 불가)
- **다음 출시 규칙**:
  - versionCode 는 항상 직전 값 +1 (Play Console 에 한 번 업로드되면 영구 재사용 불가).
  - versionName 은 같은 내용 재빌드면 유지, 새 기능/수정이면 의미 단위로 증가 (`1.0.3 → 1.0.4` 등).
  - 사용자에게 빌드 안내할 때 현재 값 명시해 줄 것 ("이번 빌드는 vCode N / vName x.y.z").
