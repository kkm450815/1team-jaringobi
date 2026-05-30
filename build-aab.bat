@echo off
REM ============================================================
REM   자린고비 AAB 빌드 — 클릭 한 번으로 끝
REM   윈도우 CMD 또는 더블클릭으로 실행 가능.
REM   처음 실행 전 main 으로 PR 머지가 되어 있어야 함.
REM ============================================================

setlocal

REM ---- 0. 색상 및 작업 디렉토리 ----
cd /d C:\Users\Administrator\1team-jaringobi
if errorlevel 1 (
  echo [ERROR] 저장소 경로를 못 찾았습니다. C:\Users\Administrator\1team-jaringobi 가 맞는지 확인하세요.
  pause
  exit /b 1
)

REM ---- 1. JAVA_HOME 확인 ----
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] JAVA_HOME 이 잘못 설정돼 있습니다: %JAVA_HOME%
  echo   다음 명령을 새 CMD 에서 실행한 뒤 다시 시도하세요:
  echo   setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
  pause
  exit /b 1
)

echo === 1/6  main 최신 받기 ===
git checkout main || (echo [ERROR] git checkout main 실패 & pause & exit /b 1)
git pull origin main || (echo [ERROR] git pull 실패 & pause & exit /b 1)

echo.
echo === 2/6  버전 확인 ===
type apps\jaringobi-app\android\app\build.gradle | findstr "versionCode versionName"

echo.
echo === 3/6  npm run build ===
cd /d C:\Users\Administrator\1team-jaringobi\apps\jaringobi-app
call npm run build || (echo [ERROR] npm build 실패 & pause & exit /b 1)

echo.
echo === 4/6  Capacitor sync ===
call npx cap sync android || (echo [ERROR] cap sync 실패 & pause & exit /b 1)

echo.
echo === 5/6  Gradle clean bundleRelease ===
cd /d C:\Users\Administrator\1team-jaringobi\apps\jaringobi-app\android
call gradlew clean bundleRelease || (echo [ERROR] gradle bundleRelease 실패 & pause & exit /b 1)

echo.
echo === 6/6  AAB 폴더 열기 ===
set AAB_DIR=C:\Users\Administrator\1team-jaringobi\apps\jaringobi-app\android\app\build\outputs\bundle\release
if exist "%AAB_DIR%\app-release.aab" (
  echo.
  echo [SUCCESS] 빌드 완료. AAB 위치:
  echo   %AAB_DIR%\app-release.aab
  echo.
  explorer "%AAB_DIR%"
) else (
  echo [ERROR] AAB 파일이 생성되지 않았습니다. 위 로그 확인 필요.
  pause
  exit /b 1
)

pause
endlocal
