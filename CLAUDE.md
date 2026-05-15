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
